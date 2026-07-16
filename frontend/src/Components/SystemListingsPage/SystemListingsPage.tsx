import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { splitTypeLabel } from "../../Functions/splitTypes";
import type { ListingPublication, SystemListing } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SystemListingsPage.css";

const PublicationPill = ({ publication }: { publication: ListingPublication }) => <span className={`publication-pill ${publication.status}${publication.platformEnabled ? "" : " platform-disabled"}`} title={!publication.platformEnabled ? "Marketplace disabled globally" : publication.errorMessage || publication.externalListingId || publication.status}><i />{publication.marketplace}</span>;

export function SystemListingsPage() {
  const [listings, setListings] = useState<SystemListing[]>([]);
  const [query, setQuery] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [selected, setSelected] = useState<SystemListing | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.systemListings().then((result) => setListings(result.items)).catch((requestError) => setError(requestError.message)); }, []);
  const rows = useMemo(() => listings.filter((listing) => {
    const matches = `${listing.listingId} ${listing.eventName} ${listing.userName}`.toLowerCase().includes(query.toLowerCase());
    return matches && (!errorsOnly || listing.publications.some((publication) => publication.status === "error"));
  }), [errorsOnly, listings, query]);
  const publicationCount = listings.reduce((sum, listing) => sum + listing.publications.length, 0);
  const errorCount = listings.reduce((sum, listing) => sum + listing.publications.filter((publication) => publication.status === "error").length, 0);
  const columns: DataTableColumn<SystemListing>[] = [
    { key: "listing", header: "Listing", render: (listing) => <><strong>{listing.listingId}</strong><small>{listing.quantity} ticket{listing.quantity === 1 ? "" : "s"}</small><StatusBadge status={listing.status} /></> },
    { key: "seller", header: "Seller", render: (listing) => <><strong>{listing.userName}</strong><small>{listing.userEmail}</small></> },
    { key: "event", header: "Event", render: (listing) => <><strong>{listing.eventName}</strong><small>{formatDate(listing.eventDate)} · {listing.venue}</small></> },
    { key: "seats", header: "Seats", render: (listing) => <><strong>{listing.section} · row {listing.rowLabel || "-"}</strong><small>{listing.seatLabel}</small></> },
    { key: "price", header: "Asking", className: "numeric-column", render: (listing) => <><strong>{formatCurrency(listing.askingPrice)}</strong><small>{formatCurrency(listing.purchasePrice)} purchase</small></> },
    { key: "live", header: "Marketplace distribution", render: (listing) => <div className="publication-pills">{listing.publications.map((publication) => <PublicationPill key={publication.id} publication={publication} />)}</div> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, render: (listing) => <button className="system-button" type="button" onClick={() => setSelected(listing)}>Details</button> },
  ];
  return <div className="system-page system-listings-page">
    <section className="system-stat-grid compact"><article><span>Total listings</span><strong>{listings.length}</strong><small>{listings.filter((listing) => listing.status === "Active" || listing.status === "Listed").length} active in LisTix</small></article><article><span>Marketplace publications</span><strong>{publicationCount}</strong><small>{publicationCount - errorCount} healthy or paused</small></article><article><span>Sync errors</span><strong className={errorCount ? "stat-danger" : ""}>{errorCount}</strong><small>Across connected marketplaces</small></article></section>
    <section className="system-panel system-data-panel">
      <header className="system-panel-header"><div><span className="system-kicker">Inventory</span><h2>Platform listings</h2><p>Inspect listing details and marketplace publication health.</p></div><label className="system-search"><span>Search listings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Listing, event or user" /></label></header>
      <div className="system-filter-row"><button className={!errorsOnly ? "active" : ""} onClick={() => setErrorsOnly(false)}>All listings</button><button className={errorsOnly ? "active" : ""} onClick={() => setErrorsOnly(true)}>Errors only</button><span>{rows.length} listings</span></div>
      {error && <p className="system-error">{error}</p>}<DataTable columns={columns} rows={rows} rowKey={(listing) => listing.databaseId} emptyMessage="No listings match this view." />
    </section>
    {selected && <Modal title={`Listing ${selected.listingId}`} className="system-modal system-modal-wide" onClose={() => setSelected(null)}>
      <div className="system-detail-grid"><div><span>Seller</span><strong>{selected.userName}</strong></div><div><span>Event</span><strong>{selected.eventName}</strong></div><div><span>Event date</span><strong>{formatDate(selected.eventDate)}</strong></div><div><span>Seats</span><strong>{selected.section} · row {selected.rowLabel || "-"} · {selected.seatLabel}</strong></div><div><span>Purchase / asking</span><strong>{formatCurrency(selected.purchasePrice)} / {formatCurrency(selected.askingPrice)}</strong></div><div><span>LisTix status</span><StatusBadge status={selected.status} /></div><div><span>Split rule</span><strong>{splitTypeLabel(selected.splitType)}</strong></div></div>
      <div className="system-detail-section"><h3>Marketplace status</h3><div className="publication-detail-grid">{selected.publications.map((publication) => <article key={publication.id} className={publication.status === "error" ? "has-error" : ""}><div><PublicationPill publication={publication} /><span>{publication.status}</span></div><strong>{publication.externalListingId || "No external ID"}</strong><small>{publication.errorMessage || (publication.lastSyncedAt ? `Last synced ${formatDate(publication.lastSyncedAt)}` : "Not synced yet")}</small></article>)}</div></div>
      <div className="modal-actions"><button className="system-button" type="button" onClick={() => setSelected(null)}>Close</button></div>
    </Modal>}
  </div>;
}
