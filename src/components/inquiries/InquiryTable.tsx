import type { inquiry } from "../../types/inquiry";

type Props = {
  inquiries: inquiry[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (inquiry: inquiry) => void;
};

export default function InquiryTable({
  inquiries,
  onDelete,
  onEdit,
}: Props) {
  return (
    <table border={1} cellPadding={8}>
      <thead>
        <tr>
          <th>Inquiry No</th>
          <th>Date</th>
          <th>Status</th>
          <th>Company</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {inquiries.map((inquiry) => (
          <tr key={inquiry.id}>
            <td>{inquiry.inquiry_no}</td>
            <td>{inquiry.inquiry_date}</td>
            <td>{inquiry.status}</td>
            <td>{inquiry.company_id}</td>
            <td>
              <button onClick={() => onEdit(inquiry)}>Edit</button>{" "}
              <button onClick={() => onDelete(inquiry.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
