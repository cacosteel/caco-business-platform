import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void;
  quotationNo?: string;
}

export default function DeleteQuotationDialog({
  opened,
  onClose,
  onDelete,
  quotationNo,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Quotation"
      centered
    >
      <Text mb="xl">
        Are you sure you want to delete quotation{" "}
        <strong>{quotationNo}</strong>?
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