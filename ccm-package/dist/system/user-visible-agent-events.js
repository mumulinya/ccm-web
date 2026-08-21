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
exports.USER_VISIBLE_AGENT_RESULT_SCHEMA = exports.USER_VISIBLE_AGENT_EVENT_SCHEMA = void 0;
exports.sanitizeUserVisibleAgentDetail = sanitizeUserVisibleAgentDetail;
exports.normalizeUserVisibleAgentEvent = normalizeUserVisibleAgentEvent;
exports.appendUserVisibleAgentEvent = appendUserVisibleAgentEvent;
exports.appendAssistantProgress = appendAssistantProgress;
exports.appendUserVisibleRequirementPlan = appendUserVisibleRequirementPlan;
exports.listUserVisibleAgentEvents = listUserVisibleAgentEvents;
exports.getUserVisibleAgentEvent = getUserVisibleAgentEvent;
exports.subscribeUserVisibleAgentEvents = subscribeUserVisibleAgentEvents;
exports.publishEphemeralUserVisibleAgentEvent = publishEphemeralUserVisibleAgentEvent;
exports.buildUserVisibleAgentResult = buildUserVisibleAgentResult;
exports.appendToolProjection = appendToolProjection;
exports.clearUserVisibleAgentEventsForTest = clearUserVisibleAgentEventsForTest;
exports.runUserVisibleAgentEventSelfTest = runUserVisibleAgentEventSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const context_budget_1 = require("./context-budget");
const tool_display_projection_1 = require("./tool-display-projection");
const assistant_progress_1 = require("./assistant-progress");
const completion_summary_1 = require("./completion-summary");
exports.USER_VISIBLE_AGENT_EVENT_SCHEMA = "ccm-user-visible-agent-event-v1";
exports.USER_VISIBLE_AGENT_RESULT_SCHEMA = "ccm-user-visible-agent-result-v1";
const STORE_ROOT = path.resolve(process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || path.join(os.homedir(), ".cc-connect", "agent-execution-events"));
const MAX_EVENTS_PER_SESSION = 3_000;
const listeners = new Set();
const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)(?:$|_)/i;
const BODY_KEY = /^(?:prompt|systemPrompt|system_prompt|rawPrompt|raw_prompt|body|content|text|output|rawOutput|raw_output|context|sourceCode|source_code|webpage|html|notebookOutput|notebook_output|command|script|shellCommand|shell_command|cmd|env|environment)$/i;
const NATIVE_ID_KEY = /(?:native[_-]?session|provider[_-]?request[_-]?id|lease[_-]?id|trace[_-]?id)/i;
const INLINE_SECRET = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;
function now() { return new Date().toISOString(); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function compactText(value, max = 500) {
    return String(value ?? "")
        .replace(INLINE_SECRET, "$1[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, max);
}
function uniqueStrings(value, max = 100) {
    return [...new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(item => compactText(item, 500)).filter(Boolean))].slice(0, max);
}
function sanitizePromptDescriptor(value) {
    if (!value || typeof value !== "object" || value.schema !== "ccm-internal-prompt-v1" || value.language !== "en" || value.visibility !== "internal_only")
        return null;
    const promptId = compactText(value.promptId, 160);
    const promptVersion = compactText(value.promptVersion, 80);
    const scope = ["global", "group", "project", "child_agent", "test_agent", "runtime"].includes(String(value.scope)) ? value.scope : "runtime";
    const checksum = compactText(value.checksum, 128);
    if (!promptId || !promptVersion || !checksum || value.contentStored !== false)
        return null;
    return { schema: "ccm-internal-prompt-v1", promptId, promptVersion, language: "en", scope, visibility: "internal_only", checksum, contentStored: false };
}
function sanitizePromptBindings(value) {
    if (!value || typeof value !== "object")
        return null;
    const skills = (Array.isArray(value.skills) ? value.skills : []).map((item) => ({
        name: compactText(item?.name, 160),
        ...(item?.version ? { version: compactText(item.version, 80) } : {}),
        checksum: compactText(item?.checksum, 128),
        language: "en",
    })).filter((item) => item.name && item.checksum);
    const mcp = (Array.isArray(value.mcp) ? value.mcp : []).map((item) => ({
        name: compactText(item?.name, 160),
        ...(item?.version ? { version: compactText(item.version, 80) } : {}),
        checksum: compactText(item?.checksum, 128),
        language: "en",
    })).filter((item) => item.name && item.checksum);
    const system = sanitizePromptDescriptor(value.system);
    const developer = sanitizePromptDescriptor(value.developer);
    if (!system && !developer && !skills.length && !mcp.length)
        return null;
    return { ...(system ? { system } : {}), ...(developer ? { developer } : {}), skills, mcp };
}
function sanitizeUserVisibleAgentDetail(value, depth = 0, seen = new WeakSet()) {
    if (depth > 7)
        return "[depth-limited]";
    if (typeof value === "string")
        return compactText(value, 1_500);
    if (value == null || typeof value !== "object")
        return value;
    if (seen.has(value))
        return "[circular]";
    seen.add(value);
    if (Buffer.isBuffer(value) || value instanceof Uint8Array)
        return `[binary:${value.byteLength}]`;
    if (Array.isArray(value))
        return value.slice(0, 40).map(item => sanitizeUserVisibleAgentDetail(item, depth + 1, seen));
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
        if (SECRET_KEY.test(key))
            output[key] = "[redacted]";
        else if (BODY_KEY.test(key))
            output[`${key}Checksum`] = hash(nested).slice(0, 24);
        else if (NATIVE_ID_KEY.test(key))
            output[`${key}Checksum`] = hash(nested).slice(0, 24);
        else
            output[key] = sanitizeUserVisibleAgentDetail(nested, depth + 1, seen);
    }
    return output;
}
function sanitizeUserVisibleFileChanges(value) {
    return (Array.isArray(value) ? value : []).slice(0, 100).map((item) => {
        if (typeof item === "string")
            return { path: compactText(item, 500) };
        const pathValue = compactText(item?.path || item?.file || item?.name, 500);
        if (!pathValue)
            return null;
        const additions = Number(item?.additions ?? item?.diff?.additions);
        const deletions = Number(item?.deletions ?? item?.diff?.deletions);
        return {
            path: pathValue,
            ...(compactText(item?.project || item?.target_project || item?.projectName || item?.agent, 240)
                ? { project: compactText(item?.project || item?.target_project || item?.projectName || item?.agent, 240) } : {}),
            ...(compactText(item?.statusText || item?.status, 80) ? { status: compactText(item?.statusText || item?.status, 80) } : {}),
            ...(Number.isFinite(additions) ? { additions: Math.max(0, additions) } : {}),
            ...(Number.isFinite(deletions) ? { deletions: Math.max(0, deletions) } : {}),
            ...(item?.binary === true ? { binary: true } : {}),
            ...(item?.deleted === true ? { deleted: true } : {}),
        };
    }).filter(Boolean);
}
function normalizeRequirementPlanStepStatus(value) {
    const status = String(value || "pending").toLowerCase();
    if (["completed", "done", "success", "succeeded", "accepted"].includes(status))
        return "completed";
    if (["running", "in_progress", "executing", "awaiting_review", "reworking", "reviewing"].includes(status))
        return "running";
    if (["blocked", "failed", "rejected", "needs_confirmation"].includes(status))
        return "blocked";
    if (["skipped", "cancelled", "canceled"].includes(status))
        return "skipped";
    return "pending";
}
function sanitizeUserVisibleRequirementPlan(value) {
    if (!value || typeof value !== "object")
        return null;
    const planId = compactText(value.planId || value.plan_id || value.id, 240);
    const title = compactText(value.title || "需求实施计划", 160) || "需求实施计划";
    const overview = compactText(value.overview || value.body, 4000);
    const goal = compactText(value.goal || value.summary || value.objective || overview, 1200);
    const steps = (Array.isArray(value.steps) ? value.steps : [])
        .slice(0, 30)
        .map((step, index) => {
        const stepTitle = compactText(step?.title || step?.label || step?.objective, 240);
        if (!stepTitle)
            return null;
        return {
            id: compactText(step?.id || `step_${index + 1}`, 100),
            title: stepTitle,
            description: compactText(step?.description || step?.detail, 200),
            outcome: compactText(step?.outcome || step?.expectedResult || step?.expected_result || step?.acceptance?.[0], 160),
            ...(compactText(step?.project || step?.projectName || step?.project_name, 160)
                ? { project: compactText(step?.project || step?.projectName || step?.project_name, 160) } : {}),
            dependsOn: uniqueStrings(step?.dependsOn || step?.depends_on, 20).map(item => compactText(item, 100)),
            status: normalizeRequirementPlanStepStatus(step?.status),
        };
    })
        .filter(Boolean);
    if (!planId || !goal || !steps.length)
        return null;
    const rawStatus = String(value.status || "ready").toLowerCase();
    const status = ["ready", "executing", "completed", "blocked", "superseded"].includes(rawStatus)
        ? rawStatus
        : "ready";
    const createdAt = compactText(value.createdAt || value.created_at, 40) || now();
    const updatedAt = compactText(value.updatedAt || value.updated_at, 40) || createdAt;
    const projected = {
        schema: "ccm-user-visible-requirement-plan-v1",
        planId,
        revision: Math.max(1, Number(value.revision || 1)),
        title,
        goal,
        ...(overview ? { overview } : {}),
        steps,
        scope: uniqueStrings(value.scope || value.scopes, 20).map(item => compactText(item, 300)),
        expectedResults: uniqueStrings(value.expectedResults || value.expected_results, 24).map(item => compactText(item, 600)),
        exclusions: uniqueStrings(value.exclusions || value.outOfScope || value.out_of_scope, 20).map(item => compactText(item, 600)),
        status,
        createdAt,
        updatedAt,
        contentStored: false,
        ...(value.quality && typeof value.quality === "object" ? {
            quality: {
                ok: value.quality.ok === true,
                repaired: value.quality.repaired === true,
                issues: uniqueStrings(value.quality.issues, 12).map(item => compactText(item, 240)),
            },
        } : {}),
    };
    return { ...projected, planChecksum: hash(projected) };
}
function normalizeScope(value) {
    const scope = String(value || "").toLowerCase();
    if (scope === "project" || scope === "group")
        return scope;
    return "global";
}
function sanitizeAvailableActions(value) {
    const allowedKinds = new Set([
        "retry", "resolve_permission", "view_error", "recheck", "takeover",
    ]);
    const seen = new Set();
    return (Array.isArray(value) ? value : []).slice(0, 8).flatMap((item) => {
        const kind = String(item?.kind || "").trim();
        const id = compactText(item?.id || kind, 100);
        if (!id || !allowedKinds.has(kind) || seen.has(id))
            return [];
        seen.add(id);
        return [{
                id,
                kind,
                label: compactText(item?.label || {
                    retry: "重试", resolve_permission: "处理授权", view_error: "查看错误",
                    recheck: "重新核验", takeover: "人工接管",
                }[kind], 80),
                enabled: item?.enabled !== false,
                ...(compactText(item?.disabledReason || item?.disabled_reason, 240)
                    ? { disabledReason: compactText(item?.disabledReason || item?.disabled_reason, 240) } : {}),
                ...(Number.isFinite(Number(item?.revision)) ? { revision: Math.max(0, Number(item.revision)) } : {}),
                ...(Number.isFinite(Number(item?.generation)) ? { generation: Math.max(0, Number(item.generation)) } : {}),
                ...(compactText(item?.bindingChecksum || item?.binding_checksum, 120)
                    ? { bindingChecksum: compactText(item?.bindingChecksum || item?.binding_checksum, 120) } : {}),
            }];
    });
}
function explicitFailureActions(input) {
    const source = input?.detail || {};
    const revision = Number(source.revision ?? input?.revision);
    const generation = Number(input?.generation ?? source.generation);
    const bindingChecksum = compactText(source.bindingChecksum || source.binding_checksum || input?.bindingChecksum || input?.binding_checksum, 120);
    const identity = {
        ...(Number.isFinite(revision) ? { revision: Math.max(0, revision) } : {}),
        ...(Number.isFinite(generation) ? { generation: Math.max(0, generation) } : {}),
        ...(bindingChecksum ? { bindingChecksum } : {}),
    };
    if (source.recoveryRequired === true || source.recovery_required === true)
        return [
            { id: "recheck", kind: "recheck", label: "重新核验", enabled: true, ...identity },
            { id: "takeover", kind: "takeover", label: "人工接管", enabled: true, ...identity },
        ];
    const actions = [];
    if (source.authorizationRequired === true || source.authorization_required === true) {
        actions.push({ id: "resolve_permission", kind: "resolve_permission", label: "处理授权", enabled: true, ...identity });
    }
    actions.push({ id: "view_error", kind: "view_error", label: "查看错误", enabled: true, ...identity });
    const sideEffectState = String(source.sideEffectState || source.side_effect_state || "").toLowerCase();
    if ((source.retryable === true || source.safeRetry === true || source.safe_retry === true)
        && ["", "none", "not_started", "safe", "read_only"].includes(sideEffectState)) {
        actions.unshift({ id: "retry", kind: "retry", label: "重试", enabled: true, ...identity });
    }
    return actions;
}
function eventStoreFile(scope, scopeId, exactSessionId) {
    const identity = `${scope}:${scopeId}:${exactSessionId}`;
    return path.join(STORE_ROOT, scope, `${hash(identity).slice(0, 32)}.json`);
}
function emptyStore(scope, scopeId, exactSessionId) {
    return {
        schema: "ccm-user-visible-agent-event-store-v1",
        revision: 0,
        scope,
        scopeId,
        exactSessionId,
        events: [],
        updatedAt: "",
        checksum: "",
    };
}
function storeChecksum(store) {
    const { checksum: _checksum, ...stable } = store;
    return hash(stable);
}
function readStore(scope, scopeId, exactSessionId) {
    const fallback = emptyStore(scope, scopeId, exactSessionId);
    const file = eventStoreFile(scope, scopeId, exactSessionId);
    const value = (0, atomic_json_file_1.readJsonWithBackup)(file, fallback);
    const store = {
        ...fallback,
        revision: Math.max(0, Number(value?.revision || 0)),
        events: Array.isArray(value?.events) ? value.events.filter((item) => item?.schema === exports.USER_VISIBLE_AGENT_EVENT_SCHEMA) : [],
        updatedAt: compactText(value?.updatedAt, 40),
        checksum: compactText(value?.checksum, 80),
    };
    if (store.checksum && store.checksum !== storeChecksum(store))
        return fallback;
    const safeEvents = store.events.filter(item => projectSafeStoredEvent(item) !== null);
    if (safeEvents.length !== store.events.length) {
        const repaired = {
            ...store,
            events: safeEvents,
            updatedAt: now(),
            checksum: "",
        };
        repaired.checksum = storeChecksum(repaired);
        try {
            (0, atomic_json_file_1.writeJsonAtomic)(file, repaired);
        }
        catch { }
        return repaired;
    }
    return store;
}
function toolPresentation(toolNameInput, args = {}) {
    const display = (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName: toolNameInput, arguments: args });
    return { title: display.tool.userLabel || display.tool.label, target: display.tool.target || "" };
}
function normalizeEventType(input) {
    const source = String(input || "").toLowerCase();
    if ([
        "turn_started", "thinking_status", "assistant_text_delta", "assistant_progress", "model_activity", "requirement_plan",
        "tool_started", "tool_progress", "tool_completed", "tool_failed",
        "agent_started", "agent_progress", "agent_completed", "agent_failed",
        "permission_required", "clarification_required", "context_compacted", "result",
    ].includes(source))
        return source;
    if (["tool_use", "tool_started"].includes(source))
        return "tool_started";
    if (["tool_result", "tool_completed"].includes(source))
        return "tool_completed";
    if (source === "tool_failed")
        return "tool_failed";
    if (source === "tool_activity" || source === "progress")
        return "tool_progress";
    if (source === "started")
        return "turn_started";
    if (["decision", "planning", "thinking"].includes(source))
        return "thinking_status";
    if (["clarification_required", "waiting_clarification"].includes(source))
        return "clarification_required";
    if (["waiting_confirmation", "permission_required"].includes(source))
        return "permission_required";
    if (["compacted", "context_compacted"].includes(source))
        return "context_compacted";
    if (["completed", "failed", "cancelled", "blocked", "result"].includes(source))
        return "result";
    if (source.startsWith("agent_"))
        return source;
    return "thinking_status";
}
function normalizeUserVisibleAgentEvent(input, sequence = 0) {
    const scope = normalizeScope(input?.scope);
    const scopeId = compactText(input?.scopeId || input?.scope_id || (scope === "global" ? "global" : ""), 240);
    const exactSessionId = compactText(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id, 240);
    if (!scopeId || !exactSessionId)
        throw new Error("用户可见Agent事件缺少精确作用域或会话身份");
    const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
    const args = input?.arguments || input?.args || input?.tool?.arguments || input?.detail?.safeArguments || {};
    let eventType = normalizeEventType(input?.eventType || input?.event_type || input?.type);
    if (/dispatch|test_agent|skill_fork/i.test(String(toolName))) {
        if (eventType === "tool_started")
            eventType = "agent_started";
        if (eventType === "tool_progress")
            eventType = "agent_progress";
        if (eventType === "tool_completed")
            eventType = "agent_completed";
        if (eventType === "tool_failed")
            eventType = "agent_failed";
    }
    const presentation = toolPresentation(toolName, args);
    const status = input?.display?.status || (eventType.endsWith("_failed") ? "failed"
        : eventType.endsWith("_completed") || eventType === "context_compacted" || (eventType === "result" && !input?.error) ? "success"
            : ["permission_required", "clarification_required"].includes(eventType) ? "waiting" : "running");
    const createdAt = compactText(input?.createdAt || input?.created_at || input?.timestamp || input?.at, 40) || now();
    const display = {
        title: compactText(input?.display?.title || input?.title || presentation.title || "Agent", 200),
        ...(compactText(input?.display?.target || input?.target || presentation.target, 300) ? { target: compactText(input?.display?.target || input?.target || presentation.target, 300) } : {}),
        ...(compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 600) ? { summary: compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 600) } : {}),
        status,
        ...(Number.isFinite(Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) ? { durationMs: Math.max(0, Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) } : {}),
        ...(Number.isFinite(Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) ? { toolUseCount: Math.max(0, Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) } : {}),
        ...(Number.isFinite(Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) ? { tokenCount: Math.max(0, Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) } : {}),
        ...(["tool_output", "provider_total"].includes(String(input?.display?.tokenType || input?.tokenType || input?.token_type))
            ? { tokenType: String(input?.display?.tokenType || input?.tokenType || input?.token_type) } : {}),
        ...(["reported", "estimated"].includes(String(input?.display?.tokenAccuracy || input?.tokenAccuracy || input?.token_accuracy))
            ? { tokenAccuracy: String(input?.display?.tokenAccuracy || input?.tokenAccuracy || input?.token_accuracy) } : {}),
    };
    const detailSource = input?.detail || {};
    const taskIdentity = compactText(input?.taskId || input?.task_id, 240);
    const anchorIdentity = compactText(input?.anchorMessageId || input?.anchor_message_id, 240);
    const turnIdentity = compactText(input?.turnId || input?.turn_id || input?.executionTurnId || input?.execution_turn_id, 240);
    const responseIdentity = compactText(input?.responseMessageId || input?.response_message_id, 240);
    const workItemIdentity = compactText(input?.workItemId || input?.work_item_id || detailSource?.causalRefs?.workItemId || detailSource?.causal_refs?.work_item_id, 240);
    const planStepIdentity = compactText(detailSource?.causalRefs?.planStepId || detailSource?.causal_refs?.plan_step_id || input?.planStepId || input?.plan_step_id, 160);
    const batchIdentity = compactText(detailSource?.progress?.batchId || detailSource?.progress?.batch_id || detailSource?.replayLink?.batchId || detailSource?.replay_link?.batch_id, 160);
    const causalEvidenceIds = uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids, 64);
    const dependencyIds = uniqueStrings(detailSource?.causalRefs?.dependencyIds || detailSource?.causal_refs?.dependency_ids || input?.dependencyIds || input?.dependency_ids, 40);
    const criterionIds = uniqueStrings(detailSource?.causalRefs?.criterionIds || detailSource?.causal_refs?.criterion_ids || input?.criterionIds || input?.criterion_ids, 40);
    const eventAttempt = Math.max(1, Number(detailSource?.agentDisplay?.attempt || detailSource?.executionStage?.attempt || input?.attempt || 1));
    const suppliedAttempt = Number(input?.attempt ?? input?.executionAttempt ?? input?.execution_attempt);
    const detail = {
        ...(Number(detailSource.toolContractVersion || detailSource.tool_contract_version || input?.toolContractVersion || input?.tool_contract_version) === 3
            ? { toolContractVersion: 3 } : {}),
        ...(args && Object.keys(args).length ? { safeArguments: sanitizeUserVisibleAgentDetail(args) } : {}),
        ...(detailSource.safeResult != null || input?.observation != null || input?.result != null
            ? { safeResult: sanitizeUserVisibleAgentDetail(detailSource.safeResult ?? input?.observation ?? input?.result) } : {}),
        ...(uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids).length
            ? { evidenceIds: uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids) } : {}),
        ...(Array.isArray(detailSource.fileChanges || input?.fileChanges || input?.file_changes || input?.result?.fileChanges || input?.result?.file_changes)
            ? { fileChanges: sanitizeUserVisibleFileChanges(detailSource.fileChanges || input?.fileChanges || input?.file_changes || input?.result?.fileChanges || input?.result?.file_changes) } : {}),
        ...(detailSource.usage || input?.usage ? { usage: sanitizeUserVisibleAgentDetail(detailSource.usage || input?.usage) } : {}),
        ...(detailSource.agentDisplay && typeof detailSource.agentDisplay === "object" ? {
            agentDisplay: sanitizeUserVisibleAgentDetail({
                projectId: compactText(detailSource.agentDisplay.projectId || detailSource.agentDisplay.project_id, 240),
                projectName: compactText(detailSource.agentDisplay.projectName || detailSource.agentDisplay.project_name, 240),
                runtimeLabel: compactText(detailSource.agentDisplay.runtimeLabel || detailSource.agentDisplay.runtime_label, 120),
                workItemTitle: compactText(detailSource.agentDisplay.workItemTitle || detailSource.agentDisplay.work_item_title, 300),
                phase: compactText(detailSource.agentDisplay.phase, 120),
                attempt: Math.max(1, Number(detailSource.agentDisplay.attempt || 1)),
                ...(Number.isFinite(Number(detailSource.agentDisplay.queuePosition ?? detailSource.agentDisplay.queue_position))
                    ? { queuePosition: Math.max(1, Number(detailSource.agentDisplay.queuePosition ?? detailSource.agentDisplay.queue_position)) }
                    : {}),
                isParallel: detailSource.agentDisplay.isParallel === true || detailSource.agentDisplay.is_parallel === true,
            }),
        } : {}),
        ...(detailSource.executionStage && typeof detailSource.executionStage === "object"
            && ["preparation", "coordination_dispatch", "project_execution", "independent_verification", "main_agent_summary"].includes(String(detailSource.executionStage.kind)) ? {
            executionStage: sanitizeUserVisibleAgentDetail({
                kind: String(detailSource.executionStage.kind),
                stageRunId: compactText(detailSource.executionStage.stageRunId || detailSource.executionStage.stage_run_id, 240),
                ...(compactText(detailSource.executionStage.reviewCycleId || detailSource.executionStage.review_cycle_id, 240)
                    ? { reviewCycleId: compactText(detailSource.executionStage.reviewCycleId || detailSource.executionStage.review_cycle_id, 240) } : {}),
                attempt: Math.max(1, Number(detailSource.executionStage.attempt || 1)),
                startedAt: compactText(detailSource.executionStage.startedAt || detailSource.executionStage.started_at, 40),
                ...(compactText(detailSource.executionStage.completedAt || detailSource.executionStage.completed_at, 40)
                    ? { completedAt: compactText(detailSource.executionStage.completedAt || detailSource.executionStage.completed_at, 40) } : {}),
                ...(Number.isFinite(Number(detailSource.executionStage.activeDurationMs ?? detailSource.executionStage.active_duration_ms))
                    ? { activeDurationMs: Math.max(0, Number(detailSource.executionStage.activeDurationMs ?? detailSource.executionStage.active_duration_ms)) } : {}),
            }),
        } : {}),
        ...(detailSource.toolDisplay?.schema === "ccm-tool-display-detail-v1" ? { toolDisplay: detailSource.toolDisplay } : {}),
        ...(detailSource.timing && typeof detailSource.timing === "object" ? {
            timing: sanitizeUserVisibleAgentDetail({
                totalMs: Math.max(0, Number(detailSource.timing.totalMs || 0)),
                ...(Number.isFinite(Number(detailSource.timing.modelMs)) ? { modelMs: Math.max(0, Number(detailSource.timing.modelMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.toolWallMs)) ? { toolWallMs: Math.max(0, Number(detailSource.timing.toolWallMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.dependencyWaitMs)) ? { dependencyWaitMs: Math.max(0, Number(detailSource.timing.dependencyWaitMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.queueWaitMs)) ? { queueWaitMs: Math.max(0, Number(detailSource.timing.queueWaitMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.otherMs)) ? { otherMs: Math.max(0, Number(detailSource.timing.otherMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.projectAgentWallMs)) ? { projectAgentWallMs: Math.max(0, Number(detailSource.timing.projectAgentWallMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.verificationMs)) ? { verificationMs: Math.max(0, Number(detailSource.timing.verificationMs)) } : {}),
                ...(Number.isFinite(Number(detailSource.timing.summaryMs)) ? { summaryMs: Math.max(0, Number(detailSource.timing.summaryMs)) } : {}),
                ...(detailSource.timing.stages && typeof detailSource.timing.stages === "object" ? { stages: {
                        ...(Number.isFinite(Number(detailSource.timing.stages.preparationMs)) ? { preparationMs: Math.max(0, Number(detailSource.timing.stages.preparationMs)) } : {}),
                        ...(Number.isFinite(Number(detailSource.timing.stages.projectAgentWallMs)) ? { projectAgentWallMs: Math.max(0, Number(detailSource.timing.stages.projectAgentWallMs)) } : {}),
                        ...(Number.isFinite(Number(detailSource.timing.stages.testAgentWallMs)) ? { testAgentWallMs: Math.max(0, Number(detailSource.timing.stages.testAgentWallMs)) } : {}),
                        ...(Number.isFinite(Number(detailSource.timing.stages.mainAgentSummaryMs)) ? { mainAgentSummaryMs: Math.max(0, Number(detailSource.timing.stages.mainAgentSummaryMs)) } : {}),
                    } } : {}),
            }),
        } : {}),
        ...(detailSource.progress && typeof detailSource.progress === "object"
            && (0, assistant_progress_1.sanitizeAssistantProgressText)(detailSource.progress.text, 600) ? {
            progress: {
                kind: (0, assistant_progress_1.normalizeAssistantProgressKind)(detailSource.progress.kind),
                text: (0, assistant_progress_1.sanitizeAssistantProgressText)(detailSource.progress.text, 600),
                modelCallIndex: Math.max(0, Number(detailSource.progress.modelCallIndex || detailSource.progress.model_call_index || 0)),
                relatedToolCallIds: uniqueStrings(detailSource.progress.relatedToolCallIds || detailSource.progress.related_tool_call_ids, 64),
                batchId: compactText(detailSource.progress.batchId || detailSource.progress.batch_id, 120),
                milestoneChecksum: compactText(detailSource.progress.milestoneChecksum || detailSource.progress.milestone_checksum, 80),
                ...(["agent_reported", "runtime_structured", "system_observed"].includes(String(detailSource.progress.source))
                    ? { source: String(detailSource.progress.source) } : {}),
                ...(["declared", "observed"].includes(String(detailSource.progress.confidence))
                    ? { confidence: String(detailSource.progress.confidence) } : {}),
                ...(compactText(detailSource.progress.sourceEventChecksum || detailSource.progress.source_event_checksum, 80)
                    ? { sourceEventChecksum: compactText(detailSource.progress.sourceEventChecksum || detailSource.progress.source_event_checksum, 80) } : {}),
            },
        } : {}),
        ...(detailSource.modelActivity && typeof detailSource.modelActivity === "object"
            && ["started", "waiting", "retrying", "streaming", "completed", "failed"].includes(String(detailSource.modelActivity.state))
            && ["understanding", "tool_decision", "tool_result_review", "verification", "final_synthesis"].includes(String(detailSource.modelActivity.phase)) ? {
            modelActivity: {
                state: String(detailSource.modelActivity.state),
                phase: String(detailSource.modelActivity.phase),
                modelCallIndex: Math.max(1, Number(detailSource.modelActivity.modelCallIndex || 1)),
                ...(Number(detailSource.modelActivity.retryAttempt) > 0 ? { retryAttempt: Math.max(1, Number(detailSource.modelActivity.retryAttempt)) } : {}),
                startedAt: compactText(detailSource.modelActivity.startedAt, 40),
                ...(compactText(detailSource.modelActivity.firstDeltaAt, 40) ? { firstDeltaAt: compactText(detailSource.modelActivity.firstDeltaAt, 40) } : {}),
                safeLabel: compactText(detailSource.modelActivity.safeLabel, 120),
                contentStored: false,
            },
        } : {}),
        ...(detailSource.keyProgress && typeof detailSource.keyProgress === "object"
            && String(detailSource.keyProgress.schema || "ccm-agent-key-progress-v1") === "ccm-agent-key-progress-v1"
            && ["model_preamble", "phase_update", "tool_batch_started", "tool_batch_completed", "model_key_summary", "child_agent_update", "verification_update"].includes(String(detailSource.keyProgress.kind))
            && ["model_stream", "deterministic", "summary_model", "child_agent"].includes(String(detailSource.keyProgress.source)) ? {
            keyProgress: {
                schema: "ccm-agent-key-progress-v1",
                eventId: compactText(detailSource.keyProgress.eventId || input?.eventId || input?.event_id, 240),
                kind: String(detailSource.keyProgress.kind),
                source: String(detailSource.keyProgress.source),
                status: ["running", "success", "failed", "waiting"].includes(String(detailSource.keyProgress.status))
                    ? String(detailSource.keyProgress.status)
                    : "running",
                round: Math.max(0, Number(detailSource.keyProgress.round || 0)),
                text: (0, assistant_progress_1.sanitizeAssistantProgressText)(detailSource.keyProgress.text || detailSource.progress?.text || "", 240),
                modelCallIndex: Math.max(0, Number(detailSource.keyProgress.modelCallIndex || 0)),
                toolCallIds: uniqueStrings(detailSource.keyProgress.toolCallIds || detailSource.keyProgress.tool_call_ids, 64),
                relatedEventIds: uniqueStrings(detailSource.keyProgress.relatedEventIds || detailSource.keyProgress.related_event_ids, 64),
                contentStored: false,
            },
        } : {}),
        ...(sanitizePromptBindings(detailSource.promptBindings || detailSource.prompt_bindings)
            ? { promptBindings: sanitizePromptBindings(detailSource.promptBindings || detailSource.prompt_bindings) }
            : {}),
        ...(detailSource.liveProgress && typeof detailSource.liveProgress === "object"
            && ["starting", "running", "testing", "building", "finishing", "retrying"].includes(String(detailSource.liveProgress.phase))
            && compactText(detailSource.liveProgress.safeSummary, 160) ? {
            liveProgress: {
                phase: String(detailSource.liveProgress.phase),
                safeSummary: compactText(detailSource.liveProgress.safeSummary, 160),
                ...(Number.isFinite(Number(detailSource.liveProgress.completed)) ? { completed: Math.max(0, Number(detailSource.liveProgress.completed)) } : {}),
                ...(Number.isFinite(Number(detailSource.liveProgress.total)) ? { total: Math.max(0, Number(detailSource.liveProgress.total)) } : {}),
                updatedAt: compactText(detailSource.liveProgress.updatedAt, 40) || now(),
                contentStored: false,
            },
        } : {}),
        ...(detailSource.stream && typeof detailSource.stream === "object" ? {
            stream: {
                sequence: Math.max(0, Number(detailSource.stream.sequence || 0)),
                final: detailSource.stream.final === true,
                ...(compactText(detailSource.stream.checksum, 80) ? { checksum: compactText(detailSource.stream.checksum, 80) } : {}),
            },
        } : {}),
        ...(sanitizeAvailableActions(detailSource.availableActions || detailSource.available_actions).length
            ? { availableActions: sanitizeAvailableActions(detailSource.availableActions || detailSource.available_actions) }
            : {}),
        ...(taskIdentity && anchorIdentity ? { replayLink: {
                schema: "ccm-task-event-link-v1",
                taskId: taskIdentity,
                ...(compactText(input?.eventId || input?.event_id, 240) ? { replayEventId: compactText(input?.eventId || input?.event_id, 240) } : {}),
                scope,
                scopeId,
                exactSessionId,
                anchorMessageId: anchorIdentity,
                generation: Math.max(0, Number(input?.generation || 0)),
                attempt: eventAttempt,
                ...(planStepIdentity ? { planStepId: planStepIdentity } : {}),
                ...(workItemIdentity ? { workItemId: workItemIdentity } : {}),
                ...(batchIdentity ? { batchId: batchIdentity } : {}),
                ...(causalEvidenceIds.length ? { evidenceIds: causalEvidenceIds } : {}),
                contentStored: false,
            } } : {}),
        ...((planStepIdentity || workItemIdentity || dependencyIds.length || criterionIds.length || causalEvidenceIds.length) ? { causalRefs: {
                ...(planStepIdentity ? { planStepId: planStepIdentity } : {}),
                ...(workItemIdentity ? { workItemId: workItemIdentity } : {}),
                ...(dependencyIds.length ? { dependencyIds } : {}),
                ...(criterionIds.length ? { criterionIds } : {}),
                ...(causalEvidenceIds.length ? { evidenceIds: causalEvidenceIds } : {}),
            } } : {}),
        ...(sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan)
            ? { requirementPlan: sanitizeUserVisibleRequirementPlan(detailSource.requirementPlan || detailSource.requirement_plan) }
            : {}),
        ...(detailSource.runtimeObservation && typeof detailSource.runtimeObservation === "object"
            && ["agent_reported", "runtime_structured", "system_observed"].includes(String(detailSource.runtimeObservation.source))
            && ["declared", "observed"].includes(String(detailSource.runtimeObservation.confidence))
            && compactText(detailSource.runtimeObservation.sourceEventChecksum, 80) ? {
            runtimeObservation: {
                ...(compactText(detailSource.runtimeObservation.eventType, 80) ? { eventType: compactText(detailSource.runtimeObservation.eventType, 80) } : {}),
                source: detailSource.runtimeObservation.source,
                confidence: detailSource.runtimeObservation.confidence,
                ...(compactText(detailSource.runtimeObservation.runtime, 80) ? { runtime: compactText(detailSource.runtimeObservation.runtime, 80) } : {}),
                ...(compactText(detailSource.runtimeObservation.runtimeVersion, 120) ? { runtimeVersion: compactText(detailSource.runtimeObservation.runtimeVersion, 120) } : {}),
                sourceEventChecksum: compactText(detailSource.runtimeObservation.sourceEventChecksum, 80),
                contentStored: false,
            },
        } : {}),
        ...(detailSource.completionSummary || input?.completionSummary || input?.result?.completionSummary || input?.result?.completion_summary
            ? { completionSummary: (0, completion_summary_1.buildCcmCompletionSummary)(detailSource.completionSummary || input?.completionSummary || input?.result?.completionSummary || input?.result?.completion_summary) }
            : {}),
    };
    const stableIdentity = {
        scope, scopeId, exactSessionId, generation: Math.max(0, Number(input?.generation || 0)),
        taskId: input?.taskId || input?.task_id || "", workItemId: input?.workItemId || input?.work_item_id || "",
        toolCallId: input?.toolCallId || input?.tool_call_id || "", eventType, createdAt,
    };
    const normalizedEventId = compactText(input?.eventId || input?.event_id, 240) || `uve_${hash(stableIdentity).slice(0, 28)}`;
    if (/^agent_(?:started|progress|completed|failed)$/.test(eventType) && !detail.keyProgress) {
        const childText = (0, assistant_progress_1.sanitizeAssistantProgressText)(detail.liveProgress?.safeSummary || display.summary || display.title, 240);
        if (childText) {
            detail.keyProgress = {
                schema: "ccm-agent-key-progress-v1",
                eventId: normalizedEventId,
                kind: "child_agent_update",
                source: "child_agent",
                status: status === "success" ? "success" : status === "failed" ? "failed" : status === "waiting" ? "waiting" : "running",
                round: Math.max(0, eventAttempt - 1),
                text: childText,
                modelCallIndex: 0,
                toolCallIds: [],
                relatedEventIds: [],
                contentStored: false,
            };
        }
    }
    return {
        schema: exports.USER_VISIBLE_AGENT_EVENT_SCHEMA,
        eventId: normalizedEventId,
        sequence: Math.max(0, Number((input?.sequence ?? sequence) || 0)),
        eventType,
        scope,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Number(input?.generation || 0)),
        ...(compactText(input?.anchorMessageId || input?.anchor_message_id, 240)
            ? { anchorMessageId: compactText(input?.anchorMessageId || input?.anchor_message_id, 240) } : {}),
        ...(compactText(input?.originMessageId || input?.origin_message_id, 240)
            ? { originMessageId: compactText(input?.originMessageId || input?.origin_message_id, 240) } : {}),
        ...(turnIdentity ? { turnId: turnIdentity } : {}),
        ...(Number.isFinite(suppliedAttempt) && suppliedAttempt > 0 ? { attempt: Math.max(1, Math.floor(suppliedAttempt)) } : {}),
        ...(responseIdentity ? { responseMessageId: responseIdentity } : {}),
        ...(compactText(input?.taskId || input?.task_id, 240) ? { taskId: compactText(input?.taskId || input?.task_id, 240) } : {}),
        ...(compactText(input?.workItemId || input?.work_item_id, 240) ? { workItemId: compactText(input?.workItemId || input?.work_item_id, 240) } : {}),
        ...(compactText(input?.agentRunId || input?.agent_run_id, 240) ? { agentRunId: compactText(input?.agentRunId || input?.agent_run_id, 240) } : {}),
        ...(compactText(input?.toolCallId || input?.tool_call_id, 240) ? { toolCallId: compactText(input?.toolCallId || input?.tool_call_id, 240) } : {}),
        ...(compactText(toolName, 240) ? { toolName: compactText(toolName, 240) } : {}),
        ...(compactText(input?.parentEventId || input?.parent_event_id, 240) ? { parentEventId: compactText(input?.parentEventId || input?.parent_event_id, 240) } : {}),
        ...(compactText(input?.parallelGroupId || input?.parallel_group_id, 240) ? { parallelGroupId: compactText(input?.parallelGroupId || input?.parallel_group_id, 240) } : {}),
        display,
        ...(Object.keys(detail).length ? { detail } : {}),
        visibility: ["default", "transcript", "technical"].includes(String(input?.visibility)) ? input.visibility : "default",
        contentStored: false,
        createdAt,
    };
}
function sameVisibleEventLane(item, next) {
    if (Number(item.generation || 0) !== Number(next.generation || 0))
        return false;
    const nextTask = compactText(next.taskId, 240);
    const itemTask = compactText(item.taskId, 240);
    return nextTask ? itemTask === nextTask : !itemTask;
}
function shouldDropLateAssistantProgress(store, next) {
    if (next.eventType !== "assistant_progress")
        return false;
    const lastTurnStart = [...store.events].reverse().find(item => item.eventType === "turn_started" && sameVisibleEventLane(item, next));
    const lastResult = [...store.events].reverse().find(item => item.eventType === "result" && sameVisibleEventLane(item, next));
    return !!(lastResult && (!lastTurnStart || Number(lastResult.sequence || 0) >= Number(lastTurnStart.sequence || 0)));
}
function appendUserVisibleAgentEvent(input) {
    const initial = normalizeUserVisibleAgentEvent(input);
    const file = eventStoreFile(initial.scope, initial.scopeId, initial.exactSessionId);
    let event = initial;
    let appended = false;
    (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = readStore(initial.scope, initial.scopeId, initial.exactSessionId);
        if (shouldDropLateAssistantProgress(store, initial))
            return;
        const existing = store.events.find(item => item.eventId === initial.eventId);
        if (existing) {
            event = existing;
            return;
        }
        event = { ...initial, sequence: Math.max(store.revision, ...store.events.map(item => item.sequence), 0) + 1 };
        appended = true;
        store.events = [...store.events, event].slice(-MAX_EVENTS_PER_SESSION);
        store.revision = event.sequence;
        store.updatedAt = now();
        store.checksum = storeChecksum(store);
        (0, atomic_json_file_1.writeJsonAtomic)(file, store);
    });
    if (appended) {
        for (const listener of [...listeners]) {
            try {
                listener(event);
            }
            catch { }
        }
    }
    return event;
}
function appendAssistantProgress(input) {
    const text = (0, assistant_progress_1.sanitizeAssistantProgressText)(input?.text || input?.progressUpdate || input?.progress_update, 600);
    if (!text)
        return null;
    const kind = (0, assistant_progress_1.normalizeAssistantProgressKind)(input?.kind || input?.progressKind || input?.progress_kind);
    const modelCallIndex = Math.max(0, Number(input?.modelCallIndex || input?.model_call_index || 0));
    const relatedToolCallIds = uniqueStrings(input?.relatedToolCallIds || input?.related_tool_call_ids, 64);
    const turnIdentity = compactText(input?.turnId || input?.turn_id || input?.taskId || input?.task_id || "turn", 120);
    const batchId = compactText(input?.batchId || input?.batch_id, 120) || (0, assistant_progress_1.assistantProgressBatchId)({
        turnId: turnIdentity,
        generation: input?.generation,
        modelCallIndex,
        kind,
        relatedToolCallIds,
    });
    const milestoneChecksum = (0, assistant_progress_1.assistantProgressMilestoneChecksum)({ kind, text, modelCallIndex, relatedToolCallIds, batchId });
    const repeatableKind = kind === "before_tools" || kind === "key_finding";
    const semanticFingerprint = hash({
        kind,
        text: text.toLowerCase(),
        generation: Math.max(0, Number(input?.generation || 0)),
        attempt: Math.max(1, Number(input?.attempt || input?.detail?.technical?.attempt || 1)),
        target: compactText(input?.businessTarget || input?.target || input?.display?.target, 120).toLowerCase(),
        stage: compactText(input?.detail?.executionStage?.kind, 80).toLowerCase(),
    }).slice(0, 16);
    const eventId = compactText(input?.eventId || input?.event_id, 240)
        || `assistant-progress:${turnIdentity}:${repeatableKind ? `${kind}:${semanticFingerprint}` : `${modelCallIndex}:${milestoneChecksum.slice(0, 20)}`}`;
    const legacyKindToKeyKind = {
        before_tools: "model_preamble",
        verification: "verification_update",
        rework: "child_agent_update",
        direction_change: "child_agent_update",
        before_summary: "model_key_summary",
        key_finding: "phase_update",
        blocker: "verification_update",
    };
    const existingKeyProgress = input?.detail?.keyProgress;
    const keyProgress = existingKeyProgress && existingKeyProgress.schema === "ccm-agent-key-progress-v1"
        ? { ...existingKeyProgress, eventId: compactText(existingKeyProgress.eventId || eventId, 240) }
        : {
            schema: "ccm-agent-key-progress-v1",
            eventId,
            kind: legacyKindToKeyKind[kind] || "phase_update",
            source: "deterministic",
            status: input?.display?.status || "running",
            round: Math.max(0, Number(input?.round || 0)),
            text: text.slice(0, 240),
            modelCallIndex,
            toolCallIds: relatedToolCallIds,
            relatedEventIds: [],
            contentStored: false,
        };
    return appendUserVisibleAgentEvent({
        ...input,
        eventId,
        eventType: "assistant_progress",
        display: {
            title: compactText(input?.display?.title || input?.title || "进度说明", 120),
            summary: text,
            status: input?.display?.status || "running",
        },
        detail: {
            ...(input?.detail || {}),
            progress: { kind, text, modelCallIndex, relatedToolCallIds, batchId, milestoneChecksum },
            keyProgress,
        },
        visibility: "default",
    });
}
function appendUserVisibleRequirementPlan(input) {
    const plan = sanitizeUserVisibleRequirementPlan(input?.plan || input?.requirementPlan || input?.requirement_plan);
    if (!plan)
        return null;
    const eventId = compactText(input?.eventId || input?.event_id, 240)
        || `requirement-plan:${plan.planId}:${plan.revision}:${plan.status}`;
    return appendUserVisibleAgentEvent({
        ...input,
        eventId,
        eventType: "requirement_plan",
        display: {
            title: plan.title,
            summary: plan.goal,
            status: plan.status === "blocked" ? "failed" : plan.status === "completed" ? "success" : "running",
        },
        detail: { ...(input?.detail || {}), requirementPlan: plan },
        visibility: "default",
    });
}
function projectSafeStoredEvent(event) {
    if (!event)
        return event;
    if (event.eventType === "tool_completed" && /(?:^|__)read_files$/i.test(String(event.toolName || ""))) {
        const paths = event.detail?.safeArguments?.paths;
        const requestedCount = Array.isArray(paths) ? paths.length : 0;
        const currentTotal = Number(event.detail?.toolDisplay?.result?.total || 0);
        if (requestedCount > 0 && currentTotal === 0 && /已读取\s*0\s*个文件/.test(String(event.display?.summary || ""))) {
            const summary = `已读取 ${requestedCount} 个文件`;
            return {
                ...event,
                display: { ...event.display, summary },
                detail: {
                    ...(event.detail || {}),
                    toolDisplay: event.detail?.toolDisplay ? {
                        ...event.detail.toolDisplay,
                        result: { ...event.detail.toolDisplay.result, summary, total: requestedCount },
                    } : event.detail?.toolDisplay,
                },
            };
        }
    }
    if (event.eventType !== "assistant_progress")
        return event;
    const progress = event.detail?.progress;
    const safeText = (0, assistant_progress_1.sanitizeAssistantProgressText)(progress?.text || event.display?.summary || "", 600);
    if (!safeText)
        return null;
    if (safeText === progress?.text && safeText === event.display?.summary)
        return event;
    return {
        ...event,
        display: { ...event.display, summary: safeText },
        detail: {
            ...(event.detail || {}),
            progress: progress ? { ...progress, text: safeText } : progress,
        },
    };
}
function listUserVisibleAgentEvents(filter) {
    const scope = normalizeScope(filter?.scope);
    const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
    const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
    if (!scopeId || !exactSessionId)
        throw new Error("查询执行记录必须指定scope、scopeId和exactSessionId");
    const cursor = Math.max(0, Number(filter?.cursor || filter?.after || 0));
    const limit = Math.max(1, Math.min(500, Number(filter?.limit || 200)));
    const store = readStore(scope, scopeId, exactSessionId);
    const scanned = store.events.filter(item => item.sequence > cursor).slice(0, limit);
    const rows = scanned
        .map(projectSafeStoredEvent)
        .filter(Boolean);
    const nextCursor = scanned.at(-1)?.sequence || cursor;
    return {
        schema: "ccm-user-visible-agent-event-list-v1",
        events: rows,
        nextCursor,
        hasMore: store.events.some(item => item.sequence > nextCursor),
        contentStored: false,
    };
}
function getUserVisibleAgentEvent(filter, eventId) {
    const scope = normalizeScope(filter?.scope);
    const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
    const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
    if (!scopeId || !exactSessionId)
        throw new Error("查询工具详情必须指定scope、scopeId和exactSessionId");
    return projectSafeStoredEvent(readStore(scope, scopeId, exactSessionId).events.find(item => item.eventId === compactText(eventId, 240)) || null);
}
function subscribeUserVisibleAgentEvents(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
}
/** Live-only text/progress events. They deliberately bypass the projection store. */
function publishEphemeralUserVisibleAgentEvent(input) {
    const event = normalizeUserVisibleAgentEvent({ ...input, contentStored: false }, 0);
    for (const listener of [...listeners]) {
        try {
            listener(event);
        }
        catch { }
    }
    return event;
}
function buildUserVisibleAgentResult(input) {
    const source = input?.source === "terminal_gate" || input?.terminalGate || input?.terminal_gate
        ? "terminal_gate"
        : "query_projection";
    const completionSummary = (0, completion_summary_1.buildCcmCompletionSummary)({
        ...input,
        source,
        terminalGate: input?.terminalGate || input?.terminal_gate,
        fileChanges: input?.fileChanges || input?.file_changes || input?.filesChanged || input?.files_changed,
        verification: input?.verification || input?.verificationResults || input?.verification_results,
        blockers: input?.blockers || input?.unfinished || input?.incomplete,
    });
    return {
        schema: exports.USER_VISIBLE_AGENT_RESULT_SCHEMA,
        status: compactText(input?.status, 80) || "success",
        text: compactText(input?.text || input?.reply || input?.summary, 4_000),
        durationMs: Math.max(0, Number(input?.durationMs || input?.duration_ms || 0)),
        modelDurationMs: Math.max(0, Number(input?.modelDurationMs || input?.duration_api_ms || 0)),
        turns: Math.max(0, Number(input?.turns || input?.numTurns || input?.num_turns || 0)),
        toolCalls: Math.max(0, Number(input?.toolCalls || input?.tool_calls || 0)),
        stopReason: compactText(input?.stopReason || input?.stop_reason, 120),
        agentStats: sanitizeUserVisibleAgentDetail(input?.agentStats || input?.agent_stats || input?.agents || {}),
        fileChanges: sanitizeUserVisibleFileChanges(input?.fileChanges || input?.file_changes || input?.filesChanged || input?.files_changed || []),
        verification: sanitizeUserVisibleAgentDetail(input?.verification || input?.verificationResults || input?.verification_results || []),
        unfinished: uniqueStrings(input?.unfinished || input?.incomplete || input?.blockers),
        usage: sanitizeUserVisibleAgentDetail(input?.usage || {}),
        completionSummary,
        contentStored: false,
    };
}
function appendToolProjection(input) {
    const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
    const args = input?.arguments || input?.args || input?.detail?.safeArguments || {};
    const rawResult = input?.observation ?? input?.result ?? input?.detail?.safeResult;
    const safeEventArguments = Object.fromEntries(Object.entries(args && typeof args === "object" ? args : {}).map(([key, value]) => {
        if (!/^(?:command|cmd|script|shellCommand|shell_command|content|text|body|old_text|new_text|replacement|file_data)$/i.test(key))
            return [key, value];
        return [key, {
                hidden: true,
                checksum: crypto.createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 16),
            }];
    }));
    const toolDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName, arguments: args, result: rawResult, error: input?.error, includeTechnicalCommand: true });
    const eventType = normalizeEventType(input?.error ? "tool_failed" : input?.eventType || input?.type);
    const terminal = eventType === "tool_completed" || eventType === "tool_failed";
    const explicitTokens = Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens
        ?? rawResult?.outputTokens ?? rawResult?.output_tokens);
    const outputTokens = terminal
        ? (Number.isFinite(explicitTokens) && explicitTokens > 0 ? explicitTokens : (0, context_budget_1.estimateTextTokens)(JSON.stringify(rawResult ?? "")))
        : 0;
    const suppliedSummary = compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 500);
    const summary = terminal
        ? (eventType === "tool_failed" ? toolDisplay.result.summary : (toolDisplay.result.summary === "工具执行完成" ? "" : toolDisplay.result.summary))
        : suppliedSummary;
    const durationMs = Math.max(0, Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms ?? 0));
    const stageKind = /test.?agent/i.test(String(toolName))
        ? "independent_verification"
        : input?.scope === "global" && /dispatch|skill.?fork|orchestrat/i.test(String(toolName))
            ? "coordination_dispatch"
            : /dispatch|skill.?fork/i.test(String(toolName))
                ? "project_execution"
                : "preparation";
    const completedAt = terminal ? new Date().toISOString() : "";
    const startedAt = input?.detail?.executionStage?.startedAt || input?.createdAt
        || (durationMs > 0 ? new Date(Date.now() - durationMs).toISOString() : new Date().toISOString());
    return appendUserVisibleAgentEvent({
        ...input,
        // The raw runtime receipt is consumed by the display projector above and
        // must not leak back through normalizeUserVisibleAgentEvent's legacy
        // safeResult compatibility path.
        observation: undefined,
        result: undefined,
        eventType,
        display: {
            ...(input?.display || {}),
            ...(summary ? { summary } : { summary: undefined }),
            ...(outputTokens > 0 ? {
                tokenCount: outputTokens,
                tokenType: "tool_output",
                tokenAccuracy: input?.display?.tokenAccuracy === "reported" || input?.tokenAccuracy === "reported" ? "reported" : "estimated",
            } : {}),
        },
        detail: {
            ...(input?.detail || {}),
            ...((input?.toolContractVersion === 3 || input?.detail?.toolContractVersion === 3 || rawResult?.toolContractVersion === 3 || (0, tool_display_projection_1.isWorkspaceReadonlyToolName)(toolName))
                ? { toolContractVersion: 3 } : {}),
            ...((eventType === "tool_failed" || eventType === "agent_failed") ? {
                availableActions: sanitizeAvailableActions(input?.detail?.availableActions || input?.detail?.available_actions).length
                    ? sanitizeAvailableActions(input?.detail?.availableActions || input?.detail?.available_actions)
                    : explicitFailureActions(input),
            } : {}),
            executionStage: input?.detail?.executionStage || {
                kind: stageKind,
                stageRunId: `tool:${String(input?.toolCallId || input?.tool_call_id || toolName)}`,
                attempt: Math.max(1, Number(input?.attempt || 1)),
                startedAt,
                ...(completedAt ? { completedAt } : {}),
                ...(durationMs > 0 ? { activeDurationMs: durationMs } : {}),
            },
            safeArguments: safeEventArguments,
            toolDisplay,
        },
    });
}
function clearUserVisibleAgentEventsForTest() {
    if (!process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || !fs.existsSync(STORE_ROOT))
        return;
    fs.rmSync(STORE_ROOT, { recursive: true, force: true });
}
function runUserVisibleAgentEventSelfTest() {
    const event = normalizeUserVisibleAgentEvent({
        scope: "project", scopeId: "demo", exactSessionId: "session-1", eventType: "tool_started",
        toolName: "find_definition", toolCallId: "call-1", arguments: { symbol: "hello", api_key: "SENTINEL" },
        detail: { safeResult: { content: "SOURCE_SENTINEL", count: 2 } },
    }, 1);
    const serialized = JSON.stringify(event);
    const linked = normalizeUserVisibleAgentEvent({
        scope: "group", scopeId: "group-1", exactSessionId: "session-2", anchorMessageId: "message-1",
        taskId: "task-1", workItemId: "work-1", generation: 3, attempt: 2, eventType: "agent_progress",
        detail: { progress: { kind: "key_finding", text: "完成接口定位", modelCallIndex: 1, relatedToolCallIds: [], batchId: "batch-1", milestoneChecksum: "sum" }, causalRefs: { planStepId: "step-1", dependencyIds: ["dep-1"] } },
    }, 2);
    const longProgress = (0, assistant_progress_1.sanitizeAssistantProgressText)(`我会先检查当前项目结构和配置，再定位实际启动入口。${"这是不应继续展示的冗长说明。".repeat(20)}`);
    const protocolProgress = (0, assistant_progress_1.sanitizeAssistantProgressText)('{"workflowDecision":{"actionRequired":false},"selectedSkills":[]}');
    const globalDispatch = appendToolProjection({
        scope: "global", scopeId: "global", exactSessionId: "session-global-dispatch", eventId: "global-dispatch-stage",
        eventType: "tool_completed", toolName: "dispatch_project_task", toolCallId: "dispatch-1",
        observation: { success: true, count: 1 },
    });
    const projectDispatch = appendToolProjection({
        scope: "project", scopeId: "demo", exactSessionId: "session-project-dispatch", eventId: "project-dispatch-stage",
        eventType: "tool_completed", toolName: "dispatch_project_task", toolCallId: "dispatch-2",
        observation: { success: true, count: 1 },
    });
    const internalWorkspaceRead = (0, tool_display_projection_1.buildToolDisplayDetail)({
        toolName: "mcp__ccm__ccm_workspace_readonly__read_file",
        arguments: { path: "README.md" },
    });
    const nativeRuntimeGlob = (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName: "Glob", arguments: { pattern: "**/*.ts" } });
    const inlineCommand = (0, tool_display_projection_1.buildToolDisplayDetail)({
        toolName: "run_command",
        arguments: { command: 'powershell -Command "Write-Output SOURCE_COMMAND_SENTINEL"', description: "检查构建" },
        includeTechnicalCommand: true,
    });
    const nestedBatchReceipt = {
        output: JSON.stringify({
            schema: "ccm-workspace-tool-envelope-v3",
            toolContractVersion: 3,
            modelPayload: {
                schema: "ccm-workspace-read-files-result-v3",
                files: [{ path: "README.md", truncated: true, next_cursor: "101", checksum: "readme-sum" }, { path: "package.json", truncated: false }],
                item_count: 2,
                truncated: true,
            },
            safeReceipt: { kind: "text", itemCount: 2, truncated: true, contentStored: false },
            contentStored: false,
        }),
        outputTokens: 1234,
    };
    const nestedBatchDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({
        toolName: "mcp__ccm__ccm_workspace_readonly__read_files",
        arguments: { paths: ["README.md", "package.json"] },
        result: nestedBatchReceipt,
    });
    const nestedBatchEvent = appendToolProjection({
        scope: "project", scopeId: "demo", exactSessionId: "session-batch-read", eventId: "batch-read-result",
        eventType: "tool_completed", toolName: "mcp__ccm__ccm_workspace_readonly__read_files", toolCallId: "batch-read-1",
        arguments: { paths: ["README.md", "package.json"] }, observation: nestedBatchReceipt,
    });
    const legacyBatchEvent = projectSafeStoredEvent({
        schema: exports.USER_VISIBLE_AGENT_EVENT_SCHEMA, eventId: "legacy-batch", sequence: 1, eventType: "tool_completed",
        scope: "project", scopeId: "demo", exactSessionId: "legacy-session", generation: 0,
        toolName: "mcp__ccm__ccm_workspace_readonly__read_files",
        display: { title: "批量读取文件", summary: "已读取 0 个文件", status: "success" },
        detail: {
            safeArguments: { paths: ["README.md", "package.json"] },
            toolDisplay: (0, tool_display_projection_1.buildToolDisplayDetail)({ toolName: "read_files", arguments: { paths: ["README.md", "package.json"] }, result: {} }),
        },
        visibility: "default", contentStored: false, createdAt: new Date().toISOString(),
    });
    const checks = {
        schema: event.schema === exports.USER_VISIBLE_AGENT_EVENT_SCHEMA,
        ccLabel: event.display.title === "查找定义",
        secretRedacted: !serialized.includes("SENTINEL"),
        bodyProjected: !serialized.includes("SOURCE_SENTINEL") && serialized.includes("contentChecksum"),
        noContent: event.contentStored === false,
        replayLinkSafe: linked.detail?.replayLink?.schema === "ccm-task-event-link-v1" && linked.detail.replayLink.anchorMessageId === "message-1" && linked.detail.replayLink.attempt === 2 && linked.detail.replayLink.contentStored === false,
        causalRefsSafe: linked.detail?.causalRefs?.planStepId === "step-1" && linked.detail.causalRefs.dependencyIds?.[0] === "dep-1",
        progressLengthBounded: longProgress.length <= 120 && longProgress.split(/[。！？!?]/).filter(Boolean).length <= 2,
        internalProgressRejected: protocolProgress === "",
        globalDispatchStage: globalDispatch.detail?.executionStage?.kind === "coordination_dispatch",
        projectDispatchStage: projectDispatch.detail?.executionStage?.kind === "project_execution",
        workspaceMcpUsesNativeFacade: internalWorkspaceRead.tool.name === "read_file"
            && internalWorkspaceRead.tool.userLabel === "读取文件"
            && internalWorkspaceRead.tool.category === "builtin"
            && !internalWorkspaceRead.tool.serverLabel,
        nativeRuntimeToolLocalized: nativeRuntimeGlob.tool.userLabel === "查找文件"
            && nativeRuntimeGlob.tool.family === "search",
        inlineCommandBodyHidden: !JSON.stringify(inlineCommand).includes("SOURCE_COMMAND_SENTINEL")
            && inlineCommand.sensitiveCommand?.includes("[脚本内容已隐藏]"),
        nestedBatchCountProjected: nestedBatchDisplay.result.total === 2
            && nestedBatchDisplay.result.summary.startsWith("已读取 2 个文件")
            && nestedBatchDisplay.result.truncated === true,
        nestedBatchUsesRuntimeTokenCount: nestedBatchEvent.display.tokenCount === 1234,
        legacyBatchCountRecovered: legacyBatchEvent?.display?.summary === "已读取 2 个文件"
            && legacyBatchEvent?.detail?.toolDisplay?.result?.total === 2,
        nextTurnProgressAfterPreviousResult: (() => {
            const identity = { scope: "project", scopeId: "demo", exactSessionId: "session-next-turn-progress" };
            appendUserVisibleAgentEvent({
                ...identity, eventId: "prev-turn-started", eventType: "turn_started",
                display: { title: "项目主 Agent", summary: "上一轮开始", status: "running" },
            });
            appendUserVisibleAgentEvent({
                ...identity, eventId: "prev-turn-result", eventType: "result",
                display: { title: "回复完成", summary: "上一轮已完成", status: "success" },
            });
            appendUserVisibleAgentEvent({
                ...identity, eventId: "next-turn-started", eventType: "turn_started",
                display: { title: "项目主 Agent", summary: "本轮开始", status: "running" },
            });
            const nextProgress = appendAssistantProgress({
                ...identity, turnId: "next-turn", text: "我先定位相关代码和配置，再根据结果继续判断。",
                kind: "before_tools", modelCallIndex: 1, relatedToolCallIds: ["tool-next"],
            });
            const listed = listUserVisibleAgentEvents({ ...identity, cursor: 0, limit: 20 });
            return nextProgress?.eventType === "assistant_progress"
                && listed.events.some(item => item.eventId === nextProgress.eventId);
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks, event };
}
//# sourceMappingURL=user-visible-agent-events.js.map