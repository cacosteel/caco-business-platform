-- Compatibility for the original minimal profiles table.
-- Existing users are approved so the current platform administrator can sign in.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists approval_status text not null default 'approved';
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.id = auth_user.id and profile.email is null;

update public.profiles
set approval_status = 'approved'
where approval_status is null;

alter table public.profiles
  drop constraint if exists profiles_approval_status_check,
  add constraint profiles_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected'));

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;
