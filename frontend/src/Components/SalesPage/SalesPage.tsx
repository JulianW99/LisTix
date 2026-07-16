import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { getSoldDisplayStatus } from "../../Functions/getSoldDisplayStatus";
import { hasPermission } from "../../Functions/hasPermission";
import type { SoldOrder } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SalesPage.css";

type Filter = "All" | "Delivered" | "Pending Delivery";
type TransferMethod = "Mobile Transfer" | "PDF-Ticket" | "Mobile Ticket Links";
const filters: Filter[] = ["All", "Delivered", "Pending Delivery"];

export function SaleDetailsContent({ order, showActor = false }: { order: SoldOrder; showActor?: boolean }) {
  return <div className="sale-details-content">
    <section><h3>Event & Tickets</h3><dl><div><dt>Event</dt><dd>{order.eventName}</dd></div><div><dt>Event date</dt><dd>{formatDate(order.eventDate)}</dd></div><div><dt>Venue</dt><dd>{order.venueName}</dd></div><div><dt>Section / Row</dt><dd>{order.section} · {order.rowLabel || "-"}</dd></div><div><dt>Seats</dt><dd>{order.seatLabel || `${order.quantity} ticket(s)`}</dd></div><div><dt>Ticket Type</dt><dd>{order.ticketType || "Not specified"}</dd></div><div><dt>Restrictions</dt><dd>{order.restrictions?.length ? order.restrictions.join(", ") : "None"}</dd></div></dl></section>
    <section><h3>Buyer</h3><dl><div><dt>Full name</dt><dd>{order.customerName}</dd></div><div><dt>Email</dt><dd>{order.buyerEmail || "Not provided"}</dd></div></dl></section>
    <section><h3>Sale & Delivery</h3><dl><div><dt>Order</dt><dd>{order.orderCode}</dd></div><div><dt>Marketplace</dt><dd>{order.buyerChannel}</dd></div><div><dt>Sale price</dt><dd>{formatCurrency(order.payoutAmount)}</dd></div><div><dt>Sold date</dt><dd>{formatDate(order.soldAt)}</dd></div><div><dt>Status</dt><dd><StatusBadge status={getSoldDisplayStatus(order)} /></dd></div>{showActor && <div><dt>Sent by</dt><dd>{order.sentBy ? `${order.sentBy}${order.sentAt ? ` · ${formatDate(order.sentAt)}` : ""}` : "Not sent yet"}</dd></div>}</dl></section>
  </div>;
}

export function SalesPage() {
  const { user, soldOrders, ticketOptions, loadSoldOrders, loadTicketOptions, completeSale } = useApi();
  const navigate = useNavigate(); const orders = soldOrders ?? []; const [filter, setFilter] = useState<Filter>("All"); const [transferOrder, setTransferOrder] = useState<SoldOrder | null>(null); const [message, setMessage] = useState("");
  const showActor = Boolean(user?.account?.multiUserEnabled);
  useEffect(() => { void loadSoldOrders(); void loadTicketOptions(); }, [loadSoldOrders, loadTicketOptions]);
  const rows = useMemo(() => orders.filter((order) => filter === "All" || getSoldDisplayStatus(order) === filter).sort((a, b) => Date.parse(b.soldAt) - Date.parse(a.soldAt)), [filter, orders]);
  const columns: DataTableColumn<SoldOrder>[] = [
    { key: "id", header: "Order", render: (order) => <strong>{order.orderCode || order.id}</strong> },
    { key: "event", header: "Event", render: (order) => <><strong>{order.eventName}</strong><small>{order.venueName}</small></> },
    { key: "date", header: "Event date", render: (order) => formatDate(order.eventDate) },
    { key: "seats", header: "Seats", render: (order) => <><strong>{order.section}, row {order.rowLabel || "-"}</strong><small>{order.seatLabel || `${order.quantity} ticket(s)`}</small></> },
    { key: "payout", header: "Payout", className: "numeric-column", render: (order) => formatCurrency(order.payoutAmount) },
    { key: "platform", header: "Platform", render: (order) => order.buyerChannel },
    { key: "status", header: "Status", render: (order) => <span className="sale-status-cell"><StatusBadge status={getSoldDisplayStatus(order)} />{showActor && order.sentBy && <small>Sent by {order.sentBy}<br />{order.sentAt ? formatDate(order.sentAt) : ""}</small>}</span> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, className: "sale-actions-column", render: (order) => <div className="sale-row-actions"><button className="secondary-button" type="button" onClick={() => navigate(`/sales/${order.databaseId}`)}>Details</button>{getSoldDisplayStatus(order) === "Pending Delivery" && hasPermission(user, "sales.fulfill") && <button className="primary-button" type="button" onClick={() => setTransferOrder(order)}>Transfer Tickets</button>}</div> },
  ];
  return <section className="panel page-panel sales-page"><div className="page-header"><div><h2>Sales queue</h2><p>Track delivered and pending ticket transfers.</p></div><span className="muted">{rows.length} orders</span></div>{message && <p className="success-message sales-feedback">{message}</p>}<div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? "filter-button active" : "filter-button"} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><DataTable columns={columns} rows={rows} rowKey={(order) => order.databaseId} emptyMessage="No sales match this filter." />{transferOrder && <TransferModal order={transferOrder} completedStatusId={ticketOptions?.dispatchStatuses.find((status) => status.name === "Completed")?.id} onClose={() => setTransferOrder(null)} onComplete={async (statusId) => { await completeSale(transferOrder.databaseId, statusId); setMessage(`${transferOrder.orderCode} marked as delivered.`); setTransferOrder(null); }} />}</section>;
}

