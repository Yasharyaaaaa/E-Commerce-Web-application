import { Server } from "socket.io";
import { verifyAccessToken } from "../../utils/jwt.utils.js";
import User from "../../models/user.model.js";
import Conversation from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";

// Module-level singleton so REST controllers can emit via getIO().
let io = null;
export const getIO = () => io;

// Room helpers — keep the naming in one place.
const userRoom = (userId) => `user:${userId}`;
const convRoom = (conversationId) => `conv:${conversationId}`;

// Presence bookkeeping:
//  - userSockets: userId -> Set(socketId)  (supports multiple tabs/devices)
//  - offlineTimers: userId -> Timeout      (10s grace before marking offline)
const userSockets = new Map();
const offlineTimers = new Map();

const conversationIdsFor = async (userId) => {
  const convs = await Conversation.find({ participants: userId }).select("_id");
  return convs.map((c) => c._id.toString());
};

const broadcastPresence = async (userId, event, extra = {}) => {
  const ids = await conversationIdsFor(userId);
  ids.forEach((id) => io.to(convRoom(id)).emit(event, { userId, ...extra }));
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL?.split(",").map((o) => o.trim()) || true,
      credentials: true,
    },
  });

  // ── Auth: verify the JWT from the handshake, attach socket.user ──────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = verifyAccessToken(token);
      socket.user = { id: (decoded._id || decoded.id)?.toString(), role: decoded.role };
      if (!socket.user.id) return next(new Error("Unauthorized"));
      next();
    } catch {
      next(new Error("Unauthorized")); // client must handle 'connect_error'
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    // 1) Personal room — for private notifications across a user's devices.
    socket.join(userRoom(userId));

    // Track this socket; cancel any pending "go offline" from a quick reconnect.
    if (offlineTimers.has(userId)) {
      clearTimeout(offlineTimers.get(userId));
      offlineTimers.delete(userId);
    }
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // 2) Presence: mark online + tell people sharing a conversation with us.
    await User.findByIdAndUpdate(userId, { isOnline: true });
    await broadcastPresence(userId, "user:online");

    // 3) Join a conversation room (after verifying membership) ──────────────
    socket.on("join_conversation", async ({ conversationId } = {}) => {
      try {
        if (!conversationId) return;
        const convo = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).select("_id");
        if (!convo) return; // not a participant — silently ignore
        socket.join(convRoom(conversationId));
        socket.emit("joined_conversation", { conversationId });
      } catch {
        /* non-critical */
      }
    });

    // 4) Send a message: persist FIRST, then broadcast ─────────────────────
    socket.on("send_message", async (payload = {}, ack) => {
      try {
        const { conversationId, text, type = "text", metadata = {} } = payload;
        if (!conversationId || !text || !text.trim()) {
          return ack?.({ ok: false, error: "conversationId and text are required" });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          return ack?.({ ok: false, error: "Not a participant in this conversation" });
        }

        let message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: text.trim(),
          type,
          metadata,
          readBy: [userId], // sender has implicitly read their own message
        });

        // Update conversation preview + bump unread for the OTHER participants.
        conversation.lastMessage = text.trim();
        conversation.lastMessageAt = new Date();
        conversation.participants
          .filter((p) => p.toString() !== userId)
          .forEach((p) => {
            const k = p.toString();
            conversation.unreadCounts.set(k, (conversation.unreadCounts.get(k) || 0) + 1);
          });
        await conversation.save();

        message = await message.populate("sender", "username avatar");

        // Live message to everyone currently in the conversation room.
        io.to(convRoom(conversationId)).emit("receive_message", message);

        // Sidebar refresh for every participant (even if not in the room).
        conversation.participants.forEach((p) =>
          io.to(userRoom(p.toString())).emit("conversation:updated", {
            conversationId,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCounts.get(p.toString()) || 0,
          })
        );

        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // 5) Read receipts ─────────────────────────────────────────────────────
    socket.on("message_read", async ({ conversationId, messageIds } = {}) => {
      try {
        if (!conversationId) return;
        const filter = messageIds?.length
          ? { _id: { $in: messageIds }, conversation: conversationId }
          : { conversation: conversationId, sender: { $ne: userId } };
        await Message.updateMany(
          { ...filter, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        // Reset this user's unread counter for the conversation.
        await Conversation.updateOne(
          { _id: conversationId },
          { $set: { [`unreadCounts.${userId}`]: 0 } }
        );
        io.to(convRoom(conversationId)).emit("messages_read", { userId, conversationId });
      } catch {
        /* non-critical */
      }
    });

    // 6) Typing indicators (broadcast to the room, excluding sender) ───────
    socket.on("typing_start", ({ conversationId } = {}) => {
      if (conversationId) {
        socket.to(convRoom(conversationId)).emit("typing_start", { userId, conversationId });
      }
    });
    socket.on("typing_stop", ({ conversationId } = {}) => {
      if (conversationId) {
        socket.to(convRoom(conversationId)).emit("typing_stop", { userId, conversationId });
      }
    });

    // 7) Disconnect: mark offline after a 10s grace (survives brief drops) ──
    socket.on("disconnect", () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size > 0) return; // other tabs still connected — stay online
      }
      const timer = setTimeout(async () => {
        // Re-check: a reconnect during the grace window cancels this timer,
        // but guard anyway in case a new socket arrived.
        const current = userSockets.get(userId);
        if (current && current.size > 0) return;
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        await broadcastPresence(userId, "user:offline", { lastSeen });
        userSockets.delete(userId);
        offlineTimers.delete(userId);
      }, 10000);
      offlineTimers.set(userId, timer);
    });
  });

  return io;
};
