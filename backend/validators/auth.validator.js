import { body } from "express-validator";

// Mirrors the User model's constraints so we reject bad input before hitting Mongo.
export const registerValidator = [
  body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  body("email").trim().isEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["user", "admin"]).withMessage("Role must be 'user' or 'admin'"),
];

export const loginValidator = [
  body("email").trim().isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];
