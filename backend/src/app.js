import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "../routes/auth.routes.js";
import usersRouter from "../routes/users.routes.js";
import ordersRouter from "../routes/order.routes.js";
import productRouter from "../routes/product.routes.js";
import conversationRouter from "../routes/conversation.routes.js";
import errorMiddleware from "../middleware/error.middle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");

const app = express();

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth/v1", authRouter);
app.use("/api/users/v1", usersRouter);
app.use("/api/orders/v1", ordersRouter);
app.use("/api/products/v1", productRouter);
app.use("/api/conversations/v1", conversationRouter);

app.get("/api/health", (req, res) => {
  res.send("OK");
});

// Serve React build
app.use(express.static(distPath));

// All non-API routes → index.html (client-side routing).
// NOTE: Express 5 (path-to-regexp v8) rejects a bare "*" — use a RegExp catch-all.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Central error handler — formats ApiError responses as JSON
app.use(errorMiddleware);

export default app;