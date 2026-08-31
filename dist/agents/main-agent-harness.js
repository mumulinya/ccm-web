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
exports.CCM_MAIN_AGENT_HARNESS_RECEIPT_SCHEMA = void 0;
exports.runMainAgentHarness = runMainAgentHarness;
exports.buildMainAgentHarness = buildMainAgentHarness;
const crypto = __importStar(require("crypto"));
const native_query_loop_1 = require("./native-query-loop");
const agent_trajectory_evaluation_1 = require("../system/agent-trajectory-evaluation");
const main_agent_harness_rollout_1 = require("./main-agent-harness-rollout");
const agent_cache_affinity_1 = require("../system/agent-cache-affinity");
exports.CCM_MAIN_AGENT_HARNESS_RECEIPT_SCHEMA = "ccm-main-agent-harness-receipt-v1";
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        result[key] = stable(value[key]);
        return result;
    }, {});
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function assertHarnessIdentity(input) {
    const { harness } = input;
    if (harness.scope !== input.scope || harness.scopeId !== input.scopeId || harness.exactSessionId !== input.exactSessionId) {
        const error = new Error("Main Agent Harness identity does not match the native query request");
        error.code = "CCM_HARNESS_IDENTITY_MISMATCH";
        throw error;
    }
    if (input.scope === "global" && input.scopeId !== "global") {
        const error = new Error("Global Main Agent Harness must use scopeId=global");
        error.code = "CCM_HARNESS_GLOBAL_SCOPE_INVALID";
        throw error;
    }
    if (!harness.exactSessionId || !Number.isFinite(harness.generation) || harness.generation < 0 || !Number.isFinite(harness.attempt) || harness.attempt < 1) {
        const error = new Error("Main Agent Harness requires an exact session, generation and attempt");
        error.code = "CCM_HARNESS_IDENTITY_INCOMPLETE";
        throw error;
    }
}
function toolCatalogProjection(input) {
    return input.tools.map(tool => ({
        name: String(tool.name || ""),
        deferred: tool.deferred === true,
        schemaChecksum: checksum(tool.inputSchema || {}),
    }));
}
function terminalStatus(result) {
    const responseType = String(result.parsed?.responseType || "reply");
    if (responseType === "clarify")
        return "needs_input";
    if (responseType === "plan")
        return "awaiting_user";
    if (responseType === "dispatch")
        return "dispatch_ready";
    return result.stopReason || "completed";
}
/**
 * The harness owns one and only one native loop invocation. Shadow mode compares
 * deterministic identity/tool/canonical projections; it never calls the model or
 * tools a second time.
 */
async function runMainAgentHarness(input) {
    assertHarnessIdentity(input);
    let canonicalPayloadChecksum = "";
    const callerCanonical = input.onCanonicalPayload;
    const providerContextCache = {
        ...(input.providerContextCache || {
            scope: input.scope,
            scopeId: input.scopeId,
            sessionId: input.exactSessionId,
            source: `${input.scope}_main_native_query`,
        }),
        cacheAffinity: input.providerContextCache?.cacheAffinity || (0, agent_cache_affinity_1.mainAgentCacheAffinity)({
            scope: input.harness.scope,
            scopeId: input.harness.scopeId,
            exactSessionId: input.harness.exactSessionId,
            generation: input.harness.generation,
            attempt: input.harness.attempt,
        }),
    };
    const result = await (0, native_query_loop_1.runNativeQueryLoop)({
        ...input,
        providerContextCache,
        onCanonicalPayload: payload => {
            const callerResult = callerCanonical?.(payload);
            canonicalPayloadChecksum = String(callerResult?.payloadChecksum || canonicalPayloadChecksum || "");
            return callerResult;
        },
    });
    const lifecycle = {
        scope: input.harness.scope,
        scopeId: input.harness.scopeId,
        exactSessionId: input.harness.exactSessionId,
        generation: input.harness.generation,
        attempt: input.harness.attempt,
        modelCallCount: result.modelCallCount,
        toolRoundCount: result.toolRoundCount,
        toolCallCount: result.toolCallCount,
        stopReason: result.stopReason,
    };
    const receipt = {
        schema: exports.CCM_MAIN_AGENT_HARNESS_RECEIPT_SCHEMA,
        identityChecksum: checksum({
            scope: input.harness.scope,
            scopeId: input.harness.scopeId,
            exactSessionId: input.harness.exactSessionId,
            generation: input.harness.generation,
            attempt: input.harness.attempt,
            policies: {
                identity: input.harness.identityPolicy,
                permission: input.harness.permissionPolicy,
                memory: input.harness.memoryAdapter,
            },
        }),
        canonicalPayloadChecksum,
        toolCatalogChecksum: checksum(toolCatalogProjection(input)),
        lifecycleChecksum: checksum(lifecycle),
        terminalStatus: terminalStatus(result),
        mainLoopModelCalls: result.modelCallCount,
        auxiliaryModelCalls: 0,
        toolLoopRounds: result.toolRoundCount,
        toolCallCount: result.toolCallCount,
        auxiliaryStages: [],
        contentStored: false,
    };
    input.onHarnessReceipt?.(receipt);
    (0, main_agent_harness_rollout_1.recordMainAgentHarnessParity)({ harness: input.harness, receipt, mode: input.rolloutMode });
    const evaluation = (0, agent_trajectory_evaluation_1.evaluateAgentTrajectory)({ harness: input.harness, harnessReceipt: receipt, result });
    (0, agent_trajectory_evaluation_1.recordAgentTrajectoryEvaluation)({ harness: input.harness, harnessReceipt: receipt, evaluation });
    return { ...result, harnessReceipt: receipt };
}
function buildMainAgentHarness(input) {
    const scope = input.scope;
    return {
        scope,
        scopeId: input.scopeId,
        exactSessionId: input.exactSessionId,
        generation: Math.max(0, Number(input.generation || 0)),
        attempt: Math.max(1, Number(input.attempt || 1)),
        identityPolicy: `ccm-${scope}-main-agent-identity-v1`,
        contextAdapter: `ccm-${scope}-canonical-context-v1`,
        toolPolicy: `ccm-${scope}-tool-policy-v1`,
        permissionPolicy: `ccm-${scope}-permission-policy-v1`,
        memoryAdapter: `ccm-${scope}-memory-adapter-v1`,
        executionPolicy: "ccm-native-query-execution-v1",
        presentationAdapter: "ccm-conversation-presentation-v1",
    };
}
//# sourceMappingURL=main-agent-harness.js.map