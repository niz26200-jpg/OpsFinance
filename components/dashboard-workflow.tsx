'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';

import { type AccountingEngine, type BusinessAccount } from '../packages/accounting';
import { FinancialReportService } from '../packages/reports';
import { createDemoTransactionService } from '../packages/transactions';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const DATE_FROM = '2026-09-01';
const DATE_TO = '2026-09-30';
const QUICK_ACTIONS = [
  { label: 'Money In', href: '/transactions', accent: '#dcfce7' },
  { label: 'Money Out', href: '/transactions', accent: '#fee2e2' },
  { label: 'Transfer', href: '/transactions', accent: '#e0e7ff' },
  { label: 'Upload Statement', href: '/upload', accent: '#fef3c7' },
  { label: 'Upload Invoice', href: '/upload', accent: '#dbeafe' },
  { label: 'Upload Receipt', href: '/upload', accent: '#fce7f3' },
];

const formatMoney = (value: string | number | undefined) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 'RM0.00';
  }
  return `RM${numeric.toFixed(2)}`;
};

function DashboardWorkflow() {
  const dashboard = useMemo(() => {
    try {
      const transactionService = createDemoTransactionService();
      const engine = (transactionService as any).engine as AccountingEngine;
      const service = new FinancialReportService(engine);

      const transactions = [...transactionService.getTransactions(BUSINESS_ID)]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6);

      const cashFlow = service.getCashFlow({ businessId: BUSINESS_ID, dateFrom: DATE_FROM, dateTo: DATE_TO });
      const pnl = service.getProfitAndLoss({ businessId: BUSINESS_ID, dateFrom: DATE_FROM, dateTo: DATE_TO });
      const sheet = service.getBalanceSheet({ businessId: BUSINESS_ID, dateFrom: DATE_FROM, dateTo: DATE_TO });
      const trial = service.getTrialBalance({ businessId: BUSINESS_ID, dateFrom: DATE_FROM, dateTo: DATE_TO });
      const accounts = [...((engine as any).accounts as Map<string, BusinessAccount>).values()]
        .filter((account) => account.businessId === BUSINESS_ID)
        .map((account) => {
          const statement = service.getAccountStatement({
            businessId: BUSINESS_ID,
            accountId: account.id,
            dateFrom: DATE_FROM,
            dateTo: DATE_TO,
          });
          return {
            id: account.id,
            name: account.name,
            type: account.accountType,
            balance: statement.closingBalance,
          };
        })
        .filter((account) => Number(account.balance) !== 0 || account.type === 'ASSET' || account.type === 'LIABILITY' || account.type === 'EQUITY');

      const actionRequired = [
        {
          label: 'Transactions needing accounting logic',
          count: transactions.filter((item) => ['DRAFT', 'REVIEW', 'APPROVED'].includes(item.status)).length,
          href: '/transactions',
          severity: 'warning',
        },
        {
          label: 'Unmatched bank transactions',
          count: 0,
          href: '/reconciliation',
          severity: 'neutral',
        },
        {
          label: 'Transactions awaiting approval',
          count: transactions.filter((item) => item.status === 'REVIEW' || item.status === 'APPROVED').length,
          href: '/transactions',
          severity: 'info',
        },
      ];

      const reconciliationStatus = {
        matched: 0,
        unmatched: 0,
        total: 0,
        supported: false,
        note: 'No active bank statement match session is available in this environment.',
      };

      return {
        summary: [
          { label: 'Total Cash', value: cashFlow.closingCash },
          { label: 'Sales / Revenue', value: pnl.revenueTotal },
          { label: 'Expenses', value: pnl.expensesTotal },
          { label: 'Net Profit', value: pnl.netProfit },
        ],
        balances: accounts,
        recentTransactions: transactions,
        actionRequired,
        reconciliationStatus,
        trial,
        sheet,
        cashFlow,
      };
    } catch {
      return null;
    }
  }, []);

  if (!dashboard) {
    return (
      <main style={{ minHeight: '100vh', padding: '2rem 1rem', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a' }}>
        <div role="alert" style={{ maxWidth: 900, margin: '0 auto', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 18, padding: '1.25rem' }}>
          <h1 style={{ marginTop: 0 }}>Dashboard error</h1>
          <p style={{ marginBottom: 0 }}>Dashboard data could not be loaded.</p>
        </div>
      </main>
    );
  }

  const emptyTransactions = dashboard.recentTransactions.length === 0;
  const emptyBalances = dashboard.balances.length === 0;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.25rem 1rem 2rem', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>OpsFinance Dashboard</h1>
          </div>
          <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 999, padding: '0.6rem 1rem', fontWeight: 700, color: '#0f172a' }}>
            {DATE_FROM} to {DATE_TO}
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {dashboard.summary.map((card) => (
            <div key={card.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ color: '#475569', marginBottom: '0.4rem', fontSize: 13 }}>{card.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatMoney(card.value)}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Financial Account Balances</h2>
            {emptyBalances ? (
              <div style={{ color: '#475569' }}>No account balances available for this business.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {dashboard.balances.map((account) => (
                  <div key={account.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) auto', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{account.name}</div>
                      <div style={{ color: '#475569', fontSize: 12 }}>{account.type}</div>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{formatMoney(account.balance)}</div>
                    <div style={{ color: '#475569', fontSize: 12 }}>Balance</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Reconciliation Status</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Matched</span>
                <strong>{dashboard.reconciliationStatus.matched}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Unmatched</span>
                <strong>{dashboard.reconciliationStatus.unmatched}</strong>
              </div>
              <div style={{ height: 12, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${dashboard.reconciliationStatus.supported ? 100 : 0}%`, height: '100%', background: '#10b981' }} />
              </div>
              <div style={{ color: '#475569', fontSize: 13 }}>{dashboard.reconciliationStatus.note}</div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Recent Transactions</h2>
            {emptyTransactions ? (
              <div style={{ color: '#475569' }}>No recent transactions available.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', color: '#475569' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', color: '#475569' }}>Description</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', color: '#475569' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', color: '#475569' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', color: '#475569' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.5rem' }}>{transaction.date}</td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>{transaction.description}</td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>{formatMoney(transaction.amount)}</td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>{transaction.type}</td>
                        <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ background: '#eef2ff', borderRadius: 999, padding: '0.2rem 0.5rem', color: '#312e81', fontWeight: 700 }}>{transaction.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Action Required</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {dashboard.actionRequired.map((item) => (
                <Link key={item.label} href={item.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 0.9rem', borderRadius: 12, background: item.severity === 'warning' ? '#fef3c7' : item.severity === 'info' ? '#dbeafe' : '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.label} href={item.href} style={{ background: item.accent, border: '1px solid #e2e8f0', borderRadius: 14, padding: '0.9rem 1rem', fontWeight: 700, textAlign: 'center', color: '#0f172a' }}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export { DashboardWorkflow };
