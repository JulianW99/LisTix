import app from "./app.js";
import { env } from "./config/env.js";
import { bootstrapDatabase } from "./db/bootstrap.js";
import { pool } from "./db/pool.js";

const start = async () => {
  try {
    // 1. Ensure database is ready first.
    await bootstrapDatabase();

    // 2. Then, start the HTTP server.
    return app.listen(env.port, env.host, () => {
      console.log(`✅ Backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start backend");
    if (error.code === 'ECONNREFUSED' && error.port === env.database.port) {
      console.error(`Could not connect to PostgreSQL on port ${env.database.port}.`);
      console.error("Is the database server running?");
    } else {
      console.error(error);
    }

    await pool.end().catch(() => {});
    process.exit(1);
  }
};

const server = await start();

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server?.close(async () => {
    console.log("HTTP server closed.");
    await pool.end();
    console.log("Database pool closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
