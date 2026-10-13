import { type ResolvedProjectTestTarget } from "./project-test-targets";
export declare function buildProjectTestTargetBrowserChecks(target: ResolvedProjectTestTarget, workDir: string): any[];
export declare function projectTestAgentProblems(review: any): string[];
export declare function projectTestAgentReworkProblems(review: any): string[];
export declare function scopeAuditForTask(task: any, actualFiles: string[], workspacePath?: string): {
    status: string;
    outOfScopeFiles: string[];
    advisoryFiles: string[];
};
export declare function runProjectTaskTestAgentReview(input: {
    task: any;
    project: string;
    workDir: string;
    workerResults: any[];
    acceptanceCriteria?: string[];
    workItems?: any[];
    fallbackVerificationCommands?: string[];
    round: number;
    reviewCycleId?: string;
    issuedBy?: string;
    previousReview?: any;
}): Promise<any>;
