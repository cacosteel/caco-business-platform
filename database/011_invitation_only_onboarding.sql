-- Invitation-only user onboarding. The client registration screen is not used.

begin;

create table if not exists public.platform_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_id uuid not null references public.companies(id),
  role text not null default 'member' check (role in ('admin', 'member')),
  auth_user_id uuid unique references public.profiles(id),
  invited_by uuid not null references public.profiles(id),
  status text not null default 'invited' check (status in ('invited', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.platform_invitations enable row level security;

drop policy if exists platform_invitations_admin_read on public.platform_invitations;
create policy platform_invitations_admin_read on public.platform_invitations
  for select to authenticated using (private.is_admin());

-- The invite Edge Function adds a metadata flag. All other public sign-up
-- attempts are rejected, even if a caller bypasses the web interface.
create or replace function private.create_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company_id_value uuid := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'invited_by_admin', 'false') <> 'true' then
    raise exception 'Accounts can only be created by administrator invitation';
  end if;

  if company_id_value is null then
    raise exception 'An invited user must be assigned to a company';
  end if;

  insert into public.profiles (id, email, company_id, role, approval_status)
  values (new.id, new.email, company_id_value, 'member', 'pending')
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.accept_platform_invitation(first_name_value text, last_name_value text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  invitation_row public.platform_invitations%rowtype;
begin
  if length(trim(first_name_value)) = 0 or length(trim(last_name_value)) = 0 then
    raise exception 'First and last name are required';
  end if;

  select * into invitation_row
  from public.platform_invitations
  where auth_user_id = auth.uid() and status = 'invited'
  for update;

  if not found then
    raise exception 'No active invitation was found';
  end if;

  update public.profiles
  set first_name = trim(first_name_value),
      last_name = trim(last_name_value),
      full_name = concat_ws(' ', trim(first_name_value), trim(last_name_value)),
      company_id = invitation_row.company_id,
      role = invitation_row.role,
      approval_status = 'approved'
  where id = auth.uid();

  update public.platform_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation_row.id;
end;
$$;

revoke all on function private.accept_platform_invitation(text, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.accept_platform_invitation(text, text) to authenticated;

commit;
