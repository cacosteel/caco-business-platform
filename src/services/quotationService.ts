import { supabase } from "../lib/supabase";


export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Approved"
  | "Rejected"
  | "Expired";



export interface Quotation {

  id?: string;

  inquiry_id: string;

  quotation_no?: string;

  quotation_date?: string;

  valid_until?: string;

  status?: QuotationStatus;

  currency?: string;

  total_amount?: number;

  subtotal?: number;

  discount?: number;

  freight?: number;

  total?: number;

  notes?: string;

  payment_terms?: string;

  delivery_terms?: string;

  company_id?: string;

  contact_id?: string;

  created_at?: string;

  updated_at?: string;

}





export async function convertQuotationToOrder(
  quotationId: string
) {

  const {
    data: quotation,
    error,
  } =
    await supabase
      .from("quotations")
      .select("*")
      .eq(
        "id",
        quotationId
      )
      .single();



  if (error) {

    throw error;

  }



  const {
    data: order,
    error: orderError,
  } =
    await supabase
      .from("orders")
      .insert([
        {

          quotation_id:
            quotation.id,

          order_no:
            `ORD-${Date.now()}`,

          status:
            "draft",

          currency:
            quotation.currency,

          total_amount:
            quotation.total_amount,

          notes:
            quotation.notes,

        },
      ])
      .select()
      .single();



  if (orderError) {

    throw orderError;

  }



  return order;

}





export async function getQuotations() {

  const {
    data,
    error,
  } =
    await supabase
      .from("quotations")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );



  if (error) {

    console.error(
      "Get quotations error:",
      error
    );

    throw error;

  }



  return data || [];

}





export async function getQuotationById(
  id: string
) {

  const {
    data,
    error,
  } =
    await supabase
      .from("quotations")
      .select("*")
      .eq(
        "id",
        id
      )
      .single();



  if (error) {

    throw error;

  }



  return data;

}





export async function createQuotation(
  quotation: Quotation
) {


  const today =
    new Date();


  const validUntil =
    new Date();


  validUntil.setDate(
    validUntil.getDate() + 30
  );



  const {
    data,
    error,
  } =
    await supabase
      .from("quotations")
      .insert([
        {

          inquiry_id:
            quotation.inquiry_id,


          quotation_no:
            quotation.quotation_no ??
            `QT-${Date.now()}`,


          quotation_date:
            quotation.quotation_date ??
            today
              .toISOString()
              .split("T")[0],


          valid_until:
            quotation.valid_until ??
            validUntil
              .toISOString()
              .split("T")[0],


          status:
            quotation.status ??
            "Draft",


          currency:
            quotation.currency ??
            "USD",


          subtotal:
            quotation.subtotal ??
            quotation.total_amount ??
            0,


          discount:
            quotation.discount ??
            0,


          freight:
            quotation.freight ??
            0,


          total_amount:
            quotation.total_amount ??
            quotation.total ??
            0,


          total:
            quotation.total ??
            quotation.total_amount ??
            0,


          notes:
            quotation.notes ??
            "",


          payment_terms:
            quotation.payment_terms ??
            null,


          delivery_terms:
            quotation.delivery_terms ??
            null,


          company_id:
            quotation.company_id ??
            null,


          contact_id:
            quotation.contact_id ??
            null,

        },
      ])
      .select()
      .single();



  if (error) {

    console.error(
      "Create quotation error:",
      error
    );

    throw error;

  }



  return data;

}





export async function updateQuotation(
  id: string,
  quotation: Partial<Quotation>
) {


  const {
    data,
    error,
  } =
    await supabase
      .from("quotations")
      .update({

        ...quotation,

        updated_at:
          new Date()
            .toISOString(),

      })
      .eq(
        "id",
        id
      )
      .select()
      .single();



  if (error) {

    throw error;

  }



  return data;

}





export async function deleteQuotation(
  id: string
) {


  const {
    error,
  } =
    await supabase
      .from("quotations")
      .delete()
      .eq(
        "id",
        id
      );



  if (error) {

    throw error;

  }



  return true;

}