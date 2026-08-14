import {
  createBlankInquiryItemV2,
  createBlankInquiryV2Draft,
  type InquiryItemV2Draft,
} from "../types/inquiryV2";
import {
  createEmptyQuotationDraftV2,
  createEmptyQuotationItemV2,
  type QuotationItemV2,
  type QuotationRecipientV2,
} from "../types/quotationV2";
import {
  SALES_TEMPLATE_KEY,
  SALES_TEMPLATE_VERSION,
  type SalesSpreadsheetDocumentType,
  type SalesSpreadsheetPreview,
  type SpreadsheetPreviewLine,
  type SpreadsheetValidationIssue,
} from "../types/spreadsheetImport";

type CellValue = string | number | boolean | null;

interface ParsedWorkbook {
  sheets: Map<string, Map<string, CellValue>>;
  sharedStrings: string[];
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 50;

interface ZipDirectoryEntry {
  name: string;
  compressionMethod: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }
  throw new Error("This file is not a complete Excel workbook.");
}

function decodeZipName(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseZipDirectory(bytes: Uint8Array): ZipDirectoryEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(bytes);
  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(endOffset + 6, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralDirectorySize = view.getUint32(endOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entryCount === 0xffff ||
    centralDirectoryOffset === 0xffffffff ||
    centralDirectorySize === 0xffffffff
  ) {
    throw new Error("Multi-volume and ZIP64 workbooks are not supported.");
  }
  if (centralDirectoryOffset + centralDirectorySize > bytes.byteLength) {
    throw new Error("The workbook directory is damaged.");
  }

  const entries: ZipDirectoryEntry[] = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (
      offset + 46 > bytes.byteLength ||
      view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_HEADER
    ) {
      throw new Error("The workbook directory is damaged.");
    }
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + fileNameLength + extraFieldLength + commentLength;
    if (nextOffset > bytes.byteLength) {
      throw new Error("The workbook directory is truncated.");
    }
    const name = decodeZipName(bytes.subarray(offset + 46, offset + 46 + fileNameLength));
    if (name.includes("\\") || name.split("/").includes("..") || name.startsWith("/")) {
      throw new Error("The workbook contains an unsafe internal path.");
    }
    entries.push({
      name,
      compressionMethod: view.getUint16(offset + 10, true),
      crc32: view.getUint32(offset + 16, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localHeaderOffset: view.getUint32(offset + 42, true),
    });
    offset = nextOffset;
  }
  return entries;
}

let crcTable: Uint32Array | undefined;

function calculateCrc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const compressedCopy = new Uint8Array(bytes.byteLength);
  compressedCopy.set(bytes);
  const stream = new Blob([compressedCopy.buffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let actualSize = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = new Uint8Array(result.value);
      actualSize += chunk.byteLength;
      if (actualSize > MAX_UNCOMPRESSED_BYTES) {
        await reader.cancel("Workbook expansion limit exceeded");
        throw new Error("The workbook expands beyond the 20 MB safety limit.");
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(actualSize);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function readZipEntry(
  archive: Uint8Array,
  entry: ZipDirectoryEntry,
): Promise<Uint8Array> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const offset = entry.localHeaderOffset;
  if (
    offset + 30 > archive.byteLength ||
    view.getUint32(offset, true) !== ZIP_LOCAL_FILE_HEADER
  ) {
    throw new Error(`The workbook entry “${entry.name}” is damaged.`);
  }
  const fileNameLength = view.getUint16(offset + 26, true);
  const extraFieldLength = view.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
  const endOffset = dataOffset + entry.compressedSize;
  if (endOffset > archive.byteLength) {
    throw new Error(`The workbook entry “${entry.name}” is truncated.`);
  }

  const compressed = archive.subarray(dataOffset, endOffset);
  const uncompressed =
    entry.compressionMethod === 0
      ? new Uint8Array(compressed)
      : entry.compressionMethod === 8
        ? await inflateRaw(compressed)
        : (() => {
            throw new Error(`The workbook uses unsupported compression in “${entry.name}”.`);
          })();
  if (
    uncompressed.byteLength !== entry.uncompressedSize ||
    calculateCrc32(uncompressed) !== entry.crc32
  ) {
    throw new Error(`The workbook entry “${entry.name}” failed its integrity check.`);
  }
  return uncompressed;
}

async function unzipXlsx(file: File): Promise<Map<string, string>> {
  const archive = new Uint8Array(await file.arrayBuffer());
  const directory = parseZipDirectory(archive);
  if (directory.some((entry) => /vbaProject\.bin$/i.test(entry.name))) {
    throw new Error("Macro-enabled workbooks are not accepted.");
  }
  if (directory.some((entry) => /externalLinks\//i.test(entry.name))) {
    throw new Error("External workbook links are not accepted.");
  }
  const declaredBytes = directory.reduce(
    (total, entry) => total + entry.uncompressedSize,
    0,
  );
  if (declaredBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new Error("The workbook expands beyond the 20 MB safety limit.");
  }

  const wantedEntries = new Set([
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/sharedStrings.xml",
  ]);
  for (const entry of directory) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name)) {
      wantedEntries.add(entry.name);
    }
  }
  const xmlEntries = new Map<string, string>();
  for (const entry of directory) {
    if (!wantedEntries.has(entry.name)) continue;
    const content = await readZipEntry(archive, entry);
    xmlEntries.set(entry.name, new TextDecoder("utf-8", { fatal: true }).decode(content));
  }
  return xmlEntries;
}

function xmlDocument(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("The workbook contains invalid XML and cannot be read.");
  }
  return document;
}

