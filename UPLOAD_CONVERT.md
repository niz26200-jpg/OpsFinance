# Upload & Convert architecture

## Overview

The Phase 4 workflow follows the project’s accounting-first architecture:

Upload → Parse → Normalize → Detect → Suggest → Review → Approve → Transaction Service → Accounting Engine → Journal → Ledger

The upload layer never creates journal lines directly. It prepares a reviewable candidate that is approved through the existing transaction service before accounting posting occurs.

## Supported starter scope

- Bank statement: CSV and Excel
- PDF: safe text extraction only when a runtime parser is available; otherwise a clear unsupported state is shown
- Receipt: manual review/input if OCR is not available
- Invoice / Bill: ingestion + review only

## Validation rules

Uploaded files must be validated before processing:

- extension check
- MIME check
- size limit
- empty file detection
- malformed file detection
- unsupported file rejection

The server must treat uploaded content as untrusted and must verify the file, source, business, and account ownership before any accounting action.

## Normalization

The normalization layer standardizes:

- dates
- amounts
- descriptions
- references
- currencies
- direction (debit/credit)

Raw values are retained for audit purposes and are not overwritten by normalized values.

## Detection and suggestion

Imported rows are converted into candidate transactions. The engine proposes likely accounting logic based on normalized data and source type, but the suggestion remains editable and review-first. Auto-post remains disabled in this phase.

## Review and approval

Candidates must pass review before approval. Duplicate records remain review-only until a user resolves the conflict. Approved candidates are posted only through the existing transaction service and accounting engine.

## Security and audit

- business isolation remains enforced by the engine and transaction service
- uploaded files are not a bypass around authorization checks
- key import, mapping, approval, override, and posting actions are preserved in the audit trail

## Known limitations

- no full OCR implementation is assumed in this environment
- PDF extraction is intentionally conservative and will not fabricate data
- the Phase 4 scope is ingestion, review, and conversion, not reconciliation or reporting
