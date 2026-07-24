import { useState } from "react";
import { createCompany } from "../services/companyService";

type CompanyFormProps = {
  onSaved: () => Promise<void> | void;
};

export default function CompanyForm({ onSaved }: CompanyFormProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveCompany() {
    if (!name.trim()) {
      alert("Company name is required.");
      return;
    }

    try {
      setSaving(true);

      await createCompany({
        name: name.trim(),
        country: country.trim(),
        company_type: companyType,
      });

      setName("");
      setCountry("");
      setCompanyType("");

      await onSaved();
    } catch (error) {
      console.error("Create company error:", error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Unknown error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4">New Company</h2>

      <input
        className="w-full border rounded p-2 mb-3"
        placeholder="Company Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="w-full border rounded p-2 mb-3"
        placeholder="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <select
        className="w-full border rounded p-2 mb-4"
        value={companyType}
        onChange={(e) => setCompanyType(e.target.value)}
      >
        <option value="">Select Company Type</option>
        <option value="Customer">Customer</option>
        <option value="Supplier">Supplier</option>
        <option value="Manufacturer">Manufacturer</option>
        <option value="Contractor">Contractor</option>
        <option value="Logistics">Logistics</option>
        <option value="Consultant">Consultant</option>
        <option value="Other">Other</option>
      </select>

      <button
        onClick={saveCompany}
        disabled={saving}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded"
      >
        {saving ? "Saving..." : "Save Company"}
      </button>
    </div>
  );
}