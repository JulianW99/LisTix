import { pool } from "../db/pool.js";
import { notifySystemAdmins } from "./systemAdminNotificationService.js";

const marketplaceAdapters = new Map();
const adapterKey = (marketplace) => String(marketplace ?? "").trim().toLowerCase();

// Marketplace integrations can register an adapter at process startup. The adapter only
// needs an idempotent deleteListing(payload) function and can use any provider SDK/API.
export const registerMarketplaceListingAdapter = (marketplace, adapter) => {
  if (!adapter || typeof adapter.deleteListing !== "function") {
    throw new TypeError("A marketplace listing adapter needs a deleteListing function.");
  }
  marketplaceAdapters.set(adapterKey(marketplace), adapter);
  return () => marketplaceAdapters.delete(adapterKey(marketplace));
};

const deletePublication = async (publication, context) => {
  if (publication.status === "deleted") {
    return {
      publicationId: Number(publication.id),
      marketplace: publication.marketplace,
      externalListingId: publication.external_listing_id,
      status: "already_deleted",
    };
  }

  await pool.query(`
    UPDATE listing_marketplace_publications
    SET status = 'delete_pending', deletion_started_at = NOW(), deletion_reason = $2,
      error_message = NULL, updated_at = NOW()
    WHERE id = $1
  `, [publication.id, context.reason]);

  const adapter = marketplaceAdapters.get(adapterKey(publication.marketplace));
  try {
    const providerResult = adapter
      ? await adapter.deleteListing({
          marketplace: publication.marketplace,
          publicationId: Number(publication.id),
          externalListingId: publication.external_listing_id,
          listingUrl: publication.listing_url,
          ticketId: Number(publication.ticket_id),
          listingId: context.listingId,
          saleId: context.saleId,
          marketplaceSaleId: context.marketplaceSaleId,
          idempotencyKey: `sale:${context.saleId}:publication:${publication.id}`,
        })
      : { status: "deleted", mode: "local", apiConfigured: false };

    if (adapter && !["deleted", "success", "not_found"].includes(providerResult?.status)) {
      throw new Error(providerResult?.reason || `Marketplace deletion returned ${providerResult?.status ?? "no status"}.`);
    }
    await pool.query(`
      UPDATE listing_marketplace_publications
      SET status = 'deleted', deleted_at = NOW(), error_message = NULL, updated_at = NOW()
      WHERE id = $1
    `, [publication.id]);
    await pool.query("DELETE FROM marketplace_publication_snapshots WHERE publication_id = $1", [publication.id]);
    return {
      publicationId: Number(publication.id),
      marketplace: publication.marketplace,
      externalListingId: publication.external_listing_id,
      status: "deleted",
      provider: providerResult,
    };
  } catch (error) {
    await pool.query(`
      UPDATE listing_marketplace_publications
      SET status = 'error', error_message = $2, updated_at = NOW()
      WHERE id = $1
    `, [publication.id, error.message]);
    return {
      publicationId: Number(publication.id),
      marketplace: publication.marketplace,
      externalListingId: publication.external_listing_id,
      status: "failed",
      reason: error.message,
    };
  }
};

export const deleteTicketListingsEverywhere = async ({
  ticketId,
  listingId,
  saleId,
  marketplaceSaleId,
  reason = "sale_received",
}) => {
  const result = await pool.query(`
    SELECT id, ticket_id, marketplace, status, external_listing_id, listing_url
    FROM listing_marketplace_publications
    WHERE ticket_id = $1
    ORDER BY marketplace
  `, [Number(ticketId)]);

  const publications = await Promise.all(result.rows.map((publication) => deletePublication(publication, {
    listingId,
    saleId,
    marketplaceSaleId,
    reason,
  })));
  const failures = publications.filter((publication) => publication.status === "failed");

  // A sold listing must disappear from LisTix immediately even when an external
  // marketplace API fails. Failed publications remain visible to system admins as
  // errors and are routed for manual follow-up, but they can never be restored by
  // toggling a marketplace control back on.
  await pool.query(`
    UPDATE tickets
    SET marketplace_status_id = deleted.id, updated_at = NOW()
    FROM marketplace_statuses deleted
    WHERE tickets.id = $1 AND deleted.name = 'Deleted'
  `, [Number(ticketId)]);
  await pool.query("DELETE FROM listing_status_snapshots WHERE ticket_id = $1", [Number(ticketId)]);
  await pool.query(`
    DELETE FROM marketplace_publication_snapshots snapshot
    USING listing_marketplace_publications publication
    WHERE snapshot.publication_id = publication.id AND publication.ticket_id = $1
  `, [Number(ticketId)]);

  if (failures.length) {
    await notifySystemAdmins({
      eventType: "marketplace_sync_error",
      title: `Marketplace listing deletion failed · ${listingId}`,
      message: "At least one marketplace publication could not be deleted after a sale.",
      details: {
        saleId,
        marketplaceSaleId,
        failedMarketplaces: failures.map((failure) => failure.marketplace).join(", "),
      },
    }).catch((error) => console.error("Marketplace error notification failed:", error.message));
  }

  return {
    status: failures.length ? "partial_failure" : "completed",
    ticketId: Number(ticketId),
    listingId,
    publications,
    deletedCount: publications.filter((publication) => ["deleted", "already_deleted"].includes(publication.status)).length,
    failedCount: failures.length,
  };
};
