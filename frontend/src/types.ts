export type User = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  account: { id: number; name: string; ownerUserId: number; multiUserEnabled: boolean } | null;
  accountRole: string;
  permissions: string[];
  profileSettings: ProfileSettings;
  createdAt: string;
};

export type SupportTopic = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: number;
  ticketId: number;
  authorUserId: number;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: number;
  ticketId: string;
  userId: number;
  userEmail: string;
  userName: string;
  topicId: number;
  topic: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  text: string;
  messageCount: number;
  messages?: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type SystemUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  onlineTickets: number;
  onlineTicketValue: number;
  revenueLtm: number;
  revenueLastMonth: number;
  openSupportTickets: number;
  status: "OK" | "Action required";
  createdAt: string;
};

export type SupportDashboard = {
  scope: "live" | "history";
  total: number;
  topics: Array<{ topicId: number; topic: string; count: number }>;
};

export type SupportFilters = {
  scope: "live" | "history";
  from?: string;
  to?: string;
};

export type ProfileSettings = {
  discordHandle: string;
  discordUserId: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  payoutMethod: string;
  payoutAccountHolder: string;
  payoutIban: string;
  payoutBic: string;
  payoutBankName: string;
  revolutRevtag: string;
  paymentCardBrand: string;
  paymentCardNumber: string;
  paymentCardCvv: string;
  paymentCardExpiryMonth: string;
  paymentCardExpiryYear: string;
  paymentCardLast4: string;
  paymentCardExpiry: string;
  pushoverUserKey: string;
  sheetsGoogleAccount: string;
  sheetsDocumentUrl: string;
  sheetsConfirmationMode: string;
  tikeyConnected: boolean;
  ticketmasterAccountsCsv: string;
  axsAccountsCsv: string;
};

export type DashboardData = {
  // New Stats
  listedTickets: number;
  soldTickets: number;
  profit: number;
  payoutReceived: number;
  pendingPayout: number;
  salesByPlatform: Array<{ name: string; count: number }>;
  averageRoi: number;

  // Original stats
  grossSales: number;
  ticketsInInventory: number;
  monthlyTrend: Array<{ label: string; sales: number; profit: number; averageRoi: number }>;
};

export type TicketItem = {
  databaseId: number;
  userId: number | null;
  accountId: number;
  id: string;
  ticketCode: string;
  eventId: number;
  eventName: string;
  venueId: number;
  venue: string;
  venueCity: string;
  categoryId: number;
  categoryName: string;
  eventDate: string;
  sectionId: number;
  quantity: number;
  purchasePrice: number;
  askingPrice: number;
  lowestSeat: number | null;
  restrictionId: number | null;
  restriction: string | null;
  restrictionIds: number[];
  restrictions: string[];
  ticketType: "Mobile ticket transfer" | "PDF-Ticket";
  marketplacePrices: MarketplacePrice[];
  marketplaceStatusId: number;
  marketplaceStatus: string;
  section: string;
  rowLabel: string;
  seatLabel: string;
  notes: string | null;
  lastEditedBy: string | null;
  lastEditedByEmail: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SoldOrder = {
  databaseId: number;
  id: string;
  orderCode: string;
  ticketDatabaseId: number;
  ticketId: string;
  ticketCode: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  venueCity: string;
  sectionId: number;
  section: string;
  rowLabel: string;
  lowestSeat: number | null;
  seatLabel: string;
  quantity: number;
  purchasePrice: number;
  askingPrice: number;
  buyerChannelId: number;
  buyerChannel: string;
  dispatchStatusId: number;
  soldAt: string;
  payoutAt: string;
  payoutAmount: number;
  dispatchStatus: string;
  dispatchComplete: boolean;
  profit: number;
  roi: number;
  customerName: string;
  buyerEmail?: string | null;
  sentBy: string | null;
  sentByEmail: string | null;
  sentAt: string | null;
  ticketType?: "Mobile ticket transfer" | "PDF-Ticket";
  restrictions?: string[];
  createdAt: string;
  updatedAt: string;
};

export type TicketEventOption = {
  id: number;
  eventName: string;
  eventDate: string;
  venueId: number;
  venueName: string;
  venueCity: string;
};

export type TicketSectionOption = {
  id: number;
  venueId: number;
  venueName: string;
  name: string;
  rowLabels: string[];
};

export type DiscordConnection = {
  connected: boolean;
  id?: string;
  username?: string;
  displayName?: string;
  email?: string | null;
  avatarUrl?: string | null;
  connectedAt?: string;
  lastLoginAt?: string | null;
};

export type MarketplaceStatusOption = {
  id: number;
  name: string;
};

export type TicketRestrictionOption = {
  id: number;
  name: string;
};

export type TicketInputOptions = {
  events: TicketEventOption[];
  sections: TicketSectionOption[];
  marketplaceStatuses: MarketplaceStatusOption[];
  restrictions: TicketRestrictionOption[];
  dispatchStatuses: Array<{ id: number; name: string; isTerminal: boolean }>;
};

export type CreateTicketInput = {
  eventId: number;
  sectionId: number;
  restrictionId?: number;
  restrictionIds: number[];
  ticketType: "Mobile ticket transfer" | "PDF-Ticket";
  marketplaceStatusId?: number;
  quantity: number;
  rowLabel: string;
  lowestSeat: number;
  purchasePrice: number;
  askingPrice: number;
  notes?: string | null;
};

export type MarketplacePrice = { marketplace: string; lowestPrice: number | null };

export type UpdateTicketInput = Partial<CreateTicketInput>;

export type UpdateMeInput = {
  displayName: string;
  profileSettings: ProfileSettings;
};

export type TeamMember = {
  id: number;
  userId: number | null;
  email: string;
  displayName: string;
  role: "owner" | "administrator" | "manager" | "moderator" | "viewer";
  permissions: string[];
  status: "pending" | "active" | "suspended" | "revoked";
  invitedBy: string | null;
  invitationExpiresAt: string | null;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamConfiguration = {
  account: { id: number; name: string; multiUserEnabled: boolean };
  members: TeamMember[];
  roles: Array<{ role: Exclude<TeamMember["role"], "owner">; permissions: string[] }>;
  permissions: string[];
};

export type ActivityItem = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  actorName: string;
  actorEmail: string | null;
  createdAt: string;
};

export type InvitationDetails = {
  email: string;
  role: string;
  accountName: string;
  expiresAt: string;
};
