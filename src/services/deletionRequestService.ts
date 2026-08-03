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

export interface DeletionRequest {
  id: string;
  entity_type: DeletableEntity;
  entity_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
}

export async function getPendingDeletionRequests(): Promise<DeletionRequest[]> {
  const { data, error } = await supabase.from("deletion_requests").select("*").eq("status", "pending").order("requested_at");
  if (error) throw error;
  return (data ?? []) as DeletionRequest[];
}

export async function reviewDeletionRequest(id: string, decision: "approved" | "rejected"): Promise<void> {
  const { error } = await supabase.rpc("review_deletion_request", { request_id: id, decision });
  if (error) throw error;
}
