"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUnifiedCcmCacheRequest = buildUnifiedCcmCacheRequest;
exports.isProviderContextCacheFieldRejection = isProviderContextCacheFieldRejection;
exports.classifyProviderCacheFieldRejection = classifyProviderCacheFieldRejection;
exports.detectProviderCacheFamily = detectProviderCacheFamily;
exports.resolveProviderContextCacheAdapter = resolveProviderContextCacheAdapter;
exports.resolveProviderCacheBreakpointMessageIndexes = resolveProviderCacheBreakpointMessageIndexes;
exports.buildProviderContextCacheAdapterRequestPatch = buildProviderContextCacheAdapterRequestPatch;
exports.providerCacheAdapterPublicSummary = providerCacheAdapterPublicSummary;
exports.runProviderContextCacheAdapterSelfTest = runProviderContextCacheAdapterSelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_capability_matrix_1 = require("./provider-cache-capability-matrix");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const provider_cache_strategy_1 = require("./provider-cache-strategy");
const automatic_provider_cache_optimization_1 = require("./automatic-provider-cache-optimization");
const provider_cache_transcript_1 = require("./provider-cache-transcript");
function buildUnifiedCcmCacheRequest(config, input) {
    const capability = resolveProviderContextCacheAdapter(config, input.provider || "");
    const patch = buildProviderContextCacheAdapterRequestPatch(config, input.plan, capability, input.messages);
    return {
        schema: "ccm-unified-cache-request-v1",
        provider: String(input.provider || capability.family),
        protocol: capability.protocol,
        adapter: capability.adapter,
        cacheIdentity: String(input.cacheIdentity || ""),
        stablePrefixChecksum: String(input.stablePrefixChecksum || ""),
        cacheEpoch: Math.max(0, Number(input.cacheEpoch || 0)),
        wirePatch: patch.body,
        headers: patch.headers,
        breakpointDiagnostic: patch.breakpointDiagnostic,
        contentStored: false,
    };
}
function rollingBreakpointInfo(messagesInput, indexes) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const lastUser = messages.reduce((last, message, index) => (String(message?.role || '').toLowerCase() === 'user'
        && !(0, provider_cache_transcript_1.isAppendOnlyProviderRuntimeMessage)(message)
        ? index : last), -1);
    const index = [...indexes].reverse().find(value => value < lastUser) ?? -1;
    if (index >= 0)
        return { index, reason: 'completed_history_boundary' };
    if (!indexes.length)
        return { index: -1, reason: 'no_cacheable_message_boundary' };
    return { index: -1, reason: 'current_boundary_excluded' };
}
function isProviderContextCacheFieldRejection(error) {
    const reason = String(error?.message || error || "");
    return /HTTP\s+(400|404|422).*?(prompt[_ -]?cache|cache[_ -]?(control|reference|edits?)|context[_ -]?management|cached[_ -]?content)|(?:unknown|unsupported|unrecognized|invalid).*?(cache|context_management|prompt_cache)/i.test(reason);
}
function classifyProviderCacheFieldRejection(error, protocol = "") {
    const reason = String(error?.message || error || "").toLowerCase();
    if (/prompt[_ -]?cache[_ -]?(?:breakpoint|control)|cache[_ -]?breakpoint|breakpoint/.test(reason))
        return "prompt_cache_breakpoint";
    if (/prompt[_ -]?cache[_ -]?(?:options?|retention)|cache[_ -]?options?|prompt_cache_options/.test(reason))
        return "prompt_cache_options";
    if (/prompt[_ -]?cache[_ -]?key|cache[_ -]?key/.test(reason))
        return "prompt_cache_key";
    if (protocol === "anthropic_messages" && /cache[_ -]?control/.test(reason))
        return "cache_control";
    if (/cache[_ -]?control|cache_control/.test(reason))
        return "cache_control";
    return "unknown";
}
function shortHash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, 32);
}
/** @deprecated Compatibility only. Healthy cache routing uses protocol + evidence. */
function detectProviderCacheFamily(config = {}, _hint = "") {
    const protocol = (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol;
    if (["chat_completions", "responses"].includes(protocol))
        return "openai";
    if (protocol === "anthropic_messages")
        return "anthropic";
    if (protocol === "gemini_generate_content")
        return "gemini";
    return "compatible";
}
function adapterForProtocol(protocol, enabled, execution) {
    if (!enabled)
        return "stable_prefix";
    if (protocol === "chat_completions" || protocol === "responses") {
        return execution?.keyMode === "session_key" || execution?.breakpointMode !== "none"
            ? "openai_prompt_cache"
            : "stable_prefix";
    }
    if (protocol === "anthropic_messages") {
        return execution?.breakpointMode !== "none" || execution?.editingMode === "native"
            ? "anthropic_context_management"
            : "stable_prefix";
    }
    if (protocol === "gemini_generate_content")
        return "gemini_implicit_cache";
    return "stable_prefix";
}
function resolveProviderContextCacheAdapter(config = {}, _hint = "", evidenceInput) {
    const internalMode = String(config?.providerCacheInternalMode || "").toLowerCase();
    const requestedMode = (0, automatic_provider_cache_optimization_1.automaticProviderCacheEnabled)()
        ? (["controlled", "off"].includes(internalMode) ? internalMode : "auto")
        : "off";
    const capabilityState = evidenceInput || (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config);
    const capabilityMatrix = (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)(config, capabilityState);
    const strategy = (0, provider_cache_strategy_1.resolveProviderCacheStrategyV3)(config, { capabilityMatrix, capabilityState });
    const execution = strategy.execution;
    const explicitCapability = execution.keyMode !== "none" || execution.breakpointMode !== "none" || execution.editingMode === "native";
    const implicitCapability = capabilityMatrix.capabilities.implicitPrefix === "confirmed";
    const probeInProgress = config.providerCacheProbeInProgress === true;
    const forceNative = probeInProgress;
    const evidenceUnsupported = Object.values(capabilityMatrix.capabilities).some(value => value === "unsupported");
    // Protocol selection chooses an encoder. The resolved execution independently
    // gates each optional field using official capabilities or verified evidence.
    const protocolKnown = ["chat_completions", "responses", "anthropic_messages", "gemini_generate_content"].includes(capabilityMatrix.protocol);
    const enabled = requestedMode !== "off" && (protocolKnown || explicitCapability || implicitCapability || probeInProgress || (forceNative && !evidenceUnsupported));
    const adapter = requestedMode === "off" ? "disabled" : requestedMode === "controlled" ? "stable_prefix" : adapterForProtocol(capabilityMatrix.protocol, enabled, execution);
    const providerNative = adapter !== "stable_prefix" && adapter !== "disabled";
    const evidence = capabilityState?.evidence || null;
    return {
        schema: "ccm-provider-context-cache-adapter-capability-v3",
        version: 3,
        family: detectProviderCacheFamily(config),
        protocol: capabilityMatrix.protocol,
        protocolResolution: (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config),
        adapter,
        providerNative,
        providerManagedKvCache: providerNative,
        requestLayerOwned: capabilityMatrix.protocol !== "custom" || forceNative,
        capabilitySource: probeInProgress ? "capability_probe" : explicitCapability ? "confirmed_capability_evidence" : implicitCapability ? "provider_usage" : "ccm_safe_default",
        capabilityStatus: capabilityState?.status || "unproven",
        capabilityEvidenceId: evidence?.id || "",
        capabilityEvidenceExpiresAt: evidence?.expiresAt || "",
        capabilityReason: evidence?.reason || "cache_capability_not_proven",
        requestedMode,
        supportsPromptCacheKey: execution.keyMode === "session_key",
        supportsPromptCacheRetention: execution.keyMode === "session_key",
        supportsImplicitCache: implicitCapability,
        supportsContextManagement: capabilityMatrix.capabilities.blockCacheControl === "confirmed" || capabilityMatrix.capabilities.nativeCacheEditing === "confirmed",
        supportsCacheReferenceEdits: capabilityMatrix.capabilities.nativeCacheEditing === "confirmed",
        customCompatibleEndpoint: capabilityMatrix.protocol === "custom",
        safeToSendProviderFields: protocolKnown || explicitCapability || probeInProgress || (forceNative && !evidenceUnsupported),
        forcedWithoutEvidence: forceNative && !explicitCapability && !probeInProgress,
        unsupportedEvidenceBlocksForce: evidenceUnsupported && !probeInProgress,
        capabilityEvidence: evidence,
        capabilityState,
        capabilityMatrix,
        resolvedExecution: execution,
        explicitBreakpointsVerified: capabilityMatrix.capabilities.explicitBreakpoints === "confirmed",
    };
}
function toolCallIds(message) {
    return (Array.isArray(message?.tool_calls) ? message.tool_calls : [])
        .map((call) => String(call?.id || ""))
        .filter(Boolean);
}
function hasCacheableInputBoundary(message) {
    const role = String(message?.role || "");
    // Responses attaches explicit breakpoints to input_text blocks.  A tool
    // message is encoded as function_call_output and cannot carry the marker;
    // assistant tool-call items likewise have no input_text boundary.
    if (role !== "user" && role !== "system")
        return false;
    if (Array.isArray(message?.content))
        return message.content.some((item) => {
            if (typeof item === "string")
                return item.trim().length > 0;
            return ["text", "input_text"].includes(String(item?.type || "")) && String(item?.text || "").trim().length > 0;
        });
    return String(message?.content ?? "").trim().length > 0;
}
function resolveProviderCacheBreakpointMessageIndexes(messagesInput, staticIndexes = [], maxBreakpoints = 4, options = {}) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const lastUserIndex = messages.reduce((last, message, index) => (String(message?.role || "").toLowerCase() === "user"
        && !(0, provider_cache_transcript_1.isAppendOnlyProviderRuntimeMessage)(message)
        ? index : last), -1);
    // During a native tool loop the submitted user message remains in the
    // transcript while assistant/tool items are appended after it. Those
    // completed tool outputs are now committed history for the next model call,
    // even though there is no second user message yet. Without this distinction
    // the resolver considers every post-user tool result "active" and spends
    // all four breakpoint slots on leading system blocks.
    const hasToolLoopSuffix = lastUserIndex >= 0 && messages.slice(lastUserIndex + 1).some(message => {
        const role = String(message?.role || "").toLowerCase();
        return role === "tool" || (role === "assistant" && toolCallIds(message).length > 0);
    });
    const pending = new Set();
    const rollingCandidates = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index] || {};
        // The runtime context is a synthetic mutable suffix. It must never become
        // a cache boundary or consume one of the four durable breakpoint slots.
        if ((0, provider_cache_transcript_1.isAppendOnlyProviderRuntimeMessage)(message))
            continue;
        if (String(message.role || "") === "assistant")
            for (const id of toolCallIds(message))
                pending.add(id);
        if (String(message.role || "") === "tool")
            pending.delete(String(message.tool_call_id || message.toolCallId || ""));
        // A user message that has already been sent is a valid commit boundary
        // for the next model call. This is opt-in because generic callers may use
        // the resolver only to describe completed history; the Responses adapter
        // enables it so the first tool-loop request can reuse the preceding user
        // turn instead of falling back to the provider's small base fragment.
        const toolResultBoundary = options.allowToolResultBreakpoints === true
            && String(message?.role || "") === "tool"
            && String(message?.tool_call_id || message?.toolCallId || "").length > 0;
        const role = String(message?.role || "").toLowerCase();
        const isCommittedBoundary = (options.allowCurrentUserBoundary === true && index <= lastUserIndex)
            || index < lastUserIndex
            || (hasToolLoopSuffix && index > lastUserIndex);
        // Static system boundaries already occupy the explicitly selected slots.
        // Treating every dynamic system block as a rolling candidate crowds out
        // completed tool results and makes the provider fall back to its baseline
        // cache fragment on the next tool call.
        const isSystemRollingCandidate = role === "system";
        if (isCommittedBoundary && !isSystemRollingCandidate && pending.size === 0
            && (hasCacheableInputBoundary(message) || toolResultBoundary)) {
            rollingCandidates.push(index);
        }
    }
    const validStatic = staticIndexes.filter(index => Number.isInteger(index)
        && index >= 0
        && index < messages.length
        && !(0, provider_cache_transcript_1.isAppendOnlyProviderRuntimeMessage)(messages[index])
        && hasCacheableInputBoundary(messages[index]));
    // Static public/scope boundaries are the durable part of the layout. Clamp
    // the caller's list before filling rolling slots so the final `slice` can
    // never evict the first public boundary when an old checkpoint supplies
    // more than the Provider's four-marker limit.
    const maxBoundaryCount = Math.max(1, Number(maxBreakpoints || 0));
    const retainedStatic = [...new Set(validStatic)].sort((a, b) => a - b).slice(0, maxBoundaryCount);
    // Keep a short suffix of completed boundaries instead of replacing the
    // previous boundary whenever a new tool batch finishes. During an active
    // native tool loop, defer the newest completed tool boundary by one request:
    // relays commonly choose the last explicit marker, and a brand-new marker
    // has not been materialized yet. Using it immediately makes an otherwise
    // reusable same-turn prefix fall back to the provider's tiny baseline.
    // Ordinary user-to-user appends do not need this lag because their newest
    // prior user boundary was already submitted by the preceding request.
    const availableRollingSlots = Math.max(0, maxBoundaryCount - retainedStatic.length);
    const rollingEnd = hasToolLoopSuffix && options.allowCurrentUserBoundary !== true
        ? Math.max(0, rollingCandidates.length - 1) : rollingCandidates.length;
    const retainedRolling = rollingCandidates.slice(Math.max(0, rollingEnd - availableRollingSlots), rollingEnd);
    const result = [...new Set([...retainedStatic, ...retainedRolling])].sort((a, b) => a - b);
    return result.slice(0, maxBoundaryCount);
}
function buildProviderContextCacheAdapterRequestPatch(config, plan, capabilityInput, messagesInput) {
    const capability = capabilityInput || resolveProviderContextCacheAdapter(config, plan?.provider || "");
    const strategy = (0, provider_cache_strategy_1.resolveProviderCacheStrategyV3)(config, capability);
    const protocolKnown = ["chat_completions", "responses", "anthropic_messages", "gemini_generate_content"].includes(String(capability.protocol || ""));
    // A known protocol still has a valid append-only provider cache path even
    // when an optional key/breakpoint was rejected or has no evidence.  Do not
    // turn that case into a CCM stable-prefix projection: the full transcript
    // must remain on the wire so the Provider can use implicit prefix caching.
    if (!plan || capability.adapter === "disabled" || (capability.safeToSendProviderFields !== true && !protocolKnown)) {
        return {
            capability, strategy, body: {}, headers: {}, patchChecksum: "", promptCacheKeyChecksum: "", promptCacheKeyPresent: false,
            cacheKeyOmissionReason: !plan ? "plan_missing" : capability.adapter === "disabled" ? "cache_disabled" : capability.safeToSendProviderFields !== true ? "capability_unconfirmed_for_unknown_protocol" : "",
            breakpointMessageIndexes: [], breakpointChecksums: [], breakpointDiagnostic: null, breakpointOmissionReason: "cache_patch_unavailable",
            cacheRouteVersion: automatic_provider_cache_optimization_1.CCM_CACHE_ROUTE_VERSION, routeKeyRotated: false,
        };
    }
    let body = {};
    let breakpointMessageIndexes = [];
    let cacheKeyOmissionReason = "";
    let breakpointOmissionReason = "";
    if (strategy.execution.keyMode === "session_key") {
        body.prompt_cache_key = (0, automatic_provider_cache_optimization_1.buildAutomaticProviderCacheKey)(config, plan, strategy.capabilityMatrix);
    }
    else
        cacheKeyOmissionReason = "key_mode_not_session_key";
    if (strategy.execution.breakpointMode !== "none" && strategy.capabilityMatrix.protocol === "responses") {
        // Prefer the explicit workspace-public boundary.  The remaining leading
        // system blocks are scope/session-private and must not become part of the
        // cross-project cache breakpoint. Older plans lack this field and retain
        // the previous conservative leading-block behavior.
        const publicCount = Math.max(0, Number(plan.publicStablePrefixBlockCount || 0));
        const stableCount = Math.max(0, Number(plan.stablePrefixBlockCount || 0));
        // Keep two distinct reusable boundaries when the leading system run has
        // more than the workspace-public block: the public boundary is safe to
        // share across projects, while the final immutable system block is safe
        // to reuse across sessions in the same scope.  The catalog and runtime
        // context follow after this run and therefore remain private/dynamic.
        // Older plans do not carry the public count, so retain their conservative
        // trailing stable-block behavior.
        const staticIndexes = publicCount > 0
            ? [...new Set([publicCount - 1, stableCount - 1].filter(index => index >= 0))]
            : Array.from({ length: Math.min(3, stableCount) }, (_, offset) => stableCount - Math.min(3, stableCount) + offset);
        breakpointMessageIndexes = resolveProviderCacheBreakpointMessageIndexes(messagesInput || [], staticIndexes, 4, {
            // A verified Responses breakpoint may be attached to a completed
            // function_call_output. This is the only way to extend the reusable
            // prefix past a tool batch without adding synthetic model-visible text.
            // Keep the explicit boundary set stable during a native multi-tool
            // loop. Adding a marker to the newest function_call_output on every
            // round changes the provider's boundary set and can invalidate the
            // already-submitted user prefix. Completed tool history remains fully
            // present on the wire and can be reused through the stable user
            // boundary; a later user turn may establish a new rolling boundary.
            allowToolResultBreakpoints: false,
            // Mark the current user boundary on the very first request too.  Adding
            // the marker only on the following tool request changes the bytes of an
            // already-submitted user item (the common 192-token second-request
            // fallback).  Once every user boundary is emitted at submission time,
            // later requests only append new items and keep the committed prefix
            // byte-identical.
            allowCurrentUserBoundary: strategy.capabilityMatrix.capabilities.explicitBreakpoints === "confirmed",
        });
        if (!breakpointMessageIndexes.length)
            breakpointOmissionReason = "no_cacheable_message_boundary";
    }
    else if (strategy.capabilityMatrix.protocol === "responses"
        && strategy.execution.breakpointMode === "none")
        breakpointOmissionReason = "responses_implicit_prefix_preferred";
    else if (strategy.execution.breakpointMode === "none")
        breakpointOmissionReason = "breakpoint_capability_unconfirmed";
    else if (strategy.capabilityMatrix.protocol !== "responses")
        breakpointOmissionReason = "protocol_not_responses";
    // A relay may accept the stable routing key while rejecting the optional
    // Responses cache-options object. Only send this field after the provider
    // has explicitly confirmed it (or while the isolated capability probe is
    // running). Persisted "unproven" capability state must never make normal
    // foreground requests carry speculative fields, otherwise a healthy model
    // call can fail with a generic upstream HTTP 400.
    if (strategy.transport === "responses_explicit"
        && (strategy.capabilityMatrix?.capabilities?.promptCacheOptions === "confirmed"
            || config?.providerCacheProbeInProgress === true)) {
        body.prompt_cache_options = (0, provider_cache_strategy_1.responsesPromptCacheOptions)(strategy, breakpointMessageIndexes.length);
    }
    if (config?.providerCacheDisableKey === true) {
        delete body.prompt_cache_key;
        cacheKeyOmissionReason = "disabled_by_configuration";
    }
    if (config?.providerCacheDisableOptions === true) {
        delete body.prompt_cache_options;
        delete body.prompt_cache_retention;
    }
    if (config?.providerCacheDisableBreakpoints === true) {
        breakpointMessageIndexes = [];
        breakpointOmissionReason = "disabled_by_configuration";
    }
    if (strategy.capabilityMatrix?.capabilities?.promptCacheOptions === "unsupported") {
        delete body.prompt_cache_options;
        delete body.prompt_cache_retention;
    }
    const breakpointChecksums = breakpointMessageIndexes.map(index => shortHash({
        index,
        role: String(messagesInput?.[index]?.role || ""),
        contentChecksum: shortHash(messagesInput?.[index]?.content || plan.blocks?.[index]?.contentChecksum || ""),
    }));
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const omittedCandidates = [];
    for (const [index, message] of messages.entries()) {
        if (String(message?.role || "") === "tool"
            && !breakpointMessageIndexes.includes(index))
            omittedCandidates.push({ index, reason: "tool_message_unencodable" });
    }
    const breakpointDiagnostic = {
        schema: "ccm-cache-breakpoint-diagnostic-v2",
        mode: breakpointMessageIndexes.length
            ? "implicit_with_explicit_breakpoints"
            : body.prompt_cache_options?.mode === "explicit" ? "explicit" : "implicit",
        selectedIndexes: breakpointMessageIndexes.slice(),
        selectedRoles: breakpointMessageIndexes.map(index => String(messages[index]?.role || "")),
        encodedBreakpoints: breakpointMessageIndexes.length,
        omittedCandidates: omittedCandidates.slice(0, 16),
        payloadChecksum: shortHash({
            body,
            messages: messages.map((message) => ({ role: String(message?.role || ""), contentChecksum: shortHash(message?.content || "") })),
        }),
        contentStored: false,
    };
    const rolling = rollingBreakpointInfo(messages, breakpointMessageIndexes);
    const patch = { capability, strategy, body, headers: {}, breakpointMessageIndexes, breakpointChecksums,
        rollingBreakpointIndex: rolling.index, rollingBreakpointReason: strategy.capabilityMatrix.protocol === 'responses'
            ? rolling.reason : strategy.capabilityMatrix.protocol === 'anthropic_messages' ? 'provider_native_rolling_boundary' : 'implicit_provider_cache' };
    return {
        ...patch,
        breakpointDiagnostic,
        patchChecksum: Object.keys(body).length || breakpointMessageIndexes.length ? shortHash(patch) : "",
        promptCacheKeyChecksum: body.prompt_cache_key ? shortHash(String(body.prompt_cache_key)) : "",
        promptCacheKeyPresent: typeof body.prompt_cache_key === "string" && body.prompt_cache_key.length > 0,
        cacheKeyOmissionReason: body.prompt_cache_key ? "" : cacheKeyOmissionReason || "provider_field_not_emitted",
        breakpointOmissionReason: breakpointMessageIndexes.length ? "" : breakpointOmissionReason || "provider_field_not_emitted",
        cacheRouteVersion: automatic_provider_cache_optimization_1.CCM_CACHE_ROUTE_VERSION,
        cacheKeyScope: "conversation_branch",
        // A layout version matching the current contract only says which key
        // namespace was generated. It does not prove that this request actually
        // rotated away from the previous key. The previous implementation marked
        // every v3 request as rotated, which made ordinary warm requests look like
        // repeated cache cold starts in diagnostics.
        routeKeyRotated: plan?.cacheRouteKeyRotated === true,
    };
}
function providerCacheAdapterPublicSummary(config = {}) {
    const active = resolveProviderContextCacheAdapter(config);
    const automaticOptimization = (0, automatic_provider_cache_optimization_1.buildAutomaticCacheOptimizationProjection)({
        matrix: active.capabilityMatrix,
        execution: active.resolvedExecution,
        fallbackReason: active.capabilityReason,
    });
    return {
        schema: "ccm-provider-context-cache-adapter-summary-v3",
        version: 3,
        active,
        protocol: active.protocol,
        capabilityMatrix: active.capabilityMatrix,
        resolvedExecution: active.resolvedExecution,
        automaticOptimization,
        adapters: [
            { protocol: "chat_completions", capabilities: ["implicit_prefix", "explicit_cache_key"], guarded: true },
            { protocol: "responses", capabilities: ["implicit_prefix", "explicit_cache_key", "explicit_breakpoints"], guarded: true },
            { protocol: "anthropic_messages", capabilities: ["block_cache_control", "native_cache_editing"], guarded: true },
            { protocol: "gemini_generate_content", capabilities: ["implicit_prefix", "cache_usage_reporting"], guarded: true },
            { protocol: "custom", capabilities: ["stable_prefix", "controlled_editing"], guarded: true },
        ],
        falseNativeClaimsForbidden: true,
    };
}
function runProviderContextCacheAdapterSelfTest() {
    const officialChat = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-compatible" });
    const arbitraryNames = ["gpt", "claude", "qwen", "deepseek"].map(model => resolveProviderContextCacheAdapter({ apiUrl: "https://gateway.example/v1", format: "openai-compatible", model }));
    const responses = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" });
    const explicitResponses = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6", providerCacheEnableExplicitBreakpoints: true });
    const relayKeyOnly = resolveProviderContextCacheAdapter({ apiUrl: "https://gateway.example/v1", format: "openai-responses", model: "gpt-5.6" }, "", {
        status: "confirmed",
        explicitFieldStatus: "confirmed",
        implicitCacheStatus: "confirmed",
        evidence: { explicitFieldStatus: "confirmed", implicitCacheStatus: "confirmed", explicitBreakpointsVerified: false },
    });
    const messages = [
        { role: "system", content: "stable" },
        { role: "user", content: "old" },
        { role: "assistant", content: "done" },
        { role: "user", content: "current" },
    ];
    const patch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
    }, responses, messages);
    const scopeStableBoundaryPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "new-session", generation: 1, boundaryGeneration: 0,
        publicStablePrefixBlockCount: 1, stablePrefixBlockCount: 3,
    }, responses, [
        { role: "system", content: "workspace-public" },
        { role: "system", content: "project identity" },
        { role: "system", content: "stable policy" },
        { role: "system", content: "dynamic tool catalog" },
        { role: "user", content: "new message" },
    ]);
    const explicitScopeStableBoundaryPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6", providerCacheEnableExplicitBreakpoints: true }, {
        scope: "project", scopeId: "p", sessionId: "new-session", generation: 1, boundaryGeneration: 0,
        publicStablePrefixBlockCount: 1, stablePrefixBlockCount: 3,
    }, explicitResponses, [
        { role: "system", content: "workspace-public" },
        { role: "system", content: "project identity" },
        { role: "system", content: "stable policy" },
        { role: "system", content: "dynamic tool catalog" },
        { role: "user", content: "new message" },
    ]);
    const relayKeyOnlyPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://gateway.example/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
    }, relayKeyOnly, messages);
    const siblingSessionPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "another-session", generation: 9, boundaryGeneration: 4, stablePrefixBlockCount: 1,
    }, responses, messages);
    const siblingProjectPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "other-project", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1,
    }, responses, messages);
    const unfinished = resolveProviderCacheBreakpointMessageIndexes([
        { role: "user", content: "old" },
        { role: "assistant", tool_calls: [{ id: "t1" }] },
        { role: "user", content: "current" },
    ], [], 4);
    const completedToolBatch = [
        { role: "system", content: "stable" },
        { role: "user", content: "old" },
        { role: "assistant", tool_calls: [{ id: "t1" }] },
        { role: "tool", tool_call_id: "t1", content: "result" },
        { role: "user", content: "current" },
    ];
    const completedToolBreakpoints = resolveProviderCacheBreakpointMessageIndexes(completedToolBatch, [0], 4, { allowToolResultBreakpoints: true });
    const toolLoopBreakpoints = resolveProviderCacheBreakpointMessageIndexes([
        { role: "system", content: "stable" },
        { role: "user", content: "current" },
        { role: "assistant", tool_calls: [{ id: "t1" }] },
        { role: "tool", tool_call_id: "t1", content: "result" },
    ], [0], 4, { allowToolResultBreakpoints: true });
    const stagedToolLoopBreakpoints = resolveProviderCacheBreakpointMessageIndexes([
        { role: "system", content: "stable" },
        { role: "user", content: "current" },
        { role: "assistant", tool_calls: [{ id: "t1" }] },
        { role: "tool", tool_call_id: "t1", content: "stable result" },
        { role: "assistant", tool_calls: [{ id: "t2" }] },
        { role: "tool", tool_call_id: "t2", content: "new result" },
    ], [0], 4, { allowToolResultBreakpoints: true });
    const checks = {
        officialChatUsesProtocolCapability: officialChat.protocol === "chat_completions" && officialChat.supportsPromptCacheKey,
        arbitraryModelNamesDoNotChangeProtocol: arbitraryNames.every(value => value.protocol === "chat_completions"),
        // Foreground Responses traffic keeps the portable implicit prefix path by
        // default. Explicit breakpoint markers remain available only through an
        // operator opt-in or the isolated capability probe.
        responsesUsesImplicitPrefixByDefault: patch.breakpointMessageIndexes.length === 0
            && patch.strategy.transport === "responses_implicit"
            && patch.strategy.execution.breakpointMode === "none"
            && !patch.body.prompt_cache_options,
        explicitBreakpointOptInKeepsPublicBoundary: explicitScopeStableBoundaryPatch.breakpointMessageIndexes.includes(0)
            && explicitScopeStableBoundaryPatch.strategy.transport === "responses_explicit"
            && explicitScopeStableBoundaryPatch.strategy.execution.breakpointMode === "static_and_rolling"
            && explicitScopeStableBoundaryPatch.body.prompt_cache_options?.mode === "implicit",
        sameScopeUsesImplicitPrefixByDefault: scopeStableBoundaryPatch.breakpointMessageIndexes.length === 0,
        responsesUsesStableKeyWithConfirmedBreakpoints: patch.strategy.execution.keyMode === "session_key"
            && patch.strategy.execution.breakpointMode === "none"
            && typeof patch.body.prompt_cache_key === "string",
        responsesUsesConfirmedCacheOptionsOnlyWhenOptedIn: explicitScopeStableBoundaryPatch.body.prompt_cache_options?.mode === "implicit",
        relayCacheKeyWithoutVerifiedBreakpointsUsesImplicitMode: relayKeyOnlyPatch.strategy.execution.keyMode === "session_key"
            && relayKeyOnlyPatch.strategy.execution.breakpointMode === "none"
            && !relayKeyOnlyPatch.body.prompt_cache_options
            && relayKeyOnlyPatch.breakpointMessageIndexes.length === 0,
        emptyEncodedBreakpointSetOmitsOptions: (() => {
            const emptyBoundaryPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
                scope: "project", scopeId: "p", sessionId: "s", stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
            }, responses, [{ role: "assistant", content: "not an input boundary" }]);
            return emptyBoundaryPatch.strategy.transport === "responses_implicit"
                && emptyBoundaryPatch.breakpointMessageIndexes.length === 0
                && !emptyBoundaryPatch.body.prompt_cache_options;
        })(),
        unfinishedToolBatchIsNotBreakpoint: !unfinished.includes(1),
        verifiedResponsesCanBoundaryCompletedToolOutput: completedToolBreakpoints.includes(3),
        toolLoopDefersNewestCompletedOutput: !toolLoopBreakpoints.includes(3),
        newestToolBoundaryIsDeferred: stagedToolLoopBreakpoints.includes(3) && !stagedToolLoopBreakpoints.includes(5),
        completedToolBatchUsesPriorCacheableBoundary: resolveProviderCacheBreakpointMessageIndexes([
            { role: "user", content: "old" },
            { role: "assistant", tool_calls: [{ id: "t1" }] },
            { role: "tool", tool_call_id: "t1", content: "result" },
            { role: "user", content: "current" },
        ], [], 4).includes(0) && !resolveProviderCacheBreakpointMessageIndexes([
            { role: "user", content: "old" },
            { role: "assistant", tool_calls: [{ id: "t1" }] },
            { role: "tool", tool_call_id: "t1", content: "result" },
            { role: "user", content: "current" },
        ], [], 4).includes(3),
        // Full transcript branches are isolated. The public prefix remains
        // comparable through the plan's public checksums, not by sharing one
        // prompt_cache_key across unrelated conversations.
        cacheKeyIsolatedAcrossSessions: patch.body.prompt_cache_key !== siblingSessionPatch.body.prompt_cache_key,
        cacheKeyIsolatedAcrossScopes: patch.body.prompt_cache_key !== siblingProjectPatch.body.prompt_cache_key,
        cacheKeyFitsProviderLimit: String(patch.body.prompt_cache_key || "").length <= 64,
        automaticLegacyFamilyIsIgnored: resolveProviderContextCacheAdapter({ format: "openai-compatible", providerNativeCacheFamily: "anthropic" }).protocol === "chat_completions",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-context-cache-adapters.js.map