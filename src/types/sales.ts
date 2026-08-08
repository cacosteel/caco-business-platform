export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type CurrencyCode = string;

export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [key: string]: Json };

export const INQUIRY_STATUSES = [
  "Draft",
  "Sourcing",
  "Quoted",
  "Won",
  "Lost",
  "Cancelled",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const SUPPLIER_RFQ_STATUSES = [
  "Draft",
  "Sent",
  "Awaiting Response",
  "Offer Received",
  "Declined",
  "Expired",
  "Superseded",
] as const;
export type SupplierRfqStatus = (typeof SUPPLIER_RFQ_STATUSES)[number];

export const SUPPLIER_OFFER_STATUSES = [
  "Received",
  "Under Review",
  "Selected",
  "Partially Selected",
  "Rejected",
  "Expired",
] as const;
export type SupplierOfferStatus = (typeof SUPPLIER_OFFER_STATUSES)[number];

export const COSTING_STATUSES = ["Draft", "Selected", "Archived"] as const;
export type CostingStatus = (typeof COSTING_STATUSES)[number];

export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Revision Requested",
  "Accepted",
  "Rejected",
  "Expired",
  "Superseded",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const SALES_CONTRACT_STATUSES = [
  "Draft",
  "Sent",
  "Under Negotiation",
  "Signature Pending",
  "Signed",
  "Cancelled",
  "Superseded",
] as const;
export type SalesContractStatus = (typeof SALES_CONTRACT_STATUSES)[number];

export const ORDER_STATUSES = [
  "Draft",
  "Active",
  "In Production",
  "Ready to Ship",
  "Shipped",
  "Delivered",
  "Completed",
  "On Hold",
  "Cancelled",
] as const;
export type SalesOrderStatus = (typeof ORDER_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  "Planning",
  "Loading",
  "Loaded",
  "Departed",
  "Delivered",
  "Cancelled",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const INVOICE_STATUSES = [
  "Draft",
  "Issued",
  "Partially Paid",
  "Paid",
  "Cancelled",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const SHIPMENT_METHODS = [
  "container",
  "breakbulk",
  "ro_ro",
  "truck",
  "rail",
  "other",
] as const;
export type ShipmentMethod = (typeof SHIPMENT_METHODS)[number];

export const SHIPMENT_UNIT_TYPES = [
  "container",
  "vessel_hold",
  "truck",
  "trailer",
  "rail_wagon",
  "ro_ro_vehicle",
  "other",
] as const;
export type ShipmentUnitType = (typeof SHIPMENT_UNIT_TYPES)[number];

export const INVOICE_BASES = [
  "actual_net_weight",
  "theoretical_weight",
  "pieces",
] as const;
export type InvoiceBasis = (typeof INVOICE_BASES)[number];

export const TOLERANCE_UNITS = ["percent", "MT"] as const;
export type ToleranceUnit = (typeof TOLERANCE_UNITS)[number];

export const TOLERANCE_STATUSES = [
  "Pending",
  "Within Tolerance",
  "Outside Tolerance",
  "Override Approved",
] as const;
export type ToleranceStatus = (typeof TOLERANCE_STATUSES)[number];

export type RecipientType = "to" | "cc";
export type MarginMethod = "per_mt" | "percentage";
export type CostCalculationMethod = "per_mt" | "fixed_total" | "percentage";
export type CostCategory =
  | "freight"
  | "insurance"
  | "inspection"
  | "banking"
  | "financing"
  | "commission"
  | "handling"
  | "tax"
  | "other";
export type InvoiceType = "proforma" | "commercial" | "credit_note" | "debit_note";
export type InvoiceAdjustmentType = "charge" | "credit" | "tax";
export type PaymentType = "advance" | "balance" | "refund" | "adjustment";
export type PaymentDirection = "received" | "refunded";
export type PackageType = "bundle" | "coil" | "piece_group" | "other";

export type SalesEntityType =
  | "inquiry"
  | "supplier_rfq"
  | "supplier_offer"
  | "costing"
  | "quotation"
  | "sales_contract"
  | "order"
  | "shipment"
  | "invoice"
  | "payment"
  | "sales_document";

export type SalesDocumentEntityType = Exclude<SalesEntityType, "sales_document">;
export type StatusChangeEntityType =
  | "inquiry"
  | "supplier_rfq"
  | "quotation"
  | "sales_contract"
  | "order";

export type SalesSchemaReadiness =
  | "ready"
  | "disabled"
  | "migration_required"
  | "unavailable";

export interface SalesApiError {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
}

export type SalesApiResult<T> =
  | { ok: true; data: T; error: null; schema: "ready" }
  | {
      ok: false;
      data: null;
      error: SalesApiError;
      schema: SalesSchemaReadiness;
    };

export interface SalesLoadState<T> {
  data: T;
  loading: boolean;
  error: SalesApiError | null;
  schema: SalesSchemaReadiness;
}

export interface SalesCompanySummary {
  id: UUID;
  name: string;
  short_name?: string | null;
  country?: string | null;
}

export interface SalesContactSummary {
  id: UUID;
  company_id: UUID;
  first_name: string;
  last_name: string | null;
  email: string;
}

export interface SellingEntitySummary {
  id: UUID;
  code: string;
  legal_name: string;
  country: string | null;
}

export interface SellerBankAccountSummary {
  id: UUID;
  account_name: string;
  bank_name: string;
  currency: CurrencyCode;
  iban: string | null;
  swift_code: string | null;
}

export interface GeneralConditionsSummary {
  id: UUID;
  version_code: string;
  title: string;
  effective_from: ISODate | null;
  is_published: boolean;
}

interface CreatedRecord {
  created_at: ISODateTime;
}

interface UpdatedRecord extends CreatedRecord {
  updated_at: ISODateTime;
}

interface SoftDeletableRecord {
  deleted_at: ISODateTime | null;
  deleted_by: UUID | null;
}

export interface SalesDocument extends CreatedRecord, SoftDeletableRecord {
  id: UUID;
  company_id: UUID;
  category_id: UUID;
  entity_type: SalesDocumentEntityType;
  entity_id: UUID;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  version_no: number;
  supersedes_document_id: UUID | null;
  visible_to_customer: boolean;
  is_immutable: boolean;
  uploaded_by: UUID;
  uploaded_at: ISODateTime;
}

export interface SalesAuditEvent {
  id: number;
  company_id: UUID | null;
  entity_type: string;
  entity_id: UUID;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  details: Json;
  performed_by: UUID | null;
  performed_at: ISODateTime;
}

export interface Inquiry extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  company_id: UUID | null;
  contact_id: UUID | null;
  seller_entity_id: UUID | null;
  inquiry_no: string | null;
  inquiry_date: ISODate;
  status: InquiryStatus;
  customer_reference: string | null;
  received_at: ISODateTime | null;
  currency: CurrencyCode;
  sequence_year: number | null;
  sequence_no: number | null;
  revision_no: number;
  root_inquiry_id: UUID | null;
  is_current: boolean;
  total_tolerance_minus: number | null;
  total_tolerance_plus: number | null;
  total_tolerance_unit: ToleranceUnit | null;
  loading_port: string | null;
  discharge_port: string | null;
  requested_incoterms: Json[];
  required_documents: string | null;
  packing_requirements: string | null;
  readiness_requirement: string | null;
  notes: string | null;
  reason: string | null;
  created_by: UUID | null;
}

export interface InquiryItem extends UpdatedRecord {
  id: UUID;
  inquiry_id: UUID;
  line_no: number;
  product_id: UUID | null;
  specification_template_id: UUID | null;
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
  tolerance_unit: ToleranceUnit;
  invoicing_basis: InvoiceBasis;
  theoretical_unit_weight_kg: number | null;
  theoretical_weight_override_note: string | null;
  pieces_per_bundle: number | null;
  additional_specification: string | null;
  packing_requirements: string | null;
  required_documents: string | null;
  specification_data: Json;
}

export interface InquiryRegisterItem extends Inquiry {
  company: SalesCompanySummary | null;
  contact: SalesContactSummary | null;
  item_count: number;
  rfq_count: number;
}

export interface InquiryDetail extends InquiryRegisterItem {
  seller: SellingEntitySummary | null;
  items: InquiryItem[];
  documents: SalesDocument[];
  revisions: Inquiry[];
  audit_events: SalesAuditEvent[];
}

export interface SupplierRfq extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  inquiry_id: UUID;
  inquiry_root_id: UUID;
  supplier_company_id: UUID;
  rfq_no: string;
  supplier_ordinal: number;
  revision_no: number;
  root_rfq_id: UUID | null;
  is_current: boolean;
  status: SupplierRfqStatus;
  hide_customer_identity: boolean;
  currency: CurrencyCode;
  response_deadline: ISODate;
  email_subject: string | null;
  email_body: string | null;
  sent_at: ISODateTime | null;
  sent_by: UUID | null;
  reason: string | null;
  created_by: UUID;
}

export interface SupplierRfqContact {
  rfq_id: UUID;
  contact_id: UUID;
  recipient_type: RecipientType;
  contact?: SalesContactSummary;
}

export interface SupplierRfqLine extends CreatedRecord {
  id: UUID;
  rfq_id: UUID;
  inquiry_item_id: UUID;
  line_no: number;
  requested_quantity: number;
  unit: string;
  specification_snapshot: Json;
}

export interface SupplierRfqRegisterItem extends SupplierRfq {
  inquiry_no: string | null;
  customer: SalesCompanySummary | null;
  supplier: SalesCompanySummary;
  offer_count: number;
}

export interface SupplierRfqDetail extends SupplierRfqRegisterItem {
  contacts: SupplierRfqContact[];
  lines: SupplierRfqLine[];
  offers: SupplierOfferRegisterItem[];
  documents: SalesDocument[];
  revisions: SupplierRfq[];
  audit_events: SalesAuditEvent[];
}

export interface SupplierOffer extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  rfq_id: UUID;
  supplier_reference: string | null;
  offer_date: ISODate;
  valid_until: ISODate | null;
  status: SupplierOfferStatus;
  currency: CurrencyCode;
  advance_payment_percent: number | null;
  balance_payment_percent: number | null;
  payment_method: string | null;
  payment_balance_trigger: string | null;
  payment_notes: string | null;
  origin_country: string | null;
  producing_mill: string | null;
  producing_mill_visible: boolean;
  shipment_method: ShipmentMethod | null;
  packing_conditions: string | null;
  inspection_conditions: string | null;
  documentation_conditions: string | null;
  general_deviations: string | null;
  received_at: ISODateTime;
  received_by: UUID;
  reason: string | null;
  revision_no: number;
  root_offer_id: UUID | null;
  supersedes_offer_id: UUID | null;
  is_current: boolean;
}

