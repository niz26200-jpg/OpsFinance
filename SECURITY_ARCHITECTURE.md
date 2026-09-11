# Security Architecture Foundation

Security is a server-side responsibility. The UI is never a security
boundary. Every API request must establish identity, business membership,
role, subscription entitlement where applicable, and authorization for the
requested resource.

## Identity and authorization

Authentication is planned for Phase 1 and must use a managed, secure approach;
credentials and tokens must never be stored in source code. Authorization is
server-side and business-scoped. Every query and mutation must enforce
`business_id` isolation and verify ownership through membership.

The data model supports future roles through `business_members.role`. Starter
currently permits one user, but this is an entitlement, not a reason to remove
membership or role structure. PostgreSQL Row Level Security is now the
hardening baseline for business-owned tables; backend authorization checks
remain mandatory and are the authoritative application control.

The implemented model is:

- authenticated user -> `users` row matching `auth.uid()`
- `business_members` ties the user to a business
- business-owned tables enforce `business_id` membership checks
- application queries may only read and modify rows for businesses the user is
  authorized to access
- service-role access remains reserved for trusted server-side operations and
  must not be used from browser code

## Accounting integrity

- Journal posting is atomic with rollback on any validation or write failure.
- Posted journals cannot be destructively edited or deleted.
- Corrections use reversal, adjustment, or correcting journals.
- Accounting periods are `OPEN` or `CLOSED`; closed periods reject posting.
- Financial reports query posted journals only.
- Monetary precision and rounding are deterministic and server-side.
- Financial records use `VOIDED`, `REVERSED`, or `ARCHIVED` states rather than
  hard deletion.
- Audit logs capture actor, business, entity, action, before/after values,
  request ID, and timestamp.
- Idempotency protects retries from creating duplicate financial effects.

## Tenant isolation

All business-owned data is filtered and authorized by `business_id`.
Cross-business foreign keys are rejected. Tests must include attempts to read,
modify, match, upload, or post another business's records. The database layer
now enforces business membership for all relevant tables via RLS. These checks
must not substitute for explicit backend checks, but they materially reduce the
risk of client-driven business contamination.

The core access predicate is:

```sql
exists (
  select 1
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.business_id = target_table.business_id
)
```

This is enforced for business-scoped tables, while user-facing profile access is
restricted to the authenticated user's own row.

## Upload security

Uploads are untrusted input. The service must validate file type, extension,
content signature, size, hash, malware scanning policy, storage key, and
access permissions. Files are stored outside the application source tree and
served through authorized access. Upload metadata includes uploader, business,
source entity, file hash, and timestamps. Duplicate files are detected without
silently creating accounting entries.

Extraction and normalization are reviewable transformations. Uploads never
auto-post. `auto_suggest` defaults to YES and `auto_post` defaults to OFF.
Original bank statement source values are immutable.

## Secrets, transport, and mobile

- Secrets, database credentials, signing keys, and provider credentials live
  outside source control in a managed secret store or deployment environment.
- HTTPS is required for all production traffic.
- Logs must not contain passwords, tokens, payment secrets, or unnecessary
  personal data.
- Mobile tokens use platform-secure storage and are never kept in plain
  application storage.
- Dependencies, file parsers, and upload processing receive security updates.

## Subscription and payment separation

Subscription lifecycle is `ACTIVE -> PAST DUE -> GRACE PERIOD -> SUSPENDED`.
Starter is RM29/month. Suspension retains accounting data. Subscription and
payment records are stored and processed separately from the business
accounting ledger; provider events must not become business journals by
accident. Subscription enforcement is server-side and cannot rely on hidden
or disabled UI controls.

## Recovery and operations

Backups, recovery procedures, restore testing, monitoring, access review,
incident response, and audit-log retention are mandatory production concerns.
Restore tests must verify that posted journal integrity, tenant isolation,
immutable bank sources, and audit history survive recovery.