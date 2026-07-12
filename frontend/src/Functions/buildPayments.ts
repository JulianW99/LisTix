import type { SoldOrder } from "../types";

export type Payment = {
  id: string;
  payoutDate: string;
  status: "Paid" | "Pending" | "Processing";
  amount: number;
  platformFees: number;
  payoutFees: number;
  finalPayout: number;
  platform: string;
  sales: SoldOrder[];
};

export const buildPayments = (orders: SoldOrder[]): Payment[] => {
  const groups = orders.reduce<Record<string, SoldOrder[]>>((result, order) => {
    const date = order.payoutAt.slice(0, 10);
    const key = `${date}-${order.buyerChannel}`;
    result[key] = [...(result[key] ?? []), order];
    return result;
  }, {});

  return Object.values(groups).map((sales, index) => {
    const amount = sales.reduce((sum, sale) => sum + sale.payoutAmount, 0);
    const platformFees = Math.round(amount * 0.08);
    const payoutFees = Math.max(2, Math.round(amount * 0.01));
    const payoutDate = sales[0].payoutAt;
    const pending = new Date(payoutDate).getTime() > Date.now();
    return {
      id: `PO-${new Date(payoutDate).getFullYear()}-${String(index + 1).padStart(4, "0")}`,
      payoutDate,
      status: pending ? "Pending" : index % 4 === 1 ? "Processing" : "Paid",
      amount,
      platformFees,
      payoutFees,
      finalPayout: amount - platformFees - payoutFees,
      platform: sales[0].buyerChannel,
      sales,
    };
  });
};
