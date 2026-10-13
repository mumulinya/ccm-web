/** Rebuilding MCP tools for a memory budget or Runtime fallback must retain
 * the original server-issued communication fence. */
export declare function dispatchCommunicationMcpIdentity(envelope: any): {
    communicationMessageId: any;
    communicationGeneration: any;
    communicationAttempt: any;
    communicationLeaseId: any;
};
/** Only the persisted CCM task can waive the model ACK, never receipt payloads. */
export declare function communicationRequiresDispatchAck(taskId: string): boolean;
