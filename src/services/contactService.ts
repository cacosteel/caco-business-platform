import { supabase } from "../lib/supabase";
import type { contact } from "../types/contact";

function requireCompany(companyId: string | undefined) {
  if (!companyId?.trim()) {
    throw new Error("A contact must be assigned to a company.");
  }
}

export async function getContacts(): Promise<contact[]> {
  const { data, error } = await supabase
    .from("company_contacts")
    .select("*, companies(name)")
    .order("first_name");

  if (error) throw error;

  return (data ?? []) as contact[];
}

export async function createContact(
  newContact: Omit<contact, "id" | "created_at" | "updated_at">
) {
  requireCompany(newContact.company_id);

  const { error } = await supabase
    .from("company_contacts")
    .insert(newContact);

  if (error) throw error;
}

export async function updateContact(
  id: string,
  contact: Partial<contact>
) {
  if ("company_id" in contact) {
    requireCompany(contact.company_id);
  }

  const { error } = await supabase
    .from("company_contacts")
    .update(contact)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteContact(id: string) {
  const { error } = await supabase
    .from("company_contacts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getCompanyContacts(companyId: string): Promise<contact[]> {
  const { data, error } = await supabase
    .from("company_contacts")
    .select("*, companies(name)")
    .eq("company_id", companyId)
    .order("first_name");

  if (error) throw error;
  return (data ?? []) as contact[];
}
