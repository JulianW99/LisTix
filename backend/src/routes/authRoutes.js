import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
