import { useCompanies } from "../../hooks/useCompanies";
import { createCompany } from "../../services/companyService";

export default function Companies() {
  const { companies, loading, refresh } = useCompanies();

  async function addCompany() {
    await createCompany({
      name: "New Company",
      short_name: "NEW",
      company_type: "Customer",
      country: "Türkiye",
      city: "Antalya",
      address: "",
      website: "",
      email: "",
      phone: "",
      tax_number: "",
      notes: "",
      is_active: true,
    });

    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Companies</h1>

      <button onClick={addCompany}>+ Add Test Company</button>

      <p>Total Companies: {companies.length}</p>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Country</th>
            <th>City</th>
            <th>Email</th>
          </tr>
        </thead>

        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>{company.name}</td>
              <td>{company.country}</td>
              <td>{company.city}</td>
              <td>{company.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}