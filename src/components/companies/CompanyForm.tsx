import { useState } from "react";

type Props = {
  onSave: (company: {
    name: string;
    short_name: string;
    company_type: string;
    country: string;
    city: string;
    address: string;
    website: string;
    email: string;
    phone: string;
    tax_number: string;
    notes: string;
    is_active: boolean;
  }) => Promise<void>;
};

export default function CompanyForm({ onSave }: Props) {
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    company_type: "Customer",
    country: "",
    city: "",
    address: "",
    website: "",
    email: "",
    phone: "",
    tax_number: "",
    notes: "",
    is_active: true,
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <input
        name="name"
        placeholder="Company Name"
        value={form.name}
        onChange={change}
      />

      <input
        name="country"
        placeholder="Country"
        value={form.country}
        onChange={change}
      />

      <input
        name="city"
        placeholder="City"
        value={form.city}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Company
      </button>
    </div>
  );
}