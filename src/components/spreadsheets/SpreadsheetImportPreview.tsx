import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconDownload, IconUpload } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { parseSalesSpreadsheet } from "../../services/spreadsheetImportService";
import {
  hasSpreadsheetErrors,
  SALES_TEMPLATE_DOWNLOAD_PATH,
  type SalesSpreadsheetPreview,
} from "../../types/spreadsheetImport";

interface SpreadsheetImportPreviewProps {
  opened: boolean;
  onClose: () => void;
  expectedType: "Inquiry" | "Quotation";
  onConfirm: (
    preview: SalesSpreadsheetPreview,
    signal: AbortSignal,
  ) => void | Promise<void>;
}

export default function SpreadsheetImportPreview({
  opened,
  onClose,
  expectedType,
  onConfirm,
}: SpreadsheetImportPreviewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SalesSpreadsheetPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const inspectionIdRef = useRef(0);
  const confirmationRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      inspectionIdRef.current += 1;
      confirmationRef.current?.abort();
    },
    [],
  );

  async function inspect(selectedFile: File | null) {
    const inspectionId = inspectionIdRef.current + 1;
    inspectionIdRef.current = inspectionId;
    setFile(selectedFile);
    setPreview(null);
    setFatalError("");
    if (!selectedFile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const nextPreview = await parseSalesSpreadsheet(selectedFile);
      if (inspectionId !== inspectionIdRef.current) return;
      if (nextPreview.documentType !== expectedType) {
        nextPreview.issues.unshift({
          cell: "B4",
          field: "document_type",
          message: `This screen expects ${expectedType}; the workbook is marked ${nextPreview.documentType}.`,
          severity: "error",
        });
      }
      setPreview(nextPreview);
    } catch (error) {
      if (inspectionId !== inspectionIdRef.current) return;
      setFatalError(
        error instanceof Error ? error.message : "The workbook could not be inspected.",
      );
    } finally {
      if (inspectionId === inspectionIdRef.current) setLoading(false);
    }
  }

  function close() {
    inspectionIdRef.current += 1;
    confirmationRef.current?.abort();
    confirmationRef.current = null;
    setFile(null);
    setPreview(null);
    setLoading(false);
    setFatalError("");
    setConfirming(false);
    onClose();
  }

  async function confirm(): Promise<void> {
    if (!preview || hasSpreadsheetErrors(preview)) return;

    confirmationRef.current?.abort();
    const controller = new AbortController();
    confirmationRef.current = controller;
    setConfirming(true);
    setFatalError("");
    try {
      await onConfirm(preview, controller.signal);
      if (controller.signal.aborted) return;
      setFile(null);
      setPreview(null);
    } catch (error) {
      if (!controller.signal.aborted) {
        setFatalError(
          error instanceof Error
            ? error.message
            : "The validated workbook could not be staged.",
        );
      }
    } finally {
      if (confirmationRef.current === controller) {
        confirmationRef.current = null;
        setConfirming(false);
      }
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={`Import ${expectedType.toLowerCase()} workbook`}
      size="90rem"
      centered
    >
      <Stack>
        <Group justify="space-between" align="end">
          <FileInput
            label="Official CACO workbook"
            description=".xlsx only, maximum 5 MB"
            placeholder="Choose completed template"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            value={file}
            onChange={(value) => void inspect(value)}
            leftSection={<IconUpload size={16} />}
            disabled={confirming}
            clearable
            style={{ flex: 1 }}
          />
          <Button
            component="a"
            href={SALES_TEMPLATE_DOWNLOAD_PATH}
            download
            variant="default"
            leftSection={<IconDownload size={16} />}
          >
            Download template
          </Button>
        </Group>

        {loading && <Loader size="sm" />}
        {fatalError && (
          <Alert
            color="red"
            icon={<IconAlertCircle size={18} />}
            title={preview ? "Import could not be prepared" : "Workbook rejected"}
          >
            {fatalError}
          </Alert>
        )}

        {preview && (
          <>
            <Paper withBorder p="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={700}>{preview.fileName}</Text>
                  <Text size="sm" c="dimmed">
                    {preview.companyName || "No company"} • {preview.documentDate || "No date"} • {preview.currency || "No currency"}
                  </Text>
                </div>
                <Group gap="xs">
                  <Badge variant="light">{preview.templateVersion}</Badge>
                  <Badge color={preview.documentType === expectedType ? "blue" : "red"}>
                    {preview.documentType}
                  </Badge>
                </Group>
              </Group>
            </Paper>

            {preview.issues.length > 0 && (
              <Alert
                color={hasSpreadsheetErrors(preview) ? "red" : "yellow"}
                icon={<IconAlertCircle size={18} />}
                title={hasSpreadsheetErrors(preview) ? "Resolve validation errors" : "Review warnings"}
              >
                <Stack gap={4}>
                  {preview.issues.map((issue, index) => (
                    <Text key={`${issue.cell}-${issue.field}-${index}`} size="sm">
                      <strong>{issue.cell}</strong>: {issue.message}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            <ScrollArea mah={430}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Excel row</Table.Th>
                    <Table.Th>Material</Table.Th>
                    <Table.Th>Size</Table.Th>
                    <Table.Th>Quality</Table.Th>
                    <Table.Th>Quantity</Table.Th>
                    <Table.Th>Unit</Table.Th>
                    <Table.Th>Unit price</Table.Th>
                    <Table.Th>Recalculated total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.lines.map((line) => (
                    <Table.Tr key={line.row}>
                      <Table.Td>{line.row}</Table.Td>
                      <Table.Td>{line.product_name}</Table.Td>
                      <Table.Td>{line.dimensions_text || "—"}</Table.Td>
                      <Table.Td>{line.grade || "—"}</Table.Td>
                      <Table.Td>{line.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</Table.Td>
                      <Table.Td>{line.unit}</Table.Td>
                      <Table.Td>{line.unit_price === null ? "—" : line.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                      <Table.Td>{line.recalculated_amount === null ? "—" : line.recalculated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
                <Table.Tfoot>
                  <Table.Tr>
                    <Table.Th colSpan={4}>Platform recalculation</Table.Th>
                    <Table.Th>{preview.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</Table.Th>
                    <Table.Th />
                    <Table.Th />
                    <Table.Th>{preview.recalculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Th>
                  </Table.Tr>
                </Table.Tfoot>
              </Table>
            </ScrollArea>

            <Alert color="blue" title="Nothing has been saved yet">
              Confirming fills a draft editor. You can review and change every field before saving it to the platform.
            </Alert>

            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button
                leftSection={<IconCheck size={16} />}
                disabled={hasSpreadsheetErrors(preview)}
                loading={confirming}
                onClick={() => void confirm()}
              >
                Use this validated draft
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
