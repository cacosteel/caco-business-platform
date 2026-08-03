import { supabase } from "../lib/supabase";

export interface PlatformSettings {
  id: boolean;
  organisation_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  website: string | null;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.from("platform_settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data as PlatformSettings;
}

export async function updatePlatformSettings(settings: Omit<PlatformSettings, "id">): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in.");

  const { error } = await supabase.from("platform_settings").update({ ...settings, updated_by: userData.user.id, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) throw error;
}
