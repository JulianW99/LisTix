import { notificationPreferenceFor } from "../functions/buildNotificationPreferences.js";
import { pool } from "../db/pool.js";
import { sendDiscordDirectMessage } from "./discordBotService.js";
import { sendOperationsEmail, sendPushoverNotification } from "./notificationService.js";

const disabled = { status: "disabled", reason: "Disabled in notification settings." };

const loadNotificationRecipient = async ({ ticketId, userId }) => {
  const result = ticketId
    ? await pool.query(`
        SELECT u.id AS user_id, u.email,
          COALESCE(a.settings, u.profile_settings, '{}'::jsonb) AS profile_settings,
          uc.provider_user_id AS discord_user_id
        FROM tickets t
        INNER JOIN users u ON u.id = t.user_id
        LEFT JOIN accounts a ON a.id = t.account_id
        LEFT JOIN user_connections uc ON uc.user_id = u.id AND uc.provider = 'discord'
        WHERE t.id = $1
        LIMIT 1
      `, [Number(ticketId)])
    : await pool.query(`
        SELECT u.id AS user_id, u.email, u.profile_settings,
          uc.provider_user_id AS discord_user_id
        FROM users u
        LEFT JOIN user_connections uc ON uc.user_id = u.id AND uc.provider = 'discord'
        WHERE u.id = $1
        LIMIT 1
      `, [Number(userId)]);

  const row = result.rows[0];
  if (!row) return null;
  return {
    userId: Number(row.user_id),
    email: row.email,
    profileSettings: row.profile_settings ?? {},
    discordUserId: row.discord_user_id ?? null,
  };
};

export const dispatchUserNotification = async ({
  eventType,
  sale,
  ticketId,
  userId,
  title,
  message,
  email,
  discord,
}) => {
  const recipient = await loadNotificationRecipient({
    ticketId: ticketId ?? sale?.ticketDatabaseId,
    userId: userId ?? sale?.userId,
  });
  if (!recipient) {
    const missing = { status: "skipped", reason: "Notification recipient was not found." };
    return { email: missing, discord: missing, pushover: missing };
  }

  const preference = notificationPreferenceFor(recipient.profileSettings, eventType);
  const emailPromise = preference.email
    ? sendOperationsEmail({ to: recipient.email, subject: email?.subject ?? title, text: email?.text ?? message, html: email?.html })
    : Promise.resolve(disabled);
  const discordPromise = preference.discord
    ? (discord
      ? discord({ discordUserId: recipient.discordUserId })
      : sendDiscordDirectMessage({ discordUserId: recipient.discordUserId, title, message }))
    : Promise.resolve(disabled);
  const pushoverPromise = preference.pushover
    ? sendPushoverNotification({
        userKey: String(recipient.profileSettings.pushoverUserKey ?? "").trim(),
        title,
        message,
      })
    : Promise.resolve(disabled);

  const [emailResult, discordResult, pushoverResult] = await Promise.all([
    emailPromise,
    discordPromise,
    pushoverPromise,
  ]);
  return { email: emailResult, discord: discordResult, pushover: pushoverResult };
};

export const dispatchPayoutSentNotification = async (sale) => dispatchUserNotification({
  eventType: "payout_sent",
  sale,
  title: `Payout sent · ${sale.listixSaleId}`,
  message: `Your payout of €${Number(sale.userPayout ?? sale.grossAmount ?? 0).toFixed(2)} for ${sale.eventName} was sent.`,
  email: {
    subject: `Payout sent · ${sale.listixSaleId}`,
    text: `Your payout of €${Number(sale.userPayout ?? sale.grossAmount ?? 0).toFixed(2)} for ${sale.eventName} was sent.`,
  },
});
