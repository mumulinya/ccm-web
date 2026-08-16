import * as crypto from "crypto";
import { catalogToNativeTools, nativeControlToolDefinitions, runNativeQueryLoop } from "../../agents/native-query-loop";
import type { NativeToolResult } from "../../agents/native-query-messages";
import { callNativeAgentTurn, type LlmTokenUsage } from "./group-orchestrator-llm-client";
import { createModelActivityController, type ModelActivityPhase } from "../../system/model-activity";
import { appendAssistantProgress, publishEphemeralUserVisibleAgentEvent } from "../../system/user-visible-agent-events";
import { assistantProgressNarrationEnabled, buildAssistantProgressFallback, buildToolBatchOutcomeProgress } from "../../system/assistant-progress";
import { isConversationPlanModeEnabled } from "../../system/conversation-plan-mode-gate";
import { isMainAgentReadOnlyMcpTool } from "../../tools/main-agent-tool-runtime";
import { compactGroupNativeTranscript } from "./group-main-tool-result-compact";
import { appendGroupSessionExecutionEvent } from "./group-session-execution-ledger";
import { getGroupAutoCompactThreshold } from "./group-compaction-strategy";
import { buildModelVisiblePayloadSnapshot, modelVisibleFixedTokens } from "../../system/session-compaction-core";
import { estimateTextTokens } from "../../system/context-budget";
import { recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";
import { shouldUseAnthropic, shouldUseGemini } from "./group-orchestrator-llm-client";

export async function runGroupMainNativeQueryLoop(input: {
  config: any;
  group: any;
  groupSessionId: string;
  planningInput: any;
  loopBudget: any;
  visibleTurnId: string;
  visibleAnchorMessageId: string;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
  onRetry?: (notice: any) => void;
  onModelActivity?: (activity: any) => void;
  markVisibleFeedback: (at?: number) => void;
  buildMessages: (planningInput: any) => any[];
  buildToolContext: (planningInput: any) => any;
  buildContextComponents: (planningInput: any) => any;
  executeRequests: (args: { requests: any[]; toolContext: any; toolCallIds: string[]; toolBatchSize: number; readOnlyParallelism: number; signal?: AbortSignal }) => Promise<any[]>;
  isBuiltinReadOnly: (name: string) => boolean;
}): Promise<{
  parsed: any;
  planningInput: any;
  toolResults: any[];
  modelCallCount: number;
  toolRoundCount: number;
  toolCallCount: number;
  noProgressCount: number;
  continuationSegments: number;
  loopStopReason: string;
  tokenUsage: LlmTokenUsage | null;
  modelDurationMs: number;
  toolWallDurationMs: number;
  modelRetryCount: number;
  retryNotices: any[];
  visibleReplyDeltaEmitted: boolean;
  initialReadFileCount: number;
  initialReadTokens: number;
}> {
  const {
    config, group, groupSessionId, loopBudget, visibleTurnId, visibleAnchorMessageId,
  } = input;
  let planningInput = input.planningInput;
  let toolContext = input.buildToolContext(planningInput);
  const toolResults: any[] = [];
  const retryNotices: any[] = [];
  let tokenUsage: LlmTokenUsage | null = null;
  let modelDurationMs = 0;
  let toolWallDurationMs = 0;
  let modelRetryCount = 0;
  let visibleReplyDeltaEmitted = false;
  let visibleReplyDeltaSequence = 0;
  let firstProviderDeltaAt = 0;
  let initialReadFileCount = 0;
  let initialReadTokens = 0;
  const anthropic = shouldUseAnthropic(config);

  const result = await runNativeQueryLoop({
    config,
    messages: input.buildMessages(planningInput),
    tools: [...nativeControlToolDefinitions(), ...catalogToNativeTools(toolContext)],
    scope: "group",
    scopeId: String(group.id || ""),
    exactSessionId: groupSessionId,
    signal: input.signal,
    nativeToolReference: true,
    loopBudget,
    planModeEnabled: isConversationPlanModeEnabled("group", String(group.id), groupSessionId),
    promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_planning" },
    getTools: () => [...nativeControlToolDefinitions(), ...catalogToNativeTools(toolContext)],
    isReadOnly: (call) => {
      if (["tool_search", "invoke_skill", "ccm_dispatch"].includes(call.name)) return false;
      if (["ccm_ask_user", "ccm_present_plan"].includes(call.name) || input.isBuiltinReadOnly(call.name)) return true;
      const catalog = [...(toolContext?.catalog?.mcp || []), ...(toolContext?.catalog?.loadedMcp || [])];
      const spec = catalog.find((tool: any) => call.name === tool?.canonicalName || call.name === tool?.name);
      return spec ? isMainAgentReadOnlyMcpTool(spec) : false;
    },
    onDelta: (delta) => {
      if (!String(delta || "").trim()) return;
      visibleReplyDeltaEmitted = true;
      if (!firstProviderDeltaAt) firstProviderDeltaAt = Date.now();
      input.markVisibleFeedback(firstProviderDeltaAt);
      visibleReplyDeltaSequence += 1;
      publishEphemeralUserVisibleAgentEvent({
        eventId: `group-delta:${visibleTurnId}:${visibleReplyDeltaSequence}`,
        scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
        ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
        eventType: "assistant_text_delta",
        display: { title: "群聊主 Agent", summary: String(delta || "").slice(0, 500), status: "running" },
        detail: { stream: { sequence: visibleReplyDeltaSequence, final: false } },
      });
      input.onDelta?.(delta);
    },
    onUsage: (usage) => {
      tokenUsage = usage;
      if (!groupSessionId.startsWith("gcs_")) return;
      try {
        const messages = input.buildMessages(planningInput);
        const providerPayload = buildModelVisiblePayloadSnapshot({
          scope: "group",
          sessionId: `${group.id}:${groupSessionId}`,
          system: messages.filter((message: any) => message.role === "system"),
          contextComponents: input.buildContextComponents(planningInput),
          recentMessages: messages.filter((message: any) => message.role !== "system"),
        });
        recordGroupPromptCacheUsage({
          groupId: group.id,
          groupSessionId,
          source: "group_main_native_query",
          provider: anthropic ? "anthropic" : shouldUseGemini(config) ? "gemini" : "openai",
          model: config.model,
          usage,
          estimatedContextTokens: messages.reduce((sum: number, message: any) => sum + estimateTextTokens(String(message?.content || "")), 0),
          estimatedPayloadTokens: providerPayload.totalTokens,
          estimatedFixedTokens: modelVisibleFixedTokens(providerPayload),
          payloadChecksum: providerPayload.payloadChecksum,
          fixedContextChecksum: providerPayload.fixedContextChecksum,
          modelVisiblePayload: providerPayload,
        });
      } catch {}
    },
    onRetry: (notice) => {
      modelRetryCount += 1;
      const publicNotice = {
        attempt: notice.attempt,
        max_attempts: notice.maxAttempts,
        remaining_budget_ms: Math.max(0, (notice.profile === "interactive_first_turn" ? 180_000 : notice.profile === "agent_orchestration" ? 180_000 : 360_000) - notice.elapsedMs),
        profile: notice.profile,
        reason: String(notice.error?.message || notice.error || "模型暂时不可用").slice(0, 240),
      };
      retryNotices.push(publicNotice);
      input.onRetry?.(publicNotice);
    },
    onTurn: ({ round, modelCallIndex }) => {
      const activityPhase: ModelActivityPhase = toolResults.length ? "tool_result_review" : round > 0 ? "tool_decision" : "understanding";
      const activity = createModelActivityController({
        scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
        turnId: visibleTurnId, modelCallIndex, phase: activityPhase,
        anchorMessageId: visibleAnchorMessageId || undefined,
        onActivity: activityValue => {
          if (["waiting", "retrying"].includes(String(activityValue?.state || ""))) input.markVisibleFeedback();
          input.onModelActivity?.(activityValue);
        },
      });
      activity.complete();
    },
    executeTools: async (calls, ctx) => {
      const round = ctx.round;
      const requests = calls.map(item => ({ name: item.name, arguments: item.arguments || {} }));
      const preparedToolCallIds = calls.map(item => item.id || `gmtool_${crypto.randomBytes(8).toString("hex")}`);
      if (assistantProgressNarrationEnabled(config)) {
        const progressText = round === 0 ? buildAssistantProgressFallback(requests, { target: group.name || group.id, goal: String(planningInput.message || "") }) : "";
        if (progressText) {
          appendAssistantProgress({
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
            generation: Number(toolContext.scopeIdentity?.generation || 0),
            turnId: visibleTurnId,
            text: progressText,
            kind: "before_tools",
            modelCallIndex: round + 1,
            relatedToolCallIds: preparedToolCallIds,
            title: "群聊主 Agent",
          });
          input.markVisibleFeedback();
        }
      }
      const toolBatchStartedAt = Date.now();
      for (const call of calls) {
        appendGroupSessionExecutionEvent(String(group.id), groupSessionId, {
          type: "tool_use",
          toolName: call.name,
          toolCallId: call.id,
          runId: visibleTurnId,
          anchorMessageId: visibleAnchorMessageId,
          arguments: call.arguments || {},
        });
      }
      const roundResults = await input.executeRequests({
        requests,
        toolContext,
        toolCallIds: preparedToolCallIds,
        toolBatchSize: loopBudget.toolBatchSize,
        readOnlyParallelism: loopBudget.readOnlyParallelism,
        signal: input.signal,
      });
      toolWallDurationMs += Math.max(0, Date.now() - toolBatchStartedAt);
      toolResults.push(...roundResults);
      if (round === 0) {
        const initialReads = roundResults.filter((row: any) => /^(?:read_file|read_files|glob_files|grep_text)$/i.test(String(row?.name || "")));
        initialReadFileCount += initialReads.reduce((count: number, row: any) => count + Math.max(1, Number(row?.rawOutput?.safeReceipt?.itemCount || row?.rawOutput?.itemCount || 0)), 0);
        initialReadTokens += initialReads.reduce((count: number, row: any) => count + Math.max(0, Number(row?.outputTokens || 0)), 0);
      }
      if (assistantProgressNarrationEnabled(config)) {
        const outcomeProgress = buildToolBatchOutcomeProgress(roundResults, { target: group.name || group.id });
        if (outcomeProgress) {
          appendAssistantProgress({
            scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
            ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
            generation: Number(toolContext.scopeIdentity?.generation || 0),
            turnId: visibleTurnId,
            text: outcomeProgress,
            kind: "key_finding",
            modelCallIndex: round + 1,
            relatedToolCallIds: preparedToolCallIds,
            title: "群聊主 Agent",
          });
          input.markVisibleFeedback();
        }
      }
      const knowledgeResult = [...roundResults].reverse().find((row: any) => row.name === "query_knowledge" && row.ok && row.rawOutput);
      planningInput = {
        ...planningInput,
        mainAgentToolResults: toolResults,
        loadedMainAgentTools: toolContext.loadedToolNames || [],
        ...(knowledgeResult ? { ragContext: knowledgeResult.rawOutput.context || "" } : {}),
      };
      toolContext = input.buildToolContext(planningInput);
      return roundResults.map((row: any, index: number): NativeToolResult => {
        const mapped: NativeToolResult = {
          callId: preparedToolCallIds[index] || calls[index]?.id || `gmtool_${index}`,
          name: String(row.name || calls[index]?.name || "unknown"),
          ok: row.ok !== false,
          output: row.rawOutput ?? row.output ?? row,
          error: row.error,
          reason: row.reason,
        };
        appendGroupSessionExecutionEvent(String(group.id), groupSessionId, {
          type: "tool_result",
          toolName: mapped.name,
          toolCallId: mapped.callId,
          runId: visibleTurnId,
          anchorMessageId: visibleAnchorMessageId,
          status: mapped.ok ? "ok" : "error",
          observation: mapped.output,
          error: mapped.error,
        });
        return mapped;
      });
    },
    compactTranscript: (messages) => {
      const threshold = getGroupAutoCompactThreshold(config);
      const budget = Math.max(4_000, Math.min(40_000, Number(threshold) || 40_000));
      const compacted = compactGroupNativeTranscript(messages, toolResults, budget);
      if (compacted.changed) {
        toolResults.length = 0;
        toolResults.push(...compacted.rows);
      }
      return compacted.messages;
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
    planningInput,
    toolResults,
    modelCallCount: result.modelCallCount,
    toolRoundCount: result.toolRoundCount,
    toolCallCount: result.toolCallCount,
    noProgressCount: result.noProgressCount,
    continuationSegments: result.continuationSegments,
    loopStopReason: result.stopReason,
    tokenUsage: result.usage || tokenUsage,
    modelDurationMs,
    toolWallDurationMs,
    modelRetryCount,
    retryNotices,
    visibleReplyDeltaEmitted,
    initialReadFileCount,
    initialReadTokens,
  };
}
