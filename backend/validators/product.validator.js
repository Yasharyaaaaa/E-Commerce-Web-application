import { body } from "express-validator";

// Note: product create/update is multipart (image upload), so these run after
// multer has populated req.body with the text fields. We trim but don't escape,
// so names/descriptions are stored verbatim (React escapes on render).
export const createProductValidator = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("description").trim().notEmpty().withMessage("Product description is required"),
  body("price").notEmpty().withMessage("Price is required").bail()
    .isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
];

// All fields optional for partial updates, but validated when present.
export const updateProductValidator = [
  body("name").optional().trim().notEmpty().withMessage("Product name cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
  body("category").optional().trim().notEmpty().withMessage("Category cannot be empty"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
];
