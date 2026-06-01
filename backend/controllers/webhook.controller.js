import crypto from "crypto";
import Order from "../models/order.model.js";
import { getIO } from "../src/socket/socket.manager.js";
import { emitOrderPaid } from "../src/socket/order.events.js";

// POST /api/orders/v1/webhook  (public — called by Razorpay's servers)
// Mounted with express.raw so we can verify the signature over the EXACT raw
// body. Complements the client-side /verify-payment: a server-to-server source
// of truth that marks orders paid/failed even if the buyer closes the tab.
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return res.status(500).json({ success: false, message: "Webhook not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    // req.body is a Buffer here (express.raw)
    const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
    if (!signature || expected !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());
    const entity = event?.payload?.payment?.entity;
    const razorpayOrderId = entity?.order_id;

    if (event.event === "payment.captured" && razorpayOrderId) {
      // Idempotent: setting completed again is harmless on retries.
      const order = await Order.findOneAndUpdate(
        { razorpayOrderId },
        { $set: { paymentStatus: "completed", razorpayPaymentId: entity.id } },
        { new: true }
      );
      if (order) await emitOrderPaid(getIO(), order);
    } else if (event.event === "payment.failed" && razorpayOrderId) {
      await Order.findOneAndUpdate(
        { razorpayOrderId },
        { $set: { paymentStatus: "failed" } }
      );
    }

    // Acknowledge fast so Razorpay doesn't retry.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err.message);
    return res.status(500).json({ success: false, message: "Webhook handler error" });
  }
};
