import {
  AccountingEngine,
  createMoneyInJournal,
  createMoneyOutJournal,
  createTransferJournal,
  type JournalEntry,
  type JournalInput,
  type JournalLineInput,
} from './accounting';

export function createDemoTransactionService(): TransactionService {
  const businessId = '11111111-1111-4111-8111-111111111111';
  const bankAccountId = '22222222-2222-4222-8222-222222222222';
  const revenueAccountId = '33333333-3333-4333-8333-333333333333';
  const expenseAccountId = '44444444-4444-4444-8444-444444444444';
  const cashAccountId = '55555555-5555-4555-8555-555555555555';
  const equityAccountId = '66666666-6666-4666-8666-666666666666';

  const engine = new AccountingEngine({
    businessId,
    accounts: [
      { id: revenueAccountId, businessId, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
      { id: expenseAccountId, businessId, code: '6000', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: cashAccountId, businessId, code: '1100', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: equityAccountId, businessId, code: '3000', name: 'Opening Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
    ],
    periods: [{ id: 'period-1', businessId, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    financialAccounts: [{ id: bankAccountId, businessId, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' }],
  });

  const service = new TransactionService(engine);

  const baseEntries: Array<Omit<TransactionCreateInput, 'businessId'> & { businessId: string }> = [
    {
      businessId,
      type: 'MONEY_IN',
      date: '2026-09-12',
      description: 'Customer payment',
      amount: '500.00',
      financialAccountId: bankAccountId,
      accountId: revenueAccountId,
      referenceNo: 'INV-1001',
      createdBy: 'user-1',
      idempotencyKey: 'demo-money-in',
    },
    {
      businessId,
      type: 'MONEY_OUT',
      date: '2026-09-11',
      description: 'Petrol purchase',
      amount: '120.00',
      financialAccountId: bankAccountId,
      accountId: expenseAccountId,
      referenceNo: 'FUEL-001',
      createdBy: 'user-1',
      idempotencyKey: 'demo-money-out',
    },
    {
      businessId,
      type: 'TRANSFER',
      date: '2026-09-10',
      description: 'Maybank to cash transfer',
      amount: '300.00',
      fromFinancialAccountId: bankAccountId,
      toFinancialAccountId: cashAccountId,
      createdBy: 'user-1',
      idempotencyKey: 'demo-transfer',
    },
  ];

  for (const entry of baseEntries) {
    const tx = service.createTransaction(entry);
    service.postTransaction(tx.id, 'user-1', entry.idempotencyKey);
  }

  return service;
}

export type TransactionType = 'MONEY_IN' | 'MONEY_OUT' | 'TRANSFER' | 'JOURNAL';
export type TransactionStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'POSTED' | 'VOIDED';

export interface TransactionLineInput {
  accountId: string;
  debit?: string;
  credit?: string;
  description?: string;
}

export interface TransactionCreateInput {
  businessId: string;
  type: TransactionType;
  date: string;
  description: string;
  amount?: string;
  referenceNo?: string;
  financialAccountId?: string;
  accountId?: string;
  fromFinancialAccountId?: string;
  toFinancialAccountId?: string;
  createdBy?: string;
  lines?: TransactionLineInput[];
  idempotencyKey?: string;
}

export interface TransactionRecord {
  id: string;
  businessId: string;
  type: TransactionType;
  date: string;
  description: string;
  referenceNo?: string;
  amount: string;
  financialAccountId?: string;
  accountId?: string;
  fromFinancialAccountId?: string;
  toFinancialAccountId?: string;
  status: TransactionStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  journalId?: string;
  journal?: JournalEntry;
  lines?: TransactionLineInput[];
}

export class TransactionService {
  private readonly engine: AccountingEngine;
  private readonly transactions = new Map<string, TransactionRecord>();
  private readonly idempotency = new Map<string, string>();

  constructor(engine: AccountingEngine) {
    this.engine = engine;
  }

  getTransactions(businessId: string): TransactionRecord[] {
    this.engine.authorizeBusiness(businessId, this.engine.businessId);
    return [...this.transactions.values()].filter((transaction) => transaction.businessId === businessId);
  }

  getTransaction(id: string): TransactionRecord {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error('Transaction not found.');
    }
    return transaction;
  }

  createTransaction(input: TransactionCreateInput): TransactionRecord {
    this.engine.authorizeBusiness(input.businessId, this.engine.businessId);

    if (!input.date) {
      throw new Error('Transaction date is required.');
    }

    const now = new Date().toISOString();
    const baseRecord: TransactionRecord = {
      id: `txn-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      businessId: input.businessId,
      type: input.type,
      date: input.date,
      description: input.description,
      referenceNo: input.referenceNo,
      amount: input.amount ?? '0.00',
      financialAccountId: input.financialAccountId,
      accountId: input.accountId,
      fromFinancialAccountId: input.fromFinancialAccountId,
      toFinancialAccountId: input.toFinancialAccountId,
      status: 'DRAFT',
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      lines: input.lines ?? [],
    };

    if (input.idempotencyKey && this.idempotency.has(input.idempotencyKey)) {
      return this.transactions.get(this.idempotency.get(input.idempotencyKey) ?? '') ?? baseRecord;
    }

    const journal = this.buildJournal(input, baseRecord.amount);
    const validation = this.engine.validateJournal(journal);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const createdJournal = this.engine.createJournal(journal);
    const transaction: TransactionRecord = {
      ...baseRecord,
      journalId: createdJournal.id,
      journal: createdJournal,
      amount: baseRecord.amount,
    };

    this.transactions.set(transaction.id, transaction);
    if (input.idempotencyKey) {
      this.idempotency.set(input.idempotencyKey, transaction.id);
    }

    return transaction;
  }

  postTransaction(transactionId: string, postedBy: string, idempotencyKey?: string): TransactionRecord {
    const existing = this.transactions.get(transactionId);
    if (!existing) {
      throw new Error('Transaction not found.');
    }

    if (idempotencyKey && this.idempotency.has(idempotencyKey)) {
      const existingId = this.idempotency.get(idempotencyKey);
      const idempotent = existingId ? this.transactions.get(existingId) : undefined;
      if (idempotent && idempotent.status === 'POSTED') {
        return idempotent;
      }
    }

    if (existing.status === 'POSTED') {
      return existing;
    }

    if (!existing.journal) {
      throw new Error('Transaction journal is missing.');
    }

    const postedJournal = this.engine.postJournal(existing.journal, {
      postedBy,
      idempotencyKey,
    });

    const updated: TransactionRecord = {
      ...existing,
      status: 'POSTED',
      updatedAt: new Date().toISOString(),
      journal: postedJournal,
      journalId: postedJournal.id,
    };

    this.transactions.set(transactionId, updated);
    if (idempotencyKey) {
      this.idempotency.set(idempotencyKey, transactionId);
    }
    return updated;
  }

  private buildJournal(input: TransactionCreateInput, amount: string): JournalInput {
    const common = {
      businessId: input.businessId,
      journalDate: input.date,
      sourceType: 'MANUAL' as const,
      description: input.description,
      referenceNo: input.referenceNo,
    };

    if (input.type === 'MONEY_IN') {
      if (!input.financialAccountId || !input.accountId) {
        throw new Error('Money In requires a financial account and revenue account.');
      }
      if (Number(amount) <= 0) {
        throw new Error('Money In amount must be greater than zero.');
      }
      return createMoneyInJournal({
        ...common,
        financialAccountId: input.financialAccountId,
        revenueAccountId: input.accountId,
        amount,
      });
    }

    if (input.type === 'MONEY_OUT') {
      if (!input.financialAccountId || !input.accountId) {
        throw new Error('Money Out requires a financial account and expense account.');
      }
      if (Number(amount) <= 0) {
        throw new Error('Money Out amount must be greater than zero.');
      }
      return createMoneyOutJournal({
        ...common,
        financialAccountId: input.financialAccountId,
        expenseAccountId: input.accountId,
        amount,
      });
    }

    if (input.type === 'TRANSFER') {
      if (!input.fromFinancialAccountId || !input.toFinancialAccountId) {
        throw new Error('Transfer requires source and destination financial accounts.');
      }
      if (input.fromFinancialAccountId === input.toFinancialAccountId) {
        throw new Error('Source and destination accounts cannot be the same.');
      }
      if (Number(amount) <= 0) {
        throw new Error('Transfer amount must be greater than zero.');
      }
      return createTransferJournal({
        ...common,
        fromFinancialAccountId: input.fromFinancialAccountId,
        toFinancialAccountId: input.toFinancialAccountId,
        fromAccountId: input.fromFinancialAccountId,
        toAccountId: input.toFinancialAccountId,
        amount,
      });
    }

    if (!input.lines || input.lines.length < 2) {
      throw new Error('Journal entries require at least two lines.');
    }

    const lines: JournalLineInput[] = input.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
    }));

    return {
      ...common,
      journalNo: `JRN-${Date.now()}`,
      lines,
    };
  }
}