function childText(element: Element, localName: string): string {
  const node = Array.from(element.children).find(
    (child) => child.localName === localName,
  );
  return node?.textContent ?? "";
}

function relationshipTargetPath(target: string): string {
  const cleanTarget = target.replace(/^\//, "");
  return cleanTarget.startsWith("xl/") ? cleanTarget : `xl/${cleanTarget}`;
}

function parseSharedStrings(xml?: string): string[] {
  if (!xml) return [];
  const document = xmlDocument(xml);
  return Array.from(document.getElementsByTagNameNS("*", "si")).map((item) =>
    Array.from(item.getElementsByTagNameNS("*", "t"))
      .map((textNode) => textNode.textContent ?? "")
      .join(""),
  );
}

function parseCell(cell: Element, sharedStrings: string[]): CellValue {
  const type = cell.getAttribute("t");
  const inlineString = Array.from(cell.getElementsByTagNameNS("*", "is"))
    .flatMap((item) => Array.from(item.getElementsByTagNameNS("*", "t")))
    .map((item) => item.textContent ?? "")
    .join("");
  if (type === "inlineStr") return inlineString;

  const value = childText(cell, "v");
  if (value === "") return null;
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "b") return value === "1";
  if (type === "str" || type === "e") return value;

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function parseSheet(xml: string, sharedStrings: string[]): Map<string, CellValue> {
  const document = xmlDocument(xml);
  const cells = new Map<string, CellValue>();
  for (const cell of Array.from(document.getElementsByTagNameNS("*", "c"))) {
    const reference = cell.getAttribute("r")?.toUpperCase();
    if (reference) cells.set(reference, parseCell(cell, sharedStrings));
  }
  return cells;
}

async function unzipWorkbook(file: File): Promise<ParsedWorkbook> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Choose the official .xlsx template. Macro-enabled files are not accepted.");
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new Error("The workbook must be between 1 byte and 5 MB.");
  }

  const entries = await unzipXlsx(file);
  const workbookXml = entries.get("xl/workbook.xml");
  const relationshipsXml = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relationshipsXml) {
    throw new Error("This file is not a complete Excel workbook.");
  }

  const sharedStrings = parseSharedStrings(
    entries.get("xl/sharedStrings.xml"),
  );
  const relationships = new Map<string, string>();
  const relationshipsDocument = xmlDocument(relationshipsXml);
  for (const relationship of Array.from(
    relationshipsDocument.getElementsByTagNameNS("*", "Relationship"),
  )) {
    const id = relationship.getAttribute("Id");
    const target = relationship.getAttribute("Target");
    if (id && target) relationships.set(id, relationshipTargetPath(target));
  }

  const workbookDocument = xmlDocument(workbookXml);
  const sheets = new Map<string, Map<string, CellValue>>();
  for (const sheet of Array.from(
    workbookDocument.getElementsByTagNameNS("*", "sheet"),
  )) {
    const name = sheet.getAttribute("name");
    const relationshipId =
      sheet.getAttribute("r:id") ??
      sheet.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      );
    const target = relationshipId ? relationships.get(relationshipId) : undefined;
    const worksheetXml = target ? entries.get(target) : undefined;
    if (name && worksheetXml) {
      sheets.set(name, parseSheet(worksheetXml, sharedStrings));
    }
  }

  return { sheets, sharedStrings };
}

