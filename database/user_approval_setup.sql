-- Run this script in the Supabase SQL Editor before deploying the registration UI.
-- It preserves existing users by marking them approved, while all newly registered
-- users start as pending and require an approved admin's decision.

begin;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists company_id uuid references public.companies(id),
  add column if not exists requested_role text,
  add column if not exists approval_status text not null default 'approved';

update public.profiles
set approval_status = 'approved'
where approval_status is null;

alter table public.profiles
  drop constraint if exists profiles_approval_status_check,
  add constraint profiles_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  drop constraint if exists profiles_requested_role_check,
  add constraint profiles_requested_role_check
    check (requested_role is null or requested_role in ('manager', 'sales', 'viewer'));

create schema if not exists private;

create or replace function private.is_approved_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and approval_status = 'approved'
  );
$$;

revoke all on function private.is_approved_admin() from public;

create or replace function private.create_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_role_value text := new.raw_user_meta_data ->> 'requested_role';
  first_name_value text := trim(coalesce(new.raw_user_meta_data ->> 'first_name', ''));
  last_name_value text := trim(coalesce(new.raw_user_meta_data ->> 'last_name', ''));
  company_id_value uuid := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;
begin
  if first_name_value = '' or last_name_value = '' or company_id_value is null then
    raise exception 'First name, last name, and company are required for registration';
  end if;

  if requested_role_value not in ('manager', 'sales', 'viewer') then
    raise exception 'A valid membership role is required for registration';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    company_id,
    role,
    requested_role,
    approval_status
  ) values (
    new.id,
    new.email,
    concat_ws(' ', first_name_value, last_name_value),
    first_name_value,
    last_name_value,
    company_id_value,
    'viewer',
    requested_role_value,
    'pending'
  ) on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_pending_profile() from public;

drop trigger if exists caco_create_pending_profile on auth.users;
create trigger caco_create_pending_profile
  after insert on auth.users
  for each row execute function private.create_pending_profile();

create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_profile_email() from public;

drop trigger if exists caco_sync_profile_email on auth.users;
create trigger caco_sync_profile_email
  after update of email on auth.users
  for each row execute function private.sync_profile_email();

create or replace function private.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user in ('postgres', 'supabase_auth_admin', 'service_role')
     or private.is_approved_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.company_id is distinct from old.company_id
     or new.role is distinct from old.role
     or new.requested_role is distinct from old.requested_role
     or new.approval_status is distinct from old.approval_status then
    raise exception 'Users may only update their own name';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_update() from public;

drop trigger if exists caco_protect_profile_update on public.profiles;
create trigger caco_protect_profile_update
  before update on public.profiles
  for each row execute function private.protect_profile_update();

alter table public.profiles enable row level security;

drop policy if exists caco_users_read_own_profile on public.profiles;
create policy caco_users_read_own_profile
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists caco_admins_read_profiles on public.profiles;
create policy caco_admins_read_profiles
  on public.profiles for select to authenticated
  using ((select private.is_approved_admin()));

drop policy if exists caco_users_update_own_profile on public.profiles;
create policy caco_users_update_own_profile
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists caco_admins_update_profiles on public.profiles;
create policy caco_admins_update_profiles
  on public.profiles for update to authenticated
  using ((select private.is_approved_admin()))
  with check ((select private.is_approved_admin()));

commit;
