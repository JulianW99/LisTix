import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { formatDate } from "../../Functions/formatDate";
import { availableSplitTypes } from "../../Functions/splitTypes";
import type { CreateTicketInput, SplitType, TicketEventOption, TicketItem } from "../../types";
import "./CreateListingPage.css";

const restrictionNames = ["Under 16s accompanied by an adult", "Only over 18s"];
type ListingDraft = { sectionId: string; restrictionIds: number[]; ticketType: "" | "Mobile ticket transfer" | "PDF-Ticket"; splitType: "" | SplitType; quantity: string; rowLabel: string; lowestSeat: string; purchasePrice: string; askingPrice: string; notes: string };
const emptyDraft: ListingDraft = { sectionId: "", restrictionIds: [], ticketType: "", splitType: "all_together", quantity: "1", rowLabel: "", lowestSeat: "", purchasePrice: "", askingPrice: "", notes: "" };

const buildDraft = (ticket: TicketItem): ListingDraft => ({
  sectionId: String(ticket.sectionId), restrictionIds: ticket.restrictionIds ?? (ticket.restrictionId ? [ticket.restrictionId] : []), ticketType: ticket.ticketType ?? "Mobile ticket transfer", splitType: ticket.splitType ?? "all_together", quantity: String(ticket.quantity), rowLabel: ticket.rowLabel, lowestSeat: ticket.lowestSeat ? String(ticket.lowestSeat) : "", purchasePrice: String(ticket.purchasePrice), askingPrice: String(ticket.askingPrice), notes: ticket.notes ?? "",
});

export function CreateListingPage() {
  const { eventId, listingId } = useParams();
  return eventId || listingId ? <ListingDetailsPage eventId={eventId} listingId={listingId} /> : <EventSearchPage />;
}

function EventSearchPage() {
  const { ticketOptions: options, loadTicketOptions } = useApi();
  const navigate = useNavigate();
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [activeIndex, setActiveIndex] = useState(0); const [selectedEvent, setSelectedEvent] = useState<TicketEventOption | null>(null);
  useEffect(() => { void loadTicketOptions(); }, [loadTicketOptions]);
  const suggestions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return [];
    return (options?.events ?? []).filter((event) => [event.eventName, event.venueName, event.venueCity, formatDate(event.eventDate)].some((value) => value.toLocaleLowerCase().includes(search))).slice(0, 8);
  }, [options, query]);
  const chooseEvent = (event: TicketEventOption) => { setSelectedEvent(event); setQuery(event.eventName); setOpen(false); };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((current) => (current + 1) % suggestions.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length); }
    if (event.key === "Enter" && open) { event.preventDefault(); chooseEvent(suggestions[activeIndex] ?? suggestions[0]); }
    if (event.key === "Escape") setOpen(false);
  };
  return <div className="page-stack create-listing-page"><section className="panel page-panel event-search-panel"><div className="create-listing-heading"><p className="eyebrow">New listing · Step 1 of 2</p><h2>Find your event</h2><p>Search by event, venue, city or date to start a new listing.</p></div><div className="event-search-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}><label htmlFor="event-search">Event</label><div className="search-input-shell"><span aria-hidden="true">⌕</span><input id="event-search" type="search" value={query} placeholder="Search events..." autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open && query.trim().length > 0} autoFocus onFocus={() => { if (query.trim()) setOpen(true); }} onChange={(event) => { setQuery(event.target.value); setSelectedEvent(null); setActiveIndex(0); setOpen(Boolean(event.target.value.trim())); }} onKeyDown={handleKeyDown} /></div>{open && query.trim() && <div className="suggestion-menu event-suggestion-menu" role="listbox">{options !== null && !suggestions.length && <p className="suggestion-empty">No matching events found.</p>}{suggestions.map((event, index) => <button className={index === activeIndex ? "active" : ""} key={event.id} type="button" role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => chooseEvent(event)}><strong>{event.eventName}</strong><span>{formatDate(event.eventDate)} · {event.venueName}, {event.venueCity}</span></button>)}</div>}</div>{selectedEvent && <div className="event-confirm-card"><div><span>Confirm event</span><strong>{selectedEvent.eventName}</strong><small>{formatDate(selectedEvent.eventDate)} · {selectedEvent.venueName}, {selectedEvent.venueCity}</small></div><div><button className="secondary-button" type="button" onClick={() => { setSelectedEvent(null); setQuery(""); }}>Change</button><button className="primary-button" type="button" onClick={() => navigate(`/listings/new/${selectedEvent.id}`)}>Confirm event</button></div></div>}<div className="create-listing-footer"><button className="secondary-button" type="button" onClick={() => navigate("/listings")}>Back to listings</button></div></section></div>;
}

