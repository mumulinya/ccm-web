import * as globalAgentTestAgentDisplay from "./global-agent-test-agent-display";
import * as globalAgentLocalIntent from "./global-agent-local-intent";
import * as globalAgentBridge from "./global-agent-bridge";
import * as globalAgentModel from "./global-agent-model";
import { createGlobalAgentIntentSelfTest } from "./global-agent-self-tests";
import { createGlobalAgentApi } from "./global-agent-api";
import { createGlobalAgentAgenticRuntime } from "./global-agent-agentic-runtime";
import { createGlobalAgentFeishuChannel } from "./global-agent-feishu-channel";
import { createGlobalAgentFeishuActions } from "./global-agent-feishu-actions";
import { createGlobalAgentDirectDispatchRuntime } from "./global-agent-direct-dispatch";
import { createGlobalAgentTestAgentRelay } from "./global-agent-test-agent-relay";
import { createGlobalAgentHistoryRuntime } from "./global-agent-history";
import { createGlobalAgentStatusRuntime } from "./global-agent-status";
import { generateSessionTitleWithModel, isMeaningfulSessionTitleInput, isSessionTitlePlaceholder } from "../../system/session-title";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { queryKnowledgeBase } from "../knowledge/rag";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  buildUploadedFilesContext,
  CCM_DIR
} from "../../core/utils";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator";
import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  normalizeAnthropicMessagesUrl,
  normalizeChatCompletionsUrl,
  shouldUseAnthropic,
} from "../collaboration/group-orchestrator-llm-client";
import { getConfigs, getConfigInfo, loadCronJobs, loadTasks, loadMcpTools, loadSkills, loadFeishuConfig } from "../../core/db";
import {
  loadGroups,
  createGlobalDevelopmentMission,
  createRequirementEpicWithChildren,
  controlGlobalDevelopmentMission,
  getGlobalDevelopmentMission,
  refreshGlobalDevelopmentMissions,
  superviseGlobalDevelopmentMissionCycle,
  sendFeishuReportMessage,
  type CollabCtx,
} from "../collaboration/collaboration";
import { sanitizeMainAgentUserText } from "../collaboration/display";
import {
  bindFeishuIdentifiersFromValue,
  bindFeishuTaskContext,
  feishuRuntimeEventPresentation,
  notifyFeishuTaskStage,
  recordFeishuInbound,
  resolveFeishuDestination,
} from "../collaboration/feishu-channel";
import {
  acquireIdempotency,
  appendTraceEvent,
  completeIdempotency,
  ensureTraceId,
  failIdempotency,
  getIdempotencyRecord,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";
import {
  buildSelfContainedWorkerHandoff,
  renderSelfContainedWorkerHandoff,
  summarizeWorkerHandoffForUser,
} from "../../agents/worker-handoff";
import {
  buildGlobalGroupMemoryContext,
  renderGlobalGroupMemoryContextBundle,
  runGlobalGroupMemoryContextSelfTest,
} from "../collaboration/memory";
import {
  cancelGlobalAgentRun,
  attachGlobalAgentRunSupervision,
  buildGlobalVisibleReplyContent,
  completeGlobalAgentSupervision,
  continueGlobalAgentRunWithClarification,
  applyGlobalAgentSupervisionSteer,
  classifyGlobalAgentUserSteer,
  updateGlobalAgentSupervisionState,
  findClarifyingGlobalAgentRun,
  findWaitingGlobalAgentRun,
  getGlobalAgentRun,
  GLOBAL_AGENT_TOOL_SPECS,
  listGlobalAgentRuns,
  pauseGlobalAgentRun,
  recoverInterruptedGlobalAgentRuns,
  resumeGlobalAgentRun,
  runGlobalAgentLoopSelfTest,
  startGlobalAgentRun,
  steerGlobalAgentRun,
  type GlobalAgentDecision,
  type GlobalAgentLoopRuntime,
  type GlobalAgentRun,
} from "../../agents/global/loop";
import { conversationTurnControl } from "../../agents/conversation-turn-control";
import {
  checkGlobalMissionSupervisorNow,
  controlGlobalMissionSupervisor,
  formatGlobalMissionFinalReport,
  getGlobalMissionSupervisor,
  getGlobalMissionSupervisorSchedulerStatus,
  listGlobalMissionSupervisors,
  runGlobalMissionSupervisorSelfTest,
  runGlobalMissionSupervisorAsyncSelfTest,
  startGlobalMissionSupervisor,
  startGlobalMissionSupervisorScheduler,
  stopGlobalMissionSupervisorScheduler,
  type GlobalMissionSupervisorRuntime,
} from "../../agents/global/mission-supervisor";
import {
  buildGlobalAgentMemoryPacket,
  buildGlobalAgentSessionContinuation,
  compactGlobalAgentSessionWithModel,
  getGlobalAgentMemoryPolicy,
  ingestGlobalAgentConversation,
  loadGlobalAgentMemory,
  recallGlobalAgentMemory,
  rebuildGlobalAgentMemory,
  recordGlobalMissionMemory,
  recordGlobalAgentSessionProviderUsage,
  setGlobalAgentMemoryPolicy,
} from "../../agents/global/memory";
import { buildAgentQualitySnapshot, getAgentQualityPolicy, runAgentQualityCenterSelfTest, setAgentQualityPolicy } from "../../agents/quality-center";
import {
  summarizeTestAgentAdversarialEvidence,
  summarizeTestAgentBrowserActionEffects,
  summarizeTestAgentBrowserAuthentication,
  summarizeTestAgentBrowserFlows,
  summarizeTestAgentBrowserRecovery,
  summarizeTestAgentMultiSessionBrowser,
} from "../../agents/test-agent-review-bridge";
import { buildPostReviewSpotCheckSummary } from "../../agents/post-review-spot-check";
import { listTaskAgentSessions } from "../../tasks/agent-sessions";
import { runAgentReasoningLoopSelfTest } from "../../agents/reasoning-loop";
import { ingestRequirementSources, type RequirementIngestionResult } from "../requirements/source-ingestion";
import { buildTraceReplaySuite, replayAgentTrace, runAgentRuntimeKernelSelfTest } from "../../agents/runtime-kernel";
import {
  buildGlobalAgentSessionDebug,
  buildGlobalAgentToolDefinitions,
  deleteGlobalAgentHook,
  deleteGlobalAgentPermissionRule,
  getGlobalAgentBackgroundOutput,
  loadGlobalAgentHooks,
  loadGlobalAgentPermissionRules,
  recordGlobalAgentRuntimeOutput,
  runGlobalAgentRuntimeSelfTest,
  saveGlobalAgentHook,
  saveGlobalAgentPermissionRule,
} from "../../agents/global/runtime";
import {
  buildGlobalControlCenterSnapshot,
  buildGlobalDispatchStrategy,
  buildGlobalSystemHealth,
  classifyGlobalControlIntent,
  runGlobalControlCenterSelfTest,
} from "../../agents/global/control-center";



const { GLOBAL_PET_AGENT_NAME, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK, compactPetText, globalVisibleText, globalSafeArray, globalUniqueStrings, globalTestAgentCoverageItemKey, globalUniqueCoverageItems, globalTestAgentCoverageLabel, globalTestAgentCoverageByStatus, globalTestAgentSummaryObjects, globalTestAgentSummaryItems, globalTestAgentSummaryByStatus, globalTestAgentAcceptanceWeakReason, globalTestAgentWeakAcceptanceItems, summarizeGlobalTestAgentCoverageGap, collectGlobalTestAgentCoverageGaps, globalTestAgentFailureTypeLabel, scrubGlobalTestAgentEvidencePathText, collectGlobalTestAgentFailureItemsFromSource, collectGlobalTestAgentFailureItems, summarizeGlobalTestAgentFailureItem, summarizeGlobalTestAgentDiagnosticItem, collectGlobalTestAgentFailureSummaries, globalRunVisibleReply, getGlobalPetToolState, getGlobalToolDisplayName, buildGlobalAgentEventUi, relayGlobalPetEvent } = globalAgentTestAgentDisplay;
const { RANDOM_MUSIC_KEYWORD, hasExplicitGlobalWriteAuthorization, normalizeText, stripActionWords, parseMusicKeyword, findProjectName, findGroup, findAllProjectNames, resolveImplicitCurrentProject, findAllGroups, buildLocalDevelopmentTargets, hasExplicitDevelopmentExecutionIntent, chineseNumberToInt, normalizeCronHour, guessCronSchedule, inferLocalConversationFallback, inferLocalGlobalAction, createActionBlockSafeStreamer } = globalAgentLocalIntent;
const { loadGlobalAgentBridgeStore, saveGlobalAgentBridgeStore, createGlobalAgentBridgeRequest, waitForGlobalAgentBridgeResult, getRequestBaseUrl, callLocalApi, postLocalApi, parseSseApiEvents, parseSseApiEventBlock, postLocalSseOrJsonApi } = globalAgentBridge;
const { callLlm, shouldRetryGlobalModelError, callGlobalModelWithRetry, runGlobalModelRetrySelfTest } = globalAgentModel;
type LocalIntentResult = import("./global-agent-local-intent").LocalIntentResult;
const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
function writeGlobalJsonAtomic(file: string, value: any) {
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

const globalAgentHistoryRuntime = createGlobalAgentHistoryRuntime({
  GLOBAL_AGENT_HISTORY_FILE,
  GLOBAL_AGENT_HISTORY_LIMIT,
  GLOBAL_AGENT_SESSION_LIMIT,
  buildGlobalVisibleReplyContent,
  generateSessionTitle: generateSessionTitleWithModel,
  ingestGlobalAgentConversation,
  isMeaningfulSessionTitleInput,
  isSessionTitlePlaceholder,
  writeGlobalJsonAtomic,
})

export function runGlobalAgentHistorySyncSelfTest() {
  return globalAgentHistoryRuntime.runGlobalAgentHistorySyncSelfTest()
}

function mergeGlobalAgentMessages(existing: any[] = [], incoming: any[] = []) {
  return globalAgentHistoryRuntime.mergeGlobalAgentMessages(existing, incoming)
}

function loadGlobalAgentHistoryStore() {
  return globalAgentHistoryRuntime.loadGlobalAgentHistoryStore()
}

function syncGlobalAgentWebHistory(payload: any) {
  return globalAgentHistoryRuntime.syncGlobalAgentWebHistory(payload)
}

function getGlobalAgentConversationMessages(sessionId: string) {
  return globalAgentHistoryRuntime.getGlobalAgentConversationMessages(sessionId)
}

function appendGlobalAgentConversationMessage(sessionId: string, role: "user" | "assistant", content: string, source = "feishu") {
  return globalAgentHistoryRuntime.appendGlobalAgentConversationMessage(sessionId, role, content, source)
}

function resolveFeishuGlobalAgentSessionId(payload: any, store?: any) {
  return globalAgentHistoryRuntime.resolveFeishuGlobalAgentSessionId(payload, store)
}

export function runFeishuGlobalAgentSessionRoutingSelfTest() {
  return globalAgentHistoryRuntime.runFeishuGlobalAgentSessionRoutingSelfTest()
}
function getFeishuMessageId(payload: any) {
  return String(
    payload?.event?.message?.message_id
    || payload?.message_id
    || payload?.messageId
    || payload?.message?.id
    || payload?.header?.event_id
    || payload?.event_id
    || ""
  ).trim();
}

async function waitForIdempotencyResult(scope: string, key: string, timeoutMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const record = getIdempotencyRecord(scope, key);
    if (record?.status === "completed" || record?.status === "failed") return record;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return getIdempotencyRecord(scope, key);
}

const processedFeishuMessageIds = new Set<string>();

const GLOBAL_MANAGEMENT_ACTIONS: Record<string, any> = {
  manage_cron: { label: "定时任务管理", operations: ["list", "create", "update", "enable", "disable", "run", "delete"], destructive: ["delete"] },
  manage_group: { label: "群聊与成员管理", operations: ["list", "create", "rename", "add_member", "remove_member", "delete"], destructive: ["delete"] },
  manage_project: { label: "项目与 Agent 管理", operations: ["list", "create", "update", "start", "stop", "delete"], destructive: ["delete"] },
  manage_task: { label: "开发任务管理", operations: ["list", "pause", "resume", "continue", "retry", "queue", "delete"], destructive: ["delete"] },
  manage_tool: { label: "MCP 与 Skill 管理", operations: ["list", "create", "delete", "reload", "status"], destructive: ["delete"] },
  system_status: { label: "系统状态检查", operations: ["inspect"], destructive: [] },
};

const GLOBAL_MANAGEMENT_REQUIRED_PARAMS: Record<string, Record<string, string[]>> = {
  manage_cron: {
    create: ["name", "schedule", "prompt"],
    update: ["id"],
    enable: ["id"],
    disable: ["id"],
    run: ["id"],
    delete: ["id"],
  },
  manage_group: {
    create: ["name"],
    rename: ["id", "name"],
    add_member: ["id", "project"],
    remove_member: ["id", "project"],
    delete: ["id"],
  },
  manage_project: {
    create: ["name", "work_dir"],
    update: ["project"],
    start: ["project"],
    stop: ["project"],
    delete: ["project"],
  },
  manage_task: {
    pause: ["id"],
    resume: ["id"],
    continue: ["id"],
    retry: ["id"],
    queue: ["id"],
    delete: ["id"],
  },
  manage_tool: {
    create: ["name"],
    delete: ["name"],
  },
};

const GLOBAL_AGENT_BOUNDARY = {
  layer: "global_agent",
  responsibility: "system intent routing, management actions, development mission fan-out",
};

function annotateGlobalAction(action: any) {
  if (!action || !action.type) return action;
  const spec = GLOBAL_MANAGEMENT_ACTIONS[action.type];
  if (!spec) return action;
  const operation = String(action.params?.operation || (action.type === "system_status" ? "inspect" : "")).trim().toLowerCase();
  if (!spec.operations.includes(operation)) throw new Error(spec.label + " 不支持操作: " + (operation || "未填写"));
  const requiresConfirmation = spec.destructive.includes(operation);
  const params = { ...(action.params || {}), operation };
  if (action.type === "manage_task" && !params.id && params.task_id) params.id = params.task_id;
  if (action.type === "manage_group" && !params.id && params.group_id) params.id = params.group_id;
  if (action.type === "manage_project" && !params.project && params.name) params.project = params.name;
  const required = GLOBAL_MANAGEMENT_REQUIRED_PARAMS[action.type]?.[operation] || [];
  const missingParams = required.filter((key) => {
    const value = params[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
  return {
    ...action,
    params,
    management: true,
    agentBoundary: GLOBAL_AGENT_BOUNDARY,
    capability: spec.label,
    risk: requiresConfirmation ? "high" : "normal",
    requires_confirmation: requiresConfirmation,
    validated: missingParams.length === 0,
    missing_params: missingParams,
    needs_user_input: missingParams.length > 0,
  };
}

function redactAuditValue(value: any, key = ""): any {
  if (/token|secret|password|api.?key/i.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map(item => redactAuditValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactAuditValue(entryValue, entryKey)]));
  }
  return value;
}

function appendGlobalActionAudit(payload: any) {
  const record = {
    id: "ga-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    action: redactAuditValue(payload.action || {}),
    status: payload.status || "unknown",
    result: redactAuditValue(payload.result || {}),
    session_id: payload.session_id || null,
    source: payload.source || null,
    sender_id: redactAuditValue(payload.sender_id || null, "sender_id"),
    message_id: payload.message_id || null,
  };
  fs.appendFileSync(path.join(CCM_DIR, "global-agent-audit.jsonl"), JSON.stringify(record) + String.fromCharCode(10), "utf-8");
  return record;
}

const globalAgentTestAgentRelay = createGlobalAgentTestAgentRelay({
  buildPostReviewSpotCheckSummary,
  collectGlobalTestAgentCoverageGaps,
  collectGlobalTestAgentFailureSummaries,
  globalUniqueStrings,
  globalVisibleText,
  summarizeTestAgentAdversarialEvidence,
  summarizeTestAgentBrowserActionEffects,
  summarizeTestAgentBrowserAuthentication,
  summarizeTestAgentBrowserFlows,
  summarizeTestAgentBrowserRecovery,
  summarizeTestAgentMultiSessionBrowser,
})

function compactGlobalTestAgentExecutionPlanRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
  return globalAgentTestAgentRelay.compactGlobalTestAgentExecutionPlanRelayEvent(event, options)
}

function compactGlobalTestAgentReviewRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
  return globalAgentTestAgentRelay.compactGlobalTestAgentReviewRelayEvent(event, options)
}

function relayGlobalTestAgentEventFromGroup(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string; onEvent?: (event: any) => void } = {}) {
  return globalAgentTestAgentRelay.relayGlobalTestAgentEventFromGroup(event, options)
}
const globalAgentDirectDispatchRuntime = createGlobalAgentDirectDispatchRuntime({
  buildSelfContainedWorkerHandoff,
  compactPetText,
  getConfigInfo,
  getConfigs,
  normalizeText,
  renderSelfContainedWorkerHandoff,
  sanitizeMainAgentUserText,
  summarizeWorkerHandoffForUser,
})

