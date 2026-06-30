export type User = {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
};

export type DashboardData = {
  grossSales: number;
  pendingDispatch: number;
  activeListings: number;
  ticketsInInventory: number;
  monthlyTrend: Array<{ label: string; sales: number }>;
};

export type TicketItem = {
  databaseId: number;
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
  marketplaceStatusId: number;
  marketplaceStatus: string;
  section: string;
  rowLabel: string;
  seatLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SoldOrder = {
  databaseId: number;
  id: string;
  orderCode: string;
  ticketDatabaseId: number;
  ticketId: string;
  buyerChannelId: number;
  buyerChannel: string;
  dispatchStatusId: number;
  soldAt: string;
  payoutAmount: number;
  dispatchStatus: string;
  dispatchComplete: boolean;
  customerName: string;
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
};

export type CreateTicketInput = {
  eventId: number;
  sectionId: number;
  restrictionId: number;
  quantity: number;
  rowLabel: string;
  lowestSeat: number;
  purchasePrice: number;
  askingPrice: number;
  notes?: string | null;
};
