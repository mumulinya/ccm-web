import { BrowserToolCallRecord, TestAgentBrowserToolExecutor } from "../types";
export interface RecordingBrowserToolExecutor {
    executor: TestAgentBrowserToolExecutor;
    getRecords: () => BrowserToolCallRecord[];
    transcriptPath: string;
}
export declare function createRecordingBrowserToolExecutor(input: TestAgentBrowserToolExecutor, artifactDir: string): RecordingBrowserToolExecutor;
export declare function createStaticBrowserToolExecutor(input: {
    tools: string[];
    responses?: Record<string, any>;
    onCall?: (toolName: string, toolInput: Record<string, any>) => any | Promise<any>;
}): TestAgentBrowserToolExecutor;
