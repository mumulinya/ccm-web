import * as crypto from "crypto";
import {
  appendUserVisibleAgentEvent,
  publishEphemeralUserVisibleAgentEvent,
} from "./user-visible-agent-events";

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function publishUserVisibleAssistantText(input: {
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  generation?: number;
  taskId?: string;
  turnId?: string;
  text: string;
  title?: string;
}) {
  const text = String(input.text || "");
  if (!text || !input.scopeId || !input.exactSessionId) return null;
  try {
    return publishEphemeralUserVisibleAgentEvent({
      eventId: `${input.scope}:assistant-delta:${input.turnId || checksum([input.taskId, text]).slice(0, 20)}`,
      eventType: "assistant_text_delta",
      scope: input.scope,
      scopeId: input.scopeId,
      exactSessionId: input.exactSessionId,
      generation: Math.max(0, Number(input.generation || 0)),
      taskId: input.taskId,
      display: {
        title: input.title || "Agent 回复",
        summary: text,
        status: "running",
      },
      visibility: "default",
    });
  } catch { return null; }
}

export function projectCommittedGroupCompaction(input: {
  groupId: string;
  exactSessionId: string;
  result: any;
  reason?: string;
}) {
  const result = input.result || {};
  if (result.compacted !== true || !input.groupId || !input.exactSessionId) return null;
  const boundary = result.boundary || {};
  const boundaryId = String(boundary.id || checksum([input.groupId, input.exactSessionId, boundary]).slice(0, 24));
  const restoredTokens = Number(
    boundary?.post_compact_restore?.dynamicContextRestoreReceipt?.restoredTokens
      || boundary?.dynamicContextRestoreReceipt?.restoredTokens
      || result?.memory?.compaction?.dynamicContextRestoreReceipt?.restoredTokens
      || 0,
  );
  try { return appendUserVisibleAgentEvent({
    eventId: `group:${input.groupId}:${input.exactSessionId}:compacted:${boundaryId}`,
    eventType: "context_compacted",
    scope: "group",
    scopeId: input.groupId,
    exactSessionId: input.exactSessionId,
    generation: Math.max(0, Number(boundary.boundaryGeneration || boundary.generation || 0)),
    display: {
      title: "上下文已压缩",
      target: "群聊主 Agent",
      summary: restoredTokens > 0 ? `已从权威来源恢复 ${restoredTokens} tokens` : "已保留摘要并继续当前会话",
      status: "success",
      tokenCount: restoredTokens || undefined,
    },
    result: {
      boundaryId,
      boundaryChecksum: checksum(boundary),
      restoredTokens,
      reason: String(input.reason || "automatic"),
      contentStored: false,
    },
    visibility: "transcript",
  }); } catch { return null; }
}
