import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { recordSalePoints, salePointDetails } from "./pointService.js";

const number = (value) => Number(value ?? 0);

export const listPlatformUsers = async () => {
  const result = await pool.query(`
    WITH inventory AS (
      SELECT t.user_id,
        COUNT(*) FILTER (WHERE ms.name NOT IN ('Sold', 'Deleted'))::int AS online_tickets,
        COALESCE(SUM(t.asking_price * t.quantity) FILTER (WHERE ms.name NOT IN ('Sold', 'Deleted')), 0)::float AS online_ticket_value
      FROM tickets t INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
      GROUP BY t.user_id
    ), revenue AS (
      SELECT t.user_id,
        COALESCE(SUM(so.payout_amount) FILTER (WHERE so.sold_at >= NOW() - INTERVAL '1 year' AND ds.name <> 'Canceled'), 0)::float AS revenue_ltm,
        COALESCE(SUM(so.payout_amount) FILTER (WHERE so.sold_at >= date_trunc('month', NOW()) - INTERVAL '1 month' AND so.sold_at < date_trunc('month', NOW()) AND ds.name <> 'Canceled'), 0)::float AS revenue_last_month,
        COALESCE(SUM(so.payout_amount - so.listix_fee_amount) FILTER (WHERE so.paid_at IS NOT NULL AND ds.name <> 'Canceled'), 0)::float AS total_paid_out,
        COUNT(so.id) FILTER (WHERE ds.name <> 'Canceled')::int AS sales_count
      FROM sold_orders so
      INNER JOIN tickets t ON t.id = so.ticket_id
      INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
      GROUP BY t.user_id
    ), points AS (
      SELECT user_id, COALESCE(SUM(points), 0)::int AS point_balance
      FROM user_point_transactions GROUP BY user_id
    ), support AS (
      SELECT user_id, COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_support_tickets
      FROM support_tickets GROUP BY user_id
    )
    SELECT u.id, u.email, u.display_name, u.role, u.profile_settings, u.account_status,
      u.identity_verification_status, u.identity_verified_at, u.created_at,
      EXISTS(SELECT 1 FROM user_connections uc WHERE uc.user_id = u.id AND uc.provider = 'discord') AS discord_connected,
      COALESCE(u.profile_settings->>'tikeyConnected', 'false') = 'true' AS tikey_connected,
      COALESCE(i.online_tickets, 0)::int AS online_tickets,
      COALESCE(i.online_ticket_value, 0)::float AS online_ticket_value,
      COALESCE(r.revenue_ltm, 0)::float AS revenue_ltm,
      COALESCE(r.revenue_last_month, 0)::float AS revenue_last_month,
      COALESCE(r.total_paid_out, 0)::float AS total_paid_out,
      COALESCE(r.sales_count, 0)::int AS sales_count,
      COALESCE(p.point_balance, 0)::int AS point_balance,
      COALESCE(s.open_support_tickets, 0)::int AS open_support_tickets
    FROM users u
    LEFT JOIN inventory i ON i.user_id = u.id
    LEFT JOIN revenue r ON r.user_id = u.id
    LEFT JOIN points p ON p.user_id = u.id
    LEFT JOIN support s ON s.user_id = u.id
    WHERE u.role NOT IN ('system_admin', 'system_staff')
    ORDER BY u.created_at DESC
  `);

  return result.rows.map((row) => ({
    id: number(row.id), email: row.email, displayName: row.display_name, role: row.role,
    discordConnected: Boolean(row.discord_connected), tikeyConnected: Boolean(row.tikey_connected),
    identityVerificationStatus: row.identity_verification_status, identityVerifiedAt: row.identity_verified_at,
    accountStatus: row.account_status, onlineTickets: number(row.online_tickets), onlineTicketValue: number(row.online_ticket_value),
    revenueLtm: number(row.revenue_ltm), revenueLastMonth: number(row.revenue_last_month), salesCount: number(row.sales_count),
    totalPaidOut: number(row.total_paid_out), pointBalance: number(row.point_balance),
    podEligibility: { status: "not_evaluated", eligible: false },
    openSupportTickets: number(row.open_support_tickets),
    status: row.account_status !== "active" || number(row.open_support_tickets) > 0 ? "Action required" : "OK",
    createdAt: row.created_at,
  }));
};

