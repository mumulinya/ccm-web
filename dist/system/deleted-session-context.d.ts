/** Keep audit receipts, but revoke the exact conversation's recoverable model context. */
export declare function clearDeletedSessionContext(scope: 'project' | 'group' | 'global', scopeId: string, sessionId: string): {
    hotCleared: number;
    deleted: boolean;
    planChecksum: string;
    blockCount: number;
    totalTokens: number;
    success: boolean;
};
