import {
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Select,
} from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  createCompany,
  updateCompany,
  getCompanyTypes,
  type CompanyTypeOption,
} from "../../services/companyService";
import { countryOptions } from "../../utils/countries";
import type { Company } from "../../types/company";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  company?: Company;
}

export default function CompanyForm({
  opened,
  onClose,
  onSaved,
  company,
}: Props) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companyTypes, setCompanyTypes] = useState<CompanyTypeOption[]>([]);
  const [shortName, setShortName] = useState("");
  const [formalAddress, setFormalAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setCountry(company.country || "");
      setCity(company.city || "");
      setWebsite(company.website || "");
      setEmail(company.email || "");
      setPhone(company.phone || "");
      setCompanyType(company.company_type || "");
      setShortName(company.short_name || "");
      setFormalAddress(company.formal_address || company.address || "");
      setRegistrationNumber(company.registration_number || company.tax_number || "");
    } else {
      clearForm();
    }
  }, [company, opened]);

  function clearForm() {
    setName("");
    setCountry("");
    setCity("");
    setWebsite("");
    setEmail("");
    setPhone("");
    setCompanyType("");
    setShortName("");
    setFormalAddress("");
    setRegistrationNumber("");
  }

  useEffect(() => {
    void getCompanyTypes().then(setCompanyTypes).catch(() => toast.error("Company types could not be loaded."));
  }, []);

  async function handleSubmit() {
    const payload = {
      name,
      country,
      city,
      website,
      email,
      phone,
      company_type: companyType,
      company_type_id: companyTypes.find((type) => type.name === companyType)?.id ?? null,
      short_name: shortName || null,
      formal_address: formalAddress || null,
      registration_number: registrationNumber || null,
    };

    try {
      if (company) {
        await updateCompany(company.id, payload);
        toast.success("Company updated");
      } else {
        await createCompany(payload);
        toast.success("Company created");
      }

      onSaved();
    } catch (error) {
      toast.error("Operation failed");
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={company ? "Edit Company" : "Add Company"}
      centered
    >
      <Stack>

        <TextInput
          label="Company Name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />

        <Select
          label="Company Type"
          value={companyType}
          onChange={(value) =>
            setCompanyType(value || "")
          }
          data={companyTypes.map((type) => type.name)}
        />

        <Select
          label="Country"
          required
          searchable
          value={country}
          onChange={(value) => setCountry(value || "")}
          data={countryOptions}
        />

        <TextInput label="Short Name" value={shortName} onChange={(e) => setShortName(e.currentTarget.value)} />
        <TextInput label="Head Office Address" value={formalAddress} onChange={(e) => setFormalAddress(e.currentTarget.value)} />
        <TextInput label="Registration or Tax Number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.currentTarget.value)} />

        <TextInput
          label="City"
          value={city}
          onChange={(e) =>
            setCity(e.currentTarget.value)
          }
        />

        <TextInput
          label="Website"
          value={website}
          onChange={(e) =>
            setWebsite(e.currentTarget.value)
          }
        />

        <TextInput
          label="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.currentTarget.value)
          }
        />

        <TextInput
          label="Phone"
          value={phone}
          onChange={(e) =>
            setPhone(e.currentTarget.value)
          }
        />


        <Group justify="flex-end" mt="md">
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
