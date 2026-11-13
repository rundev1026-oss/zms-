'use client';

import { useEffect, useState } from 'react';
import {
  CARD_VIEW_UPDATED_EVENT,
  CardViewConfigDocument,
  CardViewLayout,
  CardViewModuleId,
  DEFAULT_CARD_VIEW_CONFIG,
  normalizeCardViewConfig,
  resolveModuleLayout,
} from '@/lib/cardViewSettings';

export function publishCardViewSettings(config: CardViewConfigDocument) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CARD_VIEW_UPDATED_EVENT, { detail: config }));
}

export function useCardViewSettings(moduleId?: CardViewModuleId) {
  const [config, setConfig] = useState<CardViewConfigDocument>(DEFAULT_CARD_VIEW_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/settings/card-view', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setConfig(normalizeCardViewConfig(json.data));
        }
      } catch {
        if (!cancelled) setConfig(DEFAULT_CARD_VIEW_CONFIG);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<CardViewConfigDocument>).detail;
      if (detail) setConfig(normalizeCardViewConfig(detail));
    };

    load();
    window.addEventListener(CARD_VIEW_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(CARD_VIEW_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const layout: CardViewLayout = resolveModuleLayout(config, moduleId);
  return { config, layout, isLoading };
}
