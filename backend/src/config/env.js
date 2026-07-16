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
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4173",
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
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
