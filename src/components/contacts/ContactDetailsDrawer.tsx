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
  contact: any;
}

export default function ContactDetailsDrawer({
  opened,
  onClose,
  contact,
}: Props) {
  if (!contact) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Contact Details"
      position="right"
      size="md"
    >
      <Stack gap="md">

        <Text fw={700} size="xl">
          {contact.first_name} {contact.last_name}
        </Text>

        <Group>
          <Badge color="blue">
            {contact.companies?.name || "-"}
          </Badge>
        </Group>

        <Divider />

        <div>
          <Text size="sm" c="dimmed">
            Position
          </Text>
          <Text>{contact.position || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Email
          </Text>
          <Text>{contact.email || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Phone
          </Text>
          <Text>{contact.phone || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Mobile
          </Text>
          <Text>{contact.mobile || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Notes
          </Text>
          <Text>{contact.notes || "-"}</Text>
        </div>

      </Stack>
    </Drawer>
  );
}