import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { getConfigInfo, getConfigs, recordMetric } from "../../core/db";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import {
  buildWorkerContextPacket,
  compactWorkerContextMemoryForRetry,
  refreshWorkerContextPacketUsage,
  renderWorkerContextPacket,
} from "../../agents/runtime-kernel";
import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  extractJsonObject,
  shouldUseAnthropic,
  shouldUseGemini,
  type LlmTokenUsage,
} from "./group-orchestrator-llm-client";
import {
  getCollectedOutputAgent,
  parseTaskNotificationsFromText,
} from "./agent-notifications";
import {
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext,
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth,
  buildGroupTypedMemoryPressureRecallUsageProjectSummary,
  buildGroupTypedMemoryPressureRecallUsageSummary,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory,
  distillPressureProvenancePreDispatchComplianceToTypedMemory,
  distillProviderDispatchOverrideFollowupToTypedMemory,
  distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
  distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory,
  distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory,
  distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory,
  distillProviderSwitchExecutionToTypedMemory,
  distillProviderReproofReceiptConsumptionToTypedMemory,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  readGlobalProviderDispatchReliabilitySnapshot,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryPressureRecallUsageLedgerFile,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import { estimateTextTokens } from "../../system/context-budget";
import { resolveAgentLoopBudget, shouldContinueAgentLoop } from "../../system/agent-loop-budget";
import { appendAssistantProgress, appendToolProjection, appendUserVisibleAgentEvent, appendUserVisibleRequirementPlan, buildUserVisibleAgentResult, publishEphemeralUserVisibleAgentEvent } from "../../system/user-visible-agent-events";
import { assistantProgressNarrationEnabled, buildAssistantProgressFallback, buildToolBatchOutcomeProgress, sanitizeAssistantProgressText, validateAssistantProgressKind } from "../../system/assistant-progress";
import { createModelActivityController, createSafeJsonReplyDeltaExtractor, type ModelActivityPhase } from "../../system/model-activity";
import { readSlashCommandSessionState, renderSlashCommandSessionDirective } from "../../system/slash-command-session-state";
import {
  applyConversationPlanModeHold,
  applyConversationPlanModeToRound,
  applyInteractiveConversationModePolicy,
  isConversationPlanModeEnabled,
} from "../../system/conversation-plan-mode-gate";
import { publishUserVisibleAssistantText } from "../../system/user-visible-agent-projections";
import { buildModelVisiblePayloadSnapshot, modelVisibleFixedTokens } from "../../system/session-compaction-core";
import { selectUserMcpToolDefinitions } from "../../system/session-context-tool-buckets";
import { attachTransientModelBlocks, collectTransientModelBlocks } from "../../system/transient-model-content";
import { buildRoleSkillPrompt } from "../../skills/role-skills";
import type { ToolScope } from "../../tools/tool-manager";
import {
  buildMainAgentToolRuntimeContext,
  buildMainAgentLoadedContextItems,
  executeMainAgentToolRequests,
  isMainAgentReadOnlyMcpTool,
  normalizeMainAgentToolRequests,
  renderMainAgentToolCatalogLine,
  type MainAgentToolRequest,
} from "../../tools/main-agent-tool-runtime";
import { shouldUseNativeQueryLoop } from "../../agents/native-query-loop";
import { CC_ALIGNED_TOOL_RESULT_MAX_TOKENS, GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR, MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR } from "../../tools/cc-tool-result-limits";
import { compactGroupMainToolResultsForPayload } from "./group-main-tool-result-compact";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "./group-compaction-strategy";
import { resolveMainAgentContextPolicy } from "../../tools/main-agent-context-policy";
import {
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";
import { createMainAgentTurnReceipt, normalizeMainAgentTurnDecision } from "../../agents/main-agent-turn";
import { buildInternalPromptBindings } from "../../agents/internal-prompt-contract";
import { runGroupMainNativeQueryLoop } from "./group-native-query-adapter";
import { buildGroupMainIdentityRules, buildGroupMainSessionGuidance } from "../../agents/main-agent-identity";
import { searchAgentKnowledge } from "../knowledge/knowledge-access";
import {
  normalizeTestAgentAcceptanceEvidencePlan,
  normalizeTestAgentVerificationProfile,
} from "./test-agent-review-policy";
import {
  claimGroupReactiveCompactRetry,
  completeGroupReactiveCompactRetry,
} from "./group-reactive-compact-retry-ownership";
import { recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";
import {
  COORDINATOR_PROJECT,
  DEFAULT_GROUP_ORCHESTRATOR,
  CCM_DIR,
  loadOrchestratorConfig,
  buildGroupMainAgentBoundary,
} from "./group-orchestrator-config";
import { AUTO_REWORK_MAX_ROUNDS } from "./rework-policy";

import {
  buildCoordinatorPlan,
  buildVisibleAssignmentLine,
  getCoordinatorMember,
  getLlmConfigIssue,
  getRoutableMembers,
  inferCoordinatorStrategy,
  normalizeGroupOrchestrator,
} from "./group-orchestrator-routing";
import {
  buildCoordinatorFollowUpSummary,
  compactText,
  normalizeCoordinatorFollowUpTask,
  sanitizeCoordinatorUserList,
  sanitizeCoordinatorUserText,
} from "./group-orchestrator-prompts";
import {
  applySynthesizedCoordinatorReply,
  coordinatorShouldFailEmptyVisibleReply,
  coordinatorUsableReply,
  coordinatorVisibleFallbackContent,
  shouldSynthesizeCoordinatorVisibleReply,
} from "./group-coordinator-visible-reply";
import {
  COORDINATOR_PRESENTED_PLAN_HEADLINE,
  attachConfirmedPlanSlicesToDispatchTargets,
  hasPresentedGroupPlan,
  latestPresentedPlanFromGroupSession,
  publishGroupPresentedRequirementPlan,
} from "./group-presented-plan";
import {
  extractPriorGroupPlanDraft,
  formatPriorGroupPlanBlock,
} from "./group-prior-plan-context";
import { tryBuildGroupNativeCoordinatorMessages } from "./group-coordinator-native-messages";
import {
  buildAllowedProjectBrief,
  buildAssignmentsFromTargets,
  buildCoordinatorPlanText,
  buildSelfContainedWorkerTask,
  mergeDocumentFindings,
  normalizeDispatchPolicy,
} from "./group-orchestrator-coded";





export function mergeLlmTokenUsage(...values: any[]): LlmTokenUsage | null {
  const usages = values.filter(value => value && typeof value === "object");
  if (!usages.length) return null;
  const inputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.inputTokens || value.input_tokens || 0) || 0)), 0);
  const outputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.outputTokens || value.output_tokens || 0) || 0)), 0);
  if (inputTokens <= 0 && outputTokens <= 0) return null;
  const directInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.directInputTokens || value.direct_input_tokens || 0) || 0)), 0);
  const cacheCreationInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.cacheCreationInputTokens || value.cache_creation_input_tokens || 0) || 0)), 0);
  const cacheReadInputTokens = usages.reduce((total, value) => total + Math.max(0, Math.floor(Number(value.cacheReadInputTokens || value.cache_read_input_tokens || 0) || 0)), 0);
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, reported: true, directInputTokens, cacheCreationInputTokens, cacheReadInputTokens };
}

export type GroupMainToolRequest = MainAgentToolRequest;

const GROUP_MAIN_BUILTIN_TOOLS = [
  {
    canonicalName: "query_knowledge",
    name: "query_knowledge",
    server: "ccm-group-readonly",
    description: "Query the knowledge base within the current group and member project authorization scope.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
  },
] as const;

export function isGroupMainReadOnlyMcpTool(tool: any) {
  return isMainAgentReadOnlyMcpTool(tool);
}

export function buildGroupMainAgentToolContext(input: {
  group: any;
  message: string;
  source?: string;
  groupSessionId?: string;
  group_session_id?: string;
  workflowDecision?: WorkflowDecision | null;
  loadedMainAgentTools?: string[];
  anchorMessageId?: string;
  anchor_message_id?: string;
}): any {
  const group = normalizeGroupOrchestrator(input.group);
  const orchestratorConfig = loadOrchestratorConfig();
  const contextPolicy = resolveMainAgentContextPolicy(orchestratorConfig, group?.context_policy || group?.contextPolicy || {});
  const selectedRoleSkills = buildRoleSkillPrompt("group-main-agent", input.message, {
    source: input.source || "",
    phase: "planning",
    selectedSkillNames: input.workflowDecision?.selectedSkills || [],
    modelDecision: input.workflowDecision || null,
    planAuthoring: isConversationPlanModeEnabled("group", String(group?.id || ""), String(input.groupSessionId || input.group_session_id || "")),
  });
  const shared = buildMainAgentToolRuntimeContext({
    configuredTools: group?.tools || {},
    executionSkills: selectedRoleSkills.names,
    mcpPolicy: "read_only",
    label: "群聊主 Agent",
    auditContext: {
      runtime: "group-main-agent",
      project: getCoordinatorMember(group)?.project || "",
      groupId: String(group?.id || ""),
      source: String(input.source || "group-main-planning"),
    },
    scopeIdentity: {
      scope: "group",
      scopeId: String(group?.id || ""),
      exactSessionId: String(input.groupSessionId || input.group_session_id || `group-main:${group?.id || "unknown"}`),
      allowedProjects: getRoutableMembers(group).map((member: any) => String(member?.project || "")).filter(Boolean),
    },
    loadedToolNames: input.loadedMainAgentTools || [],
    contextPolicy: contextPolicy.effective,
    contextWindow: resolveGroupModelContextCapacity(orchestratorConfig).contextWindow,
    currentUserInput: input.message,
    schemaSurface: shouldUseNativeQueryLoop(orchestratorConfig) ? "native" : "prompt",
  });
  const schemaSurface = shared.schemaSurface === "native" ? "native" : "prompt";
  const builtinNames = new Set(GROUP_MAIN_BUILTIN_TOOLS.map(tool => tool.canonicalName));
  const mcp = [
    ...GROUP_MAIN_BUILTIN_TOOLS,
    ...shared.catalog.mcp.filter((tool: any) => !builtinNames.has(String(tool?.canonicalName || "") as any)),
  ];
  const loadedMcp = [
    ...GROUP_MAIN_BUILTIN_TOOLS,
    ...(shared.catalog.loadedMcp || []).filter((tool: any) => !builtinNames.has(String(tool?.canonicalName || "") as any)),
  ];
  const builtinPrompt = [
    "Built-in read-only tools for the group main Agent:",
    ...GROUP_MAIN_BUILTIN_TOOLS.map(tool => renderMainAgentToolCatalogLine(tool, schemaSurface)),
  ].join("\n");
  return {
    ...shared,
    catalog: { ...shared.catalog, mcp, loadedMcp },
    mcpPrompt: [builtinPrompt, shared.mcpPrompt].filter(Boolean).join("\n\n"),
    policyPrompt: [builtinPrompt, shared.policyPrompt].filter(Boolean).join("\n\n"),
    group,
    message: input.message,
    groupSessionId: input.groupSessionId || input.group_session_id || "",
    anchorMessageId: input.anchorMessageId || input.anchor_message_id || "",
    selectedRoleSkills,
    contextPolicy,
    contextBudget: shared.contextBudget,
  };
}

