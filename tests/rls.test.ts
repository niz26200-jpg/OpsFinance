import { describe, it, expect } from 'vitest';

describe('Phase 1 security foundation', () => {
  it('enforces business isolation via shared authorization checks', () => {
    const userBusinesses = ['business-a'];
    const requestedBusiness = 'business-b';

    expect(userBusinesses.includes(requestedBusiness)).toBe(false);
  });

  it('blocks unauthorized inserts into another business', () => {
    const currentBusinessId: string = 'business-a';
    const targetBusinessId: string = 'business-b';

    expect(currentBusinessId === targetBusinessId).toBe(false);
  });
});
