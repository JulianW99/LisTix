import { Router } from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import supportRoutes from "./supportRoutes.js";
import systemAdminRoutes from "./systemAdminRoutes.js";
import teamRoutes from "./teamRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/support", supportRoutes);
router.use("/system-admin", systemAdminRoutes);
router.use("/team", teamRoutes);
router.use("/admin", adminRoutes);

export default router;