export function normalizeGroupMainToolRequests(value: any): GroupMainToolRequest[] {
  return normalizeMainAgentToolRequests(value);
}

export async function executeGroupMainAgentToolRequests(input: {
  requests: GroupMainToolRequest[];
  toolContext: any;
  toolCallIds?: string[];
  executeToolCall?: (name: string, args: any, scope?: ToolScope) => Promise<string>;
  toolBatchSize?: number;
  readOnlyParallelism?: number;
  signal?: AbortSignal;
}) {
  const batchSize = Math.max(1, Math.min(8, Math.floor(Number(input.toolBatchSize || 2))));
  const readOnlyParallelism = Math.max(1, Math.min(8, Math.floor(Number(input.readOnlyParallelism || 2))));
  // Preserve every logical request from the model turn. `batchSize` controls
  // concurrency only; truncating here made the third project invisible when a
  // group contained more projects than the default batch size.
  const requests = input.requests.slice(0, 32);
  const preparedIds = new Map(requests.map((request, index) => [request, String(input.toolCallIds?.[index] || "")]));
  const executeOne = async (request: GroupMainToolRequest, parallelGroupId = "") => {
    const groupId = String(input.toolContext?.group?.id || "");
    const exactSessionId = String(input.toolContext?.groupSessionId || input.toolContext?.group_session_id || "");
    const generation = Math.max(0, Number(input.toolContext?.scopeIdentity?.generation || 0));
    const anchorMessageId = String(input.toolContext?.anchorMessageId || input.toolContext?.anchor_message_id || "").trim();
    const toolCallId = preparedIds.get(request) || `gmtool_${crypto.createHash("sha256").update(JSON.stringify({ groupId, exactSessionId, name: request.name, arguments: request.arguments, at: Date.now(), nonce: crypto.randomBytes(4).toString("hex") })).digest("hex").slice(0, 24)}`;
    const startedAt = Date.now();
    if (groupId && exactSessionId) appendToolProjection({
      scope: "group", scopeId: groupId, exactSessionId, generation,
      ...(anchorMessageId ? { anchorMessageId } : {}),
      eventType: "tool_started", toolName: request.name, toolCallId,
      arguments: request.arguments || {}, parallelGroupId: parallelGroupId || undefined,
      display: { summary: request.reason || "正在执行" },
    });
    const isBuiltin = GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === request.name);
    let row: any;
    if (!isBuiltin) {
      try {
        const rows = await executeMainAgentToolRequests({
          ...input,
          requests: [request],
          resultTokenLimit: CC_ALIGNED_TOOL_RESULT_MAX_TOKENS,
          toolBatchSize: 1,
          readOnlyParallelism,
          abortSignal: input.signal,
        });
        row = rows[0];
      } catch (error: any) {
        row = { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: String(error?.message || error).slice(0, 1000), reason: request.reason };
      }
    } else {
      try {
        let rawOutput: any;
        if (request.name === "query_knowledge") {
          const projects = getRoutableMembers(input.toolContext.group).map((member: any) => ({ name: String(member?.project || "") })).filter((item: any) => item.name);
          rawOutput = await searchAgentKnowledge(String(request.arguments?.query || input.toolContext.message || ""), {
            role: "group-main-agent",
            groupId: String(input.toolContext.group?.id || ""),
            projects,
          }, { limit: 6, continuityIdentity: { agentKind: "group", scope: "group", scopeId: String(input.toolContext.group?.id || ""), exactSessionId: String(input.toolContext.groupSessionId || ""), generation: Number(input.toolContext.scopeIdentity?.generation || 0) } });
        } else throw new Error(`未知群聊内置工具：${request.name}`);
        const modelOutput = { context: rawOutput.context, citations: rawOutput.citations, retrievalMode: rawOutput.embeddingMode, indexGeneration: rawOutput.indexGeneration };
        const output = JSON.stringify(modelOutput);
        const outputTokens = estimateTextTokens(output);
        row = outputTokens > CC_ALIGNED_TOOL_RESULT_MAX_TOKENS
          ? { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR, outputTokens, reason: request.reason }
          : { name: request.name, itemName: request.name, toolKind: "internal_mcp", source: "ccm__knowledge_context", scope: "group", loaded: true, durationMs: Date.now() - startedAt, ok: true, output, rawOutput, outputTokens, resultChecksum: crypto.createHash("sha256").update(output).digest("hex"), reason: request.reason };
      } catch (error: any) {
        row = { name: request.name, itemName: request.name, toolKind: "mcp", ok: false, error: String(error?.message || error).slice(0, 1000), reason: request.reason };
      }
    }
    if (groupId && exactSessionId) appendToolProjection({
      scope: "group", scopeId: groupId, exactSessionId, generation,
      ...(anchorMessageId ? { anchorMessageId } : {}),
      eventType: row?.ok === false ? "tool_failed" : "tool_completed",
      toolName: request.name, toolCallId, arguments: request.arguments || {},
      result: row, error: row?.ok === false ? row?.error || "工具执行失败" : "",
      durationMs: Number(row?.durationMs || Date.now() - startedAt), outputTokens: Number(row?.outputTokens || 0),
      parallelGroupId: parallelGroupId || undefined,
      display: { summary: row?.ok === false ? row?.error || "工具执行失败" : "执行完成" },
    });
    return { ...row, toolCallId };
  };
  const isSafeReadOnly = (request: GroupMainToolRequest) => {
    if (GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === request.name)) return true;
    if (["tool_search", "invoke_skill"].includes(request.name)) return false;
    const catalog = [
      ...(input.toolContext?.catalog?.mcp || []),
      ...(input.toolContext?.catalog?.loadedMcp || []),
    ];
    return isMainAgentReadOnlyMcpTool(catalog.find((tool: any) => request.name === tool?.canonicalName || request.name === tool?.name));
  };
  const rows: any[] = [];
  for (let index = 0; index < requests.length;) {
    if (!isSafeReadOnly(requests[index])) {
      rows.push(await executeOne(requests[index]));
      index += 1;
      continue;
    }
    const readBatch: GroupMainToolRequest[] = [];
    while (index < requests.length && isSafeReadOnly(requests[index]) && readBatch.length < Math.min(readOnlyParallelism, batchSize)) {
      readBatch.push(requests[index]);
      index += 1;
    }
    const parallelGroupId = readBatch.length > 1
      ? `group-parallel:${String(input.toolContext?.groupSessionId || input.toolContext?.group_session_id || "session")}:${Date.now()}:${index - readBatch.length}`
      : "";
    rows.push(...await Promise.all(readBatch.map(request => executeOne(request, parallelGroupId))));
  }
  return rows.map(row => row.error === "MAIN_AGENT_TOOL_NOT_AUTHORIZED"
    ? { ...row, error: "GROUP_MAIN_TOOL_NOT_AUTHORIZED" }
    : row.error === "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED"
      ? { ...row, error: "GROUP_MAIN_TOOL_SCHEMA_NOT_LOADED" }
    : row.error === MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR || row.error === "MAIN_AGENT_TOOL_RESULT_EXCEEDS_8K_TOKEN_BUDGET"
      ? { ...row, error: GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR }
      : row);
}





export function attachLlmTokenUsage(error: any, usage: LlmTokenUsage | null) {
  if (error && usage) error.usage = mergeLlmTokenUsage(error.usage, usage);
  return error;
}





