export type ConversationPermissionMode = "full_access" | "main_agent_only" | "ask_before_edit";
export type ConversationPermissionPolicy = {
    schema: "ccm-conversation-permission-policy-v1";
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    mode: ConversationPermissionMode;
    source: "user" | "manual_default" | "automation_default";
    approvalScope: "task";
    revision: number;
    generation: number;
    updatedAt: string;
};
export declare function readConversationPermissionPolicy(input: any): ConversationPermissionPolicy;
export declare function updateConversationPermissionPolicy(input: any): ConversationPermissionPolicy;
export declare function permissionSnapshotForTask(task: any): any;
export declare function authorizeProjectChildAgentStart(input: {
    task: any;
    project: string;
    workDir: string;
    agentType?: string;
}): Promise<{
    allowed: boolean;
    mode: any;
    snapshot: any;
    editApprovalId?: undefined;
    permissionRequest?: undefined;
    code?: undefined;
    message?: undefined;
} | {
    allowed: boolean;
    mode: any;
    snapshot: any;
    editApprovalId: string;
    permissionRequest?: undefined;
    code?: undefined;
    message?: undefined;
} | {
    allowed: boolean;
    mode: any;
    snapshot: any;
    editApprovalId: any;
    permissionRequest: any;
    code: string;
    message: string;
}>;
export declare function permissionPolicyChecksum(policy: ConversationPermissionPolicy): string;
