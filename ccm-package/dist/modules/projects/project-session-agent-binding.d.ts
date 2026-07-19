export declare const PROJECT_WEB_SESSION_AGENT_GROUP = "project-chat";
export declare function buildProjectSessionAgentScopeId(project: string, projectSessionId: string): string;
export declare function acquireProjectSessionAgentDispatch(project: string, projectSessionId: string): {
    acquired: boolean;
    scopeId: string;
};
export declare function releaseProjectSessionAgentDispatch(scopeId: string): boolean;
export declare function isProjectSessionAgentDispatchActive(project: string, projectSessionId: string): boolean;
export declare function getProjectSessionAgentBinding(project: string, projectSessionId: string): {
    schema: string;
    project: string;
    project_session_id: string;
    scope_id: string;
    generation: any;
    task_agent_session_id: any;
    native_session_id: any;
    provider: any;
    resume_mode: any;
    turn_count: number;
    status: string;
    generation_count: any;
};
export declare function bindProjectSessionAgentExecution(input: {
    project: string;
    projectSessionId: string;
    agentType: string;
}): {
    session: any;
    options: {
        sessionId: string;
        resumeSession: boolean;
        persistSession: boolean;
        expectedProviderContractId: string;
        providerContractId: string;
        providerRuntimeVersion: string;
        runtimeSnapshotId: string;
        mcpConfigPath: string;
    };
    binding: {
        schema: string;
        project: string;
        project_session_id: string;
        scope_id: string;
        generation: any;
        task_agent_session_id: any;
        native_session_id: any;
        provider: any;
        resume_mode: any;
        turn_count: number;
        status: string;
        generation_count: any;
    };
};
export declare function rotateProjectSessionAgentBinding(project: string, projectSessionId: string, reason?: string): {
    scopeId: string;
    closed: import("../../tasks/agent-sessions-shared-part-01").TaskAgentSession[];
    nextGeneration: any;
};
export declare function purgeProjectSessionAgentBinding(project: string, projectSessionId: string): {
    scopeId: string;
    removed: any;
};
export declare function reopenProjectSessionAgentBinding(project: string, projectSessionId: string, reason?: string): {
    scopeId: string;
    reopened: import("../../tasks/agent-sessions-shared-part-01").TaskAgentSession[];
};