export interface SupplierOfferOption extends CreatedRecord {
  id: UUID;
  supplier_offer_id: UUID;
  option_no: number;
  label: string | null;
  incoterm_rule: string | null;
  named_place: string | null;
  incoterms_version: string;
  loading_port: string | null;
  discharge_port: string | null;
  partial_shipment_allowed: boolean | null;
  transshipment_allowed: boolean | null;
  production_readiness_date: ISODate | null;
  lead_time_days: number | null;
  freight_included: boolean;
  insurance_included: boolean;
  notes: string | null;
}

export interface SupplierOfferLine extends UpdatedRecord {
  id: UUID;
  supplier_offer_option_id: UUID;
  rfq_line_id: UUID;
  is_offered: boolean;
  offered_quantity: number | null;
  unit: string;
  unit_price: number | null;
  supplier_item_code: string | null;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnit | null;
  technical_deviations: string | null;
  commercial_deviations: string | null;
}

export interface SupplierOfferOptionDetail extends SupplierOfferOption {
  lines: SupplierOfferLine[];
}

export interface SupplierOfferRegisterItem extends SupplierOffer {
  rfq_no: string;
  inquiry_no: string | null;
  supplier: SalesCompanySummary;
  option_count: number;
}

export interface SupplierOfferDetail extends SupplierOfferRegisterItem {
  options: SupplierOfferOptionDetail[];
  documents: SalesDocument[];
  revisions: SupplierOffer[];
  audit_events: SalesAuditEvent[];
}

