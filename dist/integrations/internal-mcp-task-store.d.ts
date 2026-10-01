import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export type InternalMcpTaskJournalEntry = {
    schema: "ccm-internal-mcp-task-event-v1";
    id: string;
    at: string;
    task_id: string;
    group_id: string;
    project: string;
    role: string;
    actor: string;
    kind: "todo" | "progress" | "delivery" | "decision" | "workspace" | "test";
    payload: Record<string, any>;
};
export declare function internalMcpTaskJournalFile(taskId: string): string;
declare function cleanText(value: any, max?: number): string;
declare function cleanList(value: any, max?: number, itemMax?: number): string[];
export declare function getBoundInternalMcpTask(context: InternalMcpTaskContext): any;
export declare function readInternalMcpTaskJournal(taskId: string, limit?: number): InternalMcpTaskJournalEntry[];
export declare function appendInternalMcpTaskJournal(context: InternalMcpTaskContext, kind: InternalMcpTaskJournalEntry["kind"], payload: Record<string, any>, timeline: {
    type: string;
    title: string;
    detail: string;
    status?: string;
    phase?: string;
}): InternalMcpTaskJournalEntry;
export declare function publicInternalMcpTaskContext(context: InternalMcpTaskContext): {
    schema: string;
    task: {
        id: any;
        title: string;
        goal: string;
        status: string;
        phase: string;
        acceptance_criteria: string[];
        constraints: string[];
        target_project: string;
        parent_task_id: string;
        work_items: any;
    };
    binding: {
        project: string;
        role: import("./internal-mcp-runtime").InternalMcpAgentRole;
        group_id: string;
        work_dir: string;
    };
    todo: Record<string, any>;
    recent_progress: InternalMcpTaskJournalEntry[];
    pending_user_decisions: InternalMcpTaskJournalEntry[];
};
export declare const internalMcpTaskPayload: {
    cleanText: typeof cleanText;
    cleanList: typeof cleanList;
};
export {};
