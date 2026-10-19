export type DispatchProfile = "light" | "standard" | "strict";
export type DispatchVerification = "quick_check" | "main_agent_self" | "test_agent";
export interface DispatchProfileGates {
    requireAck: boolean;
    requireAcceptanceContract: boolean;
    requireStructuredReceipt: boolean;
    requireIsolatedWorktree: boolean;
    verification: DispatchVerification;
    requireWorkspaceEvidence: boolean;
    requireHumanApproval: boolean;
    allowScopeExpansion: boolean;
}
export interface DispatchProfileSnapshot {
    schema: "ccm-dispatch-profile-snapshot-v1";
    version: 1;
    profile: DispatchProfile;
    reasons: string[];
    requiredGates: DispatchProfileGates;
    capturedAt: string;
    checksum: string;
}
export interface DispatchScope {
    recommendedPaths: string[];
    protectedPaths: string[];
    forbiddenPaths: string[];
    approvedPaths?: string[];
}
export interface DispatchScopeDecision {
    allowed: boolean;
    requiresApproval: boolean;
    advisory: boolean;
    reason: string;
}
export declare function dispatchProfileChecksum(value: any): string;
export declare function captureDispatchIntakeSignals(input: any): {
    risk_level: any;
    change_type: any;
    verification_modes: any;
    verification_profile: any;
    cross_project: any;
    target_projects: any;
    destructive: any;
    affects_public_contract: any;
    runtime_config: any;
    file_change_policy: any;
    dispatch_scope: DispatchScope;
};
export declare function dispatchProfileGates(profile: DispatchProfile): DispatchProfileGates;
export declare function deriveDispatchProfile(task: any): {
    profile: DispatchProfile;
    reasons: string[];
};
export declare function buildDispatchProfileSnapshot(task: any, options?: {
    capturedAt?: string;
    forceProfile?: DispatchProfile;
}): DispatchProfileSnapshot;
export declare function validateDispatchProfileSnapshot(snapshot: any): {
    valid: boolean;
    reason: string;
    snapshot?: undefined;
} | {
    valid: boolean;
    reason: string;
    snapshot: DispatchProfileSnapshot;
};
export declare function resolveDispatchProfileSnapshot(task: any): DispatchProfileSnapshot;
export declare function canUpgradeDispatchProfile(current: DispatchProfile, next: DispatchProfile): boolean;
export declare function reworkLimitForDispatchProfile(profile: DispatchProfile): 2 | 1 | 3;
export declare function normalizeDispatchPath(value: any): string;
export declare function canonicalDispatchPath(file: string, workspacePath?: string): string;
export declare function resolveDispatchScope(task: any): DispatchScope;
export declare function evaluateDispatchPath(file: string, scope: DispatchScope, profile: DispatchProfile, workspacePath?: string): DispatchScopeDecision;