export interface CostingScenario extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  inquiry_id: UUID;
  name: string;
  currency: CurrencyCode;
  status: CostingStatus;
  notes: string | null;
  created_by: UUID;
}

export interface CostingLine extends UpdatedRecord {
  id: UUID;
  costing_scenario_id: UUID;
  inquiry_item_id: UUID;
  supplier_offer_line_id: UUID;
  quantity: number;
  supplier_unit_price: number;
  landed_unit_cost: number;
  margin_method: MarginMethod;
  margin_value: number;
  calculated_sales_unit_price: number;
  selected_for_quotation: boolean;
  calculation_snapshot: Json;
}

export interface CostingAdjustment extends CreatedRecord {
  id: UUID;
  costing_scenario_id: UUID;
  costing_line_id: UUID | null;
  category: CostCategory;
  description: string | null;
  calculation_method: CostCalculationMethod;
  value: number;
  calculated_amount: number;
}

export interface CostingLineDetail extends CostingLine {
  inquiry_item: InquiryItem;
  supplier_offer_line: SupplierOfferLine;
  adjustments: CostingAdjustment[];
}

export interface CostingRegisterItem extends CostingScenario {
  inquiry_no: string | null;
  company: SalesCompanySummary | null;
  line_count: number;
  selected_line_count: number;
}

export interface CostingDetail extends CostingRegisterItem {
  lines: CostingLineDetail[];
  scenario_adjustments: CostingAdjustment[];
  documents: SalesDocument[];
  audit_events: SalesAuditEvent[];
}

