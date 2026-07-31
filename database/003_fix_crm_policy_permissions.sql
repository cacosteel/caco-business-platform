-- Allows signed-in users to execute the security-definer helpers used by RLS policies.
grant usage on schema private to authenticated;
grant execute on function private.current_profile_company_id() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_shared_crm_access() to authenticated;
grant execute on function private.can_access_company(uuid) to authenticated;
