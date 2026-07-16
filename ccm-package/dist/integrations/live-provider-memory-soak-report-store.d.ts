import { type FileLockOptions } from "../core/atomic-json-file";
export declare const LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR: string;
export declare const LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR: string;
export declare const LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET: string;
export type LiveProviderMemorySoakReportKind = "single" | "multi" | "fleet" | "endurance";
export declare function liveProviderMemorySoakReportKind(report: any): LiveProviderMemorySoakReportKind | "unknown";
export declare function verifyLiveProviderMemorySoakReport(report: any, expectedKind?: LiveProviderMemorySoakReportKind): {
    valid: boolean;
    kind: "unknown" | LiveProviderMemorySoakReportKind;
    reportChecksum: string;
    expectedChecksum: string;
    checksumValid: boolean;
};
export declare function withLiveProviderMemorySoakReportSetLock<T>(operation: () => T, options?: FileLockOptions): T;
export declare function commitLiveProviderMemorySoakReport(report: any, options: {
    kind: LiveProviderMemorySoakReportKind;
    fileName?: string;
    lockHeld?: boolean;
    lockOptions?: FileLockOptions;
}): string;
