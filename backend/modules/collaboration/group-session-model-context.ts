import * as crypto from "crypto";
import { estimateTextTokens } from "../../system/context-budget";
import { calculateSessionMemoryKeepWindow } from "../../system/session-memory-window";
import { estimateGroupMessageTokens } from "./group-compaction-projections";
import { getCompactBoundaryIndex } from "./group-memory-shared";
import { loadGroupMemory } from "./group-memory-storage";
import { getActiveGroupChatSessionId, getGroupMessages } from "./storage";

function modelContextMessageContent(message: any) {
  const value = message?.content ?? message?.message?.content ?? message?.text ?? "";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value || ""); }
}

function renderModelContextMessages(messages: any[]) {
  return (messages || []).map((message: any, index: number) => {
    const id = String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
    const role = String(message?.role || message?.type || "message");
    const actor = role === "user" ? "用户" : String(message?.agent || message?.target || role || "Agent");
    const timestamp = String(message?.timestamp || message?.created_at || message?.createdAt || "");
    return `[#${id}${timestamp ? ` ${timestamp}` : ""}] [${role}:${actor}]\n${modelContextMessageContent(message)}`;
  }).join("\n\n");
}

export function buildExactGroupSessionModelContextProjection(messagesInput: any[], memory: any, options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "");
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_model_context");
  const messages = (Array.isArray(messagesInput) ? messagesInput : [])
    .filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const summarySource = String(memory?.compaction?.summarySource || memory?.compaction?.summary_source || "").toLowerCase();
  const canonicalSummary = ["model", "session-memory", "session_memory"].includes(summarySource)
    && !!memory?.conversationSummary;
  const boundaryIndex = canonicalSummary ? getCompactBoundaryIndex(memory, messages) : -1;
  const recentWindow = canonicalSummary ? calculateSessionMemoryKeepWindow(messages, {
    floorIndex: Math.max(0, boundaryIndex + 1),
    lastSummarizedMessageId: String(
      memory?.sessionMemory?.lastSummarizedMessageId
      || memory?.sessionMemory?.last_summarized_message_id
      || memory?.compaction?.sessionMemoryState?.lastExtractedMessageId
      || "",
    ),
  }) : {
    startIndex: 0,
    preservedTokenCount: messages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0),
    preservedMessageCount: messages.length,
    preservedTextMessageCount: messages.filter((message: any) => modelContextMessageContent(message).trim()).length,
  };
  const visibleMessages = canonicalSummary ? messages.slice(recentWindow.startIndex) : messages;
  const summaryText = canonicalSummary ? JSON.stringify(memory.conversationSummary, null, 2) : "";
  const renderedMessages = renderModelContextMessages(visibleMessages);
  const mode = canonicalSummary ? "canonical_summary_recent_raw" : "precompact_full_raw";
  const rendered = [
    "【当前精确群聊会话连续性】",
    `- scope=${groupId}::${groupSessionId}`,
    `- mode=${mode}`,
    "- raw_transcript_preserved=true；本段不使用本地摘要、固定消息条数或字符截断。",
    canonicalSummary ? `- 正式摘要来源=${summarySource}；boundary_index=${boundaryIndex}` : "- 尚未发生正式模型压缩，以下为当前会话全部模型可见原文。",
    summaryText ? `\n【正式模型摘要】\n${summaryText}` : "",
    `\n【${canonicalSummary ? "压缩后近期完整原文" : "压缩前完整会话原文"} · ${visibleMessages.length}/${messages.length} 条】\n${renderedMessages || "（当前会话暂无文本消息）"}`,
  ].filter(Boolean).join("\n");
  return {
    schema: "ccm-exact-group-session-model-context-v1",
    version: 1,
    groupId,
    groupSessionId,
    mode,
    canonicalSummary,
    summarySource: canonicalSummary ? summarySource : "",
    summaryChecksum: String(memory?.compaction?.summaryChecksum || memory?.compactBoundary?.summaryChecksum || ""),
    boundaryGeneration: Number(memory?.compaction?.boundaryGeneration || memory?.compactBoundary?.generation || 0),
    totalMessageCount: messages.length,
    visibleMessageCount: visibleMessages.length,
    visibleMessageIds: visibleMessages.map((message: any, index: number) => String(message?.id || message?.uuid || message?.messageId || `message-${index}`)),
    visibleMessageTokens: visibleMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0),
    renderedTokens: estimateTextTokens(rendered),
    transcriptChecksum: crypto.createHash("sha256").update(JSON.stringify(messages.map((message: any) => ({ id: message?.id || message?.uuid || "", role: message?.role || "", content: modelContextMessageContent(message) })))).digest("hex"),
    recentWindow,
    rendered,
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

