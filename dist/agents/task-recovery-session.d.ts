import type { TaskContextAnchor } from "./session-contamination-detector";
/** Persisted inside the task's SQLite CAS transaction, not a second JSON ledger. */
export type RecoveryExecutionSession = {
    id: string;
    taskId: string;
    workItemIds: string[];
    sourceExecutionSessionId: string;
    conversationSessionId: string;
    sourceConversationSessionId: string;
    recoveryReason: string;
    action: "resume" | "retry" | "replan";
    sourceContextRevision: number;
    sourceContextChecksum: string;
    generation: number;
    attempt: number;
    transactionId: string;
    agentSessionIds: string[];
    replacedAgentSessionIds: string[];
    anchor: TaskContextAnchor;
    createdAt: string;
    contentStored: false;
};
export declare function buildRecoverySessionRecord(task: any, userSession: any, transaction: any, activation: any, action?: RecoveryExecutionSession["action"]): RecoveryExecutionSession;
/** Status is derived from authoritative attempt spans; workers cannot mark recovery completed. */
export declare function projectTaskRecoverySessions(task: any): any;
