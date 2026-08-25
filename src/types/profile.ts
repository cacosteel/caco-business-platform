export type UserRole =
  | "admin"
  | "member";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  time_zone: string | null;
  company_id: string | null;
  contact_id: string | null;
  role: UserRole;
  requested_role: string | null;
  approval_status: ApprovalStatus;
  private_notes: string | null;
  created_at: string;
}
