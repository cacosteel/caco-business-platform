import { Modal, TextInput, Select, Group, Button } from "@mantine/core";
import { useState, useEffect } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  company?: any;
  onSave: (company: any) => void;
}

export default function CompanyModal({
  opened,
  onClose,
  company,
  onSave,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    country: "",
    type: "Customer",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        country: company.country ?? "",
        type: company.type ?? "Customer",
      });
    } else {
      setForm({
        name: "",
        country: "",
        type: "Customer",
      });
    }
  }, [company]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={company ? "Edit Company" : "Add Company"}
      centered
    >
      <TextInput
        label="Company Name"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.currentTarget.value })
        }
        mb="md"
      />

      <TextInput
        label="Country"
        value={form.country}
        onChange={(e) =>
          setForm({ ...form, country: e.currentTarget.value })
        }
        mb="md"
      />

      <Select
        label="Type"
        data={[
          "Customer",
          "Supplier",
          "Manufacturer",
          "Partner",
          "Logistics",
        ]}
        value={form.type}
        onChange={(value) =>
          setForm({
            ...form,
            type: value || "Customer",
          })
        }
        mb="xl"
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>

        <Button
          color="red"
          onClick={() => {
            onSave(form);
            onClose();
          }}
        >
          Save
        </Button>
      </Group>
    </Modal>
  );
}
