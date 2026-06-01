import asyncHandler from "../../utils/asyncHandler.utils.js";
import Product from "../../models/product.model.js";
import ApiError from "../../utils/errorHandler.utils.js";
import { redisClient } from "../../config/redis.config.js";

export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  // Sellers may only delete their own products; admins may delete any.
  if (req.user.role !== "admin" && product.seller?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own products");
  }

  await product.deleteOne();

  // Invalidate Cache
  try {
    if (redisClient.isOpen) {
      await redisClient.del("products:all");
      console.log("Cache invalidated: products:all");
    }
  } catch (cacheError) {
    console.error("Redis del error:", cacheError.message);
  }

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    data: null,
  });
});