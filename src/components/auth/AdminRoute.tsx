import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminRoute() {
  const { profile } = useAuth();

  return profile?.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