function text(cells: Map<string, CellValue>, address: string): string {
  const value = cells.get(address.toUpperCase());
  return value === null || value === undefined ? "" : String(value).trim();
}

function numeric(cells: Map<string, CellValue>, address: string): number | null {
  const value = cells.get(address.toUpperCase());
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function excelDate(value: CellValue): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + Math.floor(value) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }
  const raw = value === null || value === undefined ? "" : String(value).trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function yesNo(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (["yes", "y", "true", "allowed"].includes(normalized)) return true;
  if (["no", "n", "false", "not allowed"].includes(normalized)) return false;
  return null;
}

function invoicingBasis(value: string): "actual_net_weight" | "theoretical_weight" | "pieces" {
  if (/theoretical/i.test(value)) return "theoretical_weight";
  if (/piece/i.test(value)) return "pieces";
  return "actual_net_weight";
}

function recipients(value: string, cell: string, issues: SpreadsheetValidationIssue[]): QuotationRecipientV2[] {
  if (!value) return [];
  return value
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const angleMatch = part.match(/^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
      const emailOnlyMatch = part.match(/^([^\s<>]+@[^\s<>]+)$/);
      const recipient = angleMatch
        ? { name: angleMatch[1].trim(), email: angleMatch[2].trim() }
        : emailOnlyMatch
          ? { name: "", email: emailOnlyMatch[1] }
          : { name: part, email: "" };
      if (!recipient.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        issues.push({
          cell,
          field: `recipient_${index + 1}`,
          message: `Recipient “${part}” needs a valid email address. Use Name <email@company.com>.`,
          severity: "error",
        });
      }
      return recipient;
    });
}

function dimensionsFromText(value: string): Pick<
  InquiryItemV2Draft,
  "thickness_mm" | "width_mm" | "length_mm"
> {
  const numbers = value
    .replace(/,/g, ".")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) ?? [];
  return {
    thickness_mm: numbers[0] ?? null,
    width_mm: numbers[1] ?? null,
    length_mm: numbers[2] ?? null,
  };
}

