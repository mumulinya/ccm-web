import { buildUnifiedSessionModelContextProjection, resolveSessionModelMicroCompactPolicy } from "../../system/session-model-context";
import { loadOrchestratorConfig } from "./group-orchestrator-config";
import { getGroupAutoCompactThreshold } from "./group-compaction-strategy";
import { getCompactBoundaryIndex } from "./group-memory-shared";
import { loadGroupMemory } from "./group-memory-storage";
import { getActiveGroupChatSessionId, getGroupMessages } from "./storage";
import { listGroupSessionExecutionEvents } from "./group-session-execution-ledger";

function modelContextMessageContent(message: any) {
  const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value || ""); }
}

export function buildExactGroupSessionModelContextProjection(messagesInput: any[], memory: any, options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_model_context");
  const messages = (Array.isArray(messagesInput) ? messagesInput : [])
    .filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const summarySource = memory?.unifiedSessionSummary ? "model" : String(memory?.compaction?.summarySource || memory?.compaction?.summary_source || "").toLowerCase();
  const canonicalSummary = !!memory?.unifiedSessionSummary || (["model", "session-memory", "session_memory"].includes(summarySource) && !!memory?.conversationSummary);
  const boundaryIndex = memory?.unifiedSessionCompaction
    ? Math.max(-1, Number(memory.unifiedSessionCompaction.summarizedMessageCount || 0) - 1)
    : canonicalSummary ? getCompactBoundaryIndex(memory, messages) : -1;
  const config = loadOrchestratorConfig();
  const unified = buildUnifiedSessionModelContextProjection({
    scope: "group",
    scopeId: `${groupId}::${groupSessionId}`,
    sessionId: groupSessionId,
    messages,
    canonicalSummary: canonicalSummary ? (memory.unifiedSessionSummary || memory.conversationSummary) : null,
    summarySource: canonicalSummary ? summarySource : "",
    summaryChecksum: String(memory?.unifiedSessionCompaction?.summaryChecksum || memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || ""),
    boundaryGeneration: Number(memory?.unifiedSessionCompaction?.boundaryGeneration || memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0),
    summarizedThroughIndex: boundaryIndex,
    lastSummarizedMessageId: String(
      memory?.sessionMemory?.lastSummarizedMessageId
      || memory?.sessionMemory?.last_summarized_message_id
      || memory?.compaction?.sessionMemoryState?.lastExtractedMessageId
      || "",
    ),
    executionEvents: options.executionEvents || options.execution_events || listGroupSessionExecutionEvents(groupId, groupSessionId),
    microCompact: resolveSessionModelMicroCompactPolicy(config, {
      contextTokens: Number(memory?.compaction?.tokenMeasurement?.activeTokens || memory?.compaction?.beforeTokens || 0),
      pressureThresholdTokens: getGroupAutoCompactThreshold(config),
    }),
  });
  return {
    ...unified,
    schema: "ccm-exact-group-session-model-context-v1",
    version: 1,
    groupId,
    groupSessionId,
    totalMessageCount: messages.length,
    visibleMessageCount: unified.visibleMessages.length,
    visibleMessageIds: unified.visibleMessages.filter((message: any) => message?.hidden_execution !== true).map((message: any) => message.id),
  };
}

export function buildExactGroupSessionModelContextPacket(groupId: string, options: any = {}) {
  const id = String(groupId || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || getActiveGroupChatSessionId(id));
  if (!id || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_model_context");
  return buildExactGroupSessionModelContextProjection(
    getGroupMessages(id, groupSessionId),
    loadGroupMemory(id, groupSessionId),
    { groupId: id, groupSessionId },
  );
}

export const buildChildParentSessionContextProjection = buildExactGroupSessionModelContextProjection;
export const buildChildParentSessionContextPacket = buildExactGroupSessionModelContextPacket;
