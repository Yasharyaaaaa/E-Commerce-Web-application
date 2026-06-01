import express from "express";
import { register } from "../controllers/auth/register.controller.js";
import { login } from "../controllers/auth/login.controller.js";
import { loginLimitter } from "../config/rateLimit.config.js";
import upload from "../config/multer.config.js";
import validate from "../middleware/validate.middle.js";
import { registerValidator, loginValidator } from "../validators/auth.validator.js";

const authRouter = express.Router();

authRouter.post("/register", upload.single("avatar"), registerValidator, validate, register);
authRouter.post("/login", loginLimitter, loginValidator, validate, login);

export default authRouter;