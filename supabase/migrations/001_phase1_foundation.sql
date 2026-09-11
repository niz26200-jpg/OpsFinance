create extension if not exists "pgcrypto";

create type account_type_enum as enum (
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'COGS',
  'EXPENSE'
);

create type financial_account_type_enum as enum (
  'BANK',
  'CASH',
  'E_WALLET',
  'CREDIT_CARD',
  'LOAN',
  'OTHER'
);

create type transaction_type_enum as enum (
  'MONEY_IN',
  'MONEY_OUT',
  'TRANSFER',
  'JOURNAL'
);

create type transaction_source_enum as enum (
  'MANUAL',
  'UPLOAD',
  'IMPORT',
  'SYSTEM'
);

create type transaction_status_enum as enum (
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'POSTED',
  'VOIDED'
);

create type journal_status_enum as enum (
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'POSTED',
  'VOIDED'
);

create type statement_status_enum as enum (
  'IMPORTED',
  'MATCHED',
  'UNMATCHED',
  'IGNORED'
);

create type match_type_enum as enum (
  'AUTO',
  'MANUAL',
  'PARTIAL'
);

create type subscription_status_enum as enum (
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
  'SUSPENDED'
);

create type membership_role_enum as enum (
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
  'STAFF',
  'VIEWER'
);

create type accounting_period_status_enum as enum (
  'OPEN',
  'CLOSED'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_no text,
  address text,
  phone text,
  email text,
  base_currency text not null default 'MYR',
  fiscal_year_start text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  user_id uuid not null references users(id) on delete restrict,
  role membership_role_enum not null default 'VIEWER',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index idx_business_members_business_id on business_members (business_id);
create index idx_business_members_user_id on business_members (user_id);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  plan_code text not null default 'STARTER',
  status subscription_status_enum not null default 'ACTIVE',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  grace_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_business_id on subscriptions (business_id);
create index idx_subscriptions_status on subscriptions (status);

create table financial_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  name text not null,
  type financial_account_type_enum not null,
  account_code text not null,
  currency text not null default 'MYR',
  opening_balance numeric(18,2) not null default 0,
  opening_balance_date date,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, account_code)
);

create index idx_financial_accounts_business_id on financial_accounts (business_id);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  code text not null,
  name text not null,
  account_type account_type_enum not null,
  parent_id uuid references accounts(id) on delete restrict,
  normal_balance text not null check (normal_balance in ('DEBIT', 'CREDIT')),
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create index idx_accounts_business_id on accounts (business_id);
create index idx_accounts_parent_id on accounts (parent_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  transaction_no text not null,
  transaction_date date not null,
  transaction_type transaction_type_enum not null,
  description text,
  reference_no text,
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'MYR',
  status transaction_status_enum not null default 'DRAFT',
  source transaction_source_enum not null default 'MANUAL',
  financial_account_id uuid references financial_accounts(id) on delete restrict,
  contact_id uuid,
  created_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, transaction_no)
);

create index idx_transactions_business_id on transactions (business_id);
create index idx_transactions_created_by on transactions (created_by);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  journal_no text not null,
  journal_date date not null,
  source_type text not null default 'MANUAL',
  source_id uuid,
  description text,
  status journal_status_enum not null default 'DRAFT',
  posted_at timestamptz,
  posted_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (business_id, journal_no)
);

create index idx_journal_entries_business_id on journal_entries (business_id);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries(id) on delete restrict,
  account_id uuid not null references accounts(id) on delete restrict,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  description text,
  financial_account_id uuid references financial_accounts(id) on delete restrict,
  contact_id uuid,
  created_at timestamptz not null default now(),
  check (not (debit > 0 and credit > 0))
);

create index idx_journal_lines_entry_id on journal_lines (journal_entry_id);
create index idx_journal_lines_account_id on journal_lines (account_id);

create table accounting_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  period_name text not null,
  start_date date not null,
  end_date date not null,
  status accounting_period_status_enum not null default 'OPEN',
  closed_at timestamptz,
  closed_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_name),
  check (start_date <= end_date)
);

create index idx_accounting_periods_business_id on accounting_periods (business_id);

create table accounting_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  name text not null,
  description text,
  match_pattern text,
  debit_account_id uuid references accounts(id) on delete restrict,
  credit_account_id uuid references accounts(id) on delete restrict,
  auto_suggest boolean not null default true,
  auto_post boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_accounting_rules_business_id on accounting_rules (business_id);

create table bank_statements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  financial_account_id uuid not null references financial_accounts(id) on delete restrict,
  file_name text not null,
  file_type text,
  statement_start_date date,
  statement_end_date date,
  opening_balance numeric(18,2) not null default 0,
  closing_balance numeric(18,2) not null default 0,
  status text not null default 'IMPORTED',
  uploaded_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_bank_statements_business_id on bank_statements (business_id);

create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  bank_statement_id uuid not null references bank_statements(id) on delete restrict,
  transaction_date date not null,
  description text,
  reference text,
  amount numeric(18,2) not null check (amount >= 0),
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  running_balance numeric(18,2),
  normalized_description text,
  status statement_status_enum not null default 'IMPORTED',
  check (not (debit > 0 and credit > 0))
);

create index idx_bank_transactions_statement_id on bank_transactions (bank_statement_id);

create table reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  bank_transaction_id uuid not null references bank_transactions(id) on delete restrict,
  transaction_id uuid references transactions(id) on delete restrict,
  matched_amount numeric(18,2) not null check (matched_amount >= 0),
  match_type match_type_enum not null default 'AUTO',
  matched_by uuid references users(id) on delete restrict,
  matched_at timestamptz not null default now()
);

create index idx_reconciliation_matches_business_id on reconciliation_matches (business_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  entity_type text not null,
  entity_id uuid,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  file_hash text,
  processing_status text not null default 'PENDING',
  uploaded_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_attachments_business_id on attachments (business_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  user_id uuid references users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_business_id on audit_logs (business_id);
create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_users_updated_at
before update on users
for each row execute procedure set_updated_at();

create trigger set_businesses_updated_at
before update on businesses
for each row execute procedure set_updated_at();

create trigger set_subscriptions_updated_at
before update on subscriptions
for each row execute procedure set_updated_at();

create trigger set_financial_accounts_updated_at
before update on financial_accounts
for each row execute procedure set_updated_at();

create trigger set_accounts_updated_at
before update on accounts
for each row execute procedure set_updated_at();

create trigger set_transactions_updated_at
before update on transactions
for each row execute procedure set_updated_at();

create trigger set_accounting_periods_updated_at
before update on accounting_periods
for each row execute procedure set_updated_at();

create trigger set_accounting_rules_updated_at
before update on accounting_rules
for each row execute procedure set_updated_at();
