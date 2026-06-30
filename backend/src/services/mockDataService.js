const tickets = [
  {
    id: "TCK-1001",
    eventName: "Taylor Swift - Berlin",
    venue: "Olympiastadion Berlin",
    eventDate: "2026-07-18T18:00:00.000Z",
    quantity: 2,
    purchasePrice: 189.5,
    askingPrice: 265,
    marketplaceStatus: "Draft",
    section: "Block 112",
  },
  {
    id: "TCK-1002",
    eventName: "Drake - Amsterdam",
    venue: "Ziggo Dome",
    eventDate: "2026-08-02T19:30:00.000Z",
    quantity: 4,
    purchasePrice: 122,
    askingPrice: 175,
    marketplaceStatus: "Listed",
    section: "Floor A",
  },
  {
    id: "TCK-1003",
    eventName: "Coldplay - Munich",
    venue: "Olympiapark",
    eventDate: "2026-09-11T17:45:00.000Z",
    quantity: 2,
    purchasePrice: 149,
    askingPrice: 198,
    marketplaceStatus: "Needs pricing",
    section: "Block L1",
  },
];

const soldOrders = [
  {
    id: "ORD-5001",
    ticketId: "TCK-1002",
    buyerChannel: "StubHub",
    soldAt: "2026-06-26T11:20:00.000Z",
    payoutAmount: 680,
    dispatchStatus: "Awaiting transfer",
    customerName: "Jamie W.",
  },
  {
    id: "ORD-5002",
    ticketId: "TCK-1001",
    buyerChannel: "Viagogo",
    soldAt: "2026-06-27T08:05:00.000Z",
    payoutAmount: 510,
    dispatchStatus: "Ready to send",
    customerName: "Riley K.",
  },
];

export const getDashboardSnapshot = () => {
  const grossSales = soldOrders.reduce((sum, order) => sum + order.payoutAmount, 0);
  const ticketsInInventory = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

  return {
    grossSales,
    pendingDispatch: soldOrders.filter(
      (order) => order.dispatchStatus !== "Completed",
    ).length,
    activeListings: tickets.filter((ticket) => ticket.marketplaceStatus === "Listed")
      .length,
    ticketsInInventory,
    monthlyTrend: [
      { label: "Jan", sales: 4200 },
      { label: "Feb", sales: 5800 },
      { label: "Mar", sales: 5100 },
      { label: "Apr", sales: 7200 },
      { label: "May", sales: 6900 },
      { label: "Jun", sales: 8100 },
    ],
  };
};

export const getTickets = () => tickets;

export const getSoldOrders = () => soldOrders;
