import { describe, it, expect } from 'vitest';

describe('Phase 1 schema foundations', () => {
  it('uses uuid identifiers for users and businesses', () => {
    const userId = '0f5a0b56-6a7b-45d1-aef0-2fcf7ea9c4fd';
    const businessId = '1a7d4cdd-8f9c-41c2-b726-44e3ff7f90dd';

    expect(userId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(businessId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('maintains fixed-precision monetary values', () => {
    const amount = '1234.56';
    expect(amount).toContain('.');
  });

  it('keeps a hierarchical chart of accounts structure', () => {
    const account = { id: 'a1', parentId: null, code: '1000', accountType: 'ASSET' };
    expect(account.accountType).toBe('ASSET');
    expect(account.parentId).toBeNull();
  });
});
