import { supabase } from "../lib/supabase";
import type {
  InquiryQuotationSourceV2,
  InvoicingBasisV2,
  QuotationDraftV2,
  QuotationFormOptionsV2,
  QuotationItemV2,
  QuotationRecipientV2,
  QuotationStatusV2,
  QuotationV2,
  ShipmentMethodV2,
} from "../types/quotationV2";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asRecipients(value: unknown): QuotationRecipientV2[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const recipient = asRecord(entry);
      return {
        name: asString(recipient.name),
        email: asString(recipient.email),
      };
    })
    .filter((recipient) => recipient.name.length > 0 || recipient.email.length > 0);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeItem(item: QuotationItemV2, index: number): QuotationItemV2 {
  const quantity = Math.max(0, asNumber(item.quantity));
  const unitPrice = Math.max(0, asNumber(item.unit_price));

  return {
    ...item,
    line_no: index + 1,
    product_name: item.product_name.trim(),
    quantity,
    unit: item.unit.trim() || "MT",
    unit_price: roundMoney(unitPrice),
    amount: roundMoney(quantity * unitPrice),
  };
}

export function calculateQuotationTotalsV2(draft: QuotationDraftV2): {
  items: QuotationItemV2[];
  subtotal: number;
  totalAmount: number;
} {
  const items = draft.items.map(normalizeItem);
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const totalAmount = roundMoney(
    subtotal +
      Math.max(0, asNumber(draft.freight)) +
      Math.max(0, asNumber(draft.insurance)) +
      Math.max(0, asNumber(draft.tax_amount)) +
      Math.max(0, asNumber(draft.other_charges)),
  );

  return { items, subtotal, totalAmount };
}

export function validateQuotationDraftV2(draft: QuotationDraftV2): string[] {
  const errors: string[] = [];
  const recipients = [...draft.to_recipients, ...draft.cc_recipients];

  if (!draft.company_id) errors.push("Select a customer company.");
  if (!draft.inquiry_id) errors.push("Select the source inquiry.");
  if (!draft.quotation_date) errors.push("Enter the quotation date.");
  if (!draft.valid_until) errors.push("Enter the validity date.");
  if (draft.valid_until && draft.quotation_date && draft.valid_until < draft.quotation_date) {
    errors.push("The validity date cannot be before the quotation date.");
  }
  if (
    draft.latest_shipment_date &&
    draft.expected_readiness_date &&
    draft.latest_shipment_date < draft.expected_readiness_date
  ) {
    errors.push("The latest shipment date cannot be before the expected readiness date.");
  }
  if (draft.to_recipients.length === 0) errors.push("Add at least one To recipient.");

  recipients.forEach((recipient) => {
    if (!recipient.email.trim() || !EMAIL_PATTERN.test(recipient.email.trim())) {
      errors.push(`Enter a valid recipient email${recipient.name ? ` for ${recipient.name}` : ""}.`);
    }
  });
  const normalizedRecipientEmails = recipients
    .map((recipient) => recipient.email.trim().toLowerCase())
    .filter(Boolean);
  if (new Set(normalizedRecipientEmails).size !== normalizedRecipientEmails.length) {
    errors.push("A recipient email can appear only once across To and CC.");
  }

  if (draft.items.length === 0) errors.push("Add at least one quotation line.");
  draft.items.forEach((item, index) => {
    if (!item.product_name.trim()) errors.push(`Line ${index + 1}: product is required.`);
    if (asNumber(item.quantity) <= 0) errors.push(`Line ${index + 1}: quantity must be positive.`);
    if (asNumber(item.unit_price) <= 0) errors.push(`Line ${index + 1}: unit price must be positive.`);
  });

  const advance = asNullableNumber(draft.payment_advance_percent);
  const balance = asNullableNumber(draft.payment_balance_percent);
  if (advance !== null && (advance < 0 || advance > 100)) {
    errors.push("Advance payment percentage must be between 0 and 100.");
  }
  if (balance !== null && (balance < 0 || balance > 100)) {
    errors.push("Balance payment percentage must be between 0 and 100.");
  }
  if (advance !== null && balance !== null && Math.abs(advance + balance - 100) > 0.0001) {
    errors.push("Advance and balance payment percentages must total 100.");
  }

  return [...new Set(errors)];
}

