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

import { createInquiry, updateInquiry } from "../../services/inquiryService";
import { getCompanies } from "../../services/companyService";
import { getContacts } from "../../services/contactService";
import { getProducts } from "../../services/productService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  inquiry?: any;
}

export default function InquiryForm({
  opened,
  onClose,
  onSaved,
  inquiry,
}: Props) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [inquiryNo, setInquiryNo] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [productId, setProductId] = useState("");
  const [inquiryDate, setInquiryDate] = useState("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [unit, setUnit] = useState("MT");
  const [targetPrice, setTargetPrice] = useState<number | string>("");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState("New");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (inquiry) {
      setInquiryNo(inquiry.inquiry_no || "");
      setCompanyId(inquiry.company_id || "");
      setContactId(inquiry.contact_id || "");
      setProductId(inquiry.product_id || "");
      setInquiryDate(inquiry.inquiry_date || "");
      setQuantity(inquiry.quantity || "");
      setUnit(inquiry.unit || "MT");
      setTargetPrice(inquiry.target_price || "");
      setCurrency(inquiry.currency || "USD");
      setStatus(inquiry.status || "New");
      setNotes(inquiry.notes || "");
    } else {
      clearForm();
    }
  }, [inquiry, opened]);

  async function loadData() {
    setCompanies(await getCompanies());
    setContacts(await getContacts());
    setProducts(await getProducts());
  }

  function clearForm() {
    setInquiryNo("");
    setCompanyId("");
    setContactId("");
    setProductId("");
    setInquiryDate(new Date().toISOString().slice(0, 10));
    setQuantity("");
    setUnit("MT");
    setTargetPrice("");
    setCurrency("USD");
    setStatus("New");
    setNotes("");
  }

  async function handleSubmit() {
    const payload = {
      inquiry_no: inquiryNo,
      inquiry_date: inquiryDate,
      company_id: companyId,
      contact_id: contactId,
      product_id: productId,
      quantity,
      unit,
      target_price: targetPrice,
      currency,
      status,
      notes,
    };

    try {
      if (inquiry) {
        await updateInquiry(inquiry.id, payload);
        toast.success("Inquiry updated");
      } else {
        await createInquiry(payload);
        toast.success("Inquiry created");
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
      title={inquiry ? "Edit Inquiry" : "New Inquiry"}
      size="lg"
      centered
    >
      <Stack>

        <TextInput
          label="Inquiry No"
          required
          value={inquiryNo}
          onChange={(e) => setInquiryNo(e.currentTarget.value)}
        />

        <TextInput
          label="Inquiry Date"
          type="date"
          value={inquiryDate}
          onChange={(e) => setInquiryDate(e.currentTarget.value)}
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
          label="Product"
          searchable
          value={productId}
          onChange={(v) => setProductId(v || "")}
          data={products.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
        />

        <NumberInput
          label="Quantity"
          value={quantity}
          onChange={(value) => setQuantity(typeof value === "bigint" ? Number(value) : value)}
        />

        <TextInput
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.currentTarget.value)}
        />

        <NumberInput
          label="Target Price"
          value={targetPrice}
          onChange={(value) => setTargetPrice(typeof value === "bigint" ? Number(value) : value)}
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
          onChange={(v) => setStatus(v || "New")}
          data={["New", "Quoted", "Negotiating", "Won", "Lost"]}
        />

        <Textarea
          label="Notes"
          minRows={3}
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
