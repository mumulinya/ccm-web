export type AutomationTaskSource = "requirement_pool" | "workbench" | "global_agent";
export type AutomationSessionScope = "project" | "group";
export interface AutomationSessionBinding {
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
}
export interface AutomationSessionResolutionSnapshot {
    schema: "ccm-automation-session-resolution-v1";
    taskSource: AutomationTaskSource;
    bindingId: string;
    bindingRevision: number;
    bindingChecksum: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    resolution: "explicit_binding" | "auto_created";
    resolvedAt: string;
}
export declare function normalizeAutomationTaskSource(value: any): AutomationTaskSource | null;
export declare function inferAutomationTaskSource(task: any): AutomationTaskSource | null;
export declare function listAutomationSessionBindings(scopeValue?: any, scopeIdValue?: any): {
    session: {
        id: string;
        title: string;
        sessionKind: string;
        archived: boolean;
    };
    runningTaskCount: number;
    taskCount: number;
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
}[];
export declare function bindAutomationSessionSources(input: {
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[] | string[];
    expectedRevision?: number;
    actor?: string;
    reason?: string;
}): {
    session: {
        id: string;
        title: string;
        sessionKind: string;
        archived: boolean;
    };
    runningTaskCount: number;
    taskCount: number;
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
};
export declare function replaceAutomationSessionSources(input: {
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[] | string[];
    expectedRevision?: number;
    actor?: string;
    reason?: string;
}): {
    session: {
        id: string;
        title: string;
        sessionKind: string;
        archived: boolean;
    };
    runningTaskCount: number;
    taskCount: number;
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
};
export declare function createBoundAutomationSession(input: {
    scope: AutomationSessionScope;
    scopeId: string;
    sources: AutomationTaskSource[] | string[];
    title?: string;
    actor?: string;
    reason?: string;
}): {
    session: {
        id: string;
        title: string;
        sessionKind: string;
        archived: boolean;
    };
    runningTaskCount: number;
    taskCount: number;
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
};
export declare function setAutomationSessionBindingStatus(bindingIdValue: any, statusValue: any, expectedRevision?: any, actor?: string, reason?: string): {
    session: {
        id: string;
        title: string;
        sessionKind: string;
        archived: boolean;
    };
    runningTaskCount: number;
    taskCount: number;
    schema: "ccm-automation-session-binding-v1";
    bindingId: string;
    scope: AutomationSessionScope;
    scopeId: string;
    exactSessionId: string;
    sources: AutomationTaskSource[];
    status: "active" | "draining" | "archived";
    revision: number;
    checksum: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    reason: string;
};
export declare function resolveAutomationSessionBinding(input: {
    scope: AutomationSessionScope;
    scopeId: string;
    source: AutomationTaskSource | string;
    title?: string;
    actor?: string;
}): {
    binding: {
        session: {
            id: string;
            title: string;
            sessionKind: string;
            archived: boolean;
        };
        runningTaskCount: number;
        taskCount: number;
        schema: "ccm-automation-session-binding-v1";
        bindingId: string;
        scope: AutomationSessionScope;
        scopeId: string;
        exactSessionId: string;
        sources: AutomationTaskSource[];
        status: "active" | "draining" | "archived";
        revision: number;
        checksum: string;
        createdAt: string;
        updatedAt: string;
        updatedBy: string;
        reason: string;
    };
    snapshot: AutomationSessionResolutionSnapshot;
    created: boolean;
};
export declare function listGlobalDispatchTargets(): ({
    scope: "project";
    scopeId: string;
    canonicalName: string;
    displayName: string;
    ready: boolean;
    unavailableReason: string;
} | {
    scope: "group";
    scopeId: string;
    canonicalName: string;
    displayName: string;
    ready: any;
    unavailableReason: string;
})[];
