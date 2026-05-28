import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../env/.env") });

const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected");
      return;
    } catch (err) {
      console.log(
        `MongoDB connection failed (Attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`,
      );
      if (i === retries - 1) {
        console.error("All connection retries failed:", err.message);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;