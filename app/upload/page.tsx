'use client';

import { useMemo, useState } from 'react';

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
  const [sourceType, setSourceType] = useState<'BANK_STATEMENT' | 'INVOICE' | 'RECEIPT'>('BANK_STATEMENT');
  const [csv, setCsv] = useState('Date,Description,Reference,Debit,Credit,Balance\n2026-09-12,Customer payment,INV-1001,,500.00,5000.00\n2026-09-11,Petrol purchase,FUEL-001,100.00,,4900.00');
  const [reviewText, setReviewText] = useState('Supplier: ACME Ltd\nInvoice: INV-9001\nDate: 2026-09-05\nTotal: RM2000.00\nTax: RM160.00');
  const [result, setResult] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id: string; description: string; amount: string; status: string }>>([]);

  const workflowSteps = useMemo(() => ['Upload', 'Processing', 'Review', 'Mapping', 'Approval', 'Posting Result'], []);

  const handleUpload = () => {
    try {
      let candidateList: Array<{ id: string; description: string; amount: string; status: string }> = [];

      if (sourceType === 'BANK_STATEMENT') {
        const batch = service.processBankStatementCsv(csv, 'bank-statement.csv', businessId, 'demo-user');
        candidateList = batch.candidates.map((candidate) => ({
          id: candidate.id,
          description: candidate.normalized.description,
          amount: candidate.normalized.amount,
          status: candidate.status,
        }));
        setResult(`Parsed ${batch.candidates.length} bank statement rows; ${batch.errors.length} row errors recorded.`);
      }

      if (sourceType === 'INVOICE') {
        const candidate = service.extractInvoice({ businessId, sourceType: 'INVOICE', rawText: reviewText, uploadedBy: 'demo-user' });
        candidateList = [{ id: candidate.id, description: candidate.normalized.description, amount: candidate.normalized.amount, status: candidate.status }];
        setResult(`Invoice parsed for review. Amount: RM${candidate.normalized.amount}`);
      }

      if (sourceType === 'RECEIPT') {
        const candidate = service.extractReceipt({ businessId, sourceType: 'RECEIPT', rawText: reviewText, uploadedBy: 'demo-user' });
        candidateList = [{ id: candidate.id, description: candidate.normalized.description, amount: candidate.normalized.amount, status: candidate.status }];
        setResult(`Receipt parsed for review. Amount: RM${candidate.normalized.amount}`);
      }

      setCandidates(candidateList);
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Upload failed');
      setCandidates([]);
    }
  };

  const handleApprove = (candidateId: string) => {
    try {
      const approved = service.approveCandidate(candidateId, 'demo-user');
      setResult(`Approved candidate ${approved.id}. Ready for posting.`);
      setCandidates((current) => current.map((candidate) => candidate.id === approved.id ? { ...candidate, status: approved.status } : candidate));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Approval failed');
    }
  };

  const handlePost = (candidateId: string) => {
    try {
      const posted = service.postApprovedCandidate(candidateId, 'demo-user', businessId);
      setResult(`Posting succeeded. Journal: ${(posted as { journalId?: string }).journalId ?? 'posted'}`);
      setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, status: 'POSTED' } : candidate));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Posting failed');
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
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {workflowSteps.map((step) => (
              <span key={step} style={{ border: '1px solid #cbd5e1', borderRadius: 999, padding: '0.45rem 0.8rem', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{step}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {(['BANK_STATEMENT', 'INVOICE', 'RECEIPT'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setSourceType(type)} style={{ border: sourceType === type ? '2px solid #0f172a' : '1px solid #cbd5e1', borderRadius: 12, padding: '0.9rem 1rem', background: sourceType === type ? '#e2e8f0' : '#fff', fontWeight: 700, textAlign: 'left' }}>
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
            {sourceType === 'BANK_STATEMENT' ? (
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Bank statement CSV</span>
                <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={12} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.9rem', fontFamily: 'monospace' }} />
              </label>
            ) : (
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Review text</span>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={8} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.9rem', fontFamily: 'monospace' }} />
              </label>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleUpload} style={{ background: '#0f172a', color: '#fff', padding: '0.8rem 1.2rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Parse & review
              </button>
            </div>

            {candidates.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                {candidates.map((candidate) => (
                  <div key={candidate.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{candidate.description}</strong>
                      <div style={{ color: '#475569', fontSize: 12 }}>Amount: RM{candidate.amount} · Status: {candidate.status}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => handleApprove(candidate.id)} style={{ border: '1px solid #0f172a', borderRadius: 8, background: '#fff', padding: '0.5rem 0.8rem', cursor: 'pointer' }}>Approve</button>
                      <button type="button" onClick={() => handlePost(candidate.id)} style={{ border: '1px solid #0f172a', borderRadius: 8, background: '#0f172a', color: '#fff', padding: '0.5rem 0.8rem', cursor: 'pointer' }}>Post</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {result ? <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.9rem' }}>{result}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
