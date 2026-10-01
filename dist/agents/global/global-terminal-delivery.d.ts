export type GlobalRunTerminalReceiptV2 = {
    schema: "ccm-global-run-terminal-receipt-v2";
    supervisor_id: string;
    mission_id: string;
    global_run_id: string;
    session_id: string;
    outcome: "completed" | "failed" | "cancelled";
    report_checksum: string;
    settled_at: string;
    checksum: string;
};
export type GlobalTerminalDeliveryV1 = {
    schema: "ccm-global-terminal-delivery-v1";
    id: string;
    dedupe_key: string;
    supervisor_id: string;
    mission_id: string;
    global_run_id: string;
    session_id: string;
    source: string;
    kind: "memory" | "run" | "web_session" | "feishu" | "replay";
    state: "pending" | "sending" | "delivered" | "delivery_failed";
    attempts: number;
    max_attempts: number;
    next_attempt_at: string;
    last_error: string;
    created_at: string;
    updated_at: string;
    delivered_at: string;
};
export declare function createGlobalRunTerminalReceipt(input: any): GlobalRunTerminalReceiptV2;
export declare function ensureGlobalTerminalDeliveries(record: any, receipt: GlobalRunTerminalReceiptV2): GlobalTerminalDeliveryV1[];
export declare function listGlobalTerminalDeliveries(input?: {
    supervisorId?: string;
    states?: string[];
}): GlobalTerminalDeliveryV1[];
export declare function retryGlobalTerminalDelivery(id: string): GlobalTerminalDeliveryV1;
export declare function drainGlobalTerminalDeliveries(input: {
    supervisorId?: string;
    deliver: (delivery: GlobalTerminalDeliveryV1) => Promise<void>;
}): Promise<{
    total: number;
    results: GlobalTerminalDeliveryV1[];
}>;
