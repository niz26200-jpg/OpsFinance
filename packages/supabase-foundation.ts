export type SupabaseRuntimeConfigInput = Partial<Record<string, string | undefined>>;

export interface RuntimeSupabaseConfig {
  isConfigured: boolean;
  missingVars: string[];
  config: Record<string, string | undefined>;
}

export interface BusinessMembershipContext {
  userId: string;
  businessId: string;
  memberships: string[];
}

export interface JournalMutationSafetyInput {
  status: string;
  journalEntryId: string;
  entityType?: 'JOURNAL_ENTRY' | 'JOURNAL_LINE';
}

export function getSupabaseRuntimeConfig(input: SupabaseRuntimeConfigInput): RuntimeSupabaseConfig {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_PROJECT_ID',
    'DATABASE_URL',
  ];

  const config = { ...input };
  const missingVars = required.filter((key) => !config[key] || !String(config[key]).trim());

  return {
    isConfigured: missingVars.length === 0,
    missingVars,
    config,
  };
}

export function assertBusinessMembership(context: BusinessMembershipContext, requiredBusinessId: string): void {
  if (!context.userId || !context.businessId) {
    throw new Error('Business access denied');
  }

  const hasMembership = context.memberships.includes(requiredBusinessId);
  if (!hasMembership) {
    throw new Error('Business access denied');
  }

  if (context.businessId !== requiredBusinessId) {
    throw new Error('Business access denied');
  }
}

export function isPostedAccountingStatus(status: string): boolean {
  return status === 'POSTED';
}

export function validateJournalMutationSafety(input: JournalMutationSafetyInput): void {
  const status = input.status;
  if (isPostedAccountingStatus(status)) {
    if (input.entityType === 'JOURNAL_LINE') {
      throw new Error('Posted journal lines are immutable');
    }
    throw new Error('Posted journal entries are immutable');
  }
}
