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
export declare function buildAgentQaMessage(kind: "question" | "answer" | "resume", qa: any, content?: string): {
    id: string;
    role: string;
    agent: any;
    type: string;
    content: any;
    timestamp: string;
    task_id: any;
    qa: any;
};
export declare function emitAgentQaEvent(streamRes: any, kind: "question" | "answer" | "resume", qa: any, content?: string): void;
export declare function setAgentQaArbitration(id: string, decision: "accept" | "reject", reason?: string): any;
export declare function appendAgentQaTrace(taskId: string, type: string, qa: any, message: string, status?: string, data?: any): string;
export declare function writeAcceptedAgentQaToProjectMemory(qa: any): any;
export {};
