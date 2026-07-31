import { supabase } from "../lib/supabase";
import type { Profile, UserRole } from "../types/profile";

export type PendingUser = Profile & {
  companies?: { name: string } | null;
};

export async function getPendingUsers(): Promise<PendingUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies(name)")
    .eq("approval_status", "pending")
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as PendingUser[];
}

export async function decideUserAccess(
  userId: string,
  decision: "approved" | "rejected",
  role?: UserRole,
) {
  const updates = decision === "approved"
    ? { approval_status: decision, role }
    : { approval_status: decision };

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}
