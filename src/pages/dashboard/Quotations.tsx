import { useQuotations } from "../../hooks/useQuotations";
import {
  createQuotation,
  deleteQuotation,
} from "../../services/quotationService";
import QuotationForm from "../../components/quotations/QuotationForm";
import QuotationTable from "../../components/quotations/QuotationTable";

export default function Quotations() {
  const { quotations, loading, refresh } = useQuotations();

  async function addQuotation(data: {
    inquiry_id: string;
    quotation_no: string;
    quotation_date: string;
    valid_until: string;
    currency: string;
    total_amount: number;
    status: string;
    notes: string;
  }) {
    await createQuotation(data);
    refresh();
  }

  async function removeQuotation(id: string) {
    await deleteQuotation(id);
    refresh();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <h1>Quotations</h1>

      <QuotationForm onSave={addQuotation} />

      <p>Total Quotations: {quotations.length}</p>

      <QuotationTable
        quotations={quotations}
        onDelete={removeQuotation}
      />
    </>
  );
}