import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertBusinessMembership,
  getSupabaseRuntimeConfig,
  isPostedAccountingStatus,
  validateJournalMutationSafety,
} from '../packages/supabase-foundation';

describe('Phase 10A supabase foundation', () => {
  it('reports missing environment config safely when credentials are not configured', () => {
    const config = getSupabaseRuntimeConfig({
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_PROJECT_ID: '',
      DATABASE_URL: '',
    });

    expect(config.isConfigured).toBe(false);
    expect(config.missingVars.length).toBeGreaterThan(0);
  });

  it('accepts a valid business membership context', () => {
    expect(() => assertBusinessMembership({ userId: 'user-1', businessId: 'business-1', memberships: ['business-1'] }, 'business-1')).not.toThrow();
  });

  it('rejects cross-business access in a business-scoped context', () => {
    expect(() => assertBusinessMembership({ userId: 'user-1', businessId: 'business-1', memberships: ['business-1'] }, 'business-2')).toThrow('Business access denied');
  });

  it('treats posted journal states as immutable', () => {
    expect(isPostedAccountingStatus('POSTED')).toBe(true);
    expect(isPostedAccountingStatus('DRAFT')).toBe(false);
  });

  it('blocks mutation on posted journal entries and lines', () => {
    expect(() => validateJournalMutationSafety({ status: 'POSTED', journalEntryId: 'je-1' })).toThrow('Posted journal entries are immutable');
    expect(() => validateJournalMutationSafety({ status: 'POSTED', journalEntryId: 'je-1', entityType: 'JOURNAL_LINE' })).toThrow('Posted journal lines are immutable');
    expect(() => validateJournalMutationSafety({ status: 'APPROVED', journalEntryId: 'je-1' })).not.toThrow();
  });

  it('documents the immutability guard in the migration file', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/003_phase10a_supabase_foundation.sql'), 'utf8');

    expect(migration).toContain('Posted journal entries are immutable');
    expect(migration).toContain('Posted journal lines are immutable');
    expect(migration).toContain('journal_entries');
    expect(migration).toContain('journal_lines');
  });
});
