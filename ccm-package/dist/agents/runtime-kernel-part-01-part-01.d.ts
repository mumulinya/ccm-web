export type AgentRuntimeScope = "global" | "group" | "worker";
export type AgentRuntimeRisk = "read" | "write" | "high" | "agent";
export type AgentRuntimeDecision = "allow" | "ask" | "deny";
export interface AgentRuntimeLifecycleInput {
    scope: AgentRuntimeScope;
    traceId?: string;
    taskId?: string;
    groupId?: string;
    runId?: string;
    agent?: string;
    action: string;
    phase?: string;
    risk?: AgentRuntimeRisk;
    target?: string;
    status?: "planned" | "running" | "ok" | "blocked" | "error" | "skipped";
    message?: string;
    data?: any;
}
export interface AgentPermissionRule {
    id: string;
    scope: AgentRuntimeScope | "all";
    action: string;
    target?: string;
    risk?: AgentRuntimeRisk | "all";
    decision: AgentRuntimeDecision;
    reason: string;
}
export declare const DEFAULT_PERMISSION_RULES: AgentPermissionRule[];
export declare function compact(value: any, max?: number): string;
export declare function hash(value: any, len?: number): string;
export declare function uniqueRuntimeStrings(values?: any[], limit?: number): string[];
export declare function renderWorkerPacketMemory(memory: any): any;
export declare function extractWorkerTypedMemoryRecall(memory?: any): any;
export declare function extractWorkerTypedMemoryDeliveryCapsule(memory?: any): any;
export declare function workerGroupMemoryContext(memory?: any): any;
export declare function buildWorkerTypedMemoryDeliveryExpectedBinding(input?: any, memoryInput?: any): any;
export declare function buildWorkerTypedMemoryDeliveryLease(capsuleInput?: any, options?: any): any;
export declare function validateWorkerTypedMemoryDeliveryLease(leaseInput?: any, options?: any): any;
export declare function buildWorkerTypedMemoryDispatchTicket(input?: any, options?: any): any;
export declare function validateWorkerTypedMemoryDispatchTicket(ticketInput?: any, options?: any): any;
export declare function rebuildWorkerTypedMemoryDeliveryForModelContext(memoryInput: any, targetContextWindow: any): {
    rebuilt: boolean;
    memory: any;
    capsule: any;
    lease: any;
    reason: string;
    previous_model_context_window?: undefined;
    current_model_context_window?: undefined;
    previous_capsule_checksum?: undefined;
    current_capsule_checksum?: undefined;
} | {
    rebuilt: boolean;
    memory: any;
    capsule: any;
    lease: any;
    previous_model_context_window: number;
    current_model_context_window: number;
    previous_capsule_checksum: string;
    current_capsule_checksum: any;
    reason?: undefined;
};
export declare function validateWorkerTypedMemoryDeliveryCapsule(input?: any, options?: any): any;
export declare function renderWorkerTypedMemoryDeliveryCapsule(capsuleInput?: any, expectedBinding?: any): string;
