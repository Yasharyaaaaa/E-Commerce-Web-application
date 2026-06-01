import crypto from "crypto";
import request from "supertest";
import app from "../src/app.js";
import { connectTestDB, disconnectTestDB } from "./db.js";
import { makeUser } from "./helpers.js";
import { verifyRazorpayPayment } from "../services/payment.service.js";

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

describe("Orders — guards & validation", () => {
  test("rejects order creation without a token", async () => {
    const res = await request(app)
      .post("/api/orders/v1/create")
      .send({ items: [{ name: "x", quantity: 1, price: 10 }], totalAmount: 10 });
    expect(res.status).toBe(401);
  });

  test("validates an empty cart", async () => {
    const { token } = await makeUser("user");
    const res = await request(app)
      .post("/api/orders/v1/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [], totalAmount: 0 });
    expect(res.status).toBe(400);
  });
});

describe("Payment signature verification", () => {
  const secret = process.env.PAYMENT_API_SECRET;
  const orderId = "order_TEST123";
  const paymentId = "pay_TEST123";

  test("accepts a correct HMAC signature", () => {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyRazorpayPayment(orderId, paymentId, signature)).toBe(true);
  });

  test("rejects a tampered signature", () => {
    expect(verifyRazorpayPayment(orderId, paymentId, "deadbeef")).toBe(false);
  });
});
