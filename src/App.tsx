import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import Companies from "./pages/dashboard/Companies";
import Contacts from "./pages/dashboard/Contacts";
import Products from "./pages/dashboard/Products";
import Inquiries from "./pages/dashboard/Inquiries";
import Quotations from "./pages/dashboard/Quotations";
import QuotationForm from "./pages/dashboard/QuotationForm";
import QuotationDetail from "./pages/dashboard/QuotationDetail";

import Orders from "./pages/dashboard/Orders";
import OrderForm from "./pages/dashboard/OrderForm";
import OrderWorkspace from "./pages/dashboard/workspaces/OrderWorkspace";
import Users from "./pages/dashboard/Users";
import Profile from "./pages/dashboard/Profile";
import Dashboard from "./pages/dashboard/Dashboard";
import Documents from "./pages/dashboard/Documents";
import CompanyProfile from "./pages/dashboard/CompanyProfile";
import Administration from "./pages/dashboard/Administration";
import CompanyTypes from "./pages/dashboard/CompanyTypes";
import DeletionRequests from "./pages/dashboard/DeletionRequests";
import PublicResources from "./pages/dashboard/PublicResources";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route path="/pending-approval" element={<PendingApproval />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>

          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="companies"
            element={<Companies />}
          />

          <Route path="companies/:id" element={<CompanyProfile />} />

          <Route
            path="contacts"
            element={<Contacts />}
          />

          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="inquiries"
            element={<Inquiries />}
          />

          <Route
            path="quotations"
            element={<Quotations />}
          />

          <Route
            path="quotations/new"
            element={<QuotationForm />}
          />

          <Route
            path="quotations/:id"
            element={<QuotationDetail />}
          />

          <Route
            path="orders"
            element={<Orders />}
          />

          <Route
            path="orders/new"
            element={<OrderForm />}
          />

          <Route
            path="orders/:id"
            element={<OrderWorkspace />}
          />

          <Route path="documents" element={<Documents />} />

          <Route path="profile" element={<Profile />} />

          <Route element={<AdminRoute />}>
            <Route path="administration" element={<Administration />} />
            <Route path="company-types" element={<CompanyTypes />} />
            <Route path="deletion-requests" element={<DeletionRequests />} />
            <Route path="public-resources" element={<PublicResources />} />
            <Route path="users" element={<Users />} />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;
