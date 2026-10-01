import { type SessionExecutionEvent } from "../../system/session-execution-ledger";
export declare function listGroupSessionExecutionEvents(groupId: string, groupSessionId: string): SessionExecutionEvent[];
export declare function appendGroupSessionExecutionEvent(groupIdInput: string, groupSessionIdInput: string, event: any): {
    id: string;
    hidden: true;
    attempt_id?: string;
    conversation_turn_id?: string;
    auditReceipt?: any;
    modelContent?: any;
    type: import("../../system/session-execution-ledger").SessionExecutionEventType;
    toolName: string;
    toolCallId: string;
    timestamp: string;
    runId: string;
    traceId: string;
    anchorMessageId: string;
    status: "error" | "running" | "ok";
    payload: any;
};
export declare function runGroupSessionExecutionLedgerSelfTest(): {
    pass: boolean;
    checks: {
        wroteUse: boolean;
        wroteResult: boolean;
        listedPair: boolean;
        rejectsNonExactSession: boolean;
    };
};
