'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  // Routes whose pathname should also light this nav up.
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: '여신심사보고서',
    match: (p) => p === '/' || p.startsWith('/report'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    href: '/management',
    label: '사후관리',
    match: (p) => p.startsWith('/management'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/storage',
    label: '보관함',
    match: (p) => p.startsWith('/storage'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" rx="1" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  return (
    <aside className="sidebar">
      <button
        className="home-btn"
        title="홈으로"
        onClick={() => router.push('/')}
      >
        <Image src="/building.png" alt="홈" width={22} height={22} priority />
      </button>
      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">MiZiAi</div>
    </aside>
  );
}
