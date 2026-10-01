export type CcmAcceptanceStrategyMode = "auto" | "always_independent" | "self_verification_only";
export type TestAgentSettings = {
    schema: "ccm-acceptance-strategy-v2";
    version: 2;
    mode: CcmAcceptanceStrategyMode;
    updatedAt: string;
    enabled: boolean;
    updated_at: string;
};
export declare function loadTestAgentSettings(): TestAgentSettings;
export declare function saveTestAgentSettings(input: any): TestAgentSettings;
export declare function isTestAgentEnabled(): boolean;
