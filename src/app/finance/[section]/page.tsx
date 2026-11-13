'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isFinanceSlug } from '@/lib/financeMenu';

export default function FinanceSectionPage() {
  const params = useParams<{ section: string }>();
  const router = useRouter();
  const section = params?.section;

  useEffect(() => {
    if (section === 'transactions') {
      router.replace('/finance/reports?tab=transactions');
      return;
    }
    if (section === 'reconciliation') {
      router.replace('/finance/bank-accounts?view=reconcile');
      return;
    }
    if (section && !isFinanceSlug(section)) router.replace('/finance/dashboard');
  }, [router, section]);

  return null;
}
