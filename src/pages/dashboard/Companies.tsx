import { useCompanies } from "../../hooks/useCompanies";
import { createCompany } from "../../services/companyService";
import CompanyForm from "../../components/companies/CompanyForm";
import CompanyTable from "../../components/companies/CompanyTable";
import { deleteCompany } from "../../services/companyService";

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

async function removeCompany(id: string) {
  await deleteCompany(id);
  refresh();
}

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Companies</h1>

     <CompanyForm onSave={addCompany} />

      <p>Total Companies: {companies.length}</p>

      <CompanyTable companies={companies} onDelete={removeCompany} />
    </>
  );
}