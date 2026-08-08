begin;
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0),
  subject text not null check (length(trim(subject)) > 0), body text not null check (length(trim(body)) > 0),
  is_active boolean not null default true, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.email_templates enable row level security;
drop policy if exists email_templates_read_active_or_admin on public.email_templates;
create policy email_templates_read_active_or_admin on public.email_templates for select to authenticated using (is_active or private.is_admin());
drop policy if exists email_templates_admin_manage on public.email_templates;
create policy email_templates_admin_manage on public.email_templates for all to authenticated using (private.is_admin()) with check (private.is_admin());
commit;
