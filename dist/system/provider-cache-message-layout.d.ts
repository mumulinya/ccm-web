export declare function insertDynamicSystemAfterStableCore(messagesInput: any[], contentInput: any): any[];
/**
 * Compose one fixed system head followed by an append-only transcript.
 * Dynamic controls are placed after the transcript. They are request-scoped
 * metadata, not conversation facts; keeping them out of the leading history
 * means a refreshed planning/session block cannot invalidate every committed
 * turn on the next request.
 */
export declare function composeNativeMessagesWithDynamicBoundary(systemInput: any[], historyInput: any[]): any[];
