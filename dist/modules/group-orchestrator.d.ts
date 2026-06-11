export declare const COORDINATOR_PROJECT = "coordinator";
export declare const DEFAULT_GROUP_ORCHESTRATOR: {
    enabled: boolean;
    mode: string;
    coordinatorProject: string;
    maxDepth: number;
};
export declare function defaultOrchestratorConfig(): {
    enabled: boolean;
    format: string;
    apiUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    timeoutMs: number;
    fallbackToRules: boolean;
};
export declare function loadOrchestratorConfig(): any;
export declare function saveOrchestratorConfig(updates: any): any;
export declare function publicOrchestratorConfig(config?: any): any;
export declare function createCoordinatorMember(agent?: string): {
    project: string;
    role: string;
    agent: string;
};
export declare function isCoordinatorMember(member: any, group?: any): boolean;
export declare function getCoordinatorProject(group: any): string;
export declare function getCoordinatorMember(group: any): any;
export declare function normalizeGroupOrchestrator(group: any): any;
export declare function isOrchestratorEnabled(group: any): boolean;
export declare function getRoutableMembers(group: any): any;
export declare function getMemberNames(group: any, excludeProject?: string): any;
export declare function selectGroupTargets(group: any, targetProject: string | undefined | null): {
    isBroadcast: boolean;
    orchestrated: boolean;
    targetLabel: any;
    members: any;
};
export declare function resolveMemberRuntime(projectName: string, group: any, configs: any[]): {
    project: string;
    workDir: any;
    agentType: any;
    configured: boolean;
};
export declare function buildRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function buildGroupCollaborationRules(memberList?: string): string;
export declare function buildCoordinatorCollaborationInstructions(memberList?: string): string;
export declare function buildMemberCollaborationInstructions(projectName: string, memberList?: string): string;
export declare function buildCoordinatorPrompt(input: {
    group: any;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
    extraInstructions?: string;
}): string;
export declare function buildMemberPrompt(input: {
    group: any;
    projectName: string;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
}): string;
export declare function analyzeRequirement(group: any, message: string, context?: string): {
    raw: string;
    summary: string;
    intent: string;
    domains: string[];
    deliverables: string[];
    constraints: string[];
    explicitProjects: any;
    missingInfo: string[];
    needsCoordination: boolean;
    contextSignal: string;
    confidence: number;
};
export declare function runCodedGroupOrchestrator(input: {
    group: any;
    message: string;
    context?: string;
    source?: string;
}): {
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: {
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        constraints: string[];
        explicitProjects: any;
        missingInfo: string[];
        needsCoordination: boolean;
        contextSignal: string;
        confidence: number;
    };
    content: string;
    executionOrder?: undefined;
} | {
    agent: any;
    delegated: any;
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
    }[];
    executionOrder: string;
    analysis: {
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        constraints: string[];
        explicitProjects: any;
        missingInfo: string[];
        needsCoordination: boolean;
        contextSignal: string;
        confidence: number;
    };
    content: string;
};
export declare function buildCodedCoordinatorSummary(group: any, outputs: string[]): {
    agent: any;
    content: string;
};
export declare function runLlmCoordinatorSummary(group: any, userMessage: string, outputs: string[]): Promise<{
    agent: any;
    content: string;
}>;
export declare function runLlmCoordinatorReview(group: any, userMessage: string, coordinatorPlan: string, outputs: string[], options?: {
    allowFollowUps?: boolean;
    round?: number;
}): Promise<{
    agent: any;
    status: string;
    followUps: any;
    gaps: any;
    conflicts: any;
    content: string;
    confidence: any;
}>;
export declare function decomposeRequirementWithCodedCoordinator(group: any, requirement: string): any;
export declare function runGroupOrchestrator(input: {
    group: any;
    message: string;
    context?: string;
    source?: string;
    sharedFilesContext?: string;
}): Promise<{
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    runtime: string;
    content: string;
    executionOrder?: undefined;
} | {
    agent: any;
    delegated: any[];
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
    }[];
    analysis: any;
    runtime: string;
    executionOrder: string;
    content: string;
} | {
    runtime: string;
    content: string;
    agent: any;
    delegated: any;
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
    }[];
    executionOrder: string;
    analysis: {
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        constraints: string[];
        explicitProjects: any;
        missingInfo: string[];
        needsCoordination: boolean;
        contextSignal: string;
        confidence: number;
    };
} | {
    agent: any;
    delegated: any[];
    assignments: any[];
    runtime: string;
    content: string;
}>;
