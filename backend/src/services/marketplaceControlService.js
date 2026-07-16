import { pool } from "../db/pool.js";

const mapControl = (row) => ({
  marketplace: row.marketplace,
  enabled: Boolean(row.enabled),
  liveListings: Number(row.live_listings ?? 0),
  pausedListings: Number(row.paused_listings ?? 0),
  errorListings: Number(row.error_listings ?? 0),
  totalListings: Number(row.total_listings ?? 0),
  disabledAt: row.disabled_at,
  updatedAt: row.updated_at,
});

export const listMarketplaceControls = async () => {
  const result = await pool.query(`
    SELECT mc.*,
      COUNT(lmp.id)::int AS total_listings,
      COUNT(lmp.id) FILTER (WHERE lmp.status = 'live')::int AS live_listings,
      COUNT(lmp.id) FILTER (WHERE lmp.status = 'paused')::int AS paused_listings,
      COUNT(lmp.id) FILTER (WHERE lmp.status = 'error')::int AS error_listings
    FROM marketplace_controls mc
    LEFT JOIN listing_marketplace_publications lmp ON lmp.marketplace = mc.marketplace
    GROUP BY mc.marketplace
    ORDER BY mc.marketplace
  `);
  const marketplaces = result.rows.map(mapControl);
  return {
    allEnabled: marketplaces.length > 0 && marketplaces.every((item) => item.enabled),
    anyEnabled: marketplaces.some((item) => item.enabled),
    marketplaces,
  };
};

const synchronizeListingStatuses = async (client) => {
  const enabledResult = await client.query("SELECT COUNT(*)::int AS count FROM marketplace_controls WHERE enabled = TRUE");
  const anyEnabled = Number(enabledResult.rows[0].count) > 0;
  if (!anyEnabled) {
    await client.query(`
      INSERT INTO listing_status_snapshots (ticket_id, previous_marketplace_status_id)
      SELECT t.id, t.marketplace_status_id
      FROM tickets t
      INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
      WHERE ms.name IN ('Active', 'Listed')
      ON CONFLICT (ticket_id) DO NOTHING
    `);
    await client.query(`
      UPDATE tickets t SET marketplace_status_id = draft.id, updated_at = NOW()
      FROM marketplace_statuses draft
      WHERE draft.name = 'Draft'
        AND EXISTS (SELECT 1 FROM listing_status_snapshots snapshot WHERE snapshot.ticket_id = t.id)
    `);
    return;
  }
  await client.query(`
    UPDATE tickets t SET marketplace_status_id = snapshot.previous_marketplace_status_id, updated_at = NOW()
    FROM listing_status_snapshots snapshot
    WHERE snapshot.ticket_id = t.id
  `);
  await client.query("DELETE FROM listing_status_snapshots");
};

const applyMarketplaceState = async (client, marketplace, enabled, actorUserId) => {
  const control = await client.query(`
    SELECT marketplace, enabled FROM marketplace_controls WHERE marketplace = $1 FOR UPDATE
  `, [marketplace]);
  if (!control.rows[0]) return false;
  if (Boolean(control.rows[0].enabled) === Boolean(enabled)) return true;
  if (!enabled) {
    await client.query(`
      INSERT INTO marketplace_publication_snapshots (publication_id, marketplace, previous_status)
      SELECT id, marketplace, status FROM listing_marketplace_publications
      WHERE marketplace = $1
      ON CONFLICT (publication_id) DO NOTHING
    `, [marketplace]);
    await client.query(`
      UPDATE listing_marketplace_publications
      SET status = 'paused', updated_at = NOW()
      WHERE marketplace = $1
    `, [marketplace]);
  } else {
    await client.query(`
      UPDATE listing_marketplace_publications publication
      SET status = snapshot.previous_status, updated_at = NOW()
      FROM marketplace_publication_snapshots snapshot
      WHERE snapshot.publication_id = publication.id AND snapshot.marketplace = $1
    `, [marketplace]);
    await client.query("DELETE FROM marketplace_publication_snapshots WHERE marketplace = $1", [marketplace]);
  }
  await client.query(`
    UPDATE marketplace_controls SET enabled = $1, changed_by_user_id = $2,
      disabled_at = CASE WHEN $1 THEN NULL ELSE NOW() END, updated_at = NOW()
    WHERE marketplace = $3
  `, [Boolean(enabled), actorUserId, marketplace]);
  return true;
};

export const setMarketplaceEnabled = async (marketplace, enabled, actorUserId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await applyMarketplaceState(client, marketplace, Boolean(enabled), actorUserId);
    if (!found) { await client.query("ROLLBACK"); return null; }
    await synchronizeListingStatuses(client);
    await client.query("COMMIT");
    return listMarketplaceControls();
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
};

export const setAllMarketplacesEnabled = async (enabled, actorUserId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const controls = await client.query("SELECT marketplace FROM marketplace_controls ORDER BY marketplace FOR UPDATE");
    for (const row of controls.rows) await applyMarketplaceState(client, row.marketplace, Boolean(enabled), actorUserId);
    await synchronizeListingStatuses(client);
    await client.query("COMMIT");
    return listMarketplaceControls();
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
};
