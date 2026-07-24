import { useCompanies } from "../../hooks/useCompanies";
import { createCompany } from "../../services/companyService";
import CompanyForm from "../../components/companies/CompanyForm";

export default function Companies() {
  const { companies, loading, refresh } = useCompanies();

 async function addCompany(data: {
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
}) {
  await createCompany(data);
  refresh();
}

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Companies</h1>

     <CompanyForm onSave={addCompany} />

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