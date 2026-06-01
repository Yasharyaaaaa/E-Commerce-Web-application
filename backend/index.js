import http from "http";
import app from "./src/app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.config.js";
import { connectRedis } from "./config/redis.config.js";
import { initSocket } from "./src/socket/socket.manager.js";

dotenv.config({ path: "./env/.env" });
const PORT = process.env.PORT || 3000;
connectDB();
connectRedis();

// Wrap Express in an HTTP server so Socket.io can share the same port.
const server = http.createServer(app);

// Configured io instance — also reachable from controllers via getIO().
export const io = initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});