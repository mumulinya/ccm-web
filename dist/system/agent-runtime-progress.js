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
exports.publishLiveWorkspaceChanges = publishLiveWorkspaceChanges;
exports.projectAgentRuntimeStructuredEvent = projectAgentRuntimeStructuredEvent;
exports.startAgentProgressFallback = startAgentProgressFallback;
exports.markAgentReportedSemanticProgress = markAgentReportedSemanticProgress;
exports.stopAgentProgressFallback = stopAgentProgressFallback;
const crypto = __importStar(require("crypto"));
const user_visible_agent_events_1 = require("./user-visible-agent-events");
const tool_display_projection_1 = require("./tool-display-projection");
const observed = new Map();
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function stateFor(event) {
    const key = `${event.agentRunId}:${event.generation}:${event.attempt}`;
    let state = observed.get(key);
    if (!state) {
        state = { lastSemanticAt: Date.now(), lastFallbackFingerprint: "", fileTargets: new Set(), activeTools: new Set(), completedTools: new Set(), verificationCount: 0 };
        observed.set(key, state);
    }
    return { key, state };
}
function base(event) {
    return {
        eventId: `runtime:${event.eventId}`,
        scope: event.scope,
        scopeId: event.scopeId,
        exactSessionId: event.exactSessionId,
        anchorMessageId: event.anchorMessageId,
        turnId: event.turnId || event.anchorMessageId,
        ...(event.originMessageId ? { originMessageId: event.originMessageId } : {}),
        generation: event.generation,
        attempt: event.attempt,
        taskId: event.taskId,
        workItemId: event.workItemId,
        agentRunId: event.agentRunId,
        parentEventId: event.agentRunId,
        createdAt: event.createdAt,
    };
}
function publishLiveWorkspaceChanges(identity, receipt) {
    return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
        eventId: `runtime-workspace:${receipt.agentRunId}:${receipt.generation}:${receipt.attempt}:${receipt.revision}:${receipt.checksum.slice(0, 16)}`,
        scope: receipt.scope,
        scopeId: receipt.scopeId,
        exactSessionId: receipt.exactSessionId,
        anchorMessageId: identity.anchorMessageId || receipt.turnId,
        turnId: receipt.turnId,
        ...(identity.originMessageId ? { originMessageId: identity.originMessageId } : {}),
        generation: receipt.generation,
        attempt: receipt.attempt,
        ...(receipt.taskId ? { taskId: receipt.taskId } : {}),
        workItemId: identity.workItemId,
        agentRunId: receipt.agentRunId,
        parentEventId: receipt.agentRunId,
        eventType: "agent_progress",
        display: {
            title: "文件变化",
            summary: receipt.totalFiles ? `${receipt.totalFiles} 个文件已更改` : "本轮文件变化已还原",
            status: "running",
        },
        detail: {
            fileChanges: receipt.files.map(file => ({ ...file, project: receipt.projectId })),
            workspaceChanges: receipt,
            runtimeObservation: {
                eventType: "workspace_file_changes",
                source: "system_observed",
                confidence: "observed",
                sourceEventChecksum: receipt.checksum,
                contentStored: false,
            },
        },
        visibility: "transcript",
    });
}
function projectAgentRuntimeStructuredEvent(event) {
    const { state } = stateFor(event);
    if (event.eventType === "assistant_progress") {
        if (event.assistantRole === "final")
            return null;
        state.lastSemanticAt = Date.now();
        return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            ...base(event),
            eventType: "assistant_progress",
            display: { title: "Agent 进度", summary: event.safeSummary, status: "running" },
            detail: { progress: {
                    kind: "key_finding",
                    text: event.safeSummary || "Agent 正在执行任务。",
                    modelCallIndex: 0,
                    relatedToolCallIds: event.relatedToolCallIds || [],
                    batchId: `agent-runtime:${event.agentRunId}:${event.attempt}`,
                    milestoneChecksum: event.sourceEventChecksum,
                    source: event.progressSource,
                    confidence: event.confidence,
                    sourceEventChecksum: event.sourceEventChecksum,
                } },
        });
    }
    if (event.eventType.startsWith("tool_")) {
        if (event.toolCallId) {
            if (event.eventType === "tool_started")
                state.activeTools.add(event.toolCallId);
            else {
                state.activeTools.delete(event.toolCallId);
                state.completedTools.add(event.toolCallId);
            }
        }
        const toolName = event.toolName || event.safeSummary || "tool";
        const fileReadEvidence = event.fileReadEvidence ? {
            ...event.fileReadEvidence,
            project: event.fileReadEvidence.project || event.project || (event.scope === "project" ? event.scopeId : ""),
        } : null;
        const eventOperation = String(toolName).split("__").at(-1)?.toLowerCase().replace(/[_\s-]+/g, "") || "";
        const baseArguments = {
            ...(event.safeArguments || {}),
            ...(event.project && (fileReadEvidence || /read/.test(eventOperation))
                && !event.safeArguments?.project && !event.safeArguments?.projectId && !event.safeArguments?.project_id ? { project_id: event.project } : {}),
        };
        const displayToolName = fileReadEvidence ? "mcp__ccm__ccm_workspace_readonly__read_file" : toolName;
        const displayArguments = fileReadEvidence ? {
            ...baseArguments,
            ...(fileReadEvidence.project ? { project_id: fileReadEvidence.project } : {}),
            path: fileReadEvidence.path,
            offset: fileReadEvidence.ranges[0]?.start || 1,
            ...(fileReadEvidence.checksum ? { expected_checksum: fileReadEvidence.checksum } : {}),
        } : baseArguments;
        const batchReadPaths = ["readfiles"].includes(eventOperation) && Array.isArray(baseArguments.paths)
            ? baseArguments.paths.map((entry) => typeof entry === "string" ? { path: entry } : entry).filter((entry) => entry?.path)
            : [];
        const displayResult = fileReadEvidence ? {
            ...(event.safeResult || { status: event.status }),
            path: fileReadEvidence.path,
            checksum: fileReadEvidence.checksum,
            offset: fileReadEvidence.ranges[0]?.start || 1,
            safeReceipt: { lineCount: 0 },
        } : batchReadPaths.length ? {
            ...(event.safeResult || { status: event.status }),
            files: batchReadPaths.map((entry) => ({ path: entry.path, offset: entry.offset || 1, status: event.status === "failed" ? "failed" : "completed", lines: [] })),
            item_count: batchReadPaths.length,
        } : event.safeResult || { status: event.status };
        const toolDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({
            toolName: displayToolName,
            arguments: displayArguments,
            result: displayResult,
            error: event.eventType === "tool_failed" ? event.safeResult?.error || "工具执行失败" : undefined,
            includeTechnicalCommand: true,
        });
        if (fileReadEvidence?.source === "safe_command_inference") {
            const commandDisplay = (0, tool_display_projection_1.buildToolDisplayDetail)({
                toolName,
                arguments: event.safeArguments || {},
                result: event.safeResult || { status: event.status },
                includeTechnicalCommand: true,
            });
            if (commandDisplay.sensitiveCommand)
                toolDisplay.sensitiveCommand = commandDisplay.sensitiveCommand;
        }
        const title = toolDisplay.tool.userLabel || toolDisplay.tool.label || "运行工具";
        const target = toolDisplay.tool.target || event.target;
        return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            ...base(event),
            eventId: `runtime-tool:${event.agentRunId}:${event.generation}:${event.attempt}:${event.toolCallId || event.eventId}`,
            eventType: event.eventType,
            toolCallId: event.toolCallId,
            toolName,
            target,
            display: { title, target, summary: event.eventType === "tool_started" ? "正在执行" : toolDisplay.result.summary, status: event.status },
            detail: {
                safeArguments: displayArguments,
                safeResult: event.safeResult,
                ...(fileReadEvidence ? { fileReadEvidence } : {}),
                toolDisplay,
                runtimeObservation: { source: event.progressSource, confidence: event.confidence, runtime: event.runtime, runtimeVersion: event.runtimeVersion, sourceEventChecksum: event.sourceEventChecksum, contentStored: false },
            },
            visibility: "transcript",
        });
    }
    if (event.eventType === "file_changed" && event.target)
        state.fileTargets.add(event.target);
    if (event.eventType.startsWith("verification_"))
        state.verificationCount += event.eventType === "verification_completed" ? 1 : 0;
    return (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
        ...base(event),
        eventType: "agent_progress",
        display: { title: "Agent 运行观察", target: event.target, summary: event.safeSummary, status: event.status },
        detail: { runtimeObservation: { eventType: event.eventType, source: event.progressSource, confidence: event.confidence, runtime: event.runtime, runtimeVersion: event.runtimeVersion, sourceEventChecksum: event.sourceEventChecksum, contentStored: false } },
        visibility: "transcript",
    });
}
function startAgentProgressFallback(event, timeoutMs = 60_000) {
    const { key, state } = stateFor(event);
    if (state.timer)
        clearInterval(state.timer);
    const interval = Math.max(15_000, Math.min(300_000, Number(timeoutMs || 60_000)));
    state.timer = setInterval(() => {
        if (Date.now() - state.lastSemanticAt < interval)
            return;
        const facts = {
            files: [...state.fileTargets].sort(),
            activeTools: state.activeTools.size,
            completedTools: state.completedTools.size,
            verificationCount: state.verificationCount,
        };
        const fingerprint = hash(facts);
        if (fingerprint === state.lastFallbackFingerprint)
            return;
        state.lastFallbackFingerprint = fingerprint;
        const summary = facts.files.length
            ? `已修改 ${facts.files.length} 个文件，Agent 仍在运行。`
            : facts.activeTools || facts.completedTools || facts.verificationCount
                ? `Agent 仍在运行：已观察到 ${facts.completedTools} 个工具完成，${facts.activeTools} 个工具执行中。`
                : "Agent 仍在运行，等待可验证进度。";
        (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
            ...base(event),
            eventId: `runtime-fallback:${event.agentRunId}:${event.generation}:${event.attempt}:${fingerprint.slice(0, 20)}`,
            eventType: "agent_progress",
            display: { title: "运行状态", summary, status: "running" },
            detail: { progress: {
                    kind: "key_finding", text: summary, modelCallIndex: 0, relatedToolCallIds: [],
                    batchId: `agent-runtime-fallback:${event.agentRunId}:${event.attempt}`,
                    milestoneChecksum: fingerprint,
                    source: "system_observed", confidence: "observed", sourceEventChecksum: fingerprint,
                } },
        });
    }, Math.min(interval, 15_000));
    state.timer.unref?.();
    return () => stopAgentProgressFallback(key);
}
function markAgentReportedSemanticProgress(agentRunId, generation, attempt) {
    const state = observed.get(`${agentRunId}:${generation}:${attempt}`);
    if (state)
        state.lastSemanticAt = Date.now();
}
function stopAgentProgressFallback(keyOrRunId, generation, attempt) {
    const key = generation == null ? keyOrRunId : `${keyOrRunId}:${generation}:${attempt || 1}`;
    const state = observed.get(key);
    if (state?.timer)
        clearInterval(state.timer);
    observed.delete(key);
}
//# sourceMappingURL=agent-runtime-progress.js.map