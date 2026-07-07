import type { CreateTicketInput, SoldOrder, UpdateMeInput } from "./types";

const API_BASE_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL?.trim() || "/api";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const buildApiUrl = (endpoint: string) => {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${normalizedBaseUrl}${normalizedEndpoint}`;
};

/**
 * A helper function for making authenticated requests to the backend API.
 * It automatically includes credentials (cookies) and handles JSON responses.
 */
const request = async (endpoint: string, options: ApiRequestOptions = {}) => {
  const { body, ...customConfig } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    method: body ? "POST" : "GET",
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    // This is crucial for sending the session cookie back and forth
    credentials: "include",
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(buildApiUrl(endpoint), config);

  if (!response.ok) {
    // Try to parse a JSON error message from the backend, otherwise use status text
    const errorData = await response.json().catch(() => ({
      message: response.statusText,
    }));
    const error = new Error(errorData.message || "An API error occurred");
    throw error;
  }

  // Handle successful responses that have no content (e.g., logout)
  if (response.status === 204) {
    return;
  }

  return response.json();
};

// This object exports all the functions the frontend uses to talk to the backend.
export const api = {
  login: (email: string, password: string) => {
    return request("/auth/login", { body: { email, password } });
  },
  logout: () => {
    return request("/auth/logout", { method: "POST" });
  },
  me: () => {
    return request("/auth/me");
  },
  updateMe: (payload: UpdateMeInput) => {
    return request("/auth/me", { method: "PUT", body: payload });
  },
  dashboard: () => {
    return request("/admin/dashboard");
  },
  tickets: () => {
    return request("/admin/tickets");
  },
  soldOrders: () => {
    return request("/admin/orders/sold");
  },
  updateSoldOrder: (id: string, payload: Partial<SoldOrder>) => {
    return request(`/admin/sold-orders/${id}`, { method: "PUT", body: payload });
  },
  ticketInputOptions: () => {
    return request("/admin/tickets/input-options");
  },
  createTicket: (payload: CreateTicketInput) => {
    return request("/admin/tickets", { body: payload });
  },
};
