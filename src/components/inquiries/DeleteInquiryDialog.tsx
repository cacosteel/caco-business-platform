import { Button, Group, Modal, Text } from "@mantine/core";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => void;
  inquiryNumber?: string;
}

export default function DeleteInquiryDialog({
  opened,
  onClose,
  onDelete,
  inquiryNumber,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Inquiry"
      centered
    >
      <Text mb="xl">
        Are you sure you want to delete inquiry{" "}
        <strong>{inquiryNumber}</strong>?
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