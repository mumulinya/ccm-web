export declare const AGENT_QA_TIMEOUT_MS: number;
type AgentQaServiceDeps = {
    getTaskById?: (taskId: string) => any;
    updateTask?: (taskId: string, updates: any) => any;
    writeSse?: (res: any, data: any) => void;
};
export declare function configureAgentQaService(next: AgentQaServiceDeps): void;
export declare function loadAgentQaItems(): any[];
export declare function saveAgentQaItems(items: any[]): void;
export declare function upsertAgentQaItem(item: any): any;
export declare function markExpiredAgentQaItems(groupId?: string): any[];
export declare function getAgentQaItemsForGroup(groupId: string, limit?: number): any[];
export declare function setAgentQaManualTakeover(id: string, reason?: string): any;
export declare function buildAgentQaUserPreview(qa?: any, kind?: string): {
    schema: string;
    from: string;
    to: string;
    label: string;
    status: string;
    summary: string;
    question: string;
    answer: string;
    next_action: string;
    badges: string[];
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
    };
};
export declare function buildAgentQaMessage(kind: "question" | "progress" | "answer" | "resume", qa: any, content?: string): {
    id: string;
    role: string;
    agent: any;
    type: string;
    content: string;
    display_content: string;
    timestamp: string;
    task_id: any;
    qa: any;
};
export declare function emitAgentQaEvent(streamRes: any, kind: "question" | "progress" | "answer" | "resume", qa: any, content?: string): void;
export declare function setAgentQaArbitration(id: string, decision: "accept" | "reject", reason?: string): any;
export declare function appendAgentQaTrace(taskId: string, type: string, qa: any, message: string, status?: string, data?: any): string;
export declare function writeAcceptedAgentQaToProjectMemory(qa: any): any;
export {};
