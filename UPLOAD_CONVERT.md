# Upload & Convert architecture

## Overview

The Phase 7 workflow follows the project’s accounting-first architecture:

Upload → Parse → Normalize → Review → Map → Approve → Transaction Service → Accounting Engine → Journal → Ledger

This implementation does not bypass the accounting pipeline. Uploads prepare reviewable candidates; only approved candidates are sent through the existing transaction service and accounting engine for journal creation and posting.

E2E = NOT CONFIGURED / N/A

## Supported scope

- Bank statement: CSV parsing and review-first conversion
- Invoice / Bill: structured extraction and review-first conversion
- Receipt: structured extraction and review-first conversion
- PDF: safe text extraction only when a runtime parser is available; otherwise an explicit unsupported or review-only result is returned

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

Raw values are retained for audit purposes and are not overwritten by normalized values. The service preserves original source fields and tracks them through review, mapping, approval, and posting.

## Detection and suggestion

Imported rows are converted into candidate transactions. The engine proposes likely accounting logic based on normalized data and source type, but the suggestion remains editable and review-first. Auto-post remains disabled in this phase.

## Review and approval

Candidates must pass review before approval. Duplicate records remain review-only until a user resolves the conflict. Approved candidates are posted only through the existing transaction service and accounting engine.

The actual service path is: upload parse -> candidate generation -> mapping -> approval -> transaction service -> accounting engine -> journal -> ledger. This repo does not auto-post from raw uploads.

## Security and audit

- business isolation remains enforced by the engine and transaction service
- uploaded files are not a bypass around authorization checks
- key import, mapping, approval, override, and posting actions are preserved in the audit trail
- raw uploaded data, normalized data, and approval/posting records remain tied to the owning business and are blocked across business boundaries

## Known limitations

- no full OCR implementation is assumed in this environment
- PDF extraction is intentionally conservative and will not fabricate data
- Phase 7 scope covers ingestion, review, mapping, approval, posting, reconciliation integration, and auditability; it is not an E2E automation layer
