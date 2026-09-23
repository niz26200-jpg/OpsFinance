# OpsFinance Backend Persistence Readiness

Status date: 2026-09-23
Locked implementation baseline: `1baaf77c347ba567248ab2021e7008132620dc19`

## Current State

| Area | Classification | Status | Evidence / boundary |
| --- | --- | --- | --- |
| Authentication | Local/demo plus static contract | BLOCKED for production | `packages/shared/auth.ts`; no Supabase Auth client or persistent session |
| Users | Schema contract plus local domain types | PARTIAL | `supabase/migrations/001_phase1_foundation.sql`; no user repository or live adapter |
| Businesses | Local/in-memory service | LOCAL / READY FOR ADAPTER | `packages/business.ts`; `BusinessService` stores `Map` state |
| Business members | Local subscription/business membership plus SQL contract | PARTIAL | `SubscriptionService`, `BusinessService`, `business_members` migration |
| Subscriptions | Local/in-memory service | LOCAL / READY FOR ADAPTER | `packages/subscriptions.ts`; no subscription SQL repository implementation |
| Payments | Local provider abstraction | NOT CONFIGURED | `PaymentRecord` and idempotency maps only; no provider or payment table |
| Financial accounts | Local/in-memory service plus SQL/RLS contract | PARTIAL | `packages/financial-accounts.ts`, migration tables and policies |
| Chart of accounts | Local/in-memory service plus SQL/RLS contract | PARTIAL | `packages/chart-of-accounts.ts`, `accounts` table and seed |
| Transactions | Local accounting service/engine | LOCAL / READY FOR ADAPTER | `TransactionService` and `AccountingEngine` use `Map` stores |
| Journal entries | Local accounting engine plus SQL/RLS contract | PARTIAL | `AccountingEngine`; `journal_entries` migration |
| Journal lines | Embedded local journal lines plus SQL/RLS contract | PARTIAL | `JournalEntry.lines`; `journal_lines` migration |
| Accounting periods | Local accounting engine/business service plus SQL/RLS contract | PARTIAL | `AccountingEngine`, `BusinessService`, migration |
| Accounting rules | Local service plus SQL/RLS contract | PARTIAL | `packages/accounting-rules.ts`, migration |
| Bank statements | Local reconciliation service plus SQL/RLS contract | PARTIAL | `FinancialStatement`; `bank_statements` migration |
| Bank transactions | Local reconciliation service plus SQL/RLS contract | PARTIAL | `BankTransaction`; `bank_transactions` migration |
| Reconciliation matches | Local reconciliation service plus SQL/RLS contract | PARTIAL | `ReconciliationMatch` and groups; SQL currently models only one transaction link |
| Attachments | Upload metadata is local; SQL storage metadata exists | PARTIAL | `UploadRecord`; `attachments` has storage metadata but no adapter or raw immutable payload contract |
| Audit logs | Local service audit arrays/maps plus SQL/RLS contract | PARTIAL | upload, transaction, reconciliation, billing audit trails; no shared audit repository implementation |
| Platform billing records | Local-only | BLOCKED for persistence | `PaymentRecord`; no `payments` or provider-event table |

A repository interface is not persistence. The `Local*Repository` classes and service `Map` stores are deterministic local implementations only. No Supabase repository adapter exists and no migration has been applied to a live project.

Audited schema entities: `users`, `businesses`, `business_members`, `subscriptions`, `financial_accounts`, `accounts`, `transactions`, `journal_entries`, `journal_lines`, `accounting_periods`, `accounting_rules`, `bank_statements`, `bank_transactions`, `reconciliation_matches`, `attachments`, `audit_logs`, and platform payment records.

## Accounting Source Of Truth

The provider-independent path remains:

```text
Transaction -> Journal -> Journal Lines -> Ledger -> Financial Statements
```

Upload and reconciliation call `TransactionService`; they do not calculate journals, ledger balances, or reports. Future Supabase adapters must implement repository interfaces around this path, not move accounting calculations into SQL client code.

## Schema Contract Audit

The existing migration sequence is:

1. `001_phase1_foundation.sql`: extensions, enums, users, businesses, memberships, subscriptions, accounting tables, bank tables, attachments, audit logs, timestamps, indexes.
2. `002_phase1_5_rls.sql`: membership-based RLS policies and non-destructive delete policy intent.
3. `003_phase10a_supabase_foundation.sql`: posted journal and journal-line mutation guard functions/triggers.
4. `seed/001_default_coa.sql`: default chart of accounts seed data.

