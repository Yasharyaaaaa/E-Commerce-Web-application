import asyncHandler from "../../utils/asyncHandler.utils.js";
import User from "../../models/user.model.js";
import bcrypt from "bcryptjs";
import ApiError from "../../utils/errorHandler.utils.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.utils.js";
import { refreshCookieOptions } from "./refreshCookie.js";

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.isBanned) {
    throw new ApiError(403, "Your account has been banned. Please contact support.");
  }

  const payload = { _id: user._id, role: user.role, email: user.email };
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshCookieOptions())
    .json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token, // short-lived access token (frontend stores in localStorage)
    });
});