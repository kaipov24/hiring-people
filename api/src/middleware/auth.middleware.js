import { isConfiguredAdmin } from "../config/admin.js";
import { User } from "../models/user.model.js";
import { verifyAccessToken } from "../utils/jwt.js";

const bearerToken = (req) => {
  const authorization = req.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : "";
};

const applyAdminRole = (user) => {
  if (isConfiguredAdmin(user.email)) {
    user.role = "admin";
  }

  return user;
};

export const authenticate = async (req, _res, next) => {
  try {
    const token = bearerToken(req);

    if (!token) {
      const error = new Error("Необходимо войти в аккаунт");
      error.status = 401;
      throw error;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id email role name");

    if (!user) {
      const error = new Error("Аккаунт больше не существует");
      error.status = 401;
      throw error;
    }

    req.user = applyAdminRole(user);
    next();
  } catch (error) {
    error.status = error.status ?? 401;
    next(error);
  }
};

export const optionalAuthenticate = async (req, _res, next) => {
  try {
    const token = bearerToken(req);

    if (!token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("_id email role name");

    if (user) req.user = applyAdminRole(user);

    next();
  } catch {
    next();
  }
};

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    const error = new Error("Необходимо войти в аккаунт");
    error.status = 401;
    next(error);
    return;
  }

  if (!roles.includes(req.user.role)) {
    const error = new Error("У вас нет доступа к этому разделу");
    error.status = 403;
    next(error);
    return;
  }

  next();
};
