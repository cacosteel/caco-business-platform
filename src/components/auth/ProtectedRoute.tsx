import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile || profile.approval_status !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
}
