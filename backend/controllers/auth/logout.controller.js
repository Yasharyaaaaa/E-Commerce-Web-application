import asyncHandler from "../../utils/asyncHandler.utils.js";

// POST /api/auth/v1/logout — clears the refresh cookie (and the legacy token
// cookie). The frontend separately drops its in-localStorage access token.
export const logout = asyncHandler(async (req, res) => {
  res
    .clearCookie("refreshToken")
    .clearCookie("token")
    .status(200)
    .json({ success: true, message: "Logged out" });
});
