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
exports.createProjectSessionCompactionAdapter = createProjectSessionCompactionAdapter;
exports.getProjectSessionCompactionActivity = getProjectSessionCompactionActivity;
exports.listProjectSessionExecutionEvents = listProjectSessionExecutionEvents;
exports.listProjectSessionHistoryMessages = listProjectSessionHistoryMessages;
exports.appendProjectSessionExecutionEvent = appendProjectSessionExecutionEvent;
exports.recordProjectSessionProviderUsage = recordProjectSessionProviderUsage;
exports.scheduleProjectSessionMemoryExtraction = scheduleProjectSessionMemoryExtraction;
exports.compactProjectSessionWithModel = compactProjectSessionWithModel;
exports.buildProjectSessionPostCompactContext = buildProjectSessionPostCompactContext;
exports.buildProjectSessionModelContextProjection = buildProjectSessionModelContextProjection;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const unified_session_compaction_model_1 = require("../../system/unified-session-compaction-model");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
const model_capability_cache_1 = require("../collaboration/model-capability-cache");
const context_budget_1 = require("../../system/context-budget");
const runtime_1 = require("../../agents/runtime");
const project_session_agent_binding_1 = require("./project-session-agent-binding");
const project_validation_1 = require("./project-validation");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const session_execution_ledger_1 = require("../../system/session-execution-ledger");
const session_task_timeline_1 = require("../../tasks/session-task-timeline");
const session_task_timeline_2 = require("../../tasks/session-task-timeline");
const session_model_context_1 = require("../../system/session-model-context");
const unified_session_compaction_1 = require("../../system/unified-session-compaction");
const unified_session_compaction_adapters_1 = require("../../system/unified-session-compaction-adapters");
const ccm_context_accounting_v2_1 = require("../../system/ccm-context-accounting-v2");
const MODEL_MAX_OUTPUT_TOKENS = 20_000;
const compactions = new Map();
function projectCompactionSourceChecksum(data) {
    return crypto.createHash("sha256").update(JSON.stringify({
        history: (Array.isArray(data?.history) ? data.history : []).map((item) => String(item?.id || item?.messageId || "")),
        execution: projectExecutionEvents(data).map((item) => String(item?.id || "")),
        generation: Number(data?.unifiedSessionCompaction?.boundaryGeneration || 0),
    })).digest("hex");
}
async function runUnifiedProjectSessionCompaction(project, projectSessionId, options = {}) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(projectSessionId);
    const expectedDispatchScopeId = (0, project_session_agent_binding_1.buildProjectSessionAgentScopeId)(safeProject, safeSessionId);
    const ownsActiveDispatch = String(options.activeDispatchScopeId || "") === expectedDispatchScopeId;
    if ((0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(safeProject, safeSessionId) && !ownsActiveDispatch) {
        throw new Error("当前项目会话仍有第三方 Agent 正在执行，暂不能压缩");
    }
    const file = sessionFile(safeProject, safeSessionId);
    if (!fs.existsSync(file))
        throw new Error("项目会话不存在");
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const binding = (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(safeProject, safeSessionId);
    const modelCapacity = resolveProjectCompactionCapacity(JSON.parse(fs.readFileSync(file, "utf8")), config, binding, {}, options);
    let acquiredChecksum = "";
    const adapter = createProjectSessionCompactionAdapter({
        project: safeProject,
        sessionId: safeSessionId,
        acquire: () => {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            acquiredChecksum = projectCompactionSourceChecksum(data);
            return { scope: "project", exactSessionId: `${safeProject}:${safeSessionId}`, generation: Number(data?.unifiedSessionCompaction?.boundaryGeneration || 0), checksum: acquiredChecksum, acquiredAt: new Date().toISOString() };
        },
        load: () => {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            const history = Array.isArray(data.history) ? data.history.filter((message) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
            const state = data.unifiedSessionCompaction || {};
            return {
                scope: "project",
                exactSessionId: `${safeProject}:${safeSessionId}`,
                messages: history,
                executionEvents: projectExecutionEvents(data),
                activeSummary: data.unifiedSessionSummary || null,
                previousState: state,
                boundaryGeneration: Number(state.boundaryGeneration || 0),
                compactionFloorIndex: Number(state.summarizedMessageCount || 0),
                recoveryContext: data.unifiedRecoveryContext || { permissionBoundary: safeProject, planBindings: data.plan ? [data.plan] : [], taskBindings: data.taskBindings || [] },
                contextComponents: options.contextComponents || options.context_components || {},
                providerUsage: state.providerUsage || null,
            };
        },
        validate: () => {
            const current = JSON.parse(fs.readFileSync(file, "utf8"));
            if (projectCompactionSourceChecksum(current) !== acquiredChecksum)
                throw new Error("project_compaction_fence_stale");
            if ((0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(safeProject, safeSessionId) && !ownsActiveDispatch)
                throw new Error("project_compaction_dispatch_started");
        },
        commit: (result, fence) => {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            if (projectCompactionSourceChecksum(data) !== fence.checksum)
                throw new Error("project_compaction_commit_fence_stale");
            const summary = result.fullCompaction.summary;
            if (!summary || summary.schema !== "ccm-unified-session-summary-v1")
                throw new Error("project_compaction_summary_missing");
            const preservedIds = result.preservedRecentWindow.messages.map((item) => String(item?.id || "")).filter(Boolean);
            const summarizedCount = Number(result.preservedRecentWindow.startIndex || 0);
            const previousBinding = (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(safeProject, safeSessionId);
            const rotation = (0, project_session_agent_binding_1.rotateProjectSessionAgentBinding)(safeProject, safeSessionId, `统一会话压缩 ${result.receipt.checksum.slice(0, 12)}`, ownsActiveDispatch ? expectedDispatchScopeId : "");
            const state = (0, unified_session_compaction_1.buildUnifiedSessionCompactionStateV1)({ receipt: result.receipt, summaryQuality: result.summaryQuality, microCompact: result.microCompact, recoveryContext: result.recoveryContext, triggerReason: options.reason || "automatic", summarizedThroughMessageId: data.history?.[summarizedCount - 1]?.id || "", summarizedMessageCount: summarizedCount, preservedRecentMessageIds: preservedIds });
            try {
                data.unifiedSessionSummary = summary;
                data.unifiedSessionCompaction = state;
                data.unifiedRecoveryContext = result.recoveryContext;
                data.unifiedSessionBoundary = { summarizedMessageCount: summarizedCount, summarizedThroughMessageId: data.history?.[summarizedCount - 1]?.id || "", preservedRecentMessageIds: preservedIds, checksum: result.receipt.checksum };
                data.projectAgentGeneration = rotation.nextGeneration;
                data.updated_at = new Date().toISOString();
                persistSession(safeProject, safeSessionId, data);
            }
            catch (error) {
                (0, project_session_agent_binding_1.reopenProjectSessionAgentBinding)(safeProject, safeSessionId, "统一压缩提交失败，恢复旧世代");
                throw error;
            }
            void previousBinding;
        },
        failure: (error) => {
            const data = JSON.parse(fs.readFileSync(file, "utf8"));
            data.unifiedSessionCompactionFailure = { code: String(error?.code || "CCM_UNIFIED_COMPACTION_FAILED"), message: String(error?.message || error).slice(0, 300), at: new Date().toISOString(), contentStored: false };
            persistSession(safeProject, safeSessionId, data);
        },
    });
    const modelCall = options.modelCall || ((request) => (0, unified_session_compaction_model_1.callUnifiedCompactionModel)(config, request.system, request.user, request.maxOutputTokens));
    const engine = (0, unified_session_compaction_1.createUnifiedSessionCompactionEngine)({
        adapter,
        config: { ...config, autoCompactThreshold: modelCapacity.autoCompactThreshold },
        force: options.force,
        promptTooLong: options.promptTooLong,
        reason: options.reason,
        customInstructions: options.customInstructions,
        modelCall,
        buildProjection: (snapshot) => options.modelVisiblePayload || (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({ scope: "project", sessionId: `${safeProject}:${safeSessionId}`, system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model }, tools: options.tools || null, activeSummary: snapshot.activeSummary, recentMessages: (0, session_execution_ledger_1.mergeConversationWithExecution)(snapshot.messages, snapshot.executionEvents), currentRequest: options.currentRequest || null, recoveryContext: snapshot.recoveryContext, hookResults: [], contextComponents: options.contextComponents || options.context_components || {} }),
        buildPostCompactPayload: ({ summary, preservedTimeline, recoveryContext }) => (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({ scope: "project", sessionId: `${safeProject}:${safeSessionId}`, system: options.fixedContext || { project: safeProject, provider: modelCapacity.provider, model: modelCapacity.model }, tools: options.tools || null, activeSummary: summary, recentMessages: preservedTimeline, currentRequest: options.currentRequest || null, recoveryContext, hookResults: [], contextComponents: options.contextComponents || options.context_components || {} }),
        measure: (payload) => Number(payload?.totalTokens || (0, context_budget_1.estimateTextTokens)(JSON.stringify(payload || {}))),
        qualityReference: () => ({ authorizationBoundaries: [safeProject], fileReferences: [], verificationEvidence: [], pendingWork: [], sourceMessageIds: [] }),
    });
    const result = await engine.run();
    const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
        compacted: result.compacted,
        reason: result.reason,
        before_tokens: result.receipt.beforeTokens,
        after_tokens: result.receipt.afterTokens,
        summary_source: result.receipt.summarySource,
        boundary_generation: result.boundaryGeneration,
        boundaryGeneration: result.boundaryGeneration,
        boundary: persisted.unifiedSessionBoundary || null,
        receipt: result.receipt,
        unifiedSessionSummary: result.fullCompaction.summary,
        unifiedSessionCompaction: result.receipt,
        model_context_capacity: modelCapacity,
        auto_compact_threshold: modelCapacity.autoCompactThreshold,
        contentStored: false,
    };
}
function createProjectSessionCompactionAdapter(input) {
    return (0, unified_session_compaction_adapters_1.createUnifiedScopeAdapter)({
        load: async () => ({ scope: "project", exactSessionId: `${input.project}:${input.sessionId}`, ...(await input.load()) }),
        acquire: input.acquire,
        commit: input.commit,
        failure: input.failure,
        validate: input.validate,
    });
}
function getProjectSessionCompactionActivity(project, projectSessionId) {
    let scopeId = "";
    try {
        scopeId = (0, project_session_agent_binding_1.buildProjectSessionAgentScopeId)((0, project_validation_1.validateProjectName)(project), (0, project_validation_1.validateSessionId)(projectSessionId));
    }
    catch { }
    const active = scopeId ? compactions.get(scopeId) : null;
    return active ? {
        active: true,
        status: "running",
        stage: "model_compaction",
        reason: active.reason,
        startedAt: active.startedAt,
        updatedAt: active.startedAt,
    } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}
function sessionFile(project, projectSessionId) {
    return (0, project_validation_1.resolveContainedPath)(path.join(utils_1.CCM_DIR, "web-sessions"), (0, project_validation_1.validateProjectName)(project), `${(0, project_validation_1.validateSessionId)(projectSessionId)}.json`);
}
function findCcSessionFile(project) {
    if (!fs.existsSync(utils_1.SESSIONS_DIR))
        return "";
    const escaped = (0, project_validation_1.validateProjectName)(project).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const files = fs.readdirSync(utils_1.SESSIONS_DIR).filter(file => new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`).test(file));
    const selected = files.find(file => file !== `${project}.json`) || files[0];
    return selected ? (0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, selected) : "";
}
function writeAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
    fs.renameSync(temp, file);
}
function persistSession(project, projectSessionId, value) {
    writeAtomic(sessionFile(project, projectSessionId), value);
    const ccFile = findCcSessionFile(project);
    if (!ccFile || !fs.existsSync(ccFile))
        return;
    const data = JSON.parse(fs.readFileSync(ccFile, "utf8"));
    data.sessions = data.sessions || {};
    const { execution_history, executionHistory, execution_history_version, ...sharedSessionValue } = value || {};
    data.sessions[projectSessionId] = sharedSessionValue;
    writeAtomic(ccFile, data);
}
function projectExecutionEvents(data) {
    return (0, session_execution_ledger_1.normalizeSessionExecutionEvents)(data?.execution_history || data?.executionHistory);
}
function listProjectSessionExecutionEvents(projectInput, projectSessionIdInput) {
    try {
        const project = (0, project_validation_1.validateProjectName)(projectInput);
        const projectSessionId = (0, project_validation_1.validateSessionId)(projectSessionIdInput);
        const file = sessionFile(project, projectSessionId);
        if (!fs.existsSync(file))
            return [];
        return projectExecutionEvents(JSON.parse(fs.readFileSync(file, "utf8")));
    }
    catch {
        return [];
    }
}
function listProjectSessionHistoryMessages(projectInput, projectSessionIdInput) {
    try {
        const project = (0, project_validation_1.validateProjectName)(projectInput);
        const projectSessionId = (0, project_validation_1.validateSessionId)(projectSessionIdInput);
        const file = sessionFile(project, projectSessionId);
        if (!fs.existsSync(file))
            return [];
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        return (Array.isArray(data.history) ? data.history : []).filter((message) => ["user", "assistant"].includes(String(message?.role || "")));
    }
    catch {
        return [];
    }
}
function projectExecutionForMessages(data, messages) {
    return (0, session_execution_ledger_1.eventsAnchoredToMessages)(projectExecutionEvents(data), messages);
}
function projectModelTimeline(data, messages) {
    return (0, session_execution_ledger_1.mergeConversationWithExecution)(messages, projectExecutionForMessages(data, messages));
}
function appendProjectSessionExecutionEvent(projectInput, projectSessionIdInput, event) {
    const project = (0, project_validation_1.validateProjectName)(projectInput);
    const projectSessionId = (0, project_validation_1.validateSessionId)(projectSessionIdInput);
    const file = sessionFile(project, projectSessionId);
    if (!fs.existsSync(file))
        return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const events = projectExecutionEvents(data);
    const type = String(event?.type || "") === "tool_use" || String(event?.type || "") === "tool_started" ? "tool_use" : "tool_result";
    const toolName = String(event?.toolName || event?.tool_name || event?.tool || "tool");
    const runId = String(event?.runId || event?.run_id || "");
    const toolCallId = type === "tool_result"
        ? (String(event?.toolCallId || event?.tool_call_id || "") || (0, session_execution_ledger_1.findPendingToolCallId)(events, runId, toolName))
        : String(event?.toolCallId || event?.tool_call_id || "");
    const history = Array.isArray(data.history) ? data.history : [];
    const anchor = [...history].reverse().find((message) => message?.role === "user") || history.at(-1) || null;
    const created = (0, session_execution_ledger_1.createSessionExecutionEvent)({
        type,
        toolName,
        toolCallId,
        runId,
        traceId: String(event?.traceId || event?.trace_id || ""),
        anchorMessageId: String(event?.anchorMessageId || event?.anchor_message_id || anchor?.id || ""),
        timestamp: event?.timestamp || event?.at || new Date().toISOString(),
        status: event?.status === "error" || event?.error ? "error" : type === "tool_use" ? "running" : "ok",
        payload: event?.payload ?? (type === "tool_use" ? { arguments: event?.arguments || {} } : { observation: event?.observation ?? null, error: event?.error || "" }),
        persistContext: { scope: "project", sessionId: projectSessionId },
    });
    if (!events.some(item => item.id === created.id))
        events.push(created);
    if (event?.taskId || event?.task_id) {
        (0, session_task_timeline_1.appendSessionTimelineEvent)({
            exactSessionId: projectSessionId,
            scope: "project",
            scopeId: project,
            type,
            eventId: `execution:${created.id}`,
            taskId: String(event?.taskId || event?.task_id),
            workItemId: event?.workItemId || event?.work_item_id,
            generation: event?.generation,
            attempt: event?.attempt,
            leaseId: event?.leaseId || event?.lease_id,
            payloadRef: created.id,
            timestamp: created.timestamp,
        });
    }
    data.execution_history_version = 1;
    data.execution_history = events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    data.updated_at = new Date().toISOString();
    persistSession(project, projectSessionId, data);
    return created;
}
function projectCompactionState(data, project, projectSessionId) {
    const unified = data?.unifiedSessionCompaction || null;
    if (!unified || unified.schema !== "ccm-unified-session-compaction-state-v1")
        return {
            schema: "ccm-unified-session-compaction-state-v1",
            scope: "project",
            exactSessionId: `${project}:${projectSessionId}`,
            activeSummary: null,
            boundaryGeneration: 0,
            summarizedMessageCount: 0,
            preservedRecentMessageIds: [],
            latestProviderUsage: null,
        };
    return {
        ...unified,
        activeSummary: data?.unifiedSessionSummary || null,
        activeSummaryChecksum: String(unified.summaryChecksum || ""),
        lastCompactedIndex: Math.max(-1, Number(unified.summarizedMessageCount || 0) - 1),
        lastCompactedMessageId: String(unified.summarizedThroughMessageId || ""),
        preservedRecentMessageIds: Array.isArray(unified.preservedRecentMessageIds) ? unified.preservedRecentMessageIds : [],
        boundaryGeneration: Number(unified.boundaryGeneration || 0),
    };
}
function resolveProjectCompactionCapacity(data, config, binding, state, requested = {}) {
    const provider = String(requested.provider || state.latestProviderUsage?.provider || binding.provider || "");
    const model = String(requested.model || state.latestProviderUsage?.model || data?.agent_model || data?.model || "");
    const policy = data?.compaction_policy || data?.memory_context_policy || {};
    const explicitWindow = Number(policy.modelContextWindow || policy.model_context_window || 0);
    const trusted = (0, model_capability_cache_1.resolveTrustedModelContextCapacity)({
        provider,
        model,
        ...(explicitWindow > 0 ? {
            modelContextWindow: explicitWindow,
            modelMaxOutputTokens: Number(policy.maxOutputTokens || policy.max_output_tokens || 20_000),
            capacityCheckedAt: policy.updatedAt || policy.updated_at || new Date().toISOString(),
        } : {}),
    });
    const globalCapacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
    const resolved = explicitWindow > 0 || trusted.conservativeFallback !== true ? trusted : globalCapacity;
    const explicitThreshold = Number(policy.autoCompactThreshold || policy.auto_compact_threshold || 0);
    return {
        ...resolved,
        provider,
        model,
        autoCompactThreshold: explicitThreshold > 0 ? explicitThreshold : Number(resolved.autoCompactThreshold || globalCapacity.autoCompactThreshold || 0),
        resolution: explicitWindow > 0 ? "exact_scope_override" : trusted.conservativeFallback !== true ? "trusted_provider_model" : "global_user_preset",
    };
}
function pendingProjectRequest(history, value) {
    if (value == null || value === "")
        return null;
    const content = typeof value === "string" ? value : String(value?.content || JSON.stringify(value));
    const last = history.at(-1);
    if (String(last?.role || "") === "user" && String(last?.content || "") === content)
        return null;
    return typeof value === "string" ? { role: "user", content } : value;
}
function recordProjectSessionProviderUsage(project, projectSessionId, input = {}) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(projectSessionId);
    const file = sessionFile(safeProject, safeSessionId);
    if (!fs.existsSync(file))
        return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const state = projectCompactionState(data, safeProject, safeSessionId);
    const history = Array.isArray(data.history) ? data.history.filter((message) => ["user", "assistant"].includes(String(message?.role || ""))) : [];
    const visibleMessages = history.slice(state.lastCompactedIndex + 1);
    const modelVisibleMessages = projectModelTimeline(data, visibleMessages);
    const currentRequest = pendingProjectRequest(visibleMessages, input.currentRequest || input.current_request);
    const suppliedPayload = input.modelVisiblePayload || input.model_visible_payload || null;
    const payload = (0, session_compaction_core_1.isModelVisiblePayloadSnapshot)(suppliedPayload) ? suppliedPayload : (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "project",
        sessionId: `${safeProject}:${safeSessionId}`,
        exactSessionId: safeSessionId,
        provider: String(input.provider || ""),
        model: String(input.model || ""),
        protocol: String(input.protocol || input.format || ""),
        modelConfig: input.modelConfig || { provider: input.provider, model: input.model, format: input.protocol || input.format },
        system: input.fixedContext || input.fixed_context || null,
        tools: input.tools || null,
        activeSummary: state.activeSummary || null,
        recentMessages: modelVisibleMessages,
        currentRequest,
        recoveryContext: input.recoveryContext || input.recovery_context || null,
        hookResults: input.hookResults || input.hook_results || [],
        contextComponents: input.contextComponents || input.context_components || undefined,
    });
    const usage = (0, session_compaction_core_1.normalizeSessionProviderUsage)({
        ...(input || {}),
        scope: "project",
        sessionId: `${safeProject}:${safeSessionId}`,
        providerIdentityChecksum: input.providerIdentityChecksum || (0, ccm_context_accounting_v2_1.buildCcmProviderIdentityChecksum)({ provider: input.provider, model: input.model, protocol: input.protocol || input.format, endpoint: input.endpoint || input.apiUrl }),
        boundaryGeneration: state.boundaryGeneration,
        payloadChecksum: input.payloadChecksum || input.payload_checksum || payload.payloadChecksum,
        fixedContextChecksum: input.fixedContextChecksum || input.fixed_context_checksum || payload.fixedContextChecksum,
        estimatedFixedTokens: input.estimatedFixedTokens || input.estimated_fixed_tokens || (0, session_compaction_core_1.modelVisibleFixedTokens)(payload),
        estimatedContextTokens: input.estimatedContextTokens || input.estimated_context_tokens || payload.totalTokens,
        estimatedPayloadTokens: input.estimatedPayloadTokens || input.estimated_payload_tokens || payload.totalTokens,
    });
    const measurementUsage = usage || state.latestProviderUsage;
    const tokenMeasurement = (0, session_compaction_core_1.measureSessionContextTokens)({
        scope: "project",
        sessionId: `${safeProject}:${safeSessionId}`,
        messages: modelVisibleMessages,
        activeSummary: state.activeSummary,
        latestProviderUsage: measurementUsage,
        provider: String(measurementUsage?.provider || ""),
        model: String(measurementUsage?.model || ""),
        protocol: String(measurementUsage?.protocol || input.protocol || input.format || ""),
        endpoint: String(measurementUsage?.endpoint || input.endpoint || input.apiUrl || ""),
        generation: Number(measurementUsage?.generation || 0),
        boundaryGeneration: state.boundaryGeneration,
        modelVisiblePayload: payload,
    });
    const accounting = (0, session_compaction_core_1.modelVisiblePayloadAccounting)(payload);
    const nextState = {
        ...state,
        latestProviderUsage: measurementUsage || null,
        tokenMeasurement,
        modelVisiblePayload: accounting,
        modelVisiblePayloadChecksum: payload.payloadChecksum,
        fixedContextChecksum: payload.fixedContextChecksum,
        pendingRequestChecksum: payload.pendingRequestChecksum,
        recoveryContextTokens: payload.tokenBreakdown.recoveryContext,
        hookResultTokens: payload.tokenBreakdown.hookResults,
    };
    data.unifiedSessionCompaction = {
        ...data.unifiedSessionCompaction,
        ...nextState,
        providerUsage: measurementUsage || null,
        tokenMeasurement,
        modelVisiblePayload: accounting,
    };
    data.updated_at = new Date().toISOString();
    persistSession(safeProject, safeSessionId, data);
    return usage;
}
function scheduleProjectSessionMemoryExtraction(project, projectSessionId, options = {}) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(projectSessionId);
    const file = sessionFile(safeProject, safeSessionId);
    if (!fs.existsSync(file))
        return { scheduled: false, reason: "session_missing" };
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const promise = compactProjectSessionWithModel(safeProject, safeSessionId, {
        reason: "automatic",
        modelCall: options.modelCall,
    });
    void promise.catch(() => undefined);
    return { scheduled: true, unified: true, promise };
}
function summaryChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value || null)).digest("hex");
}
async function compactProjectSessionWithModel(project, projectSessionId, options = {}) {
    return runUnifiedProjectSessionCompaction(project, projectSessionId, options);
}
function projectSessionMessageContent(value) {
    const content = value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "content")
        ? value.content
        : value;
    if (typeof content === "string")
        return content;
    try {
        return JSON.stringify(content);
    }
    catch {
        return String(content || "");
    }
}
function excludePendingProjectRequest(history, currentRequest) {
    if (currentRequest == null || currentRequest === "")
        return { history, deduplicated: false };
    const last = history.at(-1);
    const matchesSavedRequest = String(last?.role || "") === "user"
        && projectSessionMessageContent(last) === projectSessionMessageContent(currentRequest);
    return matchesSavedRequest
        ? { history: history.slice(0, -1), deduplicated: true }
        : { history, deduplicated: false };
}
function buildProjectSessionPostCompactContext(project, projectSessionId, targetAgentType = "", options = {}) {
    const binding = (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(project, projectSessionId);
    const targetProvider = targetAgentType ? (0, runtime_1.normalizeAgentRuntimeId)(targetAgentType) : "";
    if (binding.status === "open"
        && binding.turn_count > 0
        && (!targetProvider || binding.provider === targetProvider))
        return "";
    const projection = buildProjectSessionModelContextProjection(project, projectSessionId, { ...options, persistMicroCompactReceipt: true });
    if (!projection)
        return "";
    if (!projection.summary && !projection.visibleMessages.length)
        return "";
    return [
        "【当前项目逻辑会话连续性上下文】",
        "这是 CCM 为新第三方 Agent 会话世代恢复的历史上下文。执行前仍须核验当前文件和真实状态。",
        projection.rendered,
    ].join("\n");
}
function buildProjectSessionModelContextProjection(project, projectSessionId, options = {}) {
    const file = sessionFile(project, projectSessionId);
    if (!fs.existsSync(file))
        return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const state = projectCompactionState(data, project, projectSessionId);
    const sessionTaskIndex = (0, session_task_timeline_2.readVerifiedSessionTaskIndex)({ exactSessionId: projectSessionId, scope: "project", scopeId: project });
    const summary = data.unifiedSessionSummary || state.activeSummary || null;
    const history = Array.isArray(data.history)
        ? data.history.filter((message) => ["user", "assistant"].includes(String(message?.role || "")))
        : [];
    const canonicalSummary = !!summary;
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const unified = (0, session_model_context_1.buildUnifiedSessionModelContextProjection)({
        scope: "project",
        scopeId: `${project}:${projectSessionId}`,
        sessionId: projectSessionId,
        messages: history,
        executionEvents: projectExecutionEvents(data),
        canonicalSummary: canonicalSummary ? summary : null,
        summarySource: canonicalSummary ? "model" : "",
        summaryChecksum: canonicalSummary ? summaryChecksum(summary) : "",
        boundaryGeneration: Number(state.boundaryGeneration || 0),
        summarizedThroughIndex: Number(state.lastCompactedIndex || -1),
        lastSummarizedMessageId: String(state.summarizedThroughMessageId || ""),
        currentRequest: options.currentRequest,
        microCompact: (0, session_model_context_1.resolveSessionModelMicroCompactPolicy)(config, {
            contextTokens: Number(state.tokenMeasurement?.activeTokens || 0),
            pressureThresholdTokens: Number(state.autoCompactThreshold || 0),
        }),
        currentTaskId: sessionTaskIndex.activeTaskId,
        sessionTaskIndex,
    });
    return {
        ...unified,
        schema: "ccm-project-session-model-context-v1",
        project,
        projectSessionId,
        lastCompactedIndex: Number(state.lastCompactedIndex || -1),
    };
}
//# sourceMappingURL=project-session-compaction.js.map