import { createGlobalAgentApi } from "./global-agent-api";
import { createGlobalAgentAgenticRuntime } from "./global-agent-agentic-runtime";
import { createGlobalAgentFeishuChannel } from "./global-agent-feishu-channel";
import { createGlobalAgentFeishuActions } from "./global-agent-feishu-actions";
import { createGlobalAgentDirectDispatchRuntime } from "./global-agent-direct-dispatch";
import { createGlobalAgentTestAgentRelay } from "./global-agent-test-agent-relay";
import { createGlobalAgentHistoryRuntime } from "./global-agent-history";
import { createGlobalAgentStatusRuntime } from "./global-agent-status";
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
import { createPetGenerationJob } from "../pets/pet-generation";
import { getConfigs, getConfigInfo, loadCronJobs, loadTasks, loadMcpTools, loadSkills, loadFeishuConfig } from "../../core/db";
import {
  loadGroups,
  createGlobalDevelopmentMission,
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
  compactGlobalAgentSession,
  getGlobalAgentMemoryPolicy,
  ingestGlobalAgentConversation,
  loadGlobalAgentMemory,
  recallGlobalAgentMemory,
  rebuildGlobalAgentMemory,
  recordGlobalMissionMemory,
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


type LocalIntentResult = {
  reply: string;
  action: any;
  intent?: {
    category: "conversation" | "question" | "analysis" | "execution" | "high_risk" | "ambiguous";
    goal: string;
    action_required: boolean;
    confidence: number;
    authorization_basis: "none" | "current_message" | "confirmation";
    reason: string;
  };
};

const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
const GLOBAL_PET_AGENT_NAME = "global-agent";
const GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK = "我已整理这次处理结果，是否已经交付以任务卡验收和最终总结为准。";
const GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK = "这轮处理结果已整理，最终是否交付以总结和验收结果为准。";

function compactPetText(value: any, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function globalVisibleText(value: any, fallback = "我正在处理当前请求。", max = 260) {
  return sanitizeMainAgentUserText(value, fallback, max);
}

function globalSafeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function globalUniqueStrings(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of globalSafeArray(list)) {
      const text = String(value || "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
  }
  return result;
}

function globalTestAgentCoverageItemKey(item: any = {}) {
  const evidence = Array.isArray(item.evidence) ? item.evidence.join("|") : "";
  return [item.check || item.criterion || "", item.status || "", item.missingReason || "", evidence].join("|") || JSON.stringify(item || {});
}

function globalUniqueCoverageItems(...lists: any[]) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const list of lists) {
    for (const item of globalSafeArray(list)) {
      const key = globalTestAgentCoverageItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function globalTestAgentCoverageLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    commands: "命令验证",
    command: "命令验证",
    build: "构建检查",
    unit_tests: "单元测试",
    http: "接口检查",
    api: "接口检查",
    browser_e2e: "浏览器流程",
    screenshots: "截图证据",
    console_errors: "控制台错误检查",
    independent_review: "独立复核",
  };
  return labels[value] || String(type || "检查项");
}

function globalTestAgentCoverageByStatus(report: any, key: "requiredCheckCoverage" | "acceptanceCoverage", status: "not_verified" | "unknown") {
  return globalSafeArray(report?.[key]).filter((item: any) => item?.status === status);
}

function globalTestAgentSummaryObjects(...values: any[]) {
  return values.filter(value => value && typeof value === "object" && !Array.isArray(value));
}

function globalTestAgentSummaryItems(summary: any, key: string, fallbackStatus: string) {
  return globalSafeArray(summary?.[key])
    .map((item: any) => ({ ...item, status: item?.status || fallbackStatus }));
}

function globalTestAgentSummaryByStatus(report: any, verdict: any, kind: "required" | "acceptance", status: "not_verified" | "unknown") {
  const summaryKey = kind === "required" ? "requiredCheckSummary" : "acceptanceSummary";
  const summarySnakeKey = kind === "required" ? "required_check_summary" : "acceptance_summary";
  const listKey = status === "not_verified" ? "notVerified" : "unknown";
  const summaries = globalTestAgentSummaryObjects(
    verdict?.[summaryKey],
    verdict?.[summarySnakeKey],
    report?.[summaryKey],
    report?.[summarySnakeKey],
    report?.verdict?.[summaryKey],
    report?.verdict?.[summarySnakeKey],
  );
  return summaries.flatMap(summary => globalTestAgentSummaryItems(summary, listKey, status));
}

function globalTestAgentAcceptanceWeakReason(item: any) {
  const strength = String(item?.matchStrength || item?.match_strength || "").toLowerCase();
  const source = String(item?.evidenceSource || item?.evidence_source || "").toLowerCase();
  const evidence = globalSafeArray(item?.evidence).filter(Boolean);
  if (strength === "fallback" || source === "single_criterion_report_status") return "只是从整体复核结果推断，建议补一条直接验证证据";
  if (strength === "none" || source === "none") return "缺少可直接对应到该验收条件的证据";
  if (!evidence.length && (strength || source)) return "缺少可展示的验收证据样本";
  return "";
}

function globalTestAgentWeakAcceptanceItems(report: any, verdict: any) {
  const summaryObjects = globalTestAgentSummaryObjects(
    verdict?.acceptanceSummary,
    verdict?.acceptance_summary,
    report?.acceptanceSummary,
    report?.acceptance_summary,
    report?.verdict?.acceptanceSummary,
    report?.verdict?.acceptance_summary,
  );
  const summaryItems = summaryObjects.flatMap(summary => globalTestAgentSummaryItems(summary, "verified", "verified"));
  const coverageItems = [
    ...globalSafeArray(verdict?.acceptanceCoverage),
    ...globalSafeArray(verdict?.acceptance_coverage),
    ...globalSafeArray(report?.acceptanceCoverage),
    ...globalSafeArray(report?.acceptance_coverage),
  ].filter((item: any) => item?.status === "verified");
  return globalUniqueCoverageItems(summaryItems, coverageItems)
    .filter((item: any) => !!globalTestAgentAcceptanceWeakReason(item));
}

function summarizeGlobalTestAgentCoverageGap(item: any, kind: "required" | "acceptance", state: "failed" | "unknown") {
  if (kind === "required") {
    const reason = item?.missingReason ? `：${globalVisibleText(item.missingReason, "", 140)}` : "";
    return `必检项：${globalTestAgentCoverageLabel(item?.check)}${state === "failed" ? "未覆盖" : "待确认"}${reason}`;
  }
  const criterion = globalVisibleText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
  return `验收条件${state === "failed" ? "未通过" : "待确认"}：${criterion}`;
}

function collectGlobalTestAgentCoverageGaps(report: any = {}, verdict: any = null) {
  const failedRequiredChecks = globalUniqueCoverageItems(
    verdict?.failedRequiredChecks,
    globalTestAgentCoverageByStatus(report, "requiredCheckCoverage", "not_verified"),
    globalTestAgentSummaryByStatus(report, verdict, "required", "not_verified")
  );
  const unknownRequiredChecks = globalUniqueCoverageItems(
    verdict?.unknownRequiredChecks,
    globalTestAgentCoverageByStatus(report, "requiredCheckCoverage", "unknown"),
    globalTestAgentSummaryByStatus(report, verdict, "required", "unknown")
  );
  const failedAcceptanceCriteria = globalUniqueCoverageItems(
    verdict?.failedAcceptanceCriteria,
    globalTestAgentCoverageByStatus(report, "acceptanceCoverage", "not_verified"),
    globalTestAgentSummaryByStatus(report, verdict, "acceptance", "not_verified")
  );
  const unknownAcceptanceCriteria = globalUniqueCoverageItems(
    verdict?.unknownAcceptanceCriteria,
    globalTestAgentCoverageByStatus(report, "acceptanceCoverage", "unknown"),
    globalTestAgentSummaryByStatus(report, verdict, "acceptance", "unknown")
  );
  const weakAcceptanceCriteria = globalTestAgentWeakAcceptanceItems(report, verdict);
  const failedLines = [
    ...failedRequiredChecks.map(item => summarizeGlobalTestAgentCoverageGap(item, "required", "failed")),
    ...failedAcceptanceCriteria.map(item => summarizeGlobalTestAgentCoverageGap(item, "acceptance", "failed")),
  ];
  const unknownLines = [
    ...unknownRequiredChecks.map(item => summarizeGlobalTestAgentCoverageGap(item, "required", "unknown")),
    ...unknownAcceptanceCriteria.map(item => summarizeGlobalTestAgentCoverageGap(item, "acceptance", "unknown")),
  ];
  const weakLines = weakAcceptanceCriteria.map((item: any) => {
    const criterion = globalVisibleText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
    const reason = globalVisibleText(globalTestAgentAcceptanceWeakReason(item), "建议补充直接验证证据。", 180);
    return `验收证据待确认：${criterion}（${reason}）`;
  });
  return {
    failedRequiredChecks,
    unknownRequiredChecks,
    failedAcceptanceCriteria,
    unknownAcceptanceCriteria,
    weakAcceptanceCriteria,
    failedLines: globalUniqueStrings(failedLines).slice(0, 8),
    unknownLines: globalUniqueStrings(unknownLines).slice(0, 8),
    weakLines: globalUniqueStrings(weakLines).slice(0, 8),
  };
}

function globalTestAgentFailureTypeLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    issue: "工作单问题",
    server: "服务启动",
    command: "命令验证",
    http: "接口检查",
    browser: "浏览器检查",
    required_check: "必检项",
    acceptance: "验收条件",
  };
  return labels[value] || "复核问题";
}

function scrubGlobalTestAgentEvidencePathText(value: any) {
  return String(value || "")
    .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
    .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
    .replace(/\bccm-test-agent-[\w-]+\b/gi, "TestAgent 结构化记录")
    .replace(/\b(?:browser_har|artifactDir|artifact_manifest|report_json|report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}

function collectGlobalTestAgentFailureItemsFromSource(source: any, depth = 0, seenObjects = new Set<any>()): any[] {
  if (!source || typeof source !== "object" || depth > 5) return [];
  if (seenObjects.has(source)) return [];
  seenObjects.add(source);
  if (Array.isArray(source)) {
    return source.flatMap(item => collectGlobalTestAgentFailureItemsFromSource(item, depth + 1, seenObjects));
  }
  const rows = [
    ...globalSafeArray(source.failureSummary),
    ...globalSafeArray(source.failure_summary),
  ].filter((item: any) => item && typeof item === "object" && (item.type || item.title || item.reason || item.nextAction || item.diagnostics));
  const nestedKeys = [
    "test_agent_report",
    "testAgentReport",
    "test_agent_verdict",
    "testAgentVerdict",
    "verdict",
    "technical",
    "delivery_report",
    "deliveryReport",
    "final_report",
    "finalReport",
    "receipt",
  ];
  for (const key of nestedKeys) {
    if (source[key]) rows.push(...collectGlobalTestAgentFailureItemsFromSource(source[key], depth + 1, seenObjects));
  }
  return rows;
}

function collectGlobalTestAgentFailureItems(report: any = {}, verdict: any = null) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of [
    ...collectGlobalTestAgentFailureItemsFromSource(report),
    ...collectGlobalTestAgentFailureItemsFromSource(verdict),
  ]) {
    const key = [
      item?.type || "",
      item?.project || "",
      item?.title || "",
      item?.reason || "",
      item?.nextAction || "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 8);
}

function summarizeGlobalTestAgentFailureItem(item: any) {
  const type = globalTestAgentFailureTypeLabel(item?.type);
  const project = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.project || ""), "", 70);
  const title = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.title || item?.reason || ""), "复核发现问题", 100);
  const reason = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.reason || item?.status || ""), "需要补齐或修复后再验收。", 160);
  const prefix = project ? `${project}：${type}` : type;
  return `${prefix}「${title}」未通过：${reason}`;
}

function summarizeGlobalTestAgentDiagnosticItem(item: any) {
  const diagnostics = globalSafeArray(item?.diagnostics);
  const nextActions = item?.nextAction ? [item.nextAction] : [];
  const [first] = [...diagnostics, ...nextActions]
    .map((value: any) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(value), "", 180))
    .filter(Boolean);
  if (!first) return "";
  const title = globalVisibleText(scrubGlobalTestAgentEvidencePathText(item?.title || item?.type), "该问题", 70);
  return `${title}：${first}`;
}

function collectGlobalTestAgentFailureSummaries(report: any = {}, verdict: any = null) {
  const items = collectGlobalTestAgentFailureItems(report, verdict);
  const failureLines = items.map(summarizeGlobalTestAgentFailureItem).filter(Boolean);
  const diagnosticLines = items.map(summarizeGlobalTestAgentDiagnosticItem).filter(Boolean);
  const hasRework = items.some((item: any) => /failed|fail|not_verified|rework|未通过|失败|返工/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || "")));
  const hasNeedsUser = items.some((item: any) => /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || "")));
  return {
    failureLines: globalUniqueStrings(failureLines).slice(0, 5),
    diagnosticLines: globalUniqueStrings(diagnosticLines).slice(0, 4),
    items,
    hasRework,
    hasNeedsUser,
  };
}

function globalRunVisibleReply(run: any, fallback = GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, max = 8000) {
  return buildGlobalVisibleReplyContent({
    value: run?.final_reply || run?.finalReply || fallback,
    rawSource: run?.final_report?.technical_content
      || run?.finalReport?.technicalContent
      || run?.final_delivery_report?.technical_content
      || run?.finalDeliveryReport?.technicalContent
      || run?.final_reply
      || run?.finalReply
      || "",
    fallback,
    status: run?.status,
    max,
  }).text;
}

