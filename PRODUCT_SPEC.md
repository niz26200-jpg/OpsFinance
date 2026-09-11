# OpsFinance Product Specification

**Status:** Locked Phase 0 foundation specification  
**Product:** OpsFinance  
**Tagline:** Accounting Made Simple

This document is the authoritative product requirement for future phases.
Implementation must not weaken or silently reinterpret these requirements.

## 1. Product identity

OpsFinance is a modern cloud accounting platform for SMEs, conceptually
comparable to traditional SME accounting software such as UBS. It belongs to
the Ops ecosystem: OpsPS, OpsHub, OpsOne, and OpsFinance.

Target platforms are web, iOS, and Android. The primary domain is
`myops.com.my`; the application domain is `app.myops.com.my`.

## 2. Core accounting principle

The accounting engine is the single source of truth:

```text
Transaction -> Journal -> Ledger -> Financial Accounts -> Financial Statements
```

No separate financial calculation logic may be created for dashboards,
reports, mobile, web, or reconciliation. Every financial output ultimately
derives from posted journal lines.

Every posted journal must satisfy `total debit = total credit`. Posted records
are never destructively edited or deleted. Corrections use a reversal,
adjustment, or correcting journal.

## 3. Starter plan (locked)

**Price:** RM29/month

Entitlements:

- 1 business
- 1 user

Financial accounts: Bank, Cash, E-wallet, and Credit Card.

Accounting: Chart of Accounts, Money In, Money Out, Transfer, and Journal
Entry.

Reports: General Ledger, Account Statement, Trial Balance, Profit & Loss,
Balance Sheet, and Cash Flow.

Uploads: Bank Statement, PDF, CSV, Excel, Receipt, and Invoice.

The Starter plan excludes multiple users, multiple businesses, advanced AI,
payroll, inventory management, a full invoicing module, advanced tax features,
and advanced approval workflows. The architecture must support higher plans
without rebuilding the accounting engine.

### Upload and conversion flow

```text
PDF / Excel / CSV / Receipt / Invoice
 -> Extract
 -> Normalize
 -> Detect Transaction
 -> Suggest Accounting Logic
 -> User Review/Edit
 -> Approve
 -> Create Journal
 -> Post
 -> Ledger
 -> Financial Reports
```

Uploads must never automatically post accounting entries. Defaults are
`auto_suggest = YES` and `auto_post = OFF`.

### Bank reconciliation capability

Reconciliation must support automatic matching, unmatched bank, unmatched
book, manual matching, partial matches, one-to-many, many-to-one, duplicate
detection, date tolerance, description normalization, reference matching,
confidence score, bank charge suggestions, interest suggestions, creating a
missing transaction, difference detection, completion, lock/history, and an
audit trail.

Reconciliation is not the accounting engine. Any accounting effect must flow
through Transaction -> Journal -> Ledger.

## 4. Locked navigation

```text
OPSFINANCE
Accounting Made Simple

Dashboard

Transactions
  All Transactions
  Money In
  Money Out
  Transfer
  Journal Entry

Accounts
  Financial Accounts
  Chart of Accounts

Upload & Convert
  Bank Statement
  Invoice / Bill
  Receipt

Reconciliation

Reports
  Profit & Loss
  Balance Sheet
  Trial Balance
  General Ledger
  Account Statement

Settings
  Business Profile
  Accounting Settings
  Accounting Rules
  Subscription
```

## 5. Dashboard requirements

The dashboard contains Total Cash, Sales, Expenses, Net Profit, financial
account balances, recent transactions, action-required items, quick actions,
and reconciliation status.

Action-required items are transactions needing accounting logic, unmatched
bank transactions, and transactions awaiting approval. Quick actions are
Money In, Money Out, Transfer, Upload Statement, Upload Invoice, and Upload
Receipt.

The dashboard may only read from the accounting engine. It must not maintain
independent calculations.

## 6. Planned domain entities

The planned entities are `users`, `businesses`, `business_members`,
`subscriptions`, `financial_accounts`, `accounts`, `transactions`,
`journal_entries`, `journal_lines`, `accounting_periods`, `accounting_rules`,
`bank_statements`, `bank_transactions`, `reconciliation_matches`,
`attachments`, and `audit_logs`. `accounts` is the actual Chart of Accounts
table name. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the foundation
model.

## 7. Reports and invariants

Reports are General Ledger, Account Statement, Trial Balance, Profit & Loss,
Balance Sheet, and Cash Flow. They all derive from posted journal lines only.

- Profit & Loss: `Revenue - COGS - Expenses = Net Profit`
- Balance Sheet: `Assets = Liabilities + Equity`
- Trial Balance: `Total Debit = Total Credit`

## 8. Architecture direction

- Web: Next.js
- Mobile: React Native + Expo
- Backend: API/service layer
- Database: PostgreSQL
- Accounting engine: shared, server-side accounting core

Web and mobile call the same API/service layer. The accounting engine is not
duplicated in either client.

## 9. Explicit Phase 0 exclusions

Phase 0 creates specifications only. It does not implement the accounting
application, UI screens, database migrations, authentication, payment
processing, APIs, or mobile/web projects. Future work must follow
[ROADMAP.md](ROADMAP.md) and stop at the requested phase.