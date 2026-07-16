import { useEffect, useState } from "react";
import { api } from "../../api";
import type { MarketplaceControls } from "../../types";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./IntegrationsPage.css";

export function IntegrationsPage() {
  const [data, setData] = useState<MarketplaceControls | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.marketplaceStatus().then(setData).catch((requestError) => setError(requestError.message)); }, []);
  return <section className="panel page-panel"><div className="page-header"><div><h2>Marketplace connections</h2><p>Global platform availability and current listing distribution.</p></div></div>{error && <p className="error-message">{error}</p>}<div className="integration-list">{data?.marketplaces.map((marketplace) => <article key={marketplace.marketplace}><div><strong>{marketplace.marketplace}</strong><p>{marketplace.enabled ? `${marketplace.liveListings} live · ${marketplace.pausedListings} paused · ${marketplace.errorListings} errors` : "Temporarily disabled by LisTix Operations. Listings are safely paused."}</p><small>{marketplace.totalListings} publications across LisTix</small></div><StatusBadge status={marketplace.enabled ? marketplace.errorListings ? "Degraded" : "Operational" : "Disabled"} /></article>)}</div></section>;
}
