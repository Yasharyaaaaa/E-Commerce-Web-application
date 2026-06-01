import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "../routes/auth.routes.js";
import usersRouter from "../routes/users.routes.js";
import ordersRouter from "../routes/order.routes.js";
import productRouter from "../routes/product.routes.js";
import conversationRouter from "../routes/conversation.routes.js";
import analyticsRouter from "../routes/analytics.routes.js";
import errorMiddleware from "../middleware/error.middle.js";
import { razorpayWebhook } from "../controllers/webhook.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");

const app = express();

// ── Security headers ──────────────────────────────────────────────────────
// CSP is disabled because Express serves the SPA and loads the Razorpay
// checkout script + external product/avatar images (Cloudinary, Pexels);
// a strict default CSP would block those. Keep the other helmet protections.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS whitelist ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl / mobile (no Origin) and whitelisted origins.
      if (!origin || !allowedOrigins?.length || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ── Razorpay webhook ──────────────────────────────────────────────────────
// MUST be registered before express.json() — signature verification needs the
// raw request body, not a parsed object.
app.post("/api/orders/v1/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth/v1", authRouter);
app.use("/api/users/v1", usersRouter);
app.use("/api/orders/v1", ordersRouter);
app.use("/api/products/v1", productRouter);
app.use("/api/conversations/v1", conversationRouter);
app.use("/api/analytics/v1", analyticsRouter);

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