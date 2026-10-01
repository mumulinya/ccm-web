export declare function projectQueuedTurnRequest(turn: any, identity: {
    resourceId: string;
    sessionId: string;
}, files: any[]): {
    project: string;
    session_id: string;
    message: any;
    files: any[];
    client_message_id: string;
    assistant_message_id: string;
    parent_run_id: any;
    conversation_turn_id: any;
    discussion_task_id: any;
    new_topic: boolean;
    resolved_route: any;
    resolved_candidate_task_id: any;
    clarification_payload: any;
    source: string;
};
