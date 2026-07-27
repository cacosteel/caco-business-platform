import { supabase } from "../lib/supabase";
import type { document } from "../types/document";

export async function getDocuments(): Promise<document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as document[];
}

export async function createDocument(
  newDocument: Omit<document, "id">
) {
  const { error } = await supabase
    .from("documents")
    .insert(newDocument);

  if (error) throw error;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}