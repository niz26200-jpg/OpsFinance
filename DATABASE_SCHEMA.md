# Planned Database Schema

**Database:** PostgreSQL  
**Status:** Planned foundation only; no migrations are created in Phase 0.

All business-owned tables carry `business_id` directly or through a required
parent relationship. All primary keys are opaque IDs. Timestamps are stored in
UTC. Monetary values use fixed-precision `NUMERIC`, never floating point.

## Tables and fields

### Identity and subscription

`users`: `id`, `email`, `name`, `created_at`, `updated_at`.

`businesses`: `id`, `name`, `registration_no`, `address`, `phone`, `email`,
`base_currency`, `fiscal_year_start`, `created_at`, `updated_at`.

`business_members`: `id`, `business_id`, `user_id`, `role`, `created_at`.
The unique pair `(business_id, user_id)` prevents duplicate membership while
supporting future multiple users and roles. Starter entitlement currently
limits the business to one user through server-side subscription enforcement.

`subscriptions`: `id`, `business_id`, `plan`, `status`, `price`, `currency`,
`period_start`, `period_end`, `provider_customer_id`,
`provider_subscription_id`, `created_at`, `updated_at`. Payment/subscription
records are not accounting journals.

### Accounts and transactions

`financial_accounts`: `id`, `business_id`, `name`, `type`, `account_code`,
`currency`, `opening_balance`, `opening_balance_date`, `status`, `account_id`,
`created_at`, `updated_at`. `account_id` maps the financial account to
`accounts`.

Types: `BANK`, `CASH`, `E_WALLET`, `CREDIT_CARD`, `LOAN`, `OTHER`.

`accounts`: `id`, `business_id`, `code`, `name`, `account_type`, `parent_id`,
`normal_balance`, `is_system`, `is_active`, `created_at`, `updated_at`.
Account types are `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `COGS`, and
`EXPENSE`. `parent_id` is a self-reference for account hierarchy.

`transactions`: `id`, `business_id`, `transaction_no`, `transaction_date`,
`transaction_type`, `description`, `reference_no`, `amount`, `currency`,
`status`, `source`, `financial_account_id`, `contact_id`, `created_by`,
`created_at`, `updated_at`.

Types: `MONEY_IN`, `MONEY_OUT`, `TRANSFER`, `JOURNAL`. Sources: `MANUAL`,
`UPLOAD`, `IMPORT`, `SYSTEM`. Statuses: `DRAFT`, `REVIEW`, `APPROVED`,
`POSTED`, `VOIDED`.

`journal_entries`: `id`, `business_id`, `journal_no`, `journal_date`,
`source_type`, `source_id`, `description`, `status`, `posted_at`, `posted_by`,
`created_at`.

`journal_lines`: `id`, `journal_entry_id`, `account_id`, `debit`, `credit`,
`description`, `financial_account_id`, `contact_id`, `created_at`.

### Periods and rules

`accounting_periods`: `id`, `business_id`, `start_date`, `end_date`, `status`,
`closed_at`, `closed_by`, `created_at`, `updated_at`. Statuses are `OPEN` and
`CLOSED`.

`accounting_rules`: `id`, `business_id`, `name`, `event_type`, `conditions`,
`debit_account_id`, `credit_account_id`, `priority`, `is_active`,
`created_at`, `updated_at`. Conditions are structured data validated by the
service layer.

### Bank import and reconciliation

`bank_statements`: `id`, `business_id`, `financial_account_id`, `file_name`,
`file_type`, `file_hash`, `statement_start_date`, `statement_end_date`,
`opening_balance`, `closing_balance`, `status`, `uploaded_by`, `created_at`.

`bank_transactions`: `id`, `bank_statement_id`, `transaction_date`,
`description`, `reference`, `amount`, `debit`, `credit`, `running_balance`,
`normalized_description`, `status`.

Statuses are `IMPORTED`, `MATCHED`, `UNMATCHED`, and `IGNORED`. Imported source
values are immutable.

`reconciliation_matches`: `id`, `business_id`, `bank_transaction_id`,
`transaction_id`, `matched_amount`, `match_type`, `confidence_score`,
`matched_by`, `matched_at`. Match types are `AUTO`, `MANUAL`, and `PARTIAL`.
The design must support one-to-many and many-to-one matching through multiple
rows and enforce that summed matched amounts do not exceed source amounts.

### Files and audit

`attachments`: `id`, `business_id`, `uploaded_by`, `entity_type`, `entity_id`,
`file_name`, `file_type`, `file_size`, `file_hash`, `storage_key`, `created_at`.

`audit_logs`: `id`, `business_id`, `actor_id`, `entity_type`, `entity_id`,
`action`, `before_data`, `after_data`, `request_id`, `created_at`.

## Relationships

```text
users <-> business_members -> businesses
businesses -> subscriptions
businesses -> financial_accounts -> accounts
businesses -> accounts -> accounts (parent_id)
businesses -> transactions -> journal_entries -> journal_lines -> accounts
businesses -> accounting_periods
businesses -> accounting_rules
businesses -> bank_statements -> bank_transactions
bank_transactions <-> reconciliation_matches -> transactions
businesses -> attachments
businesses -> audit_logs
```

Foreign keys use restrictive behavior for posted financial records. A
financial account must not reference an account belonging to another
business. `contact_id` remains a future reference until a contact model is
introduced.

## Constraints and indexes

- Unique `users.email` and business-scoped `accounts.code`.
- Unique business-scoped `transaction_no` and `journal_no`.
- Unique `(business_id, account_code)` for financial accounts.
- `amount`, `debit`, and `credit` are non-negative `NUMERIC` values.
- A journal line cannot have both debit and credit positive; posted journals
  require at least one line on each side and equal totals.
- Posted journal date must belong to an `OPEN` accounting period.
- Posted journal entries and lines have no destructive update/delete path.
- `fiscal_year_start` and all date ranges are validated server-side.
- Index all business-scoped foreign keys.
- Index `(business_id, transaction_date)`, `(business_id, status)`,
  `(business_id, account_id, journal_date)` through the journal relationship,
  and bank transaction status/date.
- Index `file_hash` within business scope to detect duplicate uploads.
- Use an idempotency key table or equivalent unique request constraint for
  mutating API operations.
- Use check constraints where possible, with matching service-layer checks.

These are design constraints for future migrations, not a migration plan in
Phase 0.