import {
  Badge,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  inquiry: any;
}

export default function InquiryDetailsDrawer({
  opened,
  onClose,
  inquiry,
}: Props) {
  if (!inquiry) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Inquiry Details"
      position="right"
      size="md"
    >
      <Stack gap="md">

        <Text fw={700} size="xl">
          {inquiry.inquiry_no}
        </Text>

        <Group>
          <Badge color="blue">
            {inquiry.status}
          </Badge>
        </Group>

        <Divider />

        <div>
          <Text size="sm" c="dimmed">
            Company
          </Text>
          <Text>
            {inquiry.companies?.name || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Contact
          </Text>
          <Text>
            {inquiry.company_contacts
              ? `${inquiry.company_contacts.first_name} ${inquiry.company_contacts.last_name ?? ""}`
              : "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Product
          </Text>
          <Text>
            {inquiry.products?.name || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Inquiry Date
          </Text>
          <Text>
            {inquiry.inquiry_date || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Quantity
          </Text>
          <Text>
            {inquiry.quantity || "-"} {inquiry.unit || ""}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Target Price
          </Text>
          <Text>
            {inquiry.target_price || "-"} {inquiry.currency || ""}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Notes
          </Text>
          <Text>
            {inquiry.notes || "-"}
          </Text>
        </div>

      </Stack>
    </Drawer>
  );
}