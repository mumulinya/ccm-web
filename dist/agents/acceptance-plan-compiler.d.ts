import { type AcceptanceContract } from "./acceptance-contract";
/** Compilation copies explicit plan bindings; it never infers coverage from command names. */
export declare function compilePlanAcceptance(input: {
    taskId: string;
    scope: AcceptanceContract["scope"];
    scopeId: string;
    exactSessionId: string;
    generation: number;
    plan: any;
    workItems: any[];
    strict: boolean;
}): AcceptanceContract;
export declare const ACCEPTANCE_PLAN_DIRECTIVE = "CCM acceptance contract v1:\nEvery verification row MUST provide acceptanceCriterionIds (the confirmed requirement IDs), projectId,\ncwd (relative to the managed project root), sourceEvidenceIds (actually read sources), expected,\nkind, and assertion. Do not bind every command to every criterion.\nFor command checks use assertion {kind:\"exit_code\",value:0} ONLY for build/test-process completion;\nto prove a business return value execute the actual feature and emit JSON, then use\nassertion {kind:\"json_equals\",pointer:\"/field\",value:EXPECTED_VALUE_FROM_REQUIREMENT}.\nOutput matching, not command success alone, proves a business condition. Do not invent checks or sources.\nKeep fixtures constrained to explicitly named literal fields; no skipped assertions or fabricated success.\nAn unavailable verification is blocked, not passed. Missing evidence must be repaired before dispatch.\nDo not change the confirmed expected outcome or weaken a requirement without user confirmation.";
