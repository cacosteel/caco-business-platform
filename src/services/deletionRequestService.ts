import { supabase } from "../lib/supabase";

export type DeletableEntity = "company" | "contact" | "activity";

export async function requestDeletion(entityType: DeletableEntity, entityId: string, reason: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in to request deletion.");
  if (!reason.trim()) throw new Error("A deletion reason is required.");

  const { error } = await supabase.from("deletion_requests").insert({
    entity_type: entityType,
    entity_id: entityId,
    reason: reason.trim(),
    requested_by: userData.user.id,
  });

  if (error) throw error;
}
