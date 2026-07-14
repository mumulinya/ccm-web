type FeishuDestination = {
    chat_id: string;
    open_id: string;
    receive_id: string;
    receive_id_type: "chat_id" | "open_id";
    platform_session_key: string;
};
export declare function resolveFeishuDestination(payload?: any, sessionId?: string): FeishuDestination | null;
export declare function bindFeishuTaskContext(input: {
    sessionId?: string;
    destination?: FeishuDestination | null;
    runIds?: any[];
    missionIds?: any[];
    taskIds?: any[];
    source?: string;
}): {
    id: any;
    session_ids: string[];
    run_ids: string[];
    mission_ids: string[];
    task_ids: string[];
    chat_id: string;
    open_id: string;
    receive_id: string;
    receive_id_type: "chat_id" | "open_id";
    platform_session_key: string;
    source: any;
    created_at: any;
    updated_at: string;
};
export declare function bindFeishuIdentifiersFromValue(sessionId: string, value: any, destination?: FeishuDestination | null): {
    id: any;
    session_ids: string[];
    run_ids: string[];
    mission_ids: string[];
    task_ids: string[];
    chat_id: string;
    open_id: string;
    receive_id: string;
    receive_id_type: "chat_id" | "open_id";
    platform_session_key: string;
    source: any;
    created_at: any;
    updated_at: string;
};
export declare function hasFeishuTaskBinding(input: any): boolean;
export declare function notifyFeishuTaskStage(input: {
    stage: string;
    title: string;
    markdown: string;
    dedupeKey?: string;
    runId?: string;
    missionId?: string;
    taskId?: string;
    sessionId?: string;
}): Promise<{
    success: boolean;
    queued: boolean;
    reason: string;
    duplicate?: undefined;
    delivery?: undefined;
} | {
    success: boolean;
    queued: boolean;
    duplicate: boolean;
    delivery: any;
    reason?: undefined;
} | {
    success: boolean;
    queued: boolean;
    delivery: any;
    reason?: undefined;
    duplicate?: undefined;
}>;
export declare function tickFeishuNotificationOutbox(now?: Date): Promise<{
    due: any;
    sent: number;
    failed: number;
}>;
export declare function recordFeishuReportDelivery(input: {
    kind: "daily" | "weekly";
    reportId: string;
    success: boolean;
    attemptedAt?: string;
    messageId?: string;
    error?: string;
    targetType?: string;
}): {
    id: string;
    kind: "daily" | "weekly";
    report_id: string;
    attempted_at: string;
    success: boolean;
    message_id: string;
    error: string;
    target_type: string;
};
export declare function getFeishuChannelDeliverySnapshot(limit?: number): {
    deliveries: any;
    reports: any;
};
export declare function recordFeishuInbound(input: {
    payload?: any;
    sessionId?: string;
    messageId?: string;
}): FeishuDestination;
export declare function notifyFeishuTaskStatus(task: any, status: string, result?: string): Promise<{
    success: boolean;
    queued: boolean;
    reason: string;
    duplicate?: undefined;
    delivery?: undefined;
} | {
    success: boolean;
    queued: boolean;
    duplicate: boolean;
    delivery: any;
    reason?: undefined;
} | {
    success: boolean;
    queued: boolean;
    delivery: any;
    reason?: undefined;
    duplicate?: undefined;
}>;
export declare function feishuRuntimeEventPresentation(event: any): {
    stage: string;
    title: string;
    markdown: string;
};
export declare function getFeishuChannelHealth(expectedPort?: number): {
    inbound: any;
    outbound: any;
    outbox: {
        pending: any;
        exhausted: any;
        sent: any;
    };
    reports: {
        daily_enabled: boolean;
        weekly_enabled: boolean;
    };
    report_deliveries: {
        sent: any;
        failed: any;
        last: any;
    };
    pid: number;
    process_alive: boolean;
    socket_connected: boolean;
    last_connected_at: string;
    last_disconnected_at: string;
    process_started_at: string;
    target_port: number;
    expected_port: number;
    endpoint_current: boolean;
    pending_turn_since: string;
    turn_stalled: boolean;
    schema: string;
    healthy: boolean;
    checked_at: string;
    control_bot_ready: boolean;
    webhook_ready: boolean;
};
export declare function runFeishuChannelSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        platform_session_parsed: boolean;
        direct_event_targeted: boolean;
        progress_status_supported: boolean;
        test_agent_event_supported: boolean;
        plan_event_supported: boolean;
        cross_process_delivery_lease: boolean;
        secrets_redacted: boolean;
    };
};
export {};
