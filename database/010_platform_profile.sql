-- Shared CACO organisation details, maintained only by administrators.

begin;

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  organisation_name text not null default 'CACO Business Platform',
  legal_name text,
  email text,
  phone text,
  address text,
  country text,
  website text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin_manage on public.platform_settings;
create policy platform_settings_admin_manage on public.platform_settings
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

commit;
