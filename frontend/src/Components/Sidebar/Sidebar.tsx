import { NavLink } from "react-router-dom";
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
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="sidebar-mark">L</span><div><strong>LisTix</strong><small>Operations</small></div></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>{item.label}</NavLink>)}
      </nav>
      <div className="sidebar-user"><span>Signed in as</span><strong>{user.email}</strong></div>
    </aside>
  );
}
