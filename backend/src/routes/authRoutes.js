import { Router } from "express";
import { login, logout, me, updateMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { completeInvitation, invitationDetails } from "../controllers/invitationController.js";
import {
  discordCallback,
  discordConnection,
  removeDiscordConnection,
  startDiscordConnect,
} from "../controllers/discordAuthController.js";

const router = Router();

router.post("/login", login);
router.get("/discord/connect", authenticate, startDiscordConnect);
router.get("/discord/callback", discordCallback);
router.get("/discord/connection", authenticate, discordConnection);
router.delete("/discord/connection", authenticate, removeDiscordConnection);
router.get("/invitations/:token", invitationDetails);
router.post("/invitations/:token/accept", completeInvitation);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateMe);

export default router;
