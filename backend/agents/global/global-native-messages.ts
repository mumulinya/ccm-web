import {
  lastNativeUserText,
  materializeNativeSessionTranscript,
  shouldMaterializeNativeSessionTranscript,
  splitNativeSystemSegments,
} from "../native-session-transcript";
import { nativeQueryFamily } from "../native-query-messages";
import { attachTransientModelBlocks, collectTransientModelBlocks } from "../../system/transient-model-content";
import { loadOrchestratorConfig } from "../../modules/collaboration/group-orchestrator-config";
import { loadGlobalAgentTranscript } from "./memory";
import type { LlmChatMessage } from "../../modules/collaboration/group-orchestrator-llm-client";

export const GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = "精确会话里已有目标、计划和工具观察视为已知；未变化的事实不要重复读取。prior_steps 里已经出现过的观察不要再当新证据。";

export function tryBuildGlobalNativeModelMessages(input: {
  sessionId: string;
  currentUserText: string;
  identityRules: string;
  sessionGuidance?: string;
  mcpPolicy?: string;
  continuation?: any;
  runHistory?: any[];
  metaBlocks?: Array<{ title: string; body: string }>;
  observations?: any[];
  config?: any;
}): LlmChatMessage[] | null {
  const sessionId = String(input.sessionId || "").trim();
  const config = input.config || loadOrchestratorConfig();
  if (!shouldMaterializeNativeSessionTranscript(config, sessionId)) return null;
  const transcript = loadGlobalAgentTranscript(sessionId);
  const visible = Array.isArray(input.continuation?.visibleMessages)
    ? input.continuation.visibleMessages
    : Array.isArray(input.continuation?.messages)
      ? input.continuation.messages
      : transcript.messages;
  const conversation = (Array.isArray(visible) ? visible : [])
    .filter((item: any) => ["user", "assistant"].includes(String(item?.role || "")))
    .filter((item: any) => item?.hidden_execution !== true);
  const extraHistory = (Array.isArray(input.runHistory) ? input.runHistory : [])
    .filter((item: any) => ["user", "assistant"].includes(String(item?.role || "")));
  const history = materializeNativeSessionTranscript({
    family: nativeQueryFamily(config),
    conversation: conversation.length ? conversation : extraHistory,
    executionEvents: transcript.executionMessages || [],
    canonicalSummary: input.continuation?.summary || null,
    metaBlocks: input.metaBlocks || [],
    currentUserText: String(input.currentUserText || "").trim(),
  });
  if (lastNativeUserText(history) !== String(input.currentUserText || "").trim()) return null;
  const system = splitNativeSystemSegments({
    identityRules: input.identityRules,
    sessionGuidance: input.sessionGuidance,
    mcpPolicy: input.mcpPolicy,
  });
  return attachTransientModelBlocks([...system, ...history], collectTransientModelBlocks(input.observations || []));
}
