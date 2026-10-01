import type { CodeIntelligenceResult, CodeIntelligenceToolName } from "./code-intelligence";
export declare function resolveCodeIntelligenceWorkerHeapMb(): number;
export declare function executeCodeIntelligenceToolInWorker(project: string, tool: CodeIntelligenceToolName, args: any): Promise<CodeIntelligenceResult & {
    diagnostics?: any[];
}>;
export declare function startCodeIntelligenceIndexRunInWorker(project: string, mode: "start" | "reindex" | "repair", reason?: string): Promise<any>;
export declare function getCodeIntelligenceWorkerStatus(): {
    schema: string;
    state: string;
    pid: number;
    heapLimitMb: number;
    rssMb: number;
    heapUsedMb: number;
    activeRuns: number;
    pendingRequests: number;
    restartSuppressed: boolean;
    contentStored: boolean;
};
export declare function runCodeIntelligenceWorkerSelfTest(): Promise<any>;
export declare function shutdownCodeIntelligenceWorker(): Promise<void>;
