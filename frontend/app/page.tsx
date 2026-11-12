'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient from '../src/services/apiClient';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  centreId?: string;
};

export default function Home() {
  const [status, setStatus] = useState('Checking backend...');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('manager@demo.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<unknown>(null);
  const [children, setChildren] = useState<unknown[]>([]);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => setStatus(`API: ${res.data.data.status}`))
      .catch((err) => setStatus(`API error: ${err.message}`));

    apiClient
      .get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      setChildren([]);
      return;
    }
    const load = async () => {
      try {
        if (user.role === 'super_admin') {
          const hq = await apiClient.get('/dashboard/hq');
          setDashboard(hq.data.data);
        } else if (user.role === 'parent') {
          const mine = await apiClient.get('/parents/me/children');
          setChildren(mine.data.data);
          const fees = await apiClient.get('/fees');
          setDashboard({ fees: fees.data.data });
        } else {
          const dash = await apiClient.get('/dashboard/centre');
          setDashboard(dash.data.data);
          const kids = await apiClient.get('/children');
          setChildren(kids.data.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    };
    load();
  }, [user]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      setUser(res.data.data.user);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Login failed';
      setError(msg);
    }
  };

  const onLogout = async () => {
    await apiClient.post('/auth/logout');
    setUser(null);
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-stone-500">Project 29</p>
          <h1 className="text-3xl font-semibold">Montessori Daycare Platform</h1>
          <p className="text-stone-600">{status}</p>
        </header>

        {!user ? (
          <form onSubmit={onLogin} className="space-y-4 border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-medium">Sign in</h2>
            <label className="block space-y-1">
              <span className="text-sm text-stone-600">Email</span>
              <input
                className="w-full border border-stone-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-stone-600">Password</span>
              <input
                className="w-full border border-stone-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" className="bg-stone-900 px-4 py-2 text-white">
              Login
            </button>
            <p className="text-xs text-stone-500">
              Demo: manager@demo.local / Password123! (after seed)
            </p>
          </form>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between border border-stone-200 bg-white p-4">
              <div>
                <p className="font-medium">{user.name || user.email}</p>
                <p className="text-sm text-stone-600">
                  {user.role}
                  {user.centreId ? ` · centre ${user.centreId}` : ''}
                </p>
              </div>
              <button onClick={onLogout} className="border border-stone-300 px-3 py-1.5 text-sm">
                Logout
              </button>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <div className="border border-stone-200 bg-white p-4">
              <h2 className="mb-2 text-lg font-medium">Dashboard</h2>
              <pre className="overflow-auto text-xs text-stone-700">
                {JSON.stringify(dashboard, null, 2)}
              </pre>
            </div>

            <div className="border border-stone-200 bg-white p-4">
              <h2 className="mb-2 text-lg font-medium">Children</h2>
              <pre className="overflow-auto text-xs text-stone-700">
                {JSON.stringify(children, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
