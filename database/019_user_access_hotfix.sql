begin;

drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (private.is_admin());

create or replace function public.update_user_access(
  target_user_id uuid,
  target_company_id uuid,
  target_role text,
  target_status text
)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.update_user_access(
    target_user_id,
    target_company_id,
    target_role,
    target_status
  );
$$;

revoke all
on function public.update_user_access(uuid, uuid, text, text)
from public;

grant execute
on function public.update_user_access(uuid, uuid, text, text)
to authenticated;

notify pgrst, 'reload schema';

commit;