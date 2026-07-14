import { useEffect, useState } from "react";
import { getCompanies } from "../services/companyService";
import CompanyForm from "../components/CompanyForm";
<p>Total Companies...
<CompanyForm onSaved={loadCompanies} />

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    const data = await getCompanies();
    setCompanies(data);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Companies</h1>

      <p>Total Companies: {companies.length}</p>

      <div className="mt-6">
        {companies.map((company) => (
          <div
            key={company.id}
            className="border rounded p-4 mb-3 bg-white"
          >
            <strong>{company.name}</strong>

            <br />

            {company.country}
          </div>
        ))}
      </div>
    </div>
  );
}