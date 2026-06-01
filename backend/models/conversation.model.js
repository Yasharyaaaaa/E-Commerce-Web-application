import mongoose from "mongoose";

// Single-vendor chat: a conversation is between a buyer and the store (an admin).
// `product` is optional context — set when a buyer starts the chat from a product.
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Per-participant unread counters, keyed by userId. A scalar can't track
    // "unread for the OTHER participant", so this is a Map<userId, count>.
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast lookup of "my conversations", newest first
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
