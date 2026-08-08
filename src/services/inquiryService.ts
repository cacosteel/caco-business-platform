import { supabase } from "../lib/supabase";


export async function getInquiries() {

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false,
      }
    );


  if (error) {

    console.error(
      "Get inquiries error:",
      error
    );

    throw error;

  }


  return data || [];

}



export async function getInquiryById(
  id: string
) {

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq(
      "id",
      id
    )
    .single();


  if (error) {

    console.error(
      "Get inquiry by id error:",
      error
    );

    throw error;

  }


  return data;

}



export async function createInquiry(
  inquiry: any
) {

  const { data, error } = await supabase
    .from("inquiries")
    .insert(inquiry)
    .select()
    .single();


  if (error) {

    console.error(
      "Create inquiry error:",
      error
    );

    throw error;

  }


  return data;

}



export async function updateInquiry(
  id: string,
  updates: any
) {

  const { data, error } = await supabase
    .from("inquiries")
    .update(updates)
    .eq(
      "id",
      id
    )
    .select()
    .single();


  if (error) {

    console.error(
      "Update inquiry error:",
      error
    );

    throw error;

  }


  return data;

}



export async function deleteInquiry(
  id: string
) {

  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq(
      "id",
      id
    );


  if (error) {

    console.error(
      "Delete inquiry error:",
      error
    );

    throw error;

  }


  return true;

}