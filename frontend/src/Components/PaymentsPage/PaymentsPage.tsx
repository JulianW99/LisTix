import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { buildPayments, type Payment } from "../../Functions/buildPayments";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { Modal } from "../Modal/Modal";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./PaymentsPage.css";

type PaymentFilter = "All" | Payment["status"];
type PaymentMenu = { payment: Payment; top: number; left: number };
const filters: PaymentFilter[] = ["All", "Paid", "Pending", "Processing"];

export function PaymentsPage() {
  const { soldOrders, loadSoldOrders } = useApi(); const orders = soldOrders ?? []; const [filter, setFilter] = useState<PaymentFilter>("All"); const [menu, setMenu] = useState<PaymentMenu | null>(null); const [details, setDetails] = useState<Payment | null>(null);
  useEffect(() => { void loadSoldOrders(); }, [loadSoldOrders]);
  useEffect(() => { if (!menu) return; const close = () => setMenu(null); document.addEventListener("pointerdown", close); document.addEventListener("scroll", close, true); return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("scroll", close, true); }; }, [menu]);
  const payments = useMemo(() => buildPayments(orders), [orders]); const rows = payments.filter((payment) => filter === "All" || payment.status === filter);
  const openMenu = (event: MouseEvent<HTMLButtonElement>, payment: Payment) => { const rect = event.currentTarget.getBoundingClientRect(); setMenu({ payment, top: rect.bottom + 4, left: Math.max(12, rect.right - 140) }); };
  const columns: DataTableColumn<Payment>[] = [
    { key: "id", header: "Payout", render: (payment) => <><strong>{payment.id}</strong><small>{payment.platform}</small></> },
    { key: "day", header: "Payout day", render: (payment) => formatDate(payment.payoutDate) },
    { key: "status", header: "Status", render: (payment) => <StatusBadge status={payment.status} /> },
    { key: "amount", header: "Gross amount", className: "numeric-column", render: (payment) => formatCurrency(payment.amount) },
    { key: "platformFees", header: "Platform fees", className: "numeric-column", render: (payment) => formatCurrency(payment.platformFees) },
    { key: "payoutFees", header: "Payout fees", className: "numeric-column", render: (payment) => formatCurrency(payment.payoutFees) },
    { key: "final", header: "Final payout", className: "numeric-column", render: (payment) => <strong>{formatCurrency(payment.finalPayout)}</strong> },
    { key: "sales", header: "Sales", className: "numeric-column", render: (payment) => payment.sales.length },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, className: "payment-actions-column", render: (payment) => <button className="payment-menu-button" type="button" aria-label={`Actions for ${payment.id}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => openMenu(event, payment)}>⋯</button> },
  ];
  return <section className="panel page-panel payments-page"><div className="page-header"><div><h2>Payouts</h2><p>Reconcile received and upcoming marketplace payouts.</p></div><span className="muted">{rows.length} payouts</span></div><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? "filter-button active" : "filter-button"} type="button" onClick={() => setFilter(item)}>{item}</button>)}</div><DataTable columns={columns} rows={rows} rowKey={(payment) => payment.id} emptyMessage="No payouts match this filter." />{menu && <div className="payment-action-menu" role="menu" style={{ top: menu.top, left: menu.left }} onPointerDown={(event) => event.stopPropagation()}><button type="button" role="menuitem" onClick={() => { setDetails(menu.payment); setMenu(null); }}>Details</button></div>}{details && <PaymentDetails payment={details} onClose={() => setDetails(null)} />}</section>;
}

function PaymentDetails({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return <Modal title={`Payment ${payment.id}`} className="modal-wide" onClose={onClose}><div className="payment-summary"><div><span>Payout</span><strong>{formatCurrency(payment.finalPayout)}</strong></div><div><span>LisTix Fee</span><strong>{formatCurrency(payment.platformFees + payment.payoutFees)}</strong></div><div><span>Payout Date</span><strong>{formatDate(payment.payoutDate)}</strong></div></div><h3 className="payment-sales-title">Included Sales</h3><div className="payment-sales-list">{payment.sales.map((sale) => <Link className="payment-sale-link" key={sale.databaseId} to={`/sales/${sale.databaseId}`} onClick={onClose}><div><strong>{sale.eventName}</strong><span>{formatDate(sale.eventDate)} · {sale.section}, row {sale.rowLabel || "-"} · {sale.seatLabel}</span><small>{sale.orderCode} · {sale.customerName}</small></div><strong>{formatCurrency(sale.payoutAmount)}</strong><span className="payment-sale-arrow" aria-hidden="true">→</span></Link>)}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Close</button></div></Modal>;
}
