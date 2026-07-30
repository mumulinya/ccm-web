import type { ServerResponse } from "http";
export type UserNotificationChannel = "web" | "desktop_pet" | "web_pet" | "feishu";
export type UserNotificationSeverity = "info" | "success" | "warning" | "error" | "critical";
export type UserNotificationState = "active" | "resolved";
export type UserNotificationDeliveryState = "pending" | "sending" | "delivered" | "failed" | "delivery_unknown";
export type UserNotificationV2 = {
    notification_id: string;
    recipient_user_id: string;
    source_type: string;
    source_channel: string;
    scope_type: "global" | "group" | "project" | "task" | "system" | "music";
    scope_id: string;
    exact_session_id: string;
    task_id: string;
    notification_type: string;
    severity: UserNotificationSeverity;
    state: UserNotificationState;
    title: string;
    summary: string;
    action: Record<string, any>;
    dedupe_key: string;
    event_checksum: string;
    created_at: string;
    updated_at: string;
    read_at: string;
    dismissed_at: string;
    resolved_at: string;
    expires_at: string;
};
export type UserNotificationDeliveryV2 = {
    delivery_id: string;
    notification_id: string;
    channel: UserNotificationChannel;
    state: UserNotificationDeliveryState;
    client_id: string;
    attempt_count: number;
    next_attempt_at: string;
    claimed_at: string;
    delivered_at: string;
    failed_at: string;
    last_error: string;
    created_at: string;
    updated_at: string;
};
export type PetNotificationProjectionV2 = {
    version: 2;
    notification_id: string;
    delivery_id: string;
    role: "status" | "ask" | "error" | "assistant";
    title: string;
    summary: string;
    severity: UserNotificationSeverity;
    action: Record<string, any>;
    created_at: string;
};
export declare function sanitizePetNotificationText(value: any, max?: number): string;
export declare function createPetSpeechNotification(input: {
    agent: string;
    role?: string;
    text: string;
    source?: string;
    task_id?: string;
    scope_id?: string;
    exact_session_id?: string;
    action?: Record<string, any>;
    dedupe_key?: string;
}): UserNotificationV2[];
export declare function createUserNotification(input: {
    recipient_user_ids?: string[];
    source_type: string;
    source_channel?: string;
    scope_type?: UserNotificationV2["scope_type"];
    scope_id?: string;
    exact_session_id?: string;
    task_id?: string;
    notification_type: string;
    severity?: UserNotificationSeverity;
    state?: UserNotificationState;
    title: string;
    summary: string;
    action?: Record<string, any>;
    dedupe_key: string;
    channels?: UserNotificationChannel[];
    expires_at?: string;
}): UserNotificationV2[];
export declare function subscribeUserNotifications(listener: (notification: UserNotificationV2) => void): () => boolean;
export declare function listUserNotifications(userId: string, options?: {
    cursor?: string;
    limit?: number;
    unreadOnly?: boolean;
}): {
    items: UserNotificationV2[];
    next_cursor: string;
};
export declare function unreadUserNotificationCount(userId: string): number;
export declare function mutateUserNotification(userId: string, notificationId: string, action: "read" | "dismiss"): boolean;
export declare function markAllUserNotificationsRead(userId: string): number;
export declare function resolveUserNotificationsByDedupeKey(dedupeKey: string): number;
export declare function listPendingPetDeliveries(options: {
    channel: "desktop_pet" | "web_pet";
    limit?: number;
    recipient_user_ids?: string[];
}): {
    notification: UserNotificationV2;
    delivery: UserNotificationDeliveryV2;
}[];
export declare function claimPetDelivery(deliveryId: string, clientId: string): boolean;
export declare function acknowledgePetDelivery(deliveryId: string, clientId: string): boolean;
export declare function failPetDelivery(deliveryId: string, error: any): void;
export declare function setNotificationDeliveryState(notificationId: string, channel: UserNotificationChannel, state: UserNotificationDeliveryState, details?: {
    client_id?: string;
    error?: any;
}): boolean;
export declare function projectPetNotification(notification: UserNotificationV2, delivery: UserNotificationDeliveryV2): PetNotificationProjectionV2;
export declare function handleUserNotificationsApi(pathname: string, req: any, res: ServerResponse, parsed: any): boolean;
export declare function runUserNotificationSelfTest(): {
    pass: boolean;
    projection: PetNotificationProjectionV2;
};
