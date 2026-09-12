import { describe, expect, it } from 'vitest';

import { AccountingEngine } from '../packages/accounting';
import { ReconciliationService } from '../packages/reconciliation';

describe('Phase 5 bank reconciliation', () => {
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

  it('matches an exact bank transaction and book transaction within tolerance without creating a new journal', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-1',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank September',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1500.00',
    });
    const session = service.createSession({ id: 'session-1', businessId, financialAccountId: bankAccountId, statementId: 'stmt-1', actor: 'user-1' });
    const beforeJournalCount = (engine as any).journals.size;

    service.addBankTransactions('stmt-1', [{
      id: 'bank-1',
      statementId: 'stmt-1',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-12',
      description: 'Customer payment',
      normalizedDescription: 'customer payment',
      reference: 'INV-1001',
      debit: '',
      credit: '500.00',
      amount: '500.00',
      balance: '1500.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);

    service.addBookTransactions([{ 
      id: 'book-1',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-12',
      description: 'Customer payment',
      referenceNo: 'INV-1001',
      amount: '500.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-1',
    }]);

    const match = service.matchTransaction(session.id, 'bank-1', 'book-1', 'user-1');
    const matches = service.generateMatches('stmt-1');
    expect(match.status).toBe('MATCHED');
    expect(matches[0].status).toBe('MATCHED');
    expect(matches[0].confidence).toBeGreaterThan(80);
    expect((engine as any).journals.size).toBe(beforeJournalCount);
  });

  it('calculates unmatched and partial bank differences deterministically', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-2',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Partial',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '2000.00',
      closingBalance: '1200.00',
    });

    service.addBankTransactions('stmt-2', [{
      id: 'bank-2',
      statementId: 'stmt-2',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-15',
      description: 'Bank charge',
      normalizedDescription: 'bank charge',
      reference: 'CHG-1',
      debit: '10.00',
      credit: '',
      amount: '10.00',
      balance: '990.00',
      direction: 'DEBIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);

    service.addBookTransactions([{ 
      id: 'book-2',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-15',
      description: 'Petrol purchase',
      amount: '0.00',
      type: 'MONEY_OUT',
      status: 'POSTED',
      journalId: 'journal-2',
    }]);

    const summary = service.calculateSummary('stmt-2');
    expect(summary.difference).toBe('-10.00');
    expect(service.getUnmatchedBankTransactions('stmt-2').length).toBeGreaterThan(0);
  });

  it('matches through an active reconciliation session using the session id', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-3',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Session Match',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1500.00',
    });
    const session = service.createSession({
      id: 'session-3',
      businessId,
      financialAccountId: bankAccountId,
      statementId: 'stmt-3',
      actor: 'user-1',
    });

    service.addBankTransactions('stmt-3', [{
      id: 'bank-3',
      statementId: 'stmt-3',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-20',
      description: 'Customer payment',
      normalizedDescription: 'customer payment',
      reference: 'INV-2001',
      debit: '',
      credit: '250.00',
      amount: '250.00',
      balance: '1250.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);

    service.addBookTransactions([{ 
      id: 'book-3',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-20',
      description: 'Customer payment',
      referenceNo: 'INV-2001',
      amount: '250.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-3',
    }]);

    const match = service.matchTransaction(session.id, 'bank-3', 'book-3', 'user-1');
    expect(match.sessionId).toBe(session.id);
    expect(match.status).toBe('MATCHED');
  });

  it('blocks completion when unresolved exceptions remain', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-4',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Pending',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1000.00',
    });

    service.addBankTransactions('stmt-4', [{
      id: 'bank-4',
      statementId: 'stmt-4',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-16',
      description: 'Unidentified item',
      normalizedDescription: 'unidentified item',
      reference: 'REF-9',
      debit: '50.00',
      credit: '',
      amount: '50.00',
      balance: '950.00',
      direction: 'DEBIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);

    expect(() => service.completeReconciliation('stmt-4', 'user-1')).toThrow();
  });

  it('matches exact amounts, tolerates date variance, validates direction, and prevents duplicate matches', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-5',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Matching',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '2000.00',
    });
    const session = service.createSession({ id: 'session-5', businessId, financialAccountId: bankAccountId, statementId: 'stmt-5', actor: 'user-1' });

    service.addBankTransactions('stmt-5', [{
      id: 'bank-5',
      statementId: 'stmt-5',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-10',
      description: 'Customer payment for invoice INV-2001',
      normalizedDescription: 'customer payment for invoice inv2001',
      reference: 'INV-2001',
      debit: '',
      credit: '250.00',
      amount: '250.00',
      balance: '1250.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);
    service.addBookTransactions([{ 
      id: 'book-5',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-12',
      description: 'Customer payment for invoice INV-2001',
      referenceNo: 'INV-2001',
      amount: '250.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-5',
    }]);

    const match = service.matchTransaction(session.id, 'bank-5', 'book-5', 'user-1');
    expect(match.status).toBe('MATCHED');
    expect(match.confidence).toBeGreaterThanOrEqual(80);
    expect(match.reasons.some((reason) => reason.toLowerCase().includes('amount'))).toBe(true);

    const duplicate = service.matchTransaction(session.id, 'bank-5', 'book-5', 'user-1');
    expect(duplicate.id).toBe(match.id);
    expect([...service['matches'].values()].filter((entry) => entry.bankTransactionId === 'bank-5')).toHaveLength(1);
  });

  it('supports match groups for one-to-many and many-to-one totals with deterministic differences', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-6',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Groups',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1500.00',
    });
    const session = service.createSession({ id: 'session-6', businessId, financialAccountId: bankAccountId, statementId: 'stmt-6', actor: 'user-1' });

    service.addBankTransactions('stmt-6', [
      { id: 'bank-6a', statementId: 'stmt-6', businessId, financialAccountId: bankAccountId, date: '2026-09-11', description: 'Invoice A', normalizedDescription: 'invoice a', reference: 'INV-A', debit: '', credit: '600.00', amount: '600.00', balance: '1600.00', direction: 'CREDIT', source: 'csv', status: 'IMPORTED' },
      { id: 'bank-6b', statementId: 'stmt-6', businessId, financialAccountId: bankAccountId, date: '2026-09-12', description: 'Invoice B', normalizedDescription: 'invoice b', reference: 'INV-B', debit: '', credit: '400.00', amount: '400.00', balance: '2000.00', direction: 'CREDIT', source: 'csv', status: 'IMPORTED' },
      { id: 'bank-6c', statementId: 'stmt-6', businessId, financialAccountId: bankAccountId, date: '2026-09-13', description: 'Payment one', normalizedDescription: 'payment one', reference: 'PAY-1', debit: '300.00', credit: '', amount: '300.00', balance: '1700.00', direction: 'DEBIT', source: 'csv', status: 'IMPORTED' },
      { id: 'bank-6d', statementId: 'stmt-6', businessId, financialAccountId: bankAccountId, date: '2026-09-14', description: 'Payment two', normalizedDescription: 'payment two', reference: 'PAY-2', debit: '200.00', credit: '', amount: '200.00', balance: '1500.00', direction: 'DEBIT', source: 'csv', status: 'IMPORTED' },
    ]);
    service.addBookTransactions([
      { id: 'book-6a', businessId, financialAccountId: bankAccountId, date: '2026-09-11', description: 'Invoice A', referenceNo: 'INV-A', amount: '600.00', type: 'MONEY_IN', status: 'POSTED', journalId: 'journal-6a' },
      { id: 'book-6b', businessId, financialAccountId: bankAccountId, date: '2026-09-12', description: 'Invoice B', referenceNo: 'INV-B', amount: '400.00', type: 'MONEY_IN', status: 'POSTED', journalId: 'journal-6b' },
      { id: 'book-6c', businessId, financialAccountId: bankAccountId, date: '2026-09-13', description: 'Expense payment', referenceNo: 'PAY-1', amount: '500.00', type: 'MONEY_OUT', status: 'POSTED', journalId: 'journal-6c' },
    ]);

    const oneToMany = service.createMatchGroup(session.id, ['bank-6a', 'bank-6b'], ['book-6a', 'book-6b'], 'user-1');
    const manyToOne = service.createMatchGroup(session.id, ['bank-6c', 'bank-6d'], ['book-6c'], 'user-1');

    expect(oneToMany.bankTransactionIds).toEqual(['bank-6a', 'bank-6b']);
    expect(oneToMany.bookTransactionIds).toEqual(['book-6a', 'book-6b']);
    expect(oneToMany.totalAmount).toBe('1000.00');
    expect(manyToOne.totalAmount).toBe('500.00');
    expect(oneToMany.status).toBe('MATCHED');
    expect(oneToMany.difference).toBe('0.00');
    expect(service.getMatchGroups(session.id)).toHaveLength(2);
    expect(() => service.createMatchGroup(session.id, ['bank-6a'], ['book-6a'], 'user-1')).toThrow();
  });

  it('requires partial approval and blocks silent accounting adjustment', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-7',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Partial',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1000.00',
    });
    const session = service.createSession({ id: 'session-7', businessId, financialAccountId: bankAccountId, statementId: 'stmt-7', actor: 'user-1' });

    service.addBankTransactions('stmt-7', [{
      id: 'bank-7',
      statementId: 'stmt-7',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-15',
      description: 'Payment difference',
      normalizedDescription: 'payment difference',
      reference: 'PAY-100',
      debit: '',
      credit: '250.00',
      amount: '250.00',
      balance: '1250.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);
    service.addBookTransactions([{ 
      id: 'book-7',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-15',
      description: 'Payment difference',
      referenceNo: 'PAY-100',
      amount: '230.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-7',
    }]);

    const partial = service.createPartialMatch(session.id, ['bank-7'], ['book-7'], 'user-1');
    expect(partial.status).toBe('PARTIAL');
    expect(partial.difference).toBe('20.00');
    expect(() => service.completeReconciliation(session.id, 'user-1')).toThrow();

    const approved = service.approvePartialMatch(session.id, partial.id, 'user-2');
    expect(approved.approvedBy).toBe('user-2');
    expect(approved.status).toBe('PARTIAL');
    expect(approved.resolutionState).toBe('APPROVED');
  });

  it('routes bank charge, bank interest, and approved adjustment through the Transaction Service and Accounting Engine', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({
      id: 'stmt-8',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Exceptions',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1500.00',
    });
    const session = service.createSession({ id: 'session-8', businessId, financialAccountId: bankAccountId, statementId: 'stmt-8', actor: 'user-1' });

    service.addBankTransactions('stmt-8', [{
      id: 'bank-8',
      statementId: 'stmt-8',
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-20',
      description: 'Bank charge',
      normalizedDescription: 'bank charge',
      reference: 'CHG-8',
      debit: '15.00',
      credit: '',
      amount: '15.00',
      balance: '1485.00',
      direction: 'DEBIT',
      source: 'csv',
      status: 'IMPORTED',
    }]);

    const charge = service.createBankCharge(session.id, 'bank-8', 'user-1', expenseAccountId, '15.00');
    const interest = service.createBankInterest(session.id, 'bank-8', 'user-1', revenueAccountId, '5.00');
    const adjustment = service.createAdjustmentTransaction({
      businessId,
      financialAccountId: bankAccountId,
      date: '2026-09-21',
      description: 'Approved bank adjustment',
      amount: '20.00',
      accountId: revenueAccountId,
      direction: 'CREDIT',
      actor: 'user-1',
      source: 'approved-adjustment-8',
      sessionId: session.id,
    });

    const txService = (service as any).transactionService;
    const chargeTx = txService.getTransaction(charge.transactionId);
    const interestTx = txService.getTransaction(interest.transactionId);
    const adjustmentTx = txService.getTransaction(adjustment.transactionId);

    expect(chargeTx.status).toBe('POSTED');
    expect(chargeTx.journalId).toBeTruthy();
    expect((service as any).engine.journals.has(chargeTx.journalId)).toBe(true);
    expect(interestTx.status).toBe('POSTED');
    expect(interestTx.journalId).toBeTruthy();
    expect((service as any).engine.journals.has(interestTx.journalId)).toBe(true);
    expect(adjustmentTx.status).toBe('POSTED');
    expect(adjustmentTx.journalId).toBeTruthy();
    expect((service as any).engine.journals.has(adjustmentTx.journalId)).toBe(true);

    const missing = service.createMissingTransaction(session.id, {
      bankTransactionId: 'bank-8',
      actor: 'user-1',
      businessId,
      financialAccountId: bankAccountId,
      accountId: revenueAccountId,
      type: 'MONEY_IN',
      date: '2026-09-21',
      amount: '75.00',
      description: 'Missing customer payment',
    });
    const missingTx = txService.getTransaction(missing.transactionId);
    expect(missingTx.status).toBe('POSTED');
    expect(missingTx.journalId).toBeTruthy();
  });

  it('blocks cross-business reads, mutations, and lock mutation after completion', () => {
    const service = new ReconciliationService(engine);
    const otherBusiness = '99999999-9999-4999-8999-999999999999';
    service.createStatement({
      id: 'stmt-9',
      businessId,
      financialAccountId: bankAccountId,
      name: 'Maybank Security',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1000.00',
    });
    const session = service.createSession({ id: 'session-9', businessId, financialAccountId: bankAccountId, statementId: 'stmt-9', actor: 'user-1' });

    (service as any).sessions.set('session-evil', {
      id: 'session-evil',
      businessId: otherBusiness,
      financialAccountId: bankAccountId,
      statementId: 'stmt-9',
      status: 'OPEN',
      startedAt: new Date().toISOString(),
      auditTrail: [],
      summary: { bankTotal: '0.00', bookTotal: '0.00', difference: '0.00', matched: 0, unmatchedBank: 0, unmatchedBook: 0, partial: 0, status: 'OPEN' },
    });
    (service as any).statements.set('stmt-evil', {
      id: 'stmt-evil',
      businessId: otherBusiness,
      financialAccountId: bankAccountId,
      name: 'Other business statement',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '1000.00',
      closingBalance: '1000.00',
      status: 'OPEN',
      history: [],
    });
    (service as any).bankTransactions.set('bank-other', {
      id: 'bank-other',
      statementId: 'stmt-evil',
      businessId: otherBusiness,
      financialAccountId: bankAccountId,
      date: '2026-09-02',
      description: 'Not allowed',
      normalizedDescription: 'not allowed',
      reference: 'BAD-1',
      debit: '',
      credit: '10.00',
      amount: '10.00',
      balance: '1010.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    });
    (service as any).bookTransactions.set('book-other', {
      id: 'book-other',
      businessId: otherBusiness,
      financialAccountId: bankAccountId,
      date: '2026-09-02',
      description: 'Other business book',
      referenceNo: 'BAD-1',
      amount: '10.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-other',
    });

    expect(() => service.createSession({ id: 'session-evil', businessId: otherBusiness, financialAccountId: bankAccountId, statementId: 'stmt-9', actor: 'user-8' })).toThrow();
    expect(() => service.getSession('session-evil')).toThrow();
    expect(() => service.getStatement('stmt-evil')).toThrow();
    expect(() => service.getBankTransactions('stmt-evil')).toThrow();
    expect(() => service.getBookTransactions(otherBusiness)).toThrow();
    expect(() => service.matchTransaction('session-evil', 'bank-other', 'book-other', 'user-1')).toThrow();
    expect(() => service.completeReconciliation('session-evil', 'user-1')).toThrow();
    expect(() => service.lockReconciliation('session-evil', 'user-1')).toThrow();

    expect(() => service.addBankTransactions('stmt-9', [{
      id: 'bank-9',
      statementId: 'stmt-9',
      businessId: otherBusiness,
      financialAccountId: bankAccountId,
      date: '2026-09-02',
      description: 'Not allowed',
      normalizedDescription: 'not allowed',
      reference: 'BAD-1',
      debit: '',
      credit: '10.00',
      amount: '10.00',
      balance: '1010.00',
      direction: 'CREDIT',
      source: 'csv',
      status: 'IMPORTED',
    }])).toThrow();

    const completed = service.completeReconciliation(session.id, 'user-1');
    expect(completed.status).toBe('COMPLETED');
    service.lockReconciliation(session.id, 'user-1');
    expect(() => service.matchTransaction(session.id, 'bank-5', 'book-5', 'user-1')).toThrow();
    expect(() => service.createManualMatch(session.id, ['bank-5'], ['book-5'], 'user-1')).toThrow();
    expect(() => service.createMatchGroup(session.id, ['bank-5'], ['book-5'], 'user-1')).toThrow();
    expect(() => service.createPartialMatch(session.id, ['bank-5'], ['book-5'], 'user-1')).toThrow();
    expect(() => service.createBankCharge(session.id, 'bank-5', 'user-1', expenseAccountId, '10.00')).toThrow();
  });

  it('records audit events for creation, matching, partial approval, and correction', () => {
    const service = new ReconciliationService(engine);
    service.createStatement({ id: 'stmt-10', businessId, financialAccountId: bankAccountId, name: 'Maybank Audit', startDate: '2026-09-01', endDate: '2026-09-30', openingBalance: '1000.00', closingBalance: '1000.00' });
    const session = service.createSession({ id: 'session-10', businessId, financialAccountId: bankAccountId, statementId: 'stmt-10', actor: 'user-1' });
    service.addBankTransactions('stmt-10', [{ id: 'bank-10', statementId: 'stmt-10', businessId, financialAccountId: bankAccountId, date: '2026-09-20', description: 'Audit payment', normalizedDescription: 'audit payment', reference: 'AUD-1', debit: '', credit: '80.00', amount: '80.00', balance: '1080.00', direction: 'CREDIT', source: 'csv', status: 'IMPORTED' }]);
    service.addBookTransactions([{ id: 'book-10', businessId, financialAccountId: bankAccountId, date: '2026-09-20', description: 'Audit payment', referenceNo: 'AUD-1', amount: '80.00', type: 'MONEY_IN', status: 'POSTED', journalId: 'journal-10' }]);

    const match = service.matchTransaction(session.id, 'bank-10', 'book-10', 'user-1');
    expect(service.getAuditTrail(session.id).some((event) => event.action === 'MATCH_CREATED' && event.entityId === match.id)).toBe(true);

    const partial = service.createPartialMatch(session.id, ['bank-10'], ['book-10'], 'user-1', '5.00');
    const approved = service.approvePartialMatch(session.id, partial.id, 'user-2');
    expect(approved.approvedBy).toBe('user-2');

    const corrected = service.createCorrection(session.id, 'user-1', 'Accounting correction after lock simulation', { entityType: 'MATCH', entityId: partial.id });
    expect(corrected.action).toBe('CORRECTION');
    expect(service.getAuditTrail(session.id).some((event) => event.action === 'CORRECTION')).toBe(true);
  });
});
