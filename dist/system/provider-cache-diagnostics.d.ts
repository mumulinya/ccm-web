export type CcmProviderCacheWarmState = "cold" | "warming" | "warm" | "evicted";
declare const KNOWN_REASONS: readonly ["cold_start", "rules_changed", "skills_changed", "system_tools_changed", "tool_schema_changed", "mcp_tools_changed", "model_changed", "endpoint_changed", "generation_changed", "compaction_boundary_changed", "protocol_changed", "ttl_policy_changed", "reasoning_mode_changed", "breakpoint_layout_changed", "transport_parameters_changed"];
export type CcmStablePrefixChangeReason = typeof KNOWN_REASONS[number];
export declare function stablePrefixChangeReasons(input: {
    previous?: any;
    previousSameEpoch: boolean;
    stableMessagePrefixChanged: boolean;
    currentBlocks: any[];
    previousBlocks: any[];
    toolSchemaChanged: boolean;
    model: string;
    endpointFingerprint: string;
    generation: number;
    boundaryGeneration: number;
    protocol?: string;
    ttlPolicy?: string;
    reasoningModeChecksum?: string;
    breakpointLayoutChecksum?: string;
    transportParametersChecksum?: string;
}): ("tool_schema_changed" | "protocol_changed" | "cold_start" | "compaction_boundary_changed" | "rules_changed" | "skills_changed" | "system_tools_changed" | "mcp_tools_changed" | "model_changed" | "endpoint_changed" | "generation_changed" | "ttl_policy_changed" | "reasoning_mode_changed" | "breakpoint_layout_changed" | "transport_parameters_changed")[];
export declare function nextProviderCacheWarmState(input: {
    hit: boolean;
    usageReported: boolean;
    eligible: boolean;
    stablePrefixChanged: boolean;
    previousWarmState?: string;
    previousRoutingMissStreak?: number;
}): {
    cacheWarmState: CcmProviderCacheWarmState;
    providerRoutingMissStreak: number;
};
export {};
