import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { queryKnowledgeBase } from "../knowledge/rag";
import { execFileSync } from "child_process";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  buildUploadedFilesContext,
  CCM_DIR
} from "../../core/utils";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator";
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
  acquireIdempotency,
  appendTraceEvent,
  completeIdempotency,
  ensureTraceId,
  failIdempotency,
  getIdempotencyRecord,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";
import { buildProjectMemoryPacket } from "../../projects/memory";
import {
  buildSelfContainedWorkerHandoff,
  renderSelfContainedWorkerHandoff,
  summarizeWorkerHandoffForUser,
} from "../../agents/worker-handoff";
import {
  buildGlobalGroupMemoryContext,
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
import { buildTraceReplaySuite, replayAgentTrace, runAgentRuntimeKernelSelfTest } from "../../agents/runtime-kernel";
import {
  buildGlobalAgentSessionDebug,
  buildGlobalAgentToolDefinitions,
  deleteGlobalAgentHook,
  deleteGlobalAgentPermissionRule,
  getGlobalAgentBackgroundOutput,
  loadGlobalAgentHooks,
  loadGlobalAgentPermissionRules,
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
    query_group_memory: "查询群聊记忆",
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

const GLOBAL_AGENT_HISTORY_METADATA_KEYS = [
  "type",
  "source",
  "files",
  "agenticRun",
  "agentic_run",
  "globalMission",
  "global_mission",
  "globalMissionChildren",
  "global_mission_children",
  "globalMissionSupervisor",
  "global_mission_supervisor",
  "progressCheckpoints",
  "progress_checkpoints",
  "final_delivery_report",
  "finalDeliveryReport",
  "delivery_report",
  "deliveryReport",
  "display_stream",
  "displayStream",
  "workchain",
  "technical",
  "technical_content",
  "technicalContent",
  "trace_id",
  "mission_id",
  "run_id",
  "finalNotified",
];

function truncateGlobalHistoryValue(value: any, maxChars = 80_000): any {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value.length > maxChars ? value.slice(0, maxChars) : value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  try {
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return value;
    return { truncated: true, preview: json.slice(0, maxChars), original_chars: json.length };
  } catch {
    return null;
  }
}

function pickGlobalAgentHistoryMetadata(message: any) {
  const metadata: any = {};
  for (const key of GLOBAL_AGENT_HISTORY_METADATA_KEYS) {
    if (message?.[key] !== undefined) {
      const value = truncateGlobalHistoryValue(message[key]);
      if (value !== undefined) metadata[key] = value;
    }
  }
  return metadata;
}

function normalizeGlobalAgentMessage(item: any) {
  if (!item || !["user", "assistant"].includes(String(item.role || "")) || !String(item.content || "").trim()) return null;
  const role = String(item.role);
  const rawContent = String(item.content || "").slice(0, 8000);
  const visible = role === "assistant"
    ? buildGlobalVisibleReplyContent({ value: rawContent, rawSource: item.technical_content || item.technicalContent || rawContent, fallback: "回复已整理，技术细节已放入技术详情。", max: 8000 })
    : { text: rawContent, technical_content: "" };
  const metadata = pickGlobalAgentHistoryMetadata(item);
  if (role === "assistant" && visible.technical_content && !metadata.technical_content) metadata.technical_content = visible.technical_content;
  return {
    ...metadata,
    role,
    content: visible.text,
    timestamp: item.timestamp || new Date().toISOString(),
  };
}

function normalizeGlobalAgentMessages(messages: any[] = []) {
  return messages
    .map((item: any) => normalizeGlobalAgentMessage(item))
    .filter(Boolean)
    .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}

function globalAgentHistoryMessageKey(message: any) {
  return [
    String(message?.role || ""),
    String(message?.timestamp || ""),
    String(message?.content || ""),
  ].join("\u0001");
}

function mergeGlobalAgentMessages(existing: any[] = [], incoming: any[] = []) {
  const seen = new Set<string>();
  const byKey = new Map<string, any>();
  const candidates = [...(existing || []), ...(incoming || [])]
    .map((item: any) => normalizeGlobalAgentMessage(item))
    .filter(Boolean);
  for (const message of candidates) {
    const key = globalAgentHistoryMessageKey(message);
    const previous = byKey.get(key);
    byKey.set(key, previous ? { ...previous, ...pickGlobalAgentHistoryMetadata(message), role: previous.role, content: previous.content, timestamp: previous.timestamp } : message);
  }
  const merged: any[] = [];
  for (const message of byKey.values()) {
    const key = globalAgentHistoryMessageKey(message);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(message);
  }
  return merged
    .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
    .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}

export function runGlobalAgentHistorySyncSelfTest() {
  const timestamp = "2026-07-07T10:00:00.000Z";
  const completedRun = {
    id: "run-history-sync",
    status: "completed",
    final_reply: "登录修复已完成。",
    final_delivery_report: {
      schema: "ccm-main-agent-delivery-report-v1",
      headline: "登录修复已完成。",
      status: "done",
      files: ["src/Login.vue"],
      verification: ["npm test"],
    },
    display_stream: {
      schema: "ccm-streamlined-display-v2",
      delivery_report: {
        schema: "ccm-main-agent-delivery-report-v1",
        headline: "登录修复已完成。",
      },
    },
  };
  const normalized = normalizeGlobalAgentMessages([{
    role: "assistant",
    content: "登录修复已完成。",
    timestamp,
    type: "global_agent_result",
    agenticRun: completedRun,
    progress_checkpoints: { items: [{ label: "任务交付完成", status: "done" }] },
  }])[0] as any;
  const protocolNormalized = normalizeGlobalAgentMessages([{
    role: "assistant",
    content: "CCM_AGENT_RECEIPT status=done trace_id=trace-secret <task-notification>raw payload</task-notification>",
    timestamp,
  }])[0] as any;
  const artifactNormalized = normalizeGlobalAgentMessages([{
    role: "assistant",
    content: "TestAgent report: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/report.md; manifest: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/artifact-manifest.json",
    timestamp,
  }])[0] as any;
  const merged = mergeGlobalAgentMessages(
    [{ role: "assistant", content: "登录修复已完成。", timestamp }],
    [normalized],
  )[0] as any;
  const checks = {
    preservesType: normalized?.type === "global_agent_result",
    preservesRun: normalized?.agenticRun?.id === "run-history-sync",
    preservesDeliveryReport: normalized?.agenticRun?.final_delivery_report?.headline === "登录修复已完成。",
    mergesRicherMetadata: merged?.agenticRun?.final_delivery_report?.files?.includes("src/Login.vue"),
    preservesProgressCheckpoints: merged?.progress_checkpoints?.items?.[0]?.label === "任务交付完成",
    sanitizesProtocolContent: !String(protocolNormalized?.content || "").includes("CCM_AGENT_RECEIPT")
      && String(protocolNormalized?.technical_content || "").includes("CCM_AGENT_RECEIPT"),
    sanitizesArtifactPathContent: !/test-agent-artifacts|artifact-manifest\.json|report\.md/i.test(String(artifactNormalized?.content || ""))
      && String(artifactNormalized?.technical_content || "").includes("artifact-manifest.json"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

function loadGlobalAgentHistoryStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8"));
      return { sessions: [], ...data };
    }
  } catch {}
  try {
    const recovered = JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8"));
    return { sessions: [], ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
  } catch {}
  return { current_session_id: "", sessions: [] };
}

function saveGlobalAgentHistoryStore(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.sessions = sessions
    .map((session: any) => ({
      ...session,
      messages: normalizeGlobalAgentMessages(session.messages || []),
      updatedAt: session.updatedAt || new Date().toISOString(),
    }))
    .filter((session: any) => session.id && session.messages.length > 0)
    .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, GLOBAL_AGENT_SESSION_LIMIT);
  writeGlobalJsonAtomic(GLOBAL_AGENT_HISTORY_FILE, store);
}

function syncGlobalAgentWebHistory(payload: any) {
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
  const store = loadGlobalAgentHistoryStore();
  const byId = new Map<string, any>();
  for (const session of store.sessions || []) byId.set(String(session.id), session);
  for (const session of sessions) {
    const id = String(session.id || "").trim();
    if (!id) continue;
    try {
      ingestGlobalAgentConversation({ sessionId: id, source: "web", messages: session.messages || [] });
    } catch (error: any) {
      console.warn(`[全局记忆] Web 会话写入失败 (${id})：${error?.message || error}`);
    }
    const existing = byId.get(id);
    byId.set(id, {
      id,
      name: session.name || existing?.name || "全局 Agent 会话",
      source: "web",
      createdAt: existing?.createdAt || session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: mergeGlobalAgentMessages(existing?.messages || [], session.messages || []),
    });
  }
  store.sessions = Array.from(byId.values());
  if (payload.currentSessionId) store.current_session_id = String(payload.currentSessionId);
  saveGlobalAgentHistoryStore(store);
  return store;
}

function getBaseGlobalAgentMessages(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  const current = sessions.find((item: any) => item.id === store.current_session_id && item.source !== "feishu")
    || sessions.find((item: any) => item.source === "web")
    || sessions[0];
  return normalizeGlobalAgentMessages(current?.messages || []);
}

function getGlobalAgentConversationMessages(sessionId: string) {
  const store = loadGlobalAgentHistoryStore();
  const existing = (store.sessions || []).find((item: any) => item.id === sessionId);
  if (existing) return normalizeGlobalAgentMessages(existing.messages || []);
  return getBaseGlobalAgentMessages(store);
}

function appendGlobalAgentConversationMessage(sessionId: string, role: "user" | "assistant", content: string, source = "feishu") {
  const store = loadGlobalAgentHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: source === "feishu" ? "飞书全局 Agent" : "全局 Agent 会话",
      source,
      createdAt: new Date().toISOString(),
      messages: getBaseGlobalAgentMessages(store),
    };
    sessions.unshift(session);
  }
  const message = { role, content, timestamp: new Date().toISOString(), source };
  try {
    ingestGlobalAgentConversation({ sessionId, source, messages: [message] });
  } catch (error: any) {
    console.warn(`[全局记忆] 会话消息写入失败 (${sessionId})：${error?.message || error}`);
  }
  session.messages = normalizeGlobalAgentMessages([...(session.messages || []), message]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  saveGlobalAgentHistoryStore(store);
}

function buildFeishuConversationId(payload: any) {
  const raw = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || payload?.message?.session_id || payload?.data?.session_id || "default";
  return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
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

function inferLocalGlobalAction(message: string, projects: string[], groups: any[], resources: any = {}): LocalIntentResult | null {
  const text = normalizeText(message);
  if (!text) return null;
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
    [/模板|提示词/, "templates", "对话模板"],
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
      && supervisedSingleProjectPayload.single_project_supervision.independent_review_required === true
      && supervisedSingleProjectPayload.single_project_supervision.post_review_spot_check_required === true,
    singleProjectDispatchCarriesReviewAcceptance: supervisedSingleProjectPayload.acceptance.includes("TestAgent")
      && supervisedSingleProjectPayload.acceptance.includes("主 Agent 抽查")
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
    globalHistoryMergePreservesBackendCompletion,
    statusChecks,
    directDispatchChecks,
    testAgentRelayChecks,
    visibleReply,
  };
}

function decryptFeishuEvent(encrypted: string, encryptKey: string): any {
  const key = crypto.createHash("sha256").update(encryptKey).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.alloc(16));
  decipher.setAutoPadding(true);
  const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plain);
}

function normalizeFeishuEventPayload(payload: any, config: any): any {
  if (!payload?.encrypt) return payload;
  const encryptKey = String(config.control_bot_encrypt_key || "").trim();
  if (!encryptKey) throw new Error("收到加密事件，但尚未配置 Encrypt Key");
  return decryptFeishuEvent(String(payload.encrypt), encryptKey);
}

function verifyFeishuEventToken(payload: any, config: any) {
  const expected = String(config.control_bot_verification_token || "").trim();
  if (!expected) throw new Error("控制机器人尚未配置 Verification Token");
  const actual = String(payload?.token || payload?.header?.token || "").trim();
  if (!actual || actual !== expected) throw new Error("飞书事件 Verification Token 校验失败");
}

function extractFeishuMessageText(payload: any): string {
  const message = payload?.event?.message || {};
  if (message.message_type !== "text") return "";
  let content: any = {};
  try { content = JSON.parse(String(message.content || "{}")); } catch {}
  return String(content.text || "")
    .replace(/@_user_\d+/g, "")
    .replace(/<at[^>]*>.*?<\/at>/gi, "")
    .trim();
}

function extractCcConnectHookText(payload: any): string {
  const candidates = [
    payload?.message?.text,
    payload?.message?.content,
    payload?.message,
    payload?.text,
    payload?.content,
    payload?.prompt,
    payload?.data?.message?.text,
    payload?.data?.message?.content,
    payload?.data?.text,
    payload?.data?.content,
    payload?.event?.message?.text,
    payload?.event?.message?.content,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.trim()) {
      let text = item.trim();
      if (/^\{/.test(text)) {
        try {
          const parsed = JSON.parse(text);
          text = String(parsed.text || parsed.content || text).trim();
        } catch {}
      }
      return text
        .replace(/@_user_\d+/g, "")
        .replace(/<at[^>]*>.*?<\/at>/gi, "")
        .trim();
    }
  }
  return "";
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

function compactGlobalTestAgentExecutionPlanRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
  if (String(event?.type || "") !== "test_agent_execution_plan_ready") return null;
  const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
  if (!plan) return null;
  const rawSummary = event.test_agent_execution_plan_summary || event.testAgentExecutionPlanSummary || event.detail || "";
  const blocked = plan?.valid === false || String(event.status || "").toLowerCase() === "warn";
  const detail = globalVisibleText(
    blocked
      ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
      : "TestAgent 已生成复核计划，我会按计划启动独立复核。",
    "TestAgent 复核计划已整理。",
    260,
  );
  return {
    type: "test_agent_execution_plan_ready",
    source: "group-main-agent",
    run_id: options.globalRunId || event.run_id || "",
    trace_id: options.traceId || event.trace_id || "",
    status: options.status || "running",
    phase: options.phase || "execute",
    agent: event.agent || "TestAgent",
    taskId: event.taskId || event.task_id || "",
    task_id: event.task_id || event.taskId || "",
    detail,
    testAgentExecutionPlan: plan,
    test_agent_execution_plan: plan,
    testAgentExecutionPlanSummary: rawSummary,
    test_agent_execution_plan_summary: rawSummary,
    technical: {
      test_agent_execution_plan: plan,
      test_agent_plan_dispatch: event.technical?.test_agent_plan_dispatch || event.technical?.testAgentPlanDispatch || null,
      group_task_id: event.task_id || event.taskId || "",
    },
  };
}

function compactGlobalTestAgentReviewRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
  if (String(event?.type || "") !== "test_agent_review_ready" && String(event?.type || "") !== "agent_done") return null;
  const receipt = event.receipt || event.testAgentReceipt || event.test_agent_receipt || event.data?.receipt || null;
  const report = event.test_agent_report || event.testAgentReport || receipt?.testAgentReport || receipt?.test_agent_report || null;
  if (!receipt && !report && !/TestAgent\s*独立复核完成|TestAgent.+复核/i.test(String(event.text || event.detail || ""))) return null;
  const verdict = event.test_agent_verdict || event.testAgentVerdict || report?.verdict || receipt?.testAgentVerdict || receipt?.test_agent_verdict || receipt?.testAgentReport?.verdict || receipt?.test_agent_report?.verdict || null;
  const rawStatus = String(verdict?.status || report?.status || receipt?.status || event.status || "").toLowerCase();
  const rawRecommendation = String(verdict?.recommendation || report?.recommendation || receipt?.testAgentReport?.recommendation || "").toLowerCase();
  const postReviewSpotCheck = event.technical?.post_review_spot_check
    || event.post_review_spot_check
    || event.postReviewSpotCheck
    || receipt?.post_review_spot_check
    || receipt?.postReviewSpotCheck
    || null;
  const postReviewSpotCheckSummary = event.post_review_spot_check_summary
    || event.postReviewSpotCheckSummary
    || receipt?.post_review_spot_check_summary
    || receipt?.postReviewSpotCheckSummary
    || buildPostReviewSpotCheckSummary(postReviewSpotCheck);
  const spotCheckRequired = postReviewSpotCheck?.required === true;
  const spotCheckPassed = !spotCheckRequired || postReviewSpotCheck?.pass === true || postReviewSpotCheck?.status === "passed";
  const spotCheckNeedsUser = spotCheckRequired && !spotCheckPassed && /needs[_-]?user|manual|待确认|人工/i.test(String(postReviewSpotCheck?.status || postReviewSpotCheckSummary?.status || ""));
  const spotCheckNeedsRecheck = spotCheckRequired && !spotCheckPassed && !spotCheckNeedsUser;
  const coverageGaps = collectGlobalTestAgentCoverageGaps(report, verdict);
  const hasFailedCoverage = coverageGaps.failedLines.length > 0;
  const hasUnknownCoverage = coverageGaps.unknownLines.length > 0;
  const hasWeakAcceptance = coverageGaps.weakLines.length > 0;
  const browserFlows = summarizeTestAgentBrowserFlows(report, verdict);
  const hasFailedBrowserFlows = !!browserFlows?.failedCount || !!browserFlows?.failedStepCount;
  const hasIncompleteBrowserFlows = !!browserFlows?.blockedCount || !!browserFlows?.skippedCount;
  const multiSessionBrowser = summarizeTestAgentMultiSessionBrowser(report, verdict);
  const hasFailedMultiSessionBrowser = !!multiSessionBrowser?.failedCount
    || !!multiSessionBrowser?.failedStepCount
    || !!multiSessionBrowser?.failedComparisonCount;
  const hasIncompleteMultiSessionBrowser = !!multiSessionBrowser?.blockedCount || !!multiSessionBrowser?.skippedCount;
  const browserAuthentication = summarizeTestAgentBrowserAuthentication(report, verdict);
  const hasFailedBrowserAuthentication = !!browserAuthentication?.failedChecks;
  const hasIncompleteBrowserAuthentication = !!browserAuthentication?.blockedChecks || !!browserAuthentication?.pendingChecks;
  const browserActionEffects = summarizeTestAgentBrowserActionEffects(report, verdict);
  const hasFailedBrowserActionEffects = !!browserActionEffects?.unchanged;
  const hasIncompleteBrowserActionEffects = !!browserActionEffects?.unavailable;
  const browserRecovery = summarizeTestAgentBrowserRecovery(report, verdict);
  const hasIncompleteBrowserRecovery = !!browserRecovery?.failed || !!browserRecovery?.notRetried;
  const adversarialEvidence = summarizeTestAgentAdversarialEvidence(report, verdict);
  const hasFailedAdversarialEvidence = adversarialEvidence?.status === "failed";
  const hasIncompleteAdversarialEvidence = adversarialEvidence?.status === "missing"
    || adversarialEvidence?.status === "unlinked";
  const hasBlockedAdversarialEvidence = adversarialEvidence?.status === "blocked";
  const failureSummaries = collectGlobalTestAgentFailureSummaries(report, verdict);
  const receiptBlockers = Array.isArray(receipt?.blockers) ? receipt.blockers : [];
  const blockers = globalUniqueStrings(
    receiptBlockers,
    failureSummaries.failureLines,
    browserAuthentication?.failedLines || [],
    browserAuthentication?.incompleteLines || [],
    browserActionEffects?.failedLines || [],
    browserActionEffects?.recheckLines || [],
    browserRecovery?.recheckLines || [],
    adversarialEvidence?.failedLines || [],
    adversarialEvidence?.recheckLines || [],
    adversarialEvidence?.blockedLines || [],
    multiSessionBrowser?.failedLines || [],
    multiSessionBrowser?.incompleteLines || [],
    browserFlows?.failedLines || [],
    browserFlows?.incompleteLines || [],
    coverageGaps.failedLines,
    coverageGaps.unknownLines,
    coverageGaps.weakLines,
    spotCheckNeedsRecheck || spotCheckNeedsUser ? [postReviewSpotCheckSummary?.headline || "完成前抽查尚未通过"] : []
  );
  const verification = Array.isArray(receipt?.verification) ? receipt.verification : [];
  const canAccept = !hasFailedCoverage
    && !hasUnknownCoverage
    && !hasWeakAcceptance
    && !hasFailedBrowserFlows
    && !hasIncompleteBrowserFlows
    && !hasFailedMultiSessionBrowser
    && !hasIncompleteMultiSessionBrowser
    && !hasFailedBrowserAuthentication
    && !hasIncompleteBrowserAuthentication
    && !hasFailedBrowserActionEffects
    && !hasIncompleteBrowserActionEffects
    && !hasIncompleteBrowserRecovery
    && !hasFailedAdversarialEvidence
    && !hasIncompleteAdversarialEvidence
    && !hasBlockedAdversarialEvidence
    && !failureSummaries.hasRework
    && !failureSummaries.hasNeedsUser
    && spotCheckPassed
    && blockers.length === 0
    && (verdict?.canAccept === true || rawRecommendation === "accept" || rawStatus === "passed");
  const needsRework = hasFailedCoverage
    || hasFailedBrowserFlows
    || hasFailedMultiSessionBrowser
    || hasFailedBrowserAuthentication
    || hasFailedBrowserActionEffects
    || hasFailedAdversarialEvidence
    || failureSummaries.hasRework
    || verdict?.needsRework === true
    || rawRecommendation.includes("rework")
    || rawStatus === "failed";
  const needsRecheck = !needsRework && (
    spotCheckNeedsRecheck
    || hasIncompleteBrowserActionEffects
    || hasIncompleteBrowserRecovery
    || hasIncompleteAdversarialEvidence
    || verdict?.needsRecheck === true
  );
  const needsEnvironment = !needsRework && !needsRecheck && (
    hasBlockedAdversarialEvidence
    || verdict?.needsEnvironment === true
  );
  const needsHuman = !needsRework && !needsRecheck && !needsEnvironment && (
    hasUnknownCoverage
    || hasWeakAcceptance
    || hasIncompleteBrowserFlows
    || hasIncompleteMultiSessionBrowser
    || hasIncompleteBrowserAuthentication
    || failureSummaries.hasNeedsUser
    || spotCheckNeedsUser
    || verdict?.needsHuman === true
    || rawRecommendation.includes("human")
    || rawStatus === "blocked"
  );
  const status = needsRework
    ? "needs_rework"
    : needsRecheck
      ? "needs_recheck"
      : needsEnvironment || needsHuman
        ? "needs_user"
        : canAccept
          ? "passed"
          : "recorded";
  const statusLabel = status === "passed"
    ? "已通过"
    : status === "needs_recheck"
      ? "需复验"
      : status === "needs_rework"
        ? "需返工"
        : status === "needs_user"
          ? needsEnvironment
            ? "补条件"
            : "等你确认"
          : "已记录";
  const reviewer = event.agent || receipt?.reviewer || receipt?.agent || "TestAgent";
  const detail = globalVisibleText(event.detail || receipt?.summary || event.text || "", "TestAgent 已提交独立复核结论，我会纳入最终验收。", 320);
  const evidence = [
    `${reviewer}：${statusLabel}`,
    ...(Array.isArray(postReviewSpotCheckSummary?.rows) ? postReviewSpotCheckSummary.rows.slice(0, 3) : []),
    ...(browserAuthentication?.evidenceLines || []).slice(0, 3),
    ...(browserActionEffects?.evidenceLines || []).slice(0, 4),
    ...(browserRecovery?.evidenceLines || []).slice(0, 3),
    ...(adversarialEvidence?.evidenceLines || []).slice(0, 4),
    ...(multiSessionBrowser?.evidenceLines || []).slice(0, 4),
    ...(browserFlows?.evidenceLines || []).slice(0, 4),
    verification.length ? `验证证据：${globalVisibleText(verification[0], "已记录验证证据。", 180)}` : "",
    ...failureSummaries.failureLines.slice(0, 3).map((item: any) => `返工重点：${globalVisibleText(item, "复核发现待处理问题。", 180)}`),
    ...failureSummaries.diagnosticLines.slice(0, 2).map((item: any) => `排查建议：${globalVisibleText(item, "按复核诊断先排查。", 180)}`),
    ...blockers.slice(0, 3).map((item: any) => `待处理：${globalVisibleText(item, "复核发现待处理缺口。", 180)}`),
    ...coverageGaps.weakLines.slice(0, 2).map((item: any) => `待确认：${globalVisibleText(item, "复核证据强度仍需确认。", 180)}`),
  ].filter(Boolean);
  const summary = {
    schema: "ccm-main-agent-independent-review-summary-v1",
    title: "独立复核",
    status,
    status_label: statusLabel,
    headline: status === "passed"
      ? spotCheckPassed && spotCheckRequired
        ? "TestAgent 已完成独立复核，我的关键验证抽查也已通过。"
        : "TestAgent/独立复核已检查交付证据，我可以继续做最终验收。"
      : status === "needs_rework"
        ? "独立复核发现待处理缺口，我会先安排返工，再重新验收。"
        : status === "needs_recheck"
          ? spotCheckNeedsRecheck
            ? "TestAgent 已通过，但我的完成前抽查尚未一致，我会先重新复验。"
            : "TestAgent 的复核证据还没有闭环，我会先补齐检查并重新复验，不会直接要求原实现成员返工。"
        : status === "needs_user"
          ? needsEnvironment
            ? "TestAgent 的复核受环境或登录条件阻塞，我会先补齐条件再继续验收。"
            : "独立复核需要人工确认，我会先暂停最终验收。"
          : detail,
    rows: evidence.length ? evidence : [detail],
    next_action: status === "passed"
      ? "继续核对交付总结、改动和验证结果。"
      : status === "needs_rework"
        ? "先处理复核指出的缺口，再重新执行验收。"
        : status === "needs_recheck"
          ? spotCheckNeedsRecheck
            ? "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。"
            : "补齐可观察结果或目标关联的边界检查后，重新运行 TestAgent 复核。"
        : status === "needs_user"
          ? needsEnvironment
            ? "先补齐环境、登录或运行条件，再继续 TestAgent 复核。"
            : "等待你确认复核标记的问题。"
          : "继续等待完整复核证据或最终总结。",
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  };
  const reviewRows = [{
    reviewer,
    verdict: status,
    summary: detail,
    evidence: evidence.slice(0, 8),
  }];
  return {
    type: "test_agent_review_ready",
    source: "group-main-agent",
    run_id: options.globalRunId || event.run_id || "",
    trace_id: options.traceId || event.trace_id || "",
    status: options.status || "running",
    phase: options.phase || "execute",
    agent: reviewer,
    taskId: event.taskId || event.task_id || "",
    task_id: event.task_id || event.taskId || "",
    detail,
    independent_review_summary: summary,
    independentReviewSummary: summary,
    test_agent_review_summary: summary,
    testAgentReviewSummary: summary,
    independent_review: reviewRows,
    independentReview: reviewRows,
    test_agent_report: report,
    testAgentReport: report,
    test_agent_verdict: verdict,
    testAgentVerdict: verdict,
    post_review_spot_check_summary: postReviewSpotCheckSummary,
    postReviewSpotCheckSummary: postReviewSpotCheckSummary,
    receipt,
    technical: {
      receipt,
      test_agent_report: report,
      test_agent_verdict: verdict,
      post_review_spot_check: postReviewSpotCheck,
      group_task_id: event.task_id || event.taskId || "",
    },
  };
}

function relayGlobalTestAgentEventFromGroup(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string; onEvent?: (event: any) => void } = {}) {
  const relayed = compactGlobalTestAgentExecutionPlanRelayEvent(event, options) || compactGlobalTestAgentReviewRelayEvent(event, options);
  if (!relayed) return null;
  try { options.onEvent?.(relayed); } catch {}
  return relayed;
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

const GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_ids|native_session|task_agent_session|Runtime Kernel|Trace Replay|scratchpad|回执要求/i;

function sanitizeGlobalDirectAgentOutput(value: any, fallback = "执行目标已返回结果，详细排障信息已放入技术详情。", max = 700) {
  let text = String(value || "").replace(/\r/g, "").trim();
  if (!text) return sanitizeMainAgentUserText(fallback, fallback, max);
  if (GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(text)) {
    if (/error|失败|denied|invalid|权限|门禁/i.test(text)) return sanitizeMainAgentUserText("执行时遇到需要排查的问题，详细原因已放入技术详情。", fallback, max);
    if (/done|完成|receipt|回执/i.test(text)) return sanitizeMainAgentUserText("执行成员已提交结果说明，我会继续汇总验收。", fallback, max);
    return sanitizeMainAgentUserText(fallback, fallback, max);
  }
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return sanitizeMainAgentUserText(text.length > max ? `${text.slice(0, max)}...` : text, fallback, max);
}

function formatGlobalDevelopmentDispatchVisibleResult(result: any = {}, params: any = {}) {
  const title = sanitizeGlobalDirectAgentOutput(
    result?.mission?.title || params?.title || params?.business_goal || params?.goal || "全局开发任务",
    "全局开发任务",
    120
  );
  const targetCount = Number(
    Array.isArray(result?.children) ? result.children.length
      : Array.isArray(params?.targets) ? params.targets.length
        : 0
  );
  const rejectedCount = Array.isArray(result?.rejected) ? result.rejected.length : 0;
  return [
    "全局开发任务已建立，并开始派发给相关执行目标。",
    `- 标题：${title}`,
    `- 执行目标：${targetCount} 个`,
    rejectedCount ? `- 需要留意：${rejectedCount} 个目标暂未派发成功，原因已放入技术详情。` : "",
    "- 状态：这只是已受理并进入持续跟进，不代表已经完成。",
    "- 详细记录：已同步到 CCM 任务列表和技术详情。",
  ].filter(Boolean).join("\n");
}

function formatGlobalTaskDispatchVisibleResult(result: any = {}, params: any = {}) {
  const title = sanitizeGlobalDirectAgentOutput(
    result?.task?.title || params?.title || params?.business_goal || params?.businessGoal || "协作任务",
    "协作任务",
    120
  );
  const queueText = result?.queue?.queued
    ? `已进入执行队列（位置 ${result.queue.position || 1}）`
    : (result?.queue?.message || "已保存到任务链路");
  return [
    "协作任务已派发，并进入自动执行队列。",
    `- 标题：${title}`,
    `- 状态：${queueText}`,
    "- 说明：这只是已进入任务链路，不代表需求已经完成；最终结果以任务卡验收和总结为准。",
    "- 详细记录：已同步到 CCM 任务列表和技术详情。",
  ].filter(Boolean).join("\n");
}

function resolveGlobalDispatchProject(project: string) {
  const config = getConfigs().find((item: any) => item.name === project);
  const info = config ? (getConfigInfo(config.path)?.[0] || {}) : {};
  return {
    project,
    config,
    workDir: info.workDir || "",
    agentType: info.agent || "claudecode",
    platform: info.platform || "",
  };
}

function inferGlobalDirectDispatchRequiresCodeChanges(message: string) {
  const text = normalizeText(message);
  const explicitCodeChange = /(修改|修复|实现|新增|删除|重构|改代码|开发|接入|对接|bug|页面|接口|字段|schema|配置)/i.test(text);
  const readOnlyOnly = /(只读|仅分析|只分析|不要修改|不修改|不改代码|无需代码|无需修改|运行测试|执行测试|跑测试|检查|审查|review)/i.test(text);
  if (readOnlyOnly && !explicitCodeChange) return false;
  return true;
}

function buildGlobalDirectDispatchHandoff(input: {
  kind: "group" | "project";
  message: string;
  originalText?: string;
  project?: string;
  group?: any;
  targetProject?: string;
  traceId?: string;
}) {
  const targetProject = input.project || input.targetProject || "coordinator";
  const runtime = resolveGlobalDispatchProject(targetProject);
  const groupLabel = input.group ? `${input.group.name || input.group.id || "未命名群聊"}` : "";
  const userGoal = String(input.originalText || input.message || "").trim();
  const kindLabel = input.kind === "group" ? "群聊主 Agent" : "项目 Agent";
  const handoff = buildSelfContainedWorkerHandoff({
    group: input.group || null,
    project: targetProject,
    task: input.message,
    userGoal,
    source: "全局主 Agent 直接派发",
    reason: input.kind === "group"
      ? `全局主 Agent 判断该需求需要交给群聊「${groupLabel || input.group?.id || "目标群聊"}」的主 Agent 接管`
      : `全局主 Agent 判断该需求适合由项目「${targetProject}」直接执行`,
    workDir: runtime.workDir,
    agentType: runtime.agentType,
    traceId: input.traceId,
    analysis: {
      summary: userGoal,
      documentFindings: [
        input.kind === "group" ? `目标群聊：${groupLabel || input.group?.id || "未指定"}` : `目标项目：${targetProject}`,
        `接收方：${kindLabel}`,
      ],
      constraints: [
        "用户可见回复保持自然友好，技术排障信息默认放入技术详情。",
        "完成后必须说明完成内容、验证结果、风险和下一步。",
      ],
    },
    verificationHints: input.kind === "group"
      ? ["群聊任务卡持续展示计划、执行、验收和最终总结。"]
      : ["运行与本次指令匹配的最小必要验证；未运行必须说明原因。"],
    acceptance: [
      "用户能看懂主 Agent 当前计划、执行进度和最终结论。",
      "涉及代码时必须说明实际文件变更和验证结果。",
      "如被阻塞，明确还需要用户或其他 Agent 补充什么。",
    ],
    requiresCodeChanges: inferGlobalDirectDispatchRequiresCodeChanges(input.message),
  });
  return { handoff, summary: summarizeWorkerHandoffForUser(handoff), runtime };
}

function buildGlobalSingleProjectMissionPayload(input: {
  project: string;
  message: string;
  originalText?: string;
  traceId?: string;
  globalRunId?: string;
  sessionId?: string;
  source?: string;
  idempotencyKey?: string;
}) {
  const project = String(input.project || "").trim();
  const message = String(input.message || input.originalText || "").trim();
  const userGoal = String(input.originalText || message).trim();
  const requiresCodeChanges = inferGlobalDirectDispatchRequiresCodeChanges(message);
  return {
    title: compactPetText(userGoal || message || `处理 ${project} 项目任务`, 100),
    business_goal: userGoal || message,
    acceptance: [
      "项目执行成员必须说明实际动作、文件变化、已执行验证和剩余风险。",
      "需要独立复核时，TestAgent 必须基于最新状态执行；复核失败先返工再复验。",
      "TestAgent 通过后由主 Agent 抽查关键验证，全部门禁通过后才能输出最终总结。",
    ].join("；"),
    targets: [{
      type: "project",
      project,
      task: message,
      reason: "全局主 Agent 判断该需求适合由指定项目执行，并由全局任务链持续监督验收。",
      requires_code_changes: requiresCodeChanges,
      requires_verification: true,
      requires_independent_review: true,
    }],
    requires_code_changes: requiresCodeChanges,
    requires_verification: true,
    requires_independent_review: true,
    auto_execute: true,
    source: input.source || "global-agent-single-project-dispatch",
    trace_id: input.traceId || "",
    global_run_id: input.globalRunId || "",
    session_id: input.sessionId || "default",
    idempotency_key: input.idempotencyKey || "",
    single_project_supervision: {
      schema: "ccm-global-single-project-supervision-v1",
      project,
      independent_review_required: true,
      post_review_spot_check_required: true,
    },
  };
}

function renderGlobalDirectGroupWorkOrder(input: {
  group: any;
  targetProject: string;
  message: string;
  originalText?: string;
  handoff: any;
}) {
  const summary = summarizeWorkerHandoffForUser(input.handoff);
  const members = (input.group?.members || []).map((item: any) => item.project).filter(Boolean).slice(0, 8);
  return [
    "【全局主 Agent 指令工作单】",
    `目标群聊：${input.group?.name || input.group?.id || "未命名群聊"}`,
    `接收方：${input.targetProject || "群聊主 Agent"}`,
    members.length ? `可协作成员：${members.join("、")}` : "",
    `工作单状态：${summary.label}，目标、范围、验收和总结要求已整理好。`,
    "",
    "用户目标：",
    compactPetText(input.originalText || input.message, 900),
    "",
    "请按这个链路接管：",
    "1. 先理解目标和影响范围，必要时只读检查项目上下文。",
    "2. 形成用户能看懂的计划；如果风险高，先等用户确认。",
    "3. 需要写代码时再派发给合适的子 Agent，并持续跟踪执行和回执。",
    "4. 主 Agent 负责验收；验收不通过就返工，不能把未完成写成完成。",
    "5. 完成后给用户一份最终总结：完成了什么、改了哪里、怎么验证、还有什么风险。",
    "",
    "展示要求：普通回复只写用户能看懂的话；内部排障字段和详细记录放进技术详情。",
  ].filter(Boolean).join("\n");
}

function renderGlobalDirectProjectWorkOrder(input: {
  project: string;
  message: string;
  originalText?: string;
  handoff: any;
}) {
  return [
    "【全局主 Agent 指令工作单】",
    `目标项目：${input.project}`,
    "",
    "面向用户的回复要求：",
    "- 用自然中文说明你理解的目标、实际动作、验证结果和风险。",
    "- 技术协议、执行细节和排障字段放在结构化回执或技术详情里，普通总结不要堆内部字段。",
    "- 如果不能完成，明确说明卡在哪里、需要谁补什么。",
    "",
    renderSelfContainedWorkerHandoff(input.handoff),
  ].join("\n");
}

function renderGlobalDirectGroupDispatchAcceptedSummary(input: {
  group?: any;
  groupId?: string;
  taskId?: string;
  queueText?: string;
  reply?: string;
}) {
  return [
    "协作群已收到工作单，并按任务链路接管。",
    `- 群聊：${input.group?.name || input.groupId || "目标群聊"}`,
    input.taskId ? "- 任务记录：已同步到任务列表和技术详情。" : "- 任务记录：已保存到群聊任务链路。",
    `- 状态：${input.queueText || "已保存到群聊任务链路"}`,
    "- 说明：这只是已派发并进入任务链路，不代表需求已经完成；最终结果以任务卡验收和最终总结为准。",
    "- 进度展示：计划、执行、验收和最终总结会显示在群聊任务卡中。",
    input.reply ? `\n协作说明：\n${sanitizeGlobalDirectAgentOutput(input.reply, "已接管，后续进度会在任务卡中更新。", 900)}` : "",
  ].filter(Boolean).join("\n");
}

function isGlobalProgressStatusRequest(message: string) {
  const text = normalizeText(message);
  if (!text) return false;
  if (/^(?:\/status|status|progress|任务状态|查看任务状态|全局任务|最近任务)$/i.test(text)) return true;
  if (/(设置|修改|标记|改成|更新|创建|新建|删除|移除)/.test(text) && /(任务状态|状态)/.test(text)) return false;
  return /(进展|进度|做到哪|处理到哪|现在怎么样|怎么样了|完成了吗|有结果了吗|还在(?:执行|处理|跑)|任务状态|最近任务|全局任务|how'?s it going|how is it going|what'?s the status)/i.test(text);
}

function globalStatusLabel(status: any) {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "success"].includes(value)) return "已完成";
  if (["failed", "error"].includes(value)) return "未完成";
  if (["cancelled", "canceled"].includes(value)) return "已取消";
  if (["waiting_confirmation"].includes(value)) return "等待你确认";
  if (["waiting_clarification", "waiting_user", "needs_user", "paused"].includes(value)) return "等待你补充";
  if (["blocked", "needs_attention", "needs_info"].includes(value)) return "待补齐";
  if (["pending", "queued", "planned"].includes(value)) return "排队中";
  if (["reviewing", "review", "verifying"].includes(value)) return "验收中";
  if (["reworking", "needs_rework", "retrying", "repairing"].includes(value)) return "返工中";
  if (["in_progress", "running"].includes(value)) return "处理中";
  return value || "状态未记录";
}

