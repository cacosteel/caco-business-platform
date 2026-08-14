-- CACO Business Platform - Hybrid inquiry / offer workbook compatibility
--
-- Adds the commercial fields present in the controlled OFFERFORM workbook,
-- an Admin-only spreadsheet import audit/staging table, and atomic V2 draft
-- save functions. This migration is additive and preserves existing records.

begin;

-- ---------------------------------------------------------------------------
-- Workbook-compatible commercial fields
-- ---------------------------------------------------------------------------

alter table public.inquiries
  add column if not exists requested_payment_terms text,
  add column if not exists requested_shipment_method text,
  add column if not exists requested_latest_shipment_date date,
  add column if not exists requested_marking_terms text,
  add column if not exists special_conditions text;

alter table public.quotations
  add column if not exists to_recipients jsonb not null default '[]'::jsonb,
  add column if not exists cc_recipients jsonb not null default '[]'::jsonb,
  add column if not exists marking_terms text,
  add column if not exists latest_shipment_date date,
  add column if not exists special_conditions text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quotations'::regclass
      and conname = 'quotations_to_recipients_array_check'
  ) then
    alter table public.quotations
      add constraint quotations_to_recipients_array_check
      check (jsonb_typeof(to_recipients) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.quotations'::regclass
      and conname = 'quotations_cc_recipients_array_check'
  ) then
    alter table public.quotations
      add constraint quotations_cc_recipients_array_check
      check (jsonb_typeof(cc_recipients) = 'array');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin-only, non-destructive workbook import staging and audit metadata
-- ---------------------------------------------------------------------------

create table if not exists public.sales_spreadsheet_imports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('inquiry', 'quotation')),
  template_version text not null,
  original_filename text not null,
  file_sha256 text,
  target_inquiry_id uuid references public.inquiries(id),
  target_quotation_id uuid references public.quotations(id),
  status text not null default 'staged' check (
    status in ('staged', 'validated', 'imported', 'rejected', 'failed')
  ),
  row_count integer not null default 0 check (row_count >= 0),
  validation_report jsonb not null default '{}'::jsonb check (
    jsonb_typeof(validation_report) = 'object'
  ),
  staged_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_at timestamptz,
  imported_at timestamptz,
  constraint sales_spreadsheet_import_target_check check (
    (entity_type = 'inquiry' and target_quotation_id is null)
    or (entity_type = 'quotation' and target_inquiry_id is null)
  ),
  constraint sales_spreadsheet_import_hash_check check (
    file_sha256 is null or file_sha256 ~ '^[0-9a-fA-F]{64}$'
  )
);

create index if not exists sales_spreadsheet_imports_created_idx
  on public.sales_spreadsheet_imports (created_at desc);

create index if not exists sales_spreadsheet_imports_target_inquiry_idx
  on public.sales_spreadsheet_imports (target_inquiry_id, created_at desc)
  where target_inquiry_id is not null;

create index if not exists sales_spreadsheet_imports_target_quotation_idx
  on public.sales_spreadsheet_imports (target_quotation_id, created_at desc)
  where target_quotation_id is not null;

create or replace function private.sales_protect_spreadsheet_import_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.entity_type is distinct from old.entity_type
     or new.template_version is distinct from old.template_version
     or new.original_filename is distinct from old.original_filename
     or new.file_sha256 is distinct from old.file_sha256
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Spreadsheet import identity and source metadata are immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.sales_protect_spreadsheet_import_identity()
  from public, anon, authenticated;

drop trigger if exists sales_spreadsheet_imports_protect_identity
  on public.sales_spreadsheet_imports;
create trigger sales_spreadsheet_imports_protect_identity
before update on public.sales_spreadsheet_imports
for each row execute function private.sales_protect_spreadsheet_import_identity();

drop trigger if exists sales_set_updated_at on public.sales_spreadsheet_imports;
create trigger sales_set_updated_at
before update on public.sales_spreadsheet_imports
for each row execute function private.sales_set_updated_at();

alter table public.sales_spreadsheet_imports enable row level security;
revoke all privileges on table public.sales_spreadsheet_imports from public, anon, authenticated;
grant select, insert, update on table public.sales_spreadsheet_imports to authenticated;

drop policy if exists sales_spreadsheet_imports_admin_select
  on public.sales_spreadsheet_imports;
create policy sales_spreadsheet_imports_admin_select
  on public.sales_spreadsheet_imports for select to authenticated
  using (private.is_approved_sales_admin());

drop policy if exists sales_spreadsheet_imports_admin_insert
  on public.sales_spreadsheet_imports;
create policy sales_spreadsheet_imports_admin_insert
  on public.sales_spreadsheet_imports for insert to authenticated
  with check (
    private.is_approved_sales_admin()
    and created_by = auth.uid()
  );

drop policy if exists sales_spreadsheet_imports_admin_update
  on public.sales_spreadsheet_imports;
create policy sales_spreadsheet_imports_admin_update
  on public.sales_spreadsheet_imports for update to authenticated
  using (private.is_approved_sales_admin())
  with check (private.is_approved_sales_admin());

-- Line-item tables normally reject every hard delete. The V2 save RPCs need to
-- replace a Draft's own lines atomically, so permit only that narrowly-scoped
-- operation. Authenticated roles still have no table DELETE privilege, and the
-- marker is tied to both the caller and current transaction.
create or replace function private.sales_prevent_hard_delete()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if tg_table_schema = 'public'
     and tg_table_name in ('inquiry_items', 'quotation_items')
     and private.is_approved_sales_admin()
     and current_setting('caco.v2_line_replacement', true)
       = auth.uid()::text || ':' || txid_current()::text then
    return old;
  end if;

  raise exception 'Sales records use soft deletion; submit a deletion request instead';
end;
$$;

revoke all on function private.sales_prevent_hard_delete()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic V2 inquiry Draft save
-- ---------------------------------------------------------------------------

