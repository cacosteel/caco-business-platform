export type InquiryStatusV2 =
  | "Draft"
  | "Sourcing"
  | "Quoted"
  | "Won"
  | "Lost"
  | "Cancelled";

export type ToleranceUnitV2 = "percent" | "MT";

export type InvoicingBasisV2 =
  | "actual_net_weight"
  | "theoretical_weight"
  | "pieces";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface InquiryItemV2 {
  id: string;
  inquiry_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface InquiryV2 {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  seller_entity_id: string | null;
  inquiry_no: string | null;
  inquiry_date: string;
  status: InquiryStatusV2;
  customer_reference: string | null;
  received_at: string | null;
  currency: string;
  revision_no: number;
  root_inquiry_id: string | null;
  is_current: boolean;
  total_tolerance_minus: number | null;
  total_tolerance_plus: number | null;
  total_tolerance_unit: ToleranceUnitV2 | null;
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
  reason: string | null;
  created_at: string;
  updated_at: string;
  inquiry_items: InquiryItemV2[];
}

export interface InquiryItemV2Draft {
  client_key: string;
  id?: string;
  product_id: string | null;
  specification_template_id: string | null;
  product_name: string;
  customer_item_code: string;
  internal_product_code: string;
  grade: string;
  standard: string;
  thickness_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  coating: string;
  color_ral: string;
  surface_treatment: string;
  coil_inner_diameter_mm: number | null;
  coil_outer_diameter_mm: number | null;
  target_coil_weight_mt: number | null;
  quantity: number | null;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnitV2;
  invoicing_basis: InvoicingBasisV2;
  theoretical_unit_weight_kg: number | null;
  theoretical_weight_override_note: string;
  pieces_per_bundle: number | null;
  additional_specification: string;
  packing_requirements: string;
  required_documents: string;
  specification_data: JsonValue;
}

export interface InquiryV2Draft {
  id?: string;
  company_id: string;
  contact_id: string | null;
  inquiry_date: string;
  customer_reference: string;
  received_at: string;
  currency: string;
  total_tolerance_minus: number | null;
  total_tolerance_plus: number | null;
  total_tolerance_unit: ToleranceUnitV2;
  loading_port: string;
  discharge_port: string;
  requested_incoterms: string[];
  requested_payment_terms: string;
  requested_shipment_method: string;
  requested_latest_shipment_date: string;
  requested_marking_terms: string;
  special_conditions: string;
  required_documents: string;
  packing_requirements: string;
  readiness_requirement: string;
  notes: string;
  items: InquiryItemV2Draft[];
}

export interface InquiryV2ValidationError {
  field: string;
  message: string;
}

export function createBlankInquiryItemV2(): InquiryItemV2Draft {
  return {
    client_key: globalThis.crypto.randomUUID(),
    product_id: null,
    specification_template_id: null,
    product_name: "",
    customer_item_code: "",
    internal_product_code: "",
    grade: "",
    standard: "",
    thickness_mm: null,
    width_mm: null,
    length_mm: null,
    coating: "",
    color_ral: "",
    surface_treatment: "",
    coil_inner_diameter_mm: null,
    coil_outer_diameter_mm: null,
    target_coil_weight_mt: null,
    quantity: null,
    unit: "MT",
    tolerance_minus: null,
    tolerance_plus: null,
    tolerance_unit: "percent",
    invoicing_basis: "actual_net_weight",
    theoretical_unit_weight_kg: null,
    theoretical_weight_override_note: "",
    pieces_per_bundle: null,
    additional_specification: "",
    packing_requirements: "",
    required_documents: "",
    specification_data: {},
  };
}

export function createBlankInquiryV2Draft(): InquiryV2Draft {
  const today = new Date().toISOString().slice(0, 10);

  return {
    company_id: "",
    contact_id: null,
    inquiry_date: today,
    customer_reference: "",
    received_at: `${today}T09:00`,
    currency: "USD",
    total_tolerance_minus: null,
    total_tolerance_plus: null,
    total_tolerance_unit: "percent",
    loading_port: "",
    discharge_port: "",
    requested_incoterms: [],
    requested_payment_terms: "",
    requested_shipment_method: "",
    requested_latest_shipment_date: "",
    requested_marking_terms: "",
    special_conditions: "",
    required_documents: "",
    packing_requirements: "",
    readiness_requirement: "",
    notes: "",
    items: [createBlankInquiryItemV2()],
  };
}
