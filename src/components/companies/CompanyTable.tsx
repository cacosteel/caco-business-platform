import type { company } from "../../types/company";

type Props = {
  companies: company[];
  onDelete: (id: string) => Promise<void>;
};

export default function CompanyTable({
  companies,
  onDelete,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Country</th>
          <th>City</th>
          <th>Email</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {companies.map((company) => (
          <tr key={company.id}>
            <td>{company.name}</td>
            <td>{company.country}</td>
            <td>{company.city}</td>
            <td>{company.email}</td>
            <td>
              <button onClick={() => onDelete(company.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}