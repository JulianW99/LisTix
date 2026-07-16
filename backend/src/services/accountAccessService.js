import { accountPermissions, accountRolePresets } from "../config/constants.js";
import { pool } from "../db/pool.js";

export const sanitizePermissions = (permissions, role = "viewer") => {
  const requested = Array.isArray(permissions) ? permissions : accountRolePresets[role] ?? [];
  return [...new Set(requested.filter((permission) => accountPermissions.includes(permission)))];
};

export const hasPermission = (user, permission) => (
  user?.accountRole === "owner"
  || user?.permissions?.includes("*")
  || user?.permissions?.includes(permission)
);

export const isTeamAccessPaused = (access) => Boolean(
  access?.account
  && !access.account.multiUserEnabled
  && access.accountRole !== "owner"
);

export const teamAccessPausedMessage = "Your access is currently paused because multi-user support is disabled for this account. Contact the account owner.";

export const loadUserAccess = async (userId, preferredAccountId) => {
  const userResult = await pool.query(`
    SELECT id, email, display_name, role, profile_settings, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `, [userId]);
  const user = userResult.rows[0];

  if (!user) return null;

  if (user.role === "system_admin") {
    return {
      id: Number(user.id),
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      profileSettings: user.profile_settings ?? {},
      account: null,
      accountRole: "system_admin",
      permissions: ["*"],
      membershipId: null,
      createdAt: user.created_at,
    };
  }

  const membershipResult = await pool.query(`
    SELECT
      am.id AS membership_id,
      am.role AS account_role,
      am.permissions,
      am.status,
      a.id AS account_id,
      a.name AS account_name,
      a.owner_user_id,
      a.multi_user_enabled,
      a.settings
    FROM account_members am
    INNER JOIN accounts a ON a.id = am.account_id
    WHERE am.user_id = $1 AND am.status = 'active'
    ORDER BY
      CASE WHEN a.id = $2 THEN 0 ELSE 1 END,
      CASE WHEN am.role = 'owner' THEN 0 ELSE 1 END,
      am.accepted_at ASC NULLS LAST
    LIMIT 1
  `, [userId, preferredAccountId || null]);
  const membership = membershipResult.rows[0];

  if (!membership) return null;

  return {
    id: Number(user.id),
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    profileSettings: membership.settings ?? {},
    account: {
      id: Number(membership.account_id),
      name: membership.account_name,
      ownerUserId: Number(membership.owner_user_id),
      multiUserEnabled: Boolean(membership.multi_user_enabled),
    },
    accountRole: membership.account_role,
    permissions: membership.account_role === "owner"
      ? ["*"]
      : sanitizePermissions(membership.permissions, membership.account_role),
    membershipId: Number(membership.membership_id),
    createdAt: user.created_at,
  };
};

export const toRequestUser = (access) => ({
  sub: access.id,
  email: access.email,
  role: access.role,
  displayName: access.displayName,
  accountId: access.account?.id ?? null,
  ownerUserId: access.account?.ownerUserId ?? access.id,
  membershipId: access.membershipId,
  accountRole: access.accountRole,
  permissions: access.permissions,
});

export const recordActivity = async (queryable, {
  accountId,
  actorUserId,
  action,
  entityType,
  entityId,
  metadata = {},
}) => {
  if (!accountId) return;
  await queryable.query(`
    INSERT INTO account_activity_logs (
      account_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [accountId, actorUserId || null, action, entityType, entityId ? String(entityId) : null, JSON.stringify(metadata)]);
};

export const touchMembership = async (membershipId) => {
  if (!membershipId) return;
  await pool.query(
    "UPDATE account_members SET last_seen_at = NOW() WHERE id = $1",
    [membershipId],
  );
};
