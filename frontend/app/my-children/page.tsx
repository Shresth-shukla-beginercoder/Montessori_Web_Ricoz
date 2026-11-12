'use client';

import { useEffect, useState } from 'react';
import { getData, ApiError } from '../../src/services/apiClient';

type Child = { _id: string; name: string; dob: string; status: string };

export default function MyChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getData<Child[]>('/parents/me/children')
      .then(setChildren)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">My children</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {children.length === 0 ? (
        <p className="text-sm text-gray-500">No children linked to your account.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {children.map((c) => (
            <li key={c._id} className="border border-gray-200 rounded px-3 py-2">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-gray-500">
                Born {new Date(c.dob).toLocaleDateString('en-IN')} · {c.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
