import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void;
  productName?: string;
}

export default function DeleteProductDialog({
  opened,
  onClose,
  onDelete,
  productName,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Product"
      centered
    >
      <Text mb="xl">
        Are you sure you want to delete{" "}
        <strong>{productName}</strong>?
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