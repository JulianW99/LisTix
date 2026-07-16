import { hasPermission } from "../services/accountAccessService.js";

export const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ message: "You do not have permission for this action." });
  }
  return next();
};

export const requireAnyPermission = (permissions) => (req, res, next) => {
  if (!permissions.some((permission) => hasPermission(req.user, permission))) {
    return res.status(403).json({ message: "You do not have permission for this action." });
  }
  return next();
};
