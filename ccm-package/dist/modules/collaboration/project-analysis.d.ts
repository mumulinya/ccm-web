type ProjectAnalysisDeps = {
    compactMemoryText: (value: any, max?: number) => string;
    compactPreserveLines: (value: any, max?: number) => string;
    getProjectExtraConfig: (projectName: string) => any;
    buildProjectMemoryPacket: (projectName: string, input?: any) => string;
};
export type GroupMainProjectSourceFileEvidence = {
    path: string;
    checksum: string;
    chars: number;
    content: string;
};
export type GroupMainProjectSourceEvidence = {
    project: string;
    workDir: string;
    status: "ready" | "empty" | "unavailable";
    selectedPaths: string[];
    files: GroupMainProjectSourceFileEvidence[];
    manifestChecksum: string;
    truncated: boolean;
    issue: string;
};
export type GroupMainPlanningSourceContext = {
    schema: "ccm-group-main-source-planning-v1";
    projects: GroupMainProjectSourceEvidence[];
    requestedProjects: string[];
    hydratedProjects: string[];
    checksum: string;
    totalChars: number;
    truncated: boolean;
    ready: boolean;
    issues: string[];
    rendered: string;
};
export declare function buildProjectCodeReadOnlyEvidence(project: string, workDir: string, message: string, options?: {
    maxFiles?: number;
    maxChars?: number;
}): GroupMainProjectSourceEvidence;
export declare function buildGroupMainPlanningSourceContext(group: any, message: string, configs: any[], options?: {
    targetProjects?: string[];
    maxProjects?: number;
}): GroupMainPlanningSourceContext;
export type ModelDrivenSourcePlanningReceiptV1 = {
    schema: "ccm-model-driven-source-planning-receipt-v1";
    rounds: number;
    sufficient: boolean;
    reason: string;
    planSteps: string[];
    impactScope: string[];
    clarificationQuestions: string[];
    requestedFiles: Array<{
        project: string;
        path: string;
        reason: string;
    }>;
    searchQueries: Array<{
        project: string;
        query: string;
    }>;
    tokenBudget: number;
    projectedTokens: number;
    checksum: string;
};
export declare function buildModelDrivenGroupPlanningSourceContext(group: any, message: string, configs: any[], options?: {
    targetProjects?: string[];
    maxRounds?: number;
}): Promise<GroupMainPlanningSourceContext & {
    modelPlanning: ModelDrivenSourcePlanningReceiptV1;
}>;
export declare function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string, deps?: Pick<ProjectAnalysisDeps, "compactMemoryText">): string;
export declare function buildGroupProjectAnalysisContext(group: any, message: string, ctx: any, configs: any[], deps: ProjectAnalysisDeps): string;
export {};
