import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import type { CreateTicketInput, TicketItem } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./ListingsPage.css";

type ListingDraft = { eventId: string; sectionId: string; restrictionId: string; quantity: string; rowLabel: string; lowestSeat: string; purchasePrice: string; askingPrice: string; notes: string };
const emptyDraft: ListingDraft = { eventId: "", sectionId: "", restrictionId: "", quantity: "1", rowLabel: "", lowestSeat: "", purchasePrice: "", askingPrice: "", notes: "" };

export function ListingsPage() {
  const { tickets: cachedTickets, ticketOptions: options, loadTickets, loadTicketOptions, createTicket } = useApi();
  const tickets = cachedTickets ?? [];
  useEffect(() => { void loadTickets(); void loadTicketOptions(); }, [loadTicketOptions, loadTickets]);
  const [showForm, setShowForm] = useState(false); const [draft, setDraft] = useState(emptyDraft); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const listings = useMemo(() => tickets.filter((ticket) => ticket.marketplaceStatus !== "Sold").sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate)), [tickets]);
  const event = options?.events.find((item) => String(item.id) === draft.eventId);
  const sections = options?.sections.filter((item) => !event || item.venueId === event.venueId) ?? [];
  const update = (key: keyof ListingDraft, value: string) => setDraft((current) => ({ ...current, [key]: value, ...(key === "eventId" ? { sectionId: "" } : {}) }));
  const create = async (formEvent: FormEvent) => { formEvent.preventDefault(); setSaving(true); setError(""); try { const payload: CreateTicketInput = { eventId: Number(draft.eventId), sectionId: Number(draft.sectionId), restrictionId: Number(draft.restrictionId), quantity: Number(draft.quantity), rowLabel: draft.rowLabel, lowestSeat: Number(draft.lowestSeat), purchasePrice: Number(draft.purchasePrice), askingPrice: Number(draft.askingPrice), notes: draft.notes || null }; await createTicket(payload); setDraft(emptyDraft); setShowForm(false); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create listing."); } finally { setSaving(false); } };
  const columns: DataTableColumn<TicketItem>[] = [
    { key: "id", header: "Listing", render: (ticket) => <><strong>{ticket.ticketCode || ticket.id}</strong><small>{ticket.categoryName}</small></> },
    { key: "event", header: "Event", render: (ticket) => <><strong>{ticket.eventName}</strong><small>{ticket.venue}</small></> },
    { key: "date", header: "Event date", render: (ticket) => formatDate(ticket.eventDate) },
    { key: "seats", header: "Seats", render: (ticket) => <><strong>{ticket.section}, row {ticket.rowLabel || "-"}</strong><small>{ticket.seatLabel || `${ticket.quantity} ticket(s)`}</small></> },
    { key: "cost", header: "Purchase", className: "numeric-column", render: (ticket) => formatCurrency(ticket.purchasePrice) },
    { key: "ask", header: "Asking", className: "numeric-column", render: (ticket) => formatCurrency(ticket.askingPrice) },
    { key: "status", header: "Status", render: (ticket) => <StatusBadge status={ticket.marketplaceStatus} /> },
  ];
  return <div className="page-stack"><section className="panel page-panel"><div className="page-header"><div><h2>Inventory listings</h2><p>Manage ticket inventory before marketplace distribution.</p></div><button className="primary-button" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Create listing"}</button></div>
    {showForm && <form className="form-grid listing-form" onSubmit={create}><label className="field"><span>Event</span><select value={draft.eventId} onChange={(e) => update("eventId", e.target.value)} required><option value="">Choose event</option>{options?.events.map((item) => <option key={item.id} value={item.id}>{item.eventName} - {formatDate(item.eventDate)}</option>)}</select></label><label className="field"><span>Section</span><select value={draft.sectionId} onChange={(e) => update("sectionId", e.target.value)} required><option value="">Choose section</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Restriction</span><select value={draft.restrictionId} onChange={(e) => update("restrictionId", e.target.value)} required><option value="">Choose restriction</option>{options?.restrictions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Row</span><input value={draft.rowLabel} onChange={(e) => update("rowLabel", e.target.value)} required /></label><label className="field"><span>First seat</span><input type="number" min="1" value={draft.lowestSeat} onChange={(e) => update("lowestSeat", e.target.value)} required /></label><label className="field"><span>Quantity</span><input type="number" min="1" value={draft.quantity} onChange={(e) => update("quantity", e.target.value)} required /></label><label className="field"><span>Purchase price</span><input type="number" min="0" step=".01" value={draft.purchasePrice} onChange={(e) => update("purchasePrice", e.target.value)} required /></label><label className="field"><span>Asking price</span><input type="number" min="0" step=".01" value={draft.askingPrice} onChange={(e) => update("askingPrice", e.target.value)} required /></label><label className="field"><span>Notes</span><input value={draft.notes} onChange={(e) => update("notes", e.target.value)} /></label><div className="form-actions">{error && <p className="error-message">{error}</p>}<button className="primary-button" disabled={saving}>{saving ? "Creating..." : "Create"}</button></div></form>}
    <DataTable columns={columns} rows={listings} rowKey={(ticket) => ticket.databaseId} emptyMessage="No active listings." />
  </section></div>;
}
