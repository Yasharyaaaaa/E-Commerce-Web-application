import express from "express";
import { getOverview } from "../controllers/analytics.controller.js";
import verificationToken from "../middleware/verifyToken.controller.js";
import isAdmin from "../middleware/isAdmin.controller.js";

const analyticsRouter = express.Router();

// Admin-only platform analytics
analyticsRouter.get("/overview", verificationToken, isAdmin, getOverview);

export default analyticsRouter;
