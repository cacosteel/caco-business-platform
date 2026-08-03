import { supabase } from "../lib/supabase";

export interface ActivityTypeOption {
  code: string;
  name: string;
  is_active: boolean;
}

export async function getActivityTypes(): Promise<ActivityTypeOption[]> {
  const { data, error } = await supabase.from("activity_types").select("code, name, is_active").eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []) as ActivityTypeOption[];
}

export async function getAllActivityTypes(): Promise<ActivityTypeOption[]> {
  const { data, error } = await supabase.from("activity_types").select("code, name, is_active").order("name");
  if (error) throw error;
  return (data ?? []) as ActivityTypeOption[];
}

function makeCode(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function createActivityType(name: string): Promise<void> {
  const cleanName = name.trim();
  const code = makeCode(cleanName);
  if (!code) throw new Error("Enter a valid activity type name.");
  const { error } = await supabase.from("activity_types").insert({ code, name: cleanName });
  if (error) throw error;
}

export async function renameActivityType(code: string, name: string): Promise<void> {
  const { error } = await supabase.from("activity_types").update({ name: name.trim() }).eq("code", code);
  if (error) throw error;
}

export async function setActivityTypeActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("activity_types").update({ is_active: isActive }).eq("code", code);
  if (error) throw error;
}
