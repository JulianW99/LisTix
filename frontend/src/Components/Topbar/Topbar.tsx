import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { User } from "../../types";
import "./Topbar.css";

const titles: Record<string, string> = { dashboard: "Dashboard", listings: "Listings", sales: "Sales", payments: "Payments", points: "Points", integrations: "Marketplace Sync", marketplace: "B2B Marketplace", settings: "Profile Settings" };

export function Topbar({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname.split("/")[1]] ?? "LisTix";
  return (
    <header className="topbar">
      <div><span className="eyebrow">LisTix</span><h1>{title}</h1></div>
      <div className="profile-menu">
        <Link className="points-badge" to="/points"><span>Score</span><strong>{user.pointBalance ?? 0}</strong></Link>
        <button className="profile-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <span className="profile-avatar">{user.displayName.charAt(0).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{user.accountRole.replace("_", " ")}</small></span>
        </button>
        {open && <div className="profile-dropdown"><Link to="/settings" onClick={() => setOpen(false)}>Settings</Link><button type="button" onClick={() => void onLogout()}>Log out</button></div>}
      </div>
    </header>
  );
}