function flattenGlobalAcceptanceRows(...values: any[]) {
  const rows: any[] = [];
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "object" && !value.summary && !value.detail && !value.reason && !value.label && !value.verdict && !value.status) {
      if (Array.isArray(value.items)) {
        for (const item of value.items) visit(item);
        return;
      }
      if (Array.isArray(value.evidence)) {
        for (const item of value.evidence) visit(item);
        return;
      }
    }
    rows.push(value);
  };
  for (const value of values) visit(value);
  return rows;
}

function globalEvidenceText(row: any) {
  if (!row || typeof row !== "object") return String(row || "");
  return [row.summary, row.detail, row.reason, row.message, row.label, row.title, row.verdict, row.status].filter(Boolean).join(" ");
}

function isPositiveGlobalAcceptanceText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/未通过|失败|待补|待处理|缺口|证据不足|无法确认|无法验证|failed|failure|partial|incomplete|missing|blocked/i.test(text)) return false;
  return /已通过|通过|可以接受|已覆盖|已执行|已复核|已验证|passed|pass|success|ok/i.test(text);
}

function isBareGlobalAcceptanceMarker(value: any) {
  return /^(最终验收|主\s*Agent\s*验收|验收结论)\s*[：:]?\s*(已通过|通过)$/i.test(String(value || "").trim());
}

function isStrongGlobalVerificationText(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|失败|未通过|报错|错误|failed|failure|error|not\s+run|not\s+executed|suggest/i.test(text)) return false;
  return /已实际执行|已执行|外部 Runner|验证来源|命令|npm|pnpm|yarn|test|check|lint|build|playwright|pytest|exit\s*0|passed|success|ok/i.test(text);
}

function globalTaskHasStrongAcceptanceEvidence(task: any = {}) {
  const summary = task?.delivery_summary || task?.deliverySummary || {};
  const report = summary?.delivery_report || summary?.deliveryReport || task?.delivery_report || task?.deliveryReport || null;
  const gate = summary?.acceptance_gate || summary?.acceptanceGate || {};
  const gatePass = summary?.acceptance_gate_passed === true || summary?.acceptanceGatePassed === true || gate?.pass === true || report?.status === "done";
  if (!gatePass) return false;

  const gateChecks = Array.isArray(gate?.checks) ? gate.checks : (Array.isArray(gate?.items) ? gate.items : []);
  const failedCount = Number(gate?.failed_count || gate?.failedCount || gateChecks.filter((item: any) => item?.ok === false || item?.pass === false).length || 0);
  const substantiveGateIds = new Set(["actual_changes", "actual_diff", "verification", "required_verification", "verification_source", "independent_review", "final_review", "worker_receipt", "receipt_quality", "work_items", "team_shutdown"]);
  if (gateChecks.length > 0
    && failedCount === 0
    && gateChecks.every((item: any) => item?.ok !== false && item?.pass !== false)
    && gateChecks.some((item: any) => substantiveGateIds.has(String(item?.id || "")))) {
    return true;
  }

  const verificationRows = flattenGlobalAcceptanceRows(
    summary?.verification_executed,
    summary?.external_runner_verification,
    summary?.verification_results,
    summary?.verification,
    report?.verification,
    report?.verification_evidence?.executed,
    report?.verificationEvidence?.executed,
    report?.verification_evidence?.items,
    report?.verificationEvidence?.items,
    task?.verification,
    task?.verification_results,
  );
  if (verificationRows.some(isStrongGlobalVerificationText)) return true;
  if (summary?.verification_source_gate_passed === true && Number(summary?.external_runner_verification_count || 0) > 0) return true;

  const reviewRows = flattenGlobalAcceptanceRows(
    summary?.independent_review,
    summary?.independentReview,
    summary?.independent_review_evidence,
    summary?.independent_review_gate?.evidence,
    report?.independent_review,
    report?.independentReview,
  );
  if (summary?.independent_review_gate_passed === true && Number(summary?.independent_review_gate?.evidence_count || reviewRows.length || 0) > 0) return true;
  if (reviewRows.some((row: any) => isPositiveGlobalAcceptanceText(globalEvidenceText(row)) && !isBareGlobalAcceptanceMarker(globalEvidenceText(row)))) return true;

  const acceptanceRows = flattenGlobalAcceptanceRows(
    summary?.acceptance,
    summary?.acceptance_evidence,
    summary?.acceptanceEvidence,
    report?.acceptance,
    report?.acceptance_evidence,
    report?.acceptanceEvidence,
  );
  return acceptanceRows.some((row: any) => {
    const text = globalEvidenceText(row);
    return isPositiveGlobalAcceptanceText(text) && !isBareGlobalAcceptanceMarker(text);
  });
}

function globalTaskDisplayStatus(task: any = {}, rawStatus: any = task?.status) {
  const value = String(rawStatus || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(value)
    && !globalTaskHasStrongAcceptanceEvidence(task)) {
    return "reviewing";
  }
  return rawStatus;
}

function globalMissionSummaryRows(mission: any = {}) {
  return Array.isArray(mission?.mission_summary?.children) ? mission.mission_summary.children : [];
}

function globalMissionSummaryRowStrongPassed(row: any) {
  return row?.gate_passed === true
    && row?.strong_acceptance_passed !== false
    && row?.acceptance_evidence_status !== "weak"
    && row?.acceptance_evidence_status !== "missing";
}

function globalMissionTaskIds(mission: any = {}) {
  return new Set([
    ...(Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : []),
    ...globalMissionSummaryRows(mission).map((row: any) => row?.task_id),
  ].map((id: any) => String(id || "")).filter(Boolean));
}

function childTasksForGlobalMission(mission: any, tasks: any[] = []) {
  const ids = globalMissionTaskIds(mission);
  const missionId = String(mission?.id || mission?.mission_id || mission?.missionId || "");
  return tasks.filter((task: any) => {
    const taskId = String(task?.id || "");
    if (taskId && ids.has(taskId)) return true;
    return missionId && String(task?.parent_task_id || task?.parentTaskId || "") === missionId;
  });
}

function globalMissionStatusCounts(mission: any, tasks: any[] = []) {
  const summary = mission?.mission_summary || {};
  const rows = globalMissionSummaryRows(mission);
  const children = childTasksForGlobalMission(mission, tasks);
  const rowById = new Map(rows.map((row: any) => [String(row?.task_id || ""), row]));
  const total = Math.max(
    Number(summary.total || 0),
    globalMissionTaskIds(mission).size,
    children.length,
  );
  const childCompleted = children.filter((task: any) => {
    const row = rowById.get(String(task?.id || ""));
    const status = String(globalTaskDisplayStatus(task) || "").toLowerCase();
    if (["done", "completed", "success", "ok"].includes(status) && globalTaskHasStrongAcceptanceEvidence(task)) return true;
    return rows.length > 0 && globalMissionSummaryRowStrongPassed(row);
  }).length;
  const rowCompleted = rows.filter(globalMissionSummaryRowStrongPassed).length;
  const completed = children.length > 0 || rows.length > 0
    ? Math.max(childCompleted, rowCompleted)
    : Number(summary.completed || summary.passed || 0);
  const failed = Math.max(
    Number(summary.failed || 0),
    children.filter((task: any) => ["failed", "error"].includes(String(task?.status || "").toLowerCase())).length,
    rows.filter((row: any) => ["failed", "error"].includes(String(row?.status || "").toLowerCase())).length,
  );
  const weakRows = rows.filter((row: any) => row?.gate_passed === true && !globalMissionSummaryRowStrongPassed(row)).length;
  const weakDoneChildren = children.filter((task: any) => {
    const rawStatus = String(task?.status || "").toLowerCase();
    return ["done", "completed", "success", "ok"].includes(rawStatus) && !globalTaskHasStrongAcceptanceEvidence(task);
  }).length;
  const reviewing = Math.max(Number(summary.reviewing || 0), weakRows, weakDoneChildren);
  const rowBlockers = rows.filter((row: any) => Array.isArray(row?.blockers) && row.blockers.length > 0).length;
  const rawBlocked = Number(summary.blocked || 0);
  const blocked = Math.max(rowBlockers, rawBlocked > reviewing ? rawBlocked : 0);
  const allPassed = total > 0 && completed >= total && failed === 0 && reviewing === 0 && blocked === 0;
  return { total, completed, failed, blocked, reviewing, allPassed };
}

function globalMissionDisplayStatus(mission: any, counts: any = globalMissionStatusCounts(mission, [])) {
  const raw = String(mission?.status || "").toLowerCase();
  if (["done", "completed", "complete", "success", "succeeded", "ok"].includes(raw) && !counts.allPassed) return "reviewing";
  if (counts.reviewing > 0 && ["in_progress", "running", "reviewing"].includes(raw || "in_progress")) return "reviewing";
  return mission?.status;
}

function latestReadableTimeline(task: any) {
  const timeline = Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : [];
  const latest = [...timeline].reverse().find((item: any) => item?.title || item?.detail || item?.message);
  return sanitizeGlobalDirectAgentOutput(
    latest?.detail || latest?.message || latest?.title || task?.status_detail || "",
    "最近进展已更新，详细记录在任务卡技术详情里。",
    220,
  );
}

const GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS = 15 * 60 * 1000;

function globalStatusTimeMs(...values: any[]) {
  const times = values
    .map(value => Date.parse(String(value || "")))
    .filter(value => Number.isFinite(value) && value > 0);
  return times.length ? Math.max(...times) : 0;
}

