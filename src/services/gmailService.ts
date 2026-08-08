import { supabase } from "../lib/supabase";
export interface GmailStatus { connected: boolean; sender_email: string; connected_at: string; }
export async function getGmailStatus(): Promise<GmailStatus | null> { const { data, error } = await supabase.rpc("gmail_connection_status"); if (error) throw error; return data?.[0] ?? null; }
export async function startGmailConnection(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Your session has expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("gmail-oauth-start", {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? "Gmail connection could not be started.");
  return data.url;
}
