import { useQuotations } from "../hooks/useQuotations";

export default function Quotations() {
  const { quotations, loading } = useQuotations();

  if (loading) {
    return <div>Loading quotations...</div>;
  }

  return (
    <div>
      <h1>Quotations</h1>

      {quotations.length === 0 ? (
        <p>No quotations found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Quotation No</th>
              <th>Date</th>
              <th>Currency</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {quotations.map((quotation) => (
              <tr key={quotation.id}>
                <td>{quotation.quotation_no}</td>
                <td>{quotation.quotation_date}</td>
                <td>{quotation.currency}</td>
                <td>{quotation.total_amount}</td>
                <td>{quotation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}