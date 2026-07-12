import {
  addSupportMessage,
  createSupportTicket,
  getSupportTicket,
  listActiveTopics,
  listUserSupportTickets,
} from "../services/supportService.js";

export const getTopics = async (_req, res, next) => { try { return res.json({ items: await listActiveTopics() }); } catch (error) { return next(error); } };
export const getMyTickets = async (req, res, next) => { try { return res.json({ items: await listUserSupportTickets(req.user.sub) }); } catch (error) { return next(error); } };
export const getMyTicket = async (req, res, next) => { try { const item = await getSupportTicket(req.params.id, { userId: req.user.sub }); return item ? res.json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
export const postTicket = async (req, res, next) => { try { return res.status(200).json({ item: await createSupportTicket(req.body, req.user.sub) }); } catch (error) { return next(error); } };
export const postMyMessage = async (req, res, next) => { try { const item = await addSupportMessage(req.params.id, req.body.text, req.user.sub); return item ? res.status(200).json({ item }) : res.status(404).json({ message: "Support ticket not found." }); } catch (error) { return next(error); } };
