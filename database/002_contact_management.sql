-- Module 1: contact management and organization-based access.
-- Run this migration in the Supabase SQL editor after user_approval_setup.sql.
-- It is additive and keeps the existing companies, contacts, and profiles.

begin;

-- This migration can be run independently of the earlier approval setup.
create schema if not exists private;

create table if not exists public.company_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_types_name_unique
  on public.company_types (lower(name));

insert into public.company_types (name)
values
  ('Supplier'), ('Importer'), ('Exporter'), ('Trader'), ('Partner'),
  ('Media Company'), ('Embassy'), ('Consulate'), ('Government Office'),
  ('Inspection Company'), ('Shipping Company'), ('Transport Company'), ('Advocate')
on conflict do nothing;

alter table public.companies add column if not exists short_name text;
alter table public.companies add column if not exists formal_address text;
alter table public.companies add column if not exists registration_number text;
alter table public.companies add column if not exists company_type_id uuid references public.company_types(id);
alter table public.companies add column if not exists deleted_at timestamptz;
alter table public.companies add column if not exists deleted_by uuid references public.profiles(id);

-- Older installations may have only the basic profile columns.
alter table public.profiles add column if not exists company_id uuid references public.companies(id);

update public.companies c
set company_type_id = ct.id
from public.company_types ct
where c.company_type_id is null
  and lower(ct.name) = lower(c.company_type);

create unique index if not exists companies_registration_number_unique
  on public.companies (registration_number)
  where registration_number is not null and registration_number <> '';

alter table public.company_contacts add column if not exists country text;
alter table public.company_contacts add column if not exists deleted_at timestamptz;
alter table public.company_contacts add column if not exists deleted_by uuid references public.profiles(id);

-- Existing contacts inherit their company's country; new contacts must provide one.
update public.company_contacts cc
set country = c.country
from public.companies c
where cc.company_id = c.id and cc.country is null;

create unique index if not exists company_contacts_email_unique
  on public.company_contacts (lower(email))
  where email is not null and email <> '';

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  contact_id uuid references public.company_contacts(id),
  activity_type text not null check (activity_type in (
    'phone_call', 'email', 'meeting', 'message', 'follow_up', 'note'
  )),
  occurred_at timestamptz not null default now(),
  context text not null check (length(trim(context)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  constraint activities_contact_belongs_to_company check (contact_id is null or company_id is not null)
);

create index if not exists activities_company_occurred_at_idx
  on public.activities (company_id, occurred_at desc)
  where deleted_at is null;

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company', 'contact', 'activity')),
  entity_id uuid not null,
  reason text not null check (length(trim(reason)) > 0),
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  unique (entity_type, entity_id, status)
);

alter table public.profiles add column if not exists contact_id uuid references public.company_contacts(id);
alter table public.profiles add column if not exists private_notes text;

-- Version 1 has only Admin and Member. Existing non-admin roles remain usable as Members.
update public.profiles
set role = 'member'
where role is distinct from 'admin';

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check check (role in ('admin', 'member'));

-- Access helpers: partner-company users share the CRM; other members are scoped to their company.
create or replace function private.current_profile_company_id()
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function private.has_shared_crm_access()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.companies c on c.id = p.company_id
    join public.company_types ct on ct.id = c.company_type_id
    where p.id = auth.uid() and lower(ct.name) = 'partner'
  )
$$;

create or replace function private.can_access_company(target_company_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select private.is_admin()
      or private.has_shared_crm_access()
      or target_company_id = private.current_profile_company_id()
$$;

revoke all on function private.current_profile_company_id() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.has_shared_crm_access() from public;
revoke all on function private.can_access_company(uuid) from public;

alter table public.company_types enable row level security;
alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.activities enable row level security;
alter table public.deletion_requests enable row level security;

drop policy if exists company_types_read on public.company_types;
create policy company_types_read on public.company_types for select to authenticated using (true);
drop policy if exists company_types_admin_write on public.company_types;
create policy company_types_admin_write on public.company_types for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists companies_read_by_scope on public.companies;
create policy companies_read_by_scope on public.companies for select to authenticated
  using (deleted_at is null and private.can_access_company(id));
drop policy if exists companies_insert_by_partner_or_admin on public.companies;
create policy companies_insert_by_partner_or_admin on public.companies for insert to authenticated
  with check (private.is_admin() or private.has_shared_crm_access());
drop policy if exists companies_update_by_scope on public.companies;
create policy companies_update_by_scope on public.companies for update to authenticated
  using (private.can_access_company(id)) with check (private.can_access_company(id));

drop policy if exists contacts_read_by_scope on public.company_contacts;
create policy contacts_read_by_scope on public.company_contacts for select to authenticated
  using (deleted_at is null and private.can_access_company(company_id));
drop policy if exists contacts_write_by_scope on public.company_contacts;
create policy contacts_write_by_scope on public.company_contacts for all to authenticated
  using (private.can_access_company(company_id)) with check (private.can_access_company(company_id));

drop policy if exists activities_read_by_scope on public.activities;
create policy activities_read_by_scope on public.activities for select to authenticated
  using (deleted_at is null and private.can_access_company(company_id));
drop policy if exists activities_insert_by_scope on public.activities;
create policy activities_insert_by_scope on public.activities for insert to authenticated
  with check (private.can_access_company(company_id) and created_by = auth.uid());
drop policy if exists activities_update_by_scope on public.activities;
create policy activities_update_by_scope on public.activities for update to authenticated
  using (private.can_access_company(company_id)) with check (private.can_access_company(company_id));

drop policy if exists deletion_requests_read_by_scope on public.deletion_requests;
create policy deletion_requests_read_by_scope on public.deletion_requests for select to authenticated
  using (requested_by = auth.uid() or private.is_admin());
drop policy if exists deletion_requests_insert_by_user on public.deletion_requests;
create policy deletion_requests_insert_by_user on public.deletion_requests for insert to authenticated
  with check (requested_by = auth.uid());
drop policy if exists deletion_requests_admin_review on public.deletion_requests;
create policy deletion_requests_admin_review on public.deletion_requests for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

commit;
