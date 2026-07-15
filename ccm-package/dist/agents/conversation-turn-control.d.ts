import type { IncomingMessage, ServerResponse } from "http";
export type ConversationTurnScope = "global" | "group" | "project" | "feishu";
export type ConversationTurnMode = "steer" | "queue";
export type ConversationTurnStatus = "queued" | "applied" | "sending" | "completed" | "failed" | "cancelled";
export type ConversationTurnRecord = {
    id: string;
    request_id: string;
    scope: ConversationTurnScope;
    conversation_id: string;
    mode: ConversationTurnMode;
    message: string;
    attachments: any[];
    status: ConversationTurnStatus;
    active_run_id: string;
    metadata: Record<string, any>;
    retry_count: number;
    recovery_count: number;
    error: string;
    result: any;
    created_at: string;
    updated_at: string;
    claimed_at: string;
    settled_at: string;
};
export declare class ConversationTurnControlStore {
    readonly file: string;
    constructor(file?: string);
    private read;
    private mutate;
    recoverInterrupted(): {
        recovered: number;
        turns: ConversationTurnRecord[];
    };
    enqueue(input: any): {
        turn: ConversationTurnRecord;
        duplicate: boolean;
    };
    list(input?: any): {
        generation: number;
        updated_at: string;
        turns: {
            position: number;
            id: string;
            request_id: string;
            scope: ConversationTurnScope;
            conversation_id: string;
            mode: ConversationTurnMode;
            message: string;
            attachments: any[];
            status: ConversationTurnStatus;
            active_run_id: string;
            metadata: Record<string, any>;
            retry_count: number;
            recovery_count: number;
            error: string;
            result: any;
            created_at: string;
            updated_at: string;
            claimed_at: string;
            settled_at: string;
        }[];
    };
    claim(input: any): ConversationTurnRecord;
    settle(input: any): ConversationTurnRecord;
    cancel(id: string, reason?: string): ConversationTurnRecord;
    retry(id: string): ConversationTurnRecord;
}
export declare const conversationTurnControl: ConversationTurnControlStore;
export declare function handleConversationTurnControlApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any): boolean;
export declare function runConversationTurnControlSelfTest(): {
    pass: boolean;
    checks: {
        idempotentEnqueue: boolean;
        fifoClaim: boolean;
        restartRecovery: boolean;
        terminalStates: boolean;
        persistedSchema: boolean;
    };
};
