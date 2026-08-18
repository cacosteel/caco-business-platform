import { Button, Paper, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPlatformSettings, updatePlatformSettings, type PlatformSettings as Settings } from "../../services/platformSettingsService";

const initialSettings: Omit<Settings, "id"> = { organisation_name: "", legal_name: "", email: "", phone: "", address: "", country: "", website: "" };

export default function PlatformSettings() {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getPlatformSettings().then((data) => setSettings({ organisation_name: data.organisation_name, legal_name: data.legal_name ?? "", email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "", country: data.country ?? "", website: data.website ?? "" })).catch(() => toast.error("Platform settings could not be loaded.")).finally(() => setLoading(false));
  }, []);

  function update(field: keyof typeof settings, value: string) { setSettings((current) => ({ ...current, [field]: value })); }

  async function save() {
    if (!settings.organisation_name.trim()) { toast.error("Organisation name is required."); return; }
    setSaving(true);
    try { await updatePlatformSettings(settings); toast.success("Platform profile saved."); }
    catch { toast.error("Platform settings could not be saved."); }
    finally { setSaving(false); }
  }

  if (loading) return <Text>Loading platform settings...</Text>;

  return <Paper maw={720} withBorder p="md"><Stack gap="md"><div><Title order={1}>Platform Profile</Title><Text c="dimmed">Shared organisation details for UNIBA Connect. These will be available for future document and website features.</Text></div><TextInput label="Organisation name" value={settings.organisation_name} onChange={(event) => update("organisation_name", event.currentTarget.value)} required /><TextInput label="Legal company name" value={settings.legal_name ?? ""} onChange={(event) => update("legal_name", event.currentTarget.value)} /><TextInput label="Email" type="email" value={settings.email ?? ""} onChange={(event) => update("email", event.currentTarget.value)} /><TextInput label="Phone" value={settings.phone ?? ""} onChange={(event) => update("phone", event.currentTarget.value)} /><Textarea label="Formal address" value={settings.address ?? ""} onChange={(event) => update("address", event.currentTarget.value)} minRows={3} /><TextInput label="Country" value={settings.country ?? ""} onChange={(event) => update("country", event.currentTarget.value)} /><TextInput label="Website" placeholder="https://www.uniba.com.tr" value={settings.website ?? ""} onChange={(event) => update("website", event.currentTarget.value)} /><Button onClick={() => void save()} loading={saving}>Save platform profile</Button></Stack></Paper>;
}
