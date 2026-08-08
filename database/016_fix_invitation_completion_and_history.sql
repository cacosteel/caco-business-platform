-- Repair invitation completion and make invitation history reliable.
-- Safe to run after 011_invitation_only_onboarding.sql.

begin;

create schema if not exists private;

-- Some production databases were deployed before the invitation-history table
-- migration. Create it here as well so this repair can be run independently.
create table if not exists public.platform_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_id uuid not null references public.companies(id),
  role text not null default 'member' check (role in ('admin', 'member')),
  auth_user_id uuid unique references public.profiles(id),
  invited_by uuid references public.profiles(id),
  status text not null default 'invited' check (status in ('invited', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.platform_invitations enable row level security;

drop policy if exists platform_invitations_admin_read
  on public.platform_invitations;
create policy platform_invitations_admin_read
  on public.platform_invitations
  for select to authenticated
  using (private.is_admin());

-- A missing history record should not prevent an otherwise valid invited user
-- from completing onboarding. New invitations still always record invited_by.
alter table public.platform_invitations
  alter column invited_by drop not null;

-- Store the assigned role directly when Auth creates the pending profile.
create or replace function private.create_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company_id_value uuid := nullif(new.raw_user_meta_data ->> 'company_id', '')::uuid;
  invited_role_value text := coalesce(nullif(new.raw_user_meta_data ->> 'invited_role', ''), 'member');
begin
  if coalesce(new.raw_user_meta_data ->> 'invited_by_admin', 'false') <> 'true' then
    raise exception 'Accounts can only be created by administrator invitation';
  end if;

  if company_id_value is null then
    raise exception 'An invited user must be assigned to a company';
  end if;

  if invited_role_value not in ('admin', 'member') then
    raise exception 'Invalid invited role';
  end if;

  insert into public.profiles (id, email, company_id, role, approval_status)
  values (new.id, new.email, company_id_value, invited_role_value, 'pending')
  on conflict (id) do update
    set email = excluded.email,
        company_id = excluded.company_id,
        role = excluded.role,
        approval_status = 'pending';

  return new;
end;
$$;

-- Recover invitations where Supabase sent the email but the old Edge Function
-- failed before inserting the platform history row.
insert into public.platform_invitations (
  email,
  company_id,
  role,
  auth_user_id,
  invited_by,
  status,
  created_at,
  accepted_at
)
select
  lower(auth_user.email),
  profile.company_id,
  case when profile.role = 'admin' then 'admin' else 'member' end,
  auth_user.id,
  inviter.id,
  case when profile.approval_status = 'approved' then 'accepted' else 'invited' end,
  auth_user.created_at,
  case when profile.approval_status = 'approved' then now() else null end
from auth.users auth_user
join public.profiles profile on profile.id = auth_user.id
left join public.profiles inviter
  on inviter.id = nullif(auth_user.raw_user_meta_data ->> 'invited_by', '')::uuid
where coalesce(auth_user.raw_user_meta_data ->> 'invited_by_admin', 'false') = 'true'
  and auth_user.email is not null
  and profile.company_id is not null
  and not exists (
    select 1
    from public.platform_invitations existing
    where existing.auth_user_id = auth_user.id
  )
on conflict (auth_user_id) do nothing;

-- Public API wrapper: PostgREST exposes public by default, while the former
-- implementation existed only in private and could not be called by the app.
create or replace function public.accept_platform_invitation(
  first_name_value text,
  last_name_value text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  invitation_row public.platform_invitations%rowtype;
  fallback_email text;
  fallback_company_id uuid;
  fallback_role text;
  fallback_invited_by uuid;
begin
  if current_user_id is null then
    raise exception 'Your invitation session is missing or has expired';
  end if;

  if length(trim(coalesce(first_name_value, ''))) = 0
     or length(trim(coalesce(last_name_value, ''))) = 0 then
    raise exception 'First and last name are required';
  end if;

  select invitation.*
  into invitation_row
  from public.platform_invitations invitation
  where invitation.auth_user_id = current_user_id
    and invitation.status = 'invited'
  for update;

  if found then
    update public.profiles
    set first_name = trim(first_name_value),
        last_name = trim(last_name_value),
        full_name = concat_ws(' ', trim(first_name_value), trim(last_name_value)),
        company_id = invitation_row.company_id,
        role = invitation_row.role,
        approval_status = 'approved'
    where id = current_user_id;

    if not found then
      raise exception 'The invited user profile could not be found';
    end if;

    update public.platform_invitations
    set status = 'accepted',
        accepted_at = now()
    where id = invitation_row.id;
  else
    -- Recovery path for an email already sent by the previous function version.
    select
      lower(auth_user.email),
      profile.company_id,
      case when profile.role = 'admin' then 'admin' else 'member' end,
      inviter.id
    into
      fallback_email,
      fallback_company_id,
      fallback_role,
      fallback_invited_by
    from auth.users auth_user
    join public.profiles profile on profile.id = auth_user.id
    left join public.profiles inviter
      on inviter.id = nullif(auth_user.raw_user_meta_data ->> 'invited_by', '')::uuid
    where auth_user.id = current_user_id
      and coalesce(auth_user.raw_user_meta_data ->> 'invited_by_admin', 'false') = 'true'
      and profile.approval_status = 'pending'
      and profile.company_id is not null;

    if not found then
      raise exception 'No active invitation was found';
    end if;

    update public.profiles
    set first_name = trim(first_name_value),
        last_name = trim(last_name_value),
        full_name = concat_ws(' ', trim(first_name_value), trim(last_name_value)),
        company_id = fallback_company_id,
        role = fallback_role,
        approval_status = 'approved'
    where id = current_user_id;

    insert into public.platform_invitations (
      email,
      company_id,
      role,
      auth_user_id,
      invited_by,
      status,
      created_at,
      accepted_at
    ) values (
      fallback_email,
      fallback_company_id,
      fallback_role,
      current_user_id,
      fallback_invited_by,
      'accepted',
      now(),
      now()
    )
    on conflict (auth_user_id) do update
      set status = 'accepted',
          accepted_at = now();
  end if;
end;
$$;

revoke all on function public.accept_platform_invitation(text, text) from public;
revoke all on function public.accept_platform_invitation(text, text) from anon;
grant execute on function public.accept_platform_invitation(text, text) to authenticated;

-- Use an admin-only RPC for the history screen so it does not depend on
-- client-side relationship inference or table grant defaults.
create or replace function public.get_platform_invitations()
returns table (
  id uuid,
  email text,
  role text,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  company_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can view invitation history';
  end if;

  return query
  select
    invitation.id,
    invitation.email,
    invitation.role,
    invitation.status,
    invitation.created_at,
    invitation.accepted_at,
    company.name
  from public.platform_invitations invitation
  join public.companies company on company.id = invitation.company_id
  order by invitation.created_at desc;
end;
$$;

revoke all on function public.get_platform_invitations() from public;
revoke all on function public.get_platform_invitations() from anon;
grant execute on function public.get_platform_invitations() to authenticated;

grant select on public.platform_invitations to authenticated;

notify pgrst, 'reload schema';

commit;
