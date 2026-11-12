'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';

type Centre = { _id: string; name: string; address: string; status: string };

export default function CentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '' });

  const load = () =>
    getData<Centre[]>('/centres')
      .then(setCentres)
      .catch((e: ApiError) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/centres', form);
      setForm({ name: '', address: '' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Centres</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 mb-4 text-sm">
        <input
          required
          placeholder="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        />
        <input
          required
          placeholder="address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        />
        <button className="bg-gray-900 text-white rounded px-3 py-1">Add centre</button>
      </form>

      {centres.length === 0 ? (
        <p className="text-sm text-gray-500">No centres.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Name</th>
              <th>Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {centres.map((c) => (
              <tr key={c._id} className="border-b">
                <td className="py-1">{c.name}</td>
                <td>{c.address}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
