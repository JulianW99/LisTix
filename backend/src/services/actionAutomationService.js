import { pool } from "../db/pool.js";
import { createRetransferChannel, sendDeadlinePassedDirectMessage, sendSaleDirectMessage } from "./discordBotService.js";
import { deleteTicketListingsEverywhere } from "./marketplaceListingService.js";
import { getPlatformSale, listPlatformSales } from "./platformAdminService.js";
import { notifySystemAdmins } from "./systemAdminNotificationService.js";
import { dispatchUserNotification } from "./userNotificationService.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
const money = (value) => `€${Number(value ?? 0).toFixed(2)}`;
const date = (value) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : "Not provided";

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

const saveOutcome = async (actionId, notifications, workflow = {}) => {
  const discordChannelId = notifications.discord?.channelId ?? null;
  await pool.query(`
    UPDATE platform_actions
    SET details = details || $2::jsonb,
        discord_channel_id = COALESCE($3, discord_channel_id), updated_at = NOW()
    WHERE id = $1
  `, [actionId, JSON.stringify({ notifications, ...workflow }), discordChannelId]);
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
  subject: `Transfer required soon · ${sale.listixSaleId}`,
  text: `The delivery deadline for ${sale.eventName} is approaching. Please transfer the tickets before ${date(sale.deliveryDeadline)}.`,
  html: `<h2>Transfer required soon</h2><p>The delivery deadline for <strong>${escapeHtml(sale.eventName)}</strong> is approaching.</p><p>Please transfer the tickets before ${escapeHtml(date(sale.deliveryDeadline))}.</p>`,
});

const listingDeletedEmail = (sale, deletion) => ({
  subject: `Listing deleted · ${sale.listingId}`,
  text: `${sale.listingId} was removed from ${deletion.deletedCount} marketplace publication(s) after sale ${sale.listixSaleId}.`,
  html: `<h2>Listing deleted</h2><p><strong>${escapeHtml(sale.listingId)}</strong> was removed from ${deletion.deletedCount} marketplace publication(s) after sale ${escapeHtml(sale.listixSaleId)}.</p>`,
});

