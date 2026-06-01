import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../env/.env") });

// Surface connection lifecycle so dev can see drops/recoveries. Mongoose
// auto-reconnects once an initial connection has been established.
mongoose.connection.on("connected", () => console.log("MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected — will auto-reconnect"));

// Keep retrying the INITIAL connection without ever killing the process, so a
// DB hiccup (or a slow Atlas) doesn't take down the whole backend during dev.
// The HTTP/Socket server stays up; DB-backed routes recover when Mongo is back.
const connectDB = async (delay = 5000) => {
  let attempt = 0;
  while (mongoose.connection.readyState !== 1) {
    attempt += 1;
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      return; // 'connected' listener logs success
    } catch (err) {
      console.error(
        `MongoDB connection attempt ${attempt} failed: ${err.message}. Retrying in ${delay / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;