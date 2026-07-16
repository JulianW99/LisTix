import { Router } from "express";
import { getB2BEvents, postB2BInquiry } from "../controllers/b2bMarketplaceController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.get("/events", getB2BEvents);
router.post("/inquiries", authenticate, postB2BInquiry);

export default router;
