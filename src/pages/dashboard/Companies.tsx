import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Group, Title } from "@mantine/core";
import { useCompanies } from "../../hooks/useCompanies";
import { requestDeletion } from "../../services/deletionRequestService";
import CompanyForm from "../../components/companies/CompanyForm";
import type { company } from "../../types/company";

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { companies, loading, refresh } = useCompanies();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<company>();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelected(undefined);
      setOpened(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const close = () => { setOpened(false); setSelected(undefined); };
  const remove = async (id: string) => {
    const reason = window.prompt("Why should this company be deleted?");
    if (!reason) return;
    try { await requestDeletion("company", id, reason); window.alert("Deletion request submitted for admin approval."); }
    catch (error) { console.error(error); window.alert("The deletion request could not be submitted."); }
  };

  if (loading) return <p>Loading companies...</p>;
  return <>
    <Group justify="space-between" mb="md"><Title order={1}>Companies</Title><Button onClick={() => setOpened(true)}>Add company</Button></Group>
    <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr><th>Name</th><th>Country</th><th>Type</th><th>Actions</th></tr></thead>
      <tbody>{companies.map((record) => <tr key={record.id}>
        <td><Link to={`/dashboard/companies/${record.id}`}>{record.name}</Link></td><td>{record.country || "-"}</td><td>{record.company_type || "-"}</td>
        <td><button onClick={() => { setSelected(record); setOpened(true); }}>Edit</button>{" "}<button onClick={() => remove(record.id)}>Request deletion</button></td>
      </tr>)}</tbody>
    </table>
    <CompanyForm opened={opened} company={selected} onClose={close} onSaved={async () => { await refresh(); close(); }} />
  </>;
}
