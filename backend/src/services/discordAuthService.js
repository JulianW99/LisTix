import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { recordActivity } from "./accountAccessService.js";

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_CURRENT_USER_URL = "https://discord.com/api/v10/users/@me";

export const isDiscordConfigured = () => Boolean(
  env.discord.clientId
  && env.discord.clientSecret
  && env.discord.redirectUri
);

const configurationError = () => {
  const error = new Error("Discord connection is not configured on the server.");
  error.statusCode = 503;
  return error;
};

export const buildDiscordAuthorizationUrl = (state) => {
  if (!isDiscordConfigured()) throw configurationError();

  const query = new URLSearchParams({
    response_type: "code",
    client_id: env.discord.clientId,
    redirect_uri: env.discord.redirectUri,
    scope: "identify email",
    state,
    prompt: "consent",
  });
  return `${DISCORD_AUTHORIZE_URL}?${query.toString()}`;
};

const discordRequestError = async (response, fallback) => {
  const payload = await response.json().catch(() => ({}));
  const error = new Error(payload.error_description || payload.message || fallback);
  error.statusCode = 502;
  return error;
};

export const exchangeDiscordCode = async (code) => {
  if (!isDiscordConfigured()) throw configurationError();

  const body = new URLSearchParams({
    client_id: env.discord.clientId,
    client_secret: env.discord.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.discord.redirectUri,
  });
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw await discordRequestError(response, "Discord authorization could not be completed.");
  return response.json();
};

export const fetchDiscordUser = async (accessToken) => {
  const response = await fetch(DISCORD_CURRENT_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw await discordRequestError(response, "Discord profile could not be loaded.");
  return response.json();
};

const avatarUrl = (row) => row.avatar_hash
  ? `https://cdn.discordapp.com/avatars/${row.provider_user_id}/${row.avatar_hash}.${row.avatar_hash.startsWith("a_") ? "gif" : "png"}?size=128`
  : null;

const mapConnection = (row) => row ? ({
  connected: true,
  id: row.provider_user_id,
  username: row.username,
  displayName: row.display_name || row.username,
  email: row.email,
  avatarUrl: avatarUrl(row),
  connectedAt: row.connected_at,
  lastLoginAt: row.last_login_at,
}) : ({ connected: false });

export const getDiscordConnection = async (userId) => {
  const result = await pool.query(`
    SELECT provider_user_id, username, display_name, email, avatar_hash, connected_at, last_login_at
    FROM user_connections
    WHERE user_id = $1 AND provider = 'discord'
    LIMIT 1
  `, [userId]);
  return mapConnection(result.rows[0]);
};

export const connectDiscordAccount = async ({ userId, accountId, discordUser, scopes }) => {
  const client = await pool.connect();
  const discordId = String(discordUser.id);
  const username = String(discordUser.username || discordUser.global_name || discordId);
  const displayName = String(discordUser.global_name || discordUser.username || discordId);

  try {
    await client.query("BEGIN");
    const existing = await client.query(`
      SELECT user_id
      FROM user_connections
      WHERE provider = 'discord' AND provider_user_id = $1
      LIMIT 1
      FOR UPDATE
    `, [discordId]);

    if (existing.rows[0] && Number(existing.rows[0].user_id) !== Number(userId)) {
      const error = new Error("This Discord account is already connected to another LisTix user.");
      error.statusCode = 409;
      throw error;
    }

    await client.query(`
      INSERT INTO user_connections (
        user_id, provider, provider_user_id, username, display_name, email, avatar_hash, scopes
      )
      VALUES ($1, 'discord', $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        provider_user_id = EXCLUDED.provider_user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        avatar_hash = EXCLUDED.avatar_hash,
        scopes = EXCLUDED.scopes,
        connected_at = NOW(),
        updated_at = NOW()
    `, [
      userId,
      discordId,
      username,
      displayName,
      discordUser.email || null,
      discordUser.avatar || null,
      JSON.stringify(scopes),
    ]);

    await client.query(`
      UPDATE users
      SET profile_settings = jsonb_set(
        jsonb_set(COALESCE(profile_settings, '{}'::jsonb), '{discordHandle}', to_jsonb($1::text), true),
        '{discordUserId}', to_jsonb($2::text), true
      ), updated_at = NOW()
      WHERE id = $3
    `, [displayName, discordId, userId]);

    await recordActivity(client, {
      accountId,
      actorUserId: userId,
      action: "connection.discord_connected",
      entityType: "user_connection",
      entityId: discordId,
      metadata: { provider: "discord" },
    });
    await client.query("COMMIT");
    return getDiscordConnection(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "This Discord account is already connected to another LisTix user.";
    }
    throw error;
  } finally {
    client.release();
  }
};

export const disconnectDiscordAccount = async ({ userId, accountId }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      DELETE FROM user_connections
      WHERE user_id = $1 AND provider = 'discord'
      RETURNING provider_user_id
    `, [userId]);
    await client.query(`
      UPDATE system_admin_notification_preferences
      SET discord_enabled = FALSE, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
    await client.query(`
      UPDATE users
      SET profile_settings = COALESCE(profile_settings, '{}'::jsonb) - 'discordHandle' - 'discordUserId',
          updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    if (result.rows[0]) {
      await recordActivity(client, {
        accountId,
        actorUserId: userId,
        action: "connection.discord_disconnected",
        entityType: "user_connection",
        entityId: result.rows[0].provider_user_id,
        metadata: { provider: "discord" },
      });
    }
    await client.query("COMMIT");
    return Boolean(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
