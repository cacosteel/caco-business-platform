export type quotation = {
  id: string;
  inquiry_id: string;
  quotation_no: string;
  quotation_date: string;
  valid_until: string;
  currency: string;
  total_amount: number;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};