export const updatePlatformUser = async (id, payload) => {
  const accountStatuses = new Set(["active", "suspended", "banned"]);
  const verificationStatuses = new Set(["not_started", "pending", "verified", "rejected"]);
  if (!accountStatuses.has(payload.accountStatus) || !verificationStatuses.has(payload.identityVerificationStatus)) {
    const error = new Error("Invalid account or identity verification status."); error.statusCode = 400; throw error;
  }
  const result = await pool.query(`
    UPDATE users SET account_status = $1::varchar, identity_verification_status = $2::varchar,
      identity_verified_at = CASE WHEN $2::varchar = 'verified' THEN COALESCE(identity_verified_at, NOW()) ELSE NULL END,
      updated_at = NOW()
    WHERE id = $3 AND role NOT IN ('system_admin', 'system_staff')
    RETURNING id
  `, [payload.accountStatus, payload.identityVerificationStatus, Number(id)]);
  if (!result.rowCount) return null;
  return (await listPlatformUsers()).find((user) => user.id === Number(id)) ?? null;
};

export const getPlatformUserDetails = async (id) => {
  const userId = Number(id);
  if (!Number.isInteger(userId)) return null;
  const [summary, profileResult, listings, sales, payments, inquiriesResult] = await Promise.all([
    listPlatformUsers().then((items) => items.find((item) => item.id === userId) ?? null),
    pool.query(`
      SELECT u.id, u.email, u.display_name, u.role, u.profile_settings, u.created_at, u.updated_at,
        membership.account_id, membership.account_name, membership.account_role, membership.account_settings,
        COALESCE(connections.items, '[]'::jsonb) AS connections
      FROM users u
      LEFT JOIN LATERAL (
        SELECT a.id AS account_id, a.name AS account_name, am.role AS account_role, a.settings AS account_settings
        FROM account_members am
        INNER JOIN accounts a ON a.id = am.account_id
        WHERE am.user_id = u.id
        ORDER BY CASE WHEN am.role = 'owner' THEN 0 ELSE 1 END, am.accepted_at NULLS LAST
        LIMIT 1
      ) membership ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'provider', uc.provider, 'providerUserId', uc.provider_user_id,
          'username', uc.username, 'displayName', uc.display_name,
          'email', uc.email, 'connectedAt', uc.connected_at, 'lastLoginAt', uc.last_login_at
        ) ORDER BY uc.provider) AS items
        FROM user_connections uc WHERE uc.user_id = u.id
      ) connections ON TRUE
      WHERE u.id = $1 AND u.role NOT IN ('system_admin', 'system_staff')
      LIMIT 1
    `, [userId]),
    listPlatformListings().then((items) => items.filter((item) => item.userId === userId)),
    listPlatformSales().then((items) => items.filter((item) => item.userId === userId)),
    getPlatformPayments().then((data) => data.items.filter((item) => item.userId === userId)),
    pool.query(`
      SELECT bpi.id, bpi.request_code, bpi.status, bpi.requested_quantity,
        bpi.stripe_payment_status, bpi.discord_channel_id, bpi.created_at,
        t.ticket_code, e.event_name, e.event_date
      FROM b2b_purchase_inquiries bpi
      INNER JOIN tickets t ON t.id = bpi.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users u ON u.id = $1
      WHERE bpi.requester_user_id = $1 OR LOWER(bpi.buyer_email) = LOWER(u.email)
      ORDER BY bpi.created_at DESC
    `, [userId]),
  ]);
  const row = profileResult.rows[0];
  if (!summary || !row) return null;
  const profile = { ...(row.profile_settings ?? {}), ...(row.account_settings ?? {}) };
  return {
    ...summary,
    account: row.account_id ? { id: number(row.account_id), name: row.account_name, role: row.account_role } : null,
    profile: {
      displayName: row.display_name, email: row.email, role: row.role,
      address: {
        line1: profile.addressLine1 || "", line2: profile.addressLine2 || "",
        postalCode: profile.postalCode || "", city: profile.city || "", country: profile.country || "",
      },
      payout: {
        method: profile.payoutMethod || "", accountHolder: profile.payoutAccountHolder || "",
        iban: profile.payoutIban || "", bic: profile.payoutBic || "", bankName: profile.payoutBankName || "",
        revolutRevtag: profile.revolutRevtag || "",
      },
      connections: row.connections ?? [], createdAt: row.created_at, updatedAt: row.updated_at,
    },
    listings, sales, payments,
    payoutSummary: {
      paid: payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.userPayout, 0),
      upcoming: payments.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.userPayout, 0),
      fees: payments.reduce((sum, item) => sum + item.listixFee, 0),
    },
    purchaseInquiries: inquiriesResult.rows.map((item) => ({
      id: number(item.id), requestCode: item.request_code, status: item.status,
      quantity: number(item.requested_quantity), stripePaymentStatus: item.stripe_payment_status,
      discordChannelId: item.discord_channel_id, listingId: item.ticket_code,
      eventName: item.event_name, eventDate: item.event_date, createdAt: item.created_at,
    })),
  };
};

