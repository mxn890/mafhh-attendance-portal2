'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Attendance', icon: '⏱' },
  { href: '/history', label: 'History', icon: '📅' },
  { href: '/leave', label: 'Leave', icon: '✉' },
];

export default function EmployeeNav({ employee }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* Top bar — brand only, compact, never wraps */}
      <div className="bg-ink px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-4 bg-signal shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-paper text-sm leading-tight truncate">MAFHH AVIATION</p>
            <p className="text-[9px] text-slate-light leading-tight">Attendance System</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-[11px] text-slate-light hover:text-paper shrink-0 ml-2">
          Sign out
        </button>
      </div>

      {/* Employee identity strip — separate row, never competes with brand for space */}
      {employee && (
        <div className="bg-paper border-b border-line px-4 py-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink truncate">{employee.name}</p>
          <p className="font-tabular text-[10px] text-slate shrink-0 ml-2">{employee.employeeId}</p>
        </div>
      )}

      {/* Bottom tab bar — the standard mobile-app pattern, fixed and thumb-reachable */}
      <nav className="fixed bottom-0 left-0 right-0 bg-ink border-t border-white/10 flex z-40 pb-[env(safe-area-inset-bottom,0px)]">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                active ? 'text-signal' : 'text-slate-light'
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
