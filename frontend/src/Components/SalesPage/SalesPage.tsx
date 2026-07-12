import { useEffect, useMemo, useState } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { getSoldDisplayStatus } from "../../Functions/getSoldDisplayStatus";
import type { SoldOrder } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SalesPage.css";

type Filter = "All" | "Delivered" | "Pending Delivery" | "Cancelled";
const filters: Filter[] = ["All", "Delivered", "Pending Delivery", "Cancelled"];

export function SalesPage() {
  const { soldOrders, loadSoldOrders } = useApi();
  const orders = soldOrders ?? [];
  useEffect(() => { void loadSoldOrders(); }, [loadSoldOrders]);
  const [filter, setFilter] = useState<Filter>("All");
  const rows = useMemo(() => orders.filter((order) => filter === "All" || getSoldDisplayStatus(order) === filter).sort((a, b) => Date.parse(b.soldAt) - Date.parse(a.soldAt)), [filter, orders]);
  const columns: DataTableColumn<SoldOrder>[] = [
    { key: "id", header: "Order", render: (order) => <strong>{order.orderCode || order.id}</strong> },
    { key: "event", header: "Event", render: (order) => <><strong>{order.eventName}</strong><small>{order.venueName}</small></> },
    { key: "date", header: "Event date", render: (order) => formatDate(order.eventDate) },
    { key: "seats", header: "Seats", render: (order) => <><strong>{order.section}, row {order.rowLabel || "-"}</strong><small>{order.seatLabel || `${order.quantity} ticket(s)`}</small></> },
    { key: "payout", header: "Payout", className: "numeric-column", render: (order) => formatCurrency(order.payoutAmount) },
    { key: "profit", header: "Profit / ROI", className: "numeric-column", render: (order) => <><strong className={order.profit >= 0 ? "profit-positive" : "profit-negative"}>{formatCurrency(order.profit)}</strong><small>{order.roi.toFixed(1)}%</small></> },
    { key: "platform", header: "Platform", render: (order) => order.buyerChannel },
    { key: "status", header: "Status", render: (order) => <StatusBadge status={getSoldDisplayStatus(order)} /> },
    { key: "sold", header: "Sold date", render: (order) => formatDate(order.soldAt) },
  ];
  return <section className="panel page-panel sales-page"><div className="page-header"><div><h2>Sales queue</h2><p>Track fulfilled, pending and cancelled ticket transfers.</p></div><span className="muted">{rows.length} orders</span></div><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? "filter-button active" : "filter-button"} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><DataTable columns={columns} rows={rows} rowKey={(order) => order.databaseId} emptyMessage="No sales match this filter." /></section>;
}
