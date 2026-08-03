-- Public catalogue and product-document library.
-- Run after the contact-management migrations.

begin;

create table if not exists public.public_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null check (file_size >= 0),
  mime_type text,
  is_published boolean not null default true,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_resources enable row level security;

drop policy if exists public_resources_read_published on public.public_resources;
create policy public_resources_read_published on public.public_resources
  for select to anon, authenticated using (is_published = true);

drop policy if exists public_resources_admin_manage on public.public_resources;
create policy public_resources_admin_manage on public.public_resources
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

insert into storage.buckets (id, name, public)
values ('public-resources', 'public-resources', true)
on conflict (id) do update set public = true;

drop policy if exists public_resources_files_read on storage.objects;
create policy public_resources_files_read on storage.objects
  for select to public using (bucket_id = 'public-resources');

drop policy if exists public_resources_files_admin_insert on storage.objects;
create policy public_resources_files_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-resources' and private.is_admin());

drop policy if exists public_resources_files_admin_update on storage.objects;
create policy public_resources_files_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'public-resources' and private.is_admin())
  with check (bucket_id = 'public-resources' and private.is_admin());

drop policy if exists public_resources_files_admin_delete on storage.objects;
create policy public_resources_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-resources' and private.is_admin());

commit;
