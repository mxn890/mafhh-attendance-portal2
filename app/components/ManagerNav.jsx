'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/manager', label: 'Dashboard' },
  { href: '/manager/map', label: 'Live Map' },
  { href: '/manager/leaves', label: 'Leave Requests' },
];

export default function ManagerNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="bg-ink">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-signal" />
          <div>
            <span className="font-display font-semibold text-paper text-sm tracking-tight">MAFHH AVIATION</span>
            <p className="text-[10px] text-slate-light">Attendance System — Manager</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-slate-light hover:text-paper">Sign out</button>
      </div>
      <div className="px-4 flex items-center gap-1 border-t border-white/10">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              pathname === link.href ? 'text-paper border-signal' : 'text-slate-light border-transparent hover:text-paper'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
