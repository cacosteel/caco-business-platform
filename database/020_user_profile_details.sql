-- Expanded self-managed profile details for all CACO platform users.
-- Run this migration in the Supabase SQL editor.

begin;

alter table public.profiles
  add column if not exists job_title text,
  add column if not exists department text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists time_zone text;

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
     or new.approval_status is distinct from old.approval_status
     or new.private_notes is distinct from old.private_notes
     or new.contact_id is distinct from old.contact_id then
    raise exception 'Users may only update their own profile details';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_update() from public;

commit;
