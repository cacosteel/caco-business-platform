import { supabase } from "../../lib/supabase";

export async function getInquiryWorkspace(id: string) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(`
      *,
      companies(*),
      inquiry_items(*),
      quotations(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}