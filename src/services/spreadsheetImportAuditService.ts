import { supabase } from "../lib/supabase";
import type { SalesSpreadsheetPreview } from "../types/spreadsheetImport";

type ImportEntityType = "inquiry" | "quotation";

function entityTypeFromPreview(
  preview: SalesSpreadsheetPreview,
): ImportEntityType {
  return preview.documentType === "Inquiry" ? "inquiry" : "quotation";
}

export async function stageSalesSpreadsheetImport(
  preview: SalesSpreadsheetPreview,
): Promise<string> {
  const entityType = entityTypeFromPreview(preview);
  const draft =
    entityType === "inquiry" ? preview.inquiryDraft : preview.quotationDraft;

  const { data, error } = await supabase
    .from("sales_spreadsheet_imports")
    .insert({
      entity_type: entityType,
      template_version: preview.templateVersion,
      original_filename: preview.fileName,
      file_sha256: preview.fileHash,
      status: "validated",
      row_count: preview.lines.length,
      validation_report: {
        document_type: preview.documentType,
        issues: preview.issues,
        total_quantity: preview.totalQuantity,
        recalculated_subtotal: preview.recalculatedSubtotal,
      },
      staged_payload: {
        company_name: preview.companyName,
        document_reference: preview.documentReference,
        document_date: preview.documentDate,
        currency: preview.currency,
        draft,
      },
      validated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("The workbook was validated, but its audit record was not created.");
  }
  return data.id as string;
}

export async function completeSalesSpreadsheetImport(
  importId: string,
  entityType: ImportEntityType,
  targetId: string,
): Promise<void> {
  const target =
    entityType === "inquiry"
      ? { target_inquiry_id: targetId }
      : { target_quotation_id: targetId };

  const { data, error } = await supabase
    .from("sales_spreadsheet_imports")
    .update({
      ...target,
      status: "imported",
      imported_at: new Date().toISOString(),
    })
    .eq("id", importId)
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("The workbook audit record could not be finalized.");
}
