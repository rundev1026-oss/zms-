'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 font-normal ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5">
        <li>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-[#0B2545] transition-colors p-1 rounded-sm hover:bg-slate-100"
            title="หน้าหลัก"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">แดชบอร์ด</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              {isLast || !item.href ? (
                <span className="inline-flex items-center gap-1 font-medium text-slate-800 truncate max-w-[200px] sm:max-w-none">
                  {Icon && <Icon className="w-3.5 h-3.5 text-slate-600" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 hover:text-[#0B2545] text-slate-600 hover:underline transition-colors"
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

