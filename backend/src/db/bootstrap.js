import { pool } from "./pool.js";
import { env } from "../config/env.js";
import { seedApplicationUsers } from "./seeds/applicationUsers.js";
import { seedDemoData } from "./seeds/demoData.js";
import { seedSupportDemoData } from "./seeds/supportDemoData.js";
import { schemaStatements } from "./schemas/index.js";

const ensureOwnerAccounts = async (client) => {
  await client.query(`
    INSERT INTO accounts (name, owner_user_id, settings)
    SELECT u.display_name || ' Workspace', u.id, u.profile_settings
    FROM users u
    WHERE u.role <> 'system_admin'
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM account_members am WHERE am.user_id = u.id)
  `);

  await client.query(`
    INSERT INTO account_members (
      account_id, user_id, email, role, permissions, status, accepted_at, last_seen_at
    )
    SELECT a.id, u.id, u.email, 'owner', '["*"]'::jsonb, 'active', NOW(), NOW()
    FROM accounts a
    INNER JOIN users u ON u.id = a.owner_user_id
    ON CONFLICT (account_id, email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      role = 'owner',
      permissions = '["*"]'::jsonb,
      status = 'active',
      updated_at = NOW()
  `);
};

export const bootstrapDatabase = async () => {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await seedApplicationUsers(client, { includeDemoUsers: env.seedDemoData });
    await ensureOwnerAccounts(client);
    await client.query(`
      UPDATE tickets
      SET user_id = (SELECT id FROM users WHERE email = $1 LIMIT 1)
      WHERE user_id IS NULL
    `, [env.adminUser.email.toLowerCase().trim()]);
    await client.query(`
      UPDATE tickets t
      SET account_id = a.id,
          created_by_user_id = COALESCE(t.created_by_user_id, t.user_id),
          last_edited_by_user_id = COALESCE(t.last_edited_by_user_id, t.user_id),
          last_edited_at = COALESCE(t.last_edited_at, t.updated_at)
      FROM accounts a
      WHERE a.owner_user_id = t.user_id
        AND t.account_id IS NULL
    `);
    await client.query("ALTER TABLE tickets ALTER COLUMN user_id SET NOT NULL");
    await client.query("ALTER TABLE tickets ALTER COLUMN account_id SET NOT NULL");
    await client.query(`
      UPDATE sold_orders so
      SET sent_by_user_id = COALESCE(so.sent_by_user_id, t.user_id),
          sent_at = COALESCE(so.sent_at, so.updated_at)
      FROM tickets t, dispatch_statuses ds
      WHERE t.id = so.ticket_id
        AND ds.id = so.dispatch_status_id
        AND ds.is_terminal = TRUE
        AND so.sent_at IS NULL
    `);
    await seedDemoData(client, { includeOperations: env.seedDemoData });
    if (env.seedDemoData) {
      await seedSupportDemoData(client);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
