import { validationResult } from "express-validator";
import ApiError from "../utils/errorHandler.utils.js";

// Runs after a route's express-validator chain. If any rule failed, collect the
// messages and throw a 400 ApiError so the central error middleware formats it.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join("; ");
    throw new ApiError(400, message);
  }
  next();
};

export default validate;
