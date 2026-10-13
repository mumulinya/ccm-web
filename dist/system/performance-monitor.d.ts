export declare function performanceRoute(method: string, raw: string): string;
export declare function recordPerformance(name: string, ms: number, bytes?: number): void;
export declare function measurePerformance<T>(name: string, operation: () => T): T;
export declare function measureAsyncPerformance<T>(name: string, operation: () => T | Promise<T>): Promise<T>;
export declare function markPerformanceReady(kind: 'http' | 'execution'): void;
export declare function startPerformanceMonitor(): void;
export declare function stopPerformanceMonitor(): void;
export declare function trackHttpPerformance(req: any, res: any): void;
export declare function performanceSnapshot(): {
    schema: string;
    sampledSystem: any;
    activeRequests: number;
    readyMs: {
        [x: string]: number;
    };
    slowRequestMs: number;
    activeJobs: {
        [k: string]: number;
    };
    readonlyWorker: any;
    sqliteCheckpoint: any;
    sse: any;
    conversationJournal: any;
    routes: {
        name: string;
        count: number;
        meanMs: number;
        maxMs: number;
        bytes: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        sampleCount: number;
        slow: number;
    }[];
};
