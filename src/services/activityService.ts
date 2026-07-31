import { supabase } from "../lib/supabase";
import type { Activity, ActivityInput } from "../types/activity";

export async function getCompanyActivities(companyId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function createActivity(input: ActivityInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in to record an activity.");

  const { error } = await supabase.from("activities").insert({
    ...input,
    created_by: userData.user.id,
  });

  if (error) throw error;
}
