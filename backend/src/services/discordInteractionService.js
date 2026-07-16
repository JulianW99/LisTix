import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

let client;
const pendingCloseConfirmations = new Map();
const processingTicketChannels = new Set();

const memberTicketPermissions = {
  ViewChannel: true,
  SendMessages: true,
  AttachFiles: true,
  ReadMessageHistory: true,
};

const closeTicketRow = (scope = "retransfer") => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`${scope}:close`)
    .setLabel("Close Ticket")
    .setStyle(ButtonStyle.Danger),
);

const confirmationRow = (scope, requesterId, controlMessageId) => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`${scope}:confirm:${requesterId}:${controlMessageId}`)
    .setLabel("Confirm")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId(`${scope}:decline:${requesterId}:${controlMessageId}`)
    .setLabel("Decline")
    .setStyle(ButtonStyle.Secondary),
);

const reopenTicketRow = (scope = "retransfer") => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`${scope}:reopen`)
    .setLabel("Re-Open Ticket")
    .setStyle(ButtonStyle.Success),
);

const safeOrderNumber = (orderCode) => String(orderCode)
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 88);

const supportRoleFor = async (guild) => {
  if (env.discord.supportRoleId) {
    return guild.roles.fetch(env.discord.supportRoleId).catch(() => null);
  }
  const roles = await guild.roles.fetch();
  return roles.find((role) => role.name.toLowerCase() === "support") ?? null;
};

const userMentionPayload = ({ discordUserId, content }) => ({
  content: `<@${discordUserId}> ${content}`,
  allowedMentions: { users: [discordUserId] },
});

const supportHelpPayload = async (guild, subject = "re-transfer") => {
  const supportRole = await supportRoleFor(guild);
  return {
    content: `${supportRole ? `<@&${supportRole.id}>` : "@Support"} The Support team is available if you have any questions or need help with this ${subject}.`,
    allowedMentions: {
      roles: supportRole ? [supportRole.id] : [],
    },
  };
};

const isTicketStaff = (interaction) => {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  const roles = interaction.member?.roles;
  if (roles?.cache?.has(env.discord.supportRoleId)) return true;
  return Array.isArray(roles) && roles.includes(env.discord.supportRoleId);
};

const getRetransferTicket = async (channelId) => {
  const result = await pool.query(`
    SELECT pa.id AS action_id, pa.user_id, pa.status AS action_status, so.order_code,
      uc.provider_user_id AS discord_user_id
    FROM platform_actions pa
    INNER JOIN sold_orders so ON so.id = pa.sold_order_id
    LEFT JOIN user_connections uc ON uc.user_id = pa.user_id AND uc.provider = 'discord'
    WHERE pa.discord_channel_id = $1
      AND pa.action_type = 'retransfer'
    ORDER BY pa.id DESC
    LIMIT 1
  `, [channelId]);
  return result.rows[0] ?? null;
};

const recordDiscordClosure = async ({ channelId, closedByUserId, actionId }) => {
  const closure = JSON.stringify({
    status: "closed",
    channelId,
    closedByDiscordUserId: closedByUserId,
    closedAt: new Date().toISOString(),
    completedCategoryId: env.discord.completedRetransferCategoryId,
  });
  await pool.query(`
    UPDATE platform_actions
    SET status = 'resolved',
        resolved_at = COALESCE(resolved_at, NOW()),
        details = details || jsonb_build_object('discordClosure', $2::jsonb),
        updated_at = NOW()
    WHERE id = $1
       OR (discord_channel_id = $3 AND action_type = 'retransfer' AND status <> 'resolved')
  `, [Number(actionId), closure, channelId]);
};

const recordDiscordReopen = async ({ channelId, reopenedByUserId, actionId }) => {
  const reopen = JSON.stringify({
    status: "open",
    channelId,
    reopenedByDiscordUserId: reopenedByUserId,
    reopenedAt: new Date().toISOString(),
    retransferCategoryId: env.discord.retransferCategoryId,
  });
  await pool.query(`
    UPDATE platform_actions
    SET status = 'open',
        resolved_at = NULL,
        details = details || jsonb_build_object('discordReopen', $2::jsonb),
        updated_at = NOW()
    WHERE id = $1
  `, [Number(actionId), reopen]);
};

