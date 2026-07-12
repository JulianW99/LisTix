import { useEffect } from "react";
import { useApi } from "../../Context/ApiContext";
import { formatCurrency } from "../../Functions/formatCurrency";
import type { SystemUser } from "../../types";
import { DataTable, type DataTableColumn } from "../DataTable/DataTable";
import "./UserManagementPage.css";

export function UserManagementPage() {
  const { systemUsers, loadSystemUsers } = useApi();
  useEffect(() => { void loadSystemUsers(); }, [loadSystemUsers]);
  const columns: DataTableColumn<SystemUser>[] = [
    { key: "user", header: "User", render: (user) => <><strong>{user.displayName}</strong><small>{user.email}</small></> },
    { key: "online", header: "Tickets online", className: "numeric-column", render: (user) => user.onlineTickets },
    { key: "ltm", header: "Revenue LTM", className: "numeric-column", render: (user) => formatCurrency(user.revenueLtm) },
    { key: "last", header: "Revenue last month", className: "numeric-column", render: (user) => formatCurrency(user.revenueLastMonth) },
    { key: "value", header: "Online ticket value", className: "numeric-column", render: (user) => formatCurrency(user.onlineTicketValue) },
    { key: "support", header: "Open tickets", className: "numeric-column", render: (user) => user.openSupportTickets },
    { key: "status", header: "Status", render: (user) => <span className={user.status === "OK" ? "system-status ok" : "system-status action"}>{user.status}</span> },
  ];
  return <section className="system-panel user-management"><header><div><h2>Registered users</h2><p>Commercial activity and support health across all accounts.</p></div><span>{systemUsers?.length ?? 0} users</span></header><DataTable columns={columns} rows={systemUsers ?? []} rowKey={(user) => user.id} emptyMessage="No users found." /></section>;
}
