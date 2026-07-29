export declare const METRICS_EVENT_FILE: string;
export declare const MEMORY_METRIC_EVENT_SCAN_LIMIT = 2000;
export declare function recordMemoryMetric(type: string, detail?: any): any;
/**
 * 聚合读取。历史上指标存在 metrics.json 的 counters 里，这里把旧文件的计数
 * 作为基线叠加，避免切换到 jsonl 之后已有统计归零。
 */
export declare function readMemoryMetrics(limit?: number): {
    version: number;
    counters: Record<string, number>;
    events: any[];
    eventFile: string;
    legacyEventCount: any;
    updatedAt: string;
};