The following discrepancies are concrete future migration/adapter requirements. They are intentionally not changed without a live schema decision:

- `subscriptions` lacks `owner_user_id`, `monthly_price`, `currency`, `next_billing_date`, `grace_period_start`, `suspended_at`, `cancelled_at`, and a unique business subscription constraint. SQL status also omits `CANCELLED`.
- `business_members` lacks the domain `active`, `updated_at`, and membership lifecycle fields.
- `payments` and provider-event/idempotency storage are absent. Payment records currently exist only in memory.
- `transactions` requires SQL `transaction_no`, `currency`, and `source`, while the local record does not expose all of those fields; source/account ownership constraints need an adapter contract.
- `journal_entries` lacks SQL `reference_no`; `journal_lines` has no direct `business_id`, so ownership is nested through `journal_entries`.
- `accounting_rules` SQL has `match_pattern`, debit/credit accounts, and no priority/match type/suggested financial account fields used by the service.
- `bank_statements` SQL status and fields do not represent the local session lifecycle, raw data, normalized data, import hash, or processing errors.
- `bank_transactions` SQL lacks direct `business_id`, `financial_account_id`, direction, source, transaction identifier, and raw immutable payload fields.
- `reconciliation_matches` SQL supports one `transaction_id` and has no session, confidence, difference, resolution, lock/history, or one-to-many/many-to-one representation.
- `attachments` SQL has storage metadata but no raw immutable content reference, normalized data reference, import identifier, or duplicate-processing contract.
- `audit_logs` requires `business_id`, which is unsuitable for explicitly platform-scoped billing events; it also lacks request/idempotency correlation fields.
- SQL has no explicit foreign keys from transaction accounting fields such as `financial_account_id` to the matching business-owned account pair, and no database-level balanced-journal constraint.

These are documentation findings, not claims that the current schema is wrong. A future migration must be designed and reviewed against the domain contract before deployment.

## Persistence Contracts

### Accounting

`TransactionRepository` and `JournalRepository` exist in `packages/repositories.ts`, with local implementations. A future adapter must support draft/review updates, approval, posting, void/reversal, journal lines, closed-period validation, idempotency, and business-scoped reads. `Ledger` and report reads currently belong to `AccountingEngine`; they must remain derived from posted journals.

### Atomic posting

The required future persistence transaction is:

```text
transaction row + journal row + journal-line rows + audit event
```

A failure must leave no posted transaction, journal, journal lines, or ledger-visible state. This is a contract only. It has not been executed against Supabase. The future implementation must use a database transaction/RPC or equivalent server-side atomic operation. Local `Map` operations are not a substitute for database atomicity.

### Posted journal immutability

Local `AccountingEngine.updateJournal` rejects posted and voided journals, and migration `003_phase10a_supabase_foundation.sql` provides update triggers for posted journal entries and lines. Migration `002_phase1_5_rls.sql` denies deletes. Static contract status is PASS.

Concrete future database requirements:

- enforce immutability for every posted journal and line column, including ownership and dates;
- prevent direct status changes that mutate posted content;
- require reversal/adjustment workflows for corrections;
- add a balanced-journal transaction/RPC guard;
- review insert/update policies so a member cannot move a draft record across businesses.

Live database verification is BLOCKED.

## Business Isolation and RLS Design

Every business-owned operation must resolve membership before access. Local services use business IDs and ownership checks; repositories use `listByBusiness` and business-aware `getById`. The future adapters must repeat these checks server-side and must never trust UI filtering or client-provided ownership.

Static RLS design audit: PASS. Live RLS UAT: BLOCKED.

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| businesses | authorized members | authenticated users | owner/admin | denied |
| business_members | self or authorized business | self or owner/admin | self or owner/admin | denied |
| subscriptions | authorized members | owner/admin | owner/admin | denied |
| financial_accounts, accounts, periods, rules | business members | owner/admin | owner/admin | denied |
| transactions, journal_entries | business members | authorized members | currently authorized members; posted immutability requires guard | denied |
| journal_lines | via owning journal membership | via owning journal membership | via owning journal membership; posted trigger guard | denied |
| bank_statements, bank_transactions, reconciliation_matches | business membership path | authorized members | authorized members | denied |
| attachments | business members | authorized members | authorized members | denied |
| audit_logs | business members | authorized members | denied | denied |

The policy text exists in `002_phase1_5_rls.sql`, but no live policy execution has occurred.

## Authentication and Membership Contract

