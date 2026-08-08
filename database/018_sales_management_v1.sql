-- CACO Business Platform - Sales Management V1
--
-- Adds the approved inquiry -> supplier RFQ -> supplier offer -> costing ->
-- quotation -> sales contract -> order/operation workflow.
-- This migration is additive and preserves the existing CRM and legacy sales data.

begin;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Shared helpers and atomic annual numbering
-- ---------------------------------------------------------------------------

create table if not exists private.sales_number_sequences (
  document_type text not null,
  sequence_year integer not null,
  scope_id uuid not null default '00000000-0000-0000-0000-000000000000',
  last_value bigint not null default 0,
  primary key (document_type, sequence_year, scope_id)
);

create or replace function private.sales_next_number(
  target_document_type text,
  target_year integer,
  target_scope_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  next_value bigint;
begin
  if target_year < 2000 or target_year > 9999 then
    raise exception 'Invalid sequence year';
  end if;

  if upper(trim(coalesce(target_document_type, ''))) not in (
    'INQ', 'QT', 'SC', 'ORD', 'PI', 'INV'
  ) then
    raise exception 'Invalid sales document type: %', target_document_type;
  end if;

  insert into private.sales_number_sequences as seq
    (document_type, sequence_year, scope_id, last_value)
  values (
    upper(trim(target_document_type)),
    target_year,
    coalesce(target_scope_id, '00000000-0000-0000-0000-000000000000'::uuid),
    1
  )
  on conflict (document_type, sequence_year, scope_id)
  do update
    set last_value = seq.last_value + 1
  returning last_value into next_value;

  return next_value;
end;
$$;

create or replace function private.sales_format_sequence(sequence_value bigint)
returns text
language sql
immutable
as $$
  select case
    when sequence_value < 1000 then lpad(sequence_value::text, 3, '0')
    else sequence_value::text
  end
$$;

create or replace function private.is_approved_sales_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approval_status = 'approved'
  )
$$;

revoke all on function private.sales_next_number(text, integer, uuid) from public, anon, authenticated;
revoke all on function private.sales_format_sequence(bigint) from public, anon, authenticated;
revoke all on function private.is_approved_sales_admin() from public, anon, authenticated;

create or replace function private.sales_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seller identity, banks, terms and document categories
-- ---------------------------------------------------------------------------

create table if not exists public.selling_entities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  code text not null,
  legal_name text not null,
  formal_address text,
  registration_number text,
  country text,
  logo_path text,
  document_footer text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id),
  unique (code)
);

insert into public.selling_entities (
  company_id,
  code,
  legal_name,
  formal_address,
  registration_number,
  country
)
select
  company.id,
  'CACO',
  company.name,
  company.formal_address,
  company.registration_number,
  company.country
from public.companies company
where lower(company.name) = 'caco steel'
on conflict do nothing;

create table if not exists public.seller_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  selling_entity_id uuid not null references public.selling_entities(id),
  account_name text not null,
  bank_name text not null,
  bank_address text,
  iban text,
  swift_code text,
  account_number text,
  currency text not null default 'USD',
  beneficiary_name text,
  intermediary_bank text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.general_conditions_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  title text not null default 'CACO General Conditions of Sale',
  content text not null,
  effective_from date,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.general_conditions_versions (version_code, content)
values (
  'v1.0-draft',
  'Draft placeholder. Legal review is required before these conditions may be published or used in a sent sales contract.'
)
on conflict (version_code) do nothing;

create table if not exists public.sales_document_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_generated boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sales_document_categories (code, name, is_generated)
values
  ('client_inquiry', 'Original Client Inquiry', false),
  ('supplier_rfq_pdf', 'Supplier RFQ PDF', true),
  ('supplier_rfq_excel', 'Supplier RFQ Excel', true),
  ('supplier_offer', 'Supplier Offer', false),
  ('customer_quotation', 'Customer Quotation', true),
  ('sales_contract', 'Sales Contract', true),
  ('signed_contract', 'Signed Contract', false),
  ('proforma_invoice', 'Proforma Invoice', true),
  ('commercial_invoice', 'Commercial Invoice', true),
  ('packing_list', 'Packing List', true),
  ('bill_of_lading', 'Bill of Lading', false),
  ('cmr', 'CMR', false),
  ('certificate_of_origin', 'Certificate of Origin', false),
  ('mill_test_certificate', 'Mill Test Certificate', false),
  ('inspection_certificate', 'Inspection Certificate', false),
  ('insurance_document', 'Insurance Document', false),
  ('customs_document', 'Customs Document', false),
  ('payment_receipt', 'Payment Receipt', false),
  ('other', 'Other', false)
on conflict do nothing;

-- Admin-managed technical templates keep common steel fields structured while
-- allowing product-specific additions without a schema change.
create table if not exists public.product_specification_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_specification_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.product_specification_templates(id),
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in (
    'text', 'number', 'boolean', 'date', 'select'
  )),
  unit text,
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, field_key)
);

-- Generic, versioned sales-file register. The binary files use the private
-- sales-documents Storage bucket created later in this migration.
create table if not exists public.sales_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  category_id uuid not null references public.sales_document_categories(id),
  entity_type text not null check (entity_type in (
    'inquiry', 'supplier_rfq', 'supplier_offer', 'costing', 'quotation',
    'sales_contract', 'order', 'shipment', 'invoice', 'payment'
  )),
  entity_id uuid not null,
  title text not null,
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null check (file_size >= 0),
  mime_type text,
  version_no integer not null default 1 check (version_no > 0),
  supersedes_document_id uuid references public.sales_documents(id),
  visible_to_customer boolean not null default false,
  is_immutable boolean not null default true,
  uploaded_by uuid not null references public.profiles(id) default auth.uid(),
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create index if not exists sales_documents_entity_idx
  on public.sales_documents (entity_type, entity_id, uploaded_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Client inquiries and structured technical lines
-- ---------------------------------------------------------------------------

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  contact_id uuid references public.company_contacts(id),
  inquiry_no text,
  inquiry_date date not null default current_date,
  status text not null default 'Draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiries add column if not exists seller_entity_id uuid references public.selling_entities(id);
alter table public.inquiries add column if not exists customer_reference text;
alter table public.inquiries add column if not exists received_at timestamptz;
alter table public.inquiries add column if not exists currency text not null default 'USD';
alter table public.inquiries add column if not exists sequence_year integer;
alter table public.inquiries add column if not exists sequence_no bigint;
alter table public.inquiries add column if not exists revision_no integer not null default 0;
alter table public.inquiries add column if not exists root_inquiry_id uuid references public.inquiries(id);
alter table public.inquiries add column if not exists is_current boolean not null default true;
alter table public.inquiries add column if not exists total_tolerance_minus numeric(12,3);
alter table public.inquiries add column if not exists total_tolerance_plus numeric(12,3);
alter table public.inquiries add column if not exists total_tolerance_unit text default 'percent';
alter table public.inquiries add column if not exists loading_port text;
alter table public.inquiries add column if not exists discharge_port text;
alter table public.inquiries add column if not exists requested_incoterms jsonb not null default '[]'::jsonb;
alter table public.inquiries add column if not exists required_documents text;
alter table public.inquiries add column if not exists packing_requirements text;
alter table public.inquiries add column if not exists readiness_requirement text;
alter table public.inquiries add column if not exists reason text;
alter table public.inquiries add column if not exists created_by uuid references public.profiles(id) default auth.uid();
alter table public.inquiries add column if not exists deleted_at timestamptz;
alter table public.inquiries add column if not exists deleted_by uuid references public.profiles(id);

create unique index if not exists inquiries_generated_reference_unique
  on public.inquiries (sequence_year, sequence_no, revision_no)
  where sequence_year is not null and sequence_no is not null;

create table if not exists public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  line_no integer not null,
  product_id uuid,
  product_name text not null,
  customer_item_code text,
  internal_product_code text,
  grade text,
  standard text,
  thickness_mm numeric(12,4),
  width_mm numeric(12,3),
  length_mm numeric(12,3),
  coating text,
  color_ral text,
  surface_treatment text,
  coil_inner_diameter_mm numeric(12,3),
  coil_outer_diameter_mm numeric(12,3),
  target_coil_weight_mt numeric(12,3),
  quantity numeric(14,3) not null,
  unit text not null default 'MT',
  tolerance_minus numeric(12,3),
  tolerance_plus numeric(12,3),
  tolerance_unit text not null default 'percent' check (tolerance_unit in ('percent', 'MT')),
  invoicing_basis text not null default 'actual_net_weight' check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  theoretical_unit_weight_kg numeric(14,6),
  theoretical_weight_override_note text,
  pieces_per_bundle integer,
  additional_specification text,
  packing_requirements text,
  required_documents text,
  specification_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inquiry_id, line_no)
);

-- ---------------------------------------------------------------------------
-- Supplier RFQs, separate recipient records and supplier offers
-- ---------------------------------------------------------------------------

create table if not exists public.supplier_rfqs (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id),
  inquiry_root_id uuid not null references public.inquiries(id),
  supplier_company_id uuid not null references public.companies(id),
  rfq_no text not null,
  supplier_ordinal integer not null check (supplier_ordinal > 0),
  revision_no integer not null default 0 check (revision_no >= 0),
  root_rfq_id uuid references public.supplier_rfqs(id),
  is_current boolean not null default true,
  status text not null default 'Draft' check (status in (
    'Draft', 'Sent', 'Awaiting Response', 'Offer Received', 'Declined',
    'Expired', 'Superseded'
  )),
  hide_customer_identity boolean not null default true,
  currency text not null default 'USD',
  response_deadline date not null default (current_date + 7),
  email_subject text,
  email_body text,
  sent_at timestamptz,
  sent_by uuid references public.profiles(id),
  reason text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  unique (inquiry_root_id, supplier_ordinal, revision_no),
  unique (rfq_no)
);

create index if not exists supplier_rfqs_inquiry_idx
  on public.supplier_rfqs (inquiry_root_id, supplier_ordinal, revision_no desc)
  where deleted_at is null;

create table if not exists public.supplier_rfq_contacts (
  rfq_id uuid not null references public.supplier_rfqs(id) on delete cascade,
  contact_id uuid not null references public.company_contacts(id),
  recipient_type text not null default 'to' check (recipient_type in ('to', 'cc')),
  primary key (rfq_id, contact_id)
);

create table if not exists public.supplier_rfq_lines (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.supplier_rfqs(id) on delete cascade,
  inquiry_item_id uuid not null references public.inquiry_items(id),
  line_no integer not null,
  requested_quantity numeric(14,3) not null,
  unit text not null default 'MT',
  specification_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (rfq_id, line_no)
);

create table if not exists public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.supplier_rfqs(id),
  supplier_reference text,
  offer_date date not null default current_date,
  valid_until date,
  status text not null default 'Received' check (status in (
    'Received', 'Under Review', 'Selected', 'Partially Selected', 'Rejected', 'Expired'
  )),
  currency text not null default 'USD',
  advance_payment_percent numeric(7,4),
  balance_payment_percent numeric(7,4),
  payment_method text,
  payment_balance_trigger text,
  payment_notes text,
  origin_country text,
  producing_mill text,
  producing_mill_visible boolean not null default false,
  shipment_method text check (shipment_method in (
    'container', 'breakbulk', 'ro_ro', 'truck', 'rail', 'other'
  )),
  packing_conditions text,
  inspection_conditions text,
  documentation_conditions text,
  general_deviations text,
  received_at timestamptz not null default now(),
  received_by uuid not null references public.profiles(id) default auth.uid(),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  constraint supplier_offer_payment_percentages check (
    advance_payment_percent is null or balance_payment_percent is null
    or round(advance_payment_percent + balance_payment_percent, 4) = 100
  )
);

create table if not exists public.supplier_offer_options (
  id uuid primary key default gen_random_uuid(),
  supplier_offer_id uuid not null references public.supplier_offers(id) on delete cascade,
  option_no integer not null,
  label text,
  incoterm_rule text,
  named_place text,
  incoterms_version text not null default '2020',
  loading_port text,
  discharge_port text,
  partial_shipment_allowed boolean,
  transshipment_allowed boolean,
  production_readiness_date date,
  lead_time_days integer,
  freight_included boolean not null default false,
  insurance_included boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (supplier_offer_id, option_no)
);

create table if not exists public.supplier_offer_lines (
  id uuid primary key default gen_random_uuid(),
  supplier_offer_option_id uuid not null references public.supplier_offer_options(id) on delete cascade,
  rfq_line_id uuid not null references public.supplier_rfq_lines(id),
  is_offered boolean not null default true,
  offered_quantity numeric(14,3),
  unit text not null default 'MT',
  unit_price numeric(16,2),
  supplier_item_code text,
  tolerance_minus numeric(12,3),
  tolerance_plus numeric(12,3),
  tolerance_unit text default 'percent' check (tolerance_unit in ('percent', 'MT')),
  technical_deviations text,
  commercial_deviations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_offer_option_id, rfq_line_id),
  constraint offered_line_has_price check (
    not is_offered or (offered_quantity is not null and unit_price is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Internal costing and customer quotations
-- ---------------------------------------------------------------------------

create table if not exists public.costing_scenarios (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id),
  name text not null,
  currency text not null default 'USD',
  status text not null default 'Draft' check (status in ('Draft', 'Selected', 'Archived')),
  notes text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create table if not exists public.costing_lines (
  id uuid primary key default gen_random_uuid(),
  costing_scenario_id uuid not null references public.costing_scenarios(id) on delete cascade,
  inquiry_item_id uuid not null references public.inquiry_items(id),
  supplier_offer_line_id uuid not null references public.supplier_offer_lines(id),
  quantity numeric(14,3) not null,
  supplier_unit_price numeric(16,2) not null,
  landed_unit_cost numeric(16,2) not null default 0,
  margin_method text not null default 'percentage' check (margin_method in ('per_mt', 'percentage')),
  margin_value numeric(16,4) not null default 0,
  calculated_sales_unit_price numeric(16,2) not null default 0,
  selected_for_quotation boolean not null default false,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (costing_scenario_id, inquiry_item_id)
);

create table if not exists public.costing_adjustments (
  id uuid primary key default gen_random_uuid(),
  costing_scenario_id uuid not null references public.costing_scenarios(id) on delete cascade,
  costing_line_id uuid references public.costing_lines(id) on delete cascade,
  category text not null check (category in (
    'freight', 'insurance', 'inspection', 'banking', 'financing',
    'commission', 'handling', 'tax', 'other'
  )),
  description text,
  calculation_method text not null check (calculation_method in ('per_mt', 'fixed_total', 'percentage')),
  value numeric(16,4) not null,
  calculated_amount numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id),
  quotation_no text,
  quotation_date date not null default current_date,
  valid_until date,
  currency text not null default 'USD',
  total_amount numeric(16,2) not null default 0,
  status text not null default 'Draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotations add column if not exists company_id uuid references public.companies(id);
alter table public.quotations add column if not exists contact_id uuid references public.company_contacts(id);
alter table public.quotations add column if not exists seller_entity_id uuid references public.selling_entities(id);
alter table public.quotations add column if not exists seller_bank_account_id uuid references public.seller_bank_accounts(id);
alter table public.quotations add column if not exists costing_scenario_id uuid references public.costing_scenarios(id);
alter table public.quotations add column if not exists sequence_year integer;
alter table public.quotations add column if not exists sequence_no bigint;
alter table public.quotations add column if not exists revision_no integer not null default 0;
alter table public.quotations add column if not exists root_quotation_id uuid references public.quotations(id);
alter table public.quotations add column if not exists is_current boolean not null default true;
alter table public.quotations add column if not exists subtotal numeric(16,2) not null default 0;
alter table public.quotations add column if not exists freight numeric(16,2) not null default 0;
alter table public.quotations add column if not exists insurance numeric(16,2) not null default 0;
alter table public.quotations add column if not exists tax_amount numeric(16,2) not null default 0;
alter table public.quotations add column if not exists other_charges numeric(16,2) not null default 0;
alter table public.quotations add column if not exists payment_advance_percent numeric(7,4);
alter table public.quotations add column if not exists payment_balance_percent numeric(7,4);
alter table public.quotations add column if not exists payment_method text;
alter table public.quotations add column if not exists payment_balance_trigger text;
alter table public.quotations add column if not exists payment_terms text;
alter table public.quotations add column if not exists incoterm_rule text;
alter table public.quotations add column if not exists named_place text;
alter table public.quotations add column if not exists incoterms_version text not null default '2020';
alter table public.quotations add column if not exists loading_port text;
alter table public.quotations add column if not exists discharge_port text;
alter table public.quotations add column if not exists shipment_method text;
alter table public.quotations add column if not exists partial_shipment_allowed boolean;
alter table public.quotations add column if not exists transshipment_allowed boolean;
alter table public.quotations add column if not exists expected_readiness_date date;
alter table public.quotations add column if not exists origin_country text;
alter table public.quotations add column if not exists producing_mill text;
alter table public.quotations add column if not exists packing_terms text;
alter table public.quotations add column if not exists inspection_terms text;
alter table public.quotations add column if not exists documentation_terms text;
alter table public.quotations add column if not exists sent_at timestamptz;
alter table public.quotations add column if not exists accepted_at timestamptz;
alter table public.quotations add column if not exists reason text;
alter table public.quotations add column if not exists created_by uuid references public.profiles(id) default auth.uid();
alter table public.quotations add column if not exists deleted_at timestamptz;
alter table public.quotations add column if not exists deleted_by uuid references public.profiles(id);

create unique index if not exists quotations_generated_reference_unique
  on public.quotations (sequence_year, sequence_no, revision_no)
  where sequence_year is not null and sequence_no is not null;

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  inquiry_item_id uuid references public.inquiry_items(id),
  costing_line_id uuid references public.costing_lines(id),
  line_no integer not null,
  customer_item_code text,
  internal_product_code text,
  product_name text not null,
  grade text,
  standard text,
  dimensions_text text,
  specification_snapshot jsonb not null default '{}'::jsonb,
  quantity numeric(14,3) not null,
  unit text not null default 'MT',
  tolerance_minus numeric(12,3),
  tolerance_plus numeric(12,3),
  tolerance_unit text not null default 'percent' check (tolerance_unit in ('percent', 'MT')),
  invoicing_basis text not null default 'actual_net_weight' check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  unit_price numeric(16,2) not null,
  amount numeric(16,2) not null,
  created_at timestamptz not null default now(),
  unique (quotation_id, line_no)
);

-- ---------------------------------------------------------------------------
-- Sales contracts, versioned terms and quotation snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.sales_contracts (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id),
  company_id uuid not null references public.companies(id),
  contact_id uuid references public.company_contacts(id),
  seller_entity_id uuid not null references public.selling_entities(id),
  seller_bank_account_id uuid references public.seller_bank_accounts(id),
  general_conditions_version_id uuid references public.general_conditions_versions(id),
  contract_no text not null,
  contract_date date not null default current_date,
  sequence_year integer not null,
  sequence_no bigint not null,
  revision_no integer not null default 0 check (revision_no >= 0),
  amendment_no integer not null default 0 check (amendment_no >= 0),
  root_contract_id uuid references public.sales_contracts(id),
  is_current boolean not null default true,
  status text not null default 'Draft' check (status in (
    'Draft', 'Sent', 'Under Negotiation', 'Signature Pending', 'Signed',
    'Cancelled', 'Superseded'
  )),
  currency text not null default 'USD',
  subtotal numeric(16,2) not null default 0,
  freight numeric(16,2) not null default 0,
  insurance numeric(16,2) not null default 0,
  tax_amount numeric(16,2) not null default 0,
  other_charges numeric(16,2) not null default 0,
  total_amount numeric(16,2) not null default 0,
  payment_advance_percent numeric(7,4),
  payment_balance_percent numeric(7,4),
  payment_method text,
  payment_balance_trigger text,
  payment_notes text,
  default_invoicing_basis text not null default 'actual_net_weight' check (
    default_invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  total_tolerance_minus numeric(12,3),
  total_tolerance_plus numeric(12,3),
  total_tolerance_unit text default 'percent' check (total_tolerance_unit in ('percent', 'MT')),
  incoterm_rule text,
  named_place text,
  incoterms_version text not null default '2020',
  loading_port text,
  discharge_port text,
  shipment_method text check (shipment_method in (
    'container', 'breakbulk', 'ro_ro', 'truck', 'rail', 'other'
  )),
  partial_shipment_allowed boolean,
  transshipment_allowed boolean,
  latest_shipment_date date,
  origin_country text,
  producing_mill text,
  packing_terms text,
  inspection_terms text,
  documentation_terms text,
  sent_at timestamptz,
  signed_at timestamptz,
  signed_document_id uuid references public.sales_documents(id),
  signature_override boolean not null default false,
  signature_override_reason text,
  reason text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  unique (contract_no),
  unique (sequence_year, sequence_no, revision_no, amendment_no),
  constraint contract_payment_percentages check (
    payment_advance_percent is null or payment_balance_percent is null
    or round(payment_advance_percent + payment_balance_percent, 4) = 100
  ),
  constraint signed_contract_has_evidence check (
    status <> 'Signed'
    or signed_document_id is not null
    or (signature_override and length(trim(coalesce(signature_override_reason, ''))) > 0)
  )
);

create table if not exists public.sales_contract_items (
  id uuid primary key default gen_random_uuid(),
  sales_contract_id uuid not null references public.sales_contracts(id) on delete cascade,
  quotation_item_id uuid references public.quotation_items(id),
  line_no integer not null,
  customer_item_code text,
  internal_product_code text,
  product_name text not null,
  grade text,
  standard text,
  dimensions_text text,
  specification_snapshot jsonb not null default '{}'::jsonb,
  contract_quantity numeric(14,3) not null,
  unit text not null default 'MT',
  tolerance_minus numeric(12,3),
  tolerance_plus numeric(12,3),
  tolerance_unit text not null default 'percent' check (tolerance_unit in ('percent', 'MT')),
  invoicing_basis text not null default 'actual_net_weight' check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  theoretical_unit_weight_kg numeric(14,6),
  unit_price numeric(16,2) not null,
  amount numeric(16,2) not null,
  created_at timestamptz not null default now(),
  unique (sales_contract_id, line_no)
);

-- ---------------------------------------------------------------------------
-- Orders, shipments, loading allocations, invoices and payments
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references public.quotations(id),
  order_no text,
  order_date date not null default current_date,
  delivery_date date,
  status text not null default 'Draft',
  total_amount numeric(16,2) not null default 0,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists sales_contract_id uuid references public.sales_contracts(id);
alter table public.orders add column if not exists company_id uuid references public.companies(id);
alter table public.orders add column if not exists seller_entity_id uuid references public.selling_entities(id);
alter table public.orders add column if not exists sequence_year integer;
alter table public.orders add column if not exists sequence_no bigint;
alter table public.orders add column if not exists amendment_no integer not null default 0;
alter table public.orders add column if not exists root_order_id uuid references public.orders(id);
alter table public.orders add column if not exists is_current boolean not null default true;
alter table public.orders add column if not exists signature_override boolean not null default false;
alter table public.orders add column if not exists signature_override_reason text;
alter table public.orders add column if not exists reason text;
alter table public.orders add column if not exists created_by uuid references public.profiles(id) default auth.uid();
alter table public.orders add column if not exists deleted_at timestamptz;
alter table public.orders add column if not exists deleted_by uuid references public.profiles(id);

create unique index if not exists orders_generated_reference_unique
  on public.orders (sequence_year, sequence_no, amendment_no)
  where sequence_year is not null and sequence_no is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sales_contract_item_id uuid references public.sales_contract_items(id),
  line_no integer not null,
  product_name text not null,
  product_snapshot jsonb not null default '{}'::jsonb,
  quantity numeric(14,3) not null,
  unit text not null default 'MT',
  tolerance_minus numeric(12,3),
  tolerance_plus numeric(12,3),
  tolerance_unit text not null default 'percent' check (tolerance_unit in ('percent', 'MT')),
  invoicing_basis text not null default 'actual_net_weight' check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  theoretical_unit_weight_kg numeric(14,6),
  unit_price numeric(16,2) not null,
  total_price numeric(16,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_no)
);

