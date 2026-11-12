'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { useAuth, Role } from '../services/auth';

const NAV: Record<Role, { href: string; label: string }[]> = {
  super_admin: [
    { href: '/dashboard', label: 'HQ Dashboard' },
    { href: '/centres', label: 'Centres' },
    { href: '/audit-logs', label: 'Audit Logs' },
  ],
  centre_manager: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/children', label: 'Children' },
    { href: '/parents', label: 'Parents' },
    { href: '/staff', label: 'Staff' },
    { href: '/attendance', label: 'Attendance' },
    { href: '/fees', label: 'Fees' },
    { href: '/montessori', label: 'Montessori' },
    { href: '/audit-logs', label: 'Audit Logs' },
  ],
  teacher: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/attendance', label: 'Attendance' },
    { href: '/montessori', label: 'Montessori' },
    { href: '/children', label: 'Children' },
  ],
  parent: [
    { href: '/my-children', label: 'My Children' },
    { href: '/fees', label: 'Fees' },
    { href: '/montessori', label: 'Learning' },
    { href: '/notifications', label: 'Notifications' },
  ],
};

const PUBLIC_PATHS = ['/login'];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublic) router.replace('/login');
    if (!loading && user && isPublic) router.replace(user.role === 'parent' ? '/my-children' : '/dashboard');
  }, [loading, user, isPublic, router]);

  if (loading) return <p className="p-6 text-sm">Loading…</p>;
  if (!user || isPublic) return <>{children}</>;

  const links = NAV[user.role] ?? [];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-gray-200 p-4 flex flex-col gap-1">
        <p className="font-semibold text-sm">{user.name}</p>
        <p className="text-xs text-gray-500 mb-3">{user.role.replace('_', ' ')}</p>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm px-2 py-1 rounded ${pathname === l.href ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
          >
            {l.label}
          </Link>
        ))}
        <button onClick={logout} className="text-sm text-left mt-auto border border-gray-300 px-2 py-1 rounded">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
