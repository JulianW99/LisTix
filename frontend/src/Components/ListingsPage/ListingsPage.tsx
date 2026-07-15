import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { formatDate } from "../../Functions/formatDate";
import type { TicketItem } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./ListingsPage.css";

type ActionMenu = { ticket: TicketItem; top: number; left: number };
const formatPrice = (price: number) => `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function PriceInfo({ ticket }: { ticket: TicketItem }) {
  const prices = ticket.marketplacePrices?.length ? ticket.marketplacePrices : [{ marketplace: "Connected marketplaces", lowestPrice: null }];
  const hasLower = prices.some((price) => price.lowestPrice !== null && price.lowestPrice < ticket.askingPrice);
  return <span className={`price-info ${hasLower ? "has-lower" : ""}`} tabIndex={0} aria-label={hasLower ? "A lower listing price exists" : "Marketplace price information"}><span className="price-info-icon">i</span><span className="price-tooltip">{prices.map((price) => { const lower = price.lowestPrice !== null && price.lowestPrice < ticket.askingPrice; return <span className="price-marketplace" key={price.marketplace}><strong>{price.marketplace}</strong><span className={lower ? "price-higher" : "price-lowest"}>Your listing: {formatPrice(ticket.askingPrice)}</span>{lower && <span className="competitor-price">Lower listing: {formatPrice(price.lowestPrice!)}</span>}</span>; })}</span></span>;
}

export function ListingsPage() {
  const { tickets: cachedTickets, ticketOptions: options, loadTickets, loadTicketOptions, updateTicket, deleteTicket } = useApi();
  const navigate = useNavigate(); const location = useLocation(); const tickets = cachedTickets ?? [];
  const [menu, setMenu] = useState<ActionMenu | null>(null); const [deleteTarget, setDeleteTarget] = useState<TicketItem | null>(null); const [busyId, setBusyId] = useState<number | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const routeMessage = (location.state as { message?: string } | null)?.message ?? "";
  useEffect(() => { void loadTickets(); void loadTicketOptions(); }, [loadTicketOptions, loadTickets]);
  useEffect(() => {
    if (!menu) return; const closeMenu = () => setMenu(null); const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); };
    document.addEventListener("pointerdown", closeMenu); document.addEventListener("scroll", closeMenu, true); window.addEventListener("resize", closeMenu); document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("pointerdown", closeMenu); document.removeEventListener("scroll", closeMenu, true); window.removeEventListener("resize", closeMenu); document.removeEventListener("keydown", handleKeyDown); };
  }, [menu]);
  const listings = useMemo(() => tickets.filter((ticket) => ticket.marketplaceStatus !== "Sold").sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate)), [tickets]);
  const openMenu = (event: MouseEvent<HTMLButtonElement>, ticket: TicketItem) => { const rect = event.currentTarget.getBoundingClientRect(); setMenu((current) => current?.ticket.databaseId === ticket.databaseId ? null : { ticket, top: Math.max(12, Math.min(rect.bottom + 5, window.innerHeight - 178)), left: Math.max(12, rect.right - 160) }); };
  const changeStatus = async (ticket: TicketItem) => {
    setMenu(null); setBusyId(ticket.databaseId); setMessage(""); setError("");
    try { const nextName = ticket.marketplaceStatus === "Draft" ? "Active" : "Draft"; const status = options?.marketplaceStatuses.find((item) => item.name === nextName); if (!status) throw new Error(`${nextName} status is unavailable.`); await updateTicket(ticket.databaseId, { marketplaceStatusId: status.id }); setMessage(nextName === "Active" ? `${ticket.ticketCode} is now live on connected marketplaces.` : `${ticket.ticketCode} is now a draft.`); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update listing."); } finally { setBusyId(null); }
  };
  const confirmDelete = async () => { if (!deleteTarget) return; const ticket = deleteTarget; setBusyId(ticket.databaseId); setError(""); try { await deleteTicket(ticket.databaseId); setMessage(`${ticket.ticketCode} was deleted.`); setDeleteTarget(null); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to delete listing."); } finally { setBusyId(null); } };
  const columns: DataTableColumn<TicketItem>[] = [
    { key: "id", header: "Listing", render: (ticket) => <><strong>{ticket.ticketCode || ticket.id}</strong><small>{ticket.categoryName}</small></> },
    { key: "event", header: "Event", render: (ticket) => <><strong>{ticket.eventName}</strong><small>{ticket.venue}</small></> },
    { key: "date", header: "Event date", render: (ticket) => formatDate(ticket.eventDate) },
    { key: "seats", header: "Seats", render: (ticket) => <><strong>{ticket.section}, row {ticket.rowLabel || "-"}</strong><small>{ticket.seatLabel || `${ticket.quantity} ticket(s)`}</small></> },
    { key: "cost", header: "Purchase", className: "numeric-column", render: (ticket) => formatPrice(ticket.purchasePrice) },
    { key: "ask", header: "Asking", className: "numeric-column", render: (ticket) => <span className="asking-price"><span>{formatPrice(ticket.askingPrice)}</span><PriceInfo ticket={ticket} /></span> },
    { key: "status", header: "Status", render: (ticket) => <StatusBadge status={ticket.marketplaceStatus} /> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, className: "listing-actions-column", render: (ticket) => <button className="listing-menu-button" type="button" aria-label={`Actions for ${ticket.ticketCode}`} aria-haspopup="menu" aria-expanded={menu?.ticket.databaseId === ticket.databaseId} disabled={busyId === ticket.databaseId} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openMenu(event, ticket)}>⋯</button> },
  ];
  return <div className="page-stack"><section className="panel page-panel"><div className="page-header"><div><h2>Inventory listings</h2><p>Manage ticket inventory before marketplace distribution.</p></div><button className="primary-button" type="button" onClick={() => navigate("/listings/new")}>Create listing</button></div>{(message || routeMessage) && <p className="success-message listing-feedback">{message || routeMessage}</p>}{error && <p className="error-message listing-feedback">{error}</p>}<div className="listings-table"><DataTable columns={columns} rows={listings} rowKey={(ticket) => ticket.databaseId} emptyMessage="No active listings." /></div>{menu && <div className="listing-action-menu" role="menu" aria-label={`Actions for ${menu.ticket.ticketCode}`} style={{ top: menu.top, left: menu.left }} onPointerDown={(event) => event.stopPropagation()}><button type="button" role="menuitem" onClick={() => navigate(`/listings/${menu.ticket.databaseId}/edit`)}>Edit</button><button type="button" role="menuitem" onClick={() => void changeStatus(menu.ticket)}>{menu.ticket.marketplaceStatus === "Draft" ? "Activate" : "Draft"}</button><button type="button" role="menuitem" onClick={() => navigate(`/listings/new/${menu.ticket.eventId}?duplicate=${menu.ticket.databaseId}`)}>Duplicate</button><button className="delete-action" type="button" role="menuitem" onClick={() => { setDeleteTarget(menu.ticket); setMenu(null); }}>Delete</button></div>}</section>{deleteTarget && <Modal title="Delete listing?" onClose={() => setDeleteTarget(null)}><p className="muted">Are you sure you want to delete <strong>{deleteTarget.ticketCode}</strong>? This action cannot be undone.</p><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="danger-button" type="button" disabled={busyId === deleteTarget.databaseId} onClick={() => void confirmDelete()}>{busyId === deleteTarget.databaseId ? "Deleting..." : "Delete listing"}</button></div></Modal>}</div>;
}
