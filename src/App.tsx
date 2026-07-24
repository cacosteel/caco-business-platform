import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Companies from "./pages/dashboard/Companies";
import Contacts from "./pages/dashboard/Contacts";
import Products from "./pages/dashboard/Products";
import Inquiries from "./pages/dashboard/Inquiries";
import Quotations from "./pages/dashboard/Quotations";
import Orders from "./pages/dashboard/Orders";
import Documents from "./pages/dashboard/Documents";
import Settings from "./pages/dashboard/Settings";

function DashboardHome() {
  return (
    <>
      <h1>Dashboard</h1>
      <p>Welcome to CACO Business Platform</p>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/companies" element={<Companies />} />
          <Route path="/dashboard/contacts" element={<Contacts />} />
          <Route path="/dashboard/products" element={<Products />} />
          <Route path="/dashboard/inquiries" element={<Inquiries />} />
          <Route path="/dashboard/quotations" element={<Quotations />} />
          <Route path="/dashboard/orders" element={<Orders />} />
          <Route path="/dashboard/documents" element={<Documents />} />
          <Route path="/dashboard/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}