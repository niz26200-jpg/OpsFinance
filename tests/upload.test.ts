import { describe, expect, it } from 'vitest';

import { AccountingEngine } from '../packages/accounting';
import { UploadConvertService } from '../packages/upload';

describe('Phase 4 upload and convert', () => {
  const businessId = '11111111-1111-4111-8111-111111111111';
  const bankAccountId = '22222222-2222-4222-8222-222222222222';
  const revenueAccountId = '33333333-3333-4333-8333-333333333333';
  const expenseAccountId = '44444444-4444-4444-8444-444444444444';
  const cashAccountId = '55555555-5555-4555-8555-555555555555';

  const engine = new AccountingEngine({
    businessId,
    accounts: [
      { id: revenueAccountId, businessId, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
      { id: expenseAccountId, businessId, code: '6000', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: cashAccountId, businessId, code: '1100', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
    ],
    periods: [{ id: 'period-1', businessId, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    financialAccounts: [{ id: bankAccountId, businessId, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' }],
  });

  it('validates supported CSV uploads and produces money-in/out suggestions', () => {
    const service = new UploadConvertService(engine);
    const validation = service.validateFile({ name: 'bank.csv', size: 2048, type: 'text/csv' });
    expect(validation.isValid).toBe(true);

    const batch = service.processBankStatementCsv(
      'Date,Description,Reference,Debit,Credit,Balance\n2026-09-12,Customer payment,INV-1001,,500.00,5000.00\n2026-09-11,Petrol purchase,FUEL-001,100.00,,4900.00',
      'bank.csv',
      businessId,
      'user-1',
    );

    expect(batch.candidates).toHaveLength(2);
    expect(batch.candidates[0].suggestion.type).toBe('MONEY_IN');
    expect(batch.candidates[0].normalized.amount).toBe('500.00');
    expect(batch.candidates[1].suggestion.type).toBe('MONEY_OUT');
  });

  it('flags invalid files and malformed uploads', () => {
    const service = new UploadConvertService(engine);
    const invalid = service.validateFile({ name: 'bad.exe', size: 2048, type: 'application/x-msdownload' });
    expect(invalid.isValid).toBe(false);

    const result = service.processBankStatementCsv('Date,Description\n2026-09-12,Missing amount', 'bad.csv', businessId, 'user-1');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects duplicates and rejects auto-post before approval', () => {
    const service = new UploadConvertService(engine);
    const batch = service.processBankStatementCsv(
      'Date,Description,Reference,Debit,Credit\n2026-09-12,Customer payment,INV-1001,,500.00\n2026-09-12,Customer payment,INV-1001,,500.00',
      'duplicate.csv',
      businessId,
      'user-1',
    );

    expect(batch.candidates[0].duplicateStatus).toBe('POSSIBLE_DUPLICATE');
    expect(batch.candidates[1].duplicateStatus).toBe('POSSIBLE_DUPLICATE');

    expect(() => service.approveCandidate(batch.candidates[0].id, 'user-1')).toThrow();
  });
});
