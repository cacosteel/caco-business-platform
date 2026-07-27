import { supabase } from "../lib/supabase";
import type { quotation } from "../types/quotation";

export async function getQuotations(): Promise<quotation[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .order("quotation_date", { ascending: false });

  if (error) throw error;

  return (data ?? []) as quotation[];
}

export async function createQuotation(
  newQuotation: Omit<quotation, "id" | "created_at" | "updated_at">
) {
  const { error } = await supabase
    .from("quotations")
    .insert(newQuotation);

  if (error) throw error;
}

export async function updateQuotation(
  id: string,
  quotation: Partial<quotation>
) {
  const { error } = await supabase
    .from("quotations")
    .update(quotation)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteQuotation(id: string) {
  const { error } = await supabase
    .from("quotations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}