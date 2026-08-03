-- Admin-managed activity type list. Activity records retain their stable code,
-- so renaming or hiding a type never changes historical records.

begin;

create table if not exists public.activity_types (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists activity_types_name_unique
  on public.activity_types (lower(name));

insert into public.activity_types (code, name)
values
  ('phone_call', 'Phone call'),
  ('email', 'Email'),
  ('meeting', 'Meeting'),
  ('message', 'WhatsApp / message'),
  ('follow_up', 'Follow-up'),
  ('note', 'Note')
on conflict (code) do nothing;

alter table public.activities drop constraint if exists activities_activity_type_check;

alter table public.activity_types enable row level security;

drop policy if exists activity_types_read_active_or_admin on public.activity_types;
create policy activity_types_read_active_or_admin on public.activity_types
  for select to authenticated using (is_active or private.is_admin());

drop policy if exists activity_types_admin_manage on public.activity_types;
create policy activity_types_admin_manage on public.activity_types
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

commit;
