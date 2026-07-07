const tickets = [
  {
    id: "TCK-1001",
    eventName: "Taylor Swift - Berlin",
    venue: "Olympiastadion Berlin",
    eventDate: "2026-07-18T18:00:00.000Z",
    quantity: 2,
    purchasePrice: 189.5,
    totalPurchasePrice: 379,
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
    totalPurchasePrice: 488,
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
    totalPurchasePrice: 298,
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
  const soldTicketsMap = new Map(
    soldOrders.map((order) => [order.ticketId, order]),
  );
  const soldTicketDetails = tickets.filter((ticket) =>
    soldTicketsMap.has(ticket.id),
  );

  const totalPayout = soldOrders.reduce(
    (sum, order) => sum + order.payoutAmount,
    0,
  );
  const totalPurchaseCostOfSoldTickets = soldTicketDetails.reduce(
    (sum, ticket) => sum + ticket.totalPurchasePrice,
    0,
  );

  const profit = totalPayout - totalPurchaseCostOfSoldTickets;

  const payoutReceived = soldOrders
    .filter((order) => order.dispatchStatus === "Completed")
    .reduce((sum, order) => sum + order.payoutAmount, 0);

  const pendingPayout = totalPayout - payoutReceived;

  const salesByPlatform = soldOrders.reduce((acc, order) => {
    acc[order.buyerChannel] = (acc[order.buyerChannel] || 0) + 1;
    return acc;
  }, {});

  const roi =
    totalPurchaseCostOfSoldTickets > 0
      ? (profit / totalPurchaseCostOfSoldTickets) * 100
      : 0;

  // Use real data for monthly trend
  const monthlyTrend = soldOrders.reduce((acc, order) => {
    const month = new Date(order.soldAt).toLocaleString("en-US", {
      month: "short",
    });
    if (!acc[month]) {
      acc[month] = { label: month, sales: 0 };
    }
    acc[month].sales += order.payoutAmount;
    return acc;
  }, {});

  return {
    // New Stats
    listedTickets: tickets.filter(
      (ticket) => ticket.marketplaceStatus === "Listed",
    ).length,
    soldTickets: soldOrders.length,
    profit,
    payoutReceived,
    pendingPayout,
    salesByPlatform: Object.entries(salesByPlatform).map(([name, count]) => ({
      name,
      count,
    })),
    averageRoi: roi,

    // Original stats that might still be useful
    grossSales: totalPayout, // Renamed from grossSales
    ticketsInInventory: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
    pendingDispatch: soldOrders.filter(
      (order) => order.dispatchStatus !== "Completed",
    ).length,
    monthlyTrend: Object.values(monthlyTrend),
  };
};

export const getTickets = () => tickets;

export const getSoldOrders = () => soldOrders;
