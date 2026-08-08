import { useState } from "react";
import { Button, Group, Title } from "@mantine/core";
import { useContacts } from "../../hooks/useContacts";
import { requestDeletion } from "../../services/deletionRequestService";
import ContactForm from "../../components/contacts/ContactForm";
import ContactTable from "../../components/contacts/ContactTable";
import type { contact } from "../../types/contact";

export default function Contacts() {
  const { contacts, loading, refresh } = useContacts();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<contact>();
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this contact be deleted?");
    if (!reason) return;
    await requestDeletion("contact", id, reason);
    window.alert("Deletion request submitted for admin approval.");
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <Group justify="space-between" mb="md"><Title order={1}>Contacts</Title><Button onClick={() => setOpened(true)}>Add contact</Button></Group>
    <ContactTable contacts={contacts} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <ContactForm opened={opened} contact={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
