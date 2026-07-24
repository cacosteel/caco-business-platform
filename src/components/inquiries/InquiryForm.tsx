import { useState } from "react";

type Props = {
  onSave: (inquiry: {
    company_id: string;
    contact_id: string;
    inquiry_no: string;
    inquiry_date: string;
    status: string;
    notes: string;
  }) => Promise<void>;
};

export default function InquiryForm({ onSave }: Props) {
  const [form, setForm] = useState({
    company_id: "",
    contact_id: "",
    inquiry_no: "",
    inquiry_date: new Date().toISOString().substring(0, 10),
    status: "Open",
    notes: "",
  });

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
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
        name="contact_id"
        placeholder="Contact ID"
        value={form.contact_id}
        onChange={change}
      />

      <input
        name="inquiry_no"
        placeholder="Inquiry No"
        value={form.inquiry_no}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Inquiry
      </button>
    </>
  );
}