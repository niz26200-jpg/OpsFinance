import Link from 'next/link';
import { createDemoTransactionService } from '../../packages/transactions';

const service = createDemoTransactionService();

export default function TransactionsPage() {
  const transactions = service.getTransactions('11111111-1111-4111-8111-111111111111');

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <div>
          <p style={{ margin: 0, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 12 }}>OpsFinance</p>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '2rem' }}>All Transactions</h1>
        </div>
        <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </nav>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {['Search', 'Date', 'Type', 'Status', 'Amount'].map((label) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{label === 'Amount' ? 'RM0.00' : '—'}</div>
          </div>
        ))}
      </section>

      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Transaction No', 'Date', 'Type', 'Description', 'Account', 'Amount', 'Status'].map((header) => (
                <th key={header} style={{ textAlign: 'left', padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.referenceNo ?? transaction.id}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.date}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.type}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.description}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.financialAccountId ?? transaction.accountId ?? '—'}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>RM{transaction.amount}</td>
                <td style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>{transaction.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
