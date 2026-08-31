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
exports.recordCanonicalContextPreflight = recordCanonicalContextPreflight;
exports.completeCanonicalContextAccounting = completeCanonicalContextAccounting;
exports.readCanonicalContextAccounting = readCanonicalContextAccounting;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const ccm_context_accounting_v2_1 = require("./ccm-context-accounting-v2");
const session_compaction_core_1 = require("./session-compaction-core");
const conversation_identity_1 = require("./conversation-identity");
const STORE_DIR = path.join(utils_1.CCM_DIR, "context-accounting", "canonical");
function safeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function sha(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function receiptFile(identity) {
    return path.join(STORE_DIR, identity.scope, `${(0, conversation_identity_1.conversationIdentityDigest)(identity)}.json`);
}
function observedInputTokens(usage) {
    const direct = safeInt(usage?.directInputTokens ?? usage?.direct_input_tokens);
    const aggregate = safeInt(usage?.inputTokens ?? usage?.input_tokens ?? usage?.prompt_tokens);
    const cacheRead = safeInt(usage?.cacheReadInputTokens ?? usage?.cache_read_input_tokens);
    const cacheCreation = safeInt(usage?.cacheCreationInputTokens ?? usage?.cache_creation_input_tokens);
    const includesCache = usage?.inputTokensIncludesCache === true || usage?.input_tokens_includes_cache === true;
    return (aggregate || direct) + (includesCache ? 0 : cacheRead + cacheCreation);
}
function scalePrimaryBreakdownToObserved(input, observedTokens) {
    const normalized = (0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(input);
    const entries = Object.entries(normalized);
    const estimatedTotal = entries.reduce((sum, [, value]) => sum + Math.max(0, Number(value || 0)), 0);
    if (observedTokens <= 0 || estimatedTotal <= 0)
        return normalized;
    const weighted = entries.map(([key, value]) => {
        const exact = (Math.max(0, Number(value || 0)) / estimatedTotal) * observedTokens;
        return { key, value: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = Math.max(0, observedTokens - weighted.reduce((sum, item) => sum + item.value, 0));
    weighted.sort((left, right) => right.fraction - left.fraction || String(left.key).localeCompare(String(right.key)));
    for (let index = 0; index < weighted.length && remainder > 0; index += 1, remainder -= 1)
        weighted[index].value += 1;
    return (0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(Object.fromEntries(weighted.map(item => [item.key, item.value])));
}
function providerAnchoredPayload(current, observedTokens) {
    if (observedTokens <= 0)
        return {
            primary: current.primaryTokenBreakdown,
            payload: current.modelVisiblePayload,
        };
    const primary = scalePrimaryBreakdownToObserved(current.primaryTokenBreakdown, observedTokens);
    const tokenBreakdown = {
        ...(current.modelVisiblePayload?.tokenBreakdown || {}),
        system: primary.systemPrompt,
        rules: primary.rules,
        skills: primary.skills,
        tools: 0,
        systemTools: primary.systemTools,
        mcpTools: primary.mcpAndDynamicTools,
        subagentDefinitions: primary.subagentDefinitions,
        memoryAndLoadedContext: primary.memoryAndLoadedContext,
        summary: primary.summarizedConversation,
        recentMessages: primary.conversation,
        currentRequest: primary.currentRequest,
    };
    return {
        primary,
        payload: {
            ...current.modelVisiblePayload,
            primaryTokenTotal: observedTokens,
            totalTokens: observedTokens,
            tokenBreakdown,
            primaryTokenBreakdown: primary,
            loadedContextItems: (0, session_compaction_core_1.alignLoadedContextItemsToTokenBreakdown)(current.modelVisiblePayload?.loadedContextItems, tokenBreakdown),
        },
    };
}
function recordChecksum(value) {
    return sha(JSON.stringify(value));
}
function normalizeScope(value) {
    if (value === "group" || value === "project")
        return value;
    return "global";
}
function recordCanonicalContextPreflight(input) {
    const identity = (0, conversation_identity_1.normalizeConversationIdentity)({ scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId });
    if (!identity || !input.payload?.payloadChecksum)
        return null;
    const safePayload = (0, session_compaction_core_1.modelVisiblePayloadAccounting)(input.payload);
    if (!safePayload)
        return null;
    const provider = String(input.provider || input.payload.provider || "");
    const model = String(input.model || input.payload.model || "");
    const protocol = String(input.protocol || input.payload.protocol || "");
    const base = {
        schema: "ccm-canonical-context-accounting-receipt-v2",
        scope: identity.scope,
        scopeId: identity.scopeId,
        exactSessionId: identity.exactSessionId,
        provider,
        model,
        protocol,
        endpointIdentityChecksum: (0, ccm_context_accounting_v2_1.buildCcmProviderIdentityChecksum)({ provider, model, protocol, endpoint: input.endpoint }),
        generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        boundaryGeneration: Math.max(0, Math.floor(Number(input.boundaryGeneration || 0))),
        payloadChecksum: String(input.payload.payloadChecksum || ""),
        fixedContextChecksum: String(input.payload.fixedContextChecksum || ""),
        requestPhase: "preflight",
        measurementSource: "canonical_payload_estimate",
        precision: "estimated",
        primaryTokenBreakdown: (0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(input.payload.primaryTokenBreakdown || input.payload.tokenBreakdown),
        technicalTokenBreakdown: (0, ccm_context_accounting_v2_1.normalizeCcmTechnicalTokenBreakdown)(input.payload.technicalTokenBreakdown || input.payload.tokenBreakdown),
        estimatedInputTokens: safeInt(input.payload.totalTokens),
        outputTokens: 0,
        predictedNextRequestTokens: safeInt(input.payload.predictedNextRequestTokens || input.payload.totalTokens),
        recordedAt: input.recordedAt || new Date().toISOString(),
        contentStored: false,
        modelVisiblePayload: safePayload,
    };
    const record = { ...base, checksum: recordChecksum(base) };
    const file = receiptFile(identity);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        (0, atomic_json_file_1.writeJsonAtomic)(file, record);
        return record;
    });
}
function completeCanonicalContextAccounting(input) {
    const identity = (0, conversation_identity_1.normalizeConversationIdentity)({ scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId });
    if (!identity)
        return null;
    const file = receiptFile(identity);
    if (!fs.existsSync(file))
        return null;
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
        if (!current || current.schema !== "ccm-canonical-context-accounting-receipt-v2")
            return null;
        if (current.scope !== identity.scope || current.scopeId !== identity.scopeId || current.exactSessionId !== identity.exactSessionId)
            return null;
        if (String(current.payloadChecksum || "") !== String(input.payloadChecksum || ""))
            return null;
        const expectedIdentity = (0, ccm_context_accounting_v2_1.buildCcmProviderIdentityChecksum)({
            provider: input.provider || current.provider,
            model: input.model || current.model,
            protocol: input.protocol || current.protocol,
            endpoint: input.endpoint,
        });
        if (current.endpointIdentityChecksum && expectedIdentity !== current.endpointIdentityChecksum)
            return null;
        if (input.generation !== undefined && Number(input.generation) !== Number(current.generation))
            return null;
        if (input.boundaryGeneration !== undefined && Number(input.boundaryGeneration) !== Number(current.boundaryGeneration))
            return null;
        const observed = observedInputTokens(input.usage);
        const anchored = providerAnchoredPayload(current, observed);
        const base = {
            ...current,
            requestPhase: "completed",
            measurementSource: observed > 0 ? "provider_reported" : "canonical_payload_estimate",
            precision: observed > 0 ? "exact" : "estimated",
            ...(observed > 0 ? { providerObservedInputTokens: observed } : {}),
            outputTokens: safeInt(input.usage?.outputTokens ?? input.usage?.output_tokens ?? input.usage?.completion_tokens),
            recordedAt: input.recordedAt || new Date().toISOString(),
            primaryTokenBreakdown: anchored.primary,
            modelVisiblePayload: anchored.payload,
        };
        delete base.checksum;
        const record = { ...base, checksum: recordChecksum(base) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, record);
        return record;
    });
}
function readCanonicalContextAccounting(scopeInput, scopeIdOrSessionId, exactSessionIdInput) {
    const scope = normalizeScope(scopeInput);
    const identity = (0, conversation_identity_1.normalizeConversationIdentity)({ scope, scopeId: exactSessionIdInput === undefined ? undefined : scopeIdOrSessionId, exactSessionId: exactSessionIdInput === undefined ? scopeIdOrSessionId : exactSessionIdInput });
    if (!identity)
        return null;
    const file = receiptFile(identity);
    if (!fs.existsSync(file))
        return null;
    const record = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
    if (!record || record.schema !== "ccm-canonical-context-accounting-receipt-v2")
        return null;
    const { checksum, ...base } = record;
    if (checksum !== recordChecksum(base))
        return null;
    if (record.scope !== identity.scope || record.scopeId !== identity.scopeId || record.exactSessionId !== identity.exactSessionId || record.contentStored !== false)
        return null;
    const payloadIdentity = (0, conversation_identity_1.normalizeConversationIdentity)({ scope: record.scope, scopeId: record.scopeId, exactSessionId: record.modelVisiblePayload?.exactSessionId, sessionId: record.modelVisiblePayload?.sessionId });
    if (!payloadIdentity || payloadIdentity.scopeId !== identity.scopeId || payloadIdentity.exactSessionId !== identity.exactSessionId)
        return null;
    return record;
}
//# sourceMappingURL=canonical-context-accounting.js.map