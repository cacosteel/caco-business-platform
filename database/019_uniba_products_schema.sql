-- UNIBA Connect: simplified product catalogue.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  category text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_code_unique on public.products (code);

alter table public.products enable row level security;

create policy "Authenticated users can manage products"
on public.products for all to authenticated
using (true) with check (true);
