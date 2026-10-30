import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../common/app.exception';

const WINDOW_MS = 60_000;
const LIMIT = 5;

@Injectable()
export class LoginRateLimiter {
  private readonly failures = new Map<string, number[]>();

  assertAllowed(key: string, now = Date.now()): void {
    const recent = (this.failures.get(key) ?? []).filter((hit) => now - hit < WINDOW_MS);
    if (recent.length >= LIMIT) {
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        'พยายามเข้าสู่ระบบผิดพลาดบ่อยเกินไป กรุณารอสักครู่ (1 นาที)',
      );
    }
  }

  recordFailure(key: string, now = Date.now()): void {
    const recent = (this.failures.get(key) ?? []).filter((hit) => now - hit < WINDOW_MS);
    recent.push(now);
    this.failures.set(key, recent);
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
  }

  reset(): void {
    this.failures.clear();
  }
}
