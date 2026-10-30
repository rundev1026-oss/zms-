export function isUniqueConflict(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  if ((error as { code: unknown }).code !== 'P2002') {
    return null;
  }
  const meta = 'meta' in error ? (error as { meta?: { target?: unknown } }).meta : undefined;
  return JSON.stringify(meta?.target ?? '');
}