function mapQuotationItem(rowValue: unknown): QuotationItemV2 {
  const row = asRecord(rowValue);
  const toleranceUnit = asString(row.tolerance_unit);
  const invoicingBasis = asString(row.invoicing_basis);

  return {
    id: asNullableString(row.id) ?? undefined,
    inquiry_item_id: asNullableString(row.inquiry_item_id),
    costing_line_id: asNullableString(row.costing_line_id),
    line_no: asNumber(row.line_no),
    customer_item_code: asString(row.customer_item_code),
    internal_product_code: asString(row.internal_product_code),
    product_name: asString(row.product_name),
    grade: asString(row.grade),
    standard: asString(row.standard),
    dimensions_text: asString(row.dimensions_text),
    specification_snapshot: asRecord(row.specification_snapshot),
    quantity: asNumber(row.quantity),
    unit: asString(row.unit) || "MT",
    tolerance_minus: asNullableNumber(row.tolerance_minus),
    tolerance_plus: asNullableNumber(row.tolerance_plus),
    tolerance_unit: toleranceUnit === "MT" ? "MT" : "percent",
    invoicing_basis: ["actual_net_weight", "theoretical_weight", "pieces"].includes(
      invoicingBasis,
    )
      ? (invoicingBasis as InvoicingBasisV2)
      : "actual_net_weight",
    unit_price: asNumber(row.unit_price),
    amount: asNumber(row.amount),
  };
}

function mapQuotation(rowValue: unknown, itemValues: unknown[]): QuotationV2 {
  const row = asRecord(rowValue);
  const status = asString(row.status) || "Draft";
  const shipmentMethod = asString(row.shipment_method);

  return {
    id: asString(row.id),
    inquiry_id: asNullableString(row.inquiry_id),
    quotation_no: asString(row.quotation_no),
    quotation_date: asString(row.quotation_date),
    valid_until: asNullableString(row.valid_until),
    status: status as QuotationStatusV2,
    currency: asString(row.currency) || "USD",
    company_id: asNullableString(row.company_id),
    contact_id: asNullableString(row.contact_id),
    seller_entity_id: asNullableString(row.seller_entity_id),
    seller_bank_account_id: asNullableString(row.seller_bank_account_id),
    costing_scenario_id: asNullableString(row.costing_scenario_id),
    to_recipients: asRecipients(row.to_recipients),
    cc_recipients: asRecipients(row.cc_recipients),
    subtotal: asNumber(row.subtotal),
    freight: asNumber(row.freight),
    insurance: asNumber(row.insurance),
    tax_amount: asNumber(row.tax_amount),
    other_charges: asNumber(row.other_charges),
    total_amount: asNumber(row.total_amount),
    payment_advance_percent: asNullableNumber(row.payment_advance_percent),
    payment_balance_percent: asNullableNumber(row.payment_balance_percent),
    payment_method: asString(row.payment_method),
    payment_balance_trigger: asString(row.payment_balance_trigger),
    payment_terms: asString(row.payment_terms),
    incoterm_rule: asString(row.incoterm_rule),
    named_place: asString(row.named_place),
    incoterms_version: asString(row.incoterms_version) || "2020",
    loading_port: asString(row.loading_port),
    discharge_port: asString(row.discharge_port),
    shipment_method: shipmentMethod as ShipmentMethodV2 | "",
    partial_shipment_allowed: asNullableBoolean(row.partial_shipment_allowed),
    transshipment_allowed: asNullableBoolean(row.transshipment_allowed),
    expected_readiness_date: asNullableString(row.expected_readiness_date),
    latest_shipment_date: asNullableString(row.latest_shipment_date),
    origin_country: asString(row.origin_country),
    producing_mill: asString(row.producing_mill),
    packing_terms: asString(row.packing_terms),
    marking_terms: asString(row.marking_terms),
    inspection_terms: asString(row.inspection_terms),
    documentation_terms: asString(row.documentation_terms),
    special_conditions: asString(row.special_conditions),
    notes: asString(row.notes),
    revision_no: asNumber(row.revision_no),
    is_current: row.is_current !== false,
    items: itemValues.map(mapQuotationItem),
    created_at: asNullableString(row.created_at) ?? undefined,
    updated_at: asNullableString(row.updated_at) ?? undefined,
  };
}