create or replace function public.save_inquiry_v2(
  p_inquiry_id uuid,
  p_header jsonb,
  p_items jsonb
)
returns public.inquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_inquiry public.inquiries%rowtype;
  saved_inquiry public.inquiries%rowtype;
  item_data jsonb;
  item_number integer := 0;
  item_name text;
  item_quantity numeric(14,3);
  target_company_id uuid;
  target_contact_id uuid;
  target_seller_id uuid;
  target_currency text;
  target_tolerance_unit text;
  target_incoterms jsonb;
  invalid_key text;
  replacement_marker text;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;

  if p_header is null or jsonb_typeof(p_header) <> 'object' then
    raise exception 'Inquiry header must be a JSON object';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Enter at least one inquiry line';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'An inquiry cannot contain more than 500 lines';
  end if;

  select string_agg(key, ', ' order by key)
  into invalid_key
  from jsonb_object_keys(p_header) as supplied(key)
  where key <> all (array[
    'company_id', 'contact_id', 'seller_entity_id', 'customer_reference',
    'inquiry_date', 'received_at', 'currency', 'status', 'notes',
    'total_tolerance_minus', 'total_tolerance_plus', 'total_tolerance_unit',
    'loading_port', 'discharge_port', 'requested_incoterms',
    'required_documents', 'packing_requirements', 'readiness_requirement',
    'requested_payment_terms', 'requested_shipment_method',
    'requested_latest_shipment_date', 'requested_marking_terms',
    'special_conditions'
  ]::text[]);
  if invalid_key is not null then
    raise exception 'Unsupported inquiry header fields: %', invalid_key;
  end if;

  if p_header ? 'status'
     and coalesce(nullif(trim(p_header ->> 'status'), ''), 'Draft') <> 'Draft' then
    raise exception 'The V2 editor can save Draft inquiries only';
  end if;

  if p_inquiry_id is not null then
    select * into current_inquiry
    from public.inquiries
    where id = p_inquiry_id and deleted_at is null
    for update;

    if not found then
      raise exception 'Inquiry was not found';
    end if;
    if current_inquiry.status <> 'Draft' then
      raise exception 'Only a Draft inquiry can be edited';
    end if;
    if exists (
      select 1 from public.supplier_rfqs
      where inquiry_id = current_inquiry.id and deleted_at is null
    ) then
      raise exception 'An inquiry with supplier RFQs cannot have its lines replaced; create a revision';
    end if;
    if exists (
      select 1
      from public.supplier_rfq_lines rfq_line
      join public.inquiry_items inquiry_line
        on inquiry_line.id = rfq_line.inquiry_item_id
      where inquiry_line.inquiry_id = current_inquiry.id
    ) or exists (
      select 1
      from public.costing_lines costing_line
      join public.inquiry_items inquiry_line
        on inquiry_line.id = costing_line.inquiry_item_id
      where inquiry_line.inquiry_id = current_inquiry.id
    ) then
      raise exception 'An inquiry with sourcing or costing history cannot have its lines replaced; create a revision';
    end if;
    if exists (
      select 1
      from public.quotation_items quotation_line
      join public.inquiry_items inquiry_line
        on inquiry_line.id = quotation_line.inquiry_item_id
      where inquiry_line.inquiry_id = current_inquiry.id
    ) then
      raise exception 'An inquiry used by a quotation cannot have its lines replaced; create a revision';
    end if;
    if p_header ? 'company_id'
       and nullif(p_header ->> 'company_id', '')::uuid
         is distinct from current_inquiry.company_id then
      raise exception 'An existing inquiry cannot be moved to another company';
    end if;
    if p_header ? 'inquiry_date'
       and nullif(p_header ->> 'inquiry_date', '') is null then
      raise exception 'Inquiry date is required';
    end if;
    if p_header ? 'inquiry_date'
       and current_inquiry.sequence_year is not null
       and extract(year from nullif(p_header ->> 'inquiry_date', '')::date)::integer
         <> current_inquiry.sequence_year then
      raise exception 'Inquiry date cannot move an existing document to another numbering year';
    end if;
  end if;

  target_company_id := case
    when p_inquiry_id is not null then current_inquiry.company_id
    else nullif(p_header ->> 'company_id', '')::uuid
  end;
  if target_company_id is null or not exists (
    select 1 from public.companies
    where id = target_company_id and deleted_at is null
  ) then
    raise exception 'Customer company was not found';
  end if;

  target_contact_id := case
    when p_header ? 'contact_id' then nullif(p_header ->> 'contact_id', '')::uuid
    when p_inquiry_id is not null then current_inquiry.contact_id
    else null
  end;

  target_seller_id := case
    when p_header ? 'seller_entity_id' then nullif(p_header ->> 'seller_entity_id', '')::uuid
    when p_inquiry_id is not null then current_inquiry.seller_entity_id
    else null
  end;
  if target_seller_id is null and p_inquiry_id is null then
    select id into target_seller_id
    from public.selling_entities
    where is_active
    order by case when code = 'CACO' then 0 else 1 end, created_at
    limit 1;
  end if;
  if target_seller_id is not null and not exists (
    select 1 from public.selling_entities
    where id = target_seller_id and is_active
  ) then
    raise exception 'Active selling entity was not found';
  end if;

  target_currency := upper(coalesce(
    nullif(trim(p_header ->> 'currency'), ''),
    case when p_inquiry_id is not null then current_inquiry.currency end,
    'USD'
  ));
  if target_currency <> 'USD' then
    raise exception 'The current sales workflow supports USD only';
  end if;

  target_tolerance_unit := coalesce(
    nullif(trim(p_header ->> 'total_tolerance_unit'), ''),
    case when p_inquiry_id is not null then current_inquiry.total_tolerance_unit end,
    'percent'
  );
  if target_tolerance_unit not in ('percent', 'MT') then
    raise exception 'Total tolerance unit must be percent or MT';
  end if;

  target_incoterms := case
    when p_header ? 'requested_incoterms'
      then coalesce(p_header -> 'requested_incoterms', '[]'::jsonb)
    when p_inquiry_id is not null then current_inquiry.requested_incoterms
    else '[]'::jsonb
  end;
  if jsonb_typeof(target_incoterms) <> 'array' then
    raise exception 'Requested Incoterms must be a JSON array';
  end if;

  if p_inquiry_id is null then
    insert into public.inquiries (
      company_id, contact_id, seller_entity_id, inquiry_no, inquiry_date,
      status, notes, customer_reference, received_at, currency,
      total_tolerance_minus, total_tolerance_plus, total_tolerance_unit,
      loading_port, discharge_port, requested_incoterms,
      required_documents, packing_requirements, readiness_requirement,
      requested_payment_terms, requested_shipment_method,
      requested_latest_shipment_date, requested_marking_terms,
      special_conditions, created_by
    ) values (
      target_company_id, target_contact_id, target_seller_id, 'PENDING',
      coalesce(nullif(p_header ->> 'inquiry_date', '')::date, current_date),
      'Draft', nullif(trim(p_header ->> 'notes'), ''),
      nullif(trim(p_header ->> 'customer_reference'), ''),
      coalesce(nullif(p_header ->> 'received_at', '')::timestamptz, now()),
      target_currency,
      nullif(p_header ->> 'total_tolerance_minus', '')::numeric,
      nullif(p_header ->> 'total_tolerance_plus', '')::numeric,
      target_tolerance_unit,
      nullif(trim(p_header ->> 'loading_port'), ''),
      nullif(trim(p_header ->> 'discharge_port'), ''),
      target_incoterms,
      nullif(trim(p_header ->> 'required_documents'), ''),
      nullif(trim(p_header ->> 'packing_requirements'), ''),
      nullif(trim(p_header ->> 'readiness_requirement'), ''),
      nullif(trim(p_header ->> 'requested_payment_terms'), ''),
      nullif(trim(p_header ->> 'requested_shipment_method'), ''),
      nullif(p_header ->> 'requested_latest_shipment_date', '')::date,
      nullif(trim(p_header ->> 'requested_marking_terms'), ''),
      nullif(trim(p_header ->> 'special_conditions'), ''),
      auth.uid()
    )
    returning * into saved_inquiry;
  else
    update public.inquiries set
      contact_id = target_contact_id,
      seller_entity_id = target_seller_id,
      inquiry_date = case when p_header ? 'inquiry_date'
        then nullif(p_header ->> 'inquiry_date', '')::date else inquiry_date end,
      notes = case when p_header ? 'notes'
        then nullif(trim(p_header ->> 'notes'), '') else notes end,
      customer_reference = case when p_header ? 'customer_reference'
        then nullif(trim(p_header ->> 'customer_reference'), '') else customer_reference end,
      received_at = case when p_header ? 'received_at'
        then nullif(p_header ->> 'received_at', '')::timestamptz else received_at end,
      currency = target_currency,
      total_tolerance_minus = case when p_header ? 'total_tolerance_minus'
        then nullif(p_header ->> 'total_tolerance_minus', '')::numeric
        else total_tolerance_minus end,
      total_tolerance_plus = case when p_header ? 'total_tolerance_plus'
        then nullif(p_header ->> 'total_tolerance_plus', '')::numeric
        else total_tolerance_plus end,
      total_tolerance_unit = target_tolerance_unit,
      loading_port = case when p_header ? 'loading_port'
        then nullif(trim(p_header ->> 'loading_port'), '') else loading_port end,
      discharge_port = case when p_header ? 'discharge_port'
        then nullif(trim(p_header ->> 'discharge_port'), '') else discharge_port end,
      requested_incoterms = target_incoterms,
      required_documents = case when p_header ? 'required_documents'
        then nullif(trim(p_header ->> 'required_documents'), '') else required_documents end,
      packing_requirements = case when p_header ? 'packing_requirements'
        then nullif(trim(p_header ->> 'packing_requirements'), '') else packing_requirements end,
      readiness_requirement = case when p_header ? 'readiness_requirement'
        then nullif(trim(p_header ->> 'readiness_requirement'), '') else readiness_requirement end,
      requested_payment_terms = case when p_header ? 'requested_payment_terms'
        then nullif(trim(p_header ->> 'requested_payment_terms'), '') else requested_payment_terms end,
      requested_shipment_method = case when p_header ? 'requested_shipment_method'
        then nullif(trim(p_header ->> 'requested_shipment_method'), '') else requested_shipment_method end,
      requested_latest_shipment_date = case when p_header ? 'requested_latest_shipment_date'
        then nullif(p_header ->> 'requested_latest_shipment_date', '')::date
        else requested_latest_shipment_date end,
      requested_marking_terms = case when p_header ? 'requested_marking_terms'
        then nullif(trim(p_header ->> 'requested_marking_terms'), '') else requested_marking_terms end,
      special_conditions = case when p_header ? 'special_conditions'
        then nullif(trim(p_header ->> 'special_conditions'), '') else special_conditions end
    where id = current_inquiry.id
    returning * into saved_inquiry;

    replacement_marker := auth.uid()::text || ':' || txid_current()::text;
    perform set_config('caco.v2_line_replacement', replacement_marker, true);
    delete from public.inquiry_items where inquiry_id = current_inquiry.id;
    perform set_config('caco.v2_line_replacement', '', true);
  end if;

  for item_data in select value from jsonb_array_elements(p_items) loop
    item_number := item_number + 1;
    if jsonb_typeof(item_data) <> 'object' then
      raise exception 'Inquiry line % must be a JSON object', item_number;
    end if;

    select string_agg(key, ', ' order by key)
    into invalid_key
    from jsonb_object_keys(item_data) as supplied(key)
    where key <> all (array[
      'id', 'line_no', 'product_id', 'product_name', 'specification_template_id',
      'customer_item_code', 'internal_product_code', 'grade', 'standard',
      'thickness_mm', 'width_mm', 'length_mm', 'coating', 'color_ral',
      'surface_treatment', 'coil_inner_diameter_mm', 'coil_outer_diameter_mm',
      'target_coil_weight_mt', 'quantity', 'unit', 'tolerance_minus',
      'tolerance_plus', 'tolerance_unit', 'invoicing_basis',
      'theoretical_unit_weight_kg', 'theoretical_weight_override_note',
      'pieces_per_bundle', 'additional_specification', 'packing_requirements',
      'required_documents', 'specification_data'
    ]::text[]);
    if invalid_key is not null then
      raise exception 'Unsupported fields on inquiry line %: %', item_number, invalid_key;
    end if;

    item_name := trim(coalesce(item_data ->> 'product_name', ''));
    item_quantity := nullif(item_data ->> 'quantity', '')::numeric;
    if item_name = '' then
      raise exception 'Product name is required on inquiry line %', item_number;
    end if;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Quantity must be greater than zero on inquiry line %', item_number;
    end if;
    if coalesce(nullif(item_data ->> 'tolerance_unit', ''), 'percent')
       not in ('percent', 'MT') then
      raise exception 'Invalid tolerance unit on inquiry line %', item_number;
    end if;
    if coalesce(nullif(item_data ->> 'invoicing_basis', ''), 'actual_net_weight')
       not in ('actual_net_weight', 'theoretical_weight', 'pieces') then
      raise exception 'Invalid invoicing basis on inquiry line %', item_number;
    end if;
    if item_data ? 'specification_data'
       and jsonb_typeof(item_data -> 'specification_data') <> 'object' then
      raise exception 'Specification data must be an object on inquiry line %', item_number;
    end if;

    insert into public.inquiry_items (
      inquiry_id, line_no, product_id, product_name,
      specification_template_id, customer_item_code, internal_product_code,
      grade, standard, thickness_mm, width_mm, length_mm, coating, color_ral,
      surface_treatment, coil_inner_diameter_mm, coil_outer_diameter_mm,
      target_coil_weight_mt, quantity, unit, tolerance_minus, tolerance_plus,
      tolerance_unit, invoicing_basis, theoretical_unit_weight_kg,
      theoretical_weight_override_note, pieces_per_bundle,
      additional_specification, packing_requirements, required_documents,
      specification_data
    ) values (
      saved_inquiry.id, item_number,
      nullif(item_data ->> 'product_id', '')::uuid, item_name,
      nullif(item_data ->> 'specification_template_id', '')::uuid,
      nullif(trim(item_data ->> 'customer_item_code'), ''),
      nullif(trim(item_data ->> 'internal_product_code'), ''),
      nullif(trim(item_data ->> 'grade'), ''),
      nullif(trim(item_data ->> 'standard'), ''),
      nullif(item_data ->> 'thickness_mm', '')::numeric,
      nullif(item_data ->> 'width_mm', '')::numeric,
      nullif(item_data ->> 'length_mm', '')::numeric,
      nullif(trim(item_data ->> 'coating'), ''),
      nullif(trim(item_data ->> 'color_ral'), ''),
      nullif(trim(item_data ->> 'surface_treatment'), ''),
      nullif(item_data ->> 'coil_inner_diameter_mm', '')::numeric,
      nullif(item_data ->> 'coil_outer_diameter_mm', '')::numeric,
      nullif(item_data ->> 'target_coil_weight_mt', '')::numeric,
      item_quantity,
      coalesce(nullif(trim(item_data ->> 'unit'), ''), 'MT'),
      nullif(item_data ->> 'tolerance_minus', '')::numeric,
      nullif(item_data ->> 'tolerance_plus', '')::numeric,
      coalesce(nullif(item_data ->> 'tolerance_unit', ''), 'percent'),
      coalesce(nullif(item_data ->> 'invoicing_basis', ''), 'actual_net_weight'),
      nullif(item_data ->> 'theoretical_unit_weight_kg', '')::numeric,
      nullif(trim(item_data ->> 'theoretical_weight_override_note'), ''),
      nullif(item_data ->> 'pieces_per_bundle', '')::integer,
      nullif(trim(item_data ->> 'additional_specification'), ''),
      nullif(trim(item_data ->> 'packing_requirements'), ''),
      nullif(trim(item_data ->> 'required_documents'), ''),
      coalesce(item_data -> 'specification_data', '{}'::jsonb)
    );
  end loop;

  perform private.sales_record_audit(
    saved_inquiry.company_id, 'inquiry', saved_inquiry.id,
    case when p_inquiry_id is null then 'created_v2' else 'updated_v2' end,
    case when p_inquiry_id is null then null else current_inquiry.status end,
    'Draft', null,
    jsonb_build_object('line_count', item_number, 'source', 'hybrid_editor')
  );

  return saved_inquiry;
