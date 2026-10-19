export declare function pendingStandaloneMcp(name: string): any;
export declare function configureStandaloneTransaction(id: string, input: any, principal: {
    userId: string;
    sessionId: string;
}): Promise<{
    transaction: {
        schema: "ccm-marketplace-transaction-v2";
        id: string;
        action: "install" | "update" | "uninstall";
        state: import("./marketplace-transactions").MarketplaceTransactionState;
        type: "mcp" | "skill";
        name: string;
        source: any;
        sourceFingerprint: string;
        materialHash: string;
        commandChecksum: string;
        catalogRevision: string;
        preview: any;
        installationId: string;
        runtimeState: string;
        resyncState: string;
        error: string;
        checkpoints: string[];
        activationExpiresAt: string;
        createdAt: string;
        updatedAt: string;
    };
    activation_token: string;
    requires_activation: boolean;
}>;
