import { Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { acceptInvitation } from "../services/invitationService";

export default function Invite() {
  const navigate = useNavigate(); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [saving, setSaving] = useState(false);
  async function complete() { if (!firstName.trim() || !lastName.trim()) { toast.error("First and last name are required."); return; } if (password.length < 8) { toast.error("Use at least 8 characters for your password."); return; } if (password !== confirmation) { toast.error("Passwords do not match."); return; } setSaving(true); try { await acceptInvitation(firstName, lastName, password); toast.success("Your account is ready."); navigate("/dashboard", { replace: true }); } catch (error) { toast.error(error instanceof Error ? error.message : "Invitation could not be completed."); } finally { setSaving(false); } }
  return <Paper maw={480} mx="auto" mt={80} withBorder p="xl"><Stack><div><Title order={1}>Complete your invitation</Title><Text c="dimmed">Create your password and complete your profile to enter the CACO platform.</Text></div><TextInput label="First name" value={firstName} onChange={(event) => setFirstName(event.currentTarget.value)} required /><TextInput label="Last name" value={lastName} onChange={(event) => setLastName(event.currentTarget.value)} required /><PasswordInput label="Password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required /><PasswordInput label="Confirm password" value={confirmation} onChange={(event) => setConfirmation(event.currentTarget.value)} required /><Button onClick={() => void complete()} loading={saving}>Complete account</Button></Stack></Paper>;
}
