import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { roles, systemPermissions, systemRolePresets } from "../config/constants.js";
import { pool } from "../db/pool.js";

const assignableRoles = Object.keys(systemRolePresets);
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const sanitizeSystemPermissions = (permissions, role = "viewer") => {
  const requested = Array.isArray(permissions) ? permissions : systemRolePresets[role] ?? [];
  return [...new Set(requested.filter((permission) => systemPermissions.includes(permission)))];
};

const mapMember = (row) => ({
  id: Number(row.id), userId: row.user_id === null ? null : Number(row.user_id),
  email: row.email, displayName: row.display_name || row.email.split("@")[0],
  role: row.role, permissions: Array.isArray(row.permissions) ? row.permissions : [],
  status: row.status, invitedBy: row.invited_by_name || null,
  invitationExpiresAt: row.invitation_expires_at, acceptedAt: row.accepted_at,
  lastSeenAt: row.last_seen_at, createdAt: row.created_at, updatedAt: row.updated_at,
});

const memberSelect = `
  SELECT sam.*, u.display_name, inviter.display_name AS invited_by_name
  FROM system_admin_members sam
  LEFT JOIN users u ON u.id = sam.user_id
  LEFT JOIN users inviter ON inviter.id = sam.invited_by_user_id
`;

export const getSystemTeam = async () => {
  const result = await pool.query(`${memberSelect} ORDER BY sam.created_at ASC`);
  return {
    members: result.rows.map(mapMember),
    roles: assignableRoles.map((role) => ({ role, permissions: systemRolePresets[role] })),
    permissions: systemPermissions,
  };
};

export const inviteSystemMember = async (payload, actor) => {
  const email = String(payload?.email || "").trim().toLowerCase();
  const role = String(payload?.role || "viewer");
  if (!/^\S+@\S+\.\S+$/.test(email)) { const error = new Error("A valid email address is required."); error.statusCode = 400; throw error; }
  if (!assignableRoles.includes(role)) { const error = new Error("Selected system role is invalid."); error.statusCode = 400; throw error; }
  const existingUser = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existingUser.rows[0]) { const error = new Error("This email already belongs to a LisTix user."); error.statusCode = 409; throw error; }
  const permissions = sanitizeSystemPermissions(payload?.permissions, role);
  const token = crypto.randomBytes(32).toString("hex");
  const result = await pool.query(`
    INSERT INTO system_admin_members (
      email, role, permissions, status, invitation_token_hash,
      invitation_expires_at, invited_by_user_id
    ) VALUES ($1, $2, $3, 'pending', $4, NOW() + INTERVAL '7 days', $5)
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role,
      permissions = EXCLUDED.permissions, status = 'pending', user_id = NULL,
      invitation_token_hash = EXCLUDED.invitation_token_hash,
      invitation_expires_at = EXCLUDED.invitation_expires_at,
      invited_by_user_id = EXCLUDED.invited_by_user_id, updated_at = NOW()
    RETURNING id
  `, [email, role, JSON.stringify(permissions), hashToken(token), actor.sub]);
  const member = await pool.query(`${memberSelect} WHERE sam.id = $1`, [result.rows[0].id]);
  return { member: mapMember(member.rows[0]), inviteUrl: `${env.frontendUrl.replace(/\/$/, "")}/invite/${token}` };
};

export const updateSystemMember = async (id, payload) => {
  const current = await pool.query("SELECT * FROM system_admin_members WHERE id = $1 LIMIT 1", [Number(id)]);
  if (!current.rows[0]) return null;
  const role = payload.role === undefined ? current.rows[0].role : String(payload.role);
  const status = payload.status === undefined ? current.rows[0].status : String(payload.status);
  if (!assignableRoles.includes(role)) { const error = new Error("Selected system role is invalid."); error.statusCode = 400; throw error; }
  if (!["pending", "active", "suspended", "revoked"].includes(status)) { const error = new Error("Selected member status is invalid."); error.statusCode = 400; throw error; }
  const permissions = sanitizeSystemPermissions(payload.permissions, role);
  await pool.query(`
    UPDATE system_admin_members SET role = $1, permissions = $2, status = $3, updated_at = NOW()
    WHERE id = $4
  `, [role, JSON.stringify(permissions), status, Number(id)]);
  const result = await pool.query(`${memberSelect} WHERE sam.id = $1`, [Number(id)]);
  return result.rows[0] ? mapMember(result.rows[0]) : null;
};

export const deleteSystemMember = async (id, actor) => {
  const result = await pool.query(`
    DELETE FROM system_admin_members
    WHERE id = $1 AND (user_id IS NULL OR user_id <> $2)
    RETURNING id
  `, [Number(id), actor.sub]);
  return result.rowCount > 0;
};

export const getSystemInvitation = async (token) => {
  const result = await pool.query(`
    SELECT email, role, status, invitation_expires_at
    FROM system_admin_members WHERE invitation_token_hash = $1 LIMIT 1
  `, [hashToken(String(token))]);
  const invitation = result.rows[0];
  if (!invitation || invitation.status !== "pending" || new Date(invitation.invitation_expires_at) <= new Date()) return null;
  return {
    invitationType: "system_admin", email: invitation.email, role: invitation.role,
    accountName: "LisTix System Administration", expiresAt: invitation.invitation_expires_at,
  };
};

export const acceptSystemInvitation = async (token, payload) => {
  const displayName = String(payload?.displayName || "").trim();
  const password = String(payload?.password || "");
  if (displayName.length < 2) { const error = new Error("Display name must contain at least 2 characters."); error.statusCode = 400; throw error; }
  if (password.length < 10) { const error = new Error("Password must contain at least 10 characters."); error.statusCode = 400; throw error; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT * FROM system_admin_members WHERE invitation_token_hash = $1 FOR UPDATE
    `, [hashToken(String(token))]);
    const invitation = result.rows[0];
    if (!invitation || invitation.status !== "pending" || new Date(invitation.invitation_expires_at) <= new Date()) {
      const error = new Error("This invitation is invalid or has expired."); error.statusCode = 410; throw error;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, display_name, role, profile_settings)
      VALUES ($1, $2, $3, $4, '{}'::jsonb)
      ON CONFLICT (email) DO NOTHING RETURNING id
    `, [invitation.email, passwordHash, displayName, roles.systemStaff]);
    if (!userResult.rows[0]) { const error = new Error("A LisTix user with this email already exists."); error.statusCode = 409; throw error; }
    await client.query(`
      UPDATE system_admin_members SET user_id = $1, status = 'active', invitation_token_hash = NULL,
        accepted_at = NOW(), last_seen_at = NOW(), updated_at = NOW() WHERE id = $2
    `, [userResult.rows[0].id, invitation.id]);
    await client.query("COMMIT");
    return { email: invitation.email, accountName: "LisTix System Administration" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
};

export const touchSystemMembership = async (membershipId) => {
  if (!membershipId) return;
  await pool.query("UPDATE system_admin_members SET last_seen_at = NOW() WHERE id = $1", [membershipId]);
};
