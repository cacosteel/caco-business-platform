import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CompanyForm({ onSaved }: any) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");

  async function saveCompany() {
    if (!name) return;

    const { error } = await supabase.from("companies").insert([
      {
        name,
        country,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setCountry("");

    onSaved();
  }

  return (
    <div className="bg-white rounded-lg p-6 mb-6 shadow">

      <h2 className="text-xl font-bold mb-4">
        New Company
      </h2>

      <input
        className="border p-2 w-full mb-3"
        placeholder="Company Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-3"
        placeholder="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <button
        onClick={saveCompany}
        className="bg-orange-500 text-white px-4 py-2 rounded"
      >
        Save
      </button>

    </div>
  );
}