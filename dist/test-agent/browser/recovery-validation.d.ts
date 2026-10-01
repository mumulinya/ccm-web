import { BrowserCheckResult, BrowserRecoveryEvidence, BrowserRecoveryEvent, BrowserRecoverySummary } from "../types";
export declare function browserRecoveryOperationIsSafe(operation: string): boolean;
export declare function browserRecoveryForbiddenDetailPaths(value: any, path?: string): string[];
export declare function browserRecoveryEventErrors(event: BrowserRecoveryEvent | Record<string, any>, maxAttempts: number, label: string): string[];
export declare function browserRecoveryEvidenceErrors(evidence: BrowserRecoveryEvidence | Record<string, any> | undefined, label?: string): string[];
export declare function browserRecoverySummaryErrors(summary: BrowserRecoverySummary | Record<string, any> | undefined, results: BrowserCheckResult[], label?: string): string[];
