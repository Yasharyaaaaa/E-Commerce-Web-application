import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiError from "../utils/errorHandler.utils.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

// Single-vendor model: every buyer talks to "the store" (an admin account).
// Resolve the store admin once per request.
const getStoreUser = async () => {
  const store = await User.findOne({ role: "admin" }).select("_id");
  if (!store) {
    throw new ApiError(503, "Store is unavailable — no admin account configured");
  }
  return store;
};

// POST /api/conversations/v1
// Find-or-create the buyer <-> store conversation. Optional { productId } sets
// the product-context card shown at the top of the chat.
export const startConversation = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const me = req.user._id;

  const store = await getStoreUser();

  // Admins don't start buyer conversations with themselves.
  if (store._id.toString() === me.toString()) {
    throw new ApiError(400, "The store account cannot start a buyer conversation");
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [me, store._id] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [me, store._id],
      product: productId || undefined,
    });
  } else if (productId) {
    // Refresh the product context to whatever the buyer is now asking about.
    conversation.product = productId;
    await conversation.save();
  }

  conversation = await conversation.populate([
    { path: "participants", select: "username email avatar role isOnline lastSeen" },
    { path: "product", select: "name price image" },
  ]);

  res.status(200).json({ success: true, data: conversation });
});

// GET /api/conversations/v1
// List my conversations (works for both buyer and the store admin), newest first,
// each with the other participant, product context, and my unread count.
export const getMyConversations = asyncHandler(async (req, res) => {
  const me = req.user._id;

  const conversations = await Conversation.find({ participants: me })
    .sort({ lastMessageAt: -1 })
    .populate("participants", "username email avatar role isOnline lastSeen")
    .populate("product", "name price image")
    .lean();

  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: me },
        readBy: { $ne: me },
      });
      const otherUser = c.participants.find(
        (p) => p._id.toString() !== me.toString()
      );
      return { ...c, otherUser, unreadCount };
    })
  );

  res.status(200).json({ success: true, data: withUnread });
});

// GET /api/conversations/v1/:id/messages?limit=&skip=
// Paginated message history (oldest -> newest within the returned page).
export const getMessages = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = Number(req.query.skip) || 0;

  const conversation = await Conversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  if (!conversation.participants.some((p) => p.toString() === me.toString())) {
    throw new ApiError(403, "Not authorized to view this conversation");
  }

  // Newest first for pagination, then reverse so the page reads oldest -> newest.
  const messages = await Message.find({ conversation: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({ success: true, data: messages.reverse() });
});

// PATCH /api/conversations/v1/:id/read
// Mark every message I haven't read in this conversation as read.
export const markConversationRead = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const { id } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  if (!conversation.participants.some((p) => p.toString() === me.toString())) {
    throw new ApiError(403, "Not authorized");
  }

  await Message.updateMany(
    { conversation: id, sender: { $ne: me }, readBy: { $ne: me } },
    { $addToSet: { readBy: me } }
  );

  res.status(200).json({ success: true, message: "Conversation marked as read" });
});
