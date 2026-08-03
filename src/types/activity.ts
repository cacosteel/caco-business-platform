export type ActivityType = string;

export interface Activity {
  id: string;
  company_id: string;
  contact_id: string | null;
  activity_type: ActivityType;
  occurred_at: string;
  context: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ActivityInput = Pick<
  Activity,
  "company_id" | "contact_id" | "activity_type" | "occurred_at" | "context"
>;
