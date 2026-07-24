export interface CompanyContact {
  id: string;

  company_id: string;

  first_name: string;
  last_name: string | null;

  position: string | null;

  email: string | null;
  phone: string | null;
  mobile: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
}