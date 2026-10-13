/** Task-owned memory is admitted by authority, never by an invented chat ID. */
export declare function isAuthoritativeGroupMemorySession(groupId: string, sessionId: string, expectedTaskId?: string): boolean;
