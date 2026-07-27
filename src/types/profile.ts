export type UserRole =
  | "admin"
  | "manager"
  | "sales"
  | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}