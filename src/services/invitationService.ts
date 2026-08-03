import { supabase } from "../lib/supabase";

export interface Invitation { id: string; email: string; role: "admin" | "member"; status: "invited" | "accepted"; created_at: string; companies?: { name: string } | null; }

export async function inviteUser(email: string, companyId: string, role: "admin" | "member"): Promise<void> {
  const { data, error } = await supabase.functions.invoke("invite-user", { body: { email, companyId, role } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.from("platform_invitations").select("id, email, role, status, created_at, companies(name)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Invitation[];
}

export async function acceptInvitation(firstName: string, lastName: string, password: string): Promise<void> {
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) throw passwordError;
  const { error } = await supabase.rpc("accept_platform_invitation", { first_name_value: firstName, last_name_value: lastName });
  if (error) throw error;
}
