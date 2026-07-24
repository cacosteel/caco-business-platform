import { supabase } from "../lib/supabase";
import type { CompanyContact } from "../types/CompanyContact";

export async function getCompanyContacts(
  companyId: string
): Promise<CompanyContact[]> {
  const { data, error } = await supabase
    .from("company_contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("first_name");

  if (error) throw error;

  return (data ?? []) as CompanyContact[];
}

export async function createCompanyContact(
  contact: Partial<CompanyContact>
): Promise<void> {
  const { error } = await supabase
    .from("company_contacts")
    .insert([contact]);

  if (error) throw error;
}

export async function updateCompanyContact(
  id: string,
  contact: Partial<CompanyContact>
): Promise<void> {
  const { error } = await supabase
    .from("company_contacts")
    .update(contact)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCompanyContact(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("company_contacts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}