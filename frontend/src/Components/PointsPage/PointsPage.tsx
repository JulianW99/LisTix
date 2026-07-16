import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import type { PointSummary } from "../../types";
import "./PointsPage.css";

export function PointsPage() {
  const [data, setData] = useState<PointSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.myPoints().then(setData).catch((requestError) => setError(requestError.message)); }, []);
  return <div className="page-stack points-page">
    <section className="points-summary">
      <article className="panel"><span>Your LisTix score</span><strong className={(data?.pointBalance ?? 0) < 0 ? "negative" : ""}>{data?.pointBalance ?? 0}</strong><small>Delivery reliability points</small></article>
      <article className="panel"><span>Total paid out</span><strong>{formatCurrency(data?.totalPaidOut ?? 0)}</strong><small>Future POD assessment input</small></article>
      <article className="panel"><span>Payment on Delivery</span><strong>Not evaluated</strong><small>Eligibility thresholds will be configured later.</small></article>
    </section>
    <section className="panel page-panel"><div className="page-header"><div><h2>How points work</h2><p>Every sale is scored once. Earlier delivery earns more points; late or canceled delivery reduces your score.</p></div></div><div className="point-policy"><span><b>+100</b> 48+ hours early</span><span><b>+80</b> 24–48 hours early</span><span><b>+60</b> 12–24 hours early</span><span><b>+40</b> 4–12 hours early</span><span><b>+20</b> before deadline</span><span><b>-25</b> up to 6 hours late</span><span><b>-60</b> up to 24 hours late</span><span><b>-100</b> more than 24 hours late</span><span><b>-200</b> canceled, not delivered</span></div></section>
    <section className="panel page-panel"><div className="page-header"><div><h2>Points history</h2><p>A transparent ledger of all scored sales.</p></div></div>{error && <p className="error-message">{error}</p>}<div className="point-history">{data?.transactions.map((item) => <article key={item.id}><div><strong>{item.eventName}</strong><small>{item.orderCode} · {formatDate(item.occurredAt)}</small></div><b className={item.points < 0 ? "negative" : "positive"}>{item.points > 0 ? "+" : ""}{item.points}</b></article>)}{data && !data.transactions.length && <p className="muted">No scored sales yet.</p>}</div></section>
  </div>;
}
