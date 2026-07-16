export declare const TASK_AGENT_MEMORY_ENTRY_SYNC_SCHEMA = "ccm-task-agent-memory-entry-sync-v1";
export declare const TASK_AGENT_MEMORY_ENTRY_MANIFEST_SCHEMA = "ccm-task-agent-memory-entry-manifest-v1";
export declare function stripTaskAgentMemoryEntrySync(memory: any): any;
export declare function taskAgentMemorySemanticChecksum(memory: any): string;
export declare function buildTaskAgentMemoryEntryManifest(memoryInput: any): {
    manifest_checksum: string;
    source_memory_context_checksum: string;
    entry_contents: Record<string, any>;
    schema: string;
    version: number;
    group_id: string;
    group_session_id: string;
    entries: Record<string, any>;
};
export declare function verifyTaskAgentMemoryEntryManifest(manifest: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildTaskAgentMemoryEntrySyncPlan(input: {
    memory: any;
    groupId: string;
    groupSessionId: string;
    taskId: string;
    taskAgentSessionId: string;
    targetProject: string;
    previousSnapshotId?: string;
    previousSnapshotChecksum?: string;
    previousManifest?: any;
    previousTrusted?: boolean;
    renderLease?: any;
}): any;
export declare function verifyTaskAgentMemoryEntrySyncPlan(plan: any, expected?: any): {
    valid: boolean;
    issues: string[];
    mode: string;
};
export declare function attachTaskAgentMemoryEntrySyncPlan(memoryInput: any, plan: any): any;
export declare function taskAgentMemoryEntrySyncPlan(memory: any): any;
export declare function taskAgentMemoryTransport(memory: any): {
    present: boolean;
    valid: boolean;
    issues: string[];
    mode: string;
    text: string;
    plan: any;
};
