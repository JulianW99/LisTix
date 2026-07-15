export type StatusTone = "positive" | "warning" | "danger" | "neutral";

export const getStatusTone = (status: string): StatusTone => {
  if (["Active", "Delivered", "Listed", "Live", "Paid", "Operational", "Synced", "Completed"].includes(status)) return "positive";
  if (["Pending Delivery", "Processing", "Degraded", "Awaiting transfer", "Ready to send"].includes(status)) return "warning";
  if (["Cancelled", "Error", "Down"].includes(status)) return "danger";
  return "neutral";
};
