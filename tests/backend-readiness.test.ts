import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AccountingEngine } from '../packages/accounting';
import { LocalTransactionRepository } from '../packages/repositories';
import { getSupabaseRuntimeConfig, validateJournalMutationSafety } from '../packages/supabase-foundation';

describe('Phase 10G backend persistence contracts', () => {
  it('documents local, persistence-ready, and blocked backend states', () => {
    const document = readFileSync(join(process.cwd(), 'BACKEND_READINESS.md'), 'utf8');

    expect(document).toContain('Real Supabase persistence: BLOCKED');
    expect(document).toContain('Supabase Auth: BLOCKED');
    expect(document).toContain('Live RLS verification: BLOCKED');
    expect(document).toContain('Real payment provider: NOT CONFIGURED');
    for (const entity of ['users', 'businesses', 'business_members', 'subscriptions', 'financial_accounts', 'accounts', 'transactions', 'journal_entries', 'journal_lines', 'accounting_periods', 'accounting_rules', 'bank_statements', 'bank_transactions', 'reconciliation_matches', 'attachments', 'audit_logs']) {
      expect(document).toContain(entity);
    }
  });

  it('keeps repository ownership checks business-scoped', () => {
    const repository = new LocalTransactionRepository();
    const transaction = {
      id: 'transaction-a',
      businessId: 'business-a',
      type: 'MONEY_IN' as const,
      date: '2026-09-12',
      description: 'Payment',
      amount: '10.00',
      status: 'DRAFT' as const,
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
    };

    repository.create(transaction);
    expect(repository.getById('business-a', transaction.id)).toEqual(transaction);
    expect(() => repository.getById('business-b', transaction.id)).toThrow('Account not found for this business.');
    expect(repository.listByBusiness('business-b')).toEqual([]);
  });

  it('keeps journal balance, closed-period, and posted immutability contracts explicit', () => {
    const engine = new AccountingEngine({
      businessId: 'business-a',
      accounts: [
        { id: 'bank', businessId: 'business-a', code: '1100', name: 'Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isActive: true },
        { id: 'revenue', businessId: 'business-a', code: '4000', name: 'Revenue', accountType: 'REVENUE', normalBalance: 'CREDIT', isActive: true },
      ],
      periods: [{ id: 'closed', businessId: 'business-a', name: '2026-08', startDate: '2026-08-01', endDate: '2026-08-31', status: 'CLOSED' }],
    });
    const journal = engine.createJournal({
      businessId: 'business-a',
      journalNo: 'contract-1',
      journalDate: '2026-08-12',
      sourceType: 'MANUAL',
      lines: [{ accountId: 'bank', debit: '10.00' }, { accountId: 'revenue', credit: '10.00' }],
    });

    expect(() => engine.postJournal(journal)).toThrow('accounting period is closed');
    expect(() => validateJournalMutationSafety({ status: 'POSTED', journalEntryId: journal.id })).toThrow('immutable');
  });

  it('reports absent runtime credentials without pretending to connect', () => {
    const config = getSupabaseRuntimeConfig({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' });
    expect(config.isConfigured).toBe(false);
    expect(config.missingVars).toContain('DATABASE_URL');
  });

  it('requires future posting to be an atomic transaction boundary', () => {
    const document = readFileSync(join(process.cwd(), 'BACKEND_READINESS.md'), 'utf8');
    expect(document).toContain('transaction row + journal row + journal-line rows + audit event');
    expect(document).toContain('database transaction/RPC');
    expect(document).toContain('Local `Map` operations are not a substitute for database atomicity.');
  });
});