const {
  GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN,
  sanitizeGlobalDirectAgentOutput,
  formatGlobalDevelopmentDispatchVisibleResult,
  formatGlobalTaskDispatchVisibleResult,
  resolveGlobalDispatchProject,
  inferGlobalDirectDispatchRequiresCodeChanges,
  buildGlobalDirectDispatchHandoff,
  buildGlobalSingleProjectMissionPayload,
  renderGlobalDirectGroupWorkOrder,
  renderGlobalDirectProjectWorkOrder,
  renderGlobalDirectGroupDispatchAcceptedSummary,
} = globalAgentDirectDispatchRuntime
const globalAgentStatusRuntime = createGlobalAgentStatusRuntime({
  collectGlobalTestAgentFailureItemsFromSource,
  getConfigs,
  getGlobalAgentRun,
  globalSafeArray,
  globalUniqueStrings,
  globalVisibleText,
  hasExplicitDevelopmentExecutionIntent,
  hasExplicitGlobalWriteAuthorization,
  listGlobalAgentRuns,
  loadCronJobs,
  loadGroups,
  loadTasks,
  normalizeText,
  refreshGlobalDevelopmentMissions,
  sanitizeGlobalDirectAgentOutput,
  scrubGlobalTestAgentEvidencePathText,
  summarizeGlobalTestAgentDiagnosticItem,
  summarizeGlobalTestAgentFailureItem,
})