export const runPlatformAction = async ({ actionType, sale, source = "system", sourceReference, details = {} }) => {
  const normalizedType = {
    "re-transfer": "retransfer",
    delivery_deadline_passed: "transfer_reminder",
    sale: "new_sale",
  }[actionType] ?? actionType;
  const config = {
    new_sale: { status: "completed", severity: "info", title: `Sale detected · ${sale.listixSaleId}` },
    retransfer: { status: "open", severity: "high", title: `Re-transfer required · ${sale.listixSaleId}` },
    transfer_reminder: { status: "open", severity: "high", title: `Transfer required soon · ${sale.listixSaleId}` },
  }[normalizedType];
  if (!config) { const error = new Error("Unsupported platform action."); error.statusCode = 400; throw error; }

  const buyer = details.buyer ?? { name: sale.customerName, email: sale.buyerEmail };
  const action = await createAction({ actionType: normalizedType, sale, ...config, details: { ...details, buyer }, source, sourceReference });
  if (action.duplicate) return { actionId: action.id, duplicate: true };

  let notifications;
  let listingDeletion;
  let listingDeletedNotifications;
  if (normalizedType === "new_sale") {
    listingDeletion = await deleteTicketListingsEverywhere({
      ticketId: sale.ticketDatabaseId,
      listingId: sale.listingId,
      saleId: sale.databaseId,
      marketplaceSaleId: sale.marketplaceSaleId,
    });
    notifications = await dispatchUserNotification({
      eventType: "new_sale",
      sale,
      title: `New sale · ${sale.listixSaleId}`,
      message: `Your tickets for ${sale.eventName} have sold. Delivery deadline: ${date(sale.deliveryDeadline)}.`,
      email: saleEmail(sale),
      discord: ({ discordUserId }) => sendSaleDirectMessage({ discordUserId, sale }),
    });
    if (listingDeletion.status === "completed") {
      listingDeletedNotifications = await dispatchUserNotification({
        eventType: "listing_deleted",
        sale,
        title: `Listing deleted · ${sale.listingId}`,
        message: `${sale.listingId} was removed from ${listingDeletion.deletedCount} marketplace publication(s).`,
        email: listingDeletedEmail(sale, listingDeletion),
      });
    }
  } else if (normalizedType === "retransfer") {
    notifications = await dispatchUserNotification({
      eventType: "retransfer",
      sale,
      title: `Re-transfer required · ${sale.listixSaleId}`,
      message: `Please re-transfer the tickets for ${sale.eventName} to ${buyer.name || "the new buyer"}.`,
      email: retransferEmail(sale, buyer),
      discord: ({ discordUserId }) => createRetransferChannel({ discordUserId, sale, buyer }),
    });
  } else {
    notifications = await dispatchUserNotification({
      eventType: "transfer_reminder",
      sale,
      title: `Transfer required soon · ${sale.listixSaleId}`,
      message: `The transfer deadline for ${sale.eventName} is ${date(sale.deliveryDeadline)}.`,
      email: deadlineEmail(sale),
      discord: ({ discordUserId }) => sendDeadlinePassedDirectMessage({ discordUserId, sale }),
    });
  }
  const mandatoryChannels = {
    new_sale: ["email"],
    retransfer: ["email", "discord"],
    transfer_reminder: ["email"],
  }[normalizedType] ?? [];
  const failedMandatoryChannels = mandatoryChannels.filter((channel) => (
    ["failed", "skipped"].includes(notifications[channel]?.status)
  ));
  if (failedMandatoryChannels.length) {
    await notifySystemAdmins({
      eventType: "notification_delivery_error",
      title: `Mandatory notification failed · ${sale.listixSaleId}`,
      message: `A mandatory ${normalizedType.replace(/_/g, " ")} notification could not be delivered.`,
      details: {
        saleId: sale.listixSaleId,
        channels: failedMandatoryChannels.join(", "),
        reasons: failedMandatoryChannels.map((channel) => notifications[channel]?.reason).filter(Boolean).join("; "),
      },
    }).catch((error) => console.error("Notification delivery alert failed:", error.message));
  }
  await saveOutcome(action.id, notifications, { listingDeletion, listingDeletedNotifications });
  return { actionId: action.id, duplicate: false, notifications, listingDeletion, listingDeletedNotifications };
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
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const reminders = sales.filter((sale) => {
    if (sale.dispatchComplete || !sale.deliveryDeadline) return false;
    const deadline = new Date(sale.deliveryDeadline);
    return deadline > now && deadline <= reminderCutoff;
  });
  let created = 0;
  for (const sale of reminders) {
    const result = await runPlatformAction({
      actionType: "transfer_reminder",
      sale,
      source: "deadline_monitor",
      sourceReference: `transfer-reminder-${sale.databaseId}-${new Date(sale.deliveryDeadline).toISOString()}`,
    });
    if (!result.duplicate) created += 1;
  }
  const missedSales = sales.filter((sale) => (
    !sale.dispatchComplete && sale.deliveryDeadline && new Date(sale.deliveryDeadline) <= now
  ));
  let missedCreated = 0;
  for (const sale of missedSales) {
    const action = await createAction({
      actionType: "sale_not_sent",
      status: "open",
      severity: "critical",
      sale,
      title: `Sale not sent · ${sale.listixSaleId}`,
      details: { deliveryDeadline: sale.deliveryDeadline },
      source: "deadline_monitor",
      sourceReference: `sale-not-sent-${sale.databaseId}-${new Date(sale.deliveryDeadline).toISOString()}`,
    });
    if (!action.duplicate) {
      missedCreated += 1;
      await notifySystemAdmins({
        eventType: "sale_not_sent",
        title: `Sale not sent · ${sale.listixSaleId}`,
        message: `${sale.userName} has not marked the sale for ${sale.eventName} as sent.`,
        details: {
          saleId: sale.listixSaleId,
          marketplaceSaleId: sale.marketplaceSaleId,
          deadline: date(sale.deliveryDeadline),
        },
      }).catch((error) => console.error("Missed sale notification failed:", error.message));
    }
  }
  return { checked: reminders.length, created, missed: missedSales.length, missedCreated };
};
