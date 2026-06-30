import { Router } from "express";
import {
  getDashboard,
  getTicketInputOptionsController,
  getSoldOrdersController,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { createEntityCrudRoutes } from "./entityCrudRoutes.js";
import { entityDefinitions } from "../services/entityDefinitions.js";

const router = Router();

router.use(authenticate);
router.get("/dashboard", getDashboard);
router.get("/tickets/input-options", getTicketInputOptionsController);
router.get("/orders/sold", getSoldOrdersController);

for (const definition of entityDefinitions) {
  router.use(`/${definition.routePath}`, createEntityCrudRoutes(definition));
}

export default router;
