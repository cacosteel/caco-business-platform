import { supabase } from "../../lib/supabase";

export async function getDashboardStats() {
  const [
    companies,
    inquiries,
    quotations,
    orders,
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("inquiries").select("*", { count: "exact", head: true }),
    supabase.from("quotations").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
  ]);

  return {
    companies: companies.count ?? 0,
    inquiries: inquiries.count ?? 0,
    quotations: quotations.count ?? 0,
    orders: orders.count ?? 0,
  };
}