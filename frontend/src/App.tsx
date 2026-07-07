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

type TabId = "dashboard" | "tickets" | "dispatch" | "integrations" | "settings";

type SettingsSectionId = "personal-details" | "payout" | "payment" | "connections";

type SoldFilterId = "all" | "delivered" | "pending-delivery" | "cancelled";

type SendDeliveryType = "mobile" | "pdf" | "links";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tickets", label: "Tickets & Pricing" },
  { id: "dispatch", label: "Sold / Not Sent" },
  { id: "integrations", label: "Marketplace Sync" },
];

const settingsSections: Array<{ id: SettingsSectionId; label: string }> = [
  { id: "personal-details", label: "Personal Details" },
  { id: "payout", label: "Payout" },
  { id: "payment", label: "Payment" },
  { id: "connections", label: "Connections" },
];

const soldFilters: Array<{ id: SoldFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "delivered", label: "Delivered" },
  { id: "pending-delivery", label: "Pending Delivery" },
  { id: "cancelled", label: "Cancelled" },
];

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

type CreateTicketFormState = {
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
  notes: string;
};

const defaultCreateTicketForm: CreateTicketFormState = {
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
  notes: "",
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const eventOptionLabel = (eventOption: TicketEventOption) =>
  `${eventOption.eventName} · ${eventOption.venueName} · ${dateFormatter.format(
    new Date(eventOption.eventDate),
  )}`;

const sectionOptionLabel = (section: TicketSectionOption) =>
  `${section.name} · ${section.venueName}`;

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
  payoutBankName: "",
  paymentCardBrand: "",
  paymentCardLast4: "",
  paymentCardExpiry: "",
  pushoverUserKey: "",
};

type SettingsFormState = ProfileSettings & {
  displayName: string;
};

const defaultSettingsForm: SettingsFormState = {
  displayName: "",
  ...defaultProfileSettings,
};

const trendChartWidth = 840;
const trendChartHeight = 220;
const trendChartPadding = 28;

type TrendPoint = {
  label: string;
  sales: number;
  profit: number;
  averageRoi: number;
  x: number;
  y: number;
};

