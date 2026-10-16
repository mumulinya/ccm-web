export declare function videoMediaScope(source: string, requiresAuth?: boolean): {
    owner: string;
    requiresAuth: boolean;
    accountEpoch: number;
};
export declare function requireVideoMediaAccess(record: any): void;
export declare function videoMediaVisible(record: any): boolean;
export declare const runWithVideoOwner: <T>(record: any, operation: () => T) => T;
export declare function trackVideoAuthorization(record: any, onRevoke: () => void): () => void;
export declare function revokeVideoMedia(owner: string, provider: string): void;
