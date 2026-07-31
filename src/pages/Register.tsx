import { Button, Paper, PasswordInput, Select, Stack, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getCompanies } from "../services/companyService";
import { supabase } from "../lib/supabase";

const membershipRoles = [
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "viewer", label: "Viewer" },
];

export default function Register() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getCompanies().then(setCompanies).catch(() => toast.error("Companies could not be loaded."));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !requestedRole) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          company_id: companyId,
          requested_role: requestedRole,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Registration submitted. An administrator must approve your access.");
    navigate("/login", { replace: true });
  }

  return (
    <Paper maw={460} mx="auto" my={60} p="xl" withBorder>
      <Title order={2} mb="md">Create an account</Title>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="First name" required value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
          <TextInput label="Last name" required value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
          <TextInput label="Email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          <PasswordInput label="Password" required minLength={8} value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
          <Select
            label="Company"
            required
            searchable
            data={companies.map((company) => ({ value: company.id, label: company.name }))}
            value={companyId}
            onChange={(value) => setCompanyId(typeof value === "string" ? value : null)}
          />
          <Select
            label="Membership role"
            description="This role is assigned after administrator approval."
            required
            data={membershipRoles}
            value={requestedRole}
            onChange={(value) => setRequestedRole(typeof value === "string" ? value : null)}
          />
          <Button type="submit" loading={submitting}>Submit for approval</Button>
        </Stack>
      </form>
      <Link to="/login">Already have an account? Sign in</Link>
    </Paper>
  );
}
