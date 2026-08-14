import { useState } from "react";
import { Button, Group } from "@mantine/core";
import { useInquiries } from "../../hooks/useInquiries";
import { requestSalesDeletion } from "../../services/salesDeletionService";
import {
  completeSalesSpreadsheetImport,
  stageSalesSpreadsheetImport,
} from "../../services/spreadsheetImportAuditService";
import InquiryFormV2 from "../../components/inquiries/InquiryFormV2";
import SpreadsheetImportPreview from "../../components/spreadsheets/SpreadsheetImportPreview";
import InquiryTable from "../../components/inquiries/InquiryTable";
import type { inquiry } from "../../types/inquiry";
import PageHeader from "../../components/common/PageHeader";
import type { InquiryV2Draft } from "../../types/inquiryV2";

export default function Inquiries() {
  const { inquiries, loading, refresh } = useInquiries();
  const [opened, setOpened] = useState(false);
  const [importOpened, setImportOpened] = useState(false);
  const [importedDraft, setImportedDraft] = useState<InquiryV2Draft | null>(null);
  const [importAuditId, setImportAuditId] = useState<string | null>(null);
  const [selected, setSelected] = useState<inquiry>();
  const close = () => {
    setOpened(false);
    setSelected(undefined);
    setImportedDraft(null);
    setImportAuditId(null);
  };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this inquiry be deleted?");
    if (!reason?.trim()) return;
    try {
      await requestSalesDeletion("inquiry", id, reason);
      window.alert("Deletion request submitted for approval.");
    } catch (error) {
      console.error(error);
      window.alert("The deletion request could not be submitted.");
    }
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <PageHeader
      title="Client Inquiries"
      subtitle="Record customer requirements and use them as the source for supplier requests and quotations."
      action={<Group><Button variant="default" onClick={() => setImportOpened(true)}>Import Excel</Button><Button onClick={() => { setImportedDraft(null); setImportAuditId(null); setOpened(true); }}>Add inquiry</Button></Group>}
    />
    <InquiryTable inquiries={inquiries} onEdit={(record) => { setImportedDraft(null); setImportAuditId(null); setSelected(record); setOpened(true); }} onDelete={remove} />
    <InquiryFormV2
      opened={opened}
      inquiryId={selected?.id}
      initialDraft={selected ? null : importedDraft}
      onClose={close}
      onSaved={async (saved) => {
        if (importAuditId) {
          try {
            await completeSalesSpreadsheetImport(importAuditId, "inquiry", saved.id);
          } catch (error) {
            console.error(error);
            window.alert("The inquiry was saved, but its workbook audit record could not be finalized.");
          }
        }
        try {
          await refresh();
        } catch (error) {
          console.error(error);
          window.alert("The inquiry was saved, but the list could not be refreshed. Reload the page to see it.");
        }
        close();
      }}
    />
    <SpreadsheetImportPreview
      opened={importOpened}
      expectedType="Inquiry"
      onClose={() => setImportOpened(false)}
      onConfirm={async (preview, signal) => {
        const auditId = await stageSalesSpreadsheetImport(preview);
        if (signal.aborted) return;
        setImportAuditId(auditId);
        setImportedDraft(preview.inquiryDraft);
        setImportOpened(false);
        setOpened(true);
      }}
    />
  </>;
}
