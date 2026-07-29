export type TestAgentSettings = {
    version: 1;
    enabled: boolean;
    updated_at: string;
};
export declare function loadTestAgentSettings(): TestAgentSettings;
export declare function saveTestAgentSettings(input: any): TestAgentSettings;
export declare function isTestAgentEnabled(): boolean;
