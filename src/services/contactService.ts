import { supabase } from "../lib/supabase";
import type { contact } from "../types/contact";

export async function getContacts(): Promise<contact[]> {
  const { data, error } = await supabase
    .from("company_contacts")
    .select("*")
    .order("first_name");

  if (error) throw error;

  return (data ?? []) as contact[];
}

export async function createContact(
  newContact: Omit<contact, "id" | "created_at" | "updated_at">
) {
  const { error } = await supabase
    .from("company_contacts")
    .insert(newContact);

  if (error) throw error;
}

export async function updateContact(
  id: string,
  contact: Partial<contact>
) {
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