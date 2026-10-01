import { BrowserCheckExecutionIdentity, BrowserToolCallRecord, TestAgentBrowserToolExecutor } from "../types";
import { type TestAgentVisibleProgressContext } from "../user-visible-progress";
export interface RecordingBrowserToolExecutor {
    executor: TestAgentBrowserToolExecutor;
    getRecords: () => BrowserToolCallRecord[];
    runWithExecutionScope: <T>(execution: BrowserCheckExecutionIdentity, task: () => Promise<T>) => Promise<T>;
    getRecordIdsForExecution: (execution: BrowserCheckExecutionIdentity) => string[];
    transcriptPath: string;
}
export interface RecordingBrowserToolExecutorOptions {
    suppressDetails?: boolean;
    toolCallTimeoutMs?: number;
    userVisibleProgressContext?: TestAgentVisibleProgressContext | null;
}
export declare function createRecordingBrowserToolExecutor(input: TestAgentBrowserToolExecutor, artifactDir: string, options?: RecordingBrowserToolExecutorOptions): RecordingBrowserToolExecutor;
export declare function createStaticBrowserToolExecutor(input: {
    tools: string[];
    onListTools?: (options?: {
        signal?: AbortSignal;
        timeoutMs?: number;
    }) => string[] | Promise<string[]>;
    responses?: Record<string, any>;
    onCall?: (toolName: string, toolInput: Record<string, any>, options?: {
        signal?: AbortSignal;
        timeoutMs?: number;
    }) => any | Promise<any>;
}): TestAgentBrowserToolExecutor;
