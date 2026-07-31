import { supabase } from "../../lib/supabase";

export async function getOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function createOrderItem(item: any) {
  const { data, error } = await supabase
    .from("order_items")
    .insert(item)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateOrderItem(
  id: string,
  item: any
) {
  const { data, error } = await supabase
    .from("order_items")
    .update(item)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteOrderItem(
  id: string
) {
  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}