function ListingDetailsPage({ eventId, listingId }: { eventId?: string; listingId?: string }) {
  const { tickets, ticketOptions: options, loadTickets, loadTicketOptions, createTicket, updateTicket } = useApi();
  const navigate = useNavigate(); const [searchParams] = useSearchParams(); const formRef = useRef<HTMLFormElement>(null);
  const duplicateId = Number(searchParams.get("duplicate")); const editing = Boolean(listingId); const duplicating = Number.isInteger(duplicateId) && duplicateId > 0;
  const sourceTicket = tickets?.find((ticket) => ticket.databaseId === (editing ? Number(listingId) : duplicateId));
  const selectedEventId = sourceTicket?.eventId ?? Number(eventId); const selectedEvent = options?.events.find((event) => event.id === selectedEventId);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft); const [sectionQuery, setSectionQuery] = useState(""); const [sectionOpen, setSectionOpen] = useState(false); const [rowOpen, setRowOpen] = useState(false); const [restrictionOpen, setRestrictionOpen] = useState(false); const [initializedId, setInitializedId] = useState<number | null>(null); const [saving, setSaving] = useState<"Draft" | "Active" | null>(null); const [error, setError] = useState("");
  useEffect(() => { void loadTicketOptions(); if (editing || duplicating) void loadTickets(); }, [duplicating, editing, loadTicketOptions, loadTickets]);
  useEffect(() => { if (!sourceTicket || initializedId === sourceTicket.databaseId) return; setDraft(buildDraft(sourceTicket)); setSectionQuery(sourceTicket.section); setInitializedId(sourceTicket.databaseId); }, [initializedId, sourceTicket]);
  const sections = useMemo(() => options?.sections.filter((section) => section.venueId === selectedEvent?.venueId) ?? [], [options, selectedEvent]);
  const sectionSuggestions = useMemo(() => { const search = sectionQuery.trim().toLocaleLowerCase(); return sections.filter((section) => !search || section.name.toLocaleLowerCase().includes(search)).slice(0, 8); }, [sectionQuery, sections]);
  const selectedSection = sections.find((section) => section.id === Number(draft.sectionId)) ?? sections.find((section) => section.name.toLocaleLowerCase() === sectionQuery.trim().toLocaleLowerCase());
  const rowSuggestions = useMemo(() => { const search = draft.rowLabel.trim().toLocaleLowerCase(); return (selectedSection?.rowLabels ?? []).filter((row) => !search || row.toLocaleLowerCase().includes(search)).slice(0, 8); }, [draft.rowLabel, selectedSection]);
  const availableRestrictions = options?.restrictions.filter((restriction) => restrictionNames.includes(restriction.name)) ?? [];
  const selectedRestrictions = availableRestrictions.filter((restriction) => draft.restrictionIds.includes(restriction.id));
  const update = (key: keyof ListingDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const changeQuantity = (value: string) => setDraft((current) => {
    const quantity = Number(value);
    const splitOptions = availableSplitTypes(quantity);
    const selectedStillAllowed = splitOptions.some((option) => option.value === current.splitType);
    return { ...current, quantity: value, splitType: quantity <= 1 ? "all_together" : Number(current.quantity) <= 1 ? "" : selectedStillAllowed ? current.splitType : "" };
  });
  const seatSummary = draft.lowestSeat && Number(draft.quantity) > 0 ? `Seats ${draft.lowestSeat}${Number(draft.quantity) > 1 ? `–${Number(draft.lowestSeat) + Number(draft.quantity) - 1}` : ""}` : "";
  const save = async (statusName: "Draft" | "Active") => {
    setError(""); if (!formRef.current?.reportValidity()) return;
    if (!selectedEvent || !draft.sectionId) { setError("Please select a section from the suggestions."); return; }
    const status = options?.marketplaceStatuses.find((item) => item.name === statusName); const fallbackRestriction = options?.restrictions.find((item) => item.name === "No restrictions");
    if (!status) { setError(`${statusName} status is unavailable.`); return; }
    setSaving(statusName);
    try {
      const payload: CreateTicketInput = { eventId: selectedEvent.id, sectionId: Number(draft.sectionId), restrictionId: draft.restrictionIds[0] ?? fallbackRestriction?.id, restrictionIds: draft.restrictionIds, ticketType: draft.ticketType as CreateTicketInput["ticketType"], splitType: (Number(draft.quantity) <= 1 ? "all_together" : draft.splitType) as SplitType, marketplaceStatusId: status.id, quantity: Number(draft.quantity), rowLabel: draft.rowLabel, lowestSeat: Number(draft.lowestSeat), purchasePrice: Number(draft.purchasePrice), askingPrice: Number(draft.askingPrice), notes: draft.notes.trim() || null };
      if (editing && sourceTicket) await updateTicket(sourceTicket.databaseId, payload); else await createTicket(payload);
      const message = statusName === "Draft" ? "Listing saved as draft." : editing ? `${sourceTicket?.ticketCode} was updated and activated.` : duplicating ? "Listing duplicated and activated." : "Listing created and activated.";
      navigate("/listings", { state: { message } });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save listing."); } finally { setSaving(null); }
  };
  if (!options || ((editing || duplicating) && tickets === null)) return <div className="page-stack"><section className="panel page-panel"><p className="muted create-listing-state">Loading listing details...</p></section></div>;
  if ((editing || duplicating) && !sourceTicket) return <ListingNotFound message="Listing not found." />;
  if (!selectedEvent) return <ListingNotFound message="Event not found." />;
  return <div className="page-stack create-listing-page"><section className="panel page-panel listing-details-panel"><div className="create-listing-heading"><p className="eyebrow">{editing ? "Edit listing" : duplicating ? "Duplicate listing" : "New listing · Step 2 of 2"}</p><h2>{editing ? `Edit ${sourceTicket?.ticketCode}` : duplicating ? `Duplicate ${sourceTicket?.ticketCode}` : "Listing details"}</h2><p>Add the seat and pricing information for this listing.</p></div><div className="selected-event-card"><div><span>Selected event</span><strong>{selectedEvent.eventName}</strong><small>{formatDate(selectedEvent.eventDate)} · {selectedEvent.venueName}, {selectedEvent.venueCity}</small>{(sectionQuery || draft.rowLabel || seatSummary) && <small className="seat-summary">{[sectionQuery, draft.rowLabel && `Row ${draft.rowLabel}`, seatSummary].filter(Boolean).join(" · ")}</small>}</div>{!editing && !duplicating && <button className="secondary-button" type="button" onClick={() => navigate("/listings/new")}>Change event</button>}</div><form ref={formRef} className="form-grid listing-details-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void save("Active"); }}>
    <div className="field suggestion-field" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSectionOpen(false); }}><label htmlFor="listing-section">Section</label><div className="suggestion-input"><input id="listing-section" value={sectionQuery} placeholder="Search sections..." autoComplete="off" required onFocus={() => setSectionOpen(true)} onChange={(event) => { const value = event.target.value; const exact = sections.find((section) => section.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()); setSectionQuery(value); setDraft((current) => ({ ...current, sectionId: exact ? String(exact.id) : "" })); setSectionOpen(true); }} />{sectionOpen && <div className="suggestion-menu compact-suggestion-menu">{!sectionSuggestions.length && <p className="suggestion-empty">No matching sections found.</p>}{sectionSuggestions.map((section) => <button key={section.id} type="button" onClick={() => { setDraft((current) => ({ ...current, sectionId: String(section.id), rowLabel: current.sectionId === String(section.id) ? current.rowLabel : "" })); setSectionQuery(section.name); setSectionOpen(false); }}><strong>{section.name}</strong></button>)}</div>}</div></div>
    <div className="field suggestion-field" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setRowOpen(false); }}><label htmlFor="listing-row">Row</label><div className="suggestion-input"><input id="listing-row" value={draft.rowLabel} placeholder="Enter or choose a row..." autoComplete="off" required onFocus={() => setRowOpen(true)} onChange={(event) => { update("rowLabel", event.target.value); setRowOpen(true); }} />{rowOpen && rowSuggestions.length > 0 && <div className="suggestion-menu compact-suggestion-menu">{rowSuggestions.map((row) => <button key={row} type="button" onClick={() => { update("rowLabel", row); setRowOpen(false); }}><strong>{row}</strong></button>)}</div>}</div></div>
    <div className="field multi-select-field" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setRestrictionOpen(false); }}><span>Restrictions</span><button className="multi-select-trigger" type="button" aria-expanded={restrictionOpen} onClick={() => setRestrictionOpen((value) => !value)}><span className="multi-select-value">{selectedRestrictions.length ? selectedRestrictions.map((restriction) => <span className="restriction-chip" key={restriction.id}>{restriction.name}</span>) : <span className="restriction-placeholder">No restrictions</span>}</span><span className="multi-select-chevron" aria-hidden="true">⌄</span></button>{restrictionOpen && <div className="multi-select-menu">{availableRestrictions.map((restriction) => <label key={restriction.id}><input type="checkbox" checked={draft.restrictionIds.includes(restriction.id)} onChange={() => setDraft((current) => ({ ...current, restrictionIds: current.restrictionIds.includes(restriction.id) ? current.restrictionIds.filter((id) => id !== restriction.id) : [...current.restrictionIds, restriction.id] }))} /><span>{restriction.name}</span></label>)}</div>}</div>
    <label className="field"><span>Ticket Type</span><select value={draft.ticketType} onChange={(event) => update("ticketType", event.target.value)} required><option value="">Choose ticket type</option><option value="Mobile ticket transfer">Mobile ticket transfer</option><option value="PDF-Ticket">PDF-Ticket</option></select></label>
    <label className="field"><span>Lowest Seat</span><input type="number" min="1" value={draft.lowestSeat} onChange={(event) => update("lowestSeat", event.target.value)} required /></label>
    <label className="field"><span>Quantity</span><input type="number" min="1" value={draft.quantity} onChange={(event) => changeQuantity(event.target.value)} required /></label>
    {Number(draft.quantity) > 1 && <label className="field split-type-field"><span>Split Type</span><select value={draft.splitType} onChange={(event) => update("splitType", event.target.value)} required><option value="">Choose how tickets may be split</option>{availableSplitTypes(Number(draft.quantity)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>{availableSplitTypes(Number(draft.quantity)).find((option) => option.value === draft.splitType)?.description ?? "This selection controls the quantities buyers can request."}</small></label>}
    <label className="field"><span>Purchase price ($)</span><input type="number" min="0" step=".01" value={draft.purchasePrice} onChange={(event) => update("purchasePrice", event.target.value)} required /></label>
    <label className="field"><span>Asking price ($)</span><input type="number" min="0" step=".01" value={draft.askingPrice} onChange={(event) => update("askingPrice", event.target.value)} required /></label>
    <label className="field listing-notes"><span>Notes</span><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label>
    <div className="form-actions listing-detail-actions">{error && <p className="error-message">{error}</p>}<button className="secondary-button" type="button" onClick={() => navigate("/listings")}>Cancel</button><button className="secondary-button" type="button" disabled={Boolean(saving)} onClick={() => void save("Draft")}>{saving === "Draft" ? "Saving..." : "Save as Draft"}</button><button className="primary-button" disabled={Boolean(saving)}>{saving === "Active" ? "Saving..." : editing ? "Save & Activate" : "Create Listing"}</button></div>
  </form></section></div>;
}

function ListingNotFound({ message }: { message: string }) { const navigate = useNavigate(); return <div className="page-stack"><section className="panel page-panel"><div className="create-listing-state"><p className="error-message">{message}</p><button className="secondary-button" type="button" onClick={() => navigate("/listings")}>Back to listings</button></div></section></div>; }
