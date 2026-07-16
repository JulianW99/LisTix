import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { hasPermission } from "../../Functions/hasPermission";
import type { SystemSale } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SystemSalesPage.css";

const dateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function SystemSalesPage() {
  const { user } = useApi();
  const [sales, setSales] = useState<SystemSale[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "canceled">("all");
  const [selected, setSelected] = useState<SystemSale | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.systemSales().then((result) => setSales(result.items)).catch((requestError) => setError(requestError.message)); }, []);
  const rows = useMemo(() => sales.filter((sale) => {
    const matchesSearch = `${sale.listixSaleId} ${sale.marketplaceSaleId} ${sale.eventName} ${sale.userName} ${sale.marketplace}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "pending" && sale.status === "Pending Delivery") || (filter === "completed" && sale.status === "Completed") || (filter === "canceled" && sale.status === "Canceled");
    return matchesSearch && matchesFilter;
  }), [filter, query, sales]);
  const columns: DataTableColumn<SystemSale>[] = [
    { key: "ids", header: "Sale IDs", render: (sale) => <><strong>{sale.listixSaleId}</strong><small>{sale.marketplaceSaleId} · {sale.marketplace}</small></> },
    { key: "user", header: "Seller", render: (sale) => <><strong>{sale.userName}</strong><small>{sale.userEmail}</small></> },
    { key: "event", header: "Event", render: (sale) => <><strong>{sale.eventName}</strong><small>{formatDate(sale.eventDate)} · {sale.venue}</small></> },
    { key: "deadline", header: "Delivery deadline", render: (sale) => <span className={new Date(sale.deliveryDeadline) < new Date() && !sale.dispatchComplete ? "deadline overdue" : "deadline"}><strong>{dateTime(sale.deliveryDeadline)}</strong><small>{sale.dispatchComplete ? "Delivery completed" : new Date(sale.deliveryDeadline) < new Date() ? "Past due" : "Upcoming"}</small></span> },
    { key: "amount", header: "Sale value", className: "numeric-column", render: (sale) => <><strong>{formatCurrency(sale.grossAmount)}</strong><small>{formatCurrency(sale.userPayout)} user payout</small></> },
    { key: "points", header: "Points", className: "numeric-column", render: (sale) => sale.pointOutcome ? <strong className={sale.pointOutcome.points < 0 ? "sale-points negative" : "sale-points"}>{sale.pointOutcome.points > 0 ? "+" : ""}{sale.pointOutcome.points}</strong> : <small>{sale.pointsIfSentNow !== null ? `${sale.pointsIfSentNow > 0 ? "+" : ""}${sale.pointsIfSentNow} now` : "Pending"}</small> },
    { key: "status", header: "Status", render: (sale) => <StatusBadge status={sale.status} /> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, render: (sale) => <button className="system-button" type="button" onClick={() => setSelected(sale)}>Details</button> },
  ];
  return <div className="system-page system-sales-page">
    <section className="system-stat-grid compact">
      <article><span>Total sales</span><strong>{sales.length}</strong><small>{sales.filter((sale) => !sale.dispatchComplete).length} awaiting delivery</small></article>
      <article><span>Gross sales</span><strong>{formatCurrency(sales.reduce((sum, sale) => sum + sale.grossAmount, 0))}</strong><small>Across every marketplace</small></article>
      <article><span>Open value</span><strong>{formatCurrency(sales.filter((sale) => !sale.dispatchComplete).reduce((sum, sale) => sum + sale.grossAmount, 0))}</strong><small>Pending ticket delivery</small></article>
    </section>
    <section className="system-panel system-data-panel">
      <header className="system-panel-header"><div><span className="system-kicker">Commerce</span><h2>Platform sales</h2><p>Match Marketplace Sale IDs to LisTix records and monitor fulfilment.</p></div><label className="system-search"><span>Search sales</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sale ID, event or user" /></label></header>
      <div className="system-filter-row"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pending delivery</button><button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Completed</button><button className={filter === "canceled" ? "active" : ""} onClick={() => setFilter("canceled")}>Canceled</button><span>{rows.length} sales</span></div>
      {error && <p className="system-error">{error}</p>}
      <DataTable columns={columns} rows={rows} rowKey={(sale) => sale.databaseId} emptyMessage="No sales match this view." />
    </section>
    {selected && <Modal title={`Sale ${selected.listixSaleId}`} className="system-modal system-modal-wide" onClose={() => setSelected(null)}>
      <div className="system-detail-section"><h3>Reference</h3><div className="system-detail-grid"><div><span>LisTix Sale ID</span><strong>{selected.listixSaleId}</strong></div><div><span>Marketplace Sale ID</span><strong>{selected.marketplaceSaleId}</strong></div><div><span>Marketplace</span><strong>{selected.marketplace}</strong></div><div><span>Listing</span><strong>{selected.listingId}</strong></div></div></div>
      <div className="system-detail-section"><h3>Event & delivery</h3><div className="system-detail-grid"><div><span>Event</span><strong>{selected.eventName}</strong></div><div><span>Event date</span><strong>{dateTime(selected.eventDate)}</strong></div><div><span>Venue</span><strong>{selected.venue}, {selected.venueCity}</strong></div><div><span>Section / row / seats</span><strong>{selected.section} · {selected.rowLabel || "-"} · {selected.seatLabel}</strong></div><div><span>Delivery deadline</span><strong>{dateTime(selected.deliveryDeadline)}</strong></div><div><span>Status</span><strong>{selected.status}</strong></div></div></div>
      <div className="system-detail-section"><h3>Buyer & financials</h3><div className="system-detail-grid"><div><span>Buyer</span><strong>{selected.customerName}</strong></div><div><span>Buyer email</span><strong>{selected.buyerEmail || "Not provided"}</strong></div><div><span>Gross</span><strong>{formatCurrency(selected.grossAmount)}</strong></div><div><span>LisTix fee</span><strong>{formatCurrency(selected.listixFee)}</strong></div><div><span>User payout</span><strong>{formatCurrency(selected.userPayout)}</strong></div><div><span>Profit / ROI</span><strong>{formatCurrency(selected.profit)} · {selected.roi.toFixed(1)}%</strong></div></div></div>
      <div className="system-detail-section"><h3>Delivery points</h3><div className="system-detail-grid"><div><span>Current outcome</span><strong className={(selected.pointOutcome?.points ?? 0) < 0 ? "sale-points negative" : "sale-points"}>{selected.pointOutcome ? `${selected.pointOutcome.points > 0 ? "+" : ""}${selected.pointOutcome.points}` : `${(selected.pointsIfSentNow ?? 0) > 0 ? "+" : ""}${selected.pointsIfSentNow ?? 0} if sent now`}</strong></div><div><span>Cancel penalty</span><strong className="sale-points negative">-200</strong></div></div></div>
      <div className="modal-actions">{selected.status === "Pending Delivery" && hasPermission(user, "system.sales.manage") && <button className="system-button danger" type="button" onClick={async () => { if (!window.confirm(`Cancel ${selected.listixSaleId}? This applies a -200 point penalty.`)) return; try { const result = await api.cancelSystemSale(selected.databaseId); setSales((items) => items.map((item) => item.databaseId === result.item.databaseId ? result.item : item)); setSelected(result.item); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to cancel sale."); } }}>Cancel sale</button>}<button className="system-button" type="button" onClick={() => setSelected(null)}>Close</button></div>
    </Modal>}
  </div>;
}