const systemSalesSql = `
  SELECT so.id, so.order_code, so.marketplace_sale_id, so.sold_at, so.delivery_deadline,
    so.scheduled_payout_at, so.paid_at, so.payout_amount, so.listix_fee_amount,
    so.customer_name, so.buyer_email, so.sent_at, ds.name AS status, ds.is_terminal,
    upt.points AS point_value, upt.reason AS point_reason,
    bc.name AS marketplace, t.id AS ticket_id, t.ticket_code, t.quantity, t.purchase_price,
    t.asking_price, t.row_label, t.lowest_seat, ss.name AS section,
    CASE WHEN t.lowest_seat IS NULL THEN ss.seat_label WHEN t.quantity = 1 THEN t.lowest_seat::text ELSE t.lowest_seat::text || '-' || (t.lowest_seat + t.quantity - 1)::text END AS seat_label,
    e.event_name, e.event_date, v.name AS venue, v.city AS venue_city,
    u.id AS user_id, u.display_name AS user_name, u.email AS user_email
  FROM sold_orders so
  INNER JOIN tickets t ON t.id = so.ticket_id
  INNER JOIN users u ON u.id = t.user_id
  INNER JOIN events e ON e.id = t.event_id
  INNER JOIN venues v ON v.id = e.venue_id
  INNER JOIN seat_sections ss ON ss.id = t.section_id
  INNER JOIN buyer_channels bc ON bc.id = so.buyer_channel_id
  INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
  LEFT JOIN user_point_transactions upt ON upt.sold_order_id = so.id
`;

const mapSale = (row) => {
  const cost = number(row.purchase_price) * number(row.quantity);
  const grossAmount = number(row.payout_amount);
  const profit = grossAmount - cost;
  return {
    databaseId: number(row.id), listixSaleId: row.order_code, marketplaceSaleId: row.marketplace_sale_id,
    userId: number(row.user_id), userName: row.user_name, userEmail: row.user_email,
    ticketDatabaseId: number(row.ticket_id), listingId: row.ticket_code, marketplace: row.marketplace,
    eventName: row.event_name, eventDate: row.event_date, venue: row.venue, venueCity: row.venue_city,
    section: row.section, rowLabel: row.row_label, seatLabel: row.seat_label, quantity: number(row.quantity),
    customerName: row.customer_name, buyerEmail: row.buyer_email, soldAt: row.sold_at,
    deliveryDeadline: row.delivery_deadline, scheduledPayoutAt: row.scheduled_payout_at, paidAt: row.paid_at,
    status: row.status === "Canceled" ? "Canceled" : row.is_terminal ? "Completed" : "Pending Delivery",
    dispatchComplete: Boolean(row.is_terminal), sentAt: row.sent_at, grossAmount,
    listixFee: number(row.listix_fee_amount), userPayout: grossAmount - number(row.listix_fee_amount),
    purchaseCost: cost, profit, roi: cost > 0 ? (profit / cost) * 100 : 0,
    ...salePointDetails({ deliveryDeadline: row.delivery_deadline, sentAt: row.sent_at, pointValue: row.point_value, pointReason: row.point_reason, dispatchStatus: row.status }),
  };
};

