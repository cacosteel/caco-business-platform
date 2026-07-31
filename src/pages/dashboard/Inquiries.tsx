import { useState } from "react";
import { Button, Group, Title } from "@mantine/core";
import { useInquiries } from "../../hooks/useInquiries";
import { deleteInquiry } from "../../services/inquiryService";
import InquiryForm from "../../components/inquiries/InquiryForm";
import InquiryTable from "../../components/inquiries/InquiryTable";
import type { inquiry } from "../../types/inquiry";

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
    <Group justify="space-between" mb="md"><Title order={1}>Inquiries</Title><Button onClick={() => setOpened(true)}>Add inquiry</Button></Group>
    <InquiryTable inquiries={inquiries} onEdit={(record) => { setSelected(record); setOpened(true); }} onDelete={remove} />
    <InquiryForm opened={opened} inquiry={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
