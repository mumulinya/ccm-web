"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildModelCallProvenance = buildModelCallProvenance;
exports.resolveUnifiedModelConfig = resolveUnifiedModelConfig;
function buildModelCallProvenance(config, input = {}) {
    return {
        callSource: config.source,
        configSource: config.configSource,
        configVersion: config.configVersion,
        model: config.model,
        reasoningEffort: config.reasoningEffort,
        cacheEligible: config.cacheEligible,
        cachePlanCreated: input.cachePlanCreated === true,
        cacheReadTokens: Math.max(0, Number(input.cacheReadTokens || 0)),
        ...(input.cacheMissReason ? { cacheMissReason: String(input.cacheMissReason).slice(0, 120) } : {}),
    };
}
const VALID_EFFORTS = new Set(["low", "medium", "high", "off"]);
function settingsConfig() {
    // Lazy require avoids a module cycle with group-orchestrator-config.
    try {
        return require("../modules/collaboration/group-orchestrator-config").loadOrchestratorConfig();
    }
    catch {
        return {};
    }
}
function versionOf(config) {
    const raw = JSON.stringify({ provider: config?.provider, model: config?.model, apiUrl: config?.apiUrl, format: config?.format, effort: config?.reasoningEffort });
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++)
        h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
    return `settings-${(h >>> 0).toString(16)}`;
}
function resolveUnifiedModelConfig(input) {
    const external = input.externalRuntime === true || input.callSource === "external_runtime";
    const selected = external ? (input.config || {}) : settingsConfig();
    const effortRaw = String(selected?.reasoningEffort ?? selected?.reasoning_effort ?? "off").trim().toLowerCase();
    const reasoningEffort = (VALID_EFFORTS.has(effortRaw) ? effortRaw : "off");
    return {
        provider: String(selected?.provider || "openai-compatible"),
        model: String(selected?.model || ""),
        reasoningEffort,
        source: input.callSource,
        configSource: external ? "external_runtime" : "settings_page",
        configVersion: external ? "runtime" : versionOf(selected),
        // CCM-owned background consumers also use the existing cache pipeline,
        // but their scope/session identity remains isolated from the main Agent.
        // Probes measure capability only; external runtimes own their cache.
        cacheEligible: !["cache_probe", "external_runtime"].includes(input.callSource),
    };
}
//# sourceMappingURL=unified-model-call-config.js.map