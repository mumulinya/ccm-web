export type ModelActivityPhase = "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis";
export type ModelActivityState = "started" | "waiting" | "retrying" | "streaming" | "completed" | "failed";
export declare function modelActivityDefaultLabel(phase: ModelActivityPhase): "已取得检查结果，正在归纳关键结论" | "验证结果已返回，正在核对交付条件" | "执行结果已收口，正在整理最终结论" | "正在确定下一步需要核对的项目信息" | "正在理解当前需求并核对必要上下文";
export declare function createModelActivityController(input: {
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    modelCallIndex: number;
    phase: ModelActivityPhase;
    label?: string;
    generation?: number;
    taskId?: string;
    anchorMessageId?: string;
    waitingThresholdMs?: number;
    onActivity?: (activity: any) => void;
}): {
    eventId: string;
    onDelta(delta: string): void;
    onRetry(attempt: number): void;
    updateLabel(label: string): void;
    complete(): void;
    fail(): void;
};
/** Extracts only a JSON string field after an allowed response type is known. */
export declare function createSafeJsonReplyDeltaExtractor(onDelta?: (delta: string) => void): {
    push(chunk: string): void;
    readonly emitted: boolean;
};
export declare function streamDeltaChecksum(input: {
    runId: string;
    modelCallIndex: number;
    sequence: number;
    delta: string;
}): string;
