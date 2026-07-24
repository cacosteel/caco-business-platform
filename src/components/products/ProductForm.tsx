import { useState } from "react";

type Props = {
  onSave: (product: {
    code: string;
    name: string;
    category: string;
    description: string;
    unit: string;
    unit_price: number;
    currency: string;
    is_active: boolean;
  }) => Promise<void>;
};

export default function ProductForm({ onSave }: Props) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    description: "",
    unit: "PCS",
    unit_price: 0,
    currency: "USD",
    is_active: true,
  });

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === "unit_price" ? Number(value) : value,
    });
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <input
        name="code"
        placeholder="Product Code"
        value={form.code}
        onChange={change}
      />

      <input
        name="name"
        placeholder="Product Name"
        value={form.name}
        onChange={change}
      />

      <input
        name="category"
        placeholder="Category"
        value={form.category}
        onChange={change}
      />

      <button onClick={() => onSave(form)}>
        Save Product
      </button>
    </div>
  );
}