import {
  addSupportMessage,
  createTopic,
  deleteTopic,
  getSupportDashboard,
  getSupportTicket,
  listAllTopics,
  listSystemSupportTickets,
  listUsersWithMetrics,
  updateSupportTicketStatus,
} from "../services/supportService.js";

const filters = (query) => ({ scope: query.scope, from: query.from, to: query.to });
export const getUsers = async (_req, res, next) => { try { return res.json({ items: await listUsersWithMetrics() }); } catch (error) { return next(error); } };
export const getTickets = async (req, res, next) => { try { return res.json({ items: await listSystemSupportTickets(filters(req.query)) }); } catch (error) { return next(error); } };
export const getTicket = async (req, res, next) => { try { const item = await getSupportTicket(req.params.id, { allowAll: true }); return item ? res.json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const replyToTicket = async (req, res, next) => { try { const item = await addSupportMessage(req.params.id, req.body.text, req.user.sub, { allowAll: true }); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const changeTicketStatus = async (req, res, next) => { try { const item = await updateSupportTicketStatus(req.params.id, req.body.status); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const getDashboard = async (req, res, next) => { try { return res.json(await getSupportDashboard(filters(req.query))); } catch (error) { return next(error); } };
export const getTopics = async (_req, res, next) => { try { return res.json({ items: await listAllTopics() }); } catch (error) { return next(error); } };
export const postTopic = async (req, res, next) => { try { return res.status(200).json({ item: await createTopic(req.body.name) }); } catch (error) { return next(error); } };
export const removeTopic = async (req, res, next) => { try { const item = await deleteTopic(req.params.id); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support topic not found." }); } catch (error) { return next(error); } };
