import { describe, expect, it } from 'vitest';

import { AccountingEngine } from '../packages/accounting';
import { FinancialAccountService } from '../packages/financial-accounts';

describe('financial account service', () => {
  it('creates and lists financial accounts for a business', () => {
    const businessId = 'business-1';
    const equityAccountId = 'coa-equity';
    const bankAccountId = 'coa-bank';

    const engine = new AccountingEngine({
      businessId,
      accounts: [
        { id: bankAccountId, businessId, code: '1100', name: 'Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
        { id: equityAccountId, businessId, code: '3000', name: 'Opening Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
      ],
    });

    const service = new FinancialAccountService(engine);
    const account = service.createFinancialAccount({
      businessId,
      name: 'Main Operating Bank',
      type: 'BANK',
      accountCode: 'MAIN-BANK',
      currency: 'MYR',
      accountId: bankAccountId,
      openingBalance: '5000.00',
      status: 'ACTIVE',
    });

    expect(account.name).toBe('Main Operating Bank');
    expect(service.listFinancialAccounts(businessId)).toHaveLength(1);
    expect(service.getCurrentBalance(businessId, account.id)).toBe('5000.00');
  });

  it('blocks changing a mapped COA when journal activity exists', () => {
    const businessId = 'business-2';
    const accountA = 'coa-a';
    const accountB = 'coa-b';
    const equityAccountId = 'coa-equity-2';

    const engine = new AccountingEngine({
      businessId,
      accounts: [
        { id: accountA, businessId, code: '1100', name: 'Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
        { id: accountB, businessId, code: '1110', name: 'Second Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
        { id: equityAccountId, businessId, code: '3000', name: 'Opening Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
      ],
    });

    const service = new FinancialAccountService(engine);
    const created = service.createFinancialAccount({
      businessId,
      name: 'Primary Bank',
      type: 'BANK',
      accountCode: 'BANK-1',
      currency: 'MYR',
      accountId: accountA,
      openingBalance: '2500.00',
      status: 'ACTIVE',
    });

    const journal = engine.createJournal({
      businessId,
      journalNo: 'J-1',
      journalDate: '2026-09-12',
      sourceType: 'MANUAL',
      lines: [
        { accountId: accountA, debit: '100.00', description: 'Deposit' },
        { accountId: equityAccountId, credit: '100.00', description: 'Equity' },
      ],
    });
    engine.postJournal(journal, { postedBy: 'tester', idempotencyKey: 'j-1' });

    expect(() => service.updateFinancialAccount({ businessId, id: created.id, accountId: accountB })).toThrow('cannot be changed');
  });

  it('rejects account mappings that do not belong to the same business', () => {
    const businessId = 'business-3';
    const otherBusinessId = 'business-999';
    const equityAccountId = 'coa-equity-3';
    const otherBusinessAccountId = 'other-coa';

    const engine = new AccountingEngine({
      businessId,
      accounts: [
        { id: 'coa-main', businessId, code: '1100', name: 'Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
        { id: equityAccountId, businessId, code: '3000', name: 'Opening Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
        { id: otherBusinessAccountId, businessId: otherBusinessId, code: '1200', name: 'Other Business Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      ],
    });

    const service = new FinancialAccountService(engine);
    expect(() => service.createFinancialAccount({
      businessId,
      name: 'Bad Mapping',
      type: 'BANK',
      accountCode: 'BAD-MAP',
      currency: 'MYR',
      accountId: otherBusinessAccountId,
      openingBalance: '0.00',
      status: 'ACTIVE',
    })).toThrow('does not belong to this business');
  });
});
