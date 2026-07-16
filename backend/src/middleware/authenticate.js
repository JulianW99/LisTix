import { env } from "../config/env.js";
import { verifySessionToken } from "../utils/jwt.js";
import { isTeamAccessPaused, loadUserAccess, teamAccessPausedMessage, toRequestUser, touchMembership } from "../services/accountAccessService.js";

export const authenticate = async (req, res, next) => {
  const token = req.cookies[env.cookieName];

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const tokenPayload = verifySessionToken(token);
    const access = await loadUserAccess(tokenPayload.sub, tokenPayload.accountId);

    if (!access) {
      return res.status(401).json({ message: "Your account access is no longer active." });
    }

    if (isTeamAccessPaused(access)) {
      return res.status(403).json({ message: teamAccessPausedMessage, code: "TEAM_ACCESS_PAUSED" });
    }

    req.user = toRequestUser(access);
    void touchMembership(access.membershipId).catch(() => undefined);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Session is invalid or expired." });
  }
};
