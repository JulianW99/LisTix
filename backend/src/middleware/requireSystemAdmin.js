import { roles } from "../config/constants.js";

export const requireSystemAdmin = (req, res, next) => {
  if (![roles.systemAdmin, roles.systemStaff].includes(req.user?.role)) {
    return res.status(403).json({ message: "System administrator access required." });
  }

  return next();
};

export const requireSystemPermission = (permission) => (req, res, next) => {
  if (req.user?.permissions?.includes("*") || req.user?.permissions?.includes(permission)) return next();
  return res.status(403).json({ message: "You do not have permission for this system administration action." });
};
