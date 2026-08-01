import { Button, Group, Paper, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCompanyType, getAllCompanyTypes, setCompanyTypeActive, type CompanyTypeOption } from "../../services/companyService";

export default function CompanyTypes() {
  const [types, setTypes] = useState<CompanyTypeOption[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setTypes(await getAllCompanyTypes()); }
    catch { toast.error("Company types could not be loaded."); }
  }

  useEffect(() => { void load(); }, []);

  async function addType() {
    if (!name.trim()) return;
    setSaving(true);
    try { await createCompanyType(name); setName(""); await load(); toast.success("Company type added."); }
    catch { toast.error("This company type could not be added. It may already exist."); }
    finally { setSaving(false); }
  }

  async function toggle(type: CompanyTypeOption) {
    try { await setCompanyTypeActive(type.id, !type.is_active); await load(); }
    catch { toast.error("Company type could not be updated."); }
  }

  return <Stack gap="md">
    <div><Title order={1}>Company Types</Title><Text c="dimmed">Deactivate types instead of deleting them, so existing company records remain valid.</Text></div>
    <Paper withBorder p="md"><Group align="end"><TextInput label="New company type" placeholder="Example: Manufacturer" value={name} onChange={(event) => setName(event.currentTarget.value)} style={{ flex: 1 }} /><Button onClick={() => void addType()} loading={saving}>Add type</Button></Group></Paper>
    <Paper withBorder p="md"><Table striped><Table.Thead><Table.Tr><Table.Th>Type</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{types.map((type) => <Table.Tr key={type.id}><Table.Td>{type.name}</Table.Td><Table.Td><Switch checked={type.is_active} onChange={() => void toggle(type)} label={type.is_active ? "Active" : "Inactive"} /></Table.Td></Table.Tr>)}{types.length === 0 && <Table.Tr><Table.Td colSpan={2}>No company types found.</Table.Td></Table.Tr>}</Table.Tbody></Table></Paper>
  </Stack>;
}
