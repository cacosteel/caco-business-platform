import { supabase } from "../lib/supabase";
import type { company } from "../types/company";

export async function getCompanies(): Promise<company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as company[];
}