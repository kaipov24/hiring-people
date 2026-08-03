import { User } from "../models/user.model.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = async (req, _res, next) => {
  try {
    const authorization = req.get("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      const error = new Error("Authentication token is required");
      error.status = 401;
      throw error;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id email role name");

    if (!user) {
      const error = new Error("Authenticated user no longer exists");
      error.status = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    error.status = error.status ?? 401;
    next(error);
  }
};

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    const error = new Error("Authentication is required");
    error.status = 401;
    next(error);
    return;
  }

  if (!roles.includes(req.user.role)) {
    const error = new Error("You do not have permission to access this resource");
    error.status = 403;
    next(error);
    return;
  }

  next();
};
