import express from "express";
import { createProduct } from "../controllers/product/createProduct.controller.js";
import { getAllProducts } from "../controllers/product/getAllProducts.controller.js";
import { getProductById } from "../controllers/product/getProductById.controller.js";
import { getMyProducts } from "../controllers/product/getMyProducts.controller.js";
import { updateProduct } from "../controllers/product/updateProduct.controller.js";
import { deleteProduct } from "../controllers/product/deleteProduct.controller.js";
import { reportProduct } from "../controllers/product/reportProduct.controller.js";
import { setProductFlag } from "../controllers/product/moderateProduct.controller.js";
import verificationToken from "../middleware/verifyToken.controller.js";
import isAdmin from "../middleware/isAdmin.controller.js";
import roleMiddleware from "../middleware/role.middle.js";
import upload from "../config/multer.config.js";
import validate from "../middleware/validate.middle.js";
import { createProductValidator, updateProductValidator } from "../validators/product.validator.js";

const productRouter = express.Router();

// Seller dashboard — must come before "/:id" so "mine" isn't treated as an id.
productRouter.get("/mine", verificationToken, roleMiddleware("admin", "seller"), getMyProducts);

// Public routes
productRouter.get("/", getAllProducts);
productRouter.get("/:id", getProductById);

// Moderation
productRouter.post("/:id/report", verificationToken, reportProduct);          // any logged-in user
productRouter.patch("/:id/flag", verificationToken, isAdmin, setProductFlag);  // admin review

// Sellers manage their own products; admins manage any (ownership enforced in controllers)
productRouter.post("/", verificationToken, roleMiddleware("admin", "seller"), upload.single("image"), createProductValidator, validate, createProduct);
productRouter.put("/:id", verificationToken, roleMiddleware("admin", "seller"), upload.single("image"), updateProductValidator, validate, updateProduct);
productRouter.delete("/:id", verificationToken, roleMiddleware("admin", "seller"), deleteProduct);

export default productRouter;
