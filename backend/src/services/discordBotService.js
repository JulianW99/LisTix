import { env } from "../config/env.js";

const apiBase = "https://discord.com/api/v10";
const trim = (value, length = 1024) => String(value ?? "Not provided").slice(0, length);
const discordTimestamp = (date) => {
  const seconds = Math.floor(new Date(date).getTime() / 1000);
  return Number.isFinite(seconds) ? `<t:${seconds}:F> (<t:${seconds}:R>)` : "Not provided";
};

const discordRequest = async (path, options = {}) => {
  if (!env.discord.botToken) return { skipped: true, reason: "Discord bot token is not configured." };
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${env.discord.botToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || `Discord API returned ${response.status}.`;
    const hint = message === "Missing Permissions"
      ? " The bot role needs Manage Channels and Manage Roles, plus View Channel, Send Messages, Embed Links and Read Message History in the re-transfer category."
      : "";
    throw new Error(`${message}.${hint}`.replace("..", "."));
  }
  return payload;
};

const saleFields = (sale) => [
  { name: "Event", value: trim(sale.eventName), inline: false },
  { name: "Event date", value: discordTimestamp(sale.eventDate), inline: false },
  { name: "LisTix Sale ID", value: trim(sale.listixSaleId), inline: true },
  { name: "Marketplace Sale ID", value: trim(sale.marketplaceSaleId), inline: true },
  { name: "Section / Row / Seats", value: trim(`${sale.section} / ${sale.rowLabel || "-"} / ${sale.seatLabel || sale.quantity}`), inline: false },
];

const closeTicketComponents = [{
  type: 1,
  components: [{
    type: 2,
    style: 4,
    label: "Close Ticket",
    custom_id: "retransfer:close",
  }],
}];

const closeB2BTicketComponents = [{
  type: 1,
  components: [{
    type: 2,
    style: 4,
    label: "Close Ticket",
    custom_id: "b2b:close",
  }],
}];

const resolveSupportRoleId = async () => {
  if (env.discord.supportRoleId) return env.discord.supportRoleId;
  const roles = await discordRequest(`/guilds/${env.discord.guildId}/roles`);
  return Array.isArray(roles)
    ? roles.find((role) => role.name.toLowerCase() === "support")?.id ?? null
    : null;
};