export interface Quotation extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  inquiry_id: UUID | null;
  company_id: UUID | null;
  contact_id: UUID | null;
  seller_entity_id: UUID | null;
  seller_bank_account_id: UUID | null;
  costing_scenario_id: UUID | null;
  quotation_no: string | null;
  quotation_date: ISODate;
  valid_until: ISODate | null;
  currency: CurrencyCode;
  total_amount: number;
  status: QuotationStatus;
  notes: string | null;
  sequence_year: number | null;
  sequence_no: number | null;
  revision_no: number;
  root_quotation_id: UUID | null;
  is_current: boolean;
  subtotal: number;
  freight: number;
  insurance: number;
  tax_amount: number;
  other_charges: number;
  payment_advance_percent: number | null;
  payment_balance_percent: number | null;
  payment_method: string | null;
  payment_balance_trigger: string | null;
  payment_terms: string | null;
  incoterm_rule: string | null;
  named_place: string | null;
  incoterms_version: string;
  loading_port: string | null;
  discharge_port: string | null;
  shipment_method: ShipmentMethod | null;
  partial_shipment_allowed: boolean | null;
  transshipment_allowed: boolean | null;
  expected_readiness_date: ISODate | null;
  origin_country: string | null;
  producing_mill: string | null;
  packing_terms: string | null;
  inspection_terms: string | null;
  documentation_terms: string | null;
  sent_at: ISODateTime | null;
  accepted_at: ISODateTime | null;
  reason: string | null;
  created_by: UUID | null;
}

export interface QuotationItem extends CreatedRecord {
  id: UUID;
  quotation_id: UUID;
  inquiry_item_id: UUID | null;
  costing_line_id: UUID | null;
  line_no: number;
  customer_item_code: string | null;
  internal_product_code: string | null;
  product_name: string;
  grade: string | null;
  standard: string | null;
  dimensions_text: string | null;
  specification_snapshot: Json;
  quantity: number;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnit;
  invoicing_basis: InvoiceBasis;
  unit_price: number;
  amount: number;
}

export interface QuotationRegisterItem extends Quotation {
  inquiry_no: string | null;
  company: SalesCompanySummary | null;
  contact: SalesContactSummary | null;
  item_count: number;
}

export interface QuotationDetail extends QuotationRegisterItem {
  seller: SellingEntitySummary | null;
  bank_account: SellerBankAccountSummary | null;
  items: QuotationItem[];
  documents: SalesDocument[];
  revisions: Quotation[];
  audit_events: SalesAuditEvent[];
}

export interface SalesContract extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  quotation_id: UUID;
  company_id: UUID;
  contact_id: UUID | null;
  seller_entity_id: UUID;
  seller_bank_account_id: UUID | null;
  general_conditions_version_id: UUID | null;
  contract_no: string;
  contract_date: ISODate;
  sequence_year: number;
  sequence_no: number;
  revision_no: number;
  amendment_no: number;
  root_contract_id: UUID | null;
  is_current: boolean;
  status: SalesContractStatus;
  currency: CurrencyCode;
  subtotal: number;
  freight: number;
  insurance: number;
  tax_amount: number;
  other_charges: number;
  total_amount: number;
  payment_advance_percent: number | null;
  payment_balance_percent: number | null;
  payment_method: string | null;
  payment_balance_trigger: string | null;
  payment_notes: string | null;
  default_invoicing_basis: InvoiceBasis;
  total_tolerance_minus: number | null;
  total_tolerance_plus: number | null;
  total_tolerance_unit: ToleranceUnit | null;
  incoterm_rule: string | null;
  named_place: string | null;
  incoterms_version: string;
  loading_port: string | null;
  discharge_port: string | null;
  shipment_method: ShipmentMethod | null;
  partial_shipment_allowed: boolean | null;
  transshipment_allowed: boolean | null;
  latest_shipment_date: ISODate | null;
  origin_country: string | null;
  producing_mill: string | null;
  packing_terms: string | null;
  inspection_terms: string | null;
  documentation_terms: string | null;
  sent_at: ISODateTime | null;
  signed_at: ISODateTime | null;
  signed_document_id: UUID | null;
  signature_override: boolean;
  signature_override_reason: string | null;
  seller_snapshot: Json;
  bank_snapshot: Json;
  conditions_snapshot: Json;
  reason: string | null;
  created_by: UUID;
}

export interface SalesContractItem extends CreatedRecord {
  id: UUID;
  sales_contract_id: UUID;
  quotation_item_id: UUID | null;
  line_no: number;
  customer_item_code: string | null;
  internal_product_code: string | null;
  product_name: string;
  grade: string | null;
  standard: string | null;
  dimensions_text: string | null;
  specification_snapshot: Json;
  contract_quantity: number;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnit;
  invoicing_basis: InvoiceBasis;
  theoretical_unit_weight_kg: number | null;
  unit_price: number;
  amount: number;
}

export interface SalesContractRegisterItem extends SalesContract {
  quotation_no: string | null;
  company: SalesCompanySummary;
  item_count: number;
}

