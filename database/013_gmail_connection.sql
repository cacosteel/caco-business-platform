begin;
create table if not exists public.gmail_connections (
  id boolean primary key default true check (id), sender_email text not null,
  refresh_token text not null, connected_by uuid not null references public.profiles(id), connected_at timestamptz not null default now()
);
create table if not exists public.gmail_oauth_states (
  id uuid primary key default gen_random_uuid(), requested_by uuid not null references public.profiles(id),
  expires_at timestamptz not null, used_at timestamptz
);
alter table public.gmail_connections enable row level security;
alter table public.gmail_oauth_states enable row level security;
create or replace function private.gmail_connection_status()
returns table(connected boolean, sender_email text, connected_at timestamptz)
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not private.is_admin() then raise exception 'Only administrators can view Gmail connection settings'; end if;
  return query select true, gc.sender_email, gc.connected_at from public.gmail_connections gc where gc.id = true;
end; $$;
revoke all on function private.gmail_connection_status() from public;
grant usage on schema private to authenticated;
grant execute on function private.gmail_connection_status() to authenticated;
commit;
