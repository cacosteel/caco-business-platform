import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getCompanies } from "../../services/companyService";
import { getContacts } from "../../services/contactService";
import {
  getInquiryV2,
  saveInquiryV2,
  validateInquiryV2,
} from "../../services/inquiryV2Service";
import { getProducts } from "../../services/productService";
import type { company } from "../../types/company";
import type { contact } from "../../types/contact";
import {
  createBlankInquiryItemV2,
  createBlankInquiryV2Draft,
  type InquiryItemV2,
  type InquiryItemV2Draft,
  type InquiryV2,
  type InquiryV2Draft,
} from "../../types/inquiryV2";
import type { product } from "../../types/product";

export interface InquiryFormV2Props {
  opened: boolean;
  onClose: () => void;
  onSaved: (inquiry: InquiryV2) => void | Promise<void>;
  inquiry?: Pick<InquiryV2, "id"> | null;
  inquiryId?: string | null;
  initialDraft?: InquiryV2Draft | null;
}

const INCOTERMS = [
  "EXW",
  "FCA",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
];

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function numberOrNull(value: string | number): number | null {
  if (value === "" || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function itemToDraft(item: InquiryItemV2): InquiryItemV2Draft {
  return {
    client_key: item.id,
    id: item.id,
    product_id: item.product_id,
    specification_template_id: item.specification_template_id,
    product_name: item.product_name,
    customer_item_code: item.customer_item_code ?? "",
    internal_product_code: item.internal_product_code ?? "",
    grade: item.grade ?? "",
    standard: item.standard ?? "",
    thickness_mm: item.thickness_mm,
    width_mm: item.width_mm,
    length_mm: item.length_mm,
    coating: item.coating ?? "",
    color_ral: item.color_ral ?? "",
    surface_treatment: item.surface_treatment ?? "",
    coil_inner_diameter_mm: item.coil_inner_diameter_mm,
    coil_outer_diameter_mm: item.coil_outer_diameter_mm,
    target_coil_weight_mt: item.target_coil_weight_mt,
    quantity: item.quantity,
    unit: item.unit,
    tolerance_minus: item.tolerance_minus,
    tolerance_plus: item.tolerance_plus,
    tolerance_unit: item.tolerance_unit,
    invoicing_basis: item.invoicing_basis,
    theoretical_unit_weight_kg: item.theoretical_unit_weight_kg,
    theoretical_weight_override_note:
      item.theoretical_weight_override_note ?? "",
    pieces_per_bundle: item.pieces_per_bundle,
    additional_specification: item.additional_specification ?? "",
    packing_requirements: item.packing_requirements ?? "",
    required_documents: item.required_documents ?? "",
    specification_data: item.specification_data,
  };
}

function inquiryToDraft(inquiry: InquiryV2): InquiryV2Draft {
  return {
    id: inquiry.id,
    company_id: inquiry.company_id ?? "",
    contact_id: inquiry.contact_id,
    inquiry_date: inquiry.inquiry_date,
    customer_reference: inquiry.customer_reference ?? "",
    received_at: toLocalDateTime(inquiry.received_at),
    currency: inquiry.currency,
    total_tolerance_minus: inquiry.total_tolerance_minus,
    total_tolerance_plus: inquiry.total_tolerance_plus,
    total_tolerance_unit: inquiry.total_tolerance_unit ?? "percent",
    loading_port: inquiry.loading_port ?? "",
    discharge_port: inquiry.discharge_port ?? "",
    requested_incoterms: inquiry.requested_incoterms,
    requested_payment_terms: inquiry.requested_payment_terms ?? "",
    requested_shipment_method: inquiry.requested_shipment_method ?? "",
    requested_latest_shipment_date:
      inquiry.requested_latest_shipment_date ?? "",
    requested_marking_terms: inquiry.requested_marking_terms ?? "",
    special_conditions: inquiry.special_conditions ?? "",
    required_documents: inquiry.required_documents ?? "",
    packing_requirements: inquiry.packing_requirements ?? "",
    readiness_requirement: inquiry.readiness_requirement ?? "",
    notes: inquiry.notes ?? "",
    items:
      inquiry.inquiry_items.length > 0
        ? inquiry.inquiry_items.map(itemToDraft)
        : [createBlankInquiryItemV2()],
  };
}

export default function InquiryFormV2({
  opened,
  onClose,
  onSaved,
  inquiry,
  inquiryId,
  initialDraft = null,
}: InquiryFormV2Props) {
  const selectedInquiryId = inquiryId ?? inquiry?.id ?? null;
  const [draft, setDraft] = useState<InquiryV2Draft>(
    createBlankInquiryV2Draft,
  );
  const [companies, setCompanies] = useState<company[]>([]);
  const [contacts, setContacts] = useState<contact[]>([]);
  const [products, setProducts] = useState<product[]>([]);
  const [currentInquiry, setCurrentInquiry] = useState<InquiryV2 | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;

    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setMessage(null);
      try {
        const [companyRows, contactRows, productRows, inquiryRow] =
          await Promise.all([
            getCompanies(),
            getContacts(),
            getProducts(),
            selectedInquiryId ? getInquiryV2(selectedInquiryId) : null,
          ]);

        if (cancelled) return;
        setCompanies(companyRows);
        setContacts(contactRows);
        setProducts(productRows);
        setCurrentInquiry(inquiryRow);
        setDraft(
          inquiryRow
            ? inquiryToDraft(inquiryRow)
            : initialDraft ?? createBlankInquiryV2Draft(),
        );
        setExpandedLines(new Set());
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Could not load the inquiry.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialDraft, opened, selectedInquiryId]);

  const contactOptions = useMemo(
    () =>
      contacts
        .filter((entry) => !draft.company_id || entry.company_id === draft.company_id)
        .map((entry) => ({
          value: entry.id,
          label: `${entry.first_name} ${entry.last_name ?? ""}`.trim(),
        })),
    [contacts, draft.company_id],
  );
  const isEditable = !currentInquiry || currentInquiry.status === "Draft";

  function updateDraft<K extends keyof InquiryV2Draft>(
    field: K,
    value: InquiryV2Draft[K],
  ): void {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateItem<K extends keyof InquiryItemV2Draft>(
    index: number,
    field: K,
    value: InquiryItemV2Draft[K],
  ): void {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function changeCompany(companyId: string | null): void {
    const nextCompanyId = companyId ?? "";
    const selectedContact = contacts.find(
      (entry) => entry.id === draft.contact_id,
    );
    setDraft((current) => ({
      ...current,
      company_id: nextCompanyId,
      contact_id:
        selectedContact?.company_id === nextCompanyId ? current.contact_id : null,
    }));
  }

  function selectProduct(index: number, productId: string | null): void {
    const selectedProduct = products.find((entry) => entry.id === productId);
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              product_id: productId,
              product_name: selectedProduct?.name ?? item.product_name,
              unit: selectedProduct?.unit ?? item.unit,
              internal_product_code:
                selectedProduct?.code ?? item.internal_product_code,
            }
          : item,
      ),
    }));
  }

  function addLine(): void {
    const item = createBlankInquiryItemV2();
    setDraft((current) => ({ ...current, items: [...current.items, item] }));
    setExpandedLines((current) => new Set(current).add(item.client_key));
  }

  function removeLine(index: number): void {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function toggleLine(clientKey: string): void {
    setExpandedLines((current) => {
      const next = new Set(current);
      if (next.has(clientKey)) next.delete(clientKey);
      else next.add(clientKey);
      return next;
    });
  }

  async function handleSave(): Promise<void> {
    const errors = validateInquiryV2(draft);
    if (errors.length > 0) {
      setMessage(errors[0].message);
      return;
    }
    if (!isEditable) {
      setMessage("Only Draft inquiries can be edited. Create a revision first.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveInquiryV2(draft);
      toast.success(draft.id ? "Inquiry updated" : "Inquiry created");
      await onSaved(saved);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "The inquiry could not be saved.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={currentInquiry ? `Edit ${currentInquiry.inquiry_no}` : "New inquiry"}
      size="95%"
      centered
      closeOnClickOutside={!saving}
    >
      <LoadingOverlay visible={loading} zIndex={1000} />
      <Stack gap="lg">
        {message && (
          <Alert color="red" title="Please check this inquiry">
            {message}
          </Alert>
        )}

        {currentInquiry && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Revision {currentInquiry.revision_no}
            </Text>
            <Badge variant="light">{currentInquiry.status}</Badge>
          </Group>
        )}

        {currentInquiry && !isEditable && (
          <Alert color="yellow" title="This inquiry is locked">
            Only Draft inquiries can be edited. Create a revision from the inquiry
            workspace before changing this record.
          </Alert>
        )}

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Title order={4}>Customer and reference</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              <Select
                label="Customer company"
                required
                searchable
                value={draft.company_id || null}
                onChange={changeCompany}
                disabled={Boolean(currentInquiry)}
                data={companies.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                }))}
              />
              <Select
                label="Customer contact"
                searchable
                clearable
                disabled={!draft.company_id}
                value={draft.contact_id}
                onChange={(value) => updateDraft("contact_id", value)}
                data={contactOptions}
              />
              <TextInput
                label="Customer reference"
                value={draft.customer_reference}
                onChange={(event) =>
                  updateDraft("customer_reference", event.currentTarget.value)
                }
              />
              <TextInput
                label="Inquiry date"
                required
                type="date"
                value={draft.inquiry_date}
                onChange={(event) =>
                  updateDraft("inquiry_date", event.currentTarget.value)
                }
              />
              <TextInput
                label="Received at"
                type="datetime-local"
                value={draft.received_at}
                onChange={(event) =>
                  updateDraft("received_at", event.currentTarget.value)
                }
              />
              <Select
                label="Currency"
                required
                value={draft.currency}
                onChange={(value) => updateDraft("currency", value ?? "USD")}
                data={["USD"]}
                description="The current sales workflow supports USD only."
              />
            </SimpleGrid>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={4}>Technical line items</Title>
                <Text size="sm" c="dimmed">
                  Use “More details” for coating, coil and line-specific terms.
                </Text>
              </div>
              <Button leftSection={<IconPlus size={16} />} onClick={addLine}>
                Add line
              </Button>
            </Group>

            <ScrollArea type="auto">
              <Table withTableBorder withColumnBorders striped miw={1450}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>#</Table.Th>
                    <Table.Th>Catalog product</Table.Th>
                    <Table.Th>Product description</Table.Th>
                    <Table.Th>Grade</Table.Th>
                    <Table.Th>Standard</Table.Th>
                    <Table.Th>Thickness mm</Table.Th>
                    <Table.Th>Width mm</Table.Th>
                    <Table.Th>Length mm</Table.Th>
                    <Table.Th>Quantity</Table.Th>
                    <Table.Th>Unit</Table.Th>
                    <Table.Th>Details</Table.Th>
                    <Table.Th aria-label="Remove line" />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {draft.items.map((item, index) => {
                    const expanded = expandedLines.has(item.client_key);
                    return (
                      <Fragment key={item.client_key}>
                        <Table.Tr>
                          <Table.Td>{index + 1}</Table.Td>
                          <Table.Td>
                            <Select
                              size="xs"
                              searchable
                              clearable
                              w={170}
                              value={item.product_id}
                              onChange={(value) => selectProduct(index, value)}
                              data={products.map((entry) => ({
                                value: entry.id,
                                label: entry.name,
                              }))}
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              required
                              w={220}
                              value={item.product_name}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "product_name",
                                  event.currentTarget.value,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              w={110}
                              value={item.grade}
                              onChange={(event) =>
                                updateItem(index, "grade", event.currentTarget.value)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              w={120}
                              value={item.standard}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "standard",
                                  event.currentTarget.value,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              w={100}
                              min={0}
                              decimalScale={4}
                              value={item.thickness_mm ?? ""}
                              onChange={(value) =>
                                updateItem(index, "thickness_mm", numberOrNull(value))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              w={100}
                              min={0}
                              decimalScale={3}
                              value={item.width_mm ?? ""}
                              onChange={(value) =>
                                updateItem(index, "width_mm", numberOrNull(value))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              w={100}
                              min={0}
                              decimalScale={3}
                              value={item.length_mm ?? ""}
                              onChange={(value) =>
                                updateItem(index, "length_mm", numberOrNull(value))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              required
                              w={110}
                              min={0}
                              decimalScale={3}
                              value={item.quantity ?? ""}
                              onChange={(value) =>
                                updateItem(index, "quantity", numberOrNull(value))
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              required
                              w={75}
                              value={item.unit}
                              onChange={(event) =>
                                updateItem(index, "unit", event.currentTarget.value)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              rightSection={
                                expanded ? (
                                  <IconChevronUp size={14} />
                                ) : (
                                  <IconChevronDown size={14} />
                                )
                              }
                              onClick={() => toggleLine(item.client_key)}
                            >
                              More details
                            </Button>
                          </Table.Td>
                          <Table.Td>
                            <Tooltip label="Remove line">
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                disabled={draft.items.length === 1}
                                onClick={() => removeLine(index)}
                                aria-label={`Remove line ${index + 1}`}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                          <Table.Td colSpan={12} p={0}>
                            <Collapse expanded={expanded}>
                              <Paper p="md" bg="gray.0">
                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                                  <TextInput
                                    label="Customer item code"
                                    value={item.customer_item_code}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "customer_item_code",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="Internal product code"
                                    value={item.internal_product_code}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "internal_product_code",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="Coating"
                                    value={item.coating}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "coating",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="Colour / RAL"
                                    value={item.color_ral}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "color_ral",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="Surface treatment"
                                    value={item.surface_treatment}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "surface_treatment",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Coil inner diameter (mm)"
                                    min={0}
                                    decimalScale={3}
                                    value={item.coil_inner_diameter_mm ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "coil_inner_diameter_mm",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Coil outer diameter (mm)"
                                    min={0}
                                    decimalScale={3}
                                    value={item.coil_outer_diameter_mm ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "coil_outer_diameter_mm",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Target coil weight (MT)"
                                    min={0}
                                    decimalScale={3}
                                    value={item.target_coil_weight_mt ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "target_coil_weight_mt",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Tolerance minus"
                                    min={0}
                                    decimalScale={3}
                                    value={item.tolerance_minus ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "tolerance_minus",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Tolerance plus"
                                    min={0}
                                    decimalScale={3}
                                    value={item.tolerance_plus ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "tolerance_plus",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <Select
                                    label="Tolerance unit"
                                    value={item.tolerance_unit}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "tolerance_unit",
                                        value === "MT" ? "MT" : "percent",
                                      )
                                    }
                                    data={[
                                      { value: "percent", label: "%" },
                                      { value: "MT", label: "MT" },
                                    ]}
                                  />
                                  <Select
                                    label="Invoicing basis"
                                    value={item.invoicing_basis}
                                    onChange={(value) => {
                                      if (
                                        value === "actual_net_weight" ||
                                        value === "theoretical_weight" ||
                                        value === "pieces"
                                      ) {
                                        updateItem(index, "invoicing_basis", value);
                                      }
                                    }}
                                    data={[
                                      {
                                        value: "actual_net_weight",
                                        label: "Actual net weight",
                                      },
                                      {
                                        value: "theoretical_weight",
                                        label: "Theoretical weight",
                                      },
                                      { value: "pieces", label: "Pieces" },
                                    ]}
                                  />
                                  <NumberInput
                                    label="Theoretical unit weight (kg)"
                                    min={0}
                                    decimalScale={6}
                                    value={item.theoretical_unit_weight_kg ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "theoretical_unit_weight_kg",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <NumberInput
                                    label="Pieces per bundle"
                                    min={0}
                                    allowDecimal={false}
                                    value={item.pieces_per_bundle ?? ""}
                                    onChange={(value) =>
                                      updateItem(
                                        index,
                                        "pieces_per_bundle",
                                        numberOrNull(value),
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="Weight override note"
                                    value={item.theoretical_weight_override_note}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "theoretical_weight_override_note",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                </SimpleGrid>
                                <SimpleGrid cols={{ base: 1, lg: 3 }} mt="md">
                                  <Textarea
                                    label="Additional specification"
                                    minRows={2}
                                    value={item.additional_specification}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "additional_specification",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <Textarea
                                    label="Line packing requirements"
                                    minRows={2}
                                    value={item.packing_requirements}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "packing_requirements",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                  <Textarea
                                    label="Line required documents"
                                    minRows={2}
                                    value={item.required_documents}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "required_documents",
                                        event.currentTarget.value,
                                      )
                                    }
                                  />
                                </SimpleGrid>
                              </Paper>
                            </Collapse>
                          </Table.Td>
                        </Table.Tr>
                      </Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Title order={4}>Commercial and logistics requirements</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              <TextInput
                label="Loading port"
                value={draft.loading_port}
                onChange={(event) =>
                  updateDraft("loading_port", event.currentTarget.value)
                }
              />
              <TextInput
                label="Discharge port"
                value={draft.discharge_port}
                onChange={(event) =>
                  updateDraft("discharge_port", event.currentTarget.value)
                }
              />
              <MultiSelect
                label="Requested Incoterms"
                searchable
                clearable
                value={draft.requested_incoterms}
                onChange={(value) => updateDraft("requested_incoterms", value)}
                data={INCOTERMS}
              />
              <TextInput
                label="Requested shipment method"
                placeholder="Container, breakbulk, truck..."
                value={draft.requested_shipment_method}
                onChange={(event) =>
                  updateDraft(
                    "requested_shipment_method",
                    event.currentTarget.value,
                  )
                }
              />
              <TextInput
                label="Latest shipment date"
                type="date"
                value={draft.requested_latest_shipment_date}
                onChange={(event) =>
                  updateDraft(
                    "requested_latest_shipment_date",
                    event.currentTarget.value,
                  )
                }
              />
              <Group align="flex-end" grow>
                <NumberInput
                  label="Total tolerance −"
                  min={0}
                  decimalScale={3}
                  value={draft.total_tolerance_minus ?? ""}
                  onChange={(value) =>
                    updateDraft("total_tolerance_minus", numberOrNull(value))
                  }
                />
                <NumberInput
                  label="Total tolerance +"
                  min={0}
                  decimalScale={3}
                  value={draft.total_tolerance_plus ?? ""}
                  onChange={(value) =>
                    updateDraft("total_tolerance_plus", numberOrNull(value))
                  }
                />
                <Select
                  label="Unit"
                  value={draft.total_tolerance_unit}
                  onChange={(value) =>
                    updateDraft(
                      "total_tolerance_unit",
                      value === "MT" ? "MT" : "percent",
                    )
                  }
                  data={[
                    { value: "percent", label: "%" },
                    { value: "MT", label: "MT" },
                  ]}
                />
              </Group>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, lg: 2 }}>
              <Textarea
                label="Requested payment terms"
                minRows={2}
                value={draft.requested_payment_terms}
                onChange={(event) =>
                  updateDraft(
                    "requested_payment_terms",
                    event.currentTarget.value,
                  )
                }
              />
              <Textarea
                label="Readiness requirement"
                minRows={2}
                value={draft.readiness_requirement}
                onChange={(event) =>
                  updateDraft("readiness_requirement", event.currentTarget.value)
                }
              />
              <Textarea
                label="Packing requirements"
                minRows={2}
                value={draft.packing_requirements}
                onChange={(event) =>
                  updateDraft("packing_requirements", event.currentTarget.value)
                }
              />
              <Textarea
                label="Required documents"
                minRows={2}
                value={draft.required_documents}
                onChange={(event) =>
                  updateDraft("required_documents", event.currentTarget.value)
                }
              />
              <Textarea
                label="Marking terms"
                minRows={2}
                value={draft.requested_marking_terms}
                onChange={(event) =>
                  updateDraft(
                    "requested_marking_terms",
                    event.currentTarget.value,
                  )
                }
              />
              <Textarea
                label="Special conditions"
                minRows={2}
                value={draft.special_conditions}
                onChange={(event) =>
                  updateDraft("special_conditions", event.currentTarget.value)
                }
              />
            </SimpleGrid>
            <Textarea
              label="Internal notes"
              minRows={3}
              value={draft.notes}
              onChange={(event) => updateDraft("notes", event.currentTarget.value)}
            />
          </Stack>
        </Paper>

        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {draft.items.length} line{draft.items.length === 1 ? "" : "s"}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!isEditable}
            >
              Save inquiry
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
