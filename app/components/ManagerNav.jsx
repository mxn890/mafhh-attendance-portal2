'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/manager', label: 'Today' },
  { href: '/manager/employees', label: 'Employees' },
  { href: '/manager/reports', label: 'Reports / Print' },
  { href: '/manager/map', label: 'Live Map' },
  { href: '/manager/leaves', label: 'Leave Requests' },
  { href: '/', label: 'My Attendance' },
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
    <header className="manager-header sticky top-0 z-40">
      <div className="manager-topbar">
        <Link href="/manager" className="brand-lockup" aria-label="MAFHH Aviation attendance home">
          <span className="brand-mark" aria-hidden="true">M<span /></span>
          <span><strong>MAFHH AVIATION</strong><small>People & attendance</small></span>
        </Link>
        <div className="hidden md:flex items-center gap-4"><span className="workspace-label"><span />Manager workspace</span><button onClick={handleLogout} className="btn-secondary btn-sm">Sign out</button></div>
        <button className="md:hidden btn-secondary" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open manager navigation" aria-expanded={menuOpen}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <nav aria-label="Manager navigation" className={`manager-navigation ${menuOpen ? 'is-open' : ''}`}>
        {LINKS.map(link => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} aria-current={pathname === link.href ? 'page' : undefined} className={`manager-nav-link ${pathname === link.href ? 'is-active' : ''}`}>{link.label}</Link>)}
        <button onClick={handleLogout} className="md:hidden manager-nav-link">Sign out</button>
      </nav>
    </header>
  );
}
