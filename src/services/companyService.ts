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