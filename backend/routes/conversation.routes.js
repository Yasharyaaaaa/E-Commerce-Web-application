import express from "express";
import {
  startConversation,
  getMyConversations,
  getMessages,
  markConversationRead,
} from "../controllers/conversation.controller.js";
import verificationToken from "../middleware/verifyToken.controller.js";

const conversationRouter = express.Router();

// All conversation routes require authentication
conversationRouter.use(verificationToken);

conversationRouter.post("/", startConversation);
conversationRouter.get("/", getMyConversations);
conversationRouter.get("/:id/messages", getMessages);
conversationRouter.patch("/:id/read", markConversationRead);

export default conversationRouter;