alter table public.order_items add column if not exists sales_contract_item_id uuid references public.sales_contract_items(id);
alter table public.order_items add column if not exists line_no integer;
alter table public.order_items add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
alter table public.order_items add column if not exists tolerance_minus numeric(12,3);
alter table public.order_items add column if not exists tolerance_plus numeric(12,3);
alter table public.order_items add column if not exists tolerance_unit text default 'percent';
alter table public.order_items add column if not exists invoicing_basis text default 'actual_net_weight';
alter table public.order_items add column if not exists theoretical_unit_weight_kg numeric(14,6);

create table if not exists public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  shipment_no integer not null,
  shipment_method text not null check (shipment_method in (
    'container', 'breakbulk', 'ro_ro', 'truck', 'rail', 'other'
  )),
  status text not null default 'Planning' check (status in (
    'Planning', 'Loading', 'Loaded', 'Departed', 'Delivered', 'Cancelled'
  )),
  vessel_name text,
  voyage_no text,
  vehicle_reference text,
  loading_port text,
  discharge_port text,
  planned_loading_date date,
  actual_loading_date date,
  departure_date date,
  arrival_date date,
  notes text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  unique (order_id, shipment_no)
);

create table if not exists public.shipment_units (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.order_shipments(id) on delete cascade,
  unit_no integer not null,
  unit_type text not null check (unit_type in (
    'container', 'vessel_hold', 'truck', 'trailer', 'rail_wagon', 'ro_ro_vehicle', 'other'
  )),
  container_number text,
  seal_number text,
  registration_number text,
  trailer_number text,
  wagon_number text,
  hold_reference text,
  packing_marks text,
  tare_weight_mt numeric(14,3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shipment_id, unit_no)
);

create table if not exists public.shipment_loading_lines (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.order_shipments(id) on delete cascade,
  shipment_unit_id uuid references public.shipment_units(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id),
  bundle_count integer,
  coil_count integer,
  piece_count integer,
  pieces_per_bundle integer,
  theoretical_unit_weight_kg numeric(14,6),
  theoretical_total_weight_mt numeric(14,3),
  actual_net_weight_mt numeric(14,3),
  actual_gross_weight_mt numeric(14,3),
  invoicing_basis text not null check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  invoice_quantity numeric(14,3),
  tolerance_status text not null default 'Pending' check (tolerance_status in (
    'Pending', 'Within Tolerance', 'Outside Tolerance', 'Override Approved'
  )),
  tolerance_override_reason text,
  notes text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loading_line_has_measurement check (
    coalesce(bundle_count, 0) > 0
    or coalesce(coil_count, 0) > 0
    or coalesce(piece_count, 0) > 0
    or coalesce(actual_net_weight_mt, 0) > 0
    or coalesce(theoretical_total_weight_mt, 0) > 0
  ),
  constraint outside_tolerance_has_reason check (
    tolerance_status <> 'Override Approved'
    or length(trim(coalesce(tolerance_override_reason, ''))) > 0
  )
);

create table if not exists public.loading_packages (
  id uuid primary key default gen_random_uuid(),
  loading_line_id uuid not null references public.shipment_loading_lines(id) on delete cascade,
  package_type text not null check (package_type in ('bundle', 'coil', 'piece_group', 'other')),
  package_identifier text,
  piece_count integer,
  theoretical_weight_mt numeric(14,3),
  actual_net_weight_mt numeric(14,3),
  actual_gross_weight_mt numeric(14,3),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  shipment_id uuid references public.order_shipments(id),
  company_id uuid not null references public.companies(id),
  seller_entity_id uuid not null references public.selling_entities(id),
  seller_bank_account_id uuid references public.seller_bank_accounts(id),
  invoice_type text not null check (invoice_type in (
    'proforma', 'commercial', 'credit_note', 'debit_note'
  )),
  invoice_no text not null unique,
  invoice_date date not null default current_date,
  sequence_year integer not null,
  sequence_no bigint not null,
  currency text not null default 'USD',
  subtotal numeric(16,2) not null default 0,
  freight numeric(16,2) not null default 0,
  insurance numeric(16,2) not null default 0,
  tax_amount numeric(16,2) not null default 0,
  adjustments_total numeric(16,2) not null default 0,
  total_amount numeric(16,2) not null default 0,
  status text not null default 'Draft' check (status in (
    'Draft', 'Issued', 'Partially Paid', 'Paid', 'Cancelled'
  )),
  issued_at timestamptz,
  reason text,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  unique (invoice_type, sequence_year, sequence_no)
);

create table if not exists public.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id),
  loading_line_id uuid references public.shipment_loading_lines(id),
  line_no integer not null,
  description text not null,
  quantity numeric(14,3) not null,
  unit text not null,
  invoicing_basis text not null check (
    invoicing_basis in ('actual_net_weight', 'theoretical_weight', 'pieces')
  ),
  unit_price numeric(16,2) not null,
  amount numeric(16,2) not null,
  created_at timestamptz not null default now(),
  unique (invoice_id, line_no)
);

