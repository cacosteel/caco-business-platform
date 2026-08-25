import { useMemo, useState } from "react";
import { Button, Group, Text, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useContacts } from "../../hooks/useContacts";
import { requestDeletion } from "../../services/deletionRequestService";
import ContactForm from "../../components/contacts/ContactForm";
import ContactTable from "../../components/contacts/ContactTable";
import type { contact } from "../../types/contact";

export default function Contacts() {
  const { contacts, loading, refresh } = useContacts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<contact>();
  const companyId = searchParams.get("companyId");
  const displayedContacts = useMemo(() => companyId ? contacts.filter((contact) => contact.company_id === companyId) : contacts, [companyId, contacts]);
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this contact be deleted?");
    if (!reason) return;
    await requestDeletion("contact", id, reason);
    window.alert("Deletion request submitted for admin approval.");
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <Group justify="space-between" mb="md"><div><Title order={1}>{companyId ? "Company contacts" : "Contacts"}</Title>{companyId && <Text c="dimmed">Showing contacts registered for the selected company.</Text>}</div><Group><Button onClick={() => setOpened(true)}>Add contact</Button>{companyId && <Button variant="default" onClick={() => setSearchParams({})}>Show all contacts</Button>}</Group></Group>
    <ContactTable contacts={displayedContacts} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <ContactForm opened={opened} contact={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
