import { env } from "../config/env.js";
import { verifySessionToken } from "../utils/jwt.js";

export const authenticate = (req, res, next) => {
  const token = req.cookies[env.cookieName];

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    req.user = verifySessionToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Session is invalid or expired." });
  }
};
