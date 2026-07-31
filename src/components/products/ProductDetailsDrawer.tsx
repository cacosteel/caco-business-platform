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
  product: any;
}

export default function ProductDetailsDrawer({
  opened,
  onClose,
  product,
}: Props) {
  if (!product) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Product Details"
      position="right"
      size="md"
    >
      <Stack gap="md">

        <Text fw={700} size="xl">
          {product.name}
        </Text>

        <Badge>
          {product.category || "-"}
        </Badge>

        <Divider />

        <div>
          <Text size="sm" c="dimmed">
            Product Code
          </Text>
          <Text>{product.code || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Category
          </Text>
          <Text>{product.category || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Unit
          </Text>
          <Text>{product.unit || "-"}</Text>
        </div>

        <div>
          <Text size="sm" c="dimmed">
            Description
          </Text>
          <Text>{product.description || "-"}</Text>
        </div>

      </Stack>
    </Drawer>
  );
}