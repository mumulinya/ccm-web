import {
  lastNativeUserText,
  materializeNativeSessionTranscript,
  shouldMaterializeNativeSessionTranscript,
  splitNativeSystemSegments,
} from "../../agents/native-session-transcript";
import { nativeQueryFamily } from "../../agents/native-query-messages";
import { attachTransientModelBlocks, collectTransientModelBlocks } from "../../system/transient-model-content";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import {
  buildProjectSessionModelContextProjection,
  listProjectSessionExecutionEvents,
  listProjectSessionHistoryMessages,
} from "./project-session-compaction";
import type { LlmChatMessage } from "../collaboration/group-orchestrator-llm-client";
import {
  PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE,
  buildProjectMainSessionGuidance,
} from "../../agents/main-agent-identity";
import { sessionModelReplacementTextMap } from "../../system/session-model-context";

export { PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE, buildProjectMainSessionGuidance };

export function tryBuildProjectNativeMainMessages(input: {
  project: string;
  projectSessionId: string;
  userMessage: string;
  identityRules: string;
  sessionGuidance?: string;
  mcpPolicy?: string;
  metaBlocks?: Array<{ title: string; body: string }>;
  toolResults?: any[];
  config?: any;
}): LlmChatMessage[] | null {
  const project = String(input.project || "").trim();
  const projectSessionId = String(input.projectSessionId || "").trim();
  const config = input.config || loadOrchestratorConfig();
  if (!project || !shouldMaterializeNativeSessionTranscript(config, projectSessionId)) return null;
  let projection: any = null;
  try {
    projection = buildProjectSessionModelContextProjection(project, projectSessionId, {
      currentRequest: input.userMessage,
      persistMicroCompactReceipt: false,
    });
  } catch {
    projection = null;
  }
  const visibleIds = new Set((projection?.visibleMessages || []).map((item: any) => item?.id).filter(Boolean));
  const conversation = listProjectSessionHistoryMessages(project, projectSessionId)
    .filter((item: any) => ["user", "assistant"].includes(String(item?.role || "")))
    .filter((item: any) => !visibleIds.size || visibleIds.has(item.id) || visibleIds.has(item.uuid));
  const history = materializeNativeSessionTranscript({
    family: nativeQueryFamily(config),
    conversation,
    executionEvents: listProjectSessionExecutionEvents(project, projectSessionId),
    canonicalSummary: projection?.canonicalSummary ? projection.summary : null,
    metaBlocks: input.metaBlocks || [],
    currentUserText: String(input.userMessage || "").trim(),
    clearedToolCallIds: projection?.microCompact?.clearedToolCallIds,
    replacedToolResults: sessionModelReplacementTextMap(projection?.contentReplacement),
    persistContext: { scope: "project", sessionId: projectSessionId },
  });
  if (lastNativeUserText(history) !== String(input.userMessage || "").trim()) return null;
  const system = splitNativeSystemSegments({
    identityRules: input.identityRules,
    sessionGuidance: input.sessionGuidance,
    mcpPolicy: input.mcpPolicy,
  });
  return attachTransientModelBlocks([...system, ...history], collectTransientModelBlocks(input.toolResults || []));
}
