export type User = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  account: { id: number; name: string; ownerUserId: number; multiUserEnabled: boolean } | null;
  accountRole: string;
  permissions: string[];
  systemAccess: boolean;
  pointBalance: number;
  totalPaidOut: number;
  podEligibility: PodEligibility | null;
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
  salesCount: number;
  pointBalance: number;
  totalPaidOut: number;
  podEligibility: PodEligibility;
  discordConnected: boolean;
  tikeyConnected: boolean;
  identityVerificationStatus: "not_started" | "pending" | "verified" | "rejected";
  identityVerifiedAt: string | null;
  accountStatus: "active" | "suspended" | "banned";
  status: "OK" | "Action required";
  createdAt: string;
};

export type SystemSale = {
  databaseId: number;
  listixSaleId: string;
  marketplaceSaleId: string;
  userId: number;
  userName: string;
  userEmail: string;
  ticketDatabaseId: number;
  listingId: string;
  marketplace: string;
  eventName: string;
  eventDate: string;
  venue: string;
  venueCity: string;
  section: string;
  rowLabel: string;
  seatLabel: string;
  quantity: number;
  customerName: string;
  buyerEmail: string | null;
  soldAt: string;
  sentAt: string | null;
  deliveryDeadline: string;
  scheduledPayoutAt: string;
  paidAt: string | null;
  status: string;
  dispatchComplete: boolean;
  grossAmount: number;
  listixFee: number;
  userPayout: number;
  purchaseCost: number;
  profit: number;
  roi: number;
  pointSchedule: PointScheduleEntry[];
  pointsIfSentNow: number | null;
  pointOutcome: PointOutcome | null;
};

export type ListingPublication = {
  id: number;
  marketplace: string;
  status: "live" | "paused" | "pending" | "error";
  externalListingId: string | null;
  errorMessage: string | null;
  listingUrl: string | null;
  lastSyncedAt: string | null;
  platformEnabled: boolean;
};

export type SplitType = "all_together" | "pairs" | "any_no_single" | "any" | "single_or_all";

export type SystemListing = {
  databaseId: number;
  listingId: string;
  userId: number;
  userName: string;
  userEmail: string;
  eventName: string;
  eventDate: string;
  venue: string;
  section: string;
  rowLabel: string;
  seatLabel: string;
  quantity: number;
  splitType: SplitType;
  purchasePrice: number;
  askingPrice: number;
  status: string;
  publications: ListingPublication[];
  createdAt: string;
  updatedAt: string;
};

export type SystemPayment = {
  paymentId: string;
  saleDatabaseId: number;
  listixSaleId: string;
  userId: number;
  userName: string;
  userEmail: string;
  marketplace: string;
  scheduledAt: string;
  paidAt: string | null;
  status: "paid" | "due" | "upcoming" | "error";
  grossAmount: number;
  listixFee: number;
  userPayout: number;
};

export type SystemPaymentsData = {
  stats: { paidOut: number; feesRetained: number; upcoming: number; totalPayments: number; feePercentage: number };
  items: SystemPayment[];
};

export type PlatformAction = {
  id: number;
  actionCode: string;
  actionType: string;
  status: string;
  severity: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  saleDatabaseId: number | null;
  listixSaleId: string | null;
  marketplaceSaleId: string | null;
  listingId: string | null;
  title: string;
  details: Record<string, unknown>;
  source: string;
  discordChannelId: string | null;
  detectedAt: string;
  resolvedAt: string | null;
};

export type AutomationStatus = { imap: boolean; smtp: boolean; discord: boolean };

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
  splitType: SplitType;
  marketplacePrices: MarketplacePrice[];
  marketplaceAvailability: MarketplaceAvailability[];
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
  deliveryDeadline: string;
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
  pointSchedule: PointScheduleEntry[];
  pointsIfSentNow: number | null;
  pointOutcome: PointOutcome | null;
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
  splitType: SplitType;
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
  invitationType?: "account" | "system_admin";
};

