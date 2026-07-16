import crypto from "crypto";
import { pool } from "../db/pool.js";
import { createB2BPurchaseChannel } from "./discordBotService.js";
import { allowedQuantitiesForSplit, splitTypes, validateSplitType } from "./splitTypeService.js";
import { getPublicVenueMaps } from "./venueMapService.js";

const number = (value) => Number(value ?? 0);
const requestCode = () => `B2B-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`.toUpperCase();

const publicInventorySql = `
  SELECT t.id, t.ticket_code, t.section_id, t.quantity, t.split_type, t.asking_price, t.ticket_type,
    t.row_label, t.lowest_seat, ss.name AS section, ss.seat_label AS section_seat_label,
    e.id AS event_id, e.event_name, e.event_date, ec.name AS category,
    v.id AS venue_id, v.name AS venue, v.city, v.country
  FROM tickets t
  INNER JOIN users u ON u.id = t.user_id
  INNER JOIN events e ON e.id = t.event_id
  INNER JOIN event_categories ec ON ec.id = e.category_id
  INNER JOIN venues v ON v.id = e.venue_id
  INNER JOIN seat_sections ss ON ss.id = t.section_id
  INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
  WHERE ms.name IN ('Active', 'Listed')
    AND u.account_status = 'active'
    AND e.event_date > NOW()
`;

const mapListing = (row) => ({
  id: number(row.id), listingId: row.ticket_code, sectionId: number(row.section_id), quantity: number(row.quantity),
  askingPrice: number(row.asking_price), ticketType: row.ticket_type,
  splitType: row.split_type, splitTypeLabel: splitTypes[row.split_type] || splitTypes.all_together,
  allowedQuantities: allowedQuantitiesForSplit(row.quantity, row.split_type),
  section: row.section, rowLabel: row.row_label,
  seatLabel: row.lowest_seat === null
    ? row.section_seat_label
    : number(row.quantity) === 1
      ? String(row.lowest_seat)
      : `${row.lowest_seat}-${number(row.lowest_seat) + number(row.quantity) - 1}`,
});

export const listB2BEvents = async () => {
  const result = await pool.query(`${publicInventorySql} ORDER BY e.event_date, e.event_name, t.asking_price, t.id`);
  const venueMaps = await getPublicVenueMaps(result.rows.map((row) => row.venue_id));
  const events = new Map();
  result.rows.forEach((row) => {
    if (!events.has(row.event_id)) events.set(row.event_id, {
      id: number(row.event_id), eventName: row.event_name, eventDate: row.event_date,
      category: row.category, venueId: number(row.venue_id), venue: row.venue, city: row.city, country: row.country,
      venueMap: venueMaps.get(number(row.venue_id)) || null,
      listings: [],
    });
    events.get(row.event_id).listings.push(mapListing(row));
  });
  return [...events.values()];
};

const getAvailableListing = async (ticketId) => {
  const result = await pool.query(`${publicInventorySql} AND t.id = $1 LIMIT 1`, [Number(ticketId)]);
  const row = result.rows[0];
  return row ? {
    ...mapListing(row), eventId: number(row.event_id), eventName: row.event_name,
    eventDate: row.event_date, venue: row.venue, city: row.city, country: row.country,
  } : null;
};

export const createB2BInquiry = async (payload, requester) => {
  if (!requester?.sub) { const error = new Error("Sign in to use the B2B purchase workflow."); error.statusCode = 401; throw error; }
  const listing = await getAvailableListing(payload?.listingId);
  if (!listing) { const error = new Error("This listing is no longer available."); error.statusCode = 404; throw error; }
  const quantity = Math.max(1, Number(payload?.quantity || 1));
  const splitValidation = validateSplitType(listing.quantity, listing.splitType);
  if (!splitValidation.ok || !splitValidation.allowedQuantities.includes(quantity)) {
    const error = new Error(`Choose an allowed quantity for ${listing.splitTypeLabel}: ${listing.allowedQuantities.join(", ")}.`); error.statusCode = 400; throw error;
  }
  const buyerName = String(requester.displayName || "").trim();
  const buyerEmail = String(requester.email || "").trim().toLowerCase();
  if (!buyerName || !/^\S+@\S+\.\S+$/.test(buyerEmail)) {
    const error = new Error("Buyer name and a valid email address are required."); error.statusCode = 400; throw error;
  }
  const connection = await pool.query("SELECT provider_user_id FROM user_connections WHERE user_id = $1 AND provider = 'discord' LIMIT 1", [requester.sub]);
  const discordUserId = String(connection.rows[0]?.provider_user_id || "").trim();
  if (!/^\d{15,22}$/.test(discordUserId)) {
    const error = new Error("Connect and verify Discord before opening a B2B purchase ticket."); error.statusCode = 409; throw error;
  }

  const client = await pool.connect();
  const requesterUserId = Number(requester.sub);
  let inquiry;
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      INSERT INTO b2b_purchase_inquiries (
        request_code, ticket_id, requester_user_id, buyer_name, buyer_email,
        discord_user_id, requested_quantity, buyer_account_requested, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING *
    `, [requestCode(), listing.id, requesterUserId, buyerName, buyerEmail, discordUserId,
      quantity, false, JSON.stringify({ quotedUnitPrice: listing.askingPrice, splitType: listing.splitType, stripeReady: true })]);
    inquiry = result.rows[0];
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }

  const mappedInquiry = {
    id: number(inquiry.id), requestCode: inquiry.request_code, buyerName, buyerEmail,
    quantity, status: inquiry.status, stripePaymentStatus: inquiry.stripe_payment_status,
  };
  const discord = await createB2BPurchaseChannel({ discordUserId, inquiry: mappedInquiry, listing });
  await pool.query(`
    UPDATE b2b_purchase_inquiries SET discord_channel_id = $1, metadata = metadata || $2::jsonb, updated_at = NOW()
    WHERE id = $3
  `, [discord.channelId || null, JSON.stringify({ discord }), inquiry.id]);
  await pool.query(`
    INSERT INTO platform_actions (
      action_type, status, severity, user_id, ticket_id, title, details,
      source, source_reference, discord_channel_id
    ) VALUES ('b2b_purchase', 'open', 'normal', $1, $2, $3, $4::jsonb, 'b2b_marketplace', $5, $6)
    ON CONFLICT (source, source_reference) WHERE source_reference IS NOT NULL
    DO UPDATE SET details = EXCLUDED.details, discord_channel_id = EXCLUDED.discord_channel_id, updated_at = NOW()
  `, [requesterUserId, listing.id, `B2B purchase request · ${mappedInquiry.requestCode}`,
    JSON.stringify({ buyerName, buyerEmail, quantity, listingId: listing.listingId, eventName: listing.eventName, discord }),
    mappedInquiry.requestCode, discord.channelId || null]);
  return {
    inquiry: { ...mappedInquiry, listing, discord },
    createdBuyerUserId: null,
  };
};
