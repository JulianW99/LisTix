import { Router } from "express";
import {
  changeMember,
  getActivity,
  getTeam,
  inviteMember,
  removeMember,
  updateTeamSettings,
} from "../controllers/teamController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/requirePermission.js";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("team.view"), getTeam);
router.put("/settings", requirePermission("team.manage"), updateTeamSettings);
router.post("/invitations", requirePermission("team.manage"), inviteMember);
router.patch("/members/:id", requirePermission("team.manage"), changeMember);
router.delete("/members/:id", requirePermission("team.manage"), removeMember);
router.get("/activity", requirePermission("audit.view"), getActivity);

export default router;
