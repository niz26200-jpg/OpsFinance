# OpsFinance

**Accounting Made Simple**

OpsFinance is a serious cloud accounting platform for small and medium-sized
businesses. It is designed as a modern SaaS product for web, iOS, and Android,
with a shared server-side accounting engine as the single source of truth.

The product ecosystem is **OpsPS**, **OpsHub**, **OpsOne**, and **OpsFinance**.
The primary domain is `myops.com.my`; the application domain is
`app.myops.com.my`.

## Phase 0 status

Phase 0 baseline is complete and locked. It contains the authoritative product,
accounting, data, security, roadmap, and contribution foundation for the
project.

## Phase 1 status

Phase 1 foundation is complete. This repository now includes a minimal Next.js
application, TypeScript configuration, PostgreSQL/Supabase migration schema,
seeded default Chart of Accounts structure, business membership/auth foundation,
minimal authentication UI, and automated tests for the required scaffolding.

Phase 1.5 is in progress for Supabase UAT verification and database security
hardening. Live UAT verification remains blocked by the absence of a configured
Supabase staging project, CLI credentials, and environment variables in this
workspace. The migration and RLS hardening are prepared for deployment, but they
have not been applied against a live UAT database in this environment.

The repository does not yet include the accounting posting engine, ledger,
financial reports, reconciliation, upload conversion, or subscription payment
processing.

Read the documents in this order:

1. [PRODUCT_SPEC.md](PRODUCT_SPEC.md) - locked product requirements
2. [ACCOUNTING_ENGINE.md](ACCOUNTING_ENGINE.md) - accounting source of truth
3. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - planned PostgreSQL model
4. [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - mandatory safeguards
5. [ROADMAP.md](ROADMAP.md) - phased delivery plan
6. [CONTRIBUTING.md](CONTRIBUTING.md) - development and Git discipline

## Target architecture

```text
Web (Next.js)                 Mobile (React Native + Expo)
		\               /
		 API / Service Layer
			   |
		   Accounting Engine
			   |
		      PostgreSQL
```

All financial outputs must derive from posted journal lines. Reconciliation,
reports, dashboards, web, and mobile must never introduce a second financial
calculation path.
