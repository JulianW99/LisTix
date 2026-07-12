import { Router } from "express";
import { changeTicketStatus, getDashboard, getTicket, getTickets, getTopics, getUsers, postTopic, removeTopic, replyToTicket } from "../controllers/systemAdminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.js";

const router = Router();
router.use(authenticate, requireSystemAdmin);
router.get("/users", getUsers);
router.get("/support/tickets", getTickets);
router.get("/support/tickets/:id", getTicket);
router.post("/support/tickets/:id/messages", replyToTicket);
router.put("/support/tickets/:id/status", changeTicketStatus);
router.get("/support/dashboard", getDashboard);
router.get("/support/topics", getTopics);
router.post("/support/topics", postTopic);
router.delete("/support/topics/:id", removeTopic);
export default router;
