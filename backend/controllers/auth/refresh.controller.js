import asyncHandler from "../../utils/asyncHandler.utils.js";
import User from "../../models/user.model.js";
import ApiError from "../../utils/errorHandler.utils.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.utils.js";
import { refreshCookieOptions } from "./refreshCookie.js";

// POST /api/auth/v1/refresh
// Reads the httpOnly refresh cookie, issues a fresh access token, and rotates
// the refresh cookie. The frontend's axios interceptor calls this on a 401.
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(401, "No refresh token");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Re-check the user still exists and isn't banned — refresh is a good place
  // to enforce a ban that was applied after the access token was issued.
  const user = await User.findById(decoded._id).select("role email isBanned");
  if (!user) throw new ApiError(401, "User no longer exists");
  if (user.isBanned) throw new ApiError(403, "Your account has been banned.");

  const payload = { _id: user._id, role: user.role, email: user.email };

  res
    .status(200)
    .cookie("refreshToken", signRefreshToken(payload), refreshCookieOptions())
    .json({ success: true, token: signAccessToken(payload) });
});
