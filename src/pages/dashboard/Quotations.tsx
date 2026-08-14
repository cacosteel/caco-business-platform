import { useState } from "react";
import { Button, Group } from "@mantine/core";
import { useQuotations } from "../../hooks/useQuotations";
import { requestSalesDeletion } from "../../services/salesDeletionService";
import {
  completeSalesSpreadsheetImport,
  stageSalesSpreadsheetImport,
} from "../../services/spreadsheetImportAuditService";
import QuotationFormV2 from "../../components/quotations/QuotationFormV2";
import SpreadsheetImportPreview from "../../components/spreadsheets/SpreadsheetImportPreview";
import QuotationTable from "../../components/quotations/QuotationTable";
import type { quotation } from "../../types/quotation";
import PageHeader from "../../components/common/PageHeader";
import type { QuotationDraftV2 } from "../../types/quotationV2";

export default function Quotations() {
  const { quotations, loading, refresh } = useQuotations();
  const [opened, setOpened] = useState(false);
  const [importOpened, setImportOpened] = useState(false);
  const [importedDraft, setImportedDraft] = useState<QuotationDraftV2 | null>(null);
  const [importAuditId, setImportAuditId] = useState<string | null>(null);
  const [selected, setSelected] = useState<quotation>();
  const close = () => {
    setOpened(false);
    setSelected(undefined);
    setImportedDraft(null);
    setImportAuditId(null);
  };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this quotation be deleted?");
    if (!reason?.trim()) return;
    try {
      await requestSalesDeletion("quotation", id, reason);
      window.alert("Deletion request submitted for approval.");
    } catch (error) {
      console.error(error);
      window.alert("The deletion request could not be submitted.");
    }
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <PageHeader
      title="Customer Quotations"
      subtitle="Prepare and track commercial offers connected to the original client inquiry."
      action={<Group><Button variant="default" onClick={() => setImportOpened(true)}>Import Excel</Button><Button onClick={() => { setImportedDraft(null); setImportAuditId(null); setOpened(true); }}>Add quotation</Button></Group>}
    />
    <QuotationTable quotations={quotations} onEdit={(record) => { setImportedDraft(null); setImportAuditId(null); setSelected(record); setOpened(true); }} onDelete={remove} />
    <QuotationFormV2
      opened={opened}
      quotationId={selected?.id}
      initialDraft={selected ? null : importedDraft}
      onClose={close}
      onSaved={async (saved) => {
        if (importAuditId) {
          try {
            await completeSalesSpreadsheetImport(importAuditId, "quotation", saved.id);
          } catch (error) {
            console.error(error);
            window.alert("The quotation was saved, but its workbook audit record could not be finalized.");
          }
        }
        try {
          await refresh();
        } catch (error) {
          console.error(error);
          window.alert("The quotation was saved, but the list could not be refreshed. Reload the page to see it.");
        }
        close();
      }}
    />
    <SpreadsheetImportPreview
      opened={importOpened}
      expectedType="Quotation"
      onClose={() => setImportOpened(false)}
      onConfirm={async (preview, signal) => {
        const auditId = await stageSalesSpreadsheetImport(preview);
        if (signal.aborted) return;
        setImportAuditId(auditId);
        setImportedDraft(preview.quotationDraft);
        setImportOpened(false);
        setOpened(true);
      }}
    />
  </>;
}