export const listPlatformSales = async () => {
  const result = await pool.query(`${systemSalesSql} ORDER BY so.sold_at DESC, so.id DESC`);
  return result.rows.map(mapSale);
};

export const getPlatformSale = async (identifier) => {
  const result = await pool.query(`${systemSalesSql}
    WHERE so.id::text = $1 OR so.order_code = $1 OR so.marketplace_sale_id = $1
    ORDER BY so.id DESC LIMIT 1`, [String(identifier)]);
  return result.rows[0] ? mapSale(result.rows[0]) : null;
};

export const listPlatformListings = async () => {
  const result = await pool.query(`
    SELECT t.id, t.ticket_code, t.quantity, t.split_type, t.purchase_price, t.asking_price, t.row_label,
      CASE WHEN t.lowest_seat IS NULL THEN ss.seat_label WHEN t.quantity = 1 THEN t.lowest_seat::text ELSE t.lowest_seat::text || '-' || (t.lowest_seat + t.quantity - 1)::text END AS seat_label,
      ss.name AS section, ms.name AS status, e.event_name, e.event_date, v.name AS venue,
      u.id AS user_id, u.display_name AS user_name, u.email AS user_email, t.created_at, t.updated_at,
      COALESCE(jsonb_agg(jsonb_build_object(
        'id', lmp.id, 'marketplace', lmp.marketplace, 'status', lmp.status,
        'externalListingId', lmp.external_listing_id, 'errorMessage', lmp.error_message,
        'listingUrl', lmp.listing_url, 'lastSyncedAt', lmp.last_synced_at,
        'platformEnabled', COALESCE(mc.enabled, TRUE)
      ) ORDER BY lmp.marketplace) FILTER (WHERE lmp.id IS NOT NULL), '[]'::jsonb) AS publications
    FROM tickets t
    INNER JOIN users u ON u.id = t.user_id
    INNER JOIN events e ON e.id = t.event_id
    INNER JOIN venues v ON v.id = e.venue_id
    INNER JOIN seat_sections ss ON ss.id = t.section_id
    INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
    LEFT JOIN listing_marketplace_publications lmp ON lmp.ticket_id = t.id
    LEFT JOIN marketplace_controls mc ON mc.marketplace = lmp.marketplace
    GROUP BY t.id, ss.id, ms.id, e.id, v.id, u.id
    ORDER BY t.updated_at DESC
  `);
  return result.rows.map((row) => ({
    databaseId: number(row.id), listingId: row.ticket_code, userId: number(row.user_id), userName: row.user_name, userEmail: row.user_email,
    eventName: row.event_name, eventDate: row.event_date, venue: row.venue, section: row.section, rowLabel: row.row_label,
    seatLabel: row.seat_label, quantity: number(row.quantity), splitType: row.split_type, purchasePrice: number(row.purchase_price), askingPrice: number(row.asking_price),
    status: row.status, publications: row.publications ?? [], createdAt: row.created_at, updatedAt: row.updated_at,
  }));
};

