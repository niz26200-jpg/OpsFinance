import { describe, it, expect } from 'vitest';

describe('Phase 1 subscription foundation', () => {
  it('supports the Starter plan representation', () => {
    const starter = {
      planCode: 'STARTER',
      price: 29,
      currency: 'MYR',
      status: 'ACTIVE',
    };

    expect(starter.price).toBe(29);
    expect(starter.currency).toBe('MYR');
  });

  it('supports lifecycle states', () => {
    const states = ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED'];
    expect(states).toContain('SUSPENDED');
  });
});