function requiredIssue(
  issues: SpreadsheetValidationIssue[],
  cell: string,
  field: string,
  value: string,
  message: string,
) {
  if (!value) issues.push({ cell, field, message, severity: "error" });
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function parseSalesSpreadsheet(
  file: File,
): Promise<SalesSpreadsheetPreview> {
  const workbook = await unzipWorkbook(file);
  const instructions = workbook.sheets.get("Instructions");
  const entry = workbook.sheets.get("Offer Entry");
  const templateMap = workbook.sheets.get("Template Map");
  if (!instructions || !entry || !templateMap) {
    throw new Error("This is not the official CACO inquiry / offer workbook.");
  }

  const templateKey = text(templateMap, "B4") || text(instructions, "B4");
  const templateVersion = text(templateMap, "B5") || text(instructions, "B5");
  if (templateKey !== SALES_TEMPLATE_KEY || templateVersion !== SALES_TEMPLATE_VERSION) {
    throw new Error(
      `Unsupported template. Download version ${SALES_TEMPLATE_VERSION} from the platform.`,
    );
  }

  const issues: SpreadsheetValidationIssue[] = [];
  const documentTypeRaw = text(entry, "B4");
  const documentType: SalesSpreadsheetDocumentType =
    documentTypeRaw.toLowerCase() === "inquiry" ? "Inquiry" : "Quotation";
  if (!["inquiry", "quotation"].includes(documentTypeRaw.toLowerCase())) {
    issues.push({
      cell: "B4",
      field: "document_type",
      message: "Choose Inquiry or Quotation.",
      severity: "error",
    });
  }

  const companyName = text(entry, "B6");
  const documentReference = text(entry, "B5");
  const documentDate = excelDate(entry.get("F6"));
  const validUntil = excelDate(entry.get("F7"));
  const currency = text(entry, "F9").toUpperCase();
  requiredIssue(issues, "B6", "customer_company", companyName, "Customer / company is required.");
  requiredIssue(issues, "F6", "document_date", documentDate, "Document date is required.");
  requiredIssue(issues, "F9", "currency", currency, "Currency is required.");
  if (currency && currency !== "USD") {
    issues.push({ cell: "F9", field: "currency", message: "The current sales workflow supports USD only.", severity: "error" });
  }

  const lines: SpreadsheetPreviewLine[] = [];
  const inquiryItems: InquiryItemV2Draft[] = [];
  const quotationItems: QuotationItemV2[] = [];
  const basis = invoicingBasis(text(entry, "B19"));
  for (let row = 30; row < 30 + MAX_ROWS; row += 1) {
    const productName = text(entry, `A${row}`);
    const dimensionsText = text(entry, `B${row}`);
    const grade = text(entry, `C${row}`);
    const additionalSpecification = text(entry, `D${row}`);
    const quantity = numeric(entry, `E${row}`);
    const unit = text(entry, `F${row}`);
    const unitPrice = numeric(entry, `G${row}`);
    const hasLineData = Boolean(
      productName || dimensionsText || grade || additionalSpecification || quantity !== null || unitPrice !== null,
    );
    if (!hasLineData) continue;

    if (!productName) {
      issues.push({ cell: `A${row}`, field: "product_name", message: "Material / product is required.", severity: "error" });
    }
    if (quantity === null || quantity <= 0) {
      issues.push({ cell: `E${row}`, field: "quantity", message: "Quantity must be greater than zero.", severity: "error" });
    }
    if (!unit) {
      issues.push({ cell: `F${row}`, field: "unit", message: "Unit is required.", severity: "error" });
    }
    if (documentType === "Quotation" && (unitPrice === null || unitPrice <= 0)) {
      issues.push({ cell: `G${row}`, field: "unit_price", message: "A unit price greater than zero is required for a quotation.", severity: "error" });
    }

    const safeQuantity = quantity ?? 0;
    const recalculatedAmount = unitPrice === null ? null : safeQuantity * unitPrice;
    lines.push({
      row,
      product_name: productName,
      dimensions_text: dimensionsText,
      grade,
      additional_specification: additionalSpecification,
      quantity: safeQuantity,
      unit,
      unit_price: unitPrice,
      recalculated_amount: recalculatedAmount,
    });

    inquiryItems.push({
      ...createBlankInquiryItemV2(),
      ...dimensionsFromText(dimensionsText),
      product_name: productName,
      grade,
      standard: additionalSpecification,
      additional_specification: additionalSpecification,
      quantity: safeQuantity,
      unit: unit || "MT",
      invoicing_basis: basis,
      specification_data: { source_dimensions_text: dimensionsText },
    });
    quotationItems.push({
      ...createEmptyQuotationItemV2(quotationItems.length + 1),
      product_name: productName,
      grade,
      standard: additionalSpecification,
      dimensions_text: dimensionsText,
      quantity: safeQuantity,
      unit: unit || "MT",
      unit_price: unitPrice ?? 0,
      amount: recalculatedAmount ?? 0,
      invoicing_basis: basis,
      specification_snapshot: { additional_specification: additionalSpecification },
    });
  }

  if (lines.length === 0) {
    issues.push({ cell: "A30:H79", field: "items", message: "Add at least one material line.", severity: "error" });
  }

  const toRecipients = recipients(text(entry, "B7"), "B7", issues);
  const ccRecipients = recipients(text(entry, "B8"), "B8", issues);
  if (documentType === "Quotation" && toRecipients.length === 0) {
    issues.push({ cell: "B7", field: "to_recipients", message: "Add at least one To recipient for a quotation.", severity: "warning" });
  }

  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
  const recalculatedSubtotal = lines.reduce(
    (total, line) => total + (line.recalculated_amount ?? 0),
    0,
  );
  const inquiryDraft = createBlankInquiryV2Draft();
  inquiryDraft.inquiry_date = documentDate;
  inquiryDraft.customer_reference = text(entry, "F8");
  inquiryDraft.currency = currency || "USD";
  inquiryDraft.loading_port = text(entry, "B14");
  inquiryDraft.discharge_port = text(entry, "E14");
  inquiryDraft.requested_incoterms = [text(entry, "E13")].filter(Boolean);
  inquiryDraft.requested_payment_terms = text(entry, "D16");
  inquiryDraft.requested_shipment_method = text(entry, "E15");
  inquiryDraft.requested_latest_shipment_date = excelDate(entry.get("B15"));
  inquiryDraft.requested_marking_terms = text(entry, "B17");
  inquiryDraft.special_conditions = text(entry, "B23");
  inquiryDraft.required_documents = text(entry, "B21");
  inquiryDraft.packing_requirements = text(entry, "B20");
  inquiryDraft.notes = text(entry, "B18");
  inquiryDraft.items = inquiryItems;

  const quotationDraft = createEmptyQuotationDraftV2();
  quotationDraft.quotation_no = documentReference || undefined;
  quotationDraft.quotation_date = documentDate;
  quotationDraft.valid_until = validUntil || null;
  quotationDraft.currency = currency || "USD";
  quotationDraft.to_recipients = toRecipients;
  quotationDraft.cc_recipients = ccRecipients;
  quotationDraft.subtotal = recalculatedSubtotal;
  quotationDraft.total_amount = recalculatedSubtotal;
  quotationDraft.payment_terms = text(entry, "D16");
  quotationDraft.incoterm_rule = text(entry, "E13");
  quotationDraft.named_place = text(entry, "G13");
  quotationDraft.loading_port = text(entry, "B14");
  quotationDraft.discharge_port = text(entry, "E14");
  quotationDraft.shipment_method = text(entry, "E15") as typeof quotationDraft.shipment_method;
  quotationDraft.partial_shipment_allowed = yesNo(text(entry, "H15"));
  quotationDraft.transshipment_allowed = yesNo(text(entry, "B16"));
  quotationDraft.latest_shipment_date = excelDate(entry.get("B15")) || null;
  quotationDraft.origin_country = text(entry, "B13");
  quotationDraft.packing_terms = text(entry, "B20");
  quotationDraft.marking_terms = text(entry, "B17");
  quotationDraft.inspection_terms = text(entry, "B22");
  quotationDraft.documentation_terms = text(entry, "B21");
  quotationDraft.special_conditions = text(entry, "B23");
  quotationDraft.notes = text(entry, "B18");
  quotationDraft.items = quotationItems;

  return {
    fileName: file.name,
    fileHash: await sha256(file),
    templateKey,
    templateVersion,
    documentType,
    companyName,
    documentReference,
    documentDate,
    currency,
    lines,
    totalQuantity,
    recalculatedSubtotal,
    issues,
    inquiryDraft,
    quotationDraft,
  };
}
