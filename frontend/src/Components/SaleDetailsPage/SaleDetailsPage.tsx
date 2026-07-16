import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { getSoldDisplayStatus } from "../../Functions/getSoldDisplayStatus";
import { hasPermission } from "../../Functions/hasPermission";
import { SaleDetailsContent, TransferModal } from "../SalesPage/SalesPage";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SaleDetailsPage.css";

export function SaleDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, soldOrders, ticketOptions, loadSoldOrders, loadTicketOptions, completeSale } = useApi();
  const [transferOpen, setTransferOpen] = useState(false);
  const [message, setMessage] = useState("");
  const databaseId = Number(orderId);
  const order = soldOrders?.find((item) => item.databaseId === databaseId);
  const showActor = Boolean(user?.account?.multiUserEnabled);

  useEffect(() => { void loadSoldOrders(); void loadTicketOptions(); }, [loadSoldOrders, loadTicketOptions]);

  if (soldOrders === null) return <section className="panel page-panel"><p className="muted sale-detail-state">Loading sale details...</p></section>;
  if (!order) return <section className="panel page-panel"><div className="sale-detail-state"><p className="error-message">Sale not found.</p><button className="secondary-button" type="button" onClick={() => navigate("/sales")}>Back to sales</button></div></section>;

  const status = getSoldDisplayStatus(order);
  const completedStatusId = ticketOptions?.dispatchStatuses.find((item) => item.name === "Completed")?.id;

  return <div className="page-stack sale-details-page">
    <section className="panel page-panel">
      <div className="sale-detail-header"><div><button className="sale-back-button" type="button" onClick={() => navigate("/sales")}>← Back to sales</button><p className="eyebrow">Sale details</p><h2>{order.eventName}</h2><span>{order.orderCode}</span></div><StatusBadge status={status} /></div>
      {message && <p className="success-message sale-detail-feedback">{message}</p>}
      <SaleDetailsContent order={order} showActor={showActor} />
      <div className="sale-detail-actions"><button className="secondary-button" type="button" onClick={() => navigate("/sales")}>Back to sales</button>{status === "Pending Delivery" && hasPermission(user, "sales.fulfill") && <button className="primary-button" type="button" onClick={() => setTransferOpen(true)}>Transfer Tickets</button>}</div>
    </section>
    {transferOpen && <TransferModal order={order} completedStatusId={completedStatusId} onClose={() => setTransferOpen(false)} onComplete={async (statusId) => { await completeSale(order.databaseId, statusId); setTransferOpen(false); setMessage(`${order.orderCode} marked as delivered.`); }} />}
  </div>;
}
