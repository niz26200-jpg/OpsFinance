'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Login is available once Supabase credentials are configured.');
  };

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '2rem', background: '#fff', borderRadius: 12 }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <label>
            Email
            <input type="email" name="email" style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label>
            Password
            <input type="password" name="password" style={{ width: '100%', marginTop: 4 }} />
          </label>
          <button type="submit">Sign in</button>
        </div>
      </form>
      {status ? <p>{status}</p> : null}
    </main>
  );
}