export const closeRetransferTicket = async (interaction, controlMessageId) => {
  const ticket = await getRetransferTicket(interaction.channelId);
  if (!ticket) throw new Error("No LisTix re-transfer action is linked to this channel.");
  if (!ticket.discord_user_id) throw new Error("The ticket owner no longer has a connected Discord account.");
  if (ticket.action_status === "resolved") {
    await interaction.update({ content: "This re-transfer ticket is already closed.", components: [] });
    return;
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) throw new Error("This interaction is not inside a Discord text channel.");

  const completedCategory = await interaction.guild.channels.fetch(env.discord.completedRetransferCategoryId);
  if (!completedCategory || completedCategory.type !== ChannelType.GuildCategory) {
    throw new Error("The Completed Re-Transfers category is unavailable.");
  }

  const confirmationMessage = interaction.message;
  const controlMessage = controlMessageId
    ? await channel.messages.fetch(controlMessageId).catch(() => null)
    : null;

  await interaction.update({ content: "Closing the re-transfer ticket...", components: [] });
  await channel.permissionOverwrites.delete(ticket.discord_user_id, `Re-transfer closed by ${interaction.user.tag}`);
  const completedName = `completed-${safeOrderNumber(ticket.order_code)}`;
  const channelChanges = {
    parent: env.discord.completedRetransferCategoryId,
    reason: `Re-transfer ticket closed by ${interaction.user.tag}`,
  };
  if (channel.name !== completedName) channelChanges.name = completedName;
  await channel.edit(channelChanges);
  await recordDiscordClosure({ channelId: interaction.channelId, closedByUserId: interaction.user.id, actionId: ticket.action_id });
  await Promise.all([
    confirmationMessage.delete(),
    controlMessage?.delete() ?? Promise.resolve(),
  ]);
  await channel.send({
    embeds: [{
      title: "Re-transfer completed",
      description: `This ticket was closed by <@${interaction.user.id}> and moved to Completed Re-Transfers.`,
      color: 3066993,
      timestamp: new Date().toISOString(),
    }],
    components: [reopenTicketRow()],
  });
  console.log(`Re-transfer ticket ${interaction.channelId} closed.`);
};

export const reopenRetransferTicket = async (interaction) => {
  await interaction.deferUpdate();
  const ticket = await getRetransferTicket(interaction.channelId);
  if (!ticket) throw new Error("No LisTix re-transfer action is linked to this channel.");
  if (!ticket.discord_user_id) throw new Error("The ticket owner no longer has a connected Discord account.");
  if (ticket.action_status !== "resolved") {
    await interaction.editReply({ content: "This re-transfer ticket is already open.", components: [] });
    return;
  }

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) throw new Error("This interaction is not inside a Discord text channel.");

  const retransferCategory = await interaction.guild.channels.fetch(env.discord.retransferCategoryId);
  if (!retransferCategory || retransferCategory.type !== ChannelType.GuildCategory) {
    throw new Error("The Re-Transfer category is unavailable.");
  }

  await channel.edit({
    parent: env.discord.retransferCategoryId,
    reason: `Re-transfer ticket reopened by ${interaction.user.tag}`,
  });
  await channel.permissionOverwrites.edit(ticket.discord_user_id, memberTicketPermissions, {
    type: 1,
    reason: `Re-transfer reopened by ${interaction.user.tag}`,
  });
  await recordDiscordReopen({ channelId: interaction.channelId, reopenedByUserId: interaction.user.id, actionId: ticket.action_id });
  await interaction.editReply({
    embeds: [{
      title: "Re-transfer reopened",
      description: `This ticket was reopened by <@${interaction.user.id}> and moved back to Re-Transfers.`,
      color: 3447003,
      timestamp: new Date().toISOString(),
    }],
    components: [],
  });
  await channel.send({ content: "Ticket controls", components: [closeTicketRow("retransfer")] });
  await channel.send(userMentionPayload({
    discordUserId: ticket.discord_user_id,
    content: "This re-transfer ticket has been reopened. Please continue the transfer and send proof in this channel.",
  }));
  await channel.send(await supportHelpPayload(interaction.guild));
  console.log(`Re-transfer ticket ${interaction.channelId} reopened.`);
};

const getB2BPurchaseTicket = async (channelId) => {
  const result = await pool.query(`
    SELECT id AS inquiry_id, request_code, status, discord_user_id
    FROM b2b_purchase_inquiries
    WHERE discord_channel_id = $1
    ORDER BY id DESC
    LIMIT 1
  `, [channelId]);
  return result.rows[0] ?? null;
};

