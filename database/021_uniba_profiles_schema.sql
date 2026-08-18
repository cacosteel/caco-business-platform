-- UNIBA Connect: profile records required by the authenticated application.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  first_name text,
  last_name text,
  company_id uuid,
  contact_id uuid,
  role text not null default 'member' check (role in ('admin', 'member')),
  requested_role text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  private_notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());