export async function getQuotationFormOptionsV2(): Promise<QuotationFormOptionsV2> {
  const [companiesResult, contactsResult, inquiriesResult, sellersResult, banksResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id,name")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("company_contacts")
        .select("id,company_id,first_name,last_name,email")
        .is("deleted_at", null)
        .order("first_name"),
      supabase
        .from("inquiries")
        .select("id,inquiry_no,company_id,contact_id,currency,customer_reference")
        .is("deleted_at", null)
        .eq("is_current", true)
        .order("inquiry_date", { ascending: false }),
      supabase
        .from("selling_entities")
        .select("id,code,legal_name")
        .eq("is_active", true)
        .order("legal_name"),
      supabase
        .from("seller_bank_accounts")
        .select("id,selling_entity_id,bank_name,account_name,iban,currency")
        .eq("is_active", true)
        .order("bank_name"),
    ]);

  const firstError = [
    companiesResult.error,
    contactsResult.error,
    inquiriesResult.error,
    sellersResult.error,
    banksResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  return {
    companies: (companiesResult.data ?? []).map((value) => {
      const row = asRecord(value);
      return { id: asString(row.id), name: asString(row.name) };
    }),
    contacts: (contactsResult.data ?? []).map((value) => {
      const row = asRecord(value);
      const name = [asString(row.first_name), asString(row.last_name)].filter(Boolean).join(" ");
      return {
        id: asString(row.id),
        company_id: asString(row.company_id),
        name,
        email: asString(row.email),
      };
    }),
    inquiries: (inquiriesResult.data ?? []).map((value) => {
      const row = asRecord(value);
      return {
        id: asString(row.id),
        inquiry_no: asString(row.inquiry_no),
        company_id: asNullableString(row.company_id),
        contact_id: asNullableString(row.contact_id),
        currency: asString(row.currency) || "USD",
        customer_reference: asString(row.customer_reference),
      };
    }),
    sellingEntities: (sellersResult.data ?? []).map((value) => {
      const row = asRecord(value);
      return {
        id: asString(row.id),
        code: asString(row.code),
        legal_name: asString(row.legal_name),
      };
    }),
    sellerBanks: (banksResult.data ?? []).map((value) => {
      const row = asRecord(value);
      const iban = asString(row.iban);
      const bankName = asString(row.bank_name);
      const accountName = asString(row.account_name);
      return {
        id: asString(row.id),
        selling_entity_id: asString(row.selling_entity_id),
        label: [bankName, accountName, iban].filter(Boolean).join(" · "),
        currency: asString(row.currency) || "USD",
      };
    }),
  };
}