end;
$$;

revoke all on function public.save_inquiry_v2(uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_inquiry_v2(uuid, jsonb, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic V2 quotation Draft save. Line amounts and document totals are always
-- calculated in the database; client-supplied amount/subtotal/total values are
-- intentionally not accepted.
-- ---------------------------------------------------------------------------

create or replace function public.save_quotation_v2(
  p_quotation_id uuid,
  p_header jsonb,
  p_items jsonb
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quotation public.quotations%rowtype;
  saved_quotation public.quotations%rowtype;
  source_inquiry public.inquiries%rowtype;
  item_data jsonb;
  recipient_data jsonb;
  item_number integer := 0;
  item_name text;
  item_quantity numeric(14,3);
  item_unit_price numeric(16,2);
  item_amount numeric(16,2);
  calculated_subtotal numeric(16,2) := 0;
  target_inquiry_id uuid;
  target_company_id uuid;
  target_contact_id uuid;
  target_seller_id uuid;
  target_bank_id uuid;
  target_currency text;
  target_quotation_date date;
  target_valid_until date;
  target_latest_shipment_date date;
  target_to_recipients jsonb;
  target_cc_recipients jsonb;
  target_freight numeric(16,2);
  target_insurance numeric(16,2);
  target_tax numeric(16,2);
  target_other_charges numeric(16,2);
  target_advance numeric(7,4);
  target_balance numeric(7,4);
  target_shipment_method text;
  invalid_key text;
  invalid_email text;
  duplicate_email text;
  replacement_marker text;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;

  if p_header is null or jsonb_typeof(p_header) <> 'object' then
    raise exception 'Quotation header must be a JSON object';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Enter at least one quotation line';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'A quotation cannot contain more than 500 lines';
  end if;

  select string_agg(key, ', ' order by key)
  into invalid_key
  from jsonb_object_keys(p_header) as supplied(key)
  where key <> all (array[
    'inquiry_id', 'company_id', 'contact_id', 'seller_entity_id',
    'seller_bank_account_id', 'quotation_date', 'valid_until', 'currency',
    'status', 'notes', 'costing_scenario_id', 'subtotal', 'freight',
    'insurance', 'tax_amount', 'other_charges', 'total_amount',
    'payment_advance_percent', 'payment_balance_percent', 'payment_method',
    'payment_balance_trigger', 'payment_terms', 'incoterm_rule', 'named_place',
    'incoterms_version', 'loading_port', 'discharge_port', 'shipment_method',
    'partial_shipment_allowed', 'transshipment_allowed',
    'expected_readiness_date', 'origin_country', 'producing_mill',
    'packing_terms', 'inspection_terms', 'documentation_terms',
    'to_recipients', 'cc_recipients', 'marking_terms',
    'latest_shipment_date', 'special_conditions'
  ]::text[]);
  if invalid_key is not null then
    raise exception 'Unsupported quotation header fields: %', invalid_key;
  end if;

  if p_header ? 'status'
     and coalesce(nullif(trim(p_header ->> 'status'), ''), 'Draft') <> 'Draft' then
    raise exception 'The V2 editor can save Draft quotations only';
  end if;
  if p_header ? 'costing_scenario_id'
     and nullif(p_header ->> 'costing_scenario_id', '')::uuid is not null then
    raise exception 'Costing-sourced quotations must be created through the costing workflow';
  end if;

  if p_quotation_id is not null then
    select * into current_quotation
    from public.quotations
    where id = p_quotation_id and deleted_at is null
    for update;

    if not found then
      raise exception 'Quotation was not found';
    end if;
    if current_quotation.status <> 'Draft' then
      raise exception 'Only a Draft quotation can be edited';
    end if;
    if current_quotation.costing_scenario_id is not null
       or exists (
         select 1
         from public.quotation_line_sources source
         join public.quotation_items line on line.id = source.quotation_item_id
         where line.quotation_id = current_quotation.id
       ) then
      raise exception 'A costing-sourced quotation must be revised through the costing workflow';
    end if;
    if exists (
      select 1
      from public.sales_contract_items contract_line
      join public.quotation_items quotation_line
        on quotation_line.id = contract_line.quotation_item_id
      where quotation_line.quotation_id = current_quotation.id
    ) then
      raise exception 'A quotation used by a sales contract cannot have its lines replaced';
    end if;
    if p_header ? 'company_id'
       and nullif(p_header ->> 'company_id', '')::uuid
         is distinct from current_quotation.company_id then
      raise exception 'An existing quotation cannot be moved to another company';
    end if;
  end if;

  target_inquiry_id := case
    when p_header ? 'inquiry_id' then nullif(p_header ->> 'inquiry_id', '')::uuid
    when p_quotation_id is not null then current_quotation.inquiry_id
    else null
  end;
  if p_quotation_id is not null
     and current_quotation.inquiry_id is not null
     and target_inquiry_id is distinct from current_quotation.inquiry_id then
    raise exception 'An existing quotation cannot be moved to another inquiry';
  end if;

  if target_inquiry_id is not null then
    select * into source_inquiry
    from public.inquiries
    where id = target_inquiry_id and deleted_at is null and is_current;
    if not found then
      raise exception 'Current source inquiry was not found';
    end if;
  end if;

  target_company_id := case
    when p_quotation_id is not null then current_quotation.company_id
    when target_inquiry_id is not null then source_inquiry.company_id
    else nullif(p_header ->> 'company_id', '')::uuid
  end;
  if target_company_id is null or not exists (
    select 1 from public.companies
    where id = target_company_id and deleted_at is null
  ) then
    raise exception 'Customer company was not found';
  end if;
  if target_inquiry_id is not null
     and p_header ? 'company_id'
     and nullif(p_header ->> 'company_id', '')::uuid
       is distinct from source_inquiry.company_id then
    raise exception 'Quotation company must match its inquiry';
  end if;

  target_contact_id := case
    when p_header ? 'contact_id' then nullif(p_header ->> 'contact_id', '')::uuid
    when p_quotation_id is not null then current_quotation.contact_id
    when target_inquiry_id is not null then source_inquiry.contact_id
    else null
  end;

  target_seller_id := case
    when p_header ? 'seller_entity_id' then nullif(p_header ->> 'seller_entity_id', '')::uuid
    when p_quotation_id is not null then current_quotation.seller_entity_id
    when target_inquiry_id is not null then source_inquiry.seller_entity_id
    else null
  end;
  if target_seller_id is null and p_quotation_id is null then
    select id into target_seller_id
    from public.selling_entities
    where is_active
    order by case when code = 'CACO' then 0 else 1 end, created_at
    limit 1;
  end if;
  if target_seller_id is not null and not exists (
    select 1 from public.selling_entities
    where id = target_seller_id and is_active
  ) then
    raise exception 'Active selling entity was not found';
  end if;

  target_bank_id := case
    when p_header ? 'seller_bank_account_id'
      then nullif(p_header ->> 'seller_bank_account_id', '')::uuid
    when p_quotation_id is not null then current_quotation.seller_bank_account_id
    else null
  end;
  if target_bank_id is not null and not exists (
    select 1 from public.seller_bank_accounts
    where id = target_bank_id
      and selling_entity_id = target_seller_id
      and is_active
  ) then
    raise exception 'Active bank account for the selected seller was not found';
  end if;

  target_currency := upper(coalesce(
    nullif(trim(p_header ->> 'currency'), ''),
    case when p_quotation_id is not null then current_quotation.currency end,
    'USD'
  ));
  if target_currency <> 'USD' then
    raise exception 'The current sales workflow supports USD only';
  end if;

  target_quotation_date := case
    when p_header ? 'quotation_date'
      then nullif(p_header ->> 'quotation_date', '')::date
    when p_quotation_id is not null then current_quotation.quotation_date
    else current_date
  end;
  target_valid_until := case
    when p_header ? 'valid_until'
      then nullif(p_header ->> 'valid_until', '')::date
    when p_quotation_id is not null then current_quotation.valid_until
    else current_date + 30
  end;
  target_latest_shipment_date := case
    when p_header ? 'latest_shipment_date'
      then nullif(p_header ->> 'latest_shipment_date', '')::date
    when p_quotation_id is not null then current_quotation.latest_shipment_date
    else null
  end;
  if target_quotation_date is null then
    raise exception 'Quotation date is required';
  end if;
  if p_quotation_id is not null
     and current_quotation.sequence_year is not null
     and extract(year from target_quotation_date)::integer
       <> current_quotation.sequence_year then
    raise exception 'Quotation date cannot move an existing document to another numbering year';
  end if;
  if target_valid_until is null or target_valid_until < target_quotation_date then
    raise exception 'Quotation validity cannot be before the quotation date';
  end if;

  target_freight := case when p_header ? 'freight'
    then coalesce(nullif(p_header ->> 'freight', '')::numeric, 0)
    when p_quotation_id is not null then current_quotation.freight else 0 end;
  target_insurance := case when p_header ? 'insurance'
    then coalesce(nullif(p_header ->> 'insurance', '')::numeric, 0)
    when p_quotation_id is not null then current_quotation.insurance else 0 end;
  target_tax := case when p_header ? 'tax_amount'
    then coalesce(nullif(p_header ->> 'tax_amount', '')::numeric, 0)
    when p_quotation_id is not null then current_quotation.tax_amount else 0 end;
  target_other_charges := case when p_header ? 'other_charges'
    then coalesce(nullif(p_header ->> 'other_charges', '')::numeric, 0)
    when p_quotation_id is not null then current_quotation.other_charges else 0 end;
  if target_freight < 0 or target_insurance < 0
     or target_tax < 0 or target_other_charges < 0 then
    raise exception 'Quotation charges cannot be negative';
  end if;

  target_advance := case when p_header ? 'payment_advance_percent'
    then nullif(p_header ->> 'payment_advance_percent', '')::numeric
    when p_quotation_id is not null then current_quotation.payment_advance_percent
    else null end;
  target_balance := case when p_header ? 'payment_balance_percent'
    then nullif(p_header ->> 'payment_balance_percent', '')::numeric
    when p_quotation_id is not null then current_quotation.payment_balance_percent
    else null end;
  if target_advance is not null and (target_advance < 0 or target_advance > 100) then
    raise exception 'Advance percentage must be between 0 and 100';
  end if;
  if target_balance is not null and (target_balance < 0 or target_balance > 100) then
    raise exception 'Balance percentage must be between 0 and 100';
  end if;
  if target_advance is not null and target_balance is not null
     and round(target_advance + target_balance, 4) <> 100 then
    raise exception 'Advance and balance percentages must total 100';
  end if;

  target_shipment_method := case
    when p_header ? 'shipment_method'
      then nullif(trim(p_header ->> 'shipment_method'), '')
    when p_quotation_id is not null then current_quotation.shipment_method
    else null
  end;
  if target_shipment_method is not null and target_shipment_method not in (
    'container', 'breakbulk', 'ro_ro', 'truck', 'rail', 'other'
  ) then
    raise exception 'Invalid shipment method';
  end if;

  target_to_recipients := case
    when p_header ? 'to_recipients'
      then coalesce(p_header -> 'to_recipients', '[]'::jsonb)
    when p_quotation_id is not null then current_quotation.to_recipients
    else '[]'::jsonb
  end;
  target_cc_recipients := case
    when p_header ? 'cc_recipients'
      then coalesce(p_header -> 'cc_recipients', '[]'::jsonb)
    when p_quotation_id is not null then current_quotation.cc_recipients
    else '[]'::jsonb
  end;
  if jsonb_typeof(target_to_recipients) <> 'array'
     or jsonb_typeof(target_cc_recipients) <> 'array' then
    raise exception 'Quotation recipients must be JSON arrays';
  end if;
  if jsonb_array_length(target_to_recipients) = 0 then
    raise exception 'Add at least one To recipient';
  end if;
  if jsonb_array_length(target_to_recipients) > 50
     or jsonb_array_length(target_cc_recipients) > 50 then
    raise exception 'A quotation cannot contain more than 50 To or CC recipients';
  end if;

  for recipient_data in
    select value
    from jsonb_array_elements(target_to_recipients || target_cc_recipients)
  loop
    if jsonb_typeof(recipient_data) <> 'object' then
      raise exception 'Each quotation recipient must be an object';
    end if;
    select string_agg(key, ', ' order by key)
    into invalid_key
    from jsonb_object_keys(recipient_data) as supplied(key)
    where key <> all (array['name', 'email']::text[]);
    if invalid_key is not null then
      raise exception 'Unsupported quotation recipient fields: %', invalid_key;
    end if;
    if jsonb_typeof(recipient_data -> 'email') <> 'string'
       or (
         recipient_data ? 'name'
         and jsonb_typeof(recipient_data -> 'name') not in ('string', 'null')
       ) then
      raise exception 'Quotation recipient name and email must be text';
    end if;
    invalid_email := lower(trim(coalesce(recipient_data ->> 'email', '')));
    if invalid_email = ''
       or invalid_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
      raise exception 'Invalid quotation recipient email: %', invalid_email;
    end if;
  end loop;

  select email into duplicate_email
  from (
    select lower(trim(value ->> 'email')) as email, count(*)
    from jsonb_array_elements(target_to_recipients || target_cc_recipients)
    group by lower(trim(value ->> 'email'))
    having count(*) > 1
  ) duplicates
  limit 1;
  if duplicate_email is not null then
    raise exception 'Duplicate quotation recipient email: %', duplicate_email;
  end if;

  if p_quotation_id is null then
    insert into public.quotations (
      inquiry_id, company_id, contact_id, seller_entity_id,
      seller_bank_account_id, quotation_no, quotation_date, valid_until,
      currency, status, notes, subtotal, freight, insurance, tax_amount,
      other_charges, total_amount, payment_advance_percent,
      payment_balance_percent, payment_method, payment_balance_trigger,
      payment_terms, incoterm_rule, named_place, incoterms_version,
      loading_port, discharge_port, shipment_method,
      partial_shipment_allowed, transshipment_allowed,
      expected_readiness_date, origin_country, producing_mill,
      packing_terms, inspection_terms, documentation_terms,
      to_recipients, cc_recipients, marking_terms,
      latest_shipment_date, special_conditions, created_by
    ) values (
      target_inquiry_id, target_company_id, target_contact_id, target_seller_id,
      target_bank_id, 'PENDING', target_quotation_date, target_valid_until,
      target_currency, 'Draft', nullif(trim(p_header ->> 'notes'), ''),
      0, target_freight, target_insurance, target_tax, target_other_charges, 0,
      target_advance, target_balance,
      nullif(trim(p_header ->> 'payment_method'), ''),
      nullif(trim(p_header ->> 'payment_balance_trigger'), ''),
      nullif(trim(p_header ->> 'payment_terms'), ''),
      nullif(trim(p_header ->> 'incoterm_rule'), ''),
      nullif(trim(p_header ->> 'named_place'), ''),
      coalesce(nullif(trim(p_header ->> 'incoterms_version'), ''), '2020'),
      nullif(trim(p_header ->> 'loading_port'), ''),
      nullif(trim(p_header ->> 'discharge_port'), ''),
      target_shipment_method,
      nullif(p_header ->> 'partial_shipment_allowed', '')::boolean,
      nullif(p_header ->> 'transshipment_allowed', '')::boolean,
      nullif(p_header ->> 'expected_readiness_date', '')::date,
      nullif(trim(p_header ->> 'origin_country'), ''),
      nullif(trim(p_header ->> 'producing_mill'), ''),
      nullif(trim(p_header ->> 'packing_terms'), ''),
      nullif(trim(p_header ->> 'inspection_terms'), ''),
      nullif(trim(p_header ->> 'documentation_terms'), ''),
      target_to_recipients, target_cc_recipients,
      nullif(trim(p_header ->> 'marking_terms'), ''),
      target_latest_shipment_date,
      nullif(trim(p_header ->> 'special_conditions'), ''), auth.uid()
    )
    returning * into saved_quotation;
  else
    update public.quotations set
      inquiry_id = target_inquiry_id,
      contact_id = target_contact_id,
      seller_entity_id = target_seller_id,
      seller_bank_account_id = target_bank_id,
      quotation_date = target_quotation_date,
      valid_until = target_valid_until,
      currency = target_currency,
      notes = case when p_header ? 'notes'
        then nullif(trim(p_header ->> 'notes'), '') else notes end,
      freight = target_freight,
      insurance = target_insurance,
      tax_amount = target_tax,
      other_charges = target_other_charges,
      payment_advance_percent = target_advance,
      payment_balance_percent = target_balance,
      payment_method = case when p_header ? 'payment_method'
        then nullif(trim(p_header ->> 'payment_method'), '') else payment_method end,
      payment_balance_trigger = case when p_header ? 'payment_balance_trigger'
        then nullif(trim(p_header ->> 'payment_balance_trigger'), '')
        else payment_balance_trigger end,
      payment_terms = case when p_header ? 'payment_terms'
        then nullif(trim(p_header ->> 'payment_terms'), '') else payment_terms end,
      incoterm_rule = case when p_header ? 'incoterm_rule'
        then nullif(trim(p_header ->> 'incoterm_rule'), '') else incoterm_rule end,
      named_place = case when p_header ? 'named_place'
        then nullif(trim(p_header ->> 'named_place'), '') else named_place end,
      incoterms_version = case when p_header ? 'incoterms_version'
        then coalesce(nullif(trim(p_header ->> 'incoterms_version'), ''), '2020')
        else incoterms_version end,
      loading_port = case when p_header ? 'loading_port'
        then nullif(trim(p_header ->> 'loading_port'), '') else loading_port end,
      discharge_port = case when p_header ? 'discharge_port'
        then nullif(trim(p_header ->> 'discharge_port'), '') else discharge_port end,
      shipment_method = target_shipment_method,
      partial_shipment_allowed = case when p_header ? 'partial_shipment_allowed'
        then nullif(p_header ->> 'partial_shipment_allowed', '')::boolean
        else partial_shipment_allowed end,
      transshipment_allowed = case when p_header ? 'transshipment_allowed'
        then nullif(p_header ->> 'transshipment_allowed', '')::boolean
        else transshipment_allowed end,
      expected_readiness_date = case when p_header ? 'expected_readiness_date'
        then nullif(p_header ->> 'expected_readiness_date', '')::date
        else expected_readiness_date end,
      origin_country = case when p_header ? 'origin_country'
        then nullif(trim(p_header ->> 'origin_country'), '') else origin_country end,
      producing_mill = case when p_header ? 'producing_mill'
        then nullif(trim(p_header ->> 'producing_mill'), '') else producing_mill end,
      packing_terms = case when p_header ? 'packing_terms'
        then nullif(trim(p_header ->> 'packing_terms'), '') else packing_terms end,
      inspection_terms = case when p_header ? 'inspection_terms'
        then nullif(trim(p_header ->> 'inspection_terms'), '') else inspection_terms end,
      documentation_terms = case when p_header ? 'documentation_terms'
        then nullif(trim(p_header ->> 'documentation_terms'), '') else documentation_terms end,
      to_recipients = target_to_recipients,
      cc_recipients = target_cc_recipients,
      marking_terms = case when p_header ? 'marking_terms'
        then nullif(trim(p_header ->> 'marking_terms'), '') else marking_terms end,
      latest_shipment_date = target_latest_shipment_date,
      special_conditions = case when p_header ? 'special_conditions'
        then nullif(trim(p_header ->> 'special_conditions'), '') else special_conditions end
    where id = current_quotation.id
    returning * into saved_quotation;

    replacement_marker := auth.uid()::text || ':' || txid_current()::text;
    perform set_config('caco.v2_line_replacement', replacement_marker, true);
    delete from public.quotation_items where quotation_id = current_quotation.id;
    perform set_config('caco.v2_line_replacement', '', true);
  end if;

  for item_data in select value from jsonb_array_elements(p_items) loop
    item_number := item_number + 1;
    if jsonb_typeof(item_data) <> 'object' then
      raise exception 'Quotation line % must be a JSON object', item_number;
    end if;

    select string_agg(key, ', ' order by key)
    into invalid_key
    from jsonb_object_keys(item_data) as supplied(key)
    where key <> all (array[
      'id', 'line_no', 'inquiry_item_id', 'costing_line_id',
      'customer_item_code',
      'internal_product_code', 'product_name', 'grade', 'standard',
      'dimensions_text', 'specification_snapshot', 'quantity', 'unit',
      'tolerance_minus', 'tolerance_plus', 'tolerance_unit',
      'invoicing_basis', 'unit_price', 'amount'
    ]::text[]);
    if invalid_key is not null then
      raise exception 'Unsupported fields on quotation line %: %', item_number, invalid_key;
    end if;

    item_name := trim(coalesce(item_data ->> 'product_name', ''));
    item_quantity := nullif(item_data ->> 'quantity', '')::numeric;
    item_unit_price := nullif(item_data ->> 'unit_price', '')::numeric;
    if nullif(item_data ->> 'costing_line_id', '')::uuid is not null then
      raise exception 'Costing line references are managed by the costing workflow on quotation line %', item_number;
    end if;
    if item_name = '' then
      raise exception 'Product name is required on quotation line %', item_number;
    end if;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Quantity must be greater than zero on quotation line %', item_number;
    end if;
    if item_unit_price is null or item_unit_price <= 0 then
      raise exception 'Unit price must be greater than zero on quotation line %', item_number;
    end if;
    if coalesce(nullif(item_data ->> 'tolerance_unit', ''), 'percent')
       not in ('percent', 'MT') then
      raise exception 'Invalid tolerance unit on quotation line %', item_number;
    end if;
    if coalesce(nullif(item_data ->> 'invoicing_basis', ''), 'actual_net_weight')
       not in ('actual_net_weight', 'theoretical_weight', 'pieces') then
      raise exception 'Invalid invoicing basis on quotation line %', item_number;
    end if;
    if item_data ? 'specification_snapshot'
       and jsonb_typeof(item_data -> 'specification_snapshot') <> 'object' then
      raise exception 'Specification snapshot must be an object on quotation line %', item_number;
    end if;
    if nullif(item_data ->> 'inquiry_item_id', '')::uuid is not null
       and (
         target_inquiry_id is null
         or not exists (
           select 1 from public.inquiry_items
           where id = nullif(item_data ->> 'inquiry_item_id', '')::uuid
             and inquiry_id = target_inquiry_id
         )
       ) then
      raise exception 'Inquiry line reference is outside the quotation inquiry on line %', item_number;
    end if;

    item_amount := round(item_quantity * item_unit_price, 2);
    calculated_subtotal := calculated_subtotal + item_amount;

    insert into public.quotation_items (
      quotation_id, inquiry_item_id, line_no, customer_item_code,
      internal_product_code, product_name, grade, standard, dimensions_text,
      specification_snapshot, quantity, unit, tolerance_minus,
      tolerance_plus, tolerance_unit, invoicing_basis, unit_price, amount
    ) values (
      saved_quotation.id,
      nullif(item_data ->> 'inquiry_item_id', '')::uuid,
      item_number,
      nullif(trim(item_data ->> 'customer_item_code'), ''),
      nullif(trim(item_data ->> 'internal_product_code'), ''),
      item_name,
      nullif(trim(item_data ->> 'grade'), ''),
      nullif(trim(item_data ->> 'standard'), ''),
      nullif(trim(item_data ->> 'dimensions_text'), ''),
      coalesce(item_data -> 'specification_snapshot', '{}'::jsonb),
      item_quantity,
      coalesce(nullif(trim(item_data ->> 'unit'), ''), 'MT'),
      nullif(item_data ->> 'tolerance_minus', '')::numeric,
      nullif(item_data ->> 'tolerance_plus', '')::numeric,
      coalesce(nullif(item_data ->> 'tolerance_unit', ''), 'percent'),
      coalesce(nullif(item_data ->> 'invoicing_basis', ''), 'actual_net_weight'),
      round(item_unit_price, 2), item_amount
    );
  end loop;

  update public.quotations set
    subtotal = calculated_subtotal,
    total_amount = round(
      calculated_subtotal + target_freight + target_insurance
      + target_tax + target_other_charges,
      2
    )
  where id = saved_quotation.id
  returning * into saved_quotation;

  perform private.sales_record_audit(
    saved_quotation.company_id, 'quotation', saved_quotation.id,
    case when p_quotation_id is null then 'created_v2' else 'updated_v2' end,
    case when p_quotation_id is null then null else current_quotation.status end,
    'Draft', null,
    jsonb_build_object(
      'line_count', item_number,
      'subtotal', calculated_subtotal,
      'total_amount', saved_quotation.total_amount,
      'source', 'hybrid_editor'
    )
  );

  return saved_quotation;
end;
$$;

revoke all on function public.save_quotation_v2(uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_quotation_v2(uuid, jsonb, jsonb)
  to authenticated;

notify pgrst, 'reload schema';

commit;
