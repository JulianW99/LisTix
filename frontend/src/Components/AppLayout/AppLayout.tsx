import { Outlet } from "react-router-dom";
import type { User } from "../../types";
import { Sidebar } from "../Sidebar/Sidebar";
import { SupportWidget } from "../SupportWidget/SupportWidget";
import { Topbar } from "../Topbar/Topbar";
import "./AppLayout.css";

type AppLayoutProps = { user: User; onLogout: () => Promise<void> };

export function AppLayout({ user, onLogout }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="app-workspace">
        <Topbar user={user} onLogout={onLogout} />
        <main className="main-frame"><Outlet /></main>
        <SupportWidget />
      </div>
    </div>
  );
}
