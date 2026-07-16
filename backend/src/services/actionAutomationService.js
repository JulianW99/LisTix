import { pool } from "../db/pool.js";
import { createRetransferChannel, sendDeadlinePassedDirectMessage, sendSaleDirectMessage } from "./discordBotService.js";
import { sendOperationsEmail } from "./notificationService.js";
import { getPlatformSale, listPlatformSales } from "./platformAdminService.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
const money = (value) => `€${Number(value ?? 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : "Not provided";

const getDiscordUserId = async (userId) => {
  const result = await pool.query("SELECT provider_user_id FROM user_connections WHERE user_id = $1 AND provider = 'discord' LIMIT 1", [userId]);
  return result.rows[0]?.provider_user_id ?? null;
};

const createAction = async ({ actionType, status, severity, sale, title, details, source, sourceReference }) => {
  if (sourceReference) {
    const existing = await pool.query("SELECT id FROM platform_actions WHERE source = $1 AND source_reference = $2 LIMIT 1", [source, sourceReference]);
    if (existing.rows[0]) return { id: Number(existing.rows[0].id), duplicate: true };
  }
  const result = await pool.query(`
    INSERT INTO platform_actions (action_type, status, severity, user_id, sold_order_id, ticket_id, title, details, source, source_reference)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
    RETURNING id
  `, [actionType, status, severity, sale?.userId ?? null, sale?.databaseId ?? null, sale?.ticketDatabaseId ?? null, title, JSON.stringify(details ?? {}), source, sourceReference ?? null]);
  return { id: Number(result.rows[0].id), duplicate: false };
};

const saveOutcome = async (actionId, notifications) => {
  const discordChannelId = notifications.discord?.channelId ?? null;
  await pool.query(`
    UPDATE platform_actions
    SET details = details || jsonb_build_object('notifications', $2::jsonb),
        discord_channel_id = COALESCE($3, discord_channel_id), updated_at = NOW()
    WHERE id = $1
  `, [actionId, JSON.stringify(notifications), discordChannelId]);
};

const saleEmail = (sale) => ({
  subject: `Your tickets sold · ${sale.listixSaleId}`,
  text: `Your tickets for ${sale.eventName} have sold. Sale ${sale.listixSaleId}; marketplace sale ${sale.marketplaceSaleId}; value ${money(sale.grossAmount)}; profit ${money(sale.profit)}; ROI ${sale.roi.toFixed(1)}%; delivery deadline ${date(sale.deliveryDeadline)}.`,
  html: `<h2>Your tickets have sold</h2><p><strong>${escapeHtml(sale.eventName)}</strong></p><p>LisTix Sale ID: ${escapeHtml(sale.listixSaleId)}<br>Marketplace Sale ID: ${escapeHtml(sale.marketplaceSaleId)}<br>Sale value: ${money(sale.grossAmount)}<br>Profit: ${money(sale.profit)}<br>ROI: ${sale.roi.toFixed(1)}%<br>Delivery deadline: ${escapeHtml(date(sale.deliveryDeadline))}</p>`,
});

const retransferEmail = (sale, buyer) => ({
  subject: `Action required: re-transfer ${sale.listixSaleId}`,
  text: `Please re-transfer the tickets for ${sale.eventName} to ${buyer.name || "the new buyer"} (${buyer.email || "email not provided"}) and send proof in the Discord ticket.`,
  html: `<h2>Ticket re-transfer required</h2><p>Please re-transfer the tickets for <strong>${escapeHtml(sale.eventName)}</strong> to the new buyer and send proof in the Discord ticket.</p><p>Buyer: ${escapeHtml(buyer.name || "Not provided")}<br>Email: ${escapeHtml(buyer.email || "Not provided")}<br>Section: ${escapeHtml(sale.section)}<br>Row: ${escapeHtml(sale.rowLabel || "-")}<br>Seats: ${escapeHtml(sale.seatLabel || sale.quantity)}</p>`,
});

const deadlineEmail = (sale) => ({
  subject: `Delivery deadline passed · ${sale.listixSaleId}`,
  text: `The delivery deadline for ${sale.eventName} has passed. Please transfer the tickets immediately and contact LisTix Operations if you need help.`,
  html: `<h2>Delivery deadline passed</h2><p>The delivery deadline for <strong>${escapeHtml(sale.eventName)}</strong> has passed.</p><p>Please transfer the tickets immediately and contact LisTix Operations if you need help.</p>`,
});

export const runPlatformAction = async ({ actionType, sale, source = "system", sourceReference, details = {} }) => {
  const normalizedType = actionType === "re-transfer" ? "retransfer" : actionType;
  const config = {
    sale: { status: "completed", severity: "info", title: `Sale detected · ${sale.listixSaleId}` },
    retransfer: { status: "open", severity: "high", title: `Re-transfer required · ${sale.listixSaleId}` },
    delivery_deadline_passed: { status: "open", severity: "critical", title: `Delivery deadline passed · ${sale.listixSaleId}` },
  }[normalizedType];
  if (!config) { const error = new Error("Unsupported platform action."); error.statusCode = 400; throw error; }

  const buyer = details.buyer ?? { name: sale.customerName, email: sale.buyerEmail };
  const action = await createAction({ actionType: normalizedType, sale, ...config, details: { ...details, buyer }, source, sourceReference });
  if (action.duplicate) return { actionId: action.id, duplicate: true };

  const discordUserId = await getDiscordUserId(sale.userId);
  let email;
  let discord;
  if (normalizedType === "sale") {
    email = await sendOperationsEmail({ to: sale.userEmail, ...saleEmail(sale) });
    discord = await sendSaleDirectMessage({ discordUserId, sale });
  } else if (normalizedType === "retransfer") {
    email = await sendOperationsEmail({ to: sale.userEmail, ...retransferEmail(sale, buyer) });
    discord = await createRetransferChannel({ discordUserId, sale, buyer });
  } else {
    email = await sendOperationsEmail({ to: sale.userEmail, ...deadlineEmail(sale) });
    discord = await sendDeadlinePassedDirectMessage({ discordUserId, sale });
  }
  await saveOutcome(action.id, { email, discord });
  return { actionId: action.id, duplicate: false, notifications: { email, discord } };
};

export const triggerPlatformTestAction = async ({ userId, actionType, saleId }) => {
  const sales = await listPlatformSales();
  const sale = sales.find((item) => item.userId === Number(userId) && (!saleId || item.databaseId === Number(saleId)));
  if (!sale) { const error = new Error("No sale belonging to this user was found for the test."); error.statusCode = 404; throw error; }
  return runPlatformAction({
    actionType,
    sale,
    source: "admin_test",
    details: actionType === "retransfer" ? { buyer: { name: "Jordan Example", email: "new.buyer@example.com" }, test: true } : { test: true },
  });
};

const valueFromMail = (text, labels) => {
  for (const label of labels) {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n\\r]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return null;
};

export const processRetransferEmail = async ({ subject = "", text = "", messageId }) => {
  const content = `${subject}\n${text}`;
  if (!/re[\s-]?transfer/i.test(content)) return { recognized: false };
  const sales = await listPlatformSales();
  const lowerContent = content.toLowerCase();
  const sale = sales
    .filter((item) => lowerContent.includes(String(item.marketplaceSaleId).toLowerCase()) || lowerContent.includes(item.listixSaleId.toLowerCase()))
    .sort((a, b) => String(b.marketplaceSaleId).length - String(a.marketplaceSaleId).length)[0];
  if (!sale) {
    const action = await createAction({
      actionType: "retransfer_unmatched", status: "open", severity: "critical", title: "Unmatched re-transfer email",
      details: { subject, messageId }, source: "imap", sourceReference: messageId,
    });
    return { recognized: true, matched: false, actionId: action.id, duplicate: action.duplicate };
  }
  const buyer = {
    name: valueFromMail(content, ["New Buyer", "Buyer Name", "Recipient", "Customer"] ) || sale.customerName,
    email: valueFromMail(content, ["New Buyer Email", "Buyer Email", "Recipient Email", "Email"]) || sale.buyerEmail,
  };
  const result = await runPlatformAction({ actionType: "retransfer", sale, source: "imap", sourceReference: messageId, details: { buyer, mailSubject: subject } });
  return { recognized: true, matched: true, saleId: sale.listixSaleId, ...result };
};

export const getSaleForPlatformAction = getPlatformSale;

export const detectPassedDeliveryDeadlines = async () => {
  const sales = await listPlatformSales();
  const overdue = sales.filter((sale) => !sale.dispatchComplete && sale.deliveryDeadline && new Date(sale.deliveryDeadline) <= new Date());
  let created = 0;
  for (const sale of overdue) {
    const result = await runPlatformAction({
      actionType: "delivery_deadline_passed",
      sale,
      source: "deadline_monitor",
      sourceReference: `deadline-${sale.databaseId}`,
    });
    if (!result.duplicate) created += 1;
  }
  return { checked: overdue.length, created };
};
