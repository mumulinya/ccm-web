import type { WorkflowDecision } from "../workflow-decision";
import type { GlobalAgentRun, GlobalAgentToolRisk } from "./loop";
export type GlobalWriteAuthorizationReceiptV2 = {
    schema: "ccm-global-write-authorization-receipt-v2";
    id: string;
    principal: {
        kind: "browser" | "feishu" | "internal";
        id: string;
        role: string;
        capabilities: string[];
    };
    source: string;
    session_id: string;
    message_checksum: string;
    decision_checksum: string;
    directive: "grant" | "preserve" | "revoke";
    allowed_risk: "read" | "write";
    tool_family: "none" | "dispatch" | "direct";
    target_refs: string[];
    impact_scope: string[];
    requires_user_confirmation: boolean;
    valid_for_turn: string;
    issued_at: string;
    revoked_at?: string;
    checksum: string;
};
export declare function buildGlobalWriteAuthorizationReceipt(input: {
    turnId: string;
    sessionId: string;
    source: string;
    message: string;
    workflowDecision: WorkflowDecision;
    principal?: any;
    readOnly?: boolean;
}): GlobalWriteAuthorizationReceiptV2;
export declare function verifyGlobalWriteAuthorizationReceipt(receipt: any, run: GlobalAgentRun): {
    valid: boolean;
    reason: string;
};
export declare function globalWriteAuthorizationAllowsTool(input: {
    run: GlobalAgentRun;
    tool: string;
    args: any;
    risk: GlobalAgentToolRisk;
}): {
    allowed: boolean;
    reason: string;
};
export declare function revokeGlobalWriteAuthorization(run: GlobalAgentRun, at?: string): any;
