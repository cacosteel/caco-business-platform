import type { InquiryV2Draft } from "./inquiryV2";
import type { QuotationDraftV2 } from "./quotationV2";

export const SALES_TEMPLATE_KEY = "CACO_INQUIRY_OFFER";
export const SALES_TEMPLATE_VERSION = "CACO-IO-1.0";
export const SALES_TEMPLATE_DOWNLOAD_PATH =
  "/templates/CACO_Inquiry_Offer_Template_v1.xlsx";

export type SalesSpreadsheetDocumentType = "Inquiry" | "Quotation";

export interface SpreadsheetValidationIssue {
  cell: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface SpreadsheetPreviewLine {
  row: number;
  product_name: string;
  dimensions_text: string;
  grade: string;
  additional_specification: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  recalculated_amount: number | null;
}

export interface SalesSpreadsheetPreview {
  fileName: string;
  fileHash: string;
  templateKey: string;
  templateVersion: string;
  documentType: SalesSpreadsheetDocumentType;
  companyName: string;
  documentReference: string;
  documentDate: string;
  currency: string;
  lines: SpreadsheetPreviewLine[];
  totalQuantity: number;
  recalculatedSubtotal: number;
  issues: SpreadsheetValidationIssue[];
  inquiryDraft: InquiryV2Draft;
  quotationDraft: QuotationDraftV2;
}

export function hasSpreadsheetErrors(
  preview: SalesSpreadsheetPreview,
): boolean {
  return preview.issues.some((issue) => issue.severity === "error");
}
