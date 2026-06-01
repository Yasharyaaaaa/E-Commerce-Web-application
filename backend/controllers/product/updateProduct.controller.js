import asyncHandler from "../../utils/asyncHandler.utils.js";
import Product from "../../models/product.model.js";
import ApiError from "../../utils/errorHandler.utils.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.utils.js";
import { redisClient } from "../../config/redis.config.js";

export const updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  let updateData = { ...req.body };

  const existing = await Product.findById(id);
  if (!existing) {
    throw new ApiError(404, "Product not found");
  }
  // Sellers may only edit their own products; admins may edit any.
  if (req.user.role !== "admin" && existing.seller?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own products");
  }
  // Never let the owner be reassigned via the body.
  delete updateData.seller;

  if (req.file) {
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    if (cloudinaryResponse) {
      updateData.image = cloudinaryResponse.secure_url;
      updateData.imagePublicId = cloudinaryResponse.public_id;
    }
  }

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

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
    message: "Product updated successfully",
    data: product,
  });
});