export function TransferModal({ order, completedStatusId, onClose, onComplete }: { order: SoldOrder; completedStatusId?: number; onClose: () => void; onComplete: (statusId: number) => Promise<void> }) {
  const [method, setMethod] = useState<TransferMethod>("Mobile Transfer"); const [file, setFile] = useState<File | null>(null); const [links, setLinks] = useState([""]); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const nameParts = order.customerName.trim().split(/\s+/); const firstName = nameParts[0] || "Not provided"; const lastName = nameParts.slice(1).join(" ") || "Not provided";
  const copy = (value: string | null | undefined) => { if (value) void navigator.clipboard.writeText(value); };
  const chooseFile = (nextFile?: File) => { if (!nextFile) return; if (method === "PDF-Ticket" && nextFile.type !== "application/pdf") { setFile(null); setError("Only PDF files are allowed."); return; } setError(""); setFile(nextFile); };
  const pasteProof = (event: ClipboardEvent<HTMLDivElement>) => { const pastedFile = Array.from(event.clipboardData.files)[0]; if (pastedFile) { event.preventDefault(); chooseFile(pastedFile); } };
  const canSubmit = Boolean(completedStatusId) && (method === "Mobile Ticket Links" ? links.length > 0 && links.every((link) => link.trim()) : Boolean(file));
  const submit = async () => { if (!completedStatusId || !canSubmit) return; setSubmitting(true); setError(""); try { await onComplete(completedStatusId); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to complete transfer."); setSubmitting(false); } };
  return <Modal title="Transfer Tickets" className="modal-wide" onClose={onClose}><SaleDetailsContent order={order} /><div className="copy-details"><span><small>First name</small><strong>{firstName}</strong><button type="button" aria-label="Copy first name" onClick={() => copy(firstName)}>⧉</button></span><span><small>Last name</small><strong>{lastName}</strong><button type="button" aria-label="Copy last name" onClick={() => copy(lastName)}>⧉</button></span><span><small>Email</small><strong>{order.buyerEmail || "Not provided"}</strong><button type="button" aria-label="Copy buyer email" disabled={!order.buyerEmail} onClick={() => copy(order.buyerEmail)}>⧉</button></span></div><div className="transfer-methods">{(["Mobile Transfer", "PDF-Ticket", "Mobile Ticket Links"] as TransferMethod[]).map((item) => <button key={item} className={method === item ? "active" : ""} type="button" onClick={() => { setMethod(item); setFile(null); setError(""); }}>{item}</button>)}</div>{method !== "Mobile Ticket Links" ? <div className="upload-zone" tabIndex={0} onPaste={pasteProof}><strong>{method === "PDF-Ticket" ? "Upload PDF-Ticket" : "Upload Transfer Proof"}</strong><span>{method === "Mobile Transfer" ? "Choose a file or paste an image from the clipboard." : "Only PDF files are accepted."}</span><input type="file" accept={method === "PDF-Ticket" ? "application/pdf,.pdf" : "image/*,application/pdf"} onChange={(event) => chooseFile(event.target.files?.[0])} />{file && <small>{file.name}</small>}</div> : <div className="ticket-links"><span>Mobile ticket links</span>{links.map((link, index) => <div key={index}><input type="url" placeholder={`Ticket link ${index + 1}`} value={link} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />{links.length > 1 && <button type="button" aria-label={`Remove link ${index + 1}`} onClick={() => setLinks((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>×</button>}</div>)}<button className="secondary-button add-link-button" type="button" onClick={() => setLinks((current) => [...current, ""])}>+ Add More</button></div>}{error && <p className="error-message transfer-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" disabled={!canSubmit || submitting} onClick={() => void submit()}>{submitting ? "Submitting..." : method === "Mobile Transfer" ? "Transfer Sent" : "Submit"}</button></div></Modal>;
}
