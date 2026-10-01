export type CcmReadonlyInspectionSandboxReceiptV1 = {
    schema: "ccm-readonly-inspection-sandbox-receipt-v1";
    projectId: string;
    repoStateChecksum: string;
    snapshotChecksum: string;
    containment: "os_isolated" | "unavailable";
    networkAllowed: false;
    workspaceMutationDetected: boolean;
    resourceLimitExceeded: boolean;
    contentStored: false;
};
export declare function runReadonlyInspectionSandbox(input: {
    projectId: string;
    sourceRoot: string;
    repoStateChecksum: string;
    executable: string;
    args: string[];
    timeoutMs: number;
    maxBytes: number;
    signal?: AbortSignal;
}): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    truncated: boolean;
    workspaceChanged: boolean;
    sandboxReceipt: CcmReadonlyInspectionSandboxReceiptV1;
}>;