export const getPlatformPayments = async () => {
  const sales = await listPlatformSales();
  const items = sales.filter((sale) => sale.status !== "Canceled").map((sale) => ({
    paymentId: `PAY-${String(sale.databaseId).padStart(6, "0")}`, saleDatabaseId: sale.databaseId,
    listixSaleId: sale.listixSaleId, userId: sale.userId, userName: sale.userName, userEmail: sale.userEmail,
    marketplace: sale.marketplace, scheduledAt: sale.scheduledPayoutAt, paidAt: sale.paidAt,
    status: sale.paidAt ? "paid" : new Date(sale.scheduledPayoutAt) <= new Date() ? "due" : "upcoming",
    grossAmount: sale.grossAmount, listixFee: sale.listixFee, userPayout: sale.userPayout,
  }));
  return {
    stats: {
      paidOut: items.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.userPayout, 0),
      feesRetained: items.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.listixFee, 0),
      upcoming: items.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.userPayout, 0),
      totalPayments: items.length,
      feePercentage: env.listixFeePercentage,
    },
    items,
  };
};

export const cancelPlatformSale = async (id, actorUserId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`
      UPDATE sold_orders so
      SET dispatch_status_id = ds.id, updated_at = NOW()
      FROM dispatch_statuses ds
      WHERE so.id = $1 AND ds.name = 'Canceled'
        AND NOT EXISTS (
          SELECT 1 FROM dispatch_statuses current_status
          WHERE current_status.id = so.dispatch_status_id AND current_status.name IN ('Completed', 'Canceled')
        )
      RETURNING so.id
    `, [Number(id)]);
    if (!result.rowCount) {
      const error = new Error("Only a pending sale can be canceled.");
      error.statusCode = 409;
      throw error;
    }
    await recordSalePoints(client, id, { canceled: true });
    await client.query(`
      INSERT INTO platform_actions (action_type, status, severity, sold_order_id, title, details, source, source_reference, resolved_at)
      SELECT 'sale_canceled', 'resolved', 'critical', so.id,
        'Sale canceled · ' || so.order_code,
        jsonb_build_object('points', -200, 'canceledByUserId', $2::int),
        'system_admin', 'sale-canceled-' || so.id::text, NOW()
      FROM sold_orders so WHERE so.id = $1
      ON CONFLICT DO NOTHING
    `, [Number(id), Number(actorUserId)]);
    await client.query("COMMIT");
    return getPlatformSale(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const mapAction = (row) => ({
  id: number(row.id), actionCode: `ACT-${String(row.id).padStart(6, "0")}`, actionType: row.action_type,
  status: row.status, severity: row.severity, userId: row.user_id === null ? null : number(row.user_id),
  userName: row.user_name, userEmail: row.user_email, saleDatabaseId: row.sold_order_id === null ? null : number(row.sold_order_id),
  listixSaleId: row.order_code, marketplaceSaleId: row.marketplace_sale_id, listingId: row.ticket_code,
  title: row.title, details: row.details ?? {}, source: row.source, discordChannelId: row.discord_channel_id,
  detectedAt: row.detected_at, resolvedAt: row.resolved_at,
});

export const listPlatformActions = async () => {
  const result = await pool.query(`
    SELECT pa.*, u.display_name AS user_name, u.email AS user_email, so.order_code,
      so.marketplace_sale_id, t.ticket_code
    FROM platform_actions pa
    LEFT JOIN users u ON u.id = pa.user_id
    LEFT JOIN sold_orders so ON so.id = pa.sold_order_id
    LEFT JOIN tickets t ON t.id = COALESCE(pa.ticket_id, so.ticket_id)
    ORDER BY pa.detected_at DESC, pa.id DESC
    LIMIT 500
  `);
  return result.rows.map(mapAction);
};

export const resolvePlatformAction = async (id) => {
  const result = await pool.query(`UPDATE platform_actions SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id`, [Number(id)]);
  if (!result.rowCount) return null;
  return (await listPlatformActions()).find((item) => item.id === Number(id)) ?? null;
};
