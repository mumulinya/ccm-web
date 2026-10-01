import { type CcmAcceptanceStrategyMode } from "../system/test-agent-settings";
import { type TestAgentHardeningPolicyV1 } from "../../test-agent/hardening-policy";
export type TaskAcceptanceMode = "test_agent" | "main_agent_self_verification";
export type TaskAcceptanceLevel = "lightweight" | "standard" | "strict";
export type TaskAcceptanceRoute = "main_agent_self_verification" | "main_agent_with_escalation" | "independent_test_agent";
export type TaskAcceptancePolicySnapshotV2 = {
    schema: "ccm-task-acceptance-policy-snapshot-v2";
    version: 2;
    task_id: string;
    scope: "group" | "project";
    scope_id: string;
    exact_session_id: string;
    generation: number;
    mode: TaskAcceptanceMode;
    test_agent_enabled: boolean;
    max_review_rounds: number;
    settings_revision: string;
    hardening: TestAgentHardeningPolicyV1;
    captured_at: string;
    checksum: string;
};
export type TaskAcceptancePolicySnapshotV3 = {
    schema: "ccm-task-acceptance-policy-snapshot-v3";
    version: 3;
    taskId: string;
    scope: "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    level: TaskAcceptanceLevel;
    route: TaskAcceptanceRoute;
    reasons: string[];
    requiredChecks: string[];
    maxReworkRounds: number;
    maxReviewRounds: number;
    escalationAllowed: boolean;
    strategyMode: CcmAcceptanceStrategyMode;
    hardening: TestAgentHardeningPolicyV1;
    capturedAt: string;
    contentStored: false;
    task_id: string;
    scope_id: string;
    exact_session_id: string;
    mode: TaskAcceptanceMode;
    test_agent_enabled: boolean;
    max_review_rounds: number;
    settings_revision: string;
    captured_at: string;
    checksum: string;
};
export type TaskAcceptancePolicySnapshot = TaskAcceptancePolicySnapshotV2 | TaskAcceptancePolicySnapshotV3;
export type TaskAcceptanceEscalationReceiptV1 = {
    schema: "ccm-task-acceptance-escalation-receipt-v1";
    taskId: string;
    acceptancePolicyChecksum: string;
    fromRoute: "main_agent_with_escalation";
    toRoute: "independent_test_agent";
    reasons: string[];
    changedFileCount: number;
    topLevelModuleCount: number;
    escalatedAt: string;
    contentStored: false;
    checksum: string;
};
export declare function taskNeedsAcceptancePolicy(task: any): boolean;
export declare function buildTaskAcceptancePolicySnapshot(task: any, options?: {
    capturedAt?: string;
}): TaskAcceptancePolicySnapshotV3 | null;
export declare function validateTaskAcceptancePolicySnapshot(task: any, snapshot?: any): {
    valid: boolean;
    reason: string;
    snapshot: TaskAcceptancePolicySnapshot | null;
};
export declare function resolveTaskAcceptancePolicy(task: any): {
    valid: boolean;
    reason: string;
    snapshot: TaskAcceptancePolicySnapshot | null;
};
export declare function evaluateTaskAcceptanceEscalation(input: {
    task: any;
    policy: TaskAcceptancePolicySnapshot;
    changedFiles?: any[];
    selfVerification?: any;
}): {
    escalate: boolean;
    implementationFailure: boolean;
    reasons: string[];
    changedFileCount: number;
    topLevelModuleCount: number;
};
export declare function buildTaskAcceptanceEscalationReceipt(input: {
    task: any;
    policy: TaskAcceptancePolicySnapshot;
    reasons: string[];
    changedFileCount: number;
    topLevelModuleCount: number;
    escalatedAt?: string;
}): TaskAcceptanceEscalationReceiptV1;
export declare function validateTaskAcceptanceEscalationReceipt(task: any, policy: TaskAcceptancePolicySnapshot, receipt: any): {
    valid: boolean;
    reason: string;
};
export declare function taskAcceptanceUsesIndependentReview(task: any, policy: TaskAcceptancePolicySnapshot): boolean;
export declare function taskAcceptanceReviewRounds(task: any, policy: TaskAcceptancePolicySnapshot): number;
export declare function acceptanceModeForTask(task: any): TaskAcceptanceMode | null;
