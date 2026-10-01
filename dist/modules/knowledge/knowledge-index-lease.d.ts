export type KnowledgeIndexLease = {
    schema: "ccm-knowledge-index-lease-v1";
    ownerId: string;
    pid: number;
    hostname: string;
    acquiredAt: string;
    expiresAt: string;
    reason: string;
};
export declare function inspectKnowledgeIndexLease(): {
    active: boolean;
    lease: KnowledgeIndexLease;
};
export declare function acquireKnowledgeIndexLease(reason: string, leaseMs?: number): {
    acquired: boolean;
    lease: KnowledgeIndexLease;
};
export declare function renewKnowledgeIndexLease(ownerId: string, leaseMs?: number): boolean;
export declare function releaseKnowledgeIndexLease(ownerId: string): boolean;
export declare function waitForKnowledgeIndexLeaseRelease(timeoutMs?: number): Promise<boolean>;
