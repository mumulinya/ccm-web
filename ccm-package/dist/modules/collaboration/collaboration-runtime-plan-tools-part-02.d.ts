export declare function getTaskAgentExecutionReadiness(task: any): any;
export declare function getExternalAgentRunnerStatus(): {
    active: boolean;
    status: any;
    detail: any;
    pid: number;
    process_alive: boolean;
    updated_at: any;
    age_ms: number;
    pending_requests: number;
    requests: number;
    results: number;
    last_result: any;
};
export declare function buildAgentProbeMatrix(devGroups: any[]): {
    total: number;
    executable: number;
    ready: number;
    blocked: number;
    missing: number;
    stale: number;
    failed_recent: number;
    group_total: number;
    group_ready: number;
    groups: {
        group_id: any;
        group_name: any;
        orchestratorEnabled: boolean;
        executable: any;
        ready: any;
        missing: any;
        stale: any;
        failed_recent: any;
        all_ready: any;
        targets: any;
    }[];
    targets: any[];
};
export declare function buildDailyDevAgentDiagnostics(): any;
export declare function runAgentCliProbeBatch(payload: any, ctx: CollabCtx): Promise<{
    success: boolean;
    dry_run: boolean;
    total: any;
    passed: number;
    failed: number;
    skipped: number;
    limit: number;
    include_ready: boolean;
    only_missing: boolean;
    auto_resume: boolean;
    resume_hint: string;
    targets: any;
    probe_matrix: any;
    message: string;
    timeout_ms?: undefined;
    results?: undefined;
} | {
    success: boolean;
    total: any;
    passed: number;
    failed: number;
    skipped: number;
    limit: number;
    include_ready: boolean;
    only_missing: boolean;
    timeout_ms: number;
    auto_resume: boolean;
    resume_hint: string;
    results: any[];
    probe_matrix: any;
    message: string;
    dry_run?: undefined;
    targets?: undefined;
}>;
export interface CollabCtx {
    PORT: number;
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number, metadata?: any) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    createFileChangeSnapshot: (workDir: string) => any;
    getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
    recordMetric: (agent: string, data: any) => void;
    toolManager: any;
    buildUploadedFilesContext: (files: any[], title?: string) => string;
    summarizeUploadedFiles: (files: any[]) => string;
    buildFilesContext: (files: any[], title?: string) => string;
    collectRequestBuffer: (req: any) => Promise<Buffer>;
    getMultipartBoundary: (contentType: string) => string;
    parseMultipart: (buffer: Buffer, boundary: string) => any;
    getSharedFilePath: (name: string) => string;
    createSharedFileRecord: (name: string, source?: string) => any;
    normalizeSharedFileList: (files: any[]) => any[];
    onTaskStatusChange?: (task: any, status: string, result?: string) => void | Promise<void>;
}
export declare function buildCoordinatorSharedFilesContext(ctx: CollabCtx, group: any): string;
export declare function buildTaskSourceDocumentsContext(task: any): string;
export declare function mergeCoordinatorDocumentContexts(...contexts: any[]): string;
export declare function runCollaborationProtocolSelfTest(): any;
export declare function getProjectExtraConfig(projectName: string): any;
export declare function normalizeProjectConfigList(value: any): string[];
export declare function getProjectAgentCapabilityProfile(projectName: string, workDir?: string): {
    project: string;
    configured: boolean;
    responsibility: string;
    capabilities: string[];
    writable_paths: string[];
    forbidden_paths: string[];
    delivery_contract: string;
    verification_source: string;
    verification_commands: string[];
    work_dir: string;
};
export declare function collectProjectPolicyViolations(actualFileChanges?: any[], evidenceExclusions?: any[]): any[];
export declare function buildAgentToolContext(ctx: CollabCtx, group: any, projectName: string, taskText?: string): {
    prompt: string;
    allowedTools: Required<Pick<import("../../tools/tool-manager").ToolScope, "mcp" | "skill">>;
    toolAudit: any;
    authorizationReadiness: {
        schema: string;
        dispatchReady: boolean;
        status: string;
        requested: {
            mcp: number;
            skill: number;
        };
        available: {
            mcp: any;
            skill: any;
        };
        missing: {
            missing_mcp_servers: any;
            missing_mcp_tools: any;
            missing_skills: any;
        };
        invalid_mcp_grants: any;
        unavailable: {
            mcp: any;
            skill: any;
        };
    };
    selectedRoleSkills: {
        name: import("../../skills/internal-skill-catalog").CcmInternalSkillName;
        kind: "shared" | "role" | "workflow";
        reason: string;
    }[];
};
