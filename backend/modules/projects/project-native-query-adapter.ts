import { catalogToNativeTools, nativeControlToolDefinitions, runNativeQueryLoop } from "../../agents/native-query-loop";
import type { NativeToolResult } from "../../agents/native-query-messages";
import { callNativeAgentTurn } from "../collaboration/group-orchestrator-llm-client";
import { createModelActivityController, type ModelActivityPhase } from "../../system/model-activity";
import { appendAssistantProgress, publishEphemeralUserVisibleAgentEvent } from "../../system/user-visible-agent-events";
import { assistantProgressNarrationEnabled, buildAssistantProgressFallback, buildToolBatchOutcomeProgress } from "../../system/assistant-progress";
import { isConversationPlanModeEnabled } from "../../system/conversation-plan-mode-gate";
import type { ProviderToolCall } from "../../system/provider-native-tools";

export async function runProjectMainNativeQueryLoop(input: {
  config: any;
  project: string;
  projectSessionId: string;
  userMessage: string;
  visibleTurnId: string;
  loopBudget: any;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
  onModelActivity?: (activity: any) => void;
  markVisibleFeedback: (at?: number) => void;
  buildMessages: () => any[];
  getToolContext: () => any;
  executeSelectedRequest: (request: any, parallelGroupId?: string, preparedToolCallId?: string) => Promise<any>;
  isReadOnly: (request: any) => boolean;
  captureUsage?: (usage: any) => void;
  planModeEnabled?: boolean;
}): Promise<{
  parsed: any;
  toolResults: any[];
  modelCallCount: number;
  toolRoundCount: number;
  toolCallCount: number;
  noProgressCount: number;
  continuationSegments: number;
  loopStopReason: string;
  modelDurationMs: number;
  toolWallDurationMs: number;
  modelRetryCount: number;
  visibleReplyDeltaEmitted: boolean;
  initialReadFileCount: number;
  initialReadTokens: number;
}> {
  const { config, project, projectSessionId, visibleTurnId, loopBudget } = input;
  const toolResults: any[] = [];
  let modelDurationMs = 0;
  let toolWallDurationMs = 0;
  let modelRetryCount = 0;
  let visibleReplyDeltaEmitted = false;
  let visibleDeltaSequence = 0;
  let firstProviderDeltaAt = 0;
  let initialReadFileCount = 0;
  let initialReadTokens = 0;

  const result = await runNativeQueryLoop({
    config,
    messages: input.buildMessages(),
    tools: [...nativeControlToolDefinitions(), ...catalogToNativeTools(input.getToolContext())],
    scope: "project",
    scopeId: project,
    exactSessionId: projectSessionId,
    signal: input.signal,
    nativeToolReference: true,
    persistContext: { scope: "project", sessionId: projectSessionId },
    loopBudget,
    planModeEnabled: input.planModeEnabled ?? isConversationPlanModeEnabled("project", project, projectSessionId),
    getTools: () => [...nativeControlToolDefinitions(), ...catalogToNativeTools(input.getToolContext())],
    isReadOnly: (call: ProviderToolCall) => {
      if (call.name === "ccm_ask_user" || call.name === "ccm_present_plan") return true;
      return input.isReadOnly({ name: call.name, arguments: call.arguments });
    },
    onDelta: (delta) => {
      if (!String(delta || "").trim()) return;
      visibleReplyDeltaEmitted = true;
      if (!firstProviderDeltaAt) firstProviderDeltaAt = Date.now();
      input.markVisibleFeedback(firstProviderDeltaAt);
      visibleDeltaSequence += 1;
      publishEphemeralUserVisibleAgentEvent({
        eventId: `project-delta:${visibleTurnId}:${visibleDeltaSequence}`,
        scope: "project", scopeId: project, exactSessionId: projectSessionId,
        eventType: "assistant_text_delta",
        display: { title: "项目主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
        detail: { stream: { sequence: visibleDeltaSequence, final: false } },
      });
      input.onDelta?.(delta);
    },
    onUsage: input.captureUsage,
    onRetry: () => { modelRetryCount += 1; },
    onPlanningPhase: ({ phase, evidenceCount = 0, issueCount = 0 }) => {
      const summary = phase === "exploring" ? "正在核对当前项目资料"
        : phase === "drafting" ? `已核对 ${evidenceCount} 项源码证据，正在整理计划`
          : phase === "reviewing" ? "正在复核计划范围和验收标准"
            : phase === "repairing" ? `计划有 ${issueCount} 处需要修正，正在自动校正`
              : phase === "awaiting_user" ? "计划已通过复核，等待确认"
                : "计划复核未通过，需要补充依据";
      publishEphemeralUserVisibleAgentEvent({
        eventId: `project-planning:${visibleTurnId}:${phase}`,
        scope: "project", scopeId: project, exactSessionId: projectSessionId,
        eventType: "planning_progress",
        display: { title: "项目主 Agent", summary, status: phase === "invalidated" ? "failed" : phase === "awaiting_user" ? "completed" : "running" },
        detail: { planning: { phase, evidenceCount, issueCount, contentStored: false } },
      });
      input.markVisibleFeedback();
    },
    onTurn: ({ round, modelCallIndex }) => {
      const activityPhase: ModelActivityPhase = toolResults.length ? "tool_result_review" : round ? "tool_decision" : "understanding";
      const activity = createModelActivityController({
        scope: "project",
        scopeId: project,
        exactSessionId: projectSessionId,
        turnId: visibleTurnId,
        modelCallIndex,
        phase: activityPhase,
        generation: Number(input.getToolContext().scopeIdentity?.generation || 0),
        onActivity: activityValue => {
          if (["waiting", "retrying"].includes(String(activityValue?.state || ""))) input.markVisibleFeedback();
          input.onModelActivity?.(activityValue);
        },
      });
      activity.complete();
    },
    executeTools: async (calls, ctx) => {
      const round = ctx.round;
      const runnableRequests = calls.map(item => ({ name: item.name, arguments: item.arguments || {} }));
      const preparedToolCallIds = calls.map(item => item.id);
      const toolContext = input.getToolContext();
      if (assistantProgressNarrationEnabled(config) && round === 0) {
        const progressText = buildAssistantProgressFallback(runnableRequests, { target: project, goal: input.userMessage });
        if (progressText) {
          appendAssistantProgress({
            scope: "project", scopeId: project, exactSessionId: projectSessionId,
            generation: Number(toolContext.scopeIdentity?.generation || 0),
            turnId: visibleTurnId,
            text: progressText,
            kind: "before_tools",
            modelCallIndex: round + 1,
            relatedToolCallIds: preparedToolCallIds,
            title: "项目主 Agent",
          });
          input.markVisibleFeedback();
        }
      }
      const roundResults: any[] = [];
      for (let index = 0; index < runnableRequests.length;) {
        if (!input.isReadOnly(runnableRequests[index])) {
          const startedAt = Date.now();
          roundResults.push(await input.executeSelectedRequest(runnableRequests[index], "", preparedToolCallIds[index]));
          toolWallDurationMs += Math.max(0, Date.now() - startedAt);
          index += 1;
          continue;
        }
        const readBatch: any[] = [];
        while (index < runnableRequests.length && input.isReadOnly(runnableRequests[index]) && readBatch.length < loopBudget.readOnlyParallelism) {
          readBatch.push(runnableRequests[index]);
          index += 1;
        }
        const parallelGroupId = readBatch.length > 1 ? `project-parallel:${visibleTurnId}:${round}:${index - readBatch.length}` : "";
        const startedAt = Date.now();
        roundResults.push(...await Promise.all(readBatch.map(request => input.executeSelectedRequest(
          request,
          parallelGroupId,
          preparedToolCallIds[runnableRequests.indexOf(request)],
        ))));
        toolWallDurationMs += Math.max(0, Date.now() - startedAt);
      }
      toolResults.push(...roundResults);
      if (round === 0) {
        const initialReads = roundResults.filter(row => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
        initialReadFileCount += initialReads.reduce((count, row) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
        initialReadTokens += initialReads.reduce((count, row) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
      }
      if (assistantProgressNarrationEnabled(config)) {
        const outcomeProgress = buildToolBatchOutcomeProgress(roundResults, { target: project });
        if (outcomeProgress) {
          appendAssistantProgress({
            scope: "project", scopeId: project, exactSessionId: projectSessionId,
            generation: Number(toolContext.scopeIdentity?.generation || 0),
            turnId: visibleTurnId,
            text: outcomeProgress,
            kind: "key_finding",
            modelCallIndex: round + 1,
            relatedToolCallIds: preparedToolCallIds,
            title: "项目主 Agent",
          });
          input.markVisibleFeedback();
        }
      }
      return roundResults.map((row: any, index: number): NativeToolResult => ({
        callId: preparedToolCallIds[index] || calls[index]?.id || `pmtool_${index}`,
        name: String(row.name || calls[index]?.name || "unknown"),
        ok: row.ok !== false,
        output: row.rawOutput ?? row.output ?? row,
        error: row.error,
        reason: row.reason,
      }));
    },
    callTurn: async (callConfig, options) => {
      const startedAt = Date.now();
      try {
        return await callNativeAgentTurn(callConfig, options);
      } finally {
        modelDurationMs += Math.max(0, Date.now() - startedAt);
      }
    },
  });

  return {
    parsed: result.parsed,
    toolResults,
    modelCallCount: result.modelCallCount,
    toolRoundCount: result.toolRoundCount,
    toolCallCount: result.toolCallCount,
    noProgressCount: result.noProgressCount,
    continuationSegments: result.continuationSegments,
    loopStopReason: result.stopReason,
    modelDurationMs,
    toolWallDurationMs,
    modelRetryCount,
    visibleReplyDeltaEmitted,
    initialReadFileCount,
    initialReadTokens,
  };
}
