'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/manager', label: 'Dashboard' },
  { href: '/manager/map', label: 'Live Map' },
  { href: '/manager/leaves', label: 'Leave Requests' },
];

export default function ManagerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="bg-ink sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-4 bg-signal shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-paper text-sm leading-tight truncate">MAFHH AVIATION</p>
            <p className="text-[9px] text-slate-light leading-tight">Attendance — Manager</p>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-xs font-medium ${pathname === link.href ? 'text-paper' : 'text-slate-light hover:text-paper'}`}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="ml-2 text-xs text-slate-light hover:text-paper">Sign out</button>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-paper p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2.5 text-sm font-medium ${pathname === link.href ? 'text-signal' : 'text-slate-light'}`}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="block w-full text-left py-2.5 text-sm text-slate-light">Sign out</button>
        </div>
      )}
    </div>
  );
}
