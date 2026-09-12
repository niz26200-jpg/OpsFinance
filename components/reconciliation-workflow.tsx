'use client';

import { useMemo, useState } from 'react';

import { AccountingEngine } from '../packages/accounting';
import { ReconciliationService, type BankTransaction, type BookTransaction, type ReconciliationSession, type ReconciliationSummary } from '../packages/reconciliation';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const BANK_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const REVENUE_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const EXPENSE_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const CASH_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';

const fieldStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem', background: '#fff', fontSize: 14 } as const;

function buildService(): ReconciliationService {
  const engine = new AccountingEngine({
    businessId: BUSINESS_ID,
    accounts: [
      { id: REVENUE_ACCOUNT_ID, businessId: BUSINESS_ID, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
      { id: EXPENSE_ACCOUNT_ID, businessId: BUSINESS_ID, code: '6000', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: CASH_ACCOUNT_ID, businessId: BUSINESS_ID, code: '1100', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
    ],
    periods: [{ id: 'period-1', businessId: BUSINESS_ID, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    financialAccounts: [{ id: BANK_ACCOUNT_ID, businessId: BUSINESS_ID, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' }],
  });

  const service = new ReconciliationService(engine);
  service.createStatement({
    id: 'stmt-demo',
    businessId: BUSINESS_ID,
    financialAccountId: BANK_ACCOUNT_ID,
    name: 'Maybank Sept 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    openingBalance: '1000.00',
    closingBalance: '1500.00',
  });

  const session = service.createSession({ id: 'session-demo', businessId: BUSINESS_ID, financialAccountId: BANK_ACCOUNT_ID, statementId: 'stmt-demo', actor: 'demo-user' });

  service.addBankTransactions('stmt-demo', [
    {
      id: 'bank-001',
      statementId: 'stmt-demo',
      businessId: BUSINESS_ID,
      financialAccountId: BANK_ACCOUNT_ID,
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
    },
    {
      id: 'bank-002',
      statementId: 'stmt-demo',
      businessId: BUSINESS_ID,
      financialAccountId: BANK_ACCOUNT_ID,
      date: '2026-09-15',
      description: 'Bank charge',
      normalizedDescription: 'bank charge',
      reference: 'CHG-1',
      debit: '10.00',
      credit: '',
      amount: '10.00',
      balance: '1490.00',
      direction: 'DEBIT',
      source: 'csv',
      status: 'IMPORTED',
    },
  ]);

  service.addBookTransactions([
    {
      id: 'book-001',
      businessId: BUSINESS_ID,
      financialAccountId: BANK_ACCOUNT_ID,
      date: '2026-09-12',
      description: 'Customer payment',
      referenceNo: 'INV-1001',
      amount: '500.00',
      type: 'MONEY_IN',
      status: 'POSTED',
      journalId: 'journal-001',
    },
    {
      id: 'book-002',
      businessId: BUSINESS_ID,
      financialAccountId: BANK_ACCOUNT_ID,
      date: '2026-09-15',
      description: 'Petrol purchase',
      amount: '120.00',
      type: 'MONEY_OUT',
      status: 'POSTED',
      journalId: 'journal-002',
    },
  ]);

  service.matchTransaction(session.id, 'bank-001', 'book-001', 'demo-user');
  return service;
}

export function ReconciliationWorkflow() {
  const [service] = useState<ReconciliationService>(() => buildService());
  const [sessionId, setSessionId] = useState<string>('session-demo');
  const [tab, setTab] = useState<'ALL' | 'MATCHED' | 'UNMATCHED_BANK' | 'UNMATCHED_BOOK' | 'PARTIAL'>('ALL');
  const [selectedFinancialAccount, setSelectedFinancialAccount] = useState<string>(BANK_ACCOUNT_ID);
  const [selectedBank, setSelectedBank] = useState<string>('bank-002');
  const [selectedBook, setSelectedBook] = useState<string>('book-002');
  const [status, setStatus] = useState<string>('');

  const session = service.getSession(sessionId);
  const statement = service.getStatement(session.statementId);
  const bankTransactions = service.getBankTransactions(statement.id);
  const bookTransactions = service.getBookTransactions(BUSINESS_ID);
  const matches = Array.from(service['matches'].values());
  const summary: ReconciliationSummary = service.calculateSummary(statement.id);
  const auditTrail = service.getAuditTrail(session.id);

  const filteredBankTransactions: BankTransaction[] = useMemo(() => {
    if (tab === 'MATCHED') {
      return bankTransactions.filter((tx) => matches.some((match) => match.sessionId === session.id && match.bankTransactionId === tx.id && match.status === 'MATCHED'));
    }
    if (tab === 'UNMATCHED_BANK') {
      return service.getUnmatchedBankTransactions(statement.id);
    }
    if (tab === 'UNMATCHED_BOOK') {
      return service.getUnmatchedBankTransactions(statement.id);
    }
    if (tab === 'PARTIAL') {
      return bankTransactions.filter((tx) => matches.some((match) => match.sessionId === session.id && match.bankTransactionId === tx.id && match.status === 'PARTIAL'));
    }
    return bankTransactions;
  }, [bankTransactions, matches, session.id, statement.id, tab, service]);

  const visibleBookTransactions: BookTransaction[] = useMemo(() => {
    if (tab === 'UNMATCHED_BOOK') {
      return service.getUnmatchedBookTransactions(BUSINESS_ID);
    }
    return bookTransactions;
  }, [bookTransactions, tab, service]);

  const handleAutoMatch = () => {
    const candidate = bankTransactions.find((tx) => tx.id === selectedBank);
    const bookCandidate = bookTransactions.find((tx) => tx.id === selectedBook);
    if (!candidate || !bookCandidate) {
      setStatus('Select a bank and a book transaction before matching.');
      return;
    }
    const match = service.matchTransaction(session.id, candidate.id, bookCandidate.id, 'demo-user');
    setStatus(`Matched ${match.bankTransactionId} to ${match.bookTransactionIds.join(', ')}.`);
  };

  const handleManualMatch = () => {
    const result = service.createManualMatch(session.id, [selectedBank], [selectedBook], 'demo-user');
    setStatus(`Manual match created: ${result.id}`);
  };

  const handleBankCharge = () => {
    const result = service.createBankCharge(session.id, selectedBank, 'demo-user', EXPENSE_ACCOUNT_ID, '10.00');
    setStatus(`Bank charge created: ${result.transactionId}`);
  };

  const handleBankInterest = () => {
    const result = service.createBankInterest(session.id, selectedBank, 'demo-user', REVENUE_ACCOUNT_ID, '20.00');
    setStatus(`Bank interest created: ${result.transactionId}`);
  };

  const handleMissingTransaction = () => {
    const result = service.createMissingTransaction(session.id, {
      bankTransactionId: selectedBank,
      actor: 'demo-user',
      businessId: BUSINESS_ID,
      financialAccountId: BANK_ACCOUNT_ID,
      accountId: REVENUE_ACCOUNT_ID,
      type: 'MONEY_IN',
      date: '2026-09-20',
      amount: '75.00',
      description: 'Missing customer payment',
    });
    setStatus(`Missing transaction created: ${result.transactionId}`);
  };

  const handleComplete = () => {
    try {
      const result = service.completeReconciliation(session.id, 'demo-user');
      setStatus(`Completed: ${result.status} (${result.summary.difference})`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Completion blocked.');
    }
  };

  const handleLock = () => {
    const locked = service.lockReconciliation(session.id, 'demo-user');
    setStatus(`Locked: ${locked.id}`);
  };

  const handleUnmatch = () => {
    service.unmatchTransaction(session.id, selectedBank, 'demo-user');
    setStatus(`Unmatched ${selectedBank}.`);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '2rem 1rem 3rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: '2rem' }}>Bank Reconciliation</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleAutoMatch} style={{ ...buttonStyle, background: '#0f172a', color: '#fff' }}>Auto Match</button>
            <button type="button" onClick={handleManualMatch} style={{ ...buttonStyle, background: '#1d4ed8', color: '#fff' }}>Manual Match</button>
            <button type="button" onClick={handleBankCharge} style={{ ...buttonStyle, background: '#dc2626', color: '#fff' }}>Bank Charge</button>
            <button type="button" onClick={handleBankInterest} style={{ ...buttonStyle, background: '#15803d', color: '#fff' }}>Bank Interest</button>
            <button type="button" onClick={handleMissingTransaction} style={{ ...buttonStyle, background: '#7c3aed', color: '#fff' }}>Missing Transaction</button>
            <button type="button" onClick={handleComplete} style={{ ...buttonStyle, background: '#0f766e', color: '#fff' }}>Complete</button>
            <button type="button" onClick={handleLock} style={{ ...buttonStyle, background: '#334155', color: '#fff' }}>Lock</button>
            <button type="button" onClick={handleUnmatch} style={{ ...buttonStyle, background: '#e2e8f0', color: '#0f172a' }}>Unmatch</button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <SummaryCard label="Statement" value={statement.name} accent="#0f172a" />
          <SummaryCard label="Status" value={session.status} accent="#1d4ed8" />
          <SummaryCard label="Matched" value={String(summary.matched)} accent="#15803d" />
          <SummaryCard label="Unmatched" value={String(summary.unmatchedBank)} accent="#dc2626" />
          <SummaryCard label="Difference" value={summary.difference} accent="#7c3aed" />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Financial account</span>
            <select value={selectedFinancialAccount} onChange={(event) => setSelectedFinancialAccount(event.target.value)} style={fieldStyle}>
              <option value={BANK_ACCOUNT_ID}>Maybank</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Statement</span>
            <select value={session.statementId} onChange={(event) => setSessionId(event.target.value)} style={fieldStyle}>
              <option value="session-demo">Maybank Sept 2026</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>Period</span>
            <input value="2026-09-01 to 2026-09-30" readOnly style={fieldStyle} />
          </label>
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['ALL', 'MATCHED', 'UNMATCHED_BANK', 'UNMATCHED_BOOK', 'PARTIAL'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setTab(filter as typeof tab)}
              style={{
                ...buttonStyle,
                background: tab === filter ? '#0f172a' : '#e2e8f0',
                color: tab === filter ? '#fff' : '#0f172a',
              }}
            >
              {filter === 'UNMATCHED_BANK' ? 'Unmatched Bank' : filter === 'UNMATCHED_BOOK' ? 'Unmatched Book' : filter}
            </button>
          ))}
        </section>

        {status ? <div style={{ marginBottom: '1rem', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '0.9rem 1rem', color: '#164e63' }}>{status}</div> : null}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Bank transactions</div>
            <div style={{ padding: '0.9rem' }}>
              {filteredBankTransactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedBank(tx.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: selectedBank === tx.id ? '#e0f2fe' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem', marginBottom: '0.7rem', cursor: 'pointer', color: '#0f172a',
                  }}
                >
                  <strong>{tx.description}</strong>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{tx.date} · {tx.reference} · {tx.direction}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{tx.amount}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>Book transactions</div>
            <div style={{ padding: '0.9rem' }}>
              {visibleBookTransactions.map((tx: BookTransaction) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedBook(tx.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: selectedBook === tx.id ? '#dcfce7' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem', marginBottom: '0.7rem', cursor: 'pointer', color: '#0f172a',
                  }}
                >
                  <strong>{tx.description}</strong>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{tx.date} · {tx.type}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{tx.amount}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>History</div>
          <div style={{ padding: '1rem 1.1rem' }}>
            {auditTrail.map((event) => (
              <div key={event.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
                <div style={{ fontWeight: 700 }}>{event.action}</div>
                <div style={{ color: '#475569', fontSize: 12 }}>{new Date(event.timestamp).toISOString()} · {event.actor}</div>
                {event.details ? <div style={{ color: '#334155', marginTop: 4 }}>{event.details}</div> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem 1.1rem' }}>
      <div style={{ color: '#475569', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: accent, fontWeight: 700, fontSize: '1.1rem' }}>{value}</div>
    </div>
  );
}

const buttonStyle = {
  border: 'none',
  borderRadius: 10,
  padding: '0.7rem 0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 13,
} as const;