const recordB2BClosure = async ({ channelId, inquiryId, closedByUserId }) => {
  const closure = JSON.stringify({
    status: "closed", channelId, closedByDiscordUserId: closedByUserId,
    closedAt: new Date().toISOString(), completedCategoryId: env.discord.completedB2bPurchaseCategoryId,
  });
  await pool.query(`
    UPDATE b2b_purchase_inquiries
    SET status = 'closed', closed_at = NOW(), metadata = metadata || jsonb_build_object('discordClosure', $2::jsonb), updated_at = NOW()
    WHERE id = $1
  `, [Number(inquiryId), closure]);
  await pool.query(`
    UPDATE platform_actions
    SET status = 'resolved', resolved_at = COALESCE(resolved_at, NOW()),
      details = details || jsonb_build_object('discordClosure', $2::jsonb), updated_at = NOW()
    WHERE discord_channel_id = $1 AND action_type = 'b2b_purchase'
  `, [channelId, closure]);
};

const recordB2BReopen = async ({ channelId, inquiryId, reopenedByUserId }) => {
  const reopen = JSON.stringify({
    status: "open", channelId, reopenedByDiscordUserId: reopenedByUserId,
    reopenedAt: new Date().toISOString(), purchaseCategoryId: env.discord.b2bPurchaseCategoryId,
  });
  await pool.query(`
    UPDATE b2b_purchase_inquiries
    SET status = 'open', closed_at = NULL, metadata = metadata || jsonb_build_object('discordReopen', $2::jsonb), updated_at = NOW()
    WHERE id = $1
  `, [Number(inquiryId), reopen]);
  await pool.query(`
    UPDATE platform_actions
    SET status = 'open', resolved_at = NULL,
      details = details || jsonb_build_object('discordReopen', $2::jsonb), updated_at = NOW()
    WHERE discord_channel_id = $1 AND action_type = 'b2b_purchase'
  `, [channelId, reopen]);
};

const closeB2BPurchaseTicket = async (interaction, controlMessageId) => {
  const ticket = await getB2BPurchaseTicket(interaction.channelId);
  if (!ticket) throw new Error("No LisTix B2B purchase request is linked to this channel.");
  if (ticket.status === "closed") {
    await interaction.update({ content: "This purchase ticket is already closed.", components: [] });
    return;
  }
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) throw new Error("This interaction is not inside a Discord text channel.");
  const completedCategory = await interaction.guild.channels.fetch(env.discord.completedB2bPurchaseCategoryId);
  if (!completedCategory || completedCategory.type !== ChannelType.GuildCategory) throw new Error("The Completed B2B Purchases category is unavailable.");
  const confirmationMessage = interaction.message;
  const controlMessage = controlMessageId ? await channel.messages.fetch(controlMessageId).catch(() => null) : null;
  await interaction.update({ content: "Closing the purchase ticket...", components: [] });
  await channel.permissionOverwrites.delete(ticket.discord_user_id, `B2B purchase ticket closed by ${interaction.user.tag}`);
  const completedName = `completed-${safeOrderNumber(ticket.request_code)}`;
  await channel.edit({
    parent: env.discord.completedB2bPurchaseCategoryId,
    ...(channel.name === completedName ? {} : { name: completedName }),
    reason: `B2B purchase ticket closed by ${interaction.user.tag}`,
  });
  await recordB2BClosure({ channelId: interaction.channelId, inquiryId: ticket.inquiry_id, closedByUserId: interaction.user.id });
  await Promise.all([confirmationMessage.delete(), controlMessage?.delete() ?? Promise.resolve()]);
  await channel.send({
    embeds: [{
      title: "Purchase ticket completed",
      description: `This ticket was closed by <@${interaction.user.id}> and moved to Completed B2B Purchases.`,
      color: 3066993,
      timestamp: new Date().toISOString(),
    }],
    components: [reopenTicketRow("b2b")],
  });
};

