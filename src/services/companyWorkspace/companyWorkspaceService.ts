import { supabase } from "../../lib/supabase";

export async function getCompanyWorkspace(id: string) {
  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      company_contacts(*),
      inquiries(
        *,
        quotations(*),
        orders(*)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}