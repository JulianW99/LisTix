import { Link, NavLink, useLocation } from "react-router-dom";
import type { User } from "../../types";
import "./Sidebar.css";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/listings", label: "Listings" },
  { to: "/sales", label: "Sales" },
  { to: "/payments", label: "Payments" },
  { to: "/integrations", label: "Marketplace Sync" },
];

export function Sidebar({ user }: { user: User }) {
  const location = useLocation();
  const settingsMode = location.pathname === "/settings";
  const settingsNavigation = [
    { id: "settings-account", label: "Account Details" },
    { id: "settings-payment", label: "Payment" },
    { id: "settings-payout", label: "Payout" },
    { id: "settings-connections", label: "Connections" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="sidebar-mark">L</span><div><strong>LisTix</strong><small>Operations</small></div></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {settingsMode ? settingsNavigation.map((item) => <a key={item.id} href={`#${item.id}`} className="sidebar-link">{item.label}</a>) : navigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>{item.label}</NavLink>)}
      </nav>
      {settingsMode && <Link className="sidebar-link settings-back-link" to="/dashboard">← Back to Dashboard</Link>}
      <div className="sidebar-user"><span>Signed in as</span><strong>{user.email}</strong></div>
    </aside>
  );
}
