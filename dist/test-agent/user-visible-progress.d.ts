export type TestAgentVisibleProgressContext = {
    scope: "project" | "group";
    scopeId: string;
    exactSessionId: string;
    taskId: string;
    generation: number;
    attempt: number;
    anchorMessageId?: string;
    originMessageId?: string;
    projectId?: string;
    agentRunId: string;
};
export type TestAgentVisibleToolKind = "command" | "dev_server" | "http" | "browser" | "browser_tool";
export type TestAgentVisibleModelStage = "test_plan" | "test_plan_repair" | "test_followup";
type TestAgentVisibleToolInput = {
    kind: TestAgentVisibleToolKind;
    key: string;
    project: string;
    label: string;
    command?: string;
};
export declare function testAgentVisibleProgressContext(value: any): TestAgentVisibleProgressContext | null;
export declare function testAgentProgressRuntimeOptionsFromEnv(): {
    userVisibleProgressContext: TestAgentVisibleProgressContext;
} | {
    userVisibleProgressContext?: undefined;
};
export declare function beginTestAgentVisibleTool(contextValue: any, input: TestAgentVisibleToolInput): {
    toolCallId: string;
    finish(result?: any): void;
};
/**
 * TestAgent can run in a detached CLI process, so a real Provider retry must
 * be written to the same recoverable progress channel as its verification
 * tools. Normal planning remains covered by the enclosing TestAgent activity;
 * this emits only a retry that will actually be followed by another request.
 */
export declare function publishTestAgentVisibleModelRetry(contextValue: any, stage: TestAgentVisibleModelStage, notice: any): import("../system/user-visible-agent-events").UserVisibleAgentEvent;
export declare function readTestAgentVisibleProgress(file: string): any[];
export {};