const buildTrendChart = (trend: DashboardData["monthlyTrend"]) => {
  const maxSales = Math.max(1, ...trend.map((point) => point.sales));

  const points = trend.map((point, index) => {
    const x =
      trend.length === 1
        ? trendChartWidth / 2
        : trendChartPadding +
          (index * (trendChartWidth - trendChartPadding * 2)) / (trend.length - 1);
    const y =
      trendChartHeight -
      trendChartPadding -
      (point.sales / maxSales) * (trendChartHeight - trendChartPadding * 2);

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
  const [showCreateTicketForm, setShowCreateTicketForm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>(
    "personal-details",
  );
  const [createTicketForm, setCreateTicketForm] = useState<CreateTicketFormState>(
    defaultCreateTicketForm,
  );
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(defaultSettingsForm);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [soldFilter, setSoldFilter] = useState<SoldFilterId>("all");
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
  const [eventSearchFocused, setEventSearchFocused] = useState(false);
  const [sectionSearchFocused, setSectionSearchFocused] = useState(false);
  const [createTicketError, setCreateTicketError] = useState("");
  const [error, setError] = useState("");
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const dispatchStatuses = ticketOptions?.dispatchStatuses ?? [];

  const selectedCompletedStatusId = dispatchStatuses.find((status) => status.name === "Completed")?.id ?? null;

  const selectedPendingStatusIds = useMemo(
    () =>
      new Set(
        dispatchStatuses
          .filter((status) => status.name === "Awaiting transfer" || status.name === "Ready to send")
          .map((status) => status.id),
      ),
    [dispatchStatuses],
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

    return mapped;
  }, [soldFilter, soldOrders]);

  const pendingOrders = useMemo(
    () => soldOrders.filter((order) => selectedPendingStatusIds.has(order.dispatchStatusId)),
    [selectedPendingStatusIds, soldOrders],
  );

  const chartData = useMemo(
    () => buildTrendChart(dashboard?.monthlyTrend ?? []),
    [dashboard],
  );

  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => ticket.marketplaceStatus !== "Sold"),
    [tickets],
  );

  const getTicketStatusTone = (status: string) => {
    if (status === "Listed") {
      return "status-green";
    }

    if (status === "Needs pricing") {
      return "status-yellow";
    }

    if (status === "Draft") {
      return "status-gray";
    }

    if (status === "Error") {
      return "status-red";
    }

    return "status-neutral";
  };

  const selectedEvent = useMemo(
    () =>
      ticketOptions?.events.find(
        (eventOption) => String(eventOption.id) === createTicketForm.eventId,
      ) ?? null,
    [createTicketForm.eventId, ticketOptions],
  );

  const eventSuggestions = useMemo(() => {
    if (!ticketOptions) {
      return [];
    }

    const query = normalizeSearch(createTicketForm.eventSearch);

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
  }, [createTicketForm.eventSearch, ticketOptions]);

  const availableSections = useMemo(() => {
    if (!ticketOptions || !selectedEvent) {
      return [];
    }

    return ticketOptions.sections.filter(
      (section) => section.venueId === selectedEvent.venueId,
    );
  }, [selectedEvent, ticketOptions]);

  const sectionSuggestions = useMemo(() => {
    const query = normalizeSearch(createTicketForm.sectionSearch);

    if (!query) {
      return availableSections.slice(0, 6);
    }

    return availableSections
      .filter((section) => normalizeSearch(section.name).includes(query))
      .slice(0, 6);
  }, [availableSections, createTicketForm.sectionSearch]);

  const calculatedSeatRange = useMemo(() => {
    const lowestSeat = Number(createTicketForm.lowestSeat);
    const quantity = Number(createTicketForm.quantity);

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
  }, [createTicketForm.lowestSeat, createTicketForm.quantity]);

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
      } catch (error) {
        console.error("Failed to initialize app session:", error);
        // This will make connection errors visible in the browser's developer console.
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await api.login(email, password);
      setUser(response.user);
      await loadAdminData();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to sign in.",
      );
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

  useEffect(() => {
    if (!ticketOptions || createTicketForm.restrictionId) {
      return;
    }

    const defaultRestriction =
      ticketOptions.restrictions.find((restriction) => restriction.name === "No restrictions") ??
      ticketOptions.restrictions[0];

    setCreateTicketForm((current) => ({
      ...current,
      restrictionId: defaultRestriction ? String(defaultRestriction.id) : "",
    }));
  }, [createTicketForm.restrictionId, ticketOptions]);

  const updateCreateTicketForm = (
    field: keyof CreateTicketFormState,
    value: string,
  ) => {
    setCreateTicketForm((current) => {
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

  const updateSettingsForm = (field: keyof SettingsFormState, value: string) => {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const getSoldOrderStatusTone = (order: SoldOrder) => {
    const displayStatus = getSoldDisplayStatus(order);

    if (displayStatus === "Delivered") {
      return "status-green";
    }

    if (displayStatus === "Pending Delivery") {
      return "status-yellow";
    }

    if (displayStatus === "Cancelled") {
      return "status-red";
    }

    return "status-neutral";
  };

  const handleSoldDetails = (order: SoldOrder) => {
    setSelectedSoldOrder(order);
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

  const addTicketLinkField = () => {
    setTicketLinks((current) => [...current, ""]);
  };

  const handleSendSoldOrder = async (order: SoldOrder) => {
    if (!selectedCompletedStatusId) {
      return;
    }

    await api.updateSoldOrder(order.id, { dispatchStatusId: selectedCompletedStatusId });
    await loadAdminData();
    closeSendDialog();
  };

  const handleReportSoldOrder = (order: SoldOrder) => {
    setSupportDraftOrder(order);
    setSupportDraftMessage("");
  };

  const selectEventOption = (eventOption: TicketEventOption) => {
    setCreateTicketForm((current) => ({
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
    setCreateTicketForm((current) => ({
      ...current,
      sectionId: String(section.id),
      sectionSearch: section.name,
    }));
    setSectionSearchFocused(false);
    setCreateTicketError("");
  };

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateTicketError("");

    const payload: CreateTicketInput = {
      eventId: Number(createTicketForm.eventId),
      sectionId: Number(createTicketForm.sectionId),
      restrictionId: Number(createTicketForm.restrictionId),
      quantity: Number(createTicketForm.quantity),
      rowLabel: createTicketForm.rowLabel.trim(),
      lowestSeat: Number(createTicketForm.lowestSeat),
      purchasePrice: Number(createTicketForm.purchasePrice),
      askingPrice: Number(createTicketForm.askingPrice),
      notes: createTicketForm.notes.trim() || null,
    };

    if (
      !payload.eventId ||
      !payload.sectionId ||
      !payload.restrictionId ||
      !payload.rowLabel ||
      !Number.isInteger(payload.lowestSeat) ||
      payload.lowestSeat < 1 ||
      payload.quantity < 1 ||
      !createTicketForm.purchasePrice ||
      !createTicketForm.askingPrice ||
      !Number.isFinite(payload.purchasePrice) ||
      !Number.isFinite(payload.askingPrice)
    ) {
      setCreateTicketError("Please complete the ticket details.");
      return;
    }

    setCreatingTicket(true);

    try {
      await api.createTicket(payload);
      await loadAdminData();
      setCreateTicketForm({
        ...defaultCreateTicketForm,
        restrictionId: createTicketForm.restrictionId,
      });
      setShowCreateTicketForm(false);
    } catch (requestError) {
      setCreateTicketError(
        requestError instanceof Error ? requestError.message : "Unable to create ticket.",
      );
    } finally {
      setCreatingTicket(false);
    }
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
            Manage ticket uploads, pricing, sold order dispatch, and future
            marketplace automation from one place.
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
            Upload inventory, refine pricing, monitor sales, and prepare for
            marketplace syndication.
          </p>
        </div>
        {activeTab === "settings" ? (
          <nav className="tab-list settings-nav">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                className={
                  section.id === activeSettingsSection ? "tab-button active" : "tab-button"
                }
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
                ? "Concert ticket trading admin"
                : activeTab === "tickets"
                  ? "Ticket inventory and pricing"
                  : activeTab === "dispatch"
                    ? "Sold but not sent"
                    : activeTab === "settings"
                      ? "Profile settings"
                      : "Marketplace sync roadmap"}
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

        {activeTab === "settings" ? (
          <section className="panel settings-panel">
            <div className="panel-header">
              <div>
                <h3>Profile and payout settings</h3>
                <span>Keep identity, payment, and alert preferences in sync.</span>
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
                      onChange={(event) =>
                        updateSettingsForm("displayName", event.target.value)
                      }
                      placeholder="Platform Admin"
                    />
                  </label>
                  <label>
                    <span>Discord handle</span>
                    <input
                      type="text"
                      value={settingsForm.discordHandle}
                      onChange={(event) =>
                        updateSettingsForm("discordHandle", event.target.value)
                      }
                      placeholder="ticketboss#1234"
                    />
                  </label>
                  <label>
                    <span>Discord user ID</span>
                    <input
                      type="text"
                      value={settingsForm.discordUserId}
                      onChange={(event) =>
                        updateSettingsForm("discordUserId", event.target.value)
                      }
                      placeholder="123456789012345678"
                    />
                  </label>
                  <label className="form-wide">
                    <span>Street and number</span>
                    <input
                      type="text"
                      value={settingsForm.addressLine1}
                      onChange={(event) =>
                        updateSettingsForm("addressLine1", event.target.value)
                      }
                      placeholder="Market Street 24"
                    />
                  </label>
                  <label className="form-wide">
                    <span>Address line 2</span>
                    <input
                      type="text"
                      value={settingsForm.addressLine2}
                      onChange={(event) =>
                        updateSettingsForm("addressLine2", event.target.value)
                      }
                      placeholder="Suite 5B"
                    />
                  </label>
                  <label>
                    <span>Postal code</span>
                    <input
                      type="text"
                      value={settingsForm.postalCode}
                      onChange={(event) =>
                        updateSettingsForm("postalCode", event.target.value)
                      }
                      placeholder="10115"
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <input
                      type="text"
                      value={settingsForm.city}
                      onChange={(event) => updateSettingsForm("city", event.target.value)}
                      placeholder="Berlin"
                    />
                  </label>
                  <label>
                    <span>Country</span>
                    <input
                      type="text"
                      value={settingsForm.country}
                      onChange={(event) =>
                        updateSettingsForm("country", event.target.value)
                      }
                      placeholder="Germany"
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
                    <span>Method</span>
                    <select
                      value={settingsForm.payoutMethod}
                      onChange={(event) =>
                        updateSettingsForm("payoutMethod", event.target.value)
                      }
                    >
                      <option value="Bank transfer">Bank transfer</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Wise">Wise</option>
                      <option value="Crypto">Crypto</option>
                    </select>
                  </label>
                  <label>
                    <span>Account holder</span>
                    <input
                      type="text"
                      value={settingsForm.payoutAccountHolder}
                      onChange={(event) =>
                        updateSettingsForm("payoutAccountHolder", event.target.value)
                      }
                      placeholder="LisTix Operations"
                    />
                  </label>
                  <label>
                    <span>IBAN / payout reference</span>
                    <input
                      type="text"
                      value={settingsForm.payoutIban}
                      onChange={(event) =>
                        updateSettingsForm("payoutIban", event.target.value)
                      }
                      placeholder="DE00 0000 0000 0000 0000 00"
                    />
                  </label>
                  <label>
                    <span>Bank name</span>
                    <input
                      type="text"
                      value={settingsForm.payoutBankName}
                      onChange={(event) =>
                        updateSettingsForm("payoutBankName", event.target.value)
                      }
                      placeholder="Fintech Bank"
                    />
                  </label>
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
                    <input
                      type="text"
                      value={settingsForm.paymentCardBrand}
                      onChange={(event) =>
                        updateSettingsForm("paymentCardBrand", event.target.value)
                      }
                      placeholder="Visa"
                    />
                  </label>
                  <label>
                    <span>Last 4 digits</span>
                    <input
                      type="text"
                      maxLength={4}
                      value={settingsForm.paymentCardLast4}
                      onChange={(event) =>
                        updateSettingsForm("paymentCardLast4", event.target.value)
                      }
                      placeholder="4242"
                    />
                  </label>
                  <label>
                    <span>Expiry</span>
                    <input
                      type="text"
                      value={settingsForm.paymentCardExpiry}
                      onChange={(event) =>
                        updateSettingsForm("paymentCardExpiry", event.target.value)
                      }
                      placeholder="12/28"
                    />
                  </label>
                  <div className="section-actions">
                    <button className="primary-button section-save-button" type="button" onClick={() => void saveSettings()}>
                      Save
                    </button>
                  </div>
                </section>

                <section className="settings-section form-wide" id="connections">
                  <h4>Connections</h4>
                  <label className="form-wide">
                    <span>Pushover user key</span>
                    <input
                      type="text"
                      value={settingsForm.pushoverUserKey}
                      onChange={(event) =>
                        updateSettingsForm("pushoverUserKey", event.target.value)
                      }
                      placeholder="Your Pushover user key"
                    />
                  </label>
                  <p className="field-help">
                    A new sale notification can be wired to this identifier later.
                  </p>
                  <div className="section-actions">
                    <button className="primary-button section-save-button" type="button" onClick={() => void saveSettings()}>
                      Save
                    </button>
                  </div>
                </section>
              </div>

              {settingsMessage ? <p className="error-banner">{settingsMessage}</p> : null}
              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, ...user.profileSettings })}
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

        {activeTab === "dashboard" ? (
          <>
            <header className="hero-card">
              <div>
                <p className="lede">
                  Current inventory, dispatch, and marketplace performance at a glance.
                </p>
              </div>
              <div className="hero-stats">
                <div>
                  <span>Total Inventory 🎟️</span>
                  <strong>{dashboard?.ticketsInInventory ?? 0}</strong>
                </div>
                <div>
                  <span>Total Live Listings 📈</span>
                  <strong>{dashboard?.listedTickets ?? 0}</strong>
                </div>
                <div>
                  <span>Sold Tickets 💰</span>
                  <strong>{dashboard?.soldTickets ?? 0}</strong>
                </div>
                <div>
                  <span>Average ROI 💸</span>
                  <strong>{dashboard?.averageRoi.toFixed(1) ?? 0}%</strong>
                </div>
                <div>
                  <span>Pending Payouts ⏳</span>
                  <strong>{currency.format(dashboard?.pendingPayout ?? 0)}</strong>
                </div>
                <div>
                  <span>Already Paid Out ✅</span>
                  <strong>{currency.format(dashboard?.payoutReceived ?? 0)}</strong>
                </div>
                <div>
                  <span>Profit 🤑</span>
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
                    {chartData.points.length > 0 ? <path d={chartData.areaPath} className="trend-area" /> : null}
                    {chartData.points.length > 0 ? (
                      <polyline points={chartData.linePoints} className="trend-line" />
                    ) : null}
                    {chartData.points.map((point) => (
                      <circle
                        key={point.label}
                        cx={point.x}
                        cy={point.y}
                        r={6}
                        className="trend-point"
                        onMouseEnter={() => setHoveredTrendPoint(point)}
                        onMouseLeave={() => setHoveredTrendPoint(null)}
                      />
                    ))}
                  </svg>
                  {hoveredTrendPoint ? (
                    <div className="trend-tooltip">
                      <strong>{hoveredTrendPoint.label}</strong>
                      <span>Sales: {currency.format(hoveredTrendPoint.sales)}</span>
                      <span>Profit: {currency.format(hoveredTrendPoint.profit)}</span>
                      <span>ROI: {hoveredTrendPoint.averageRoi.toFixed(1)}%</span>
                    </div>
                  ) : null}
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
                  <h3>Dispatch Queue</h3>
                  <span>Sold tickets that still need action. Total: {pendingOrders.length}</span>
                </div>
                <div className="list-stack">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="list-row">
                      <div>
                        <strong>{order.id}</strong>
                        <span>{order.customerName}</span>
                      </div>
                      <div>
                        <strong>{order.dispatchStatus}</strong>
                        <span>{order.buyerChannel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
        {/* The following is the original content, which we are replacing with the above structure */}
        {/* <header className="hero-card">
          <div>
            <p className="eyebrow">Live overview</p>
            <h1>Concert ticket trading admin</h1>
            <p className="lede">
              Current MVP layout for inventory, dispatch operations, and a future
              multi-marketplace listing workflow.
            </p>
          </div>
          <div className="hero-stats">
            <div>
              <span>Pending sends 📦</span>
              <strong>{pendingOrders.length}</strong>
            </div>
            <div>
              <span>Total Inventory 🎟️</span>
              <strong>{dashboard?.ticketsInInventory ?? 0}</strong>
            </div>
            <div>
              <span>Sold Tickets 💰</span>
              <strong>{dashboard?.soldTickets ?? 0}</strong>
            </div>
            <div>
              <span>Total Live Listings 📈</span>
              <strong>{dashboard?.listedTickets ?? 0}</strong>
            </div>
            <div>
              <span>Average ROI 💸</span>
              <strong>{dashboard?.averageRoi.toFixed(1) ?? 0}%</strong>
            </div>
            <div>
              <span>Pending Payouts ⏳</span>
              <strong>{currency.format(dashboard?.pendingPayout ?? 0)}</strong>
            </div>
            <div>
              <span>Already Paid Out ✅</span>
              <strong>{currency.format(dashboard?.payoutReceived ?? 0)}</strong>
            </div>
            <div>
              <span>Profit 🤑</span>
              <strong>{currency.format(dashboard?.profit ?? 0)}</strong>
            </div>
          </div>
        </header> */}

        {activeTab === "tickets" ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Ticket inventory and pricing</h3>
                <span>Current inventory view for upload and resale preparation</span>
              </div>
              <button
                className="primary-button compact"
                type="button"
                onClick={() => {
                  setCreateTicketError("");
                  setShowCreateTicketForm((current) => !current);
                }}
              >
                {showCreateTicketForm ? "Close" : "+ Create ticket"}
              </button>
            </div>
            {showCreateTicketForm ? (
              <form className="ticket-form" onSubmit={handleCreateTicket}>
                <label className="form-wide autocomplete-field">
                  <span>Event</span>
                  <input
                    type="text"
                    value={createTicketForm.eventSearch}
                    onBlur={() => setTimeout(() => setEventSearchFocused(false), 100)}
                    onChange={(event) =>
                      updateCreateTicketForm("eventSearch", event.target.value)
                    }
                    onFocus={() => setEventSearchFocused(true)}
                    placeholder="Search event, artist, venue, or city"
                  />
                  {eventSearchFocused && createTicketForm.eventSearch ? (
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
                              {eventOption.venueName} · {eventOption.venueCity} ·{" "}
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
                    value={createTicketForm.sectionSearch}
                    disabled={!selectedEvent}
                    onBlur={() => setTimeout(() => setSectionSearchFocused(false), 100)}
                    onChange={(event) =>
                      updateCreateTicketForm("sectionSearch", event.target.value)
                    }
                    onFocus={() => setSectionSearchFocused(true)}
                    placeholder={selectedEvent ? "Search section" : "Select event first"}
                  />
                  {sectionSearchFocused && selectedEvent ? (
                    <div className="suggestion-list">
                      {sectionSuggestions.length > 0 ? (
                        sectionSuggestions.map((section) => (
                          <button
                            key={section.id}
                            className="suggestion-button"
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectSectionOption(section)}
                          >
                            <strong>{section.name}</strong>
                            <span>{sectionOptionLabel(section)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="suggestion-empty">No matching sections</div>
                      )}
                    </div>
                  ) : null}
                </label>
                <label>
                  <span>Row</span>
                  <input
                    type="text"
                    value={createTicketForm.rowLabel}
                    onChange={(event) => updateCreateTicketForm("rowLabel", event.target.value)}
                    placeholder="e.g. 12"
                  />
                </label>
                <label>
                  <span>Lowest seat</span>
                  <input
                    type="number"
                    min="1"
                    value={createTicketForm.lowestSeat}
                    onChange={(event) => updateCreateTicketForm("lowestSeat", event.target.value)}
                    placeholder="e.g. 2"
                  />
                  {calculatedSeatRange ? (
                    <small className="field-help">Seats: {calculatedSeatRange}</small>
                  ) : null}
                </label>
                <label>
                  <span>Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={createTicketForm.quantity}
                    onChange={(event) => updateCreateTicketForm("quantity", event.target.value)}
                  />
                </label>
                <label>
                  <span>Face Value (per Ticket)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createTicketForm.purchasePrice}
                    onChange={(event) =>
                      updateCreateTicketForm("purchasePrice", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Ask price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createTicketForm.askingPrice}
                    onChange={(event) =>
                      updateCreateTicketForm("askingPrice", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Restrictions</span>
                  <select
                    value={createTicketForm.restrictionId}
                    onChange={(event) =>
                      updateCreateTicketForm("restrictionId", event.target.value)
                    }
                  >
                    {ticketOptions?.restrictions.map((restriction) => (
                      <option key={restriction.id} value={restriction.id}>
                        {restriction.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  <span>Notes</span>
                  <textarea
                    rows={3}
                    value={createTicketForm.notes}
                    onChange={(event) => updateCreateTicketForm("notes", event.target.value)}
                  />
                </label>
                <div className="form-actions form-wide">
                  {createTicketError ? (
                    <p className="error-banner">{createTicketError}</p>
                  ) : null}
                  <button className="secondary-button" type="button" onClick={() => setShowCreateTicketForm(false)}>
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={creatingTicket}>
                    {creatingTicket ? "Creating..." : "Create ticket"}
                  </button>
                </div>
              </form>
            ) : null}
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Section</th>
                    <th>Qty</th>
                    <th>Face Value</th>
                    <th>Ask</th>
                    <th>Restrictions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.eventName}</strong>
                        <span>{ticket.venue}</span>
                      </td>
                      <td>{dateFormatter.format(new Date(ticket.eventDate))}</td>
                      <td>
                        <strong>{ticket.section}</strong>
                        <span>
                          Row {ticket.rowLabel || "-"} · Seats {ticket.seatLabel || "-"}
                        </span>
                      </td>
                      <td>{ticket.quantity}</td>
                      <td>{currency.format(ticket.purchasePrice)}</td>
                      <td>{currency.format(ticket.askingPrice)}</td>
                      <td>{ticket.restriction ?? "No restrictions"}</td>
                      <td>
                        <span className={`status-pill ${getTicketStatusTone(ticket.marketplaceStatus)}`}>
                          {ticket.marketplaceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "dispatch" ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Sold / Not Sent</h3>
                <span>Track fulfilled, pending, and cancelled transfers in one queue.</span>
              </div>
              <span>{visibleSoldOrders.length} orders</span>
            </div>
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
            <div className="table-shell operations-table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Event</th>
                    <th>Section</th>
                    <th>Row</th>
                    <th>Seats</th>
                    <th>Qty</th>
                    <th>Payout</th>
                    <th>Profit / ROI</th>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>Payout Time</th>
                    <th>Sold Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSoldOrders.map((order) => {
                    const displayStatus = getSoldDisplayStatus(order);
                    const payoutDaysRemaining = getPayoutDaysRemaining(order.payoutAt);
                    const profitTone = getValueTone(order.profit);
                    const roiTone = getValueTone(order.roi);
                    return (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>
                          <strong>{order.eventName}</strong>
                          <span>{order.venueName}</span>
                        </td>
                        <td>{order.section}</td>
                        <td>{order.rowLabel}</td>
                        <td>{order.seatLabel}</td>
                        <td>{order.quantity}</td>
                        <td>{currency.format(order.payoutAmount)}</td>
                        <td>
                          <strong className={profitTone}>{currency.format(order.profit)}</strong>
                          <span className={roiTone}>{order.roi.toFixed(1)}%</span>
                        </td>
                        <td>{order.buyerChannel}</td>
                        <td>
                          <span className={`status-pill ${getSoldOrderStatusTone(order)}`}>
                            {displayStatus}
                          </span>
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
                            <button type="button" onClick={() => handleSoldDetails(order)}>
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
                            <button type="button" onClick={() => handleReportSoldOrder(order)}>
                              Report Error
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                      <span>Sitzplätze</span>
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
                        <strong>{selectedSoldOrder.customerName || "Not saved"}</strong>
                      </div>
                      <div>
                        <span>Mail</span>
                        <strong>{selectedSoldOrder.buyerEmail || "Not saved"}</strong>
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
                        {sendSoldOrder.id} · {sendSoldOrder.eventName}
                      </span>
                    </div>
                    <button className="icon-button" type="button" onClick={closeSendDialog}>
                      x
                    </button>
                  </div>
                  <div className="send-summary">
                    <div>
                      <span>Buyer</span>
                      <strong>{sendSoldOrder.customerName || "Not saved"}</strong>
                    </div>
                    <div>
                      <span>Mail</span>
                      <strong>{sendSoldOrder.buyerEmail || "Not saved"}</strong>
                    </div>
                    <div>
                      <span>Seats</span>
                      <strong>
                        {sendSoldOrder.section} · Row {sendSoldOrder.rowLabel || "-"} ·{" "}
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
                      PDF-Tickets
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
                        <button
                          type="button"
                          onClick={() => void copyBuyerValue("Name", sendSoldOrder.customerName)}
                        >
                          Copy name
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyBuyerValue("Mail", sendSoldOrder.buyerEmail)}
                        >
                          Copy mail
                        </button>
                      </div>
                      {copyMessage ? <p className="field-help">{copyMessage}</p> : null}
                      <div
                        className="paste-upload-zone"
                        tabIndex={0}
                        onPaste={handleScreenshotPaste}
                      >
                        <strong>{screenshotFileName || "Paste screenshot here"}</strong>
                        <span>Focus this field and press Ctrl + V.</span>
                      </div>
                    </div>
                  ) : null}
                  {sendDeliveryType === "pdf" ? (
                    <div className="send-method-panel">
                      <label className="file-upload-field">
                        <span>PDF-Datei</span>
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
                      <button className="secondary-button compact-action" type="button" onClick={addTicketLinkField}>
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
            <div className="operations-grid">
              {selectedSoldOrder ? (
                <section className="settings-section operations-detail-card legacy-detail-card">
                  <h4>Sale details</h4>
                  <p>
                    {selectedSoldOrder.eventName} · {selectedSoldOrder.section} · {selectedSoldOrder.rowLabel}
                  </p>
                  <p>Seats: {selectedSoldOrder.seatLabel}</p>
                  <p>Platform: {selectedSoldOrder.buyerChannel}</p>
                  <p>Status: {getSoldDisplayStatus(selectedSoldOrder)}</p>
                  <p>Profit: {currency.format(selectedSoldOrder.profit)}</p>
                  <button className="secondary-button" type="button" onClick={() => setSelectedSoldOrder(null)}>
                    Close
                  </button>
                </section>
              ) : null}
              {supportDraftOrder ? (
                <section className="settings-section operations-detail-card">
                  <h4>Report error draft</h4>
                  <p>
                    Discord support ticket payload for {supportDraftOrder.eventName} / {supportDraftOrder.id}
                  </p>
                  <div className="support-draft-summary">
                    <p>Order: {supportDraftOrder.id}</p>
                    <p>Event: {supportDraftOrder.eventName}</p>
                    <p>Section: {supportDraftOrder.section}</p>
                    <p>Row: {supportDraftOrder.rowLabel}</p>
                    <p>Seats: {supportDraftOrder.seatLabel}</p>
                    <p>Status: {getSoldDisplayStatus(supportDraftOrder)}</p>
                  </div>
                  <textarea
                    rows={5}
                    value={supportDraftMessage}
                    onChange={(event) => setSupportDraftMessage(event.target.value)}
                    placeholder="Add your problem description before sending this to Discord support."
                  />
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
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === "integrations" ? (
          <section className="panel integration-panel">
            <div className="panel-header">
              <h3>Marketplace sync roadmap</h3>
              <span>Prepared area for future resale platform automations</span>
            </div>
            <div className="integration-grid">
              <article>
                <strong>Listing fan-out</strong>
                <p>
                  One upload flow that can later syndicate a ticket listing to
                  StubHub, Viagogo, Ticketmaster Exchange, and other partners.
                </p>
              </article>
              <article>
                <strong>Price rule engine</strong>
                <p>
                  Rule-based price adjustments by event date, section quality,
                  inventory age, and competitor pricing.
                </p>
              </article>
              <article>
                <strong>Transfer automation</strong>
                <p>
                  Central queue for sold orders that still need wallet transfer,
                  PDF delivery, or marketplace confirmation.
                </p>
              </article>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
