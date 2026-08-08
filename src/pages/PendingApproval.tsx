import { Button, Paper, Text, Title } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "../services/authService";

export default function PendingApproval() {
  const { user, profile, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.approval_status === "approved") return <Navigate to="/dashboard" replace />;

  const rejected = profile?.approval_status === "rejected";
  return (
    <Paper maw={520} mx="auto" my={100} p="xl" withBorder>
      <Title order={2}>{rejected ? "Access request not approved" : "Approval pending"}</Title>
      <Text my="md">
        {rejected
          ? "Your access request was not approved. Please contact an administrator."
          : "Your account has been created. An administrator must approve it before you can enter the platform."}
      </Text>
      <Button variant="default" onClick={() => void signOut()}>Sign out</Button>
    </Paper>
  );
}
