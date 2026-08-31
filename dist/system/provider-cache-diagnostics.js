"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stablePrefixChangeReasons = stablePrefixChangeReasons;
exports.nextProviderCacheWarmState = nextProviderCacheWarmState;
const KNOWN_REASONS = [
    "cold_start",
    "rules_changed",
    "skills_changed",
    "system_tools_changed",
    "mcp_tools_changed",
    "model_changed",
    "endpoint_changed",
    "generation_changed",
    "compaction_boundary_changed",
    "protocol_changed",
    "ttl_policy_changed",
    "reasoning_mode_changed",
    "breakpoint_layout_changed",
    "transport_parameters_changed",
];
function blockFacet(block) {
    const kind = String(block?.kind || "").toLowerCase();
    if (kind === "rules")
        return "rules_changed";
    if (kind === "skill")
        return "skills_changed";
    if (kind === "mcp")
        return "mcp_tools_changed";
    return "rules_changed";
}
function stablePrefixChangeReasons(input) {
    const previous = input.previous;
    if (!previous)
        return ["cold_start"];
    const reasons = new Set();
    if (String(previous.model || "") !== input.model)
        reasons.add("model_changed");
    if (String(previous.providerEndpointFingerprint || "") !== input.endpointFingerprint)
        reasons.add("endpoint_changed");
    // Execution generation fences recovery/audit events, but is intentionally
    // not a provider cache identity. A normal turn therefore must not surface a
    // cache-prefix change just because its generation advanced; only an actual
    // compaction boundary changes the cache epoch below.
    if (Number(previous.boundaryGeneration || 0) !== input.boundaryGeneration)
        reasons.add("compaction_boundary_changed");
    if (String(previous.providerCacheProtocol || "") !== String(input.protocol || ""))
        reasons.add("protocol_changed");
    if (String(previous.providerPromptCacheRetention || "") !== String(input.ttlPolicy || ""))
        reasons.add("ttl_policy_changed");
    if (String(previous.reasoningModeChecksum || "") !== String(input.reasoningModeChecksum || ""))
        reasons.add("reasoning_mode_changed");
    if (String(previous.breakpointLayoutChecksum || "") !== String(input.breakpointLayoutChecksum || ""))
        reasons.add("breakpoint_layout_changed");
    if (String(previous.transportParametersChecksum || "") !== String(input.transportParametersChecksum || ""))
        reasons.add("transport_parameters_changed");
    if (input.toolSchemaChanged)
        reasons.add("system_tools_changed");
    if (input.previousSameEpoch && input.stableMessagePrefixChanged) {
        const previousById = new Map(input.previousBlocks.map((block) => [String(block?.id || ""), block]));
        for (const block of input.currentBlocks) {
            const old = previousById.get(String(block?.id || ""));
            if (!old || String(old?.contentChecksum || old?.checksum || "") !== String(block?.contentChecksum || block?.checksum || "")) {
                reasons.add(blockFacet(block));
            }
        }
        if (input.currentBlocks.length !== input.previousBlocks.length && reasons.size === 0)
            reasons.add("rules_changed");
    }
    return [...reasons];
}
function nextProviderCacheWarmState(input) {
    if (input.hit)
        return { cacheWarmState: "warm", providerRoutingMissStreak: 0 };
    if (input.stablePrefixChanged || !input.eligible)
        return { cacheWarmState: "cold", providerRoutingMissStreak: 0 };
    if (!input.usageReported)
        return {
            cacheWarmState: (input.previousWarmState === "warm" ? "warm" : "warming"),
            providerRoutingMissStreak: Math.max(0, Number(input.previousRoutingMissStreak || 0)),
        };
    const providerRoutingMissStreak = Math.max(0, Number(input.previousRoutingMissStreak || 0)) + 1;
    return {
        cacheWarmState: providerRoutingMissStreak >= 2 ? "evicted" : "warming",
        providerRoutingMissStreak,
    };
}
//# sourceMappingURL=provider-cache-diagnostics.js.map