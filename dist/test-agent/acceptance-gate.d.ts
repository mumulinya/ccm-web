/** Server-side gate: a model verdict is advisory until executable evidence is present. */
export type AcceptanceGateResult = {
    canAccept: boolean;
    status: "passed" | "failed" | "blocked";
    issues: string[];
    qualityScore: number;
};
export declare function evaluateTestAgentAcceptanceGate(input: any): AcceptanceGateResult;
export declare function classifyVerificationFailure(input: any): "not_executed" | "environment_blocked" | "verification_failed" | "passed";
export declare function buildAcceptanceEvidenceGateSummary(coverage?: any[]): any;
export declare function formatAcceptanceEvidenceGateSummaryLine(summary: any): string;
export declare function acceptanceEvidenceGateSummaryErrors(summary: any, coverage?: any[], label?: string): string[];
