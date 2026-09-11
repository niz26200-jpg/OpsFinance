# Contributing to OpsFinance

OpsFinance is being built in controlled phases. Read the relevant foundation
documents before changing code, and treat the locked product and accounting
requirements as contracts.

## Development workflow

1. Inspect the repository, current branch, remote, and working tree before
   making changes.
2. Identify the owning module and preserve unrelated user work.
3. Make the smallest change that satisfies the requirement.
4. Add or update focused tests for behavior and accounting invariants.
5. Run formatting, lint, type checks, tests, and relevant documentation checks.
6. Fix failures and retest until the checks pass.
7. Inspect the diff and confirm no secrets or unrelated changes are included.
8. Commit with a clear message only after validation.
9. Push the requested branch and verify the remote result.

This is the mandatory loop:

```text
BUILD -> TEST -> FIX -> RETEST -> PASS -> COMMIT -> PUSH
```

## Accounting rules for contributors

- Do not create a financial calculation path outside the accounting engine.
- Reports, dashboard summaries, web, mobile, and reconciliation use posted
  journal lines as their source.
- Every posted journal balances debits and credits.
- Never destructively edit or delete posted financial records.
- Use reversals, adjustments, and correcting journals.
- Enforce business isolation and authorization on the server.
- Keep subscription/payment records separate from business accounting.
- Never allow an upload to auto-post.

## Tests and documentation

Tests must cover tenant isolation, atomic posting, balance invariants, closed
period protection, correction behavior, idempotency, upload duplicate
protection, immutable bank source data, reconciliation boundaries, and report
source-of-truth behavior as those features are implemented.

New behavior must be documented in the appropriate foundation document. Do not
add migrations, UI screens, authentication, payment processing, or application
features before their roadmap phase.

## Commit and push discipline

Use focused commits. Do not commit secrets, local environment files, generated
build output, credentials, private uploads, or database dumps. Before pushing,
review `git diff`, `git status`, and the commit contents. The contributor must
report the commit SHA and push status; never claim a change was saved remotely
unless the push completed successfully.