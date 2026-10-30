export declare class LoginRateLimiter {
    private readonly failures;
    assertAllowed(key: string, now?: number): void;
    recordFailure(key: string, now?: number): void;
    recordSuccess(key: string): void;
    reset(): void;
}
