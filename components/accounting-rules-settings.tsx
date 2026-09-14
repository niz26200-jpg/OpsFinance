'use client';

import { useMemo, useState } from 'react';

import type { BusinessAccount, FinancialAccount } from '../packages/accounting';
import { AccountingRuleService, type AccountingRule, type RuleMatchType, type SuggestedTransactionType } from '../packages/accounting-rules';

const BUSINESS_ID = 'business-a';
const AUTH_USER_ID = 'user-owner';

const defaultAccounts: BusinessAccount[] = [
  { id: 'coa-expense', businessId: BUSINESS_ID, code: '6100', name: 'Bank Charges', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
  { id: 'coa-rental', businessId: BUSINESS_ID, code: '6200', name: 'Rental', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
  { id: 'coa-petrol', businessId: BUSINESS_ID, code: '6300', name: 'Petrol / Transport', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
];

const defaultFinancialAccounts: FinancialAccount[] = [
  { id: 'fin-bank', businessId: BUSINESS_ID, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' },
];

const matchTypes: RuleMatchType[] = ['CONTAINS', 'EXACT', 'STARTS_WITH', 'ENDS_WITH'];

export function AccountingRulesSettings() {
  const service = useMemo(() => new AccountingRuleService({
    businesses: [{ id: BUSINESS_ID, name: 'OpsFinance Malaysia', baseCurrency: 'MYR', fiscalYearStart: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z' }],
    accounts: defaultAccounts,
    financialAccounts: defaultFinancialAccounts,
    rules: [
      {
        id: 'rule-bank-charge',
        businessId: BUSINESS_ID,
        name: 'Bank Charge',
        description: 'Monthly bank service fee',
        isActive: true,
        priority: 100,
        matchType: 'CONTAINS',
        matchValue: 'BANK CHARGE',
        suggestedAccountId: 'coa-expense',
        suggestedFinancialAccountId: 'fin-bank',
        suggestedTransactionType: 'EXPENSE',
        autoSuggest: true,
        autoPost: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'rule-rental',
        businessId: BUSINESS_ID,
        name: 'Office Rental',
        description: 'Office lease payments',
        isActive: true,
        priority: 90,
        matchType: 'CONTAINS',
        matchValue: 'RENT',
        suggestedAccountId: 'coa-rental',
        suggestedFinancialAccountId: 'fin-bank',
        suggestedTransactionType: 'EXPENSE',
        autoSuggest: true,
        autoPost: false,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ],
  }), []);

  const [rules, setRules] = useState<AccountingRule[]>(() => service.listRules({ businessId: BUSINESS_ID, userId: AUTH_USER_ID }));
  const [form, setForm] = useState<{
    name: string;
    description: string;
    matchType: RuleMatchType;
    matchValue: string;
    suggestedAccountId: string;
    suggestedFinancialAccountId: string;
    suggestedTransactionType: SuggestedTransactionType;
    priority: number;
    autoSuggest: boolean;
    autoPost: boolean;
  }>({
    name: '',
    description: '',
    matchType: 'CONTAINS',
    matchValue: '',
    suggestedAccountId: 'coa-expense',
    suggestedFinancialAccountId: 'fin-bank',
    suggestedTransactionType: 'EXPENSE',
    priority: 50,
    autoSuggest: true,
    autoPost: false,
  });
  const [previewDescription, setPreviewDescription] = useState('Maybank BANK CHARGE ATM');
  const [preview, setPreview] = useState(service.preview({ businessId: BUSINESS_ID, userId: AUTH_USER_ID, description: previewDescription }));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refreshRules = () => {
    setRules(service.listRules({ businessId: BUSINESS_ID, userId: AUTH_USER_ID }));
  };

  const handlePreview = () => {
    setPreview(service.preview({ businessId: BUSINESS_ID, userId: AUTH_USER_ID, description: previewDescription }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      matchType: 'CONTAINS',
      matchValue: '',
      suggestedAccountId: 'coa-expense',
      suggestedFinancialAccountId: 'fin-bank',
      suggestedTransactionType: 'EXPENSE',
      priority: 50,
      autoSuggest: true,
      autoPost: false,
    });
    setEditingId(null);
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        const updated = service.updateRule({
          businessId: BUSINESS_ID,
          userId: AUTH_USER_ID,
          ruleId: editingId,
          name: form.name,
          description: form.description,
          matchType: form.matchType,
          matchValue: form.matchValue,
          suggestedAccountId: form.suggestedAccountId,
          suggestedFinancialAccountId: form.suggestedFinancialAccountId,
          suggestedTransactionType: form.suggestedTransactionType,
          priority: form.priority,
          autoSuggest: form.autoSuggest,
          autoPost: false,
        });
        setSuccess(`Rule updated: ${updated.name}`);
      } else {
        const created = service.createRule({
          businessId: BUSINESS_ID,
          userId: AUTH_USER_ID,
          name: form.name,
          description: form.description,
          matchType: form.matchType,
          matchValue: form.matchValue,
          suggestedAccountId: form.suggestedAccountId,
          suggestedFinancialAccountId: form.suggestedFinancialAccountId,
          suggestedTransactionType: form.suggestedTransactionType,
          priority: form.priority,
          autoSuggest: form.autoSuggest,
          autoPost: false,
        });
        setSuccess(`Rule created: ${created.name}`);
      }
      refreshRules();
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save rule.');
    }
  };

  const handleEdit = (rule: AccountingRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      matchType: rule.matchType,
      matchValue: rule.matchValue,
      suggestedAccountId: rule.suggestedAccountId ?? 'coa-expense',
      suggestedFinancialAccountId: rule.suggestedFinancialAccountId ?? 'fin-bank',
      suggestedTransactionType: rule.suggestedTransactionType ?? 'EXPENSE',
      priority: rule.priority,
      autoSuggest: rule.autoSuggest,
      autoPost: false,
    });
  };

  const handleToggle = (rule: AccountingRule) => {
    const updated = service.activateRule({
      businessId: BUSINESS_ID,
      userId: AUTH_USER_ID,
      ruleId: rule.id,
      isActive: !rule.isActive,
    });
    setSuccess(`Rule ${updated.name} is now ${updated.isActive ? 'active' : 'inactive'}.`);
    refreshRules();
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.5rem 1rem 2.5rem', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header>
          <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Settings</p>
          <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Accounting Rules</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>Reusable rules for transaction suggestions. Rules suggest accounting treatment; transactions still require review and approval before posting.</p>
        </header>

        {error && (
          <div role="alert" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 10, padding: '0.75rem' }}>{error}</div>
        )}
        {success && (
          <div role="status" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '0.75rem' }}>{success}</div>
        )}

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Rule name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Priority</span>
              <input type="number" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Match type</span>
              <select value={form.matchType} onChange={(event) => setForm((current) => ({ ...current, matchType: event.target.value as RuleMatchType }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                {matchTypes.map((matchType) => (
                  <option key={matchType} value={matchType}>{matchType}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', gridColumn: '1 / -1' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Match value</span>
              <input value={form.matchValue} onChange={(event) => setForm((current) => ({ ...current, matchValue: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', gridColumn: '1 / -1' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem', resize: 'vertical' }} />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Suggested account</span>
              <select value={form.suggestedAccountId} onChange={(event) => setForm((current) => ({ ...current, suggestedAccountId: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                {defaultAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Suggested financial account</span>
              <select value={form.suggestedFinancialAccountId} onChange={(event) => setForm((current) => ({ ...current, suggestedFinancialAccountId: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                {defaultFinancialAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Suggested transaction type</span>
              <select value={form.suggestedTransactionType} onChange={(event) => setForm((current) => ({ ...current, suggestedTransactionType: event.target.value as SuggestedTransactionType }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.autoSuggest} onChange={(event) => setForm((current) => ({ ...current, autoSuggest: event.target.checked }))} />
              <span>Auto suggest</span>
            </label>

            <span style={{ padding: '0.35rem 0.65rem', borderRadius: 999, background: '#f1f5f9', color: '#334155', fontWeight: 700 }}>Auto post: OFF — locked</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSave} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>
              {editingId ? 'Save rule' : 'Create rule'}
            </button>
            <button type="button" onClick={resetForm} style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Rule preview</h2>
            <button type="button" onClick={handlePreview} style={{ background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer' }}>
              Test rule
            </button>
          </div>

          <textarea value={previewDescription} onChange={(event) => setPreviewDescription(event.target.value)} rows={3} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem', resize: 'vertical' }} />

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem 1rem', background: '#f8fafc', color: '#0f172a' }}>
            {preview.matched ? (
              <>
                <div style={{ fontWeight: 700 }}>MATCH</div>
                <div>Rule: {preview.rule?.name}</div>
                <div>Suggestion: {preview.suggestion?.accountId ?? '—'}</div>
                <div>Match: {preview.suggestion?.matchType ?? preview.rule?.matchType ?? '—'}</div>
              </>
            ) : (
              <div style={{ fontWeight: 700 }}>NO MATCH</div>
            )}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Configured rules</h2>

          <div style={{ display: 'grid', gap: '0.75rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Rule name</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Match</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Suggestion</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Priority</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>{rule.name}</td>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>{rule.matchType} / {rule.matchValue}</td>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>{rule.suggestedAccountId ?? '—'}</td>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>{rule.priority}</td>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9' }}>{rule.isActive ? 'Active' : 'Inactive'}</td>
                    <td style={{ padding: '0.7rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => handleEdit(rule)} style={{ background: '#e2e8f0', border: 'none', borderRadius: 8, padding: '0.45rem 0.7rem', cursor: 'pointer' }}>Edit</button>
                      <button type="button" onClick={() => handleToggle(rule)} style={{ background: rule.isActive ? '#f8fafc' : '#0f172a', color: rule.isActive ? '#0f172a' : '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.45rem 0.7rem', cursor: 'pointer' }}>{rule.isActive ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
