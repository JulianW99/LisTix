import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import { formatDate } from "../../Functions/formatDate";
import type { SystemUser } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import "./UserManagementPage.css";

const identityLabel = (status: SystemUser["identityVerificationStatus"]) => ({
  not_started: "Not started", pending: "In review", verified: "Verified", rejected: "Rejected",
}[status]);

export function UserManagementPage() {
  const { systemUsers, loadSystemUsers } = useApi();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  useEffect(() => { void loadSystemUsers(); }, [loadSystemUsers]);

  const users = useMemo(() => (systemUsers ?? []).filter((user) => `${user.displayName} ${user.email}`.toLowerCase().includes(query.toLowerCase())), [query, systemUsers]);

  const columns: DataTableColumn<SystemUser>[] = [
    { key: "user", header: "User", render: (user) => <><strong>{user.displayName}</strong><small>{user.email} · since {formatDate(user.createdAt)}</small></> },
    { key: "connections", header: "Connections", render: (user) => <div className="connection-pills"><span className={user.discordConnected ? "connection-pill connected" : "connection-pill"}>Discord {user.discordConnected ? "Connected" : "Off"}</span><span className={user.tikeyConnected ? "connection-pill connected" : "connection-pill"}>Tikey {user.tikeyConnected ? "Connected" : "Off"}</span></div> },
    { key: "identity", header: "Identity", render: (user) => <span className={`system-status identity-${user.identityVerificationStatus}`}>{identityLabel(user.identityVerificationStatus)}</span> },
    { key: "activity", header: "Activity", render: (user) => <><strong>{user.onlineTickets} listings · {user.salesCount} sales</strong><small>{formatCurrency(user.onlineTicketValue)} listed value</small></> },
    { key: "revenue", header: "Revenue LTM", className: "numeric-column", render: (user) => formatCurrency(user.revenueLtm) },
    { key: "points", header: "Points", className: "numeric-column", render: (user) => <strong className={user.pointBalance < 0 ? "user-points negative" : "user-points"}>{user.pointBalance}</strong> },
    { key: "status", header: "Account", render: (user) => <span className={user.accountStatus === "active" ? "system-status ok" : "system-status action"}>{user.accountStatus}</span> },
    { key: "actions", header: <span className="visually-hidden">Actions</span>, render: (user) => <button className="system-button" type="button" onClick={() => navigate(`/system/users/${user.id}`)}>Details</button> },
  ];
  const allUsers = systemUsers ?? [];
  return <div className="system-page user-management-page">
    <section className="system-stat-grid">
      <article><span>Registered users</span><strong>{allUsers.length}</strong><small>Across all LisTix accounts</small></article>
      <article><span>ID verified</span><strong>{allUsers.filter((user) => user.identityVerificationStatus === "verified").length}</strong><small>{allUsers.filter((user) => user.identityVerificationStatus === "pending").length} currently in review</small></article>
      <article><span>Discord connected</span><strong>{allUsers.filter((user) => user.discordConnected).length}</strong><small>{allUsers.filter((user) => user.tikeyConnected).length} Tikey connections</small></article>
      <article><span>Action required</span><strong>{allUsers.filter((user) => user.status === "Action required").length}</strong><small>Support or account review</small></article>
    </section>
    <section className="system-panel system-data-panel user-management">
      <header className="system-panel-header"><div><span className="system-kicker">Accounts</span><h2>Registered users</h2><p>Connection, verification and commercial status across the platform.</p></div><label className="system-search"><span>Search users</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" /></label></header>
      <DataTable columns={columns} rows={users} rowKey={(user) => user.id} emptyMessage="No users found." />
    </section>
  </div>;
}
