import { useState } from "react";

type Props = {
  onSave: (contact: {
    company_id: string;
    first_name: string;
    last_name: string;
    position: string;
    email: string;
    phone: string;
    mobile: string;
    notes: string;
  }) => Promise<void>;
};

export default function ContactForm({ onSave }: Props) {
  const [form, setForm] = useState({
    company_id: "",
    first_name: "",
    last_name: "",
    position: "",
    email: "",
    phone: "",
    mobile: "",
    notes: "",
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <>
      <input
        name="company_id"
        placeholder="Company ID"
        value={form.company_id}
        onChange={change}
      />

      <input
        name="first_name"
        placeholder="First Name"
        value={form.first_name}
        onChange={change}
      />

      <input
        name="last_name"
        placeholder="Last Name"
        value={form.last_name}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Contact
      </button>
    </>
  );
}