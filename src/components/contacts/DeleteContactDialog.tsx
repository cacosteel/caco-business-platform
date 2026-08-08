import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void;
  contactName?: string;
}

export default function DeleteContactDialog({
  opened,
  onClose,
  onDelete,
  contactName,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Contact"
      centered
    >
      <Text mb="xl">
        Are you sure you want to delete{" "}
        <strong>{contactName}</strong>?
      </Text>

      <Group justify="flex-end">
        <Button
          variant="default"
          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          color="red"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Delete
        </Button>
      </Group>
    </Modal>
  );
}