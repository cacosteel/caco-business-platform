import type { contact } from "../../types/contact";

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
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Company</th>
          <th>Position</th>
          <th>Email</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {contacts.map((contact) => (
          <tr key={contact.id}>
            <td>{contact.first_name}</td>
            <td>{contact.last_name}</td>
            <td>{contact.companies?.name ?? "-"}</td>
            <td>{contact.position}</td>
            <td>{contact.email}</td>
            <td>
              <button onClick={() => onEdit(contact)}>Edit</button>{" "}
              <button onClick={() => onDelete(contact.id)}>
                Request deletion
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
