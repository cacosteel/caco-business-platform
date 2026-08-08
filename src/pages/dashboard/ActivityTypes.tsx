import { Button, Group, Paper, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createActivityType, getAllActivityTypes, renameActivityType, setActivityTypeActive, type ActivityTypeOption } from "../../services/activityTypeService";

export default function ActivityTypes() {
  const [types, setTypes] = useState<ActivityTypeOption[]>([]);
  const [name, setName] = useState("");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() { try { setTypes(await getAllActivityTypes()); } catch { toast.error("Activity types could not be loaded."); } }
  useEffect(() => { void load(); }, []);

  async function addType() {
    if (!name.trim()) return;
    setSaving(true);
    try { await createActivityType(name); setName(""); await load(); toast.success("Activity type added."); }
    catch { toast.error("This type could not be added. It may already exist."); }
    finally { setSaving(false); }
  }

  async function saveRename(type: ActivityTypeOption) {
    if (!editingName.trim()) return;
    try { await renameActivityType(type.code, editingName); setEditingCode(null); await load(); toast.success("Activity type renamed."); }
    catch { toast.error("The activity type could not be renamed."); }
  }

  async function toggle(type: ActivityTypeOption) {
    try { await setActivityTypeActive(type.code, !type.is_active); await load(); }
    catch { toast.error("The activity type could not be updated."); }
  }

  return <Stack gap="md">
    <div><Title order={1}>Activity Types</Title><Text c="dimmed">Add or rename options used when recording calls, emails, meetings and other communications.</Text></div>
    <Paper withBorder p="md"><Group align="end"><TextInput label="New activity type" placeholder="Example: Video call" value={name} onChange={(event) => setName(event.currentTarget.value)} style={{ flex: 1 }} /><Button onClick={() => void addType()} loading={saving}>Add type</Button></Group></Paper>
    <Paper withBorder p="md"><Table striped><Table.Thead><Table.Tr><Table.Th>Type</Table.Th><Table.Th>Code</Table.Th><Table.Th>Status</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{types.map((type) => <Table.Tr key={type.code}><Table.Td>{editingCode === type.code ? <TextInput value={editingName} onChange={(event) => setEditingName(event.currentTarget.value)} /> : type.name}</Table.Td><Table.Td>{type.code}</Table.Td><Table.Td><Switch checked={type.is_active} onChange={() => void toggle(type)} label={type.is_active ? "Active" : "Inactive"} /></Table.Td><Table.Td>{editingCode === type.code ? <Group gap="xs"><Button size="xs" onClick={() => void saveRename(type)}>Save</Button><Button size="xs" variant="default" onClick={() => setEditingCode(null)}>Cancel</Button></Group> : <Button size="xs" variant="default" onClick={() => { setEditingCode(type.code); setEditingName(type.name); }}>Rename</Button>}</Table.Td></Table.Tr>)}{types.length === 0 && <Table.Tr><Table.Td colSpan={4}>No activity types found.</Table.Td></Table.Tr>}</Table.Tbody></Table></Paper>
  </Stack>;
}
