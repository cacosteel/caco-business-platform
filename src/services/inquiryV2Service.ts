import { supabase } from "../lib/supabase";
import type {
  InquiryItemV2,
  InquiryItemV2Draft,
  InquiryV2,
  InquiryV2Draft,
  InquiryV2ValidationError,
  InvoicingBasisV2,
  JsonValue,
  ToleranceUnitV2,
} from "../types/inquiryV2";

interface InquiryV2Row extends Omit<InquiryV2, "inquiry_items" | "requested_incoterms"> {
  requested_incoterms: JsonValue;
  inquiry_items: InquiryItemV2[] | null;
}

interface SaveInquiryHeaderRpc {
  company_id: string;
  contact_id: string | null;
  inquiry_date: string;
  customer_reference: string | null;
  received_at: string | null;
  currency: string;
  total_tolerance_minus: number | null;
  total_tolerance_plus: number | null;
  total_tolerance_unit: ToleranceUnitV2;
  loading_port: string | null;
  discharge_port: string | null;
  requested_incoterms: string[];
  requested_payment_terms: string | null;
  requested_shipment_method: string | null;
  requested_latest_shipment_date: string | null;
  requested_marking_terms: string | null;
  special_conditions: string | null;
  required_documents: string | null;
  packing_requirements: string | null;
  readiness_requirement: string | null;
  notes: string | null;
}

interface SaveInquiryItemRpc {
  id: string | null;
  line_no: number;
  product_id: string | null;
  specification_template_id: string | null;
  product_name: string;
  customer_item_code: string | null;
  internal_product_code: string | null;
  grade: string | null;
  standard: string | null;
  thickness_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  coating: string | null;
  color_ral: string | null;
  surface_treatment: string | null;
  coil_inner_diameter_mm: number | null;
  coil_outer_diameter_mm: number | null;
  target_coil_weight_mt: number | null;
  quantity: number;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnitV2;
  invoicing_basis: InvoicingBasisV2;
  theoretical_unit_weight_kg: number | null;
  theoretical_weight_override_note: string | null;
  pieces_per_bundle: number | null;
  additional_specification: string | null;
  packing_requirements: string | null;
  required_documents: string | null;
  specification_data: JsonValue;
}

interface SupabaseErrorShape {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableDateTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractInquiryId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return extractInquiryId(value[0]);
  if (!isRecord(value)) return null;

  if (typeof value.id === "string") return value.id;
  if (typeof value.inquiry_id === "string") return value.inquiry_id;
  return null;
}

