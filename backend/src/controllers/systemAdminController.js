import {
  addSupportMessage,
  createTopic,
  deleteTopic,
  getSupportDashboard,
  getSupportTicket,
  listAllTopics,
  listSystemSupportTickets,
  updateSupportTicketStatus,
} from "../services/supportService.js";
import {
  getPlatformPayments,
  getPlatformUserDetails,
  getPlatformSale,
  listPlatformActions,
  listPlatformListings,
  listPlatformSales,
  listPlatformUsers,
  resolvePlatformAction,
  updatePlatformUser,
  cancelPlatformSale,
} from "../services/platformAdminService.js";
import { triggerPlatformTestAction } from "../services/actionAutomationService.js";
import { mailboxConfigured, pollRetransferMailbox } from "../services/mailboxService.js";
import { env } from "../config/env.js";
import { listMarketplaceControls, setAllMarketplacesEnabled, setMarketplaceEnabled } from "../services/marketplaceControlService.js";
import { deleteSystemMember, getSystemTeam, inviteSystemMember, updateSystemMember } from "../services/systemAccessService.js";
import { listVenueMaps, previewVenueMap, saveVenueMap } from "../services/venueMapService.js";

const filters = (query) => ({ scope: query.scope, from: query.from, to: query.to });
export const getUsers = async (_req, res, next) => { try { return res.json({ items: await listPlatformUsers() }); } catch (error) { return next(error); } };
export const getUser = async (req, res, next) => { try { const item = await getPlatformUserDetails(req.params.id); return item ? res.json({ item }) : res.status(404).json({ message: "User not found." }); } catch (error) { return next(error); } };
export const putUser = async (req, res, next) => { try { const item = await updatePlatformUser(req.params.id, req.body); return item ? res.json({ item }) : res.status(404).json({ message: "User not found." }); } catch (error) { return next(error); } };
export const getSales = async (_req, res, next) => { try { return res.json({ items: await listPlatformSales() }); } catch (error) { return next(error); } };
export const getSale = async (req, res, next) => { try { const item = await getPlatformSale(req.params.id); return item ? res.json({ item }) : res.status(404).json({ message: "Sale not found." }); } catch (error) { return next(error); } };
export const cancelSale = async (req, res, next) => { try { return res.json({ item: await cancelPlatformSale(req.params.id, req.user.sub) }); } catch (error) { return next(error); } };
export const getListings = async (_req, res, next) => { try { return res.json({ items: await listPlatformListings() }); } catch (error) { return next(error); } };
export const getVenueMaps = async (_req, res, next) => { try { return res.json({ items: await listVenueMaps() }); } catch (error) { return next(error); } };
export const getVenueMapPreview = async (req, res, next) => { try { const item = await previewVenueMap(req.params.venueId, req.query.template || req.query.kind); return item ? res.json({ item }) : res.status(404).json({ message: "Venue not found." }); } catch (error) { return next(error); } };
export const putVenueMap = async (req, res, next) => { try { const item = await saveVenueMap(req.params.venueId, req.body, req.user.sub); return item ? res.json({ item }) : res.status(404).json({ message: "Venue not found." }); } catch (error) { return next(error); } };
export const getPayments = async (_req, res, next) => { try { return res.json(await getPlatformPayments()); } catch (error) { return next(error); } };
export const getActions = async (_req, res, next) => { try { return res.json({ items: await listPlatformActions() }); } catch (error) { return next(error); } };
export const postTestAction = async (req, res, next) => { try { return res.status(201).json(await triggerPlatformTestAction(req.body)); } catch (error) { return next(error); } };
export const resolveAction = async (req, res, next) => { try { const item = await resolvePlatformAction(req.params.id); return item ? res.json({ item }) : res.status(404).json({ message: "Action not found." }); } catch (error) { return next(error); } };
export const pollMailbox = async (_req, res, next) => { try { return res.json(await pollRetransferMailbox()); } catch (error) { return next(error); } };
export const getAutomationStatus = async (_req, res) => res.json({
  imap: mailboxConfigured(),
  smtp: Boolean(env.smtp.host && env.smtp.fromAddress),
  discord: Boolean(env.discord.botToken && env.discord.guildId),
});
export const getTickets = async (req, res, next) => { try { return res.json({ items: await listSystemSupportTickets(filters(req.query)) }); } catch (error) { return next(error); } };
export const getTicket = async (req, res, next) => { try { const item = await getSupportTicket(req.params.id, { allowAll: true }); return item ? res.json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const replyToTicket = async (req, res, next) => { try { const item = await addSupportMessage(req.params.id, req.body.text, req.user.sub, { allowAll: true }); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const changeTicketStatus = async (req, res, next) => { try { const item = await updateSupportTicketStatus(req.params.id, req.body.status); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const getDashboard = async (req, res, next) => { try { return res.json(await getSupportDashboard(filters(req.query))); } catch (error) { return next(error); } };
export const getTopics = async (_req, res, next) => { try { return res.json({ items: await listAllTopics() }); } catch (error) { return next(error); } };
export const postTopic = async (req, res, next) => { try { return res.status(200).json({ item: await createTopic(req.body.name) }); } catch (error) { return next(error); } };
export const removeTopic = async (req, res, next) => { try { const item = await deleteTopic(req.params.id); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support topic not found." }); } catch (error) { return next(error); } };
export const getMarketplaces = async (_req, res, next) => { try { return res.json(await listMarketplaceControls()); } catch (error) { return next(error); } };
export const putMarketplace = async (req, res, next) => { try { const item = await setMarketplaceEnabled(req.params.marketplace, req.body.enabled, req.user.sub); return item ? res.json(item) : res.status(404).json({ message: "Marketplace not found." }); } catch (error) { return next(error); } };
export const putAllMarketplaces = async (req, res, next) => { try { return res.json(await setAllMarketplacesEnabled(req.body.enabled, req.user.sub)); } catch (error) { return next(error); } };
export const getTeam = async (_req, res, next) => { try { return res.json(await getSystemTeam()); } catch (error) { return next(error); } };
export const inviteTeamMember = async (req, res, next) => { try { return res.status(201).json(await inviteSystemMember(req.body, req.user)); } catch (error) { return next(error); } };
export const patchTeamMember = async (req, res, next) => { try { const member = await updateSystemMember(req.params.id, req.body); return member ? res.json({ member }) : res.status(404).json({ message: "System member not found." }); } catch (error) { return next(error); } };
export const removeTeamMember = async (req, res, next) => { try { const deleted = await deleteSystemMember(req.params.id, req.user); return deleted ? res.status(204).send() : res.status(404).json({ message: "System member not found or cannot be removed." }); } catch (error) { return next(error); } };