function getGlobalPetToolState(toolName: string) {
  const name = String(toolName || "").toLowerCase();
  if (!name) return "working";
  if (/(inspect|list|query|search|recall|memory|read|status|diagnostic|probe)/.test(name)) return "carrying";
  if (/(review|verify|check|quality|git_review|diff|receipt|acceptance)/.test(name)) return "reviewing";
  if (/(recover|retry|repair|rollback|fix|debug|failure|watchdog)/.test(name)) return "debugging";
  if (/(orchestrate|create|send|dispatch|run|execute|task|mission|project|group|agent|cmd|write|manage|commit|merge|build)/.test(name)) return "building";
  return "working";
}

function getGlobalToolDisplayName(toolName: string) {
  const labels: Record<string, string> = {
    inspect_system: "读取系统状态",
    list_projects: "读取项目列表",
    inspect_project: "读取项目上下文",
    list_groups: "读取群聊列表",
    list_tasks: "读取任务列表",
    list_cron: "读取定时任务",
    query_knowledge: "查询知识库",
    query_global_memory: "查询全局记忆",
    manage_global_memory: "管理全局记忆",
    inspect_mission: "查询全局任务",
    inspect_supervision: "查询持续跟进状态",
    orchestrate_development: "创建跨项目开发任务",
    manage_supervision: "管理持续跟进",
    create_task: "创建开发任务",
    send_project_cmd: "发送项目执行指令",
    send_group_cmd: "发送协作群指令",
    manage_cron: "管理定时任务",
    manage_group: "管理群聊",
    manage_project: "管理项目",
    manage_task: "管理任务",
    manage_tool: "管理工具",
    git_review: "审查代码变更",
    git_commit: "提交代码",
    create_template: "创建模板",
    play_music: "播放音乐",
    toggle_pet: "控制桌面宠物",
    create_pet_from_image: "根据参考图创建宠物",
    navigate: "切换页面",
  };
  const key = String(toolName || "").trim();
  return labels[key] || key || "工具操作";
}

function buildGlobalAgentEventUi(event: any = {}) {
  const type = String(event.type || "");
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
  const toolLabel = getGlobalToolDisplayName(toolName);
  const text = (value: any, max = 220, fallback = "状态已更新。") => globalVisibleText(value, fallback, max);
  const dispatchSummary = event.dispatch_launch_summary || event.dispatchLaunchSummary || null;
  const clarificationSummary = event.clarification_summary || event.clarificationSummary || null;
  const confirmationSummary = event.confirmation_summary || event.confirmationSummary || null;
  const dispatchSummaryText = () => {
    const rows = Array.isArray(dispatchSummary?.rows) ? dispatchSummary.rows : [];
    const targets = rows
      .map((row: any) => [row.role || "执行 Agent", row.agent].filter(Boolean).join(" · "))
      .filter(Boolean)
      .slice(0, 4)
      .join("、");
    const parts = [
      dispatchSummary?.headline || (targets ? `我已把这次需求交给：${targets}。` : ""),
      dispatchSummary?.next_action ? `下一步：${dispatchSummary.next_action}` : "",
    ].filter(Boolean).join(" ");
    return text(parts, 280, "派发已发出，正在等待执行目标更新结果。");
  };
  const withCheckpoint = (ui: any) => ({
    ...ui,
    checkpoint: {
      schema: "ccm-main-agent-live-checkpoint-v1",
      id: event.id || `${type || "event"}:${event.run_id || event.trace_id || Date.now()}`,
      label: ui.title,
      detail: ui.text,
      status: ui.tone === "ok" ? "done" : ui.tone === "error" ? "failed" : ui.tone === "waiting" ? "warning" : "active",
      phase: ui.phase || "",
      at: event.at || new Date().toISOString(),
      run_id: event.run_id || "",
      source: "global-agent-stream",
    },
  });
  if (event.progress_checkpoint?.label || event.progressCheckpoint?.label) {
    const checkpoint = event.progress_checkpoint || event.progressCheckpoint;
    return withCheckpoint({
      phase: checkpoint.phase || "planning",
      tone: checkpoint.status === "done" ? "ok" : checkpoint.status === "failed" ? "error" : checkpoint.status === "warning" ? "waiting" : "running",
      title: checkpoint.label,
      text: text(checkpoint.detail || ""),
    });
  }
  if (type === "started") return withCheckpoint({ phase: "understanding", tone: "running", title: "理解需求", text: "正在理解你的消息，判断是普通对话还是需要执行操作。" });
  if (type === "user_steer_applied") {
    const steering = event.steering || event.user_steer || event.userSteer || {};
    const revised = steering.kind === "revise_goal" || event.replan_required === true;
    return withCheckpoint({
      phase: revised ? "planning" : "understanding",
      tone: "running",
      title: revised ? "目标调整已纳入" : "补充要求已纳入",
      text: text(event.message, 260, revised
        ? "新的目标边界已纳入，我会先重新核对计划再继续。"
        : "补充要求已纳入当前任务，我会带着它继续处理。"),
    });
  }
  if (type === "test_agent_execution_plan_ready") {
    const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
    const blocked = plan?.valid === false || String(event.status || "").toLowerCase() === "warn";
    return withCheckpoint({
      phase: "reviewing",
      tone: blocked ? "waiting" : "running",
      title: "TestAgent 复核计划",
      text: text(blocked
        ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
        : "TestAgent 已生成复核计划，我会按计划启动独立复核。"),
    });
  }
  if (type === "test_agent_review_ready") {
    const summary = event.test_agent_review_summary || event.testAgentReviewSummary || event.independent_review_summary || event.independentReviewSummary || {};
    const reviewRows = globalSafeArray(summary.rows)
      .filter((item: any) => /返工重点|排查建议|待处理|操作结果验证|浏览器会话恢复|边界与异常验证|重新复验/i.test(String(item || "")))
      .slice(0, 2)
      .join(" ");
    return withCheckpoint({
      phase: "reviewing",
      tone: summary.status === "passed" ? "ok" : ["needs_rework", "needs_recheck", "needs_user"].includes(summary.status) ? "waiting" : "running",
      title: summary.title || "独立复核",
      text: text([summary.headline || event.detail, reviewRows].filter(Boolean).join(" "), 360, "TestAgent 已提交独立复核结论，我会纳入最终验收。"),
    });
  }
  if (type === "plan_mode_ready") {
    const planMode = event.plan_mode || event.planMode || {};
    return withCheckpoint({
      phase: "planning",
      tone: "running",
      title: planMode.title || "执行前计划已整理",
      text: text(planMode.next_step || planMode.risk?.summary || event.message || "我已整理计划，会继续执行并在完成后总结。", 280, "我已整理计划，会继续执行并在完成后总结。"),
    });
  }
  if (type === "decision") {
    const state = String(event.step?.state || "");
    const message = text(event.step?.message || event.step?.decision?.intent?.reason || "");
    if (toolName) return withCheckpoint({ phase: "planning", tone: "running", title: "形成行动计划", text: message || `准备执行：${toolLabel}` });
    if (state === "answer" || state === "complete") return withCheckpoint({ phase: "answering", tone: "running", title: "组织回复", text: message || "已经形成回答，正在整理给你。" });
    if (state === "needs_confirmation") return withCheckpoint({ phase: "waiting", tone: "waiting", title: "需要确认", text: message || "需要你确认目标或授权范围。" });
    return withCheckpoint({ phase: "planning", tone: "running", title: "规划下一步", text: message || "正在规划下一步。" });
  }
  if (type === "tool_started") return withCheckpoint({ phase: "executing", tone: "running", title: "执行动作", text: `正在${toolLabel}。` });
  if (type === "dispatch_launch_summary") return withCheckpoint({ phase: "dispatching", tone: "ok", title: dispatchSummary?.title || "已派发的工作", text: dispatchSummaryText() });
  if (type === "tool_completed") return withCheckpoint({ phase: "reviewing", tone: "ok", title: "动作已返回", text: `${toolLabel}已返回结果，我正在检查。` });
  if (type === "tool_failed" || type === "tool_validation_failed") return withCheckpoint({ phase: "debugging", tone: "error", title: "执行遇到问题", text: text(event.reply || event.step?.message, 220, `${toolLabel}执行遇到问题，我正在重新判断下一步。`) });
  if (type === "clarification_required") return withCheckpoint({ phase: "waiting", tone: "waiting", title: clarificationSummary?.title || "需要补充信息", text: text(clarificationSummary?.question || clarificationSummary?.headline || event.reply || "需要你补充目标、范围或验收标准。") });
  if (type === "confirmation_required") return withCheckpoint({ phase: "waiting", tone: "waiting", title: confirmationSummary?.title || "等待授权确认", text: text(confirmationSummary?.headline || confirmationSummary?.question || event.reply || "这个操作需要你确认后才会继续。") });
  if (type === "paused") return withCheckpoint({ phase: "paused", tone: "waiting", title: "已暂停", text: text(event.reply || "全局 Agent 已暂停。") });
  if (type === "supervising") return withCheckpoint({ phase: "supervising", tone: "running", title: "持续跟进中", text: text(event.reply || "已经创建长期任务，正在跟进协作群/项目执行成员交付。") });
  if (type === "completed") return withCheckpoint({ phase: "completed", tone: "ok", title: "处理结果", text: text(event.reply || GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK) });
  if (type === "failed") return withCheckpoint({ phase: "failed", tone: "error", title: "失败", text: text(event.reply, 220, "任务没有完成，我已整理未完成原因和下一步。") });
  if (type === "cancelled") return withCheckpoint({ phase: "cancelled", tone: "waiting", title: "已取消", text: text(event.reply || "本轮处理已取消。") });
  return null;
}

function relayGlobalPetEvent(ctx: CollabCtx, event: any = {}, options: { message?: string; finalRun?: any; error?: string } = {}) {
  const type = String(event.type || "");
  const run = options.finalRun || event.run || {};
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
  const speech = (role: string, text: string, final = false) => ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role, text: compactPetText(text), final, source: "global" });
  if (type === "started") {
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在理解你的需求...", { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", "我正在理解你的需求...", false);
    return;
  }
  if (type === "decision") {
    const message = event.step?.message || event.step?.tool?.name || "正在规划下一步";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, toolName ? "planning" : "thinking", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "tool_started") {
    const message = toolName ? `正在执行：${getGlobalToolDisplayName(toolName)}` : "正在执行操作...";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, getGlobalPetToolState(toolName), message, { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "tool_completed") {
    const message = toolName ? `动作已返回：${getGlobalToolDisplayName(toolName)}` : "执行动作已返回";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "reviewing", message, { tab: "global-agent" }, 45 * 1000);
    speech("assistant", message, false);
    return;
  }
  if (type === "dispatch_launch_summary") {
    const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {};
    const message = globalVisibleText(summary.headline || summary.next_action, "派发已发出，正在等待执行目标更新结果。", 180);
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "tool_failed" || type === "tool_validation_failed") {
    const message = globalVisibleText(event.reply || event.step?.message, "工具执行遇到问题，我正在重新判断下一步。", 180);
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "debugging", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
    speech("error", message, true);
    return;
  }
  if (type === "clarification_required" || type === "confirmation_required" || type === "paused") {
    const summary = event.clarification_summary || event.clarificationSummary || event.confirmation_summary || event.confirmationSummary || null;
    const message = summary?.question || summary?.headline || event.reply || "全局 Agent 需要你确认后继续";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "waiting", compactPetText(message), { tab: "global-agent" }, 5 * 60 * 1000);
    speech("status", message, true);
    return;
  }
  if (type === "supervising") {
    const message = event.reply || "我正在跟进协作任务";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "completed" || options.finalRun) {
    const finalReply = buildGlobalVisibleReplyContent({
      value: options.finalRun?.final_reply || run.final_reply || event.reply || GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
      rawSource: options.finalRun?.final_report?.technical_content || run.final_report?.technical_content || event.reply || "",
      fallback: GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
      status: options.finalRun?.status || run.status || "completed",
      max: 8000,
    }).text;
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "happy", compactPetText(finalReply, 120), { tab: "global-agent" }, 90 * 1000);
    speech("assistant", finalReply, true);
    return;
  }
  if (type === "failed" || type === "cancelled" || options.error) {
    const message = globalVisibleText(options.finalRun?.final_reply || run.final_reply || event.reply, type === "cancelled" ? "任务已取消，当前状态已整理。" : "任务没有完成，我已整理未完成原因和下一步。", 180);
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "error", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
    speech("error", message, true);
  }
}

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
  ingestGlobalAgentConversation,
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

function loadGlobalAgentBridgeStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_BRIDGE_FILE)) return JSON.parse(fs.readFileSync(GLOBAL_AGENT_BRIDGE_FILE, "utf-8"));
  } catch {}
  try { return JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_BRIDGE_FILE}.bak`, "utf-8")); } catch {}
  return { requests: [] };
}

function saveGlobalAgentBridgeStore(store: any) {
  const cutoff = Date.now() - 30 * 60 * 1000;
  store.requests = (Array.isArray(store.requests) ? store.requests : [])
    .filter((item: any) => item.status === "pending" || Date.parse(item.updated_at || item.created_at || 0) > cutoff)
    .slice(-100);
  writeGlobalJsonAtomic(GLOBAL_AGENT_BRIDGE_FILE, store);
}

function createGlobalAgentBridgeRequest(text: string, sessionId: string) {
  const store = loadGlobalAgentBridgeStore();
  const request = {
    id: "gab_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex"),
    status: "pending",
    text,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.requests = [...(store.requests || []), request];
  saveGlobalAgentBridgeStore(store);
  return request;
}

async function waitForGlobalAgentBridgeResult(id: string, timeoutMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const store = loadGlobalAgentBridgeStore();
    const request = (store.requests || []).find((item: any) => item.id === id);
    if (request && request.status !== "pending") return request;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { id, status: "timeout", reply: "Web 全局 Agent 控制台暂未响应，请确认 CCM 页面处于打开状态后重试。" };
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

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripActionWords(value: string) {
  return normalizeText(value)
    .replace(/^(请|帮我|麻烦|给我|我要|我想|想要|可以)?/g, "")
    .replace(/(一下|下|吧|呢|谢谢)$/g, "")
    .trim();
}

const RANDOM_MUSIC_KEYWORD = "__random__";

function parseMusicKeyword(message: string) {
  const text = stripActionWords(message);
  const keyword = text
    .replace(/^(?:随机|随便|任意)?\s*(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索(?:一下)?(?:歌曲|歌)?)/, "")
    .replace(/^(?:一首|首|点|点儿|点歌)\s*/, "")
    .replace(/(?:的)?(音乐|歌曲|歌)$/g, "")
    .trim();
  if (!keyword || /^(随机|随便|任意|音乐|歌曲|歌|播放|播放音乐|听歌)$/.test(keyword)) return "";
  return keyword;
}

function findProjectName(message: string, projects: string[]) {
  const text = message.toLowerCase();
  return projects.find(project => text.includes(String(project).toLowerCase())) || "";
}

function findGroup(message: string, groups: any[]) {
  const text = message.toLowerCase();
  return groups.find(group => {
    const id = String(group?.id || "").toLowerCase();
    const name = String(group?.name || "").toLowerCase();
    return (id && text.includes(id)) || (name && text.includes(name));
  }) || null;
}

function findAllProjectNames(message: string, projects: string[]) {
  const text = message.toLowerCase();
  return projects.filter(project => text.includes(String(project).toLowerCase()));
}

function resolveImplicitCurrentProject(message: string, projects: string[]) {
  const text = normalizeText(message).toLowerCase();
  const hasImplicitProject = /(?:这个|当前|本|该)\s*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统)\s*(?:这个|当前|本|该)/.test(text);
  if (!hasImplicitProject) return "";
  const ccmProject = projects.find(project => /cc[-_]?connect|ccm/i.test(String(project)));
  if (ccmProject) return ccmProject;
  return projects.length === 1 ? projects[0] : "";
}

function findAllGroups(message: string, groups: any[]) {
  const text = message.toLowerCase();
  return groups.filter(group => {
    const id = String(group?.id || "").toLowerCase();
    const name = String(group?.name || "").toLowerCase();
    return (id && text.includes(id)) || (name && text.includes(name));
  });
}

function buildLocalDevelopmentTargets(message: string, projects: string[], groups: any[]) {
  const matchedGroups = findAllGroups(message, groups);
  const matchedProjects = findAllProjectNames(message, projects);
  const implicitProject = matchedProjects.length ? "" : resolveImplicitCurrentProject(message, projects);
  const requestsWholeWorkspace = /(?:所有|全部|全量|整个|全局|全项目|跨项目).*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统).*(?:全部|全量|整体|全局)/.test(message);
  const targets = [
    ...matchedGroups.map((group: any) => ({
      type: "group",
      group_id: group.id,
      reason: "用户明确提到开发群聊「" + (group.name || group.id) + "」",
      task: message,
    })),
    ...matchedProjects.map((project: string) => ({
      type: "project",
      project,
      reason: "用户明确提到项目「" + project + "」",
      task: message,
    })),
    ...(implicitProject ? [{
      type: "project",
      project: implicitProject,
      reason: "用户使用“当前/这个项目”指代，已解析到项目「" + implicitProject + "」",
      task: message,
    }] : []),
  ];
  if (targets.length > 0) return targets;
  if (requestsWholeWorkspace && projects.length > 0) {
    return projects.map((project: string) => ({
      type: "project",
      project,
      reason: "用户明确要求覆盖整个项目工作区",
      task: message,
    }));
  }
  return [];
}

/**
 * 仅用于大模型不可用时的保底判断。正常聊天路径由大模型决定是否产生 action，
 * 这里不能因为出现“知识库 / 实现 / 优化”等主题词就自动创建项目任务。
 */
function hasExplicitDevelopmentExecutionIntent(message: string) {
  const text = normalizeText(message);
  if (!text) return false;
  if (/(?:只是|仅仅|只想|先)(?:问问|了解|咨询|讨论|解释|分析)|不要(?:执行|修改|创建|派发)|不用(?:执行|修改|创建|派发)/.test(text)) return false;

  const hasDevelopmentAction = /(实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
  if (!hasDevelopmentAction) return false;

  const isExplanatoryQuestion = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能不能|可不可以|是否|有哪些|有什么)/.test(text);
  const explicitDirective = /^(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text)
    || /(?:请(?!问)|帮我|麻烦|给我|需要你|我要你|直接|立即|马上|开始).*(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);

  return explicitDirective && !isExplanatoryQuestion;
}

function chineseNumberToInt(value: string) {
  const text = String(value || "").trim();
  if (!text) return NaN;
  if (/^\d+$/.test(text)) return Number(text);
  const map: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === "十") return 10;
  const tenIdx = text.indexOf("十");
  if (tenIdx >= 0) {
    const left = text.slice(0, tenIdx);
    const right = text.slice(tenIdx + 1);
    return (left ? map[left] || 0 : 1) * 10 + (right ? map[right] || 0 : 0);
  }
  return map[text] ?? NaN;
}

function normalizeCronHour(raw: string, text: string) {
  let hour = chineseNumberToInt(raw);
  if (Number.isNaN(hour)) return NaN;
  if (/下午|晚上|傍晚/.test(text) && hour < 12) hour += 12;
  if (/中午/.test(text) && hour < 11) hour += 12;
  return Math.max(0, Math.min(23, hour));
}

function guessCronSchedule(message: string) {
  const text = normalizeText(message);
  const everyHour = /每(个)?小时|每小时/.test(text);
  if (everyHour) return "0 * * * *";

  const minuteMatch = text.match(/每(?:隔)?(\d{1,2})\s*分钟/);
  if (minuteMatch) return `*/${Math.max(1, Math.min(59, Number(minuteMatch[1])))} * * * *`;

  const dayHourMatch = text.match(/(?:每天|每日)(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/)
    || text.match(/(?:早上|上午|中午|下午|晚上|傍晚)\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
  if (dayHourMatch) {
    const hour = normalizeCronHour(dayHourMatch[1], text);
    if (!Number.isNaN(hour)) return `0 ${hour} * * *`;
  }

  const weekMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const weekMatch = text.match(/每(?:周|星期)([一二三四五六日天])(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
  if (weekMatch) {
    const hour = normalizeCronHour(weekMatch[2], text);
    if (!Number.isNaN(hour)) return `0 ${hour} * * ${weekMap[weekMatch[1]]}`;
  }

  const cronMatch = text.match(/(?:cron|表达式)\s*[:：]?\s*([0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+)/i);
  if (cronMatch) return cronMatch[1].trim();
  return "";
}

function inferLocalConversationFallback(message: string): LocalIntentResult | null {
  const compact = normalizeText(message).replace(/[。！？!?]+$/g, "").trim().toLowerCase();
  const greeting = /^(?:你好|您好|嗨|哈喽|嘿|在吗|早上好|上午好|下午好|晚上好|hi|hello|hey)(?:呀|啊|哦|哟|啦)?$/i.test(compact);
  const identityQuestion = /^(?:你是谁|你是什么|你能做什么|你会做什么|介绍一下你自己)$/i.test(compact);
  if (!greeting && !identityQuestion) return null;
  const reply = identityQuestion
    ? "我是全局助手，可以回答问题，也可以在你明确提出任务时协调项目、群聊和执行成员完成工作。"
    : compact === "在吗"
      ? "在的，有什么我可以帮你的吗？"
      : "你好！有什么我可以帮你的吗？";
  return {
    reply,
    action: null,
    intent: {
      category: "conversation",
      goal: identityQuestion ? "了解全局助手" : "普通问候",
      action_required: false,
      confidence: 1,
      authorization_basis: "none",
      reason: identityQuestion ? "普通身份问答" : "普通问候",
    },
  };
}

function inferLocalGlobalAction(message: string, projects: string[], groups: any[], resources: any = {}): LocalIntentResult | null {
  const text = normalizeText(message);
  if (!text) return null;
  const conversationFallback = inferLocalConversationFallback(text);
  if (conversationFallback) return conversationFallback;
  const explicitWriteAuthorization = hasExplicitGlobalWriteAuthorization(text);
  const explicitReadRequest = /^(?:请)?(?:查看|列出|检查|打开|进入|跳转|搜索|查询)|(?:系统|任务|项目|群聊|定时任务).*(?:当前状态|运行状态|列表)/.test(text);
  const consultationOnly = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|建议|觉得|能否|能不能|可不可以|是否|会不会|有哪些|有什么)/.test(text);
  if (/(?:不要|不用|先别|暂时别).*(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text)) return null;
  if (consultationOnly && !explicitWriteAuthorization && !explicitReadRequest) return null;
  const lower = text.toLowerCase();
  const matchedProject = findProjectName(text, projects);
  const matchedGroup = findGroup(text, groups);
  const cronJobs = Array.isArray(resources.cronJobs) ? resources.cronJobs : [];
  const tasks = Array.isArray(resources.tasks) ? resources.tasks : [];
  const mcpTools = Array.isArray(resources.mcpTools) ? resources.mcpTools : [];
  const skills = Array.isArray(resources.skills) ? resources.skills : [];
  const matchedCron = cronJobs.find((item: any) => text.includes(String(item.id || "")) || text.includes(String(item.name || "")));
  const matchedTask = tasks.find((item: any) => text.includes(String(item.id || "")) || (item.title && text.includes(String(item.title))));
  const matchedMcp = mcpTools.find((item: any) => item.name && text.includes(String(item.name)));
  const matchedSkill = skills.find((item: any) => item.name && text.includes(String(item.name)));

  if (/(系统状态|运行状态|健康状态|检查系统|系统概况|当前状态)/.test(text) && !/(定时任务|计划任务|定时执行|每天|每日|每周|每小时|创建|新建|添加)/.test(text)) {
    return {
      reply: "我会检查项目、群聊、任务队列、定时调度和工具运行状态。",
      action: { type: "system_status", params: { operation: "inspect" } }
    };
  }

  if (/定时任务|计划任务|定时执行|cron|每(天|周|星期|小时|隔)/i.test(text) && /(查看|列出|创建|新建|添加|启用|开启|暂停|禁用|立即运行|执行一次|删除|修改|更新|定时|每)/.test(text)) {
    const operation = /(创建|新建|添加)/.test(text) ? "create"
      : /删除/.test(text) ? "delete"
      : /(暂停|禁用|关闭)/.test(text) ? "disable"
      : /(启用|开启|恢复)/.test(text) ? "enable"
      : /(立即运行|执行一次|马上执行)/.test(text) ? "run"
      : /(修改|更新)/.test(text) ? "update"
      : "list";
    if (["create", "update"].includes(operation) && !matchedGroup && !matchedProject) return null;
    const schedule = guessCronSchedule(text);
    const targetType = matchedGroup || !matchedProject ? "group" : "project";
    const group = matchedGroup || groups[0] || null;
    const project = matchedProject || projects[0] || "";
    const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
    return {
      reply: "我会执行定时任务管理操作：" + operation + "。",
      action: {
        type: "manage_cron",
        params: {
          operation,
          id: matchedCron?.id || "",
          name: operation === "create" ? (prompt.slice(0, 28) || "全局助手定时任务") : (matchedCron?.name || ""),
          schedule: schedule || undefined,
          prompt: operation === "create" ? prompt : undefined,
          target_type: operation === "create" ? targetType : undefined,
          group_id: operation === "create" && targetType === "group" ? group?.id : undefined,
          project: operation === "create" && targetType === "project" ? project : undefined,
        }
      }
    };
  }

  if (/任务/.test(text) && /(查看任务|任务列表|暂停|继续|恢复|重试|重新执行|删除任务|取消任务|加入队列)/.test(text)) {
    const operation = /(删除|取消)/.test(text) ? "delete"
      : /暂停/.test(text) ? "pause"
      : /重试|重新执行/.test(text) ? "retry"
      : /加入队列/.test(text) ? "queue"
      : /继续/.test(text) ? "continue"
      : /恢复/.test(text) ? "resume"
      : "list";
    return {
      reply: "我会执行开发任务管理操作：" + operation + "。",
      action: { type: "manage_task", params: { operation, id: matchedTask?.id || "", message: text } }
    };
  }

  if (/(群聊|项目组)/.test(text) && /(创建|新建|重命名|改名|添加成员|移除成员|删除群聊|删除项目组|查看群聊|群聊列表)/.test(text)) {
    const operation = /(删除群聊|删除项目组)/.test(text) ? "delete"
      : /添加成员/.test(text) ? "add_member"
      : /移除成员/.test(text) ? "remove_member"
      : /(重命名|改名)/.test(text) ? "rename"
      : /(创建|新建)/.test(text) ? "create"
      : "list";
    return {
      reply: "我会执行群聊管理操作：" + operation + "。",
      action: {
        type: "manage_group",
        params: { operation, id: matchedGroup?.id || "", name: matchedGroup?.name || stripActionWords(text).slice(0, 40), project: matchedProject || "" }
      }
    };
  }

  if (/(MCP|mcp|Skill|skill|技能)/.test(text) && /(查看|列表|状态|重载|重新加载|删除|移除|创建|添加)/.test(text)) {
    const kind = /(Skill|skill|技能)/.test(text) ? "skill" : "mcp";
    const operation = /(删除|移除)/.test(text) ? "delete"
      : /(重载|重新加载)/.test(text) ? "reload"
      : /(创建|添加)/.test(text) ? "create"
      : /状态/.test(text) ? "status"
      : "list";
    return {
      reply: "我会执行 " + kind.toUpperCase() + " 管理操作：" + operation + "。",
      action: {
        type: "manage_tool",
        params: { operation, kind, name: kind === "mcp" ? matchedMcp?.name || "" : matchedSkill?.name || "" }
      }
    };
  }

  if (/(项目|Agent|agent)/.test(text) && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(项目列表|查看项目|列出项目|创建项目|新建项目|启动|运行|拉起|开启|停止|关闭|停掉|结束|删除项目|移除项目|修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text)) {
    const operation = /(创建项目|新建项目)/.test(text) ? "create"
      : /(删除项目|移除项目)/.test(text) ? "delete"
      : /(启动|运行|拉起|开启)/.test(text) ? "start"
      : /(停止|关闭|停掉|结束)/.test(text) ? "stop"
      : /(修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text) ? "update"
      : "list";
    const agentMatch = text.match(/(claudecode|claude|codex|cursor|gemini|qoder)/i);
    const nameMatch = text.match(/(?:创建项目|新建项目|创建一个项目|新建一个项目)\s*[「"']?([^，。,\.\s"'」]+)/);
    const workDirMatch = text.match(/(?:目录|路径|work_dir|工作目录)\s*[:：]?\s*([A-Za-z]:\\[^，。\n]+|\/[^，。\s]+)/i);
    const project = matchedProject || (operation === "create" ? (nameMatch?.[1] || "") : "");
    return {
      reply: "我会执行项目管理操作：" + operation + "。",
      action: {
        type: "manage_project",
        params: {
          operation,
          project,
          name: operation === "create" ? project : matchedProject,
          work_dir: workDirMatch?.[1] || undefined,
          agent: agentMatch?.[1] || undefined,
        }
      }
    };
  }

  if (/(打开|开启|启动|唤醒|显示).*(宠物|桌宠)|(?:宠物|桌宠).*(打开|开启|启动|唤醒|显示)/.test(text)) {
    return {
      reply: "我识别到你要打开桌面宠物，正在调起宠物 Agent。",
      action: { type: "toggle_pet", params: { action: "open" } }
    };
  }
  if (/(关闭|隐藏|退出).*(宠物|桌宠)|(?:宠物|桌宠).*(关闭|隐藏|退出)/.test(text)) {
    return {
      reply: "我识别到你要关闭桌面宠物，正在执行。",
      action: { type: "toggle_pet", params: { action: "close" } }
    };
  }

  const pageMap: Array<[RegExp, string, string]> = [
    [/音乐|播放器|听歌/, "music", "音乐播放"],
    [/宠物|桌宠/, "pets", "宠物空间"],
    [/项目管理|项目列表/, "projects", "项目管理"],
    [/群聊|项目组|协作/, "groups", "群聊协作"],
    [/任务派发|任务列表|开发任务/, "tasks", "任务派发"],
    [/定时任务|计划任务|cron/i, "cron", "定时任务"],
    [/终端|控制台/, "terminal", "内置终端"],
    [/搜索|查对话/, "search", "对话搜索"],
    [/设置|配置/, "settings", "系统设置"],
  ];
  if (/(打开|进入|跳转|去|查看).*(页面|面板|模块|列表|空间|设置|控制台)?/.test(text)) {
    const page = pageMap.find(([pattern]) => pattern.test(text));
    if (page) {
      return {
        reply: `我会为你打开「${page[2]}」页面。`,
        action: { type: "navigate", params: { tab: page[1] } }
      };
    }
  }

  if (matchedProject && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
    return {
      reply: `我会启动项目「${matchedProject}」。`,
      action: { type: "manage_project", params: { operation: "start", project: matchedProject } }
    };
  }

  if (matchedProject && /(?:停止|关闭|停掉|结束)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:停止|关闭|停掉|结束)/.test(text)) {
    return {
      reply: `我会停止项目「${matchedProject}」。`,
      action: { type: "manage_project", params: { operation: "stop", project: matchedProject } }
    };
  }

  if (/(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
    const keyword = parseMusicKeyword(text);
    if (keyword) {
      return {
        reply: `我会交给音乐 Agent 搜索并播放「${keyword}」。`,
        action: { type: "play_music", params: { keyword } }
      };
    }
    return {
      reply: "我会交给音乐 Agent 随机播放一首本地音乐。",
      action: { type: "play_music", params: { keyword: RANDOM_MUSIC_KEYWORD, random: true } }
    };
  }

  if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
    if (!matchedGroup && !matchedProject) return null;
    const schedule = guessCronSchedule(text);
    const targetType = matchedGroup ? "group" : "project";
    const group = matchedGroup || null;
    const project = matchedProject || "";
    const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
    return {
      reply: schedule
        ? `我会创建一个定时任务，周期是 \`${schedule}\`。`
        : "我可以创建定时任务，但还需要明确周期；我先把识别到的任务内容整理好。",
      action: {
        type: "create_cron_task",
        params: {
          name: prompt.slice(0, 28) || "全局助手定时任务",
          schedule,
          prompt,
          target_type: targetType,
          group_id: targetType === "group" ? group?.id : undefined,
          project: targetType === "project" ? project : undefined,
        }
      }
    };
  }

  const isDevelopmentRequest = hasExplicitDevelopmentExecutionIntent(text);
  if (isDevelopmentRequest) {
    const targets = buildLocalDevelopmentTargets(text, projects, groups);
    if (targets.length > 0) {
      return {
        reply: "我会建立跨项目执行计划，并把任务交给 " + targets.length + " 个执行目标持续跟进。",
        action: {
          type: "orchestrate_development",
          params: {
            title: text.slice(0, 60),
            business_goal: text,
            scope: "由全局 Agent结合项目和群聊成员关系识别影响范围",
            documents: text,
            acceptance: "所有群聊主 Agent和项目 Agent子任务必须通过代码变更与验证检查，全局 Agent再汇总报告完成",
            execution_order: "parallel",
            targets,
          }
        }
      };
    }
  }

  if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
    const group = matchedGroup || null;
    if (group) {
      return {
        reply: `我会把这项工作交给协作群「${group.name || group.id}」继续拆分和跟进。`,
        action: {
          type: "send_group_cmd",
          params: { group_id: group.id, message: text, target_project: "coordinator" }
        }
      };
    }
  }

  if (matchedProject && /(修改|修复|改一下|处理|实现|新增|删除|优化|项目\s*agent|项目agent)/.test(text)) {
    return {
      reply: `我会把这项工作交给项目「${matchedProject}」的执行成员。`,
      action: { type: "send_project_cmd", params: { project: matchedProject, message: text } }
    };
  }

  if (/创建|新建|派发/.test(text) && /任务|需求|开发/.test(text)) {
    const group = matchedGroup || null;
    if (!group) return null;
    return {
      reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
      action: {
        type: "create_task",
        params: {
          title: text.slice(0, 36),
          business_goal: text,
          scope: text,
          group_id: group?.id,
          acceptance: "子 Agent 提供结果说明；主 Agent 输出最终报告"
        }
      }
    };
  }

  return null;
}

