# Bank Reconciliation

## Scope

This implementation covers the Phase 5 reconciliation workflow for OpsFinance. It is intentionally limited to reconciliation logic and does not replace the canonical accounting flow.

## Accounting boundary

All accounting effects must flow through:

Reconciliation
→ Transaction Service
→ Accounting Engine
→ Journal
→ Ledger

Reconciliation may compare immutable imported bank data to book transactions, but it does not post journal lines directly. Any exception, adjustment, missing transaction, charge, or interest must be created through the transaction service and posted by the accounting engine.

## Matching rules

- exact one-to-one matches are accepted when amount, date, reference, direction, and description align.
- amount matching is accepted when the values are equal within decimal precision.
- date tolerance is ±3 calendar days.
- description matching is normalized by lowercasing and stripping non-alphanumeric characters.
- reference matching checks whether the bank reference contains the book reference.
- direction validation requires a bank credit to align with a money-in book transaction and a bank debit to align with a money-out book transaction.
- confidence scores are computed from the same rules and capped at 100.
- duplicate matches are prevented by idempotency and by session-level uniqueness checks.
- financial-account isolation is enforced at runtime; a bank or book transaction cannot cross into another financial account or business.

## Match groups

Match groups support both one-to-many and many-to-one relationships within the same session and financial account. Group totals are computed as the sum of the member bank transactions and book transactions, with a deterministic difference equal to bank total minus book total.

A match group cannot reuse bank or book transactions already assigned to another group in the same session. This prevents ambiguous or overlapping reconciliation states.

## Partial matches

Partial matches are created when the bank and book totals do not match exactly. They include:

- bank amount
- book amount
- difference
- status
- resolution state
- approval requirement

Partial matches are never silently converted into an accounting adjustment. They require explicit approval before the reconciliation can complete, and they remain visible in the audit trail.

## Exceptions and accounting effects

The following exception types are supported:

- bank charge
- bank interest
- missing transaction
- adjustment/difference

Each one is created via the reconciliation service, but it ultimately passes through the transaction service before the accounting engine posts the journal. This guarantees the canonical accounting path remains intact.

## Completion and lock

Reconciliation completion is blocked while unresolved unmatched records or pending partial matches remain. Once a reconciliation is complete, it may be locked. A lock is service-level immutable enforcement: mutation operations fail after lock, and any subsequent correction must be recorded as an audit event and preserve the historical chain.

## Idempotency and security

The service enforces idempotency on repeated actions such as:

- auto match
- manual match
- group creation
- exception creation
- completion
- lock

Business-level isolation is enforced in service methods and is not delegated to UI filtering. A cross-business access attempt raises an authorization error.

## Audit trail

Audit entries are recorded for:

- create
- auto match
- manual match
- group match
- partial match
- approval
- exception
- completion
- lock
- correction/reversal
- blocked or failed integrity-sensitive actions

## E2E browser runner status

E2E browser runner is not configured in this repository.

## Validation

The repository validation commands are:

- npm test
- npm run typecheck
- npm run lint
- npm run build
- git diff --check

