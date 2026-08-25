import {
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Select,
  Anchor,
  Textarea,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  createContact,
  updateContact,
} from "../../services/contactService";
import { getCompanies } from "../../services/companyService";
import { countryOptions } from "../../utils/countries";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  contact?: any;
}

export default function ContactForm({
  opened,
  onClose,
  onSaved,
  contact,
}: Props) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    setCompanyError("");

    if (contact) {
      setCompanyId(contact.company_id || "");
      setFirstName(contact.first_name || "");
      setLastName(contact.last_name || "");
      setPosition(contact.position || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setCountry(contact.country || "");
      setMobile(contact.mobile || "");
      setNotes(contact.notes || "");
    } else {
      clearForm();
    }
  }, [contact, opened]);

  async function loadCompanies() {
    const data = await getCompanies();
    setCompanies(data || []);
  }

  function clearForm() {
    setCompanyId("");
    setCompanyError("");
    setFirstName("");
    setLastName("");
    setPosition("");
    setEmail("");
    setPhone("");
    setCountry("");
    setMobile("");
    setNotes("");
  }

  async function handleSubmit() {
    if (!companyId) {
      setCompanyError("Select the company this contact belongs to.");
      return;
    }

    const payload = {
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      position,
      email,
      phone,
      country,
      mobile,
      notes,
    };

    try {
      if (contact) {
        await updateContact(contact.id, payload);
        toast.success("Contact updated");
      } else {
        await createContact(payload);
        toast.success("Contact created");
      }

      onSaved();

    } catch (error) {
      console.error(error);
      toast.error("Operation failed");
    }
  }

  function goToNewCompany() {
    onClose();
    navigate("/dashboard/companies?create=1");
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={contact ? "Edit Contact" : "Add Contact"}
      centered
    >
      <Stack>

        <Select
          label="Company"
          required
          searchable
          value={companyId}
          error={companyError}
          onChange={(value) => {
            setCompanyId(value || "");
            setCompanyError("");
          }}
          data={companies.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        <Anchor component="button" type="button" onClick={goToNewCompany}>
          Company not listed? Add a new company
        </Anchor>

        <TextInput
          label="First Name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
        />

        <TextInput
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
        />

        <TextInput
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.currentTarget.value)}
        />

        <TextInput
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />

        <TextInput
          label="Phone"
          required
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />

        <Select
          label="Country"
          required
          searchable
          value={country}
          onChange={(value) => setCountry(value || "")}
          data={countryOptions}
        />

        <TextInput
          label="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.currentTarget.value)}
        />

        <Textarea
          label="Notes"
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
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
