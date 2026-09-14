'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  AccountingEngine,
  type BusinessAccount,
  type FinancialAccountType,
} from '../packages/accounting';
import {
  FinancialAccountService,
  type FinancialAccountRecord,
  type FinancialAccountStatus,
} from '../packages/financial-accounts';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const FINANCIAL_TYPES: FinancialAccountType[] = ['BANK', 'CASH', 'E_WALLET', 'CREDIT_CARD', 'LOAN', 'OTHER'];
const STATUS_OPTIONS: FinancialAccountStatus[] = ['ACTIVE', 'INACTIVE'];

const formatMoney = (value: string | number | undefined) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 'RM0.00';
  }
  return `RM${numeric.toFixed(2)}`;
};

function buildDemoFinancialAccountService() {
  const bankCoaId = 'acct-bank-1';
  const cashCoaId = 'acct-cash-1';
  const salesCoaId = 'acct-sales-1';
  const equityCoaId = 'acct-equity-1';

  const engine = new AccountingEngine({
    businessId: BUSINESS_ID,
    accounts: [
      { id: bankCoaId, businessId: BUSINESS_ID, code: '1100', name: 'Maybank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: cashCoaId, businessId: BUSINESS_ID, code: '1110', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: salesCoaId, businessId: BUSINESS_ID, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
      { id: equityCoaId, businessId: BUSINESS_ID, code: '3000', name: 'Opening Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
    ],
    periods: [{ id: 'period-1', businessId: BUSINESS_ID, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    financialAccounts: [
      { id: 'fa-bank-demo', businessId: BUSINESS_ID, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' },
      { id: 'fa-cash-demo', businessId: BUSINESS_ID, name: 'Cash', type: 'CASH', accountCode: 'CASH', currency: 'MYR', status: 'ACTIVE' },
    ],
  });

  const service = new FinancialAccountService(engine);

  service.createFinancialAccount({
    businessId: BUSINESS_ID,
    name: 'Maybank',
    type: 'BANK',
    accountCode: 'MAYBANK',
    currency: 'MYR',
    accountId: bankCoaId,
    openingBalance: '10000.00',
    openingBalanceDate: '2026-09-01',
    status: 'ACTIVE',
  }, 'system');

  service.createFinancialAccount({
    businessId: BUSINESS_ID,
    name: 'Cash',
    type: 'CASH',
    accountCode: 'CASH',
    currency: 'MYR',
    accountId: cashCoaId,
    openingBalance: '3000.00',
    openingBalanceDate: '2026-09-01',
    status: 'ACTIVE',
  }, 'system');

  const sales = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-FIN-1',
    journalDate: '2026-09-12',
    sourceType: 'MANUAL',
    description: 'Customer payment',
    lines: [
      { accountId: bankCoaId, debit: '500.00', description: 'Cash received', financialAccountId: 'fa-bank-demo' },
      { accountId: salesCoaId, credit: '500.00', description: 'Sales revenue' },
    ],
  });
  engine.postJournal(sales, { postedBy: 'demo-user', idempotencyKey: 'demo-sales' });

  return service;
}

export function FinancialAccountsWorkflow() {
  const [service] = useState(() => buildDemoFinancialAccountService());
  const [accounts, setAccounts] = useState<FinancialAccountRecord[]>(() => service.listFinancialAccounts(BUSINESS_ID));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'BANK' as FinancialAccountType,
    accountCode: '',
    currency: 'MYR',
    accountId: '',
    openingBalance: '0.00',
    openingBalanceDate: '2026-09-01',
    status: 'ACTIVE' as FinancialAccountStatus,
  });

  const accountOptions = useMemo(() => {
    const engine = (service as any).engine as AccountingEngine;
    const businessAccounts = [...(((engine as any).accounts as Map<string, BusinessAccount>)?.values?.() ?? [])]
      .filter((account) => account.businessId === BUSINESS_ID);
    return businessAccounts.map((account) => ({ value: account.id, label: `${account.name} (${account.code})` }));
  }, [service]);

  const refreshAccounts = () => {
    setAccounts(service.listFinancialAccounts(BUSINESS_ID));
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'BANK',
      accountCode: '',
      currency: 'MYR',
      accountId: accountOptions[0]?.value ?? '',
      openingBalance: '0.00',
      openingBalanceDate: '2026-09-01',
      status: 'ACTIVE',
    });
    setIsEditing(false);
    setSelectedId(null);
    setError(null);
  };

  const handleCreate = () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!form.name.trim()) {
        throw new Error('Account name is required.');
      }
      if (!form.accountCode.trim()) {
        throw new Error('Account code is required.');
      }
      if (!form.accountId) {
        throw new Error('COA mapping is required.');
      }

      const created = service.createFinancialAccount({
        businessId: BUSINESS_ID,
        name: form.name,
        type: form.type,
        accountCode: form.accountCode,
        currency: form.currency,
        accountId: form.accountId,
        openingBalance: form.openingBalance,
        openingBalanceDate: form.openingBalanceDate,
        status: form.status,
      }, 'current-user');

      setAccounts(service.listFinancialAccounts(BUSINESS_ID));
      setSelectedId(created.id);
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create financial account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (account: FinancialAccountRecord) => {
    setIsEditing(true);
    setSelectedId(account.id);
    setError(null);
    setForm({
      name: account.name,
      type: account.type,
      accountCode: account.accountCode,
      currency: account.currency,
      accountId: account.accountId,
      openingBalance: account.openingBalance ?? '0.00',
      openingBalanceDate: account.openingBalanceDate ?? '2026-09-01',
      status: account.status,
    });
  };

  const handleUpdate = () => {
    if (!selectedId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      service.updateFinancialAccount({
        businessId: BUSINESS_ID,
        id: selectedId,
        name: form.name,
        currency: form.currency,
        status: form.status,
      }, 'current-user');
      setAccounts(service.listFinancialAccounts(BUSINESS_ID));
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update financial account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.5rem 1rem 2.5rem', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 2.6rem)' }}>Financial Accounts</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/accounts" style={{ background: '#e2e8f0', color: '#0f172a', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700 }}>Accounts</Link>
            <button type="button" onClick={() => resetForm()} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Create account</button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Account list</h2>
              <button type="button" onClick={refreshAccounts} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', cursor: 'pointer' }}>Refresh</button>
            </div>

            {isLoading ? (
              <div role="status" style={{ color: '#475569', padding: '1rem 0' }}>Loading financial accounts…</div>
            ) : accounts.length === 0 ? (
              <div style={{ color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem' }}>No financial accounts found for this business.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Code</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Currency</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Balance</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>COA</th>
                      <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr key={account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.8rem' }}>{account.name}</td>
                        <td style={{ padding: '0.8rem' }}>{account.accountCode}</td>
                        <td style={{ padding: '0.8rem' }}>{account.type}</td>
                        <td style={{ padding: '0.8rem' }}>{account.currency}</td>
                        <td style={{ padding: '0.8rem', fontWeight: 700 }}>{formatMoney(service.getCurrentBalance(BUSINESS_ID, account.id))}</td>
                        <td style={{ padding: '0.8rem' }}>{account.status}</td>
                        <td style={{ padding: '0.8rem' }}>{account.accountId}</td>
                        <td style={{ padding: '0.8rem' }}>
                          <button type="button" onClick={() => handleEdit(account)} style={{ border: 'none', background: '#dbeafe', color: '#1e3a8a', borderRadius: 8, padding: '0.5rem 0.7rem', cursor: 'pointer' }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', position: 'sticky', top: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>{isEditing ? 'Edit financial account' : 'Create financial account'}</h2>
            {error && (
              <div role="alert" style={{ marginBottom: '1rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '0.75rem', color: '#9f1239' }}>{error}</div>
            )}

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Type</span>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FinancialAccountType }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  {FINANCIAL_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Account code</span>
                <input value={form.accountCode} onChange={(event) => setForm((current) => ({ ...current, accountCode: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Currency</span>
                <input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>COA mapping</span>
                <select value={form.accountId} onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Opening balance</span>
                <input type="number" step="0.01" value={form.openingBalance} onChange={(event) => setForm((current) => ({ ...current, openingBalance: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Opening balance date</span>
                <input type="date" value={form.openingBalanceDate} onChange={(event) => setForm((current) => ({ ...current, openingBalanceDate: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FinancialAccountStatus }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={isEditing ? handleUpdate : handleCreate} style={{ border: 'none', background: '#0f172a', color: '#fff', borderRadius: 10, padding: '0.75rem 1rem', cursor: 'pointer' }}>
                  {isEditing ? 'Save changes' : 'Create financial account'}
                </button>
                <button type="button" onClick={resetForm} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '0.75rem 1rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
