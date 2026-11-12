'use client';

import { useEffect, useState } from 'react';
import { getData, ApiError } from '../../src/services/apiClient';

type Log = {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  createdAt: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getData<Log[]>('/audit-logs')
      .then(setLogs)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Audit logs</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">When</th>
              <th>Action</th>
              <th>Resource</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id} className="border-b">
                <td className="py-1">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                <td>{l.action}</td>
                <td>
                  {l.resourceType} {l.resourceId.slice(-6)}
                </td>
                <td>{String(l.userId).slice(-6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
