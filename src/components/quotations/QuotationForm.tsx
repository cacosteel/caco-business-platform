import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  createQuotation,
  updateQuotation,
} from "../../services/quotationService";
import type { QuotationStatus } from "../../services/quotationService";

import { getCompanies } from "../../services/companyService";
import { getContacts } from "../../services/contactService";
import { getInquiries } from "../../services/inquiryService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  quotation?: any;
}

export default function QuotationForm({
  opened,
  onClose,
  onSaved,
  quotation,
}: Props) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);

  const [quotationNo, setQuotationNo] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [subtotal, setSubtotal] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);
  const [freight, setFreight] = useState<number | string>(0);
  const [total, setTotal] = useState<number | string>(0);
  const [status, setStatus] = useState<QuotationStatus>("Draft");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (quotation) {
      setQuotationNo(quotation.quotation_no || "");
      setQuotationDate(quotation.quotation_date || "");
      setValidUntil(quotation.valid_until || "");
      setCompanyId(quotation.company_id || "");
      setContactId(quotation.contact_id || "");
      setInquiryId(quotation.inquiry_id || "");
      setCurrency(quotation.currency || "USD");
      setSubtotal(quotation.subtotal || 0);
      setDiscount(quotation.discount || 0);
      setFreight(quotation.freight || 0);
      setTotal(quotation.total || 0);
      setStatus((quotation.status || "Draft") as QuotationStatus);
      setPaymentTerms(quotation.payment_terms || "");
      setDeliveryTerms(quotation.delivery_terms || "");
      setNotes(quotation.notes || "");
    } else {
      clearForm();
    }
  }, [quotation, opened]);

  function clearForm() {
    const today = new Date().toISOString().slice(0, 10);

    setQuotationNo("");
    setQuotationDate(today);
    setValidUntil("");
    setCompanyId("");
    setContactId("");
    setInquiryId("");
    setCurrency("USD");
    setSubtotal(0);
    setDiscount(0);
    setFreight(0);
    setTotal(0);
    setStatus("Draft");
    setPaymentTerms("");
    setDeliveryTerms("");
    setNotes("");
  }

  async function loadData() {
    setCompanies(await getCompanies());
    setContacts(await getContacts());
    setInquiries(await getInquiries());
  }

  useEffect(() => {
    const s = Number(subtotal || 0);
    const d = Number(discount || 0);
    const f = Number(freight || 0);

    setTotal(s - d + f);
  }, [subtotal, discount, freight]);

  async function handleSubmit() {
    const payload = {
      quotation_no: quotationNo,
      quotation_date: quotationDate,
      valid_until: validUntil,
      company_id: companyId,
      contact_id: contactId,
      inquiry_id: inquiryId,
      currency,
      subtotal: Number(subtotal || 0),
      discount: Number(discount || 0),
      freight: Number(freight || 0),
      total: Number(total || 0),
      status,
      payment_terms: paymentTerms,
      delivery_terms: deliveryTerms,
      notes,
    };

    try {
      if (quotation) {
        await updateQuotation(quotation.id, payload);
        toast.success("Quotation updated");
      } else {
        await createQuotation(payload);
        toast.success("Quotation created");
      }

      onSaved();

    } catch (err) {
      console.error(err);
      toast.error("Operation failed");
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={quotation ? "Edit Quotation" : "New Quotation"}
      size="lg"
      centered
    >
      <Stack>

        <TextInput
          label="Quotation No"
          required
          value={quotationNo}
          onChange={(e) => setQuotationNo(e.currentTarget.value)}
        />

        <TextInput
          label="Quotation Date"
          type="date"
          value={quotationDate}
          onChange={(e) => setQuotationDate(e.currentTarget.value)}
        />

        <TextInput
          label="Valid Until"
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.currentTarget.value)}
        />

        <Select
          label="Company"
          searchable
          value={companyId}
          onChange={(v) => setCompanyId(v || "")}
          data={companies.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        <Select
          label="Contact"
          searchable
          value={contactId}
          onChange={(v) => setContactId(v || "")}
          data={contacts.map((c) => ({
            value: c.id,
            label: `${c.first_name} ${c.last_name ?? ""}`,
          }))}
        />

        <Select
          label="Inquiry"
          searchable
          value={inquiryId}
          onChange={(v) => setInquiryId(v || "")}
          data={inquiries.map((i) => ({
            value: i.id,
            label: i.inquiry_no,
          }))}
        />

        <NumberInput label="Subtotal" value={subtotal} onChange={(value) => setSubtotal(typeof value === "bigint" ? Number(value) : value)} />
        <NumberInput label="Discount" value={discount} onChange={(value) => setDiscount(typeof value === "bigint" ? Number(value) : value)} />
        <NumberInput label="Freight" value={freight} onChange={(value) => setFreight(typeof value === "bigint" ? Number(value) : value)} />

        <TextInput
          label="Total"
          value={String(total)}
          readOnly
        />

        <Select
          label="Currency"
          value={currency}
          onChange={(v) => setCurrency(v || "USD")}
          data={["USD", "EUR", "TRY"]}
        />

        <Select
          label="Status"
          value={status}
          onChange={(v) => setStatus((v || "Draft") as QuotationStatus)}
          data={[
            "Draft",
            "Sent",
            "Accepted",
            "Rejected",
          ]}
        />

        <Textarea
          label="Payment Terms"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.currentTarget.value)}
        />

        <Textarea
          label="Delivery Terms"
          value={deliveryTerms}
          onChange={(e) => setDeliveryTerms(e.currentTarget.value)}
        />

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSubmit}>
            Save
          </Button>
        </Group>

      </Stack>
    </Modal>
  );
}
