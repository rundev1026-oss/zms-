export function redactDatabaseMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Unknown database error';
  const redacted = raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\bpassword=\S+/gi, 'password=[redacted]');
  const firstLine = redacted.split('\n')[0]?.trim() ?? '';
  if (firstLine.length === 0) {
    return 'Database unavailable';
  }
  return firstLine.length > 240 ? `${firstLine.slice(0, 240)}…` : firstLine;
}
