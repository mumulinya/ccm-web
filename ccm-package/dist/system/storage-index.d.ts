export declare function startStorageIndexScan(options?: {
    force?: boolean;
}): {
    accepted: boolean;
    generation: any;
    reason: string;
} | {
    accepted: boolean;
    reason: string;
    generation?: undefined;
} | {
    accepted: boolean;
    generation: string;
    reason?: undefined;
};
export declare function getStorageIndexStatus(): {
    schema: string;
    status: string;
    generation: any;
    active_generation: any;
    scanned_at: any;
    stale: boolean;
    progress: any;
    summary: any;
    error: any;
};
export declare function startStorageIndexScheduler(): void;
export declare function stopStorageIndexScheduler(): void;
