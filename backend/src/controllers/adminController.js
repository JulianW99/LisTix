import {
  getDashboardSnapshot,
  getTicketInputOptions,
  listSoldOrders,
} from "../services/ticketOperationsService.js";

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
