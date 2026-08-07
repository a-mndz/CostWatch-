'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = tab === 'login' ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Failed');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md rounded-xl p-8" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>CostWatch</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Cloud cost anomaly detection</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              style={{
                backgroundColor: tab === t ? 'var(--bg-surface)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ backgroundColor: 'oklch(20% 0.05 25)', color: 'var(--color-tertiary)', border: '1px solid oklch(30% 0.08 25)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
                style={inputStyle} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
              style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
              style={inputStyle} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}>
            {loading ? 'Loading...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
