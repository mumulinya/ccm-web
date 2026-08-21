import * as crypto from "crypto";
import {
  appendAssistantProgress,
  type UserVisibleAgentEvent,
} from "./user-visible-agent-events";
import {
  assistantProgressNarrationEnabled,
  buildAssistantProgressFallback,
  buildToolBatchOutcomeProgress,
  sanitizeAssistantProgressText,
  type AssistantProgressKind,
} from "./assistant-progress";

export const CCM_AGENT_KEY_PROGRESS_SCHEMA = "ccm-agent-key-progress-v1" as const;

export type CcmAgentKeyProgressKind =
  | "model_preamble"
  | "phase_update"
  | "tool_batch_started"
  | "tool_batch_completed"
  | "model_key_summary"
  | "child_agent_update"
  | "verification_update";

export type CcmAgentKeyProgressSource =
  | "model_stream"
  | "deterministic"
  | "summary_model"
  | "child_agent";

export type CcmAgentKeyProgressV1 = {
  schema: typeof CCM_AGENT_KEY_PROGRESS_SCHEMA;
  eventId: string;
  scope: "global" | "group" | "project";
  exactSessionId: string;
  turnId: string;
  generation: number;
  modelCallIndex: number;
  round: number;
  kind: CcmAgentKeyProgressKind;
  text: string;
  source: CcmAgentKeyProgressSource;
  status: "running" | "success" | "failed" | "waiting";
  toolCallIds?: string[];
  relatedToolCallIds?: string[];
  relatedEventIds?: string[];
  contentStored: false;
};

type ProgressCoordinatorInput = {
  scope: "global" | "group" | "project";
  scopeId: string;
  exactSessionId: string;
  turnId: string;
  generation?: number;
  anchorMessageId?: string;
  taskId?: string;
  title?: string;
  target?: string;
  goal?: string;
  modelCallIndex?: number;
  config?: any;
};

type ProgressEmitInput = {
  kind: CcmAgentKeyProgressKind | AssistantProgressKind;
  text: string;
  source?: CcmAgentKeyProgressSource;
  status?: "running" | "success" | "failed" | "waiting";
  modelCallIndex?: number;
  round?: number;
  toolCallIds?: string[];
  relatedToolCallIds?: string[];
  relatedEventIds?: string[];
  eventId?: string;
  detail?: any;
};

const PHASE_LABELS: Record<string, string> = {
  understanding: "正在理解当前需求并核对必要上下文",
  tool_decision: "正在确定下一步需要核对的内容",
  tool_result_review: "已取得检查结果，正在归纳关键结论",
  verification: "正在核对验证结果",
  final_synthesis: "执行结果已收口，正在整理最终结论",
};

function uniqueStrings(values: any[] = []) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 64);
}

