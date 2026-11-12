'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';

type Parent = { _id: string; name: string; phone: string };

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const load = () =>
    getData<Parent[]>('/parents')
      .then(setParents)
      .catch((e: ApiError) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/parents', form);
      setForm({ name: '', email: '', password: '', phone: '' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Parents</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 mb-4 text-sm">
        {(['name', 'email', 'phone'] as const).map((field) => (
          <input
            key={field}
            required
            placeholder={field}
            type={field === 'email' ? 'email' : 'text'}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1"
          />
        ))}
        <input
          required
          type="password"
          minLength={8}
          placeholder="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        />
        <button className="bg-gray-900 text-white rounded px-3 py-1">Add parent</button>
      </form>

      {parents.length === 0 ? (
        <p className="text-sm text-gray-500">No parents registered.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Name</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p._id} className="border-b">
                <td className="py-1">{p.name}</td>
                <td>{p.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
