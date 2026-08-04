-- Expose the admin-only deletion review action through PostgREST's public RPC.

begin;

create or replace function public.review_deletion_request(
  request_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_row public.deletion_requests%rowtype;
begin
  if current_user_id is null or not private.is_admin() then
    raise exception 'Only administrators can review deletion requests';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select deletion_request.*
  into request_row
  from public.deletion_requests deletion_request
  where deletion_request.id = request_id
  for update;

  if not found or request_row.status <> 'pending' then
    raise exception 'This deletion request is no longer pending';
  end if;

  if decision = 'approved' then
    case request_row.entity_type
      when 'company' then
        update public.companies
        set deleted_at = now(), deleted_by = current_user_id
        where id = request_row.entity_id;
      when 'contact' then
        update public.company_contacts
        set deleted_at = now(), deleted_by = current_user_id
        where id = request_row.entity_id;
      when 'activity' then
        update public.activities
        set deleted_at = now(), deleted_by = current_user_id
        where id = request_row.entity_id;
      else
        raise exception 'Unsupported deletion entity';
    end case;

    if not found then
      raise exception 'The requested record no longer exists';
    end if;
  end if;

  update public.deletion_requests
  set status = decision,
      reviewed_by = current_user_id,
      reviewed_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.review_deletion_request(uuid, text) from public;
revoke all on function public.review_deletion_request(uuid, text) from anon;
grant execute on function public.review_deletion_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
