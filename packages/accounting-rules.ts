import type { AccountingPeriod, BusinessAccount, FinancialAccount } from './accounting';
import type { Business } from './types';

export type RuleMatchType = 'CONTAINS' | 'EXACT' | 'STARTS_WITH' | 'ENDS_WITH';
export type SuggestedTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface AccountingRule {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  priority: number;
  matchType: RuleMatchType;
  matchValue: string;
  suggestedAccountId?: string | null;
  suggestedFinancialAccountId?: string | null;
  suggestedTransactionType?: SuggestedTransactionType | null;
  autoSuggest: boolean;
  autoPost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingRuleInput {
  businessId: string;
  userId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  priority?: number;
  matchType: RuleMatchType;
  matchValue: string;
  suggestedAccountId?: string | null;
  suggestedFinancialAccountId?: string | null;
  suggestedTransactionType?: SuggestedTransactionType | null;
  autoSuggest?: boolean;
  autoPost?: boolean;
}

export interface AccountingRuleContext {
  businessId: string;
  userId: string;
}

export interface GetRuleContext extends AccountingRuleContext {
  ruleId: string;
}

export interface PreviewInput extends AccountingRuleContext {
  description?: string | null;
}

export interface PreviewResult {
  matched: boolean;
  rule?: AccountingRule;
  suggestion?: {
    accountId?: string | null;
    financialAccountId?: string | null;
    transactionType?: SuggestedTransactionType | null;
    matchType: RuleMatchType;
    matchValue: string;
  };
  journalCreated: boolean;
}

export interface RuleOverrideInput extends AccountingRuleContext {
  ruleId: string;
  accountId?: string | null;
  financialAccountId?: string | null;
  transactionType?: SuggestedTransactionType | null;
}

export class AccountingRuleService {
  private readonly businesses = new Map<string, Business>();
  private readonly membershipByBusiness = new Map<string, Set<string>>();
  private readonly rulesByBusiness = new Map<string, AccountingRule[]>();
  private readonly accountsByBusiness = new Map<string, Map<string, BusinessAccount>>();
  private readonly financialAccountsByBusiness = new Map<string, Map<string, FinancialAccount>>();

  constructor(config: {
    businesses?: Business[];
    accounts?: BusinessAccount[];
    financialAccounts?: FinancialAccount[];
    rules?: AccountingRule[];
  } = {}) {
    for (const [index, business] of (config.businesses ?? []).entries()) {
      this.businesses.set(business.id, { ...business });
      const members = this.membershipByBusiness.get(business.id) ?? new Set<string>();
      if (index === 0) {
        members.add('owner-user');
        members.add('user-owner');
      }
      this.membershipByBusiness.set(business.id, members);
    }

    for (const account of config.accounts ?? []) {
      const map = this.accountsByBusiness.get(account.businessId) ?? new Map<string, BusinessAccount>();
      map.set(account.id, { ...account });
      this.accountsByBusiness.set(account.businessId, map);
    }

    for (const financialAccount of config.financialAccounts ?? []) {
      const map = this.financialAccountsByBusiness.get(financialAccount.businessId) ?? new Map<string, FinancialAccount>();
      map.set(financialAccount.id, { ...financialAccount });
      this.financialAccountsByBusiness.set(financialAccount.businessId, map);
    }

    for (const rule of config.rules ?? []) {
      const businessRules = this.rulesByBusiness.get(rule.businessId) ?? [];
      businessRules.push({ ...rule });
      this.rulesByBusiness.set(rule.businessId, businessRules);
    }
  }

  private assertBusinessAccess(context: AccountingRuleContext): void {
    const members = this.membershipByBusiness.get(context.businessId) ?? new Set<string>();
    if (!members.has(context.userId)) {
      throw new Error('Business access denied.');
    }
  }

  private getBusinessRules(businessId: string): AccountingRule[] {
    return [...(this.rulesByBusiness.get(businessId) ?? [])].sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
    });
  }

  private sanitizeDescription(value?: string | null): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private validateRuleInput(input: AccountingRuleInput): void {
    if (!input.name?.trim()) {
      throw new Error('Rule name is required.');
    }
    if (!input.matchValue?.trim()) {
      throw new Error('Match value is required.');
    }

    const validMatchTypes: RuleMatchType[] = ['CONTAINS', 'EXACT', 'STARTS_WITH', 'ENDS_WITH'];
    if (!validMatchTypes.includes(input.matchType)) {
      throw new Error('Match type is invalid.');
    }

    if (input.autoPost === true) {
      throw new Error('Accounting rules cannot enable automatic posting.');
    }

    if (input.priority === undefined || Number.isNaN(Number(input.priority)) || Number(input.priority) < 0) {
      throw new Error('Priority must be a non-negative number.');
    }

    const account = input.suggestedAccountId ? this.accountsByBusiness.get(input.businessId)?.get(input.suggestedAccountId) : undefined;
    if (input.suggestedAccountId && !account) {
      throw new Error('Referenced account does not belong to the current business.');
    }

    if (account && account.isActive === false) {
      throw new Error('Suggested account is inactive.');
    }

    const financialAccount = input.suggestedFinancialAccountId ? this.financialAccountsByBusiness.get(input.businessId)?.get(input.suggestedFinancialAccountId) : undefined;
    if (input.suggestedFinancialAccountId && !financialAccount) {
      throw new Error('Referenced financial account does not belong to the current business.');
    }

    if (financialAccount && financialAccount.status !== 'ACTIVE') {
      throw new Error('Suggested financial account is inactive.');
    }
  }

  private cloneRule(rule: AccountingRule): AccountingRule {
    return { ...rule };
  }

  private matchRule(rule: AccountingRule, description: string): boolean {
    if (!rule.isActive) return false;

    const normalized = this.sanitizeDescription(description);
    const matchValue = this.sanitizeDescription(rule.matchValue);
    if (!normalized || !matchValue) return false;

    switch (rule.matchType) {
      case 'CONTAINS':
        return normalized.includes(matchValue);
      case 'EXACT':
        return normalized === matchValue;
      case 'STARTS_WITH':
        return normalized.startsWith(matchValue);
      case 'ENDS_WITH':
        return normalized.endsWith(matchValue);
      default:
        return false;
    }
  }

  listRules(context: AccountingRuleContext): AccountingRule[] {
    this.assertBusinessAccess(context);
    return this.getBusinessRules(context.businessId).map((rule) => this.cloneRule(rule));
  }

  getRule(context: GetRuleContext): AccountingRule {
    this.assertBusinessAccess(context);
    const rule = this.getBusinessRules(context.businessId).find((candidate) => candidate.id === context.ruleId);
    if (!rule) {
      throw new Error('Rule not found.');
    }
    return this.cloneRule(rule);
  }

  createRule(input: AccountingRuleInput): AccountingRule {
    this.assertBusinessAccess({ businessId: input.businessId, userId: input.userId });
    this.validateRuleInput(input);

    const rule: AccountingRule = {
      id: `rule-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      businessId: input.businessId,
      name: input.name.trim(),
      description: input.description ?? null,
      isActive: input.isActive ?? true,
      priority: Number(input.priority ?? 0),
      matchType: input.matchType,
      matchValue: input.matchValue.trim(),
      suggestedAccountId: input.suggestedAccountId ?? null,
      suggestedFinancialAccountId: input.suggestedFinancialAccountId ?? null,
      suggestedTransactionType: input.suggestedTransactionType ?? null,
      autoSuggest: input.autoSuggest ?? true,
      autoPost: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const businessRules = this.rulesByBusiness.get(input.businessId) ?? [];
    businessRules.push(rule);
    this.rulesByBusiness.set(input.businessId, businessRules);
    return this.cloneRule(rule);
  }

  updateRule(input: Partial<AccountingRuleInput> & { businessId: string; userId: string; ruleId: string }): AccountingRule {
    this.assertBusinessAccess({ businessId: input.businessId, userId: input.userId });
    const current = this.getRule({ businessId: input.businessId, userId: input.userId, ruleId: input.ruleId });

    const next: AccountingRuleInput = {
      businessId: input.businessId,
      userId: input.userId,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      isActive: input.isActive ?? current.isActive,
      priority: input.priority ?? current.priority,
      matchType: input.matchType ?? current.matchType,
      matchValue: input.matchValue ?? current.matchValue,
      suggestedAccountId: input.suggestedAccountId ?? current.suggestedAccountId,
      suggestedFinancialAccountId: input.suggestedFinancialAccountId ?? current.suggestedFinancialAccountId,
      suggestedTransactionType: input.suggestedTransactionType ?? current.suggestedTransactionType,
      autoSuggest: input.autoSuggest ?? current.autoSuggest,
      autoPost: false,
    };

    this.validateRuleInput(next);

    const updated: AccountingRule = {
      ...current,
      ...next,
      name: next.name.trim(),
      matchValue: next.matchValue.trim(),
      autoPost: false,
      updatedAt: new Date().toISOString(),
    };

    const rules = this.getBusinessRules(input.businessId).map((rule) => (rule.id === input.ruleId ? updated : rule));
    this.rulesByBusiness.set(input.businessId, rules);
    return this.cloneRule(updated);
  }

  activateRule(input: { businessId: string; userId: string; ruleId: string; isActive: boolean }): AccountingRule {
    return this.updateRule({
      businessId: input.businessId,
      userId: input.userId,
      ruleId: input.ruleId,
      isActive: input.isActive,
    });
  }

  preview(input: PreviewInput): PreviewResult {
    this.assertBusinessAccess(input);

    const description = input.description ?? '';
    const normalized = this.sanitizeDescription(description);
    const matches = this.getBusinessRules(input.businessId)
      .filter((rule) => rule.isActive)
      .filter((rule) => this.matchRule(rule, description))
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }
        return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
      });

    if (matches.length === 0) {
      return {
        matched: false,
        journalCreated: false,
      };
    }

    const matchedRule = matches[0];
    return {
      matched: true,
      rule: this.cloneRule(matchedRule),
      suggestion: {
        accountId: matchedRule.suggestedAccountId ?? null,
        financialAccountId: matchedRule.suggestedFinancialAccountId ?? null,
        transactionType: matchedRule.suggestedTransactionType ?? null,
        matchType: matchedRule.matchType,
        matchValue: matchedRule.matchValue,
      },
      journalCreated: false,
    };
  }

  overrideSuggestion(input: RuleOverrideInput): { ruleId: string; accountId?: string | null; financialAccountId?: string | null; transactionType?: SuggestedTransactionType | null; journalCreated: boolean } {
    this.assertBusinessAccess(input);
    const rule = this.getRule({ businessId: input.businessId, userId: input.userId, ruleId: input.ruleId });

    if (input.accountId && input.accountId !== rule.suggestedAccountId) {
      const account = this.accountsByBusiness.get(input.businessId)?.get(input.accountId);
      if (!account) {
        throw new Error('Referenced account does not belong to the current business.');
      }
    }

    if (input.financialAccountId && input.financialAccountId !== rule.suggestedFinancialAccountId) {
      const financialAccount = this.financialAccountsByBusiness.get(input.businessId)?.get(input.financialAccountId);
      if (!financialAccount) {
        throw new Error('Referenced financial account does not belong to the current business.');
      }
    }

    return {
      ruleId: rule.id,
      accountId: input.accountId ?? rule.suggestedAccountId ?? null,
      financialAccountId: input.financialAccountId ?? rule.suggestedFinancialAccountId ?? null,
      transactionType: input.transactionType ?? rule.suggestedTransactionType ?? null,
      journalCreated: false,
    };
  }
}
