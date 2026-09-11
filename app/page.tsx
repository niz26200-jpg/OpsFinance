import Link from 'next/link';

export default function Page() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>OpsFinance</h1>
      <p>Authentication foundation</p>
      <ul>
        <li><Link href="/login">Login</Link></li>
        <li><Link href="/register">Register</Link></li>
      </ul>
    </main>
  );
}
