import { Button, Group, Table, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { decideUserAccess, getPendingUsers, type PendingUser } from "../../services/userService";

export default function UsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await getPendingUsers());
    } catch (error) {
      toast.error("Pending users could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function decide(user: PendingUser, decision: "approved" | "rejected") {
    setSavingId(user.id);
    try {
      await decideUserAccess(user.id, decision, "member");
      toast.success(decision === "approved" ? "User approved" : "User rejected");
      await loadUsers();
    } catch (error) {
      toast.error("The access decision could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <Title order={1} mb="md">User approvals</Title>
      {loading ? <Text>Loading pending users...</Text> : (
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr><Table.Th>Name</Table.Th><Table.Th>Email</Table.Th><Table.Th>Company</Table.Th><Table.Th>Requested role</Table.Th><Table.Th>Actions</Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.first_name} {user.last_name}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>{user.companies?.name ?? "-"}</Table.Td>
                <Table.Td>{user.requested_role ?? "viewer"}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" loading={savingId === user.id} onClick={() => void decide(user, "approved")}>Approve</Button>
                    <Button size="xs" color="red" variant="light" disabled={savingId === user.id} onClick={() => void decide(user, "rejected")}>Reject</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {users.length === 0 && <Table.Tr><Table.Td colSpan={5}>No pending user approvals.</Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