function isGlobalProgressStatusRequest(message: string) {
  return globalAgentStatusRuntime.isGlobalProgressStatusRequest(message)
}

function formatMissionStatus(input: { missions?: any[]; tasks?: any[]; globalRuns?: any[] } = {}) {
  return globalAgentStatusRuntime.formatMissionStatus(input)
}

function formatSystemStatus() {
  return globalAgentStatusRuntime.formatSystemStatus()
}
const globalAgentFeishuActions = createGlobalAgentFeishuActions({
  GLOBAL_MANAGEMENT_ACTIONS,
  RANDOM_MUSIC_KEYWORD,
  buildGlobalDirectDispatchHandoff,
  buildGlobalSingleProjectMissionPayload,
  callLocalApi,
  formatGlobalDevelopmentDispatchVisibleResult,
  formatSystemStatus,
  getConfigs,
  guessCronSchedule,
  inferGlobalDirectDispatchRequiresCodeChanges,
  loadGroups,
  normalizeText,
  parseMusicKeyword,
  postLocalApi,
  postLocalSseOrJsonApi,
  relayGlobalTestAgentEventFromGroup,
  renderGlobalDirectGroupDispatchAcceptedSummary,
  renderGlobalDirectGroupWorkOrder,
})
const { queueMusicPlayback, executePlayMusic, executeStopMusic, fillCronParams, executeFeishuManagementAction, executeFeishuAction } = globalAgentFeishuActions
const globalAgentAgenticRuntime = createGlobalAgentAgenticRuntime({
  GLOBAL_AGENT_TOOL_SPECS,
  GLOBAL_MANAGEMENT_ACTIONS,
  GLOBAL_PET_AGENT_NAME,
  acquireIdempotency,
  annotateGlobalAction,
  attachGlobalAgentRunSupervision,
  bindFeishuIdentifiersFromValue,
  bindFeishuTaskContext,
  buildGlobalAgentMemoryPacket,
  buildGlobalAgentSessionContinuation,
  buildGlobalSingleProjectMissionPayload,
  callGlobalModelWithRetry,
  compactGlobalAgentSessionWithModel,
  compactPetText,
  completeGlobalAgentSupervision,
  completeIdempotency,
  continueGlobalAgentRunWithClarification,
  controlGlobalDevelopmentMission,
  controlGlobalMissionSupervisor,
  createGlobalDevelopmentMission,
  createRequirementEpicWithChildren,
  executeFeishuAction,
  executePlayMusic,
  executeStopMusic,
  failIdempotency,
  findClarifyingGlobalAgentRun,
  formatGlobalMissionFinalReport,
  getAgentQualityPolicy,
  getConfigInfo,
  getConfigs,
  getGlobalAgentBackgroundOutput,
  getGlobalAgentMemoryPolicy,
  getGlobalAgentRun,
  getGlobalDevelopmentMission,
  getGlobalMissionSupervisor,
  getGlobalMissionSupervisorSchedulerStatus,
  globalRunVisibleReply,
  hasExplicitDevelopmentExecutionIntent,
  hasExplicitGlobalWriteAuthorization,
  inferLocalGlobalAction,
  ingestGlobalAgentConversation,
  listGlobalAgentRuns,
  listGlobalMissionSupervisors,
  listTaskAgentSessions,
  loadCronJobs,
  loadGlobalAgentHistoryStore,
  loadGlobalAgentHooks,
  loadGlobalAgentMemory,
  loadGlobalAgentPermissionRules,
  loadGroups,
  loadMcpTools,
  loadOrchestratorConfig,
  loadSkills,
  loadTasks,
  normalizeText,
  notifyFeishuTaskStage,
  postLocalApi,
  queryKnowledgeBase,
  recallGlobalAgentMemory,
  rebuildGlobalAgentMemory,
  recordGlobalAgentRuntimeOutput,
  recordGlobalMissionMemory,
  recordGlobalAgentSessionProviderUsage,
  recoverInterruptedGlobalAgentRuns,
  refreshGlobalDevelopmentMissions,
  renderGlobalGroupMemoryContextBundle,
  resumeGlobalAgentRun,
  sanitizeGlobalDirectAgentOutput,
  sendFeishuReportMessage,
  setGlobalAgentMemoryPolicy,
  settleIdempotencyByTrace,
  startGlobalAgentRun,
  startGlobalMissionSupervisor,
  startGlobalMissionSupervisorScheduler,
  stopGlobalMissionSupervisorScheduler,
  superviseGlobalDevelopmentMissionCycle,
  updateGlobalAgentSupervisionState,
  waitForIdempotencyResult,
})
function localActionToAgenticDecision(localIntent: LocalIntentResult | null, run: GlobalAgentRun) { return globalAgentAgenticRuntime.localActionToAgenticDecision(localIntent, run) }
const { createMissionSupervisorRuntime, createAgenticRuntime, runAgenticGlobalRequest } = globalAgentAgenticRuntime
export function verifyGlobalAgentContextBoundary(context: any = {}) { return globalAgentAgenticRuntime.verifyGlobalAgentContextBoundary(context) }
export function buildGlobalAgentGroupMemoryModelContext(bundle: any, options: any = {}) { return globalAgentAgenticRuntime.buildGlobalAgentGroupMemoryModelContext(bundle, options) }
export function buildAgenticContext(query = "", sessionId = "", options: any = {}) { return globalAgentAgenticRuntime.buildAgenticContext(query, sessionId, options) }
export async function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number) { return globalAgentAgenticRuntime.resumeGlobalAgentLoopsForServer(ctx, port) }
export function startGlobalMissionSupervisionForServer(ctx: CollabCtx) { return globalAgentAgenticRuntime.startGlobalMissionSupervisionForServer(ctx) }
export function bootstrapGlobalAgentMemoryForServer() { return globalAgentAgenticRuntime.bootstrapGlobalAgentMemoryForServer() }
export function stopGlobalMissionSupervisionForServer() { return globalAgentAgenticRuntime.stopGlobalMissionSupervisionForServer() }
function publicGlobalAgentRunSummary(run: GlobalAgentRun | null) {
  if (!run) return null;
  return {
    id: run.id,
    trace_id: run.trace_id,
    session_id: run.session_id,
    source: run.source,
    status: run.status,
    phase: run.phase,
    created_at: run.created_at,
    updated_at: run.updated_at,
    started_at: (run as any).started_at || run.created_at,
    completed_at: run.completed_at,
    deadline_at: run.deadline_at,
    error: String(run.error || "").slice(0, 300),
    model_calls: run.model_calls,
    tool_calls: run.tool_calls,
    usage: (run as any).usage || null,
    input_tokens: Number((run as any).input_tokens || (run as any).usage?.inputTokens || 0) || 0,
    output_tokens: Number((run as any).output_tokens || (run as any).usage?.outputTokens || 0) || 0,
    mission_id: run.mission_id || "",
    supervisor_id: run.supervisor_id || "",
    supervision_state: run.supervision_state || "",
    step_count: Array.isArray(run.steps) ? run.steps.length : 0,
    pending_tool: run.pending_tool
      ? { name: run.pending_tool.name, risk: run.pending_tool.risk, signature: run.pending_tool.signature }
      : null,
  };
}