function globalStatusAgeLabel(ageMs: number) {
  if (!Number.isFinite(ageMs) || ageMs <= 0) return "";
  const minutes = Math.max(1, Math.round(ageMs / 60_000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.max(1, Math.round(minutes / 60));
  if (hours < 24) return `${hours} 小时`;
  return `${Math.max(1, Math.round(hours / 24))} 天`;
}

function getGlobalStatusPickupSummary(source: any) {
  const report = source?.delivery_summary?.delivery_report
    || source?.deliverySummary?.deliveryReport
    || source?.final_delivery_report
    || source?.finalDeliveryReport
    || source?.delivery_report
    || source?.deliveryReport
    || source?.display_stream?.delivery_report
    || source?.displayStream?.deliveryReport
    || null;
  const rawStatus = report?.status
    || source?.pickup_summary?.status
    || source?.pickupSummary?.status
    || source?.delivery_summary?.status
    || source?.deliverySummary?.status
    || source?.status;
  const displayStatus = String(globalTaskDisplayStatus(source, rawStatus) || "").toLowerCase();
  const rawLooksDone = ["done", "completed", "complete", "success", "succeeded", "ok"].includes(String(rawStatus || "").toLowerCase());
  if (rawLooksDone && !["done", "completed", "success"].includes(displayStatus)) return null;
  const pickup = source?.pickup_summary
    || source?.pickupSummary
    || source?.delivery_summary?.pickup_summary
    || source?.deliverySummary?.pickupSummary
    || report?.pickup_summary
    || report?.pickupSummary
    || null;
  if (!pickup && !report) return null;
  const title = sanitizeGlobalDirectAgentOutput(pickup?.title || "回来继续看这里", "回来继续看这里", 80);
  const headline = sanitizeGlobalDirectAgentOutput(
    pickup?.current_state || pickup?.currentState || pickup?.headline || report?.headline || source?.status_detail || "",
    "我已整理当前任务状态。",
    220,
  );
  const reviewItems = Array.isArray(pickup?.review_items || pickup?.reviewItems)
    ? (pickup.review_items || pickup.reviewItems)
      .map((item: any) => sanitizeGlobalDirectAgentOutput(item, "", 120))
      .filter(Boolean)
      .slice(0, 4)
    : [];
  const resumeAction = sanitizeGlobalDirectAgentOutput(
    pickup?.resume_action || pickup?.resumeAction || (Array.isArray(report?.next_action) ? report.next_action[0] : report?.next_action) || "",
    "",
    180,
  );
  return { title, headline, reviewItems, resumeAction };
}

function getGlobalStatusProgressRefreshSummary(source: any, childTasks: any[] = [], nowMs = Date.now()) {
  const statusValue = String(globalTaskDisplayStatus(source) || "").toLowerCase();
  if (["done", "completed", "success", "cancelled", "canceled"].includes(statusValue)) return null;
  const staleMs = Math.max(60_000, Number(source?.progress_refresh_stale_ms || source?.progressRefreshStaleMs || GLOBAL_STATUS_PROGRESS_REFRESH_STALE_MS));
  const rows = (Array.isArray(childTasks) && childTasks.length ? childTasks : [source]).filter(Boolean);
  const ageRows = rows.map((task: any) => {
    const lastMs = globalStatusTimeMs(
      task?.updated_at,
      task?.updatedAt,
      task?.started_at,
      task?.startedAt,
      task?.created_at,
      task?.createdAt,
      source?.updated_at,
      source?.updatedAt,
    );
    const ageMs = lastMs ? Math.max(0, nowMs - lastMs) : 0;
    return { task, ageMs };
  });
  const stalled = ageRows.filter(({ task, ageMs }) => {
    const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
    return ["in_progress", "running", "reviewing", "reworking"].includes(value) && ageMs >= staleMs;
  });
  const staleQueued = ageRows.filter(({ task, ageMs }) => {
    const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
    return ["pending", "queued", "planned"].includes(value) && ageMs >= staleMs;
  });
  const sourceAgeMs = Math.max(...ageRows.map(row => row.ageMs), 0);
  const sourceLong = sourceAgeMs >= staleMs;
  const supervisorWaiting = Array.isArray(source?.workflow_timeline)
    ? source.workflow_timeline.some((item: any) => /stalled|timeout|超时|长时间|等待|卡住|恢复/i.test(`${item?.type || ""} ${item?.title || ""} ${item?.detail || ""} ${item?.message || ""}`))
    : false;
  if (!stalled.length && !staleQueued.length && !sourceLong && !supervisorWaiting) return null;
  const first = stalled[0]?.task || staleQueued[0]?.task || rows[0] || source;
  const target = targetNameForTask(first);
  const ageLabel = globalStatusAgeLabel(stalled[0]?.ageMs || staleQueued[0]?.ageMs || sourceAgeMs);
  const headline = stalled.length
    ? `${stalled.length} 个执行目标已经 ${ageLabel || "一段时间"} 没有新的可展示进展，我会先刷新状态，再决定继续等待、重派或请你确认。`
    : staleQueued.length
      ? `${staleQueued.length} 个下游任务排队较久，我会检查执行通道并接上下一步。`
      : `这项全局任务已经 ${ageLabel || "一段时间"} 没有新的可展示进展，我会主动刷新状态。`;
  const reviewItems = [
    target ? `关注对象：${target}` : "",
    first?.status_detail ? `当前说明：${sanitizeGlobalDirectAgentOutput(first.status_detail, "进展已整理。", 120)}` : "",
    source?.workflow_timeline?.length ? `最近节点：${sanitizeGlobalDirectAgentOutput(source.workflow_timeline[source.workflow_timeline.length - 1]?.title || source.workflow_timeline[source.workflow_timeline.length - 1]?.detail || "", "", 120)}` : "",
  ].filter(Boolean).slice(0, 4);
  const nextAction = stalled.length
    ? "先刷新下游任务卡；如果仍没有新结果，就重新派发或定向补充。"
    : staleQueued.length
      ? "检查执行通道和队列状态，能恢复就继续推进；不能恢复会提示你处理。"
      : "刷新全局任务状态，并继续等待执行目标的可验收结果。";
  return {
    title: "进度刷新提醒",
    headline: sanitizeGlobalDirectAgentOutput(headline, "我已整理进度刷新状态。", 240),
    reviewItems: reviewItems.map(item => sanitizeGlobalDirectAgentOutput(item, "", 140)).filter(Boolean),
    nextAction: sanitizeGlobalDirectAgentOutput(nextAction, "我会刷新任务状态并继续跟进。", 220),
  };
}

function getGlobalStatusDirectDispatchMeta(task: any) {
  const meta = task?.workflow_meta?.global_direct_dispatch
    || task?.workflowMeta?.global_direct_dispatch
    || task?.global_direct_dispatch
    || null;
  if (!meta || typeof meta !== "object") return null;
  return String(meta.schema || "") === "ccm-global-direct-dispatch-v1" ? meta : null;
}

function targetNameForTask(task: any) {
  return sanitizeGlobalDirectAgentOutput(
    task?.mission_target?.name || task?.mission_target?.project || task?.target_project || task?.group_id || task?.project || "执行目标",
    "执行目标",
    80,
  );
}

function summarizeDirectDispatchContinuationForStatus(task: any) {
  const state = task?.collaboration_state || {};
  const last = state.last_continuation || task?.last_continuation || null;
  const interruption = state.goal_revision_interruption || {};
  const kind = String(last?.kind || last?.rework_kind || "").toLowerCase();
  const replanRequired = kind === "revise_goal"
    || last?.replan_required === true
    || task?.plan_revision_required === true
    || interruption.requested === true;
  if (!last?.at && !interruption.requested_at && !replanRequired) return "";
  const reason = sanitizeGlobalDirectAgentOutput(
    last?.reason || interruption.reason || task?.status_detail || "用户补充了新的要求",
    "用户补充了新的要求",
    140,
  );
  const route = interruption.requested && !interruption.resolved_at
    ? "正在停止旧执行轮，再按新目标重核计划"
    : replanRequired
      ? "正在按最新要求重核计划和验收标准"
      : "补充要求已接到同一任务里继续处理";
  return `接续状态：${reason ? `${reason}；` : ""}${route}`;
}

function summarizeMissionChildren(mission: any, tasks: any[]) {
  const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
  const byId = new Map(tasks.map((task: any) => [String(task?.id || ""), task]));
  return ids
    .map((id: any) => byId.get(String(id)))
    .filter(Boolean)
    .slice(0, 4)
    .map((task: any) => `${targetNameForTask(task)} ${globalStatusLabel(globalTaskDisplayStatus(task))}${task.status_detail ? `：${sanitizeGlobalDirectAgentOutput(task.status_detail, "进展已整理。", 90)}` : ""}`);
}

function summarizeGlobalChildAgentWaiting(mission: any, tasks: any[]) {
  const ids = Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : [];
  const byId = new Map(tasks.map((task: any) => [String(task?.id || ""), task]));
  const rows = ids
    .map((id: any) => byId.get(String(id)))
    .filter(Boolean)
    .slice(0, 8)
    .map((task: any) => {
      const value = String(globalTaskDisplayStatus(task) || "").toLowerCase();
      const agent = targetNameForTask(task);
      if (["done", "completed", "success", "ok"].includes(value)) return { agent, status: "completed" };
      if (["failed", "error", "blocked", "needs_user", "waiting_confirmation", "waiting_clarification"].includes(value)) return { agent, status: "attention" };
      if (["pending", "queued", "planned"].includes(value)) return { agent, status: "waiting" };
      return { agent, status: "running" };
    });
  if (!rows.length) return "";
  const namesFor = (status: string) => rows.filter(row => row.status === status).map(row => row.agent).slice(0, 5);
  const completed = namesFor("completed");
  const running = namesFor("running");
  const waiting = namesFor("waiting");
  const attention = namesFor("attention");
  return [
    completed.length ? `已回传：${completed.join("、")}` : "",
    running.length ? `处理中：${running.join("、")}` : "",
    waiting.length ? `等待中：${waiting.join("、")}` : "",
    attention.length ? `待处理：${attention.join("、")}` : "",
  ].filter(Boolean).join("；");
}

function getGlobalStatusRunFromMission(mission: any, runs?: any[]) {
  const candidates = Array.isArray(runs) ? runs : [];
  const runId = String(mission?.global_run_id || mission?.globalRunId || "").trim();
  const supervisorId = String(mission?.supervisor_id || mission?.supervisorId || "").trim();
  const missionId = String(mission?.id || mission?.mission_id || mission?.missionId || "").trim();
  const matched = candidates.find((run: any) => {
    if (!run) return false;
    if (runId && String(run.id || "") === runId) return true;
    if (supervisorId && String(run.supervisor_id || run.supervisorId || "") === supervisorId) return true;
    if (missionId && String(run.mission_id || run.missionId || "") === missionId) return true;
    return false;
  });
  if (matched) return matched;
  if (runId) {
    try { return getGlobalAgentRun(runId); } catch {}
  }
  return null;
}

function summarizeGlobalSupervisionRunForStatus(mission: any, runs?: any[]) {
  const run = getGlobalStatusRunFromMission(mission, runs);
  if (!run) return null;
  const status = String(run.supervision_state || run.supervisionState || run.status || "").toLowerCase();
  const nextAction = sanitizeGlobalDirectAgentOutput(
    run?.workchain?.completion_summary?.next_action
      || run?.workchain?.completionSummary?.nextAction
      || run?.display_stream?.workchain?.completion_summary?.next_action
      || run?.displayStream?.workchain?.completionSummary?.nextAction
      || "",
    "",
    180,
  );
  const userText = sanitizeGlobalDirectAgentOutput(
    run?.final_reply
      || run?.finalReply
      || run?.display_stream?.workchain?.user_visible_text
      || run?.displayStream?.workchain?.userVisibleText
      || run?.workchain?.user_visible_text
      || run?.workchain?.userVisibleText
      || "",
    "",
    240,
  );
  if (["waiting_user", "needs_user", "blocked", "paused"].includes(status)) {
    return {
      headline: userText || "等你处理阻塞点；这还不是完成结果。",
      nextAction: nextAction || "你处理完阻塞点后，我会继续推动执行成员返工或复核。",
    };
  }
  if (/rework|reworking|repair|retry|返工|修复/.test(status)) {
    return {
      headline: userText || "正在返工，修复后会重新运行 TestAgent 或独立复核。",
      nextAction: nextAction || "原执行成员修复后，重新运行 TestAgent/独立复核，再给你最终总结。",
    };
  }
  if (status === "supervising" || status === "monitoring") {
    return {
      headline: userText || "我正在持续跟进执行、验收和最终总结。",
      nextAction: nextAction || "继续等待执行成员更新可验收结果。",
    };
  }
  return null;
}

function getGlobalStatusRunNextAction(run: any) {
  return sanitizeGlobalDirectAgentOutput(
    run?.workchain?.completion_summary?.next_action
      || run?.workchain?.completionSummary?.nextAction
      || run?.display_stream?.workchain?.completion_summary?.next_action
      || run?.displayStream?.workchain?.completionSummary?.nextAction
      || run?.confirmation_summary?.question
      || run?.confirmationSummary?.question
      || run?.clarification_summary?.question
      || run?.clarificationSummary?.question
      || run?.plan_mode?.next_step
      || run?.planMode?.nextStep
      || "",
    "",
    180,
  );
}

function firstGlobalStatusObject(...values: any[]) {
  return values.find(value => value && typeof value === "object" && !Array.isArray(value)) || null;
}

function buildGlobalStatusIndependentReviewSummaryFromTestAgentFailure(...sources: any[]) {
  const seen = new Set<string>();
  const items: any[] = [];
  for (const source of sources) {
    for (const item of collectGlobalTestAgentFailureItemsFromSource(source)) {
      const key = [item?.type || "", item?.project || "", item?.title || "", item?.reason || "", item?.nextAction || ""].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  if (!items.length) return null;
  const stateText = items.map(item => [item?.status, item?.result, item?.recommendation, item?.reason].filter(Boolean).join(" ")).join(" ");
  const needsUser = /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(stateText);
  const needsRework = !needsUser || /failed|fail|not_verified|rework|未通过|失败|返工/i.test(stateText);
  const status = needsRework ? "needs_rework" : "needs_user";
  const failureLines = globalUniqueStrings(items.map(summarizeGlobalTestAgentFailureItem).filter(Boolean)).slice(0, 3);
  const diagnosticLines = globalUniqueStrings(items.map(summarizeGlobalTestAgentDiagnosticItem).filter(Boolean)).slice(0, 2);
  const rows = [
    status === "needs_rework" ? "TestAgent：需返工" : "TestAgent：等你确认",
    ...failureLines.map((item: string) => `返工重点：${item}`),
    ...diagnosticLines.map((item: string) => `排查建议：${item}`),
  ].map((item: any) => sanitizeGlobalDirectAgentOutput(item, "", 180)).filter(Boolean);
  return {
    schema: "ccm-main-agent-independent-review-summary-v1",
    title: "独立复核",
    status,
    status_label: status === "needs_rework" ? "需返工" : "等你确认",
    headline: status === "needs_rework"
      ? "TestAgent 复核未通过，我会先安排返工，再重新验收。"
      : "TestAgent 复核需要你确认，我会先暂停最终验收。",
    rows,
    next_action: status === "needs_rework"
      ? "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。"
      : "等待你确认复核标记的问题，确认后我再继续。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function getGlobalStatusIndependentReviewSummary(source: any = {}) {
  const delivery = source?.delivery_summary || source?.deliverySummary || {};
  const report = source?.final_report
    || source?.finalReport
    || source?.final_delivery_report
    || source?.finalDeliveryReport
    || source?.delivery_report
    || source?.deliveryReport
    || delivery?.delivery_report
    || delivery?.deliveryReport
    || {};
  const displayStream = source?.display_stream || source?.displayStream || {};
  const workchain = source?.workchain || displayStream?.workchain || {};
  const explicitSummary = firstGlobalStatusObject(
    source?.independent_review_summary,
    source?.independentReviewSummary,
    source?.test_agent_review_summary,
    source?.testAgentReviewSummary,
    delivery?.independent_review_summary,
    delivery?.independentReviewSummary,
    delivery?.test_agent_review_summary,
    delivery?.testAgentReviewSummary,
    report?.independent_review_summary,
    report?.independentReviewSummary,
    report?.test_agent_review_summary,
    report?.testAgentReviewSummary,
    workchain?.independent_review_summary,
    workchain?.independentReviewSummary,
    workchain?.test_agent_review_summary,
    workchain?.testAgentReviewSummary,
  );
  if (explicitSummary) return explicitSummary;
  return buildGlobalStatusIndependentReviewSummaryFromTestAgentFailure(source, delivery, report, workchain, displayStream);
}

function globalIndependentReviewStatusKind(summary: any = {}) {
  const text = [
    summary.status,
    summary.verdict,
    summary.recommendation,
    summary.status_label,
    summary.statusLabel,
    summary.headline,
    ...(Array.isArray(summary.rows) ? summary.rows : []),
  ].filter(Boolean).join(" ");
  if (/needs[_-]?rework|rework|changes_requested|failed|fail|reject|not_verified|需返工|返工|未通过|缺口|未覆盖/i.test(text)) return "needs_rework";
  if (/needs[_-]?user|waiting[_-]?user|unknown|manual|人工确认|等你确认|待确认|需要你确认|需要用户/i.test(text)) return "needs_user";
  if (/passed|pass|accept|approved|已通过|通过|可以继续/i.test(text)) return "passed";
  return "recorded";
}

function summarizeGlobalStatusIndependentReview(source: any = {}) {
  const summary = getGlobalStatusIndependentReviewSummary(source);
  if (!summary) return null;
  const status = globalIndependentReviewStatusKind(summary);
  const statusLabel = sanitizeGlobalDirectAgentOutput(
    summary.status_label || summary.statusLabel || (status === "needs_rework" ? "需返工" : status === "needs_user" ? "等你确认" : status === "passed" ? "已通过" : "已记录"),
    status === "needs_rework" ? "需返工" : status === "needs_user" ? "等你确认" : status === "passed" ? "已通过" : "已记录",
    60,
  );
  const rows = (Array.isArray(summary.rows) ? summary.rows : Array.isArray(summary.items) ? summary.items : [])
    .map((item: any) => sanitizeGlobalDirectAgentOutput(item, "", 140))
    .filter(Boolean)
    .slice(0, 3);
  const headline = sanitizeGlobalDirectAgentOutput(
    summary.headline || summary.summary || rows[0] || "",
    status === "needs_rework"
      ? "独立复核发现待处理缺口。"
      : status === "needs_user"
        ? "独立复核需要你确认。"
        : status === "passed"
          ? "独立复核已通过。"
          : "独立复核结论已记录。",
    200,
  );
  const nextAction = sanitizeGlobalDirectAgentOutput(
    summary.next_action || summary.nextAction || "",
    status === "needs_rework"
      ? "先按复核缺口返工，修复后重新运行 TestAgent/独立复核，再给最终总结。"
      : status === "needs_user"
        ? "等待你确认复核标记的问题，确认后我再继续。"
        : status === "passed"
          ? "继续核对交付总结、改动和验证结果。"
          : "继续等待完整复核证据或最终总结。",
    220,
  );
  return {
    status,
    statusLabel,
    displayStatus: status === "needs_rework" ? "needs_rework" : status === "needs_user" ? "needs_user" : status === "passed" ? "reviewing" : "",
    blocking: status === "needs_rework" || status === "needs_user",
    headline,
    rows,
    nextAction,
  };
}

function globalStatusTestAgentPlanRowText(item: any) {
  if (!item || typeof item !== "object") return item;
  return [item.summary, item.detail, item.message, item.label, item.title, item.status].filter(Boolean).join(" ");
}

function globalStatusTestAgentPlanStatusKind(summary: any = {}, plan: any = null) {
  const text = [
    summary.status,
    summary.verdict,
    summary.status_label,
    summary.statusLabel,
    summary.headline,
    ...(Array.isArray(summary.rows) ? summary.rows.map(globalStatusTestAgentPlanRowText) : []),
    ...(Array.isArray(summary.issues) ? summary.issues.map(globalStatusTestAgentPlanRowText) : []),
  ].filter(Boolean).join(" ");
  if (plan?.valid === false || /blocked|invalid|error|failed|fail|需修复|预检未通过|缺少|阻塞/i.test(text)) return "blocked";
  if (plan?.valid === true || /ready|valid|可执行|已生成|启动|真实复核/i.test(text)) return "ready";
  return "recorded";
}

function getGlobalStatusTestAgentExecutionPlanSummary(source: any = {}) {
  const delivery = source?.delivery_summary || source?.deliverySummary || {};
  const report = source?.final_report
    || source?.finalReport
    || source?.final_delivery_report
    || source?.finalDeliveryReport
    || source?.delivery_report
    || source?.deliveryReport
    || delivery?.delivery_report
    || delivery?.deliveryReport
    || {};
  const displayStream = source?.display_stream || source?.displayStream || {};
  const workchain = source?.workchain || displayStream?.workchain || {};
  const technical = source?.technical || delivery?.technical || report?.technical || {};
  const explicitSummary = firstGlobalStatusObject(
    source?.test_agent_execution_plan_summary,
    source?.testAgentExecutionPlanSummary,
    delivery?.test_agent_execution_plan_summary,
    delivery?.testAgentExecutionPlanSummary,
    report?.test_agent_execution_plan_summary,
    report?.testAgentExecutionPlanSummary,
    displayStream?.test_agent_execution_plan_summary,
    displayStream?.testAgentExecutionPlanSummary,
    workchain?.test_agent_execution_plan_summary,
    workchain?.testAgentExecutionPlanSummary,
    technical?.test_agent_execution_plan_summary,
    technical?.testAgentExecutionPlanSummary,
  );
  const plan = firstGlobalStatusObject(
    source?.test_agent_execution_plan,
    source?.testAgentExecutionPlan,
    delivery?.test_agent_execution_plan,
    delivery?.testAgentExecutionPlan,
    report?.test_agent_execution_plan,
    report?.testAgentExecutionPlan,
    displayStream?.test_agent_execution_plan,
    displayStream?.testAgentExecutionPlan,
    workchain?.test_agent_execution_plan,
    workchain?.testAgentExecutionPlan,
    technical?.test_agent_execution_plan,
    technical?.testAgentExecutionPlan,
  );
  if (explicitSummary) return { summary: explicitSummary, plan };
  const detail = source?.test_agent_execution_plan_detail
    || source?.testAgentExecutionPlanDetail
    || delivery?.test_agent_execution_plan_detail
    || delivery?.testAgentExecutionPlanDetail
    || report?.test_agent_execution_plan_detail
    || report?.testAgentExecutionPlanDetail
    || source?.detail
    || source?.message
    || "";
  const rawTextSummary = source?.test_agent_execution_plan_summary
    || source?.testAgentExecutionPlanSummary
    || delivery?.test_agent_execution_plan_summary
    || delivery?.testAgentExecutionPlanSummary
    || report?.test_agent_execution_plan_summary
    || report?.testAgentExecutionPlanSummary
    || "";
  if (!plan && !detail && !rawTextSummary) return null;
  const planSummary = plan?.summary || {};
  const issues = globalSafeArray(plan?.issues)
    .map((item: any) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 160))
    .filter(Boolean)
    .slice(0, 5);
  const commandCount = Number(planSummary.commands || globalSafeArray(plan?.commands).length || 0);
  const httpCount = Number(planSummary.httpChecks || 0) + Number(planSummary.adversarialHttpChecks || 0);
  const browserCount = Number(planSummary.browserChecks || 0);
  const projectCount = Number(planSummary.projects || globalSafeArray(plan?.projects).length || 0);
  const rows = [
    projectCount ? `复核范围：${projectCount} 个项目` : "",
    commandCount ? `命令检查：${commandCount} 项` : "",
    httpCount ? `HTTP 检查：${httpCount} 项` : "",
    browserCount ? `浏览器检查：${browserCount} 项` : "",
  ].filter(Boolean);
  const status = globalStatusTestAgentPlanStatusKind({}, plan);
  const fallbackHeadline = globalVisibleText(
    rawTextSummary || detail,
    "TestAgent 复核计划已生成，我会先确认计划可执行，再启动真实复核。",
    260,
  );
  return {
    summary: {
      schema: "ccm-test-agent-execution-plan-summary-v1",
      title: "TestAgent 复核计划",
      status,
      status_label: status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成",
      headline: status === "ready"
        ? "TestAgent 已生成复核计划，我会按这份计划启动真实验证。"
        : status === "blocked"
          ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
          : fallbackHeadline,
      rows: rows.length ? rows : [fallbackHeadline],
      issues,
      next_action: status === "ready"
        ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
        : status === "blocked"
          ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
          : "等待 TestAgent 复核计划补齐更多结构化信息。",
    },
    plan,
  };
}

function summarizeGlobalStatusTestAgentExecutionPlan(source: any = {}) {
  const payload = getGlobalStatusTestAgentExecutionPlanSummary(source);
  if (!payload?.summary) return null;
  const summary = payload.summary;
  const status = globalStatusTestAgentPlanStatusKind(summary, payload.plan);
  const fallbackLabel = status === "ready" ? "可执行" : status === "blocked" ? "需修复" : "已生成";
  const statusLabel = sanitizeGlobalDirectAgentOutput(summary.status_label || summary.statusLabel || fallbackLabel, fallbackLabel, 60);
  const rows = globalUniqueStrings(
    globalSafeArray(summary.rows).map((item: any) => globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 140)),
    globalSafeArray(summary.issues).map((item: any) => `预检问题：${globalVisibleText(scrubGlobalTestAgentEvidencePathText(globalStatusTestAgentPlanRowText(item)), "", 120)}`),
  ).filter(Boolean).slice(0, 4);
  const headline = sanitizeGlobalDirectAgentOutput(
    scrubGlobalTestAgentEvidencePathText(summary.headline || summary.summary || rows[0] || ""),
    status === "ready"
      ? "TestAgent 复核计划已生成，我会按计划启动真实验证。"
      : status === "blocked"
        ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
        : "TestAgent 复核计划已记录，正在等待下一步复核。",
    220,
  );
  const nextAction = sanitizeGlobalDirectAgentOutput(
    scrubGlobalTestAgentEvidencePathText(summary.next_action || summary.nextAction || ""),
    status === "ready"
      ? "启动 TestAgent 真实复核，并把结论纳入最终验收。"
      : status === "blocked"
        ? "修复 TestAgent 工作单或项目路径后重新生成复核计划。"
        : "等待 TestAgent 复核计划补齐更多结构化信息。",
    220,
  );
  return {
    status,
    statusLabel,
    displayStatus: "reviewing",
    headline,
    rows,
    nextAction,
  };
}

function getGlobalStatusRunTitle(run: any) {
  return sanitizeGlobalDirectAgentOutput(
    run?.plan_mode?.title
      || run?.planMode?.title
      || run?.display_stream?.workchain?.title
      || run?.displayStream?.workchain?.title
      || run?.user_message
      || run?.original_user_message
      || "全局运行",
    "全局运行",
    120,
  );
}

function isGlobalStatusRunRelevant(run: any) {
  const status = String(run?.status || "").toLowerCase();
  if (["running", "supervising", "paused", "waiting_confirmation", "waiting_clarification", "failed"].includes(status)) return true;
  if (run?.mission_id || run?.missionId || run?.supervisor_id || run?.supervisorId) return true;
  if (run?.final_delivery_report || run?.finalDeliveryReport || run?.display_stream?.delivery_report || run?.displayStream?.deliveryReport) return true;
  if (getGlobalStatusIndependentReviewSummary(run)) return true;
  if (getGlobalStatusTestAgentExecutionPlanSummary(run)) return true;
  if (run?.plan_mode || run?.planMode || run?.pending_tool || run?.pendingTool) return true;
  return Number(run?.tool_calls || run?.toolCalls || 0) > 0;
}

function buildGlobalStatusRunRepresentedIds(missions: any[], tasks: any[]) {
  const missionIds = new Set(missions.map((mission: any) => String(mission?.id || mission?.mission_id || mission?.missionId || "")).filter(Boolean));
  const runIds = new Set(missions.map((mission: any) => String(mission?.global_run_id || mission?.globalRunId || "")).filter(Boolean));
  const supervisorIds = new Set(missions.map((mission: any) => String(mission?.supervisor_id || mission?.supervisorId || "")).filter(Boolean));
  for (const task of tasks) {
    const meta = getGlobalStatusDirectDispatchMeta(task);
    const directRunId = String(meta?.global_run_id || meta?.globalRunId || "").trim();
    if (directRunId) runIds.add(directRunId);
  }
  return { missionIds, runIds, supervisorIds };
}

function summarizeStandaloneGlobalRunForStatus(run: any) {
  const status = String(run?.status || "").toLowerCase();
  const review = summarizeGlobalStatusIndependentReview(run);
  const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(run);
  const displayStatus = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : status;
  const title = getGlobalStatusRunTitle(run);
  const nextAction = getGlobalStatusRunNextAction(run);
  const visible = sanitizeGlobalDirectAgentOutput(
    run?.final_reply
      || run?.finalReply
      || run?.display_stream?.workchain?.user_visible_text
      || run?.displayStream?.workchain?.userVisibleText
      || run?.workchain?.user_visible_text
      || run?.workchain?.userVisibleText
      || "",
    "",
    220,
  );
  const waiting = status === "waiting_confirmation"
    ? "等待你确认授权或影响范围，确认前不会执行。"
    : status === "waiting_clarification"
      ? "需要你补充目标、范围或验收标准后继续。"
      : "";
  const current = waiting || (review?.blocking ? review.headline : "") || testAgentPlan?.headline || visible || review?.headline || (status === "running"
    ? "正在理解需求并执行下一步。"
    : status === "supervising"
      ? "正在跟进执行、验收和最终总结。"
      : status === "failed"
        ? "上一轮没有完成，失败原因已整理。"
        : "状态已更新。");
  const next = (review?.blocking ? review.nextAction : "")
    || testAgentPlan?.nextAction
    || nextAction
    || review?.nextAction
    || (status === "waiting_confirmation" ? "你确认后我再继续执行。"
      : status === "waiting_clarification" ? "你补充信息后我再继续规划和执行。"
        : status === "failed" ? "按失败原因修复或重新发起。"
          : "继续跟进，拿到可验收结果后再总结。");
  return [
    `- ${title}：${globalStatusLabel(displayStatus)}`,
    `  当前进展：${current}`,
    review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
    review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
    testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
    testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
    `  下一步：${next}`,
  ].filter(Boolean).join("\n");
}

function collectStandaloneGlobalStatusRuns(inputRuns: any[] | undefined, missions: any[], tasks: any[]) {
  const runs = Array.isArray(inputRuns) ? inputRuns : listGlobalAgentRuns({ limit: 12 });
  const represented = buildGlobalStatusRunRepresentedIds(missions, tasks);
  return runs
    .filter((run: any) => {
      if (!run || !isGlobalStatusRunRelevant(run)) return false;
      const runId = String(run?.id || "").trim();
      const missionId = String(run?.mission_id || run?.missionId || "").trim();
      const supervisorId = String(run?.supervisor_id || run?.supervisorId || "").trim();
      if (runId && represented.runIds.has(runId)) return false;
      if (missionId && represented.missionIds.has(missionId)) return false;
      if (supervisorId && represented.supervisorIds.has(supervisorId)) return false;
      return true;
    })
    .sort((a: any, b: any) => String(b?.updated_at || b?.updatedAt || b?.created_at || "").localeCompare(String(a?.updated_at || a?.updatedAt || a?.created_at || "")))
    .slice(0, 4);
}

function formatMissionStatus(input: { missions?: any[]; tasks?: any[]; globalRuns?: any[] } = {}): string {
  const tasks = Array.isArray(input.tasks) ? input.tasks : loadTasks();
  const missions = Array.isArray(input.missions) ? input.missions : refreshGlobalDevelopmentMissions();
  const directDispatchTasks = tasks
    .filter((task: any) => getGlobalStatusDirectDispatchMeta(task))
    .sort((a: any, b: any) => String(b.updated_at || b.completed_at || b.created_at || "").localeCompare(String(a.updated_at || a.completed_at || a.created_at || "")))
    .slice(0, 4);
  const standaloneRuns = collectStandaloneGlobalStatusRuns(input.globalRuns, missions, tasks);
  if (!missions.length && !directDispatchTasks.length && !standaloneRuns.length) return "当前还没有全局开发任务、全局直派任务或正在跟进的全局运行。";

  const missionRows = missions.slice(-6).reverse().map((mission: any) => {
    const counts = globalMissionStatusCounts(mission, tasks);
    const total = counts.total;
    const completed = counts.completed;
    const failed = counts.failed;
    const blocked = counts.blocked;
    const reviewing = counts.reviewing;
    const displayStatus = globalMissionDisplayStatus(mission, counts);
    const details = [`${completed}/${total || "?"} 已通过验收`];
    if (failed > 0) details.push(`${failed} 失败`);
    if (reviewing > 0) details.push(`${reviewing} 验收中`);
    if (blocked > 0) details.push(`${blocked} 阻塞`);
    const title = sanitizeGlobalDirectAgentOutput(mission.title || mission.business_goal || mission.id, "全局开发任务", 120);
    const current = latestReadableTimeline(mission);
    const children = summarizeMissionChildren(mission, tasks);
    const childWaiting = summarizeGlobalChildAgentWaiting(mission, tasks);
    const pickup = getGlobalStatusPickupSummary(mission);
    const supervision = summarizeGlobalSupervisionRunForStatus(mission, input.globalRuns);
    const review = summarizeGlobalStatusIndependentReview(mission);
    const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(mission);
    const childIds = new Set((Array.isArray(mission?.child_task_ids) ? mission.child_task_ids : []).map((id: any) => String(id)));
    const progressRefresh = getGlobalStatusProgressRefreshSummary(mission, tasks.filter((task: any) => childIds.has(String(task?.id || ""))));
    const statusForDisplay = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : displayStatus;
    const currentForDisplay = review?.blocking ? review.headline : testAgentPlan?.headline || current;
    const next = review?.blocking
      ? `下一步：${review.nextAction}`
      : testAgentPlan
      ? `下一步：${testAgentPlan.nextAction}`
      : supervision?.nextAction
      ? `下一步：${supervision.nextAction}`
      : failed || blocked
        ? "下一步：需要我处理失败/阻塞项，不能直接宣称完成。"
        : reviewing > 0
          ? "下一步：补齐真实验证或复核证据，通过验收后再给最终交付总结。"
        : counts.allPassed
        ? `下一步：${supervision?.nextAction || pickup?.resumeAction || "等待或查看最终交付总结。"}`
        : `下一步：${supervision?.nextAction || progressRefresh?.nextAction || "继续等待执行成员更新结果，我会汇总验收。"}`;
    return [
      `- ${title}：${globalStatusLabel(statusForDisplay)}（${details.join("，")}）`,
      currentForDisplay ? `  当前进展：${currentForDisplay}` : "",
      review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
      review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
      testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
      testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
      supervision?.headline ? `  持续跟进：${supervision.headline}` : "",
      pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
      pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
      progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
      progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
      children.length ? `  子目标：${children.join("；")}` : "",
      childWaiting ? `  执行成员等待情况：${childWaiting}` : "",
      `  ${next}`,
    ].filter(Boolean).join("\n");
  });

  const directRows = directDispatchTasks.map((task: any) => {
    const meta = getGlobalStatusDirectDispatchMeta(task) || {};
    const title = sanitizeGlobalDirectAgentOutput(meta.user_goal || task.business_goal || task.title || "全局直派任务", "全局直派任务", 120);
    const target = targetNameForTask(task);
    const current = latestReadableTimeline(task);
    const displayStatus = globalTaskDisplayStatus(task);
    const strongAcceptance = globalTaskHasStrongAcceptanceEvidence(task);
    const acceptance = strongAcceptance ? "已通过验收" : "等待任务卡验收";
    const continuation = summarizeDirectDispatchContinuationForStatus(task);
    const pickup = getGlobalStatusPickupSummary(task);
    const progressRefresh = getGlobalStatusProgressRefreshSummary(task);
    const review = summarizeGlobalStatusIndependentReview(task);
    const testAgentPlan = review ? null : summarizeGlobalStatusTestAgentExecutionPlan(task);
    const statusForDisplay = review?.blocking ? review.displayStatus : testAgentPlan ? testAgentPlan.displayStatus : displayStatus;
    const currentForDisplay = review?.blocking ? review.headline : testAgentPlan?.headline || current;
    const next = review?.blocking
      ? review.nextAction
      : testAgentPlan
      ? testAgentPlan.nextAction
      : pickup?.resumeAction || progressRefresh?.nextAction || "以群聊任务卡的计划、执行、验收和最终总结为准。";
    return [
      `- ${title}：${globalStatusLabel(statusForDisplay)}（${target}，${acceptance}）`,
      continuation ? `  ${continuation}` : "",
      currentForDisplay ? `  当前进展：${currentForDisplay}` : "",
      review ? `  独立复核：${review.statusLabel}${review.headline ? `，${review.headline}` : ""}` : "",
      review?.rows?.length ? `  复核要点：${review.rows.join("；")}。` : "",
      testAgentPlan ? `  TestAgent 计划：${testAgentPlan.statusLabel}${testAgentPlan.headline ? `，${testAgentPlan.headline}` : ""}` : "",
      testAgentPlan?.rows?.length ? `  计划要点：${testAgentPlan.rows.join("；")}。` : "",
      pickup?.headline ? `  ${pickup.title}：${pickup.headline}` : "",
      pickup?.reviewItems?.length ? `  回看要点：${pickup.reviewItems.join("；")}。` : "",
      progressRefresh?.headline ? `  ${progressRefresh.title}：${progressRefresh.headline}` : "",
      progressRefresh?.reviewItems?.length ? `  接续要点：${progressRefresh.reviewItems.join("；")}。` : "",
      `  下一步：${next}`,
    ].filter(Boolean).join("\n");
  });
  const runRows = standaloneRuns.map((run: any) => summarizeStandaloneGlobalRunForStatus(run));

  return [
    missionRows.length ? `最近全局任务进展：\n${missionRows.join("\n")}` : "",
    directRows.length ? `最近全局直派任务：\n${directRows.join("\n")}` : "",
    runRows.length ? `最近全局运行：\n${runRows.join("\n")}` : "",
    "我不会猜测还没返回的执行成员结果；未完成的部分会继续等待执行目标更新，技术记录默认在任务卡技术详情里。",
  ].filter(Boolean).join("\n\n");
}

function formatSystemStatus(): string {
  const projects = getConfigs();
  const groups = loadGroups();
  const tasks = loadTasks();
  const cronJobs = loadCronJobs();
  const activeTasks = tasks.filter((item: any) => ["pending", "queued", "in_progress", "running"].includes(String(item.status))).length;
  return [
    "CCM 当前状态：",
    `- 项目：${projects.length} 个`,
    `- 协作群聊：${groups.length} 个`,
    `- 开发任务：${tasks.length} 个，活跃 ${activeTasks} 个`,
    `- 定时任务：${cronJobs.length} 个，启用 ${cronJobs.filter((item: any) => item.enabled !== false).length} 个`,
  ].join("\n");
}

async function queueMusicPlayback(baseUrl: string, keyword: string): Promise<string> {
  const normalizedKeyword = parseMusicKeyword(keyword) || (/(播放|放一首|放|来一首|来点|听|听歌|音乐|歌曲|歌)/.test(keyword) ? RANDOM_MUSIC_KEYWORD : normalizeText(keyword));
  if (!normalizedKeyword) return "缺少要播放的歌曲或歌手关键词。";
  const result = await postLocalApi(baseUrl, "/api/music/remote-command", { keyword: normalizedKeyword, source: "feishu-global-agent" });
  const label = normalizedKeyword === RANDOM_MUSIC_KEYWORD ? "随机播放音乐" : `「${normalizedKeyword}」`;
  return `已把${label}发送给音乐播放器。请保持 CCM 音乐播放器页面打开，它会在后台自动检索并播放。${result.command?.id ? `\n- 指令 ID：${result.command.id}` : ""}`;
}

function fillCronParams(params: any, originalText: string, groups: any[] = [], projects: string[] = []) {
  const schedule = params.schedule || params.cron || guessCronSchedule(originalText);
  const namedFromText = (originalText.match(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/)?.[1] || "").trim();
  const explicitName = namedFromText || String(params.name || params.title || "").trim();
  const cleanedPrompt = originalText
    .replace(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/g, "")
    .replace(/创建|新建|添加|一个|定时任务|计划任务/g, "")
    .replace(/^[：:，,\s]+/, "")
    .trim();
  const paramPrompt = String(params.prompt || params.message || params.command || "").trim();
  const prompt = (paramPrompt && !/名字|名称|标题/.test(paramPrompt) ? paramPrompt : "") || cleanedPrompt || originalText;
  const name = explicitName || prompt.slice(0, 28) || "全局助手定时任务";
  const targetType = params.target_type || params.targetType || (params.group_id || params.groupId ? "group" : (params.project ? "project" : (groups[0] ? "group" : "project")));
  const groupId = params.group_id || params.groupId || (targetType === "group" ? groups[0]?.id : undefined);
  const project = params.project || params.projectName || (targetType === "project" ? projects[0] : undefined);
  return { ...params, operation: params.operation || "create", name, schedule, prompt, target_type: targetType, group_id: groupId, project, workflow_type: params.workflow_type || params.workflowType || "general", enabled: params.enabled !== false };
}

async function executeFeishuManagementAction(baseUrl: string, action: any, originalText = ""): Promise<string> {
  let params = { ...(action.params || {}) };
  const groups = loadGroups();
  const projects = getConfigs().map(c => c.name);
  const operation = params.operation || (action.type === "system_status" ? "inspect" : "");
  if (action.type === "manage_cron" && operation === "create") {
    params = fillCronParams(params, originalText, groups, projects);
    action = { ...action, params, needs_user_input: false, validated: true, missing_params: [] };
  }
  if ((action.requires_confirmation || ["delete", "remove_member"].includes(operation)) && action.confirmed !== true) {
    return "这是一条高风险操作，控制机器人不会直接执行。请到 CCM 全局助手界面确认后操作。";
  }
  if (action.needs_user_input || action.validated === false) {
    return `还缺少参数：${(action.missing_params || []).join("、") || "必要参数"}。请补充后重新发送。`;
  }
  let result: any;
  if (action.type === "system_status") return formatSystemStatus();
  if (action.type === "manage_cron") {
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/cron");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/cron/create", fillCronParams(params, originalText, groups, projects));
    else if (operation === "update") result = await postLocalApi(baseUrl, "/api/cron/update", params);
    else if (operation === "enable" || operation === "disable") result = await postLocalApi(baseUrl, "/api/cron/update", { id: params.id, enabled: operation === "enable" });
    else if (operation === "run") result = await postLocalApi(baseUrl, "/api/cron/run", { id: params.id });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/cron/delete", { id: params.id });
  } else if (action.type === "manage_task") {
    const id = params.id || params.task_id;
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/tasks");
    else if (operation === "pause") result = await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "paused", status_detail: "由飞书全局 Agent 暂停" });
    else if (operation === "resume") {
      await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "pending", status_detail: "由飞书全局 Agent 恢复" });
      result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
    } else if (operation === "continue") result = await postLocalApi(baseUrl, "/api/tasks/continue", { id, message: params.message || "由飞书全局 Agent 继续推进", auto_execute: true, idempotency_key: params.idempotency_key });
    else if (operation === "retry") result = await postLocalApi(baseUrl, "/api/tasks/retry", { id, reason: params.message || "由飞书全局 Agent 发起重试", auto_execute: true, idempotency_key: params.idempotency_key });
    else if (operation === "queue") result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/tasks/delete", { id });
  } else if (action.type === "manage_project") {
    const project = params.project || params.name;
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/projects");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/projects/create", params);
    else if (operation === "update") result = await postLocalApi(baseUrl, "/api/projects/update", { ...params, name: project });
    else if (operation === "start") result = await postLocalApi(baseUrl, "/api/start", { project, agent: params.agent });
    else if (operation === "stop") result = await postLocalApi(baseUrl, "/api/stop", { project });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/projects/delete", { name: project });
  } else if (action.type === "manage_group") {
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/groups");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/groups/create", { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) });
    else if (operation === "rename") result = await postLocalApi(baseUrl, "/api/groups/rename", { id: params.id || params.group_id, name: params.name });
    else if (operation === "add_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, add: params.members || [{ project: params.project }] });
    else if (operation === "remove_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, remove: params.projects || [params.project] });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/groups/delete", { id: params.id || params.group_id });
  } else if (action.type === "manage_tool") {
    const kind = params.kind === "skill" ? "skill" : "mcp";
    if (operation === "status") result = await callLocalApi(baseUrl, "/api/tools/status");
    else if (operation === "reload") result = await postLocalApi(baseUrl, "/api/tools/reload", {});
    else if (operation === "list") result = await callLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp");
    else if (operation === "create") {
      const payload = { ...params }; delete payload.operation; delete payload.kind;
      result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp", payload);
    }
    else if (operation === "delete") result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills/delete" : "/api/mcp/delete", { name: params.name });
  }
  if (!result) throw new Error(`暂不支持从飞书执行 ${action.type}/${operation}`);
  if (action.type === "manage_cron" && operation === "create") {
    const cronParams = fillCronParams(params, originalText, loadGroups(), getConfigs().map(c => c.name));
    return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${result.job?.schedule || cronParams.schedule}\n- 提示词：${result.job?.prompt || cronParams.prompt}`;
  }
  const count = result.jobs?.length ?? result.tasks?.length ?? result.projects?.length ?? result.groups?.length;
  return count === undefined ? `操作已返回结果：${action.type}/${operation}` : `查询已返回 ${count} 条记录。`;
}

async function executeFeishuAction(baseUrl: string, action: any, originalText = "", traceId = "", options: { globalRunId?: string; sessionId?: string; source?: string; onEvent?: (event: any) => void } = {}): Promise<string> {
  if (!action?.type) return "";
  if (GLOBAL_MANAGEMENT_ACTIONS[action.type]) return executeFeishuManagementAction(baseUrl, { ...action, params: { ...(action.params || {}), idempotency_key: traceId || action.params?.idempotency_key } }, originalText);
  const params = action.params || {};
  if (action.type === "play_music") {
    return queueMusicPlayback(baseUrl, params.keyword || params.query || params.song || originalText);
  }
  if (action.type === "toggle_pet") {
    const operation = params.action || params.operation || "open";
    const result = await postLocalApi(baseUrl, operation === "close" ? "/api/pets/close" : "/api/pets/launch", {});
    return result.success === false ? `桌面宠物控制失败：${result.error || "未知错误"}` : `桌面宠物已${operation === "close" ? "关闭" : "打开"}。`;
  }
  if (action.type === "navigate") {
    return `页面跳转「${params.tab || params.page || ""}」只能在 Web 控制台内执行；飞书端已记录该意图，请在 CCM 页面切换查看。`;
  }
  if (action.type === "create_cron_task") {
    const groups = loadGroups();
    const projects = getConfigs().map(c => c.name);
    const cronParams = fillCronParams(params, originalText, groups, projects);
    const result = await postLocalApi(baseUrl, "/api/cron/create", cronParams);
    return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${cronParams.schedule}\n- 提示词：${cronParams.prompt}`;
  }
  if (action.type === "orchestrate_development") {
    const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", {
      ...params,
      title: params.title || "飞书下发的全局开发任务",
      business_goal: params.business_goal || params.goal || params.title,
      source_documents: params.documents || params.source_documents || "",
      auto_execute: true,
      source: "feishu-control-bot",
      trace_id: traceId,
      idempotency_key: traceId ? `feishu:${traceId}` : undefined,
    });
    return formatGlobalDevelopmentDispatchVisibleResult(result, params);
  }
  if (action.type === "create_task") {
    const result = await postLocalApi(baseUrl, "/api/tasks/create-daily-dev", {
      title: params.title || "飞书下发的开发任务",
      group_id: params.group_id || params.groupId,
      business_goal: params.business_goal || params.businessGoal || params.title,
      scope: params.scope || "",
      documents: params.documents || "",
      acceptance: params.acceptance || "子 Agent 提供结果说明；主 Agent 输出最终报告",
      persist_documents: true,
      auto_execute: true,
      trace_id: traceId,
      idempotency_key: traceId ? `feishu:${traceId}` : undefined,
    });
    return formatGlobalTaskDispatchVisibleResult(result, params);
  }
  if (action.type === "send_group_cmd") {
    const groupId = params.group_id || params.groupId;
    const targetProject = params.target_project || params.targetProject || "coordinator";
    const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
    const group = loadGroups().find((item: any) => item.id === groupId) || null;
    const dispatch = buildGlobalDirectDispatchHandoff({
      kind: "group",
      group,
      targetProject,
      message: rawMessage,
      originalText,
      traceId,
    });
    const workOrderMessage = renderGlobalDirectGroupWorkOrder({
      group,
      targetProject,
      message: rawMessage,
      originalText,
      handoff: dispatch.handoff,
    });
    const result = await postLocalSseOrJsonApi(baseUrl, "/api/groups/send", {
      group_id: groupId,
      target_project: targetProject,
      message: workOrderMessage,
      message_mode: "project_task",
      force_task: true,
      auto_execute: true,
      requires_code_changes: inferGlobalDirectDispatchRequiresCodeChanges(rawMessage),
      global_handoff: dispatch.summary,
      global_direct_dispatch: {
        schema: "ccm-global-direct-dispatch-v1",
        source: "global-agent-direct-dispatch",
        global_run_id: options.globalRunId || "",
        session_id: options.sessionId || "",
        trace_id: traceId,
        handoff: dispatch.summary,
        original_text: originalText || rawMessage,
        user_goal: rawMessage,
      },
      trace_id: traceId,
      client_message_id: traceId ? `feishu-${traceId}` : undefined,
    }, {
      onEvent: (event: any) => relayGlobalTestAgentEventFromGroup(event, {
        globalRunId: options.globalRunId,
        traceId,
        status: "running",
        phase: "execute",
        onEvent: options.onEvent,
      }),
    });
    const taskId = result.task?.id || result.taskId || "";
    const queueText = result.queue?.queued
      ? `已进入执行队列（位置 ${result.queue.position || 1}）`
      : (result.queue?.message || "已保存到群聊任务链路");
    return renderGlobalDirectGroupDispatchAcceptedSummary({
      group,
      groupId,
      taskId,
      queueText,
      reply: result.reply,
    });
  }
  if (action.type === "send_project_cmd") {
    const project = params.project || params.projectName;
    const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
    const missionPayload = buildGlobalSingleProjectMissionPayload({
      project,
      message: rawMessage,
      originalText,
      traceId,
      globalRunId: options.globalRunId,
      sessionId: options.sessionId,
      source: options.source || "feishu-control-bot-single-project",
      idempotencyKey: traceId ? `feishu:${traceId}:single-project` : "",
    });
    const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", missionPayload);
    return formatGlobalDevelopmentDispatchVisibleResult(result, {
      title: missionPayload.title,
      business_goal: missionPayload.business_goal,
    });
  }
  if (action.type === "create_cron_task") {
    const result = await postLocalApi(baseUrl, "/api/cron/create", params);
    return `定时任务已创建：${result.job?.name || params.name || "未命名任务"}（${params.schedule}）`;
  }
  return `已识别动作 ${action.type}，但它不适合从飞书远程执行。`;
}

