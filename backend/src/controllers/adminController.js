import {
  getDashboardSnapshot,
  getTicketInputOptions,
  listSoldOrders,
} from "../services/ticketOperationsService.js";

export const getDashboard = async (_req, res, next) => {
  try {
    const dashboard = await getDashboardSnapshot();
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

export const getSoldOrdersController = async (_req, res, next) => {
  try {
    const orders = await listSoldOrders();
    return res.json({ items: orders });
  } catch (error) {
    return next(error);
  }
};
