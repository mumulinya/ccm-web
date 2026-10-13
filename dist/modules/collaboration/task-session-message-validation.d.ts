export declare function taskSessionExecutionIntent(payload: any, messageType: string): boolean;
/** Reject stale execution targets before the user's message becomes task history. */
export declare function validateTaskSessionExecutionTarget(task: any, payload: any, executionIntent: boolean): void;
