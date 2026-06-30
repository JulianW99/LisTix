import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { roles } from "../config/constants.js";
import { pool } from "./pool.js";
import { seedDemoData } from "./seeds/demoData.js";
import { schemaStatements } from "./schemas/index.js";

export const bootstrapDatabase = async () => {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [env.adminUser.email],
  );

  if (existingUser.rowCount === 0) {
    const passwordHash = await bcrypt.hash(env.adminUser.password, 12);

    await pool.query(
      `
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES ($1, $2, $3, $4)
      `,
      [
        env.adminUser.email,
        passwordHash,
        env.adminUser.displayName,
        roles.admin,
      ],
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await seedDemoData(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