export const sendDiscordDirectMessage = async ({ discordUserId, title, message, fields = [], color = 3066993 }) => {
  if (!env.discord.botToken) return { status: "skipped", reason: "Discord bot token is not configured." };
  if (!discordUserId) return { status: "skipped", reason: "The user has no connected Discord account." };
  try {
    const dm = await discordRequest("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    await discordRequest(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [{
          title: trim(title, 256),
          description: trim(message, 4096),
          color,
          fields: fields.map((field) => ({ ...field, name: trim(field.name, 256), value: trim(field.value) })),
          footer: { text: "LisTix Operations" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return { status: "sent", channelId: dm.id };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};

export const sendSaleDirectMessage = async ({ discordUserId, sale }) => {
  if (!env.discord.botToken) return { status: "skipped", reason: "Discord bot token is not configured." };
  if (!discordUserId) return { status: "skipped", reason: "The user has no connected Discord account." };
  try {
    const dm = await discordRequest("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: discordUserId }) });
    await discordRequest(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [{
          title: `New sale · ${sale.listixSaleId}`,
          description: "Your tickets have sold. Please review the delivery details below.",
          color: 3066993,
          fields: [
            ...saleFields(sale),
            { name: "Sale value", value: `€${sale.grossAmount.toFixed(2)}`, inline: true },
            { name: "Profit", value: `€${sale.profit.toFixed(2)}`, inline: true },
            { name: "ROI", value: `${sale.roi.toFixed(1)}%`, inline: true },
            { name: "Delivery deadline", value: discordTimestamp(sale.deliveryDeadline), inline: false },
          ],
          footer: { text: "LisTix Operations" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return { status: "sent", channelId: dm.id };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};

export const sendDeadlinePassedDirectMessage = async ({ discordUserId, sale }) => {
  if (!env.discord.botToken) return { status: "skipped", reason: "Discord bot token is not configured." };
  if (!discordUserId) return { status: "skipped", reason: "The user has no connected Discord account." };
  try {
    const dm = await discordRequest("/users/@me/channels", { method: "POST", body: JSON.stringify({ recipient_id: discordUserId }) });
    await discordRequest(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [{
          title: `Transfer required soon · ${sale.listixSaleId}`,
          description: "The ticket delivery deadline is approaching. Please transfer the tickets before the deadline.",
          color: 15105570,
          fields: [
            ...saleFields(sale),
            { name: "Delivery deadline", value: discordTimestamp(sale.deliveryDeadline), inline: false },
            { name: "Required action", value: "Transfer the tickets before the deadline and send proof of delivery.", inline: false },
          ],
          footer: { text: "LisTix Operations · Transfer reminder" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return { status: "sent", channelId: dm.id };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};

export const createRetransferChannel = async ({ discordUserId, sale, buyer }) => {
  if (!env.discord.botToken || !env.discord.guildId) return { status: "skipped", reason: "Discord bot token or guild ID is not configured." };
  if (!discordUserId) return { status: "skipped", reason: "The user has no connected Discord account." };
  try {
    const bot = await discordRequest("/users/@me");
    const category = await discordRequest(`/channels/${env.discord.retransferCategoryId}`);
    if (category.type !== 4 || category.guild_id !== env.discord.guildId) {
      return { status: "failed", reason: "The configured re-transfer category does not exist in the configured Discord guild." };
    }
    const safeSaleId = sale.listixSaleId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 78);
    const channel = await discordRequest(`/guilds/${env.discord.guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({
        name: `re-transfer-${safeSaleId}`,
        type: 0,
        parent_id: env.discord.retransferCategoryId,
        topic: `Retransfer request for ${sale.listixSaleId} / ${sale.marketplaceSaleId}`,
        permission_overwrites: [
          { id: env.discord.guildId, type: 0, deny: "1024" },
          { id: bot.id, type: 1, allow: "68608" },
          { id: discordUserId, type: 1, allow: "101376" },
        ],
      }),
    });
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: "Ticket controls",
        components: closeTicketComponents,
      }),
    });
    const supportRoleId = await resolveSupportRoleId();
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: `<@${discordUserId}> Please re-transfer the tickets to the new buyer and send proof of the completed transfer in this channel.`,
        allowed_mentions: {
          users: [discordUserId],
        },
        embeds: [{
          title: `Re-transfer required · ${sale.listixSaleId}`,
          description: "The marketplace has changed the buyer details for this order.",
          color: 15158332,
          fields: [
            ...saleFields(sale),
            { name: "New buyer", value: trim(buyer?.name), inline: true },
            { name: "New buyer email", value: trim(buyer?.email), inline: true },
          ],
          footer: { text: `${sale.marketplace} · Delivery deadline ${new Date(sale.deliveryDeadline).toLocaleString("en-GB")}` },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: `${supportRoleId ? `<@&${supportRoleId}>` : "@Support"} The Support team is available if you have any questions or need help with this re-transfer.`,
        allowed_mentions: {
          roles: supportRoleId ? [supportRoleId] : [],
        },
      }),
    });
    return { status: "sent", channelId: channel.id };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};

export const createB2BPurchaseChannel = async ({ discordUserId, inquiry, listing }) => {
  if (!env.discord.botToken || !env.discord.guildId) return { status: "skipped", reason: "Discord bot token or guild ID is not configured." };
  if (!discordUserId) return { status: "skipped", reason: "A Discord user ID is required for a private purchase ticket." };
  try {
    const [bot, category, supportRoleId] = await Promise.all([
      discordRequest("/users/@me"),
      discordRequest(`/channels/${env.discord.b2bPurchaseCategoryId}`),
      resolveSupportRoleId(),
    ]);
    if (category.type !== 4 || category.guild_id !== env.discord.guildId) {
      return { status: "failed", reason: "The configured B2B purchase category does not exist in the configured Discord guild." };
    }
    const safeRequestCode = inquiry.requestCode.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 82);
    const permissionOverwrites = [
      { id: env.discord.guildId, type: 0, deny: "1024" },
      { id: bot.id, type: 1, allow: "68608" },
      { id: discordUserId, type: 1, allow: "101376" },
    ];
    if (supportRoleId) permissionOverwrites.push({ id: supportRoleId, type: 0, allow: "101376" });
    const channel = await discordRequest(`/guilds/${env.discord.guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({
        name: `purchase-${safeRequestCode}`,
        type: 0,
        parent_id: env.discord.b2bPurchaseCategoryId,
        topic: `LisTix B2B purchase request ${inquiry.requestCode} for ${listing.listingId}`,
        permission_overwrites: permissionOverwrites,
      }),
    });
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: "Ticket controls", components: closeB2BTicketComponents }),
    });
    await discordRequest(`/channels/${channel.id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: `<@${discordUserId}> Please wait for a Support member to review the purchase request.\n${supportRoleId ? `<@&${supportRoleId}>` : "@Support"} has been notified and is available for questions.`,
        allowed_mentions: { users: [discordUserId], roles: supportRoleId ? [supportRoleId] : [] },
        embeds: [{
          title: `Purchase request · ${inquiry.requestCode}`,
          description: "LisTix Support will confirm availability and coordinate the next purchase steps in this private channel.",
          color: 3066993,
          fields: [
            { name: "Event", value: trim(listing.eventName), inline: false },
            { name: "Event date", value: discordTimestamp(listing.eventDate), inline: false },
            { name: "Venue", value: trim(`${listing.venue}, ${listing.city}`), inline: false },
            { name: "Listing", value: trim(listing.listingId), inline: true },
            { name: "Quantity", value: trim(inquiry.quantity), inline: true },
            { name: "Split rule", value: trim(listing.splitTypeLabel || "Sell all together"), inline: false },
            { name: "Price per ticket", value: `€${Number(listing.askingPrice).toFixed(2)}`, inline: true },
            { name: "Section / Row / Seats", value: trim(`${listing.section} / ${listing.rowLabel || "-"} / ${listing.seatLabel || "-"}`), inline: false },
            { name: "Buyer", value: trim(inquiry.buyerName), inline: true },
            { name: "Buyer email", value: trim(inquiry.buyerEmail), inline: true },
          ],
          footer: { text: "LisTix B2B Marketplace · Payment not started" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return {
      status: "sent",
      channelId: channel.id,
      channelUrl: `https://discord.com/channels/${env.discord.guildId}/${channel.id}`,
    };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};
