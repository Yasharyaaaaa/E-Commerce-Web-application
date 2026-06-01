import asyncHandler from "../../utils/asyncHandler.utils.js";
import User from "../../models/user.model.js";
import ApiError from "../../utils/errorHandler.utils.js";

// DELETE /api/users/v1/:id  (admin)
// Remove another user. Admins can't be deleted, and you can't delete yourself
// through this route (use the self-service /delete for that).
export const adminDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user._id.toString()) {
    throw new ApiError(400, "Use your profile settings to delete your own account");
  }

  const target = await User.findById(id);
  if (!target) {
    throw new ApiError(404, "User not found");
  }
  if (target.role === "admin") {
    throw new ApiError(403, "Admins cannot be deleted");
  }

  await target.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: null,
  });
});