export async function getInquiryQuotationSourceV2(
  inquiryId: string,
): Promise<InquiryQuotationSourceV2> {
  const [inquiryResult, itemsResult] = await Promise.all([
    supabase
      .from("inquiries")
      .select(
        "id,inquiry_no,company_id,contact_id,currency,customer_reference,loading_port,discharge_port,requested_incoterms,packing_requirements,required_documents,readiness_requirement",
      )
      .eq("id", inquiryId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("inquiry_items")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("line_no"),
  ]);

  if (inquiryResult.error) throw inquiryResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const inquiryRow = asRecord(inquiryResult.data);
  const contactId = asNullableString(inquiryRow.contact_id);
  let contact: InquiryQuotationSourceV2["contact"] = null;

  if (contactId) {
    const { data, error } = await supabase
      .from("company_contacts")
      .select("id,company_id,first_name,last_name,email")
      .eq("id", contactId)
      .single();
    if (error) throw error;
    const row = asRecord(data);
    contact = {
      id: asString(row.id),
      company_id: asString(row.company_id),
      name: [asString(row.first_name), asString(row.last_name)].filter(Boolean).join(" "),
      email: asString(row.email),
    };
  }

  const requestedIncoterms = Array.isArray(inquiryRow.requested_incoterms)
    ? inquiryRow.requested_incoterms
        .map((value) => {
          if (typeof value === "string") return value;
          const row = asRecord(value);
          return asString(row.rule) || asString(row.incoterm_rule);
        })
        .filter(Boolean)
    : [];

  const items = (itemsResult.data ?? []).map((value, index) => {
    const row = asRecord(value);
    const dimensions = [row.thickness_mm, row.width_mm, row.length_mm]
      .filter((entry) => entry !== null && entry !== undefined && entry !== "")
      .map(String)
      .join(" x ");
    const specificationSnapshot = { ...row };
    delete specificationSnapshot.id;
    delete specificationSnapshot.inquiry_id;
    delete specificationSnapshot.created_at;
    delete specificationSnapshot.updated_at;

    return mapQuotationItem({
      inquiry_item_id: asString(row.id),
      line_no: index + 1,
      customer_item_code: row.customer_item_code,
      internal_product_code: row.internal_product_code,
      product_name: row.product_name,
      grade: row.grade,
      standard: row.standard,
      dimensions_text: dimensions,
      specification_snapshot: specificationSnapshot,
      quantity: row.quantity,
      unit: row.unit,
      tolerance_minus: row.tolerance_minus,
      tolerance_plus: row.tolerance_plus,
      tolerance_unit: row.tolerance_unit,
      invoicing_basis: row.invoicing_basis,
      unit_price: 0,
      amount: 0,
    });
  });

  return {
    inquiry: {
      id: asString(inquiryRow.id),
      inquiry_no: asString(inquiryRow.inquiry_no),
      company_id: asNullableString(inquiryRow.company_id),
      contact_id: contactId,
      currency: asString(inquiryRow.currency) || "USD",
      customer_reference: asString(inquiryRow.customer_reference),
      loading_port: asString(inquiryRow.loading_port),
      discharge_port: asString(inquiryRow.discharge_port),
      requested_incoterms: requestedIncoterms,
      packing_requirements: asString(inquiryRow.packing_requirements),
      required_documents: asString(inquiryRow.required_documents),
      readiness_requirement: asString(inquiryRow.readiness_requirement),
    },
    contact,
    items,
  };
}

export async function getQuotationV2(id: string): Promise<QuotationV2> {
  const [quotationResult, itemsResult] = await Promise.all([
    supabase.from("quotations").select("*").eq("id", id).single(),
    supabase.from("quotation_items").select("*").eq("quotation_id", id).order("line_no"),
  ]);

  if (quotationResult.error) throw quotationResult.error;
  if (itemsResult.error) throw itemsResult.error;
  return mapQuotation(quotationResult.data, itemsResult.data ?? []);
}

export async function saveQuotationV2(
  draft: QuotationDraftV2,
  quotationId: string | null = null,
): Promise<QuotationV2> {
  const errors = validateQuotationDraftV2(draft);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const { items, subtotal, totalAmount } = calculateQuotationTotalsV2(draft);
  const header = {
    inquiry_id: draft.inquiry_id,
    quotation_date: draft.quotation_date,
    valid_until: draft.valid_until,
    status: draft.status,
    currency: draft.currency.trim().toUpperCase(),
    company_id: draft.company_id,
    contact_id: draft.contact_id,
    seller_entity_id: draft.seller_entity_id,
    seller_bank_account_id: draft.seller_bank_account_id,
    costing_scenario_id: draft.costing_scenario_id,
    to_recipients: draft.to_recipients.map((recipient) => ({
      name: recipient.name.trim(),
      email: recipient.email.trim().toLowerCase(),
    })),
    cc_recipients: draft.cc_recipients.map((recipient) => ({
      name: recipient.name.trim(),
      email: recipient.email.trim().toLowerCase(),
    })),
    subtotal,
    freight: Math.max(0, asNumber(draft.freight)),
    insurance: Math.max(0, asNumber(draft.insurance)),
    tax_amount: Math.max(0, asNumber(draft.tax_amount)),
    other_charges: Math.max(0, asNumber(draft.other_charges)),
    total_amount: totalAmount,
    payment_advance_percent: asNullableNumber(draft.payment_advance_percent),
    payment_balance_percent: asNullableNumber(draft.payment_balance_percent),
    payment_method: draft.payment_method.trim() || null,
    payment_balance_trigger: draft.payment_balance_trigger.trim() || null,
    payment_terms: draft.payment_terms.trim() || null,
    incoterm_rule: draft.incoterm_rule.trim().toUpperCase() || null,
    named_place: draft.named_place.trim() || null,
    incoterms_version: draft.incoterms_version.trim() || "2020",
    loading_port: draft.loading_port.trim() || null,
    discharge_port: draft.discharge_port.trim() || null,
    shipment_method: draft.shipment_method || null,
    partial_shipment_allowed: draft.partial_shipment_allowed,
    transshipment_allowed: draft.transshipment_allowed,
    expected_readiness_date: draft.expected_readiness_date,
    latest_shipment_date: draft.latest_shipment_date,
    origin_country: draft.origin_country.trim() || null,
    producing_mill: draft.producing_mill.trim() || null,
    packing_terms: draft.packing_terms.trim() || null,
    marking_terms: draft.marking_terms.trim() || null,
    inspection_terms: draft.inspection_terms.trim() || null,
    documentation_terms: draft.documentation_terms.trim() || null,
    special_conditions: draft.special_conditions.trim() || null,
    notes: draft.notes.trim() || null,
  };

  const itemPayload = items.map(({ id, ...item }) => ({
    ...(id ? { id } : {}),
    ...item,
  }));
  const { data, error } = await supabase.rpc("save_quotation_v2", {
    p_quotation_id: quotationId,
    p_header: header,
    p_items: itemPayload,
  });

  if (error) throw error;
  const returnedRow = Array.isArray(data) ? data[0] : data;
  const savedId = asString(asRecord(returnedRow).id);
  if (!savedId) throw new Error("The quotation was saved but no record ID was returned.");

  return getQuotationV2(savedId);
}
