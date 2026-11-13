'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { FinanceView } from '@/components/views/FinanceView';
import { financeBreadcrumb } from '@/lib/financeMenu';

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppLayout breadcrumbTitle={financeBreadcrumb(pathname)}>
      <FinanceView onNavigate={(view) => router.push(view.startsWith('/') ? view : `/${view}`)} />
      {children}
    </AppLayout>
  );
}
