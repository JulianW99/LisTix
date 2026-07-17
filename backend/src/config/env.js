import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const env = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 4010),
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST ?? "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB ?? "ticket_admin_mvp",
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "postgres",
    ssl: parseBoolean(process.env.DATABASE_SSL, Boolean(process.env.DATABASE_URL)),
  },
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-long-random-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: process.env.COOKIE_NAME || "ticket_admin_session",
  listixFeePercentage: Math.max(0, Number(process.env.LISTIX_FEE_PERCENTAGE || 8.9)),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4173",
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
    botToken: process.env.DISCORD_BOT_TOKEN || process.env.Discord_BOT_TOKEN || "",
    supportRoleId: process.env.DISCORD_SUPPORT_ROLE_ID || "1526275467475292291",
    retransferCategoryId: process.env.DISCORD_RETRANSFER_CATEGORY_ID || "1527348867572695192",
    completedRetransferCategoryId: process.env.DISCORD_COMPLETED_RETRANSFER_CATEGORY_ID || "1527352095898861679",
    b2bPurchaseCategoryId: process.env.DISCORD_B2B_PURCHASE_CATEGORY_ID || "1527371703087534110",
    completedB2bPurchaseCategoryId: process.env.DISCORD_COMPLETED_B2B_PURCHASE_CATEGORY_ID || "1527371798625386608",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    fromName: process.env.MAIL_FROM_NAME || "LisTix Operations",
    fromAddress: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || "",
  },
  pushover: {
    applicationToken: process.env.PUSHOVER_APPLICATION_TOKEN || "",
  },
  imap: {
    host: process.env.IMAP_HOST || "",
    port: Number(process.env.IMAP_PORT || 993),
    secure: parseBoolean(process.env.IMAP_SECURE, true),
    user: process.env.IMAP_USER || "",
    password: process.env.IMAP_PASSWORD || "",
    mailbox: process.env.IMAP_MAILBOX || "INBOX",
    pollIntervalMs: Math.max(30000, Number(process.env.IMAP_POLL_INTERVAL_MS || 60000)),
  },
  adminUser: {
    email: process.env.ADMIN_EMAIL || "admin@ticketadmin.local",
    password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
    displayName: process.env.ADMIN_DISPLAY_NAME || "Platform Admin",
  },
  systemAdminUser: {
    email: process.env.SYSTEM_ADMIN_EMAIL || "systemadmin@listix.local",
    password: process.env.SYSTEM_ADMIN_PASSWORD || "SystemAdmin123!",
    displayName: process.env.SYSTEM_ADMIN_DISPLAY_NAME || "LisTix System Admin",
  },
  seedDemoData: parseBoolean(
    process.env.SEED_DEMO_DATA,
    (process.env.NODE_ENV || "development") !== "production",
  ),
};

export const isProduction = env.nodeEnv === "production";
