export type EvidenceFreshness = "VALID" | "STALE" | "INVALID";
export declare function repoStateFingerprint(input: any): string;
export declare function evaluateEvidenceFreshness(evidence: any, current: any): EvidenceFreshness;
export declare function operationFingerprint(input: any): string;
