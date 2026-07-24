import { useContacts } from "../../hooks/useContacts";
import { createContact, deleteContact } from "../../services/contactService";
import ContactForm from "../../components/contacts/ContactForm";
import ContactTable from "../../components/contacts/ContactTable";

export default function Contacts() {
  const { contacts, loading, refresh } = useContacts();

  async function addContact(data: {
    company_id: string;
    first_name: string;
    last_name: string;
    position: string;
    email: string;
    phone: string;
    mobile: string;
    notes: string;
  }) {
    await createContact(data);
    refresh();
  }

  async function removeContact(id: string) {
    await deleteContact(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Contacts</h1>

      <ContactForm onSave={addContact} />

      <p>Total Contacts: {contacts.length}</p>

      <ContactTable
        contacts={contacts}
        onDelete={removeContact}
      />
    </>
  );
}