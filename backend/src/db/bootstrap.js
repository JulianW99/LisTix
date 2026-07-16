import { pool } from "./pool.js";
import { env } from "../config/env.js";
import { seedApplicationUsers } from "./seeds/applicationUsers.js";
import { seedDemoData } from "./seeds/demoData.js";
import { seedSupportDemoData } from "./seeds/supportDemoData.js";
import { schemaStatements } from "./schemas/index.js";
import { backfillMissingSalePoints } from "../services/pointService.js";

const ensureOwnerAccounts = async (client) => {
  await client.query(`
    INSERT INTO accounts (name, owner_user_id, settings)
    SELECT u.display_name || ' Workspace', u.id, u.profile_settings
    FROM users u
    WHERE u.role IN ('admin', 'user')
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

const ensurePlatformOperationsData = async (client, { includeDemoData, feePercentage }) => {
  await client.query(`
    INSERT INTO marketplace_statuses (name, description)
    VALUES ('Deleted', 'Listing was soft-deleted and remains visible only to system administrators.')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
  `);

  await client.query(`
    INSERT INTO dispatch_statuses (name, description, is_terminal)
    VALUES ('Canceled', 'Sale canceled because ticket delivery was not completed.', TRUE)
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_terminal = TRUE
  `);

  await client.query(`
    UPDATE sold_orders so
    SET marketplace_sale_id = COALESCE(so.marketplace_sale_id, UPPER(REPLACE(bc.name, ' ', '-')) || '-' || so.id::text),
        delivery_deadline = COALESCE(so.delivery_deadline, LEAST(so.sold_at + INTERVAL '48 hours', e.event_date - INTERVAL '24 hours')),
        scheduled_payout_at = COALESCE(so.scheduled_payout_at, so.sold_at + INTERVAL '7 days'),
        paid_at = COALESCE(so.paid_at, CASE WHEN ds.name = 'Completed' THEN so.sold_at + INTERVAL '7 days' ELSE NULL END),
        listix_fee_amount = ROUND((so.payout_amount * $1 / 100)::numeric, 2)
    FROM tickets t
    INNER JOIN events e ON e.id = t.event_id,
      buyer_channels bc,
      dispatch_statuses ds
    WHERE t.id = so.ticket_id
      AND bc.id = so.buyer_channel_id
      AND ds.id = so.dispatch_status_id
  `, [feePercentage]);

  await client.query(`
    INSERT INTO listing_marketplace_publications (
      ticket_id, marketplace, status, external_listing_id, error_message, listing_url, last_synced_at
    )
    SELECT
      t.id,
      bc.name,
      CASE WHEN (t.id + bc.id) % 9 = 0 THEN 'error' WHEN ms.name IN ('Active', 'Listed') THEN 'live' ELSE 'paused' END,
      UPPER(LEFT(REPLACE(bc.name, ' ', ''), 5)) || '-' || t.id::text,
      CASE WHEN (t.id + bc.id) % 9 = 0 THEN 'Marketplace rejected the latest inventory sync.' ELSE NULL END,
      NULL,
      NOW() - (((t.id + bc.id) % 18) || ' minutes')::interval
    FROM tickets t
    INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
    CROSS JOIN buyer_channels bc
    WHERE bc.name <> 'Manual Buyer'
    ON CONFLICT (ticket_id, marketplace) DO NOTHING
  `);

  await client.query(`
    INSERT INTO marketplace_controls (marketplace)
    SELECT DISTINCT marketplace FROM listing_marketplace_publications
    ON CONFLICT (marketplace) DO NOTHING
  `);

  await backfillMissingSalePoints(client);

  if (includeDemoData) {
    await client.query(`
      UPDATE users
      SET identity_verification_status = CASE
            WHEN email = 'demo.alex@listix.local' THEN 'verified'
            WHEN email = 'demo.jamie@listix.local' THEN 'pending'
            ELSE identity_verification_status
          END,
          identity_verified_at = CASE WHEN email = 'demo.alex@listix.local' THEN COALESCE(identity_verified_at, NOW() - INTERVAL '30 days') ELSE identity_verified_at END,
          profile_settings = CASE
            WHEN email IN ('demo.alex@listix.local', 'demo.taylor@listix.local') THEN profile_settings || '{"tikeyConnected": true}'::jsonb
            ELSE profile_settings
          END
      WHERE email LIKE 'demo.%@listix.local'
    `);

    await client.query(`
      INSERT INTO platform_actions (action_type, status, severity, user_id, sold_order_id, ticket_id, title, details, source, source_reference, detected_at)
      SELECT 'delivery_deadline_passed', 'open', 'high', t.user_id, so.id, t.id,
        'Delivery deadline passed for ' || so.order_code,
        jsonb_build_object('saleId', so.order_code, 'marketplaceSaleId', so.marketplace_sale_id, 'eventName', e.event_name),
        'demo', 'demo-deadline-' || so.id::text, NOW() - INTERVAL '25 minutes'
      FROM sold_orders so
      INNER JOIN tickets t ON t.id = so.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
      WHERE ds.is_terminal = FALSE
      ORDER BY so.id
      LIMIT 1
      ON CONFLICT DO NOTHING
    `);
  }
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
        AND ds.name = 'Completed'
        AND so.sent_at IS NULL
    `);
    await seedDemoData(client, { includeOperations: env.seedDemoData });
    await ensurePlatformOperationsData(client, { includeDemoData: env.seedDemoData, feePercentage: env.listixFeePercentage });
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