function publicGlobalAgentRun(run: GlobalAgentRun | null, includeObservations = false) {
  if (!run) return null;
  const steps = includeObservations ? run.steps : run.steps.map((step: any) => {
    if (step.observation === undefined) return step;
    let serialized = "";
    try { serialized = JSON.stringify(step.observation); } catch { serialized = String(step.observation); }
    return serialized.length <= 4_000 ? step : { ...step, observation: { truncated: true, preview: serialized.slice(0, 4_000), original_chars: serialized.length } };
  });
  return {
    id: run.id,
    trace_id: run.trace_id,
    session_id: run.session_id,
    source: run.source,
    status: run.status,
    phase: run.phase,
    presentation: (run as any).presentation || null,
    explicit_write_authorization: run.explicit_write_authorization,
    created_at: run.created_at,
    updated_at: run.updated_at,
    completed_at: run.completed_at,
    deadline_at: run.deadline_at,
    max_steps: run.max_steps,
    steps,
    pending_tool: run.pending_tool,
    final_reply: globalRunVisibleReply(run, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK),
    error: run.error,
    resume_count: run.resume_count,
    model_calls: run.model_calls,
    tool_calls: run.tool_calls,
    usage: (run as any).usage || null,
    input_tokens: Number((run as any).input_tokens || (run as any).usage?.inputTokens || 0) || 0,
    output_tokens: Number((run as any).output_tokens || (run as any).usage?.outputTokens || 0) || 0,
    client_effects: run.client_effects,
    mission_id: run.mission_id,
    supervisor_id: run.supervisor_id,
    supervision_state: run.supervision_state,
    final_delivery_report: run.final_delivery_report,
    final_report: run.final_report,
    source_ingestion: (run as any).source_ingestion || null,
    source_attachments: (run as any).source_attachments || [],
    requirement_extraction: (run as any).requirement_extraction || null,
    requirement_decomposition: (run as any).requirement_decomposition || null,
    requirement_content_hash: (run as any).requirement_content_hash || "",
    display_stream: run.display_stream,
    displayStream: run.display_stream,
    workchain: run.workchain,
    todo_plan: (run as any).todo_plan || (run as any).todoPlan || run.workchain?.todo_plan || run.workchain?.todoPlan || null,
    todoPlan: (run as any).todoPlan || (run as any).todo_plan || run.workchain?.todoPlan || run.workchain?.todo_plan || null,
    decision_summary: run.decision_summary,
    clarification_question: run.clarification_question,
    clarification_summary: (run as any).clarification_summary || (run as any).clarificationSummary || null,
    clarificationSummary: (run as any).clarification_summary || (run as any).clarificationSummary || null,
    confirmation_summary: (run as any).confirmation_summary || (run as any).confirmationSummary || null,
    confirmationSummary: (run as any).confirmation_summary || (run as any).confirmationSummary || null,
    plan_mode: (run as any).plan_mode || (run as any).planMode || null,
    planMode: (run as any).plan_mode || (run as any).planMode || null,
    plan_accept_feedback: (run as any).plan_accept_feedback || (run as any).planAcceptFeedback || "",
    planAcceptFeedback: (run as any).planAcceptFeedback || (run as any).plan_accept_feedback || "",
    last_plan_accept_feedback: (run as any).last_plan_accept_feedback || (run as any).lastPlanAcceptFeedback || "",
    lastPlanAcceptFeedback: (run as any).lastPlanAcceptFeedback || (run as any).last_plan_accept_feedback || "",
    last_plan_accept_feedback_at: (run as any).last_plan_accept_feedback_at || (run as any).lastPlanAcceptFeedbackAt || "",
    lastPlanAcceptFeedbackAt: (run as any).lastPlanAcceptFeedbackAt || (run as any).last_plan_accept_feedback_at || "",
    resume_feedback: (run as any).resume_feedback || (run as any).resumeFeedback || "",
    resumeFeedback: (run as any).resumeFeedback || (run as any).resume_feedback || "",
    last_resume_feedback: (run as any).last_resume_feedback || (run as any).lastResumeFeedback || "",
    lastResumeFeedback: (run as any).lastResumeFeedback || (run as any).last_resume_feedback || "",
    last_resume_feedback_at: (run as any).last_resume_feedback_at || (run as any).lastResumeFeedbackAt || "",
    lastResumeFeedbackAt: (run as any).lastResumeFeedbackAt || (run as any).last_resume_feedback_at || "",
    resume_feedback_history: Array.isArray((run as any).resume_feedback_history) ? (run as any).resume_feedback_history : Array.isArray((run as any).resumeFeedbackHistory) ? (run as any).resumeFeedbackHistory : [],
    resumeFeedbackHistory: Array.isArray((run as any).resumeFeedbackHistory) ? (run as any).resumeFeedbackHistory : Array.isArray((run as any).resume_feedback_history) ? (run as any).resume_feedback_history : [],
    pending_user_messages: Array.isArray((run as any).pending_user_messages) ? (run as any).pending_user_messages : Array.isArray((run as any).pendingUserMessages) ? (run as any).pendingUserMessages : [],
    pendingUserMessages: Array.isArray((run as any).pendingUserMessages) ? (run as any).pendingUserMessages : Array.isArray((run as any).pending_user_messages) ? (run as any).pending_user_messages : [],
    user_steer_history: Array.isArray((run as any).user_steer_history) ? (run as any).user_steer_history : Array.isArray((run as any).userSteerHistory) ? (run as any).userSteerHistory : [],
    userSteerHistory: Array.isArray((run as any).userSteerHistory) ? (run as any).userSteerHistory : Array.isArray((run as any).user_steer_history) ? (run as any).user_steer_history : [],
    last_user_steer: (run as any).last_user_steer || (run as any).lastUserSteer || null,
    lastUserSteer: (run as any).lastUserSteer || (run as any).last_user_steer || null,
    test_agent_execution_plan: (run as any).test_agent_execution_plan || (run as any).testAgentExecutionPlan || null,
    testAgentExecutionPlan: (run as any).testAgentExecutionPlan || (run as any).test_agent_execution_plan || null,
    test_agent_execution_plan_summary: (run as any).test_agent_execution_plan_summary || (run as any).testAgentExecutionPlanSummary || null,
    testAgentExecutionPlanSummary: (run as any).testAgentExecutionPlanSummary || (run as any).test_agent_execution_plan_summary || null,
    test_agent_execution_plan_detail: (run as any).test_agent_execution_plan_detail || (run as any).testAgentExecutionPlanDetail || "",
    testAgentExecutionPlanDetail: (run as any).testAgentExecutionPlanDetail || (run as any).test_agent_execution_plan_detail || "",
    test_agent_review_summary: (run as any).test_agent_review_summary || (run as any).testAgentReviewSummary || (run as any).independent_review_summary || (run as any).independentReviewSummary || null,
    testAgentReviewSummary: (run as any).testAgentReviewSummary || (run as any).test_agent_review_summary || (run as any).independentReviewSummary || (run as any).independent_review_summary || null,
    independent_review_summary: (run as any).independent_review_summary || (run as any).independentReviewSummary || (run as any).test_agent_review_summary || (run as any).testAgentReviewSummary || null,
    independentReviewSummary: (run as any).independentReviewSummary || (run as any).independent_review_summary || (run as any).testAgentReviewSummary || (run as any).test_agent_review_summary || null,
    post_review_spot_check: (run as any).post_review_spot_check || (run as any).postReviewSpotCheck || null,
    postReviewSpotCheck: (run as any).postReviewSpotCheck || (run as any).post_review_spot_check || null,
    post_review_spot_check_summary: (run as any).post_review_spot_check_summary || (run as any).postReviewSpotCheckSummary || null,
    postReviewSpotCheckSummary: (run as any).postReviewSpotCheckSummary || (run as any).post_review_spot_check_summary || null,
    independent_review: Array.isArray((run as any).independent_review) ? (run as any).independent_review : Array.isArray((run as any).independentReview) ? (run as any).independentReview : [],
    independentReview: Array.isArray((run as any).independentReview) ? (run as any).independentReview : Array.isArray((run as any).independent_review) ? (run as any).independent_review : [],
    test_agent_report: (run as any).test_agent_report || (run as any).testAgentReport || null,
    testAgentReport: (run as any).testAgentReport || (run as any).test_agent_report || null,
    shadow_mode: run.shadow_mode,
    original_user_message: run.original_user_message,
    reasoning_loop: run.reasoning_loop,
    runtime_debug: buildGlobalAgentSessionDebug(run),
  };
}

