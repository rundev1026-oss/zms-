'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CardViewLayout, resolveColumnCount } from '@/lib/cardViewSettings';

interface CardViewGridProps {
  layout: CardViewLayout;
  children: React.ReactNode;
  className?: string;
}

export function CardViewGrid({ layout, children, className = '' }: CardViewGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      setWidth(element.clientWidth);
      setViewportWidth(window.innerWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const columns = resolveColumnCount(layout, width || 320, viewportWidth);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'grid',
        gap: layout.gapPx,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
