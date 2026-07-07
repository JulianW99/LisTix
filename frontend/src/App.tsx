import type { ClipboardEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import type {
  CreateTicketInput,
  DashboardData,
  ProfileSettings,
  SoldOrder,
  TicketEventOption,
  TicketInputOptions,
  TicketItem,
  TicketSectionOption,
  User,
} from "./types";

type TabId = "dashboard" | "tickets" | "dispatch" | "payments" | "integrations" | "settings";
type SettingsSectionId =
  | "personal-details"
  | "payout"
  | "payment"
  | "connections"
  | "sheets-sync";
type SoldFilterId = "all" | "delivered" | "pending-delivery" | "cancelled";
type SalesSortId = "event-date" | "sold-date" | "ship-date" | "profit" | "payout";
type SortDirection = "asc" | "desc";
type SendDeliveryType = "mobile" | "pdf" | "links";
type PaymentFilterId = "all" | "paid" | "pending" | "processing" | "error";
type ListingSortId = "date";

type CreateListingFormState = {
  eventId: string;
  eventSearch: string;
  sectionId: string;
  sectionSearch: string;
  rowLabel: string;
  lowestSeat: string;
  restrictionId: string;
  quantity: string;
  purchasePrice: string;
  askingPrice: string;
  ticketType: string;
  platform: string;
  platformAccount: string;
  notes: string;
};

type PaymentPayout = {
  id: string;
  payoutDate: string;
  status: "Paid" | "Pending" | "Processing" | "Error";
  amount: number;
  platformFees: number;
  payoutFees: number;
  finalPayout: number;
  timeProcessed: string;
  platform: string;
  sales: SoldOrder[];
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tickets", label: "Listings" },
  { id: "dispatch", label: "Sales" },
  { id: "payments", label: "Payments" },
  { id: "integrations", label: "Marketplace Sync" },
];

const settingsSections: Array<{ id: SettingsSectionId; label: string }> = [
  { id: "personal-details", label: "Personal Details" },
  { id: "payout", label: "Payout" },
  { id: "payment", label: "Payment" },
  { id: "connections", label: "Connections" },
  { id: "sheets-sync", label: "Sheets Sync" },
];

const soldFilters: Array<{ id: SoldFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "delivered", label: "Delivered" },
  { id: "pending-delivery", label: "Pending Delivery" },
  { id: "cancelled", label: "Cancelled" },
];

const salesSorts: Array<{ id: SalesSortId; label: string }> = [
  { id: "event-date", label: "Event date" },
  { id: "sold-date", label: "Sale date" },
  { id: "ship-date", label: "Time to ship" },
  { id: "profit", label: "Profit" },
  { id: "payout", label: "Payout" },
];

const paymentFilters: Array<{ id: PaymentFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "error", label: "Error" },
];

const marketplaceNames = ["StubHub IE", "Vivid Seats", "Ticombo", "Ticket Evolution", "SeatGeek"];
const platformAccounts = ["Main EU", "DE Ticketmaster 01", "AXS Wallet 02", "Manual"];
const ticketTypes = ["Mobile Transfer", "PDF", "Ticket Links"];
const cardExpiryMonths = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const cardExpiryYears = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + index));

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dayInMs = 1000 * 60 * 60 * 24;
const trendChartWidth = 720;
const trendChartHeight = 220;
const trendChartPadding = 34;
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const defaultCreateListingForm: CreateListingFormState = {
  eventId: "",
  eventSearch: "",
  sectionId: "",
  sectionSearch: "",
  rowLabel: "",
  lowestSeat: "",
  restrictionId: "",
  quantity: "1",
  purchasePrice: "",
  askingPrice: "",
  ticketType: "Mobile Transfer",
  platform: "StubHub",
  platformAccount: "Main EU",
  notes: "",
};

const defaultProfileSettings: ProfileSettings = {
  discordHandle: "",
  discordUserId: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "",
  payoutMethod: "Bank transfer",
  payoutAccountHolder: "",
  payoutIban: "",
  payoutBic: "",
  payoutBankName: "",
  revolutRevtag: "",
  paymentCardBrand: "Visa",
  paymentCardNumber: "",
  paymentCardCvv: "",
  paymentCardExpiryMonth: "01",
  paymentCardExpiryYear: String(new Date().getFullYear()),
  paymentCardLast4: "",
  paymentCardExpiry: "",
  pushoverUserKey: "",
  sheetsGoogleAccount: "",
  sheetsDocumentUrl: "",
  sheetsConfirmationMode: "discord-confirmation",
  tikeyConnected: false,
  ticketmasterAccountsCsv: "",
  axsAccountsCsv: "",
};

type SettingsFormState = ProfileSettings & {
  displayName: string;
};

const defaultSettingsForm: SettingsFormState = {
  displayName: "",
  ...defaultProfileSettings,
};