create table if not exists public.sales_invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  description text not null,
  adjustment_type text not null check (adjustment_type in ('charge', 'credit', 'tax')),
  amount numeric(16,2) not null,
  approved_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  company_id uuid not null references public.companies(id),
  payment_date date not null,
  amount numeric(16,2) not null check (amount > 0),
  currency text not null default 'USD',
  bank_reference text,
  notes text,
  recorded_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create table if not exists public.invoice_payment_allocations (
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  payment_id uuid not null references public.sales_payments(id) on delete cascade,
  allocated_amount numeric(16,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now(),
  primary key (invoice_id, payment_id)
);

-- Append-only internal history. Sensitive cost information stays in the
-- internal source tables and is never copied into customer-visible rows.
create table if not exists public.sales_audit_events (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  from_status text,
  to_status text,
  reason text,
  details jsonb not null default '{}'::jsonb,
  performed_by uuid references public.profiles(id) default auth.uid(),
  performed_at timestamptz not null default now()
);

create index if not exists sales_audit_entity_idx
  on public.sales_audit_events (entity_type, entity_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- Compatibility upgrades for installations that already have legacy line
-- tables. CREATE TABLE IF NOT EXISTS alone does not add newly approved fields.
-- ---------------------------------------------------------------------------

alter table public.inquiry_items add column if not exists line_no integer;
alter table public.inquiry_items add column if not exists product_id uuid;
alter table public.inquiry_items add column if not exists product_name text;
alter table public.inquiry_items add column if not exists specification_template_id uuid references public.product_specification_templates(id);
alter table public.inquiry_items add column if not exists customer_item_code text;
alter table public.inquiry_items add column if not exists internal_product_code text;
alter table public.inquiry_items add column if not exists grade text;
alter table public.inquiry_items add column if not exists standard text;
alter table public.inquiry_items add column if not exists thickness_mm numeric(12,4);
alter table public.inquiry_items add column if not exists width_mm numeric(12,3);
alter table public.inquiry_items add column if not exists length_mm numeric(12,3);
alter table public.inquiry_items add column if not exists coating text;
alter table public.inquiry_items add column if not exists color_ral text;
alter table public.inquiry_items add column if not exists surface_treatment text;
alter table public.inquiry_items add column if not exists coil_inner_diameter_mm numeric(12,3);
alter table public.inquiry_items add column if not exists coil_outer_diameter_mm numeric(12,3);
alter table public.inquiry_items add column if not exists target_coil_weight_mt numeric(12,3);
alter table public.inquiry_items add column if not exists quantity numeric(14,3);
alter table public.inquiry_items add column if not exists unit text default 'MT';
alter table public.inquiry_items add column if not exists tolerance_minus numeric(12,3);
alter table public.inquiry_items add column if not exists tolerance_plus numeric(12,3);
alter table public.inquiry_items add column if not exists tolerance_unit text default 'percent';
alter table public.inquiry_items add column if not exists invoicing_basis text default 'actual_net_weight';
alter table public.inquiry_items add column if not exists theoretical_unit_weight_kg numeric(14,6);
alter table public.inquiry_items add column if not exists theoretical_weight_override_note text;
alter table public.inquiry_items add column if not exists pieces_per_bundle integer;
alter table public.inquiry_items add column if not exists additional_specification text;
alter table public.inquiry_items add column if not exists packing_requirements text;
alter table public.inquiry_items add column if not exists required_documents text;
alter table public.inquiry_items add column if not exists specification_data jsonb not null default '{}'::jsonb;
alter table public.inquiry_items add column if not exists created_at timestamptz not null default now();
alter table public.inquiry_items add column if not exists updated_at timestamptz not null default now();

with missing_line_numbers as (
  select
    target.id,
    coalesce((
      select max(existing.line_no)
      from public.inquiry_items existing
      where existing.inquiry_id = target.inquiry_id
    ), 0) + row_number() over (
      partition by target.inquiry_id order by target.created_at, target.id
    ) as generated_line_no
  from public.inquiry_items target
  where target.line_no is null
)
update public.inquiry_items target
set line_no = source.generated_line_no
from missing_line_numbers source
where target.id = source.id;

update public.inquiry_items
set product_name = 'Legacy inquiry item'
where product_name is null;

create unique index if not exists inquiry_items_line_unique
  on public.inquiry_items (inquiry_id, line_no);

-- Backfill the former single-product inquiry only when all legacy fields exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'product_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'quantity'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'unit'
  ) then
    execute $legacy$
      insert into public.inquiry_items (
        inquiry_id, line_no, product_id, product_name, quantity, unit,
        specification_data
      )
      select
        inquiry.id,
        1,
        inquiry.product_id,
        coalesce(product.name, 'Legacy inquiry item'),
        coalesce(inquiry.quantity, 0),
        coalesce(inquiry.unit, 'MT'),
        jsonb_build_object('migrated_from_legacy_inquiry', true)
      from public.inquiries inquiry
      left join public.products product on product.id = inquiry.product_id
      where not exists (
        select 1 from public.inquiry_items item where item.inquiry_id = inquiry.id
      )
    $legacy$;
  end if;
end;
$$;

alter table public.quotation_items add column if not exists inquiry_item_id uuid references public.inquiry_items(id);
alter table public.quotation_items add column if not exists costing_line_id uuid references public.costing_lines(id);
alter table public.quotation_items add column if not exists line_no integer;
alter table public.quotation_items add column if not exists customer_item_code text;
alter table public.quotation_items add column if not exists internal_product_code text;
alter table public.quotation_items add column if not exists product_name text;
alter table public.quotation_items add column if not exists grade text;
alter table public.quotation_items add column if not exists standard text;
alter table public.quotation_items add column if not exists dimensions_text text;
alter table public.quotation_items add column if not exists specification_snapshot jsonb not null default '{}'::jsonb;
alter table public.quotation_items add column if not exists quantity numeric(14,3);
alter table public.quotation_items add column if not exists unit text default 'MT';
alter table public.quotation_items add column if not exists tolerance_minus numeric(12,3);
alter table public.quotation_items add column if not exists tolerance_plus numeric(12,3);
alter table public.quotation_items add column if not exists tolerance_unit text default 'percent';
alter table public.quotation_items add column if not exists invoicing_basis text default 'actual_net_weight';
alter table public.quotation_items add column if not exists unit_price numeric(16,2);
alter table public.quotation_items add column if not exists amount numeric(16,2);
alter table public.quotation_items add column if not exists created_at timestamptz not null default now();

alter table public.order_items add column if not exists product_name text;
alter table public.order_items add column if not exists quantity numeric(14,3);
alter table public.order_items add column if not exists unit text default 'MT';
alter table public.order_items add column if not exists unit_price numeric(16,2);
alter table public.order_items add column if not exists total_price numeric(16,2);
alter table public.order_items add column if not exists created_at timestamptz not null default now();
alter table public.order_items add column if not exists updated_at timestamptz not null default now();

create unique index if not exists inquiries_current_series_unique
  on public.inquiries (root_inquiry_id)
  where is_current and root_inquiry_id is not null and deleted_at is null;
create unique index if not exists supplier_rfqs_current_series_unique
  on public.supplier_rfqs (root_rfq_id)
  where is_current and root_rfq_id is not null and deleted_at is null;
create unique index if not exists quotations_current_series_unique
  on public.quotations (root_quotation_id)
  where is_current and root_quotation_id is not null and deleted_at is null;
create unique index if not exists sales_contracts_current_series_unique
  on public.sales_contracts (root_contract_id)
  where is_current and root_contract_id is not null and deleted_at is null;
create unique index if not exists orders_current_series_unique
  on public.orders (root_order_id)
  where is_current and root_order_id is not null and deleted_at is null;

alter table public.supplier_offers add column if not exists revision_no integer not null default 0;
alter table public.supplier_offers add column if not exists root_offer_id uuid references public.supplier_offers(id);
alter table public.supplier_offers add column if not exists supersedes_offer_id uuid references public.supplier_offers(id);
alter table public.supplier_offers add column if not exists is_current boolean not null default true;

create unique index if not exists supplier_offers_current_series_unique
  on public.supplier_offers (root_offer_id)
  where is_current and root_offer_id is not null and deleted_at is null;

-- The supplier/cost source stays in an Admin-only table instead of being
-- exposed through customer quotation queries.
create table if not exists public.quotation_line_sources (
  quotation_item_id uuid primary key references public.quotation_items(id),
  costing_line_id uuid not null references public.costing_lines(id),
  supplier_offer_line_id uuid not null references public.supplier_offer_lines(id),
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.sales_payments add column if not exists payment_type text not null default 'balance';
alter table public.sales_payments add column if not exists direction text not null default 'received';
alter table public.sales_payments add column if not exists document_id uuid references public.sales_documents(id);

alter table public.sales_contracts add column if not exists seller_snapshot jsonb not null default '{}'::jsonb;
alter table public.sales_contracts add column if not exists bank_snapshot jsonb not null default '{}'::jsonb;
alter table public.sales_contracts add column if not exists conditions_snapshot jsonb not null default '{}'::jsonb;
alter table public.sales_invoices add column if not exists seller_snapshot jsonb not null default '{}'::jsonb;
alter table public.sales_invoices add column if not exists bank_snapshot jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_payments_type_check') then
    alter table public.sales_payments add constraint sales_payments_type_check
      check (payment_type in ('advance', 'balance', 'refund', 'adjustment'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_payments_direction_check') then
    alter table public.sales_payments add constraint sales_payments_direction_check
      check (direction in ('received', 'refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_offer_advance_range_check') then
    alter table public.supplier_offers add constraint supplier_offer_advance_range_check
      check (advance_payment_percent is null or advance_payment_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'supplier_offer_balance_range_check') then
    alter table public.supplier_offers add constraint supplier_offer_balance_range_check
      check (balance_payment_percent is null or balance_payment_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_contract_advance_range_check') then
    alter table public.sales_contracts add constraint sales_contract_advance_range_check
      check (payment_advance_percent is null or payment_advance_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_contract_balance_range_check') then
    alter table public.sales_contracts add constraint sales_contract_balance_range_check
      check (payment_balance_percent is null or payment_balance_percent between 0 and 100);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference generation, update timestamps and relationship validation
-- ---------------------------------------------------------------------------

create or replace function private.sales_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  prefix text;
  reference_year integer;
  formatted_sequence text;
  suffix text := '';
begin
  if tg_table_name = 'inquiries' then
    prefix := 'INQ';
    reference_year := coalesce(new.sequence_year, extract(year from coalesce(new.inquiry_date, current_date))::integer);
    new.sequence_year := reference_year;
    if new.sequence_no is null then
      new.sequence_no := private.sales_next_number(prefix, reference_year, null);
    end if;
    new.revision_no := coalesce(new.revision_no, 0);
    if new.revision_no > 0 then suffix := '-v.' || lpad(new.revision_no::text, 2, '0'); end if;
    formatted_sequence := private.sales_format_sequence(new.sequence_no);
    new.inquiry_no := prefix || '-' || reference_year || '-' || formatted_sequence || suffix;
    new.root_inquiry_id := coalesce(new.root_inquiry_id, new.id);
  elsif tg_table_name = 'quotations' then
    prefix := 'QT';
    reference_year := coalesce(new.sequence_year, extract(year from coalesce(new.quotation_date, current_date))::integer);
    new.sequence_year := reference_year;
    if new.sequence_no is null then
      new.sequence_no := private.sales_next_number(prefix, reference_year, null);
    end if;
    new.revision_no := coalesce(new.revision_no, 0);
    if new.revision_no > 0 then suffix := '-v.' || lpad(new.revision_no::text, 2, '0'); end if;
    formatted_sequence := private.sales_format_sequence(new.sequence_no);
    new.quotation_no := prefix || '-' || reference_year || '-' || formatted_sequence || suffix;
    new.root_quotation_id := coalesce(new.root_quotation_id, new.id);
  elsif tg_table_name = 'sales_contracts' then
    prefix := 'SC';
    reference_year := coalesce(new.sequence_year, extract(year from coalesce(new.contract_date, current_date))::integer);
    new.sequence_year := reference_year;
    if new.sequence_no is null then
      new.sequence_no := private.sales_next_number(prefix, reference_year, null);
    end if;
    new.revision_no := coalesce(new.revision_no, 0);
    new.amendment_no := coalesce(new.amendment_no, 0);
    if new.amendment_no > 0 then
      suffix := '-A' || lpad(new.amendment_no::text, 2, '0');
    elsif new.revision_no > 0 then
      suffix := '-v.' || lpad(new.revision_no::text, 2, '0');
    end if;
    formatted_sequence := private.sales_format_sequence(new.sequence_no);
    new.contract_no := prefix || '-' || reference_year || '-' || formatted_sequence || suffix;
    new.root_contract_id := coalesce(new.root_contract_id, new.id);
  elsif tg_table_name = 'orders' then
    prefix := 'ORD';
    reference_year := coalesce(new.sequence_year, extract(year from coalesce(new.order_date, current_date))::integer);
    new.sequence_year := reference_year;
    if new.sequence_no is null then
      new.sequence_no := private.sales_next_number(prefix, reference_year, null);
    end if;
    new.amendment_no := coalesce(new.amendment_no, 0);
    if new.amendment_no > 0 then suffix := '-A' || lpad(new.amendment_no::text, 2, '0'); end if;
    formatted_sequence := private.sales_format_sequence(new.sequence_no);
    new.order_no := prefix || '-' || reference_year || '-' || formatted_sequence || suffix;
    new.root_order_id := coalesce(new.root_order_id, new.id);
  elsif tg_table_name = 'sales_invoices' then
    prefix := case when new.invoice_type = 'proforma' then 'PI' else 'INV' end;
    reference_year := coalesce(new.sequence_year, extract(year from coalesce(new.invoice_date, current_date))::integer);
    new.sequence_year := reference_year;
    if new.sequence_no is null then
      new.sequence_no := private.sales_next_number(prefix, reference_year, null);
    end if;
    formatted_sequence := private.sales_format_sequence(new.sequence_no);
    new.invoice_no := prefix || '-' || reference_year || '-' || formatted_sequence;
  end if;
  return new;
end;
$$;

revoke all on function private.sales_assign_reference() from public, anon, authenticated;

drop trigger if exists inquiries_assign_reference on public.inquiries;
create trigger inquiries_assign_reference before insert on public.inquiries
for each row execute function private.sales_assign_reference();
drop trigger if exists quotations_assign_reference on public.quotations;
create trigger quotations_assign_reference before insert on public.quotations
for each row execute function private.sales_assign_reference();
drop trigger if exists sales_contracts_assign_reference on public.sales_contracts;
create trigger sales_contracts_assign_reference before insert on public.sales_contracts
for each row execute function private.sales_assign_reference();
drop trigger if exists orders_assign_reference on public.orders;
create trigger orders_assign_reference before insert on public.orders
for each row execute function private.sales_assign_reference();
drop trigger if exists sales_invoices_assign_reference on public.sales_invoices;
create trigger sales_invoices_assign_reference before insert on public.sales_invoices
for each row execute function private.sales_assign_reference();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'selling_entities', 'seller_bank_accounts', 'general_conditions_versions',
    'product_specification_templates', 'product_specification_fields',
    'inquiries', 'inquiry_items', 'supplier_rfqs', 'supplier_offers',
    'supplier_offer_lines', 'costing_scenarios', 'costing_lines',
    'quotations', 'sales_contracts', 'orders', 'order_items',
    'order_shipments', 'shipment_units', 'shipment_loading_lines',
    'sales_invoices', 'sales_payments'
  ] loop
    execute format('drop trigger if exists sales_set_updated_at on public.%I', target_table);
    execute format(
      'create trigger sales_set_updated_at before update on public.%I for each row execute function private.sales_set_updated_at()',
      target_table
    );
  end loop;
end;
$$;

create or replace function private.sales_validate_contact_company()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_company_id uuid;
  target_contact_id uuid;
begin
  target_company_id := nullif(to_jsonb(new) ->> 'company_id', '')::uuid;
  target_contact_id := nullif(to_jsonb(new) ->> 'contact_id', '')::uuid;
  if target_contact_id is not null and not exists (
    select 1 from public.company_contacts contact
    where contact.id = target_contact_id
      and contact.company_id = target_company_id
      and contact.deleted_at is null
  ) then
    raise exception 'The selected contact does not belong to the selected company';
  end if;
  return new;
end;
$$;

drop trigger if exists inquiries_validate_contact on public.inquiries;
create trigger inquiries_validate_contact before insert or update on public.inquiries
for each row execute function private.sales_validate_contact_company();
drop trigger if exists quotations_validate_contact on public.quotations;
create trigger quotations_validate_contact before insert or update on public.quotations
for each row execute function private.sales_validate_contact_company();
drop trigger if exists contracts_validate_contact on public.sales_contracts;
create trigger contracts_validate_contact before insert or update on public.sales_contracts
for each row execute function private.sales_validate_contact_company();

create or replace function private.sales_validate_contract_source()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  source_quotation public.quotations%rowtype;
  selected_bank public.seller_bank_accounts%rowtype;
  selected_terms public.general_conditions_versions%rowtype;
  effective_company_id uuid;
begin
  select * into source_quotation
  from public.quotations
  where id = new.quotation_id and deleted_at is null;

  if not found then raise exception 'Source quotation was not found'; end if;
  if source_quotation.status not in ('Accepted', 'Approved')
     and coalesce(new.revision_no, 0) = 0
     and coalesce(new.amendment_no, 0) = 0 then
    raise exception 'Only an accepted quotation can create a sales contract';
  end if;
  effective_company_id := source_quotation.company_id;
  if effective_company_id is null and source_quotation.inquiry_id is not null then
    select company_id into effective_company_id
    from public.inquiries where id = source_quotation.inquiry_id;
  end if;
  if effective_company_id is distinct from new.company_id then
    raise exception 'Contract company must match its quotation';
  end if;
  if source_quotation.seller_entity_id is not null
     and source_quotation.seller_entity_id is distinct from new.seller_entity_id then
    raise exception 'Contract seller must match its quotation';
  end if;

  if new.seller_bank_account_id is not null then
    select * into selected_bank from public.seller_bank_accounts
    where id = new.seller_bank_account_id and is_active;
    if not found or selected_bank.selling_entity_id <> new.seller_entity_id then
      raise exception 'The selected bank account does not belong to the contract seller';
    end if;
  end if;

  if new.status <> 'Draft' then
    if new.general_conditions_version_id is null then
      raise exception 'Published General Conditions are required before sending a contract';
    end if;
    select * into selected_terms from public.general_conditions_versions
    where id = new.general_conditions_version_id and is_published;
    if not found then
      raise exception 'The selected General Conditions version is not published';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sales_contracts_validate_source on public.sales_contracts;
create trigger sales_contracts_validate_source before insert or update on public.sales_contracts
for each row execute function private.sales_validate_contract_source();

create or replace function private.sales_validate_order_source()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  source_contract public.sales_contracts%rowtype;
begin
  if tg_op = 'UPDATE' and old.sales_contract_id is null and new.sales_contract_id is null then
    -- Preserve access to historical legacy orders while all newly inserted
    -- orders are required to follow the contract workflow below.
    return new;
  end if;
  if new.sales_contract_id is null then
    raise exception 'A sales order must originate from a sales contract';
  end if;

  select * into source_contract
  from public.sales_contracts
  where id = new.sales_contract_id and deleted_at is null and is_current;
  if not found then raise exception 'Current sales contract was not found'; end if;

  if source_contract.status <> 'Signed' then
    if not coalesce(new.signature_override, false)
       or length(trim(coalesce(new.signature_override_reason, ''))) = 0 then
      raise exception 'Unsigned contracts require an Admin override reason';
    end if;
  end if;

  if new.company_id is distinct from source_contract.company_id
     or new.seller_entity_id is distinct from source_contract.seller_entity_id then
    raise exception 'Order company and seller must match the sales contract';
  end if;
  if new.quotation_id is distinct from source_contract.quotation_id then
    raise exception 'Order quotation must match the sales contract';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_validate_source on public.orders;
create trigger orders_validate_source before insert or update on public.orders
for each row execute function private.sales_validate_order_source();

create or replace function private.sales_validate_loading_line()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  shipment_order_id uuid;
  item_order_id uuid;
  unit_shipment_id uuid;
begin
  select order_id into shipment_order_id from public.order_shipments where id = new.shipment_id;
  select order_id into item_order_id from public.order_items where id = new.order_item_id;
  if shipment_order_id is null or item_order_id is null or shipment_order_id <> item_order_id then
    raise exception 'Loading line item must belong to the shipment order';
  end if;
  if new.shipment_unit_id is not null then
    select shipment_id into unit_shipment_id from public.shipment_units where id = new.shipment_unit_id;
    if unit_shipment_id is distinct from new.shipment_id then
      raise exception 'Loading unit must belong to the selected shipment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shipment_loading_lines_validate_scope on public.shipment_loading_lines;
create trigger shipment_loading_lines_validate_scope before insert or update on public.shipment_loading_lines
for each row execute function private.sales_validate_loading_line();

create or replace function private.sales_prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Sales records use soft deletion; submit a deletion request instead';
end;
$$;

create or replace function private.sales_prevent_locked_update()
returns trigger
language plpgsql
as $$
declare
  old_business_data jsonb;
  new_business_data jsonb;
  record_is_locked boolean := false;
begin
  if tg_table_name = 'inquiries' then
    record_is_locked := exists (
      select 1 from public.supplier_rfqs
      where inquiry_id = old.id and status <> 'Draft' and deleted_at is null
    );
  elsif tg_table_name = 'supplier_rfqs' then
    record_is_locked := old.status <> 'Draft';
  elsif tg_table_name = 'quotations' then
    record_is_locked := old.status <> 'Draft';
  elsif tg_table_name = 'sales_contracts' then
    record_is_locked := old.status <> 'Draft';
  elsif tg_table_name = 'orders' then
    record_is_locked := old.status <> 'Draft';
  end if;

  if not record_is_locked then return new; end if;

  old_business_data := to_jsonb(old) - array[
    'status', 'reason', 'updated_at', 'sent_at', 'sent_by', 'accepted_at',
    'signed_at', 'signed_document_id', 'signature_override',
    'signature_override_reason', 'is_current', 'deleted_at', 'deleted_by'
  ];
  new_business_data := to_jsonb(new) - array[
    'status', 'reason', 'updated_at', 'sent_at', 'sent_by', 'accepted_at',
    'signed_at', 'signed_document_id', 'signature_override',
    'signature_override_reason', 'is_current', 'deleted_at', 'deleted_by'
  ];

  if old_business_data is distinct from new_business_data then
    raise exception 'This sent or active version is locked; create a revision or amendment';
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'inquiries', 'inquiry_items', 'supplier_rfqs', 'supplier_rfq_contacts',
    'supplier_rfq_lines', 'supplier_offers', 'supplier_offer_options',
    'supplier_offer_lines', 'costing_scenarios', 'costing_lines',
    'costing_adjustments', 'quotations', 'quotation_items',
    'quotation_line_sources', 'sales_contracts', 'sales_contract_items',
    'orders', 'order_items', 'order_shipments', 'shipment_units',
    'shipment_loading_lines', 'loading_packages', 'sales_invoices',
    'sales_invoice_lines', 'sales_invoice_adjustments', 'sales_payments',
    'invoice_payment_allocations', 'sales_documents'
  ] loop
    execute format('drop trigger if exists sales_prevent_hard_delete on public.%I', target_table);
    execute format(
      'create trigger sales_prevent_hard_delete before delete on public.%I for each row execute function private.sales_prevent_hard_delete()',
      target_table
    );
  end loop;
end;
$$;

drop trigger if exists inquiries_prevent_locked_update on public.inquiries;
create trigger inquiries_prevent_locked_update before update on public.inquiries
for each row execute function private.sales_prevent_locked_update();
drop trigger if exists supplier_rfqs_prevent_locked_update on public.supplier_rfqs;
create trigger supplier_rfqs_prevent_locked_update before update on public.supplier_rfqs
for each row execute function private.sales_prevent_locked_update();
drop trigger if exists quotations_prevent_locked_update on public.quotations;
create trigger quotations_prevent_locked_update before update on public.quotations
for each row execute function private.sales_prevent_locked_update();
drop trigger if exists contracts_prevent_locked_update on public.sales_contracts;
create trigger contracts_prevent_locked_update before update on public.sales_contracts
for each row execute function private.sales_prevent_locked_update();
drop trigger if exists orders_prevent_locked_update on public.orders;
create trigger orders_prevent_locked_update before update on public.orders
for each row execute function private.sales_prevent_locked_update();

create or replace function private.sales_protect_published_conditions()
returns trigger
language plpgsql
as $$
begin
  if old.is_published or exists (
    select 1 from public.sales_contracts where general_conditions_version_id = old.id
  ) then
    raise exception 'Published or used General Conditions are immutable; create a new version';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists general_conditions_protect_version on public.general_conditions_versions;
create trigger general_conditions_protect_version before update or delete on public.general_conditions_versions
for each row execute function private.sales_protect_published_conditions();

create or replace function private.sales_record_audit(
  p_company_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_from_status text default null,
  p_to_status text default null,
  p_reason text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.sales_audit_events (
    company_id, entity_type, entity_id, action, from_status, to_status,
    reason, details, performed_by
  ) values (
    p_company_id, p_entity_type, p_entity_id, p_action, p_from_status,
    p_to_status, p_reason, coalesce(p_details, '{}'::jsonb), auth.uid()
  )
$$;

revoke all on function private.sales_record_audit(uuid, text, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic workflow RPCs. These are the supported mutation boundary for the V1
-- UI; each operation validates its source, snapshots lines, and writes audit.
-- ---------------------------------------------------------------------------

create or replace function public.create_sales_inquiry(
  p_company_id uuid,
  p_contact_id uuid,
  p_items jsonb,
  p_customer_reference text default null,
  p_received_at timestamptz default now(),
  p_currency text default 'USD',
  p_notes text default null,
  p_loading_port text default null,
  p_discharge_port text default null,
  p_requested_incoterms jsonb default '[]'::jsonb,
  p_total_tolerance_minus numeric default null,
  p_total_tolerance_plus numeric default null,
  p_total_tolerance_unit text default 'percent'
)
returns public.inquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_inquiry public.inquiries%rowtype;
  item_data jsonb;
  item_number integer := 0;
  item_quantity numeric(14,3);
  item_name text;
  selected_seller_id uuid;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if not jsonb_typeof(coalesce(p_items, 'null'::jsonb)) = 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Enter at least one inquiry line';
  end if;
  if upper(trim(coalesce(p_currency, ''))) <> 'USD' then
    raise exception 'V1 supports USD sales chains only';
  end if;
  if p_total_tolerance_unit not in ('percent', 'MT') then
    raise exception 'Total tolerance unit must be percent or MT';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id and deleted_at is null) then
    raise exception 'Customer company was not found';
  end if;
  select id into selected_seller_id from public.selling_entities
  where is_active order by case when code = 'CACO' then 0 else 1 end, created_at limit 1;

  insert into public.inquiries (
    company_id, contact_id, inquiry_no, inquiry_date, status, notes,
    seller_entity_id, customer_reference, received_at, currency,
    total_tolerance_minus, total_tolerance_plus, total_tolerance_unit,
    loading_port, discharge_port, requested_incoterms, created_by
  ) values (
    p_company_id, p_contact_id, 'PENDING', coalesce(p_received_at::date, current_date),
    'Draft', p_notes, selected_seller_id, nullif(trim(p_customer_reference), ''),
    p_received_at, 'USD', p_total_tolerance_minus, p_total_tolerance_plus,
    p_total_tolerance_unit, p_loading_port, p_discharge_port,
    coalesce(p_requested_incoterms, '[]'::jsonb), auth.uid()
  ) returning * into new_inquiry;

  for item_data in select value from jsonb_array_elements(p_items) loop
    item_number := item_number + 1;
    item_name := trim(coalesce(item_data ->> 'product_name', ''));
    item_quantity := nullif(item_data ->> 'quantity', '')::numeric;
    if item_name = '' then raise exception 'Product name is required on line %', item_number; end if;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Quantity must be greater than zero on line %', item_number;
    end if;
    if coalesce(item_data ->> 'tolerance_unit', 'percent') not in ('percent', 'MT') then
      raise exception 'Invalid tolerance unit on line %', item_number;
    end if;
    if coalesce(item_data ->> 'invoicing_basis', 'actual_net_weight') not in (
      'actual_net_weight', 'theoretical_weight', 'pieces'
    ) then raise exception 'Invalid invoice basis on line %', item_number; end if;

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
      new_inquiry.id, item_number,
      nullif(item_data ->> 'product_id', '')::uuid,
      item_name,
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
      coalesce(item_data ->> 'tolerance_unit', 'percent'),
      coalesce(item_data ->> 'invoicing_basis', 'actual_net_weight'),
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
    new_inquiry.company_id, 'inquiry', new_inquiry.id, 'created',
    null, 'Draft', null, jsonb_build_object('line_count', item_number)
  );
  return new_inquiry;
end;
$$;

revoke all on function public.create_sales_inquiry(uuid, uuid, jsonb, text, timestamptz, text, text, text, text, jsonb, numeric, numeric, text)
  from public, anon;
grant execute on function public.create_sales_inquiry(uuid, uuid, jsonb, text, timestamptz, text, text, text, text, jsonb, numeric, numeric, text)
  to authenticated;

create or replace function public.create_supplier_rfq_batch(
  p_inquiry_id uuid,
  p_supplier_company_ids uuid[],
  p_contact_ids_by_supplier jsonb default '{}'::jsonb,
  p_inquiry_item_ids uuid[] default null,
  p_response_deadline date default (current_date + 7),
  p_hide_customer_identity boolean default true,
  p_email_subject text default null,
  p_email_body text default null
)
returns setof public.supplier_rfqs
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_inquiry public.inquiries%rowtype;
  supplier_id uuid;
  new_rfq public.supplier_rfqs%rowtype;
  next_ordinal integer;
  selected_line_count integer;
  contact_text text;
  contact_id_value uuid;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_supplier_company_ids), 0) = 0 then
    raise exception 'Select at least one supplier';
  end if;
  if p_response_deadline < current_date then
    raise exception 'Response deadline cannot be in the past';
  end if;

  select * into source_inquiry
  from public.inquiries
  where id = p_inquiry_id and deleted_at is null and is_current
  for update;
  if not found then raise exception 'Current inquiry was not found'; end if;

  if source_inquiry.sequence_year is null or source_inquiry.sequence_no is null then
    source_inquiry.sequence_year := extract(year from coalesce(source_inquiry.inquiry_date, current_date))::integer;
    source_inquiry.sequence_no := private.sales_next_number('INQ', source_inquiry.sequence_year, null);
    source_inquiry.root_inquiry_id := coalesce(source_inquiry.root_inquiry_id, source_inquiry.id);
    source_inquiry.inquiry_no := 'INQ-' || source_inquiry.sequence_year || '-' ||
      private.sales_format_sequence(source_inquiry.sequence_no);
    update public.inquiries set
      sequence_year = source_inquiry.sequence_year,
      sequence_no = source_inquiry.sequence_no,
      root_inquiry_id = source_inquiry.root_inquiry_id,
      inquiry_no = source_inquiry.inquiry_no
    where id = source_inquiry.id;
  end if;

  select coalesce(max(supplier_ordinal), 0) into next_ordinal
  from public.supplier_rfqs
  where inquiry_root_id = source_inquiry.root_inquiry_id;

  foreach supplier_id in array p_supplier_company_ids loop
    if supplier_id = source_inquiry.company_id then
      raise exception 'The customer company cannot be selected as its own supplier';
    end if;
    if not exists (
      select 1 from public.companies
      where id = supplier_id and deleted_at is null
    ) then
      raise exception 'Supplier company % was not found', supplier_id;
    end if;
    if exists (
      select 1 from public.supplier_rfqs
      where inquiry_root_id = source_inquiry.root_inquiry_id
        and supplier_company_id = supplier_id
        and is_current and deleted_at is null
    ) then
      raise exception 'A current RFQ already exists for supplier %', supplier_id;
    end if;

    next_ordinal := next_ordinal + 1;
    new_rfq.id := gen_random_uuid();
    insert into public.supplier_rfqs (
      id, inquiry_id, inquiry_root_id, supplier_company_id, rfq_no,
      supplier_ordinal, revision_no, root_rfq_id, is_current, status,
      hide_customer_identity, currency, response_deadline, email_subject,
      email_body, created_by
    ) values (
      new_rfq.id,
      source_inquiry.id,
      source_inquiry.root_inquiry_id,
      supplier_id,
      'RFQ-' || source_inquiry.sequence_year || '-' ||
        private.sales_format_sequence(source_inquiry.sequence_no) || '-' ||
        case when next_ordinal < 10 then lpad(next_ordinal::text, 2, '0') else next_ordinal::text end,
      next_ordinal,
      0,
      new_rfq.id,
      true,
      'Draft',
      p_hide_customer_identity,
      source_inquiry.currency,
      p_response_deadline,
      p_email_subject,
      p_email_body,
      auth.uid()
    ) returning * into new_rfq;

    for contact_text in
      select value
      from jsonb_array_elements_text(
        coalesce(p_contact_ids_by_supplier -> supplier_id::text, '[]'::jsonb)
      )
    loop
      contact_id_value := contact_text::uuid;
      if not exists (
        select 1 from public.company_contacts
        where id = contact_id_value
          and company_id = supplier_id
          and deleted_at is null
      ) then
        raise exception 'RFQ contact % does not belong to supplier %', contact_id_value, supplier_id;
      end if;
      insert into public.supplier_rfq_contacts (rfq_id, contact_id, recipient_type)
      values (new_rfq.id, contact_id_value, 'to');
    end loop;

    insert into public.supplier_rfq_lines (
      rfq_id, inquiry_item_id, line_no, requested_quantity, unit,
      specification_snapshot
    )
    select
      new_rfq.id,
      item.id,
      row_number() over (order by item.line_no, item.id)::integer,
      item.quantity,
      coalesce(item.unit, 'MT'),
      to_jsonb(item) - array['id', 'inquiry_id', 'created_at', 'updated_at']
    from public.inquiry_items item
    where item.inquiry_id = source_inquiry.id
      and (p_inquiry_item_ids is null or item.id = any(p_inquiry_item_ids));

    get diagnostics selected_line_count = row_count;
    if selected_line_count = 0 then
      raise exception 'Select at least one inquiry line';
    end if;

    perform private.sales_record_audit(
      source_inquiry.company_id, 'supplier_rfq', new_rfq.id, 'created',
      null, 'Draft', null,
      jsonb_build_object('inquiry_id', source_inquiry.id, 'supplier_company_id', supplier_id)
    );
    return next new_rfq;
  end loop;
end;
$$;

revoke all on function public.create_supplier_rfq_batch(uuid, uuid[], jsonb, uuid[], date, boolean, text, text)
  from public, anon;
grant execute on function public.create_supplier_rfq_batch(uuid, uuid[], jsonb, uuid[], date, boolean, text, text)
  to authenticated;

create or replace function public.create_customer_quotation_from_costing(
  p_costing_scenario_id uuid,
  p_valid_until date default (current_date + 30),
  p_seller_bank_account_id uuid default null,
  p_freight numeric default 0,
  p_insurance numeric default 0,
  p_tax_amount numeric default 0,
  p_other_charges numeric default 0,
  p_payment_advance_percent numeric default null,
  p_payment_balance_percent numeric default null,
  p_payment_method text default null,
  p_payment_balance_trigger text default null,
  p_payment_terms text default null,
  p_incoterm_rule text default null,
  p_named_place text default null,
  p_loading_port text default null,
  p_discharge_port text default null,
  p_shipment_method text default null,
  p_partial_shipment_allowed boolean default null,
  p_transshipment_allowed boolean default null,
  p_notes text default null
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_costing public.costing_scenarios%rowtype;
  source_inquiry public.inquiries%rowtype;
  selected_seller public.selling_entities%rowtype;
  selected_bank public.seller_bank_accounts%rowtype;
  new_quotation public.quotations%rowtype;
  costing_line_record record;
  new_quotation_item_id uuid;
  line_amount numeric(16,2);
  calculated_subtotal numeric(16,2) := 0;
  copied_lines integer := 0;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if p_valid_until < current_date then raise exception 'Quotation validity cannot be in the past'; end if;
  if p_shipment_method is not null and p_shipment_method not in (
    'container', 'breakbulk', 'ro_ro', 'truck', 'rail', 'other'
  ) then raise exception 'Invalid shipment method'; end if;
  if coalesce(p_freight, 0) < 0 or coalesce(p_insurance, 0) < 0
     or coalesce(p_tax_amount, 0) < 0 or coalesce(p_other_charges, 0) < 0 then
    raise exception 'Quotation charges cannot be negative';
  end if;
  if p_payment_advance_percent is not null
     and (p_payment_advance_percent < 0 or p_payment_advance_percent > 100) then
    raise exception 'Advance percentage must be between 0 and 100';
  end if;
  if p_payment_balance_percent is not null
     and (p_payment_balance_percent < 0 or p_payment_balance_percent > 100) then
    raise exception 'Balance percentage must be between 0 and 100';
  end if;
  if p_payment_advance_percent is not null and p_payment_balance_percent is not null
     and round(p_payment_advance_percent + p_payment_balance_percent, 4) <> 100 then
    raise exception 'Advance and balance percentages must total 100';
  end if;

  select * into source_costing from public.costing_scenarios
  where id = p_costing_scenario_id and deleted_at is null for update;
  if not found then raise exception 'Costing scenario was not found'; end if;
  select * into source_inquiry from public.inquiries
  where id = source_costing.inquiry_id and deleted_at is null and is_current;
  if not found then raise exception 'Current source inquiry was not found'; end if;
  if upper(source_costing.currency) <> 'USD' or upper(source_inquiry.currency) <> 'USD' then
    raise exception 'V1 supports one USD currency chain only';
  end if;

  if source_inquiry.seller_entity_id is not null then
    select * into selected_seller from public.selling_entities
    where id = source_inquiry.seller_entity_id and is_active;
  else
    select * into selected_seller from public.selling_entities
    where is_active order by case when code = 'CACO' then 0 else 1 end, created_at limit 1;
  end if;
  if selected_seller.id is null then
    raise exception 'Configure the CACO Steel selling entity before creating a quotation';
  end if;
  if p_seller_bank_account_id is not null then
    select * into selected_bank from public.seller_bank_accounts
    where id = p_seller_bank_account_id
      and selling_entity_id = selected_seller.id and is_active;
    if selected_bank.id is null then raise exception 'Active seller bank account was not found'; end if;
  end if;

  insert into public.quotations (
    inquiry_id, quotation_no, quotation_date, valid_until, currency,
    total_amount, status, notes, company_id, contact_id, seller_entity_id,
    seller_bank_account_id, costing_scenario_id, subtotal, freight,
    insurance, tax_amount, other_charges, payment_advance_percent,
    payment_balance_percent, payment_method, payment_balance_trigger,
    payment_terms, incoterm_rule, named_place, incoterms_version,
    loading_port, discharge_port, shipment_method, partial_shipment_allowed,
    transshipment_allowed, created_by
  ) values (
    source_inquiry.id, 'PENDING', current_date, p_valid_until, 'USD', 0,
    'Draft', p_notes, source_inquiry.company_id, source_inquiry.contact_id,
    selected_seller.id, selected_bank.id, source_costing.id, 0,
    coalesce(p_freight, 0), coalesce(p_insurance, 0), coalesce(p_tax_amount, 0),
    coalesce(p_other_charges, 0), p_payment_advance_percent,
    p_payment_balance_percent, p_payment_method, p_payment_balance_trigger,
    p_payment_terms, p_incoterm_rule, p_named_place, '2020', p_loading_port,
    p_discharge_port, p_shipment_method, p_partial_shipment_allowed,
    p_transshipment_allowed, auth.uid()
  ) returning * into new_quotation;

  for costing_line_record in
    select
      costing_line.*,
      inquiry_item.product_name,
      inquiry_item.customer_item_code,
      inquiry_item.internal_product_code,
      inquiry_item.grade,
      inquiry_item.standard,
      inquiry_item.quantity as inquiry_quantity,
      inquiry_item.unit,
      inquiry_item.tolerance_minus,
      inquiry_item.tolerance_plus,
      inquiry_item.tolerance_unit,
      inquiry_item.invoicing_basis,
      inquiry_item.specification_data,
      inquiry_item.thickness_mm,
      inquiry_item.width_mm,
      inquiry_item.length_mm,
      supplier_line.id as selected_supplier_offer_line_id
    from public.costing_lines costing_line
    join public.inquiry_items inquiry_item on inquiry_item.id = costing_line.inquiry_item_id
    join public.supplier_offer_lines supplier_line on supplier_line.id = costing_line.supplier_offer_line_id
    where costing_line.costing_scenario_id = source_costing.id
      and costing_line.selected_for_quotation
    order by inquiry_item.line_no
  loop
    if costing_line_record.calculated_sales_unit_price <= 0 then
      raise exception 'Selected costing line must have a positive sales price';
    end if;
    copied_lines := copied_lines + 1;
    new_quotation_item_id := gen_random_uuid();
    line_amount := round(
      costing_line_record.quantity * costing_line_record.calculated_sales_unit_price,
      2
    );
    calculated_subtotal := calculated_subtotal + line_amount;

    insert into public.quotation_items (
      id, quotation_id, inquiry_item_id, line_no, customer_item_code,
      internal_product_code, product_name, grade, standard, dimensions_text,
      specification_snapshot, quantity, unit, tolerance_minus,
      tolerance_plus, tolerance_unit, invoicing_basis, unit_price, amount
    ) values (
      new_quotation_item_id, new_quotation.id, costing_line_record.inquiry_item_id,
      copied_lines, costing_line_record.customer_item_code,
      costing_line_record.internal_product_code, costing_line_record.product_name,
      costing_line_record.grade, costing_line_record.standard,
      concat_ws(' x ', costing_line_record.thickness_mm,
        costing_line_record.width_mm, costing_line_record.length_mm),
      costing_line_record.specification_data, costing_line_record.quantity,
      costing_line_record.unit, costing_line_record.tolerance_minus,
      costing_line_record.tolerance_plus, costing_line_record.tolerance_unit,
      costing_line_record.invoicing_basis,
      round(costing_line_record.calculated_sales_unit_price, 2), line_amount
    );
    insert into public.quotation_line_sources (
      quotation_item_id, costing_line_id, supplier_offer_line_id, created_by
    ) values (
      new_quotation_item_id, costing_line_record.id,
      costing_line_record.selected_supplier_offer_line_id, auth.uid()
    );
  end loop;

  if copied_lines = 0 then
    raise exception 'Select at least one costing line for the customer quotation';
  end if;
  update public.quotations set
    subtotal = calculated_subtotal,
    total_amount = round(
      calculated_subtotal + coalesce(p_freight, 0) + coalesce(p_insurance, 0)
      + coalesce(p_tax_amount, 0) + coalesce(p_other_charges, 0),
      2
    )
  where id = new_quotation.id
  returning * into new_quotation;
  update public.costing_scenarios set status = 'Selected' where id = source_costing.id;

  perform private.sales_record_audit(
    source_inquiry.company_id, 'quotation', new_quotation.id,
    'created_from_costing', null, 'Draft', null,
    jsonb_build_object('costing_scenario_id', source_costing.id, 'line_count', copied_lines)
  );
  return new_quotation;
end;
$$;

revoke all on function public.create_customer_quotation_from_costing(uuid, date, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text, text, text, text, boolean, boolean, text)
  from public, anon;
grant execute on function public.create_customer_quotation_from_costing(uuid, date, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text, text, text, text, text, text, text, text, boolean, boolean, text)
  to authenticated;

create or replace function public.create_sales_contract_from_quotation(
  p_quotation_id uuid,
  p_general_conditions_version_id uuid default null,
  p_seller_bank_account_id uuid default null
)
returns public.sales_contracts
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_quotation public.quotations%rowtype;
  source_inquiry public.inquiries%rowtype;
  selected_seller public.selling_entities%rowtype;
  selected_bank public.seller_bank_accounts%rowtype;
  selected_terms public.general_conditions_versions%rowtype;
  new_contract public.sales_contracts%rowtype;
  copied_lines integer;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;

  select * into source_quotation from public.quotations
  where id = p_quotation_id and deleted_at is null and is_current
  for update;
  if not found then raise exception 'Current quotation was not found'; end if;
  if source_quotation.status not in ('Accepted', 'Approved') then
    raise exception 'Only an accepted quotation can create a sales contract';
  end if;
  if exists (
    select 1 from public.sales_contracts
    where quotation_id = source_quotation.id and is_current and deleted_at is null
  ) then
    raise exception 'A current sales contract already exists for this quotation';
  end if;

  if source_quotation.inquiry_id is not null then
    select * into source_inquiry from public.inquiries where id = source_quotation.inquiry_id;
  end if;
  source_quotation.company_id := coalesce(source_quotation.company_id, source_inquiry.company_id);
  source_quotation.contact_id := coalesce(source_quotation.contact_id, source_inquiry.contact_id);
  if source_quotation.company_id is null then raise exception 'Quotation customer company is required'; end if;

  if source_quotation.seller_entity_id is not null then
    select * into selected_seller from public.selling_entities
    where id = source_quotation.seller_entity_id and is_active;
  else
    select * into selected_seller from public.selling_entities
    where is_active order by case when code = 'CACO' then 0 else 1 end, created_at limit 1;
  end if;
  if selected_seller.id is null then
    raise exception 'Configure the CACO Steel selling entity before creating a contract';
  end if;

  if p_seller_bank_account_id is not null then
    select * into selected_bank from public.seller_bank_accounts
    where id = p_seller_bank_account_id
      and selling_entity_id = selected_seller.id and is_active;
    if selected_bank.id is null then raise exception 'Active seller bank account was not found'; end if;
  end if;

  if p_general_conditions_version_id is not null then
    select * into selected_terms from public.general_conditions_versions
    where id = p_general_conditions_version_id and is_published;
    if selected_terms.id is null then raise exception 'Published General Conditions version was not found'; end if;
  else
    select * into selected_terms from public.general_conditions_versions
    where is_published order by effective_from desc nulls last, created_at desc limit 1;
  end if;

  insert into public.sales_contracts (
    quotation_id, company_id, contact_id, seller_entity_id,
    seller_bank_account_id, general_conditions_version_id, contract_no,
    sequence_year, sequence_no, status, currency, subtotal, freight,
    insurance, tax_amount, other_charges, total_amount,
    payment_advance_percent, payment_balance_percent, payment_method,
    payment_balance_trigger, payment_notes, incoterm_rule, named_place,
    incoterms_version, loading_port, discharge_port, shipment_method,
    partial_shipment_allowed, transshipment_allowed, origin_country,
    producing_mill, packing_terms, inspection_terms, documentation_terms,
    seller_snapshot, bank_snapshot, conditions_snapshot, created_by
  ) values (
    source_quotation.id, source_quotation.company_id, source_quotation.contact_id,
    selected_seller.id, selected_bank.id, selected_terms.id, 'PENDING',
    extract(year from current_date)::integer, null, 'Draft', source_quotation.currency,
    source_quotation.subtotal, source_quotation.freight, source_quotation.insurance,
    source_quotation.tax_amount, source_quotation.other_charges,
    source_quotation.total_amount, source_quotation.payment_advance_percent,
    source_quotation.payment_balance_percent, source_quotation.payment_method,
    source_quotation.payment_balance_trigger, source_quotation.payment_terms,
    source_quotation.incoterm_rule, source_quotation.named_place,
    source_quotation.incoterms_version, source_quotation.loading_port,
    source_quotation.discharge_port, source_quotation.shipment_method,
    source_quotation.partial_shipment_allowed, source_quotation.transshipment_allowed,
    source_quotation.origin_country, source_quotation.producing_mill,
    source_quotation.packing_terms, source_quotation.inspection_terms,
    source_quotation.documentation_terms, to_jsonb(selected_seller),
    case when selected_bank.id is null then '{}'::jsonb else to_jsonb(selected_bank) end,
    case when selected_terms.id is null then '{}'::jsonb else to_jsonb(selected_terms) end,
    auth.uid()
  ) returning * into new_contract;

  insert into public.sales_contract_items (
    sales_contract_id, quotation_item_id, line_no, customer_item_code,
    internal_product_code, product_name, grade, standard, dimensions_text,
    specification_snapshot, contract_quantity, unit, tolerance_minus,
    tolerance_plus, tolerance_unit, invoicing_basis, unit_price, amount
  )
  select
    new_contract.id, item.id, item.line_no, item.customer_item_code,
    item.internal_product_code, item.product_name, item.grade, item.standard,
    item.dimensions_text, item.specification_snapshot, item.quantity,
    coalesce(item.unit, 'MT'), item.tolerance_minus, item.tolerance_plus,
    coalesce(item.tolerance_unit, 'percent'),
    coalesce(item.invoicing_basis, 'actual_net_weight'), item.unit_price, item.amount
  from public.quotation_items item
  where item.quotation_id = source_quotation.id
  order by item.line_no;

  get diagnostics copied_lines = row_count;
  if copied_lines = 0 then raise exception 'Quotation must contain at least one line'; end if;

  perform private.sales_record_audit(
    new_contract.company_id, 'sales_contract', new_contract.id, 'created_from_quotation',
    null, 'Draft', null, jsonb_build_object('quotation_id', source_quotation.id)
  );
  return new_contract;
end;
$$;

revoke all on function public.create_sales_contract_from_quotation(uuid, uuid, uuid) from public, anon;
grant execute on function public.create_sales_contract_from_quotation(uuid, uuid, uuid) to authenticated;

create or replace function public.mark_sales_contract_signed(
  p_contract_id uuid,
  p_signed_document_id uuid default null,
  p_override_reason text default null
)
returns public.sales_contracts
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_contract public.sales_contracts%rowtype;
  previous_status text;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;

  select * into target_contract from public.sales_contracts
  where id = p_contract_id and deleted_at is null and is_current
  for update;
  if not found then raise exception 'Current sales contract was not found'; end if;
  if target_contract.status in ('Cancelled', 'Superseded') then
    raise exception 'Cancelled or superseded contracts cannot be signed';
  end if;
  previous_status := target_contract.status;

  if p_signed_document_id is not null then
    if not exists (
      select 1
      from public.sales_documents document
      join public.sales_document_categories category on category.id = document.category_id
      where document.id = p_signed_document_id
        and document.entity_type = 'sales_contract'
        and document.entity_id = target_contract.id
        and document.company_id = target_contract.company_id
        and document.deleted_at is null
        and category.code = 'signed_contract'
    ) then
      raise exception 'Signed document must be a current signed-contract file linked to this contract';
    end if;
  elsif length(trim(coalesce(p_override_reason, ''))) = 0 then
    raise exception 'Upload the signed contract or enter an Admin override reason';
  end if;

  update public.sales_contracts set
    status = 'Signed',
    signed_at = now(),
    signed_document_id = p_signed_document_id,
    signature_override = p_signed_document_id is null,
    signature_override_reason = case when p_signed_document_id is null then trim(p_override_reason) else null end
  where id = target_contract.id
  returning * into target_contract;

  perform private.sales_record_audit(
    target_contract.company_id, 'sales_contract', target_contract.id,
    case when p_signed_document_id is null then 'signature_override' else 'signed' end,
    previous_status, 'Signed', p_override_reason,
    jsonb_build_object('signed_document_id', p_signed_document_id)
  );
  return target_contract;
end;
$$;

revoke all on function public.mark_sales_contract_signed(uuid, uuid, text) from public, anon;
grant execute on function public.mark_sales_contract_signed(uuid, uuid, text) to authenticated;

create or replace function public.create_sales_order_from_contract(
  p_contract_id uuid,
  p_signature_override_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_contract public.sales_contracts%rowtype;
  new_order public.orders%rowtype;
  copied_lines integer;
  use_override boolean;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;

  select * into source_contract from public.sales_contracts
  where id = p_contract_id and deleted_at is null and is_current
  for update;
  if not found then raise exception 'Current sales contract was not found'; end if;
  if exists (
    select 1 from public.orders
    where sales_contract_id = source_contract.id and is_current and deleted_at is null
  ) then
    raise exception 'A current order already exists for this sales contract';
  end if;

  use_override := source_contract.status <> 'Signed';
  if use_override and length(trim(coalesce(p_signature_override_reason, ''))) = 0 then
    raise exception 'An Admin reason is required to create an order before signature';
  end if;

  insert into public.orders (
    quotation_id, sales_contract_id, company_id, seller_entity_id, order_no,
    order_date, status, total_amount, currency, notes, sequence_year,
    sequence_no, signature_override, signature_override_reason, created_by
  ) values (
    source_contract.quotation_id, source_contract.id, source_contract.company_id,
    source_contract.seller_entity_id, 'PENDING', current_date, 'Draft',
    source_contract.total_amount, source_contract.currency, null,
    extract(year from current_date)::integer, null, use_override,
    case when use_override then trim(p_signature_override_reason) else null end,
    auth.uid()
  ) returning * into new_order;

  insert into public.order_items (
    order_id, sales_contract_item_id, line_no, product_name,
    product_snapshot, quantity, unit, tolerance_minus, tolerance_plus,
    tolerance_unit, invoicing_basis, theoretical_unit_weight_kg,
    unit_price, total_price
  )
  select
    new_order.id, item.id, item.line_no, item.product_name,
    jsonb_build_object(
      'customer_item_code', item.customer_item_code,
      'internal_product_code', item.internal_product_code,
      'grade', item.grade,
      'standard', item.standard,
      'dimensions_text', item.dimensions_text,
      'specification', item.specification_snapshot
    ),
    item.contract_quantity, item.unit, item.tolerance_minus,
    item.tolerance_plus, item.tolerance_unit, item.invoicing_basis,
    item.theoretical_unit_weight_kg, item.unit_price, item.amount
  from public.sales_contract_items item
  where item.sales_contract_id = source_contract.id
  order by item.line_no;

  get diagnostics copied_lines = row_count;
  if copied_lines = 0 then raise exception 'Sales contract must contain at least one line'; end if;

  perform private.sales_record_audit(
    new_order.company_id, 'order', new_order.id, 'created_from_contract',
    null, 'Draft', p_signature_override_reason,
    jsonb_build_object(
      'sales_contract_id', source_contract.id,
      'signature_override', use_override
    )
  );
  return new_order;
end;
$$;

revoke all on function public.create_sales_order_from_contract(uuid, text) from public, anon;
grant execute on function public.create_sales_order_from_contract(uuid, text) to authenticated;

create or replace function public.set_sales_record_status(
  p_entity_type text,
  p_entity_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
  target_company_id uuid;
  reason_required boolean;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  reason_required := p_status in ('Lost', 'Rejected', 'Cancelled', 'Superseded', 'On Hold');
  if reason_required and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required for status %', p_status;
  end if;

  if p_entity_type = 'inquiry' then
    if p_status not in ('Draft', 'Sourcing', 'Quoted', 'Won', 'Lost', 'Cancelled') then
      raise exception 'Invalid inquiry status';
    end if;
    select status, company_id into previous_status, target_company_id
    from public.inquiries where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Inquiry was not found'; end if;
    update public.inquiries set status = p_status, reason = p_reason where id = p_entity_id;
  elsif p_entity_type = 'supplier_rfq' then
    if p_status not in ('Draft', 'Sent', 'Awaiting Response', 'Offer Received', 'Declined', 'Expired', 'Superseded') then
      raise exception 'Invalid supplier RFQ status';
    end if;
    select rfq.status, inquiry.company_id into previous_status, target_company_id
    from public.supplier_rfqs rfq
    join public.inquiries inquiry on inquiry.id = rfq.inquiry_id
    where rfq.id = p_entity_id and rfq.deleted_at is null and rfq.is_current for update of rfq;
    if not found then raise exception 'Supplier RFQ was not found'; end if;
    update public.supplier_rfqs set
      status = p_status,
      reason = p_reason,
      sent_at = case when p_status in ('Sent', 'Awaiting Response') then coalesce(sent_at, now()) else sent_at end,
      sent_by = case when p_status in ('Sent', 'Awaiting Response') then coalesce(sent_by, auth.uid()) else sent_by end
    where id = p_entity_id;
  elsif p_entity_type = 'quotation' then
    if p_status not in ('Draft', 'Sent', 'Revision Requested', 'Accepted', 'Rejected', 'Expired', 'Superseded') then
      raise exception 'Invalid quotation status';
    end if;
    select status, company_id into previous_status, target_company_id
    from public.quotations where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Quotation was not found'; end if;
    update public.quotations set
      status = p_status, reason = p_reason,
      sent_at = case when p_status = 'Sent' then coalesce(sent_at, now()) else sent_at end,
      accepted_at = case when p_status = 'Accepted' then coalesce(accepted_at, now()) else accepted_at end
    where id = p_entity_id;
  elsif p_entity_type = 'sales_contract' then
    if p_status not in ('Draft', 'Sent', 'Under Negotiation', 'Signature Pending', 'Cancelled', 'Superseded') then
      raise exception 'Use mark_sales_contract_signed for Signed status';
    end if;
    select status, company_id into previous_status, target_company_id
    from public.sales_contracts where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Sales contract was not found'; end if;
    update public.sales_contracts set
      status = p_status, reason = p_reason,
      sent_at = case when p_status = 'Sent' then coalesce(sent_at, now()) else sent_at end
    where id = p_entity_id;
  elsif p_entity_type = 'order' then
    if p_status not in ('Draft', 'Active', 'In Production', 'Ready to Ship', 'Shipped', 'Delivered', 'Completed', 'On Hold', 'Cancelled') then
      raise exception 'Invalid order status';
    end if;
    select status, company_id into previous_status, target_company_id
    from public.orders where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Order was not found'; end if;
    update public.orders set status = p_status, reason = p_reason where id = p_entity_id;
  else
    raise exception 'Unsupported sales entity type';
  end if;

  perform private.sales_record_audit(
    target_company_id, p_entity_type, p_entity_id, 'status_changed',
    previous_status, p_status, p_reason, '{}'::jsonb
  );
end;
$$;

revoke all on function public.set_sales_record_status(text, uuid, text, text) from public, anon;
grant execute on function public.set_sales_record_status(text, uuid, text, text) to authenticated;

create or replace function public.create_sales_revision(
  p_entity_type text,
  p_entity_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  source_inquiry public.inquiries%rowtype;
  source_rfq public.supplier_rfqs%rowtype;
  source_quotation public.quotations%rowtype;
  source_contract public.sales_contracts%rowtype;
  source_order public.orders%rowtype;
  new_item_id uuid;
  source_item record;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A revision or amendment reason is required';
  end if;
  new_id := gen_random_uuid();

  if p_entity_type = 'inquiry' then
    select * into source_inquiry from public.inquiries
    where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Current inquiry was not found'; end if;
    update public.inquiries set is_current = false where id = source_inquiry.id;

    insert into public.inquiries (
      id, company_id, contact_id, inquiry_no, inquiry_date, status, notes,
      seller_entity_id, customer_reference, received_at, currency,
      sequence_year, sequence_no, revision_no, root_inquiry_id, is_current,
      total_tolerance_minus, total_tolerance_plus, total_tolerance_unit,
      loading_port, discharge_port, requested_incoterms, required_documents,
      packing_requirements, readiness_requirement, reason, created_by
    ) values (
      new_id, source_inquiry.company_id, source_inquiry.contact_id, 'PENDING',
      current_date, 'Draft', source_inquiry.notes, source_inquiry.seller_entity_id,
      source_inquiry.customer_reference, source_inquiry.received_at,
      source_inquiry.currency, source_inquiry.sequence_year,
      source_inquiry.sequence_no, source_inquiry.revision_no + 1,
      coalesce(source_inquiry.root_inquiry_id, source_inquiry.id), true,
      source_inquiry.total_tolerance_minus, source_inquiry.total_tolerance_plus,
      source_inquiry.total_tolerance_unit, source_inquiry.loading_port,
      source_inquiry.discharge_port, source_inquiry.requested_incoterms,
      source_inquiry.required_documents, source_inquiry.packing_requirements,
      source_inquiry.readiness_requirement, trim(p_reason), auth.uid()
    );

    insert into public.inquiry_items (
      inquiry_id, line_no, product_id, product_name, specification_template_id,
      customer_item_code, internal_product_code, grade, standard, thickness_mm,
      width_mm, length_mm, coating, color_ral, surface_treatment,
      coil_inner_diameter_mm, coil_outer_diameter_mm, target_coil_weight_mt,
      quantity, unit, tolerance_minus, tolerance_plus, tolerance_unit,
      invoicing_basis, theoretical_unit_weight_kg,
      theoretical_weight_override_note, pieces_per_bundle,
      additional_specification, packing_requirements, required_documents,
      specification_data
    )
    select
      new_id, line_no, product_id, product_name, specification_template_id,
      customer_item_code, internal_product_code, grade, standard, thickness_mm,
      width_mm, length_mm, coating, color_ral, surface_treatment,
      coil_inner_diameter_mm, coil_outer_diameter_mm, target_coil_weight_mt,
      quantity, unit, tolerance_minus, tolerance_plus, tolerance_unit,
      invoicing_basis, theoretical_unit_weight_kg,
      theoretical_weight_override_note, pieces_per_bundle,
      additional_specification, packing_requirements, required_documents,
      specification_data
    from public.inquiry_items where inquiry_id = source_inquiry.id;

    perform private.sales_record_audit(
      source_inquiry.company_id, 'inquiry', new_id, 'revised',
      source_inquiry.status, 'Draft', p_reason,
      jsonb_build_object('supersedes_id', source_inquiry.id)
    );

  elsif p_entity_type = 'supplier_rfq' then
    select * into source_rfq from public.supplier_rfqs
    where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Current supplier RFQ was not found'; end if;
    select * into source_inquiry from public.inquiries where id = source_rfq.inquiry_id;
    update public.supplier_rfqs set
      is_current = false, status = 'Superseded', reason = trim(p_reason)
    where id = source_rfq.id;

    insert into public.supplier_rfqs (
      id, inquiry_id, inquiry_root_id, supplier_company_id, rfq_no,
      supplier_ordinal, revision_no, root_rfq_id, is_current, status,
      hide_customer_identity, currency, response_deadline, email_subject,
      email_body, reason, created_by
    ) values (
      new_id, source_rfq.inquiry_id, source_rfq.inquiry_root_id,
      source_rfq.supplier_company_id,
      'RFQ-' || source_inquiry.sequence_year || '-' ||
        private.sales_format_sequence(source_inquiry.sequence_no) || '-' ||
        case when source_rfq.supplier_ordinal < 10
          then lpad(source_rfq.supplier_ordinal::text, 2, '0')
          else source_rfq.supplier_ordinal::text end ||
        '-v.' || lpad((source_rfq.revision_no + 1)::text, 2, '0'),
      source_rfq.supplier_ordinal, source_rfq.revision_no + 1,
      coalesce(source_rfq.root_rfq_id, source_rfq.id), true, 'Draft',
      source_rfq.hide_customer_identity, source_rfq.currency,
      source_rfq.response_deadline, source_rfq.email_subject,
      source_rfq.email_body, trim(p_reason), auth.uid()
    );

    insert into public.supplier_rfq_contacts (rfq_id, contact_id, recipient_type)
    select new_id, contact_id, recipient_type
    from public.supplier_rfq_contacts where rfq_id = source_rfq.id;
    insert into public.supplier_rfq_lines (
      rfq_id, inquiry_item_id, line_no, requested_quantity, unit,
      specification_snapshot
    )
    select new_id, inquiry_item_id, line_no, requested_quantity, unit,
      specification_snapshot
    from public.supplier_rfq_lines where rfq_id = source_rfq.id;

    perform private.sales_record_audit(
      source_inquiry.company_id, 'supplier_rfq', new_id, 'revised',
      source_rfq.status, 'Draft', p_reason,
      jsonb_build_object('supersedes_id', source_rfq.id)
    );

  elsif p_entity_type = 'quotation' then
    select * into source_quotation from public.quotations
    where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Current quotation was not found'; end if;
    update public.quotations set is_current = false, status = 'Superseded', reason = trim(p_reason)
    where id = source_quotation.id;

    insert into public.quotations (
      id, inquiry_id, quotation_no, quotation_date, valid_until, currency,
      total_amount, status, notes, company_id, contact_id, seller_entity_id,
      seller_bank_account_id, costing_scenario_id, sequence_year, sequence_no,
      revision_no, root_quotation_id, is_current, subtotal, freight, insurance,
      tax_amount, other_charges, payment_advance_percent,
      payment_balance_percent, payment_method, payment_balance_trigger,
      payment_terms, incoterm_rule, named_place, incoterms_version,
      loading_port, discharge_port, shipment_method, partial_shipment_allowed,
      transshipment_allowed, expected_readiness_date, origin_country,
      producing_mill, packing_terms, inspection_terms, documentation_terms,
      reason, created_by
    ) values (
      new_id, source_quotation.inquiry_id, 'PENDING', current_date,
      source_quotation.valid_until, source_quotation.currency,
      source_quotation.total_amount, 'Draft', source_quotation.notes,
      source_quotation.company_id, source_quotation.contact_id,
      source_quotation.seller_entity_id, source_quotation.seller_bank_account_id,
      source_quotation.costing_scenario_id, source_quotation.sequence_year,
      source_quotation.sequence_no, source_quotation.revision_no + 1,
      coalesce(source_quotation.root_quotation_id, source_quotation.id), true,
      source_quotation.subtotal, source_quotation.freight,
      source_quotation.insurance, source_quotation.tax_amount,
      source_quotation.other_charges, source_quotation.payment_advance_percent,
      source_quotation.payment_balance_percent, source_quotation.payment_method,
      source_quotation.payment_balance_trigger, source_quotation.payment_terms,
      source_quotation.incoterm_rule, source_quotation.named_place,
      source_quotation.incoterms_version, source_quotation.loading_port,
      source_quotation.discharge_port, source_quotation.shipment_method,
      source_quotation.partial_shipment_allowed,
      source_quotation.transshipment_allowed,
      source_quotation.expected_readiness_date, source_quotation.origin_country,
      source_quotation.producing_mill, source_quotation.packing_terms,
      source_quotation.inspection_terms, source_quotation.documentation_terms,
      trim(p_reason), auth.uid()
    );

    for source_item in
      select item.*, source.costing_line_id as private_costing_line_id,
        source.supplier_offer_line_id as private_supplier_offer_line_id
      from public.quotation_items item
      left join public.quotation_line_sources source on source.quotation_item_id = item.id
      where item.quotation_id = source_quotation.id
      order by item.line_no
    loop
      new_item_id := gen_random_uuid();
      insert into public.quotation_items (
        id, quotation_id, inquiry_item_id, line_no, customer_item_code,
        internal_product_code, product_name, grade, standard, dimensions_text,
        specification_snapshot, quantity, unit, tolerance_minus,
        tolerance_plus, tolerance_unit, invoicing_basis, unit_price, amount
      ) values (
        new_item_id, new_id, source_item.inquiry_item_id, source_item.line_no,
        source_item.customer_item_code, source_item.internal_product_code,
        source_item.product_name, source_item.grade, source_item.standard,
        source_item.dimensions_text, source_item.specification_snapshot,
        source_item.quantity, source_item.unit, source_item.tolerance_minus,
        source_item.tolerance_plus, source_item.tolerance_unit,
        source_item.invoicing_basis, source_item.unit_price, source_item.amount
      );
      if source_item.private_costing_line_id is not null then
        insert into public.quotation_line_sources (
          quotation_item_id, costing_line_id, supplier_offer_line_id, created_by
        ) values (
          new_item_id, source_item.private_costing_line_id,
          source_item.private_supplier_offer_line_id, auth.uid()
        );
      end if;
    end loop;

    perform private.sales_record_audit(
      source_quotation.company_id, 'quotation', new_id, 'revised',
      source_quotation.status, 'Draft', p_reason,
      jsonb_build_object('supersedes_id', source_quotation.id)
    );

  elsif p_entity_type = 'sales_contract' then
    select * into source_contract from public.sales_contracts
    where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Current sales contract was not found'; end if;
    update public.sales_contracts set
      is_current = false,
      status = case when source_contract.status = 'Draft' then 'Draft' else 'Superseded' end,
      reason = trim(p_reason)
    where id = source_contract.id;

    insert into public.sales_contracts (
      id, quotation_id, company_id, contact_id, seller_entity_id,
      seller_bank_account_id, general_conditions_version_id, contract_no,
      contract_date, sequence_year, sequence_no, revision_no, amendment_no,
      root_contract_id, is_current, status, currency, subtotal, freight,
      insurance, tax_amount, other_charges, total_amount,
      payment_advance_percent, payment_balance_percent, payment_method,
      payment_balance_trigger, payment_notes, default_invoicing_basis,
      total_tolerance_minus, total_tolerance_plus, total_tolerance_unit,
      incoterm_rule, named_place, incoterms_version, loading_port,
      discharge_port, shipment_method, partial_shipment_allowed,
      transshipment_allowed, latest_shipment_date, origin_country,
      producing_mill, packing_terms, inspection_terms, documentation_terms,
      seller_snapshot, bank_snapshot, conditions_snapshot, reason, created_by
    ) values (
      new_id, source_contract.quotation_id, source_contract.company_id,
      source_contract.contact_id, source_contract.seller_entity_id,
      source_contract.seller_bank_account_id,
      source_contract.general_conditions_version_id, 'PENDING', current_date,
      source_contract.sequence_year, source_contract.sequence_no,
      case when source_contract.status = 'Signed' then source_contract.revision_no
           else source_contract.revision_no + 1 end,
      case when source_contract.status = 'Signed' then source_contract.amendment_no + 1
           else source_contract.amendment_no end,
      coalesce(source_contract.root_contract_id, source_contract.id), true,
      'Draft', source_contract.currency, source_contract.subtotal,
      source_contract.freight, source_contract.insurance,
      source_contract.tax_amount, source_contract.other_charges,
      source_contract.total_amount, source_contract.payment_advance_percent,
      source_contract.payment_balance_percent, source_contract.payment_method,
      source_contract.payment_balance_trigger, source_contract.payment_notes,
      source_contract.default_invoicing_basis,
      source_contract.total_tolerance_minus, source_contract.total_tolerance_plus,
      source_contract.total_tolerance_unit, source_contract.incoterm_rule,
      source_contract.named_place, source_contract.incoterms_version,
      source_contract.loading_port, source_contract.discharge_port,
      source_contract.shipment_method, source_contract.partial_shipment_allowed,
      source_contract.transshipment_allowed, source_contract.latest_shipment_date,
      source_contract.origin_country, source_contract.producing_mill,
      source_contract.packing_terms, source_contract.inspection_terms,
      source_contract.documentation_terms, source_contract.seller_snapshot,
      source_contract.bank_snapshot, source_contract.conditions_snapshot,
      trim(p_reason), auth.uid()
    );

    insert into public.sales_contract_items (
      sales_contract_id, quotation_item_id, line_no, customer_item_code,
      internal_product_code, product_name, grade, standard, dimensions_text,
      specification_snapshot, contract_quantity, unit, tolerance_minus,
      tolerance_plus, tolerance_unit, invoicing_basis,
      theoretical_unit_weight_kg, unit_price, amount
    )
    select
      new_id, quotation_item_id, line_no, customer_item_code,
      internal_product_code, product_name, grade, standard, dimensions_text,
      specification_snapshot, contract_quantity, unit, tolerance_minus,
      tolerance_plus, tolerance_unit, invoicing_basis,
      theoretical_unit_weight_kg, unit_price, amount
    from public.sales_contract_items where sales_contract_id = source_contract.id;

    perform private.sales_record_audit(
      source_contract.company_id, 'sales_contract', new_id,
      case when source_contract.status = 'Signed' then 'amended' else 'revised' end,
      source_contract.status, 'Draft', p_reason,
      jsonb_build_object('supersedes_id', source_contract.id)
    );

  elsif p_entity_type = 'order' then
    select * into source_order from public.orders
    where id = p_entity_id and deleted_at is null and is_current for update;
    if not found then raise exception 'Current order was not found'; end if;
    if source_order.status = 'Draft' then
      raise exception 'Edit a Draft order directly; amendments begin after activation';
    end if;
    update public.orders set is_current = false where id = source_order.id;

    insert into public.orders (
      id, quotation_id, sales_contract_id, company_id, seller_entity_id,
      order_no, order_date, delivery_date, status, total_amount, currency,
      notes, sequence_year, sequence_no, amendment_no, root_order_id,
      is_current, signature_override, signature_override_reason, reason,
      created_by
    ) values (
      new_id, source_order.quotation_id, source_order.sales_contract_id,
      source_order.company_id, source_order.seller_entity_id, 'PENDING',
      current_date, source_order.delivery_date, 'Draft', source_order.total_amount,
      source_order.currency, source_order.notes, source_order.sequence_year,
      source_order.sequence_no, source_order.amendment_no + 1,
      coalesce(source_order.root_order_id, source_order.id), true,
      source_order.signature_override, source_order.signature_override_reason,
      trim(p_reason), auth.uid()
    );

    insert into public.order_items (
      order_id, sales_contract_item_id, line_no, product_name,
      product_snapshot, quantity, unit, tolerance_minus, tolerance_plus,
      tolerance_unit, invoicing_basis, theoretical_unit_weight_kg,
      unit_price, total_price
    )
    select
      new_id, sales_contract_item_id, line_no, product_name,
      product_snapshot, quantity, unit, tolerance_minus, tolerance_plus,
      tolerance_unit, invoicing_basis, theoretical_unit_weight_kg,
      unit_price, total_price
    from public.order_items where order_id = source_order.id;

    perform private.sales_record_audit(
      source_order.company_id, 'order', new_id, 'amended',
      source_order.status, 'Draft', p_reason,
      jsonb_build_object('supersedes_id', source_order.id)
    );
  else
    raise exception 'Unsupported revision entity type';
  end if;

  return new_id;
end;
$$;

revoke all on function public.create_sales_revision(text, uuid, text) from public, anon;
grant execute on function public.create_sales_revision(text, uuid, text) to authenticated;

create or replace function private.sales_prevent_locked_child_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  row_data jsonb := to_jsonb(new);
  parent_id uuid;
  parent_status text;
  parent_locked boolean := false;
begin
  if tg_table_name = 'inquiry_items' then
    parent_id := nullif(row_data ->> 'inquiry_id', '')::uuid;
    parent_locked := exists (
      select 1 from public.supplier_rfqs
      where inquiry_id = parent_id and status <> 'Draft' and deleted_at is null
    );
  elsif tg_table_name in ('supplier_rfq_contacts', 'supplier_rfq_lines') then
    parent_id := nullif(row_data ->> 'rfq_id', '')::uuid;
    select status into parent_status from public.supplier_rfqs where id = parent_id;
    parent_locked := parent_status <> 'Draft';
  elsif tg_table_name = 'quotation_items' then
    parent_id := nullif(row_data ->> 'quotation_id', '')::uuid;
    select status into parent_status from public.quotations where id = parent_id;
    parent_locked := parent_status <> 'Draft';
  elsif tg_table_name = 'sales_contract_items' then
    parent_id := nullif(row_data ->> 'sales_contract_id', '')::uuid;
    select status into parent_status from public.sales_contracts where id = parent_id;
    parent_locked := parent_status <> 'Draft';
  elsif tg_table_name = 'order_items' then
    parent_id := nullif(row_data ->> 'order_id', '')::uuid;
    select status into parent_status from public.orders where id = parent_id;
    parent_locked := parent_status <> 'Draft';
  end if;

  if parent_locked then
    raise exception 'The parent document is locked; create a revision or amendment';
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'inquiry_items', 'supplier_rfq_contacts', 'supplier_rfq_lines',
    'quotation_items', 'sales_contract_items', 'order_items'
  ] loop
    execute format('drop trigger if exists sales_prevent_locked_child_change on public.%I', target_table);
    execute format(
      'create trigger sales_prevent_locked_child_change before insert or update on public.%I for each row execute function private.sales_prevent_locked_child_change()',
      target_table
    );
  end loop;
end;
$$;

create or replace function private.sales_protect_document_version()
returns trigger
language plpgsql
as $$
begin
  if old.is_immutable and (
    (to_jsonb(old) - array['deleted_at', 'deleted_by'])
      is distinct from
    (to_jsonb(new) - array['deleted_at', 'deleted_by'])
  ) then
    raise exception 'Immutable sales files cannot be overwritten; upload a new version';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_documents_protect_version on public.sales_documents;
create trigger sales_documents_protect_version before update on public.sales_documents
for each row execute function private.sales_protect_document_version();

-- Extend the existing deletion-review queue without breaking CRM requests.
alter table public.deletion_requests
  drop constraint if exists deletion_requests_entity_type_check;
alter table public.deletion_requests
  add constraint deletion_requests_entity_type_check check (entity_type in (
    'company', 'contact', 'activity', 'inquiry', 'supplier_rfq',
    'supplier_offer', 'costing', 'quotation', 'sales_contract', 'order',
    'shipment', 'invoice', 'payment', 'sales_document'
  ));
alter table public.deletion_requests
  drop constraint if exists deletion_requests_entity_type_entity_id_status_key;
create unique index if not exists deletion_requests_one_pending_per_entity
  on public.deletion_requests (entity_type, entity_id)
  where status = 'pending';

create or replace function public.request_sales_deletion(
  p_entity_type text,
  p_entity_id uuid,
  p_reason text
)
returns public.deletion_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_request public.deletion_requests%rowtype;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if p_entity_type not in (
    'inquiry', 'supplier_rfq', 'supplier_offer', 'costing', 'quotation',
    'sales_contract', 'order', 'shipment', 'invoice', 'payment', 'sales_document'
  ) then raise exception 'Unsupported sales entity type'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A deletion reason is required'; end if;

  insert into public.deletion_requests (entity_type, entity_id, reason, requested_by)
  values (p_entity_type, p_entity_id, trim(p_reason), auth.uid())
  returning * into created_request;
  return created_request;
end;
$$;

revoke all on function public.request_sales_deletion(text, uuid, text) from public, anon;
grant execute on function public.request_sales_deletion(text, uuid, text) to authenticated;

create or replace function public.review_sales_deletion_request(
  p_request_id uuid,
  p_approve boolean
)
returns public.deletion_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.deletion_requests%rowtype;
  target_table text;
  target_company_id uuid;
  affected_rows integer;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  select * into target_request from public.deletion_requests
  where id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'Pending deletion request was not found'; end if;

  if target_request.entity_type = 'inquiry' then target_table := 'inquiries';
  elsif target_request.entity_type = 'supplier_rfq' then target_table := 'supplier_rfqs';
  elsif target_request.entity_type = 'supplier_offer' then target_table := 'supplier_offers';
  elsif target_request.entity_type = 'costing' then target_table := 'costing_scenarios';
  elsif target_request.entity_type = 'quotation' then target_table := 'quotations';
  elsif target_request.entity_type = 'sales_contract' then target_table := 'sales_contracts';
  elsif target_request.entity_type = 'order' then target_table := 'orders';
  elsif target_request.entity_type = 'shipment' then target_table := 'order_shipments';
  elsif target_request.entity_type = 'invoice' then target_table := 'sales_invoices';
  elsif target_request.entity_type = 'payment' then target_table := 'sales_payments';
  elsif target_request.entity_type = 'sales_document' then target_table := 'sales_documents';
  else raise exception 'This function reviews Sales deletion requests only';
  end if;

  if p_approve then
    execute format(
      'update public.%I set deleted_at = now(), deleted_by = $1 where id = $2',
      target_table
    ) using auth.uid(), target_request.entity_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'Target sales record was not found'; end if;
  end if;

  update public.deletion_requests set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = target_request.id
  returning * into target_request;

  perform private.sales_record_audit(
    target_company_id, target_request.entity_type, target_request.entity_id,
    case when p_approve then 'soft_deleted' else 'deletion_rejected' end,
    null, null, target_request.reason,
    jsonb_build_object('deletion_request_id', target_request.id)
  );
  return target_request;
end;
$$;

revoke all on function public.review_sales_deletion_request(uuid, boolean) from public, anon;
grant execute on function public.review_sales_deletion_request(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security. Supplier identities, offers, costs, margins, banks and
-- audit data are Admin-only. Customer members can only read client-facing
-- rows for the company assigned to their approved profile.
-- ---------------------------------------------------------------------------

create or replace function private.is_approved_platform_user()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and approval_status = 'approved'
  )
$$;

create or replace function private.can_read_sales_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.approval_status = 'approved'
      and (
        profile.role = 'admin'
        or (target_company_id is not null and profile.company_id = target_company_id)
      )
  )
$$;

revoke all on function private.is_approved_platform_user() from public, anon, authenticated;
revoke all on function private.can_read_sales_company(uuid) from public, anon, authenticated;

do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'selling_entities', 'seller_bank_accounts', 'general_conditions_versions',
    'sales_document_categories', 'product_specification_templates',
    'product_specification_fields', 'sales_documents', 'inquiries',
    'inquiry_items', 'supplier_rfqs', 'supplier_rfq_contacts',
    'supplier_rfq_lines', 'supplier_offers', 'supplier_offer_options',
    'supplier_offer_lines', 'costing_scenarios', 'costing_lines',
    'costing_adjustments', 'quotations', 'quotation_items',
    'quotation_line_sources', 'sales_contracts', 'sales_contract_items',
    'orders', 'order_items', 'order_shipments', 'shipment_units',
    'shipment_loading_lines', 'loading_packages', 'sales_invoices',
    'sales_invoice_lines', 'sales_invoice_adjustments', 'sales_payments',
    'invoice_payment_allocations', 'sales_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all privileges on table public.%I from anon', target_table);
    execute format('revoke delete on table public.%I from authenticated', target_table);
    execute format('grant select, insert, update on table public.%I to authenticated', target_table);
    for existing_policy in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', existing_policy.policyname, target_table);
    end loop;
  end loop;
end;
$$;

-- Configuration catalogues.
create policy selling_entities_read on public.selling_entities for select to authenticated
  using (private.is_approved_sales_admin() or (is_active and private.is_approved_platform_user()));
create policy selling_entities_admin_insert on public.selling_entities for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy selling_entities_admin_update on public.selling_entities for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy general_conditions_read on public.general_conditions_versions for select to authenticated
  using (private.is_approved_sales_admin() or (is_published and private.is_approved_platform_user()));
create policy general_conditions_admin_insert on public.general_conditions_versions for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy general_conditions_admin_update on public.general_conditions_versions for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy sales_document_categories_read on public.sales_document_categories for select to authenticated
  using (is_active and private.is_approved_platform_user() or private.is_approved_sales_admin());
create policy sales_document_categories_admin_insert on public.sales_document_categories for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy sales_document_categories_admin_update on public.sales_document_categories for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy product_templates_read on public.product_specification_templates for select to authenticated
  using (private.is_approved_sales_admin() or (is_active and private.is_approved_platform_user()));
create policy product_templates_admin_insert on public.product_specification_templates for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy product_templates_admin_update on public.product_specification_templates for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());
create policy product_fields_read on public.product_specification_fields for select to authenticated
  using (private.is_approved_sales_admin() or (is_active and private.is_approved_platform_user()));
create policy product_fields_admin_insert on public.product_specification_fields for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy product_fields_admin_update on public.product_specification_fields for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

-- Admin-only internal sourcing, costing and audit tables.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'seller_bank_accounts', 'supplier_rfqs', 'supplier_rfq_contacts',
    'supplier_rfq_lines', 'supplier_offers', 'supplier_offer_options',
    'supplier_offer_lines', 'costing_scenarios', 'costing_lines',
    'costing_adjustments', 'quotation_line_sources'
  ] loop
    execute format(
      'create policy sales_admin_select on public.%I for select to authenticated using (private.is_approved_sales_admin())',
      target_table
    );
    execute format(
      'create policy sales_admin_insert on public.%I for insert to authenticated with check (private.is_approved_sales_admin())',
      target_table
    );
    execute format(
      'create policy sales_admin_update on public.%I for update to authenticated using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin())',
      target_table
    );
  end loop;
end;
$$;

create policy sales_audit_admin_read on public.sales_audit_events for select to authenticated
  using (private.is_approved_sales_admin());
revoke insert, update, delete on public.sales_audit_events from authenticated;

-- Client-facing headers: own-company read, Admin mutation, no direct delete.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'inquiries', 'quotations', 'sales_contracts', 'orders',
    'sales_invoices', 'sales_payments'
  ] loop
    execute format(
      'create policy sales_company_read on public.%I for select to authenticated using (deleted_at is null and private.can_read_sales_company(company_id))',
      target_table
    );
    execute format(
      'create policy sales_admin_insert on public.%I for insert to authenticated with check (private.is_approved_sales_admin())',
      target_table
    );
    execute format(
      'create policy sales_admin_update on public.%I for update to authenticated using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin())',
      target_table
    );
  end loop;
end;
$$;

create policy inquiry_items_company_read on public.inquiry_items for select to authenticated
  using (exists (
    select 1 from public.inquiries parent
    where parent.id = inquiry_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy inquiry_items_admin_insert on public.inquiry_items for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy inquiry_items_admin_update on public.inquiry_items for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy quotation_items_company_read on public.quotation_items for select to authenticated
  using (exists (
    select 1 from public.quotations parent
    where parent.id = quotation_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy quotation_items_admin_insert on public.quotation_items for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy quotation_items_admin_update on public.quotation_items for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy contract_items_company_read on public.sales_contract_items for select to authenticated
  using (exists (
    select 1 from public.sales_contracts parent
    where parent.id = sales_contract_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy contract_items_admin_insert on public.sales_contract_items for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy contract_items_admin_update on public.sales_contract_items for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy order_items_company_read on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders parent
    where parent.id = order_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy order_items_admin_insert on public.order_items for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy order_items_admin_update on public.order_items for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy shipments_company_read on public.order_shipments for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.orders parent
    where parent.id = order_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy shipments_admin_insert on public.order_shipments for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy shipments_admin_update on public.order_shipments for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy shipment_units_company_read on public.shipment_units for select to authenticated
  using (exists (
    select 1 from public.order_shipments shipment
    join public.orders parent on parent.id = shipment.order_id
    where shipment.id = shipment_id and shipment.deleted_at is null
      and parent.deleted_at is null and private.can_read_sales_company(parent.company_id)
  ));
create policy shipment_units_admin_insert on public.shipment_units for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy shipment_units_admin_update on public.shipment_units for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy loading_lines_company_read on public.shipment_loading_lines for select to authenticated
  using (exists (
    select 1 from public.order_shipments shipment
    join public.orders parent on parent.id = shipment.order_id
    where shipment.id = shipment_id and shipment.deleted_at is null
      and parent.deleted_at is null and private.can_read_sales_company(parent.company_id)
  ));
create policy loading_lines_admin_insert on public.shipment_loading_lines for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy loading_lines_admin_update on public.shipment_loading_lines for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy loading_packages_company_read on public.loading_packages for select to authenticated
  using (exists (
    select 1
    from public.shipment_loading_lines loading
    join public.order_shipments shipment on shipment.id = loading.shipment_id
    join public.orders parent on parent.id = shipment.order_id
    where loading.id = loading_line_id and shipment.deleted_at is null
      and parent.deleted_at is null and private.can_read_sales_company(parent.company_id)
  ));
create policy loading_packages_admin_insert on public.loading_packages for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy loading_packages_admin_update on public.loading_packages for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy invoice_lines_company_read on public.sales_invoice_lines for select to authenticated
  using (exists (
    select 1 from public.sales_invoices parent
    where parent.id = invoice_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy invoice_lines_admin_insert on public.sales_invoice_lines for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy invoice_lines_admin_update on public.sales_invoice_lines for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy invoice_adjustments_company_read on public.sales_invoice_adjustments for select to authenticated
  using (exists (
    select 1 from public.sales_invoices parent
    where parent.id = invoice_id and parent.deleted_at is null
      and private.can_read_sales_company(parent.company_id)
  ));
create policy invoice_adjustments_admin_insert on public.sales_invoice_adjustments for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy invoice_adjustments_admin_update on public.sales_invoice_adjustments for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy payment_allocations_company_read on public.invoice_payment_allocations for select to authenticated
  using (exists (
    select 1 from public.sales_invoices invoice
    where invoice.id = invoice_id and invoice.deleted_at is null
      and private.can_read_sales_company(invoice.company_id)
  ));
create policy payment_allocations_admin_insert on public.invoice_payment_allocations for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy payment_allocations_admin_update on public.invoice_payment_allocations for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

create policy sales_documents_company_read on public.sales_documents for select to authenticated
  using (
    deleted_at is null and (
      private.is_approved_sales_admin()
      or (visible_to_customer and private.can_read_sales_company(company_id))
    )
  );
create policy sales_documents_admin_insert on public.sales_documents for insert to authenticated
  with check (private.is_approved_sales_admin());
create policy sales_documents_admin_update on public.sales_documents for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

-- Members cannot create Sales deletion requests directly through REST.
drop policy if exists deletion_requests_insert_by_user on public.deletion_requests;
create policy deletion_requests_insert_by_user on public.deletion_requests for insert to authenticated
  with check (
    requested_by = auth.uid()
    and (
      entity_type in ('company', 'contact', 'activity')
      or private.is_approved_sales_admin()
    )
  );

-- Validate polymorphic document ownership before a file becomes visible.
create or replace function private.sales_validate_document_link()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  expected_company_id uuid;
  category_code text;
begin
  if new.entity_type = 'inquiry' then
    select company_id into expected_company_id from public.inquiries where id = new.entity_id;
  elsif new.entity_type = 'supplier_rfq' then
    select inquiry.company_id into expected_company_id
    from public.supplier_rfqs rfq join public.inquiries inquiry on inquiry.id = rfq.inquiry_id
    where rfq.id = new.entity_id;
  elsif new.entity_type = 'supplier_offer' then
    select inquiry.company_id into expected_company_id
    from public.supplier_offers offer
    join public.supplier_rfqs rfq on rfq.id = offer.rfq_id
    join public.inquiries inquiry on inquiry.id = rfq.inquiry_id
    where offer.id = new.entity_id;
  elsif new.entity_type = 'costing' then
    select inquiry.company_id into expected_company_id
    from public.costing_scenarios costing
    join public.inquiries inquiry on inquiry.id = costing.inquiry_id
    where costing.id = new.entity_id;
  elsif new.entity_type = 'quotation' then
    select company_id into expected_company_id from public.quotations where id = new.entity_id;
  elsif new.entity_type = 'sales_contract' then
    select company_id into expected_company_id from public.sales_contracts where id = new.entity_id;
  elsif new.entity_type = 'order' then
    select company_id into expected_company_id from public.orders where id = new.entity_id;
  elsif new.entity_type = 'shipment' then
    select parent.company_id into expected_company_id
    from public.order_shipments shipment join public.orders parent on parent.id = shipment.order_id
    where shipment.id = new.entity_id;
  elsif new.entity_type = 'invoice' then
    select company_id into expected_company_id from public.sales_invoices where id = new.entity_id;
  elsif new.entity_type = 'payment' then
    select company_id into expected_company_id from public.sales_payments where id = new.entity_id;
  end if;

  if expected_company_id is null then raise exception 'Linked sales record was not found'; end if;
  if expected_company_id <> new.company_id then
    raise exception 'Document company must match the linked sales record';
  end if;
  if new.entity_type in ('supplier_rfq', 'supplier_offer', 'costing')
     and new.visible_to_customer then
    raise exception 'Supplier and costing documents cannot be customer-visible';
  end if;

  select code into category_code from public.sales_document_categories where id = new.category_id;
  if category_code = 'signed_contract' and new.entity_type <> 'sales_contract' then
    raise exception 'Signed-contract files must be linked to a sales contract';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_documents_validate_link on public.sales_documents;
create trigger sales_documents_validate_link before insert or update on public.sales_documents
for each row execute function private.sales_validate_document_link();

insert into storage.buckets (id, name, public)
values ('sales-documents', 'sales-documents', false)
on conflict (id) do update set public = false;

drop policy if exists sales_documents_files_read on storage.objects;
create policy sales_documents_files_read on storage.objects for select to authenticated
using (
  bucket_id = 'sales-documents'
  and (
    private.is_approved_sales_admin()
    or exists (
      select 1 from public.sales_documents document
      where document.file_path = storage.objects.name
        and document.deleted_at is null
        and document.visible_to_customer
        and private.can_read_sales_company(document.company_id)
    )
  )
);

drop policy if exists sales_documents_files_admin_insert on storage.objects;
create policy sales_documents_files_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'sales-documents' and private.is_approved_sales_admin());

-- Files are immutable. Corrections are uploaded with a new path/version rather
-- than overwriting or physically deleting the original object.

create or replace function private.sales_validate_invoice_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  source_order public.orders%rowtype;
  source_shipment_order_id uuid;
begin
  select * into source_order from public.orders
  where id = new.order_id and deleted_at is null;
  if not found then raise exception 'Invoice order was not found'; end if;
  if new.company_id <> source_order.company_id
     or new.seller_entity_id <> source_order.seller_entity_id then
    raise exception 'Invoice company and seller must match its order';
  end if;
  if new.shipment_id is not null then
    select order_id into source_shipment_order_id
    from public.order_shipments where id = new.shipment_id and deleted_at is null;
    if source_shipment_order_id is distinct from new.order_id then
      raise exception 'Invoice shipment must belong to its order';
    end if;
  end if;
  if new.seller_bank_account_id is not null and not exists (
    select 1 from public.seller_bank_accounts
    where id = new.seller_bank_account_id
      and selling_entity_id = new.seller_entity_id and is_active
  ) then
    raise exception 'Invoice bank account must belong to its seller';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_invoices_validate_scope on public.sales_invoices;
create trigger sales_invoices_validate_scope before insert or update on public.sales_invoices
for each row execute function private.sales_validate_invoice_scope();

create or replace function private.sales_validate_payment_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  order_company_id uuid;
  order_currency text;
begin
  select company_id, currency into order_company_id, order_currency
  from public.orders where id = new.order_id and deleted_at is null;
  if not found then raise exception 'Payment order was not found'; end if;
  if order_company_id <> new.company_id then
    raise exception 'Payment company must match its order';
  end if;
  if order_currency <> new.currency then
    raise exception 'V1 payments must use the order currency';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_payments_validate_scope on public.sales_payments;
create trigger sales_payments_validate_scope before insert or update on public.sales_payments
for each row execute function private.sales_validate_payment_scope();

create or replace function private.sales_validate_payment_allocation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_invoice public.sales_invoices%rowtype;
  target_payment public.sales_payments%rowtype;
  already_allocated numeric(16,2);
begin
  select * into target_invoice from public.sales_invoices
  where id = new.invoice_id and deleted_at is null;
  select * into target_payment from public.sales_payments
  where id = new.payment_id and deleted_at is null;
  if target_invoice.id is null or target_payment.id is null then
    raise exception 'Invoice and payment must both exist';
  end if;
  if target_invoice.order_id <> target_payment.order_id
     or target_invoice.company_id <> target_payment.company_id
     or target_invoice.currency <> target_payment.currency then
    raise exception 'Payment allocation must remain within one order, company and currency';
  end if;
  select coalesce(sum(allocated_amount), 0) into already_allocated
  from public.invoice_payment_allocations
  where payment_id = new.payment_id
    and (tg_op = 'INSERT' or invoice_id <> old.invoice_id);
  if already_allocated + new.allocated_amount > target_payment.amount then
    raise exception 'Allocated amount exceeds the payment amount';
  end if;
  return new;
end;
$$;

drop trigger if exists payment_allocations_validate_scope on public.invoice_payment_allocations;
create trigger payment_allocations_validate_scope before insert or update on public.invoice_payment_allocations
for each row execute function private.sales_validate_payment_allocation();

-- Normalize the known legacy labels before enforcing the V1 transition graph.
update public.inquiries set status = case lower(status)
  when 'new' then 'Draft'
  when 'draft' then 'Draft'
  when 'negotiating' then 'Quoted'
  when 'quoted' then 'Quoted'
  when 'won' then 'Won'
  when 'lost' then 'Lost'
  when 'cancelled' then 'Cancelled'
  else status end;
update public.quotations set status = case lower(status)
  when 'draft' then 'Draft'
  when 'sent' then 'Sent'
  when 'approved' then 'Accepted'
  when 'accepted' then 'Accepted'
  when 'rejected' then 'Rejected'
  when 'expired' then 'Expired'
  else status end;
update public.orders set status = case lower(status)
  when 'draft' then 'Draft'
  when 'open' then 'Active'
  when 'active' then 'Active'
  when 'completed' then 'Completed'
  when 'cancelled' then 'Cancelled'
  else status end;

create or replace function private.sales_validate_status_transition()
returns trigger
language plpgsql
as $$
declare
  transition_allowed boolean := false;
  reason_required boolean;
begin
  if new.status is not distinct from old.status then return new; end if;
  if not coalesce(old.is_current, true) then
    raise exception 'A non-current sales version cannot change status';
  end if;

  if tg_table_name = 'inquiries' then
    transition_allowed :=
      (old.status = 'Draft' and new.status in ('Sourcing', 'Cancelled')) or
      (old.status = 'Sourcing' and new.status in ('Quoted', 'Lost', 'Cancelled')) or
      (old.status = 'Quoted' and new.status in ('Won', 'Lost', 'Cancelled'));
  elsif tg_table_name = 'supplier_rfqs' then
    transition_allowed :=
      (old.status = 'Draft' and new.status in ('Sent', 'Superseded')) or
      (old.status = 'Sent' and new.status = 'Awaiting Response') or
      (old.status = 'Awaiting Response' and new.status in (
        'Offer Received', 'Declined', 'Expired', 'Superseded'
      )) or
      (old.status in ('Offer Received', 'Declined', 'Expired') and new.status = 'Superseded');
  elsif tg_table_name = 'quotations' then
    transition_allowed :=
      (old.status = 'Draft' and new.status in ('Sent', 'Superseded')) or
      (old.status = 'Sent' and new.status in (
        'Revision Requested', 'Accepted', 'Rejected', 'Expired', 'Superseded'
      )) or
      (old.status in (
        'Revision Requested', 'Accepted', 'Rejected', 'Expired'
      ) and new.status = 'Superseded');
  elsif tg_table_name = 'sales_contracts' then
    transition_allowed :=
      (old.status = 'Draft' and new.status in ('Sent', 'Superseded')) or
      (old.status = 'Sent' and new.status in (
        'Under Negotiation', 'Signature Pending', 'Signed', 'Cancelled', 'Superseded'
      )) or
      (old.status = 'Under Negotiation' and new.status in (
        'Signature Pending', 'Signed', 'Cancelled', 'Superseded'
      )) or
      (old.status = 'Signature Pending' and new.status in ('Signed', 'Cancelled', 'Superseded')) or
      (old.status = 'Signed' and new.status = 'Superseded');
  elsif tg_table_name = 'orders' then
    transition_allowed :=
      (old.status = 'Draft' and new.status in ('Active', 'Cancelled')) or
      (old.status = 'Active' and new.status in ('In Production', 'On Hold', 'Cancelled')) or
      (old.status = 'In Production' and new.status in ('Ready to Ship', 'On Hold', 'Cancelled')) or
      (old.status = 'On Hold' and new.status in ('Active', 'In Production', 'Cancelled')) or
      (old.status = 'Ready to Ship' and new.status in ('Shipped', 'On Hold', 'Cancelled')) or
      (old.status = 'Shipped' and new.status = 'Delivered') or
      (old.status = 'Delivered' and new.status = 'Completed');
  end if;

  if not transition_allowed then
    raise exception 'Invalid % status transition: % -> %', tg_table_name, old.status, new.status;
  end if;
  reason_required := new.status in (
    'Lost', 'Rejected', 'Cancelled', 'Superseded', 'On Hold'
  );
  if reason_required and length(trim(coalesce(new.reason, ''))) = 0 then
    raise exception 'A reason is required for status %', new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists inquiries_validate_status_transition on public.inquiries;
create trigger inquiries_validate_status_transition before update on public.inquiries
for each row execute function private.sales_validate_status_transition();
drop trigger if exists supplier_rfqs_validate_status_transition on public.supplier_rfqs;
create trigger supplier_rfqs_validate_status_transition before update on public.supplier_rfqs
for each row execute function private.sales_validate_status_transition();
drop trigger if exists quotations_validate_status_transition on public.quotations;
create trigger quotations_validate_status_transition before update on public.quotations
for each row execute function private.sales_validate_status_transition();
drop trigger if exists contracts_validate_status_transition on public.sales_contracts;
create trigger contracts_validate_status_transition before update on public.sales_contracts
for each row execute function private.sales_validate_status_transition();
drop trigger if exists orders_validate_status_transition on public.orders;
create trigger orders_validate_status_transition before update on public.orders
for each row execute function private.sales_validate_status_transition();

-- ---------------------------------------------------------------------------
-- Supplier RFQ email queue: one dispatch row per supplier contact. There is no
-- BCC field by design, preventing accidental disclosure between suppliers.
-- ---------------------------------------------------------------------------

create table if not exists public.sales_email_dispatches (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.supplier_rfqs(id),
  contact_id uuid not null references public.company_contacts(id),
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'Pending' check (status in (
    'Pending', 'Sending', 'Sent', 'Failed', 'Cancelled'
  )),
  gmail_message_id text,
  failure_message text,
  queued_by uuid not null references public.profiles(id) default auth.uid(),
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (rfq_id, contact_id)
);

alter table public.email_messages add column if not exists sales_entity_type text;
alter table public.email_messages add column if not exists sales_entity_id uuid;
alter table public.email_messages add column if not exists sales_dispatch_id uuid references public.sales_email_dispatches(id);

alter table public.sales_email_dispatches enable row level security;
revoke all privileges on public.sales_email_dispatches from anon;
revoke delete on public.sales_email_dispatches from authenticated;
grant select, insert, update on public.sales_email_dispatches to authenticated;
drop policy if exists sales_dispatches_admin_select on public.sales_email_dispatches;
create policy sales_dispatches_admin_select on public.sales_email_dispatches for select to authenticated
  using (private.is_approved_sales_admin());
drop policy if exists sales_dispatches_admin_insert on public.sales_email_dispatches;
create policy sales_dispatches_admin_insert on public.sales_email_dispatches for insert to authenticated
  with check (private.is_approved_sales_admin());
drop policy if exists sales_dispatches_admin_update on public.sales_email_dispatches;
create policy sales_dispatches_admin_update on public.sales_email_dispatches for update to authenticated
  using (private.is_approved_sales_admin()) with check (private.is_approved_sales_admin());

drop trigger if exists sales_set_updated_at on public.sales_email_dispatches;
create trigger sales_set_updated_at before update on public.sales_email_dispatches
for each row execute function private.sales_set_updated_at();
drop trigger if exists sales_prevent_hard_delete on public.sales_email_dispatches;
create trigger sales_prevent_hard_delete before delete on public.sales_email_dispatches
for each row execute function private.sales_prevent_hard_delete();

drop policy if exists email_messages_read_by_scope on public.email_messages;
create policy email_messages_read_by_scope on public.email_messages for select to authenticated
using (
  case
    when sales_entity_id is not null then private.is_approved_sales_admin()
    else private.can_access_company(company_id)
  end
);

create or replace function public.queue_supplier_rfq_emails(p_rfq_ids uuid[])
returns setof public.sales_email_dispatches
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_rfq public.supplier_rfqs%rowtype;
  recipient record;
  created_dispatch public.sales_email_dispatches%rowtype;
  queued_count integer := 0;
begin
  if not private.is_approved_sales_admin() then
    raise exception 'Approved Admin access is required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_rfq_ids), 0) = 0 then
    raise exception 'Select at least one supplier RFQ';
  end if;

  for target_rfq in
    select * from public.supplier_rfqs
    where id = any(p_rfq_ids) and deleted_at is null and is_current
    order by rfq_no
    for update
  loop
    if target_rfq.status <> 'Draft' then
      raise exception 'Only Draft RFQs can be queued: %', target_rfq.rfq_no;
    end if;
    if length(trim(coalesce(target_rfq.email_subject, ''))) = 0
       or length(trim(coalesce(target_rfq.email_body, ''))) = 0 then
      raise exception 'RFQ % needs an email subject and body', target_rfq.rfq_no;
    end if;

    for recipient in
      select contact.id, contact.email
      from public.supplier_rfq_contacts link
      join public.company_contacts contact on contact.id = link.contact_id
      where link.rfq_id = target_rfq.id
        and link.recipient_type = 'to'
        and contact.deleted_at is null
        and length(trim(coalesce(contact.email, ''))) > 0
    loop
      insert into public.sales_email_dispatches (
        rfq_id, contact_id, recipient_email, subject, body, queued_by
      ) values (
        target_rfq.id, recipient.id, lower(trim(recipient.email)),
        target_rfq.email_subject, target_rfq.email_body, auth.uid()
      )
      on conflict (rfq_id, contact_id) do update set
        recipient_email = excluded.recipient_email,
        subject = excluded.subject,
        body = excluded.body,
        status = case
          when public.sales_email_dispatches.status = 'Sent'
            then public.sales_email_dispatches.status
          else 'Pending'
        end,
        failure_message = null
      returning * into created_dispatch;
      queued_count := queued_count + 1;
      return next created_dispatch;
    end loop;
  end loop;

  if queued_count = 0 then
    raise exception 'No valid supplier email recipients were found';
  end if;
end;
$$;

revoke all on function public.queue_supplier_rfq_emails(uuid[]) from public, anon;
grant execute on function public.queue_supplier_rfq_emails(uuid[]) to authenticated;

-- Raw commercial tables include internal notes and workflow metadata, so only
-- Admins query them directly. Customer members use the safe views below.
do $$
declare
  target_table text;
  policy_row record;
begin
  foreach target_table in array array[
    'inquiries', 'quotations', 'sales_contracts', 'orders',
    'sales_invoices', 'sales_payments'
  ] loop
    execute format('drop policy if exists sales_company_read on public.%I', target_table);
    execute format(
      'create policy raw_sales_admin_read on public.%I for select to authenticated using (deleted_at is null and private.is_approved_sales_admin())',
      target_table
    );
  end loop;

  for policy_row in
    select * from (values
      ('inquiry_items', 'inquiry_items_company_read'),
      ('quotation_items', 'quotation_items_company_read'),
      ('sales_contract_items', 'contract_items_company_read'),
      ('order_items', 'order_items_company_read'),
      ('order_shipments', 'shipments_company_read'),
      ('shipment_units', 'shipment_units_company_read'),
      ('shipment_loading_lines', 'loading_lines_company_read'),
      ('loading_packages', 'loading_packages_company_read'),
      ('sales_invoice_lines', 'invoice_lines_company_read'),
      ('sales_invoice_adjustments', 'invoice_adjustments_company_read'),
      ('invoice_payment_allocations', 'payment_allocations_company_read')
    ) as policies(table_name, policy_name)
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policy_name, policy_row.table_name);
    execute format(
      'create policy raw_sales_admin_read on public.%I for select to authenticated using (private.is_approved_sales_admin())',
      policy_row.table_name
    );
  end loop;
end;
$$;

create or replace view public.customer_inquiries
with (security_barrier = true)
as
select
  inquiry.id, inquiry.company_id, inquiry.contact_id, inquiry.inquiry_no,
  inquiry.inquiry_date, inquiry.status, inquiry.customer_reference,
  inquiry.received_at, inquiry.currency, inquiry.total_tolerance_minus,
  inquiry.total_tolerance_plus, inquiry.total_tolerance_unit,
  inquiry.loading_port, inquiry.discharge_port, inquiry.requested_incoterms,
  inquiry.required_documents, inquiry.packing_requirements,
  inquiry.readiness_requirement, inquiry.created_at, inquiry.updated_at
from public.inquiries inquiry
where inquiry.deleted_at is null
  and inquiry.is_current
  and inquiry.status in ('Sourcing', 'Quoted', 'Won', 'Lost', 'Cancelled')
  and private.can_read_sales_company(inquiry.company_id);

create or replace view public.customer_inquiry_items
with (security_barrier = true)
as
select
  item.id, item.inquiry_id, item.line_no, item.customer_item_code,
  item.product_name, item.grade, item.standard, item.thickness_mm,
  item.width_mm, item.length_mm, item.coating, item.color_ral,
  item.surface_treatment, item.quantity, item.unit, item.tolerance_minus,
  item.tolerance_plus, item.tolerance_unit, item.invoicing_basis,
  item.theoretical_unit_weight_kg, item.pieces_per_bundle,
  item.additional_specification, item.packing_requirements,
  item.required_documents, item.specification_data
from public.inquiry_items item
join public.inquiries inquiry on inquiry.id = item.inquiry_id
where inquiry.deleted_at is null and inquiry.is_current
  and inquiry.status in ('Sourcing', 'Quoted', 'Won', 'Lost', 'Cancelled')
  and private.can_read_sales_company(inquiry.company_id);

create or replace view public.customer_quotations
with (security_barrier = true)
as
select
  quotation.id, quotation.inquiry_id, quotation.company_id,
  quotation.contact_id, quotation.seller_entity_id,
  quotation.seller_bank_account_id, quotation.quotation_no,
  quotation.quotation_date, quotation.valid_until, quotation.currency,
  quotation.subtotal, quotation.freight, quotation.insurance,
  quotation.tax_amount, quotation.other_charges, quotation.total_amount,
  quotation.status, quotation.payment_advance_percent,
  quotation.payment_balance_percent, quotation.payment_method,
  quotation.payment_balance_trigger, quotation.payment_terms,
  quotation.incoterm_rule, quotation.named_place,
  quotation.incoterms_version, quotation.loading_port,
  quotation.discharge_port, quotation.shipment_method,
  quotation.partial_shipment_allowed, quotation.transshipment_allowed,
  quotation.expected_readiness_date, quotation.origin_country,
  quotation.producing_mill, quotation.packing_terms,
  quotation.inspection_terms, quotation.documentation_terms,
  quotation.sent_at, quotation.accepted_at, quotation.created_at,
  quotation.updated_at
from public.quotations quotation
where quotation.deleted_at is null
  and quotation.is_current
  and quotation.status in (
    'Sent', 'Revision Requested', 'Accepted', 'Rejected', 'Expired'
  )
  and private.can_read_sales_company(quotation.company_id);

create or replace view public.customer_quotation_items
with (security_barrier = true)
as
select
  item.id, item.quotation_id, item.inquiry_item_id, item.line_no,
  item.customer_item_code, item.product_name, item.grade, item.standard,
  item.dimensions_text, item.specification_snapshot, item.quantity,
  item.unit, item.tolerance_minus, item.tolerance_plus,
  item.tolerance_unit, item.invoicing_basis, item.unit_price, item.amount
from public.quotation_items item
join public.quotations quotation on quotation.id = item.quotation_id
where quotation.deleted_at is null and quotation.is_current
  and quotation.status in (
    'Sent', 'Revision Requested', 'Accepted', 'Rejected', 'Expired'
  )
  and private.can_read_sales_company(quotation.company_id);

create or replace view public.customer_sales_contracts
with (security_barrier = true)
as
select
  contract.id, contract.quotation_id, contract.company_id,
  contract.contact_id, contract.seller_entity_id,
  contract.seller_bank_account_id, contract.general_conditions_version_id,
  contract.contract_no, contract.contract_date, contract.status,
  contract.currency, contract.subtotal, contract.freight,
  contract.insurance, contract.tax_amount, contract.other_charges,
  contract.total_amount, contract.payment_advance_percent,
  contract.payment_balance_percent, contract.payment_method,
  contract.payment_balance_trigger, contract.payment_notes,
  contract.default_invoicing_basis, contract.total_tolerance_minus,
  contract.total_tolerance_plus, contract.total_tolerance_unit,
  contract.incoterm_rule, contract.named_place, contract.incoterms_version,
  contract.loading_port, contract.discharge_port, contract.shipment_method,
  contract.partial_shipment_allowed, contract.transshipment_allowed,
  contract.latest_shipment_date, contract.origin_country,
  contract.producing_mill, contract.packing_terms,
  contract.inspection_terms, contract.documentation_terms,
  contract.sent_at, contract.signed_at, contract.signed_document_id,
  contract.created_at, contract.updated_at
from public.sales_contracts contract
where contract.deleted_at is null
  and contract.is_current
  and contract.status in (
    'Sent', 'Under Negotiation', 'Signature Pending', 'Signed', 'Cancelled'
  )
  and private.can_read_sales_company(contract.company_id);

create or replace view public.customer_sales_contract_items
with (security_barrier = true)
as
select
  item.id, item.sales_contract_id, item.line_no, item.customer_item_code,
  item.product_name, item.grade, item.standard, item.dimensions_text,
  item.specification_snapshot, item.contract_quantity, item.unit,
  item.tolerance_minus, item.tolerance_plus, item.tolerance_unit,
  item.invoicing_basis, item.theoretical_unit_weight_kg,
  item.unit_price, item.amount
from public.sales_contract_items item
join public.sales_contracts contract on contract.id = item.sales_contract_id
where contract.deleted_at is null and contract.is_current
  and contract.status in (
    'Sent', 'Under Negotiation', 'Signature Pending', 'Signed', 'Cancelled'
  )
  and private.can_read_sales_company(contract.company_id);

create or replace view public.customer_orders
with (security_barrier = true)
as
select
  sales_order.id, sales_order.sales_contract_id, sales_order.company_id,
  sales_order.seller_entity_id, sales_order.order_no,
  sales_order.order_date, sales_order.delivery_date, sales_order.status,
  sales_order.total_amount, sales_order.currency, sales_order.created_at,
  sales_order.updated_at
from public.orders sales_order
where sales_order.deleted_at is null
  and sales_order.is_current
  and sales_order.status in (
    'Active', 'In Production', 'Ready to Ship', 'Shipped', 'Delivered',
    'Completed', 'On Hold', 'Cancelled'
  )
  and private.can_read_sales_company(sales_order.company_id);

create or replace view public.customer_order_items
with (security_barrier = true)
as
select
  item.id, item.order_id, item.line_no, item.product_name,
  item.product_snapshot, item.quantity, item.unit, item.tolerance_minus,
  item.tolerance_plus, item.tolerance_unit, item.invoicing_basis,
  item.theoretical_unit_weight_kg, item.unit_price, item.total_price
from public.order_items item
join public.orders sales_order on sales_order.id = item.order_id
where sales_order.deleted_at is null and sales_order.is_current
  and sales_order.status <> 'Draft'
  and private.can_read_sales_company(sales_order.company_id);

create or replace view public.customer_sales_invoices
with (security_barrier = true)
as
select
  invoice.id, invoice.order_id, invoice.shipment_id, invoice.company_id,
  invoice.seller_entity_id, invoice.seller_bank_account_id,
  invoice.invoice_type, invoice.invoice_no, invoice.invoice_date,
  invoice.currency, invoice.subtotal, invoice.freight, invoice.insurance,
  invoice.tax_amount, invoice.adjustments_total, invoice.total_amount,
  invoice.status, invoice.issued_at, invoice.created_at, invoice.updated_at
from public.sales_invoices invoice
where invoice.deleted_at is null
  and invoice.status in ('Issued', 'Partially Paid', 'Paid', 'Cancelled')
  and private.can_read_sales_company(invoice.company_id);

create or replace view public.customer_sales_invoice_lines
with (security_barrier = true)
as
select
  line.id, line.invoice_id, line.line_no, line.description,
  line.quantity, line.unit, line.invoicing_basis, line.unit_price,
  line.amount, line.created_at
from public.sales_invoice_lines line
join public.sales_invoices invoice on invoice.id = line.invoice_id
where invoice.deleted_at is null
  and invoice.status in ('Issued', 'Partially Paid', 'Paid', 'Cancelled')
  and private.can_read_sales_company(invoice.company_id);

do $$
declare
  target_view text;
begin
  foreach target_view in array array[
    'customer_inquiries', 'customer_inquiry_items', 'customer_quotations',
    'customer_quotation_items', 'customer_sales_contracts',
    'customer_sales_contract_items', 'customer_orders',
    'customer_order_items', 'customer_sales_invoices',
    'customer_sales_invoice_lines'
  ] loop
    execute format('revoke all privileges on public.%I from public, anon, authenticated', target_view);
    execute format('grant select on public.%I to authenticated', target_view);
  end loop;
end;
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_approved_sales_admin() to authenticated;
grant execute on function private.is_approved_platform_user() to authenticated;
grant execute on function private.can_read_sales_company(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
