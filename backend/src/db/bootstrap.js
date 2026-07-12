import { pool } from "./pool.js";
import { seedApplicationUsers } from "./seeds/applicationUsers.js";
import { seedDemoData } from "./seeds/demoData.js";
import { seedSupportDemoData } from "./seeds/supportDemoData.js";
import { schemaStatements } from "./schemas/index.js";

export const bootstrapDatabase = async () => {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await seedApplicationUsers(client);
    await seedDemoData(client);
    await seedSupportDemoData(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
