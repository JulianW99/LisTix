import bcrypt from "bcryptjs";
import { env, isProduction } from "../config/env.js";
import { pool } from "../db/pool.js";
import { signSessionToken } from "../utils/jwt.js";

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  createdAt: row.created_at,
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const result = await pool.query(
      `
        SELECT id, email, password_hash, display_name, role, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email.toLowerCase().trim()],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    });

    res.cookie(env.cookieName, token, buildCookieOptions());

    return res.json({ user: mapUser(user) });
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
    const result = await pool.query(
      `
        SELECT id, email, display_name, role, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.sub],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: mapUser(user) });
  } catch (error) {
    return next(error);
  }
};
