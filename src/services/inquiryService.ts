import { supabase } from "../lib/supabase";
import type { inquiry } from "../types/inquiry";

export async function getInquiries(): Promise<inquiry[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("inquiry_date", { ascending: false });

  if (error) throw error;

  return (data ?? []) as inquiry[];
}

export async function createInquiry(
  newInquiry: Omit<inquiry, "id" | "created_at" | "updated_at">
) {
  const { error } = await supabase
    .from("inquiries")
    .insert(newInquiry);

  if (error) throw error;
}

export async function updateInquiry(
  id: string,
  inquiry: Partial<inquiry>
) {
  const { error } = await supabase
    .from("inquiries")
    .update(inquiry)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteInquiry(id: string) {
  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}