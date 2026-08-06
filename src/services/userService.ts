import { supabase } from "../lib/supabase";
import type { ApprovalStatus, Profile, UserRole } from "../types/profile";

export type PendingUser = Profile & {
  companies?: { name: string } | null;
};

export type ManagedUser = Profile & {
  companies?: { name: string } | null;
};

export async function getPendingUsers(): Promise<PendingUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies!profiles_company_id_fkey(name)")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as PendingUser[];
}

export async function getUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies!profiles_company_id_fkey(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as ManagedUser[];
}

export async function updateUserAccess(
  userId: string,
  companyId: string | null,
  role: UserRole,
  status: ApprovalStatus,
): Promise<void> {
  const { error } = await supabase.rpc("update_user_access", {
    target_user_id: userId,
    target_company_id: companyId,
    target_role: role,
    target_status: status,
  });

  if (error) throw error;
}

export async function decideUserAccess(
  userId: string,
  decision: "approved" | "rejected",
  role?: UserRole,
): Promise<void> {
  const updates =
    decision === "approved"
      ? {
          approval_status: decision,
          role: role ?? "member",
        }
      : {
          approval_status: decision,
        };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}