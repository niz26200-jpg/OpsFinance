# OpsFinance

**Accounting Made Simple**

OpsFinance is a serious cloud accounting platform for small and medium-sized
businesses. It is designed as a modern SaaS product for web, iOS, and Android,
with a shared server-side accounting engine as the single source of truth.

The product ecosystem is **OpsPS**, **OpsHub**, **OpsOne**, and **OpsFinance**.
The primary domain is `myops.com.my`; the application domain is
`app.myops.com.my`.

## Phase 0 status

This repository currently contains the locked product specification and
technical foundation only. It intentionally contains no application screens,
database migrations, authentication, payment processing, or accounting
implementation.

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
