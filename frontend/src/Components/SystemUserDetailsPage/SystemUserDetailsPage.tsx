import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import { hasPermission } from "../../Functions/hasPermission";
import { splitTypeLabel } from "../../Functions/splitTypes";
import type { SystemListing, SystemPayment, SystemSale, SystemUser, SystemUserDetails } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import "./SystemUserDetailsPage.css";

type Tab = "overview" | "listings" | "sales" | "payments" | "purchases";

export function SystemUserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApi();
  const [details, setDetails] = useState<SystemUserDetails | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManage = hasPermission(user, "system.users.manage");
  const load = async () => {
    if (!id) return;
    try { setDetails((await api.systemUser(id)).item); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load user details."); }
  };
  useEffect(() => { void load(); }, [id]);

  const update = async (payload: { accountStatus?: SystemUser["accountStatus"]; identityVerificationStatus?: SystemUser["identityVerificationStatus"] }) => {
    if (!details) return;
    const accountStatus = payload.accountStatus ?? details.accountStatus;
    const identityVerificationStatus = payload.identityVerificationStatus ?? details.identityVerificationStatus;
    const action = accountStatus === "banned" ? "ban" : accountStatus === "suspended" ? "suspend" : "reactivate";
    if (payload.accountStatus && !window.confirm(`Are you sure you want to ${action} ${details.displayName}?`)) return;
    setBusy(true); setError("");
    try { await api.updateSystemUser(details.id, { accountStatus, identityVerificationStatus }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update this user."); }
    finally { setBusy(false); }
  };

  if (!details) return <div className="system-page system-user-detail-page"><button className="system-back-link" type="button" onClick={() => navigate("/system/users")}>← Back to users</button>{error ? <p className="system-error">{error}</p> : <div className="system-panel user-detail-loading">Loading complete user record…</div>}</div>;

  const listingColumns: DataTableColumn<SystemListing>[] = [
    { key: "listing", header: "Listing", render: (item) => <><strong>{item.listingId}</strong><small>{item.eventName}</small><small>{splitTypeLabel(item.splitType)}</small></> },
    { key: "date", header: "Event date", render: (item) => formatDate(item.eventDate) },
    { key: "seat", header: "Seats", render: (item) => `${item.section} · Row ${item.rowLabel || "—"} · ${item.seatLabel}` },
    { key: "price", header: "Asking price", className: "numeric-column", render: (item) => formatCurrency(item.askingPrice) },
    { key: "status", header: "Status", render: (item) => <StatusBadge status={item.status} /> },
  ];
  const saleColumns: DataTableColumn<SystemSale>[] = [
    { key: "sale", header: "Sale", render: (item) => <><strong>{item.listixSaleId}</strong><small>{item.marketplaceSaleId}</small></> },
    { key: "event", header: "Event", render: (item) => <><strong>{item.eventName}</strong><small>{formatDate(item.eventDate)}</small></> },
    { key: "marketplace", header: "Marketplace", render: (item) => item.marketplace },
    { key: "gross", header: "Gross", className: "numeric-column", render: (item) => formatCurrency(item.grossAmount) },
    { key: "payout", header: "User payout", className: "numeric-column", render: (item) => formatCurrency(item.userPayout) },
    { key: "status", header: "Status", render: (item) => <StatusBadge status={item.status} /> },
  ];
  const paymentColumns: DataTableColumn<SystemPayment>[] = [
    { key: "payment", header: "Payment", render: (item) => <><strong>{item.paymentId}</strong><small>{item.listixSaleId}</small></> },
    { key: "gross", header: "Gross", className: "numeric-column", render: (item) => formatCurrency(item.grossAmount) },
    { key: "fee", header: "LisTix fee", className: "numeric-column", render: (item) => formatCurrency(item.listixFee) },
    { key: "payout", header: "Payout", className: "numeric-column", render: (item) => formatCurrency(item.userPayout) },
    { key: "scheduled", header: "Scheduled", render: (item) => formatDate(item.scheduledAt) },
    { key: "status", header: "Status", render: (item) => <StatusBadge status={item.status} /> },
  ];

  return <div className="system-page system-user-detail-page">
    <button className="system-back-link" type="button" onClick={() => navigate("/system/users")}>← Back to users</button>
    <section className="system-panel user-detail-hero"><div className="user-detail-identity"><span>{details.displayName.charAt(0).toUpperCase()}</span><div><small>User #{details.id} · {details.role}</small><h2>{details.displayName}</h2><p>{details.email} · registered {formatDate(details.createdAt)}</p></div></div><div className="user-detail-actions"><span className={`account-state ${details.accountStatus}`}>{details.accountStatus}</span>{canManage && <><button type="button" disabled={busy || details.accountStatus === "active"} onClick={() => void update({ accountStatus: "active" })}>Reactivate</button><button type="button" disabled={busy || details.accountStatus === "suspended"} onClick={() => void update({ accountStatus: "suspended" })}>Suspend</button><button className="danger" type="button" disabled={busy || details.accountStatus === "banned"} onClick={() => void update({ accountStatus: "banned" })}>Ban user</button></>}</div></section>
    {error && <p className="system-error">{error}</p>}
    <section className="system-stat-grid"><article><span>Point score</span><strong className={details.pointBalance < 0 ? "stat-danger" : ""}>{details.pointBalance}</strong><small>Delivery reliability</small></article><article><span>Lifetime payout</span><strong>{formatCurrency(details.totalPaidOut)}</strong><small>{formatCurrency(details.payoutSummary.upcoming)} upcoming</small></article><article><span>Listings</span><strong>{details.listings.length}</strong><small>{details.onlineTickets} currently online</small></article><article><span>Sales</span><strong>{details.sales.length}</strong><small>{formatCurrency(details.revenueLtm)} revenue LTM</small></article></section>
    <nav className="user-detail-tabs" aria-label="User details">{(["overview", "listings", "sales", "payments", "purchases"] as Tab[]).map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}<span>{item === "listings" ? details.listings.length : item === "sales" ? details.sales.length : item === "payments" ? details.payments.length : item === "purchases" ? details.purchaseInquiries.length : ""}</span></button>)}</nav>

    {tab === "overview" && <div className="user-overview-grid"><section className="system-panel user-info-card"><header><span className="system-kicker">Personal data</span><h3>Contact & address</h3></header><dl><div><dt>Full name</dt><dd>{details.profile.displayName}</dd></div><div><dt>Email</dt><dd>{details.profile.email}</dd></div><div><dt>Address</dt><dd>{[details.profile.address.line1, details.profile.address.line2].filter(Boolean).join(", ") || "Not provided"}</dd></div><div><dt>City</dt><dd>{[details.profile.address.postalCode, details.profile.address.city].filter(Boolean).join(" ") || "Not provided"}</dd></div><div><dt>Country</dt><dd>{details.profile.address.country || "Not provided"}</dd></div><div><dt>Workspace</dt><dd>{details.account ? `${details.account.name} · ${details.account.role}` : "Buyer account"}</dd></div></dl></section><section className="system-panel user-info-card"><header><span className="system-kicker">Connections</span><h3>Verification & services</h3></header><dl><div><dt>Identity</dt><dd>{details.identityVerificationStatus}</dd></div><div><dt>Discord</dt><dd>{details.profile.connections.find((item) => item.provider === "discord")?.displayName || "Not connected"}</dd></div><div><dt>Discord ID</dt><dd>{details.profile.connections.find((item) => item.provider === "discord")?.providerUserId || "—"}</dd></div><div><dt>Tikey</dt><dd>{details.tikeyConnected ? "Connected" : "Not connected"}</dd></div></dl>{canManage && <label className="identity-control"><span>Identity verification</span><select value={details.identityVerificationStatus} disabled={busy} onChange={(event) => void update({ identityVerificationStatus: event.target.value as SystemUser["identityVerificationStatus"] })}><option value="not_started">Not started</option><option value="pending">In review</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>}</section><section className="system-panel user-info-card"><header><span className="system-kicker">Payout setup</span><h3>Financial details</h3></header><dl><div><dt>Method</dt><dd>{details.profile.payout.method || "Not provided"}</dd></div><div><dt>Account holder</dt><dd>{details.profile.payout.accountHolder || "Not provided"}</dd></div><div><dt>IBAN</dt><dd>{details.profile.payout.iban || "—"}</dd></div><div><dt>BIC</dt><dd>{details.profile.payout.bic || "—"}</dd></div><div><dt>Bank</dt><dd>{details.profile.payout.bankName || "—"}</dd></div><div><dt>Revolut</dt><dd>{details.profile.payout.revolutRevtag || "—"}</dd></div></dl></section><section className="system-panel user-info-card"><header><span className="system-kicker">Payout totals</span><h3>Commercial summary</h3></header><dl><div><dt>Paid out</dt><dd>{formatCurrency(details.payoutSummary.paid)}</dd></div><div><dt>Upcoming</dt><dd>{formatCurrency(details.payoutSummary.upcoming)}</dd></div><div><dt>LisTix fees</dt><dd>{formatCurrency(details.payoutSummary.fees)}</dd></div><div><dt>Listed inventory value</dt><dd>{formatCurrency(details.onlineTicketValue)}</dd></div><div><dt>Open support tickets</dt><dd>{details.openSupportTickets}</dd></div><div><dt>POD status</dt><dd>Not evaluated</dd></div></dl></section></div>}
    {tab === "listings" && <section className="system-panel user-record-table"><header><h3>All listings</h3><p>Complete inventory owned by this user.</p></header><DataTable columns={listingColumns} rows={details.listings} rowKey={(item) => item.databaseId} emptyMessage="No listings for this user." /></section>}
    {tab === "sales" && <section className="system-panel user-record-table"><header><h3>All sales</h3><p>LisTix and marketplace sale references.</p></header><DataTable columns={saleColumns} rows={details.sales} rowKey={(item) => item.databaseId} emptyMessage="No sales for this user." /></section>}
    {tab === "payments" && <section className="system-panel user-record-table"><header><h3>Payments & payouts</h3><p>Gross value, fees and net user payouts.</p></header><DataTable columns={paymentColumns} rows={details.payments} rowKey={(item) => item.paymentId} emptyMessage="No payments for this user." /></section>}
    {tab === "purchases" && <section className="system-panel user-record-table"><header><h3>B2B purchase requests</h3><p>Buyer-side requests and their Discord/Stripe state.</p></header><div className="purchase-records">{details.purchaseInquiries.length ? details.purchaseInquiries.map((item) => <article key={item.id}><div><strong>{item.requestCode}</strong><small>{item.eventName} · {item.listingId}</small></div><span>{item.quantity} ticket{item.quantity === 1 ? "" : "s"}</span><span>{item.stripePaymentStatus}</span><b>{item.status}</b></article>) : <p>No B2B purchase requests for this user.</p>}</div></section>}
  </div>;
}
