import { roles } from "../config/constants.js";
import { pool } from "../db/pool.js";
import { sendDiscordDirectMessage } from "./discordBotService.js";
import { sendOperationsEmail, sendPushoverNotification } from "./notificationService.js";

export const systemAdminNotificationEvents = [
  { key: "marketplace_sync_error", label: "Marketplace synchronization error", description: "Publishing, updating or deleting a marketplace listing failed." },
  { key: "page_error", label: "Application / page error", description: "An API request ended with an unexpected server error." },
  { key: "sale_not_sent", label: "Sale not sent", description: "A delivery deadline passed before the sale was marked as sent." },
  { key: "notification_delivery_error", label: "Notification delivery error", description: "A mandatory user notification could not be delivered." },
  { key: "payment_error", label: "Payment or payout error", description: "A payout or payment automation failed." },
];

const eventKeys = new Set(systemAdminNotificationEvents.map((event) => event.key));
const emptyPreferences = () => Object.fromEntries(systemAdminNotificationEvents.map((event) => [
  event.key,
  { email: false, discord: false, pushover: false },
]));

const eligibleAdminsSql = `
  SELECT u.id AS user_id, u.display_name, u.email, u.role,
    COALESCE(sam.role, 'administrator') AS admin_role,
    uc.provider_user_id AS discord_user_id,
    COALESCE(u.profile_settings->>'pushoverUserKey', '') AS pushover_user_key
  FROM users u
  LEFT JOIN system_admin_members sam ON sam.user_id = u.id AND sam.status = 'active'
  LEFT JOIN user_connections uc ON uc.user_id = u.id AND uc.provider = 'discord'
  WHERE u.account_status = 'active'
    AND (u.role = $1 OR (u.role = $2 AND sam.id IS NOT NULL))
`;

export const getSystemAdminNotificationSettings = async () => {
  const [adminResult, preferenceResult] = await Promise.all([
    pool.query(`${eligibleAdminsSql} ORDER BY u.display_name, u.email`, [roles.systemAdmin, roles.systemStaff]),
    pool.query(`
      SELECT preference.*
      FROM system_admin_notification_preferences preference
      INNER JOIN users u ON u.id = preference.user_id
    `),
  ]);
  const preferencesByUser = new Map();
  for (const row of preferenceResult.rows) {
    if (!eventKeys.has(row.event_type)) continue;
    const preferences = preferencesByUser.get(Number(row.user_id)) ?? emptyPreferences();
    preferences[row.event_type] = {
      email: Boolean(row.email_enabled),
      discord: Boolean(row.discord_enabled),
      pushover: Boolean(row.pushover_enabled),
    };
    preferencesByUser.set(Number(row.user_id), preferences);
  }
  return {
    events: systemAdminNotificationEvents,
    channels: ["email", "discord", "pushover"],
    admins: adminResult.rows.map((row) => ({
      userId: Number(row.user_id),
      displayName: row.display_name,
      email: row.email,
      role: row.admin_role,
      connections: {
        email: Boolean(row.email),
        discord: Boolean(row.discord_user_id),
        pushover: Boolean(row.pushover_user_key),
      },
      preferences: preferencesByUser.get(Number(row.user_id)) ?? emptyPreferences(),
    })),
  };
};

export const updateSystemAdminNotificationSettings = async (payload) => {
  const requestedAdmins = Array.isArray(payload?.admins) ? payload.admins : [];
  const eligibleResult = await pool.query(eligibleAdminsSql, [roles.systemAdmin, roles.systemStaff]);
  const eligible = new Map(eligibleResult.rows.map((row) => [Number(row.user_id), row]));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const requested of requestedAdmins) {
      const userId = Number(requested?.userId);
      const admin = eligible.get(userId);
      if (!admin) {
        const error = new Error("Notification recipients must be active system administrators.");
        error.statusCode = 400;
        throw error;
      }
      for (const event of systemAdminNotificationEvents) {
        const preference = requested?.preferences?.[event.key] ?? {};
        const emailEnabled = preference.email === true;
        const discordEnabled = preference.discord === true;
        const pushoverEnabled = preference.pushover === true;
        if (discordEnabled && !admin.discord_user_id) {
          const error = new Error(`${admin.display_name} has no connected Discord account.`);
          error.statusCode = 400;
          throw error;
        }
        if (pushoverEnabled && !admin.pushover_user_key) {
          const error = new Error(`${admin.display_name} has no Pushover key.`);
          error.statusCode = 400;
          throw error;
        }
        await client.query(`
          INSERT INTO system_admin_notification_preferences (
            user_id, event_type, email_enabled, discord_enabled, pushover_enabled
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, event_type) DO UPDATE SET
            email_enabled = EXCLUDED.email_enabled,
            discord_enabled = EXCLUDED.discord_enabled,
            pushover_enabled = EXCLUDED.pushover_enabled,
            updated_at = NOW()
        `, [userId, event.key, emailEnabled, discordEnabled, pushoverEnabled]);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getSystemAdminNotificationSettings();
};

export const notifySystemAdmins = async ({ eventType, title, message, details = {} }) => {
  if (!eventKeys.has(eventType)) throw new Error(`Unknown system notification event: ${eventType}`);
  const result = await pool.query(`
    ${eligibleAdminsSql}
      AND EXISTS (
        SELECT 1 FROM system_admin_notification_preferences preference
        WHERE preference.user_id = u.id AND preference.event_type = $3
          AND (preference.email_enabled OR preference.discord_enabled OR preference.pushover_enabled)
      )
    ORDER BY u.id
  `, [roles.systemAdmin, roles.systemStaff, eventType]);
  const preferences = await pool.query(`
    SELECT * FROM system_admin_notification_preferences WHERE event_type = $1
  `, [eventType]);
  const preferenceByUser = new Map(preferences.rows.map((row) => [Number(row.user_id), row]));
  const detailText = Object.entries(details).map(([key, value]) => `${key}: ${String(value)}`).join("\n");
  const fullMessage = detailText ? `${message}\n\n${detailText}` : message;
  const deliveries = await Promise.all(result.rows.map(async (admin) => {
    const preference = preferenceByUser.get(Number(admin.user_id));
    const [email, discord, pushover] = await Promise.all([
      preference.email_enabled
        ? sendOperationsEmail({ to: admin.email, subject: title, text: fullMessage })
        : Promise.resolve({ status: "disabled" }),
      preference.discord_enabled
        ? sendDiscordDirectMessage({ discordUserId: admin.discord_user_id, title, message: fullMessage, color: 15158332 })
        : Promise.resolve({ status: "disabled" }),
      preference.pushover_enabled
        ? sendPushoverNotification({ userKey: admin.pushover_user_key, title, message: fullMessage })
        : Promise.resolve({ status: "disabled" }),
    ]);
    return { userId: Number(admin.user_id), email, discord, pushover };
  }));
  return { eventType, deliveries };
};
