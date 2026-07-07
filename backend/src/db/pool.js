import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  ...(env.database.connectionString
    ? { connectionString: env.database.connectionString }
    : {
        host: env.database.host,
        port: env.database.port,
        database: env.database.database,
        user: env.database.user,
        password: env.database.password,
      }),
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
});
