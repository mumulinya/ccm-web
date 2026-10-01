import type { ServerResponse } from "http";
export type ConversationEvent = {
    sequence: number;
    turn_id: string;
    attempt_id: string;
    at: string;
    payload: Record<string, any>;
};
export declare function readConversationEvents(turnId: string, attemptId: string, after?: number): ConversationEvent[];
export declare function appendConversationEvent(turnId: string, attemptId: string, payload: Record<string, any>): ConversationEvent;
export declare function streamConversationEvents(res: ServerResponse, turnId: string, attemptId: string, after?: number, terminal?: boolean): void;
export declare function captureConversationSse(res: ServerResponse, turnId: string, attemptId: string): void;
