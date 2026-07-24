import { useInquiries } from "../../hooks/useInquiries";
import {
  createInquiry,
  deleteInquiry,
} from "../../services/inquiryService";
import InquiryForm from "../../components/inquiries/InquiryForm";
import InquiryTable from "../../components/inquiries/InquiryTable";

export default function Inquiries() {
  const { inquiries, loading, refresh } = useInquiries();

  async function addInquiry(data: {
    company_id: string;
    contact_id: string;
    inquiry_no: string;
    inquiry_date: string;
    status: string;
    notes: string;
  }) {
    await createInquiry(data);
    refresh();
  }

  async function removeInquiry(id: string) {
    await deleteInquiry(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Inquiries</h1>

      <InquiryForm onSave={addInquiry} />

      <p>Total Inquiries: {inquiries.length}</p>

      <InquiryTable
        inquiries={inquiries}
        onDelete={removeInquiry}
      />
    </>
  );
}