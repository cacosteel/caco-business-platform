import { supabase } from "../lib/supabase";

export interface Invitation { id: string; email: string; role: "admin" | "member"; status: "invited" | "accepted"; created_at: string; accepted_at?: string | null; company_name?: string | null; companies?: { name: string } | null; }

export async function inviteUser(email: string, companyId: string, role: "admin" | "member"): Promise<void> {
  const { data, error } = await supabase.functions.invoke("invite-user", { body: { email, companyId, role } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_platform_invitations");
  if (!rpcError) return (rpcData ?? []) as Invitation[];

  // Keep the history usable while the accompanying database migration is
  // being installed, then prefer the protected RPC once it is available.
  const { data, error } = await supabase.from("platform_invitations").select("id, email, role, status, created_at, accepted_at, companies(name)").order("created_at", { ascending: false });
  if (error) throw rpcError;
  return (data ?? []) as unknown as Invitation[];
}

export async function establishInvitationSession(): Promise<void> {
  const currentUrl = new URL(window.location.href);
  const queryError = currentUrl.searchParams.get("error_description");
  const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
  const hashError = hashParams.get("error_description");
  if (queryError || hashError) throw new Error(queryError || hashError || "The invitation link could not be verified.");

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    if (data.session?.user.user_metadata?.invited_by_admin !== true) {
      throw new Error("This link is not a UNIBA Connect invitation.");
    }
    window.history.replaceState({}, document.title, currentUrl.pathname);
    return;
  }

  const { data: existing, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (existing.session?.user.user_metadata?.invited_by_admin === true) return;

  const code = currentUrl.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (data.session?.user.user_metadata?.invited_by_admin === true) {
      window.history.replaceState({}, document.title, currentUrl.pathname);
      return;
    }
  }

  if (existing.session) {
    throw new Error("A different account is currently signed in. Open the invitation in a private browser window or sign out first.");
  }

  throw new Error("This invitation link is invalid or has expired. Please ask the administrator to send a new invitation.");
}

export async function acceptInvitation(firstName: string, lastName: string, password: string): Promise<void> {
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) throw passwordError;
  const { error } = await supabase.rpc("accept_platform_invitation", { first_name_value: firstName, last_name_value: lastName });
  if (error) throw error;
}