function hasExplicitGlobalWriteAuthorization(message: string) {
  const text = normalizeText(message);
  if (!text) return false;
  if (/(?:不要|不用|先别|暂时别|仅|只)(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text)) return false;
  if (hasExplicitDevelopmentExecutionIntent(text)) return true;
  const explicitVerb = /(创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/;
  const explicitAuthorization = /(?:我)?明确授权(?:你|系统|全局Agent|全局agent)?/.test(text) && explicitVerb.test(text);
  const directive = explicitVerb.test(text) && (/^(请|帮我|麻烦|给我|直接|立即|马上|开始|创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/.test(text) || /(?:我要你|需要你|由你|替我)/.test(text));
  const explicitDispatch = /^(?:请)?给.+(?:群|项目|Agent|agent).*(?:派发|下发|修复|实现|修改|处理|执行)/.test(text);
  const explicitGenericTarget = /^给(?:某个|这个|该)?(?:项目|群聊|Agent|agent).*(?:加|新增|实现|修改|修复|处理|执行)/.test(text);
  const explanatory = /(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能否|能不能|可不可以|是否|有哪些|有什么)[^。！？]*[?？]?$/i.test(text);
  return (explicitAuthorization || directive || explicitDispatch || explicitGenericTarget) && !explanatory;
}

function safeProjectRows() {
  return getConfigs().map((config: any) => {
    const info = getConfigInfo(config.path)?.[0] || {};
    return {
      name: config.name,
      work_dir: info.workDir || "",
      agent: info.agent || "claudecode",
      platform: info.platform || "",
    };
  });
}

function compactTask(task: any) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    status_detail: task.status_detail,
    group_id: task.group_id,
    target_project: task.target_project,
    updated_at: task.updated_at || task.completed_at || task.created_at,
    trace_id: task.trace_id,
  };
}

