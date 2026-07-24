import { supabase } from "../lib/supabase";
import type { company } from "../types/company";

export async function getCompanies(): Promise<company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []) as company[];
}

export async function createCompany(
  newCompany: Omit<company, "id" | "created_at" | "updated_at">
) {
  const { error } = await supabase
    .from("companies")
    .insert(newCompany);

  if (error) throw error;
}

export async function updateCompany(
  id: string,
  company: Partial<company>
) {
  const { error } = await supabase
    .from("companies")
    .update(company)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id);

  if (error) throw error;
}