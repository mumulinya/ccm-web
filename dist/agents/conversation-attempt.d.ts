type AttemptBinding = {
    id: string;
    attempt_id: string;
    scope: string;
    conversation_id: string;
    current: () => any;
    pauseAtBoundary: (checkpoint: string) => any;
};
export declare function currentConversationAttemptBinding(scope: string, conversationId: string): AttemptBinding;
export declare function withConversationAttemptScope<T extends (...args: any[]) => any>(callback: T): T;
export declare function confirmConversationPauseAtBoundary(binding: AttemptBinding | undefined, checkpoint: string): void;
export declare function runWithConversationAttempt<T>(store: any, turn: any, callback: () => T): T;
export declare function bindConversationMessage(message: any, scope: string, conversationId: string): any;
export declare function bindConversationLedgerEvent(input: any): any;
export declare function conversationAttemptId(turn: any): string;
export declare function attemptConflict(message?: string): Error & {
    code: string;
    statusCode: number;
};
export declare function requireConversationAttempt(turn: any, input: any, required?: boolean): void;
export declare function validateConversationMutation(store: any, pathname: string, input: any): void;
export declare function conversationTurnActions(turn: any, canMutate?: boolean): string[];
export declare function projectConversationMutationResult(store: any, result: any, principal: any): any;
export declare function bindConversationAttemptResponse(res: object, store: any, input: any): void;
export declare function projectConversationAttemptEvent(res: object, event: any): any;
export declare function failConversationAttemptResponse(res: any, error: any): void;
export declare function validateConversationSettlement(turn: any, input: any): boolean;
export {};
