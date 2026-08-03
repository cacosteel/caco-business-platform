import { Button, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPendingDeletionRequests, reviewDeletionRequest, type DeletionRequest } from "../../services/deletionRequestService";

export default function DeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try { setRequests(await getPendingDeletionRequests()); }
    catch { toast.error("Deletion requests could not be loaded."); }
  }

  useEffect(() => { void load(); }, []);

  async function review(request: DeletionRequest, decision: "approved" | "rejected") {
    setSavingId(request.id);
    try { await reviewDeletionRequest(request.id, decision); await load(); toast.success(decision === "approved" ? "Deletion approved." : "Deletion request rejected."); }
    catch { toast.error("The request could not be reviewed."); }
    finally { setSavingId(null); }
  }

  return <Stack gap="md"><div><Title order={1}>Deletion Requests</Title><Text c="dimmed">Approving a request hides the record while preserving it for audit purposes.</Text></div><Paper withBorder p="md"><Table striped><Table.Thead><Table.Tr><Table.Th>Record</Table.Th><Table.Th>Reason</Table.Th><Table.Th>Requested</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{requests.map((request) => <Table.Tr key={request.id}><Table.Td>{request.entity_type}</Table.Td><Table.Td>{request.reason}</Table.Td><Table.Td>{new Date(request.requested_at).toLocaleString()}</Table.Td><Table.Td><Group gap="xs"><Button size="xs" color="red" loading={savingId === request.id} onClick={() => void review(request, "approved")}>Approve deletion</Button><Button size="xs" variant="default" disabled={savingId === request.id} onClick={() => void review(request, "rejected")}>Reject</Button></Group></Table.Td></Table.Tr>)}{requests.length === 0 && <Table.Tr><Table.Td colSpan={4}>No pending deletion requests.</Table.Td></Table.Tr>}</Table.Tbody></Table></Paper></Stack>;
}