const reopenB2BPurchaseTicket = async (interaction) => {
  await interaction.deferUpdate();
  const ticket = await getB2BPurchaseTicket(interaction.channelId);
  if (!ticket) throw new Error("No LisTix B2B purchase request is linked to this channel.");
  if (ticket.status !== "closed") {
    await interaction.editReply({ content: "This purchase ticket is already open.", components: [] });
    return;
  }
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) throw new Error("This interaction is not inside a Discord text channel.");
  const purchaseCategory = await interaction.guild.channels.fetch(env.discord.b2bPurchaseCategoryId);
  if (!purchaseCategory || purchaseCategory.type !== ChannelType.GuildCategory) throw new Error("The B2B Purchase category is unavailable.");
  await channel.edit({ parent: env.discord.b2bPurchaseCategoryId, reason: `B2B purchase ticket reopened by ${interaction.user.tag}` });
  await channel.permissionOverwrites.edit(ticket.discord_user_id, memberTicketPermissions, {
    type: 1, reason: `B2B purchase ticket reopened by ${interaction.user.tag}`,
  });
  await recordB2BReopen({ channelId: interaction.channelId, inquiryId: ticket.inquiry_id, reopenedByUserId: interaction.user.id });
  await interaction.editReply({
    embeds: [{
      title: "Purchase ticket reopened",
      description: `This ticket was reopened by <@${interaction.user.id}> and moved back to B2B Purchases.`,
      color: 3447003,
      timestamp: new Date().toISOString(),
    }],
    components: [],
  });
  await channel.send({ content: "Ticket controls", components: [closeTicketRow("b2b")] });
  await channel.send(userMentionPayload({
    discordUserId: ticket.discord_user_id,
    content: "This purchase ticket has been reopened. Please continue the conversation with LisTix Support in this channel.",
  }));
  await channel.send(await supportHelpPayload(interaction.guild, "purchase"));
};

const handleButton = async (interaction) => {
  if (!interaction.isButton() || !interaction.inGuild()) return;
  const [scope, action, requesterId, controlMessageId] = interaction.customId.split(":");
  if (scope !== "retransfer" && scope !== "b2b") return;

  if (!isTicketStaff(interaction)) {
    await interaction.reply({
        content: "Only Discord administrators and the Support team can manage this ticket.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "close") {
    if (pendingCloseConfirmations.has(interaction.channelId) || processingTicketChannels.has(interaction.channelId)) {
      await interaction.reply({ content: "A close confirmation is already open for this ticket.", flags: MessageFlags.Ephemeral });
      return;
    }
    const confirmationKey = interaction.id;
    pendingCloseConfirmations.set(interaction.channelId, confirmationKey);
    try {
      await interaction.reply({
        content: `Are you sure you want to close this ${scope === "b2b" ? "purchase" : "re-transfer"} ticket?`,
        components: [confirmationRow(scope, interaction.user.id, interaction.message.id)],
      });
      const channelId = interaction.channelId;
      setTimeout(() => {
        if (pendingCloseConfirmations.get(channelId) === confirmationKey) {
          pendingCloseConfirmations.delete(channelId);
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      pendingCloseConfirmations.delete(interaction.channelId);
      throw error;
    }
    return;
  }

  if (action === "reopen") {
    if (processingTicketChannels.has(interaction.channelId)) {
      await interaction.reply({ content: "This ticket is already being updated.", flags: MessageFlags.Ephemeral });
      return;
    }
    processingTicketChannels.add(interaction.channelId);
    try {
      if (scope === "b2b") await reopenB2BPurchaseTicket(interaction);
      else await reopenRetransferTicket(interaction);
    } finally {
      processingTicketChannels.delete(interaction.channelId);
    }
    return;
  }

  if ((action === "confirm" || action === "decline") && requesterId !== interaction.user.id) {
    await interaction.reply({ content: "Only the person who opened this confirmation can use these buttons.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === "decline") {
    pendingCloseConfirmations.delete(interaction.channelId);
    await interaction.update({ content: "Ticket closure cancelled.", components: [] });
    return;
  }

  if (action === "confirm") {
    if (processingTicketChannels.has(interaction.channelId)) {
      await interaction.update({ content: "This ticket is already being closed.", components: [] });
      return;
    }
    processingTicketChannels.add(interaction.channelId);
    try {
      if (scope === "b2b") await closeB2BPurchaseTicket(interaction, controlMessageId);
      else await closeRetransferTicket(interaction, controlMessageId);
    } finally {
      pendingCloseConfirmations.delete(interaction.channelId);
      processingTicketChannels.delete(interaction.channelId);
    }
  }
};

export const startDiscordInteractionBot = async () => {
  if (!env.discord.botToken || client) return false;
  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once(Events.ClientReady, (readyClient) => console.log(`Discord interactions ready as ${readyClient.user.tag}.`));
  client.on(Events.InteractionCreate, (interaction) => {
    void handleButton(interaction).catch(async (error) => {
      console.error("Discord interaction failed:", error.message);
      const payload = { content: `Unable to process this ticket: ${error.message}`, flags: MessageFlags.Ephemeral, components: [] };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => undefined);
      else await interaction.reply(payload).catch(() => undefined);
    });
  });
  await client.login(env.discord.botToken);
  return true;
};

export const stopDiscordInteractionBot = () => {
  client?.destroy();
  client = undefined;
};
