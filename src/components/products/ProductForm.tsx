import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  createProduct,
  updateProduct,
} from "../../services/productService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: any;
}

export default function ProductForm({
  opened,
  onClose,
  onSaved,
  product,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCode(product.code || "");
      setCategory(product.category || "");
      setDescription(product.description || "");
      setIsActive(product.is_active ?? true);
    } else {
      clearForm();
    }
  }, [product, opened]);

  function clearForm() {
    setName("");
    setCode("");
    setCategory("");
    setDescription("");
    setIsActive(true);
  }

  async function handleSubmit() {
    const payload = {
      name,
      code,
      category,
      description,
      is_active: isActive,
    };

    try {
      if (product) {
        await updateProduct(product.id, payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product created");
      }

      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Operation failed");
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
      centered
    >
      <Stack>

        <TextInput
          label="Product Name"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />

        <TextInput
          label="Product Code"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
        />

        <Select
          label="Category"
          value={category}
          onChange={(value) => setCategory(value || "")}
          data={[
            "NPK Powder Products",
            "Micro Element Products",
            "Biostimulants",
            "Gel & SC Products",
            "Special Products",
            "Soil & Water Conditioners",
            "Raw Materials",
            "Other",
          ]}
        />

        <Textarea
          label="Description"
          minRows={4}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />

        <Switch
          label="Active product"
          checked={isActive}
          onChange={(event) => setIsActive(event.currentTarget.checked)}
        />

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit}>
            Save
          </Button>
        </Group>

      </Stack>
    </Modal>
  );
}
