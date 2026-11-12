'use client';

import { useEffect, useState } from 'react';
import apiClient, { getData, ApiError } from '../../src/services/apiClient';

type Note = { _id: string; message: string; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState('');

  const load = () =>
    getData<Note[]>('/notifications')
      .then(setNotes)
      .catch((e: ApiError) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    setError('');
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold mb-4">Notifications</h1>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">No notifications.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {notes.map((n) => (
            <li key={n._id} className="border border-gray-200 rounded px-3 py-2 flex items-center gap-3">
              <div className="flex-1">
                <p className={n.read ? 'text-gray-500' : ''}>{n.message}</p>
                <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n._id)} className="text-xs border px-2 py-0.5 rounded">
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
