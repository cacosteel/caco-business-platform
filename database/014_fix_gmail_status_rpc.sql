-- PostgREST exposes RPC functions from the public schema only. Keep the
-- authorization check inside the function, while returning no OAuth token.
create or replace function public.gmail_connection_status()
returns table(connected boolean, sender_email text, connected_at timestamptz)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can view Gmail connection settings';
  end if;

  return query
  select true, gc.sender_email, gc.connected_at
  from public.gmail_connections gc
  where gc.id = true;
end;
$$;

revoke all on function public.gmail_connection_status() from public;
grant execute on function public.gmail_connection_status() to authenticated;
