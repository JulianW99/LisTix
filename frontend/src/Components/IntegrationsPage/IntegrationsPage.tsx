import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./IntegrationsPage.css";

const marketplaces = [
  { name: "StubHub IE", status: "Operational", lastSync: "2 min ago", detail: "Listings and sales webhook healthy." },
  { name: "Vivid Seats", status: "Degraded", lastSync: "12 min ago", detail: "Inventory updates are delayed." },
  { name: "Ticombo", status: "Operational", lastSync: "6 min ago", detail: "Listing sync queue clear." },
  { name: "Ticket Evolution", status: "Operational", lastSync: "7 min ago", detail: "Order ingestion is healthy." },
  { name: "SeatGeek", status: "Error", lastSync: "42 min ago", detail: "Transfer API returned an authentication error." },
];

export function IntegrationsPage() {
  return <section className="panel page-panel"><div className="page-header"><div><h2>Marketplace connections</h2><p>Connection health and latest inventory synchronization.</p></div></div><div className="integration-list">{marketplaces.map((marketplace) => <article key={marketplace.name}><div><strong>{marketplace.name}</strong><p>{marketplace.detail}</p><small>Last sync: {marketplace.lastSync}</small></div><StatusBadge status={marketplace.status} /></article>)}</div></section>;
}