export type PointScheduleEntry = { label: string; points: number; cutoffAt: string | null };
export type PointOutcome = { points: number; reason: string };
export type PodEligibility = { status: "not_evaluated"; eligible: boolean; message?: string };
export type PointTransaction = {
  id: number;
  points: number;
  reason: string;
  details: Record<string, unknown>;
  orderCode: string;
  eventName: string;
  deliveryDeadline: string;
  sentAt: string | null;
  occurredAt: string;
};
export type PointSummary = {
  pointBalance: number;
  totalPaidOut: number;
  podEligibility: PodEligibility;
  rules: PointScheduleEntry[];
  transactions: PointTransaction[];
};
export type MarketplaceAvailability = { marketplace: string; status: string; enabled: boolean };
export type MarketplaceControl = {
  marketplace: string;
  enabled: boolean;
  liveListings: number;
  pausedListings: number;
  errorListings: number;
  totalListings: number;
  disabledAt: string | null;
  updatedAt: string;
};
export type MarketplaceControls = { allEnabled: boolean; anyEnabled: boolean; marketplaces: MarketplaceControl[] };
export type VenueMapArea = {
  id: string;
  seatSectionId: number | null;
  label: string;
  points: Array<[number, number]>;
  fill: string;
  hidden: boolean;
};
export type VenueMapBox = { x: number; y: number; width: number; height: number; label: string };
export type VenueMapTemplate = "halo_bowl" | "end_stage" | "compact_dome" | "sports_arena";
export type VenueMapLayout = {
  version: number;
  kind: "concert" | "sports";
  template: VenueMapTemplate;
  canvas: { width: number; height: number };
  floor: VenueMapBox | null;
  stage: VenueMapBox | null;
  areas: VenueMapArea[];
};
export type PublicVenueMap = { id: number | null; name: string; layout: VenueMapLayout };
export type SystemVenueMap = PublicVenueMap & {
  venueId: number;
  venue: string;
  city: string;
  country: string;
  isPublished: boolean;
  isPersisted: boolean;
  updatedAt: string | null;
  seatSections: Array<{ id: number; name: string; rowLabel: string; seatLabel: string }>;
};
export type B2BListing = {
  id: number;
  listingId: string;
  sectionId: number;
  quantity: number;
  askingPrice: number;
  ticketType: string;
  splitType: SplitType;
  splitTypeLabel: string;
  allowedQuantities: number[];
  section: string;
  rowLabel: string;
  seatLabel: string;
};
export type B2BEvent = {
  id: number;
  eventName: string;
  eventDate: string;
  category: string;
  venueId: number;
  venue: string;
  city: string;
  country: string;
  venueMap: PublicVenueMap | null;
  listings: B2BListing[];
};
export type B2BInquiry = {
  id: number;
  requestCode: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  status: string;
  stripePaymentStatus: string;
  listing: B2BListing & { eventId: number; eventName: string; eventDate: string; venue: string; city: string; country: string };
  discord: { status: "sent" | "skipped" | "failed"; channelId?: string; channelUrl?: string; reason?: string };
};
export type SystemUserDetails = SystemUser & {
  account: { id: number; name: string; role: string } | null;
  profile: {
    displayName: string; email: string; role: string;
    address: { line1: string; line2: string; postalCode: string; city: string; country: string };
    payout: { method: string; accountHolder: string; iban: string; bic: string; bankName: string; revolutRevtag: string };
    connections: Array<{ provider: string; providerUserId: string; username: string; displayName: string; email: string | null; connectedAt: string; lastLoginAt: string | null }>;
    createdAt: string; updatedAt: string;
  };
  listings: SystemListing[];
  sales: SystemSale[];
  payments: SystemPayment[];
  payoutSummary: { paid: number; upcoming: number; fees: number };
  purchaseInquiries: Array<{ id: number; requestCode: string; status: string; quantity: number; stripePaymentStatus: string; discordChannelId: string | null; listingId: string; eventName: string; eventDate: string; createdAt: string }>;
};
export type SystemTeamMember = {
  id: number;
  userId: number | null;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  status: "pending" | "active" | "suspended" | "revoked";
  invitedBy: string | null;
  invitationExpiresAt: string | null;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SystemTeamConfiguration = {
  members: SystemTeamMember[];
  roles: Array<{ role: string; permissions: string[] }>;
  permissions: string[];
};
