import { body } from "express-validator";

export const createOrderValidator = [
  body("items").isArray({ min: 1 }).withMessage("Order must contain at least one item"),
  body("items.*.name").trim().notEmpty().withMessage("Each item needs a name"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Each item quantity must be at least 1"),
  body("items.*.price").isFloat({ min: 0 }).withMessage("Each item price must be non-negative"),
  // Razorpay's minimum charge is ₹1.
  body("totalAmount").isFloat({ min: 1 }).withMessage("Total amount must be at least 1"),
  body("shippingAddress").optional().isObject().withMessage("shippingAddress must be an object"),
];

export const verifyPaymentValidator = [
  body("razorpayOrderId").notEmpty().withMessage("razorpayOrderId is required"),
  body("razorpayPaymentId").notEmpty().withMessage("razorpayPaymentId is required"),
  body("razorpaySignature").notEmpty().withMessage("razorpaySignature is required"),
];
