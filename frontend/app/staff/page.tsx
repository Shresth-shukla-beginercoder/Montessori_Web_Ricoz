'use client';

import { FormEvent, useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';
import { useAuth } from '../../src/services/auth';

type StaffMember = { _id: string; name: string; role: string };

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' });

  const load = () =>
    getData<StaffMember[]>('/staff')
      .then(setStaff)
      .catch((e: ApiError) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/staff', form);
      setForm({ name: '', email: '', password: '', role: 'teacher' });
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Staff</h1>
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
          type="email"
          placeholder="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="teacher">teacher</option>
          {user?.role === 'super_admin' && <option value="centre_manager">centre manager</option>}
        </select>
        <button className="bg-gray-900 text-white rounded px-3 py-1">Add staff</button>
      </form>

      {staff.length === 0 ? (
        <p className="text-sm text-gray-500">No staff yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s._id} className="border-b">
                <td className="py-1">{s.name}</td>
                <td>{s.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
