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
exports.reconcileConversationExecutionForTask = reconcileConversationExecutionForTask;
exports.reconcileConversationExecutionsForIdentity = reconcileConversationExecutionsForIdentity;
const crypto = __importStar(require("crypto"));
const db_1 = require("../core/db");
const task_conversation_links_1 = require("./task-conversation-links");
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const TERMINAL = new Set(["done", "completed", "success", "failed", "blocked", "cancelled", "canceled", "interrupted", "reverted"]);
const PROCESS_TYPES = new Set([
    "assistant_progress", "tool_started", "tool_progress", "tool_completed", "tool_failed",
    "agent_started", "agent_progress", "agent_completed", "agent_failed", "context_compacted",
]);
const KNOWN_REPLAY_EVENT_TYPES = new Set([
    "assistant_progress", "tool_started", "tool_progress", "tool_completed", "tool_failed",
    "agent_started", "agent_progress", "agent_completed", "agent_failed", "context_compacted",
]);
const receiptCache = new Map();
function clean(value, max = 240) {
    return String(value ?? "").replace(/[\0\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}
function safeNarrative(value, max = 600) {
    return clean(value, max)
        .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
        .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]");
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function sameIdentity(left, right) {
    return clean(left?.scope, 16) === clean(right?.scope, 16)
        && clean(left?.scopeId, 240) === clean(right?.scopeId, 240)
        && clean(left?.exactSessionId, 240) === clean(right?.exactSessionId, 240);
}
function taskScope(task) {
    if (clean(task?.group_id || task?.groupId))
        return "group";
    if (clean(task?.workflow_type, 80) === "global_mission"
        || clean(task?.target_project) === "global-agent"
        || clean(task?.source_conversation_ref?.scope, 40) === "global" && !clean(task?.global_mission_id || task?.globalMissionId))
        return "global";
    if (clean(task?.project_session_id || task?.projectSessionId) || clean(task?.target_project || task?.project_id || task?.project))
        return "project";
    return "global";
}
function taskPrimaryIdentity(task) {
    const scope = taskScope(task);
    const scopeId = scope === "global" ? "global"
        : scope === "group" ? clean(task?.group_id || task?.groupId)
            : clean(task?.target_project || task?.project_id || task?.project);
    const exactSessionId = clean(task?.active_execution_session_id || task?.execution_session_id
        || (scope === "group" ? task?.group_session_id || task?.groupSessionId : "")
        || (scope === "project" ? task?.project_session_id || task?.projectSessionId : "")
        || task?.origin_session_id || task?.exact_session_id || task?.source_conversation_ref?.exactSessionId);
    return scopeId && exactSessionId ? { scope, scopeId, exactSessionId } : null;
}
function taskIdentities(task, tasks) {
    const rows = [];
    const push = (value) => {
        const scope = clean(value?.scope, 16);
        const scopeId = clean(value?.scopeId || value?.scope_id);
        const exactSessionId = clean(value?.exactSessionId || value?.exact_session_id);
        if (!["global", "group", "project"].includes(scope) || !scopeId || !exactSessionId)
            return;
        const identity = { scope, scopeId, exactSessionId };
        if (!rows.some(item => sameIdentity(item, identity)))
            rows.push(identity);
    };
    push(taskPrimaryIdentity(task));
    for (const link of (0, task_conversation_links_1.buildTaskConversationLinks)(task, tasks)?.links || [])
        push(link);
    const scope = taskScope(task);
    const active = clean(task?.active_execution_session_id || task?.execution_session_id);
    if (active)
        push({
            scope,
            scopeId: scope === "global" ? "global" : scope === "group" ? task?.group_id || task?.groupId : task?.target_project || task?.project_id || task?.project,
            exactSessionId: active,
        });
    return rows;
}
function listAllEvents(identity) {
    const rows = [];
    let cursor = 0;
    do {
        const page = (0, user_visible_agent_events_1.listUserVisibleAgentEvents)({ ...identity, cursor, limit: 500 });
        rows.push(...page.events);
        const next = Number(page.nextCursor || cursor);
        if (!page.hasMore || next <= cursor)
            break;
        cursor = next;
    } while (rows.length < 5_000);
    return rows;
}
function isProcessEvent(event) {
    return PROCESS_TYPES.has(String(event?.eventType || ""));
}
function isMainAgentEvent(event) {
    if (event?.eventType === "assistant_progress")
        return true;
    if (String(event?.eventType || "").startsWith("tool_"))
        return !clean(event?.agentRunId);
    return false;
}
function isTestAgentEvent(event) {
    return /test.?agent/i.test([
        event?.detail?.agentDisplay?.runtimeLabel,
        event?.display?.title,
        event?.detail?.executionStage?.kind,
    ].map(value => clean(value)).join(" "));
}
function isChildAgentEvent(event) {
    return String(event?.eventType || "").startsWith("agent_") && !isTestAgentEvent(event)
        && !/^(?:项目主 Agent|群聊主 Agent|全局主 Agent)$/i.test(clean(event?.detail?.agentDisplay?.runtimeLabel || event?.display?.title));
}
function uniqueToolCount(events) {
    return new Set(events
        .filter(event => String(event?.eventType || "").startsWith("tool_"))
        .map(event => clean(event?.toolCallId || event?.eventId))
        .filter(Boolean)).size;
}
function buildAgentToolCoverage(events, taskIds, terminal) {
    const rows = events.filter(event => taskIds.has(clean(event?.taskId)));
    const tools = rows.filter(event => String(event?.eventType || "").startsWith("tool_"));
    const lifecycle = rows.filter(event => String(event?.eventType || "").startsWith("agent_") && clean(event?.agentRunId));
    const agents = new Map();
    const mainAgentRunIds = new Set();
    for (const event of lifecycle) {
        const agentRunId = clean(event?.agentRunId);
        const wrapper = clean(event?.toolName, 120);
        const runtimeLabel = clean(event?.detail?.agentDisplay?.runtimeLabel || event?.display?.title);
        if (/^(?:项目主 Agent|群聊主 Agent|全局主 Agent)$/i.test(runtimeLabel)) {
            mainAgentRunIds.add(agentRunId);
            continue;
        }
        if (!agentRunId || wrapper === "run_test_agent_review"
            || clean(event?.detail?.reconciliation?.source, 80) === "test_agent_runner"
            || (isTestAgentEvent(event) && clean(event?.detail?.agentDisplay?.phase, 80) === "planning"))
            continue;
        const role = isTestAgentEvent(event) ? "test_agent" : "project_agent";
        const projectId = clean(event?.detail?.agentDisplay?.projectId || event?.detail?.agentDisplay?.projectName || event?.display?.target);
        agents.set(agentRunId, { role, projectId });
    }
    for (const event of tools) {
        const agentRunId = clean(event?.agentRunId || event?.parentEventId);
        if (!agentRunId || agents.has(agentRunId))
            continue;
        const testAgent = /test.?agent/i.test([agentRunId, event?.toolName, event?.display?.title].map(value => clean(value)).join(" "));
        if (!testAgent)
            continue;
        agents.set(agentRunId, {
            role: "test_agent",
            projectId: clean(event?.detail?.agentDisplay?.projectId || event?.display?.target),
        });
    }
    const coverage = [];
    const mainTools = tools.filter(event => !clean(event?.agentRunId) || mainAgentRunIds.has(clean(event?.agentRunId)));
    coverage.push({
        agentRunId: "main",
        role: "main_agent",
        persistedToolCount: uniqueToolCount(mainTools),
        status: mainTools.length ? "complete" : "not_applicable",
    });
    for (const [agentRunId, agent] of agents) {
        const owned = tools.filter(event => clean(event?.agentRunId || event?.parentEventId) === agentRunId);
        const persistedToolCount = uniqueToolCount(owned);
        coverage.push({
            agentRunId,
            role: agent.role,
            ...(agent.projectId ? { projectId: agent.projectId } : {}),
            persistedToolCount,
            status: persistedToolCount ? "complete" : terminal ? "partial" : "not_applicable",
        });
    }
    return coverage;
}
function missingToolCoverage(coverage) {
    const missing = [];
    if (coverage.some(item => item.role === "project_agent" && item.status === "partial"))
        missing.push("child_agent_tool_history_missing");
    if (coverage.some(item => item.role === "test_agent" && item.status === "partial"))
        missing.push("test_agent_tool_history_missing");
    return missing;
}
function projectedEventId(taskId, target, sourceId) {
    return `execution-reconcile:${checksum({ taskId, target, sourceId }).slice(0, 32)}`;
}
function reconciliationCacheIdentity(task, target) {
    return `${clean(task?.id)}|${target.scope}|${target.scopeId}|${target.exactSessionId}`;
}
function reconciliationSignature(task, target, events) {
    return checksum({
        target,
        revision: Number(task?.revision || 0),
        generation: Number(task?.generation || 0),
        status: clean(task?.status, 40),
        updatedAt: clean(task?.updated_at, 40),
        events: events.filter(event => clean(event?.taskId) === clean(task?.id)).map(event => [event.eventId, event.eventType, event.display?.status]),
    });
}
function cacheReceipt(task, target, events, receipt) {
    if (receiptCache.size > 500) {
        const oldest = receiptCache.keys().next().value;
        if (oldest)
            receiptCache.delete(oldest);
    }
    receiptCache.set(reconciliationCacheIdentity(task, target), {
        signature: reconciliationSignature(task, target, events),
        expiresAt: Date.now() + 10_000,
        receipt,
    });
    return receipt;
}
function safeCopiedDetail(event, target, source) {
    const detail = event.detail || {};
    const downstreamToGlobal = target.scope === "global" && source.scope !== "global";
    return {
        ...(target.scope !== "global" && detail.safeArguments ? { safeArguments: detail.safeArguments } : {}),
        ...(detail.evidenceIds ? { evidenceIds: detail.evidenceIds } : {}),
        ...(!downstreamToGlobal && detail.fileChanges ? { fileChanges: detail.fileChanges } : {}),
        ...(!downstreamToGlobal && detail.workspaceChanges ? { workspaceChanges: { ...detail.workspaceChanges, scope: target.scope, scopeId: target.scopeId, exactSessionId: target.exactSessionId } } : {}),
        ...(detail.agentDisplay ? { agentDisplay: detail.agentDisplay } : {}),
        ...(detail.executionStage ? { executionStage: detail.executionStage } : {}),
        ...(!downstreamToGlobal && detail.toolDisplay ? { toolDisplay: detail.toolDisplay } : {}),
        ...(detail.progress ? { progress: detail.progress } : {}),
        ...(detail.keyProgress ? { keyProgress: detail.keyProgress } : {}),
        ...(detail.availableActions ? { availableActions: detail.availableActions } : {}),
        ...(detail.causalRefs ? { causalRefs: detail.causalRefs } : {}),
        ...(detail.replayLink ? { replayLink: { ...detail.replayLink, ...target, contentStored: false } } : {}),
    };
}
function copyBoundEvent(event, source, target, rootTask) {
    if (!isProcessEvent(event) || event.eventType === "context_compacted")
        return null;
    const downstreamToolToGlobal = target.scope === "global" && source.scope !== "global" && String(event.eventType).startsWith("tool_");
    const rootTaskId = clean(rootTask?.id);
    const eventId = projectedEventId(rootTaskId, target, event.eventId);
    const base = {
        ...target,
        eventId,
        eventType: event.eventType,
        createdAt: event.createdAt,
        generation: Math.max(0, Number(rootTask?.generation || event.generation || 0)),
        attempt: Math.max(1, Number(rootTask?.execution_attempt || event.attempt || 1)),
        anchorMessageId: (0, task_conversation_links_1.taskConversationAnchorMessageId)(rootTask, `task-message:${rootTaskId}`),
        turnId: `execution-reconciliation:${rootTaskId}`,
        taskId: rootTaskId,
        workItemId: event.workItemId,
        agentRunId: event.agentRunId,
        toolCallId: event.toolCallId,
        toolName: downstreamToolToGlobal
            ? (isTestAgentEvent(event) ? "delegated_test_agent_check" : "delegated_project_agent_tool")
            : event.toolName,
        parentEventId: event.parentEventId,
        parallelGroupId: event.parallelGroupId,
        display: downstreamToolToGlobal ? {
            title: isTestAgentEvent(event) ? "TestAgent 安全检查" : "项目 Agent 工具",
            target: clean(event?.detail?.agentDisplay?.projectName || event?.detail?.agentDisplay?.projectId || source.scopeId),
            summary: event.eventType === "tool_started" || event.eventType === "tool_progress" ? "正在执行"
                : event.eventType === "tool_failed" ? "执行未通过" : "执行完成",
            status: event.eventType === "tool_started" || event.eventType === "tool_progress" ? "running"
                : event.eventType === "tool_failed" ? "failed" : "success",
            ...(event.display?.durationMs ? { durationMs: event.display.durationMs } : {}),
        } : {
            ...event.display,
            ...(event.display?.summary ? { summary: safeNarrative(event.display.summary) } : {}),
        },
        detail: safeCopiedDetail(event, target, source),
        visibility: event.visibility,
        contentStored: false,
    };
    return event.eventType === "assistant_progress"
        ? (0, user_visible_agent_events_1.appendAssistantProgress)({ ...base, text: event.detail?.progress?.text || event.display?.summary })
        : (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)(base);
}
function replayEventType(row) {
    const category = clean(row?.technical?.event_type || row?.category, 80);
    if (row?.source === "user_visible_agent_event" && KNOWN_REPLAY_EVENT_TYPES.has(category))
        return category;
    const failed = ["failed", "blocked"].includes(clean(row?.status, 40));
    const running = clean(row?.status, 40) === "running";
    if (row?.actor?.type === "test_agent")
        return failed ? "agent_failed" : running ? "agent_started" : "agent_completed";
    if (["execution", "agent_session", "work_item"].includes(clean(row?.source, 80)))
        return failed ? "agent_failed" : running ? "agent_started" : "agent_progress";
    if (row?.source === "global_agent" && clean(row?.technical?.tool_name || row?.technical?.tool))
        return failed ? "tool_failed" : "tool_completed";
    if (["global_agent", "project_message", "group_message"].includes(clean(row?.source, 80)) && row?.stage !== "completion")
        return "assistant_progress";
    const timelineKind = clean(row?.category, 120);
    if (/^(?:project_worker|group_worker).*(?:started|dispatched)$/i.test(timelineKind))
        return "agent_started";
    if (/^(?:project_worker|group_worker).*(?:completed|finished|delivered)$/i.test(timelineKind))
        return failed ? "agent_failed" : "agent_completed";
    if (/test_agent.*(?:started|planning)$/i.test(timelineKind))
        return "agent_started";
    if (/test_agent.*(?:completed|finished|accepted)$/i.test(timelineKind))
        return failed ? "agent_failed" : "agent_completed";
    if (/^(?:project|group|global)_main_/i.test(timelineKind) && row?.stage !== "completion")
        return "assistant_progress";
    return "";
}
function stageKind(stage) {
    if (stage === "test")
        return "independent_verification";
    if (stage === "review")
        return "main_agent_summary";
    if (stage === "dispatch")
        return "coordination_dispatch";
    return "project_execution";
}
function appendReplayProjection(row, target, rootTask, sourceChecksum) {
    const eventType = replayEventType(row);
    if (!eventType)
        return null;
    const downstreamToolToGlobal = target.scope === "global" && eventType.startsWith("tool_") && row?.actor?.type !== "global_agent";
    const link = row?.replay_link || {};
    const sourceTaskId = clean(row?.task_id || rootTask?.id);
    const taskId = clean(rootTask?.id);
    const attempt = Math.max(1, Number(rootTask?.execution_attempt || link.attempt || row?.technical?.attempt || 1));
    const generation = Math.max(0, Number(rootTask?.generation || link.generation || row?.technical?.generation || 0));
    const project = clean(row?.project || rootTask?.target_project);
    const actorLabel = clean(row?.actor?.label || (row?.actor?.type === "test_agent" ? "TestAgent" : project || "Agent"), 120);
    const originalToolName = clean(row?.technical?.tool_name || row?.technical?.tool, 180);
    const toolName = downstreamToolToGlobal
        ? (row?.actor?.type === "test_agent" ? "delegated_test_agent_check" : "delegated_project_agent_tool")
        : originalToolName;
    const toolCallId = clean(row?.technical?.tool_call_id || (eventType.startsWith("tool_") ? row?.id : ""), 240);
    const agentRunId = clean(row?.technical?.agent_run_id || row?.technical?.run_id
        || (eventType.startsWith("agent_") ? `${row?.actor?.type || "agent"}:${row?.technical?.execution_id || row?.id}` : ""), 240);
    const eventId = projectedEventId(clean(rootTask?.id), target, `replay:${row?.id}`);
    const displayStatus = ["failed", "blocked"].includes(clean(row?.status, 40)) ? "failed"
        : row?.status === "running" ? "running" : "success";
    const crossScopeProjectSummary = target.scope !== "project" && row?.actor?.type === "project_agent";
    const summary = downstreamToolToGlobal
        ? (displayStatus === "running" ? "正在执行" : displayStatus === "failed" ? "执行未通过" : "执行完成")
        : safeNarrative(crossScopeProjectSummary ? row?.title : row?.summary, 600);
    const detail = {
        evidenceIds: Array.isArray(row?.evidence_ids) ? row.evidence_ids : [],
        ...(!downstreamToolToGlobal && Array.isArray(row?.file_changes) ? { fileChanges: row.file_changes } : {}),
        ...(!(target.scope === "global" && row?.actor?.type !== "global_agent") && row?.tool_display ? { toolDisplay: row.tool_display } : {}),
        replayLink: { ...link, ...target, taskId: sourceTaskId, replayEventId: row?.id, contentStored: false },
        causalRefs: row?.causal_refs || {},
        reconciliation: { sourceChecksum, source: clean(row?.source, 80), contentStored: false },
    };
    if (eventType.startsWith("agent_")) {
        detail.agentDisplay = {
            projectId: project,
            projectName: project,
            runtimeLabel: actorLabel,
            workItemTitle: clean(row?.title, 300),
            phase: clean(row?.stage, 80),
            attempt,
            isParallel: false,
        };
        detail.executionStage = {
            kind: stageKind(row?.stage),
            stageRunId: agentRunId || `replay:${row?.id}`,
            attempt,
            startedAt: clean(row?.at, 40) || new Date().toISOString(),
            ...(displayStatus !== "running" ? { completedAt: clean(row?.at, 40) || new Date().toISOString() } : {}),
            ...(Number.isFinite(Number(row?.technical?.duration_ms)) ? { activeDurationMs: Math.max(0, Number(row.technical.duration_ms)) } : {}),
        };
    }
    const base = {
        ...target,
        eventId,
        eventType,
        createdAt: row?.at,
        generation,
        attempt,
        anchorMessageId: clean(link.anchorMessageId || (0, task_conversation_links_1.taskConversationAnchorMessageId)(rootTask, `task-message:${rootTask?.id}`)),
        turnId: `execution-reconciliation:${rootTask?.id}`,
        taskId,
        workItemId: clean(link.workItemId || row?.technical?.work_item_id),
        agentRunId,
        toolCallId,
        toolName,
        display: {
            title: downstreamToolToGlobal
                ? (row?.actor?.type === "test_agent" ? "TestAgent 安全检查" : "项目 Agent 工具")
                : safeNarrative(row?.title, 200) || actorLabel,
            summary,
            status: displayStatus,
        },
        detail,
        visibility: "transcript",
        contentStored: false,
    };
    return eventType === "assistant_progress"
        ? (0, user_visible_agent_events_1.appendAssistantProgress)({ ...base, text: summary || safeNarrative(row?.title, 600), kind: row?.stage === "review" ? "before_summary" : "key_finding" })
        : (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)(base);
}
function appendTestAgentProgressProjection(row, target, rootTask, sourceId, allowedTaskIds = new Set([clean(rootTask?.id)])) {
    const taskId = clean(rootTask?.id);
    const sourceTaskId = clean(row?.context?.taskId || row?.context?.task_id);
    if (!taskId || !sourceTaskId || !allowedTaskIds.has(sourceTaskId) || !clean(row?.toolCallId))
        return null;
    const phase = clean(row?.phase, 40);
    const eventType = phase === "started" ? "tool_started" : phase === "failed" ? "tool_failed" : "tool_completed";
    const globalSafe = target.scope === "global";
    const kind = clean(row?.kind, 40);
    const label = globalSafe
        ? kind === "browser" || kind === "browser_tool" ? "TestAgent 浏览器检查" : kind === "http" ? "TestAgent 接口检查" : "TestAgent 验证命令"
        : safeNarrative(row?.title || row?.label, 240);
    const projectId = clean(row?.project || row?.context?.projectId || row?.context?.project_id);
    const safeArguments = globalSafe ? { project_id: projectId } : {
        project_id: projectId,
        check: safeNarrative(row?.label, 240),
        ...(clean(row?.command, 600) ? { command: safeNarrative(row.command, 600) } : {}),
    };
    const safeResult = {
        status: phase === "started" ? "running" : phase === "failed" ? clean(row?.status, 40) || "failed" : "passed",
        exitCode: Number.isFinite(Number(row?.exitCode)) ? Number(row.exitCode) : null,
        durationMs: Math.max(0, Number(row?.durationMs || 0)),
        contentStored: false,
    };
    const { buildToolDisplayDetail } = require("./tool-display-projection");
    const toolName = clean(row?.toolName, 180) || "run_command";
    return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
        eventId: projectedEventId(taskId, target, `test-agent-progress:${sourceId}:${row.toolCallId}:${phase}`),
        ...target,
        taskId,
        generation: Math.max(0, Number(rootTask?.generation || row?.context?.generation || 0)),
        attempt: Math.max(1, Number(rootTask?.execution_attempt || row?.context?.attempt || 1)),
        anchorMessageId: (0, task_conversation_links_1.taskConversationAnchorMessageId)(rootTask, `task-message:${taskId}`),
        turnId: `execution-reconciliation:${taskId}`,
        agentRunId: clean(row?.context?.agentRunId || row?.context?.agent_run_id),
        parentEventId: clean(row?.context?.agentRunId || row?.context?.agent_run_id),
        toolCallId: clean(row?.toolCallId),
        toolName,
        eventType,
        createdAt: clean(row?.at, 40) || new Date().toISOString(),
        display: {
            title: label || "TestAgent 检查",
            target: projectId,
            summary: phase === "started" ? "正在执行" : phase === "failed" ? `${safeNarrative(row?.label, 180) || "检查"}未通过` : `${safeNarrative(row?.label, 180) || "检查"}已完成`,
            status: phase === "started" ? "running" : phase === "failed" ? "failed" : "success",
            ...(safeResult.durationMs ? { durationMs: safeResult.durationMs } : {}),
        },
        detail: {
            safeArguments,
            safeResult,
            toolDisplay: buildToolDisplayDetail({ toolName, arguments: safeArguments, result: safeResult, error: phase === "failed" ? "TestAgent 检查未通过" : undefined, includeTechnicalCommand: !globalSafe }),
            reconciliation: { source: "test_agent_progress", sourceChecksum: clean(row?.checksum, 160), contentStored: false },
        },
        visibility: "transcript",
        contentStored: false,
    });
}
function testAgentReportProgressRows(record, target, rootTask) {
    const report = record?.result?.report || record?.result?.invocation?.report;
    if (!report || typeof report !== "object")
        return [];
    const taskId = clean(record?.taskId || report?.taskId || rootTask?.id);
    const baseContext = {
        scope: target.scope === "global" ? "project" : target.scope,
        scopeId: target.scope === "global" ? clean(rootTask?.target_project || rootTask?.project_id || "delegated-project") : target.scopeId,
        exactSessionId: target.exactSessionId,
        taskId,
        generation: Math.max(0, Number(rootTask?.generation || 0)),
        attempt: Math.max(1, Number(rootTask?.execution_attempt || 1)),
        anchorMessageId: (0, task_conversation_links_1.taskConversationAnchorMessageId)(rootTask, `task-message:${rootTask?.id}`),
    };
    const definitions = [
        { kind: "command", rows: Array.isArray(report.commandResults) ? report.commandResults : [], label: row => clean(row?.command, 240) || "验证命令", command: row => clean(row?.command, 600) },
        { kind: "dev_server", rows: Array.isArray(report.devServerResults) ? report.devServerResults : [], label: row => clean(row?.name || row?.command, 240) || "测试服务", command: row => clean(row?.command, 600) },
        { kind: "http", rows: Array.isArray(report.httpResults) ? report.httpResults : [], label: row => clean(row?.name, 240) || "HTTP 检查" },
        { kind: "browser", rows: Array.isArray(report.browserResults) ? report.browserResults : [], label: row => clean(row?.name, 240) || "浏览器检查" },
        { kind: "browser_tool", rows: Array.isArray(report.browserToolCalls) ? report.browserToolCalls : [], label: row => clean(row?.toolName, 160) || "浏览器工具" },
    ];
    return definitions.flatMap(definition => definition.rows.slice(0, 1_000).map((row, index) => {
        const project = clean(row?.project || row?.projectName || rootTask?.target_project || rootTask?.project_id || "project");
        const label = definition.label(row, index);
        const status = clean(row?.status, 40).toLowerCase();
        const failed = ["failed", "blocked", "timed_out", "error"].includes(status);
        const toolCallId = `test-agent-report:${checksum({ runId: record?.id, kind: definition.kind, index, project, label }).slice(0, 28)}`;
        return {
            schema: "ccm-test-agent-tool-progress-v1",
            phase: failed ? "failed" : "completed",
            at: clean(row?.finishedAt || row?.finished_at || record?.finishedAt || report?.finishedAt, 40),
            context: {
                ...baseContext,
                projectId: project,
                agentRunId: clean(record?.id) || `task-test-agent:${taskId}:${project || "group"}`,
            },
            toolCallId,
            toolName: definition.kind === "command" || definition.kind === "dev_server" ? "run_command"
                : definition.kind === "http" ? "test_agent_http_check"
                    : definition.kind === "browser_tool" ? "test_agent_browser_tool" : "test_agent_browser_check",
            title: label,
            kind: definition.kind,
            key: `${definition.kind}:${index}`,
            project,
            label,
            ...(definition.command?.(row) ? { command: definition.command(row) } : {}),
            status: failed ? status || "failed" : "passed",
            exitCode: Number.isFinite(Number(row?.exitCode ?? row?.exit_code)) ? Number(row?.exitCode ?? row?.exit_code) : null,
            durationMs: Math.max(0, Number(row?.durationMs || row?.duration_ms || 0)),
            checksum: checksum({ runId: record?.id, kind: definition.kind, index, project, label, status }),
            contentStored: false,
        };
    }));
}
function expectedCoverage(replay) {
    const rows = Array.isArray(replay?.events) ? replay.events : [];
    return {
        main: rows.some((row) => replayEventType(row) === "assistant_progress" || replayEventType(row).startsWith("tool_")),
        child: rows.some((row) => row?.actor?.type === "project_agent" && replayEventType(row).startsWith("agent_")
            && !/主 Agent/i.test(clean(row?.actor?.label))),
        test: rows.some((row) => row?.actor?.type === "test_agent"),
        terminal: TERMINAL.has(clean(replay?.status, 40).toLowerCase()),
    };
}
function actualCoverage(events, taskIds) {
    const rows = events.filter(event => taskIds.has(clean(event?.taskId)));
    return {
        main: rows.some(isMainAgentEvent),
        child: rows.some(isChildAgentEvent),
        test: rows.some(isTestAgentEvent),
        terminal: rows.some(event => event.eventType === "result"),
    };
}
function missingCoverage(expected, actual) {
    const rows = [];
    if (expected.main && !actual.main)
        rows.push("main_agent_history_missing");
    if (expected.child && !actual.child)
        rows.push("child_agent_execution_missing");
    if (expected.test && !actual.test)
        rows.push("test_agent_record_missing");
    if (expected.terminal && !actual.terminal)
        rows.push("terminal_gate_record_missing");
    return rows;
}
function reconcileConversationExecutionForTask(taskOrId, options = {}) {
    const tasks = (0, db_1.loadTasks)();
    const task = typeof taskOrId === "string" ? tasks.find((item) => clean(item?.id) === clean(taskOrId)) : taskOrId;
    if (!task?.id)
        return null;
    const target = options.identity || taskPrimaryIdentity(task);
    if (!target?.scopeId || !target?.exactSessionId)
        return null;
    const currentBefore = listAllEvents(target);
    const startingEventCount = currentBefore.length;
    const startingToolEventIds = new Set(currentBefore.filter(event => String(event?.eventType || "").startsWith("tool_")).map(event => event.eventId));
    const cached = receiptCache.get(reconciliationCacheIdentity(task, target));
    if (cached && cached.expiresAt > Date.now() && cached.signature === reconciliationSignature(task, target, currentBefore)) {
        return {
            ...cached.receipt,
            projectedEventCount: 0,
            status: cached.receipt.status === "partial" ? "partial" : "current",
        };
    }
    const terminal = TERMINAL.has(clean(task?.status, 40).toLowerCase());
    const alreadyMeaningful = currentBefore.some(event => clean(event?.taskId) === clean(task.id) && isProcessEvent(event));
    if (!terminal && alreadyMeaningful) {
        const currentTaskIds = new Set([clean(task.id)]);
        const agentToolCoverage = buildAgentToolCoverage(currentBefore, currentTaskIds, false);
        return cacheReceipt(task, target, currentBefore, {
            schema: "ccm-conversation-execution-reconciliation-v1", ...target, taskId: clean(task.id),
            generation: Math.max(0, Number(task?.generation || 0)),
            attempts: [...new Set(currentBefore.filter(event => clean(event?.taskId) === clean(task.id)).map(event => Math.max(1, Number(event.attempt || 1))))],
            sourceChecksum: checksum({ taskId: task.id, status: task.status, revision: task.revision }),
            projectedEventCount: 0, projectedToolEventCount: 0, agentToolCoverage, missingSourceKinds: [], status: "current", contentStored: false,
        });
    }
    // Lazy import avoids turning task-replay's existing user-visible event reader
    // into a module initialization cycle.
    const replay = require("../modules/collaboration/task-replay").buildCompleteTaskReplay(clean(task.id), {
        includeDetails: false,
        includeSystemEvents: true,
    });
    if (!replay)
        return null;
    const familyIds = new Set((Array.isArray(replay.tasks) ? replay.tasks : []).map((item) => clean(item?.id)).filter(Boolean));
    familyIds.add(clean(task.id));
    let projectedEventCount = 0;
    const sourceIdentities = [];
    const addIdentity = (value) => {
        const identity = {
            scope: clean(value?.scope, 16),
            scopeId: clean(value?.scopeId || value?.scope_id),
            exactSessionId: clean(value?.exactSessionId || value?.exact_session_id),
        };
        if (!["global", "group", "project"].includes(identity.scope) || !identity.scopeId || !identity.exactSessionId || sameIdentity(identity, target))
            return;
        if (!sourceIdentities.some(item => sameIdentity(item, identity)))
            sourceIdentities.push(identity);
    };
    for (const member of tasks.filter((item) => familyIds.has(clean(item?.id))))
        for (const identity of taskIdentities(member, tasks))
            addIdentity(identity);
    for (const link of replay.navigation || [])
        addIdentity(link);
    for (const source of sourceIdentities) {
        let rows = [];
        try {
            rows = listAllEvents(source);
        }
        catch {
            continue;
        }
        for (const event of rows) {
            if (!familyIds.has(clean(event?.taskId)))
                continue;
            if (copyBoundEvent(event, source, target, task))
                projectedEventCount += 1;
        }
    }
    let current = listAllEvents(target);
    const projectedReplayIds = new Set(current.map(event => clean(event?.detail?.replayLink?.replayEventId)).filter(Boolean));
    for (const row of replay.events || []) {
        if (!familyIds.has(clean(row?.task_id)) || projectedReplayIds.has(clean(row?.id)))
            continue;
        if (appendReplayProjection(row, target, task, clean(replay.replay_source_checksum, 128)))
            projectedEventCount += 1;
    }
    try {
        const runner = require("../modules/collaboration/test-agent-runner");
        const progress = require("../test-agent/user-visible-progress");
        const records = runner.listTestAgentRunnerRecords({ taskIds: [...familyIds], limit: 500 });
        for (const record of records) {
            const persistedRows = progress.readTestAgentVisibleProgress(record.progressPath || "");
            const rows = persistedRows.length ? persistedRows : testAgentReportProgressRows(record, target, task);
            for (const row of rows) {
                if (appendTestAgentProgressProjection(row, target, task, record.id, familyIds))
                    projectedEventCount += 1;
            }
        }
    }
    catch { }
    current = listAllEvents(target);
    const expected = expectedCoverage(replay);
    const agentToolCoverage = buildAgentToolCoverage(current, familyIds, terminal);
    const missingSourceKinds = [...new Set([
            ...missingCoverage(expected, actualCoverage(current, familyIds)),
            ...missingToolCoverage(agentToolCoverage),
        ])];
    if (missingSourceKinds.length && terminal) {
        const noticeId = projectedEventId(clean(task.id), target, `partial:${clean(replay.replay_source_checksum, 128)}`);
        const existing = current.some(event => event.eventId === noticeId);
        (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            ...target,
            eventId: noticeId,
            eventType: "context_compacted",
            createdAt: task?.updated_at,
            generation: Math.max(0, Number(task?.generation || 0)),
            attempt: Math.max(1, Number(task?.execution_attempt || 1)),
            anchorMessageId: (0, task_conversation_links_1.taskConversationAnchorMessageId)(task, `task-message:${task.id}`),
            turnId: `execution-reconciliation:${task.id}`,
            taskId: clean(task.id),
            display: {
                title: "部分历史处理过程未被记录",
                summary: `缺少：${missingSourceKinds.join("、")}`,
                status: "waiting",
            },
            detail: { reconciliation: { sourceChecksum: replay.replay_source_checksum, missingSourceKinds, contentStored: false } },
            visibility: "transcript",
            contentStored: false,
        });
        if (!existing)
            projectedEventCount += 1;
    }
    current = listAllEvents(target);
    projectedEventCount = Math.max(0, current.length - startingEventCount);
    const projectedToolEventCount = current.filter(event => String(event?.eventType || "").startsWith("tool_") && !startingToolEventIds.has(event.eventId)).length;
    const attempts = [...new Set(current
            .filter(event => familyIds.has(clean(event?.taskId)))
            .map(event => Math.max(1, Number(event.attempt || event.detail?.executionStage?.attempt || 1))))]
        .sort((left, right) => left - right);
    return cacheReceipt(task, target, current, {
        schema: "ccm-conversation-execution-reconciliation-v1",
        ...target,
        taskId: clean(task.id),
        generation: Math.max(0, Number(task?.generation || 0)),
        attempts,
        sourceChecksum: clean(replay.replay_source_checksum, 128),
        projectedEventCount,
        projectedToolEventCount,
        agentToolCoverage,
        missingSourceKinds,
        status: missingSourceKinds.length ? "partial" : projectedEventCount ? "repaired" : "current",
        contentStored: false,
    });
}
function reconcileConversationExecutionsForIdentity(identity) {
    const tasks = (0, db_1.loadTasks)();
    const candidates = tasks.filter((task) => taskIdentities(task, tasks).some(item => sameIdentity(item, identity)));
    const roots = new Map();
    const byId = new Map(tasks.map((task) => [clean(task?.id), task]));
    for (const candidate of candidates) {
        let root = candidate;
        const seen = new Set();
        while (clean(root?.parent_task_id) && byId.has(clean(root.parent_task_id)) && !seen.has(clean(root.id))) {
            seen.add(clean(root.id));
            root = byId.get(clean(root.parent_task_id));
        }
        roots.set(clean(root?.id || candidate?.id), root || candidate);
    }
    const receipts = [...roots.values()]
        .map(task => reconcileConversationExecutionForTask(task, { identity, reason: "conversation_snapshot" }))
        .filter(Boolean);
    return {
        schema: "ccm-conversation-execution-reconciliation-list-v1",
        receipts,
        repaired: receipts.filter(item => item.status === "repaired").length,
        partial: receipts.filter(item => item.status === "partial").length,
        contentStored: false,
    };
}
//# sourceMappingURL=conversation-execution-reconciliation.js.map