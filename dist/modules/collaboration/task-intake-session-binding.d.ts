/** A task without a chat origin uses a stable private execution identity. */
export declare function prepareTaskIntakeSessionBinding(task: any): {
    taskGroupId: string;
    requestedProject: string;
    taskGroupSessionId: string;
    taskProjectSessionId: string;
    sourceConversationRef: any;
    targetConversationRef: any;
    exactSessionId: string;
};
/** Planning/backlog resolution must not create a public conversation. */
export declare function prepareTaskExecutionSession(input: any): {
    created: boolean;
    snapshot: {
        schema: string;
        scope: any;
        scopeId: any;
        exactSessionId: string;
        resolution: string;
        bindingChecksum: string;
    };
};
