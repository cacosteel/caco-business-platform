import { supabase } from "../../lib/supabase";

export async function getOrderWorkspace(id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      quotations(
        *,
        inquiries(
          *,
          companies(*)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}