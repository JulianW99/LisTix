import { accountPermissions, accountRolePresets, roles } from "../config/constants.js";
import { pool } from "../db/pool.js";
import { getUserPointSummary } from "./pointService.js";
import { sanitizeSystemPermissions } from "./systemAccessService.js";

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
    SELECT id, email, display_name, role, profile_settings, account_status, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `, [userId]);
  const user = userResult.rows[0];

  if (!user || user.account_status !== "active") return null;

  if (user.role === roles.systemAdmin) {
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
      systemMembershipId: null,
      systemAccess: true,
      pointBalance: 0,
      totalPaidOut: 0,
      podEligibility: null,
      createdAt: user.created_at,
    };
  }

  if (user.role === roles.systemStaff) {
    const membershipResult = await pool.query(`
      SELECT id, role, permissions, status
      FROM system_admin_members
      WHERE user_id = $1 AND status = 'active'
      LIMIT 1
    `, [userId]);
    const membership = membershipResult.rows[0];
    if (!membership) return null;
    return {
      id: Number(user.id), email: user.email, displayName: user.display_name,
      role: user.role, profileSettings: user.profile_settings ?? {}, account: null,
      accountRole: membership.role,
      permissions: sanitizeSystemPermissions(membership.permissions, membership.role),
      membershipId: null, systemMembershipId: Number(membership.id), systemAccess: true,
      pointBalance: 0, totalPaidOut: 0, podEligibility: null,
      createdAt: user.created_at,
    };
  }

  if (user.role === roles.buyer) {
    return {
      id: Number(user.id), email: user.email, displayName: user.display_name,
      role: user.role, profileSettings: user.profile_settings ?? {}, account: null,
      accountRole: "buyer", permissions: ["marketplace.view", "marketplace.buy"],
      membershipId: null, systemMembershipId: null, systemAccess: false,
      pointBalance: 0, totalPaidOut: 0, podEligibility: null,
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

  const pointSummary = await getUserPointSummary(Number(membership.owner_user_id));
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
    systemMembershipId: null,
    systemAccess: false,
    ...pointSummary,
    createdAt: user.created_at,
  };
};

export const toRequestUser = (access) => ({
  sub: access.id,
  email: access.email,
  displayName: access.displayName,
  role: access.role,
  displayName: access.displayName,
  accountId: access.account?.id ?? null,
  ownerUserId: access.account?.ownerUserId ?? access.id,
  membershipId: access.membershipId,
  systemMembershipId: access.systemMembershipId,
  systemAccess: access.systemAccess,
  accountRole: access.accountRole,
  permissions: access.permissions,
  pointBalance: access.pointBalance,
  totalPaidOut: access.totalPaidOut,
  podEligibility: access.podEligibility,
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
