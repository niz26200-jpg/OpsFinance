export function isAuthenticatedSession(session: { user?: { id?: string } | null } | null): boolean {
  return Boolean(session?.user?.id);
}

export function hasBusinessAccess(
  session: { user?: { id?: string } | null } | null,
  businessOwnerId?: string | null,
): boolean {
  return isAuthenticatedSession(session) && Boolean(businessOwnerId);
}
