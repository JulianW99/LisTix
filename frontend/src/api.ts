import type { ActivityItem, AutomationStatus, B2BEvent, B2BInquiry, CreateTicketInput, DashboardData, DiscordConnection, InvitationDetails, MarketplaceControls, PlatformAction, PointSummary, SoldOrder, SupportDashboard, SupportFilters, SupportTicket, SupportTopic, SystemAdminNotificationSettings, SystemListing, SystemPaymentsData, SystemSale, SystemTeamConfiguration, SystemTeamMember, SystemUser, SystemUserDetails, SystemVenueMap, TeamConfiguration, TeamMember, TicketInputOptions, TicketItem, UpdateMeInput, UpdateTicketInput, User, VenueMapLayout, VenueMapTemplate } from "./types";

const API_BASE_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL?.trim() || "/api";
type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

const request = async <T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { body, ...rest } = options;
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${endpoint}`, {
    method: body ? "POST" : "GET", ...rest,
    headers: { "Content-Type": "application/json", ...rest.headers },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const queryString = (filters: SupportFilters) => {
  const query = new URLSearchParams(); query.set("scope", filters.scope);
  if (filters.from) query.set("from", filters.from); if (filters.to) query.set("to", filters.to);
  return query.toString();
};

export const api = {
  b2bEvents: () => request<{ items: B2BEvent[] }>("/marketplace/events"),
  createB2BInquiry: (payload: { listingId: number; quantity: number }) => request<{ inquiry: B2BInquiry; user: User | null }>("/marketplace/inquiries", { body: payload }),
  login: (email: string, password: string) => request<{ user: User }>("/auth/login", { body: { email, password } }),
  startDiscordConnect: () => request<{ authorizationUrl: string }>("/auth/discord/connect"),
  discordConnection: () => request<{ configured: boolean; connection: DiscordConnection }>("/auth/discord/connection"),
  disconnectDiscord: () => request<void>("/auth/discord/connection", { method: "DELETE" }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/auth/me"),
  updateMe: (payload: UpdateMeInput) => request<{ user: User }>("/auth/me", { method: "PUT", body: payload }),
  invitation: (token: string) => request<{ invitation: InvitationDetails }>(`/auth/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token: string, payload: { displayName: string; password: string }) => request<{ email: string; accountName: string }>(`/auth/invitations/${encodeURIComponent(token)}/accept`, { body: payload }),
  dashboard: () => request<DashboardData>("/admin/dashboard"),
  tickets: () => request<{ items: TicketItem[] }>("/admin/tickets"),
  soldOrders: () => request<{ items: SoldOrder[] }>("/admin/orders/sold"),
  myPoints: () => request<PointSummary>("/admin/points"),
  marketplaceStatus: () => request<MarketplaceControls>("/admin/marketplaces/status"),
  updateSoldOrder: (id: string | number, payload: { dispatchStatusId: number }) => request<{ item: SoldOrder }>(`/admin/sold-orders/${id}`, { method: "PUT", body: payload }),
  ticketInputOptions: () => request<TicketInputOptions>("/admin/tickets/input-options"),
  createTicket: (payload: CreateTicketInput) => request<{ item: TicketItem }>("/admin/tickets", { body: payload }),
  updateTicket: (id: string | number, payload: UpdateTicketInput) => request<{ item: TicketItem }>(`/admin/tickets/${id}`, { method: "PUT", body: payload }),
  deleteTicket: (id: string | number) => request<void>(`/admin/tickets/${id}`, { method: "DELETE" }),
  supportTopics: () => request<{ items: SupportTopic[] }>("/support/topics"),
  mySupportTickets: () => request<{ items: SupportTicket[] }>("/support/tickets"),
  supportTicket: (id: string | number) => request<{ item: SupportTicket }>(`/support/tickets/${id}`),
  createSupportTicket: (topicId: number, text: string) => request<{ item: SupportTicket }>("/support/tickets", { body: { topicId, text } }),
  replyToSupportTicket: (id: string | number, text: string) => request<{ item: SupportTicket }>(`/support/tickets/${id}/messages`, { body: { text } }),
  systemUsers: () => request<{ items: SystemUser[] }>("/system-admin/users"),
  systemUser: (id: string | number) => request<{ item: SystemUserDetails }>(`/system-admin/users/${id}`),
  updateSystemUser: (id: number, payload: Pick<SystemUser, "accountStatus" | "identityVerificationStatus">) => request<{ item: SystemUser }>(`/system-admin/users/${id}`, { method: "PUT", body: payload }),
  systemSales: () => request<{ items: SystemSale[] }>("/system-admin/sales"),
  systemSale: (id: string | number) => request<{ item: SystemSale }>(`/system-admin/sales/${id}`),
  cancelSystemSale: (id: string | number) => request<{ item: SystemSale }>(`/system-admin/sales/${id}/cancel`, { method: "POST", body: {} }),
  systemListings: () => request<{ items: SystemListing[] }>("/system-admin/listings"),
  systemVenueMaps: () => request<{ items: SystemVenueMap[] }>("/system-admin/venue-maps"),
  previewSystemVenueMap: (venueId: number, template: VenueMapTemplate) => request<{ item: SystemVenueMap }>(`/system-admin/venue-maps/${venueId}/preview?template=${template}`),
  updateSystemVenueMap: (venueId: number, payload: { name: string; isPublished: boolean; layout: VenueMapLayout }) => request<{ item: SystemVenueMap }>(`/system-admin/venue-maps/${venueId}`, { method: "PUT", body: payload }),
  systemPayments: () => request<SystemPaymentsData>("/system-admin/payments"),
  systemActions: () => request<{ items: PlatformAction[] }>("/system-admin/actions"),
  triggerSystemTestAction: (payload: { userId: number; actionType: string; saleId?: number }) => request<{ actionId: number; duplicate: boolean; notifications?: Record<string, unknown> }>("/system-admin/actions/test", { body: payload }),
  resolveSystemAction: (id: number) => request<{ item: PlatformAction }>(`/system-admin/actions/${id}/resolve`, { method: "PUT", body: {} }),
  automationStatus: () => request<AutomationStatus>("/system-admin/automation/status"),
  pollAutomationMailbox: () => request<{ processed?: number; skipped?: boolean }>("/system-admin/automation/poll-mailbox", { method: "POST", body: {} }),
  systemNotificationSettings: () => request<SystemAdminNotificationSettings>("/system-admin/notification-settings"),
  updateSystemNotificationSettings: (admins: SystemAdminNotificationSettings["admins"]) => request<SystemAdminNotificationSettings>("/system-admin/notification-settings", { method: "PUT", body: { admins } }),
  systemSupportTickets: (filters: SupportFilters) => request<{ items: SupportTicket[] }>(`/system-admin/support/tickets?${queryString(filters)}`),
  systemSupportTicket: (id: string | number) => request<{ item: SupportTicket }>(`/system-admin/support/tickets/${id}`),
  replyAsSystemAdmin: (id: string | number, text: string) => request<{ item: SupportTicket }>(`/system-admin/support/tickets/${id}/messages`, { body: { text } }),
  updateSupportStatus: (id: string | number, status: SupportTicket["status"]) => request<{ item: SupportTicket }>(`/system-admin/support/tickets/${id}/status`, { method: "PUT", body: { status } }),
  supportDashboard: (filters: SupportFilters) => request<SupportDashboard>(`/system-admin/support/dashboard?${queryString(filters)}`),
  systemSupportTopics: () => request<{ items: SupportTopic[] }>("/system-admin/support/topics"),
  createSupportTopic: (name: string) => request<{ item: SupportTopic }>("/system-admin/support/topics", { body: { name } }),
  deleteSupportTopic: (id: number) => request<{ item: SupportTopic }>(`/system-admin/support/topics/${id}`, { method: "DELETE" }),
  systemMarketplaces: () => request<MarketplaceControls>("/system-admin/marketplaces"),
  updateSystemMarketplace: (marketplace: string, enabled: boolean) => request<MarketplaceControls>(`/system-admin/marketplaces/${encodeURIComponent(marketplace)}`, { method: "PUT", body: { enabled } }),
  updateAllSystemMarketplaces: (enabled: boolean) => request<MarketplaceControls>("/system-admin/marketplaces/all", { method: "PUT", body: { enabled } }),
  systemTeam: () => request<SystemTeamConfiguration>("/system-admin/team"),
  inviteSystemTeamMember: (payload: { email: string; role: string; permissions: string[] }) => request<{ member: SystemTeamMember; inviteUrl: string }>("/system-admin/team/invitations", { body: payload }),
  updateSystemTeamMember: (id: number, payload: { role?: string; permissions?: string[]; status?: string }) => request<{ member: SystemTeamMember }>(`/system-admin/team/members/${id}`, { method: "PATCH", body: payload }),
  deleteSystemTeamMember: (id: number) => request<void>(`/system-admin/team/members/${id}`, { method: "DELETE" }),
  team: () => request<TeamConfiguration>("/team"),
  updateTeamSettings: (enabled: boolean) => request<{ account: TeamConfiguration["account"] }>("/team/settings", { method: "PUT", body: { enabled } }),
  inviteTeamMember: (payload: { email: string; role: string; permissions: string[] }) => request<{ member: TeamMember; inviteUrl: string }>("/team/invitations", { body: payload }),
  updateTeamMember: (id: number, payload: { role?: string; permissions?: string[]; status?: string }) => request<{ member: TeamMember }>(`/team/members/${id}`, { method: "PATCH", body: payload }),
  deleteTeamMember: (id: number) => request<void>(`/team/members/${id}`, { method: "DELETE" }),
  teamActivity: () => request<{ items: ActivityItem[] }>("/team/activity?limit=100"),
};
