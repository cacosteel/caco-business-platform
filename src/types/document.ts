export interface document {
  id: string;
  company_id: string;
  inquiry_id: string | null;
  quotation_id: string | null;
  order_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}