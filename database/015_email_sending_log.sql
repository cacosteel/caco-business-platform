begin;
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  contact_id uuid not null references public.company_contacts(id), template_id uuid references public.email_templates(id),
  recipient_email text not null, subject text not null, body text not null, gmail_message_id text,
  sent_by uuid not null references public.profiles(id), sent_at timestamptz not null default now()
);
alter table public.email_messages enable row level security;
drop policy if exists email_messages_read_by_scope on public.email_messages;
create policy email_messages_read_by_scope on public.email_messages for select to authenticated using (private.can_access_company(company_id));
commit;
