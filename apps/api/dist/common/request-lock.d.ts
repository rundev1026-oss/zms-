export declare class RequestLock {
    private readonly keys;
    run<T>(key: string, work: () => Promise<T>): Promise<T>;
}
