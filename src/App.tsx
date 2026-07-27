import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";

import DashboardHome from "./pages/dashboard/DashboardHome";
import Companies from "./pages/dashboard/Companies";
import Contacts from "./pages/dashboard/Contacts";
import Products from "./pages/dashboard/Products";
import Inquiries from "./pages/dashboard/Inquiries";
import Quotations from "./pages/dashboard/Quotations";
import Orders from "./pages/dashboard/Orders";
import Documents from "./pages/dashboard/Documents";
import Settings from "./pages/dashboard/Settings";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="companies" element={<Companies />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="products" element={<Products />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="orders" element={<Orders />} />
              <Route path="documents" element={<Documents />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;