function renderedPayloadText(value: any) {
  if (typeof value === "string") return value;
  return String(value?.renderedPrompt || value?.rendered_prompt || value?.prompt || value?.payload || "");
}

export async function prepareExactGroupSessionRenderedPayload(input: any) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_rendered_payload");
  if (typeof input.renderPayload !== "function") throw new Error("render_payload_required_for_group_context");
  const capacity = input.modelCapacity || input.model_capacity || {};
  const contextWindow = Math.max(32_000, Number(capacity.contextWindow || capacity.context_window || 200_000));
  const reservedOutputTokens = Math.max(0, Number(capacity.reservedOutputTokens || capacity.reserved_output_tokens || 20_000));
  const effectiveContextWindow = Math.max(18_000, Number(capacity.effectiveContextWindow || capacity.effective_context_window || contextWindow - reservedOutputTokens));
  const bufferTokens = Math.max(0, Number(capacity.autoCompactBufferTokens || capacity.auto_compact_buffer_tokens || 13_000));
  const threshold = Math.max(18_000, Math.min(effectiveContextWindow, Number(
    input.autoCompactThreshold || input.auto_compact_threshold || capacity.autoCompactThreshold || effectiveContextWindow - bufferTokens,
  )));
  const buildProjection = typeof input.buildProjection === "function" ? input.buildProjection : buildExactGroupSessionModelContextPacket;
  const runCompaction = typeof input.runCompaction === "function"
    ? input.runCompaction
    : (scopeId: string, options: any) => {
        const memoryContextApi = require("./group-memory-context") as typeof import("./group-memory-context");
        return memoryContextApi.runGroupMemoryAutoCompactionNow(scopeId, options);
      };
  let projection = buildProjection(groupId, { groupSessionId });
  let rendered = await input.renderPayload(projection);
  let payload = renderedPayloadText(rendered);
  let tokens = estimateTextTokens(payload);
  if (tokens < threshold) return { compacted: false, projection, rendered, payload, tokens, threshold, capacity };

  const fixedPayload = payload.includes(projection.rendered) ? payload.replace(projection.rendered, "") : payload;
  const compactResult: any = await runCompaction(groupId, {
    sessionId: groupSessionId,
    reason: String(input.reason || "group_model_final_payload_capacity"),
    config: {
      ...(input.compactionConfig || input.compaction_config || {}),
      memoryCompactionUseModel: true,
      memoryCompactionMode: "model-required",
      modelContextWindow: contextWindow,
      modelMaxOutputTokens: reservedOutputTokens,
      modelAutoCompactTokenLimit: threshold,
      modelVisibleSystemContext: fixedPayload,
    },
  });
  if (compactResult?.success !== true || compactResult?.compacted !== true) {
    throw new Error(`GROUP_RENDERED_PAYLOAD_FORMAL_COMPACTION_FAILED:${compactResult?.error || compactResult?.reason || "formal_compaction_not_committed"}`);
  }
  projection = buildProjection(groupId, { groupSessionId });
  if (projection.canonicalSummary !== true) throw new Error("GROUP_RENDERED_PAYLOAD_FORMAL_COMPACTION_FAILED:canonical_summary_missing");
  rendered = await input.renderPayload(projection);
  payload = renderedPayloadText(rendered);
  tokens = estimateTextTokens(payload);
  if (tokens >= threshold) throw new Error(`GROUP_RENDERED_PAYLOAD_POST_COMPACT_BLOCKED:${tokens}/${threshold}`);
  return { compacted: true, projection, rendered, payload, tokens, threshold, capacity, compactResult };
}

export const buildChildParentSessionContextProjection = buildExactGroupSessionModelContextProjection;
export const buildChildParentSessionContextPacket = buildExactGroupSessionModelContextPacket;
