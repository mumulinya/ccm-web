import * as crypto from "crypto";
import { appendUserVisibleAgentEvent } from "./user-visible-agent-events";
import type { AgentRuntimeStructuredEvent } from "../agents/runtime-structured-events";

type ObservedState = {
  lastSemanticAt: number;
  lastFallbackFingerprint: string;
  fileTargets: Set<string>;
  activeTools: Set<string>;
  completedTools: Set<string>;
  verificationCount: number;
  timer?: NodeJS.Timeout;
};

const observed = new Map<string, ObservedState>();

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stateFor(event: AgentRuntimeStructuredEvent) {
  const key = `${event.agentRunId}:${event.generation}:${event.attempt}`;
  let state = observed.get(key);
  if (!state) {
    state = { lastSemanticAt: Date.now(), lastFallbackFingerprint: "", fileTargets: new Set(), activeTools: new Set(), completedTools: new Set(), verificationCount: 0 };
    observed.set(key, state);
  }
  return { key, state };
}

function base(event: AgentRuntimeStructuredEvent) {
  return {
    eventId: `runtime:${event.eventId}`,
    scope: event.scope,
    scopeId: event.scopeId,
    exactSessionId: event.exactSessionId,
    anchorMessageId: event.anchorMessageId,
    ...(event.originMessageId ? { originMessageId: event.originMessageId } : {}),
    generation: event.generation,
    taskId: event.taskId,
    workItemId: event.workItemId,
    agentRunId: event.agentRunId,
    parentEventId: event.agentRunId,
    createdAt: event.createdAt,
  };
}

export function projectAgentRuntimeStructuredEvent(event: AgentRuntimeStructuredEvent) {
  const { state } = stateFor(event);
  if (event.eventType === "assistant_progress") {
    if (event.assistantRole === "final") return null;
    state.lastSemanticAt = Date.now();
    return appendUserVisibleAgentEvent({
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
      if (event.eventType === "tool_started") state.activeTools.add(event.toolCallId);
      else { state.activeTools.delete(event.toolCallId); state.completedTools.add(event.toolCallId); }
    }
    return appendUserVisibleAgentEvent({
      ...base(event),
      eventType: event.eventType,
      toolCallId: event.toolCallId,
      toolName: event.safeSummary || "Runtime tool",
      target: event.target,
      display: { title: event.safeSummary || "Runtime tool", target: event.target, status: event.status },
      detail: { runtimeObservation: { source: event.progressSource, confidence: event.confidence, runtime: event.runtime, runtimeVersion: event.runtimeVersion, sourceEventChecksum: event.sourceEventChecksum, contentStored: false } },
      visibility: "transcript",
    });
  }
  if (event.eventType === "file_changed" && event.target) state.fileTargets.add(event.target);
  if (event.eventType.startsWith("verification_")) state.verificationCount += event.eventType === "verification_completed" ? 1 : 0;
  return appendUserVisibleAgentEvent({
    ...base(event),
    eventType: "agent_progress",
    display: { title: "Agent 运行观察", target: event.target, summary: event.safeSummary, status: event.status },
    detail: { runtimeObservation: { eventType: event.eventType, source: event.progressSource, confidence: event.confidence, runtime: event.runtime, runtimeVersion: event.runtimeVersion, sourceEventChecksum: event.sourceEventChecksum, contentStored: false } },
    visibility: "transcript",
  });
}

export function startAgentProgressFallback(event: AgentRuntimeStructuredEvent, timeoutMs = 60_000) {
  const { key, state } = stateFor(event);
  if (state.timer) clearInterval(state.timer);
  const interval = Math.max(15_000, Math.min(300_000, Number(timeoutMs || 60_000)));
  state.timer = setInterval(() => {
    if (Date.now() - state.lastSemanticAt < interval) return;
    const facts = {
      files: [...state.fileTargets].sort(),
      activeTools: state.activeTools.size,
      completedTools: state.completedTools.size,
      verificationCount: state.verificationCount,
    };
    const fingerprint = hash(facts);
    if (fingerprint === state.lastFallbackFingerprint) return;
    state.lastFallbackFingerprint = fingerprint;
    const summary = facts.files.length
      ? `已修改 ${facts.files.length} 个文件，Agent 仍在运行。`
      : facts.activeTools || facts.completedTools || facts.verificationCount
        ? `Agent 仍在运行：已观察到 ${facts.completedTools} 个工具完成，${facts.activeTools} 个工具执行中。`
        : "Agent 仍在运行，等待可验证进度。";
    appendUserVisibleAgentEvent({
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

export function markAgentReportedSemanticProgress(agentRunId: string, generation: number, attempt: number) {
  const state = observed.get(`${agentRunId}:${generation}:${attempt}`);
  if (state) state.lastSemanticAt = Date.now();
}

export function stopAgentProgressFallback(keyOrRunId: string, generation?: number, attempt?: number) {
  const key = generation == null ? keyOrRunId : `${keyOrRunId}:${generation}:${attempt || 1}`;
  const state = observed.get(key);
  if (state?.timer) clearInterval(state.timer);
  observed.delete(key);
}
