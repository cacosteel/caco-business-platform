import { Paper, Stack, Table, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getSentEmails, type SentEmail } from "../../services/emailHistoryService";

export default function SentEmails() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getSentEmails().then(setEmails).catch(() => toast.error("Sent email history could not be loaded.")).finally(() => setLoading(false)); }, []);
  return <Stack gap="md"><div><Title order={1}>Sent Emails</Title><Text c="dimmed">Emails accepted by the connected UNIBA Google Workspace mailbox.</Text></div><Paper withBorder p="md">{loading ? <Text>Loading sent email history...</Text> : <Table striped><Table.Thead><Table.Tr><Table.Th>Sent</Table.Th><Table.Th>Recipient</Table.Th><Table.Th>Company</Table.Th><Table.Th>Subject</Table.Th><Table.Th>Sent by</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{emails.map((email) => <Table.Tr key={email.id}><Table.Td>{new Date(email.sent_at).toLocaleString()}</Table.Td><Table.Td>{email.company_contacts ? `${email.company_contacts.first_name} ${email.company_contacts.last_name ?? ""}` : email.recipient_email}<br /><Text size="xs" c="dimmed">{email.recipient_email}</Text></Table.Td><Table.Td>{email.companies?.name ?? "—"}</Table.Td><Table.Td>{email.subject}</Table.Td><Table.Td>{email.profiles?.full_name ?? email.profiles?.email ?? "—"}</Table.Td><Table.Td>Sent</Table.Td></Table.Tr>)}{emails.length === 0 && <Table.Tr><Table.Td colSpan={6}>No emails have been sent yet.</Table.Td></Table.Tr>}</Table.Tbody></Table>}</Paper></Stack>;
}
