import bcrypt from "bcryptjs";
import crypto from "crypto";
import { accountPermissions, accountRolePresets, roles } from "../config/constants.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { recordActivity, sanitizePermissions } from "./accountAccessService.js";

const roleNames = Object.keys(accountRolePresets);
const assignableRoleNames = roleNames.filter((role) => role !== "owner");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const mapMember = (row) => ({
  id: Number(row.id),
  userId: row.user_id === null ? null : Number(row.user_id),
  email: row.email,
  displayName: row.display_name || row.email.split("@")[0],
  role: row.role,
  permissions: Array.isArray(row.permissions) ? row.permissions : [],
  status: row.status,
  invitedBy: row.invited_by_name || null,
  invitationExpiresAt: row.invitation_expires_at,
  acceptedAt: row.accepted_at,
  lastSeenAt: row.last_seen_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const memberSelectSql = `
  SELECT
    am.*,
    u.display_name,
    inviter.display_name AS invited_by_name
  FROM account_members am
  LEFT JOIN users u ON u.id = am.user_id
  LEFT JOIN users inviter ON inviter.id = am.invited_by_user_id
`;

export const getTeamConfiguration = async (accountId) => {
  const [accountResult, membersResult] = await Promise.all([
    pool.query(`
      SELECT id, name, multi_user_enabled
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `, [accountId]),
    pool.query(`
      ${memberSelectSql}
      WHERE am.account_id = $1
      ORDER BY CASE am.role WHEN 'owner' THEN 0 ELSE 1 END, am.created_at ASC
    `, [accountId]),
  ]);
  const account = accountResult.rows[0];

  if (!account) return null;

  return {
    account: {
      id: Number(account.id),
      name: account.name,
      multiUserEnabled: Boolean(account.multi_user_enabled),
    },
    members: membersResult.rows.map(mapMember),
    roles: assignableRoleNames.map((role) => ({ role, permissions: accountRolePresets[role] })),
    permissions: accountPermissions,
  };
};

export const setMultiUserEnabled = async (accountId, enabled, actor) => {
  const result = await pool.query(`
    UPDATE accounts
    SET multi_user_enabled = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, multi_user_enabled
  `, [Boolean(enabled), accountId]);

  if (!result.rows[0]) return null;

  await recordActivity(pool, {
    accountId,
    actorUserId: actor.sub,
    action: enabled ? "team.enabled" : "team.disabled",
    entityType: "account",
    entityId: accountId,
  });

  return {
    id: Number(result.rows[0].id),
    name: result.rows[0].name,
    multiUserEnabled: Boolean(result.rows[0].multi_user_enabled),
  };
};

export const inviteAccountMember = async (accountId, payload, actor) => {
  const email = String(payload?.email || "").trim().toLowerCase();
  const role = String(payload?.role || "viewer");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error("A valid email address is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!assignableRoleNames.includes(role)) {
    const error = new Error("Selected team role is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const permissions = sanitizePermissions(payload?.permissions, role);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const accountResult = await client.query(
      "SELECT multi_user_enabled FROM accounts WHERE id = $1 FOR UPDATE",
      [accountId],
    );

    if (!accountResult.rows[0]?.multi_user_enabled) {
      const error = new Error("Enable multi-user support before inviting members.");
      error.statusCode = 409;
      throw error;
    }

    const registered = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
    if (registered.rows[0]) {
      const error = new Error("This email already belongs to a registered LisTix user.");
      error.statusCode = 409;
      throw error;
    }

    const existing = await client.query(
      "SELECT status FROM account_members WHERE account_id = $1 AND email = $2 LIMIT 1",
      [accountId, email],
    );
    if (existing.rows[0] && !["pending", "revoked"].includes(existing.rows[0].status)) {
      const error = new Error("This person is already a member of the account.");
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(`
      INSERT INTO account_members (
        account_id, email, role, permissions, status, invitation_token_hash,
        invitation_expires_at, invited_by_user_id
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '7 days', $6)
      ON CONFLICT (account_id, email) DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        status = 'pending',
        invitation_token_hash = EXCLUDED.invitation_token_hash,
        invitation_expires_at = EXCLUDED.invitation_expires_at,
        invited_by_user_id = EXCLUDED.invited_by_user_id,
        updated_at = NOW()
      RETURNING id
    `, [accountId, email, role, JSON.stringify(permissions), tokenHash, actor.sub]);

    await recordActivity(client, {
      accountId,
      actorUserId: actor.sub,
      action: "team.member_invited",
      entityType: "account_member",
      entityId: result.rows[0].id,
      metadata: { email, role },
    });
    await client.query("COMMIT");

    const memberResult = await pool.query(`
      ${memberSelectSql}
      WHERE am.id = $1
      LIMIT 1
    `, [result.rows[0].id]);

    return {
      member: mapMember(memberResult.rows[0]),
      inviteUrl: `${env.frontendUrl.replace(/\/$/, "")}/invite/${token}`,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateAccountMember = async (accountId, memberId, payload, actor) => {
  const currentResult = await pool.query(`
    SELECT id, role, status, email
    FROM account_members
    WHERE id = $1 AND account_id = $2
    LIMIT 1
  `, [memberId, accountId]);
  const current = currentResult.rows[0];

  if (!current) return null;
  if (current.role === "owner") {
    const error = new Error("The account owner cannot be changed here.");
    error.statusCode = 400;
    throw error;
  }

  const role = payload?.role === undefined ? current.role : String(payload.role);
  if (!assignableRoleNames.includes(role)) {
    const error = new Error("Selected team role is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const allowedStatuses = current.status === "pending"
    ? ["pending", "revoked"]
    : ["active", "suspended", "revoked"];
  const status = payload?.status === undefined ? current.status : String(payload.status);
  if (!allowedStatuses.includes(status)) {
    const error = new Error("Selected member status is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const permissions = sanitizePermissions(payload?.permissions, role);
  const result = await pool.query(`
    UPDATE account_members
    SET role = $1, permissions = $2, status = $3, updated_at = NOW()
    WHERE id = $4 AND account_id = $5
    RETURNING id
  `, [role, JSON.stringify(permissions), status, memberId, accountId]);

  await recordActivity(pool, {
    accountId,
    actorUserId: actor.sub,
    action: "team.member_updated",
    entityType: "account_member",
    entityId: memberId,
    metadata: { email: current.email, role, status },
  });

  const memberResult = await pool.query(`
    ${memberSelectSql}
    WHERE am.id = $1
    LIMIT 1
  `, [result.rows[0].id]);
  return mapMember(memberResult.rows[0]);
};

export const deleteAccountMember = async (accountId, memberId, actor) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const currentResult = await client.query(`
      SELECT id, user_id, role, status, email
      FROM account_members
      WHERE id = $1 AND account_id = $2
      FOR UPDATE
    `, [memberId, accountId]);
    const current = currentResult.rows[0];

    if (!current) {
      await client.query("ROLLBACK");
      return false;
    }
    if (current.role === "owner") {
      const error = new Error("The account owner cannot be removed.");
      error.statusCode = 400;
      throw error;
    }
    if (Number(current.user_id) === Number(actor.sub)) {
      const error = new Error("You cannot remove your own account access.");
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      "DELETE FROM account_members WHERE id = $1 AND account_id = $2",
      [memberId, accountId],
    );
    await recordActivity(client, {
      accountId,
      actorUserId: actor.sub,
      action: "team.member_removed",
      entityType: "account_member",
      entityId: memberId,
      metadata: { email: current.email, role: current.role, status: current.status },
    });
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listAccountActivity = async (accountId, limit = 100) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const result = await pool.query(`
    SELECT
      log.id,
      log.action,
      log.entity_type,
      log.entity_id,
      log.metadata,
      log.created_at,
      u.display_name AS actor_name,
      u.email AS actor_email
    FROM account_activity_logs log
    LEFT JOIN users u ON u.id = log.actor_user_id
    WHERE log.account_id = $1
    ORDER BY log.created_at DESC
    LIMIT $2
  `, [accountId, safeLimit]);

  return result.rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    actorName: row.actor_name || "System",
    actorEmail: row.actor_email || null,
    createdAt: row.created_at,
  }));
};

export const getInvitation = async (token) => {
  const result = await pool.query(`
    SELECT am.email, am.role, am.status, am.invitation_expires_at, a.name AS account_name
    FROM account_members am
    INNER JOIN accounts a ON a.id = am.account_id
    WHERE am.invitation_token_hash = $1
    LIMIT 1
  `, [hashToken(String(token))]);
  const invitation = result.rows[0];

  if (!invitation || invitation.status !== "pending" || new Date(invitation.invitation_expires_at) <= new Date()) {
    return null;
  }

  return {
    email: invitation.email,
    role: invitation.role,
    accountName: invitation.account_name,
    expiresAt: invitation.invitation_expires_at,
  };
};

export const acceptInvitation = async (token, payload) => {
  const displayName = String(payload?.displayName || "").trim();
  const password = String(payload?.password || "");

  if (displayName.length < 2) {
    const error = new Error("Display name must contain at least 2 characters.");
    error.statusCode = 400;
    throw error;
  }
  if (password.length < 10) {
    const error = new Error("Password must contain at least 10 characters.");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invitationResult = await client.query(`
      SELECT am.*, a.name AS account_name, a.multi_user_enabled
      FROM account_members am
      INNER JOIN accounts a ON a.id = am.account_id
      WHERE am.invitation_token_hash = $1
      FOR UPDATE
    `, [hashToken(String(token))]);
    const invitation = invitationResult.rows[0];

    if (!invitation || invitation.status !== "pending" || new Date(invitation.invitation_expires_at) <= new Date()) {
      const error = new Error("This invitation is invalid or has expired.");
      error.statusCode = 410;
      throw error;
    }
    if (!invitation.multi_user_enabled) {
      const error = new Error("Multi-user access is currently disabled for this account.");
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, display_name, role, profile_settings)
      VALUES ($1, $2, $3, $4, '{}'::jsonb)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [invitation.email, passwordHash, displayName, roles.user]);

    if (!userResult.rows[0]) {
      const error = new Error("A LisTix user with this email already exists.");
      error.statusCode = 409;
      throw error;
    }

    await client.query(`
      UPDATE account_members
      SET user_id = $1,
          status = 'active',
          invitation_token_hash = NULL,
          accepted_at = NOW(),
          last_seen_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [userResult.rows[0].id, invitation.id]);

    await recordActivity(client, {
      accountId: invitation.account_id,
      actorUserId: userResult.rows[0].id,
      action: "team.invitation_accepted",
      entityType: "account_member",
      entityId: invitation.id,
      metadata: { email: invitation.email },
    });
    await client.query("COMMIT");

    return { email: invitation.email, accountName: invitation.account_name };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
