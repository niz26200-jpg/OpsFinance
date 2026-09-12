'use client';

import { useState } from 'react';

import { UploadConvertService } from '../../packages/upload';
import { AccountingEngine } from '../../packages/accounting';

const businessId = '11111111-1111-4111-8111-111111111111';
const bankAccountId = '22222222-2222-4222-8222-222222222222';
const revenueAccountId = '33333333-3333-4333-8333-333333333333';
const expenseAccountId = '44444444-4444-4444-8444-444444444444';

const engine = new AccountingEngine({
  businessId,
  accounts: [
    { id: revenueAccountId, businessId, code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
    { id: expenseAccountId, businessId, code: '6000', name: 'Petrol', accountType: 'EXPENSE', normalBalance: 'DEBIT', isSystem: false, isActive: true },
  ],
  periods: [{ id: 'period-1', businessId, name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
  financialAccounts: [{ id: bankAccountId, businessId, name: 'Maybank', type: 'BANK', accountCode: 'MAYBANK', currency: 'MYR', status: 'ACTIVE' }],
});

const service = new UploadConvertService(engine);

export default function UploadPage() {
  const [csv, setCsv] = useState('Date,Description,Reference,Debit,Credit,Balance\n2026-09-12,Customer payment,INV-1001,,500.00,5000.00\n2026-09-11,Petrol purchase,FUEL-001,100.00,,4900.00');
  const [result, setResult] = useState<string | null>(null);

  const handleUpload = () => {
    try {
      const batch = service.processBankStatementCsv(csv, 'bank-statement.csv', businessId, 'demo-user');
      setResult(`Uploaded ${batch.candidates.length} candidate transactions. ${batch.errors.length} errors recorded.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f5f7fb', padding: '2rem 1rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
        <header style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700 }}>OpsFinance</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: '2rem' }}>Upload & Convert</h1>
          </div>
          <nav style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <a href="/transactions" style={{ background: '#e2e8f0', padding: '0.6rem 0.9rem', borderRadius: 10 }}>Transactions</a>
            <a href="/" style={{ background: '#e2e8f0', padding: '0.6rem 0.9rem', borderRadius: 10 }}>Home</a>
          </nav>
        </header>

        <section style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem' }}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: '0.5rem' }}>Upload type</div>
              <strong>Bank Statement</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem' }}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: '0.5rem' }}>Supported</div>
              <strong>CSV / Excel / PDF review</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1rem' }}>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: '0.5rem' }}>Workflow</div>
              <strong>Parse → Review → Approve → Post</strong>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>CSV sample</span>
              <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={12} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.9rem', fontFamily: 'monospace' }} />
            </label>
            <button type="button" onClick={handleUpload} style={{ width: 'fit-content', border: 'none', background: '#0f172a', color: '#fff', padding: '0.8rem 1.2rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
              Validate & parse
            </button>
            {result ? <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.9rem' }}>{result}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
