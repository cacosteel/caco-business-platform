import { Alert, Badge, Button, Divider, Grid, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { updateProfile } from "../../services/profileService";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setJobTitle(profile?.job_title ?? "");
    setDepartment(profile?.department ?? "");
    setPhone(profile?.phone ?? "");
    setCity(profile?.city ?? "");
    setCountry(profile?.country ?? "");
    setTimeZone(profile?.time_zone ?? "");
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
        job_title: jobTitle.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        time_zone: timeZone.trim() || null,
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
    <Stack maw={760} gap="md">
      <div><Title order={1}>My profile</Title><Text c="dimmed">Keep your professional and contact details up to date.</Text></div>
      <Paper p="md" withBorder><Group justify="space-between" align="flex-start"><div><Text fw={600}>{profile?.full_name || user?.email || "Your account"}</Text><Text size="sm" c="dimmed">{user?.email}</Text></div><Badge variant="light" color="cacoBlue">Google Workspace</Badge></Group><Divider my="md" /><Grid><Grid.Col span={{ base: 12, sm: 6 }}><Text size="xs" c="dimmed">ACCESS ROLE</Text><Text size="sm" tt="capitalize">{profile?.role ?? "Member"}</Text></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><Text size="xs" c="dimmed">COMPANY ACCESS</Text><Text size="sm">{profile?.company_id ? "Assigned by an administrator" : "Not assigned"}</Text></Grid.Col></Grid></Paper>
      <Paper p="xl" withBorder>
      <form onSubmit={saveProfile}>
        <Stack>
          <div><Title order={2}>Personal details</Title><Text size="sm" c="dimmed">These details are visible where your platform profile is used.</Text></div>
          <Grid><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="First name" required value={firstName} onChange={(event) => setFirstName(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Last name" required value={lastName} onChange={(event) => setLastName(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Job title" placeholder="e.g. Sales Manager" value={jobTitle} onChange={(event) => setJobTitle(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Department" placeholder="e.g. Commercial" value={department} onChange={(event) => setDepartment(event.currentTarget.value)} /></Grid.Col></Grid>
          <Divider />
          <div><Title order={2}>Contact details</Title><Text size="sm" c="dimmed">Your Workspace email remains your sign-in address.</Text></div>
          <Grid><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Phone" type="tel" value={phone} onChange={(event) => setPhone(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Time zone" placeholder="e.g. Europe/Istanbul" value={timeZone} onChange={(event) => setTimeZone(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="City" value={city} onChange={(event) => setCity(event.currentTarget.value)} /></Grid.Col><Grid.Col span={{ base: 12, sm: 6 }}><TextInput label="Country" value={country} onChange={(event) => setCountry(event.currentTarget.value)} /></Grid.Col></Grid>
          <Group justify="flex-end"><Button type="submit" loading={savingProfile}>Save profile</Button></Group>
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
    </Stack>
  );
}
