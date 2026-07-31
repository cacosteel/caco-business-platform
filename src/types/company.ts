export interface Company {
  id: string;
  name: string;
  short_name: string | null;
  company_type: string | null;
  company_type_id: string | null;
  country: string;
  city: string;
  address: string | null;
  formal_address: string | null;
  registration_number: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  tax_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyInput = Omit<Company, "id" | "created_at" | "updated_at" | "is_active">;

// Temporary compatibility alias while older screens are migrated.
export type company = Company;
