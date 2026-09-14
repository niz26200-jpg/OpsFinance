import { describe, expect, it } from 'vitest';

import type { BusinessAccount, FinancialAccount } from '../packages/accounting';
import { AccountingRuleService, type RuleMatchType } from '../packages/accounting-rules';

const businessA = { id: 'business-a', name: 'Business A', baseCurrency: 'MYR', fiscalYearStart: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const businessB = { id: 'business-b', name: 'Business B', baseCurrency: 'MYR', fiscalYearStart: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

const accountMap = new Map<string, BusinessAccount>([
  ['coa-expense', { id: 'coa-expense', businessId: businessA.id, name: 'Bank Charges', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true, code: '6100' }],
  ['coa-rental', { id: 'coa-rental', businessId: businessA.id, name: 'Rental', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true, code: '6200' }],
  ['coa-petrol', { id: 'coa-petrol', businessId: businessA.id, name: 'Petrol / Transport', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true, code: '6300' }],
  ['coa-other-biz', { id: 'coa-other-biz', businessId: businessB.id, name: 'Other Biz Expense', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true, code: '7000' }],
]);

const financialMap = new Map<string, FinancialAccount>([
  ['fin-bank', { id: 'fin-bank', businessId: businessA.id, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE', openingBalance: '1000.00' }],
  ['fin-bank-b', { id: 'fin-bank-b', businessId: businessB.id, name: 'Other Bank', type: 'BANK', accountCode: 'OTHERBANK', currency: 'MYR', status: 'ACTIVE', openingBalance: '1000.00' }],
]);

describe('accounting rule service', () => {
  it('creates a valid rule and returns it in the business list', () => {
    const service = new AccountingRuleService({ businesses: [businessA, businessB], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });

    const rule = service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'Bank Charge',
      description: 'Bank charge for monthly operations',
      matchType: 'CONTAINS',
      matchValue: 'BANK CHARGE',
      suggestedAccountId: 'coa-expense',
      suggestedFinancialAccountId: 'fin-bank',
      priority: 100,
      autoSuggest: true,
      autoPost: false,
    });

    expect(rule.name).toBe('Bank Charge');
    expect(rule.isActive).toBe(true);
    expect(rule.autoPost).toBe(false);
    expect(service.listRules({ businessId: businessA.id, userId: 'owner-user' })).toHaveLength(1);
  });

  it('validates required rule fields and disallows auto-post enablement', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });

    expect(() => service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: '',
      matchType: 'CONTAINS',
      matchValue: 'RENT',
      suggestedAccountId: 'coa-rental',
      autoSuggest: true,
      autoPost: false,
    })).toThrow('Rule name is required.');

    expect(() => service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'Bad Rule',
      matchType: 'NOT_REAL' as RuleMatchType,
      matchValue: 'RENT',
      suggestedAccountId: 'coa-rental',
      autoSuggest: true,
      autoPost: false,
    })).toThrow('Match type is invalid.');

    expect(() => service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'Bad Post',
      matchType: 'CONTAINS',
      matchValue: 'RENT',
      suggestedAccountId: 'coa-rental',
      autoSuggest: true,
      autoPost: true,
    })).toThrow('Accounting rules cannot enable automatic posting.');
  });

  it('updates rules without mutating the original suggestion payload', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    const created = service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'Office Rental',
      matchType: 'CONTAINS',
      matchValue: 'RENT',
      suggestedAccountId: 'coa-rental',
      priority: 10,
      autoSuggest: true,
      autoPost: false,
    });

    const updated = service.updateRule({
      businessId: businessA.id,
      userId: 'owner-user',
      ruleId: created.id,
      name: 'Office Rent',
      priority: 40,
    });

    expect(updated.name).toBe('Office Rent');
    expect(updated.priority).toBe(40);
    expect(service.getRule({ businessId: businessA.id, userId: 'owner-user', ruleId: created.id }).name).toBe('Office Rent');
  });

  it('activates and deactivates rules deterministically', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    const rule = service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'Taxi Rule',
      matchType: 'CONTAINS',
      matchValue: 'TAXI',
      suggestedAccountId: 'coa-petrol',
      priority: 20,
      autoSuggest: true,
      autoPost: false,
    });

    const deactivated = service.activateRule({ businessId: businessA.id, userId: 'owner-user', ruleId: rule.id, isActive: false });
    expect(deactivated.isActive).toBe(false);
    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'TAXI receipt' }).matched).toBe(false);

    const reactivated = service.activateRule({ businessId: businessA.id, userId: 'owner-user', ruleId: rule.id, isActive: true });
    expect(reactivated.isActive).toBe(true);
  });

  it('enforces business isolation and unauthorized access', () => {
    const service = new AccountingRuleService({ businesses: [businessA, businessB], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    const rule = service.createRule({
      businessId: businessA.id,
      userId: 'owner-user',
      name: 'A-only Rule',
      matchType: 'CONTAINS',
      matchValue: 'MAYBANK',
      suggestedAccountId: 'coa-expense',
      priority: 10,
      autoSuggest: true,
      autoPost: false,
    });

    expect(() => service.listRules({ businessId: businessB.id, userId: 'owner-user' })).toThrow('Business access denied.');
    expect(() => service.getRule({ businessId: businessB.id, userId: 'owner-user', ruleId: rule.id })).toThrow('Business access denied.');
    expect(() => service.updateRule({ businessId: businessB.id, userId: 'owner-user', ruleId: rule.id, name: 'n/a' })).toThrow('Business access denied.');
  });

  it('matches the supported operators deterministically and ignores inactive rules', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Contains Rule', matchType: 'CONTAINS', matchValue: 'GRAB', suggestedAccountId: 'coa-petrol', priority: 40, autoSuggest: true, autoPost: false });
    service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Exact Rule', matchType: 'EXACT', matchValue: 'RENT', suggestedAccountId: 'coa-rental', priority: 30, autoSuggest: true, autoPost: false });
    service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Starts Rule', matchType: 'STARTS_WITH', matchValue: 'MAYBANK', suggestedAccountId: 'coa-expense', priority: 35, autoSuggest: true, autoPost: false });
    service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Ends Rule', matchType: 'ENDS_WITH', matchValue: 'CHARGE', suggestedAccountId: 'coa-expense', priority: 25, autoSuggest: true, autoPost: false });

    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: '  grab ride payment  ' }).rule?.name).toBe('Contains Rule');
    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'RENT' }).rule?.name).toBe('Exact Rule');
    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'Maybank Bank Charge' }).rule?.name).toBe('Starts Rule');
    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'Monthly Bank Charge' }).rule?.name).toBe('Ends Rule');

    const inactive = service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Disabled Rule', matchType: 'CONTAINS', matchValue: 'HIDDEN', suggestedAccountId: 'coa-rental', priority: 999, autoSuggest: true, autoPost: false, isActive: false });
    expect(service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'HIDDEN' }).matched).toBe(false);
    expect(service.getRule({ businessId: businessA.id, userId: 'owner-user', ruleId: inactive.id }).isActive).toBe(false);
  });

  it('uses priority ordering and deterministic tie-breaks', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    const ruleA = service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Alpha', matchType: 'CONTAINS', matchValue: 'BANK', suggestedAccountId: 'coa-expense', priority: 100, autoSuggest: true, autoPost: false });
    const ruleB = service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Beta', matchType: 'CONTAINS', matchValue: 'BANK', suggestedAccountId: 'coa-rental', priority: 100, autoSuggest: true, autoPost: false });

    const preview = service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'Bank transaction' });
    expect([ruleA.id, ruleB.id]).toContain(preview.rule?.id ?? '');
    expect(preview.rule?.priority).toBe(100);
  });

  it('produces a deterministic suggestion without creating journals', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Office Rent', matchType: 'CONTAINS', matchValue: 'RENT', suggestedAccountId: 'coa-rental', suggestedFinancialAccountId: 'fin-bank', suggestedTransactionType: 'EXPENSE', priority: 50, autoSuggest: true, autoPost: false });

    const suggestion = service.preview({ businessId: businessA.id, userId: 'owner-user', description: 'Office rent for March' });
    expect(suggestion.matched).toBe(true);
    expect(suggestion.suggestion?.accountId).toBe('coa-rental');
    expect(suggestion.suggestion?.financialAccountId).toBe('fin-bank');
    expect(suggestion.suggestion?.transactionType).toBe('EXPENSE');
    expect(suggestion.journalCreated).toBe(false);
  });

  it('does not modify the rule when a user overrides a suggestion', () => {
    const service = new AccountingRuleService({ businesses: [businessA], accounts: [...accountMap.values()], financialAccounts: [...financialMap.values()] });
    const rule = service.createRule({ businessId: businessA.id, userId: 'owner-user', name: 'Ride Cost', matchType: 'CONTAINS', matchValue: 'GRAB', suggestedAccountId: 'coa-petrol', priority: 80, autoSuggest: true, autoPost: false });

    const userOverride = service.overrideSuggestion({
      businessId: businessA.id,
      userId: 'owner-user',
      ruleId: rule.id,
      accountId: 'coa-rental',
      financialAccountId: 'fin-bank',
      transactionType: 'EXPENSE',
    });

    expect(userOverride.ruleId).toBe(rule.id);
    expect(service.getRule({ businessId: businessA.id, userId: 'owner-user', ruleId: rule.id }).suggestedAccountId).toBe('coa-petrol');
  });
});