The intended production flow is:

```text
Supabase Auth -> users -> business_members -> business context -> authorization
-> subscription -> entitlement -> feature/service action
```

Current code has local auth helpers and domain membership checks, but no persistent Auth session, password reset, email verification, server action, or Supabase Auth integration. Future replacement points are `packages/shared/auth.ts`, the app route/server boundary, and repository/service constructors. Do not treat demo IDs in UI components as production authentication.

Starter remains one business and one active user. `SubscriptionService` enforces those limits locally and `BusinessService` can delegate business creation to it. A future membership repository must persist `user_id`, `business_id`, `role`, active/inactive state, `created_at`, and `updated_at`.

## Upload and Reconciliation Contracts

Uploads preserve raw and normalized local data, file hash, source metadata, status, business, actor, timestamps, duplicate references, and audit events. Raw data must be immutable in a future storage layer. The lifecycle remains `IMPORTED -> PARSED -> REVIEW -> MAPPED -> APPROVED -> POSTED -> RECONCILED`; posting remains through the transaction/accounting boundary.

Reconciliation local models represent sessions, matches, groups, confidence, reasons, differences, partial resolution, completion, lock, and audit history. The future schema must add a match-group/join model or equivalent to represent one-to-many and many-to-one relationships without creating new journals for existing book transactions.

## Idempotency and Audit

Future unique constraints/transactions are required for these keys:

| Operation | Local key/reference | Future persistence requirement |
| --- | --- | --- |
| transaction creation | caller `idempotencyKey` | unique per business and operation |
| journal posting | posting idempotency key and journal source | unique event/source key |
| upload processing | business + file hash and normalized transaction signature | unique business-scoped hash/signature |
| reconciliation action | session + bank/book IDs | unique match relationship |
| missing/adjustment transaction | deterministic source key | unique source reference |
| subscription renewal | subscription + paid payment ID | unique renewal event |
| payment event | provider event ID/invoice reference | unique provider event ID |

Audit records need business scope when business-owned and explicit platform scope for billing events. Required fields are actor, action, entity type/id, timestamp, metadata, and request/idempotency correlation.

## Configuration Audit

`.env.example` names Supabase URL, publishable/anon/service-role keys, project ID, database URLs, JWT secret, and payment configuration is intentionally absent. `.env` and secret material are ignored. `getSupabaseRuntimeConfig` safely reports missing variables; it does not connect. No credentials are present or committed.

## Deterministic Future UAT Fixtures

Use local fixtures only until a staging project exists. The future UAT seed should include Business A/Owner A and Business B/Owner B, ACTIVE Starter subscriptions, Maybank/Cash/E-wallet accounts, all COA classes, Money In/Money Out/Transfer/Journal Entry, matched/unmatched/partial/duplicate bank rows, bank charge, bank interest, and cross-business denial cases. Do not create these as live users in this phase.

## Exact Integration Steps When Supabase Is Available

1. Provision a separate staging Supabase project and managed secrets; never use production credentials in local files.
2. Decide and review additive migrations for the schema discrepancies listed above, including payment/event tables, lifecycle fields, ownership FKs, match groups, and immutable raw upload storage.
3. Add Supabase implementations of the repository interfaces in `packages/repositories.ts`; keep local implementations for tests.
4. Add server-only Auth/session and membership resolution at the service boundary; do not call Supabase from UI components.
5. Implement posting as one server-side database transaction/RPC covering transaction, journal, lines, audit, balance validation, period validation, and idempotency.
6. Add database constraints/triggers for posted immutability, balanced journals, unique idempotency keys, and no destructive financial deletes.
7. Apply migrations in order: foundation, RLS, immutability, then reviewed additive readiness migrations; load COA seed only in staging.
8. Run cross-business, membership, subscription, accounting, upload, reconciliation, and payment-event UAT against staging.
9. Verify Auth session, logout, password reset, email verification, RLS, storage access, and audit visibility with Owner A, Owner B, and unauthorized users.
10. Record live UAT evidence and blockers before any production rollout. Until then, live persistence/Auth/RLS/payment remain blocked.

## Release Boundary

Local domain/service logic: PASS
Repository abstraction: PARTIAL / persistence-ready contracts exist, local implementations only
Real Supabase persistence: BLOCKED
Supabase Auth: BLOCKED
Live RLS verification: BLOCKED
Real payment provider: NOT CONFIGURED

No migration is executed by this phase, no fake backend is added, and no live Supabase functionality is claimed.
