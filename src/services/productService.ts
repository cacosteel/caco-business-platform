import { supabase } from "../lib/supabase";
import type { product } from "../types/product";

export async function getProducts(): Promise<product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []) as product[];
}

export async function createProduct(
  newProduct: Partial<Omit<product, "id" | "created_at" | "updated_at">>
) {
  const { error } = await supabase
    .from("products")
    .insert(newProduct);

  if (error) throw error;
}

export async function updateProduct(
  id: string,
  product: Partial<product>
) {
  const { error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
