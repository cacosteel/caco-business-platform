import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Group, Paper, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { useCompanies } from "../../hooks/useCompanies";
import { useContacts } from "../../hooks/useContacts";
import { requestDeletion } from "../../services/deletionRequestService";
import CompanyForm from "../../components/companies/CompanyForm";
import type { company } from "../../types/company";

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { companies, loading, refresh } = useCompanies();
  const { contacts, loading: contactsLoading } = useContacts();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<company>();
  const contactCounts = useMemo(() => contacts.reduce<Record<string, number>>((counts, contact) => {
    counts[contact.company_id] = (counts[contact.company_id] ?? 0) + 1;
    return counts;
  }, {}), [contacts]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelected(undefined);
      setOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this company be deleted?");
    if (!reason) return;
    try { await requestDeletion("company", id, reason); window.alert("Deletion request submitted for admin approval."); }
    catch (error) { console.error(error); window.alert("The deletion request could not be submitted."); }
  };

  if (loading || contactsLoading) return <p>Loading companies...</p>;
  return <Stack gap="md">
    <Group justify="space-between" mb="md"><Title order={1}>Companies</Title><Button onClick={() => setOpened(true)}>Add company</Button></Group>
    <Paper withBorder p={0}><ScrollArea><Table striped highlightOnHover withTableBorder miw={1180}>
      <Table.Thead><Table.Tr><Table.Th>Formal company name</Table.Th><Table.Th>Short name</Table.Th><Table.Th>Company type</Table.Th><Table.Th>Tax number</Table.Th><Table.Th>Country</Table.Th><Table.Th>City</Table.Th><Table.Th>Registered contacts</Table.Th><Table.Th>Telephone</Table.Th><Table.Th>Email</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>{companies.map((record) => <Table.Tr key={record.id}>
        <Table.Td><Link to={`/dashboard/companies/${record.id}`}>{record.name}</Link></Table.Td><Table.Td>{record.short_name || "—"}</Table.Td><Table.Td>{record.company_type || "—"}</Table.Td><Table.Td>{record.tax_number || record.registration_number || "—"}</Table.Td><Table.Td>{record.country || "—"}</Table.Td><Table.Td>{record.city || "—"}</Table.Td><Table.Td><Link to={`/dashboard/contacts?companyId=${record.id}`}>{contactCounts[record.id] ?? 0} contact{contactCounts[record.id] === 1 ? "" : "s"}</Link></Table.Td><Table.Td>{record.phone || "—"}</Table.Td><Table.Td>{record.email || "—"}</Table.Td>
        <Table.Td><Group gap="xs" wrap="nowrap"><Button size="xs" variant="light" onClick={() => { setSelected(record); setOpened(true); }}>Edit</Button><Button size="xs" color="red" variant="subtle" onClick={() => remove(record.id)}>Request deletion</Button></Group></Table.Td>
      </Table.Tr>)}{companies.length === 0 && <Table.Tr><Table.Td colSpan={10}><Text ta="center" c="dimmed">No companies found.</Text></Table.Td></Table.Tr>}</Table.Tbody>
    </Table></ScrollArea></Paper>
    <CompanyForm opened={opened} company={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </Stack>;
}
