/** Single source of truth for CCM-owned model calls.
 *  This module deliberately does not alter cache planning; it only resolves
 *  the model/effort snapshot used to build a provider request.
 */
export type CcmCallSource = "project_main_agent" | "group_main_agent" | "global_main_agent" | "test_agent" | "planner" | "compaction" | "cache_probe" | "background" | "external_runtime";
export type UnifiedModelCallConfig = {
    provider: string;
    model: string;
    reasoningEffort: "low" | "medium" | "high" | "off";
    source: CcmCallSource;
    configSource: "settings_page" | "external_runtime";
    configVersion: string;
    cacheEligible: boolean;
};
export type ModelCallProvenance = {
    callSource: CcmCallSource;
    configSource: "settings_page" | "external_runtime";
    configVersion: string;
    model: string;
    reasoningEffort: string;
    cacheEligible: boolean;
    cachePlanCreated: boolean;
    cacheReadTokens: number;
    cacheMissReason?: string;
};
export declare function buildModelCallProvenance(config: UnifiedModelCallConfig, input?: {
    cachePlanCreated?: boolean;
    cacheReadTokens?: number;
    cacheMissReason?: string;
}): ModelCallProvenance;
export declare function resolveUnifiedModelConfig(input: {
    callSource: CcmCallSource;
    config?: any;
    externalRuntime?: boolean;
}): UnifiedModelCallConfig;
