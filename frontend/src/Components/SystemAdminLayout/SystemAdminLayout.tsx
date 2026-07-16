import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { User } from "../../types";
import { hasPermission } from "../../Functions/hasPermission";
import "./SystemAdminLayout.css";

const navigation = [
  { to: "/system/users", label: "Users", icon: "users", permission: "system.users.view" },
  { to: "/system/sales", label: "Sales", icon: "sales", permission: "system.sales.view" },
  { to: "/system/listings", label: "Listings", icon: "listings", permission: "system.listings.view" },
  { to: "/system/payments", label: "Payments", icon: "payments", permission: "system.payments.view" },
  { to: "/system/actions", label: "Actions", icon: "actions", permission: "system.actions.view" },
  { to: "/system/support", label: "Support", icon: "support", permission: "system.support.view" },
  { to: "/system/maps", label: "Venue Maps", icon: "maps", permission: "system.maps.view" },
  { to: "/system/settings", label: "Settings", icon: "settings", permission: "system.marketplaces.view" },
];

const titles: Record<string, { eyebrow: string; title: string }> = {
  users: { eyebrow: "Platform access", title: "User Management" },
  sales: { eyebrow: "Commerce", title: "Sales Operations" },
  listings: { eyebrow: "Inventory", title: "Listing Distribution" },
  payments: { eyebrow: "Finance", title: "Payments & Fees" },
  actions: { eyebrow: "Automation", title: "Action Center" },
  support: { eyebrow: "Customer care", title: "Support Operations" },
  maps: { eyebrow: "Venue geometry", title: "Stadium Map Editor" },
  settings: { eyebrow: "Platform controls", title: "System Settings" },
};

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    sales: "M3 3v18h18M7 16l4-4 3 3 5-7",
    listings: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
    payments: "M2 7h20v10H2zM6 12h4M18 12h.01",
    actions: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    support: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z",
    maps: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15",
    settings: "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.57V20h-3v-.09a1.7 1.7 0 0 0-1.03-1.57 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 14.68a1.7 1.7 0 0 0-1.57-1.03H5v-3h.09A1.7 1.7 0 0 0 6.66 9.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 10.32 6a1.7 1.7 0 0 0 1.03-1.57V4h3v.09A1.7 1.7 0 0 0 15.4 5.66a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19 9.32a1.7 1.7 0 0 0 1.57 1.03H21v3h-.09A1.7 1.7 0 0 0 19.4 15Z",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

export function SystemAdminLayout({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "users";
  const heading = titles[section] ?? titles.users;
  return <div className="system-layout">
    <aside className="system-sidebar">
      <div className="system-brand"><span><img src="/branding/listix-icon.png" alt="" /></span><div><strong>LisTix Control</strong><small>System administration</small></div></div>
      <span className="system-nav-label">Platform</span>
      <nav aria-label="System administration">{navigation.filter((item) => hasPermission(user, item.permission)).map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "active" : ""}><NavIcon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>
      <div className="system-account"><span className="system-avatar">{user.displayName.charAt(0).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div><button type="button" onClick={() => void onLogout()} aria-label="Sign out">↗</button></div>
    </aside>
    <div className="system-workspace">
      <header className="system-topbar"><div><small>{heading.eyebrow}</small><h1>{heading.title}</h1></div><span className="system-live-indicator"><i />System online</span></header>
      <main className="system-content"><Outlet /></main>
    </div>
  </div>;
}
