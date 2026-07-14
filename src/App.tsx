import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Products from "./pages/Products";
import RFQs from "./pages/RFQs";
import Documents from "./pages/Documents";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
        <Route path="/companies" element={<Companies />} />
        <Route path="/products" element={<Products />} />
        <Route path="/rfqs" element={<RFQs />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}