export interface SalesContractDetail extends SalesContractRegisterItem {
  contact: SalesContactSummary | null;
  seller: SellingEntitySummary;
  bank_account: SellerBankAccountSummary | null;
  general_conditions: GeneralConditionsSummary | null;
  signed_document: SalesDocument | null;
  items: SalesContractItem[];
  documents: SalesDocument[];
  revisions: SalesContract[];
  audit_events: SalesAuditEvent[];
}

export interface SalesOrder extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  quotation_id: UUID | null;
  sales_contract_id: UUID | null;
  company_id: UUID | null;
  seller_entity_id: UUID | null;
  order_no: string | null;
  order_date: ISODate;
  delivery_date: ISODate | null;
  status: SalesOrderStatus;
  total_amount: number;
  currency: CurrencyCode;
  notes: string | null;
  sequence_year: number | null;
  sequence_no: number | null;
  amendment_no: number;
  root_order_id: UUID | null;
  is_current: boolean;
  signature_override: boolean;
  signature_override_reason: string | null;
  reason: string | null;
  created_by: UUID | null;
}

export interface SalesOrderItem extends UpdatedRecord {
  id: UUID;
  order_id: UUID;
  sales_contract_item_id: UUID | null;
  line_no: number | null;
  product_name: string;
  product_snapshot: Json;
  quantity: number;
  unit: string;
  tolerance_minus: number | null;
  tolerance_plus: number | null;
  tolerance_unit: ToleranceUnit | null;
  invoicing_basis: InvoiceBasis | null;
  theoretical_unit_weight_kg: number | null;
  unit_price: number;
  total_price: number;
}

export interface SalesOrderRegisterItem extends SalesOrder {
  contract_no: string | null;
  company: SalesCompanySummary | null;
  item_count: number;
  shipment_count: number;
  paid_amount: number;
  outstanding_amount: number;
}

export interface SalesOrderDetail extends SalesOrderRegisterItem {
  seller: SellingEntitySummary | null;
  items: SalesOrderItem[];
  shipments: ShipmentRegisterItem[];
  invoices: InvoiceRegisterItem[];
  payments: PaymentRegisterItem[];
  documents: SalesDocument[];
  audit_events: SalesAuditEvent[];
}

export interface OrderShipment extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  order_id: UUID;
  shipment_no: number;
  shipment_method: ShipmentMethod;
  status: ShipmentStatus;
  vessel_name: string | null;
  voyage_no: string | null;
  vehicle_reference: string | null;
  loading_port: string | null;
  discharge_port: string | null;
  planned_loading_date: ISODate | null;
  actual_loading_date: ISODate | null;
  departure_date: ISODate | null;
  arrival_date: ISODate | null;
  notes: string | null;
  created_by: UUID;
}

export interface ShipmentUnit extends UpdatedRecord {
  id: UUID;
  shipment_id: UUID;
  unit_no: number;
  unit_type: ShipmentUnitType;
  container_number: string | null;
  seal_number: string | null;
  registration_number: string | null;
  trailer_number: string | null;
  wagon_number: string | null;
  hold_reference: string | null;
  packing_marks: string | null;
  tare_weight_mt: number | null;
  notes: string | null;
}

export interface ShipmentLoadingLine extends UpdatedRecord {
  id: UUID;
  shipment_id: UUID;
  shipment_unit_id: UUID | null;
  order_item_id: UUID;
  bundle_count: number | null;
  coil_count: number | null;
  piece_count: number | null;
  pieces_per_bundle: number | null;
  theoretical_unit_weight_kg: number | null;
  theoretical_total_weight_mt: number | null;
  actual_net_weight_mt: number | null;
  actual_gross_weight_mt: number | null;
  invoicing_basis: InvoiceBasis;
  invoice_quantity: number | null;
  tolerance_status: ToleranceStatus;
  tolerance_override_reason: string | null;
  notes: string | null;
  created_by: UUID;
}

export interface LoadingPackage extends CreatedRecord {
  id: UUID;
  loading_line_id: UUID;
  package_type: PackageType;
  package_identifier: string | null;
  piece_count: number | null;
  theoretical_weight_mt: number | null;
  actual_net_weight_mt: number | null;
  actual_gross_weight_mt: number | null;
  notes: string | null;
}

export interface ShipmentLoadingLineDetail extends ShipmentLoadingLine {
  order_item: SalesOrderItem;
  packages: LoadingPackage[];
}

export interface ShipmentUnitDetail extends ShipmentUnit {
  loading_lines: ShipmentLoadingLineDetail[];
}

export interface ShipmentRegisterItem extends OrderShipment {
  order_no: string | null;
  unit_count: number;
  loaded_net_weight_mt: number;
  loaded_gross_weight_mt: number;
}

