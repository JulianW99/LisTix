import { pool } from "../db/pool.js";

export const canceledSalePoints = -200;

const deliveryBands = [
  { minimumHoursBeforeDeadline: 48, points: 100, code: "delivered_48h_early", label: "48+ hours before deadline" },
  { minimumHoursBeforeDeadline: 24, points: 80, code: "delivered_24h_early", label: "24–48 hours before deadline" },
  { minimumHoursBeforeDeadline: 12, points: 60, code: "delivered_12h_early", label: "12–24 hours before deadline" },
  { minimumHoursBeforeDeadline: 4, points: 40, code: "delivered_4h_early", label: "4–12 hours before deadline" },
  { minimumHoursBeforeDeadline: 0, points: 20, code: "delivered_on_time", label: "Before the delivery deadline" },
  { minimumHoursBeforeDeadline: -6, points: -25, code: "delivered_up_to_6h_late", label: "Up to 6 hours after deadline" },
  { minimumHoursBeforeDeadline: -24, points: -60, code: "delivered_up_to_24h_late", label: "6–24 hours after deadline" },
  { minimumHoursBeforeDeadline: Number.NEGATIVE_INFINITY, points: -100, code: "delivered_over_24h_late", label: "More than 24 hours after deadline" },
];

const asDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateDeliveryPoints = (deliveryDeadline, deliveredAt) => {
  const deadline = asDate(deliveryDeadline);
  const delivered = asDate(deliveredAt);
  if (!deadline || !delivered) return { points: 0, reason: "delivery_timing_unavailable", hoursBeforeDeadline: null };
  const hoursBeforeDeadline = (deadline.getTime() - delivered.getTime()) / 3_600_000;
  const band = deliveryBands.find((item) => hoursBeforeDeadline >= item.minimumHoursBeforeDeadline) ?? deliveryBands.at(-1);
  return { points: band.points, reason: band.code, label: band.label, hoursBeforeDeadline };
};

export const buildPointSchedule = (deliveryDeadline) => {
  const deadline = asDate(deliveryDeadline);
  if (!deadline) return [];
  const cutoff = (hoursBefore) => new Date(deadline.getTime() - hoursBefore * 3_600_000).toISOString();
  return [
    { label: deliveryBands[0].label, points: 100, cutoffAt: cutoff(48) },
    { label: deliveryBands[1].label, points: 80, cutoffAt: cutoff(24) },
    { label: deliveryBands[2].label, points: 60, cutoffAt: cutoff(12) },
    { label: deliveryBands[3].label, points: 40, cutoffAt: cutoff(4) },
    { label: deliveryBands[4].label, points: 20, cutoffAt: cutoff(0) },
    { label: deliveryBands[5].label, points: -25, cutoffAt: cutoff(-6) },
    { label: deliveryBands[6].label, points: -60, cutoffAt: cutoff(-24) },
    { label: deliveryBands[7].label, points: -100, cutoffAt: null },
    { label: "Sale canceled because tickets were not delivered", points: canceledSalePoints, cutoffAt: null },
  ];
};

const salePointRow = async (queryable, soldOrderId) => {
  const result = await queryable.query(`
    SELECT so.id, so.order_code, so.delivery_deadline, so.sent_at, t.user_id,
      ds.name AS dispatch_status
    FROM sold_orders so
    INNER JOIN tickets t ON t.id = so.ticket_id
    INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
    WHERE so.id = $1
    LIMIT 1
  `, [Number(soldOrderId)]);
  return result.rows[0] ?? null;
};

export const recordSalePoints = async (queryable, soldOrderId, { canceled = false, occurredAt } = {}) => {
  const sale = await salePointRow(queryable, soldOrderId);
  if (!sale) return null;
  const outcome = canceled
    ? { points: canceledSalePoints, reason: "sale_canceled_not_delivered", label: "Sale canceled because tickets were not delivered", hoursBeforeDeadline: null }
    : calculateDeliveryPoints(sale.delivery_deadline, sale.sent_at);
  if (!canceled && !sale.sent_at) return null;
  const result = await queryable.query(`
    INSERT INTO user_point_transactions (user_id, sold_order_id, points, reason, metadata, occurred_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6::timestamptz, NOW()))
    ON CONFLICT (sold_order_id) DO NOTHING
    RETURNING id, points, reason, occurred_at
  `, [sale.user_id, sale.id, outcome.points, outcome.reason, JSON.stringify({
    orderCode: sale.order_code,
    deliveryDeadline: sale.delivery_deadline,
    deliveredAt: sale.sent_at,
    hoursBeforeDeadline: outcome.hoursBeforeDeadline,
    label: outcome.label,
  }), occurredAt ?? sale.sent_at ?? null]);
  return result.rows[0] ?? null;
};

export const backfillMissingSalePoints = async (queryable) => {
  const result = await queryable.query(`
    SELECT so.id
    FROM sold_orders so
    INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
    LEFT JOIN user_point_transactions upt ON upt.sold_order_id = so.id
    WHERE ds.name = 'Completed' AND so.sent_at IS NOT NULL AND upt.id IS NULL
    ORDER BY so.id
  `);
  for (const row of result.rows) await recordSalePoints(queryable, row.id);
};

export const getUserPointSummary = async (userId) => {
  const result = await pool.query(`
    SELECT
      COALESCE((SELECT SUM(points) FROM user_point_transactions WHERE user_id = $1), 0)::int AS point_balance,
      COALESCE((
        SELECT SUM(so.payout_amount - so.listix_fee_amount)
        FROM sold_orders so
        INNER JOIN tickets t ON t.id = so.ticket_id
        INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
        WHERE t.user_id = $1 AND so.paid_at IS NOT NULL AND ds.name <> 'Canceled'
      ), 0)::float AS total_paid_out
  `, [Number(userId)]);
  return {
    pointBalance: Number(result.rows[0]?.point_balance ?? 0),
    totalPaidOut: Number(result.rows[0]?.total_paid_out ?? 0),
    podEligibility: { status: "not_evaluated", eligible: false, message: "POD thresholds have not been configured yet." },
  };
};

export const getUserPoints = async (userId) => {
  const [summary, transactions] = await Promise.all([
    getUserPointSummary(userId),
    pool.query(`
      SELECT upt.id, upt.points, upt.reason, upt.metadata, upt.occurred_at,
        so.order_code, e.event_name, so.delivery_deadline, so.sent_at
      FROM user_point_transactions upt
      INNER JOIN sold_orders so ON so.id = upt.sold_order_id
      INNER JOIN tickets t ON t.id = so.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      WHERE upt.user_id = $1
      ORDER BY upt.occurred_at DESC, upt.id DESC
      LIMIT 250
    `, [Number(userId)]),
  ]);
  return {
    ...summary,
    rules: buildPointSchedule(new Date()),
    transactions: transactions.rows.map((row) => ({
      id: Number(row.id), points: Number(row.points), reason: row.reason, details: row.metadata ?? {},
      orderCode: row.order_code, eventName: row.event_name, deliveryDeadline: row.delivery_deadline,
      sentAt: row.sent_at, occurredAt: row.occurred_at,
    })),
  };
};

export const salePointDetails = ({ deliveryDeadline, sentAt, pointValue, pointReason, dispatchStatus }) => ({
  pointSchedule: buildPointSchedule(deliveryDeadline),
  pointsIfSentNow: sentAt || dispatchStatus === "Canceled" ? null : calculateDeliveryPoints(deliveryDeadline, new Date()).points,
  pointOutcome: pointValue === null || pointValue === undefined ? null : { points: Number(pointValue), reason: pointReason },
});