function summarizeGlobalToolObservationForUser(observation: any, fallback = "操作已返回结果。") {
  if (!observation) return fallback;
  if (observation.success === false || observation.error) {
    return sanitizeGlobalDirectAgentOutput(observation.error || observation.summary || observation.message, "操作未完成；错误详情已放入技术详情。", 700);
  }
  const explicit = sanitizeGlobalDirectAgentOutput(observation.summary || observation.message || observation.reply || "", "", 700);
  if (explicit) return explicit;
  const count = observation.jobs?.length
    ?? observation.tasks?.length
    ?? observation.projects?.length
    ?? observation.groups?.length
    ?? observation.missions?.length
    ?? observation.children?.length;
  if (count !== undefined) return `操作已返回结果，共 ${count} 条；详细记录已放入技术详情。`;
  if (observation.accepted === true && observation.completed === false) return "任务已受理并进入持续跟进；这不代表最终完成，完成后会再给出交付总结。";
  if (observation.client_effect) return "操作已返回结果，界面会同步执行对应动作。";
  return "操作已返回结果；详细记录已放入技术详情。";
}

function buildAgenticContext(query = "", sessionId = "") {
  const tasks = loadTasks();
  const groups = loadGroups();
  return {
    projects: safeProjectRows(),
    groups: groups.map((group: any) => ({ id: group.id, name: group.name, members: (group.members || []).map((member: any) => ({ project: member.project, agent: member.agent })) })),
    task_summary: {
      total: tasks.length,
      active: tasks.filter((task: any) => ["pending", "queued", "in_progress", "running"].includes(String(task.status))).length,
      recent: tasks.slice(-12).map(compactTask),
    },
    cron_jobs: loadCronJobs().map((job: any) => ({ id: job.id, name: job.name, schedule: job.schedule, enabled: job.enabled !== false, target_type: job.target_type, group_id: job.group_id, project: job.project })),
    tools: {
      mcp: loadMcpTools().map((tool: any) => tool.name),
      skills: loadSkills().map((skill: any) => skill.name),
    },
    global_memory: query ? buildGlobalAgentMemoryPacket(query, { sessionId, limit: 7 }) : "",
    group_memory_context: buildGlobalGroupMemoryContext(query, { sessionId, groups, maxGroups: 6, maxTypedMemory: 3 }),
  };
}

function localActionToAgenticDecision(localIntent: LocalIntentResult | null, run: GlobalAgentRun): GlobalAgentDecision | null {
  if (run.steps.length > 0) {
    const last = run.steps[run.steps.length - 1];
    const observationText = summarizeGlobalToolObservationForUser(last.observation, localIntent?.reply || "操作已返回结果。");
    return {
      state: "complete",
      message: last.error ? `操作未完成：${last.error}` : `${localIntent?.reply || "操作已返回结果。"}\n\n${observationText}`,
      tool: null,
      completion: { evidence: last.error ? [] : [`工具 ${last.tool?.name || "unknown"} 已返回执行结果`], risks: last.error ? [last.error] : [] },
    };
  }
  if (!localIntent?.action?.type) {
    return { state: "answer", message: "当前统一大模型不可用。我不会依据关键词擅自操作项目；请先检查统一大模型配置后再试。", tool: null };
  }
  const action = localIntent.action;
  const toolName = action.type === "system_status" ? "inspect_system" : action.type;
  if (!GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === toolName)) {
    return { state: "answer", message: `${localIntent.reply}\n\n当前动作还没有接入 Agentic Loop 后端工具，未执行。`, tool: null };
  }
  const spec = GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === toolName)!;
  const fallbackRisk = typeof spec.risk === "function" ? spec.risk(action.params || {}) : spec.risk;
  const deterministicUiTools = new Set(["play_music", "toggle_pet", "navigate"]);
  if (fallbackRisk !== "read" && !deterministicUiTools.has(toolName)) {
    return {
      state: "answer",
      message: "当前统一大模型不可用。规则兜底只允许只读查询和界面动作，不会依据关键词执行任何数据写入、任务派发或项目修改。请恢复统一大模型配置后再执行该操作。",
      tool: null,
      intent: { category: "ambiguous", goal: run.user_message, action_required: false, confidence: 0.2, authorization_basis: "none", reason: "模型不可用，禁止关键词规则代替语义决策执行写操作" },
    };
  }
  return { state: "execute", message: localIntent.reply, tool: { name: toolName, arguments: action.params || {} } };
}

function createMissionSupervisorRuntime(ctx: CollabCtx): GlobalMissionSupervisorRuntime {
  return {
    inspectMission: (missionId) => getGlobalDevelopmentMission(missionId),
    advanceMission: (missionId, options) => superviseGlobalDevelopmentMissionCycle(missionId, ctx, options),
    controlMission: (missionId, operation, payload) => controlGlobalDevelopmentMission(missionId, operation, ctx, payload),
    onCompleted: async (record, report) => {
      const formatted = formatGlobalMissionFinalReport(report);
      recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "completed", report });
      if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, { ...report, formatted }, "completed");
      if (/feishu/i.test(record.source)) {
        await sendFeishuReportMessage({ title: "全局 Agent 最终交付报告", markdown: formatted });
      }
    },
    onProgress: async (record, event) => {
      if (event?.type === "waiting_user") recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "waiting_user", report: { summary: `全局任务等待人工处理`, remaining_items: (event.items || []).map((item: any) => item.reason || item.task_id) } });
      if (record.global_run_id && event?.type === "waiting_user") updateGlobalAgentSupervisionState(record.global_run_id, "waiting_user");
      if (event?.type !== "waiting_user" || !/feishu/i.test(record.source)) return;
      const lines = (event.items || []).map((item: any) => `- ${item.task_id || "任务"}: ${item.reason || "需要人工处理"}`);
      await sendFeishuReportMessage({ title: "全局 Agent 等待人工处理", markdown: `全局任务 ${record.mission_id} 自动恢复已达到安全上限：\n${lines.join("\n")}` });
    },
    onTerminal: async (record, outcome, report) => {
      recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: outcome, report });
      if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, report, outcome);
      if (/feishu/i.test(record.source)) {
        await sendFeishuReportMessage({ title: outcome === "cancelled" ? "全局任务已取消" : "全局任务监督失败", markdown: report?.summary || "全局任务未完成" });
      }
    },
  };
}

function attachGlobalRunTestAgentExecutionPlan(run: GlobalAgentRun, event: any = {}) {
  if (String(event?.type || "") !== "test_agent_execution_plan_ready") return;
  const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
  if (!plan) return;
  (run as any).test_agent_execution_plan = plan;
  (run as any).testAgentExecutionPlan = plan;
  (run as any).test_agent_execution_plan_summary = event.test_agent_execution_plan_summary || event.testAgentExecutionPlanSummary || event.detail || "";
  (run as any).testAgentExecutionPlanSummary = event.testAgentExecutionPlanSummary || event.test_agent_execution_plan_summary || event.detail || "";
  (run as any).test_agent_execution_plan_detail = event.detail || "";
  (run as any).testAgentExecutionPlanDetail = event.detail || "";
}

function attachGlobalRunTestAgentReview(run: GlobalAgentRun, event: any = {}) {
  if (String(event?.type || "") !== "test_agent_review_ready") return;
  const summary = event.test_agent_review_summary || event.testAgentReviewSummary || event.independent_review_summary || event.independentReviewSummary || null;
  if (!summary) return;
  const rows = Array.isArray(event.independent_review) ? event.independent_review : Array.isArray(event.independentReview) ? event.independentReview : [];
  (run as any).test_agent_review_summary = summary;
  (run as any).testAgentReviewSummary = summary;
  (run as any).independent_review_summary = summary;
  (run as any).independentReviewSummary = summary;
  (run as any).independent_review = rows;
  (run as any).independentReview = rows;
  (run as any).test_agent_report = event.test_agent_report || event.testAgentReport || event.technical?.test_agent_report || null;
  (run as any).testAgentReport = event.testAgentReport || event.test_agent_report || event.technical?.test_agent_report || null;
  (run as any).post_review_spot_check_summary = event.post_review_spot_check_summary || event.postReviewSpotCheckSummary || null;
  (run as any).postReviewSpotCheckSummary = event.postReviewSpotCheckSummary || event.post_review_spot_check_summary || null;
  (run as any).post_review_spot_check = event.technical?.post_review_spot_check || event.post_review_spot_check || event.postReviewSpotCheck || null;
  (run as any).postReviewSpotCheck = event.postReviewSpotCheck || event.post_review_spot_check || event.technical?.post_review_spot_check || null;
}

async function executeAgenticTool(baseUrl: string, ctx: CollabCtx, name: string, args: any, run: GlobalAgentRun, onEvent?: (event: any) => void) {
  const signature = crypto.createHash("sha256").update(`${name}:${JSON.stringify(args || {})}`).digest("hex").slice(0, 24);
  const operationKey = `${run.id}:${signature}`;
  const operation = acquireIdempotency({
    scope: "global-agent-tool",
    key: operationKey,
    traceId: run.trace_id,
    leaseMs: 12 * 60 * 1000,
    metadata: { run_id: run.id, tool: name },
  });
  if (!operation.acquired) {
    const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-tool", operationKey, 12 * 60 * 1000) : operation.record;
    if (settled?.status === "completed") return { ...(settled.result?.observation || settled.result || {}), replayed: true };
    if (settled?.status === "failed") throw new Error(settled.error || `工具 ${name} 的历史执行失败`);
    throw new Error(`工具 ${name} 仍在另一个执行实例中运行`);
  }

  try {
    let observation: any;
    if (name === "inspect_system") {
      observation = { success: true, ...buildAgenticContext(), missions: refreshGlobalDevelopmentMissions().slice(-8) };
    } else if (name === "list_projects") {
      observation = { success: true, projects: safeProjectRows() };
    } else if (name === "inspect_project") {
      const project = String(args.project || "");
      const config = getConfigs().find((item: any) => item.name === project);
      if (!config) throw new Error(`项目不存在：${project}`);
      const info = getConfigInfo(config.path)?.[0] || {};
      observation = {
        success: true,
        project,
        config: { work_dir: info.workDir || "", agent: info.agent || "claudecode", platform: info.platform || "" },
        memory: buildProjectMemoryPacket(project, { workDir: info.workDir, query: run.user_message }),
      };
    } else if (name === "list_groups") {
      observation = { success: true, groups: buildAgenticContext().groups };
    } else if (name === "list_tasks") {
      const tasks = loadTasks().filter((task: any) => !args.id || task.id === args.id).filter((task: any) => !args.status || task.status === args.status);
      observation = { success: true, tasks: tasks.slice(-50).map(compactTask) };
    } else if (name === "list_cron") {
      observation = { success: true, jobs: buildAgenticContext().cron_jobs };
    } else if (name === "query_knowledge") {
      observation = { success: true, query: args.query, content: queryKnowledgeBase(String(args.query || "")) || "未检索到相关知识" };
    } else if (name === "query_global_memory") {
      observation = { success: true, query: args.query, ...recallGlobalAgentMemory(String(args.query || ""), { sessionId: run.session_id, limit: Number(args.limit || 8) }) };
    } else if (name === "query_group_memory") {
      observation = {
        success: true,
        query: args.query,
        group_memory_context: buildGlobalGroupMemoryContext(String(args.query || run.user_message || ""), {
          sessionId: run.session_id,
          maxGroups: Number(args.max_groups || args.maxGroups || args.limit || 8),
          maxTypedMemory: Number(args.max_typed_memory || args.maxTypedMemory || 4),
        }),
      };
    } else if (name === "manage_global_memory") {
      const operation = String(args.operation || "").toLowerCase();
      if (operation !== "status" && !String(args.reason || "").trim()) throw new Error("全局记忆变更操作必须说明原因");
      if (operation === "compact") {
        observation = { success: true, operation, sessions: loadGlobalAgentMemory().sessions.map((session: any) => compactGlobalAgentSession(session.sessionId, { force: true, reason: args.reason })) };
      } else if (operation === "rebuild") {
        observation = { success: true, operation, memory: rebuildGlobalAgentMemory(args.reason, "global-agent") };
      } else if (["enable", "disable"].includes(operation)) {
        observation = { success: true, operation, policy: setGlobalAgentMemoryPolicy({ disabled: operation === "disable", reason: args.reason, actor: "global-agent" }) };
      } else if (operation === "status") {
        observation = { success: true, operation, policy: getGlobalAgentMemoryPolicy(), memory: loadGlobalAgentMemory() };
      } else throw new Error(`不支持的全局记忆操作：${operation}`);
    } else if (name === "inspect_mission") {
      const mission = getGlobalDevelopmentMission(String(args.id || ""));
      if (!mission) throw new Error("全局开发任务不存在");
      observation = { success: true, ...mission, supervisor: getGlobalMissionSupervisor(String(args.id || "")) };
    } else if (name === "inspect_supervision") {
      const supervisor = getGlobalMissionSupervisor(String(args.id || ""));
      if (!supervisor) throw new Error("全局任务监工不存在");
      observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
    } else if (name === "orchestrate_development" || name === "send_project_cmd") {
      const missionArgs = name === "send_project_cmd"
        ? buildGlobalSingleProjectMissionPayload({
            project: String(args.project || args.projectName || ""),
            message: String(args.message || args.prompt || args.command || run.user_message || ""),
            originalText: run.original_user_message || run.user_message,
            traceId: run.trace_id,
            globalRunId: run.id,
            sessionId: run.session_id,
            source: run.source || "global-agent-single-project-dispatch",
            idempotencyKey: args.idempotency_key || `${run.id}:single-project-mission`,
          })
        : {
            ...args,
            source: run.source || "global-agent",
            trace_id: run.trace_id,
            idempotency_key: args.idempotency_key || `${run.id}:mission`,
          };
      const missionResult = createGlobalDevelopmentMission({
        ...missionArgs,
      }, ctx);
      const supervisor = startGlobalMissionSupervisor({
        mission_id: missionResult.mission.id,
        global_run_id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        source: run.source,
        business_goal: missionResult.mission.business_goal || missionArgs.business_goal,
        acceptance: missionResult.mission.acceptance_criteria || missionArgs.acceptance,
        max_attempts: missionArgs.max_attempts || 3,
      });
      attachGlobalAgentRunSupervision(run, { mission_id: missionResult.mission.id, supervisor_id: supervisor.id, state: supervisor.status });
      observation = {
        success: true,
        accepted: true,
        completed: false,
        message: "全局任务已派发并进入持久监督；当前不是完成状态。",
        mission_id: missionResult.mission.id,
        supervisor_id: supervisor.id,
        supervisor_status: supervisor.status,
        children: missionResult.children.map((item: any) => ({ task_id: item.task?.id, target: item.target?.name, queued: item.queue_result?.queued, status: item.task?.status })),
        rejected: missionResult.rejected,
      };
    } else if (name === "manage_supervision") {
      const supervisor = await controlGlobalMissionSupervisor(String(args.id || ""), String(args.operation || ""), createMissionSupervisorRuntime(ctx), args);
      if (supervisor.global_run_id) {
        if (supervisor.status === "cancelled") completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled");
        else updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
      }
      observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
    } else if (name === "navigate") {
      observation = { success: true, message: `Web 客户端可切换到 ${args.tab}`, client_effect: { type: "navigate", params: { tab: args.tab } } };
    } else if (name === "git_review") {
      observation = await postLocalApi(baseUrl, "/api/global-agent/git-review", { project: args.project });
    } else if (name === "git_commit") {
      observation = await postLocalApi(baseUrl, "/api/git/commit", { project: args.project, message: args.message || "chore: 由全局 Agent 提交变更", files: args.files || [] });
    } else if (name === "create_template") {
      observation = await postLocalApi(baseUrl, "/api/templates", { name: args.name, category: args.category || "custom", prompt: args.content || args.prompt || "" });
    } else {
      let action: any = { type: name, params: { ...(args || {}) } };
      if (GLOBAL_MANAGEMENT_ACTIONS[name]) {
        action = annotateGlobalAction(action);
        if (action.validated === false) throw new Error(`缺少参数：${(action.missing_params || []).join("、")}`);
        action.confirmed = true;
      }
      const summary = await executeFeishuAction(baseUrl, action, run.user_message, run.trace_id, {
        globalRunId: run.id,
        sessionId: run.session_id,
        source: run.source,
        onEvent: (event: any) => {
          attachGlobalRunTestAgentExecutionPlan(run, event);
          attachGlobalRunTestAgentReview(run, event);
          onEvent?.(event);
        },
      });
      observation = { success: true, summary };
    }
    completeIdempotency("global-agent-tool", operationKey, { observation });
    return observation;
  } catch (error: any) {
    failIdempotency("global-agent-tool", operationKey, error);
    throw error;
  }
}

