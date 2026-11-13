export type CardSize = 'small' | 'medium' | 'large';
export type CardDensity = 'comfortable' | 'compact';
export type CardRowsPerPage = 1 | 2 | 3 | 4 | 5 | 10 | 'all';
export type CardColumns = 1 | 2 | 3 | 4 | 5;
export type CardViewModuleId = 'followup' | 'disbursements' | 'registry';

export interface CardViewLayout {
  size: CardSize;
  cardsPerRow: CardColumns;
  rowsPerPage: CardRowsPerPage;
  gapPx: number;
  paddingPx: number;
  minHeightPx: number;
  density: CardDensity;
}

export interface CardViewConfigDocument {
  global: CardViewLayout;
  modules: Partial<Record<CardViewModuleId, CardViewLayout>>;
}

export const CARD_VIEW_MODULES: { id: CardViewModuleId; label: string }[] = [
  { id: 'followup', label: 'ตรวจสอบและติดตามผล' },
  { id: 'disbursements', label: 'บันทึกการช่วยเหลือ' },
  { id: 'registry', label: 'ทะเบียนสมาชิกผู้มีสิทธิ์รับซะกาต' },
];

export const CARD_VIEW_UPDATED_EVENT = 'zms:card-view-settings';
export const ALL_ROWS_ITEM_LIMIT = 100;

export const SIZE_PRESETS: Record<
  CardSize,
  {
    label: string;
    minCardWidth: number;
    titlePx: number;
    bodyPx: number;
    defaultGap: number;
    defaultPadding: number;
    defaultMinHeight: number;
    innerGap: number;
  }
> = {
  small: {
    label: 'Small — การ์ดขนาดเล็ก',
    minCardWidth: 220,
    titlePx: 15,
    bodyPx: 13,
    defaultGap: 12,
    defaultPadding: 12,
    defaultMinHeight: 168,
    innerGap: 8,
  },
  medium: {
    label: 'Medium — การ์ดขนาดกลาง',
    minCardWidth: 280,
    titlePx: 16,
    bodyPx: 14,
    defaultGap: 16,
    defaultPadding: 16,
    defaultMinHeight: 220,
    innerGap: 12,
  },
  large: {
    label: 'Large — การ์ดขนาดใหญ่',
    minCardWidth: 360,
    titlePx: 18,
    bodyPx: 15,
    defaultGap: 20,
    defaultPadding: 20,
    defaultMinHeight: 280,
    innerGap: 14,
  },
};

export const DEFAULT_CARD_VIEW_LAYOUT: CardViewLayout = {
  size: 'medium',
  cardsPerRow: 3,
  rowsPerPage: 3,
  gapPx: SIZE_PRESETS.medium.defaultGap,
  paddingPx: SIZE_PRESETS.medium.defaultPadding,
  minHeightPx: SIZE_PRESETS.medium.defaultMinHeight,
  density: 'comfortable',
};

export const DEFAULT_CARD_VIEW_CONFIG: CardViewConfigDocument = {
  global: DEFAULT_CARD_VIEW_LAYOUT,
  modules: {},
};

const SIZES: CardSize[] = ['small', 'medium', 'large'];
const DENSITIES: CardDensity[] = ['comfortable', 'compact'];
const COLUMNS: CardColumns[] = [1, 2, 3, 4, 5];
const ROWS: CardRowsPerPage[] = [1, 2, 3, 4, 5, 10, 'all'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeCardViewLayout(input: unknown, fallback: CardViewLayout = DEFAULT_CARD_VIEW_LAYOUT): CardViewLayout {
  const source = input && typeof input === 'object' ? (input as Partial<CardViewLayout>) : {};
  const size = SIZES.includes(source.size as CardSize) ? (source.size as CardSize) : fallback.size;
  const cardsPerRow = COLUMNS.includes(Number(source.cardsPerRow) as CardColumns)
    ? (Number(source.cardsPerRow) as CardColumns)
    : fallback.cardsPerRow;
  const rowsPerPage = ROWS.includes(source.rowsPerPage as CardRowsPerPage)
    ? (source.rowsPerPage as CardRowsPerPage)
    : source.rowsPerPage === 'all'
      ? 'all'
      : fallback.rowsPerPage;
  const density = DENSITIES.includes(source.density as CardDensity) ? (source.density as CardDensity) : fallback.density;

  return {
    size,
    cardsPerRow,
    rowsPerPage,
    gapPx: clamp(Number(source.gapPx ?? fallback.gapPx), 8, 32),
    paddingPx: clamp(Number(source.paddingPx ?? fallback.paddingPx), 12, 28),
    minHeightPx: clamp(Number(source.minHeightPx ?? fallback.minHeightPx), 160, 420),
    density,
  };
}

export function normalizeCardViewConfig(input: unknown): CardViewConfigDocument {
  const source = input && typeof input === 'object' ? (input as Partial<CardViewConfigDocument>) : {};
  const modules: CardViewConfigDocument['modules'] = {};
  const rawModules = source.modules && typeof source.modules === 'object' ? source.modules : {};
  for (const moduleId of CARD_VIEW_MODULES.map((item) => item.id)) {
    const raw = (rawModules as Record<string, unknown>)[moduleId];
    if (raw && typeof raw === 'object') {
      modules[moduleId] = normalizeCardViewLayout(raw);
    }
  }
  return {
    global: normalizeCardViewLayout(source.global),
    modules,
  };
}

export function resolveModuleLayout(config: CardViewConfigDocument, moduleId?: CardViewModuleId): CardViewLayout {
  if (!moduleId) return config.global;
  return config.modules[moduleId] ? normalizeCardViewLayout(config.modules[moduleId], config.global) : config.global;
}

export function applySizePreset(layout: CardViewLayout, size: CardSize): CardViewLayout {
  const preset = SIZE_PRESETS[size];
  return normalizeCardViewLayout({
    ...layout,
    size,
    gapPx: preset.defaultGap,
    paddingPx: preset.defaultPadding,
    minHeightPx: preset.defaultMinHeight,
  });
}

export function resolveCardPageSize(layout: CardViewLayout, totalItems: number): number {
  if (layout.rowsPerPage === 'all') {
    if (totalItems <= ALL_ROWS_ITEM_LIMIT) return Math.max(totalItems, 1);
    return layout.cardsPerRow * 10;
  }
  return layout.cardsPerRow * layout.rowsPerPage;
}

export function resolveColumnCount(layout: CardViewLayout, containerWidth: number, viewportWidth = 0): number {
  const viewport = viewportWidth > 0 ? viewportWidth : containerWidth;
  if (viewport < 768) return 1;

  const minWidth = SIZE_PRESETS[layout.size].minCardWidth;
  const fit = Math.max(1, Math.floor((containerWidth + layout.gapPx) / (minWidth + layout.gapPx)));
  const requested = viewport < 1280 ? Math.min(layout.cardsPerRow, 3) : layout.cardsPerRow;
  return Math.max(1, Math.min(requested, fit));
}

export function cardInnerGap(layout: CardViewLayout): number {
  const base = SIZE_PRESETS[layout.size].innerGap;
  return layout.density === 'compact' ? Math.max(8, base - 4) : base;
}
