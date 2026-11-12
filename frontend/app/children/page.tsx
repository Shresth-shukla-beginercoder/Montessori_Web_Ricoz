'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';
import { useAuth } from '../../src/services/auth';

type Child = { _id: string; name: string; dob: string; status: string; parentIds: string[] };

export default function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const canWrite = user?.role === 'centre_manager' || user?.role === 'super_admin';

  const load = () =>
    getData<Child[]>('/children')
      .then(setChildren)
      .catch((e: ApiError) => setError(e.message));

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/children', { name, dob });
      setName('');
      setDob('');
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  const onWithdraw = async (id: string) => {
    setError('');
    try {
      await apiClient.patch(`/children/${id}`, { status: 'withdrawn' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Children</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {canWrite && (
        <form onSubmit={onCreate} className="flex flex-wrap gap-2 mb-4 text-sm">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <input
            required
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          />
          <button className="bg-gray-900 text-white rounded px-3 py-1">Add child</button>
        </form>
      )}

      {children.length === 0 ? (
        <p className="text-sm text-gray-500">No children enrolled.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Name</th>
              <th>Date of birth</th>
              <th>Status</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {children.map((c) => (
              <tr key={c._id} className="border-b">
                <td className="py-1">{c.name}</td>
                <td>{new Date(c.dob).toLocaleDateString('en-IN')}</td>
                <td>{c.status}</td>
                {canWrite && (
                  <td>
                    {c.status === 'active' && (
                      <button onClick={() => onWithdraw(c._id)} className="text-xs border px-2 py-0.5 rounded">
                        Withdraw
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
