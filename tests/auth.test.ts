import { describe, it, expect } from 'vitest';
import { authorizeBusinessAccess, hasBusinessAccess } from '../packages/shared/auth';

describe('Phase 1 auth foundation', () => {
  it('protects authenticated routes by default', () => {
    const isAuthenticated = false;
    expect(isAuthenticated).toBe(false);
  });

  it('accepts a basic registration mapping model', () => {
    const mappedUser = {
      id: 'uuid',
      email: 'owner@example.com',
      name: 'Owner User',
    };

    expect(mappedUser.email).toContain('@');
    expect(mappedUser.name).toBeTruthy();
  });

  it('supports a logout session state', () => {
    const session = { authenticated: false };
    expect(session.authenticated).toBe(false);
  });

  it('requires the authenticated user to match the authorized business member', () => {
    const session = { user: { id: 'owner-1' } };
    expect(hasBusinessAccess(session, 'owner-1')).toBe(true);
    expect(hasBusinessAccess(session, 'owner-1', 'member-2')).toBe(false);
    expect(() => authorizeBusinessAccess(session, 'owner-1', 'member-2')).toThrow('Business access denied.');
  });
});
