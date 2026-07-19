export declare function buildUserReceiptReworkSummary(task: any, summary?: any, agentCoordination?: any): {
    schema: string;
    title: string;
    status: string;
    status_label: string;
    headline: string;
    gaps: any[];
    active_rework: {
        target: string;
        title: any;
        reason: string;
        at: any;
        status: any;
    }[];
    resolved: {
        target: any;
        title: string;
        reason: string;
        at: any;
        status: string;
    }[];
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function buildUserCoordinationAcknowledgement(task: any, assignments?: any[]): string;
export declare function sanitizeDispatchLaunchText(value: any, fallback?: string, max?: number): string;
export declare function normalizeGroupDispatchLaunchRowStatus(rawValue?: any): {
    status: string;
    label: string;
};
export declare function taskAgentInvocationMemoryOptions(edge: any): {
    invocationEdgeId?: undefined;
    parentInvocationEdgeId?: undefined;
    rootInvocationEdgeId?: undefined;
    branchId?: undefined;
    parentBranchId?: undefined;
    branchKind?: undefined;
    expectedLineageHeadChecksum?: undefined;
} | {
    invocationEdgeId: any;
    parentInvocationEdgeId: any;
    rootInvocationEdgeId: any;
    branchId: any;
    parentBranchId: any;
    branchKind: any;
    expectedLineageHeadChecksum: any;
};
export declare function taskAgentSessionLifecycleRunnerOptions(snapshot: any): {
    groupSessionId?: undefined;
    sessionLifecycleFence?: undefined;
} | {
    groupSessionId: string;
    sessionLifecycleFence: {
        schema: string;
        required: boolean;
        groupId: string;
        groupSessionId: string;
        lifecycleGeneration: number;
        lifecycleStatus: string;
        lifecycleHeadId: string;
        lifecycleHeadChecksum: string;
        memoryContextSnapshotId: string;
        memoryContextSnapshotChecksum: string;
    };
};
export declare function buildWorkerContinuationHandoff(task: any, targetProject?: string, options?: any): any;
export declare function extractMemoryDispatchFreshnessGate(memory: any): any;
export declare function renderMemoryDispatchFreshnessGateForContract(memory: any, handoff?: any): string;
export declare function buildChildAgentDevelopmentContract(targetProject: string, taskText?: string, options?: any): string;
export declare function isSuggestedOnlyVerification(value: any): boolean;
export declare function isFailedVerification(value: any): boolean;
export declare function splitEvidenceList(value: any): string[];
export declare function buildProjectAgentProfileContractLines(profile: any): string[];