export interface ShipmentDetail extends ShipmentRegisterItem {
  units: ShipmentUnitDetail[];
  unassigned_loading_lines: ShipmentLoadingLineDetail[];
  documents: SalesDocument[];
  audit_events: SalesAuditEvent[];
}

export interface SalesInvoice extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  order_id: UUID;
  shipment_id: UUID | null;
  company_id: UUID;
  seller_entity_id: UUID;
  seller_bank_account_id: UUID | null;
  invoice_type: InvoiceType;
  invoice_no: string;
  invoice_date: ISODate;
  sequence_year: number;
  sequence_no: number;
  currency: CurrencyCode;
  subtotal: number;
  freight: number;
  insurance: number;
  tax_amount: number;
  adjustments_total: number;
  total_amount: number;
  status: InvoiceStatus;
  issued_at: ISODateTime | null;
  seller_snapshot: Json;
  bank_snapshot: Json;
  reason: string | null;
  created_by: UUID;
}

export interface SalesInvoiceLine extends CreatedRecord {
  id: UUID;
  invoice_id: UUID;
  order_item_id: UUID;
  loading_line_id: UUID | null;
  line_no: number;
  description: string;
  quantity: number;
  unit: string;
  invoicing_basis: InvoiceBasis;
  unit_price: number;
  amount: number;
}

export interface SalesInvoiceAdjustment extends CreatedRecord {
  id: UUID;
  invoice_id: UUID;
  description: string;
  adjustment_type: InvoiceAdjustmentType;
  amount: number;
  approved_by: UUID;
}

export interface InvoicePaymentAllocation extends CreatedRecord {
  invoice_id: UUID;
  payment_id: UUID;
  allocated_amount: number;
}

export interface InvoiceRegisterItem extends SalesInvoice {
  order_no: string | null;
  company: SalesCompanySummary;
  paid_amount: number;
  outstanding_amount: number;
}

export interface InvoiceDetail extends InvoiceRegisterItem {
  seller: SellingEntitySummary;
  bank_account: SellerBankAccountSummary | null;
  lines: SalesInvoiceLine[];
  adjustments: SalesInvoiceAdjustment[];
  payment_allocations: InvoicePaymentAllocation[];
  documents: SalesDocument[];
  audit_events: SalesAuditEvent[];
}

export interface SalesPayment extends UpdatedRecord, SoftDeletableRecord {
  id: UUID;
  order_id: UUID;
  company_id: UUID;
  payment_date: ISODate;
  amount: number;
  currency: CurrencyCode;
  bank_reference: string | null;
  notes: string | null;
  payment_type: PaymentType;
  direction: PaymentDirection;
  document_id: UUID | null;
  recorded_by: UUID;
}

export interface PaymentRegisterItem extends SalesPayment {
  order_no: string | null;
  company: SalesCompanySummary;
  allocated_amount: number;
  unallocated_amount: number;
}

export interface PaymentDetail extends PaymentRegisterItem {
  allocations: InvoicePaymentAllocation[];
  document: SalesDocument | null;
  audit_events: SalesAuditEvent[];
}

export interface CreateInquiryItemInput {
  product_id?: UUID | null;
  specification_template_id?: UUID | null;
  product_name: string;
  customer_item_code?: string | null;
  internal_product_code?: string | null;
  grade?: string | null;
  standard?: string | null;
  thickness_mm?: number | null;
  width_mm?: number | null;
  length_mm?: number | null;
  coating?: string | null;
  color_ral?: string | null;
  surface_treatment?: string | null;
  coil_inner_diameter_mm?: number | null;
  coil_outer_diameter_mm?: number | null;
  target_coil_weight_mt?: number | null;
  quantity: number;
  unit: string;
  tolerance_minus?: number | null;
  tolerance_plus?: number | null;
  tolerance_unit: ToleranceUnit;
  invoicing_basis: InvoiceBasis;
  theoretical_unit_weight_kg?: number | null;
  theoretical_weight_override_note?: string | null;
  pieces_per_bundle?: number | null;
  additional_specification?: string | null;
  packing_requirements?: string | null;
  required_documents?: string | null;
  specification_data?: Json;
}

export interface CreateInquiryCommand {
  company_id: UUID;
  contact_id: UUID;
  seller_entity_id: UUID;
  inquiry_date?: ISODate;
  customer_reference?: string | null;
  received_at?: ISODateTime | null;
  currency?: CurrencyCode;
  total_tolerance_minus?: number | null;
  total_tolerance_plus?: number | null;
  total_tolerance_unit?: ToleranceUnit | null;
  loading_port?: string | null;
  discharge_port?: string | null;
  requested_incoterms?: Json[];
  required_documents?: string | null;
  packing_requirements?: string | null;
  readiness_requirement?: string | null;
  notes?: string | null;
  items: CreateInquiryItemInput[];
}

