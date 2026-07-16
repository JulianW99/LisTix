import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import type { SystemPayment, SystemPaymentsData } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import "./SystemPaymentsPage.css";

export function SystemPaymentsPage() {
  const [data, setData] = useState<SystemPaymentsData | null>(null);
  const [filter, setFilter] = useState<"all" | SystemPayment["status"]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.systemPayments().then(setData).catch((requestError) => setError(requestError.message)); }, []);
  const rows = useMemo(() => (data?.items ?? []).filter((payment) => (filter === "all" || payment.status === filter) && `${payment.paymentId} ${payment.listixSaleId} ${payment.userName}`.toLowerCase().includes(query.toLowerCase())), [data, filter, query]);
  const columns: DataTableColumn<SystemPayment>[] = [
    { key: "payment", header: "Payment", render: (payment) => <><strong>{payment.paymentId}</strong><small>{payment.listixSaleId} · {payment.marketplace}</small></> },
    { key: "user", header: "Recipient", render: (payment) => <><strong>{payment.userName}</strong><small>{payment.userEmail}</small></> },
    { key: "date", header: "Payout date", render: (payment) => <><strong>{formatDate(payment.paidAt || payment.scheduledAt)}</strong><small>{payment.paidAt ? "Paid" : "Scheduled"}</small></> },
    { key: "gross", header: "Gross", className: "numeric-column", render: (payment) => formatCurrency(payment.grossAmount) },
    { key: "fee", header: `LisTix fee (${data?.stats.feePercentage ?? 8.9}%)`, className: "numeric-column", render: (payment) => <strong className="fee-amount">{formatCurrency(payment.listixFee)}</strong> },
    { key: "payout", header: "User receives", className: "numeric-column", render: (payment) => <strong>{formatCurrency(payment.userPayout)}</strong> },
    { key: "status", header: "Status", render: (payment) => <span className={`payment-status ${payment.status}`}>{payment.status}</span> },
  ];
  return <div className="system-page system-payments-page">
    <section className="system-stat-grid payments-stats"><article className="primary-stat"><span>Paid out to users</span><strong>{formatCurrency(data?.stats.paidOut ?? 0)}</strong><small>Completed platform payouts</small></article><article><span>LisTix fees retained · {data?.stats.feePercentage ?? 8.9}%</span><strong>{formatCurrency(data?.stats.feesRetained ?? 0)}</strong><small>Fees from completed payouts</small></article><article><span>Upcoming payments</span><strong>{formatCurrency(data?.stats.upcoming ?? 0)}</strong><small>Due and scheduled user payouts</small></article><article><span>Payments</span><strong>{data?.stats.totalPayments ?? 0}</strong><small>All payout records</small></article></section>
    <section className="system-panel system-data-panel">
      <header className="system-panel-header"><div><span className="system-kicker">Money movement</span><h2>User payments</h2><p>Review paid and upcoming payouts, including the retained LisTix fee.</p></div><label className="system-search"><span>Search payments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Payment, sale or user" /></label></header>
      <div className="system-filter-row"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "paid" ? "active" : ""} onClick={() => setFilter("paid")}>Paid</button><button className={filter === "upcoming" ? "active" : ""} onClick={() => setFilter("upcoming")}>Upcoming</button><button className={filter === "due" ? "active" : ""} onClick={() => setFilter("due")}>Due</button><button className={filter === "error" ? "active" : ""} onClick={() => setFilter("error")}>Error</button><span>{rows.length} payments</span></div>
      {error && <p className="system-error">{error}</p>}<DataTable columns={columns} rows={rows} rowKey={(payment) => payment.paymentId} emptyMessage="No payments match this view." />
    </section>
  </div>;
}
