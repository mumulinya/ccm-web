export declare function publishUserVisibleAssistantText(input: {
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation?: number;
    taskId?: string;
    turnId?: string;
    text: string;
    title?: string;
}): import("./user-visible-agent-events").UserVisibleAgentEvent;
export declare function projectCommittedGroupCompaction(input: {
    groupId: string;
    exactSessionId: string;
    result: any;
    reason?: string;
}): import("./user-visible-agent-events").UserVisibleAgentEvent;
