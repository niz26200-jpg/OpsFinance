'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  createDemoTransactionService,
  type TransactionRecord,
  type TransactionStatus,
  type TransactionType,
} from '../packages/transactions';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const BANK_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const CASH_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';
const REVENUE_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const EXPENSE_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

const transactionTypes: Array<{ value: TransactionType; label: string }> = [
  { value: 'MONEY_IN', label: 'Money In' },
  { value: 'MONEY_OUT', label: 'Money Out' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'JOURNAL', label: 'Journal Entry' },
];

const statusOptions: TransactionStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'POSTED', 'VOIDED'];

const service = createDemoTransactionService();

const formatMoney = (value: string | number | undefined) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 'RM0.00';
  }
  return `RM${numeric.toFixed(2)}`;
};

export function TransactionWorkflow() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => service.getTransactions(BUSINESS_ID));
  const [selectedType, setSelectedType] = useState<TransactionType>('MONEY_IN');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(
    () => service.getTransactions(BUSINESS_ID)[0]?.id ?? null,
  );
  const [filters, setFilters] = useState({
    search: '',
    type: 'ALL',
    status: 'ALL',
    account: '',
    startDate: '',
    endDate: '',
  });

  const [form, setForm] = useState({
    date: '2026-09-12',
    description: 'Customer payment',
    amount: '500.00',
    referenceNo: 'INV-1001',
    financialAccountId: BANK_ACCOUNT_ID,
    accountId: REVENUE_ACCOUNT_ID,
    fromFinancialAccountId: BANK_ACCOUNT_ID,
    toFinancialAccountId: CASH_ACCOUNT_ID,
    journalLines: [
      { accountId: BANK_ACCOUNT_ID, debit: '500.00', credit: '', description: 'Bank debit' },
      { accountId: REVENUE_ACCOUNT_ID, debit: '', credit: '500.00', description: 'Revenue credit' },
    ],
  });

  const transactionSummary = useMemo(
    () => ({
      total: transactions.length,
      posted: transactions.filter((transaction) => transaction.status === 'POSTED').length,
      draft: transactions.filter((transaction) => transaction.status === 'DRAFT').length,
      amount: transactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
    }),
    [transactions],
  );

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      !filters.search ||
      transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      (transaction.referenceNo ?? '').toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.id.toLowerCase().includes(filters.search.toLowerCase());

    const matchesType = filters.type === 'ALL' || transaction.type === filters.type;
    const matchesStatus = filters.status === 'ALL' || transaction.status === filters.status;
    const matchesAccount =
      !filters.account ||
      (transaction.financialAccountId ?? transaction.accountId ?? transaction.fromFinancialAccountId ?? '') === filters.account ||
      (transaction.toFinancialAccountId ?? '') === filters.account;
    const matchesStart = !filters.startDate || transaction.date >= filters.startDate;
    const matchesEnd = !filters.endDate || transaction.date <= filters.endDate;

    return matchesSearch && matchesType && matchesStatus && matchesAccount && matchesStart && matchesEnd;
  });

  const selectedTransaction = transactions.find((transaction) => transaction.id === selectedTransactionId) ?? filteredTransactions[0] ?? null;

  const refreshTransactions = () => setTransactions(service.getTransactions(BUSINESS_ID));

  const handleCreate = () => {
    const payload = {
      businessId: BUSINESS_ID,
      type: selectedType,
      date: form.date,
      description: form.description,
      amount: form.amount,
      referenceNo: form.referenceNo,
      financialAccountId: form.financialAccountId,
      accountId: form.accountId,
      fromFinancialAccountId: form.fromFinancialAccountId,
      toFinancialAccountId: form.toFinancialAccountId,
      createdBy: 'demo-user',
      lines: form.journalLines,
    };

    try {
      const created = service.createTransaction(payload);
      const posted = service.postTransaction(created.id, 'demo-user', `${selectedType}-${created.id}`);
      setTransactions(service.getTransactions(BUSINESS_ID));
      setSelectedTransactionId(posted.id);
      setForm({
        date: '2026-09-12',
        description: selectedType === 'MONEY_IN' ? 'Customer payment' : selectedType === 'MONEY_OUT' ? 'Expense payment' : 'Transfer entry',
        amount: '500.00',
        referenceNo: '',
        financialAccountId: BANK_ACCOUNT_ID,
        accountId: REVENUE_ACCOUNT_ID,
        fromFinancialAccountId: BANK_ACCOUNT_ID,
        toFinancialAccountId: CASH_ACCOUNT_ID,
        journalLines: [
          { accountId: BANK_ACCOUNT_ID, debit: '500.00', credit: '', description: 'Bank debit' },
          { accountId: REVENUE_ACCOUNT_ID, debit: '', credit: '500.00', description: 'Revenue credit' },
        ],
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to create transaction');
    }
  };

  const handleReview = (transactionId: string) => {
    const updated = service.reviewTransaction(transactionId, 'demo-user');
    const approved = service.approveTransaction(updated.id, 'demo-user');
    setTransactions(service.getTransactions(BUSINESS_ID));
    setSelectedTransactionId(approved.id);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f5f7fb', color: '#111827', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1rem 3rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0, color: '#475569', fontWeight: 700, fontSize: 12 }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: '2rem' }}>All Transactions</h1>
          </div>
          <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/" style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#e2e8f0' }}>Home</Link>
            <Link href="/login" style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#e2e8f0' }}>Login</Link>
            <Link href="/register" style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#e2e8f0' }}>Register</Link>
            <Link href="/reconciliation" style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#dbeafe' }}>Reconciliation</Link>
          </nav>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Transactions" value={String(transactionSummary.total)} tone="#0f172a" />
          <StatCard label="Posted" value={String(transactionSummary.posted)} tone="#166534" />
          <StatCard label="Draft" value={String(transactionSummary.draft)} tone="#b45309" />
          <StatCard label="Total value" value={formatMoney(transactionSummary.amount)} tone="#1d4ed8" />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.9fr)', gap: '1rem', alignItems: 'start' }}>
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Filter & search</h2>
              <button type="button" onClick={refreshTransactions} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.55rem 0.9rem', background: '#fff', cursor: 'pointer' }}>
                Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.9rem', padding: '1rem 1.25rem' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Search</span>
                <input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))} placeholder="Search" style={fieldStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Type</span>
                <select value={filters.type} onChange={(event) => setFilters((value) => ({ ...value, type: event.target.value }))} style={fieldStyle}>
                  <option value="ALL">All</option>
                  {transactionTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Status</span>
                <select value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))} style={fieldStyle}>
                  <option value="ALL">All</option>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Account</span>
                <select value={filters.account} onChange={(event) => setFilters((value) => ({ ...value, account: event.target.value }))} style={fieldStyle}>
                  <option value="">All</option>
                  <option value={BANK_ACCOUNT_ID}>Maybank</option>
                  <option value={CASH_ACCOUNT_ID}>Cash</option>
                  <option value={REVENUE_ACCOUNT_ID}>Sales</option>
                  <option value={EXPENSE_ACCOUNT_ID}>Petrol</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>From date</span>
                <input type="date" value={filters.startDate} onChange={(event) => setFilters((value) => ({ ...value, startDate: event.target.value }))} style={fieldStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>To date</span>
                <input type="date" value={filters.endDate} onChange={(event) => setFilters((value) => ({ ...value, endDate: event.target.value }))} style={fieldStyle} />
              </label>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Transaction No', 'Date', 'Type', 'Description', 'Financial Account', 'Amount', 'Status', 'Source'].map((header) => (
                      <th key={header} style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: 12, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>No matching transactions.</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} onClick={() => setSelectedTransactionId(transaction.id)} style={{ cursor: 'pointer', background: selectedTransaction?.id === transaction.id ? '#eef6ff' : '#fff' }}>
                        <td style={cellStyle}>{transaction.referenceNo ?? transaction.id}</td>
                        <td style={cellStyle}>{transaction.date}</td>
                        <td style={cellStyle}>{transaction.type}</td>
                        <td style={cellStyle}>{transaction.description}</td>
                        <td style={cellStyle}>{transaction.financialAccountId ?? transaction.fromFinancialAccountId ?? '—'}</td>
                        <td style={cellStyle}>{formatMoney(transaction.amount)}</td>
                        <td style={cellStyle}><StatusBadge status={transaction.status} /></td>
                        <td style={cellStyle}>{transaction.journal?.sourceType ?? 'MANUAL'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', position: 'sticky', top: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Transaction detail</h2>
            {selectedTransaction ? (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <DetailRow label="Transaction No" value={selectedTransaction.referenceNo ?? selectedTransaction.id} />
                <DetailRow label="Date" value={selectedTransaction.date} />
                <DetailRow label="Type" value={selectedTransaction.type} />
                <DetailRow label="Status" value={<StatusBadge status={selectedTransaction.status} />} />
                <DetailRow label="Amount" value={formatMoney(selectedTransaction.amount)} />
                <DetailRow label="Reference" value={selectedTransaction.referenceNo ?? '—'} />
                <DetailRow label="Description" value={selectedTransaction.description} />
                <DetailRow label="Financial account" value={selectedTransaction.financialAccountId ?? selectedTransaction.fromFinancialAccountId ?? '—'} />
                {selectedTransaction.journal ? (
                  <>
                    <DetailRow label="Journal No" value={selectedTransaction.journal.journalNo} />
                    <div>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Journal lines</div>
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: 6 }}>
                        {selectedTransaction.journal.lines.map((line) => (
                          <li key={line.id}>
                            {line.accountId} — {line.debit ? `DR ${line.debit}` : `CR ${line.credit}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}
                {selectedTransaction.auditTrail?.length ? (
                  <div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Audit</div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {selectedTransaction.auditTrail.slice(-3).map((event) => (
                        <li key={`${event.action}-${event.timestamp}`}>
                          {event.action}: {event.actor}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedTransaction.status !== 'POSTED' && (
                  <button type="button" onClick={() => handleReview(selectedTransaction.id)} style={{ marginTop: '0.5rem', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' }}>
                    Review & approve
                  </button>
                )}
              </div>
            ) : (
              <p>No transaction selected.</p>
            )}
          </aside>
        </div>

        <section style={{ marginTop: '2rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Create transaction</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {transactionTypes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  style={{
                    border: selectedType === option.value ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                    background: selectedType === option.value ? '#dbeafe' : '#fff',
                    borderRadius: 10,
                    padding: '0.55rem 0.9rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Transaction date</span>
              <input type="date" value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Description</span>
              <input value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Amount</span>
              <input value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>Reference</span>
              <input value={form.referenceNo} onChange={(event) => setForm((value) => ({ ...value, referenceNo: event.target.value }))} style={fieldStyle} />
            </label>

            {selectedType === 'MONEY_IN' || selectedType === 'MONEY_OUT' ? (
              <>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>Financial account</span>
                  <select value={form.financialAccountId} onChange={(event) => setForm((value) => ({ ...value, financialAccountId: event.target.value }))} style={fieldStyle}>
                    <option value={BANK_ACCOUNT_ID}>Maybank</option>
                    <option value={CASH_ACCOUNT_ID}>Cash</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>{selectedType === 'MONEY_IN' ? 'Revenue account' : 'Expense account'}</span>
                  <select value={form.accountId} onChange={(event) => setForm((value) => ({ ...value, accountId: event.target.value }))} style={fieldStyle}>
                    <option value={REVENUE_ACCOUNT_ID}>Sales</option>
                    <option value={EXPENSE_ACCOUNT_ID}>Petrol</option>
                  </select>
                </label>
              </>
            ) : null}

            {selectedType === 'TRANSFER' ? (
              <>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>Source account</span>
                  <select value={form.fromFinancialAccountId} onChange={(event) => setForm((value) => ({ ...value, fromFinancialAccountId: event.target.value }))} style={fieldStyle}>
                    <option value={BANK_ACCOUNT_ID}>Maybank</option>
                    <option value={CASH_ACCOUNT_ID}>Cash</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>Destination account</span>
                  <select value={form.toFinancialAccountId} onChange={(event) => setForm((value) => ({ ...value, toFinancialAccountId: event.target.value }))} style={fieldStyle}>
                    <option value={CASH_ACCOUNT_ID}>Cash</option>
                    <option value={BANK_ACCOUNT_ID}>Maybank</option>
                  </select>
                </label>
              </>
            ) : null}
          </div>

          {selectedType === 'JOURNAL' ? (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem' }}>
                <strong>Account</strong>
                <strong>Debit</strong>
                <strong>Credit</strong>
                <strong>Description</strong>
              </div>
              {form.journalLines.map((line, index) => (
                <div key={`${line.accountId}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem' }}>
                  <select value={line.accountId} onChange={(event) => {
                    const next = [...form.journalLines];
                    next[index] = { ...line, accountId: event.target.value };
                    setForm((value) => ({ ...value, journalLines: next }));
                  }} style={fieldStyle}>
                    <option value={BANK_ACCOUNT_ID}>Maybank</option>
                    <option value={CASH_ACCOUNT_ID}>Cash</option>
                    <option value={REVENUE_ACCOUNT_ID}>Sales</option>
                    <option value={EXPENSE_ACCOUNT_ID}>Petrol</option>
                  </select>
                  <input value={line.debit ?? ''} onChange={(event) => {
                    const next = [...form.journalLines];
                    next[index] = { ...line, debit: event.target.value, credit: '' };
                    setForm((value) => ({ ...value, journalLines: next }));
                  }} placeholder="0.00" style={fieldStyle} />
                  <input value={line.credit ?? ''} onChange={(event) => {
                    const next = [...form.journalLines];
                    next[index] = { ...line, credit: event.target.value, debit: '' };
                    setForm((value) => ({ ...value, journalLines: next }));
                  }} placeholder="0.00" style={fieldStyle} />
                  <input value={line.description ?? ''} onChange={(event) => {
                    const next = [...form.journalLines];
                    next[index] = { ...line, description: event.target.value };
                    setForm((value) => ({ ...value, journalLines: next }));
                  }} placeholder="Narration" style={fieldStyle} />
                </div>
              ))}
              <button type="button" onClick={() => setForm((value) => ({ ...value, journalLines: [...value.journalLines, { accountId: BANK_ACCOUNT_ID, debit: '0.00', credit: '', description: '' }] }))} style={{ width: 'fit-content', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.55rem 0.9rem', cursor: 'pointer' }}>
                Add line
              </button>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" onClick={handleCreate} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.4rem', fontWeight: 700, cursor: 'pointer' }}>
              Create & post transaction
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem 1.1rem' }}>
      <div style={{ fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: '1.6rem', color: tone, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { background: string; color: string }> = {
    DRAFT: { background: '#fef3c7', color: '#92400e' },
    REVIEW: { background: '#dbeafe', color: '#1d4ed8' },
    APPROVED: { background: '#dcfce7', color: '#166534' },
    POSTED: { background: '#bbf7d0', color: '#166534' },
    VOIDED: { background: '#fee2e2', color: '#991b1b' },
  };
  const palette = colors[status] ?? { background: '#e2e8f0', color: '#334155' };

  return (
    <span style={{ display: 'inline-flex', padding: '0.3rem 0.55rem', borderRadius: 999, background: palette.background, color: palette.color, fontSize: 12, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ fontSize: 12, color: '#475569' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.72rem 0.8rem',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
};
const cellStyle = { padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0' } as const;
