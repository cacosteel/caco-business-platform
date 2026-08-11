import { Alert, Button, Divider, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { updateProfile } from "../../services/profileService";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
  }, [profile, user]);

  useEffect(() => {
    const requestedEmail =
      typeof user?.new_email === "string" && user.new_email.trim()
        ? user.new_email
        : null;

    setPendingEmail(requestedEmail);
    setNewEmail(requestedEmail ?? "");
  }, [user?.email, user?.new_email]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    try {
      await updateProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const requestedEmail = newEmail.trim().toLowerCase();
    const currentEmail = user.email?.trim().toLowerCase();

    if (requestedEmail === currentEmail) {
      toast.error("Enter a different email address.");
      return;
    }

    setSavingEmail(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: requestedEmail,
      }, {
        emailRedirectTo: `${window.location.origin}/dashboard/profile`,
      });
      if (error) throw error;

      const confirmedRequest = data.user?.new_email ?? requestedEmail;
      setPendingEmail(confirmedRequest);
      setNewEmail(confirmedRequest);
      toast.success("Email change requested. Check your inbox for the confirmation link.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email could not be changed.");
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <Paper maw={560} p="xl" withBorder>
      <Title order={1} mb="md">My profile</Title>
      <form onSubmit={saveProfile}>
        <Stack>
          <TextInput label="First name" required value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
          <TextInput label="Last name" required value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
          <TextInput label="Company" value={profile?.company_id ? "Your company is managed by an administrator" : ""} readOnly />
          <Button type="submit" loading={savingProfile}>Save profile</Button>
        </Stack>
      </form>

      <Divider my="xl" />

      <Stack gap="xs" mb="md">
        <Title order={2}>Sign-in email</Title>
        <Text c="dimmed" size="sm">
          Your login email is separate from the website domain. It changes only after you follow the confirmation link sent by the authentication service.
        </Text>
      </Stack>

      {pendingEmail && (
        <Alert color="blue" mb="md" title="Email change pending">
          Confirm {pendingEmail}. Until confirmation is complete, continue signing in with {user?.email}.
        </Alert>
      )}

      <form onSubmit={changeEmail}>
        <Stack>
          <TextInput label="Current sign-in email" type="email" value={user?.email ?? ""} readOnly />
          <TextInput
            description="We will send a confirmation link before changing your login."
            label="New sign-in email"
            onChange={(event) => setNewEmail(event.currentTarget.value)}
            placeholder="name@cacogroup.com"
            required
            type="email"
            value={newEmail}
          />
          <Button
            disabled={!newEmail.trim() || newEmail.trim().toLowerCase() === user?.email?.trim().toLowerCase()}
            loading={savingEmail}
            type="submit"
          >
            Change email
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
