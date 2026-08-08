export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string | null;
  position: string | null;
  email: string;
  phone: string;
  country: string;
  mobile: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  companies?: {
    name: string;
  } | null;
}

export type ContactInput = Omit<Contact, "id" | "created_at" | "updated_at" | "companies">;

// Temporary compatibility alias while older screens are migrated.
export type contact = Contact;
