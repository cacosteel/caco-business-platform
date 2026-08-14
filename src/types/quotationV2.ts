export const QUOTATION_STATUSES_V2 = [
  "Draft",
  "Sent",
  "Under Negotiation",
  "Accepted",
  "Rejected",
  "Expired",
] as const;

export type QuotationStatusV2 = (typeof QUOTATION_STATUSES_V2)[number];

export const SHIPMENT_METHODS_V2 = [
  "container",
  "breakbulk",
  "ro_ro",
  "truck",
  "rail",
  "other",
] as const;

export type ShipmentMethodV2 = (typeof SHIPMENT_METHODS_V2)[number];

export const INVOICING_BASES_V2 = [
  "actual_net_weight",
  "theoretical_weight",
  "pieces",
] as const;

export type InvoicingBasisV2 = (typeof INVOICING_BASES_V2)[number];
export type ToleranceUnitV2 = "percent" | "MT";

export interface QuotationRecipientV2 {
  name: string;
  email: string;
}

export interface QuotationItemV2 {
  id?: string;
  inquiry_item_id: string | null;
  costing_line_id: string | null;
  line_no: number;
  customer_item_code: string;
  internal_product_code: string;
  product_name: string;
  grade: string;
  standard: string;
  dimensions_text: string;
  specification_snapshot: Record<string, unknown>;
  quantity: number;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnitV2;
  invoicing_basis: InvoicingBasisV2;
  unit_price: number;
  amount: number;
}

export interface QuotationV2 {
  id: string;
  inquiry_id: string | null;
  quotation_no: string;
  quotation_date: string;
  valid_until: string | null;
  status: QuotationStatusV2;
  currency: string;
  company_id: string | null;
  contact_id: string | null;
  seller_entity_id: string | null;
  seller_bank_account_id: string | null;
  costing_scenario_id: string | null;
  to_recipients: QuotationRecipientV2[];
  cc_recipients: QuotationRecipientV2[];
  subtotal: number;
  freight: number;
  insurance: number;
  tax_amount: number;
  other_charges: number;
  total_amount: number;
  payment_advance_percent: number | null;
  payment_balance_percent: number | null;
  payment_method: string;
  payment_balance_trigger: string;
  payment_terms: string;
  incoterm_rule: string;
  named_place: string;
  incoterms_version: string;
  loading_port: string;
  discharge_port: string;
  shipment_method: ShipmentMethodV2 | "";
  partial_shipment_allowed: boolean | null;
  transshipment_allowed: boolean | null;
  expected_readiness_date: string | null;
  latest_shipment_date: string | null;
  origin_country: string;
  producing_mill: string;
  packing_terms: string;
  marking_terms: string;
  inspection_terms: string;
  documentation_terms: string;
  special_conditions: string;
  notes: string;
  revision_no: number;
  is_current: boolean;
  items: QuotationItemV2[];
  created_at?: string;
  updated_at?: string;
}

export type QuotationDraftV2 = Omit<
  QuotationV2,
  "id" | "quotation_no" | "revision_no" | "is_current" | "created_at" | "updated_at"
> & {
  quotation_no?: string;
};

export interface QuotationCompanyOptionV2 {
  id: string;
  name: string;
}

export interface QuotationContactOptionV2 {
  id: string;
  company_id: string;
  name: string;
  email: string;
}

export interface QuotationInquiryOptionV2 {
  id: string;
  inquiry_no: string;
  company_id: string | null;
  contact_id: string | null;
  currency: string;
  customer_reference: string;
}

export interface SellingEntityOptionV2 {
  id: string;
  code: string;
  legal_name: string;
}

export interface SellerBankOptionV2 {
  id: string;
  selling_entity_id: string;
  label: string;
  currency: string;
}

export interface QuotationFormOptionsV2 {
  companies: QuotationCompanyOptionV2[];
  contacts: QuotationContactOptionV2[];
  inquiries: QuotationInquiryOptionV2[];
  sellingEntities: SellingEntityOptionV2[];
  sellerBanks: SellerBankOptionV2[];
}

export interface InquiryQuotationSourceV2 {
  inquiry: QuotationInquiryOptionV2 & {
    loading_port: string;
    discharge_port: string;
    requested_incoterms: string[];
    packing_requirements: string;
    required_documents: string;
    readiness_requirement: string;
  };
  contact: QuotationContactOptionV2 | null;
  items: QuotationItemV2[];
}

export function createEmptyQuotationItemV2(lineNo: number): QuotationItemV2 {
  return {
    inquiry_item_id: null,
    costing_line_id: null,
    line_no: lineNo,
    customer_item_code: "",
    internal_product_code: "",
    product_name: "",
    grade: "",
    standard: "",
    dimensions_text: "",
    specification_snapshot: {},
    quantity: 0,
    unit: "MT",
    tolerance_minus: null,
    tolerance_plus: null,
    tolerance_unit: "percent",
    invoicing_basis: "actual_net_weight",
    unit_price: 0,
    amount: 0,
  };
}

export function createEmptyQuotationDraftV2(): QuotationDraftV2 {
  const quotationDate = new Date().toISOString().slice(0, 10);
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 30);

  return {
    inquiry_id: null,
    quotation_date: quotationDate,
    valid_until: validUntilDate.toISOString().slice(0, 10),
    status: "Draft",
    currency: "USD",
    company_id: null,
    contact_id: null,
    seller_entity_id: null,
    seller_bank_account_id: null,
    costing_scenario_id: null,
    to_recipients: [],
    cc_recipients: [],
    subtotal: 0,
    freight: 0,
    insurance: 0,
    tax_amount: 0,
    other_charges: 0,
    total_amount: 0,
    payment_advance_percent: null,
    payment_balance_percent: null,
    payment_method: "",
    payment_balance_trigger: "",
    payment_terms: "",
    incoterm_rule: "",
    named_place: "",
    incoterms_version: "2020",
    loading_port: "",
    discharge_port: "",
    shipment_method: "",
    partial_shipment_allowed: null,
    transshipment_allowed: null,
    expected_readiness_date: null,
    latest_shipment_date: null,
    origin_country: "",
    producing_mill: "",
    packing_terms: "",
    marking_terms: "",
    inspection_terms: "",
    documentation_terms: "",
    special_conditions: "",
    notes: "",
    items: [createEmptyQuotationItemV2(1)],
  };
}
