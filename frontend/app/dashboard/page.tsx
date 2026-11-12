'use client';

import { useEffect, useState } from 'react';
import { getData, ApiError } from '../../src/services/apiClient';
import { useAuth } from '../../src/services/auth';

type CentreDash = {
  centreId: string;
  activeChildren: number;
  staffCount: number;
  attendanceToday: { logged: number; present: number; absent: number; late: number };
  fees: { pending: number; overdue: number };
};

type HqDash = {
  totalCentres: number;
  totalActiveChildren: number;
  centres: { id: string; name: string; activeChildren: number; staffCount: number }[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CentreDash | HqDash | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const url = user.role === 'super_admin' ? '/dashboard/hq' : '/dashboard/centre';
    getData<CentreDash | HqDash>(url)
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, [user]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm">Loading dashboard…</p>;

  if (user?.role === 'super_admin') {
    const hq = data as HqDash;
    return (
      <section>
        <h1 className="text-lg font-semibold mb-4">HQ Dashboard</h1>
        <div className="flex gap-4 mb-6 text-sm">
          <Stat label="Centres" value={hq.totalCentres} />
          <Stat label="Active children" value={hq.totalActiveChildren} />
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Centre</th>
              <th>Active children</th>
              <th>Staff</th>
            </tr>
          </thead>
          <tbody>
            {hq.centres.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-1">{c.name}</td>
                <td>{c.activeChildren}</td>
                <td>{c.staffCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hq.centres.length === 0 && <p className="text-sm text-gray-500 mt-2">No active centres.</p>}
      </section>
    );
  }

  const c = data as CentreDash;
  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Centre Dashboard</h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <Stat label="Active children" value={c.activeChildren} />
        <Stat label="Staff" value={c.staffCount} />
        <Stat label="Present today" value={c.attendanceToday.present} />
        <Stat label="Absent today" value={c.attendanceToday.absent} />
        <Stat label="Late today" value={c.attendanceToday.late} />
        <Stat label="Fees pending" value={c.fees.pending} />
        <Stat label="Fees overdue" value={c.fees.overdue} />
      </div>
    </section>
  );
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="border border-gray-200 rounded px-3 py-2 min-w-32">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);
