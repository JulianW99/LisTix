import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppLayout } from "../AppLayout/AppLayout";
import { CreateListingPage } from "../CreateListingPage/CreateListingPage";
import { DashboardPage } from "../DashboardPage/DashboardPage";
import { IntegrationsPage } from "../IntegrationsPage/IntegrationsPage";
import { ListingsPage } from "../ListingsPage/ListingsPage";
import { LoadingScreen } from "../LoadingScreen/LoadingScreen";
import { LoginPage } from "../LoginPage/LoginPage";
import { PaymentsPage } from "../PaymentsPage/PaymentsPage";
import { SalesPage } from "../SalesPage/SalesPage";
import { SaleDetailsPage } from "../SaleDetailsPage/SaleDetailsPage";
import { SettingsPage } from "../SettingsPage/SettingsPage";
import { SystemAdminLayout } from "../SystemAdminLayout/SystemAdminLayout";
import { SystemSupportPage } from "../SystemSupportPage/SystemSupportPage";
import { UserManagementPage } from "../UserManagementPage/UserManagementPage";
import { useApi } from "../../Context/ApiContext";
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
  if (!user) return <LoginPage error={error} onLogin={handleLogin} />;

  if (user.role === "system_admin") {
    return <Routes><Route element={<SystemAdminLayout user={user} onLogout={logout} />}><Route path="/system/users" element={<UserManagementPage />} /><Route path="/system/support" element={<SystemSupportPage />} /><Route path="*" element={<Navigate to="/system/users" replace />} /></Route></Routes>;
  }

  return <Routes><Route element={<AppLayout user={user} onLogout={logout} />}><Route path="/dashboard" element={<DashboardPage />} /><Route path="/listings" element={<ListingsPage />} /><Route path="/listings/new" element={<CreateListingPage />} /><Route path="/listings/new/:eventId" element={<CreateListingPage />} /><Route path="/listings/:listingId/edit" element={<CreateListingPage />} /><Route path="/sales" element={<SalesPage />} /><Route path="/sales/:orderId" element={<SaleDetailsPage />} /><Route path="/payments" element={<PaymentsPage />} /><Route path="/integrations" element={<IntegrationsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Route></Routes>;
}

export default App;
