import { useState } from "react";
import { Button } from "@mantine/core";
import { useInquiries } from "../../hooks/useInquiries";
import { deleteInquiry } from "../../services/inquiryService";
import InquiryForm from "../../components/inquiries/InquiryForm";
import InquiryTable from "../../components/inquiries/InquiryTable";
import type { inquiry } from "../../types/inquiry";
import PageHeader from "../../components/common/PageHeader";

export default function Inquiries() {
  const { inquiries, loading, refresh } = useInquiries();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<inquiry>();
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    if (window.confirm("Delete this inquiry?")) { await deleteInquiry(id); await refresh(); }
  };

  if (loading) return <p>Loading...</p>;
  return <>
    <PageHeader
      title="Client Inquiries"
      subtitle="Record customer requirements and use them as the source for supplier requests and quotations."
      action={<Button onClick={() => setOpened(true)}>Add inquiry</Button>}
    />
    <InquiryTable inquiries={inquiries} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <InquiryForm opened={opened} inquiry={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
