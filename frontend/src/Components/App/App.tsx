import { useState, type ReactElement } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../../Context/ApiContext";
import { hasPermission } from "../../Functions/hasPermission";
import { AcceptInvitePage } from "../AcceptInvitePage/AcceptInvitePage";
import { AppLayout } from "../AppLayout/AppLayout";
import { CreateListingPage } from "../CreateListingPage/CreateListingPage";
import { DashboardPage } from "../DashboardPage/DashboardPage";
import { IntegrationsPage } from "../IntegrationsPage/IntegrationsPage";
import { LandingPage } from "../LandingPage/LandingPage";
import { ListingsPage } from "../ListingsPage/ListingsPage";
import { LoadingScreen } from "../LoadingScreen/LoadingScreen";
import { LoginPage } from "../LoginPage/LoginPage";
import { MarketplacePage } from "../MarketplacePage/MarketplacePage";
import { PaymentsPage } from "../PaymentsPage/PaymentsPage";
import { PointsPage } from "../PointsPage/PointsPage";
import { SaleDetailsPage } from "../SaleDetailsPage/SaleDetailsPage";
import { SalesPage } from "../SalesPage/SalesPage";
import { SettingsPage } from "../SettingsPage/SettingsPage";
import { SystemAdminLayout } from "../SystemAdminLayout/SystemAdminLayout";
import { SystemActionsPage } from "../SystemActionsPage/SystemActionsPage";
import { SystemListingsPage } from "../SystemListingsPage/SystemListingsPage";
import { SystemPaymentsPage } from "../SystemPaymentsPage/SystemPaymentsPage";
import { SystemSalesPage } from "../SystemSalesPage/SystemSalesPage";
import { SystemSupportPage } from "../SystemSupportPage/SystemSupportPage";
import { SystemSettingsPage } from "../SystemSettingsPage/SystemSettingsPage";
import { SystemUserDetailsPage } from "../SystemUserDetailsPage/SystemUserDetailsPage";
import { SystemVenueMapsPage } from "../SystemVenueMapsPage/SystemVenueMapsPage";
import { UserManagementPage } from "../UserManagementPage/UserManagementPage";
import { UnlistedImagePage } from "../UnlistedImagePage/UnlistedImagePage";
import "./App.css";

function App() {
  const { user, initializing, login, logout } = useApi();
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    setError("");
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.systemAccess ? "/system/users" : loggedInUser.role === "buyer" ? "/marketplace" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
      throw requestError;
    }
  };

  if (location.pathname === "/branding/jw") {
    return <UnlistedImagePage src="/branding/jw.png" alt="Julian Wehrig" title="Julian Wehrig" />;
  }
  if (location.pathname === "/branding/mail") {
    return <UnlistedImagePage src="/branding/listix-mail-logo.png" alt="LisTix mail logo" title="LisTix Mail Logo" />;
  }

  if (initializing) return <LoadingScreen />;

  if (!user) {
    return <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage error={error} onLogin={handleLogin} />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
  }

  if (user.systemAccess) {
    return <Routes><Route element={<SystemAdminLayout user={user} onLogout={logout} />}>
      <Route path="/system/users" element={hasPermission(user, "system.users.view") ? <UserManagementPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/users/:id" element={hasPermission(user, "system.users.view") ? <SystemUserDetailsPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/sales" element={hasPermission(user, "system.sales.view") ? <SystemSalesPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/listings" element={hasPermission(user, "system.listings.view") ? <SystemListingsPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/payments" element={hasPermission(user, "system.payments.view") ? <SystemPaymentsPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/actions" element={hasPermission(user, "system.actions.view") ? <SystemActionsPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/support" element={hasPermission(user, "system.support.view") ? <SystemSupportPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/maps" element={hasPermission(user, "system.maps.view") ? <SystemVenueMapsPage /> : <Navigate to="/system/settings" replace />} />
      <Route path="/system/settings" element={(hasPermission(user, "system.marketplaces.view") || hasPermission(user, "system.team.view") || hasPermission(user, "system.notifications.view")) ? <SystemSettingsPage /> : <Navigate to="/system/users" replace />} />
      <Route path="*" element={<Navigate to="/system/users" replace />} />
    </Route></Routes>;
  }

  if (user.role === "buyer") {
    return <Routes>
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="*" element={<Navigate to="/marketplace" replace />} />
    </Routes>;
  }

  const allowed = (permission: string, element: ReactElement) => hasPermission(user, permission) ? element : <Navigate to="/dashboard" replace />;
  return <Routes><Route element={<AppLayout user={user} onLogout={logout} />}>
    <Route path="/dashboard" element={allowed("dashboard.view", <DashboardPage />)} />
    <Route path="/listings" element={allowed("listings.view", <ListingsPage />)} />
    <Route path="/listings/new" element={allowed("listings.create", <CreateListingPage />)} />
    <Route path="/listings/new/:eventId" element={allowed("listings.create", <CreateListingPage />)} />
    <Route path="/listings/:listingId/edit" element={allowed("listings.edit", <CreateListingPage />)} />
    <Route path="/sales" element={allowed("sales.view", <SalesPage />)} />
    <Route path="/sales/:orderId" element={allowed("sales.view", <SaleDetailsPage />)} />
    <Route path="/payments" element={allowed("payments.view", <PaymentsPage />)} />
    <Route path="/points" element={allowed("sales.view", <PointsPage />)} />
    <Route path="/integrations" element={allowed("integrations.view", <IntegrationsPage />)} />
    <Route path="/marketplace" element={<MarketplacePage embedded />} />
    <Route path="/settings" element={allowed("settings.view", <SettingsPage />)} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Route></Routes>;
}

export default App;