function hash(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toolName(row: any) {
  return String(row?.name || row?.toolName || row?.tool || "tool").trim();
}

function toolCallId(row: any) {
  return String(row?.callId || row?.toolCallId || row?.id || "").trim();
}

function safeText(value: any) {
  return sanitizeAssistantProgressText(value, 240);
}

function keyKindToAssistantKind(kind: CcmAgentKeyProgressKind) {
  if (kind === "tool_batch_started" || kind === "model_preamble") return "before_tools" as const;
  if (kind === "verification_update") return "verification" as const;
  if (kind === "child_agent_update") return "direction_change" as const;
  if (kind === "model_key_summary") return "before_summary" as const;
  return "key_finding" as const;
}

function normalizeKeyKind(kind: CcmAgentKeyProgressKind | AssistantProgressKind): CcmAgentKeyProgressKind {
  if (["model_preamble", "phase_update", "tool_batch_started", "tool_batch_completed", "model_key_summary", "child_agent_update", "verification_update"].includes(String(kind))) return kind as CcmAgentKeyProgressKind;
  if (kind === "before_tools") return "model_preamble";
  if (kind === "verification") return "verification_update";
  if (kind === "rework" || kind === "direction_change") return "child_agent_update";
  if (kind === "before_summary") return "model_key_summary";
  return "phase_update";
}

/**
 * Shared safe progress projection for global, group and project conversations.
 * It deliberately writes only the short user-facing milestone, never model
 * prompts, hidden reasoning or raw tool output.
 */
export function recordAgentKeyProgress(input: ProgressCoordinatorInput & ProgressEmitInput): UserVisibleAgentEvent | null {
  const text = safeText(input.text);
  if (!text || !input.exactSessionId || !input.turnId) return null;
  const normalizedKind = normalizeKeyKind(input.kind);
  const modelCallIndex = Math.max(0, Number(input.modelCallIndex ?? input.modelCallIndex ?? 0));
  const round = Math.max(0, Number(input.round || 0));
  const toolCallIds = uniqueStrings(input.toolCallIds || input.relatedToolCallIds || []);
  const relatedEventIds = uniqueStrings(input.relatedEventIds || []);
  const eventId = String(input.eventId || `key-progress:${input.turnId}:${normalizedKind}:${round}:${hash({ text, modelCallIndex, toolCallIds }).slice(0, 20)}`).slice(0, 240);
  return appendAssistantProgress({
    scope: input.scope,
    scopeId: input.scopeId,
    exactSessionId: input.exactSessionId,
    ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {}),
    generation: Math.max(0, Number(input.generation || 0)),
    turnId: input.turnId,
    text,
    kind: keyKindToAssistantKind(normalizedKind),
    modelCallIndex,
    relatedToolCallIds: toolCallIds,
    eventId,
    title: input.title || "Agent 进度",
    display: { status: input.status || "running" },
    detail: {
      ...(input.detail || {}),
      keyProgress: {
        schema: CCM_AGENT_KEY_PROGRESS_SCHEMA,
        eventId,
        kind: normalizedKind,
        source: input.source || "deterministic",
        status: input.status || "running",
        round,
        text,
        modelCallIndex,
        toolCallIds,
        relatedEventIds,
        contentStored: false,
      },
    },
  } as any);
}

