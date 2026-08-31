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
exports.semanticDecisionChecksum = semanticDecisionChecksum;
exports.runSemanticDecision = runSemanticDecision;
exports.buildExplicitSemanticDecisionReceipt = buildExplicitSemanticDecisionReceipt;
exports.normalizeCollaborationRouteDecision = normalizeCollaborationRouteDecision;
exports.normalizeAcceptancePresentation = normalizeAcceptancePresentation;
exports.runSemanticDecisionRuntimeSelfTest = runSemanticDecisionRuntimeSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../modules/collaboration/group-compaction-strategy");
const model_token_preflight_1 = require("./model-token-preflight");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const agent_cache_affinity_1 = require("./agent-cache-affinity");
const DECISION_DIR = process.env.CCM_SEMANTIC_DECISION_DIR
    || path.join(os.homedir(), ".ccm", "semantic-decisions");
const inFlight = new Map();
const completed = new Map();
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function semanticDecisionChecksum(value, length = 64) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, length);
}
function cleanIdentity(identity) {
    const scope = String(identity?.scope || "");
    if (!["global", "group", "project", "music", "test_agent"].includes(scope))
        throw new Error("semantic_decision_scope_invalid");
    const scopeId = String(identity?.scopeId || "").trim();
    const sessionId = String(identity?.sessionId || "").trim();
    if (!scopeId || !sessionId)
        throw new Error("semantic_decision_exact_scope_required");
    return {
        scope,
        scopeId: scopeId.slice(0, 240),
        sessionId: sessionId.slice(0, 240),
        ...(identity.taskId ? { taskId: String(identity.taskId).slice(0, 240) } : {}),
        ...(Number.isFinite(Number(identity.generation)) ? { generation: Math.max(0, Number(identity.generation)) } : {}),
    };
}
function persistReceipt(receipt) {
    fs.mkdirSync(DECISION_DIR, { recursive: true });
    const day = receipt.decidedAt.slice(0, 10);
    fs.appendFileSync(path.join(DECISION_DIR, `${day}.jsonl`), `${JSON.stringify(receipt)}\n`, "utf-8");
}
function configuredProvider(config) {
    return (0, provider_cache_protocol_1.resolveProviderTransport)(config).protocol;
}
async function runSemanticDecision(request) {
    const identity = cleanIdentity(request.identity);
    const inputChecksum = semanticDecisionChecksum({ kind: request.kind, identity, input: request.input });
    const key = `${request.kind}:${inputChecksum}`;
    const cached = completed.get(key);
    if (cached)
        return cached;
    const existing = inFlight.get(key);
    if (existing)
        return existing;
    let resolvedConfig = request.config || null;
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    let modelUsage = null;
    const operation = (async () => {
        const config = resolvedConfig || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
        resolvedConfig = config;
        if (!config?.enabled || !String(config?.apiUrl || "").trim() || !String(config?.apiKey || "").trim() || !String(config?.model || "").trim()) {
            throw new Error("统一大模型尚未配置，语义决策已安全阻断");
        }
        const messages = [
            { role: "system", content: request.system },
            { role: "user", content: JSON.stringify({ identity, input: request.input }) },
        ];
        const maxTokens = Math.max(200, Math.min(8_000, Number(request.maxTokens || 1_200)));
        const defaultCacheScope = ["global", "group", "project"].includes(identity.scope)
            ? identity.scope
            : "project";
        const cacheAffinity = request.cacheAffinity || (0, agent_cache_affinity_1.semanticCacheAffinity)({
            scope: defaultCacheScope,
            scopeId: defaultCacheScope === "global" ? "global" : identity.scopeId,
            exactSessionId: identity.sessionId,
            taskId: identity.taskId,
            generation: identity.generation,
            decisionKind: request.kind,
        });
        const providerContextCache = {
            scope: cacheAffinity.scope,
            scopeId: cacheAffinity.scopeId,
            sessionId: identity.sessionId,
            source: `semantic_${request.kind}`,
            cacheAffinity,
        };
        const capacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
        const tokenPreflight = (0, model_token_preflight_1.estimateModelMessagesTokens)(messages, config);
        const availableInputTokens = Math.max(1, Number(capacity.contextWindow || 0) - maxTokens - Number(capacity.reservedOutputTokens || 0));
        if (tokenPreflight.safetyAdjustedTokens > availableInputTokens) {
            const error = new Error(`语义决策上下文超过模型容量：${tokenPreflight.safetyAdjustedTokens}/${availableInputTokens}`);
            error.code = "SEMANTIC_DECISION_CONTEXT_OVER_CAPACITY";
            error.estimatedInputTokens = tokenPreflight.safetyAdjustedTokens;
            error.availableInputTokens = availableInputTokens;
            throw error;
        }
        const parsed = request.modelCall
            ? await request.modelCall({ config, messages, maxTokens })
            : (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
                ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, {
                    messages,
                    maxTokens,
                    reasoningEffort: request.reasoningEffort,
                    defaultTimeoutMs: Number(config.timeoutMs || 120_000),
                    retryScope: `semantic:${request.kind}`,
                    retryProfile: request.retryProfile,
                    providerContextCache,
                    onUsage: usage => { modelUsage = usage; },
                    onRetry: request.onRetry,
                    onProviderRequestActivity: request.onProviderRequestActivity,
                })
                : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, {
                    messages,
                    maxTokens,
                    reasoningEffort: request.reasoningEffort,
                    defaultTimeoutMs: Number(config.timeoutMs || 120_000),
                    retryScope: `semantic:${request.kind}`,
                    retryProfile: request.retryProfile,
                    providerContextCache,
                    onUsage: usage => { modelUsage = usage; },
                    onRetry: request.onRetry,
                    onProviderRequestActivity: request.onProviderRequestActivity,
                });
        const value = request.validate(parsed);
        const confidence = Math.max(0, Math.min(1, Number(request.confidence?.(value) ?? value?.confidence ?? 1)));
        const core = {
            schema: "ccm-semantic-decision-receipt-v1",
            version: 1,
            decisionKind: request.kind,
            identity,
            inputChecksum,
            resultChecksum: semanticDecisionChecksum(value),
            provider: configuredProvider(config),
            model: String(config.model || ""),
            confidence,
            status: "confirmed",
            startedAt,
            decidedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - startedMs),
            usage: modelUsage,
        };
        const receipt = { ...core, checksum: semanticDecisionChecksum(core) };
        const result = { value, receipt };
        persistReceipt(receipt);
        completed.set(key, result);
        if (completed.size > 500)
            completed.delete(completed.keys().next().value);
        return result;
    })().catch(error => {
        const config = resolvedConfig || {};
        const errorCode = String(error?.code || "SEMANTIC_DECISION_FAILED").slice(0, 160);
        const core = {
            schema: "ccm-semantic-decision-receipt-v1",
            version: 1,
            decisionKind: request.kind,
            identity,
            inputChecksum,
            resultChecksum: semanticDecisionChecksum({ status: "failed", errorCode }),
            provider: configuredProvider(config),
            model: String(config?.model || ""),
            confidence: 0,
            status: "failed",
            startedAt,
            decidedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - startedMs),
            usage: modelUsage,
        };
        const receipt = { ...core, checksum: semanticDecisionChecksum(core) };
        try {
            persistReceipt(receipt);
        }
        catch { }
        error.semanticDecisionReceipt = receipt;
        throw error;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, operation);
    return operation;
}
function buildExplicitSemanticDecisionReceipt(kind, identityInput, input, value, confidence = 1) {
    const identity = cleanIdentity(identityInput);
    const core = {
        schema: "ccm-semantic-decision-receipt-v1",
        version: 1,
        decisionKind: kind,
        identity,
        inputChecksum: semanticDecisionChecksum({ kind, identity, input }),
        resultChecksum: semanticDecisionChecksum(value),
        provider: "explicit-structured-input",
        model: "",
        confidence: Math.max(0, Math.min(1, Number(confidence || 0))),
        status: "confirmed",
        decidedAt: new Date().toISOString(),
    };
    const receipt = { ...core, checksum: semanticDecisionChecksum(core) };
    persistReceipt(receipt);
    return receipt;
}
function normalizeCollaborationRouteDecision(value, candidateProjects) {
    const candidates = [...new Set(candidateProjects.map(item => String(item || "").trim()).filter(Boolean))];
    const action = String(value?.action || "");
    if (!["ask_agent", "ask_user", "reject"].includes(action))
        throw new Error("collaboration_route_action_invalid");
    const targetProject = String(value?.targetProject || value?.target_project || "").trim();
    if (action === "ask_agent" && (!targetProject || !candidates.includes(targetProject)))
        throw new Error("collaboration_route_target_invalid");
    return {
        schema: "ccm-agent-collaboration-route-decision-v1",
        targetProject: action === "ask_agent" ? targetProject : "",
        action: action,
        reason: String(value?.reason || "").trim().slice(0, 1200),
        confidence: Math.max(0, Math.min(1, Number(value?.confidence || 0))),
        candidateProjects: candidates,
    };
}
function normalizeAcceptancePresentation(value) {
    const status = String(value?.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!["passed", "needs_rework", "needs_user", "recorded", "unverified"].includes(status)) {
        throw new Error("acceptance_presentation_status_invalid");
    }
    return {
        schema: "ccm-acceptance-presentation-v1",
        status: status,
        label: String(value?.label || "").trim().slice(0, 120),
        reason: String(value?.reason || "").trim().slice(0, 1_200),
        blocking: status === "needs_rework" || status === "needs_user" || status === "unverified",
    };
}
function runSemanticDecisionRuntimeSelfTest() {
    const candidates = ["frontend", "backend"];
    const route = normalizeCollaborationRouteDecision({ action: "ask_agent", targetProject: "backend", reason: "接口归属后端", confidence: 0.93 }, candidates);
    const acceptance = normalizeAcceptancePresentation({ status: "unverified", label: "验收状态无法证明", reason: "历史记录缺少结构化回执" });
    let invalidRejected = false;
    try {
        normalizeCollaborationRouteDecision({ action: "ask_agent", targetProject: "other" }, candidates);
    }
    catch {
        invalidRejected = true;
    }
    const checksumA = semanticDecisionChecksum({ b: 2, a: 1 });
    const checksumB = semanticDecisionChecksum({ a: 1, b: 2 });
    return {
        pass: route.targetProject === "backend" && acceptance.blocking && invalidRejected && checksumA === checksumB,
        checks: { exactCandidateAccepted: route.targetProject === "backend", unverifiedAcceptanceBlocks: acceptance.blocking, invalidCandidateRejected: invalidRejected, stableChecksum: checksumA === checksumB },
    };
}
//# sourceMappingURL=semantic-decision-runtime.js.map