function createActionBlockSafeStreamer(emit: (text: string) => void) {
  const actionMarker = "```action";
  const fenceMarker = "```";
  let buffer = "";
  let insideAction = false;

  const drain = (final = false) => {
    while (buffer) {
      if (insideAction) {
        const closeIndex = buffer.indexOf(fenceMarker);
        if (closeIndex >= 0) {
          buffer = buffer.slice(closeIndex + fenceMarker.length);
          insideAction = false;
          continue;
        }
        if (final) buffer = "";
        else buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
        return;
      }

      const actionIndex = buffer.indexOf(actionMarker);
      if (actionIndex >= 0) {
        if (actionIndex > 0) emit(buffer.slice(0, actionIndex));
        buffer = buffer.slice(actionIndex + actionMarker.length);
        insideAction = true;
        continue;
      }

      if (final) {
        emit(buffer);
        buffer = "";
        return;
      }

      const safeLength = Math.max(0, buffer.length - (actionMarker.length - 1));
      if (safeLength > 0) {
        emit(buffer.slice(0, safeLength));
        buffer = buffer.slice(safeLength);
      }
      return;
    }
  };

  return {
    push(text: string) {
      buffer += String(text || "");
      drain(false);
    },
    finish() {
      drain(true);
    },
  };
}

