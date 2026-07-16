import { useState, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
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
import { PaymentsPage } from "../PaymentsPage/PaymentsPage";
import { SaleDetailsPage } from "../SaleDetailsPage/SaleDetailsPage";
import { SalesPage } from "../SalesPage/SalesPage";
import { SettingsPage } from "../SettingsPage/SettingsPage";
import { SystemAdminLayout } from "../SystemAdminLayout/SystemAdminLayout";
import { SystemSupportPage } from "../SystemSupportPage/SystemSupportPage";
import { UserManagementPage } from "../UserManagementPage/UserManagementPage";
import "./App.css";

function App() {
  const { user, initializing, login, logout } = useApi();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    setError("");
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.role === "system_admin" ? "/system/users" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
      throw requestError;
    }
  };

  if (initializing) return <LoadingScreen />;

  if (!user) {
    return <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage error={error} onLogin={handleLogin} />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
  }

  if (user.role === "system_admin") {
    return <Routes><Route element={<SystemAdminLayout user={user} onLogout={logout} />}><Route path="/system/users" element={<UserManagementPage />} /><Route path="/system/support" element={<SystemSupportPage />} /><Route path="*" element={<Navigate to="/system/users" replace />} /></Route></Routes>;
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
    <Route path="/integrations" element={allowed("integrations.view", <IntegrationsPage />)} />
    <Route path="/settings" element={allowed("settings.view", <SettingsPage />)} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Route></Routes>;
}

export default App;
