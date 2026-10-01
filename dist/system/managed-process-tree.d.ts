import { ChildProcess } from "child_process";
export type ManagedProcessStopReceiptV2 = {
    schema: "ccm-managed-process-stop-receipt-v2";
    operation_id: string;
    pid: number;
    requested_at: string;
    finished_at: string;
    graceful_signal: string;
    forced: boolean;
    exited: boolean;
    elapsed_ms: number;
    error?: string;
};
export declare function processTreeRootExists(pid: number): boolean;
export declare function terminateManagedProcessTree(target: number | ChildProcess, options?: {
    gracefulTimeoutMs?: number;
    forceTimeoutMs?: number;
}): Promise<ManagedProcessStopReceiptV2>;
