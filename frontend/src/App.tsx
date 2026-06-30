import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  CreateTicketInput,
  DashboardData,
  SoldOrder,
  TicketEventOption,
  TicketInputOptions,
  TicketItem,
  TicketSectionOption,
  User,
} from "./types";

type TabId = "dashboard" | "tickets" | "dispatch" | "integrations";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tickets", label: "Tickets & Pricing" },
  { id: "dispatch", label: "Sold / Not Sent" },
  { id: "integrations", label: "Marketplace Sync" },
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
  const [createTicketForm, setCreateTicketForm] = useState<CreateTicketFormState>(
    defaultCreateTicketForm,
  );
  const [eventSearchFocused, setEventSearchFocused] = useState(false);
  const [sectionSearchFocused, setSectionSearchFocused] = useState(false);
  const [createTicketError, setCreateTicketError] = useState("");
  const [error, setError] = useState("");

  const pendingOrders = useMemo(
    () => soldOrders.filter((order) => order.dispatchStatus !== "Completed"),
    [soldOrders],
  );

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
      } catch (_error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

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
        <div className="sidebar-footer">
          <p>{user.displayName}</p>
          <span>{user.email}</span>
          <button className="secondary-button" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="hero-card">
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
              <span>Pending sends</span>
              <strong>{pendingOrders.length}</strong>
            </div>
            <div>
              <span>Inventory</span>
              <strong>{dashboard?.ticketsInInventory ?? 0}</strong>
            </div>
          </div>
        </header>

        {activeTab === "dashboard" && dashboard ? (
          <section className="panel-grid">
            <div className="stat-card">
              <span>Gross sales</span>
              <strong>{currency.format(dashboard.grossSales)}</strong>
            </div>
            <div className="stat-card">
              <span>Active listings</span>
              <strong>{dashboard.activeListings}</strong>
            </div>
            <div className="stat-card">
              <span>Pending dispatch</span>
              <strong>{dashboard.pendingDispatch}</strong>
            </div>
            <div className="stat-card">
              <span>Tickets in inventory</span>
              <strong>{dashboard.ticketsInInventory}</strong>
            </div>

            <div className="panel wide">
              <div className="panel-header">
                <h3>Monthly sales trend</h3>
                <span>Mock KPI data for the MVP dashboard</span>
              </div>
              <div className="trend-chart">
                {dashboard.monthlyTrend.map((point) => (
                  <div key={point.label} className="trend-bar">
                    <div
                      className="trend-fill"
                      style={{ height: `${Math.max(point.sales / 90, 18)}px` }}
                    />
                    <strong>{point.label}</strong>
                    <span>{currency.format(point.sales)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Dispatch queue</h3>
                <span>Sold tickets that still need action</span>
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
          </section>
        ) : null}

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
                  {tickets.map((ticket) => (
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
                        <span className="status-pill">{ticket.marketplaceStatus}</span>
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
              <h3>Sold but not sent</h3>
              <span>Orders waiting for transfer or delivery confirmation</span>
            </div>
            <div className="list-stack">
              {pendingOrders.map((order) => (
                <div key={order.id} className="order-card">
                  <div>
                    <p>{order.id}</p>
                    <strong>{order.customerName}</strong>
                    <span>{order.buyerChannel}</span>
                  </div>
                  <div>
                    <p>Payout</p>
                    <strong>{currency.format(order.payoutAmount)}</strong>
                    <span>{dateFormatter.format(new Date(order.soldAt))}</span>
                  </div>
                  <div>
                    <p>Status</p>
                    <strong>{order.dispatchStatus}</strong>
                    <span>{order.ticketId}</span>
                  </div>
                </div>
              ))}
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
