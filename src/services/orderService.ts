import { supabase } from "../lib/supabase";


export async function getOrders() {

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false,
      }
    );


  if (error) {

    console.error(
      "Get orders error:",
      error
    );

    throw error;

  }


  return data || [];

}





export async function getOrderById(
  id: string
) {

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .select("*")
    .eq(
      "id",
      id
    )
    .single();


  if (error) {

    console.error(
      "Get order by id error:",
      error
    );

    throw error;

  }


  return data;

}





export async function createOrder(
  order: any
) {

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .insert([
      order,
    ])
    .select()
    .single();


  if (error) {

    console.error(
      "Create order error:",
      error
    );

    throw error;

  }


  return data;

}





export async function updateOrder(
  id: string,
  updates: any
) {

  const {
    data,
    error,
  } = await supabase
    .from("orders")
    .update(updates)
    .eq(
      "id",
      id
    )
    .select()
    .single();


  if (error) {

    console.error(
      "Update order error:",
      error
    );

    throw error;

  }


  return data;

}





export async function deleteOrder(
  id: string
) {

  const {
    error,
  } = await supabase
    .from("orders")
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {

    console.error(
      "Delete order error:",
      error
    );

    throw error;

  }


  return true;

}