function buildPublicGlobalStatusRun(input: { message: string; reply: string; sessionId: string; source: string; traceId?: string }) {
  const now = new Date().toISOString();
  const displayStream = {
    schema: "ccm-global-status-summary-v1",
    user_visible_text: input.reply,
    technical_details: [],
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: true },
  };
  return {
    id: `global-status-${crypto.randomBytes(5).toString("hex")}`,
    trace_id: ensureTraceId(input.traceId, "global-status"),
    session_id: input.sessionId,
    source: input.source,
    status: "completed",
    phase: "complete",
    explicit_write_authorization: false,
    created_at: now,
    updated_at: now,
    completed_at: now,
    deadline_at: now,
    max_steps: 1,
    steps: [{
      index: 1,
      at: now,
      state: "answer",
      message: input.reply,
      plan: [],
      decision: { intent: { category: "question", action_required: false, reason: "用户询问当前任务进展，直接读取已有状态摘要。" } },
    }],
    pending_tool: null,
    final_reply: input.reply,
    error: "",
    resume_count: 0,
    model_calls: 0,
    tool_calls: 0,
    client_effects: [],
    mission_id: "",
    supervisor_id: "",
    supervision_state: "",
    final_delivery_report: null,
    final_report: null,
    display_stream: displayStream,
    displayStream,
    workchain: null,
    decision_summary: { intent: { category: "question", action_required: false, confidence: 0.99, reason: "用户询问当前任务进展。" } },
    clarification_question: "",
    shadow_mode: false,
    original_user_message: input.message,
    reasoning_loop: null,
    runtime_debug: { technical_details: [] },
  };
}

