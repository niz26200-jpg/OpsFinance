'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { AccountingEngine } from '../packages/accounting';
import {
  FinancialReportService,
  type AccountStatementReport,
  type BalanceSheetReport,
  type CashFlowReport,
  type GeneralLedgerReport,
  type ProfitAndLossReport,
  type TrialBalanceReport,
} from '../packages/reports';

const BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
const BANK_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const CASH_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';
const SALES_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const RENTAL_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const PETROL_ACCOUNT_ID = '66666666-6666-4666-8666-666666666666';
const BANK_CHARGE_ID = '77777777-7777-4777-8777-777777777777';
const EQUITY_ID = '88888888-8888-4888-8888-888888888888';

const accountOptions = [
  { id: BANK_ACCOUNT_ID, label: 'Maybank' },
  { id: CASH_ACCOUNT_ID, label: 'Cash' },
  { id: SALES_ACCOUNT_ID, label: 'Sales' },
  { id: RENTAL_ACCOUNT_ID, label: 'Rental' },
  { id: PETROL_ACCOUNT_ID, label: 'Petrol' },
  { id: BANK_CHARGE_ID, label: 'Bank Charges' },
  { id: EQUITY_ID, label: 'Capital' },
];

function buildEngine() {
  const engine = new AccountingEngine({
    businessId: BUSINESS_ID,
    accounts: [
      { id: SALES_ACCOUNT_ID, businessId: BUSINESS_ID, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
      { id: RENTAL_ACCOUNT_ID, businessId: BUSINESS_ID, code: '6500', name: 'Rental', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: PETROL_ACCOUNT_ID, businessId: BUSINESS_ID, code: '6200', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: BANK_CHARGE_ID, businessId: BUSINESS_ID, code: '6900', name: 'Bank Charges', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: BANK_ACCOUNT_ID, businessId: BUSINESS_ID, code: '1100', name: 'Maybank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: CASH_ACCOUNT_ID, businessId: BUSINESS_ID, code: '1110', name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      { id: EQUITY_ID, businessId: BUSINESS_ID, code: '3000', name: 'Capital', accountType: 'EQUITY', normalBalance: 'CREDIT', isSystem: true, isActive: true },
    ],
    periods: [{ id: 'period-1', businessId: BUSINESS_ID, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    financialAccounts: [
      { id: BANK_ACCOUNT_ID, businessId: BUSINESS_ID, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' },
      { id: CASH_ACCOUNT_ID, businessId: BUSINESS_ID, name: 'Cash', type: 'CASH', accountCode: 'CASH', currency: 'MYR', status: 'ACTIVE' },
    ],
  });

  const opening = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'OB-1',
    journalDate: '2026-09-01',
    sourceType: 'SYSTEM',
    description: 'Opening balance',
    lines: [
      { accountId: BANK_ACCOUNT_ID, debit: '10000.00', description: 'Opening bank balance' },
      { accountId: EQUITY_ID, credit: '10000.00', description: 'Opening equity' },
    ],
  });
  engine.postJournal(opening, { postedBy: 'system', idempotencyKey: 'opening' });

  const sales = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-1001',
    journalDate: '2026-09-12',
    sourceType: 'MANUAL',
    description: 'Sales receipt',
    lines: [
      { accountId: BANK_ACCOUNT_ID, debit: '5000.00', description: 'Customer payment' },
      { accountId: SALES_ACCOUNT_ID, credit: '5000.00', description: 'Sales revenue' },
    ],
  });
  engine.postJournal(sales, { postedBy: 'demo-user', idempotencyKey: 'sales' });

  const rent = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-1002',
    journalDate: '2026-09-15',
    sourceType: 'MANUAL',
    description: 'Rental expense',
    lines: [
      { accountId: RENTAL_ACCOUNT_ID, debit: '1000.00', description: 'Rent payment' },
      { accountId: BANK_ACCOUNT_ID, credit: '1000.00', description: 'Lease payment' },
    ],
  });
  engine.postJournal(rent, { postedBy: 'demo-user', idempotencyKey: 'rent' });

  const petrol = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-1003',
    journalDate: '2026-09-18',
    sourceType: 'MANUAL',
    description: 'Petrol expense',
    lines: [
      { accountId: PETROL_ACCOUNT_ID, debit: '300.00', description: 'Fuel' },
      { accountId: BANK_ACCOUNT_ID, credit: '300.00', description: 'Fuel payment' },
    ],
  });
  engine.postJournal(petrol, { postedBy: 'demo-user', idempotencyKey: 'petrol' });

  const charge = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-1004',
    journalDate: '2026-09-19',
    sourceType: 'MANUAL',
    description: 'Bank charge',
    lines: [
      { accountId: BANK_CHARGE_ID, debit: '10.00', description: 'Bank fee' },
      { accountId: BANK_ACCOUNT_ID, credit: '10.00', description: 'Bank service fee' },
    ],
  });
  engine.postJournal(charge, { postedBy: 'demo-user', idempotencyKey: 'charge' });

  const transfer = engine.createJournal({
    businessId: BUSINESS_ID,
    journalNo: 'J-1005',
    journalDate: '2026-09-20',
    sourceType: 'MANUAL',
    description: 'Transfer from bank to cash',
    lines: [
      { accountId: CASH_ACCOUNT_ID, debit: '1000.00', description: 'Cash transferred in' },
      { accountId: BANK_ACCOUNT_ID, credit: '1000.00', description: 'Cash transferred out' },
    ],
  });
  engine.postJournal(transfer, { postedBy: 'demo-user', idempotencyKey: 'transfer' });

  return engine;
}

