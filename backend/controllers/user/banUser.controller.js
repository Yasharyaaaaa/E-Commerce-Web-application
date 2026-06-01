import asyncHandler from "../../utils/asyncHandler.utils.js";
import User from "../../models/user.model.js";
import ApiError from "../../utils/errorHandler.utils.js";

// PATCH /api/users/v1/:id/ban  (admin)  body: { isBanned: boolean }
// Ban or unban a user. Admins can't be banned, and you can't ban yourself.
export const setUserBan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;

  if (typeof isBanned !== "boolean") {
    throw new ApiError(400, "isBanned (boolean) is required");
  }
  if (id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot ban your own account");
  }

  const target = await User.findById(id);
  if (!target) {
    throw new ApiError(404, "User not found");
  }
  if (target.role === "admin") {
    throw new ApiError(403, "Admins cannot be banned");
  }

  target.isBanned = isBanned;
  await target.save();

  res.status(200).json({
    success: true,
    message: isBanned ? "User banned" : "User unbanned",
    data: { _id: target._id, username: target.username, isBanned: target.isBanned },
  });
});
