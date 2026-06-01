import express from "express";
import {
  createOrder,
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  verifyPayment,
} from "../controllers/order.controller.js";
import verificationToken from "../middleware/verifyToken.controller.js";
import validate from "../middleware/validate.middle.js";
import { createOrderValidator, verifyPaymentValidator } from "../validators/order.validator.js";

const ordersRouter = express.Router();

// All order routes require authentication
ordersRouter.use(verificationToken);

ordersRouter.post("/create", createOrderValidator, validate, createOrder);
ordersRouter.post("/verify-payment", verifyPaymentValidator, validate, verifyPayment);
ordersRouter.get("/my-orders", getUserOrders);
ordersRouter.get("/all", getAllOrders);
ordersRouter.get("/:id", getOrderById);
ordersRouter.put("/status/:id", updateOrderStatus);
ordersRouter.delete("/delete/:id", deleteOrder);

export default ordersRouter;