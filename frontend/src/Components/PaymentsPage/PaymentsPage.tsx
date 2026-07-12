import { useEffect, useMemo, useState } from "react";
import { useApi } from "../../Context/ApiContext";
import { buildPayments, type Payment } from "../../Functions/buildPayments";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./PaymentsPage.css";

type PaymentFilter = "All" | Payment["status"];
const filters: PaymentFilter[] = ["All", "Paid", "Pending", "Processing"];

export function PaymentsPage() {
  const { soldOrders, loadSoldOrders } = useApi();
  const orders = soldOrders ?? [];
  useEffect(() => { void loadSoldOrders(); }, [loadSoldOrders]);
  const [filter, setFilter] = useState<PaymentFilter>("All");
  const payments = useMemo(() => buildPayments(orders), [orders]);
  const rows = payments.filter((payment) => filter === "All" || payment.status === filter);
  const columns: DataTableColumn<Payment>[] = [
    { key: "id", header: "Payout", render: (payment) => <><strong>{payment.id}</strong><small>{payment.platform}</small></> },
    { key: "day", header: "Payout day", render: (payment) => formatDate(payment.payoutDate) },
    { key: "status", header: "Status", render: (payment) => <StatusBadge status={payment.status} /> },
    { key: "amount", header: "Gross amount", className: "numeric-column", render: (payment) => formatCurrency(payment.amount) },
    { key: "platformFees", header: "Platform fees", className: "numeric-column", render: (payment) => formatCurrency(payment.platformFees) },
    { key: "payoutFees", header: "Payout fees", className: "numeric-column", render: (payment) => formatCurrency(payment.payoutFees) },
    { key: "final", header: "Final payout", className: "numeric-column", render: (payment) => <strong>{formatCurrency(payment.finalPayout)}</strong> },
    { key: "sales", header: "Sales", className: "numeric-column", render: (payment) => payment.sales.length },
  ];
  return <section className="panel page-panel payments-page"><div className="page-header"><div><h2>Payouts</h2><p>Reconcile received and upcoming marketplace payouts.</p></div><span className="muted">{rows.length} payouts</span></div><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? "filter-button active" : "filter-button"} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><DataTable columns={columns} rows={rows} rowKey={(payment) => payment.id} emptyMessage="No payouts match this filter." /></section>;
}
