import bcrypt from "bcryptjs";
import { env, isProduction } from "../config/env.js";
import { pool } from "../db/pool.js";
import { buildProfileSettings } from "../functions/buildProfileSettings.js";
import { hasPermission, isTeamAccessPaused, loadUserAccess, recordActivity, teamAccessPausedMessage } from "../services/accountAccessService.js";
import { signSessionToken } from "../utils/jwt.js";

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const setSessionCookie = (res, user) => {
  const token = signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    accountId: user.account?.id ?? null,
    accountRole: user.accountRole,
  });
  res.cookie(env.cookieName, token, buildCookieOptions());
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const result = await pool.query(`
      SELECT id, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email.toLowerCase().trim()]);
    const databaseUser = result.rows[0];

    if (!databaseUser || !(await bcrypt.compare(password, databaseUser.password_hash))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = await loadUserAccess(databaseUser.id);
    if (!user) {
      return res.status(403).json({ message: "This user does not have active account access." });
    }
    if (isTeamAccessPaused(user)) {
      return res.status(403).json({ message: teamAccessPausedMessage, code: "TEAM_ACCESS_PAUSED" });
    }

    setSessionCookie(res, user);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

export const logout = (_req, res) => {
  res.clearCookie(env.cookieName, buildCookieOptions());
  res.status(204).send();
};

export const me = async (req, res, next) => {
  try {
    const user = await loadUserAccess(req.user.sub, req.user.accountId);
    return user
      ? res.json({ user })
      : res.status(404).json({ message: "User not found." });
  } catch (error) {
    return next(error);
  }
};

export const updateMe = async (req, res, next) => {
  const displayName = String(req.body.displayName ?? "").trim();

  if (!displayName) {
    return res.status(400).json({ message: "Display name is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      UPDATE users
      SET display_name = $1, updated_at = NOW()
      WHERE id = $2
    `, [displayName, req.user.sub]);

    if (req.user.accountId && hasPermission(req.user, "settings.manage")) {
      const profileSettings = buildProfileSettings(req.body.profileSettings);
      await client.query(`
        UPDATE accounts
        SET settings = $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(profileSettings), req.user.accountId]);
      await recordActivity(client, {
        accountId: req.user.accountId,
        actorUserId: req.user.sub,
        action: "settings.updated",
        entityType: "account",
        entityId: req.user.accountId,
      });
    } else if (req.user.systemAccess) {
      const profileSettings = buildProfileSettings(req.body.profileSettings);
      await client.query(`
        UPDATE users
        SET profile_settings = $1, updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(profileSettings), req.user.sub]);
      if (!profileSettings.pushoverUserKey) {
        await client.query(`
          UPDATE system_admin_notification_preferences
          SET pushover_enabled = FALSE, updated_at = NOW()
          WHERE user_id = $1
        `, [req.user.sub]);
      }
    }

    await client.query("COMMIT");
    const user = await loadUserAccess(req.user.sub, req.user.accountId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    setSessionCookie(res, user);
    return res.json({ user });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
};
