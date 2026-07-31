import {
  Badge,
  Divider,
  Drawer,
  Stack,
  Text,
} from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  quotation: any;
}

export default function QuotationDetailsDrawer({
  opened,
  onClose,
  quotation,
}: Props) {
  if (!quotation) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Quotation Details"
      position="right"
      size="md"
    >
      <Stack gap="md">

        <Text fw={700} size="xl">
          {quotation.quotation_no}
        </Text>

        <Badge color="green">
          {quotation.status}
        </Badge>

        <Divider />

        <div>
          <Text size="sm" c="dimmed">
            Company
          </Text>
          <Text>
            {quotation.companies?.name || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Contact
          </Text>
          <Text>
            {quotation.company_contacts
              ? `${quotation.company_contacts.first_name} ${quotation.company_contacts.last_name ?? ""}`
              : "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Date
          </Text>
          <Text>
            {quotation.quotation_date || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Valid Until
          </Text>
          <Text>
            {quotation.valid_until || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Currency
          </Text>
          <Text>
            {quotation.currency || "USD"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Total
          </Text>
          <Text fw={700}>
            {quotation.total || 0} {quotation.currency || "USD"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Notes
          </Text>
          <Text>
            {quotation.notes || "-"}
          </Text>
        </div>

      </Stack>
    </Drawer>
  );
}