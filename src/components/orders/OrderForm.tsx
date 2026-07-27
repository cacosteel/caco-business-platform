import { useState } from "react";

type Props = {
  onSave: (order: {
    quotation_id: string;
    order_no: string;
    order_date: string;
    delivery_date: string;
    status: string;
    total_amount: number;
    currency: string;
    notes: string;
  }) => Promise<void>;
};

export default function OrderForm({ onSave }: Props) {
  const [form, setForm] = useState({
    quotation_id: "",
    order_no: "",
    order_date: new Date().toISOString().substring(0, 10),
    delivery_date: "",
    status: "Open",
    total_amount: 0,
    currency: "USD",
    notes: "",
  });

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "total_amount" ? Number(value) : value,
    });
  }

  return (
    <>
      <input
        name="quotation_id"
        placeholder="Quotation ID"
        value={form.quotation_id}
        onChange={change}
      />

      <input
        name="order_no"
        placeholder="Order No"
        value={form.order_no}
        onChange={change}
      />

      <input
        name="total_amount"
        type="number"
        placeholder="Total Amount"
        value={form.total_amount}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Order
      </button>
    </>
  );
}