type TrendPoint = DashboardData["monthlyTrend"][number] & {
  x: number;
  y: number;
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const eventOptionLabel = (eventOption: TicketEventOption) =>
  `${eventOption.eventName} - ${eventOption.venueName} - ${dateFormatter.format(
    new Date(eventOption.eventDate),
  )}`;

const getSoldDisplayStatus = (order: SoldOrder) => {
  if (order.dispatchStatus === "Completed") {
    return "Delivered";
  }

  if (order.dispatchStatus === "Awaiting transfer" || order.dispatchStatus === "Ready to send") {
    return "Pending Delivery";
  }

  if (order.dispatchStatus === "Cancelled") {
    return "Cancelled";
  }

  return order.dispatchStatus;
};

const getStatusTone = (status: string) => {
  if (
    status === "Delivered" ||
    status === "Listed" ||
    status === "Live" ||
    status === "Paid" ||
    status === "Operational" ||
    status === "Synced"
  ) {
    return "status-green";
  }

  if (
    status === "Pending Delivery" ||
    status === "Needs pricing" ||
    status === "Processing" ||
    status === "Degraded"
  ) {
    return "status-yellow";
  }

  if (status === "Cancelled" || status === "Error" || status === "Down") {
    return "status-red";
  }

  if (status === "Draft" || status === "Pending" || status === "Not Synced") {
    return "status-gray";
  }

  return "status-neutral";
};

const getValueTone = (value: number) => {
  if (value > 0) {
    return "value-positive";
  }

  if (value < 0) {
    return "value-negative";
  }

  return "value-neutral";
};

const getPayoutDaysRemaining = (payoutAt: string) => {
  const payoutDate = new Date(payoutAt);

  if (Number.isNaN(payoutDate.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  payoutDate.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((payoutDate.getTime() - today.getTime()) / dayInMs);

  return daysRemaining > 0 ? daysRemaining : null;
};

const buildTrendChart = (trend: DashboardData["monthlyTrend"]) => {
  const trendByMonth = new Map(
    trend.map((point) => [point.label.slice(0, 3).toLowerCase(), point]),
  );
  const calendarTrend = monthLabels.map((label) => {
    const matchingPoint = trendByMonth.get(label.toLowerCase());

    return {
      label,
      sales: matchingPoint?.sales ?? 0,
      profit: matchingPoint?.profit ?? 0,
      averageRoi: matchingPoint?.averageRoi ?? 0,
    };
  });
  const maxSales = Math.max(1, ...calendarTrend.map((point) => point.sales));

  const points = calendarTrend.map((point, index) => {
    const usableHeight = trendChartHeight - trendChartPadding * 2;
    const x =
      calendarTrend.length === 1
        ? trendChartWidth / 2
        : ((index + 0.5) * trendChartWidth) / calendarTrend.length;
    const y = trendChartHeight - trendChartPadding - (point.sales / maxSales) * usableHeight;

    return {
      ...point,
      x,
      y,
    } satisfies TrendPoint;
  });

  const linePoints = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const lastPoint = points[points.length - 1];
  const areaPath =
    points.length > 0
      ? [
          `M ${points[0].x} ${trendChartHeight - trendChartPadding}`,
          ...points.map(({ x, y }) => `L ${x} ${y}`),
          `L ${lastPoint.x} ${trendChartHeight - trendChartPadding}`,
          "Z",
        ].join(" ")
      : "";

  return {
    points,
    linePoints,
    areaPath,
    maxSales,
    viewBox: `0 0 ${trendChartWidth} ${trendChartHeight}`,
  };
};

const buildRowSuggestions = (query: string) => {
  const normalizedQuery = normalizeSearch(query);
  const numericRows = Array.from({ length: 100 }, (_, index) => String(index + 1));
  const alphaRows = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
  const doubleRows = alphaRows.map((letter) => `${letter}${letter}`);

  if (!normalizedQuery) {
    return [];
  }

  return [...numericRows, ...alphaRows, ...doubleRows]
    .filter((row) => normalizeSearch(row).startsWith(normalizedQuery))
    .slice(0, 8);
};

const getListingId = (ticket: TicketItem) => ticket.ticketCode || ticket.id || `LST-${ticket.databaseId}`;

const getTicketType = (ticket: TicketItem) => ticket.notes?.match(/Ticket Type: ([^|]+)/)?.[1]?.trim() ?? "Mobile Transfer";
const getTicketPlatform = (ticket: TicketItem) => ticket.notes?.match(/Platform: ([^|]+)/)?.[1]?.trim() ?? "StubHub";
const getTicketAccount = (ticket: TicketItem) => ticket.notes?.match(/Account: ([^|]+)/)?.[1]?.trim() ?? "Main EU";

const getPlatformStatuses = (ticket: TicketItem) => {
  const primaryPlatform = getTicketPlatform(ticket);

  return marketplaceNames.map((platform, index) => {
    let status = "Not Synced";

    if (platform === primaryPlatform && ticket.marketplaceStatus !== "Draft") {
      status = "Synced";
    }

    if (platform !== primaryPlatform && ticket.marketplaceStatus !== "Draft" && (ticket.databaseId + index) % 9 === 0) {
      status = "Error";
    }

    return { platform, status };
  });
};

const getLowestPriceInfo = (ticket: TicketItem) => {
  const marketplaceRows = marketplaceNames.map((marketplace, index) => {
    const isLowest = (ticket.databaseId + index) % 4 !== 0;
    const lowestPrice = isLowest
      ? ticket.askingPrice
      : Math.max(1, ticket.askingPrice - 10 - index * 4);

    return {
      marketplace,
      isLowest,
      ownPrice: ticket.askingPrice,
      lowestPrice,
    };
  });
  const sectionLowestCount = marketplaceRows.filter((row) => row.isLowest).length;
  const platformLowestCount = marketplaceRows.filter((row) => row.isLowest || row.marketplace === getTicketPlatform(ticket)).length;
  const priceOffset = ticket.databaseId % 3 === 0 ? 0 : 12 + (ticket.databaseId % 4) * 8;
  const sectionLowest = Math.min(...marketplaceRows.map((row) => row.lowestPrice));
  const platformLowest = Math.max(1, ticket.askingPrice - Math.max(0, priceOffset - 6));

  return {
    sectionLowest,
    platformLowest,
    isSectionLowest: ticket.askingPrice <= sectionLowest,
    isPlatformLowest: ticket.askingPrice <= platformLowest,
    marketplaceRows,
    sectionLowestCount,
    platformLowestCount,
  };
};

const getRestrictionLabel = (ticket: TicketItem) => {
  if (ticket.restriction) {
    return ticket.restriction;
  }

  const fallbackRestrictions = [
    "No restrictions",
    "U16s accompanied by an adult",
    "Only 18+",
    "Mobile ID required",
  ];

  if (ticket.restrictionId === null) {
    return fallbackRestrictions[ticket.databaseId % fallbackRestrictions.length];
  }

  return `Restriction #${ticket.restrictionId}`;
};

const getBuyerName = (order: SoldOrder) => {
  if (order.customerName && order.customerName.trim().includes(" ")) {
    return order.customerName;
  }

  const firstNames = ["Jamie", "Riley", "Morgan", "Alex", "Casey", "Taylor", "Jordan", "Sam"];
  const lastNames = ["Wilson", "Keller", "Parker", "Turner", "Bennett", "Nolan", "Lopez", "Reed"];
  const index = order.databaseId % firstNames.length;

  return `${firstNames[index]} ${lastNames[index]}`;
};

const getBuyerEmail = (order: SoldOrder) => {
  if (order.buyerEmail) {
    return order.buyerEmail;
  }

  return `${getBuyerName(order).toLowerCase().replace(/\s+/g, ".")}@buyer.example`;
};

const buildPayments = (orders: SoldOrder[]): PaymentPayout[] => {
  const grouped = orders.reduce<Record<string, SoldOrder[]>>((acc, order) => {
    const dateKey = new Date(order.payoutAt).toISOString().slice(0, 10);
    const key = `${dateKey}-${order.buyerChannel}`;
    acc[key] = [...(acc[key] ?? []), order];
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, sales], index) => {
    const amount = sales.reduce((sum, order) => sum + order.payoutAmount, 0);
    const platformFees = Math.round(amount * 0.08);
    const payoutFees = Math.max(2, Math.round(amount * 0.01));
    const finalPayout = amount - platformFees - payoutFees;
    const payoutDate = sales[0].payoutAt;
    const daysRemaining = getPayoutDaysRemaining(payoutDate);

    return {
      id: `PO-${new Date(payoutDate).getFullYear()}-${String(index + 1).padStart(4, "0")}`,
      payoutDate,
      status: daysRemaining ? "Pending" : index % 5 === 2 ? "Error" : index % 3 === 1 ? "Processing" : "Paid",
      amount,
      platformFees,
      payoutFees,
      finalPayout,
      timeProcessed: daysRemaining ? "-" : dateFormatter.format(new Date(payoutDate)),
      platform: sales[0].buyerChannel,
      sales,
    };
  });
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketInputOptions | null>(null);
  const [soldOrders, setSoldOrders] = useState<SoldOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [email, setEmail] = useState("admin@ticketadmin.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showCreateListingForm, setShowCreateListingForm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSectionId>("personal-details");
  const [createListingForm, setCreateListingForm] =
    useState<CreateListingFormState>(defaultCreateListingForm);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(defaultSettingsForm);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [soldFilter, setSoldFilter] = useState<SoldFilterId>("all");
  const [salesSort, setSalesSort] = useState<SalesSortId>("ship-date");
  const [salesSortDirection, setSalesSortDirection] = useState<SortDirection>("asc");
  const [listingSort, setListingSort] = useState<ListingSortId>("date");
  const [listingSortDirection, setListingSortDirection] = useState<SortDirection>("asc");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterId>("all");
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<TrendPoint | null>(null);
  const [selectedSoldOrder, setSelectedSoldOrder] = useState<SoldOrder | null>(null);
  const [sendSoldOrder, setSendSoldOrder] = useState<SoldOrder | null>(null);
  const [sendDeliveryType, setSendDeliveryType] = useState<SendDeliveryType>("mobile");
  const [ticketLinks, setTicketLinks] = useState([""]);
  const [pdfFileName, setPdfFileName] = useState("");
  const [screenshotFileName, setScreenshotFileName] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [supportDraftOrder, setSupportDraftOrder] = useState<SoldOrder | null>(null);
  const [supportDraftMessage, setSupportDraftMessage] = useState("");
  const [selectedListing, setSelectedListing] = useState<TicketItem | null>(null);
  const [editListingDraft, setEditListingDraft] = useState<CreateListingFormState | null>(null);
  const [askDrafts, setAskDrafts] = useState<Record<string, string>>({});
  const [listingMenuId, setListingMenuId] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<PaymentPayout | null>(null);
  const [eventSearchFocused, setEventSearchFocused] = useState(false);
  const [sectionSearchFocused, setSectionSearchFocused] = useState(false);
  const [rowSearchFocused, setRowSearchFocused] = useState(false);
  const [createTicketError, setCreateTicketError] = useState("");
  const [error, setError] = useState("");
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const dispatchStatuses = ticketOptions?.dispatchStatuses ?? [];
  const selectedCompletedStatusId =
    dispatchStatuses.find((status) => status.name === "Completed")?.id ?? null;

  const selectedPendingStatusIds = useMemo(
    () =>
      new Set(
        dispatchStatuses
          .filter((status) => status.name === "Awaiting transfer" || status.name === "Ready to send")
          .map((status) => status.id),
      ),
    [dispatchStatuses],
  );

  const visibleListings = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.marketplaceStatus !== "Sold")
        .sort((a, b) => {
          const result = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
          return listingSortDirection === "asc" ? result : -result;
        }),
    [listingSort, listingSortDirection, tickets],
  );

  const visibleSoldOrders = useMemo(() => {
    const mapped = soldOrders.filter((order) => {
      const statusName = getSoldDisplayStatus(order);

      if (soldFilter === "all") {
        return true;
      }

      if (soldFilter === "delivered") {
        return statusName === "Delivered";
      }

      if (soldFilter === "pending-delivery") {
        return statusName === "Pending Delivery";
      }

      return statusName === "Cancelled";
    });

    return [...mapped].sort((a, b) => {
      const getSortValue = (order: SoldOrder) => {
        if (salesSort === "event-date") {
          return new Date(order.eventDate).getTime();
        }

        if (salesSort === "sold-date") {
          return new Date(order.soldAt).getTime();
        }

        if (salesSort === "ship-date") {
          return new Date(order.payoutAt).getTime();
        }

        if (salesSort === "profit") {
          return order.profit;
        }

        return order.payoutAmount;
      };

      const result = getSortValue(a) - getSortValue(b);
      return salesSortDirection === "asc" ? result : -result;
    });
  }, [salesSort, salesSortDirection, soldFilter, soldOrders]);

  const pendingOrders = useMemo(
    () => soldOrders.filter((order) => selectedPendingStatusIds.has(order.dispatchStatusId)),
    [selectedPendingStatusIds, soldOrders],
  );

  const payments = useMemo(() => buildPayments(soldOrders), [soldOrders]);
  const visiblePayments = useMemo(
    () =>
      payments.filter((payout) =>
        paymentFilter === "all" ? true : payout.status.toLowerCase() === paymentFilter,
      ),
    [paymentFilter, payments],
  );

  const chartData = useMemo(() => buildTrendChart(dashboard?.monthlyTrend ?? []), [dashboard]);

  const selectedEvent = useMemo(
    () =>
      ticketOptions?.events.find(
        (eventOption) => String(eventOption.id) === createListingForm.eventId,
      ) ?? null,
    [createListingForm.eventId, ticketOptions],
  );

  const eventSuggestions = useMemo(() => {
    if (!ticketOptions) {
      return [];
    }

    const query = normalizeSearch(createListingForm.eventSearch);

    if (!query) {
      return ticketOptions.events.slice(0, 6);
    }

    return ticketOptions.events
      .filter((eventOption) =>
        normalizeSearch(
          `${eventOption.eventName} ${eventOption.venueName} ${eventOption.venueCity}`,
        ).includes(query),
      )
      .slice(0, 6);
  }, [createListingForm.eventSearch, ticketOptions]);

  const availableSections = useMemo(() => {
    if (!ticketOptions || !selectedEvent) {
      return [];
    }

    return ticketOptions.sections.filter((section) => section.venueId === selectedEvent.venueId);
  }, [selectedEvent, ticketOptions]);

  const sectionSuggestions = useMemo(() => {
    const query = normalizeSearch(createListingForm.sectionSearch);

    if (!query) {
      return availableSections.slice(0, 6);
    }

    return availableSections
      .filter((section) => normalizeSearch(section.name).includes(query))
      .slice(0, 6);
  }, [availableSections, createListingForm.sectionSearch]);

  const rowSuggestions = useMemo(
    () => buildRowSuggestions(createListingForm.rowLabel),
    [createListingForm.rowLabel],
  );

  const calculatedSeatRange = useMemo(() => {
    const lowestSeat = Number(createListingForm.lowestSeat);
    const quantity = Number(createListingForm.quantity);

    if (
      !Number.isInteger(lowestSeat) ||
      !Number.isInteger(quantity) ||
      lowestSeat < 1 ||
      quantity < 1
    ) {
      return "";
    }

    const highestSeat = lowestSeat + quantity - 1;
    return lowestSeat === highestSeat ? String(lowestSeat) : `${lowestSeat}-${highestSeat}`;
  }, [createListingForm.lowestSeat, createListingForm.quantity]);

  const loadAdminData = async () => {
    const [dashboardData, ticketData, soldOrderData, ticketOptionData] = await Promise.all([
      api.dashboard(),
      api.tickets(),
      api.soldOrders(),
      api.ticketInputOptions(),
    ]);

    setDashboard(dashboardData);
    setTickets(ticketData.items);
    setSoldOrders(soldOrderData.items);
    setTicketOptions(ticketOptionData);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const session = await api.me();
        setUser(session.user);
        await loadAdminData();
      } catch (initError) {
        console.error("Failed to initialize app session:", initError);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!user) {
      setSettingsForm(defaultSettingsForm);
      return;
    }

    setSettingsForm({
      displayName: user.displayName,
      ...defaultProfileSettings,
      ...user.profileSettings,
    });
  }, [user]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (activeTab !== "settings") {
      return;
    }

    const target = document.getElementById(activeSettingsSection);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSettingsSection, activeTab]);

  useEffect(() => {
    if (!ticketOptions || createListingForm.restrictionId) {
      return;
    }

    const defaultRestriction =
      ticketOptions.restrictions.find((restriction) => restriction.name === "No restrictions") ??
      ticketOptions.restrictions[0];

    setCreateListingForm((current) => ({
      ...current,
      restrictionId: defaultRestriction ? String(defaultRestriction.id) : "",
    }));
  }, [createListingForm.restrictionId, ticketOptions]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await api.login(email, password);
      setUser(response.user);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setDashboard(null);
    setTickets([]);
    setTicketOptions(null);
    setSoldOrders([]);
    setShowProfileMenu(false);
    setActiveTab("dashboard");
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage("");

    try {
      const { displayName, ...profileSettings } = settingsForm;
      const response = await api.updateMe({
        displayName: displayName.trim(),
        profileSettings,
      });

      setUser(response.user);
      setSettingsMessage("Settings saved.");
    } catch (requestError) {
      setSettingsMessage(
        requestError instanceof Error ? requestError.message : "Unable to save settings.",
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSettingsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveSettings();
  };

  const updateCreateListingForm = (field: keyof CreateListingFormState, value: string) => {
    setCreateListingForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "eventSearch") {
        next.eventId = "";
        next.sectionId = "";
        next.sectionSearch = "";
      }

      if (field === "sectionSearch") {
        next.sectionId = "";
      }

      return next;
    });
  };

  const updateSettingsForm = (field: keyof SettingsFormState, value: string | boolean) => {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectEventOption = (eventOption: TicketEventOption) => {
    setCreateListingForm((current) => ({
      ...current,
      eventId: String(eventOption.id),
      eventSearch: eventOptionLabel(eventOption),
      sectionId: "",
      sectionSearch: "",
    }));
    setEventSearchFocused(false);
    setCreateTicketError("");
  };

  const selectSectionOption = (section: TicketSectionOption) => {
    setCreateListingForm((current) => ({
      ...current,
      sectionId: String(section.id),
      sectionSearch: section.name,
    }));
    setSectionSearchFocused(false);
    setCreateTicketError("");
  };

  const handleCreateListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateTicketError("");

    const payload: CreateTicketInput = {
      eventId: Number(createListingForm.eventId),
      sectionId: Number(createListingForm.sectionId),
      restrictionId: Number(createListingForm.restrictionId),
      quantity: Number(createListingForm.quantity),
      rowLabel: createListingForm.rowLabel.trim(),
      lowestSeat: Number(createListingForm.lowestSeat),
      purchasePrice: Number(createListingForm.purchasePrice),
      askingPrice: Number(createListingForm.askingPrice),
      notes:
        [
          `Ticket Type: ${createListingForm.ticketType}`,
          `Platform: ${createListingForm.platform}`,
          `Account: ${createListingForm.platformAccount}`,
          createListingForm.notes.trim(),
        ]
          .filter(Boolean)
          .join(" | ") || null,
    };

    if (
      !payload.eventId ||
      !payload.sectionId ||
      !payload.restrictionId ||
      !payload.rowLabel ||
      !Number.isInteger(payload.lowestSeat) ||
      payload.lowestSeat < 1 ||
      payload.quantity < 1 ||
      !createListingForm.purchasePrice ||
      !createListingForm.askingPrice ||
      !Number.isFinite(payload.purchasePrice) ||
      !Number.isFinite(payload.askingPrice)
    ) {
      setCreateTicketError("Please complete the listing details.");
      return;
    }

    setCreatingTicket(true);

    try {
      await api.createTicket(payload);
      await loadAdminData();
      setCreateListingForm({
        ...defaultCreateListingForm,
        restrictionId: createListingForm.restrictionId,
      });
      setShowCreateListingForm(false);
    } catch (requestError) {
      setCreateTicketError(
        requestError instanceof Error ? requestError.message : "Unable to create listing.",
      );
    } finally {
      setCreatingTicket(false);
    }
  };

  const setListingAskDraft = (ticketId: string, value: string) => {
    setAskDrafts((current) => ({
      ...current,
      [ticketId]: value,
    }));
  };

  const updateListingAsk = (ticketId: string, value: string) => {
    const askingPrice = Number(value);

    if (!Number.isFinite(askingPrice)) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, askingPrice } : ticket)),
    );
  };

  const updateListingStatus = (ticket: TicketItem, status: string) => {
    setTickets((current) =>
      current.map((item) =>
        item.id === ticket.id
          ? {
              ...item,
              marketplaceStatus: status,
            }
          : item,
      ),
    );
    setListingMenuId(null);
  };

  const confirmListingAsk = (ticketId: string) => {
    const draftValue = askDrafts[ticketId];

    if (draftValue === undefined) {
      return;
    }

    updateListingAsk(ticketId, draftValue);
    setAskDrafts((current) => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });
  };

  const resetListingAsk = (ticketId: string) => {
    setAskDrafts((current) => {
      const next = { ...current };
      delete next[ticketId];
      return next;
    });
  };

  const beginEditListing = (ticket: TicketItem) => {
    setSelectedListing(ticket);
    setEditListingDraft({
      eventId: String(ticket.eventId),
      eventSearch: ticket.eventName,
      sectionId: String(ticket.sectionId),
      sectionSearch: ticket.section,
      rowLabel: ticket.rowLabel,
      lowestSeat: ticket.lowestSeat === null ? "" : String(ticket.lowestSeat),
      restrictionId: ticket.restrictionId === null ? "" : String(ticket.restrictionId),
      quantity: String(ticket.quantity),
      purchasePrice: String(ticket.purchasePrice),
      askingPrice: String(ticket.askingPrice),
      ticketType: getTicketType(ticket),
      platform: getTicketPlatform(ticket),
      platformAccount: getTicketAccount(ticket),
      notes: ticket.notes ?? "",
    });
    setListingMenuId(null);
  };

  const updateEditListingDraft = (field: keyof CreateListingFormState, value: string) => {
    setEditListingDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveEditListing = () => {
    if (!selectedListing || !editListingDraft) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedListing.id
          ? {
              ...ticket,
              sectionId: Number(editListingDraft.sectionId) || ticket.sectionId,
              section: editListingDraft.sectionSearch || ticket.section,
              rowLabel: editListingDraft.rowLabel,
              lowestSeat: editListingDraft.lowestSeat ? Number(editListingDraft.lowestSeat) : ticket.lowestSeat,
              quantity: Number(editListingDraft.quantity) || ticket.quantity,
              purchasePrice: Number(editListingDraft.purchasePrice) || ticket.purchasePrice,
              askingPrice: Number(editListingDraft.askingPrice) || ticket.askingPrice,
              restrictionId: editListingDraft.restrictionId ? Number(editListingDraft.restrictionId) : ticket.restrictionId,
              restriction:
                ticketOptions?.restrictions.find(
                  (restriction) => String(restriction.id) === editListingDraft.restrictionId,
                )?.name ?? ticket.restriction,
              notes: [
                `Ticket Type: ${editListingDraft.ticketType}`,
                `Platform: ${editListingDraft.platform}`,
                `Account: ${editListingDraft.platformAccount}`,
                editListingDraft.notes.replace(/Ticket Type: [^|]+\|?|Platform: [^|]+\|?|Account: [^|]+\|?/g, "").trim(),
              ]
                .filter(Boolean)
                .join(" | "),
            }
          : ticket,
      ),
    );
    setSelectedListing(null);
    setEditListingDraft(null);
  };

  const handleSalesSort = (sortId: SalesSortId) => {
    if (salesSort === sortId) {
      setSalesSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSalesSort(sortId);
    setSalesSortDirection(sortId === "sold-date" || sortId === "profit" || sortId === "payout" ? "desc" : "asc");
  };

  const getSortIndicator = (sortId: SalesSortId) => {
    if (salesSort !== sortId) {
      return "";
    }

    return salesSortDirection === "asc" ? " ↑" : " ↓";
  };

  const handleListingSort = (sortId: ListingSortId) => {
    if (listingSort === sortId) {
      setListingSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setListingSort(sortId);
    setListingSortDirection("asc");
  };

  const getListingSortIndicator = (sortId: ListingSortId) => {
    if (listingSort !== sortId) {
      return "";
    }

    return listingSortDirection === "asc" ? " ↑" : " ↓";
  };

  const deleteListing = (ticket: TicketItem) => {
    setTickets((current) => current.filter((item) => item.id !== ticket.id));
    setListingMenuId(null);
  };

  const openSendDialog = (order: SoldOrder) => {
    setSendSoldOrder(order);
    setSelectedSoldOrder(null);
    setSendDeliveryType("mobile");
    setTicketLinks([""]);
    setPdfFileName("");
    setScreenshotFileName("");
    setCopyMessage("");
  };

  const closeSendDialog = () => {
    setSendSoldOrder(null);
    setTicketLinks([""]);
    setPdfFileName("");
    setScreenshotFileName("");
    setCopyMessage("");
  };

  const copyBuyerValue = async (label: string, value?: string | null) => {
    if (!value) {
      setCopyMessage(`${label} not saved.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch (clipboardError) {
      console.error("Unable to copy buyer detail:", clipboardError);
      setCopyMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const handleScreenshotPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/"),
    );

    if (!imageFile) {
      return;
    }

    setScreenshotFileName(imageFile.name || "Clipboard screenshot");
  };

  const updateTicketLink = (index: number, value: string) => {
    setTicketLinks((current) =>
      current.map((linkValue, linkIndex) => (linkIndex === index ? value : linkValue)),
    );
  };

  const handleSendSoldOrder = async (order: SoldOrder) => {
    if (!selectedCompletedStatusId) {
      return;
    }

    await api.updateSoldOrder(order.id, { dispatchStatusId: selectedCompletedStatusId });
    await loadAdminData();
    closeSendDialog();
  };

  if (loading) {
    return <div className="screen-shell centered">Loading admin interface...</div>;
  }

  if (!user) {
    return (
      <div className="screen-shell auth-shell">
        <div className="auth-panel">
          <p className="eyebrow">Ticket Trading Operations</p>
          <h1>Admin control room for concert inventory.</h1>
          <p className="lede">
            Manage listings, sales, payments, and marketplace automation from one place.
          </p>
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@ticketadmin.local"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="ChangeMe123!"
              />
            </label>
            {error ? <p className="error-banner">{error}</p> : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-shell app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Ticket Admin MVP</p>
          <h2>Operations</h2>
          <p className="sidebar-copy">
            Manage listings, monitor sales, reconcile payouts, and sync marketplaces.
          </p>
        </div>
        {activeTab === "settings" ? (
          <nav className="tab-list settings-nav">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                className={section.id === activeSettingsSection ? "tab-button active" : "tab-button"}
                onClick={() => setActiveSettingsSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
            <button
              className="secondary-button overview-button"
              type="button"
              onClick={() => setActiveTab("dashboard")}
            >
              Back to dashboard
            </button>
          </nav>
        ) : (
          <nav className="tab-list">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={tab.id === activeTab ? "tab-button active" : "tab-button"}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}
        <div className="sidebar-footer">
          <span>Signed in as</span>
          <p>{user.email}</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Ticket Admin MVP</p>
            <h1>
              {activeTab === "dashboard"
                ? "LisTix"
                : activeTab === "tickets"
                  ? "Listings"
                  : activeTab === "dispatch"
                    ? "Sales"
                    : activeTab === "payments"
                      ? "Payments"
                      : activeTab === "settings"
                        ? "Profile settings"
                        : "Marketplace sync"}
            </h1>
          </div>
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              className="profile-trigger"
              type="button"
              onClick={() => setShowProfileMenu((current) => !current)}
            >
              <span className="profile-avatar">{user.displayName.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{user.displayName}</strong>
                <small>{user.role}</small>
              </span>
            </button>
            {showProfileMenu ? (
              <div className="profile-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setActiveSettingsSection("personal-details");
                    setShowProfileMenu(false);
                  }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    void handleLogout();
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {activeTab === "dashboard" ? (
          <>
            <header className="hero-card">
              <div>
                <p className="lede">
                  Current listing, sales, payout, and marketplace performance at a glance.
                </p>
              </div>
              <div className="hero-stats">
                <div>
                  <span>Total Inventory</span>
                  <strong>{dashboard?.ticketsInInventory ?? 0}</strong>
                </div>
                <div>
                  <span>Live Listings</span>
                  <strong>{dashboard?.listedTickets ?? 0}</strong>
                </div>
                <div>
                  <span>Sold Tickets</span>
                  <strong>{dashboard?.soldTickets ?? 0}</strong>
                </div>
                <div>
                  <span>Average ROI</span>
                  <strong>{dashboard?.averageRoi.toFixed(1) ?? 0}%</strong>
                </div>
                <div>
                  <span>Pending Payouts</span>
                  <strong>{currency.format(dashboard?.pendingPayout ?? 0)}</strong>
                </div>
                <div>
                  <span>Profit</span>
                  <strong>{currency.format(dashboard?.profit ?? 0)}</strong>
                </div>
              </div>
            </header>
            <div className="panel-grid">
              <div className="panel wide">
                <div className="panel-header">
                  <h3>Monthly sales trend</h3>
                  <span>Payout amount per month</span>
                </div>
                <div className="trend-chart-shell">
                  <svg
                    className="trend-chart-svg"
                    viewBox={chartData.viewBox}
                    role="img"
                    aria-label="Monthly sales trend line chart"
                  >
                    <defs>
                      <linearGradient id="trend-line-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(240, 165, 51, 0.42)" />
                        <stop offset="100%" stopColor="rgba(240, 165, 51, 0.04)" />
                      </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75].map((ratio) => (
                      <line
                        key={ratio}
                        x1={trendChartPadding}
                        x2={trendChartWidth - trendChartPadding}
                        y1={trendChartPadding + (trendChartHeight - trendChartPadding * 2) * ratio}
                        y2={trendChartPadding + (trendChartHeight - trendChartPadding * 2) * ratio}
                        className="trend-grid-line"
                      />
                    ))}
                    {chartData.points.length > 0 ? (
                      <path d={chartData.areaPath} className="trend-area" />
                    ) : null}
                    {chartData.points.length > 0 ? (
                      <polyline points={chartData.linePoints} className="trend-line" />
                    ) : null}
                    {chartData.points.map((point) => (
                      <g key={point.label}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={26}
                          className="trend-point-hitbox"
                          onMouseEnter={() => setHoveredTrendPoint(point)}
                          onMouseLeave={() => setHoveredTrendPoint(null)}
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={5}
                          className="trend-point"
                        />
                        {hoveredTrendPoint?.label === point.label ? (
                          <foreignObject
                            x={Math.max(8, Math.min(point.x - 72, trendChartWidth - 154))}
                            y={Math.max(8, point.y - 76)}
                            width="146"
                            height="66"
                            pointerEvents="none"
                          >
                            <div className="trend-svg-tooltip">
                              <strong>{point.label}</strong>
                              <span>{currency.format(point.sales)}</span>
                              <span>ROI {point.averageRoi.toFixed(1)}%</span>
                            </div>
                          </foreignObject>
                        ) : null}
                      </g>
                    ))}
                  </svg>
                  <div className="trend-axis">
                    {chartData.points.map((point) => (
                      <button
                        key={point.label}
                        className="trend-axis-item"
                        type="button"
                        onMouseEnter={() => setHoveredTrendPoint(point)}
                        onMouseLeave={() => setHoveredTrendPoint(null)}
                      >
                        <strong>{point.label}</strong>
                        <span>{currency.format(point.sales)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Sales by Platform</h3>
                  <span>Number of sales per marketplace</span>
                </div>
                <div className="list-stack">
                  {dashboard?.salesByPlatform.map((platform) => (
                    <div key={platform.name} className="list-row">
                      <strong>{platform.name}</strong>
                      <strong>{platform.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <h3>Open Sales</h3>
                  <span>Sorted by time left to ship. Total: {pendingOrders.length}</span>
                </div>
                <div className="list-stack">
                  {[...pendingOrders]
                    .sort((a, b) => new Date(a.payoutAt).getTime() - new Date(b.payoutAt).getTime())
                    .map((order) => (
                    <div key={order.id} className="list-row">
                      <div>
                        <strong>{order.eventName}</strong>
                        <span>{dateFormatter.format(new Date(order.eventDate))}</span>
                      </div>
                      <div>
                        <strong>{order.section}</strong>
                        <span className={`status-pill ${getStatusTone(getSoldDisplayStatus(order))}`}>
                          {getSoldDisplayStatus(order)}
                        </span>
                        <span>{order.quantity} tickets</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === "tickets" ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Listings</h3>
                <span>Manage live listings, draft inventory, ticket type, and marketplace status.</span>
              </div>
              <button
                className="primary-button compact"
                type="button"
                onClick={() => {
                  if (selectedListing) {
                    setSelectedListing(null);
                    setEditListingDraft(null);
                    return;
                  }
                  setCreateTicketError("");
                  setShowCreateListingForm((current) => !current);
                }}
              >
                {selectedListing ? "Back" : showCreateListingForm ? "Close" : "+ Create listing"}
              </button>
            </div>
            {selectedListing && editListingDraft ? (
              <section className="edit-page">
                <div className="panel-header">
                  <div>
                    <h3>Edit Listing</h3>
                    <span>{getListingId(selectedListing)} - Event cannot be changed here.</span>
                  </div>
                </div>
                <form className="ticket-form" onSubmit={(event) => {
                  event.preventDefault();
                  saveEditListing();
                }}>
                  <label className="form-wide">
                    <span>Event</span>
                    <input type="text" value={selectedListing.eventName} disabled />
                  </label>
                  <label>
                    <span>Section</span>
                    <input
                      type="text"
                      value={editListingDraft.sectionSearch}
                      onChange={(event) => updateEditListingDraft("sectionSearch", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Row</span>
                    <input
                      type="text"
                      value={editListingDraft.rowLabel}
                      onChange={(event) => updateEditListingDraft("rowLabel", event.target.value.toUpperCase())}
                    />
                  </label>
                  <label>
                    <span>Lowest seat</span>
                    <input
                      type="number"
                      min="1"
                      value={editListingDraft.lowestSeat}
                      onChange={(event) => updateEditListingDraft("lowestSeat", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={editListingDraft.quantity}
                      onChange={(event) => updateEditListingDraft("quantity", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Face Value</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editListingDraft.purchasePrice}
                      onChange={(event) => updateEditListingDraft("purchasePrice", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Ask</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editListingDraft.askingPrice}
                      onChange={(event) => updateEditListingDraft("askingPrice", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Restrictions</span>
                    <select
                      value={editListingDraft.restrictionId}
                      onChange={(event) => updateEditListingDraft("restrictionId", event.target.value)}
                    >
                      {ticketOptions?.restrictions.map((restriction) => (
                        <option key={restriction.id} value={restriction.id}>
                          {restriction.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Ticket Type</span>
                    <select
                      value={editListingDraft.ticketType}
                      onChange={(event) => updateEditListingDraft("ticketType", event.target.value)}
                    >
                      {ticketTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Platform</span>
                    <select
                      value={editListingDraft.platform}
                      onChange={(event) => updateEditListingDraft("platform", event.target.value)}
                    >
                      {marketplaceNames.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Account</span>
                    <select
                      value={editListingDraft.platformAccount}
                      onChange={(event) => updateEditListingDraft("platformAccount", event.target.value)}
                    >
                      {platformAccounts.map((account) => (
                        <option key={account} value={account}>
                          {account}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-wide">
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={editListingDraft.notes}
                      onChange={(event) => updateEditListingDraft("notes", event.target.value)}
                    />
                  </label>
                  <div className="form-actions form-wide">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setSelectedListing(null);
                        setEditListingDraft(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button className="primary-button" type="submit">
                      Save
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
            {!selectedListing && showCreateListingForm ? (
              <form className="ticket-form" onSubmit={handleCreateListing}>
                <label className="form-wide autocomplete-field">
                  <span>Event</span>
                  <input
                    type="text"
                    value={createListingForm.eventSearch}
                    onBlur={() => setTimeout(() => setEventSearchFocused(false), 100)}
                    onChange={(event) => updateCreateListingForm("eventSearch", event.target.value)}
                    onFocus={() => setEventSearchFocused(true)}
                    placeholder="Search event, artist, venue, or city"
                  />
                  {eventSearchFocused && createListingForm.eventSearch ? (
                    <div className="suggestion-list">
                      {eventSuggestions.length > 0 ? (
                        eventSuggestions.map((eventOption) => (
                          <button
                            key={eventOption.id}
                            className="suggestion-button"
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectEventOption(eventOption)}
                          >
                            <strong>{eventOption.eventName}</strong>
                            <span>
                              {eventOption.venueName} - {eventOption.venueCity} -{" "}
                              {dateFormatter.format(new Date(eventOption.eventDate))}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="suggestion-empty">No matching events</div>
                      )}
                    </div>
                  ) : null}
                </label>
                <label className="autocomplete-field">
                  <span>Section</span>
                  <input
                    type="text"
                    value={createListingForm.sectionSearch}
                    disabled={!selectedEvent}
                    onBlur={() => setTimeout(() => setSectionSearchFocused(false), 100)}
                    onChange={(event) => updateCreateListingForm("sectionSearch", event.target.value)}
                    onFocus={() => setSectionSearchFocused(true)}
                    placeholder={selectedEvent ? "Search section" : "Select event first"}
                  />
                  {sectionSearchFocused && selectedEvent && sectionSuggestions.length > 0 ? (
                    <div className="suggestion-list">
                      {sectionSuggestions.map((section) => (
                        <button
                          key={section.id}
                          className="suggestion-button"
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSectionOption(section)}
                        >
                          <strong>{section.name}</strong>
                          <span>{section.venueName}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label className="autocomplete-field">
                  <span>Row</span>
                  <input
                    type="text"
                    value={createListingForm.rowLabel}
                    onBlur={() => setTimeout(() => setRowSearchFocused(false), 100)}
                    onChange={(event) => updateCreateListingForm("rowLabel", event.target.value.toUpperCase())}
                    onFocus={() => setRowSearchFocused(true)}
                    placeholder="1-100 or A-Z / AA-ZZ"
                  />
                  {rowSearchFocused && rowSuggestions.length > 0 ? (
                    <div className="suggestion-list compact-suggestion-list">
                      {rowSuggestions.map((row) => (
                        <button
                          key={row}
                          className="suggestion-button"
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            updateCreateListingForm("rowLabel", row);
                            setRowSearchFocused(false);
                          }}
                        >
                          <strong>{row}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label>
                  <span>Lowest seat</span>
                  <input
                    type="number"
                    min="1"
                    value={createListingForm.lowestSeat}
                    onChange={(event) => updateCreateListingForm("lowestSeat", event.target.value)}
                    placeholder="e.g. 2"
                  />
                  {calculatedSeatRange ? <small className="field-help">Seats: {calculatedSeatRange}</small> : null}
                </label>
                <label>
                  <span>Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={createListingForm.quantity}
                    onChange={(event) => updateCreateListingForm("quantity", event.target.value)}
                  />
                </label>
                <label>
                  <span>Face Value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createListingForm.purchasePrice}
                    onChange={(event) => updateCreateListingForm("purchasePrice", event.target.value)}
                  />
                </label>
                <label>
                  <span>Ask</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createListingForm.askingPrice}
                    onChange={(event) => updateCreateListingForm("askingPrice", event.target.value)}
                  />
                </label>
                <label>
                  <span>Restrictions</span>
                  <select
                    value={createListingForm.restrictionId}
                    onChange={(event) => updateCreateListingForm("restrictionId", event.target.value)}
                  >
                    {ticketOptions?.restrictions.map((restriction) => (
                      <option key={restriction.id} value={restriction.id}>
                        {restriction.name}
                      </option>
                    ))}
                    <option value="u16">U16s accompanied by an adult</option>
                    <option value="18plus">Only 18+</option>
                  </select>
                </label>
                <label>
                  <span>Ticket Type</span>
                  <select
                    value={createListingForm.ticketType}
                    onChange={(event) => updateCreateListingForm("ticketType", event.target.value)}
                  >
                    {ticketTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Platform</span>
                  <select
                    value={createListingForm.platform}
                    onChange={(event) => updateCreateListingForm("platform", event.target.value)}
                  >
                    {marketplaceNames.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Account</span>
                  <select
                    value={createListingForm.platformAccount}
                    onChange={(event) => updateCreateListingForm("platformAccount", event.target.value)}
                  >
                    {platformAccounts.map((account) => (
                      <option key={account} value={account}>
                        {account}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  <span>Notes</span>
                  <textarea
                    rows={3}
                    value={createListingForm.notes}
                    onChange={(event) => updateCreateListingForm("notes", event.target.value)}
                  />
                </label>
                <div className="form-actions form-wide">
                  {createTicketError ? <p className="error-banner">{createTicketError}</p> : null}
                  <button className="secondary-button" type="button" onClick={() => setShowCreateListingForm(false)}>
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={creatingTicket}>
                    {creatingTicket ? "Creating..." : "Create listing"}
                  </button>
                </div>
              </form>
            ) : null}
            {!selectedListing && !showCreateListingForm ? (
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Listing-ID</th>
                      <th>Event</th>
                      <th>
                        <button className="table-sort-button" type="button" onClick={() => handleListingSort("date")}>
                          Date{getListingSortIndicator("date")}
                        </button>
                      </th>
                      <th>Section</th>
                      <th>Qty</th>
                      <th>Face Value</th>
                      <th>Ask</th>
                      <th>Restrictions</th>
                      <th>Platform Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleListings.map((ticket) => {
                      const priceInfo = getLowestPriceInfo(ticket);

                      return (
                      <tr key={ticket.id}>
                        <td>
                          <strong>{getListingId(ticket)}</strong>
                        </td>
                        <td>
                          <strong>{ticket.eventName}</strong>
                          <span>{ticket.venue}</span>
                        </td>
                        <td>{dateFormatter.format(new Date(ticket.eventDate))}</td>
                        <td>
                          <strong>{ticket.section}</strong>
                          <span>
                            Row {ticket.rowLabel || "-"} - Seats {ticket.seatLabel || "-"}
                          </span>
                        </td>
                        <td>{ticket.quantity}</td>
                        <td>{currency.format(ticket.purchasePrice)}</td>
                        <td>
                          <div className="ask-editor">
                            <div className="ask-editor-row">
                              <input
                                className="table-price-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={askDrafts[ticket.id] ?? ticket.askingPrice}
                                onChange={(event) => setListingAskDraft(ticket.id, event.target.value)}
                              />
                              {askDrafts[ticket.id] !== undefined &&
                              Number(askDrafts[ticket.id]) !== ticket.askingPrice ? (
                                <div className="price-edit-actions">
                                  <button type="button" onClick={() => confirmListingAsk(ticket.id)}>
                                    OK
                                  </button>
                                  <button type="button" onClick={() => resetListingAsk(ticket.id)}>
                                    x
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            <div className="lowest-summary">
                              <span>
                                Lowest {priceInfo.sectionLowestCount}/{marketplaceNames.length}
                              </span>
                              <div className="lowest-tooltip">
                                {priceInfo.marketplaceRows.map((row) => (
                                  <div key={row.marketplace}>
                                    <strong className={row.isLowest ? "value-positive" : "value-negative"}>
                                      {row.marketplace}
                                    </strong>
                                    <span className={row.isLowest ? "value-positive" : "value-negative"}>
                                      {row.isLowest
                                        ? "Lowest"
                                        : `Own ${currency.format(row.ownPrice)} / low ${currency.format(row.lowestPrice)}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{getRestrictionLabel(ticket)}</td>
                        <td>
                          <div className="platform-status-stack">
                            {getPlatformStatuses(ticket).map((platformStatus) => (
                              <span
                                key={platformStatus.platform}
                                className={`status-pill ${getStatusTone(platformStatus.status)}`}
                              >
                                {platformStatus.platform}: {platformStatus.status}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="row-menu">
                            <button
                              className="kebab-button"
                              type="button"
                              onClick={() =>
                                setListingMenuId((current) => (current === ticket.id ? null : ticket.id))
                              }
                            >
                              ...
                            </button>
                            {listingMenuId === ticket.id ? (
                              <div className="row-menu-panel">
                                <button type="button" onClick={() => beginEditListing(ticket)}>
                                  Edit
                                </button>
                                {ticket.marketplaceStatus !== "Draft" ? (
                                  <button type="button" onClick={() => updateListingStatus(ticket, "Draft")}>
                                    Draft
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => updateListingStatus(ticket, "Listed")}>
                                    Live
                                  </button>
                                )}
                                <button type="button" onClick={() => deleteListing(ticket)}>
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "dispatch" ? (
          <section className="panel sales-panel">
            <div className="panel-header">
              <div>
                <h3>Sales</h3>
                <span>Track fulfilled, pending, and cancelled transfers in one queue.</span>
              </div>
              <span>{visibleSoldOrders.length} orders</span>
            </div>
            <div className="filter-toolbar sticky-filter-toolbar">
              <div className="filter-chip-row">
                {soldFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-chip ${soldFilter === filter.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setSoldFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-shell operations-table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Event</th>
                    <th>
                      <button className="table-sort-button" type="button" onClick={() => handleSalesSort("event-date")}>
                        Event Date{getSortIndicator("event-date")}
                      </button>
                    </th>
                    <th>Section</th>
                    <th>Row</th>
                    <th>Seats</th>
                    <th>Qty</th>
                    <th>
                      <button className="table-sort-button" type="button" onClick={() => handleSalesSort("payout")}>
                        Payout{getSortIndicator("payout")}
                      </button>
                    </th>
                    <th>
                      <button className="table-sort-button" type="button" onClick={() => handleSalesSort("profit")}>
                        Profit / ROI{getSortIndicator("profit")}
                      </button>
                    </th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>
                      <button className="table-sort-button" type="button" onClick={() => handleSalesSort("ship-date")}>
                        Time to Ship{getSortIndicator("ship-date")}
                      </button>
                    </th>
                    <th>
                      <button className="table-sort-button" type="button" onClick={() => handleSalesSort("sold-date")}>
                        Sold Date{getSortIndicator("sold-date")}
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSoldOrders.map((order) => {
                    const displayStatus = getSoldDisplayStatus(order);
                    const payoutDaysRemaining = getPayoutDaysRemaining(order.payoutAt);
                    return [
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>
                          <strong>{order.eventName}</strong>
                          <span>{order.venueName}</span>
                        </td>
                        <td>{dateFormatter.format(new Date(order.eventDate))}</td>
                        <td>{order.section}</td>
                        <td>{order.rowLabel}</td>
                        <td>{order.seatLabel}</td>
                        <td>{order.quantity}</td>
                        <td>{currency.format(order.payoutAmount)}</td>
                        <td>
                          <strong className={getValueTone(order.profit)}>{currency.format(order.profit)}</strong>
                          <span className={getValueTone(order.roi)}>{order.roi.toFixed(1)}%</span>
                        </td>
                        <td>{order.buyerChannel}</td>
                        <td>
                          <span className={`status-pill ${getStatusTone(displayStatus)}`}>{displayStatus}</span>
                        </td>
                        <td>
                          <strong>{dateFormatter.format(new Date(order.payoutAt))}</strong>
                          {payoutDaysRemaining ? (
                            <span>
                              {payoutDaysRemaining} {payoutDaysRemaining === 1 ? "day" : "days"} left
                            </span>
                          ) : null}
                        </td>
                        <td>{dateFormatter.format(new Date(order.soldAt))}</td>
                        <td>
                          <div className="row-actions">
                            <button type="button" onClick={() => setSelectedSoldOrder(order)}>
                              Details
                            </button>
                            {displayStatus !== "Delivered" ? (
                              <button
                                type="button"
                                disabled={!selectedCompletedStatusId}
                                onClick={() => openSendDialog(order)}
                              >
                                Send
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setSupportDraftOrder(order);
                                setSupportDraftMessage("");
                              }}
                            >
                              Report an Error
                            </button>
                          </div>
                        </td>
                      </tr>,
                      supportDraftOrder?.id === order.id ? (
                        <tr key={`${order.id}-report`} className="inline-report-row">
                          <td colSpan={14}>
                            <section className="settings-section operations-detail-card">
                              <h4>Report error draft</h4>
                              <p>
                                Discord support ticket payload for {order.eventName} / {order.id}
                              </p>
                              <div className="support-draft-summary">
                                <p>Order: {order.id}</p>
                                <p>Event: {order.eventName}</p>
                                <p>Status: {displayStatus}</p>
                              </div>
                              <textarea
                                rows={5}
                                value={supportDraftMessage}
                                onChange={(event) => setSupportDraftMessage(event.target.value)}
                                placeholder="Add your problem description before sending this to Discord support."
                              />
                              <div className="section-actions">
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => {
                                    setSupportDraftOrder(null);
                                    setSupportDraftMessage("");
                                  }}
                                >
                                  Close
                                </button>
                                <button className="primary-button" type="button">
                                  Send
                                </button>
                              </div>
                            </section>
                          </td>
                        </tr>
                      ) : null,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "payments" ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Payments</h3>
                <span>Review sent and upcoming payouts across marketplaces.</span>
              </div>
              <span>{visiblePayments.length} payouts</span>
            </div>
            <div className="filter-chip-row">
              {paymentFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={`filter-chip ${paymentFilter === filter.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setPaymentFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Payout-ID</th>
                    <th>Payout Day</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Platform Fees</th>
                    <th>Payout Fees</th>
                    <th>Final Payout</th>
                    <th>Date processed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePayments.map((payout) => (
                    <tr key={payout.id}>
                      <td>
                        <strong>{payout.id}</strong>
                        <span>{payout.platform}</span>
                      </td>
                      <td>{dateFormatter.format(new Date(payout.payoutDate))}</td>
                      <td>
                        <span className={`status-pill ${getStatusTone(payout.status)}`}>{payout.status}</span>
                      </td>
                      <td>{currency.format(payout.amount)}</td>
                      <td>{currency.format(payout.platformFees)}</td>
                      <td>{currency.format(payout.payoutFees)}</td>
                      <td>
                        <strong>{currency.format(payout.finalPayout)}</strong>
                      </td>
                      <td>{payout.timeProcessed}</td>
                      <td>
                        <button className="view-button" type="button" onClick={() => setSelectedPayout(payout)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "integrations" ? (
          <section className="panel integration-panel">
            <div className="panel-header">
              <div>
                <h3>Marketplace sync</h3>
                <span>Live marketplace health and sync status.</span>
              </div>
            </div>
            <div className="integration-grid">
              {[
                { name: "StubHub IE", status: "Operational", lastSync: "2 min ago", detail: "Listings and sales webhook healthy." },
                { name: "Vivid Seats", status: "Degraded", lastSync: "12 min ago", detail: "Inventory updates are delayed." },
                { name: "Ticombo", status: "Operational", lastSync: "6 min ago", detail: "Listing sync queue clear." },
                { name: "Ticket Evolution", status: "Operational", lastSync: "7 min ago", detail: "Order ingestion is healthy." },
                { name: "SeatGeek", status: "Error", lastSync: "42 min ago", detail: "Transfer API returned an auth error." },
              ].map((marketplace) => (
                <article key={marketplace.name}>
                  <div className="integration-card-header">
                    <strong>{marketplace.name}</strong>
                    <span className={`status-pill ${getStatusTone(marketplace.status)}`}>
                      {marketplace.status}
                    </span>
                  </div>
                  <p>{marketplace.detail}</p>
                  <span>Last sync: {marketplace.lastSync}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "settings" ? (
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <h3>Profile and payout settings</h3>
                <span>Keep identity, payments, connections, and automations in sync.</span>
              </div>
            </div>
            <form className="settings-form" onSubmit={handleSettingsSave}>
              <div className="settings-grid">
                <section className="settings-section form-wide" id="personal-details">
                  <h4>Personal Details</h4>
                  <label>
                    <span>Display name</span>
                    <input
                      type="text"
                      value={settingsForm.displayName}
                      onChange={(event) => updateSettingsForm("displayName", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Discord handle</span>
                    <input
                      type="text"
                      value={settingsForm.discordHandle}
                      onChange={(event) => updateSettingsForm("discordHandle", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Discord user ID</span>
                    <input
                      type="text"
                      value={settingsForm.discordUserId}
                      onChange={(event) => updateSettingsForm("discordUserId", event.target.value)}
                    />
                  </label>
                  <div className="section-actions">
                    <button className="primary-button section-save-button" type="button" onClick={() => void saveSettings()}>
                      Save
                    </button>
                  </div>
                </section>

                <section className="settings-section form-wide" id="payout">
                  <h4>Payout</h4>
                  <label>
                    <span>Payout method</span>
                    <select
                      value={settingsForm.payoutMethod}
                      onChange={(event) => updateSettingsForm("payoutMethod", event.target.value)}
                    >
                      <option value="Bank transfer">Bank transfer</option>
                      <option value="Revolut">Revolut</option>
                    </select>
                  </label>
                  {settingsForm.payoutMethod === "Revolut" ? (
                    <label>
                      <span>Revtag</span>
                      <input
                        type="text"
                        value={settingsForm.revolutRevtag}
                        onChange={(event) => updateSettingsForm("revolutRevtag", event.target.value)}
                        placeholder="@listix"
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        <span>Account holder</span>
                        <input
                          type="text"
                          value={settingsForm.payoutAccountHolder}
                          onChange={(event) => updateSettingsForm("payoutAccountHolder", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>IBAN</span>
                        <input
                          type="text"
                          value={settingsForm.payoutIban}
                          onChange={(event) => updateSettingsForm("payoutIban", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>BIC</span>
                        <input
                          type="text"
                          value={settingsForm.payoutBic}
                          onChange={(event) => updateSettingsForm("payoutBic", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Bank name</span>
                        <input
                          type="text"
                          value={settingsForm.payoutBankName}
                          onChange={(event) => updateSettingsForm("payoutBankName", event.target.value)}
                        />
                      </label>
                    </>
                  )}
                  <div className="section-actions">
                    <button className="primary-button section-save-button" type="button" onClick={() => void saveSettings()}>
                      Save
                    </button>
                  </div>
                </section>

                <section className="settings-section form-wide" id="payment">
                  <h4>Payment</h4>
                  <label>
                    <span>Card brand</span>
                    <select
                      value={settingsForm.paymentCardBrand}
                      onChange={(event) => updateSettingsForm("paymentCardBrand", event.target.value)}
                    >
                      <option value="Visa">Visa</option>
                      <option value="MasterCard">MasterCard</option>
                    </select>
                  </label>
                  <label>
                    <span>Card number</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settingsForm.paymentCardNumber}
                      onChange={(event) => updateSettingsForm("paymentCardNumber", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>CVV</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={settingsForm.paymentCardCvv}
                      onChange={(event) => updateSettingsForm("paymentCardCvv", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Expiry month</span>
                    <select
                      value={settingsForm.paymentCardExpiryMonth}
                      onChange={(event) => updateSettingsForm("paymentCardExpiryMonth", event.target.value)}
                    >
                      {cardExpiryMonths.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Expiry year</span>
                    <select
                      value={settingsForm.paymentCardExpiryYear}
                      onChange={(event) => updateSettingsForm("paymentCardExpiryYear", event.target.value)}
                    >
                      {cardExpiryYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="section-actions">
                    <button className="primary-button section-save-button" type="button" onClick={() => void saveSettings()}>
                      Save
                    </button>
                  </div>
                </section>

                <section className="settings-section form-wide" id="connections">
                  <h4>Connections</h4>
                  <div className="connection-actions">
                    <button
                      className="primary-button compact"
                      type="button"
                      onClick={() => updateSettingsForm("tikeyConnected", !settingsForm.tikeyConnected)}
                    >
                      {settingsForm.tikeyConnected ? "Tikey connected" : "Connect Tikey"}
                    </button>
                    <span className="field-help">Active Tikey membership required for automatic sending.</span>
                  </div>
                  <label className="form-wide">
                    <span>Ticketmaster accounts CSV</span>
                    <input
                      type="url"
                      value={settingsForm.ticketmasterAccountsCsv}
                      onChange={(event) => updateSettingsForm("ticketmasterAccountsCsv", event.target.value)}
                      placeholder="https://docs.google.com/..."
                    />
                  </label>
                  <label className="form-wide">
                    <span>AXS accounts CSV</span>
                    <input
                      type="url"
                      value={settingsForm.axsAccountsCsv}
                      onChange={(event) => updateSettingsForm("axsAccountsCsv", event.target.value)}
                      placeholder="https://docs.google.com/..."
                    />
                  </label>
                  <label className="form-wide">
                    <span>Pushover user key</span>
                    <input
                      type="text"
                      value={settingsForm.pushoverUserKey}
                      onChange={(event) => updateSettingsForm("pushoverUserKey", event.target.value)}
                    />
                  </label>
                </section>

                <section className="settings-section form-wide" id="sheets-sync">
                  <h4>Sheets Sync</h4>
                  <div className="connection-actions">
                    <button className="primary-button compact" type="button">
                      Connect Google
                    </button>
                    <span className="field-help">Connect a Google account before linking the sales sheet.</span>
                  </div>
                  <label>
                    <span>Google account</span>
                    <input
                      type="email"
                      value={settingsForm.sheetsGoogleAccount}
                      onChange={(event) => updateSettingsForm("sheetsGoogleAccount", event.target.value)}
                    />
                  </label>
                  <label className="form-wide">
                    <span>Google Sheets document</span>
                    <input
                      type="url"
                      value={settingsForm.sheetsDocumentUrl}
                      onChange={(event) => updateSettingsForm("sheetsDocumentUrl", event.target.value)}
                    />
                  </label>
                  <label className="checkbox-field form-wide">
                    <input
                      type="checkbox"
                      checked={settingsForm.sheetsConfirmationMode === "auto"}
                      onChange={(event) =>
                        updateSettingsForm(
                          "sheetsConfirmationMode",
                          event.target.checked ? "auto" : "discord-confirmation",
                        )
                      }
                    />
                    <span>without confirmation in Discord</span>
                  </label>
                </section>
              </div>

              {settingsMessage ? <p className="error-banner">{settingsMessage}</p> : null}
              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSettingsForm({ displayName: user.displayName, ...defaultProfileSettings, ...user.profileSettings })}
                >
                  Reset
                </button>
                <button className="primary-button" type="submit" disabled={settingsSaving}>
                  {settingsSaving ? "Saving..." : "Save settings"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {selectedSoldOrder ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sale details">
            <section className="modal-panel sale-detail-modal">
              <div className="modal-header">
                <div>
                  <h3>Sale Details</h3>
                  <span>{getSoldDisplayStatus(selectedSoldOrder)}</span>
                </div>
                <button className="icon-button" type="button" onClick={() => setSelectedSoldOrder(null)}>
                  x
                </button>
              </div>
              <div className="detail-grid">
                <div>
                  <span>Order-ID</span>
                  <strong>{selectedSoldOrder.id}</strong>
                </div>
                <div>
                  <span>Event</span>
                  <strong>{selectedSoldOrder.eventName}</strong>
                </div>
                <div>
                  <span>Section</span>
                  <strong>{selectedSoldOrder.section}</strong>
                </div>
                <div>
                  <span>Reihe</span>
                  <strong>{selectedSoldOrder.rowLabel || "-"}</strong>
                </div>
                <div>
                  <span>Sitzplaetze</span>
                  <strong>{selectedSoldOrder.seatLabel || "-"}</strong>
                </div>
                <div>
                  <span>Quantity</span>
                  <strong>{selectedSoldOrder.quantity}</strong>
                </div>
                <div>
                  <span>Platform</span>
                  <strong>{selectedSoldOrder.buyerChannel}</strong>
                </div>
              </div>
              <div className="buyer-details">
                <h4>Buyer Details</h4>
                <div className="detail-grid compact-detail-grid">
                  <div>
                    <span>Name</span>
                    <strong className="copyable-value">
                      {getBuyerName(selectedSoldOrder)}
                      <button
                        className="copy-icon-button"
                        type="button"
                        onClick={() => void copyBuyerValue("Name", getBuyerName(selectedSoldOrder))}
                      >
                        Copy
                      </button>
                    </strong>
                  </div>
                  <div>
                    <span>Mail</span>
                    <strong className="copyable-value">
                      {getBuyerEmail(selectedSoldOrder)}
                      <button
                        className="copy-icon-button"
                        type="button"
                        onClick={() => void copyBuyerValue("Mail", getBuyerEmail(selectedSoldOrder))}
                      >
                        Copy
                      </button>
                    </strong>
                  </div>
                </div>
                {getSoldDisplayStatus(selectedSoldOrder) !== "Delivered" ? (
                  <button
                    className="primary-button compact"
                    type="button"
                    disabled={!selectedCompletedStatusId}
                    onClick={() => openSendDialog(selectedSoldOrder)}
                  >
                    Send
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {sendSoldOrder ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Send tickets">
            <section className="modal-panel send-modal">
              <div className="modal-header">
                <div>
                  <h3>Send</h3>
                  <span>
                    {sendSoldOrder.id} - {sendSoldOrder.eventName}
                  </span>
                </div>
                <button className="icon-button" type="button" onClick={closeSendDialog}>
                  x
                </button>
              </div>
              <div className="send-summary">
                <div>
                  <span>Buyer</span>
                  <strong className="copyable-value">
                    {getBuyerName(sendSoldOrder)}
                    <button
                      className="copy-icon-button"
                      type="button"
                      onClick={() => void copyBuyerValue("Name", getBuyerName(sendSoldOrder))}
                    >
                      Copy
                    </button>
                  </strong>
                </div>
                <div>
                  <span>Mail</span>
                  <strong className="copyable-value">
                    {getBuyerEmail(sendSoldOrder)}
                    <button
                      className="copy-icon-button"
                      type="button"
                      onClick={() => void copyBuyerValue("Mail", getBuyerEmail(sendSoldOrder))}
                    >
                      Copy
                    </button>
                  </strong>
                </div>
                <div>
                  <span>Seats</span>
                  <strong>
                    {sendSoldOrder.section} - Row {sendSoldOrder.rowLabel || "-"} -{" "}
                    {sendSoldOrder.seatLabel || "-"}
                  </strong>
                </div>
              </div>
              <div className="send-type-tabs">
                <button
                  className={sendDeliveryType === "mobile" ? "active" : ""}
                  type="button"
                  onClick={() => setSendDeliveryType("mobile")}
                >
                  Mobile Transfer
                </button>
                <button
                  className={sendDeliveryType === "pdf" ? "active" : ""}
                  type="button"
                  onClick={() => setSendDeliveryType("pdf")}
                >
                  PDF
                </button>
                <button
                  className={sendDeliveryType === "links" ? "active" : ""}
                  type="button"
                  onClick={() => setSendDeliveryType("links")}
                >
                  Ticket Links
                </button>
              </div>
              {sendDeliveryType === "mobile" ? (
                <div className="send-method-panel">
                  <div className="copy-actions">
                    <button type="button" onClick={() => void copyBuyerValue("Name", getBuyerName(sendSoldOrder))}>
                      Copy name
                    </button>
                    <button type="button" onClick={() => void copyBuyerValue("Mail", getBuyerEmail(sendSoldOrder))}>
                      Copy mail
                    </button>
                  </div>
                  {copyMessage ? <p className="field-help">{copyMessage}</p> : null}
                  <div className="paste-upload-zone" tabIndex={0} onPaste={handleScreenshotPaste}>
                    <strong>{screenshotFileName || "Paste screenshot here"}</strong>
                    <span>Focus this field and press Ctrl + V.</span>
                  </div>
                </div>
              ) : null}
              {sendDeliveryType === "pdf" ? (
                <div className="send-method-panel">
                  <label className="file-upload-field">
                    <span>PDF file</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) => setPdfFileName(event.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                  {pdfFileName ? <p className="field-help">Selected: {pdfFileName}</p> : null}
                </div>
              ) : null}
              {sendDeliveryType === "links" ? (
                <div className="send-method-panel">
                  <div className="link-field-stack">
                    {ticketLinks.map((linkValue, index) => (
                      <label key={index}>
                        <span>Ticket Link {index + 1}</span>
                        <input
                          type="url"
                          value={linkValue}
                          onChange={(event) => updateTicketLink(index, event.target.value)}
                          placeholder="https://"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="secondary-button compact-action"
                    type="button"
                    onClick={() => setTicketLinks((current) => [...current, ""])}
                  >
                    Add more
                  </button>
                </div>
              ) : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeSendDialog}>
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!selectedCompletedStatusId}
                  onClick={() => void handleSendSoldOrder(sendSoldOrder)}
                >
                  Send
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {selectedPayout ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Payout details">
            <section className="modal-panel payout-modal">
              <div className="modal-header">
                <div>
                  <h3>Payout Details</h3>
                  <span>{selectedPayout.id}</span>
                </div>
                <button className="icon-button" type="button" onClick={() => setSelectedPayout(null)}>
                  x
                </button>
              </div>
              <div className="detail-grid">
                <div>
                  <span>Status</span>
                  <strong>{selectedPayout.status}</strong>
                </div>
                <div>
                  <span>Final Payout</span>
                  <strong>{currency.format(selectedPayout.finalPayout)}</strong>
                </div>
                <div>
                  <span>Payout Day</span>
                  <strong>{dateFormatter.format(new Date(selectedPayout.payoutDate))}</strong>
                </div>
                <div>
                  <span>Platform</span>
                  <strong>{selectedPayout.platform}</strong>
                </div>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Sale</th>
                      <th>Event</th>
                      <th>Buyer</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayout.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>{sale.id}</td>
                        <td>{sale.eventName}</td>
                        <td>{sale.customerName}</td>
                        <td>{currency.format(sale.payoutAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