// 优化2：LLM 驱动的智能汇总
export async function runLlmCoordinatorSummary(group: any, userMessage: string, outputs: string[], options: any = {}) {
  const config = loadOrchestratorConfig();
  const configIssue = getLlmConfigIssue(config);
  if (configIssue) return null; // 配置不完整时回退到模板汇总

  const coordinator = getCoordinatorMember(group);
  const validOutputs = (outputs || []).filter(Boolean);
  if (validOutputs.length === 0) return null;
  const startedAt = Date.now();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const anthropic = shouldUseAnthropic(config);
  let tokenUsage: LlmTokenUsage | null = null;
  const captureTokenUsage = (usage: LlmTokenUsage) => {
    tokenUsage = mergeLlmTokenUsage(tokenUsage, usage);
    if (groupSessionId.startsWith("gcs_")) {
      try { recordGroupPromptCacheUsage({ groupId: group.id, groupSessionId, source: "group_main_summary", provider: anthropic ? "anthropic" : shouldUseGemini(config) ? "gemini" : "openai", model: config.model, usage }); } catch {}
    }
  };

  const childReplies = validOutputs.map((text, i) => `--- child Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2000)}`).join("\n\n");

  const roleSkills = buildRoleSkillPrompt("group-main-agent", userMessage, { forceWork: true, phase: "summary" });
  const system = `You are the CCM group main Agent and coordinator. Child Agents replied to the user request through internal task notifications. Produce a concise user-facing synthesis.

Requirements:
1. Extract each child Agent's core conclusions and summarize each in one to three sentences.
2. Call out conflicts or inconsistencies between child Agents.
3. Give next actions or decisions the user must make.
4. Do not repeat every child reply; summarize only.
5. Use a natural, friendly team-lead tone.
6. Internal markers such as <task-notification>, CCM_AGENT_RECEIPT, trace, session, and scratchpad must never appear in user-visible text. Rewrite them as understandable terms such as child-Agent result, structured result, verification evidence, or technical details.

Return synthesis text only, not JSON. Use the user's conversation language. Do not reveal hidden reasoning or raw tool output.${roleSkills.prompt ? `\n\n${roleSkills.prompt}` : ""}`;

  const user = `Original user request: ${String(userMessage).slice(0, 500)}\n\nChild-Agent task notifications / replies:\n${childReplies}\n\nReturn the synthesis.`;

  try {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const content = anthropic
      ? await callAnthropicCompatibleChat(config, { messages, system, maxTokens: 1000, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage })
      : await callOpenAiCompatibleChat(config, { messages, temperature: 0.3, defaultTimeoutMs: 30000, retryProfile: "background_auxiliary", promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_summary" }, onUsage: captureTokenUsage });

    const summary = sanitizeCoordinatorUserText(content, "主 Agent 已收到子 Agent 的结果，正在整理下一步。", 1200);
    if (!summary.trim()) {
      recordMetric(coordinator.project, { success: false, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage, error: "主 Agent 汇总返回空内容" });
      return null;
    }
    recordMetric(coordinator.project, { success: true, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage });
    return {
      agent: coordinator.project,
      content: `📋 **协调汇总**\n\n${summary}`,
    };
  } catch (err: any) {
    console.error("[LLM汇总] 调用失败:", err.message);
    recordMetric(coordinator.project, { success: false, durationMs: Date.now() - startedAt, scopeType: "group", groupId: group.id, role: "main_agent", source: "coordinator-summary", runtime: "llm-api", usage: tokenUsage, error: err?.message || String(err) });
    return null; // 回退到模板汇总
  }
}





export async function runLlmCoordinatorReview(
  group: any,
  userMessage: string,
  coordinatorPlan: string,
  outputs: string[],
  options: { allowFollowUps?: boolean; round?: number; maxRounds?: number; requiresCodeChanges?: boolean; requiresVerification?: boolean; traceId?: string; taskId?: string; executionId?: string; groupSessionId?: string; group_session_id?: string } = {}
) {
  const config = loadOrchestratorConfig();
  const configIssue = getLlmConfigIssue(config);
  if (configIssue) return null;

  const normalized = normalizeGroupOrchestrator(group);
  const coordinator = getCoordinatorMember(normalized);
  const allowed = new Map(getRoutableMembers(normalized).map((m: any) => [m.project, m]));
  const validOutputs = (outputs || []).filter(Boolean);
  if (validOutputs.length === 0) return null;
  const startedAt = Date.now();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const anthropic = shouldUseAnthropic(config);
  let tokenUsage: LlmTokenUsage | null = null;
  const captureTokenUsage = (usage: LlmTokenUsage) => {
    tokenUsage = mergeLlmTokenUsage(tokenUsage, usage);
    if (groupSessionId.startsWith("gcs_")) {
      try { recordGroupPromptCacheUsage({ groupId: group.id, groupSessionId, source: "group_main_review", provider: anthropic ? "anthropic" : shouldUseGemini(config) ? "gemini" : "openai", model: config.model, usage }); } catch {}
    }
  };

  const allowFollowUps = options.allowFollowUps !== false;
  const round = Math.max(1, Number(options.round || 1));
  const maxRounds = Math.max(round, Number(options.maxRounds || AUTO_REWORK_MAX_ROUNDS));
  const requiresCodeChanges = options.requiresCodeChanges !== false;
  const requiresVerification = options.requiresVerification !== false;
  const childReplies = validOutputs
    .map((text, i) => `--- child Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2400)}`)
    .join("\n\n");

  const roleSkills = buildRoleSkillPrompt("group-main-agent", userMessage, { forceWork: true, phase: "review" });
  const system = `You are the CCM group main Agent and work coordinator. The user request has been dispatched to project Agents. Review their replies as a project owner.

This is acceptance round ${round}/${maxRounds}. ${allowFollowUps ? "You may dispatch self-contained rework follow-ups when evidence is insufficient." : "Do not dispatch more rework in this round; return a final conclusion or one concrete user question."}${roleSkills.prompt ? `\n\n${roleSkills.prompt}` : ""}

Latest gates for this task (these override stale conversation requirements):
- Code/file changes required: ${requiresCodeChanges ? "yes" : "no; an empty filesChanged value is not a gap by itself"}
- Project verification command required: ${requiresVerification ? "yes" : "no; do not require npm test/build when this gate is disabled"}

You are not the code execution Agent. Do not edit code and do not claim unsupported completion. Use the injected review and rework Skills to judge completion, conflicts, gaps, and next actions.
- Put self-contained rework work orders only in followUps. When evidence is sufficient, return the final coordination verdict. When user input is needed, ask one concrete question.
- User-visible summary, gaps, conflicts, checks.detail/evidence, and userQuestion must not contain internal markers such as <task-notification>, CCM_AGENT_RECEIPT, trace, session, or scratchpad. Rewrite them as child-Agent results, structured result details, verification evidence, or technical details.

Acceptance gates:
- Inspect each Worker's task notification: task-id identifies the Worker; status may be completed, failed, blocked, partial, or missing_receipt; receipt-status identifies the structured receipt state; result is the Worker summary.
- Inspect the structured receipt summary at the end of each child-Agent reply.
- A dispatched Agent without a structured receipt, with a receipt status other than done, or without actual action and verification evidence is normally not complete.
- ${requiresCodeChanges ? "For code-change work, require changed files or an explicit statement that no files changed; otherwise add a gap." : "This task permits no file changes; verify only the agreed deliverables."}
- ${requiresVerification ? "Require actual verification evidence matching the task." : "The mandatory verification gate is disabled; do not demand project test commands."}
- Dependent work must cite or absorb the preceding Agent's conclusion; otherwise report an unclosed dependency.
- For API, business, requirement, or PRD-driven work, verify that assigned contracts, fields, business rules, UI behavior, and acceptance criteria are covered by implementation or evidence.
- Do not treat suggestions, proposed changes, or recommendations as completed work.

Return one JSON object only. Do not output Markdown or explanations.

Allowed project Agents:
${buildAllowedProjectBrief(normalized) || "- none"}

JSON shape:
{
  "schema_version": 1,
  "status": "complete | needs_followup | needs_user",
  "verdict": "pass | blocked | needs_user",
  "decision": { "can_complete": true, "reason": "why completion is or is not allowed" },
  "summary": "User-facing final or interim coordination conclusion in the conversation language, including confirmed conclusions, completed/uncompleted work, risks, and verification advice",
  "checks": [
    { "id": "worker_receipt | actual_changes | verification | dependency | user_scope", "label": "check label", "status": "pass | fail | warn", "detail": "check conclusion", "evidence": ["evidence"] }
  ],
  "worker_reviews": [
    { "project": "project Agent name", "receipt_status": "done | partial | blocked | failed | missing", "trusted": true, "completed_scope": ["completed scope"], "gaps": ["gap"], "verification": ["verification evidence"] }
  ],
  "gaps": ["missing information or evidence"],
  "conflicts": ["conflict or inconsistency between child Agents"],
  "followUps": [
    {
      "project": "must be an allowed project Agent name",
      "summary": "five to ten word follow-up preview for the user and task card",
      "task": "specific self-contained follow-up work including missing evidence, changes, or verification",
      "reason": "why the follow-up is needed"
    }
  ],
  "userQuestion": "One concrete question if user input is required; otherwise an empty string",
  "confidence": 0.0
}`;

  const user = `Original user request:
${String(userMessage || "").slice(0, 1200)}

Initial main-Agent assignment:
${String(coordinatorPlan || "").slice(0, 1600)}

Child-Agent task notifications / replies:
${childReplies}

May the coordinator ask child Agents follow-up questions: ${allowFollowUps ? "yes" : "no; return a final conclusion or one user question in this round"}

Return JSON.`;

  try {
    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const content = anthropic
      ? await callAnthropicCompatibleChat(config, { messages, system, maxTokens: 1400, temperature: 0.2, defaultTimeoutMs: 30000, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage })
      : await callOpenAiCompatibleChat(config, { messages, temperature: 0.2, defaultTimeoutMs: 30000, promptCacheTracking: { groupId: group.id, groupSessionId, source: "group_main_review" }, onUsage: captureTokenUsage });

    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error("主 Agent 复盘未返回有效 JSON");

    const followUpContext = {
      gaps: parsed.gaps,
      conflicts: parsed.conflicts,
      checks: parsed.checks,
      workerReviews: parsed.worker_reviews || parsed.workerReviews,
    };
    const followUps = allowFollowUps && Array.isArray(parsed.followUps)
      ? parsed.followUps
          .map((item: any) => {
            const project = String(item?.project || "").trim();
            if (!allowed.has(project)) return null;
            const task = String(item?.task || "").trim();
            if (!task) return null;
            const reason = String(item?.reason || "").trim();
            const summary = buildCoordinatorFollowUpSummary(item, task, reason, project);
            const normalizedTask = normalizeCoordinatorFollowUpTask(item, task, reason, project, followUpContext);
            return {
              mention: `@${project}`,
              targetName: project,
              message: normalizedTask.message,
              reason,
              summary,
              quality: normalizedTask.quality,
            };
          })
          .filter(Boolean)
      : [];

    const status = followUps.length > 0 ? "needs_followup" : String(parsed.status || "complete");
    const summary = sanitizeCoordinatorUserText(parsed.summary, "主 Agent 已完成阶段复盘，正在根据结果判断是否需要继续处理。", 1200);
    const gaps = sanitizeCoordinatorUserList(parsed.gaps, "仍有子 Agent 结果说明或验证证据需要补齐。", 360, 20);
    const conflicts = sanitizeCoordinatorUserList(parsed.conflicts, "子 Agent 之间存在需要主 Agent 复核的不一致结论。", 360, 20);
    const userQuestion = sanitizeCoordinatorUserText(parsed.userQuestion, "", 360);
    const checks = Array.isArray(parsed.checks) ? parsed.checks.map((item: any) => ({
      id: String(item?.id || "").trim(),
      label: String(item?.label || item?.id || "检查项").trim(),
      status: ["pass", "fail", "warn"].includes(String(item?.status || "")) ? String(item.status) : "warn",
      detail: sanitizeCoordinatorUserText(item?.detail, "", 360),
      evidence: sanitizeCoordinatorUserList(item?.evidence, "", 260, 10),
    })).filter((item: any) => item.id || item.detail || item.evidence.length) : [];
    const workerReviews = Array.isArray(parsed.worker_reviews || parsed.workerReviews) ? (parsed.worker_reviews || parsed.workerReviews).map((item: any) => ({
      project: String(item?.project || item?.agent || "").trim(),
      receipt_status: String(item?.receipt_status || item?.receiptStatus || item?.status || "missing").trim(),
      trusted: item?.trusted !== false,
      completed_scope: sanitizeCoordinatorUserList(item?.completed_scope || item?.completedScope, "", 260, 12),
      gaps: sanitizeCoordinatorUserList(item?.gaps, "结果说明或验证证据需要补齐。", 260, 12),
      verification: sanitizeCoordinatorUserList(item?.verification, "", 220, 12),
    })).filter((item: any) => item.project || item.receipt_status !== "missing" || item.gaps.length || item.verification.length) : [];
    const decision = parsed.decision && typeof parsed.decision === "object" ? {
      can_complete: parsed.decision.can_complete !== false && parsed.decision.canComplete !== false,
      reason: sanitizeCoordinatorUserText(parsed.decision.reason, summary, 500),
    } : { can_complete: status === "complete" && !gaps.length && !conflicts.length && !userQuestion && !followUps.length, reason: summary };
    const verdict = ["pass", "blocked", "needs_user"].includes(String(parsed.verdict || ""))
      ? String(parsed.verdict)
      : status === "complete" && decision.can_complete ? "pass" : userQuestion ? "needs_user" : "blocked";
    const structuredReview = {
      schema_version: Number(parsed.schema_version || parsed.schemaVersion || 1),
      verdict,
      decision,
      summary,
      checks,
      worker_reviews: workerReviews,
      follow_ups: followUps.map((item: any) => ({
        project: item.targetName || item.project || "",
        summary: item.summary || "",
        reason: sanitizeCoordinatorUserText(item.reason, "", 260),
        quality: item.quality || null,
      })),
      gaps,
      conflicts,
      user_question: userQuestion,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };

    const lines = ["📋 **协调复盘**", ""];
    if (summary) lines.push(summary);
    if (conflicts.length) lines.push("", `冲突/不一致：${conflicts.join("；")}`);
    if (gaps.length) lines.push("", `缺口/风险：${gaps.join("；")}`);
    if (userQuestion) lines.push("", `需要你确认：${userQuestion}`);
    if (followUps.length) {
      lines.push("", "我会继续追问：");
      for (const item of followUps) {
        const preview = item.summary ? `${item.summary}：` : "";
        lines.push(`@${item.targetName} ${preview}${sanitizeCoordinatorUserText(item.message, "请补齐结果说明、实际变更和验证证据。", 320)}`);
      }
    }

    recordMetric(coordinator.project, {
      success: true,
      durationMs: Date.now() - startedAt,
      scopeType: "group",
      groupId: normalized.id,
      role: "main_agent",
      source: "coordinator-review",
      runtime: "llm-api",
      traceId: options.traceId || "",
      taskId: options.taskId || "",
      executionId: options.executionId || "",
      usage: tokenUsage,
    });
    return {
      agent: coordinator.project,
      status,
      followUps,
      gaps,
      conflicts,
      content: lines.join("\n").trim(),
      confidence: structuredReview.confidence,
      structured_review: structuredReview,
    };
  } catch (err: any) {
    console.error("[LLM复盘] 调用失败:", err.message);
    recordMetric(coordinator.project, {
      success: false,
      durationMs: Date.now() - startedAt,
      scopeType: "group",
      groupId: normalized.id,
      role: "main_agent",
      source: "coordinator-review",
      runtime: "llm-api",
      traceId: options.traceId || "",
      taskId: options.taskId || "",
      executionId: options.executionId || "",
      usage: tokenUsage,
      error: err?.message || String(err),
    });
    return null;
  }
}





export async function decomposeRequirementWithModelCoordinator(group: any, requirement: string) {
  const result: any = await runLlmGroupOrchestrator({
    group,
    message: requirement,
    source: "group-requirement-decompose",
    extraInstructions: "This is an explicit requirement decomposition request. Generate structured assignments from complete semantics and member responsibilities only; do not use keyword or rule routing. Return clarificationQuestions when information is insufficient; never guess targets.",
  });
  const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
  if (!assignments.length) {
    const questions = result?.workflowDecision?.clarificationQuestions || result?.analysis?.missingInfo || [];
    throw new Error(questions.length ? `需求分解需要补充：${questions.join("；")}` : "模型未生成可执行需求分解，未创建本地替代任务");
  }
  return assignments.map((item: any, index: number) => ({
    title: String(item.title || `${item.project || item.target_project || `任务 ${index + 1}`} 需求`).trim(),
    description: String(item.task || item.description || requirement).trim(),
    target_project: String(item.project || item.target_project || "").trim(),
    priority: String(item.priority || "normal").trim(),
    estimated_time: String(item.estimated_time || "由项目 Agent 评估").trim(),
    selected_skill_names: result?.workflowDecision?.selectedSkills || [],
  })).filter((item: any) => item.target_project);
}

// Compatibility alias for extensions compiled against the previous public name.
export const decomposeRequirementWithCodedCoordinator = decomposeRequirementWithModelCoordinator;





export function buildLlmCoordinatorMessages(input: {
  group: any;
  message: string;
  context?: string;
  sharedFilesContext?: string;
  ragContext?: string;
  extraInstructions?: string;
  source?: string;
  groupSessionId?: string;
  group_session_id?: string;
  mainAgentToolResults?: any[];
  main_agent_tool_results?: any[];
  workflowDecision?: WorkflowDecision | null;
}) {
  const group = normalizeGroupOrchestrator(input.group);
  // 优化3：共享文件上下文注入
  const sharedFilesPart = input.sharedFilesContext ? `\n\nShared group files:\n${input.sharedFilesContext}` : "";
  const ragPart = input.ragContext ? `\n\nLocal knowledge-base context (retrieved by the main Agent for understanding, direct answers, or child-Agent work orders only; it is not execution authorization):\n${input.ragContext}` : "";
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
  const planAuthoring = isConversationPlanModeEnabled("group", String(group?.id || ""), groupSessionId);
  const roleSkills = buildRoleSkillPrompt("group-main-agent", input.message, {
    source: input.source || "",
    phase: "planning",
    selectedSkillNames: input.workflowDecision?.selectedSkills || [],
    modelDecision: input.workflowDecision || null,
    planAuthoring,
  });
  const mainAgentTools = buildGroupMainAgentToolContext(input);
  const toolResults = Array.isArray(input.mainAgentToolResults)
    ? input.mainAgentToolResults
    : Array.isArray(input.main_agent_tool_results) ? input.main_agent_tool_results : [];
  const sessionGuidance = buildGroupMainSessionGuidance({ planAuthoring });
  const identityRules = buildGroupMainIdentityRules({
    projectBrief: buildAllowedProjectBrief(group),
    extraInstructions: input.extraInstructions,
    roleSkillsPrompt: roleSkills.prompt,
    planAuthoring,
    sessionDirective: renderSlashCommandSessionDirective("group", String(group?.id || ""), groupSessionId),
  });
  const nativeMessages = tryBuildGroupNativeCoordinatorMessages({
    group,
    message: input.message,
    groupSessionId,
    sharedFilesContext: input.sharedFilesContext,
    ragContext: input.ragContext,
    identityRules,
    sessionGuidance,
    mcpPolicy: mainAgentTools.policyPrompt,
    mainAgentToolResults: toolResults,
  });
  if (nativeMessages) return nativeMessages;
  const priorPlanBlock = formatPriorGroupPlanBlock(extractPriorGroupPlanDraft(input.context));
  const system = `${identityRules}

${sessionGuidance}${sharedFilesPart}${ragPart}`;

  const user = `Recent group context:
${input.context || "none"}
${priorPlanBlock ? `\n${priorPlanBlock}\n` : ""}
Latest user message:
${input.message}

Workflow decision already available for this Run (empty on the first main-Agent call; reused on tool follow-ups):
${JSON.stringify(input.workflowDecision || null)}

Decide from complete semantics whether to reply directly, call read-only tools, call ccm_ask_user, submit ccm_present_plan, or call ccm_dispatch. When the user explicitly requests a plan, approach, or steps, call ccm_present_plan. If the recent context already answers the message and no plan is requested, prefer a direct reply.`;

  return attachTransientModelBlocks([
    { role: "system", content: system },
    ...(mainAgentTools.policyPrompt
      ? [{ role: "system", contextBlockType: "mcp", content: mainAgentTools.policyPrompt }]
      : []),
    { role: "user", content: user },
  ], collectTransientModelBlocks(toolResults));
}

export function buildLlmCoordinatorContextComponents(input: {
  group: any;
  message: string;
  extraInstructions?: string;
  source?: string;
  groupSessionId?: string;
  group_session_id?: string;
  mainAgentToolResults?: any[];
  main_agent_tool_results?: any[];
  workflowDecision?: WorkflowDecision | null;
}) {
  const group = normalizeGroupOrchestrator(input.group);
  const roleSkills = buildRoleSkillPrompt("group-main-agent", input.message, {
    source: input.source || "",
    phase: "planning",
    selectedSkillNames: input.workflowDecision?.selectedSkills || [],
    modelDecision: input.workflowDecision || null,
    planAuthoring: isConversationPlanModeEnabled("group", String(group?.id || ""), String(input.groupSessionId || input.group_session_id || "")),
  });
  const mainAgentTools = buildGroupMainAgentToolContext(input);
  const toolResults = Array.isArray(input.mainAgentToolResults)
    ? input.mainAgentToolResults
    : Array.isArray(input.main_agent_tool_results) ? input.main_agent_tool_results : [];
  return {
    rules: [WORKFLOW_DECISION_GUIDANCE, input.extraInstructions || ""].filter(Boolean).join("\n\n"),
    skills: [roleSkills.prompt || "", mainAgentTools.skillPrompt].filter(Boolean).join("\n\n"),
    mcpTools: selectUserMcpToolDefinitions(mainAgentTools.catalog?.mcp || mainAgentTools.catalog?.loadedMcp || []),
    subagentDefinitions: buildAllowedProjectBrief(group),
    loadedContextItems: buildMainAgentLoadedContextItems(
      mainAgentTools,
      toolResults,
      roleSkills.selected.map((skill: any) => ({
        name: skill.name,
        loadLevel: "body" as const,
        checksum: crypto.createHash("sha256").update(String(skill.body || "")).digest("hex"),
      })),
    ),
  };
}





export function normalizeDocumentFindings(parsed: any) {
  return Array.isArray(parsed?.documentFindings)
    ? parsed.documentFindings.map((x: any) => String(x).trim()).filter(Boolean)
    : [];
}

function normalizeArchitecturePlan(parsed: any, sourceEvidence: any, targets: any[]) {
  const raw = parsed?.architecturePlan || parsed?.architecture_plan || {};
  const evidenceProjects = new Map<string, Set<string>>((Array.isArray(sourceEvidence?.projects) ? sourceEvidence.projects : [])
    .map((project: any) => [
      String(project?.project || ""),
      new Set((Array.isArray(project?.selected_paths) ? project.selected_paths : []).map((value: any) => String(value || ""))),
    ] as [string, Set<string>]));
  const targetProjects = new Set((targets || []).map((target: any) => String(target?.member?.project || target?.project || "")).filter(Boolean));
  const citations = (Array.isArray(raw?.sourceCitations || raw?.source_citations) ? (raw.sourceCitations || raw.source_citations) : [])
    .map((citation: any) => {
      const project = String(citation?.project || "").trim();
      const allowedPaths = evidenceProjects.get(project) || new Set<string>();
      const paths = (Array.isArray(citation?.paths) ? citation.paths : [])
        .map((value: any) => String(value || "").trim())
        .filter((value: string) => allowedPaths.has(value))
        .slice(0, 12);
      return project && paths.length ? {
        project,
        paths,
        reason: compactText(citation?.reason || "", 300),
      } : null;
    })
    .filter(Boolean);
  for (const project of targetProjects) {
    if (citations.some((citation: any) => citation.project === project)) continue;
    const paths = Array.from(evidenceProjects.get(project) || []).slice(0, 8);
    if (paths.length) citations.push({
      project,
      paths,
      reason: "主 Agent规划使用的当前源码证据",
    });
  }
  const dependencySteps = (Array.isArray(raw?.dependencySteps || raw?.dependency_steps) ? (raw.dependencySteps || raw.dependency_steps) : [])
    .map((step: any, index: number) => ({
      id: compactText(step?.id || `step_${index + 1}`, 80),
      title: compactText(step?.title || step?.label || "", 220),
      project: compactText(step?.project || "", 120),
      dependsOn: Array.isArray(step?.dependsOn || step?.depends_on)
        ? (step.dependsOn || step.depends_on).map((value: any) => compactText(value, 80)).filter(Boolean).slice(0, 12)
        : [],
      acceptance: Array.isArray(step?.acceptance)
        ? step.acceptance.map((value: any) => compactText(value, 300)).filter(Boolean).slice(0, 8)
        : [],
    }))
    .filter((step: any) => step.title);
  if (!dependencySteps.length) {
    for (const [index, target] of (targets || []).entries()) {
      const project = String(target?.member?.project || target?.project || "");
      dependencySteps.push({
        id: `step_${index + 1}`,
        title: compactText(target?.reason || `完成 ${project} 项目工作项`, 220),
        project,
        dependsOn: target?.dependsOn ? [String(target.dependsOn)] : [],
        acceptance: Array.isArray(parsed?.reasoning?.verificationAssertions)
          ? parsed.reasoning.verificationAssertions.map((value: any) => compactText(value, 300)).filter(Boolean).slice(0, 8)
          : [],
      });
    }
  }
  const boundaries = Array.isArray(raw?.boundaries)
    ? raw.boundaries.map((value: any) => compactText(value, 300)).filter(Boolean).slice(0, 16)
    : [];
  if (!boundaries.length) {
    for (const project of targetProjects) boundaries.push(`${project} 仅修改本项目工作单范围，跨项目契约由主 Agent统一协调`);
  }
  const dataRelationships = Array.isArray(raw?.dataRelationships || raw?.data_relationships)
    ? (raw.dataRelationships || raw.data_relationships).map((value: any) => compactText(value, 500)).filter(Boolean).slice(0, 20)
    : [];
  if (!dataRelationships.length && Array.isArray(parsed?.reasoning?.dependencyRationale)) {
    dataRelationships.push(...parsed.reasoning.dependencyRationale.map((value: any) => compactText(value, 500)).filter(Boolean).slice(0, 20));
  }
  return {
    schema: "ccm-group-main-architecture-plan-v1",
    goal: compactText(raw?.goal || parsed?.summary || "", 800),
    boundaries,
    dataRelationships,
    dependencySteps,
    sourceCitations: citations,
    sourceSnapshotChecksum: String(sourceEvidence?.checksum || ""),
    sourceReady: sourceEvidence?.ready === true,
  };
}

function groupRequirementPlanProjection(input: {
  architecturePlan: any;
  analysis: any;
  projects: string[];
  planId: string;
  revision?: number;
  status?: "ready" | "executing" | "completed" | "blocked" | "superseded";
}) {
  const architecture = input.architecturePlan || {};
  const acceptanceRows = Array.isArray(input.analysis?.acceptanceEvidencePlan)
    ? input.analysis.acceptanceEvidencePlan.map((item: any) => item?.criterion || item?.observableOutcome).filter(Boolean)
    : [];
  const deliverables = Array.isArray(input.analysis?.deliverables) ? input.analysis.deliverables : [];
  return {
    planId: input.planId,
    revision: Math.max(1, Number(input.revision || 1)),
    title: "需求实施计划",
    goal: architecture.goal || input.analysis?.summary || "按当前需求完成涉及项目的实现与验收。",
    steps: (Array.isArray(architecture.dependencySteps) ? architecture.dependencySteps : []).map((step: any, index: number) => ({
      id: step.id || `step_${index + 1}`,
      title: step.title || `实施步骤 ${index + 1}`,
      description: step.title || "完成当前阶段的业务实现。",
      outcome: Array.isArray(step.acceptance) ? step.acceptance[0] || "完成后进入下一阶段。" : "完成后进入下一阶段。",
      project: step.project || input.projects[index] || "",
      dependsOn: step.dependsOn || [],
      status: "pending",
    })),
    scope: input.projects,
    expectedResults: [...deliverables, ...acceptanceRows],
    exclusions: architecture.boundaries || [],
    status: input.status || "executing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}





export function enrichTaskWithDocumentFindings(task: string, findings: string[]) {
  const text = String(task || "").trim();
  if (!findings.length) return text;
  if (/文档依据|引用文档|接口文档|业务文档|需求文档|PRD|附件/.test(text)) return text;
  const brief = findings.slice(0, 6).map(item => `- ${compactText(item, 180)}`).join("\n");
  return `${text}\n\n文档依据/验收关注：\n${brief}`;
}





export function sanitizeLlmTargets(group: any, parsed: any, message: string, fallbackAnalysis: any, allowRuleRepair = false, dispatchContext: any = null) {
  void allowRuleRepair;
  const allowed = new Map(getRoutableMembers(group).map((m: any) => [m.project, m]));
  const rawTargets = Array.isArray(parsed?.targets) ? parsed.targets : [];
  const documentFindings = mergeDocumentFindings(normalizeDocumentFindings(parsed), fallbackAnalysis?.documentFindings);
  const taskAnalysis = {
    ...fallbackAnalysis,
    documentFindings,
    summary: String(parsed?.summary || fallbackAnalysis?.summary || ""),
    deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables : fallbackAnalysis?.deliverables,
    constraints: Array.isArray(parsed?.constraints) ? parsed.constraints : fallbackAnalysis?.constraints,
    missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo : fallbackAnalysis?.missingInfo,
    coordinationStrategy: String(parsed?.coordinationStrategy || fallbackAnalysis?.coordinationStrategy || inferCoordinatorStrategy(fallbackAnalysis, rawTargets.length)),
  };
  const seen = new Set<string>();
  const targets = [];

  for (const target of rawTargets) {
    const project = String(target?.project || "").trim();
    if (!allowed.has(project) || seen.has(project)) continue;
    const enrichedTask = enrichTaskWithDocumentFindings(String(target?.task || "").trim() || message, documentFindings);
    const permissionPlan = {
      requestedOperations: Array.isArray(target?.permissionPlan?.requestedOperations) ? target.permissionPlan.requestedOperations.map((item: any) => String(item).slice(0, 300)).slice(0, 12) : [],
      userApprovalRequired: Array.isArray(target?.permissionPlan?.userApprovalRequired) ? target.permissionPlan.userApprovalRequired.map((item: any) => String(item).slice(0, 300)).slice(0, 12) : [],
    };
    const baseTask = buildSelfContainedWorkerTask(project, enrichedTask, taskAnalysis, {
      group,
      reason: target?.reason || "LLM 主 Agent 根据需求理解和项目职责派发",
      dependsOn: target?.dependsOn || "",
      coordinationStrategy: taskAnalysis.coordinationStrategy,
    });
    const task = [
      baseTask,
      permissionPlan.requestedOperations.length || permissionPlan.userApprovalRequired.length ? [
        "权限计划（不能替代实际租约）：",
        ...permissionPlan.requestedOperations.map((item: string) => `- 主 Agent 可审批候选：${item}`),
        ...permissionPlan.userApprovalRequired.map((item: string) => `- 必须等待用户审批：${item}`),
        "实际执行前仍必须调用 ccm__permission_broker 权限工具。",
      ].join("\n") : "",
    ].filter(Boolean).join("\n\n");
    targets.push({
      member: allowed.get(project),
      task,
      reason: String(target?.reason || "").trim(),
      dependsOn: String(target?.dependsOn || "").trim(),
      permissionPlan,
    });
    seen.add(project);
  }

  const presentedPlan = dispatchContext?.presentedPlan
    || latestPresentedPlanFromGroupSession(group?.id, dispatchContext?.groupSessionId)
    || parsed?.presentedPlan
    || parsed?.presented_plan;
  return attachConfirmedPlanSlicesToDispatchTargets(targets, presentedPlan);
}





export function normalizeLlmAnalysis(parsed: any, fallback: any) {
  const documentFindings = mergeDocumentFindings(normalizeDocumentFindings(parsed), fallback?.documentFindings);
  let acceptanceEvidencePlan: any[] = [];
  let verificationProfile: any = null;
  try {
    acceptanceEvidencePlan = normalizeTestAgentAcceptanceEvidencePlan(parsed?.reasoning?.acceptanceEvidencePlan);
    verificationProfile = normalizeTestAgentVerificationProfile(parsed?.reasoning?.verificationProfile);
  } catch {
    acceptanceEvidencePlan = [];
    verificationProfile = null;
  }
  return {
    ...fallback,
    intent: String(parsed?.intent || fallback.intent || "discussion"),
    summary: String(parsed?.summary || fallback.summary || ""),
    domains: Array.isArray(parsed?.domains) ? parsed.domains.map((x: any) => String(x)).filter(Boolean) : fallback.domains,
    deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables.map((x: any) => String(x)) : fallback.deliverables,
    constraints: Array.isArray(parsed?.constraints) ? parsed.constraints.map((x: any) => String(x)).filter(Boolean) : fallback.constraints,
    documentFindings,
    missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo.map((x: any) => String(x)).filter(Boolean) : fallback.missingInfo,
    needsCoordination: parsed?.shouldDelegate !== false,
    coordinationStrategy: String(parsed?.coordinationStrategy || fallback?.coordinationStrategy || inferCoordinatorStrategy(fallback, Array.isArray(parsed?.targets) ? parsed.targets.length : 0)),
    architecturePlan: parsed?.architecturePlan || parsed?.architecture_plan || null,
    reasoning: {
      knownFacts: Array.isArray(parsed?.reasoning?.knownFacts) ? parsed.reasoning.knownFacts.map((x: any) => String(x)).filter(Boolean).slice(0, 20) : [],
      assumptionsToVerify: Array.isArray(parsed?.reasoning?.assumptionsToVerify) ? parsed.reasoning.assumptionsToVerify.map((x: any) => String(x)).filter(Boolean).slice(0, 20) : [],
      verificationAssertions: Array.isArray(parsed?.reasoning?.verificationAssertions) ? parsed.reasoning.verificationAssertions.map((x: any) => String(x)).filter(Boolean).slice(0, 20) : [],
      acceptanceEvidencePlan,
      verificationProfile,
      dependencyRationale: Array.isArray(parsed?.reasoning?.dependencyRationale) ? parsed.reasoning.dependencyRationale.map((x: any) => String(x)).filter(Boolean).slice(0, 20) : [],
      replanTriggers: Array.isArray(parsed?.reasoning?.replanTriggers) ? parsed.reasoning.replanTriggers.map((x: any) => String(x)).filter(Boolean).slice(0, 20) : [],
    },
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : fallback.confidence,
    workflowDecision: normalizeWorkflowDecision({
      ...(fallback?.workflowDecision || {}),
      ...(parsed?.workflowDecision || parsed?.workflow_decision || {}),
      ...(!(parsed?.workflowDecision || parsed?.workflow_decision) ? {
        actionRequired: parsed?.shouldDelegate === true,
        requiresCodeChanges: parsed?.shouldDelegate === true,
        reason: parsed?.dispatchPolicy?.reason || fallback?.workflowDecision?.reason || "大模型已选择协调方式",
        confidence: parsed?.confidence ?? fallback?.confidence ?? 0.8,
      } : {}),
    }),
  };
}





export function buildCoordinatorResultFromAnalysis(group: any, message: string, analysis: any, targets: any[], runtime: string, parsed: any = null, options: any = {}) {
  const coordinator = getCoordinatorMember(group);
  // 优化6：优先使用 LLM 生成的 friendlyResponse
  const friendlyText = coordinatorUsableReply(parsed);
  const dispatchPolicy = parsed
    ? normalizeDispatchPolicy(parsed, analysis, targets)
    : { action: "hold", reason: "缺少模型结构化派发决定", requiresConfirmation: false, risk: "", nextStep: "重新调用模型" };
  const shouldDispatch = dispatchPolicy.action === "delegate" && !dispatchPolicy.requiresConfirmation;
  const effectiveTargets = shouldDispatch ? targets : [];
  const workflowDecision: WorkflowDecision = analysis.workflowDecision
    || normalizeWorkflowDecision({
      actionRequired: effectiveTargets.length > 0,
      requiresCodeChanges: effectiveTargets.length > 0,
      reason: dispatchPolicy.reason || "主 Agent 已选择协调方式",
    });

  if (effectiveTargets.length === 0) {
    const policyLine = dispatchPolicy.action === "delegate" && dispatchPolicy.requiresConfirmation
      ? `我先不直接派发：${dispatchPolicy.reason || "该操作需要你确认"}${dispatchPolicy.risk ? `\n风险：${dispatchPolicy.risk}` : ""}`
      : "";
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      analysis,
      workflowDecision,
      dispatchPolicy,
      runtime,
      agentBoundary: buildGroupMainAgentBoundary(runtime === "llm-api" ? "llm" : runtime),
      content: coordinatorVisibleFallbackContent({
        parsed,
        analysis,
        policyLine,
        priorPlanDraft: options.priorPlanDraft || options.prior_plan_draft,
        observationCount: options.observationCount || options.observation_count,
      }),
    };
  }

  const delegationLines = effectiveTargets.map((item: any) => buildVisibleAssignmentLine(item));
  const delegated = effectiveTargets.map((item: any) => item.member.project);
  // 优化5：保存执行顺序信息
  const executionOrder = workflowDecision.requiresCodeChanges === true
    ? "sequential"
    : String(parsed?.executionOrder || "parallel");
  const coordinationStrategy = String(parsed?.coordinationStrategy || analysis?.coordinationStrategy || inferCoordinatorStrategy(analysis, effectiveTargets.length));
  analysis.coordinationStrategy = coordinationStrategy;
  const coordinationPlan: any = buildCoordinatorPlan(group, analysis, effectiveTargets, executionOrder, coordinationStrategy);
  const sourceEvidence = options.projectSourceEvidence || options.project_source_evidence || null;
  const architecturePlan = normalizeArchitecturePlan(parsed, sourceEvidence, effectiveTargets);
  analysis.architecturePlan = architecturePlan;
  coordinationPlan.architecture = architecturePlan;
  coordinationPlan.sourceEvidence = sourceEvidence;
  const visibleGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const visiblePlanId = String(options.taskId || options.task_id || options.turnId || options.turn_id || `group-${group.id}-${crypto.createHash("sha256").update(message).digest("hex").slice(0, 16)}`);
  if (group.id && visibleGroupSessionId && architecturePlan.dependencySteps.length) {
    appendUserVisibleRequirementPlan({
      eventId: `group-task:${visiblePlanId}:requirement-plan:1:initial`,
      scope: "group",
      scopeId: String(group.id),
      exactSessionId: visibleGroupSessionId,
      ...(String(options.anchorMessageId || options.anchor_message_id || "").trim()
        ? { anchorMessageId: String(options.anchorMessageId || options.anchor_message_id).trim() }
        : {}),
      generation: Math.max(0, Number(options.generation || options.executionGeneration || 0)),
      taskId: visiblePlanId,
      plan: groupRequirementPlanProjection({
        architecturePlan,
        analysis,
        projects: delegated,
        planId: visiblePlanId,
        revision: 1,
        status: "executing",
      }),
    });
  }

  return {
    agent: coordinator.project,
    delegated,
    assignments: buildAssignmentsFromTargets(effectiveTargets, {
      group,
      analysis,
      groupSessionId: options.groupSessionId || options.group_session_id || "",
      workerContextUsageOptions: options.workerContextUsageOptions || options.worker_context_usage_options || null,
      autoWorkerContextCompactRetry: options.autoWorkerContextCompactRetry ?? options.auto_worker_context_compact_retry,
      workerContextRetryOptions: options.workerContextRetryOptions || options.worker_context_retry_options || null,
      providerSwitchRequests: options.providerSwitchRequests || options.provider_switch_requests || null,
    }),
    analysis,
    workflowDecision,
    coordinationPlan,
    projectSourceEvidence: sourceEvidence,
    dispatchPolicy,
    runtime,
    agentBoundary: buildGroupMainAgentBoundary(runtime === "llm-api" ? "llm" : runtime),
    executionOrder,
    coordinationStrategy,
    content: [
      friendlyText || `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
      "",
      buildCoordinatorPlanText(coordinationPlan),
      "",
      ...delegationLines,
      "",
      `等他们回复后我会做汇总 📋`
    ].join("\n"),
  };
}





export async function runLlmGroupOrchestrator(input: {
  group: any;
  message: string;
  context?: string;
  sharedFilesContext?: string;
  ragContext?: string;
  ragCitations?: string[];
  ragScoped?: boolean;
  source?: string;
  extraInstructions?: string;
  providerSwitchRequests?: any;
  provider_switch_requests?: any;
  groupSessionId?: string;
  group_session_id?: string;
  mainAgentToolResults?: any[];
  main_agent_tool_results?: any[];
  workflowDecision?: WorkflowDecision | null;
  workflow_decision?: WorkflowDecision | null;
  projectSourceEvidence?: any;
  project_source_evidence?: any;
  onRetry?: (notice: any) => void;
  onDelta?: (delta: string) => void;
  onModelActivity?: (activity: any) => void;
  turnId?: string;
  turn_id?: string;
  anchorMessageId?: string;
  anchor_message_id?: string;
  signal?: AbortSignal;
}) {
  const group = normalizeGroupOrchestrator(input.group);
  const baseConfig = loadOrchestratorConfig();
  const providedWorkflowDecision = input.workflowDecision || input.workflow_decision || null;
  const workflowDecision = providedWorkflowDecision
    ? normalizeWorkflowDecision(providedWorkflowDecision)
    : null;
  const fallbackAnalysis = {
    intent: workflowDecision?.intentKind || "conversation",
    summary: String(input.message || "").trim(),
    domains: [],
    deliverables: [],
    constraints: [],
    documentFindings: [],
    missingInfo: workflowDecision?.clarificationQuestions || [],
    needsCoordination: workflowDecision?.actionRequired === true,
    coordinationStrategy: "model_selected",
    confidence: workflowDecision?.confidence ?? 0,
    workflowDecision,
  };
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const sessionPreferences: any = readSlashCommandSessionState("group", String(group.id), groupSessionId).preferences;
  const config = { ...baseConfig, model: sessionPreferences.model || baseConfig.model, reasoningEffort: sessionPreferences.effort || baseConfig.reasoningEffort };
  const sessionDirective = renderSlashCommandSessionDirective("group", String(group.id), groupSessionId);
  const visibleTurnId = String((input as any).turnId || (input as any).turn_id || `${group.id}:${groupSessionId}:${Date.now()}`);
  const visibleAnchorMessageId = String((input as any).anchorMessageId || (input as any).anchor_message_id || "").trim();
  const visibleTurnStartedAt = Date.now();
  if (group.id && groupSessionId) {
    appendUserVisibleAgentEvent({
      eventId: `group-turn:${visibleTurnId}:started`,
      scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
      ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
      eventType: "turn_started",
      display: { title: "群聊主 Agent", summary: "已开始处理当前请求", status: "running" },
    });
  }
  const anthropic = shouldUseAnthropic(config);
  let tokenUsage: LlmTokenUsage | null = null;
  let modelCallCount = 0;
  const retryNotices: any[] = [];
  const loopBudget = resolveAgentLoopBudget({
    enabled: config.dynamicAgentBudgetEnabled !== false,
    adaptive: config.adaptiveAgentLoopEnabled !== false,
    contextWindow: config.modelContextWindow || 200_000,
    toolCallBudget: config.agentToolCallBudget || 6,
    maxModelTurns: config.agentMaxModelTurns || 8,
    toolBatchSize: config.agentToolBatchSize || 2,
    readOnlyParallelism: config.agentReadOnlyParallelism || 2,
    noProgressThreshold: config.agentLoopNoProgressThreshold || 3,
    remainingSafeTokens: Math.floor((config.modelContextWindow || 200_000) * 0.65),
  });
  let toolCallCount = 0;
  let toolRoundCount = 0;
  let modelDurationMs = 0;
  let toolWallDurationMs = 0;
  let segmentToolCalls = 0;
  let segmentModelTurns = 0;
  let segmentStartedAt = Date.now();
  let continuationSegments = 0;
  let noProgressCount = 0;
  let loopStopReason = "model_completed";
  let visibleReplyDeltaEmitted = false;
  let visibleReplyDeltaSequence = 0;
  let firstVisibleFeedbackAt = 0;
  let firstProviderDeltaAt = 0;
  let lastVisibleFeedbackAt = visibleTurnStartedAt;
  let maxSilentGapMs = 0;
  let modelRetryCount = 0;
  let initialReadFileCount = 0;
  let initialReadTokens = 0;
  const markVisibleFeedback = (at = Date.now()) => {
    if (!firstVisibleFeedbackAt) firstVisibleFeedbackAt = at;
    maxSilentGapMs = Math.max(maxSilentGapMs, Math.max(0, at - lastVisibleFeedbackAt));
    lastVisibleFeedbackAt = at;
  };
  let parsed: any;
  let planningInput: any = {
    ...input,
    group,
    workflowDecision: providedWorkflowDecision || null,
    extraInstructions: [String(input.extraInstructions || "").trim(), sessionDirective].filter(Boolean).join("\n\n"),
  };
  let toolResults: any[] = [];
  try {
    const nativeLoop = await runGroupMainNativeQueryLoop({
      config,
      group,
      groupSessionId,
      planningInput,
      loopBudget,
      visibleTurnId,
      visibleAnchorMessageId,
      signal: input.signal,
      onDelta: input.onDelta,
      onRetry: input.onRetry,
      onModelActivity: input.onModelActivity,
      markVisibleFeedback,
      buildMessages: (roundInput: any) => buildLlmCoordinatorMessages(roundInput),
      buildToolContext: (roundInput: any) => buildGroupMainAgentToolContext(roundInput),
      buildContextComponents: (roundInput: any) => buildLlmCoordinatorContextComponents(roundInput),
      executeRequests: executeGroupMainAgentToolRequests,
      isBuiltinReadOnly: (name: string) => GROUP_MAIN_BUILTIN_TOOLS.some(tool => tool.canonicalName === name),
    });
    parsed = nativeLoop.parsed;
    toolResults = nativeLoop.toolResults;
    planningInput = {
      ...nativeLoop.planningInput,
      mainAgentToolResults: toolResults,
      priorPlanDraft: extractPriorGroupPlanDraft(input.context),
      observationCount: toolResults.filter((row: any) => row?.name && row.name !== "loop_control").length,
    };
    modelCallCount = nativeLoop.modelCallCount;
    toolRoundCount = nativeLoop.toolRoundCount;
    toolCallCount = nativeLoop.toolCallCount;
    noProgressCount = nativeLoop.noProgressCount;
    continuationSegments = nativeLoop.continuationSegments;
    loopStopReason = nativeLoop.loopStopReason;
    tokenUsage = nativeLoop.tokenUsage || tokenUsage;
    modelDurationMs += nativeLoop.modelDurationMs;
    toolWallDurationMs += nativeLoop.toolWallDurationMs;
    modelRetryCount += nativeLoop.modelRetryCount;
    retryNotices.push(...nativeLoop.retryNotices);
    visibleReplyDeltaEmitted = nativeLoop.visibleReplyDeltaEmitted || visibleReplyDeltaEmitted;
    initialReadFileCount += nativeLoop.initialReadFileCount;
    initialReadTokens += nativeLoop.initialReadTokens;
  } catch (error: any) {
    if (error && !Number(error.observationCount)) {
      error.observationCount = toolResults.filter((row: any) => row?.name && row.name !== "loop_control").length;
    }
    throw attachLlmTokenUsage(error, tokenUsage);
  }
  let fallbackStreamCount = 0;
  if (shouldSynthesizeCoordinatorVisibleReply(parsed) && input.onDelta) {
    fallbackStreamCount += 1;
    modelCallCount += 1;
    const synthesisStartedAt = Date.now();
    const synthesisActivity = createModelActivityController({
      scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
      turnId: visibleTurnId, modelCallIndex: modelCallCount, phase: "final_synthesis",
      anchorMessageId: visibleAnchorMessageId || undefined,
      onActivity: activityValue => {
        if (["waiting", "retrying"].includes(String(activityValue?.state || ""))) markVisibleFeedback();
        input.onModelActivity?.(activityValue);
      },
    });
    let synthesisSequence = 0;
    const onSynthesisDelta = (delta: string) => {
      if (!String(delta || "").trim()) return;
      visibleReplyDeltaEmitted = true;
      if (!firstProviderDeltaAt) firstProviderDeltaAt = Date.now();
      markVisibleFeedback();
      synthesisActivity.onDelta(delta);
      synthesisSequence += 1;
      publishEphemeralUserVisibleAgentEvent({
        eventId: `group-delta:${visibleTurnId}:${modelCallCount}:${synthesisSequence}`,
        scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
        ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
        eventType: "assistant_text_delta",
        display: { title: "群聊主 Agent", summary: String(delta).slice(0, 500), status: "running" },
        detail: { stream: { sequence: synthesisSequence, final: false } },
      });
      input.onDelta?.(delta);
    };
    try {
      const priorPlanDraft = String(planningInput.priorPlanDraft || "");
      const synthesisMessages = [
        { role: "system", content: "Turn the established conclusions into the final user-facing answer in the user's conversation language. If a plan draft exists, mention its key decisions briefly instead of expanding every todo into an essay. Do not return an empty answer. Use recent context when it already contains the request; do not ask the user to restate it. Output answer text only; do not output JSON, internal protocols, hidden reasoning, or raw tool results." },
        { role: "user", content: JSON.stringify({
          request: String(input.message || "").slice(0, 4000),
          recentContext: String(input.context || "").slice(0, 6000),
          priorPlanDraft: priorPlanDraft.slice(0, 4000),
          draft: String(parsed?.reply || parsed?.content || parsed?.summary || "").slice(0, 8000),
          toolSummary: buildToolBatchOutcomeProgress(toolResults, { target: group.name || group.id }) || "未使用工具",
        }) },
      ];
      const captureSynthesisUsage = (usage: LlmTokenUsage) => { tokenUsage = mergeLlmTokenUsage(tokenUsage, usage); };
      const synthesized = anthropic
        ? await callAnthropicCompatibleChat(config, { messages: synthesisMessages, maxTokens: 1600, temperature: 0.2, defaultTimeoutMs: 60_000, retryProfile: "interactive_first_turn", stream: true, onDelta: onSynthesisDelta, onUsage: captureSynthesisUsage, onRetry: notice => { modelRetryCount += 1; synthesisActivity.onRetry(notice.attempt + 1); } })
        : await callOpenAiCompatibleChat(config, { messages: synthesisMessages, temperature: 0.2, defaultTimeoutMs: 60_000, retryProfile: "interactive_first_turn", stream: true, onDelta: onSynthesisDelta, onUsage: captureSynthesisUsage, onRetry: notice => { modelRetryCount += 1; synthesisActivity.onRetry(notice.attempt + 1); } });
      parsed = applySynthesizedCoordinatorReply(parsed, String(synthesized || parsed?.reply || parsed?.content || ""));
      synthesisActivity.complete();
    } catch (error: any) {
      synthesisActivity.fail();
      if (error && !Number(error.observationCount)) {
        error.observationCount = toolResults.filter((row: any) => row?.name && row.name !== "loop_control").length;
      }
      throw attachLlmTokenUsage(error, tokenUsage);
    } finally {
      modelDurationMs += Math.max(0, Date.now() - synthesisStartedAt);
    }
  }
  const conversationPlanModeEnabled = isConversationPlanModeEnabled("group", String(group.id), groupSessionId);
  parsed = applyConversationPlanModeHold("group", String(group.id), groupSessionId, parsed);
  parsed = applyInteractiveConversationModePolicy("group", conversationPlanModeEnabled, parsed);
  if (hasPresentedGroupPlan(parsed) && !coordinatorUsableReply(parsed)) {
    parsed = applySynthesizedCoordinatorReply(parsed, COORDINATOR_PRESENTED_PLAN_HEADLINE);
  }
  if (coordinatorShouldFailEmptyVisibleReply({
    parsed,
    priorPlanDraft: planningInput.priorPlanDraft,
    observationCount: planningInput.observationCount,
  })) {
    const error: any = new Error("模型返回空响应");
    error.code = "CCM_EMPTY_REPLY";
    error.observationCount = Number(planningInput.observationCount || 0);
    throw attachLlmTokenUsage(error, tokenUsage);
  }
  const analysis = normalizeLlmAnalysis(parsed, fallbackAnalysis);
  const targets = sanitizeLlmTargets(group, parsed, input.message, analysis, false, { groupSessionId });
  const turnDecision = normalizeMainAgentTurnDecision({
    scope: "group",
    scopeId: String(group.id || ""),
    exactSessionId: groupSessionId,
    turnId: String((input as any).turnId || (input as any).turn_id || `${group.id}:${groupSessionId}:${Date.now()}`),
    parsed,
    workflowDecision: analysis.workflowDecision,
    toolRequests: normalizeGroupMainToolRequests(parsed?.toolRequests || parsed?.tool_requests),
    dispatchDraft: targets,
  });
  const turnReceipt = createMainAgentTurnReceipt({
    decision: turnDecision,
    modelCallIndex: Math.max(1, modelCallCount),
    toolRound: Math.max(0, modelCallCount - 1),
    usage: tokenUsage,
    inputIdentity: { groupId: group.id, groupSessionId, message: input.message },
    promptBindings: buildInternalPromptBindings({
      scope: "group",
      system: buildLlmCoordinatorMessages(planningInput)
        .filter((message: any) => message?.role === "system")
        .map((message: any) => String(message.content || ""))
        .join("\n\n"),
      skills: buildRoleSkillPrompt("group-main-agent", input.message, {
        source: String((input as any).source || ""),
        phase: "planning",
        selectedSkillNames: analysis.workflowDecision?.selectedSkills || [],
        modelDecision: analysis.workflowDecision || null,
        planAuthoring: conversationPlanModeEnabled,
      }).selected.map((skill: any) => ({ name: skill.name, version: skill.version, body: skill.body })),
      mcp: buildLlmCoordinatorContextComponents(planningInput).mcpTools,
    }),
  });
  if (group.id && groupSessionId && ["reply", "clarify", "plan"].includes(turnDecision.responseKind)) {
    const reply = String(parsed?.reply || parsed?.content || parsed?.summary || "");
    const totalDurationMs = Math.max(0, Date.now() - visibleTurnStartedAt);
    const otherDurationMs = Math.max(0, totalDurationMs - modelDurationMs - toolWallDurationMs);
    publishUserVisibleAssistantText({
      scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
      taskId: String((input as any).taskId || (input as any).task_id || ""),
      turnId: visibleTurnId, text: reply, title: "群聊主 Agent 回复",
    });
    appendUserVisibleAgentEvent({
      eventId: `group-turn:${visibleTurnId}:result`,
      scope: "group", scopeId: String(group.id), exactSessionId: groupSessionId,
      ...(visibleAnchorMessageId ? { anchorMessageId: visibleAnchorMessageId } : {}),
      eventType: turnDecision.responseKind === "clarify" ? "clarification_required" : "result",
      display: {
        title: turnDecision.responseKind === "clarify" ? "需要补充信息" : turnDecision.responseKind === "plan" ? "计划已整理" : "回复完成",
        summary: turnDecision.responseKind === "clarify" ? reply : turnDecision.responseKind === "plan" ? "群聊主 Agent 已整理本轮计划" : "群聊主 Agent 已完成本轮回复",
        status: turnDecision.responseKind === "clarify" ? "waiting" : "success",
        toolUseCount: toolCallCount,
        tokenCount: Number(tokenUsage?.totalTokens || 0),
        tokenType: "provider_total",
        tokenAccuracy: tokenUsage?.reported === false ? "estimated" : "reported",
        durationMs: totalDurationMs,
      },
      detail: { timing: { totalMs: totalDurationMs, modelMs: modelDurationMs, toolWallMs: toolWallDurationMs, otherMs: otherDurationMs }, promptBindings: turnReceipt.promptBindings },
      result: buildUserVisibleAgentResult({ status: turnDecision.responseKind === "clarify" ? "waiting" : "success", text: reply, durationMs: totalDurationMs, modelDurationMs, turns: modelCallCount, toolCalls: toolCallCount, usage: tokenUsage }),
      usage: tokenUsage,
    });
  }
  const coordinatorResult = buildCoordinatorResultFromAnalysis(group, input.message, analysis, targets, "llm-api", parsed, planningInput);
  const presentedPlan = publishGroupPresentedRequirementPlan({
    groupId: group.id,
    groupSessionId,
    turnId: visibleTurnId,
    anchorMessageId: visibleAnchorMessageId,
    parsed,
    goalFallback: coordinatorUsableReply(parsed) || String(input.message || ""),
    skip: Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0,
  });
  return {
    ...coordinatorResult,
    ...(presentedPlan ? { presentedPlan } : {}),
    usage: tokenUsage,
    mainAgentTurnDecision: turnDecision,
    mainAgentTurnReceipt: turnReceipt,
    modelRetryReceipt: {
      schema: "ccm-model-retry-receipt-v1",
      attempts: retryNotices.length ? retryNotices.at(-1).attempt + 1 : 1,
      retries: retryNotices,
    },
    mainAgentToolUsage: {
      schema: "ccm-group-main-tool-usage-v2",
      groupId: String(group.id || ""),
      groupSessionId,
      mode: loopBudget.mode,
      modelCalls: modelCallCount,
      toolRounds: toolRoundCount,
      calls: toolCallCount,
      continuationSegments,
      noProgressCount,
      stopReason: loopStopReason,
      results: toolResults.map(row => ({ name: row.name, ok: row.ok, outputTokens: row.outputTokens || 0, error: row.error || "" })),
    },
    replyDeltaEmitted: visibleReplyDeltaEmitted,
    reply_delta_emitted: visibleReplyDeltaEmitted,
    streamingMetric: {
      modelMs: modelDurationMs,
      toolWallMs: toolWallDurationMs,
      firstVisibleFeedbackMs: firstVisibleFeedbackAt ? Math.max(0, firstVisibleFeedbackAt - visibleTurnStartedAt) : 0,
      firstTokenMs: firstProviderDeltaAt ? Math.max(0, firstProviderDeltaAt - visibleTurnStartedAt) : 0,
      maxSilentGapMs: Math.max(maxSilentGapMs, Math.max(0, Date.now() - lastVisibleFeedbackAt)),
      providerRetryCount: modelRetryCount,
      fallbackStreamCount,
      initialReadFileCount,
      initialReadTokens,
    },
  };
}
