import crypto from "crypto";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { runPlatformAction } from "./actionAutomationService.js";
import { getPlatformSale } from "./platformAdminService.js";

const requiredText = (value, label) => {
  const text = String(value ?? "").trim();
  if (!text) {
    const error = new Error(`${label} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return text;
};

const validDate = (value, label, fallback) => {
  const date = value ? new Date(value) : fallback;
  if (!date || Number.isNaN(date.getTime())) {
    const error = new Error(`${label} must be a valid date.`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const resolveListing = async (client, payload, marketplace) => {
  const listingIdentifier = payload.ticketId ?? payload.listingId;
  const result = payload.externalListingId
    ? await client.query(`
        SELECT t.id, t.ticket_code, e.event_date
        FROM listing_marketplace_publications publication
        INNER JOIN tickets t ON t.id = publication.ticket_id
        INNER JOIN events e ON e.id = t.event_id
        WHERE LOWER(publication.marketplace) = LOWER($1)
          AND publication.external_listing_id = $2
        LIMIT 1
      `, [marketplace, String(payload.externalListingId)])
    : await client.query(`
        SELECT t.id, t.ticket_code, e.event_date
        FROM tickets t
        INNER JOIN events e ON e.id = t.event_id
        WHERE t.id::text = $1 OR t.ticket_code = $1
        ORDER BY t.id DESC
        LIMIT 1
      `, [requiredText(listingIdentifier, "ticketId, listingId or externalListingId")]);
  if (!result.rows[0]) {
    const error = new Error("The incoming sale could not be matched to a LisTix listing.");
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

// This service is the stable boundary for future marketplace webhook/API controllers.
// Provider-specific code only has to map its payload into this normalized input.
export const ingestMarketplaceSale = async (payload, { source = "system_admin_api" } = {}) => {
  const marketplace = requiredText(payload?.marketplace, "marketplace");
  const marketplaceSaleId = requiredText(payload?.marketplaceSaleId, "marketplaceSaleId");
  const customerName = requiredText(payload?.customerName, "customerName");
  const payoutAmount = Number(payload?.payoutAmount);
  if (!Number.isFinite(payoutAmount) || payoutAmount < 0) {
    const error = new Error("payoutAmount must be a non-negative number.");
    error.statusCode = 400;
    throw error;
  }
  const soldAt = validDate(payload?.soldAt, "soldAt", new Date());
  const client = await pool.connect();
  let soldOrderId;
  let created = false;
  let buyerChannelId;
  try {
    await client.query("BEGIN");
    const channelResult = await client.query("SELECT id FROM buyer_channels WHERE LOWER(name) = LOWER($1) LIMIT 1", [marketplace]);
    if (!channelResult.rows[0]) {
      const error = new Error("The marketplace is not configured as a buyer channel.");
      error.statusCode = 400;
      throw error;
    }
    buyerChannelId = Number(channelResult.rows[0].id);
    const listing = await resolveListing(client, payload, marketplace);
    const eventDate = new Date(listing.event_date);
    const defaultDeadline = new Date(Math.min(
      soldAt.getTime() + (48 * 60 * 60 * 1000),
      eventDate.getTime() - (24 * 60 * 60 * 1000),
    ));
    const deliveryDeadline = validDate(payload?.deliveryDeadline, "deliveryDeadline", defaultDeadline);
    const scheduledPayoutAt = validDate(
      payload?.scheduledPayoutAt,
      "scheduledPayoutAt",
      new Date(soldAt.getTime() + (7 * 24 * 60 * 60 * 1000)),
    );
    const orderCode = payload?.listixSaleId
      ? requiredText(payload.listixSaleId, "listixSaleId").slice(0, 40)
      : `LTX-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    const insert = await client.query(`
      INSERT INTO sold_orders (
        order_code, ticket_id, buyer_channel_id, dispatch_status_id, sold_at,
        payout_amount, customer_name, buyer_email, marketplace_sale_id,
        delivery_deadline, scheduled_payout_at, listix_fee_amount
      )
      SELECT $1, $2, $3, ds.id, $4, $5, $6, $7, $8, $9, $10,
        ROUND(($5::numeric * $11 / 100)::numeric, 2)
      FROM dispatch_statuses ds
      WHERE ds.is_terminal = FALSE
      ORDER BY CASE WHEN ds.name = 'Awaiting transfer' THEN 0 ELSE 1 END, ds.id
      LIMIT 1
      ON CONFLICT (buyer_channel_id, marketplace_sale_id)
        WHERE marketplace_sale_id IS NOT NULL DO NOTHING
      RETURNING id
    `, [
      orderCode, Number(listing.id), buyerChannelId, soldAt, payoutAmount, customerName,
      payload?.buyerEmail ? String(payload.buyerEmail).trim() : null,
      marketplaceSaleId, deliveryDeadline, scheduledPayoutAt, env.listixFeePercentage,
    ]);
    if (insert.rows[0]) {
      soldOrderId = Number(insert.rows[0].id);
      created = true;
    } else {
      const existing = await client.query(`
        SELECT id FROM sold_orders
        WHERE buyer_channel_id = $1 AND marketplace_sale_id = $2
        LIMIT 1
      `, [buyerChannelId, marketplaceSaleId]);
      soldOrderId = Number(existing.rows[0].id);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const sale = await getPlatformSale(soldOrderId);
  const workflow = await runPlatformAction({
    actionType: "new_sale",
    sale,
    source,
    sourceReference: `sale-${buyerChannelId}-${marketplaceSaleId}`,
    details: { intakeCreated: created },
  });
  return { created, sale, workflow };
};
