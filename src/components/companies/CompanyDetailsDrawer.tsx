import {
  Drawer,
  Stack,
  Text,
  Divider,
  Badge,
} from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  company: any;
}

export default function CompanyDetailsDrawer({
  opened,
  onClose,
  company,
}: Props) {
  if (!company) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Company Details"
      position="right"
    >
      <Stack gap="md">
        <Text fw={700} size="lg">
          {company.name}
        </Text>

        <Divider />

        <div>
          <Text size="sm" c="dimmed">
            Type
          </Text>
          <Badge>
            {company.company_type || "N/A"}
          </Badge>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Country
          </Text>
          <Text>
            {company.country || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            City
          </Text>
          <Text>
            {company.city || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Website
          </Text>
          <Text>
            {company.website || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Email
          </Text>
          <Text>
            {company.email || "-"}
          </Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Phone
          </Text>
          <Text>
            {company.phone || "-"}
          </Text>
        </div>
      </Stack>
    </Drawer>
  );
}