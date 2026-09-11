import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 1.5 RLS contract', () => {
  it('includes row level security and business membership checks', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/002_phase1_5_rls.sql'), 'utf8');

    expect(migration).toContain('enable row level security');
    expect(migration).toContain('is_authorized_for_business');
    expect(migration).toContain('is_business_owner_or_admin');
    expect(migration).toContain('business_members');
  });

  it('denies destructive deletes for protected financial and audit tables', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/002_phase1_5_rls.sql'), 'utf8');

    expect(migration).toContain('for delete\nusing (false)');
    expect(migration).toContain('Audit logs cannot be deleted');
  });

  it('documents the live UAT blocker in project documentation', () => {
    const doc = readFileSync(join(process.cwd(), 'SUPABASE_UAT.md'), 'utf8');

    expect(doc).toContain('Supabase UAT');
    expect(doc).toContain('This environment is blocked');
    expect(doc).toContain('supabase: command not found');
  });
});
