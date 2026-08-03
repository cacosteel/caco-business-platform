import { supabase } from "../lib/supabase";

const bucket = "public-resources";

export interface PublicResource {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  is_published: boolean;
  uploaded_by: string;
  created_at: string;
}

function resourcePath(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `resources/${crypto.randomUUID()}-${safeName}`;
}

export function getPublicResourceUrl(filePath: string) {
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

export async function getPublicResources(): Promise<PublicResource[]> {
  const { data, error } = await supabase.from("public_resources").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicResource[];
}

export async function uploadPublicResource(title: string, file: File): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in to upload a resource.");

  const filePath = resourcePath(file);
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw uploadError;

  const { error: recordError } = await supabase.from("public_resources").insert({
    title: title.trim(), file_name: file.name, file_path: filePath, file_size: file.size,
    mime_type: file.type || null, uploaded_by: userData.user.id,
  });

  if (recordError) {
    await supabase.storage.from(bucket).remove([filePath]);
    throw recordError;
  }
}

export async function setPublicResourcePublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from("public_resources").update({ is_published: isPublished }).eq("id", id);
  if (error) throw error;
}
