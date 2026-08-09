export declare const TASK_TRANSITION_SCHEMA: "ccm-task-transition-event-v1";
export type TaskTransitionEvent = {
    schema: typeof TASK_TRANSITION_SCHEMA;
    eventId: string;
    taskId: string;
    revision: number;
    from: string;
    to: string;
    actor: string;
    reasonCode: string;
    createdAt: string;
    checksum: string;
    contentStored: false;
};
export declare function appendTaskTransitionEvent(input: any): TaskTransitionEvent;
export declare function listTaskTransitionEvents(taskId: string, limit?: number): any;
export declare function reduceTaskTransitionEvents(taskId: string, initial?: any): any;
export declare function runTaskTransitionLedgerSelfTest(): {
    pass: boolean;
    event: TaskTransitionEvent;
    reduced: any;
};
