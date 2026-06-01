import express from "express";
import { getAllUsers } from "../controllers/user/getAllUsers.controller.js";
import { updateUser } from "../controllers/user/updateUser.controller.js";
import { deleteUser } from "../controllers/user/deleteUser.controller.js";
import { setUserBan } from "../controllers/user/banUser.controller.js";
import { adminDeleteUser } from "../controllers/user/deleteUserById.controller.js";
import { getAllUsersLimiter, updateProfileLimiter, deleteProfileLimiter } from "../config/rateLimit.config.js";
import verificationToken from "../middleware/verifyToken.controller.js";
import isAdmin from "../middleware/isAdmin.controller.js";

const usersRouter = express.Router();

// Self-service (specific paths first so they don't collide with /:id)
usersRouter.put("/update", verificationToken, updateProfileLimiter, updateUser);
usersRouter.delete("/delete", verificationToken, deleteProfileLimiter, deleteUser);

// Admin only
usersRouter.get("/allusers", verificationToken, isAdmin, getAllUsersLimiter, getAllUsers);
usersRouter.patch("/:id/ban", verificationToken, isAdmin, setUserBan);
usersRouter.delete("/:id", verificationToken, isAdmin, adminDeleteUser);

export default usersRouter;