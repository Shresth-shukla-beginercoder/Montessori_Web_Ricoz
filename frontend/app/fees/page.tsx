'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';
import { useAuth } from '../../src/services/auth';

type Child = { _id: string; name: string };
type Fee = { _id: string; childId: string; amount: number; status: 'paid' | 'pending' | 'overdue'; dueDate: string };

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function FeesPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ childId: '', amount: '', dueDate: '' });
  const canWrite = user?.role === 'centre_manager' || user?.role === 'super_admin';

  const load = async () => {
    try {
      const [c, f] = await Promise.all([getData<Child[]>('/children'), getData<Fee[]>('/fees')]);
      setChildren(c);
      setFees(f);
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/fees', { childId: form.childId, amount: Number(form.amount), dueDate: form.dueDate });
      setForm({ childId: '', amount: '', dueDate: '' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  const setStatus = async (id: string, status: Fee['status']) => {
    setError('');
    try {
      await apiClient.patch(`/fees/${id}`, { status });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  const childName = (id: string) => children.find((c) => c._id === id)?.name ?? id;

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Fees</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {canWrite && (
        <form onSubmit={onCreate} className="flex flex-wrap gap-2 mb-4 text-sm">
          <select
            required
            value={form.childId}
            onChange={(e) => setForm({ ...form, childId: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="">Select child</option>
            {children.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min={1}
            placeholder="amount (₹)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 w-32"
          />
          <input
            required
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <button className="bg-gray-900 text-white rounded px-3 py-1">Add fee</button>
        </form>
      )}

      {fees.length === 0 ? (
        <p className="text-sm text-gray-500">No fee records.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Child</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f._id} className="border-b">
                <td className="py-1">{childName(String(f.childId))}</td>
                <td>{inr.format(f.amount)}</td>
                <td>{new Date(f.dueDate).toLocaleDateString('en-IN')}</td>
                <td>{f.status}</td>
                {canWrite && (
                  <td>
                    {f.status !== 'paid' && (
                      <button onClick={() => setStatus(f._id, 'paid')} className="text-xs border px-2 py-0.5 rounded">
                        Mark paid
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