function normalizeIncoterms(value: JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeInquiry(row: InquiryV2Row): InquiryV2 {
  return {
    ...row,
    requested_incoterms: normalizeIncoterms(row.requested_incoterms),
    inquiry_items: [...(row.inquiry_items ?? [])].sort(
      (left, right) => left.line_no - right.line_no,
    ),
  };
}

function formatSaveError(error: SupabaseErrorShape): Error {
  if (error.code === "PGRST202" || error.message.includes("save_inquiry_v2")) {
    return new Error(
      "The inquiry V2 database migration is not installed yet. Apply the latest database migration and try again.",
    );
  }

  if (error.code === "42501") {
    return new Error("Approved administrator access is required to save inquiries.");
  }

  const detail = error.details?.trim();
  return new Error(detail ? `${error.message}: ${detail}` : error.message);
}

function toHeaderRpc(draft: InquiryV2Draft): SaveInquiryHeaderRpc {
  return {
    company_id: draft.company_id,
    contact_id: draft.contact_id,
    inquiry_date: draft.inquiry_date,
    customer_reference: nullableText(draft.customer_reference),
    received_at: nullableDateTime(draft.received_at),
    currency: draft.currency.trim().toUpperCase(),
    total_tolerance_minus: draft.total_tolerance_minus,
    total_tolerance_plus: draft.total_tolerance_plus,
    total_tolerance_unit: draft.total_tolerance_unit,
    loading_port: nullableText(draft.loading_port),
    discharge_port: nullableText(draft.discharge_port),
    requested_incoterms: draft.requested_incoterms,
    requested_payment_terms: nullableText(draft.requested_payment_terms),
    requested_shipment_method: nullableText(draft.requested_shipment_method),
    requested_latest_shipment_date: nullableText(
      draft.requested_latest_shipment_date,
    ),
    requested_marking_terms: nullableText(draft.requested_marking_terms),
    special_conditions: nullableText(draft.special_conditions),
    required_documents: nullableText(draft.required_documents),
    packing_requirements: nullableText(draft.packing_requirements),
    readiness_requirement: nullableText(draft.readiness_requirement),
    notes: nullableText(draft.notes),
  };
}

function toItemRpc(item: InquiryItemV2Draft, index: number): SaveInquiryItemRpc {
  return {
    id: item.id ?? null,
    line_no: index + 1,
    product_id: item.product_id,
    specification_template_id: item.specification_template_id,
    product_name: item.product_name.trim(),
    customer_item_code: nullableText(item.customer_item_code),
    internal_product_code: nullableText(item.internal_product_code),
    grade: nullableText(item.grade),
    standard: nullableText(item.standard),
    thickness_mm: item.thickness_mm,
    width_mm: item.width_mm,
    length_mm: item.length_mm,
    coating: nullableText(item.coating),
    color_ral: nullableText(item.color_ral),
    surface_treatment: nullableText(item.surface_treatment),
    coil_inner_diameter_mm: item.coil_inner_diameter_mm,
    coil_outer_diameter_mm: item.coil_outer_diameter_mm,
    target_coil_weight_mt: item.target_coil_weight_mt,
    quantity: item.quantity ?? 0,
    unit: item.unit.trim(),
    tolerance_minus: item.tolerance_minus,
    tolerance_plus: item.tolerance_plus,
    tolerance_unit: item.tolerance_unit,
    invoicing_basis: item.invoicing_basis,
    theoretical_unit_weight_kg: item.theoretical_unit_weight_kg,
    theoretical_weight_override_note: nullableText(
      item.theoretical_weight_override_note,
    ),
    pieces_per_bundle: item.pieces_per_bundle,
    additional_specification: nullableText(item.additional_specification),
    packing_requirements: nullableText(item.packing_requirements),
    required_documents: nullableText(item.required_documents),
    specification_data: item.specification_data,
  };
}

export function validateInquiryV2(
  draft: InquiryV2Draft,
): InquiryV2ValidationError[] {
  const errors: InquiryV2ValidationError[] = [];

  if (!draft.company_id) {
    errors.push({ field: "company_id", message: "Select a customer company." });
  }
  if (!draft.inquiry_date) {
    errors.push({ field: "inquiry_date", message: "Enter the inquiry date." });
  }
  if (!draft.currency.trim()) {
    errors.push({ field: "currency", message: "Select a currency." });
  } else if (draft.currency.trim().toUpperCase() !== "USD") {
    errors.push({
      field: "currency",
      message: "The current sales workflow supports USD inquiries only.",
    });
  }
  if (draft.items.length === 0) {
    errors.push({ field: "items", message: "Add at least one inquiry line." });
  }

  draft.items.forEach((item, index) => {
    const line = index + 1;
    if (!item.product_name.trim()) {
      errors.push({
        field: `items.${index}.product_name`,
        message: `Enter a product name on line ${line}.`,
      });
    }
    if (item.quantity === null || item.quantity <= 0) {
      errors.push({
        field: `items.${index}.quantity`,
        message: `Quantity must be greater than zero on line ${line}.`,
      });
    }
    if (!item.unit.trim()) {
      errors.push({
        field: `items.${index}.unit`,
        message: `Enter a unit on line ${line}.`,
      });
    }
  });

  return errors;
}

export async function getInquiryV2(id: string): Promise<InquiryV2> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*, inquiry_items(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw formatSaveError(error);
  return normalizeInquiry(data as unknown as InquiryV2Row);
}

/**
 * Saves the header and its complete line collection inside one database
 * transaction. The save_inquiry_v2 RPC is supplied by the matching migration;
 * the browser intentionally does not attempt a multi-request pseudo-transaction.
 */
export async function saveInquiryV2(draft: InquiryV2Draft): Promise<InquiryV2> {
  const validationErrors = validateInquiryV2(draft);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0].message);
  }

  const { data, error } = await supabase.rpc("save_inquiry_v2", {
    p_inquiry_id: draft.id ?? null,
    p_header: toHeaderRpc(draft),
    p_items: draft.items.map(toItemRpc),
  });

  if (error) throw formatSaveError(error);

  const inquiryId = extractInquiryId(data) ?? draft.id ?? null;
  if (!inquiryId) {
    throw new Error("The inquiry was saved, but the database did not return its ID.");
  }

  return getInquiryV2(inquiryId);
}
