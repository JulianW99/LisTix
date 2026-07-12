import { roles } from "../config/constants.js";

export const requireSystemAdmin = (req, res, next) => {
  if (req.user?.role !== roles.systemAdmin) {
    return res.status(403).json({ message: "System administrator access required." });
  }

  return next();
};
