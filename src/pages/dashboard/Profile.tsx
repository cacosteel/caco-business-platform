import { Button, Paper, Stack, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { updateProfile } from "../../services/profileService";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setEmail(user?.email ?? "");
  }, [profile, user]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      });
      if (email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        toast.success("Check your inbox to confirm the new email address.");
      }
      await refreshProfile();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper maw={560} p="xl" withBorder>
      <Title order={1} mb="md">My profile</Title>
      <form onSubmit={save}>
        <Stack>
          <TextInput label="First name" required value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
          <TextInput label="Last name" required value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
          <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          <TextInput label="Company" value={profile?.company_id ? "Your company is managed by an administrator" : ""} readOnly />
          <Button type="submit" loading={saving}>Save changes</Button>
        </Stack>
      </form>
    </Paper>
  );
}
