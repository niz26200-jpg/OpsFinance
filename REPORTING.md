# Reporting architecture

## Source of truth

All financial reports are derived only from posted journal entries and journal lines in the canonical accounting engine. The report layer is a read-only projection over the ledger and does not maintain a second financial ledger.

Canonical path:

Transaction -> Journal -> Journal Lines -> Accounting Engine -> Ledger / Reports

Reports never calculate financial truth from dashboard state, transaction summaries, reconciliation state, or custom report-specific accounting tables.

## Reports included

### General Ledger

Shows account activity for the selected date range and account filter. Each row includes date, journal number, reference, description, account, debit, credit, and running balance.

### Account Statement

Shows balance movement for one account across a selected date range. Includes opening balance, activity, totals, running balance, and closing balance.

### Trial Balance

Aggregates posted journal lines by account and ensures debit totals and credit totals reconcile for the selected range.

### Profit & Loss

Summarizes posted revenue, COGS, and expense activity. Net profit is computed as:

Revenue - COGS - Expenses = Net Profit

### Balance Sheet

Aggregates asset, liability, and equity account balances and validates the accounting equation:

Assets = Liabilities + Equity

### Cash Flow

Reads from the same posted cash and bank account movements and reports opening cash, operating/investing/financing movement, net cash flow, and closing cash.

## Filters and controls

The report UI includes:

- date range controls
- account filter
- report tabs for six report views
- totals display
- loading state
- empty state
- error state

## Posted vs unposted rules

Reports include only posted journals. Draft, review, approved, voided, and reconciliation-only entries are excluded from all report totals.

## Opening balance behavior

Opening balances are calculated from posted entries before the reporting start date. A user-supplied opening journal on the reporting start date is treated as opening balance, not as current-period movement, and it must not be double-counted.

## Accounting periods

Reports respect the configured accounting period boundaries. Closed periods remain readable historically, but reports do not mutate period status or close/open periods.

## Security

Each report service method enforces business authorization before returning data. Cross-business access throws an authorization error and never exposes filtered data.

## Decimal handling

All totals use the existing DecimalMoney implementation. No JavaScript floating-point arithmetic is used for financial truth.

## Cross-report reconciliation rules

Reports are checked against the same canonical posted accounting source. Examples:

- General Ledger and Account Statement reconcile to the same journal source
- Trial Balance debit total equals credit total
- Balance Sheet assets equal liabilities plus equity
- Account Statement opening plus movement equals closing balance
- Cash Flow opening cash plus net change equals closing cash
- Financial account balances reconcile to their corresponding accounting balances

## Read-only enforcement

The reporting layer never mutates journals, journal lines, accounts, financial accounts, or reconciliation records.

## E2E status

E2E: NOT CONFIGURED / N/A

There is no browser automation framework configured for this repository, and this phase does not introduce a large E2E stack.

## Known limitations

The report layer is intentionally aligned to the accounting engine and chart-of-accounts metadata. It does not duplicate accounting data into a secondary ledger. Cash-flow classification remains tied to canonical account-type semantics instead of separate dashboard-only accounting state.

## UAT procedure

1. Create a balanced opening balance journal.
2. Post revenue and expense entries in the reporting range.
3. Review General Ledger rows and account statements.
4. Validate Trial Balance debit/credit equality.
5. Check Profit & Loss, Balance Sheet, and Cash Flow totals.
6. Confirm opening balances reconcile without double-counting.
7. Verify cross-business access is rejected.
8. Confirm report operations remain read-only.
9. Confirm final totals remain deterministic at DecimalMoney precision.

## Implementation status

Phase 6 is implemented as a read-only report layer over the canonical accounting engine and has been validated against the service-level regression suite and accounting reconciliation checks.
