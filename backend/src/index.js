import app from "./app.js";
import { env } from "./config/env.js";
import { bootstrapDatabase } from "./db/bootstrap.js";
import { pool } from "./db/pool.js";

const start = async () => {
  try {
    await bootstrapDatabase();

    app.listen(env.port, env.host, () => {
      console.log(
        `Ticket Admin MVP backend listening on http://${env.host}:${env.port}`,
      );
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    await pool.end().catch(() => {});
    process.exit(1);
  }
};

start();
