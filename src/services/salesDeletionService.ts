import { supabase } from "../lib/supabase";

export type SalesDeletableEntity = "inquiry" | "quotation";

export async function requestSalesDeletion(
  entityType: SalesDeletableEntity,
  entityId: string,
  reason: string,
): Promise<void> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error("A deletion reason is required.");

  const { error } = await supabase.rpc("request_sales_deletion", {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_reason: trimmedReason,
  });
  if (error) throw error;
}
