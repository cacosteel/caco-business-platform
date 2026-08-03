-- Secure user-company, role, and access management for administrators.

create or replace function private.update_user_access(
  target_user_id uuid,
  target_company_id uuid,
  target_role text,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'Only administrators can manage user access';
  end if;

  if target_role not in ('admin', 'member') then
    raise exception 'Invalid user role';
  end if;

  if target_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid approval status';
  end if;

  if target_role = 'member' and target_company_id is null then
    raise exception 'A member must be assigned to a company';
  end if;

  if target_user_id = auth.uid() and (target_role <> 'admin' or target_status <> 'approved') then
    raise exception 'You cannot remove your own administrator access';
  end if;

  update public.profiles
  set company_id = target_company_id,
      role = target_role,
      approval_status = target_status
  where id = target_user_id;

  if not found then
    raise exception 'User profile not found';
  end if;
end;
$$;

revoke all on function private.update_user_access(uuid, uuid, text, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.update_user_access(uuid, uuid, text, text) to authenticated;