function createAgenticRuntime(baseUrl: string, ctx: CollabCtx, input: { localIntent?: LocalIntentResult | null; onEvent?: (event: any) => void } = {}): GlobalAgentLoopRuntime {
  const config = loadOrchestratorConfig();
  return {
    callModel: async (messages) => {
      if (!config.apiKey || !config.apiUrl || !config.model) throw new Error("统一大模型尚未配置");
      return callLlm(config, messages);
    },
    getContext: (run) => buildAgenticContext(run.user_message, run.session_id),
    executeTool: (name, args, run) => executeAgenticTool(baseUrl, ctx, name, args, run, input.onEvent),
    fallbackDecision: (run) => localActionToAgenticDecision(input.localIntent || null, run),
    onEvent: input.onEvent ? (event) => input.onEvent!(event) : undefined,
  };
}

async function runAgenticGlobalRequest(baseUrl: string, ctx: CollabCtx, input: {
  message: string;
  history?: any[];
  sessionId?: string;
  source?: string;
  traceId?: string;
  clarificationRunId?: string;
  onEvent?: (event: any) => void;
}) {
  const projects = getConfigs().map((item: any) => item.name);
  const groups = loadGroups();
  const localIntent = inferLocalGlobalAction(input.message, projects, groups, { cronJobs: loadCronJobs(), tasks: loadTasks(), mcpTools: loadMcpTools(), skills: loadSkills() });
  const runtime = createAgenticRuntime(baseUrl, ctx, { localIntent, onEvent: input.onEvent });
  const sessionId = input.sessionId || "default";
  if (!/feishu/i.test(input.source || "")) {
    try {
      ingestGlobalAgentConversation({ sessionId, source: input.source || "web", messages: [...(input.history || []), { role: "user", content: input.message, timestamp: new Date().toISOString(), trace_id: input.traceId }] });
    } catch (error: any) {
      console.warn(`[全局记忆] Agentic 请求写入失败：${error?.message || error}`);
    }
  }
  const startsNewTopic = /^(?:新问题|换个问题|另外(?:一个)?问题|忽略刚才|取消刚才|重新开始)/.test(String(input.message || "").trim());
  const requestedClarificationRunId = String(input.clarificationRunId || "").trim();
  let waitingClarification: any = null;
  if (!startsNewTopic && requestedClarificationRunId) {
    const requestedRun = getGlobalAgentRun(requestedClarificationRunId);
    if (!requestedRun || requestedRun.session_id !== sessionId) throw new Error("当前会话中没有这个待补充请求");
    if (requestedRun.status !== "waiting_clarification") throw new Error("这个请求已不再等待补充，请刷新后查看最新状态");
    waitingClarification = requestedRun;
  } else if (!startsNewTopic) {
    waitingClarification = findClarifyingGlobalAgentRun(sessionId);
  }
  const run = waitingClarification
    ? await continueGlobalAgentRunWithClarification(waitingClarification.id, input.message, runtime, {
        explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
      })
    : await startGlobalAgentRun({
        message: input.message,
        history: input.history || [],
        sessionId,
        source: input.source || "web",
        traceId: input.traceId,
        explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
        maxSteps: 10,
        timeoutMs: 12 * 60 * 1000,
      }, runtime);
  if (!/feishu/i.test(input.source || "")) {
    try {
      ingestGlobalAgentConversation({
        sessionId,
        source: input.source || "web",
        messages: [{
          role: "assistant",
          content: globalRunVisibleReply(run, "我已整理处理结果，技术细节已放入技术详情。"),
          technical_content: run.final_report?.technical_content || run.final_delivery_report?.technical_content || "",
          timestamp: new Date().toISOString(),
          trace_id: run.trace_id,
          mission_id: run.mission_id,
        }],
      });
    } catch (error: any) {
      console.warn(`[全局记忆] Agentic 结果写入失败：${error?.message || error}`);
    }
  }
  return run;
}

export async function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number) {
  const result = await recoverInterruptedGlobalAgentRuns(createAgenticRuntime(`http://127.0.0.1:${port}`, ctx));
  for (const run of result.results || []) {
    if (!["completed", "failed", "cancelled"].includes(run.status)) continue;
    settleIdempotencyByTrace(
      run.trace_id,
      run.status === "completed" ? "completed" : "failed",
      { run_id: run.id, status: run.status, recovered: true },
      ["global-agent-request", "feishu-control-message", "feishu-event"],
    );
  }
  return result;
}

export function startGlobalMissionSupervisionForServer(ctx: CollabCtx) {
  return startGlobalMissionSupervisorScheduler(createMissionSupervisorRuntime(ctx));
}

export function bootstrapGlobalAgentMemoryForServer() {
  const store = loadGlobalAgentHistoryStore();
  const results: any[] = [];
  for (const session of store.sessions || []) {
    try {
      results.push(ingestGlobalAgentConversation({ sessionId: session.id, source: session.source || "history-migration", messages: session.messages || [] }));
    } catch (error: any) {
      results.push({ sessionId: session.id, error: error?.message || String(error) });
    }
  }
  return { total: (store.sessions || []).length, migrated: results.filter(item => !item.error).length, results };
}

