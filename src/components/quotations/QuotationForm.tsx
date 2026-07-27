import { useState } from "react";

type Props = {
  onSave: (quotation: {
    inquiry_id: string;
    quotation_no: string;
    quotation_date: string;
    valid_until: string;
    currency: string;
    total_amount: number;
    status: string;
    notes: string;
  }) => Promise<void>;
};

export default function QuotationForm({ onSave }: Props) {
  const [form, setForm] = useState({
    inquiry_id: "",
    quotation_no: "",
    quotation_date: new Date().toISOString().substring(0, 10),
    valid_until: new Date().toISOString().substring(0, 10),
    currency: "USD",
    total_amount: 0,
    status: "Draft",
    notes: "",
  });

  function change(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "total_amount" ? Number(value) : value,
    });
  }

  return (
    <>
      <input
        name="inquiry_id"
        placeholder="Inquiry ID"
        value={form.inquiry_id}
        onChange={change}
      />

      <input
        name="quotation_no"
        placeholder="Quotation No"
        value={form.quotation_no}
        onChange={change}
      />

      <input
        name="total_amount"
        placeholder="Total Amount"
        type="number"
        value={form.total_amount}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Quotation
      </button>
    </>
  );
}