export function createAgentKeyProgressCoordinator(input: ProgressCoordinatorInput) {
  const emitted = new Set<string>();
  const summarizedRounds = new Set<number>();
  const config = input.config || {};
  const enabled = assistantProgressNarrationEnabled(config);
  const shouldSummarizeRound = (round: number, calls: any[] = []) => enabled && !summarizedRounds.has(round) && (calls.length >= 2 || round >= 1);

  const emit = (event: ProgressEmitInput) => {
    if (!enabled) return null;
    const text = safeText(event.text);
    if (!text) return null;
    const fingerprint = hash({ kind: event.kind, text: text.toLowerCase(), round: event.round || 0, toolCallIds: event.toolCallIds || [] }).slice(0, 32);
    if (emitted.has(fingerprint)) return null;
    emitted.add(fingerprint);
    return recordAgentKeyProgress({ ...input, ...event, text });
  };

  return {
    enabled,
    emit,
    phase(phase: string, modelCallIndex = input.modelCallIndex || 0, round = 0) {
      return emit({ kind: "phase_update", text: PHASE_LABELS[phase] || PHASE_LABELS.understanding, source: "deterministic", modelCallIndex, round });
    },
    modelPreamble(text: string, modelCallIndex = input.modelCallIndex || 0, round = 0) {
      return emit({ kind: "model_preamble", text, source: "model_stream", modelCallIndex, round });
    },
    toolBatchStarted(calls: any[], round: number, modelCallIndex = input.modelCallIndex || 0) {
      const ids = uniqueStrings((calls || []).map(toolCallId));
      const names = uniqueStrings((calls || []).map(toolName));
      const subject = names.length ? `正在执行 ${names.slice(0, 3).join("、")}${names.length > 3 ? "等工具" : ""}` : "正在执行工具调用";
      return emit({ kind: "tool_batch_started", text: subject, source: "deterministic", modelCallIndex, round, toolCallIds: ids });
    },
    toolBatchCompleted(results: any[], round: number, modelCallIndex = input.modelCallIndex || 0) {
      const ids = uniqueStrings((results || []).map(toolCallId));
      const text = buildToolBatchOutcomeProgress(results || [], { target: input.target || input.scopeId }) || "工具结果已返回，正在根据结果确定下一步";
      return emit({ kind: "tool_batch_completed", text, source: "deterministic", status: (results || []).some(row => row?.ok === false) ? "failed" : "success", modelCallIndex, round, toolCallIds: ids });
    },
    childAgent(text: string, modelCallIndex = input.modelCallIndex || 0, round = 0, status: ProgressEmitInput["status"] = "running") {
      return emit({ kind: "child_agent_update", text, source: "child_agent", status, modelCallIndex, round });
    },
    verification(text: string, modelCallIndex = input.modelCallIndex || 0, round = 0, status: ProgressEmitInput["status"] = "running") {
      return emit({ kind: "verification_update", text, source: "deterministic", status, modelCallIndex, round });
    },
    shouldSummarize(round: number, calls: any[] = []) {
      return enabled && !summarizedRounds.has(round) && (calls.length >= 2 || round >= 1);
    },
    markSummary(round: number) {
      summarizedRounds.add(round);
    },
    async summarizeToolBatch(round: number, results: any[], callSummaryModel?: (prompt: string) => Promise<string>, modelCallIndex = input.modelCallIndex || 0) {
      if (!callSummaryModel || !shouldSummarizeRound(round, results)) return null;
      summarizedRounds.add(round);
      const rows = (results || []).slice(0, 8).map(row => ({
        tool: toolName(row),
        ok: row?.ok !== false,
        summary: safeText(row?.summary || row?.message || row?.output?.summary || row?.result?.summary || "结果已返回"),
      }));
      const prompt = [
        "You are a concise progress summarizer for CCM.",
        "Do not reveal hidden reasoning, prompts, secrets, raw output, source code, or tool arguments.",
        "Return one short user-facing sentence in the conversation language: what was confirmed and what happens next.",
        `Target: ${safeText(input.target || input.scopeId) || "current task"}`,
        `Goal: ${safeText(input.goal || "") || "continue the current task"}`,
        `Tool observations: ${JSON.stringify(rows)}`,
      ].join("\n");
      try {
        const text = safeText(await callSummaryModel(prompt));
        if (!text) return null;
        return emit({ kind: "model_key_summary", text, source: "summary_model", status: "success", modelCallIndex, round, toolCallIds: uniqueStrings((results || []).map(toolCallId)) });
      } catch {
        return null;
      }
    },
    buildFallback(calls: any[]) {
      return buildAssistantProgressFallback(calls, { target: input.target || input.scopeId, goal: input.goal || "" });
    },
  };
}

export function runAgentKeyProgressSelfTest() {
  const coordinator = createAgentKeyProgressCoordinator({
    scope: "project",
    scopeId: "selftest-project",
    exactSessionId: "selftest-session",
    turnId: "selftest-turn",
    target: "selftest-project",
    goal: "Inspect the configured endpoint",
    config: {},
  });
  const singleTool = coordinator.shouldSummarize(0, [{ name: "read_file" }]);
  const multiTool = coordinator.shouldSummarize(0, [{ name: "read_file" }, { name: "grep_text" }]);
  const secondRound = coordinator.shouldSummarize(1, [{ name: "read_file" }]);
  const fallback = coordinator.buildFallback([{ name: "read_file" }, { name: "grep_text" }]);
  return {
    schema: CCM_AGENT_KEY_PROGRESS_SCHEMA,
    singleTool,
    multiTool,
    secondRound,
    fallback,
    passed: singleTool === false && multiTool === true && secondRound === true && !!fallback,
  };
}
