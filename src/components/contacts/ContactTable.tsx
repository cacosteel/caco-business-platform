import type { contact } from "../../types/contact";
import { Button, Group, Paper, ScrollArea, Table, Text } from "@mantine/core";

type Props = {
  contacts: contact[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (contact: contact) => void;
};

export default function ContactTable({
  contacts,
  onDelete,
  onEdit,
}: Props) {
  return (
    <Paper withBorder p={0}>
      <ScrollArea>
      <Table striped highlightOnHover withTableBorder miw={1120}>
      <Table.Thead><Table.Tr>
          <Table.Th>First name</Table.Th>
          <Table.Th>Last name</Table.Th>
          <Table.Th>Company</Table.Th>
          <Table.Th>Position</Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Telephone</Table.Th>
          <Table.Th>Mobile</Table.Th>
          <Table.Th>Notes</Table.Th>
          <Table.Th>Actions</Table.Th>
      </Table.Tr></Table.Thead>

      <Table.Tbody>
        {contacts.map((contact) => (
          <Table.Tr key={contact.id}>
            <Table.Td>{contact.first_name}</Table.Td>
            <Table.Td>{contact.last_name || "—"}</Table.Td>
            <Table.Td>{contact.companies?.name ?? "—"}</Table.Td>
            <Table.Td>{contact.position || "—"}</Table.Td>
            <Table.Td>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "—"}</Table.Td>
            <Table.Td>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : "—"}</Table.Td>
            <Table.Td>{contact.mobile ? <a href={`tel:${contact.mobile}`}>{contact.mobile}</a> : "—"}</Table.Td>
            <Table.Td><Text lineClamp={2} maw={220}>{contact.notes || "—"}</Text></Table.Td>
            <Table.Td><Group gap="xs" wrap="nowrap"><Button size="xs" variant="light" onClick={() => onEdit(contact)}>Edit</Button><Button size="xs" color="red" variant="subtle" onClick={() => onDelete(contact.id)}>Request deletion</Button></Group></Table.Td>
          </Table.Tr>
        ))}
        {contacts.length === 0 && <Table.Tr><Table.Td colSpan={9}><Text ta="center" c="dimmed">No contacts found.</Text></Table.Td></Table.Tr>}
      </Table.Tbody>
      </Table>
      </ScrollArea>
    </Paper>
  );
}
