import { Link, NavLink, useLocation } from "react-router-dom";
import type { User } from "../../types";
import { hasPermission } from "../../Functions/hasPermission";
import "./Sidebar.css";

const navigation = [
  { to: "/dashboard", label: "Dashboard", permission: "dashboard.view" },
  { to: "/listings", label: "Listings", permission: "listings.view" },
  { to: "/sales", label: "Sales", permission: "sales.view" },
  { to: "/payments", label: "Payments", permission: "payments.view" },
  { to: "/points", label: "Points", permission: "sales.view" },
  { to: "/marketplace", label: "B2B Marketplace", permission: null },
  { to: "/integrations", label: "Marketplace Sync", permission: "integrations.view" },
];

export function Sidebar({ user }: { user: User }) {
  const location = useLocation();
  const settingsMode = location.pathname === "/settings";
  const settingsNavigation = [
    { id: "settings-account", label: "Account Details" },
    { id: "settings-payment", label: "Payment" },
    { id: "settings-payout", label: "Payout" },
    { id: "settings-connections", label: "Connections" },
    ...(hasPermission(user, "team.view") ? [{ id: "settings-team", label: "Team & Access" }] : []),
    ...(hasPermission(user, "audit.view") ? [{ id: "settings-activity", label: "Activity Log" }] : []),
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="sidebar-mark"><img src="/branding/listix-icon.png" alt="" /></span><div><strong>LisTix</strong><small>Operations</small></div></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {settingsMode ? settingsNavigation.map((item) => <a key={item.id} href={`#${item.id}`} className="sidebar-link">{item.label}</a>) : navigation.filter((item) => !item.permission || hasPermission(user, item.permission)).map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>{item.label}</NavLink>)}
      </nav>
      {settingsMode && <Link className="sidebar-link settings-back-link" to="/dashboard">← Back to Dashboard</Link>}
      <div className="sidebar-user"><span>Signed in as</span><strong>{user.email}</strong></div>
    </aside>
  );
}
