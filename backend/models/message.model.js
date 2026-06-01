import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true, // history is always queried by conversation
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
    },
    // Message kind — "order_card" renders as a rich card in the chat UI
    type: {
      type: String,
      enum: ["text", "image", "file", "order_card"],
      default: "text",
    },
    // Free-form per-type payload (e.g. image url, file meta, order context)
    metadata: {
      type: Object,
      default: {},
    },
    // Set when type === "order_card" — links the card to an order
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
