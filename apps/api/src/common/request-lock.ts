import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class RequestLock {
  private readonly keys = new Set<string>();

  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    if (this.keys.has(key)) {
      throw new AppException(HttpStatus.CONFLICT, 'DUPLICATE_REQUEST', 'คำขอนี้กำลังดำเนินการ');
    }

    this.keys.add(key);
    try {
      return await work();
    } finally {
      this.keys.delete(key);
    }
  }
}