export function runGlobalAgentIntentSelfTest() {
  const projects = ["frontend-app", "backend-api", "cc-connect-test"];
  const groups = [{ id: "dev-group", name: "开发群", members: projects.map(project => ({ project })) }];
  const cases = [
    { message: "知识库是怎么实现的？", expected: null, authorized: false },
    { message: "知识库有哪些可以优化的地方？", expected: null, authorized: false },
    { message: "请介绍一下当前知识库的工作原理", expected: null, authorized: false },
    { message: "我想了解知识库压缩是怎么做的", expected: null, authorized: false },
    { message: "如果要给 frontend-app 加支付，你建议怎么拆分？", expected: null, authorized: false },
    { message: "你觉得 backend-api 还有哪些可以优化？", expected: null, authorized: false },
    { message: "不要执行，只分析怎么修复 backend-api 的问题", expected: null, authorized: false },
    { message: "Cursor 能不能支持这个项目？", expected: null, authorized: false },
    { message: "关于项目记忆，给我讲讲实现原理", expected: null, authorized: false },
    { message: "测试任务会不会重复创建？", expected: null, authorized: false },
    { message: "帮我优化一下", expected: null, authorized: true },
    { message: "给项目加一个支付功能", expected: null, authorized: true },
    { message: "创建每天检查一次的定时任务", expected: null, authorized: true },
    { message: "请优化整个项目的知识库检索，并完成测试", expected: "orchestrate_development", expectedTargetCount: projects.length, authorized: true },
    { message: "请修改当前项目的 README 并运行测试", expected: "orchestrate_development", expectedTargetCount: 1, authorized: true },
    { message: "修复 backend-api 的知识库检索错误", expected: "orchestrate_development", authorized: true },
    { message: "请给 frontend-app 新增登录页面并运行测试", expected: "orchestrate_development", authorized: true },
    { message: "直接运行 backend-api 的测试", expected: "orchestrate_development", authorized: true },
    { message: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", expected: "send_project_cmd", authorized: true },
    { message: "给开发群派发任务，修复登录问题", expected: "send_group_cmd", authorized: true },
    { message: "创建一个每天早上八点检查 backend-api 的定时任务", expected: "manage_cron", authorized: true },
    { message: "启动 backend-api 项目", expected: "manage_project", authorized: true },
    { message: "打开系统设置页面", expected: "navigate" },
    { message: "播放周杰伦的晴天", expected: "play_music", authorized: true },
    { message: "播放音乐", expected: "play_music", authorized: true },
    { message: "随便放一首歌", expected: "play_music", authorized: false },
  ];
  const results = cases.map(item => {
    const result = inferLocalGlobalAction(item.message, projects, groups, {});
    const actual = result?.action?.type || null;
    const targetCount = Array.isArray(result?.action?.params?.targets) ? result.action.params.targets.length : 0;
    const targetCountPassed = item.expectedTargetCount === undefined || targetCount === item.expectedTargetCount;
    const actualAuthorized = hasExplicitGlobalWriteAuthorization(item.message);
    const authorizationPassed = item.authorized === undefined || actualAuthorized === item.authorized;
    return { ...item, actual, targetCount, actualAuthorized, passed: actual === item.expected && targetCountPassed && authorizationPassed };
  });
  const visibleChunks: string[] = [];
  const safeStreamer = createActionBlockSafeStreamer(text => visibleChunks.push(text));
  for (const chunk of ["这是自然回答。\n`", "``act", "ion\n{\"type\":\"navigate\"}\n`", "``"]) safeStreamer.push(chunk);
  safeStreamer.finish();
  const visibleReply = visibleChunks.join("");
  const actionBlockHidden = visibleReply === "这是自然回答。\n";
  const modelUnavailableDelegation = localActionToAgenticDecision({ reply: "准备派发", action: { type: "send_group_cmd", params: { group_id: "dev-group", message: "修复登录" } } }, { steps: [], user_message: "给开发群派发修复登录", explicit_write_authorization: true } as any);
  const fallbackDelegationCannotWrite = modelUnavailableDelegation?.state === "answer" && !modelUnavailableDelegation.tool;
  const localGroupDispatch = inferLocalGlobalAction("给开发群派发任务，修复登录问题", projects, groups, {});
  const localGroupDispatchUsesSchema = localGroupDispatch?.action?.params?.group_id === "dev-group" && !("groupId" in (localGroupDispatch?.action?.params || {}));
  const localProjectDispatch = inferLocalGlobalAction("我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", projects, groups, {});
  const localDevelopmentDispatch = inferLocalGlobalAction("请优化整个项目的知识库检索，并完成测试", projects, groups, {});
  const localDispatchRepliesFriendly = localGroupDispatch?.reply?.includes("协作群「开发群」")
    && !/主\s*Agent|项目\s*Agent/.test(localGroupDispatch.reply)
    && localProjectDispatch?.reply?.includes("项目「backend-api」的执行成员")
    && !/主\s*Agent|项目\s*Agent/.test(localProjectDispatch.reply)
    && localDevelopmentDispatch?.reply?.includes("跨项目执行计划")
    && !localDevelopmentDispatch?.reply?.includes("全局总控流程");
  const modelUnavailableCronCreate = localActionToAgenticDecision({ reply: "准备创建定时任务", action: { type: "manage_cron", params: { operation: "create", name: "检查 backend-api", schedule: "0 8 * * *", prompt: "检查 backend-api" } } }, { steps: [], user_message: "创建一个每天早上八点检查 backend-api 的定时任务", explicit_write_authorization: true } as any);
  const fallbackCronCannotWrite = modelUnavailableCronCreate?.state === "answer" && !modelUnavailableCronCreate.tool;
  const modelUnavailableAmbiguousWrite = localActionToAgenticDecision({ reply: "准备派发", action: { type: "create_task", params: { title: "优化", business_goal: "帮我优化一下" } } }, { steps: [], user_message: "帮我优化一下", explicit_write_authorization: true } as any);
  const ambiguousFallbackCannotWrite = modelUnavailableAmbiguousWrite?.state === "answer" && !modelUnavailableAmbiguousWrite.tool;
  const modelUnavailableObservationSummary = localActionToAgenticDecision(
    { reply: "查询完成", action: { type: "system_status", params: {} } },
    { steps: [{ tool: { name: "inspect_system" }, observation: { success: true, summary: "CCM_AGENT_RECEIPT done", trace_id: "trace-should-hide" } }], user_message: "查看系统状态", explicit_write_authorization: false } as any
  );
  const fallbackObservationFriendly = modelUnavailableObservationSummary?.state === "complete"
    && !/[{}"]|trace_id|CCM_AGENT_RECEIPT/i.test(modelUnavailableObservationSummary.message || "")
    && /查询完成|查询已返回|已返回结果|技术详情/.test(modelUnavailableObservationSummary.message || "")
    && !/操作已完成|完成信息/.test(modelUnavailableObservationSummary.message || "");
  const localGreeting = inferLocalGlobalAction("你好", projects, groups, {});
  const modelUnavailableGreeting = localActionToAgenticDecision(
    localGreeting,
    { steps: [], user_message: "你好", explicit_write_authorization: false } as any,
  );
  const fallbackGreetingStaysConversation = modelUnavailableGreeting?.state === "answer"
    && modelUnavailableGreeting?.intent?.category === "conversation"
    && modelUnavailableGreeting?.intent?.action_required === false
    && modelUnavailableGreeting?.message === "你好！有什么我可以帮你的吗？"
    && !modelUnavailableGreeting.tool;
  const boundedGroupMemoryModelContext = buildGlobalAgentGroupMemoryModelContext({
    schema: "ccm-global-group-memory-context-v1",
    generated_at: "2026-07-12T00:00:00.000Z",
    query: "检查群聊记忆",
    total_group_count: 1,
    selected_group_count: 1,
    memory_policy: { use: "must_consider_relevant_groups" },
    groups: [{ group_id: "group-1", group_name: "开发群", score: 10, typed_memory: { raw: "x".repeat(80_000) } }],
    rendered_text: `群聊记忆摘要\n${"摘要内容".repeat(8_000)}`,
  }, { maxChars: 12_000 });
  const groupMemoryModelContextBounded = boundedGroupMemoryModelContext.schema === "ccm-global-group-memory-model-context-v1"
    && boundedGroupMemoryModelContext.rendered_text.length <= 12_000
    && boundedGroupMemoryModelContext.context_budget.truncated === true
    && boundedGroupMemoryModelContext.context_budget.source_bytes > 80_000
    && !JSON.stringify(boundedGroupMemoryModelContext).includes('"raw"');
  const staleLocalHistory = Array.from({ length: GLOBAL_AGENT_HISTORY_LIMIT }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `旧前端历史 ${index}`,
    timestamp: `2026-07-07T07:${String(index).padStart(2, "0")}:00.000Z`,
  }));
  const mergedGlobalHistory = mergeGlobalAgentMessages(
    [
      ...staleLocalHistory,
      { role: "assistant", content: "你派发到群聊主 Agent 的任务已经通过验收。", timestamp: "2026-07-07T09:00:00.000Z" },
    ],
    staleLocalHistory
  );
  const globalHistoryMergePreservesBackendCompletion = mergedGlobalHistory.length === GLOBAL_AGENT_HISTORY_LIMIT
    && mergedGlobalHistory.some(item => item.content.includes("通过验收"));
  const directGroupDispatch = buildGlobalDirectDispatchHandoff({
    kind: "group",
    group: groups[0],
    targetProject: "coordinator",
    message: "修复登录问题并完成测试",
    originalText: "给开发群派发任务，修复登录问题并完成测试",
    traceId: "trace-direct-group",
  });
  const directGroupMessage = renderGlobalDirectGroupWorkOrder({
    group: groups[0],
    targetProject: "coordinator",
    message: "修复登录问题并完成测试",
    originalText: "给开发群派发任务，修复登录问题并完成测试",
    handoff: directGroupDispatch.handoff,
  });
  const directProjectDispatch = buildGlobalDirectDispatchHandoff({
    kind: "project",
    project: "backend-api",
    message: "运行测试并总结失败项",
    originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
    traceId: "trace-direct-project",
  });
  const directProjectMessage = renderGlobalDirectProjectWorkOrder({
    project: "backend-api",
    message: "运行测试并总结失败项",
    originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
    handoff: directProjectDispatch.handoff,
  });
  const supervisedSingleProjectPayload = buildGlobalSingleProjectMissionPayload({
    project: "backend-api",
    message: "修复登录恢复并运行测试",
    originalText: "给 backend-api 修复登录恢复并完成独立验收",
    traceId: "trace-single-project-supervision",
    globalRunId: "global-run-single-project-supervision",
    sessionId: "session-single-project-supervision",
  });
  const feishuDevelopmentVisible = formatGlobalDevelopmentDispatchVisibleResult(
    {
      mission: { id: "mission-secret-1", title: "修复登录链路" },
      children: [{ task: { id: "task-secret-1" } }, { task: { id: "task-secret-2" } }],
      rejected: [],
    },
    { title: "修复登录链路" }
  );
  const feishuTaskVisible = formatGlobalTaskDispatchVisibleResult(
    { task: { id: "task-secret-3", title: "修复登录问题" }, id: "task-secret-3", queue: { queued: true, position: 1 } },
    { title: "修复登录问题" }
  );
  const dispatchLaunchUi = buildGlobalAgentEventUi({
    type: "dispatch_launch_summary",
    run_id: "global-run-ui-test",
    dispatch_launch_summary: {
      schema: "ccm-main-agent-dispatch-launch-summary-v1",
      title: "已派发的工作",
      headline: "全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。",
      rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "修复登录问题", status_label: "已进入任务链路" }],
      next_action: "后续进度以群聊任务卡为准。",
    },
  });
  const protocolDispatchLaunchUi = buildGlobalAgentEventUi({
    type: "dispatch_launch_summary",
    dispatch_launch_summary: {
      schema: "ccm-main-agent-dispatch-launch-summary-v1",
      title: "已派发的工作",
      headline: "CCM_AGENT_RECEIPT trace_id raw payload",
      rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "CCM_AGENT_RECEIPT", status_label: "已派发" }],
      next_action: "trace_id",
    },
  });
  const unknownCoverageTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-unknown-coverage",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent command checks passed, but one acceptance criterion has no direct evidence.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验收需要真实浏览器证据", status: "unknown", evidence: [] }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-unknown", traceId: "trace-test-agent-unknown" });
  const unknownCoverageTestAgentUi = buildGlobalAgentEventUi(unknownCoverageTestAgentRelay || {});
  const notVerifiedCoverageTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-not-verified-coverage",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent report claims pass, but coverage includes not_verified gaps.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified",
      requiredCheckCoverage: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "not_verified", evidence: [] }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-not-verified", traceId: "trace-test-agent-not-verified" });
  const notVerifiedCoverageTestAgentUi = buildGlobalAgentEventUi(notVerifiedCoverageTestAgentRelay || {});
  const passedSpotCheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-spot-check-passed",
      status: "passed",
      recommendation: "accept",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["命令验证已通过"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["验证已通过"] }],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
    technical: {
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: true,
        status: "passed",
        executed_count: 2,
        passed_count: 2,
        mismatch_count: 0,
        checks: [{
          command: "node scripts/private-global-pass.mjs",
          cwd: "C:/private/global-pass",
          review_exit_code: 0,
          observed_exit_code: 0,
          matches_review: true,
        }],
        headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
        next_action: "继续完成最终验收。",
      },
    },
  }, { globalRunId: "global-run-test-agent-spot-check-passed", traceId: "trace-test-agent-spot-check-passed" });
  const mismatchedSpotCheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-spot-check-mismatch",
      status: "passed",
      recommendation: "accept",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["命令验证已通过"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["验证已通过"] }],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
    technical: {
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: false,
        status: "needs_recheck",
        executed_count: 2,
        passed_count: 1,
        mismatch_count: 1,
        checks: [{
          command: "node scripts/private-global-mismatch.mjs",
          cwd: "C:/private/global-mismatch",
          review_exit_code: 0,
          observed_exit_code: 3,
          matches_review: false,
        }],
        headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
        next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
      },
    },
  }, { globalRunId: "global-run-test-agent-spot-check-mismatch", traceId: "trace-test-agent-spot-check-mismatch" });
  const summaryOnlyGapTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-summary-only-gap",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent summary says pass but required check summary has a gap.",
      evidence: [],
    },
    test_agent_verdict: {
      schema: "ccm-test-agent-verdict-v1",
      status: "passed",
      recommendation: "accept",
      canAccept: true,
      requiredCheckSummary: {
        total: 1,
        statusCounts: { verified: 0, not_verified: 1, unknown: 0 },
        verified: [],
        notVerified: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
        unknown: [],
      },
      acceptanceSummary: {
        total: 1,
        statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
        matchStrengthCounts: { direct: 1, token: 0, fallback: 0, none: 0 },
        evidenceSourceCounts: { matched_evidence: 1, single_criterion_report_status: 0, none: 0 },
        verified: [{ criterion: "登录恢复可用", status: "verified", evidence: ["浏览器断言通过"], matchStrength: "direct", evidenceSource: "matched_evidence" }],
        notVerified: [],
        unknown: [],
      },
    },
  }, { globalRunId: "global-run-test-agent-summary-only-gap", traceId: "trace-test-agent-summary-only-gap" });
  const weakSummaryTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-weak-summary",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent says pass, but acceptance proof is inferred.",
      verdict: {
        schema: "ccm-test-agent-verdict-v1",
        status: "passed",
        recommendation: "accept",
        canAccept: true,
        requiredCheckSummary: {
          total: 1,
          statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
          verified: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
          notVerified: [],
          unknown: [],
        },
        acceptanceSummary: {
          total: 1,
          statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
          matchStrengthCounts: { direct: 0, token: 0, fallback: 1, none: 0 },
          evidenceSourceCounts: { matched_evidence: 0, single_criterion_report_status: 1, none: 0 },
          verified: [{
            criterion: "登录恢复需要真实浏览器证据",
            status: "verified",
            evidence: ["整体报告通过"],
            matchStrength: "fallback",
            evidenceSource: "single_criterion_report_status",
          }],
          notVerified: [],
          unknown: [],
        },
      },
      evidence: [],
    },
  }, { globalRunId: "global-run-test-agent-weak-summary", traceId: "trace-test-agent-weak-summary" });
  const weakSummaryTestAgentUi = buildGlobalAgentEventUi(weakSummaryTestAgentRelay || {});
  const failedBrowserFlowTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-browser-flow-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but a real browser acceptance flow failed.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      browserFlowSummary: {
        total: 2,
        statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
        flowTypeCount: 1,
        criteriaCount: 2,
        actionCount: 4,
        assertionCount: 5,
        failedStepCount: 1,
        items: [{
          flowType: "acceptance_popup_flow",
          total: 2,
          statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
          criteriaCount: 2,
          criteria: ["打开设置弹窗后可以保存"],
          projects: ["web"],
          providers: ["playwright"],
          actionCount: 4,
          assertionCount: 5,
          failedStepCount: 1,
          failures: [{ project: "web", name: "设置弹窗", status: "failed", failedSteps: ["raw locator"] }],
        }],
      },
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-browser-flow", traceId: "trace-test-agent-browser-flow" });
  const failedMultiSessionTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-multi-session-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but the observer session did not receive the update.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      browserMultiSessionSummary: {
        total: 2,
        statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
        sessionCount: 4,
        uniqueSessionCount: 4,
        sessionNames: ["sender", "receiver", "author", "observer"],
        parallelGroupCount: 2,
        comparisonCount: 2,
        failedComparisonCount: 1,
        actionCount: 7,
        assertionCount: 8,
        failedStepCount: 1,
        items: [{
          check: "发送消息后接收方实时看到",
          status: "passed",
          sessionNames: ["sender", "receiver"],
          comparisonCount: 1,
          failedComparisonCount: 0,
          failedSessionNames: [],
          failedSteps: [],
        }, {
          check: "作者更新后观察方同步刷新",
          status: "failed",
          sessionNames: ["author", "observer"],
          comparisonCount: 1,
          failedComparisonCount: 1,
          failedSessionNames: ["observer"],
          failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
        }],
      },
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 0,
        unchanged: 1,
        unavailable: 0,
        failed: 1,
        detailSuppressed: 0,
        crossSession: 1,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web",
          name: "观察方刷新",
          provider: "playwright",
          status: "failed",
          actions: 1,
          changed: 0,
          unchanged: 1,
          unavailable: 0,
          failed: 1,
          detailSuppressed: 0,
          crossSession: 1,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        }],
      },
      adversarialEvidenceSummary: {
        required: true,
        waived: false,
        status: "failed",
        total: 1,
        passed: 0,
        failed: 1,
        blocked: 0,
        skipped: 0,
        http: 0,
        browser: 1,
        relevant: 1,
        unlinked: 0,
        passedRelevant: 0,
        goalLinked: 1,
        criteriaCovered: ["观察方断线重连后不能丢失更新"],
        probeTypes: ["session_reconnect"],
        items: [{
          project: "web",
          surface: "browser",
          name: "观察方断线重连",
          target: "http://127.0.0.1:5173/collaboration?token=hidden",
          status: "failed",
          probeType: "session_reconnect",
          provider: "playwright",
          relevance: "explicit",
          linkedCriteria: ["观察方断线重连后不能丢失更新"],
          goalLinked: true,
          matchScore: 100,
        }],
      },
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-multi-session", traceId: "trace-test-agent-multi-session" });
  const needsRecheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-needs-recheck",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but action effects, recovery, and adversarial evidence are incomplete.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 0,
        unchanged: 0,
        unavailable: 1,
        failed: 1,
        detailSuppressed: 1,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web",
          name: "提交登录表单",
          provider: "playwright",
          status: "blocked",
          actions: 1,
          changed: 0,
          unchanged: 0,
          unavailable: 1,
          failed: 1,
          detailSuppressed: 1,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        }],
      },
      browserRecoverySummary: {
        checks: 1,
        attempted: 1,
        recovered: 0,
        failed: 0,
        notRetried: 1,
        items: [{
          project: "web",
          name: "提交登录表单",
          provider: "playwright",
          status: "blocked",
          attempted: 1,
          recovered: 0,
          failed: 0,
          notRetried: 1,
          events: [{ reason: "unsafe duplicate side effect", sessionId: "global-hidden-session" }],
        }],
      },
      adversarialEvidenceSummary: {
        required: true,
        waived: false,
        status: "missing",
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        http: 0,
        browser: 0,
        relevant: 0,
        unlinked: 0,
        passedRelevant: 0,
        goalLinked: 0,
        criteriaCovered: [],
        probeTypes: [],
        items: [],
      },
      evidence: [],
    },
    test_agent_verdict: {
      status: "passed",
      recommendation: "accept",
      canAccept: true,
      needsRework: false,
      needsHuman: false,
    },
  }, { globalRunId: "global-run-test-agent-needs-recheck", traceId: "trace-test-agent-needs-recheck" });
  const needsRecheckTestAgentUi = buildGlobalAgentEventUi(needsRecheckTestAgentRelay || {});
  const failedAuthenticationTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-authentication-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but authenticated browser verification failed.",
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 1,
          failedChecks: 1,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ["GLOBAL_TEST_EMAIL", "GLOBAL_TEST_PASSWORD"],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
      },
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-authentication-failed", traceId: "trace-test-agent-authentication-failed" });
  const blockedAuthenticationTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-authentication-blocked",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but authenticated browser verification is blocked.",
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 1,
          passedChecks: 0,
          failedChecks: 0,
          blockedChecks: 1,
          authenticatedSessions: 0,
          credentialEnvNames: ["GLOBAL_TEST_EMAIL", "GLOBAL_TEST_PASSWORD"],
          storageStateCount: 1,
          sensitiveArtifactSuppressionCount: 1,
        },
      },
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-authentication-blocked", traceId: "trace-test-agent-authentication-blocked" });
  const blockedAuthenticationTestAgentUi = buildGlobalAgentEventUi(blockedAuthenticationTestAgentRelay || {});
  const failureSummaryTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-failure-summary",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "failed",
      recommendation: "rework",
      summary: "TestAgent found a browser failure summary.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary",
      requiredCheckCoverage: [{ check: "browser_e2e", status: "verified", evidence: ["浏览器复核已执行"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["浏览器复核已执行"] }],
      failureSummary: [{
        type: "browser",
        project: "web-app",
        title: "登录恢复浏览器复核",
        status: "failed",
        reason: "会话请求没有恢复登录态；失败截图在 C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/screenshots/login.failure.png。",
        evidence: ["C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/screenshots/login.failure.png"],
        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
        diagnostics: [
          "打开失败截图核对页面是否仍停留在登录态。",
          "检查浏览器网络日志中的 /api/session 请求。",
        ],
      }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-failure-summary", traceId: "trace-test-agent-failure-summary" });
  const failureSummaryTestAgentUi = buildGlobalAgentEventUi(failureSummaryTestAgentRelay || {});
  const statusSummary = formatMissionStatus({
    missions: [{
      id: "mission-status-demo",
      title: "修复登录状态恢复",
      status: "in_progress",
      child_task_ids: ["status-child-web", "status-child-api"],
      updated_at: "2020-01-01T00:00:00.000Z",
      mission_summary: { total: 2, completed: 1, failed: 0, blocked: 0 },
      workflow_timeline: [{ title: "主 Agent 检查中", detail: "web 已完成，api 正在验证" }],
    }, {
      id: "mission-status-weak-acceptance",
      title: "弱验收全局任务",
      status: "done",
      child_task_ids: ["status-child-weak-mission"],
      updated_at: "2026-07-09T10:10:00.000Z",
      mission_summary: {
        total: 1,
        completed: 1,
        passed: 1,
        failed: 0,
        blocked: 1,
        all_passed: true,
        children: [{
          task_id: "status-child-weak-mission",
          status: "done",
          gate_passed: true,
          acceptance_evidence_status: "weak",
        }],
      },
      delivery_summary: { acceptance_gate_passed: true },
      workflow_timeline: [{ title: "旧全局摘要声称完成", detail: "仍缺少真实验证或复核证据" }],
    }, {
      id: "mission-status-waiting",
      title: "等待用户确认部署窗口",
      status: "waiting_user",
      global_run_id: "global-run-waiting-secret",
      child_task_ids: [],
      mission_summary: { total: 1, completed: 0, failed: 0, blocked: 1 },
      workflow_timeline: [{ title: "等待用户处理阻塞", detail: "需要确认部署时间后继续。" }],
    }, {
      id: "mission-status-rework",
      title: "登录链路返工",
      status: "reworking",
      global_run_id: "global-run-rework-secret",
      child_task_ids: [],
      mission_summary: { total: 1, completed: 0, failed: 0, blocked: 0 },
      workflow_timeline: [{ title: "复核未通过", detail: "原执行成员正在修复后重新复核。" }],
    }],
    globalRuns: [{
      id: "global-run-waiting-secret",
      mission_id: "mission-status-waiting",
      supervisor_id: "supervisor-waiting-secret",
      status: "waiting_user",
      supervision_state: "waiting_user",
      final_reply: "全局任务等你处理阻塞点，这还不是完成结果。",
      workchain: {
        completion_summary: {
          next_action: "你确认部署时间后，我会继续推动执行成员验收。",
        },
      },
    }, {
      id: "global-run-rework-secret",
      mission_id: "mission-status-rework",
      supervisor_id: "supervisor-rework-secret",
      status: "supervising",
      supervision_state: "reworking",
      final_reply: "全局任务正在返工，修复后会重新复核。",
      workchain: {
        completion_summary: {
          next_action: "原执行成员修复后，重新运行 TestAgent/独立复核，再给你最终总结。",
        },
      },
    }, {
      id: "global-run-confirm-secret",
      status: "waiting_confirmation",
      user_message: "部署登录修复到生产环境",
      updated_at: "2026-07-09T09:00:00.000Z",
      confirmation_summary: {
        question: "请确认是否允许执行生产部署。",
      },
    }, {
      id: "global-run-test-agent-status-secret",
      status: "completed",
      user_message: "让 TestAgent 复核登录恢复交付",
      updated_at: "2026-07-09T11:00:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      independent_review_summary: {
        schema: "ccm-main-agent-independent-review-summary-v1",
        title: "独立复核",
        status: "needs_rework",
        status_label: "需返工",
        headline: "TestAgent 复核指出仍有未覆盖项，需要先返工。",
        rows: [
          "TestAgent：需返工",
          "待处理：验收条件未通过：登录恢复验证必须通过",
        ],
        next_action: "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。",
      },
      final_report: {
        technical: {
          schema: "ccm-test-agent-report-v1",
          report_json: "C:/tmp/test-agent/report.json",
          artifact_manifest: "C:/tmp/test-agent/artifact-manifest.json",
        },
      },
    }, {
      id: "global-run-test-agent-plan-only-status-secret",
      status: "completed",
      user_message: "只生成 TestAgent 复核计划的任务",
      updated_at: "2026-07-09T12:30:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      test_agent_execution_plan_summary: {
        schema: "ccm-test-agent-execution-plan-summary-v1",
        title: "TestAgent 复核计划",
        status: "ready",
        status_label: "可执行",
        headline: "TestAgent 已生成复核计划，我会按这份计划启动真实验证。",
        rows: [
          "复核范围：1 个项目",
          "浏览器检查：1 项",
        ],
        next_action: "启动 TestAgent 真实复核，并把结论纳入最终验收。",
      },
      final_report: {
        technical: {
          test_agent_execution_plan: {
            artifactDir: "C:/tmp/test-agent-artifacts/plan-only",
            browser_har: "C:/tmp/test-agent-artifacts/plan-only/browser.har",
          },
        },
      },
    }, {
      id: "global-run-test-agent-failure-summary-status-secret",
      status: "completed",
      user_message: "只带 TestAgent 失败摘要的复核",
      updated_at: "2026-07-09T12:00:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      final_report: {
        technical: {
          schema: "ccm-test-agent-report-v1",
          test_agent_report: {
            schema: "ccm-test-agent-report-v1",
            status: "failed",
            recommendation: "rework",
            artifactDir: "C:/tmp/test-agent-artifacts/global-failure-summary-status",
            failureSummary: [{
              type: "browser",
              project: "web-app",
              title: "登录恢复浏览器复核",
              status: "failed",
              reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/global-failure-summary-status/screenshots/login.failure.png。",
              nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
              diagnostics: ["打开失败截图核对页面是否仍停留在登录态。"],
            }],
            metadata: {
              artifactFiles: {
                reportMarkdownPath: "C:/tmp/test-agent-artifacts/global-failure-summary-status/report.md",
                manifestPath: "C:/tmp/test-agent-artifacts/global-failure-summary-status/artifact-manifest.json",
              },
            },
          },
        },
      },
    }],
    tasks: [
      {
        id: "status-child-web",
        status: "done",
        target_project: "web",
        status_detail: "已提交结构化结果说明",
        delivery_summary: {
          acceptance_gate_passed: true,
          verification_executed: ["npm test passed by external runner (exit 0)"],
          external_runner_verification_count: 1,
          verification_source_gate_passed: true,
        },
      },
      { id: "status-child-api", status: "in_progress", target_project: "api", status_detail: "正在运行验证", updated_at: "2020-01-01T00:00:00.000Z" },
      {
        id: "status-child-weak-mission",
        parent_task_id: "mission-status-weak-acceptance",
        status: "done",
        target_project: "legacy-web",
        status_detail: "旧子任务摘要声称完成",
        delivery_summary: {
          headline: "旧子任务摘要声称已完成",
          acceptance_gate_passed: true,
          acceptance: ["验收结论：已通过"],
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "done",
            headline: "旧子任务摘要声称已完成",
            acceptance: ["验收结论：已通过"],
            verification_evidence: { status: "ready", items: [] },
          },
        },
      },
      {
        id: "status-direct",
        title: "直派修复首页",
        status: "in_progress",
        target_project: "frontend-app",
        updated_at: "2020-01-01T00:00:00.000Z",
        plan_revision_required: true,
        collaboration_state: {
          last_continuation: {
            kind: "revise_goal",
            at: "2026-07-07T09:01:00.000Z",
            reason: "先保留旧首页入口，只新增兼容开关。",
            replan_required: true,
            interrupt_current_run: true,
          },
          goal_revision_interruption: {
            requested: true,
            requested_at: "2026-07-07T09:01:00.000Z",
            reason: "先保留旧首页入口，只新增兼容开关。",
          },
        },
        workflow_meta: { global_direct_dispatch: { schema: "ccm-global-direct-dispatch-v1", user_goal: "修复首页", session_id: "s1" } },
        workflow_timeline: [{ title: "群聊主 Agent 已接管", detail: "等待子 Agent 返回结果" }],
        delivery_summary: {
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "active",
            headline: "首页兼容开关正在按新要求接续。",
            next_action: "等待重核计划后继续验收。",
            pickup_summary: {
              schema: "ccm-main-agent-pickup-summary-v1",
              title: "回来继续看这里",
              current_state: "目标调整已收到；原始执行记录在技术详情里。",
              review_items: ["接续：正在重核计划", "验证：等待子 Agent 返回", "隐藏：CCM_AGENT_RECEIPT trace_id=secret"],
              resume_action: "等待重核计划后继续验收。",
            },
          },
        },
      },
      {
        id: "status-direct-weak-acceptance",
        title: "弱验收直派",
        status: "done",
        target_project: "frontend-app",
        updated_at: "2026-07-09T10:00:00.000Z",
        workflow_meta: { global_direct_dispatch: { schema: "ccm-global-direct-dispatch-v1", user_goal: "弱验收直派", session_id: "s2" } },
        workflow_timeline: [{ title: "旧摘要声称完成", detail: "仍缺少真实验证或复核证据" }],
        delivery_summary: {
          headline: "旧摘要声称已完成",
          acceptance_gate_passed: true,
          acceptance: ["验收结论：已通过"],
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "done",
            status_label: "已完成",
            headline: "旧摘要声称已完成",
            acceptance: ["验收结论：已通过"],
            verification_evidence: { status: "ready", items: [] },
            pickup_summary: {
              schema: "ccm-main-agent-pickup-summary-v1",
              title: "回来继续看这里",
              status: "done",
              headline: "旧摘要声称已完成",
              current_state: "旧摘要声称已完成。",
              review_items: ["验收结论：已通过"],
              resume_action: "可以继续补充新的要求。",
            },
          },
        },
      },
    ],
  });
  const statusChecks = {
    globalStatusFollowupRecognized: isGlobalProgressStatusRequest("现在进展怎么样？") && isGlobalProgressStatusRequest("How's it going?"),
    globalStatusFollowupAvoidsManagementMutation: !isGlobalProgressStatusRequest("把任务状态设置为 done"),
    globalStatusShortcutDoesNotCaptureExplicitDevelopment: !isGlobalProgressStatusRequest("我明确授权你立即修改 backend-api，创建任务并持续跟进进度直到完成"),
    globalStatusSummaryFriendly: statusSummary.includes("最近全局任务进展") && statusSummary.includes("子目标") && statusSummary.includes("web 已完成") && statusSummary.includes("api 处理中"),
    globalStatusShowsChildAgentWaitingState: statusSummary.includes("执行成员等待情况") && statusSummary.includes("已回传：web") && statusSummary.includes("处理中：api") && !statusSummary.includes("已完成：web"),
    globalStatusWeakMissionStaysReviewing: statusSummary.includes("弱验收全局任务：验收中")
      && statusSummary.includes("弱验收全局任务：验收中（0/1 已通过验收，1 验收中）")
      && statusSummary.includes("legacy-web 验收中")
      && statusSummary.includes("补齐真实验证或复核证据")
      && !statusSummary.includes("弱验收全局任务：已完成"),
    globalStatusShowsSupervisionWaitingState: statusSummary.includes("持续跟进")
      && statusSummary.includes("等你处理阻塞点")
      && statusSummary.includes("不是完成结果")
      && statusSummary.includes("你确认部署时间后")
      && statusSummary.includes("等待用户确认部署窗口：等待你补充")
      && !statusSummary.includes("等待用户确认部署窗口：需要处理"),
    globalStatusShowsSupervisionReworkState: statusSummary.includes("正在返工")
      && statusSummary.includes("重新运行 TestAgent")
      && statusSummary.includes("最终总结"),
    globalStatusShowsStandaloneRunState: statusSummary.includes("最近全局运行")
      && statusSummary.includes("部署登录修复到生产环境")
      && statusSummary.includes("部署登录修复到生产环境：等待你确认")
      && !statusSummary.includes("部署登录修复到生产环境：需要处理")
      && statusSummary.includes("等待你确认授权")
      && statusSummary.includes("请确认是否允许执行生产部署"),
    globalStatusShowsIndependentReviewRework: statusSummary.includes("让 TestAgent 复核登录恢复交付：返工中")
      && statusSummary.includes("独立复核：需返工")
      && statusSummary.includes("验收条件未通过：登录恢复验证必须通过")
      && statusSummary.includes("重新运行 TestAgent/独立复核")
      && !statusSummary.includes("任务已完成，可以查看改动详情")
      && !/ccm-test-agent-report-v1|report\.json|artifact-manifest|global-run-test-agent-status-secret/i.test(statusSummary),
    globalStatusShowsTestAgentPlanOnly: statusSummary.includes("只生成 TestAgent 复核计划的任务：验收中")
      && statusSummary.includes("TestAgent 计划：可执行")
      && statusSummary.includes("浏览器检查：1 项")
      && statusSummary.includes("启动 TestAgent 真实复核")
      && !statusSummary.includes("browser_har")
      && !/test-agent-artifacts|C:\/tmp|global-run-test-agent-plan-only-status-secret/i.test(statusSummary),
    globalStatusSynthesizesTestAgentFailureSummary: statusSummary.includes("只带 TestAgent 失败摘要的复核：返工中")
      && statusSummary.includes("返工重点")
      && statusSummary.includes("浏览器检查")
      && statusSummary.includes("排查建议")
      && statusSummary.includes("打开失败截图核对页面")
      && statusSummary.includes("重新运行 TestAgent/独立复核")
      && !/ccm-test-agent-report-v1|report\.json|report\.md|artifact-manifest|test-agent-artifacts|C:\/tmp|global-run-test-agent-failure-summary-status-secret/i.test(statusSummary),
    globalStatusIncludesDirectDispatch: statusSummary.includes("最近全局直派任务") && statusSummary.includes("修复首页"),
    globalStatusShowsDirectDispatchContinuation: statusSummary.includes("接续状态") && statusSummary.includes("保留旧首页入口") && statusSummary.includes("重核计划"),
    globalStatusShowsPickupSummary: statusSummary.includes("回来继续看这里")
      && statusSummary.includes("回看要点")
      && statusSummary.includes("等待重核计划后继续验收"),
    globalStatusWeakDirectDispatchStaysReviewing: statusSummary.includes("弱验收直派：验收中")
      && statusSummary.includes("弱验收直派：验收中（frontend-app，等待任务卡验收）")
      && !statusSummary.includes("弱验收直派：已完成")
      && !statusSummary.includes("旧摘要声称已完成。")
      && !statusSummary.includes("弱验收直派：已完成（frontend-app，已通过验收）"),
    globalStatusShowsProgressRefreshSummary: statusSummary.includes("进度刷新提醒")
      && statusSummary.includes("接续要点")
      && statusSummary.includes("没有新的可展示进展")
      && statusSummary.includes("刷新状态"),
    globalStatusHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|raw payload|WorkerContextPacket|global-run-|supervisor-/i.test(statusSummary),
  };
  const directDispatchChecks = {
    groupVisibleWorkOrderFriendly: directGroupMessage.includes("全局主 Agent 指令工作单") && directGroupMessage.includes("请按这个链路接管") && directGroupMessage.includes("最终总结"),
    groupVisibleWorkOrderNoProtocolLeak: !GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(directGroupMessage),
    groupDirectDispatchSaysAcceptedNotDone: renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" }).includes("不代表需求已经完成"),
    groupDirectDispatchHidesTaskId: (() => {
      const summary = renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" });
      return summary.includes("任务记录")
        && summary.includes("技术详情")
        && !/任务 ID|task-1/i.test(summary);
    })(),
    groupDirectDispatchUsesFriendlyReplyLabel: (() => {
      const legacyReplyLabel = "主 Agent " + "回执";
      const legacyVisibleReplyLabel = "主 Agent " + "说明";
      const summary = renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" });
      return summary.includes("协作说明") && !summary.includes(legacyVisibleReplyLabel) && !summary.includes(legacyReplyLabel);
    })(),
    globalFeishuDevelopmentDispatchHidesIds: feishuDevelopmentVisible.includes("全局开发任务已建立")
      && feishuDevelopmentVisible.includes("持续跟进")
      && feishuDevelopmentVisible.includes("技术详情")
      && !/任务 ID|mission-secret|task-secret/i.test(feishuDevelopmentVisible),
    globalFeishuTaskDispatchHidesIds: feishuTaskVisible.includes("协作任务已派发")
      && feishuTaskVisible.includes("任务卡验收")
      && feishuTaskVisible.includes("技术详情")
      && !/任务 ID|task-secret/i.test(feishuTaskVisible),
    projectInternalWorkOrderSelfContained: directProjectMessage.includes("全局主 Agent 指令工作单") && directProjectMessage.includes("你看不到用户和主 Agent 的完整历史对话") && directProjectMessage.includes("CCM_AGENT_RECEIPT"),
    directDispatchHandoffSummary: directGroupDispatch.summary.label === "工作单已补齐" && directProjectDispatch.summary.project === "backend-api",
    verificationOnlyCanAvoidCodeChanges: directProjectDispatch.handoff.verification.required.includes("说明产出和人工核验依据"),
    singleProjectDispatchUsesPersistentMission: supervisedSingleProjectPayload.targets.length === 1
      && supervisedSingleProjectPayload.targets[0].project === "backend-api"
      && supervisedSingleProjectPayload.auto_execute === true
      && supervisedSingleProjectPayload.single_project_supervision.schema === "ccm-global-to-group-supervision-v1"
      && supervisedSingleProjectPayload.single_project_supervision.group_orchestration_required === true
      && supervisedSingleProjectPayload.single_project_supervision.global_agent_review_owner === false
      && supervisedSingleProjectPayload.single_project_supervision.test_agent_owner === "group-main-agent"
      && supervisedSingleProjectPayload.single_project_supervision.independent_review_required === true
      && supervisedSingleProjectPayload.single_project_supervision.post_review_spot_check_required === true,
    singleProjectDispatchCarriesReviewAcceptance: supervisedSingleProjectPayload.acceptance.includes("TestAgent")
      && supervisedSingleProjectPayload.acceptance.includes("群聊主 Agent")
      && supervisedSingleProjectPayload.targets[0].requires_independent_review === true,
    dispatchLaunchUiFriendly: dispatchLaunchUi?.title === "已派发的工作" && dispatchLaunchUi?.text.includes("dev-group") && dispatchLaunchUi?.checkpoint?.label === "已派发的工作",
    dispatchLaunchUiHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|raw payload/i.test(JSON.stringify(protocolDispatchLaunchUi || {})),
  };
  const testAgentRelayChecks = {
    globalTestAgentPassedSpotCheckAllowsAcceptance: passedSpotCheckTestAgentRelay?.independentReviewSummary?.status === "passed"
      && passedSpotCheckTestAgentRelay?.independentReview?.[0]?.verdict === "passed"
      && passedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("我的关键验证抽查也已通过")
      && passedSpotCheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("2 项结果一致"))
      && !/private-global-pass|review_exit_code|observed_exit_code|C:\/private/i.test(JSON.stringify(passedSpotCheckTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentSpotCheckMismatchOverridesLegacyPass: mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.status === "needs_recheck"
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.status_label === "需复验"
      && mismatchedSpotCheckTestAgentRelay?.independentReview?.[0]?.verdict === "needs_recheck"
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("我的完成前抽查尚未一致")
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.next_action.includes("沿用原复核工作单重新运行 TestAgent")
      && !mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("原实现成员返工")
      && !/private-global-mismatch|review_exit_code|observed_exit_code|C:\/private/i.test(JSON.stringify(mismatchedSpotCheckTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentUnknownCoverageRelayNeedsUser: unknownCoverageTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && unknownCoverageTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.headline.includes("需要人工确认")
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收条件待确认"))
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.next_action.includes("等待你确认")
      && !JSON.stringify(unknownCoverageTestAgentRelay?.independentReviewSummary || {}).includes("已通过"),
    globalTestAgentUnknownCoverageUiWaits: unknownCoverageTestAgentUi?.tone === "waiting"
      && unknownCoverageTestAgentUi?.checkpoint?.status === "warning"
      && unknownCoverageTestAgentUi?.text.includes("人工确认")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1/i.test(JSON.stringify(unknownCoverageTestAgentUi || {})),
    globalTestAgentNotVerifiedCoverageRelayNeedsRework: notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && notVerifiedCoverageTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.headline.includes("安排返工")
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("必检项：浏览器流程未覆盖"))
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收条件未通过"))
      && !JSON.stringify(notVerifiedCoverageTestAgentRelay?.independentReviewSummary || {}).includes("已通过"),
    globalTestAgentNotVerifiedCoverageUiWaits: notVerifiedCoverageTestAgentUi?.tone === "waiting"
      && notVerifiedCoverageTestAgentUi?.checkpoint?.status === "warning"
      && notVerifiedCoverageTestAgentUi?.text.includes("安排返工")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1/i.test(JSON.stringify(notVerifiedCoverageTestAgentUi || {})),
    globalTestAgentSummaryOnlyGapRelayNeedsRework: summaryOnlyGapTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && summaryOnlyGapTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("必检项：浏览器流程未覆盖"))
      && summaryOnlyGapTestAgentRelay?.independentReviewSummary?.next_action.includes("先处理复核指出的缺口")
      && !/ccm-test-agent-verdict-v1|requiredCheckSummary|trace-test-agent-summary-only-gap/i.test(JSON.stringify(summaryOnlyGapTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentWeakSummaryRelayNeedsUser: weakSummaryTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && weakSummaryTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && weakSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收证据待确认") && item.includes("整体复核结果推断"))
      && weakSummaryTestAgentRelay?.independentReviewSummary?.next_action.includes("等待你确认")
      && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify(weakSummaryTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentWeakSummaryUiWaits: weakSummaryTestAgentUi?.tone === "waiting"
      && weakSummaryTestAgentUi?.checkpoint?.status === "warning"
      && weakSummaryTestAgentUi?.text.includes("人工确认")
      && weakSummaryTestAgentUi?.text.includes("验收证据待确认")
      && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify(weakSummaryTestAgentUi || {})),
    globalTestAgentFailedBrowserFlowRelayNeedsRework: failedBrowserFlowTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedBrowserFlowTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("真实浏览器验收") && item.includes("1 个未通过"))
      && failedBrowserFlowTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("弹窗流程") && item.includes("未通过"))
      && !/acceptance_popup_flow|raw locator|ccm-test-agent-report/i.test(JSON.stringify(failedBrowserFlowTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentFailedMultiSessionRelayNeedsRework: failedMultiSessionTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedMultiSessionTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("多人协作浏览器验收") && item.includes("1 个未通过"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("观察方") && item.includes("未通过"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("操作结果验证") && item.includes("没有产生可见效果"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("边界与异常验证") && item.includes("未通过"))
      && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|token=hidden|session_reconnect|playwright|ccm-test-agent-report/i.test(JSON.stringify(failedMultiSessionTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentIncompleteLatestEvidenceNeedsRecheck: needsRecheckTestAgentRelay?.independentReviewSummary?.status === "needs_recheck"
      && needsRecheckTestAgentRelay?.independentReviewSummary?.status_label === "需复验"
      && needsRecheckTestAgentRelay?.independentReview?.[0]?.verdict === "needs_recheck"
      && needsRecheckTestAgentRelay?.independentReviewSummary?.headline.includes("不会直接要求原实现成员返工")
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("暂时无法确认页面效果"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("不代表实现失败"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("TestAgent 工作单"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.next_action.includes("重新运行 TestAgent")
      && needsRecheckTestAgentUi?.tone === "waiting"
      && needsRecheckTestAgentUi?.checkpoint?.status === "warning"
      && !/global-hidden-session|unsafe duplicate side effect|sessionId|actionTypes|changedSignals|playwright/i.test(JSON.stringify({
        summary: needsRecheckTestAgentRelay?.independentReviewSummary,
        ui: needsRecheckTestAgentUi,
      })),
    globalTestAgentFailedAuthenticationOverridesLegacyPass: failedAuthenticationTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedAuthenticationTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failedAuthenticationTestAgentRelay?.independentReviewSummary?.rows.some((item: string) =>
        item.includes("登录态浏览器验收") && item.includes("1 项未通过")
      )
      && !/GLOBAL_TEST_EMAIL|GLOBAL_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(
        JSON.stringify(failedAuthenticationTestAgentRelay?.independentReviewSummary || {})
      ),
    globalTestAgentBlockedAuthenticationNeedsUser: blockedAuthenticationTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && blockedAuthenticationTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && blockedAuthenticationTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("测试账号或登录条件"))
      && blockedAuthenticationTestAgentUi?.tone === "waiting"
      && blockedAuthenticationTestAgentUi?.checkpoint?.status === "warning"
      && !/GLOBAL_TEST_EMAIL|GLOBAL_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
        summary: blockedAuthenticationTestAgentRelay?.independentReviewSummary,
        ui: blockedAuthenticationTestAgentUi,
      })),
    globalTestAgentFailureSummaryRelayNeedsRework: failureSummaryTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failureSummaryTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failureSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("返工重点") && item.includes("浏览器检查"))
      && failureSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1|C:\/Users\/admin/i.test(JSON.stringify(failureSummaryTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentFailureSummaryUiWaits: failureSummaryTestAgentUi?.tone === "waiting"
      && failureSummaryTestAgentUi?.checkpoint?.status === "warning"
      && failureSummaryTestAgentUi?.text.includes("返工重点")
      && failureSummaryTestAgentUi?.text.includes("排查建议")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1|C:\/Users\/admin/i.test(JSON.stringify(failureSummaryTestAgentUi || {})),
  };
  return {
    passed: results.every(item => item.passed)
      && actionBlockHidden
      && fallbackDelegationCannotWrite
      && localGroupDispatchUsesSchema
      && localDispatchRepliesFriendly
      && fallbackCronCannotWrite
      && ambiguousFallbackCannotWrite
      && fallbackObservationFriendly
      && fallbackGreetingStaysConversation
      && groupMemoryModelContextBounded
      && globalHistoryMergePreservesBackendCompletion
      && Object.values(statusChecks).every(Boolean)
      && Object.values(directDispatchChecks).every(Boolean)
      && Object.values(testAgentRelayChecks).every(Boolean),
    results,
    actionBlockHidden,
    fallbackDelegationCannotWrite,
    localGroupDispatchUsesSchema,
    localDispatchRepliesFriendly,
    fallbackCronCannotWrite,
    ambiguousFallbackCannotWrite,
    fallbackObservationFriendly,
    fallbackGreetingStaysConversation,
    groupMemoryModelContextBounded,
    globalHistoryMergePreservesBackendCompletion,
    statusChecks,
    directDispatchChecks,
    testAgentRelayChecks,
    visibleReply,
  };
}

function getRequestBaseUrl(req: any): string {
  const port = Number(req.socket?.localPort || 3080);
  return `http://127.0.0.1:${port}`;
}

async function callLocalApi(baseUrl: string, pathname: string, options: any = {}): Promise<any> {
  const response = await fetch(baseUrl + pathname, options);
  const data = await response.json() as any;
  if (!response.ok || data?.success === false || data?.error) {
    throw new Error(data?.error || `接口执行失败 (${response.status})`);
  }
  return data;
}

function postLocalApi(baseUrl: string, pathname: string, body: any): Promise<any> {
  return callLocalApi(baseUrl, pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

function parseSseApiEvents(text: string) {
  const events: any[] = [];
  for (const block of String(text || "").split(/\r?\n\r?\n/)) {
    const event = parseSseApiEventBlock(block);
    if (event) events.push(event);
  }
  return events;
}

function parseSseApiEventBlock(block: string) {
  const data = String(block || "")
    .split(/\r?\n/)
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trimStart())
    .join("\n")
    .trim();
  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data);
  } catch {
    return { type: "message", text: data };
  }
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
async function postLocalSseOrJsonApi(baseUrl: string, pathname: string, body: any, options: { onEvent?: (event: any) => void } = {}): Promise<any> {
  const response = await fetch(baseUrl + pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
    body: JSON.stringify(body || {}),
  });
  const contentType = response.headers.get("content-type") || "";
  let text = "";
  let data: any = null;
  const events: any[] = [];
  if (!contentType.includes("application/json") && response.body && typeof (response.body as any).getReader === "function") {
    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const event = parseSseApiEventBlock(block);
        if (!event) continue;
        events.push(event);
        try { options.onEvent?.(event); } catch {}
      }
    }
    const tail = decoder.decode();
    if (tail) {
      text += tail;
      buffer += tail;
    }
    if (buffer.trim()) {
      const event = parseSseApiEventBlock(buffer);
      if (event) {
        events.push(event);
        try { options.onEvent?.(event); } catch {}
      }
    }
  } else {
    text = await response.text();
  }
  if (contentType.includes("application/json") || /^\s*[{[]/.test(text)) {
    try { data = text ? JSON.parse(text) : {}; } catch { data = null; }
  }
  if (!data) {
    if (!events.length) events.push(...parseSseApiEvents(text));
    const errorEvent = events.find(event => event?.type === "error");
    const taskEvent = events.find(event => event?.type === "task_created" || event?.type === "task_updated");
    const agentEvent = events.find(event => event?.type === "agent_done");
    const doneEvent = [...events].reverse().find(event => event?.type === "done");
    data = {
      success: !errorEvent,
      events,
      error: errorEvent?.text || errorEvent?.error || "",
      reply: taskEvent?.text || agentEvent?.text || "",
      task: taskEvent?.task || null,
      queue: taskEvent?.queue || null,
      messageId: taskEvent?.messageId || agentEvent?.messageId || doneEvent?.messageId || "",
      taskId: taskEvent?.task?.id || doneEvent?.taskId || "",
    };
  }
  if (!response.ok || data?.success === false || data?.error) {
    throw new Error(data?.error || `接口执行失败 (${response.status})`);
  }
  return data;
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
const { queueMusicPlayback, fillCronParams, executeFeishuManagementAction, executeFeishuAction } = globalAgentFeishuActions
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
  buildGlobalSingleProjectMissionPayload,
  callGlobalModelWithRetry,
  compactGlobalAgentSession,
  compactPetText,
  completeGlobalAgentSupervision,
  completeIdempotency,
  continueGlobalAgentRunWithClarification,
  controlGlobalDevelopmentMission,
  controlGlobalMissionSupervisor,
  createGlobalDevelopmentMission,
  createPetGenerationJob,
  executeFeishuAction,
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
function hasExplicitGlobalWriteAuthorization(message: string) { return globalAgentAgenticRuntime.hasExplicitGlobalWriteAuthorization(message) }
function localActionToAgenticDecision(localIntent: LocalIntentResult | null, run: GlobalAgentRun) { return globalAgentAgenticRuntime.localActionToAgenticDecision(localIntent, run) }
const { createMissionSupervisorRuntime, createAgenticRuntime, runAgenticGlobalRequest } = globalAgentAgenticRuntime
export function verifyGlobalAgentContextBoundary(context: any = {}) { return globalAgentAgenticRuntime.verifyGlobalAgentContextBoundary(context) }
export function buildGlobalAgentGroupMemoryModelContext(bundle: any, options: any = {}) { return globalAgentAgenticRuntime.buildGlobalAgentGroupMemoryModelContext(bundle, options) }
export function buildAgenticContext(query = "", sessionId = "", options: any = {}) { return globalAgentAgenticRuntime.buildAgenticContext(query, sessionId, options) }
export async function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number) { return globalAgentAgenticRuntime.resumeGlobalAgentLoopsForServer(ctx, port) }
export function startGlobalMissionSupervisionForServer(ctx: CollabCtx) { return globalAgentAgenticRuntime.startGlobalMissionSupervisionForServer(ctx) }
export function bootstrapGlobalAgentMemoryForServer() { return globalAgentAgenticRuntime.bootstrapGlobalAgentMemoryForServer() }
export function stopGlobalMissionSupervisionForServer() { return globalAgentAgenticRuntime.stopGlobalMissionSupervisionForServer() }
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
    client_effects: run.client_effects,
    mission_id: run.mission_id,
    supervisor_id: run.supervisor_id,
    supervision_state: run.supervision_state,
    final_delivery_report: run.final_delivery_report,
    final_report: run.final_report,
    source_ingestion: (run as any).source_ingestion || null,
    source_attachments: (run as any).source_attachments || [],
    requirement_extraction: (run as any).requirement_extraction || null,
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
  getFeishuMessageId,
  getGlobalAgentConversationMessages,
  getGlobalAgentRun,
  getGlobalDevelopmentMission,
  globalRunVisibleReply,
  isGlobalProgressStatusRequest,
  listGlobalAgentRuns,
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
  completeGlobalAgentSupervision,
  completeIdempotency,
  controlGlobalMissionSupervisor,
  createAgenticRuntime,
  createGlobalDevelopmentMission,
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
async function callLlm(config: any, messages: any[]): Promise<string> {
  const requestBytes = Buffer.byteLength(JSON.stringify(messages));
  const maxRequestBytes = 512 * 1024;
  if (requestBytes > maxRequestBytes) {
    throw new Error(`统一大模型请求上下文过大：${requestBytes} bytes，安全上限 ${maxRequestBytes} bytes`);
  }

  if (shouldUseAnthropic(config)) {
    const system = messages.find(message => message.role === "system")?.content || "";
    const userMessages = messages
      .filter(message => message.role !== "system")
      .map(message => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));
    return callAnthropicCompatibleChat(config, {
      system,
      messages: userMessages,
      maxTokens: 2000,
      temperature: 0.3,
      defaultTimeoutMs: 60_000,
      httpErrorPrefix: "统一大模型 API 调用失败:",
    });
  }

  return callOpenAiCompatibleChat(config, {
    messages,
    temperature: 0.3,
    defaultTimeoutMs: 60_000,
    httpErrorPrefix: "统一大模型 API 调用失败:",
  });
}

function shouldRetryGlobalModelError(error: any) {
  const message = String(error?.message || error || "");
  const status = Number(message.match(/HTTP\s+(\d{3})/i)?.[1] || 0);
  if (status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status)) return false;
  return true;
}

async function callGlobalModelWithRetry(config: any, messages: any[], options: { attempts?: number; delayMs?: number; call?: (config: any, messages: any[]) => Promise<string> } = {}) {
  const attempts = Math.max(1, Math.min(3, Number(options.attempts || 2)));
  const delayMs = Math.max(0, Math.min(5_000, Number(options.delayMs ?? 500)));
  const call = options.call || callLlm;
  let lastError: any = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await call(config, messages);
    } catch (error: any) {
      lastError = error;
      if (attempt >= attempts || !shouldRetryGlobalModelError(error)) throw error;
      console.warn(`[全局 Agent] 统一大模型调用暂时失败，正在重试（${attempt + 1}/${attempts}）：${compactPetText(error?.message || error, 240)}`);
      if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function runGlobalModelRetrySelfTest() {
  let transientCalls = 0;
  const transient = await callGlobalModelWithRetry({}, [], {
    attempts: 2,
    delayMs: 0,
    call: async () => {
      transientCalls += 1;
      if (transientCalls === 1) throw new Error("统一大模型 API 调用失败: HTTP 503 - temporary");
      return "ok";
    },
  });
  let permanentCalls = 0;
  let permanentRejected = false;
  try {
    await callGlobalModelWithRetry({}, [], {
      attempts: 2,
      delayMs: 0,
      call: async () => {
        permanentCalls += 1;
        throw new Error("统一大模型 API 调用失败: HTTP 400 - invalid request");
      },
    });
  } catch {
    permanentRejected = true;
  }
  const checks = {
    transientFailureRetriesOnce: transient === "ok" && transientCalls === 2,
    permanentClientErrorDoesNotRetry: permanentRejected && permanentCalls === 1,
    openAiBaseUrlUsesV1Endpoint: normalizeChatCompletionsUrl("https://provider.example") === "https://provider.example/v1/chat/completions",
    anthropicBaseUrlUsesV1Endpoint: normalizeAnthropicMessagesUrl("https://provider.example") === "https://provider.example/v1/messages",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

