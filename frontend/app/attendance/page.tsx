'use client';

import { useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';

type Child = { _id: string; name: string; status: string };
type Record = { _id: string; childId: string; status: 'present' | 'absent' | 'late' };

export default function AttendancePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, r] = await Promise.all([getData<Child[]>('/children'), getData<Record[]>('/attendance')]);
      setChildren(c.filter((x) => x.status === 'active'));
      setRecords(r);
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async (childId: string, status: Record['status']) => {
    setBusy(childId);
    setError('');
    try {
      await apiClient.post('/attendance', { childId, status });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const statusOf = (childId: string) => records.find((r) => String(r.childId) === childId)?.status;

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Attendance — today</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {children.length === 0 ? (
        <p className="text-sm text-gray-500">No active children.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {children.map((c) => (
            <li key={c._id} className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2">
              <span className="flex-1">{c.name}</span>
              <span className="text-xs text-gray-500 w-16">{statusOf(c._id) ?? '—'}</span>
              {(['present', 'absent', 'late'] as const).map((s) => (
                <button
                  key={s}
                  disabled={busy === c._id}
                  onClick={() => mark(c._id, s)}
                  className="border border-gray-300 rounded px-2 py-0.5 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
