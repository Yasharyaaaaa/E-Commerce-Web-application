import { rateLimit } from "express-rate-limit";

export const loginLimitter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

export const getAllUsersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message:
    "Too many requests to get users from this IP, please try again after 15 minutes",
});

export const updateProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message:
    "Too many requests to update profile from this IP, please try again after 15 minutes",
});

export const deleteProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message:
    "Too many requests to delete profile from this IP, please try again after 15 minutes",
});

//suggestion: use single limiter for login and all get reques