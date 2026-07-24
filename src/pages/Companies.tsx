import { useCompanies } from "../../hooks/useCompanies";

export default function Companies() {
  const { companies, loading } = useCompanies();

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Companies</h1>

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