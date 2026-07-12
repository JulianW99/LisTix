import type { SupportTicket } from "../types";

export const formatSupportStatus = (status: SupportTicket["status"]) => ({
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
})[status];
