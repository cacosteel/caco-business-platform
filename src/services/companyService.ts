import { supabase } from "../lib/supabase";
import type { company } from "../types/company";

export interface CompanyTypeOption { id: string; name: string; is_active: boolean; }

export async function getCompanyTypes(): Promise<CompanyTypeOption[]> {
  const { data, error } = await supabase.from("company_types").select("id, name, is_active").eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []) as CompanyTypeOption[];
}

export async function getAllCompanyTypes(): Promise<CompanyTypeOption[]> {
  const { data, error } = await supabase.from("company_types").select("id, name, is_active").order("name");
  if (error) throw error;
  return (data ?? []) as CompanyTypeOption[];
}

export async function createCompanyType(name: string): Promise<void> {
  const { error } = await supabase.from("company_types").insert({ name: name.trim() });
  if (error) throw error;
}

export async function setCompanyTypeActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("company_types").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function getCompanies(): Promise<company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []) as company[];
}

export async function createCompany(
  newCompany: Partial<Omit<company, "id" | "created_at" | "updated_at">>
) {
  const { error } = await supabase
    .from("companies")
    .insert(newCompany);

  if (error) throw error;
}

export async function updateCompany(
  id: string,
  company: Partial<company>
) {
  const { error } = await supabase
    .from("companies")
    .update(company)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getCompany(id: string): Promise<company> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
  if (error) throw error;
  return data as company;
}
