import ApiError from "../utils/errorHandler.utils.js";

// Factory that guards a route to one or more roles, e.g. roleMiddleware("admin")
// or roleMiddleware("admin", "seller"). Use after verifyToken.
const roleMiddleware = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) {
    return next();
  }
  throw new ApiError(403, `Access denied. Requires role: ${roles.join(" or ")}.`);
};

export default roleMiddleware;
