import asyncHandler from "../../utils/asyncHandler.utils.js";
import Product from "../../models/product.model.js";
import ApiError from "../../utils/errorHandler.utils.js";
import { redisClient } from "../../config/redis.config.js";

// PATCH /api/products/v1/:id/flag  (admin)  body: { isFlagged: boolean }
// Clear (or set) a product's flag after review. Removing a flagged product
// uses the existing admin DELETE /:id route.
export const setProductFlag = asyncHandler(async (req, res) => {
  const { isFlagged } = req.body;

  if (typeof isFlagged !== "boolean") {
    throw new ApiError(400, "isFlagged (boolean) is required");
  }

  const update = { isFlagged };
  if (!isFlagged) update.flagReason = ""; // clearing the flag clears the reason

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  try {
    if (redisClient.isOpen) await redisClient.del("products:all");
  } catch (cacheError) {
    console.error("Redis del error:", cacheError.message);
  }

  res.status(200).json({
    success: true,
    message: isFlagged ? "Product flagged" : "Product unflagged",
    data: { _id: product._id, isFlagged: product.isFlagged },
  });
});
