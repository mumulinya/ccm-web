export declare function recordContextEngineEvent(input: any): any;
export declare function readContextEngineTrends(filter?: {
    scope?: string;
    scopeId?: string;
    sessionId?: string;
    limit?: number;
    since?: string;
}): {
    schema: string;
    version: number;
    filter: {
        scope: string;
        scopeId: string;
        sessionId: string;
    };
    summary: {
        eventCount: number;
        compactionCount: number;
        failureCount: number;
        averageCompactionRatio: number;
        averageCacheHitRate: number;
        averageProjectionDurationMs: number;
        averageProviderLatencyMs: number;
        totalEstimatedCostUsd: number;
        latestProjectedTokens: any;
        projectedTokenMedian: number;
        latestSummaryQualityScore: any;
    };
    alerts: any[];
    events: any[];
    contentStored: boolean;
};
export declare function runContextEngineObservabilitySelfTest(): {
    pass: boolean;
    checks: {
        ratio: number;
        contentStored: boolean;
    };
};
