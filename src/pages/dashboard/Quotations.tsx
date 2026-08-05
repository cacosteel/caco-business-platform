import { useState } from "react";
import { Button } from "@mantine/core";
import { useQuotations } from "../../hooks/useQuotations";
import { deleteQuotation } from "../../services/quotationService";
import QuotationForm from "../../components/quotations/QuotationForm";
import QuotationTable from "../../components/quotations/QuotationTable";
import type { quotation } from "../../types/quotation";
import PageHeader from "../../components/common/PageHeader";

export default function Quotations() {
  const { quotations, loading, refresh } = useQuotations();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<quotation>();
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    if (window.confirm("Delete this quotation?")) { await deleteQuotation(id); await refresh(); }
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <PageHeader
      title="Customer Quotations"
      subtitle="Prepare and track commercial offers connected to the original client inquiry."
      action={<Button onClick={() => setOpened(true)}>Add quotation</Button>}
    />
    <QuotationTable quotations={quotations} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <QuotationForm opened={opened} quotation={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
