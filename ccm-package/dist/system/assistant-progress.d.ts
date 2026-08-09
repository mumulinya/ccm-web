export type AssistantProgressKind = "before_tools" | "key_finding" | "direction_change" | "blocker" | "rework" | "verification" | "before_summary";
export declare function normalizeAssistantProgressKind(value: any, fallback?: AssistantProgressKind): AssistantProgressKind;
export declare function sanitizeAssistantProgressText(value: any, max?: number): string;
export declare function buildAssistantProgressFallback(requests: any[]): "我先整理当前目标和验收边界，再把需要执行的部分交给对应项目 Agent。" | "我先运行相关检查，确认当前结果是否满足验收要求。" | "我先检索当前作用域的知识与来源，核对回答所需的事实。" | "我先检查当前代码状态和变更记录，确认实际影响范围。" | "我先定位相关代码、符号和配置，再根据结果继续判断。" | "我先检查相关项目结构和当前配置。" | "我先核对完成当前请求所需的信息。";
export declare function assistantProgressMilestoneChecksum(input: {
    kind: AssistantProgressKind;
    text: string;
    modelCallIndex: number;
    relatedToolCallIds?: string[];
}): string;
export declare function assistantProgressNarrationEnabled(config: any): boolean;