export function ReportsWorkflow() {
  const [engine] = useState<AccountingEngine>(() => buildEngine());
  const [report, setReport] = useState<'ledger' | 'statement' | 'trial' | 'pnl' | 'sheet' | 'cash'>('ledger');
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-30');
  const [selectedAccountId, setSelectedAccountId] = useState(BANK_ACCOUNT_ID);
  const [isLoading, setIsLoading] = useState(false);
  const service = useMemo(() => new FinancialReportService(engine), [engine]);

  useEffect(() => {
    setIsLoading(true);
    const timeout = window.setTimeout(() => setIsLoading(false), 80);
    return () => window.clearTimeout(timeout);
  }, [report, dateFrom, dateTo, selectedAccountId]);

  let ledger: GeneralLedgerReport = {
    businessId: BUSINESS_ID,
    rows: [],
    openingBalance: '0.00',
    closingBalance: '0.00',
    totalDebit: '0.00',
    totalCredit: '0.00',
  };
  let statement: AccountStatementReport = {
    businessId: BUSINESS_ID,
    accountId: selectedAccountId,
    accountName: '',
    openingBalance: '0.00',
    closingBalance: '0.00',
    totalDebit: '0.00',
    totalCredit: '0.00',
    transactions: [],
  };
  let trial: TrialBalanceReport = {
    businessId: BUSINESS_ID,
    rows: [],
    totalDebit: '0.00',
    totalCredit: '0.00',
    difference: '0.00',
    isBalanced: true,
  };
  let pnl: ProfitAndLossReport = {
    businessId: BUSINESS_ID,
    revenueTotal: '0.00',
    cogsTotal: '0.00',
    expensesTotal: '0.00',
    grossProfit: '0.00',
    netProfit: '0.00',
    sections: { revenue: [], cogs: [], expenses: [] },
  };
  let sheet: BalanceSheetReport = {
    businessId: BUSINESS_ID,
    totalAssets: '0.00',
    totalLiabilities: '0.00',
    totalEquity: '0.00',
    balanceDifference: '0.00',
    isBalanced: true,
    assets: [],
    liabilities: [],
    equity: [],
  };
  let cashFlow: CashFlowReport = {
    businessId: BUSINESS_ID,
    openingCash: '0.00',
    operatingCashFlow: '0.00',
    investingCashFlow: '0.00',
    financingCashFlow: '0.00',
    netCashFlow: '0.00',
    closingCash: '0.00',
  };
  let renderError: string | null = null;

  try {
    if (dateFrom > dateTo) {
      throw new Error('The report start date must be before the end date.');
    }

    ledger = service.getGeneralLedger({ businessId: BUSINESS_ID, dateFrom, dateTo, accountId: selectedAccountId });
    statement = service.getAccountStatement({ businessId: BUSINESS_ID, accountId: selectedAccountId, dateFrom, dateTo });
    trial = service.getTrialBalance({ businessId: BUSINESS_ID, dateFrom, dateTo });
    pnl = service.getProfitAndLoss({ businessId: BUSINESS_ID, dateFrom, dateTo });
    sheet = service.getBalanceSheet({ businessId: BUSINESS_ID, dateFrom, dateTo });
    cashFlow = service.getCashFlow({ businessId: BUSINESS_ID, dateFrom, dateTo });
  } catch (error) {
    renderError = error instanceof Error ? error.message : 'Report generation failed.';
  }

  const renderContent = () => {
    if (renderError) {
      return <div role="alert" style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.75rem', borderRadius: 10 }}>{renderError}</div>;
    }

    if (isLoading) {
      return <div role="status" style={{ color: '#475569' }}>Loading report values…</div>;
    }

    const showEmptyState = report === 'ledger' ? ledger.rows.length === 0 :
      report === 'statement' ? statement.transactions.length === 0 :
      report === 'trial' ? trial.rows.length === 0 :
      report === 'pnl' ? pnl.revenueTotal === '0.00' && pnl.expensesTotal === '0.00' :
      report === 'sheet' ? sheet.assets.length === 0 && sheet.liabilities.length === 0 && sheet.equity.length === 0 :
      cashFlow.openingCash === '0.00' && cashFlow.closingCash === '0.00';

    if (showEmptyState) {
      return <div style={{ color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>No report data for the selected range.</div>;
    }

    if (report === 'statement') {
      return (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>Opening: {statement.openingBalance}</div>
          <div>Closing: {statement.closingBalance}</div>
          <div>Debit: {statement.totalDebit} / Credit: {statement.totalCredit}</div>
          {statement.transactions.map((row) => (
            <div key={`${row.journalNo}-${row.description}`} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {row.date} | {row.journalNo} | {row.description} | {row.debit} | {row.credit} | {row.runningBalance}
            </div>
          ))}
        </div>
      );
    }
    if (report === 'trial') {
      return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div>Debit: {trial.totalDebit} | Credit: {trial.totalCredit} | Balanced: {String(trial.isBalanced)}</div>
          {trial.rows.map((row) => (
            <div key={row.accountId}>{row.accountName}: {row.debit} / {row.credit}</div>
          ))}
        </div>
      );
    }
    if (report === 'pnl') {
      return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div>Revenue: {pnl.revenueTotal}</div>
          <div>COGS: {pnl.cogsTotal}</div>
          <div>Expenses: {pnl.expensesTotal}</div>
          <div>Gross Profit: {pnl.grossProfit}</div>
          <div>Net Profit: {pnl.netProfit}</div>
        </div>
      );
    }
    if (report === 'sheet') {
      return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div>Assets: {sheet.totalAssets}</div>
          <div>Liabilities: {sheet.totalLiabilities}</div>
          <div>Equity: {sheet.totalEquity}</div>
          <div>Balanced: {String(sheet.isBalanced)}</div>
          <div>Difference: {sheet.balanceDifference}</div>
        </div>
      );
    }
    if (report === 'cash') {
      return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div>Opening Cash: {cashFlow.openingCash}</div>
          <div>Operating: {cashFlow.operatingCashFlow}</div>
          <div>Investing: {cashFlow.investingCashFlow}</div>
          <div>Financing: {cashFlow.financingCashFlow}</div>
          <div>Net: {cashFlow.netCashFlow}</div>
          <div>Closing: {cashFlow.closingCash}</div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <div>Opening: {ledger.openingBalance}</div>
        <div>Closing: {ledger.closingBalance}</div>
        <div>Debit: {ledger.totalDebit} / Credit: {ledger.totalCredit}</div>
        {ledger.rows.map((row) => (
          <div key={`${row.journalNo}-${row.accountId}-${row.date}`} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            {row.date} | {row.journalNo} | {row.accountName} | {row.debit} | {row.credit} | {row.balance}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>OpsFinance</p>
            <h1 style={{ margin: '0.2rem 0 0', fontSize: '2rem' }}>Financial Reports</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ledger', 'statement', 'trial', 'pnl', 'sheet', 'cash'].map((key) => (
              <button key={key} type="button" onClick={() => setReport(key as any)} style={{ border: 'none', background: report === key ? '#0f172a' : '#e2e8f0', color: report === key ? '#fff' : '#0f172a', borderRadius: 10, padding: '0.7rem 0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                {key === 'ledger' ? 'General Ledger' : key === 'statement' ? 'Account Statement' : key === 'trial' ? 'Trial Balance' : key === 'pnl' ? 'Profit & Loss' : key === 'sheet' ? 'Balance Sheet' : 'Cash Flow'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#334155' }}>
            Start date
            <input aria-label="Start date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#334155' }}>
            End date
            <input aria-label="End date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#334155' }}>
            Account
            <select aria-label="Account filter" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>{account.label}</option>
              ))}
            </select>
          </label>
        </div>

        {renderContent()}
      </div>
    </main>
  );
}
