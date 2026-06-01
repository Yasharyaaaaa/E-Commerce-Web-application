import asyncHandler from "../../utils/asyncHandler.utils.js";
import Product from "../../models/product.model.js";
import ApiError from "../../utils/errorHandler.utils.js";
import { redisClient } from "../../config/redis.config.js";

// POST /api/products/v1/:id/report  (any authenticated user)
// Flags a product for admin review with an optional reason.
export const reportProduct = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isFlagged: true, flagReason: (reason || "Reported by a user").toString().slice(0, 200) } },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Keep the cached list in sync so the admin sees the flag immediately.
  try {
    if (redisClient.isOpen) await redisClient.del("products:all");
  } catch (cacheError) {
    console.error("Redis del error:", cacheError.message);
  }

  res.status(200).json({
    success: true,
    message: "Product reported. Our team will review it.",
    data: { _id: product._id, isFlagged: product.isFlagged },
  });
});