const globalAgentFeishuChannel = createGlobalAgentFeishuChannel({
  GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
  appendGlobalActionAudit,
  appendGlobalAgentConversationMessage,
  appendTraceEvent,
  bindFeishuIdentifiersFromValue,
  bindFeishuTaskContext,
  cancelGlobalAgentRun,
  conversationTurnControl,
  createAgenticRuntime,
  ensureTraceId,
  feishuRuntimeEventPresentation,
  findWaitingGlobalAgentRun,
  formatMissionStatus,
  getConfigs,
  getFeishuMessageId,
  getGlobalAgentConversationMessages,
  getGlobalAgentRun,
  getGlobalDevelopmentMission,
  globalRunVisibleReply,
  isGlobalProgressStatusRequest,
  listGlobalAgentRuns,
  loadGroups,
  notifyFeishuTaskStage,
  recordFeishuInbound,
  resolveFeishuGlobalAgentSessionId,
  resumeGlobalAgentRun,
  runAgenticGlobalRequest,
  sendFeishuReportMessage,
  steerGlobalAgentRun,
})

const { normalizeFeishuEventPayload, verifyFeishuEventToken, extractFeishuMessageText, extractCcConnectHookText, processFeishuGlobalAgentMessage, processFeishuControlledMessage } = globalAgentFeishuChannel
type FeishuTurnCommand = { kind: "normal" | "steer" | "queue" | "stop"; message: string }
export function parseFeishuConversationTurnCommand(value: any): FeishuTurnCommand { return globalAgentFeishuChannel.parseFeishuConversationTurnCommand(value) }
export function startFeishuConversationTurnRecoveryForServer(baseUrl: string, ctx: CollabCtx) { return globalAgentFeishuChannel.startFeishuConversationTurnRecoveryForServer(baseUrl, ctx) }
export function stopFeishuConversationTurnRecoveryForServer() { return globalAgentFeishuChannel.stopFeishuConversationTurnRecoveryForServer() }
export function runFeishuConversationTurnCommandSelfTest() { return globalAgentFeishuChannel.runFeishuConversationTurnCommandSelfTest() }
const globalAgentApi = createGlobalAgentApi({
  GLOBAL_AGENT_TOOL_SPECS,
  GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
  GLOBAL_MANAGEMENT_ACTIONS,
  GLOBAL_MANAGEMENT_REQUIRED_PARAMS,
  GLOBAL_PET_AGENT_NAME,
  acquireIdempotency,
  appendGlobalActionAudit,
  applyGlobalAgentSupervisionSteer,
  buildAgentQualitySnapshot,
  buildAgenticContext,
  buildGlobalAgentEventUi,
  buildGlobalAgentGroupMemoryModelContext,
  buildGlobalAgentSessionDebug,
  buildGlobalAgentToolDefinitions,
  buildGlobalControlCenterSnapshot,
  buildGlobalDispatchStrategy,
  buildGlobalGroupMemoryContext,
  buildGlobalSystemHealth,
  buildPublicGlobalStatusRun,
  buildTraceReplaySuite,
  buildUploadedFilesContext,
  callLlm,
  cancelGlobalAgentRun,
  checkGlobalMissionSupervisorNow,
  classifyGlobalAgentUserSteer,
  classifyGlobalControlIntent,
  collectRequestBuffer,
  compactGlobalAgentSessionWithModel,
  completeGlobalAgentSupervision,
  completeIdempotency,
  controlGlobalMissionSupervisor,
  createAgenticRuntime,
  createGlobalDevelopmentMission,
  createRequirementEpicWithChildren,
  createMissionSupervisorRuntime,
  deleteGlobalAgentHook,
  deleteGlobalAgentPermissionRule,
  ensureTraceId,
  extractCcConnectHookText,
  extractFeishuMessageText,
  failIdempotency,
  formatMissionStatus,
  getAgentQualityPolicy,
  getConfigInfo,
  getConfigs,
  getFeishuMessageId,
  getGlobalAgentBackgroundOutput,
  getGlobalAgentRun,
  getGlobalDevelopmentMission,
  getGlobalMissionSupervisor,
  getGlobalMissionSupervisorSchedulerStatus,
  getIdempotencyRecord,
  getMultipartBoundary,
  getRequestBaseUrl,
  globalRunVisibleReply,
  ingestGlobalAgentConversation,
  buildGlobalAgentSessionContinuation,
  recordGlobalAgentSessionProviderUsage,
  ingestRequirementSources,
  isGlobalProgressStatusRequest,
  listGlobalAgentRuns,
  listGlobalMissionSupervisors,
  listTaskAgentSessions,
  loadFeishuConfig,
  loadGlobalAgentHooks,
  loadGlobalAgentPermissionRules,
  loadGlobalAgentBridgeStore,
  loadGlobalAgentHistoryStore,
  loadGroups,
  loadOrchestratorConfig,
  loadTasks,
  normalizeFeishuEventPayload,
  parseMultipart,
  pauseGlobalAgentRun,
  processedFeishuMessageIds,
  processFeishuControlledMessage,
  publicGlobalAgentRun,
  publicGlobalAgentRunSummary,
  refreshGlobalDevelopmentMissions,
  relayGlobalPetEvent,
  replayAgentTrace,
  resolveFeishuDestination,
  resolveFeishuGlobalAgentSessionId,
  resumeGlobalAgentRun,
  runAgentQualityCenterSelfTest,
  runAgentReasoningLoopSelfTest,
  runAgentRuntimeKernelSelfTest,
  runGlobalAgentLoopSelfTest,
  runGlobalAgentRuntimeSelfTest,
  runGlobalControlCenterSelfTest,
  runGlobalGroupMemoryContextSelfTest,
  runGlobalMissionSupervisorAsyncSelfTest,
  runGlobalMissionSupervisorSelfTest,
  runAgenticGlobalRequest,
  saveGlobalAgentBridgeStore,
  saveGlobalAgentHook,
  saveGlobalAgentPermissionRule,
  sendFeishuReportMessage,
  sendJson,
  setAgentQualityPolicy,
  startGlobalMissionSupervisor,
  steerGlobalAgentRun,
  syncGlobalAgentWebHistory,
  updateGlobalAgentSupervisionState,
  verifyFeishuEventToken,
  waitForIdempotencyResult,
})
export function handleGlobalAgentApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean {
  return globalAgentApi.handleGlobalAgentApi(pathname, req, res, parsed, ctx)
}

