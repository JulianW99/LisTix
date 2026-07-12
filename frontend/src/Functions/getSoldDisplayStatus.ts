import type { SoldOrder } from "../types";

export const getSoldDisplayStatus = (order: SoldOrder) => {
  if (order.dispatchStatus === "Completed") return "Delivered";
  if (["Awaiting transfer", "Ready to send"].includes(order.dispatchStatus)) return "Pending Delivery";
  return order.dispatchStatus;
};