export function stopGlobalMissionSupervisionForServer() {
  stopGlobalMissionSupervisorScheduler();
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

async function processFeishuGlobalAgentMessage(baseUrl: string, ctx: CollabCtx, text: string, payload: any, options: { sendReport?: boolean; traceId?: string } = {}) {
  const sendReport = options.sendReport !== false;
  const traceId = ensureTraceId(options.traceId, "feishu");
  const conversationId = buildFeishuConversationId(payload);
  const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
  appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
  const auditBase = {
    source: "feishu-control-bot",
    sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
    message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
    trace_id: traceId,
  };
  appendTraceEvent(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
  try {
    if (/^(帮助|help|\/help)$/i.test(text)) {
      const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个协作群或项目执行成员下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
      if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 使用帮助", markdown });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      return markdown;
    }
    if (isGlobalProgressStatusRequest(text)) {
      const markdown = formatMissionStatus();
      appendGlobalActionAudit({ ...auditBase, action: { type: "mission_status", params: { message: text } }, status: "success", result: { summary: markdown } });
      if (sendReport) await sendFeishuReportMessage({ title: "全局任务状态", markdown });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      return markdown;
    }
    const confirmationMatch = text.match(/^(确认(?:执行)?|同意|取消)(?:\s+([a-z0-9_-]+))?[。！!\s]*$/i);
    let run: GlobalAgentRun;
    if (confirmationMatch) {
      const requestedId = String(confirmationMatch[2] || "").trim();
      const waiting = requestedId ? getGlobalAgentRun(requestedId) : findWaitingGlobalAgentRun(conversationId);
      if (!waiting || waiting.status !== "waiting_confirmation") {
        const markdown = "当前没有等待你确认的全局 Agent 操作。";
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent", markdown });
        return markdown;
      }
      run = await resumeGlobalAgentRun(waiting.id, createAgenticRuntime(baseUrl, ctx), {
        approved: !/^取消/i.test(confirmationMatch[1]),
        cancelled: /^取消/i.test(confirmationMatch[1]),
      });
    } else {
      run = await runAgenticGlobalRequest(baseUrl, ctx, {
        message: text,
        history: historyBeforeUser.map((item: any) => ({ role: item.role, content: item.content })),
        sessionId: conversationId,
        source: "feishu-control-bot",
        traceId,
      });
    }
    const confirmationHint = run.status === "waiting_confirmation"
      ? `\n\n待确认操作：${run.pending_tool?.name || "写入操作"}\n运行 ID：${run.id}\n回复“确认 ${run.id}”继续，或回复“取消 ${run.id}”。`
      : "";
    const markdown = `${globalRunVisibleReply(run, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK)}${confirmationHint}`;
    appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
    if (sendReport) await sendFeishuReportMessage({ title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行结果", markdown });
    return markdown;
  } catch (error: any) {
    const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
    appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
    if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 执行失败", markdown });
    return markdown;
  }
}
export function handleGlobalAgentApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  if (pathname === "/api/global-agent/history" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const store = syncGlobalAgentWebHistory(payload);
        sendJson(res, { success: true, sessions: store.sessions?.length || 0, current_session_id: store.current_session_id || "" });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "全局 Agent 历史同步失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/history" && req.method === "GET") {
    const store = loadGlobalAgentHistoryStore();
    sendJson(res, { success: true, ...store });
    return true;
  }

  if (pathname === "/api/global-agent/bridge/pending" && req.method === "GET") {
    const store = loadGlobalAgentBridgeStore();
    const pending = (store.requests || []).filter((item: any) => item.status === "pending").sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))[0] || null;
    sendJson(res, { success: true, request: pending });
    return true;
  }

  if (pathname === "/api/global-agent/bridge/result" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const store = loadGlobalAgentBridgeStore();
        const request = (store.requests || []).find((item: any) => item.id === payload.id);
        if (!request) return sendJson(res, { success: false, error: "桥接请求不存在" }, 404);
        request.status = payload.success === false ? "failed" : "done";
        request.reply = String(payload.reply || payload.error || GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK);
        request.error = payload.error || "";
        request.updated_at = new Date().toISOString();
        saveGlobalAgentBridgeStore(store);
        sendJson(res, { success: true });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "桥接结果保存失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/control-bot/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const isAcp = req.headers["x-ccm-acp"] === "1";
        const config = loadFeishuConfig();
        if (!isAcp) {
          const expected = String(config.control_bot_hook_token || "").trim();
          const actual = String(parsed.query.token || req.headers["x-ccm-token"] || "").trim();
          if (!expected || actual !== expected) {
            sendJson(res, { success: false, error: "控制机器人 Hook Token 校验失败" }, 401);
            return;
          }
        }
        const payload = body ? JSON.parse(body) : {};
        const text = extractCcConnectHookText(payload);
        if (!text) {
          sendJson(res, { success: false, error: "未从控制机器人载荷中识别到文本消息" }, 400);
          return;
        }
        const conversationId = buildFeishuConversationId(payload);
        const messageId = getFeishuMessageId(payload);
        const operationKey = messageId ? `${conversationId}:${messageId}` : "";
        const operation = operationKey ? acquireIdempotency({ scope: "feishu-control-message", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { conversation_id: conversationId, message_id: messageId } }) : null;
        if (operation && !operation.acquired) {
          const settled = operation.inProgress ? await waitForIdempotencyResult("feishu-control-message", operationKey) : operation.record;
          const replay = settled?.result || {};
          sendJson(res, { success: settled?.status === "completed", duplicate: true, message: "重复控制消息已抑制", reply: replay.reply || replay.error || "消息仍在处理中", trace_id: settled?.trace_id || operation.traceId });
          return;
        }
        const reply = await processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { sendReport: !isAcp, traceId: operation?.traceId });
        if (operationKey) completeIdempotency("feishu-control-message", operationKey, { reply });
        sendJson(res, { success: true, message: "控制机器人消息已处理", reply, trace_id: operation?.traceId || "" });
      } catch (error: any) {
        if (!res.headersSent) sendJson(res, { success: false, error: error?.message || "控制机器人消息处理失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/bot/test" && req.method === "POST") {
    const config = loadFeishuConfig();
    const publicBaseUrl = String(config.control_bot_public_base_url || "").trim().replace(/\/$/, "");
    const verificationToken = String(config.control_bot_verification_token || "").trim();
    if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
      sendJson(res, { success: false, error: "请先填写可公网访问的 HTTPS 地址" }, 400);
      return true;
    }
    if (!verificationToken) {
      sendJson(res, { success: false, error: "请先填写 Verification Token" }, 400);
      return true;
    }
    const callbackUrl = publicBaseUrl + "/api/feishu/bot/event";
    const challenge = "ccm-" + Date.now().toString(36);
    void fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url_verification", challenge, token: verificationToken }),
      signal: AbortSignal.timeout(10000),
    }).then(async (response) => {
      const data = await response.json() as any;
      if (!response.ok || data?.challenge !== challenge) throw new Error(data?.error || `回调响应异常 (${response.status})`);
      sendJson(res, { success: true, message: "控制机器人事件回调可用", callback_url: callbackUrl });
    }).catch((error: any) => {
      sendJson(res, { success: false, error: `无法访问事件回调：${error?.message || String(error)}` }, 400);
    });
    return true;
  }
  if (pathname === "/api/feishu/bot/event" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const config = loadFeishuConfig();
        const rawPayload = body ? JSON.parse(body) : {};
        const payload = normalizeFeishuEventPayload(rawPayload, config);
        verifyFeishuEventToken(payload, config);

        if (payload.type === "url_verification" || payload.challenge) {
          sendJson(res, { challenge: payload.challenge });
          return;
        }
        sendJson(res, { code: 0 });
        if (config.control_bot_enabled !== true) return;
        if (payload?.header?.event_type !== "im.message.receive_v1") return;
        if (payload?.event?.sender?.sender_type === "app") return;

        const messageId = getFeishuMessageId(payload);
        if (messageId && processedFeishuMessageIds.has(messageId)) return;
        if (messageId) {
          processedFeishuMessageIds.add(messageId);
          if (processedFeishuMessageIds.size > 1000) {
            const oldest = processedFeishuMessageIds.values().next().value;
            if (oldest) processedFeishuMessageIds.delete(oldest);
          }
        }
        const text = extractFeishuMessageText(payload);
        if (!text) {
          void sendFeishuReportMessage({ title: "全局 Agent", markdown: "目前控制机器人只处理文字消息，请把需求或指令以文字发送。" });
          return;
        }
        const operationKey = messageId || String(payload?.header?.event_id || "").trim();
        const operation = operationKey ? acquireIdempotency({ scope: "feishu-event", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { message_id: messageId, event_id: payload?.header?.event_id || "" } }) : null;
        if (operation && !operation.acquired) return;
        void processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { traceId: operation?.traceId })
          .then(reply => { if (operationKey) completeIdempotency("feishu-event", operationKey, { reply }); })
          .catch(error => { if (operationKey) failIdempotency("feishu-event", operationKey, error); });
      } catch (error: any) {
        if (!res.headersSent) sendJson(res, { code: 1, error: error?.message || "飞书事件处理失败" }, 401);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/capabilities" && req.method === "GET") {
    sendJson(res, {
      success: true,
      capabilities: Object.entries(GLOBAL_MANAGEMENT_ACTIONS).map(([type, spec]: any) => ({
        type,
        label: spec.label,
        operations: spec.operations,
        destructive: spec.destructive,
        required_params: GLOBAL_MANAGEMENT_REQUIRED_PARAMS[type] || {},
      })),
    });
    return true;
  }

  if (pathname === "/api/global-agent/audit" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, { success: true, audit: appendGlobalActionAudit(payload) });
      } catch (error: any) {
        sendJson(res, { error: error.message || "审计记录失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/orchestrate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = createGlobalDevelopmentMission({
          ...payload,
          source: payload.source || "global-agent-chat",
        }, ctx);
        const supervisor = startGlobalMissionSupervisor({
          mission_id: result.mission.id,
          global_run_id: payload.global_run_id || payload.globalRunId || "",
          trace_id: result.mission.trace_id,
          session_id: payload.session_id || payload.sessionId || "default",
          source: payload.source || "global-agent-chat",
          business_goal: result.mission.business_goal,
          acceptance: result.mission.acceptance_criteria,
          max_attempts: payload.max_attempts || payload.maxAttempts || 3,
        });
        sendJson(res, { ...result, supervisor });
      } catch (error: any) {
        sendJson(res, { success: false, error: error.message || "全局任务创建失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/missions" && req.method === "GET") {
    const id = String(parsed.query.id || "").trim();
    if (id) {
      const result = getGlobalDevelopmentMission(id);
      if (!result) return sendJson(res, { error: "全局任务不存在" }, 404);
      sendJson(res, { success: true, ...result, supervisor: getGlobalMissionSupervisor(id) });
      return true;
    }
    const missions = refreshGlobalDevelopmentMissions();
    sendJson(res, { success: true, missions });
    return true;
  }

  if (pathname === "/api/global-agent/supervisors" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.mission_id || parsed.query.missionId || "").trim();
    if (id) {
      const supervisor = getGlobalMissionSupervisor(id);
      if (!supervisor) return sendJson(res, { success: false, error: "全局任务监工不存在" }, 404), true;
      sendJson(res, { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) });
      return true;
    }
    sendJson(res, {
      success: true,
      supervisors: listGlobalMissionSupervisors({ status: String(parsed.query.status || "") || undefined, limit: Number(parsed.query.limit || 50) }),
      scheduler: getGlobalMissionSupervisorSchedulerStatus(),
    });
    return true;
  }

  if (pathname === "/api/global-agent/supervisors/self-test" && req.method === "GET") {
    void runGlobalMissionSupervisorAsyncSelfTest()
      .then(asyncResult => {
        const unit = runGlobalMissionSupervisorSelfTest();
        const pass = unit.pass && asyncResult.pass;
        sendJson(res, { success: pass, result: { pass, unit, async_e2e: asyncResult } }, pass ? 200 : 500);
      })
      .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
    return true;
  }

  if (pathname === "/api/global-agent/supervisors/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.supervisor_id || payload.mission_id || "").trim();
        if (!id) return sendJson(res, { success: false, error: "缺少监工或全局任务 ID" }, 400);
        const operation = String(payload.operation || "check_now");
        const supervisor = operation === "check_now"
          ? await checkGlobalMissionSupervisorNow(id, createMissionSupervisorRuntime(ctx))
          : await controlGlobalMissionSupervisor(id, operation, createMissionSupervisorRuntime(ctx), payload);
        let run: any = null;
        if (supervisor.global_run_id) {
          run = supervisor.status === "cancelled"
            ? completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled")
            : updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
        }
        const userSupplement = String(payload.message || payload.followup || "").trim();
        if (operation === "update_goal" && userSupplement && supervisor.session_id) {
          ingestGlobalAgentConversation({
            sessionId: supervisor.session_id,
            source: payload.source || "global_mission_user_input",
            messages: [{
              role: "user",
              content: userSupplement,
              timestamp: payload.message_timestamp || payload.messageTimestamp || new Date().toISOString(),
              mission_id: supervisor.mission_id,
              run_id: supervisor.global_run_id || "",
              metadata: {
                continuation_kind: supervisor.last_continuation?.kind || "supplement",
                waiting_user_resolved: supervisor.last_continuation?.resolves_waiting_user === true,
                request_id: payload.request_id || payload.requestId || "",
              },
            }],
          });
        }
        sendJson(res, {
          success: true,
          supervisor,
          mission: getGlobalDevelopmentMission(supervisor.mission_id),
          run: run ? publicGlobalAgentRun(run) : null,
        });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/tools" && req.method === "GET") {
    sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center" && req.method === "GET") {
    const message = String(parsed.query.message || "").trim();
    sendJson(res, { success: true, control: buildGlobalControlCenterSnapshot(message) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center/intent-preview" && req.method === "GET") {
    const message = String(parsed.query.message || "").trim();
    sendJson(res, { success: true, intent: classifyGlobalControlIntent(message), dispatch: buildGlobalDispatchStrategy(message) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center/health" && req.method === "GET") {
    sendJson(res, { success: true, health: buildGlobalSystemHealth() });
    return true;
  }

  if (pathname === "/api/global-agent/group-memory" && req.method === "GET") {
    const query = String(parsed.query.query || parsed.query.q || "").trim();
    sendJson(res, {
      success: true,
      group_memory_context: buildGlobalGroupMemoryContext(query, {
        sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
        maxGroups: Number(parsed.query.max_groups || parsed.query.maxGroups || 8),
        maxTypedMemory: Number(parsed.query.max_typed_memory || parsed.query.maxTypedMemory || 4),
      }),
    });
    return true;
  }

  if (pathname === "/api/global-agent/group-memory/self-test" && req.method === "GET") {
    const result = runGlobalGroupMemoryContextSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/control-center/self-test" && req.method === "GET") {
    const result = runGlobalControlCenterSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/runtime/permissions" && req.method === "GET") {
    sendJson(res, { success: true, rules: loadGlobalAgentPermissionRules() });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/permissions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = payload.operation === "delete" || payload.delete === true
          ? deleteGlobalAgentPermissionRule(String(payload.id || ""))
          : saveGlobalAgentPermissionRule(payload);
        sendJson(res, { success: true, result, rules: loadGlobalAgentPermissionRules() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/hooks" && req.method === "GET") {
    sendJson(res, { success: true, hooks: loadGlobalAgentHooks() });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/hooks" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = payload.operation === "delete" || payload.delete === true
          ? deleteGlobalAgentHook(String(payload.id || ""))
          : saveGlobalAgentHook(payload);
        sendJson(res, { success: true, result, hooks: loadGlobalAgentHooks() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/background" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.run_id || "").trim();
    if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
    const run = getGlobalAgentRun(id);
    sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/background/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || "").trim();
        const operation = String(payload.operation || "").toLowerCase();
        if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
        let run: any;
        if (operation === "stop" || operation === "cancel") run = cancelGlobalAgentRun(id);
        else if (operation === "pause") run = pauseGlobalAgentRun(id);
        else if (operation === "resume" || operation === "takeover") run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
          approved: payload.approved === true ? true : undefined,
          feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
          source: payload.source || payload.resume_source || payload.resumeSource || "global_background_control",
        });
        else throw new Error("operation 必须是 stop、pause、resume 或 takeover");
        sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/session-debug" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.run_id || "").trim();
    if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
    const run = getGlobalAgentRun(id);
    if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
    sendJson(res, { success: true, debug: buildGlobalAgentSessionDebug(run) });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/self-test" && req.method === "GET") {
    const result = runGlobalAgentRuntimeSelfTest(GLOBAL_AGENT_TOOL_SPECS);
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/agentic/tools" && req.method === "GET") {
    sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
    return true;
  }

  if (pathname === "/api/global-agent/agentic/self-test" && req.method === "GET") {
    void runGlobalAgentLoopSelfTest()
      .then(result => sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500))
      .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
    return true;
  }

  if (pathname === "/api/global-agent/quality" && req.method === "GET") {
    sendJson(res, { success: true, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
    return true;
  }

  if (pathname === "/api/global-agent/quality" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const policy = setAgentQualityPolicy({
          shadowMode: payload.shadowMode ?? payload.shadow_mode,
          minWriteConfidence: payload.minWriteConfidence ?? payload.min_write_confidence,
          requireGroundedTarget: payload.requireGroundedTarget ?? payload.require_grounded_target,
          actor: payload.actor || "local-user",
          reason: payload.reason,
        });
        sendJson(res, { success: true, policy, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/quality/self-test" && req.method === "GET") {
    const result = runAgentQualityCenterSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/reasoning/self-test" && req.method === "GET") {
    const result = runAgentReasoningLoopSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/runtime-kernel/self-test" && req.method === "GET") {
    const result = runAgentRuntimeKernelSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/trace-replay" && req.method === "GET") {
    const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
    sendJson(res, {
      success: true,
      replay: traceId ? replayAgentTrace(traceId) : buildTraceReplaySuite(Number(parsed.query.limit || 20)),
    });
    return true;
  }

  if (pathname === "/api/global-agent/runs" && req.method === "GET") {
    const id = String(parsed.query.id || "").trim();
    if (id) {
      const run = getGlobalAgentRun(id);
      if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
      sendJson(res, { success: true, run: publicGlobalAgentRun(run, String(parsed.query.detail || "") === "full") });
      return true;
    }
    const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
    const status = String(parsed.query.status || "").trim();
    sendJson(res, { success: true, runs: listGlobalAgentRuns({ sessionId: sessionId || undefined, status: status || undefined, limit: Number(parsed.query.limit || 30) }).map(run => publicGlobalAgentRun(run)) });
    return true;
  }

  if (pathname === "/api/global-agent/runs/steer" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || payload.runId || "").trim();
        const message = String(payload.message || payload.text || "").trim();
        if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
        if (!message) return sendJson(res, { success: false, error: "补充要求不能为空" }, 400);
        const storedRun = getGlobalAgentRun(id);
        if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
          const requestId = String(payload.request_id || payload.requestId || "").trim();
          const existing = requestId
            ? (storedRun.user_steer_history || storedRun.userSteerHistory || []).find((item: any) => item?.request_id === requestId)
            : null;
          if (existing) {
            const existingSupervisor = getGlobalMissionSupervisor(storedRun.supervisor_id);
            return sendJson(res, {
              success: true,
              accepted: true,
              applied: existing.status === "applied",
              duplicate: true,
              steering: existing,
              run: publicGlobalAgentRun(storedRun),
              supervisor: existingSupervisor,
              mission: existingSupervisor ? getGlobalDevelopmentMission(existingSupervisor.mission_id) : null,
              message: existing.kind === "revise_goal"
                ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
                : "补充要求已接收，已并入当前任务继续处理。",
            });
          }
          const kind = classifyGlobalAgentUserSteer(
            message,
            payload.kind || payload.steering_kind || payload.steeringKind || "auto",
          );
          const supervisorBefore = getGlobalMissionSupervisor(storedRun.supervisor_id);
          if (!supervisorBefore) throw new Error("全局任务跟进记录不存在");
          const goalPrefix = String(supervisorBefore.business_goal || storedRun.original_user_message || storedRun.user_message || "").trim();
          const businessGoal = [
            goalPrefix,
            `${kind === "revise_goal" ? "目标调整" : "补充要求"}：${message}`,
          ].filter(Boolean).join("\n").slice(0, 50_000);
          const source = String(payload.source || "global_web_supervision_steer");
          const supervisor = await controlGlobalMissionSupervisor(
            storedRun.supervisor_id,
            "update_goal",
            createMissionSupervisorRuntime(ctx),
            {
              ...payload,
              business_goal: businessGoal,
              acceptance: supervisorBefore.acceptance,
              message,
              continuation_kind: kind,
              request_id: requestId,
              source,
              continuation: {
                ...(payload.continuation && typeof payload.continuation === "object" ? payload.continuation : {}),
                kind,
                source,
                reason: message,
                title: kind === "revise_goal" ? "监督阶段目标调整" : "监督阶段补充要求",
                interrupt_current_run: kind === "revise_goal",
              },
            },
          );
          const result = applyGlobalAgentSupervisionSteer(id, message, {
            kind,
            source,
            requestId,
            supervisorState: supervisor.status,
            continuationSummary: supervisor.last_continuation || null,
          });
          try {
            ingestGlobalAgentConversation({
              sessionId: result.run.session_id,
              source,
              messages: [{
                role: "user",
                content: message,
                timestamp: result.steering.at,
                trace_id: result.run.trace_id,
                run_id: result.run.id,
                metadata: {
                  kind: result.steering.kind,
                  steering_id: result.steering.id,
                  supervision: true,
                  applied: true,
                },
              }],
            });
          } catch (error: any) {
            console.warn(`[全局记忆] 持续跟进补充要求写入失败：${error?.message || error}`);
          }
          return sendJson(res, {
            success: true,
            accepted: true,
            applied: true,
            duplicate: result.duplicate,
            steering: result.steering,
            continuation: result.continuation,
            supervisor,
            mission: getGlobalDevelopmentMission(supervisor.mission_id),
            run: publicGlobalAgentRun(result.run),
            message: kind === "revise_goal"
              ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
              : "补充要求已接收，已并入当前任务继续处理。",
          });
        }
        const result = steerGlobalAgentRun(id, message, {
          kind: payload.kind || payload.steering_kind || payload.steeringKind || "auto",
          source: payload.source || "global_web_mid_turn",
          requestId: payload.request_id || payload.requestId || "",
        });
        try {
          ingestGlobalAgentConversation({
            sessionId: result.run.session_id,
            source: payload.source || "global_web_mid_turn",
            messages: [{
              role: "user",
              content: message,
              timestamp: result.steering.at,
              trace_id: result.run.trace_id,
              run_id: result.run.id,
              metadata: {
                kind: result.steering.kind,
                steering_id: result.steering.id,
                mid_turn: true,
              },
            }],
          });
        } catch (error: any) {
          console.warn(`[全局记忆] 执行中补充要求写入失败：${error?.message || error}`);
        }
        sendJson(res, {
          success: true,
          accepted: true,
          duplicate: result.duplicate,
          steering: result.steering,
          run: publicGlobalAgentRun(result.run),
          message: result.steering.kind === "revise_goal"
            ? "目标调整已接收，会在当前任务中重新核对计划。"
            : "补充要求已接收，会在当前任务中继续处理。",
        });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 409);
      }
    });
    return true;
  }

  if (["/api/global-agent/runs/confirm", "/api/global-agent/runs/resume", "/api/global-agent/runs/pause", "/api/global-agent/runs/cancel"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || "").trim();
        if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
        let run: any;
        const storedRun = getGlobalAgentRun(id);
        if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
          const operation = pathname.endsWith("/cancel") ? "cancel" : pathname.endsWith("/pause") ? "pause" : pathname.endsWith("/resume") ? "resume" : "";
          if (operation) {
            const supervisor = await controlGlobalMissionSupervisor(storedRun.supervisor_id, operation, createMissionSupervisorRuntime(ctx), payload);
            run = operation === "cancel"
              ? completeGlobalAgentSupervision(id, { summary: "全局任务已由用户取消。" }, "cancelled")
              : updateGlobalAgentSupervisionState(id, supervisor.status);
          }
        }
        if (!run) {
          if (pathname.endsWith("/pause")) run = pauseGlobalAgentRun(id);
          else if (pathname.endsWith("/cancel")) run = cancelGlobalAgentRun(id);
          else run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
            approved: pathname.endsWith("/confirm") ? payload.approved !== false : undefined,
            cancelled: pathname.endsWith("/confirm") && payload.approved === false,
            feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
            source: payload.source || payload.resume_source || payload.resumeSource || "global_run_control",
          });
        }
        sendJson(res, { success: true, run: publicGlobalAgentRun(run) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/run" && req.method === "POST") {
    const contentType = String(req.headers["content-type"] || "");
    const handleRun = async (payload: any, files: any[] = []) => {
      const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
      let reliabilityOperationKey = "";
      let reliabilityOperationAcquired = false;
      let streamRequestId = "";
      let streamSequence = 0;
      if (isStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
      }
      const emit = (event: any) => {
        if (!isStream || res.writableEnded) return;
        const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
        const sequence = ++streamSequence;
        const eventId = String(event?.event_id || event?.eventId || `${streamRequestId || "global-stream"}:${sequence}`);
        const payloadWithOrder = { ...event, event_id: eventId, eventId, sequence, ...(ui ? { ui } : {}) };
        res.write(`data: ${JSON.stringify(payloadWithOrder)}\n\n`);
      };
      try {
        let message = String(payload.message || "").trim();
        if (files.length) {
          const fileContext = buildUploadedFilesContext(files, "本次消息附件");
          message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
        }
        if (!message) throw new Error("消息不能为空");
        let history: any[] = [];
        try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
        const sessionId = String(payload.session_id || payload.sessionId || "web:default");
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在思考...", { tab: "global-agent" }, 12 * 60 * 1000);
        ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role: "user", text: message, final: true, source: "global" });
        const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || "").trim();
        const operationKey = requestId ? `${sessionId}:${requestId}` : "";
        streamRequestId = requestId;
        reliabilityOperationKey = operationKey;
        const operation = operationKey ? acquireIdempotency({ scope: "global-agent-request", key: operationKey, leaseMs: 13 * 60 * 1000, metadata: { session_id: sessionId, source: "web" } }) : null;
        reliabilityOperationAcquired = operation?.acquired === true;
        if (operation && !operation.acquired) {
          const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-request", operationKey, 13 * 60 * 1000) : operation.record;
          const replayRun = settled?.result?.run_id ? getGlobalAgentRun(settled.result.run_id) : null;
          const result = settled?.result?.run || (replayRun ? publicGlobalAgentRun(replayRun) : null);
          if (!result) throw new Error(settled?.error || "重复请求仍在处理中");
          if (isStream) {
            emit({ type: "result", run: result, duplicate: true });
            emit({ type: "done" });
            res.end();
          } else sendJson(res, { success: true, run: result, duplicate: true });
          return;
        }
        if (isGlobalProgressStatusRequest(message)) {
          const reply = formatMissionStatus();
          const result = buildPublicGlobalStatusRun({ message, reply, sessionId, source: "web", traceId: operation?.traceId });
          try {
            ingestGlobalAgentConversation({
              sessionId,
              source: "web",
              messages: [
                ...history,
                { role: "user", content: message, timestamp: new Date().toISOString(), trace_id: operation?.traceId },
                { role: "assistant", content: reply, timestamp: new Date().toISOString(), trace_id: result.trace_id },
              ],
            });
          } catch (error: any) {
            console.warn(`[全局记忆] 状态追问写入失败：${error?.message || error}`);
          }
          appendGlobalActionAudit({ source: "web", action: { type: "mission_status", params: { message } }, status: "success", result: { summary: reply, trace_id: result.trace_id } });
          if (operationKey) completeIdempotency("global-agent-request", operationKey, { run: result, status: result.status });
          if (isStream) {
            emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
            emit({ type: "done" });
            res.end();
          } else sendJson(res, { success: true, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
          return;
        }
        let finalPetEventRelayed = false;
        const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
          message,
          history,
          sessionId,
          source: "web",
          traceId: operation?.traceId,
          clarificationRunId: payload.clarification_run_id || payload.clarificationRunId || "",
          onEvent: (event: any) => {
            emit(event);
            relayGlobalPetEvent(ctx, event);
            if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
              finalPetEventRelayed = true;
            }
          },
        });
        if (operationKey) completeIdempotency("global-agent-request", operationKey, { run_id: run.id, status: run.status });
        const result = publicGlobalAgentRun(run);
        if (!finalPetEventRelayed) {
          relayGlobalPetEvent(ctx, { type: run.status === "failed" ? "failed" : "completed", run }, { finalRun: result });
        }
        if (isStream) {
          emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
          emit({ type: "done" });
          res.end();
        } else sendJson(res, { success: true, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
      } catch (error: any) {
        if (reliabilityOperationKey && reliabilityOperationAcquired) {
          try { failIdempotency("global-agent-request", reliabilityOperationKey, error); } catch {}
        }
        relayGlobalPetEvent(ctx, { type: "failed", error: error?.message || String(error) }, { error: error?.message || String(error) });
        if (isStream) {
          emit({ type: "error", text: error?.message || String(error) });
          emit({ type: "done" });
          res.end();
        } else sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    };
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then(buffer => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        return handleRun(fields || {}, files || []);
      }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    } else {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try { void handleRun(body ? JSON.parse(body) : {}, []); }
        catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
      });
    }
    return true;
  }

  if (pathname === "/api/global-agent/chat" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";

    const handleAgenticChatProxy = async (payload: any, files: any[] = []) => {
      const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
      if (isStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
      }
      const emit = (event: any) => {
        if (!isStream || res.writableEnded) return;
        const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
        res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
      };
      try {
        let message = String(payload.message || "").trim();
        if (files.length) {
          const fileContext = buildUploadedFilesContext(files, "本次消息附件");
          message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
        }
        if (!message) throw new Error("消息不能为空");
        let history: any[] = [];
        try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
        const sessionId = String(payload.session_id || payload.sessionId || "legacy:web");
        if (isGlobalProgressStatusRequest(message)) {
          const reply = formatMissionStatus();
          const result = buildPublicGlobalStatusRun({ message, reply, sessionId, source: "legacy-chat-proxy" });
          try {
            ingestGlobalAgentConversation({
              sessionId,
              source: "legacy-chat-proxy",
              messages: [
                ...history,
                { role: "user", content: message, timestamp: new Date().toISOString() },
                { role: "assistant", content: reply, timestamp: new Date().toISOString(), trace_id: result.trace_id },
              ],
            });
          } catch (error: any) {
            console.warn(`[全局记忆] 状态追问写入失败：${error?.message || error}`);
          }
          if (isStream) {
            emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
            emit({ type: "done" });
            res.end();
          } else {
            sendJson(res, { success: true, reply, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })), agentic: true });
          }
          return;
        }
        const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
          message,
          history,
          sessionId,
          source: "legacy-chat-proxy",
          onEvent: emit,
        });
        const result = publicGlobalAgentRun(run);
        const responseFiles = files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath }));
        if (isStream) {
          emit({ type: "result", run: result, files: responseFiles });
          emit({ type: "done" });
          res.end();
        } else {
          sendJson(res, { success: true, reply: globalRunVisibleReply(run, ""), run: result, files: responseFiles, agentic: true });
        }
      } catch (error: any) {
        if (isStream) {
          emit({ type: "error", text: error?.message || String(error) });
          emit({ type: "done" });
          res.end();
        } else {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      }
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then(buffer => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        return handleAgenticChatProxy(fields || {}, files || []);
      }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    } else {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try { void handleAgenticChatProxy(body ? JSON.parse(body) : {}, []); }
        catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
      });
    }
    return true;

  }
  // 7. 新增智能代码审查接口
  if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { project } = JSON.parse(body || "{}");
        if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
        
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config) return sendJson(res, { error: "项目不存在" }, 404);
        
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir) return sendJson(res, { error: "项目工作区目录未配置" }, 400);
        
        // 执行 Git 命令获取变更状态和 diff
        let status = "";
        let diff = "";
        try {
          status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf-8", cwd: workDir });
          diff = execFileSync("git", ["diff"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          // 如果工作区干净，尝试对比暂存区
          if (!diff.trim()) {
            diff = execFileSync("git", ["diff", "--staged"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          }
        } catch (gitErr: any) {
          return sendJson(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
        }
        
        if (!status.trim()) {
          return sendJson(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
        }
        
        // 限制 diff payload 的最大长度以防超限
        const maxDiffLength = 12000;
        let diffPayload = diff;
        if (diffPayload.length > maxDiffLength) {
          diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
        }
        
        // 调用大模型进行代码审查
        const orchestratorConfig = loadOrchestratorConfig();
        if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
          return sendJson(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
        }
        
        const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
请对以下项目「${project}」的本地 Git 代码变更进行智能审查。

【Git 状态详情】
${status}

【Git Diff 内容】
\`\`\`diff
${diffPayload}
\`\`\`

请用中文产出结构化、专业的审查报告，格式如下：
1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。

请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;

        const messages = [
          { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
          { role: "user", content: reviewPrompt }
        ];
        
        const reviewResult = await callLlm(orchestratorConfig, messages);
        sendJson(res, { success: true, review: reviewResult });
      } catch (err: any) {
        sendJson(res, { error: err.message || "代码审查执行出错" }, 500);
      }
    });
    return true;
  }

  return false;
}

async function callLlm(config: any, messages: any[]): Promise<string> {
  const isAnthropic = config.format === "anthropic-compatible" || (config.model && config.model.toLowerCase().includes("claude"));
  const endpoint = isAnthropic
    ? (config.apiUrl.endsWith("/v1/messages") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/v1/messages`)
    : (config.apiUrl.endsWith("/chat/completions") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/chat/completions`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 60000));

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let bodyObj: any = {};

    if (isAnthropic) {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      const system = messages.find(m => m.role === "system")?.content || "";
      const userMsgs = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      bodyObj = {
        model: config.model,
        max_tokens: 2000,
        temperature: 0.3,
        system,
        messages: userMsgs
      };
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      bodyObj = {
        model: config.model,
        temperature: 0.3,
        messages: messages
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`统一大模型 API 调用失败: HTTP ${response.status} - ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(text);
    if (isAnthropic) {
      return (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("").trim();
    } else {
      return data?.choices?.[0]?.message?.content || "";
    }
  } finally {
    clearTimeout(timeout);
  }
}

