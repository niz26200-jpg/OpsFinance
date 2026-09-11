# Supabase UAT Verification and Security Hardening

## Current status

This repository is positioned for Phase 1.5, but live verification is blocked in the current environment because no Supabase UAT project configuration, CLI, or credentials are available here.

The following values are required before live UAT verification can occur:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `DATABASE_URL`

Do not commit any real credentials. Use a managed secret store or environment file excluded from source control.

## Required UAT flow

1. Confirm the target project is the Supabase staging/UAT environment, not production.
2. Ensure `supabase` CLI is installed and the project is linked.
3. Apply the migration: `supabase/migrations/001_phase1_foundation.sql`.
4. Apply the RLS migration: `supabase/migrations/002_phase1_5_rls.sql`.
5. Run the seed: `supabase/seed/001_default_coa.sql`.
6. Validate users, business membership, and isolation policies.
7. Register a dedicated test user.
8. Login and verify the authenticated session.
9. Confirm access to a protected route.
10. Verify logout and route denial.
11. Inspect schema, constraints, and RLS behavior.
12. Record blockers and stop before production touches.

## RLS architecture

The secure model is:

- authenticated user -> `auth.uid()`
- `business_members` links user to business
- all business-owned tables restrict access to businesses where the user is a member
- update and delete operations are intentionally restricted for financial and audit records
- user profile access is limited to the signed-in user's own row
- service-role keys remain server-side only and are never written into browser code

## Migration and seed commands

```bash
supabase db push
supabase db reset --force
supabase db query "select * from pg_tables where schemaname = 'public';"
```

The seed must be executed only against a safe UAT database that does not reuse production data.

## Email verification and auth configuration

The following must be verified in the actual UAT project:

- email sign-up flow
- email confirmation enforcement if enabled
- password reset flow
- protected route gating
- session validity after login/logout

If SMTP or email infrastructure is not configured, mark email verification as blocked until the environment is configured.

## Blocker status

This environment is blocked from executing the live UAT checklist because:

- the Supabase CLI is not installed (`supabase: command not found`)
- no `SUPABASE_*` environment variables are present
- no project metadata is available to identify a staging/UAT database
- no live project connection can be established from this workspace

Because the live environment is unavailable, no claim of actual UAT or database security verification is made.

## Production safety

This task must never touch production data, production RLS, production secrets, or a production database. Only a staging/UAT target may be used when the required credentials are available.
