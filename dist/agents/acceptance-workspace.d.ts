import { type AcceptanceContract } from "./acceptance-contract";
export type AcceptanceSnapshot = {
    root: string;
    fingerprint: string;
    gitFingerprint?: string;
    mode: "git" | "snapshot_only";
    files: Record<string, string>;
    fixtureShapes: Record<string, string>;
    error?: string;
};
export declare function pathInside(root: string, relative: string): string;
export declare function coveredPath(file: string, declared: string): boolean;
/** Mask only literal initializers of explicitly named fields; all other syntax stays auditable. */
export declare function fixtureShape(file: string, source: string, allowed: string[]): string;
export declare function captureAcceptanceSnapshot(root: string, contract: AcceptanceContract, projectId: string): AcceptanceSnapshot;
export declare function auditAcceptanceScope(contract: AcceptanceContract, projectId: string, before: AcceptanceSnapshot, after: AcceptanceSnapshot): {
    status: string;
    changedFiles: string[];
    outOfScopeFiles: string[];
    fixtureViolations: string[];
};