export const runGlobalAgentIntentSelfTest = createGlobalAgentIntentSelfTest({ GLOBAL_AGENT_HISTORY_LIMIT, GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN, buildGlobalAgentEventUi, buildGlobalAgentGroupMemoryModelContext, buildGlobalDirectDispatchHandoff, buildGlobalSingleProjectMissionPayload, compactGlobalTestAgentReviewRelayEvent, createActionBlockSafeStreamer, formatGlobalDevelopmentDispatchVisibleResult, formatGlobalTaskDispatchVisibleResult, formatMissionStatus, hasExplicitGlobalWriteAuthorization, inferLocalGlobalAction, isGlobalProgressStatusRequest, localActionToAgenticDecision, mergeGlobalAgentMessages, renderGlobalDirectGroupDispatchAcceptedSummary, renderGlobalDirectGroupWorkOrder, renderGlobalDirectProjectWorkOrder });

export { inferLocalGlobalAction, hasExplicitGlobalWriteAuthorization } from "./global-agent-local-intent";
export { callLlm, callGlobalModelWithRetry, runGlobalModelRetrySelfTest } from "./global-agent-model";
export { buildGlobalAgentEventUi } from "./global-agent-test-agent-display";
export { loadGlobalAgentBridgeStore, saveGlobalAgentBridgeStore, createGlobalAgentBridgeRequest, waitForGlobalAgentBridgeResult, getRequestBaseUrl, callLocalApi, postLocalApi, postLocalSseOrJsonApi } from "./global-agent-bridge";
