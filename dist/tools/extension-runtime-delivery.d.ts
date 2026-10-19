export declare function recordExtensionRuntimeDelivery(input: any): void;
export declare function extensionRuntimeDelivery(members: Array<{
    kind: string;
    name: string;
}>): {
    id: string;
    runtime: any;
    state: string;
    updatedAt: any;
    snapshotId: any;
    message: string;
}[];
export declare function retryExtensionRuntimeDelivery(id: string): {
    runtime: any;
    state: string;
    snapshotId: any;
};
export declare function deferredInstalledRuntimeDelivery(): {
    schema: string;
    success: boolean;
    state: string;
    requestedAt: string;
    message: string;
    summary: {
        scanned: number;
        selected: number;
        resynced: number;
        skipped: number;
        failed: number;
    };
    items: any[];
};
