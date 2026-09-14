'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AccountingEngine, type AccountType, type BusinessAccount, type NormalBalance } from '../packages/accounting';
import { ChartOfAccountsService, type CreateChartAccountInput } from '../packages/chart-of-accounts';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
const NORMAL_BALANCES: NormalBalance[] = ['DEBIT', 'CREDIT'];

function createDemoChartOfAccounts(): ChartOfAccountsService {
  const engine = new AccountingEngine({
    businessId: BUSINESS_ID,
    accounts: [
      { id: 'coa-root-assets', businessId: BUSINESS_ID, code: '1000', name: 'Assets', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: true, isActive: true },
      { id: 'coa-root-liabilities', businessId: BUSINESS_ID, code: '2000', name: 'Liabilities', accountType: 'LIABILITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
      { id: 'coa-root-equity', businessId: BUSINESS_ID, code: '3000', name: 'Equity', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
      { id: 'coa-root-revenue', businessId: BUSINESS_ID, code: '4000', name: 'Revenue', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: true, isActive: true },
      { id: 'coa-root-cogs', businessId: BUSINESS_ID, code: '5000', name: 'COGS', accountType: 'COGS', normalBalance: 'DEBIT', isSystem: true, isActive: true },
      { id: 'coa-root-expenses', businessId: BUSINESS_ID, code: '6000', name: 'Expenses', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: true, isActive: true },
      { id: 'coa-cash', businessId: BUSINESS_ID, code: '1100', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', parentId: 'coa-root-assets', isSystem: false, isActive: true },
      { id: 'coa-maybank', businessId: BUSINESS_ID, code: '1110', name: 'Maybank', accountType: 'ASSET', normalBalance: 'DEBIT', parentId: 'coa-cash', isSystem: false, isActive: true },
      { id: 'coa-cimb', businessId: BUSINESS_ID, code: '1120', name: 'CIMB', accountType: 'ASSET', normalBalance: 'DEBIT', parentId: 'coa-cash', isSystem: false, isActive: true },
      { id: 'coa-ar', businessId: BUSINESS_ID, code: '1200', name: 'Accounts Receivable', accountType: 'ASSET', normalBalance: 'DEBIT', parentId: 'coa-root-assets', isSystem: false, isActive: true },
      { id: 'coa-inventory', businessId: BUSINESS_ID, code: '1300', name: 'Inventory', accountType: 'ASSET', normalBalance: 'DEBIT', parentId: 'coa-root-assets', isSystem: false, isActive: true },
      { id: 'coa-ap', businessId: BUSINESS_ID, code: '2100', name: 'Accounts Payable', accountType: 'LIABILITY', normalBalance: 'CREDIT', parentId: 'coa-root-liabilities', isSystem: false, isActive: true },
      { id: 'coa-loan', businessId: BUSINESS_ID, code: '2200', name: 'Bank Loan', accountType: 'LIABILITY', normalBalance: 'CREDIT', parentId: 'coa-root-liabilities', isSystem: false, isActive: true },
      { id: 'coa-capital', businessId: BUSINESS_ID, code: '3100', name: 'Capital', accountType: 'EQUITY', normalBalance: 'CREDIT', parentId: 'coa-root-equity', isSystem: false, isActive: true },
      { id: 'coa-retained', businessId: BUSINESS_ID, code: '3200', name: 'Retained Earnings', accountType: 'EQUITY', normalBalance: 'CREDIT', parentId: 'coa-root-equity', isSystem: false, isActive: true },
      { id: 'coa-drawings', businessId: BUSINESS_ID, code: '3300', name: 'Drawings', accountType: 'EQUITY', normalBalance: 'DEBIT', parentId: 'coa-root-equity', isSystem: false, isActive: true },
      { id: 'coa-sales', businessId: BUSINESS_ID, code: '4100', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', parentId: 'coa-root-revenue', isSystem: false, isActive: true },
      { id: 'coa-other-income', businessId: BUSINESS_ID, code: '4200', name: 'Other Income', accountType: 'REVENUE', normalBalance: 'CREDIT', parentId: 'coa-root-revenue', isSystem: false, isActive: true },
      { id: 'coa-cogs', businessId: BUSINESS_ID, code: '5100', name: 'COGS', accountType: 'COGS', normalBalance: 'DEBIT', parentId: 'coa-root-cogs', isSystem: false, isActive: true },
      { id: 'coa-rental', businessId: BUSINESS_ID, code: '6100', name: 'Rental', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
      { id: 'coa-salary', businessId: BUSINESS_ID, code: '6200', name: 'Salary', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
      { id: 'coa-petrol', businessId: BUSINESS_ID, code: '6300', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
      { id: 'coa-utilities', businessId: BUSINESS_ID, code: '6400', name: 'Utilities', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
      { id: 'coa-advertising', businessId: BUSINESS_ID, code: '6500', name: 'Advertising', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
      { id: 'coa-bank-charges', businessId: BUSINESS_ID, code: '6600', name: 'Bank Charges', accountType: 'EXPENSE', normalBalance: 'DEBIT', parentId: 'coa-root-expenses', isSystem: false, isActive: true },
    ],
  });

  return new ChartOfAccountsService(engine);
}

export function ChartOfAccountsWorkflow() {
  const [service] = useState(() => createDemoChartOfAccounts());
  const [accounts, setAccounts] = useState(() => service.listAccounts(BUSINESS_ID));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    code: string;
    name: string;
    accountType: AccountType;
    parentId: string;
    normalBalance: NormalBalance;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    accountType: 'ASSET',
    parentId: '',
    normalBalance: 'DEBIT',
    isActive: true,
  });

  const hierarchy = useMemo(() => service.getHierarchy(BUSINESS_ID), [service]);
  const accountOptions = useMemo(() => accounts.map((account) => ({ value: account.id, label: `${account.code} ${account.name}` })), [accounts]);

  const resetForm = () => {
    setSelectedId(null);
    setError(null);
    setForm({
      code: '',
      name: '',
      accountType: 'ASSET',
      parentId: '',
      normalBalance: 'DEBIT',
      isActive: true,
    });
  };

  const refresh = () => setAccounts(service.listAccounts(BUSINESS_ID));

  const handleCreate = () => {
    try {
      setIsLoading(true);
      setError(null);
      const created = service.createAccount({
        businessId: BUSINESS_ID,
        code: form.code,
        name: form.name,
        accountType: form.accountType,
        parentId: form.parentId || undefined,
        normalBalance: form.normalBalance,
        isActive: form.isActive,
      });
      setAccounts(service.listAccounts(BUSINESS_ID));
      setSelectedId(created.id);
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (account: BusinessAccount) => {
    setSelectedId(account.id);
    setError(null);
    setForm({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      parentId: account.parentId ?? '',
      normalBalance: account.normalBalance,
      isActive: account.isActive ?? true,
    });
  };

  const handleUpdate = () => {
    if (!selectedId) return;

    try {
      setIsLoading(true);
      setError(null);
      service.updateAccount({
        businessId: BUSINESS_ID,
        id: selectedId,
        code: form.code,
        name: form.name,
        accountType: form.accountType,
        parentId: form.parentId || undefined,
        normalBalance: form.normalBalance,
        isActive: form.isActive,
      });
      setAccounts(service.listAccounts(BUSINESS_ID));
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update account.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTree = (nodeList: Array<BusinessAccount & { children?: Array<BusinessAccount & { children?: Array<BusinessAccount & { children?: Array<BusinessAccount & { children?: unknown }> }> }> }>, depth = 0): JSX.Element => (
    <div key={`tree-${depth}`} style={{ display: 'grid', gap: '0.5rem', marginTop: depth > 0 ? '0.5rem' : 0 }}>
      {nodeList.map((node) => (
        <div key={node.id} style={{ marginLeft: depth > 0 ? 18 : 0, borderLeft: depth > 0 ? '2px solid #cbd5e1' : 'none', paddingLeft: depth > 0 ? '0.75rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', background: depth === 0 ? '#f8fafc' : '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
            <div>
              <strong>{node.code}</strong> {node.name}
              <div style={{ color: '#64748b', fontSize: 12 }}>{node.accountType} · {node.normalBalance}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: node.isActive ? '#dcfce7' : '#f1f5f9', color: node.isActive ? '#166534' : '#475569', borderRadius: 999, padding: '0.2rem 0.55rem', fontSize: 12, fontWeight: 700 }}>{node.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
              <button type="button" onClick={() => handleEdit(node)} style={{ border: 'none', background: '#dbeafe', color: '#1e3a8a', borderRadius: 8, padding: '0.5rem 0.7rem', cursor: 'pointer' }}>Edit</button>
            </div>
          </div>
          {node.children && node.children.length > 0 && renderTree(node.children as typeof nodeList, depth + 1)}
        </div>
      ))}
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.5rem 1rem 2.5rem' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 2.6rem)' }}>Chart of Accounts</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/accounts" style={{ background: '#e2e8f0', color: '#0f172a', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700 }}>Accounts</Link>
            <button type="button" onClick={resetForm} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Create account</button>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Account hierarchy</h2>
              <button type="button" onClick={refresh} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '0.6rem 0.9rem', cursor: 'pointer' }}>Refresh</button>
            </div>

            {isLoading ? (
              <div role="status" style={{ padding: '1rem', color: '#475569' }}>Loading chart of accounts…</div>
            ) : hierarchy.length === 0 ? (
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', color: '#475569' }}>No accounts available.</div>
            ) : (
              renderTree(hierarchy)
            )}
          </div>

          <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', position: 'sticky', top: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedId ? 'Edit account' : 'Create account'}</h2>
            {error && (
              <div role="alert" style={{ marginBottom: '1rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 10, padding: '0.75rem' }}>{error}</div>
            )}

            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Code</span>
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Account type</span>
                <select value={form.accountType} onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value as AccountType, normalBalance: event.target.value === 'ASSET' || event.target.value === 'EXPENSE' || event.target.value === 'COGS' ? 'DEBIT' : 'CREDIT' }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Parent</span>
                <select value={form.parentId} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  <option value="">No parent</option>
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Normal balance</span>
                <select value={form.normalBalance} onChange={(event) => setForm((current) => ({ ...current, normalBalance: event.target.value as NormalBalance }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                  {NORMAL_BALANCES.map((balance) => (
                    <option key={balance} value={balance}>{balance}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#475569', fontWeight: 600 }}>
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                Active account
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={selectedId ? handleUpdate : handleCreate} style={{ border: 'none', background: '#0f172a', color: '#fff', borderRadius: 10, padding: '0.75rem 1rem', cursor: 'pointer' }}>
                  {selectedId ? 'Save changes' : 'Create account'}
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
