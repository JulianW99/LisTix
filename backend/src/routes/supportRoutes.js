import { Router } from "express";
import { getMyTicket, getMyTickets, getTopics, postMyMessage, postTicket } from "../controllers/supportController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.use(authenticate);
router.get("/topics", getTopics);
router.get("/tickets", getMyTickets);
router.post("/tickets", postTicket);
router.get("/tickets/:id", getMyTicket);
router.post("/tickets/:id/messages", postMyMessage);
export default router;
