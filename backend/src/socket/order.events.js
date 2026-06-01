import Conversation from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import User from "../../models/user.model.js";

const convRoom = (id) => `conv:${id}`;
const userRoom = (id) => `user:${id}`;
const shortId = (id) => id.toString().slice(-6).toUpperCase();

// Single-vendor: an order's buyer talks to "the store" (an admin). Find or
// create the buyer<->store conversation so order events surface inside chat.
const getStore = () => User.findOne({ role: "admin" }).select("_id");

const findOrCreateBuyerStoreConversation = async (buyerId, store) => {
  if (!store || store._id.toString() === buyerId.toString()) return null;
  let convo = await Conversation.findOne({
    participants: { $all: [buyerId, store._id] },
  });
  if (!convo) {
    convo = await Conversation.create({ participants: [buyerId, store._id] });
  }
  return convo;
};

// Persist an "order_card" message into the conversation and broadcast it live,
// so order updates live in chat history (the roadmap's in-chat order cards).
const persistOrderCard = async (io, convo, storeId, text, orderRef) => {
  const message = await Message.create({
    conversation: convo._id,
    sender: storeId,
    text,
    type: "order_card",
    orderRef,
    readBy: [storeId],
  });

  convo.lastMessage = text;
  convo.lastMessageAt = new Date();
  // Bump unread for the buyer (everyone who isn't the store sender).
  convo.participants
    .filter((p) => p.toString() !== storeId.toString())
    .forEach((p) => {
      const k = p.toString();
      convo.unreadCounts.set(k, (convo.unreadCounts.get(k) || 0) + 1);
    });
  await convo.save();

  if (io) {
    io.to(convRoom(convo._id)).emit("receive_message", message);
    convo.participants.forEach((p) =>
      io.to(userRoom(p.toString())).emit("conversation:updated", {
        conversationId: convo._id,
        lastMessage: text,
        lastMessageAt: convo.lastMessageAt,
        unreadCount: convo.unreadCounts.get(p.toString()) || 0,
      })
    );
  }
  return message;
};

// Emitted right after payment is verified. Hybrid: persists an in-chat order
// card AND emits a transient `order:paid` for a live toast. Best-effort.
export const emitOrderPaid = async (io, order) => {
  if (!order) return;
  try {
    const buyerId = order.user.toString();
    const payload = { orderId: order._id, order };

    if (io) {
      io.to(userRoom(buyerId)).emit("order:paid", payload);
    }

    const store = await getStore();
    const convo = await findOrCreateBuyerStoreConversation(buyerId, store);
    if (!convo) return;

    if (io) io.to(convRoom(convo._id)).emit("order:paid", payload);

    await persistOrderCard(
      io,
      convo,
      store._id,
      `Payment received — your order #${shortId(order._id)} is confirmed and being processed.`,
      order._id
    );
  } catch (err) {
    console.error("emitOrderPaid failed:", err.message);
  }
};

// Emitted when an order's status changes. Hybrid: persists an in-chat order
// card AND emits a transient `order:status_changed` to all participants.
export const emitOrderStatusChanged = async (io, order, newStatus) => {
  if (!order) return;
  try {
    const buyerId = order.user.toString();
    const payload = { orderId: order._id, status: newStatus, order };

    const store = await getStore();
    const convo = await findOrCreateBuyerStoreConversation(buyerId, store);

    if (io) {
      const targets = convo
        ? convo.participants.map((p) => p.toString())
        : [buyerId];
      targets.forEach((id) => io.to(userRoom(id)).emit("order:status_changed", payload));
      if (convo) io.to(convRoom(convo._id)).emit("order:status_changed", payload);
    }

    if (convo) {
      await persistOrderCard(
        io,
        convo,
        store._id,
        `Your order #${shortId(order._id)} is now ${newStatus}.`,
        order._id
      );
    }
  } catch (err) {
    console.error("emitOrderStatusChanged failed:", err.message);
  }
};
