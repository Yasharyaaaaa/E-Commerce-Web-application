import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import asyncHandler from "../utils/asyncHandler.utils.js";
import ApiError from "../utils/errorHandler.utils.js";
dotenv.config({ path: "./env/.env" });

const verificationToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Access denied because no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
});

export default verificationToken;