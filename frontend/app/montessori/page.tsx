'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';
import { useAuth } from '../../src/services/auth';

const AREAS = ['Practical Life', 'Sensorial', 'Language', 'Mathematics', 'Cultural'];

type Child = { _id: string; name: string };
type Log = { _id: string; childId: string; area: string; observation: string; date: string };

export default function MontessoriPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ childId: '', area: AREAS[0], observation: '' });
  const canWrite = user?.role === 'teacher' || user?.role === 'centre_manager';

  const load = async () => {
    try {
      const [c, l] = await Promise.all([getData<Child[]>('/children'), getData<Log[]>('/montessori-logs')]);
      setChildren(c);
      setLogs(l);
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
      await apiClient.post('/montessori-logs', form);
      setForm({ ...form, observation: '' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  const childName = (id: string) => children.find((c) => c._id === id)?.name ?? id;

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Montessori observations</h1>
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
          <select
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input
            required
            placeholder="observation"
            value={form.observation}
            onChange={(e) => setForm({ ...form, observation: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 flex-1 min-w-48"
          />
          <button className="bg-gray-900 text-white rounded px-3 py-1">Add log</button>
        </form>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No observations yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {logs.map((l) => (
            <li key={l._id} className="border border-gray-200 rounded px-3 py-2">
              <p className="text-xs text-gray-500">
                {childName(String(l.childId))} · {l.area} · {new Date(l.date).toLocaleDateString('en-IN')}
              </p>
              <p>{l.observation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
