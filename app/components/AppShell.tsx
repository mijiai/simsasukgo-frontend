'use client';

import { Sidebar } from './Sidebar';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      {children}
    </div>
  );
}
