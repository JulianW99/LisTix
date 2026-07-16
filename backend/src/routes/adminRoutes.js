import { Router } from "express";
import {
  getDashboard,
  getTicketInputOptionsController,
  getSoldOrdersController,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { createEntityCrudRoutes } from "./entityCrudRoutes.js";
import { entityDefinitions } from "../services/entityDefinitions.js";
import { requireAnyPermission, requirePermission } from "../middleware/requirePermission.js";

const router = Router();

router.use(authenticate);
router.get("/dashboard", requirePermission("dashboard.view"), getDashboard);
router.get("/tickets/input-options", requirePermission("listings.view"), getTicketInputOptionsController);
router.get("/orders/sold", requireAnyPermission(["sales.view", "payments.view"]), getSoldOrdersController);

for (const definition of entityDefinitions) {
  if (definition.key === "users") {
    continue;
  }

  router.use(`/${definition.routePath}`, createEntityCrudRoutes(definition));
}

export default router;
