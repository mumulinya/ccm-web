export type AcceptanceCheck = {
    id: string;
    projectId: string;
    workItemId: string;
    kind: "command" | "http" | "browser" | "scope_audit" | "receipt";
    cwd: string;
    command?: string;
    sourceEvidenceIds: string[];
    expected: string;
    assertion: {
        kind: "exit_code" | "json_equals" | "structured_result";
        value: unknown;
        pointer?: string;
    };
    independent: boolean;
};
export type AcceptanceCriterion = {
    id: string;
    projectId: string;
    workItemId: string;
    description: string;
    preconditions: string[];
    action: string;
    expected: string;
    /** AND of groups; alternatives inside each explicitly declared group use OR. */
    verificationGroups: string[][];
};
export type AcceptanceContract = {
    schema: "ccm-acceptance-contract-v1";
    taskId: string;
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    planId: string;
    planRevision: number;
    planChecksum: string;
    requirementChecksum: string;
    revision: number;
    level: "standard" | "strict";
    workItems: Array<{
        id: string;
        projectId: string;
        dependsOn: string[];
        editablePaths: string[];
        readOnlyPaths: string[];
        forbiddenPaths: string[];
        cleanupPaths: string[];
        synchronizedFixturePaths: Array<{
            path: string;
            allowedChanges: string[];
        }>;
    }>;
    criteria: AcceptanceCriterion[];
    checks: AcceptanceCheck[];
    checksum: string;
};
export declare function acceptanceHash(value: unknown): string;
export declare function relativeAcceptancePath(value: unknown): boolean;
export declare function sealAcceptanceContract(input: Omit<AcceptanceContract, "checksum">): AcceptanceContract;
export declare function validateAcceptanceContract(value: any): {
    valid: boolean;
    issues: string[];
};
export declare function taskAcceptanceContract(task: any): AcceptanceContract | null;
/** Task kind is not an acceptance route. Never classify development by route. */
export declare function isAcceptanceProjectionTask(task: any): boolean;
