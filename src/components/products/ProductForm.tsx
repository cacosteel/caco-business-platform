import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
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
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCode(product.code || "");
      setCategory(product.category || "");
      setUnit(product.unit || "");
      setDescription(product.description || "");
    } else {
      clearForm();
    }
  }, [product, opened]);

  function clearForm() {
    setName("");
    setCode("");
    setCategory("");
    setUnit("");
    setDescription("");
  }

  async function handleSubmit() {
    const payload = {
      name,
      code,
      category,
      unit,
      description,
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
            "Steel Coil",
            "Steel Sheet",
            "Steel Pipe",
            "Steel Profile",
            "Rebar",
            "Wire Rod",
            "Fastener",
            "Tower",
            "Solar Structure",
            "Other",
          ]}
        />

        <TextInput
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.currentTarget.value)}
        />

        <Textarea
          label="Description"
          minRows={4}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
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