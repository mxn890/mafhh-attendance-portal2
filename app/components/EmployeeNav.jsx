'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Check In/Out' },
  { href: '/history', label: 'History' },
  { href: '/leave', label: 'Leave' },
];

export default function EmployeeNav({ employee }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="bg-ink">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-signal" />
            <span className="font-display font-semibold text-paper text-sm tracking-tight">MAFHH AVIATION</span>
          </div>
          <p className="text-[10px] text-slate-light ml-3.5">Attendance System</p>
        </div>
        <div className="text-right">
          {employee && (
            <>
              <p className="text-sm font-medium text-paper">{employee.name}</p>
              <p className="font-tabular text-[10px] text-slate-light">{employee.employeeId} · {employee.department}</p>
            </>
          )}
        </div>
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
        <button onClick={handleLogout} className="ml-auto px-3 py-2 text-xs text-slate-light hover:text-paper">
          Sign out
        </button>
      </div>
    </div>
  );
}
