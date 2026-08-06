import {
  Button,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCompanies } from "../../services/companyService";
import {
  getUsers,
  updateUserAccess,
  type ManagedUser,
} from "../../services/userService";
import type { ApprovalStatus, UserRole } from "../../types/profile";

type CompanyOption = {
  value: string;
  label: string;
};

type AppError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadUsers(): Promise<void> {
    setLoading(true);

    try {
      const [userData, companyData] = await Promise.all([
        getUsers(),
        getCompanies(),
      ]);

      setUsers(userData);

      setCompanies(
        companyData.map((company) => ({
          value: company.id,
          label: company.name,
        })),
      );
    } catch (error) {
      const err = error as AppError;

      console.error("User Access load error:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
      });

      toast.error(err.message ?? "Users could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function save(
    user: ManagedUser,
    companyId: string | null,
    role: UserRole,
    status: ApprovalStatus,
  ): Promise<void> {
    setSavingId(user.id);

    try {
      await updateUserAccess(user.id, companyId, role, status);
      toast.success("User access updated.");
      await loadUsers();
    } catch (error) {
      const err = error as AppError;

      console.error("User Access save error:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
      });

      toast.error(err.message ?? "The access decision could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  function updateDraft(
    id: string,
    updates: Partial<
      Pick<ManagedUser, "company_id" | "role" | "approval_status">
    >,
  ): void {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              ...updates,
            }
          : user,
      ),
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={1}>User Access</Title>

        <Text c="dimmed">
          Assign a company and role before approving access. Members can only
          see records for their assigned company.
        </Text>
      </div>

      {loading ? (
        <Text>Loading users...</Text>
      ) : (
        <Paper withBorder p="md">
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Company</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    {[user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(" ") || user.full_name || "Unnamed user"}
                  </Table.Td>

                  <Table.Td>{user.email}</Table.Td>

                  <Table.Td>
                    <Select
                      data={companies}
                      value={user.company_id}
                      placeholder="Select company"
                      clearable
                      searchable
                      onChange={(value) =>
                        updateDraft(user.id, {
                          company_id: value,
                        })
                      }
                    />
                  </Table.Td>

                  <Table.Td>
                    <Select
                      data={[
                        {
                          value: "member",
                          label: "Member",
                        },
                        {
                          value: "admin",
                          label: "Admin",
                        },
                      ]}
                      value={user.role}
                      allowDeselect={false}
                      onChange={(value) =>
                        updateDraft(user.id, {
                          role: (value as UserRole) ?? "member",
                        })
                      }
                    />
                  </Table.Td>

                  <Table.Td>
                    <Select
                      data={[
                        {
                          value: "pending",
                          label: "Pending",
                        },
                        {
                          value: "approved",
                          label: "Approved",
                        },
                        {
                          value: "rejected",
                          label: "Rejected",
                        },
                      ]}
                      value={user.approval_status}
                      allowDeselect={false}
                      onChange={(value) =>
                        updateDraft(user.id, {
                          approval_status:
                            (value as ApprovalStatus) ?? "pending",
                        })
                      }
                    />
                  </Table.Td>

                  <Table.Td>
                    <Button
                      size="xs"
                      loading={savingId === user.id}
                      disabled={savingId !== null && savingId !== user.id}
                      onClick={() =>
                        void save(
                          user,
                          user.company_id,
                          user.role,
                          user.approval_status,
                        )
                      }
                    >
                      Save
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}

              {users.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed">
                      No users found.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}