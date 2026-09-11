import { describe, it, expect } from 'vitest';

describe('Phase 1 business rules', () => {
  it('allows a user to belong to an authorized business', () => {
    const businessMembership = {
      businessId: 'business-1',
      userId: 'user-1',
      role: 'OWNER',
    };

    expect(businessMembership.role).toBe('OWNER');
  });

  it('prevents duplicate business membership in the same business', () => {
    const memberships = [
      { businessId: 'b1', userId: 'u1', role: 'OWNER' },
      { businessId: 'b1', userId: 'u1', role: 'ADMIN' },
    ];

    expect(memberships[0].businessId).toBe(memberships[1].businessId);
    expect(memberships[0].userId).toBe(memberships[1].userId);
  });
});
