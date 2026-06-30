import type {
  CreateTicketInput,
  DashboardData,
  SoldOrder,
  TicketInputOptions,
  TicketItem,
  User,
} from "./types";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4010";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(errorBody.message || "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<void>("/api/auth/logout", {
      method: "POST",
    }),
  me: () => request<{ user: User }>("/api/auth/me"),
  dashboard: () => request<DashboardData>("/api/admin/dashboard"),
  tickets: () => request<{ items: TicketItem[] }>("/api/admin/tickets"),
  ticketInputOptions: () => request<TicketInputOptions>("/api/admin/tickets/input-options"),
  createTicket: (input: CreateTicketInput) =>
    request<{ item: TicketItem }>("/api/admin/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  soldOrders: () => request<{ items: SoldOrder[] }>("/api/admin/orders/sold"),
};
