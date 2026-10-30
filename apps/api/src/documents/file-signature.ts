export type AllowedFileKind = 'pdf' | 'jpg' | 'png';

const MAX_BYTES = 10 * 1024 * 1024;

export function detectAllowedFile(buffer: Buffer): AllowedFileKind | null {
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return null;
  }
  if (buffer.subarray(0, 4).toString('utf8') === '%PDF') {
    return 'pdf';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  return null;
}

export function extensionForKind(kind: AllowedFileKind): string {
  return kind === 'jpg' ? 'jpg' : kind;
}

export function mimeForKind(kind: AllowedFileKind): string {
  if (kind === 'pdf') {
    return 'application/pdf';
  }
  if (kind === 'jpg') {
    return 'image/jpeg';
  }
  return 'image/png';
}
