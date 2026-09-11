# Accounting Engine Foundation

## Authority and invariants

The server-side accounting engine is the only authority for financial state.
The required flow is:

```text
Transaction -> Journal Entry + Journal Lines -> Ledger -> Reports
```

Only `POSTED` journal lines are eligible for ledger balances, account
statements, trial balance, Profit & Loss, Balance Sheet, Cash Flow, dashboard
summaries, and reconciliation book values. Draft, review, approved, voided,
and reversed records are not posted balances.

For every posted journal:

```text
sum(journal_lines.debit) = sum(journal_lines.credit)
```

Amounts are non-negative decimal monetary values with deterministic precision
and rounding. A line must have exactly one positive side: debit or credit.
The posting operation is atomic: all validation and writes succeed together,
or none do.

## Posting lifecycle

1. Create or import a transaction in `DRAFT`.
2. Extract and normalize source data when applicable.
3. Apply accounting rules to suggest accounts and debit/credit logic.
4. Move to `REVIEW` for user review and edits.
5. Require explicit approval before journal creation.
6. Create a journal entry and its complete journal lines in one transaction.
7. Validate business ownership, open accounting period, accounts, currency,
   non-negative amounts, and balanced totals.
8. Post atomically, recording `posted_at`, `posted_by`, and an audit event.
9. Make the posted journal available to ledger and report queries.

Uploads use `auto_suggest = YES` and `auto_post = OFF`. No uploaded source,
regardless of extraction confidence, may bypass review and approval.

## Corrections and immutability

Posted journal entries and lines cannot be destructively edited or deleted.
Corrections create a reversal, adjustment, or correcting journal that links to
the original and records the reason and actor in the audit trail. Financial
records are never hard-deleted. Lifecycle states such as `VOIDED`, `REVERSED`,
and `ARCHIVED` preserve history.

## Accounting rules

| Business event | Debit | Credit |
| --- | --- | --- |
| Sales paid into bank | Bank | Sales Revenue |
| Expense paid | Expense | Bank |
| Purchase | Inventory / COGS | Bank / Accounts Payable |
| Customer invoice | Accounts Receivable | Sales |
| Customer payment | Bank | Accounts Receivable |
| Supplier invoice | Expense / Inventory | Accounts Payable |
| Supplier payment | Accounts Payable | Bank |
| Transfer | Destination Account | Source Account |
| Opening balance | Financial Account | Opening Equity |

A transfer must not affect Profit & Loss. Example opening balance:

```text
DR Maybank         RM10,000
CR Opening Equity  RM10,000
```

Example sales receipt:

```text
DR Maybank  RM500
CR Sales    RM500
```

## Ledger and reports

The ledger is a deterministic projection/query over posted journal lines,
grouped by business, account, period, and optionally financial account or
contact. It is not a second source of truth. Report queries must filter for
posted journals and must not recalculate from transaction uploads or bank
statement rows.

- General Ledger: chronological posted lines by account.
- Account Statement: activity and running balance for one account.
- Trial Balance: debit and credit totals by account; totals must balance.
- Profit & Loss: Revenue minus COGS minus Expenses.
- Balance Sheet: Assets against Liabilities plus Equity.
- Cash Flow: derived from posted cash and cash-equivalent account activity.

## Financial accounts and Chart of Accounts

Each financial account maps to one corresponding `accounts` row. Starter
examples are Maybank -> BANK -> `1110`, Cash -> CASH -> `1100`, and TNG ->
E_WALLET -> `1130`. The default account families and accounts are defined in
[PRODUCT_SPEC.md](PRODUCT_SPEC.md) and the planned table is documented in
[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Reconciliation boundary

Bank reconciliation compares immutable imported bank source values to book
transactions. It may suggest or create a transaction, but it does not post
accounting directly. Any accounting result must follow:

```text
Transaction -> Journal -> Ledger
```

Matching must preserve the original bank statement values and record match
type, amount, actor, timestamp, confidence, and audit history.