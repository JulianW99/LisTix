import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import type { B2BEvent, B2BInquiry, B2BListing } from "../../types";
import { VenueMap } from "../VenueMap/VenueMap";
import "./MarketplacePage.css";

const formatEventDate = (value: string) => new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export function MarketplacePage({ embedded = false }: { embedded?: boolean }) {
  const { user, logout } = useApi();
  const [events, setEvents] = useState<B2BEvent[]>([]);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<B2BListing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<B2BInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.b2bEvents().then(({ items }) => { setEvents(items); setEventId((current) => current ?? items[0]?.id ?? null); })
      .catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const visibleEvents = useMemo(() => events.filter((event) => `${event.eventName} ${event.venue} ${event.city} ${event.category}`.toLowerCase().includes(query.toLowerCase())), [events, query]);
  const activeEvent = events.find((event) => event.id === eventId) ?? null;
  const visibleListings = activeEvent?.listings.filter((listing) => !sectionId || listing.sectionId === sectionId) ?? [];
  const selectedSectionName = activeEvent?.listings.find((listing) => listing.sectionId === sectionId)?.section ?? "";
  const totalListings = events.reduce((sum, event) => sum + event.listings.length, 0);

  const createInquiry = async (listing: B2BListing, requestedQuantity: number) => {
    setSelectedListing(listing); setQuantity(requestedQuantity); setResult(null); setSubmitting(true); setError("");
    try {
      const response = await api.createB2BInquiry({ listingId: listing.id, quantity: requestedQuantity });
      setResult(response.inquiry);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the purchase request.");
    } finally { setSubmitting(false); }
  };
  const openPurchase = (listing: B2BListing) => {
    if (!embedded) return;
    const firstQuantity = listing.allowedQuantities[0] ?? listing.quantity;
    setSelectedListing(listing); setQuantity(firstQuantity); setResult(null); setError("");
    if (listing.allowedQuantities.length === 1) void createInquiry(listing, firstQuantity);
  };
  const connectDiscord = async () => {
    try { const response = await api.startDiscordConnect(); window.location.assign(response.authorizationUrl); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to connect Discord."); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (selectedListing) void createInquiry(selectedListing, quantity); };

  return <div className={`b2b-marketplace ${embedded ? "embedded" : "standalone"}`}>
    {!embedded && <header className="b2b-nav"><Link to="/" className="b2b-brand"><img src="/branding/listix-logo-orange.png" alt="LisTix" /></Link><div><span>Verified LisTix inventory</span>{user ? <button type="button" onClick={() => void logout()}>Log out</button> : <Link to="/login">Seller or buyer login</Link>}</div></header>}
    <section className="b2b-hero">
      <div><span className="b2b-kicker">{embedded ? "LisTix B2B Marketplace" : "LisTix Ticket Marketplace"}</span><h1>Tickets ready for<br /><em>your next event.</em></h1><p>{embedded ? "Browse live LisTix inventory, choose your quantity and open a private Discord purchase ticket with our Support team." : "Browse available events and live LisTix inventory. Secure Stripe checkout will be available soon."}</p></div>
      <div className="b2b-hero-stats"><article><strong>{events.length}</strong><span>Available events</span></article><article><strong>{totalListings}</strong><span>Live listings</span></article><article><strong>{embedded ? "Private" : "Soon"}</strong><span>{embedded ? "Discord support" : "Stripe checkout"}</span></article></div>
    </section>

    <section className="b2b-discovery">
      <label className="b2b-search"><span>Find your event</span><div><i>⌕</i><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Artist, team, venue or city" /></div></label>
      {loading ? <div className="b2b-empty">Loading available inventory…</div> : visibleEvents.length === 0 ? <div className="b2b-empty">No available events match your search.</div> : <div className="b2b-event-grid">{visibleEvents.map((item) => <button key={item.id} className={item.id === activeEvent?.id ? "active" : ""} type="button" onClick={() => { setEventId(item.id); setSectionId(null); }}><span className="event-card-art"><i>{item.category.slice(0, 1)}</i><b>{item.listings.length} listing{item.listings.length === 1 ? "" : "s"}</b></span><span className="event-card-copy"><small>{formatEventDate(item.eventDate)}</small><strong>{item.eventName}</strong><span>{item.venue} · {item.city}</span></span></button>)}</div>}
    </section>

    {activeEvent && <section className="b2b-inventory">
      <header><div><span className="b2b-kicker">Selected event</span><h2>{activeEvent.eventName}</h2><p>{formatEventDate(activeEvent.eventDate)} · {activeEvent.venue}, {activeEvent.city}</p></div><span>{activeEvent.listings.length} live listing{activeEvent.listings.length === 1 ? "" : "s"}</span></header>
      <div className="b2b-inventory-layout">
        <aside className="venue-map-panel venue-map-panel-detailed"><div className="venue-map-heading"><strong>Interactive stadium map</strong><small>Select a highlighted section to filter listings</small></div>{activeEvent.venueMap ? <VenueMap layout={activeEvent.venueMap.layout} listings={activeEvent.listings} activeSectionId={sectionId} onSelectSection={setSectionId} /> : <p>No venue map is available for this event.</p>}</aside>
        <div className="b2b-listings"><div className="b2b-listing-filter"><strong>{selectedSectionName ? `${selectedSectionName} listings` : "All sections"}</strong>{sectionId && <button type="button" onClick={() => setSectionId(null)}>Clear filter</button>}</div>{visibleListings.map((listing) => <article key={listing.id}><div className="listing-section-badge"><span>{listing.section}</span><small>Section</small></div><div className="listing-seat-copy"><strong>Row {listing.rowLabel || "—"}</strong><span>Seats {listing.seatLabel || "not assigned"}</span><small>{listing.ticketType} · {listing.splitTypeLabel}</small><small>{listing.allowedQuantities.length > 1 ? `Available quantities: ${listing.allowedQuantities.join(", ")}` : `${listing.allowedQuantities[0]} ticket${listing.allowedQuantities[0] === 1 ? "" : "s"} together`}</small></div><div className="listing-price"><small>per ticket</small><strong>{formatCurrency(listing.askingPrice)}</strong></div><button className={`contact-purchase ${embedded ? "" : "disabled"}`} type="button" disabled={!embedded} title={embedded ? "Open a private Discord ticket" : "Stripe checkout is coming soon"} onClick={() => openPurchase(listing)}>{embedded ? "Contact us to purchase" : "Purchase now"} <span>→</span></button></article>)}</div>
      </div>
    </section>}

    {!embedded && <footer className="b2b-footer"><span>LisTix Ticket Marketplace</span><p>Purchase buttons remain disabled until secure Stripe checkout is connected. Browsing inventory does not create a request or charge you.</p></footer>}

    {embedded && selectedListing && activeEvent && <div className="purchase-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedListing(null); }}><section className="purchase-modal compact-purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><header><div><span className="b2b-kicker">Private purchase request</span><h2 id="purchase-title">{activeEvent.eventName}</h2><p>{selectedListing.section} · Row {selectedListing.rowLabel || "—"} · {formatCurrency(selectedListing.askingPrice)} each</p></div><button type="button" aria-label="Close" onClick={() => setSelectedListing(null)}>×</button></header>{result ? <div className="purchase-success"><span>✓</span><h3>Request {result.requestCode} created</h3>{result.discord.status === "sent" ? <><p>Your private Discord ticket is open. LisTix Support has been mentioned with the complete listing details.</p>{result.discord.channelUrl && <a href={result.discord.channelUrl} target="_blank" rel="noreferrer">Open Discord ticket →</a>}</> : <p>Your request was saved, but Discord could not open the channel: {result.discord.reason || "Support will follow up."}</p>}</div> : <form onSubmit={submit}><div className="purchase-summary"><span>{selectedListing.listingId}</span><strong>{selectedListing.section} · Row {selectedListing.rowLabel || "—"}</strong><small>{selectedListing.seatLabel} · {selectedListing.ticketType}</small><small>{selectedListing.splitTypeLabel}</small></div>{selectedListing.allowedQuantities.length > 1 && <label className="quantity-only-field"><span>Quantity</span><select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{selectedListing.allowedQuantities.map((allowed) => <option key={allowed} value={allowed}>{allowed}</option>)}</select></label>}{selectedListing.allowedQuantities.length === 1 && <p className="automatic-request-note">This listing is sold as a group of {selectedListing.allowedQuantities[0]}. Your account and connected Discord are used automatically.</p>}{error && <><p className="purchase-error">{error}</p>{error.toLowerCase().includes("discord") && <button className="connect-discord-button" type="button" onClick={() => void connectDiscord()}>Connect and verify Discord</button>}</>}{selectedListing.allowedQuantities.length > 1 && <button className="purchase-submit" disabled={submitting}>{submitting ? "Opening private ticket…" : "Open Discord purchase ticket"}</button>}{selectedListing.allowedQuantities.length === 1 && submitting && <p className="opening-ticket-note">Opening your private Discord ticket…</p>}</form>}</section></div>}
  </div>;
}
