import { supabase } from "../lib/supabase";
import type { order } from "../types/order";

export async function getOrders(): Promise<order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false });

  if (error) throw error;

  return (data ?? []) as order[];
}

export async function createOrder(
  newOrder: Omit<order, "id" | "created_at" | "updated_at">
) {
  const { error } = await supabase
    .from("orders")
    .insert(newOrder);

  if (error) throw error;
}

export async function updateOrder(
  id: string,
  order: Partial<order>
) {
  const { error } = await supabase
    .from("orders")
    .update(order)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) throw error;
}