export interface CreateSupplierRfqBatchCommand {
  p_inquiry_id: UUID;
  p_supplier_company_ids: UUID[];
  p_contact_ids_by_supplier?: Record<string, UUID[]>;
  p_inquiry_item_ids?: UUID[] | null;
  p_response_deadline?: ISODate;
  p_hide_customer_identity?: boolean;
  p_email_subject?: string | null;
  p_email_body?: string | null;
}

export interface CreateSupplierOfferLineInput {
  rfq_line_id: UUID;
  is_offered: boolean;
  offered_quantity?: number | null;
  unit?: string;
  unit_price?: number | null;
  supplier_item_code?: string | null;
  tolerance_minus?: number | null;
  tolerance_plus?: number | null;
  tolerance_unit?: ToleranceUnit | null;
  technical_deviations?: string | null;
  commercial_deviations?: string | null;
}

export interface CreateSupplierOfferOptionInput {
  label?: string | null;
  incoterm_rule?: string | null;
  named_place?: string | null;
  incoterms_version?: string;
  loading_port?: string | null;
  discharge_port?: string | null;
  partial_shipment_allowed?: boolean | null;
  transshipment_allowed?: boolean | null;
  production_readiness_date?: ISODate | null;
  lead_time_days?: number | null;
  freight_included?: boolean;
  insurance_included?: boolean;
  notes?: string | null;
  lines: CreateSupplierOfferLineInput[];
}

export interface CreateSupplierOfferCommand {
  rfq_id: UUID;
  supplier_reference?: string | null;
  offer_date?: ISODate;
  valid_until?: ISODate | null;
  currency?: CurrencyCode;
  advance_payment_percent?: number | null;
  balance_payment_percent?: number | null;
  payment_method?: string | null;
  payment_balance_trigger?: string | null;
  payment_notes?: string | null;
  origin_country?: string | null;
  producing_mill?: string | null;
  producing_mill_visible?: boolean;
  shipment_method?: ShipmentMethod | null;
  packing_conditions?: string | null;
  inspection_conditions?: string | null;
  documentation_conditions?: string | null;
  general_deviations?: string | null;
  options: CreateSupplierOfferOptionInput[];
}

export interface CreateCostingAdjustmentInput {
  costing_line_id?: UUID | null;
  category: CostCategory;
  description?: string | null;
  calculation_method: CostCalculationMethod;
  value: number;
}

export interface CreateCostingLineInput {
  inquiry_item_id: UUID;
  supplier_offer_line_id: UUID;
  quantity: number;
  supplier_unit_price: number;
  margin_method: MarginMethod;
  margin_value: number;
  selected_for_quotation?: boolean;
  adjustments?: CreateCostingAdjustmentInput[];
}

export interface CreateCostingScenarioCommand {
  inquiry_id: UUID;
  name: string;
  currency?: CurrencyCode;
  notes?: string | null;
  lines: CreateCostingLineInput[];
  scenario_adjustments?: CreateCostingAdjustmentInput[];
}

export interface CreateQuotationItemInput {
  inquiry_item_id: UUID;
  costing_line_id: UUID;
  customer_item_code?: string | null;
  internal_product_code?: string | null;
  product_name: string;
  grade?: string | null;
  standard?: string | null;
  dimensions_text?: string | null;
  specification_snapshot: Json;
  quantity: number;
  unit: string;
  tolerance_minus?: number | null;
  tolerance_plus?: number | null;
  tolerance_unit: ToleranceUnit;
  invoicing_basis: InvoiceBasis;
  unit_price: number;
}

export interface CreateQuotationCommand {
  inquiry_id: UUID;
  company_id: UUID;
  contact_id: UUID;
  seller_entity_id: UUID;
  seller_bank_account_id?: UUID | null;
  costing_scenario_id: UUID;
  quotation_date?: ISODate;
  valid_until?: ISODate | null;
  currency?: CurrencyCode;
  freight?: number;
  insurance?: number;
  tax_amount?: number;
  other_charges?: number;
  payment_advance_percent?: number | null;
  payment_balance_percent?: number | null;
  payment_method?: string | null;
  payment_balance_trigger?: string | null;
  payment_terms?: string | null;
  incoterm_rule?: string | null;
  named_place?: string | null;
  incoterms_version?: string;
  loading_port?: string | null;
  discharge_port?: string | null;
  shipment_method?: ShipmentMethod | null;
  partial_shipment_allowed?: boolean | null;
  transshipment_allowed?: boolean | null;
  expected_readiness_date?: ISODate | null;
  origin_country?: string | null;
  producing_mill?: string | null;
  packing_terms?: string | null;
  inspection_terms?: string | null;
  documentation_terms?: string | null;
  notes?: string | null;
  items: CreateQuotationItemInput[];
}

