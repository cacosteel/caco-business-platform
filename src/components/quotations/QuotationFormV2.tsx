import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  Modal,
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
import { IconAlertCircle, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  calculateQuotationTotalsV2,
  getInquiryQuotationSourceV2,
  getQuotationFormOptionsV2,
  getQuotationV2,
  saveQuotationV2,
  validateQuotationDraftV2,
} from "../../services/quotationV2Service";
import {
  createEmptyQuotationDraftV2,
  createEmptyQuotationItemV2,
  INVOICING_BASES_V2,
  SHIPMENT_METHODS_V2,
} from "../../types/quotationV2";
import type {
  InquiryQuotationSourceV2,
  QuotationDraftV2,
  QuotationFormOptionsV2,
  QuotationItemV2,
  QuotationRecipientV2,
  QuotationV2,
} from "../../types/quotationV2";

const EMPTY_OPTIONS: QuotationFormOptionsV2 = {
  companies: [],
  contacts: [],
  inquiries: [],
  sellingEntities: [],
  sellerBanks: [],
};

type RecipientEditorProps = {
  label: string;
  description: string;
  recipients: QuotationRecipientV2[];
  onChange: (recipients: QuotationRecipientV2[]) => void;
};

function RecipientEditor({
  label,
  description,
  recipients,
  onChange,
}: RecipientEditorProps) {
  const update = (index: number, patch: Partial<QuotationRecipientV2>) => {
    onChange(
      recipients.map((recipient, recipientIndex) =>
        recipientIndex === index ? { ...recipient, ...patch } : recipient,
      ),
    );
  };

  return (
    <Stack gap="xs">
      <div>
        <Text fw={600}>{label}</Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </div>

      {recipients.map((recipient, index) => (
        <Group key={`${label}-${index}`} align="end" wrap="nowrap">
          <TextInput
            aria-label={`${label} recipient ${index + 1} name`}
            label={index === 0 ? "Name" : undefined}
            placeholder="Recipient name"
            value={recipient.name}
            onChange={(event) => update(index, { name: event.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <TextInput
            aria-label={`${label} recipient ${index + 1} email`}
            label={index === 0 ? "Email" : undefined}
            placeholder="name@company.com"
            type="email"
            value={recipient.email}
            onChange={(event) => update(index, { email: event.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <Tooltip label={`Remove ${label} recipient`}>
            <ActionIcon
              aria-label={`Remove ${label} recipient ${index + 1}`}
              color="red"
              variant="subtle"
              onClick={() => onChange(recipients.filter((_, recipientIndex) => recipientIndex !== index))}
            >
              <IconTrash size={17} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ))}

      <Button
        variant="light"
        size="xs"
        leftSection={<IconPlus size={15} />}
        onClick={() => onChange([...recipients, { name: "", email: "" }])}
        style={{ alignSelf: "flex-start" }}
      >
        Add {label} recipient
      </Button>
    </Stack>
  );
}

function toNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string | number): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableBooleanValue(value: boolean | null): string {
  if (value === null) return "unspecified";
  return value ? "yes" : "no";
}

function parseNullableBoolean(value: string | null): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function quotationToDraft(quotation: QuotationV2): QuotationDraftV2 {
  const draft: Partial<QuotationV2> = { ...quotation };
  delete draft.id;
  delete draft.revision_no;
  delete draft.is_current;
  delete draft.created_at;
  delete draft.updated_at;
  return draft as QuotationDraftV2;
}

function applyInquirySource(
  draft: QuotationDraftV2,
  source: InquiryQuotationSourceV2,
  preserveDraftItems = false,
): QuotationDraftV2 {
  const primaryRecipient = source.contact?.email
    ? [{ name: source.contact.name, email: source.contact.email }]
    : draft.to_recipients;

  return {
    ...draft,
    inquiry_id: source.inquiry.id,
    company_id: source.inquiry.company_id,
    contact_id: source.inquiry.contact_id,
    currency: source.inquiry.currency,
    to_recipients: draft.to_recipients.length > 0 ? draft.to_recipients : primaryRecipient,
    loading_port: draft.loading_port || source.inquiry.loading_port,
    discharge_port: draft.discharge_port || source.inquiry.discharge_port,
    incoterm_rule: draft.incoterm_rule || source.inquiry.requested_incoterms[0] || "",
    packing_terms: draft.packing_terms || source.inquiry.packing_requirements,
    documentation_terms: draft.documentation_terms || source.inquiry.required_documents,
    special_conditions:
      draft.special_conditions || source.inquiry.readiness_requirement,
    items: preserveDraftItems && draft.items.length > 0
      ? draft.items.map((item, index) => {
          const sourceItem = source.items[index];
          const matchesSource = sourceItem && (
            item.product_name.trim().toLowerCase() === sourceItem.product_name.trim().toLowerCase()
            || item.internal_product_code && item.internal_product_code === sourceItem.internal_product_code
            || item.customer_item_code && item.customer_item_code === sourceItem.customer_item_code
          );
          return matchesSource
            ? { ...item, inquiry_item_id: sourceItem.inquiry_item_id }
            : { ...item, inquiry_item_id: null };
        })
      : source.items.length > 0
        ? source.items
        : [createEmptyQuotationItemV2(1)],
  };
}

export interface QuotationFormV2Props {
  opened: boolean;
  quotationId?: string | null;
  initialInquiryId?: string | null;
  initialDraft?: QuotationDraftV2 | null;
  onClose: () => void;
  onSaved: (quotation: QuotationV2) => void | Promise<void>;
}

export default function QuotationFormV2({
  opened,
  quotationId = null,
  initialInquiryId = null,
  initialDraft = null,
  onClose,
  onSaved,
}: QuotationFormV2Props) {
  const [draft, setDraft] = useState<QuotationDraftV2>(createEmptyQuotationDraftV2);
  const [options, setOptions] = useState<QuotationFormOptionsV2>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [copyingInquiry, setCopyingInquiry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!opened) return;

    let active = true;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const [loadedOptions, quotation] = await Promise.all([
          getQuotationFormOptionsV2(),
          quotationId ? getQuotationV2(quotationId) : Promise.resolve(null),
        ]);
        if (!active) return;

        setOptions(loadedOptions);
        if (quotation) {
          setDraft(quotationToDraft(quotation));
          return;
        }

        let next = initialDraft ?? createEmptyQuotationDraftV2();
        if (loadedOptions.sellingEntities.length > 0) {
          next = { ...next, seller_entity_id: loadedOptions.sellingEntities[0].id };
        }
        if (!initialDraft && initialInquiryId) {
          const source = await getInquiryQuotationSourceV2(initialInquiryId);
          if (!active) return;
          next = applyInquirySource(next, source);
        }
        setDraft(next);
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "The quotation editor could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [initialDraft, initialInquiryId, opened, quotationId]);

  const calculated = useMemo(() => calculateQuotationTotalsV2(draft), [draft]);
  const companyContacts = useMemo(
    () => options.contacts.filter((contact) => contact.company_id === draft.company_id),
    [draft.company_id, options.contacts],
  );
  const sellerBanks = useMemo(
    () => options.sellerBanks.filter((bank) => bank.selling_entity_id === draft.seller_entity_id),
    [draft.seller_entity_id, options.sellerBanks],
  );
  const isLocked = draft.status !== "Draft";

  const updateDraft = <Key extends keyof QuotationDraftV2>(
    key: Key,
    value: QuotationDraftV2[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (index: number, patch: Partial<QuotationItemV2>) => {
    setDraft((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        return {
          ...next,
          amount: Math.round(toNumber(next.quantity) * toNumber(next.unit_price) * 100) / 100,
        };
      });
      return { ...current, items };
    });
  };

  const copyInquiry = async (inquiryId: string) => {
    setCopyingInquiry(true);
    setError("");
    try {
      const source = await getInquiryQuotationSourceV2(inquiryId);
      setDraft((current) => applyInquirySource(current, source, Boolean(initialDraft)));
      toast.success(`Copied ${source.items.length} inquiry line${source.items.length === 1 ? "" : "s"}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The inquiry could not be copied.");
    } finally {
      setCopyingInquiry(false);
    }
  };

  const changeInquiry = (inquiryId: string | null) => {
    if (!inquiryId) {
      updateDraft("inquiry_id", null);
      return;
    }
    void copyInquiry(inquiryId);
  };

  const changeCompany = (companyId: string | null) => {
    setDraft((current) => {
      const contactBelongsToCompany = options.contacts.some(
        (contact) => contact.id === current.contact_id && contact.company_id === companyId,
      );
      return {
        ...current,
        company_id: companyId,
        contact_id: contactBelongsToCompany ? current.contact_id : null,
      };
    });
  };

  const changeContact = (contactId: string | null) => {
    const contact = options.contacts.find((candidate) => candidate.id === contactId);
    setDraft((current) => {
      const alreadyIncluded = contact?.email
        ? current.to_recipients.some(
            (recipient) => recipient.email.toLowerCase() === contact.email.toLowerCase(),
          )
        : true;
      return {
        ...current,
        contact_id: contactId,
        to_recipients:
          contact?.email && !alreadyIncluded
            ? [{ name: contact.name, email: contact.email }, ...current.to_recipients]
            : current.to_recipients,
      };
    });
  };

  const submit = async () => {
    const nextDraft: QuotationDraftV2 = {
      ...draft,
      items: calculated.items,
      subtotal: calculated.subtotal,
      total_amount: calculated.totalAmount,
    };
    const errors = validateQuotationDraftV2(nextDraft);
    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = await saveQuotationV2(nextDraft, quotationId);
      toast.success(quotationId ? "Quotation updated" : "Quotation created");
      await onSaved(saved);
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The quotation could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={quotationId ? "Edit quotation" : "Create quotation"}
      size="95%"
      centered
      closeOnClickOutside={false}
    >
      <Box pos="relative">
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ blur: 1 }} />
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3}>Customer price offer</Title>
              <Text c="dimmed" size="sm">
                Customer, technical, commercial and shipment terms are saved as one controlled revision.
              </Text>
            </div>
            <Badge variant="light" size="lg">
              {draft.quotation_no || "New draft"}
            </Badge>
          </Group>

          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} title="Please review the quotation">
              <Text style={{ whiteSpace: "pre-line" }}>{error}</Text>
            </Alert>
          )}

          {isLocked && (
            <Alert color="yellow" title="This quotation revision is locked">
              Sent or decided quotations cannot be overwritten. Create a new controlled revision to make changes.
            </Alert>
          )}

          <Paper withBorder p="md" radius="md">
            <Stack>
              <div>
                <Title order={4}>Document and customer</Title>
                <Text size="sm" c="dimmed">
                  Choosing an inquiry snapshots its customer and technical lines into this quotation.
                </Text>
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <Select
                  label="Source inquiry"
                  placeholder="Select inquiry"
                  searchable
                  clearable
                  required
                  value={draft.inquiry_id}
                  data={options.inquiries.map((inquiry) => ({
                    value: inquiry.id,
                    label: inquiry.customer_reference
                      ? `${inquiry.inquiry_no} · ${inquiry.customer_reference}`
                      : inquiry.inquiry_no,
                  }))}
                  onChange={changeInquiry}
                  disabled={copyingInquiry}
                />
                <Select
                  label="Customer company"
                  searchable
                  required
                  value={draft.company_id}
                  data={options.companies.map((company) => ({ value: company.id, label: company.name }))}
                  onChange={changeCompany}
                />
                <Select
                  label="Primary contact"
                  searchable
                  clearable
                  value={draft.contact_id}
                  data={companyContacts.map((contact) => ({ value: contact.id, label: contact.name }))}
                  onChange={changeContact}
                />
                <Select
                  label="Status"
                  value={draft.status}
                  data={[draft.status]}
                  disabled
                  description="Sending and acceptance use controlled workflow actions."
                />
                <TextInput
                  label="Quotation date"
                  type="date"
                  required
                  value={draft.quotation_date}
                  onChange={(event) => updateDraft("quotation_date", event.currentTarget.value)}
                />
                <TextInput
                  label="Valid until"
                  type="date"
                  required
                  value={draft.valid_until ?? ""}
                  onChange={(event) => updateDraft("valid_until", event.currentTarget.value || null)}
                />
                <Select
                  label="Currency"
                  required
                  value={draft.currency}
                  data={["USD"]}
                  disabled
                  description="The current sales chain is USD-only."
                />
                <Select
                  label="Selling entity"
                  searchable
                  clearable
                  value={draft.seller_entity_id}
                  data={options.sellingEntities.map((seller) => ({
                    value: seller.id,
                    label: `${seller.legal_name} (${seller.code})`,
                  }))}
                  onChange={(value) => {
                    setDraft((current) => ({
                      ...current,
                      seller_entity_id: value,
                      seller_bank_account_id: null,
                    }));
                  }}
                />
                <Select
                  label="Bank account"
                  searchable
                  clearable
                  value={draft.seller_bank_account_id}
                  data={sellerBanks.map((bank) => ({
                    value: bank.id,
                    label: `${bank.label} (${bank.currency})`,
                  }))}
                  onChange={(value) => updateDraft("seller_bank_account_id", value)}
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Stack>
              <div>
                <Title order={4}>Email recipients</Title>
                <Text size="sm" c="dimmed">
                  The linked primary contact remains searchable; these name/email snapshots preserve who received this revision.
                </Text>
              </div>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                <RecipientEditor
                  label="To"
                  description="At least one direct recipient is required."
                  recipients={draft.to_recipients}
                  onChange={(recipients) => updateDraft("to_recipients", recipients)}
                />
                <RecipientEditor
                  label="CC"
                  description="Optional copy recipients for this offer."
                  recipients={draft.cc_recipients}
                  onChange={(recipients) => updateDraft("cc_recipients", recipients)}
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Stack>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={4}>Technical and pricing lines</Title>
                  <Text size="sm" c="dimmed">
                    Inquiry values are copied as a snapshot; later inquiry edits will not rewrite this offer.
                  </Text>
                </div>
                <Group gap="xs">
                  {draft.inquiry_id && (
                    <Button
                      variant="default"
                      size="xs"
                      leftSection={<IconRefresh size={15} />}
                      loading={copyingInquiry}
                      onClick={() => void copyInquiry(draft.inquiry_id as string)}
                    >
                      Refresh from inquiry
                    </Button>
                  )}
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={15} />}
                    onClick={() =>
                      updateDraft("items", [
                        ...draft.items,
                        createEmptyQuotationItemV2(draft.items.length + 1),
                      ])
                    }
                  >
                    Add line
                  </Button>
                </Group>
              </Group>

              <ScrollArea type="auto">
                <Table withTableBorder withColumnBorders verticalSpacing="xs" miw={1780}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={55}>Line</Table.Th>
                      <Table.Th w={190}>Product</Table.Th>
                      <Table.Th w={120}>Customer code</Table.Th>
                      <Table.Th w={110}>Grade</Table.Th>
                      <Table.Th w={110}>Standard</Table.Th>
                      <Table.Th w={145}>Dimensions (mm)</Table.Th>
                      <Table.Th w={105}>Quantity</Table.Th>
                      <Table.Th w={85}>Unit</Table.Th>
                      <Table.Th w={95}>Tol. −</Table.Th>
                      <Table.Th w={95}>Tol. +</Table.Th>
                      <Table.Th w={105}>Tol. unit</Table.Th>
                      <Table.Th w={170}>Invoicing basis</Table.Th>
                      <Table.Th w={125}>Unit price</Table.Th>
                      <Table.Th w={125}>Amount</Table.Th>
                      <Table.Th w={55} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {draft.items.map((item, index) => (
                      <Table.Tr key={item.id ?? `line-${index}`}>
                        <Table.Td>{index + 1}</Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} product`}
                            required
                            value={item.product_name}
                            onChange={(event) => updateItem(index, { product_name: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} customer code`}
                            value={item.customer_item_code}
                            onChange={(event) =>
                              updateItem(index, { customer_item_code: event.currentTarget.value })
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} grade`}
                            value={item.grade}
                            onChange={(event) => updateItem(index, { grade: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} standard`}
                            value={item.standard}
                            onChange={(event) => updateItem(index, { standard: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} dimensions`}
                            value={item.dimensions_text}
                            onChange={(event) =>
                              updateItem(index, { dimensions_text: event.currentTarget.value })
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            aria-label={`Line ${index + 1} quantity`}
                            min={0}
                            decimalScale={3}
                            value={item.quantity}
                            onChange={(value) => updateItem(index, { quantity: toNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            aria-label={`Line ${index + 1} unit`}
                            value={item.unit}
                            onChange={(event) => updateItem(index, { unit: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            aria-label={`Line ${index + 1} minus tolerance`}
                            min={0}
                            decimalScale={3}
                            value={item.tolerance_minus ?? ""}
                            onChange={(value) => updateItem(index, { tolerance_minus: toNullableNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            aria-label={`Line ${index + 1} plus tolerance`}
                            min={0}
                            decimalScale={3}
                            value={item.tolerance_plus ?? ""}
                            onChange={(value) => updateItem(index, { tolerance_plus: toNullableNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            aria-label={`Line ${index + 1} tolerance unit`}
                            value={item.tolerance_unit}
                            data={[
                              { value: "percent", label: "%" },
                              { value: "MT", label: "MT" },
                            ]}
                            onChange={(value) =>
                              updateItem(index, { tolerance_unit: value === "MT" ? "MT" : "percent" })
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            aria-label={`Line ${index + 1} invoicing basis`}
                            value={item.invoicing_basis}
                            data={INVOICING_BASES_V2.map((basis) => ({
                              value: basis,
                              label: basis.replaceAll("_", " "),
                            }))}
                            onChange={(value) =>
                              updateItem(index, {
                                invoicing_basis:
                                  (value as QuotationItemV2["invoicing_basis"]) ?? "actual_net_weight",
                              })
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            aria-label={`Line ${index + 1} unit price`}
                            min={0}
                            decimalScale={2}
                            fixedDecimalScale
                            value={item.unit_price}
                            onChange={(value) => updateItem(index, { unit_price: toNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} ta="right">
                            {draft.currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label="Remove line">
                            <ActionIcon
                              aria-label={`Remove line ${index + 1}`}
                              color="red"
                              variant="subtle"
                              disabled={draft.items.length === 1}
                              onClick={() =>
                                updateDraft(
                                  "items",
                                  draft.items
                                    .filter((_, itemIndex) => itemIndex !== index)
                                    .map((remainingItem, itemIndex) => ({
                                      ...remainingItem,
                                      line_no: itemIndex + 1,
                                    })),
                                )
                              }
                            >
                              <IconTrash size={17} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Paper>

          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Paper withBorder p="md" radius="md">
              <Stack>
                <Title order={4}>Commercial terms</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput
                    label="Advance payment (%)"
                    min={0}
                    max={100}
                    decimalScale={2}
                    value={draft.payment_advance_percent ?? ""}
                    onChange={(value) => updateDraft("payment_advance_percent", toNullableNumber(value))}
                  />
                  <NumberInput
                    label="Balance payment (%)"
                    min={0}
                    max={100}
                    decimalScale={2}
                    value={draft.payment_balance_percent ?? ""}
                    onChange={(value) => updateDraft("payment_balance_percent", toNullableNumber(value))}
                  />
                  <TextInput
                    label="Payment method"
                    placeholder="T/T, L/C..."
                    value={draft.payment_method}
                    onChange={(event) => updateDraft("payment_method", event.currentTarget.value)}
                  />
                  <TextInput
                    label="Balance trigger"
                    placeholder="Against documents, before shipment..."
                    value={draft.payment_balance_trigger}
                    onChange={(event) => updateDraft("payment_balance_trigger", event.currentTarget.value)}
                  />
                </SimpleGrid>
                <Textarea
                  label="Payment terms"
                  minRows={3}
                  value={draft.payment_terms}
                  onChange={(event) => updateDraft("payment_terms", event.currentTarget.value)}
                />
              </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Stack>
                <Title order={4}>Pricing summary</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <NumberInput
                    label="Freight"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    value={draft.freight}
                    onChange={(value) => updateDraft("freight", toNumber(value))}
                  />
                  <NumberInput
                    label="Insurance"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    value={draft.insurance}
                    onChange={(value) => updateDraft("insurance", toNumber(value))}
                  />
                  <NumberInput
                    label="Tax"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    value={draft.tax_amount}
                    onChange={(value) => updateDraft("tax_amount", toNumber(value))}
                  />
                  <NumberInput
                    label="Other charges"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    value={draft.other_charges}
                    onChange={(value) => updateDraft("other_charges", toNumber(value))}
                  />
                </SimpleGrid>
                <Divider />
                <Group justify="space-between">
                  <Text>Subtotal</Text>
                  <Text fw={600}>
                    {draft.currency} {calculated.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    Grand total
                  </Text>
                  <Text fw={700} size="lg">
                    {draft.currency} {calculated.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md">
            <Stack>
              <Title order={4}>Delivery and logistics</Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <TextInput
                  label="Incoterm"
                  placeholder="CFR, FOB, EXW..."
                  value={draft.incoterm_rule}
                  onChange={(event) => updateDraft("incoterm_rule", event.currentTarget.value)}
                />
                <TextInput
                  label="Named place / port"
                  value={draft.named_place}
                  onChange={(event) => updateDraft("named_place", event.currentTarget.value)}
                />
                <Select
                  label="Incoterms version"
                  value={draft.incoterms_version}
                  data={["2020", "2010"]}
                  onChange={(value) => updateDraft("incoterms_version", value ?? "2020")}
                />
                <Select
                  label="Shipment method"
                  clearable
                  value={draft.shipment_method || null}
                  data={SHIPMENT_METHODS_V2.map((method) => ({
                    value: method,
                    label: method.replaceAll("_", " "),
                  }))}
                  onChange={(value) =>
                    updateDraft("shipment_method", (value ?? "") as QuotationDraftV2["shipment_method"])
                  }
                />
                <TextInput
                  label="Loading port"
                  value={draft.loading_port}
                  onChange={(event) => updateDraft("loading_port", event.currentTarget.value)}
                />
                <TextInput
                  label="Discharge port"
                  value={draft.discharge_port}
                  onChange={(event) => updateDraft("discharge_port", event.currentTarget.value)}
                />
                <TextInput
                  label="Expected readiness date"
                  type="date"
                  value={draft.expected_readiness_date ?? ""}
                  onChange={(event) =>
                    updateDraft("expected_readiness_date", event.currentTarget.value || null)
                  }
                />
                <TextInput
                  label="Latest shipment date"
                  type="date"
                  value={draft.latest_shipment_date ?? ""}
                  onChange={(event) => updateDraft("latest_shipment_date", event.currentTarget.value || null)}
                />
                <TextInput
                  label="Origin country"
                  value={draft.origin_country}
                  onChange={(event) => updateDraft("origin_country", event.currentTarget.value)}
                />
                <TextInput
                  label="Producing mill"
                  value={draft.producing_mill}
                  onChange={(event) => updateDraft("producing_mill", event.currentTarget.value)}
                />
                <Select
                  label="Partial shipment"
                  value={nullableBooleanValue(draft.partial_shipment_allowed)}
                  data={[
                    { value: "unspecified", label: "Not specified" },
                    { value: "yes", label: "Allowed" },
                    { value: "no", label: "Not allowed" },
                  ]}
                  onChange={(value) => updateDraft("partial_shipment_allowed", parseNullableBoolean(value))}
                />
                <Select
                  label="Transshipment"
                  value={nullableBooleanValue(draft.transshipment_allowed)}
                  data={[
                    { value: "unspecified", label: "Not specified" },
                    { value: "yes", label: "Allowed" },
                    { value: "no", label: "Not allowed" },
                  ]}
                  onChange={(value) => updateDraft("transshipment_allowed", parseNullableBoolean(value))}
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Stack>
              <Title order={4}>Conditions and instructions</Title>
              <SimpleGrid cols={{ base: 1, lg: 2 }}>
                <Textarea
                  label="Packing terms"
                  minRows={3}
                  value={draft.packing_terms}
                  onChange={(event) => updateDraft("packing_terms", event.currentTarget.value)}
                />
                <Textarea
                  label="Marking terms"
                  minRows={3}
                  value={draft.marking_terms}
                  onChange={(event) => updateDraft("marking_terms", event.currentTarget.value)}
                />
                <Textarea
                  label="Inspection terms"
                  minRows={3}
                  value={draft.inspection_terms}
                  onChange={(event) => updateDraft("inspection_terms", event.currentTarget.value)}
                />
                <Textarea
                  label="Documentation terms"
                  minRows={3}
                  value={draft.documentation_terms}
                  onChange={(event) => updateDraft("documentation_terms", event.currentTarget.value)}
                />
                <Textarea
                  label="Special conditions"
                  minRows={4}
                  value={draft.special_conditions}
                  onChange={(event) => updateDraft("special_conditions", event.currentTarget.value)}
                />
                <Textarea
                  label="Internal / offer notes"
                  minRows={4}
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.currentTarget.value)}
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Group justify="flex-end" pos="sticky" bottom={0} bg="var(--mantine-color-body)" py="sm">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={saving} disabled={isLocked}>
              {quotationId ? "Save quotation" : "Create quotation"}
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
