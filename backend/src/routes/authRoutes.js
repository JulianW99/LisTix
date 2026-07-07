import { Router } from "express";
import { login, logout, me, updateMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateMe);

export default router;
