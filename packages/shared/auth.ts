export function isAuthenticatedSession(session: { user?: { id?: string } | null } | null): boolean {
  return Boolean(session?.user?.id);
}

export function hasBusinessAccess(
  session: { user?: { id?: string } | null } | null,
  businessOwnerId?: string | null,
  businessMemberId?: string | null,
): boolean {
  const userId = session?.user?.id;
  if (!userId || !businessOwnerId) return false;
  return userId === (businessMemberId ?? businessOwnerId);
}

export function authorizeBusinessAccess(
  session: { user?: { id?: string } | null } | null,
  businessOwnerId?: string | null,
  businessMemberId?: string | null,
): void {
  if (!hasBusinessAccess(session, businessOwnerId, businessMemberId)) {
    throw new Error('Business access denied.');
  }
}
