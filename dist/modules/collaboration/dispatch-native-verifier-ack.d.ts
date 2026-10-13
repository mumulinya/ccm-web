/** The built-in read-only verifier is the assignment receiver. Confirm its
 * handoff before launching its CLI, never infer an ACK from a later result.
 * Developer assignments still require their own signed MCP acknowledgement. */
export declare function acknowledgeNativeVerifierAssignment(input: {
    envelope: any;
    taskId: string;
    groupId: string;
    targetName: string;
    handoff: any;
}): any;
