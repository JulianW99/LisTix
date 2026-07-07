import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const env = {
  host: "127.0.0.1", // Forcing the most reliable host for local development
  port: Number(process.env.PORT || 4010),
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    host: process.env.POSTGRES_HOST ?? "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB ?? "ticket_admin_mvp",
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "postgres",
    ssl: parseBoolean(process.env.DATABASE_SSL, false),
  },
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-long-random-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: process.env.COOKIE_NAME || "ticket_admin_session",
  adminUser: {
    email: process.env.ADMIN_EMAIL || "admin@ticketadmin.local",
    password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
    displayName: process.env.ADMIN_DISPLAY_NAME || "Platform Admin",
  },
};

export const isProduction = env.nodeEnv === "production";
