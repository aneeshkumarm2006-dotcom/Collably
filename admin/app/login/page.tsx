'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace('/creators');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Login failed.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-hair bg-card p-7 shadow-card">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-base font-bold text-white">
            C
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-ink">Collably Admin</h1>
            <p className="text-xs text-muted">Verify creators &amp; businesses</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-ink" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the admin password"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="mt-1 rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
