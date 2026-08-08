-- Replaces the temporary Partner shared-CRM rule with the V1 Admin/Member model.
-- Admins can access every company. Members can access only their own company.

create or replace function private.can_access_company(target_company_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select private.is_admin()
      or target_company_id = private.current_profile_company_id()
$$;

drop policy if exists companies_insert_by_partner_or_admin on public.companies;
create policy companies_insert_by_admin on public.companies for insert to authenticated
  with check (private.is_admin());

drop policy if exists companies_update_by_scope on public.companies;
create policy companies_update_by_scope on public.companies for update to authenticated
  using (private.can_access_company(id)) with check (private.can_access_company(id));

grant usage on schema private to authenticated;
grant execute on function private.can_access_company(uuid) to authenticated;
