import asyncHandler from "../../utils/asyncHandler.utils.js";
import Product from "../../models/product.model.js";

// GET /api/products/v1/mine  (seller or admin)
// Returns the products owned by the authenticated user (their seller dashboard).
export const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Your products fetched successfully",
    data: products,
  });
});