export interface CreateSalesContractFromQuotationCommand {
  p_quotation_id: UUID;
  p_general_conditions_version_id?: UUID | null;
  p_seller_bank_account_id?: UUID | null;
}

export interface MarkSalesContractSignedCommand {
  p_contract_id: UUID;
  p_signed_document_id?: UUID | null;
  p_override_reason?: string | null;
}

export interface CreateSalesOrderFromContractCommand {
  p_contract_id: UUID;
  p_signature_override_reason?: string | null;
}

export interface CreateShipmentUnitInput {
  unit_type: ShipmentUnitType;
  container_number?: string | null;
  seal_number?: string | null;
  registration_number?: string | null;
  trailer_number?: string | null;
  wagon_number?: string | null;
  hold_reference?: string | null;
  packing_marks?: string | null;
  tare_weight_mt?: number | null;
  notes?: string | null;
}

export interface CreateShipmentCommand {
  order_id: UUID;
  shipment_method: ShipmentMethod;
  vessel_name?: string | null;
  voyage_no?: string | null;
  vehicle_reference?: string | null;
  loading_port?: string | null;
  discharge_port?: string | null;
  planned_loading_date?: ISODate | null;
  notes?: string | null;
  units?: CreateShipmentUnitInput[];
}

export interface CreateLoadingPackageInput {
  package_type: PackageType;
  package_identifier?: string | null;
  piece_count?: number | null;
  theoretical_weight_mt?: number | null;
  actual_net_weight_mt?: number | null;
  actual_gross_weight_mt?: number | null;
  notes?: string | null;
}

export interface CreateLoadingLineCommand {
  shipment_id: UUID;
  shipment_unit_id?: UUID | null;
  order_item_id: UUID;
  bundle_count?: number | null;
  coil_count?: number | null;
  piece_count?: number | null;
  pieces_per_bundle?: number | null;
  theoretical_unit_weight_kg?: number | null;
  theoretical_total_weight_mt?: number | null;
  actual_net_weight_mt?: number | null;
  actual_gross_weight_mt?: number | null;
  invoicing_basis: InvoiceBasis;
  invoice_quantity?: number | null;
  tolerance_status?: ToleranceStatus;
  tolerance_override_reason?: string | null;
  notes?: string | null;
  packages?: CreateLoadingPackageInput[];
}

export interface CreateInvoiceLineInput {
  order_item_id: UUID;
  loading_line_id?: UUID | null;
  description: string;
  quantity: number;
  unit: string;
  invoicing_basis: InvoiceBasis;
  unit_price: number;
}

export interface CreateInvoiceAdjustmentInput {
  description: string;
  adjustment_type: InvoiceAdjustmentType;
  amount: number;
}

export interface CreateInvoiceCommand {
  order_id: UUID;
  shipment_id?: UUID | null;
  company_id: UUID;
  seller_entity_id: UUID;
  seller_bank_account_id?: UUID | null;
  invoice_type: InvoiceType;
  invoice_date?: ISODate;
  currency?: CurrencyCode;
  freight?: number;
  insurance?: number;
  tax_amount?: number;
  lines: CreateInvoiceLineInput[];
  adjustments?: CreateInvoiceAdjustmentInput[];
}

export interface PaymentAllocationInput {
  invoice_id: UUID;
  allocated_amount: number;
}

export interface CreatePaymentCommand {
  order_id: UUID;
  company_id: UUID;
  payment_date: ISODate;
  amount: number;
  currency?: CurrencyCode;
  payment_type: PaymentType;
  direction?: PaymentDirection;
  bank_reference?: string | null;
  notes?: string | null;
  document_id?: UUID | null;
  allocations?: PaymentAllocationInput[];
}

type StatusChangeCommand<TEntity extends StatusChangeEntityType, TStatus extends string> = {
  p_entity_type: TEntity;
  p_entity_id: UUID;
  p_status: TStatus;
  p_reason?: string | null;
};

export type SetSalesRecordStatusCommand =
  | StatusChangeCommand<"inquiry", InquiryStatus>
  | StatusChangeCommand<"supplier_rfq", SupplierRfqStatus>
  | StatusChangeCommand<"quotation", QuotationStatus>
  | StatusChangeCommand<"sales_contract", Exclude<SalesContractStatus, "Signed">>
  | StatusChangeCommand<"order", SalesOrderStatus>;

export interface RequestSalesDeletionCommand {
  p_entity_type: SalesEntityType;
  p_entity_id: UUID;
  p_reason: string;
}

export interface ReviewSalesDeletionRequestCommand {
  p_request_id: UUID;
  p_approve: boolean;
}
