export type StatusTone = "positive" | "warning" | "danger" | "neutral";

export const getStatusTone = (status: string): StatusTone => {
  const normalized = status.trim().toLowerCase();
  if (["active", "delivered", "listed", "live", "paid", "operational", "synced", "completed"].includes(normalized)) return "positive";
  if (["pending delivery", "processing", "degraded", "awaiting transfer", "ready to send", "due"].includes(normalized)) return "warning";
  if (["cancelled", "canceled", "error", "down"].includes(normalized)) return "danger";
  return "neutral";
};
