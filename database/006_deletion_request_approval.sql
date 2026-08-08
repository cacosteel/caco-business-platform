-- Admin-only review flow for member deletion requests.
create or replace function private.review_deletion_request(request_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  request_row public.deletion_requests%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Only administrators can review deletion requests';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into request_row
  from public.deletion_requests
  where id = request_id
  for update;

  if not found or request_row.status <> 'pending' then
    raise exception 'This deletion request is no longer pending';
  end if;

  if decision = 'approved' then
    case request_row.entity_type
      when 'company' then
        update public.companies set deleted_at = now(), deleted_by = auth.uid() where id = request_row.entity_id;
      when 'contact' then
        update public.company_contacts set deleted_at = now(), deleted_by = auth.uid() where id = request_row.entity_id;
      when 'activity' then
        update public.activities set deleted_at = now(), deleted_by = auth.uid() where id = request_row.entity_id;
      else
        raise exception 'Unsupported deletion entity';
    end case;
  end if;

  update public.deletion_requests
  set status = decision, reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id;
end;
$$;

revoke all on function private.review_deletion_request(uuid, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.review_deletion_request(uuid, text) to authenticated;

-- Members may edit records in their own company, but a soft deletion can only
-- be applied by an administrator through the review flow above.
create or replace function private.prevent_member_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if (new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by)
    and not private.is_admin() then
    raise exception 'Only administrators can apply soft deletion';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_member_company_soft_delete on public.companies;
create trigger prevent_member_company_soft_delete
  before update on public.companies
  for each row execute function private.prevent_member_soft_delete();

drop trigger if exists prevent_member_contact_soft_delete on public.company_contacts;
create trigger prevent_member_contact_soft_delete
  before update on public.company_contacts
  for each row execute function private.prevent_member_soft_delete();

drop trigger if exists prevent_member_activity_soft_delete on public.activities;
create trigger prevent_member_activity_soft_delete
  before update on public.activities
  for each row execute function private.prevent_member_soft_delete();
