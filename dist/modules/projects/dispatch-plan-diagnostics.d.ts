/** Invalid contracts are diagnostics, never Task acceptance authorities. A
 * failed compiler result must still be persistable as a blocked task. */
export declare function dispatchPlanBlockDiagnostics(contract: any, validation: any): {
    contractId: any;
    planRevision: any;
    planChecksum: any;
    dispatchReady: boolean;
    blockers: any[];
    contentStored: boolean;
};
