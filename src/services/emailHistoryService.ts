import { supabase } from "../lib/supabase";

export interface SentEmail {
  id: string;
  recipient_email: string;
  subject: string;
  sent_at: string;
  company_id: string;
  contact_id: string;
  company_contacts?: { first_name: string; last_name: string | null } | null;
  companies?: { name: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

export async function getSentEmails(): Promise<SentEmail[]> {
  const { data, error } = await supabase
    .from("email_messages")
    .select("id, recipient_email, subject, sent_at, company_id, contact_id, company_contacts(first_name, last_name), companies(name), profiles!email_messages_sent_by_fkey(full_name, email)")
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SentEmail[];
}
