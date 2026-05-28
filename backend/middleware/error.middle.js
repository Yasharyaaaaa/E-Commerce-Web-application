import ApiError from "../utils/errorHandler.utils.js";

const errorMiddleware = (err, req, res, next) => {
  // if it's already an ApiError, use its properties
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      // optional: hide stack trace in production
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }

  // default for unhandled errors
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorMiddleware;