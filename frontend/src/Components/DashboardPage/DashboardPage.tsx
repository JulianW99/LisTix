import { useEffect } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import "./DashboardPage.css";

export function DashboardPage() {
  const { dashboard: data, loadDashboard } = useApi();
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  const stats = [
    ["Inventory", data?.ticketsInInventory ?? 0],
    ["Live listings", data?.listedTickets ?? 0],
    ["Sold tickets", data?.soldTickets ?? 0],
    ["Average ROI", `${(data?.averageRoi ?? 0).toFixed(1)}%`],
    ["Pending payouts", formatCurrency(data?.pendingPayout ?? 0)],
    ["Profit", formatCurrency(data?.profit ?? 0)],
  ];
  const trend = data?.monthlyTrend ?? [];
  const maximum = Math.max(1, ...trend.map((item) => item.sales));

  return <div className="page-stack dashboard-page">
    <section className="dashboard-stats">{stats.map(([label, value]) => <article className="panel dashboard-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="panel page-panel dashboard-chart"><div className="page-header"><div><h2>Monthly sales</h2><p>Payout volume and average return by month.</p></div></div><div className="chart-bars">{trend.map((item) => <div className="chart-column" key={item.label}><div className="chart-value">{formatCurrency(item.sales)}</div><div className="chart-track"><span style={{ height: `${Math.max(4, item.sales / maximum * 100)}%` }} /></div><strong>{item.label.slice(0, 3)}</strong><small>{item.averageRoi.toFixed(1)}% ROI</small></div>)}</div></section>
    <section className="panel page-panel"><div className="page-header"><div><h2>Sales by platform</h2><p>Current distribution across connected marketplaces.</p></div></div><div className="platform-summary">{(data?.salesByPlatform ?? []).map((platform) => <div key={platform.name}><span>{platform.name}</span><strong>{platform.count}</strong></div>)}</div></section>
  </div>;
}
