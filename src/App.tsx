import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import Companies from "./pages/dashboard/Companies";
import Contacts from "./pages/dashboard/Contacts";
import Products from "./pages/dashboard/Products";
import Users from "./pages/dashboard/Users";
import Profile from "./pages/dashboard/Profile";
import Dashboard from "./pages/dashboard/Dashboard";
import CompanyProfile from "./pages/dashboard/CompanyProfile";
import Administration from "./pages/dashboard/Administration";
import CompanyTypes from "./pages/dashboard/CompanyTypes";
import DeletionRequests from "./pages/dashboard/DeletionRequests";
import PublicResources from "./pages/dashboard/PublicResources";
import ActivityTypes from "./pages/dashboard/ActivityTypes";
import PlatformSettings from "./pages/dashboard/PlatformSettings";
import Invitations from "./pages/dashboard/Invitations";
import Invite from "./pages/Invite";
import EmailTemplates from "./pages/dashboard/EmailTemplates";
import GmailSettings from "./pages/dashboard/GmailSettings";
import ComposeEmail from "./pages/dashboard/ComposeEmail";
import SentEmails from "./pages/dashboard/SentEmails";

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

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/invite" element={<Invite />} />
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

          <Route path="email-templates" element={<EmailTemplates />} />
          <Route path="compose-email" element={<ComposeEmail />} />
          <Route path="sent-emails" element={<SentEmails />} />

          <Route
            path="products"
            element={<Products />}
          />

          <Route path="profile" element={<Profile />} />

          <Route element={<AdminRoute />}>
            <Route path="administration" element={<Administration />} />
            <Route path="company-types" element={<CompanyTypes />} />
            <Route path="deletion-requests" element={<DeletionRequests />} />
            <Route path="public-resources" element={<PublicResources />} />
            <Route path="activity-types" element={<ActivityTypes />} />
            <Route path="platform-settings" element={<PlatformSettings />} />
            <Route path="invitations" element={<Invitations />} />
            <Route path="gmail" element={<GmailSettings />} />
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
