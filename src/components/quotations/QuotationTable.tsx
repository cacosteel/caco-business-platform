import type { quotation } from "../../types/quotation";

type Props = {
  quotations: quotation[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (quotation: quotation) => void;
};

export default function QuotationTable({
  quotations,
  onDelete,
  onEdit,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Quotation No</th>
          <th>Date</th>
          <th>Valid Until</th>
          <th>Status</th>
          <th>Total</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {quotations.map((quotation) => (
          <tr key={quotation.id}>
            <td>{quotation.quotation_no}</td>
            <td>{quotation.quotation_date}</td>
            <td>{quotation.valid_until}</td>
            <td>{quotation.status}</td>
            <td>
              {quotation.total_amount} {quotation.currency}
            </td>
            <td>
              <button onClick={() => onEdit(quotation)}>Edit</button>{" "}
              <button onClick={() => onDelete(quotation.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
