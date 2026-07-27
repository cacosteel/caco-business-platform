import { useState } from "react";

type Props = {
  onSave: (document: {
    company_id: string;
    inquiry_id: string | null;
    quotation_id: string | null;
    order_id: string | null;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
  }) => Promise<void>;
};

export default function DocumentForm({ onSave }: Props) {
  const [form, setForm] = useState({
    company_id: "",
    inquiry_id: null as string | null,
    quotation_id: null as string | null,
    order_id: null as string | null,
    file_name: "",
    file_path: "",
    file_size: 0,
    mime_type: "application/pdf",
    uploaded_at: new Date().toISOString(),
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "file_size" ? Number(value) : value,
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
        name="file_name"
        placeholder="File Name"
        value={form.file_name}
        onChange={change}
      />

      <input
        name="file_path"
        placeholder="File Path"
        value={form.file_path}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Document
      </button>
    </>
  );
}