import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { User } from "../../types";
import "./SystemAdminLayout.css";

export function SystemAdminLayout({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const location = useLocation(); const title = location.pathname.includes("support") ? "Support Operations" : "User Management";
  return <div className="system-layout"><aside className="system-sidebar"><div className="system-brand"><span>LT</span><div><strong>LisTix Control</strong><small>System Administration</small></div></div><nav><NavLink to="/system/users" className={({ isActive }) => isActive ? "active" : ""}>User Management</NavLink><NavLink to="/system/support" className={({ isActive }) => isActive ? "active" : ""}>Support</NavLink></nav><div className="system-account"><strong>{user.displayName}</strong><small>{user.email}</small><button type="button" onClick={() => void onLogout()}>Sign out</button></div></aside><div className="system-workspace"><header className="system-topbar"><div><small>System Admin</small><h1>{title}</h1></div><span className="system-live-indicator">System online</span></header><main className="system-content"><Outlet /></main></div></div>;
}
