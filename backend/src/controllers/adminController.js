import {
  getDashboardSnapshot,
  getTicketInputOptions,
  listSoldOrders,
} from "../services/ticketOperationsService.js";
import { getUserPoints } from "../services/pointService.js";
import { listMarketplaceControls } from "../services/marketplaceControlService.js";

export const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await getDashboardSnapshot(req.user);
    return res.json(dashboard);
  } catch (error) {
    return next(error);
  }
};

export const getTicketInputOptionsController = async (_req, res, next) => {
  try {
    const options = await getTicketInputOptions();
    return res.json(options);
  } catch (error) {
    return next(error);
  }
};

export const getSoldOrdersController = async (req, res, next) => {
  try {
    const orders = await listSoldOrders(req.user);
    return res.json({ items: orders });
  } catch (error) {
    return next(error);
  }
};

export const getMyPoints = async (req, res, next) => {
  try { return res.json(await getUserPoints(req.user.ownerUserId)); }
  catch (error) { return next(error); }
};

export const getMarketplaceAvailability = async (_req, res, next) => {
  try { return res.json(await listMarketplaceControls()); }
  catch (error) { return next(error); }
};
