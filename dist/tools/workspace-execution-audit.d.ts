/** Raw execution evidence belongs to local audit storage, never model messages. */
export declare function preserveWorkspaceExecutionAudit(identity: any, toolCallId: string, toolName: string, body: any): {
    schema: string;
    path: string;
    checksum: string;
};
