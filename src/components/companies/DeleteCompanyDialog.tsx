import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void;
  companyName?: string;
}

export default function DeleteCompanyDialog({
  opened,
  onClose,
  onDelete,
  companyName,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Company"
      centered
    >
      <Text mb="xl">
        Are you sure you want to delete{" "}
        <strong>{companyName}</strong>?
      </Text>

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
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