import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import {
  sendJson,
  calculateTokensAndCost,
  GROUPS_FILE,
  GROUP_MESSAGES_DIR,
  GROUP_LOGS_FILE_SHARED,
  UPLOAD_DIR,
  SHARED_DIR,
  CCM_DIR,
  GROUP_LOGS_FILE,
} from "../utils";
import {
  loadCronJobs,
  saveCronJobs,
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  loadFeishuConfig,
  saveFeishuConfig,
  AGENTS
} from "../db";
import {
  buildCodedCoordinatorSummary,
  buildCoordinatorCollaborationInstructions,
  buildMemberCollaborationInstructions,
  buildRecentGroupContext,
  decomposeRequirementWithCodedCoordinator,
  getCoordinatorMember,
  getRoutableMembers,
  loadOrchestratorConfig,
  normalizeGroupOrchestrator,
  publicOrchestratorConfig,
  resolveMemberRuntime,
  runCodedGroupOrchestrator,
  runCoordinatorProtocolSelfTest,
  runGroupOrchestrator,
  runLlmCoordinatorReview,
  runLlmCoordinatorSummary,
  saveOrchestratorConfig,
  selectGroupTargets,
} from "./group-orchestrator";
import { getAgentCommandLabel, getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../agent-runtime";
import { buildRuntimeToolSyncPrompt, recordRuntimeToolSyncAudit, syncRuntimeTools } from "../runtime-tool-sync";
import {
  buildChildAgentWorktreeNotice,
  normalizeChildAgentIsolationMode,
  prepareChildAgentWorkDir,
} from "../agent-worktree";
import {
  attachExecutionWorkspace,
  classifyExecutionFailure,
  cleanupExecutionWorktree,
  clearTaskCancellation,
  createExecutionCheckpoint,
  ensureExecution,
  evaluateGreenContract,
  inspectBranchFreshness,
  isTaskCancellationRequested,
  listExecutions,
  loadExecution,
  mergeExecutionWorktree,
  purgeTaskExecutionArtifacts,
  requestTaskCancellation,
  rollbackExecutionCheckpoint,
  runExecutionKernelSelfTest,
  transitionExecution,
} from "../execution-kernel";
import {
  closeTaskAgentSessions,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
  listTaskAgentSessions,
  openTaskAgentSession,
  purgeTaskAgentSessions,
  recordTaskAgentSessionTurn,
  reopenTaskAgentSessions,
} from "../task-agent-sessions";
import {
  buildCollaborationConflictPlan,
  buildRuntimeRecoveryCandidates,
  buildRuntimeRecoveryPrompt,
  isRuntimeCommandAvailable,
  runCollaborationResilienceSelfTest,
  shouldSwitchRuntime,
} from "../collaboration-resilience";
import {
  acquireIdempotency,
  acquireTaskLease,
  appendTraceEvent,
  completeIdempotency,
  createTraceId,
  ensureTraceId,
  failIdempotency,
  getTrace,
  listTraces,
  releaseTaskLease,
  renewTaskLease,
  runReliabilityLedgerSelfTest,
  settleIdempotencyByTrace,
} from "../reliability-ledger";
import { getReliabilityDrillStatus, runScheduledProductionReliabilityDrill } from "../reliability-drills";
import { getSoakReport, getSoakTestStatus, inspectReliabilityDebt, reconcileStabilityDebt, runSoakTestSelfTest, sampleSoakTestNow, startSoakTest, stopSoakTest } from "../soak-test";
import { getProcessLifecycleSnapshot, registerRestartIntent, runProcessLifecycleSelfTest } from "../process-lifecycle";
import {
  buildTaskReasoningState,
  captureReasoningFacts,
  createAgentReasoningState,
  explainReasoningDecision,
  normalizeAgentReasoningState,
  recordReasoningDeviation,
  recordReasoningRecoveryCheck,
  setReasoningAssertion,
  updateReasoningPlan,
} from "../agent-reasoning-loop";
import { buildProjectExecutionBrief, buildProjectMemoryPacket, updateProjectMemoryFromReceipt } from "../project-memory";
import { createDispatchRecord, normalizeDispatchBatch } from "./dispatch-records";
import {
  buildCollaborationQuestionContract,
  evaluateAdvisoryPermissionBoundary,
  evaluateCollaborationAnswer,
  evaluateCollaborationQuestionAdmission,
  runAgentCollaborationProtocolSelfTest,
  selectCollaborationTarget,
} from "../agent-collaboration-protocol";
import {
  buildAckPreflightReview,
  buildContractTransferPlan,
  evaluateContractInjectionGate,
  extractContractSyncHints,
  getTaskAckRewriteRows,
  getTaskContractInjectionRows,
} from "./collaboration-protocol-gates";

// === 任务队列系统（支持并行执行）===
const taskQueues = new Map<string, string[]>(); // 每个目标（群聊/Agent）独立队列
const runningTasks = new Map<string, boolean>(); // 正在运行的任务目标
const runningTaskIds = new Set<string>(); // 正在运行的任务 ID
const GROUP_MEMORY_DIR = path.join(CCM_DIR, "group-memory");
const TASK_WATCHDOG_INTERVAL_MS = 60 * 1000;
const TASK_WATCHDOG_STALE_MS = 15 * 60 * 1000;
const TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS = 60 * 1000;
const TASK_WATCHDOG_GAP_REWORK_MAX = 3;
const AGENT_RECOVERY_PROBE_INTERVAL_MS = 5 * 60 * 1000;
const AGENT_RECOVERY_PROBE_TIMEOUT_MS = 45 * 1000;
const AGENT_PROBE_SUCCESS_FRESH_MS = 30 * 60 * 1000;
const AGENT_PROBE_FAILURE_BLOCK_MS = 15 * 60 * 1000;
const AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS = 5 * 60 * 1000;
const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
const AGENT_PROBE_TARGET_STATUS_DIR = path.join(AGENT_RUNNER_DIR, "probe-targets");
const AGENT_QA_FILE = path.join(CCM_DIR, "agent-qa.json");
const AGENT_QA_TIMEOUT_MS = 5 * 60 * 1000;
let taskWatchdogTimer: NodeJS.Timeout | null = null;
let agentRecoveryMonitorTimer: NodeJS.Timeout | null = null;
let agentRecoveryProbeInFlight = false;

function runCronDailyDevProtocolSelfTestSafe() {
  try {
    const cronModule = require("./cron");
    if (typeof cronModule.runCronDailyDevProtocolSelfTest === "function") {
      return cronModule.runCronDailyDevProtocolSelfTest();
    }
    return {
      pass: false,
      error: "cron 模块未导出 runCronDailyDevProtocolSelfTest",
    };
  } catch (error: any) {
    return {
      pass: false,
      error: error?.message || String(error || "cron 协议自测加载失败"),
    };
  }
}

// 优先级权重
const PRIORITY_WEIGHT: Record<string, number> = { high: 3, normal: 2, low: 1 };

function isTaskPaused(task: any) {
  return !!(task?.is_paused || task?.paused);
}

function isRecoverableAutoTask(task: any) {
  if (!task?.auto_execute || isTaskPaused(task)) return false;
  if (task.status === "pending") return true;
  if (task.status === "in_progress" && !task.completed_at) return true;
  return false;
}

function getTaskFailureText(task: any) {
  return [
    task?.status_detail,
    task?.result,
    task?.final_report,
    task?.delivery_summary?.detail,
    task?.delivery_summary?.headline,
    ...(Array.isArray(task?.delivery_summary?.blockers) ? task.delivery_summary.blockers : []),
  ].filter(Boolean).join("\n");
}

function getChildAgentIsolationMode(group: any = null, task: any = null) {
  const explicit = task?.child_agent_isolation
    || task?.childAgentIsolation
    || group?.orchestrator?.child_agent_isolation
    || group?.orchestrator?.childAgentIsolation
    || group?.child_agent_isolation
    || group?.childAgentIsolation
    || process.env.CCM_CHILD_AGENT_ISOLATION
    || "";
  return normalizeChildAgentIsolationMode(explicit);
}

function isRecoverableRuntimeFailure(task: any) {
  if (!task?.auto_execute || isTaskPaused(task) || task.status !== "failed") return false;
  const text = getTaskFailureText(task);
  return /Agent Runner|外部 Agent Runner|spawn\s+EPERM|spawnSync .* EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED|Agent 响应超时|响应超时|转发失败:\s*spawn EPERM/i.test(text);
}

function isAgentExecutionBlockedPendingTask(task: any) {
  if (!task?.auto_execute || isTaskPaused(task) || task.status !== "pending") return false;
  if (runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  const readiness = task.execution_readiness || {};
  const text = [
    task.status_detail,
    readiness.message,
    task.result,
  ].filter(Boolean).join("\n");
  return !!task.last_queue_blocked_at
    || readiness.ready === false
    || /Agent CLI|执行通道|Agent Runner|外部 Agent Runner|spawn\s+EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text);
}

// === 群聊管理 ===
export function loadGroups() {
  if (!fs.existsSync(GROUPS_FILE)) return [];
  try {
    const groups = JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
    if (!Array.isArray(groups)) return [];
    const before = JSON.stringify(groups);
    const normalized = groups.map(normalizeGroupOrchestrator);
    if (JSON.stringify(normalized) !== before) {
      saveGroups(normalized);
    }
    return normalized;
  } catch {
    try {
      const recovered = JSON.parse(fs.readFileSync(`${GROUPS_FILE}.bak`, "utf-8"));
      if (Array.isArray(recovered)) return recovered.map(normalizeGroupOrchestrator);
    } catch {}
    return [];
  }
}

function saveGroups(groups: any[]) {
  const content = JSON.stringify(groups, null, 2);
  if (fs.existsSync(GROUPS_FILE)) {
    try { if (fs.readFileSync(GROUPS_FILE, "utf-8") === content) return; } catch {}
  }
  const temp = `${GROUPS_FILE}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(GROUPS_FILE)) {
    try { fs.copyFileSync(GROUPS_FILE, `${GROUPS_FILE}.bak`); } catch {}
  }
  fs.writeFileSync(temp, content, "utf-8");
  fs.renameSync(temp, GROUPS_FILE);
}

const groupMessagesCache = new Map<string, { mtimeMs: number; size: number; messages: any[] }>();

function getGroupMessages(groupId: string) {
  const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  if (!fs.existsSync(file)) {
    groupMessagesCache.delete(groupId);
    return [];
  }
  try {
    const stat = fs.statSync(file);
    const cached = groupMessagesCache.get(groupId);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.messages;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const messages = Array.isArray(parsed) ? parsed : [];
    groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
    return messages;
  } catch {
    try {
      const backup = `${file}.bak`;
      const parsed = JSON.parse(fs.readFileSync(backup, "utf-8"));
      const messages = Array.isArray(parsed) ? parsed : [];
      const stat = fs.statSync(file);
      groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
      return messages;
    } catch {
      groupMessagesCache.delete(groupId);
      return [];
    }
  }
}

function appendGroupMessage(groupId: string, msg: any) {
  const messages = getGroupMessages(groupId);
  const messageId = String(msg?.id || "").trim();
  const existing = messageId ? messages.find((item: any) => String(item?.id || "") === messageId) : null;
  if (existing) return existing;
  const taskTraceId = msg?.task_id ? loadTasks().find((task: any) => task.id === msg.task_id)?.trace_id : "";
  const traceId = ensureTraceId(msg?.trace_id || msg?.traceId || taskTraceId, "message");
  const next = { ...msg, trace_id: traceId };
  messages.push(next);
  saveGroupMessages(groupId, messages);
  appendTraceEvent(traceId, { id: `group-message:${groupId}:${messageId || messages.length}`, type: "group.message_persisted", status: "ok", group_id: groupId, task_id: msg?.task_id || "", agent: msg?.agent || msg?.role || "", message: String(msg?.content || "").slice(0, 500), data: { message_id: messageId } });
  return next;
}

function saveGroupMessages(groupId: string, messages: any[]) {
  if (!fs.existsSync(GROUP_MESSAGES_DIR)) {
    fs.mkdirSync(GROUP_MESSAGES_DIR, { recursive: true });
  }
  const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(messages, null, 2), "utf-8");
  fs.renameSync(temp, file);
  const stat = fs.statSync(file);
  groupMessagesCache.set(groupId, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
}

export function deriveTaskLifecycle(task: any, executions: any[] = []) {
  const summary = task?.delivery_summary || {};
  const status = String(task?.status || "pending");
  if (status === "done" && summary.acceptance_gate_passed === true) return { state: "completed", terminal: true, keepsSession: false };
  if (status === "cancelled") return { state: "cancelled", terminal: true, keepsSession: false };
  if (status === "failed") return { state: "failed", terminal: false, keepsSession: true };
  if (status === "paused") return { state: "paused", terminal: false, keepsSession: true };
  if (task?.sandbox_rehearsal?.status === "needs_user" || task?.workflow_meta?.sandbox_rehearsal?.status === "needs_user") return { state: "waiting_confirmation", terminal: false, keepsSession: true };
  if (Number(summary.agent_qa_open_count || 0) > 0 || /等待.*依赖|前置依赖/.test(String(task?.status_detail || ""))) return { state: "waiting_dependency", terminal: false, keepsSession: true };
  if (Number(summary.rework_count || 0) > 0) return { state: "rework", terminal: false, keepsSession: true };
  if (executions.some(item => item.state === "reviewing") || summary.acceptance_gate_passed === false && summary.acceptance_gate) return { state: "acceptance", terminal: false, keepsSession: true };
  if (executions.some(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state)) || status === "in_progress") return { state: "executing", terminal: false, keepsSession: true };
  if (["pending", "queued"].includes(status)) return { state: "queued", terminal: false, keepsSession: true };
  return { state: "intake", terminal: false, keepsSession: true };
}

function buildTaskPreflightReasoning(task: any, reason = "任务执行前复核", recovery = false) {
  const state = task?.reasoning_loop
    ? normalizeAgentReasoningState(task.reasoning_loop, task?.business_goal || task?.title || "")
    : createAgentReasoningState({
        goal: task?.business_goal || task?.title || task?.description || "",
        assertions: [
          { id: "goal", label: "业务目标得到满足", kind: "goal" },
          { id: "files", label: "真实文件变更符合任务范围", kind: "delivery" },
          { id: "verification", label: "独立 Runner 验证通过", kind: "verification" },
          { id: "acceptance", label: "主 Agent 最终验收通过", kind: "acceptance" },
        ],
      });
  const planSource = task?.delivery_summary?.latest_coordination_plan || task?.workflow_meta?.coordination_plan || task?.coordination_plan || {};
  const plan = Array.isArray(planSource?.phases) ? planSource.phases
    : Array.isArray(planSource?.plan) ? planSource.plan
      : Array.isArray(task?.workflow_meta?.phases) ? task.workflow_meta.phases : [];
  updateReasoningPlan(state, plan.map((item: any) => item?.title || item?.description || item), reason);
  const executions = task?.id ? listExecutions({ taskId: task.id }) : [];
  const sessions = task?.id ? listTaskAgentSessions({ taskId: task.id }) : [];
  const currentFacts = {
    task_id: task?.id,
    status: task?.status,
    status_detail: task?.status_detail,
    business_goal: task?.business_goal || task?.title,
    acceptance_criteria: task?.acceptance_criteria || "",
    target_project: task?.target_project || "",
    group_id: task?.group_id || "",
    executions: executions.map(item => ({ project: item.project, state: item.state, green: item.green?.level || "none" })),
    sessions: sessions.map(item => ({ project: item.project, executor: item.agentType, status: item.status, resume_mode: item.resumeMode, turns: item.turnCount })),
  };
  captureReasoningFacts(state, recovery ? "recovery_preflight" : "execution_preflight", currentFacts);
  explainReasoningDecision(state, recovery ? "resume_after_revalidation" : "start_execution", reason);
  setReasoningAssertion(state, { id: "goal_revalidated", label: "执行前已重新核对原始目标", kind: "preflight", status: state.original_goal ? "passed" : "blocked", evidence: [state.original_goal], reason });
  setReasoningAssertion(state, { id: "acceptance_revalidated", label: "执行前已重新核对验收条件", kind: "preflight", status: task?.acceptance_criteria ? "passed" : "blocked", evidence: [task?.acceptance_criteria || ""], reason });
  if (recovery) {
    const gaps = task?.delivery_summary?.acceptance_gate?.failed_checks?.map((item: any) => item.label || item.id) || task?.delivery_summary?.needs || [];
    recordReasoningRecoveryCheck(state, {
      reason,
      goalRevalidated: !!state.original_goal,
      stateRevalidated: true,
      acceptanceRevalidated: !!task?.acceptance_criteria,
      remainingGaps: gaps,
    });
    if (!task?.acceptance_criteria) recordReasoningDeviation(state, "recovery_acceptance_missing", "恢复任务时没有可核对的验收条件，禁止直接宣告完成", "error");
  }
  return state;
}

function taskCardPhase(task: any, executions: any[]) {
  const explicit = String(task?.collaboration_state?.phase || "");
  if (task?.rolled_back_at) return "reverted";
  if (task?.intake_state === "awaiting_confirmation") return "needs_user";
  if (explicit) return explicit;
  if (task?.status === "done") return "completed";
  if (task?.status === "cancelled") return "cancelled";
  if (task?.collaboration_state?.needs_user) return "needs_user";
  if (executions.some(item => item.state === "reviewing")) return "reviewing";
  if (executions.some(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state)) || task?.status === "in_progress") return "executing";
  if (task?.status === "failed") return "blocked";
  return isTaskQueuedInMemory(task?.id) ? "queued" : "planning";
}

function taskCardGapLabel(item: any) {
  const value = String(item || "");
  if (value === "coordination_plan") return "主 Agent 尚未形成可验收计划";
  if (value === "assignment_evidence") return "目标 Agent 尚未接到明确工作单";
  if (value === "worker_notification") return "尚未收到项目 Agent 的执行结果";
  if (value === "agent_qa_evidence") return "Agent 间仍有问题需要确认";
  if (value.startsWith("verification_required:")) return `${value.split(":")[1] || "项目"} 尚未完成要求的验证`;
  if (value.startsWith("verification_failed:")) return `验证失败：${value.slice("verification_failed:".length)}`;
  if (value.startsWith("verification_unexecuted:")) return `验证尚未实际执行：${value.slice("verification_unexecuted:".length)}`;
  if (value.startsWith("blocker:")) return value.slice("blocker:".length);
  if (value.startsWith("need:")) return value.slice("need:".length);
  if (value.startsWith("receipt:")) return `${value.split(":")[1] || "项目 Agent"} 尚未提交可验收结果`;
  if (value.startsWith("ack_rewrite:")) return `${value.split(":")[1] || "项目 Agent"} 需要先重写接单 ACK`;
  if (value.startsWith("contract_inject:")) return `${value.split(":")[1] || "依赖 Agent"} 尚未收到 contractChanges 注入续跑`;
  if (value.startsWith("notification:")) return `${value.split(":")[1] || "项目 Agent"} 的本轮工作尚未完成`;
  return value;
}

function userAgentRole(project: string) {
  const name = String(project || "");
  if (/web|front|frontend|app|mobile|ui|页面|前端/i.test(name)) return "前端";
  if (/api|server|backend|cloud|service|后端|服务/i.test(name)) return "后端";
  if (/test|qa|验收|测试/i.test(name)) return "测试";
  return "项目";
}

function userAgentProgress(worker: any) {
  const status = String(worker?.status || "pending");
  const role = userAgentRole(worker?.agent || "");
  if (["done", "completed"].includes(status)) return `${role}工作已完成`;
  if (["failed", "blocked"].includes(status)) return `${role}遇到问题，正在自动恢复`;
  if (["running", "in_progress", "partial"].includes(status)) return `${role}正在修改和检查`;
  return `${role}正在等待开始`;
}

function buildUserTaskActions(task: any, phase: string, executions: any[]) {
  const actions: any[] = [];
  const terminal = ["done", "cancelled"].includes(String(task?.status || ""));
  if (task?.intake_state === "awaiting_confirmation") {
    actions.push({ id: "confirm_plan", label: "确认执行", kind: "confirm_plan", tone: "primary" });
    actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
    return actions;
  }
  if (task?.delivery_summary || task?.file_changes) actions.push({ id: "changes", label: "查看改动", kind: "view_changes", tone: "outline" });
  if (task?.status === "done") actions.push({ id: "continue", label: "继续修改", kind: "continue", tone: "primary" });
  else if (!terminal) actions.push({ id: "supplement", label: "追加要求", kind: "continue", tone: "primary" });
  if (["failed", "blocked"].includes(String(task?.status || "")) || phase === "blocked") actions.push({ id: "retry", label: "重新执行", kind: "retry", tone: "warning" });
  const checkpointIds = executions.flatMap((item: any) => Array.isArray(item.checkpointIds) ? item.checkpointIds : []).filter(Boolean);
  if (task?.status === "done" && checkpointIds.length) actions.push({ id: "rollback", label: "安全撤销", kind: "rollback", tone: "danger", checkpoint_ids: checkpointIds });
  if (!terminal) actions.push({ id: "cancel", label: "停止", kind: "cancel", tone: "danger" });
  return actions;
}

function stableTaskEntityId(prefix: string, value: any) {
  return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 20)}`;
}

function buildTaskEntityChain(taskId: string) {
  const task = loadTasks().find((item: any) => item.id === taskId);
  if (!task) return null;
  const messages = task.group_id
    ? getGroupMessages(task.group_id).filter((message: any) => String(message?.task_id || message?.task?.id || "") === taskId)
    : [];
  const messageEntities = messages.map((message: any, index: number) => ({
    id: String(message.id || stableTaskEntityId("message", { taskId, index, timestamp: message.timestamp, content: message.content })),
    task_id: taskId,
    group_id: task.group_id || "",
    role: message.role || "",
    agent: message.agent || message.target || "",
    type: message.type || "message",
    timestamp: message.timestamp || "",
    summary: compactMemoryText(message.content, 240),
  }));
  const summary = task.delivery_summary || {};
  const rawAssignments = [
    ...(Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []),
    ...messages.flatMap((message: any) => Array.isArray(message.assignments) ? message.assignments : []),
  ];
  const assignments = normalizeDispatchBatch(rawAssignments, { scopeId: task.group_id || taskId, taskId, sourceProject: "coordinator" });
  const receiptRows = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ...(task.receipt ? [task.receipt] : []),
  ];
  const receiptEntities = receiptRows.map((receipt: any) => ({
    id: stableTaskEntityId("receipt", { taskId, agent: receipt.agent || receipt.project, status: receipt.status, summary: receipt.summary, files: receipt.filesChanged || receipt.files_changed || [] }),
    task_id: taskId,
    agent: receipt.agent || receipt.project || task.target_project || "",
    status: receipt.status || "unknown",
    summary: compactMemoryText(receipt.summary || receipt.message, 500),
    files_changed: receipt.filesChanged || receipt.files_changed || receipt.files || [],
    verification: receipt.verification || receipt.tests || [],
    blockers: receipt.blockers || [],
    needs: receipt.needs || [],
  }));
  const dispatchEntities = assignments.map((assignment: any) => {
    const receipt = receiptRows.find((item: any) => String(item.agent || item.project || "").toLowerCase() === String(assignment.project || "").toLowerCase()) || null;
    return createDispatchRecord({
      assignment,
      status: assignment.status === "done" ? "completed" : assignment.status || "pending",
      statusText: assignment.statusText,
      receipt,
      summary: receipt?.summary || assignment.reason || "",
      blockers: receipt?.blockers || [],
      needs: receipt?.needs || [],
    });
  });
  const executionEntities = listExecutions({ taskId }).map((execution: any) => ({
    id: execution.id,
    task_id: execution.taskId,
    project: execution.project,
    state: execution.state,
    runtime: execution.runtime || execution.packet?.agentType || "",
    workspace: execution.workspace,
    process_ids: execution.processIds || [],
    green: execution.green,
    failure: execution.failure || null,
    updated_at: execution.updatedAt || "",
  }));
  const sessionEntities = listTaskAgentSessions({ taskId }).map((session: any) => ({
    id: session.id,
    task_id: session.taskId,
    group_id: session.groupId || "",
    project: session.project,
    executor: session.agentType,
    native_session_id: session.nativeSessionId || "",
    resume_mode: session.resumeMode,
    turn_count: session.turnCount,
    status: session.status,
    continuity: getTaskAgentSessionContinuity(session),
  }));
  const trace = task.trace_id ? getTrace(task.trace_id) : null;
  const acceptance = summary.acceptance_gate || null;
  const acceptancePassed = summary.acceptance_gate_passed === true
    || acceptance?.pass === true
    || (Number.isFinite(Number(acceptance?.failed_count)) && Number(acceptance.failed_count) === 0 && Number(acceptance?.total || acceptance?.checks?.length || 0) > 0);
  const acceptanceEntity = acceptance ? {
    id: stableTaskEntityId("acceptance", { taskId, pass: summary.acceptance_gate_passed, checks: acceptance.checks || acceptance.items || acceptance }),
    task_id: taskId,
    pass: acceptancePassed,
    gate: acceptance,
    reviewed_at: summary.generated_at || task.updated_at || "",
  } : null;
  const reportContent = task.final_report || summary.user_report || task.result || "";
  const reportEntity = reportContent ? {
    id: stableTaskEntityId("report", { taskId, reportContent }),
    task_id: taskId,
    status: task.status,
    content: reportContent,
    generated_at: summary.generated_at || task.completed_at || task.updated_at || "",
  } : null;
  const checks = {
    task_has_trace: !!task.trace_id,
    messages_reference_task: messageEntities.every((message: any) => message.task_id === taskId),
    dispatches_reference_task: dispatchEntities.every((dispatch: any) => dispatch.identity.taskId === taskId),
    executions_reference_task: executionEntities.every((execution: any) => execution.task_id === taskId),
    sessions_reference_task: sessionEntities.every((session: any) => session.task_id === taskId),
    completed_task_has_acceptance: task.status !== "done" || acceptanceEntity?.pass === true,
    completed_task_has_report: task.status !== "done" || !!reportEntity,
  };
  return {
    version: 1,
    task: { id: task.id, trace_id: task.trace_id || "", group_id: task.group_id || "", title: task.title, status: task.status, workflow_type: task.workflow_type || "general", collaboration_state: task.collaboration_state || null, created_at: task.created_at, updated_at: task.updated_at },
    messages: messageEntities,
    dispatches: dispatchEntities,
    executions: executionEntities,
    sessions: sessionEntities,
    trace: trace ? { trace_id: trace.trace_id, created_at: trace.created_at, events: (trace.events || []).slice(-200) } : null,
    receipts: receiptEntities,
    acceptance: acceptanceEntity,
    report: reportEntity,
    links: {
      message_ids: messageEntities.map((item: any) => item.id),
      dispatch_ids: dispatchEntities.map((item: any) => item.identity.assignmentId),
      execution_ids: executionEntities.map((item: any) => item.id),
      session_ids: sessionEntities.map((item: any) => item.id),
      receipt_ids: receiptEntities.map((item: any) => item.id),
      acceptance_id: acceptanceEntity?.id || "",
      report_id: reportEntity?.id || "",
    },
    consistency: { pass: Object.values(checks).every(Boolean), checks },
    generated_at: new Date().toISOString(),
  };
}

function buildTaskCardView(task: any, executions: any[], sessions: any[]) {
  const summary = task?.delivery_summary || {};
  const planMode = task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
  const phase = taskCardPhase(task, executions);
  const visible = shouldShowUserTaskCard(task, summary, executions);
  const phaseLabels: any = {
    planning: "正在分析",
    queued: "准备开始",
    dispatching: "正在安排工作",
    executing: "正在修改",
    reworking: "正在修复问题",
    reviewing: "正在运行测试",
    needs_user: "需要你确认",
    blocked: "正在恢复",
    completed: "已完成",
    cancelled: "已取消",
    reverted: "已安全撤销",
  };
  const progressByPhase: any = { planning: 10, queued: 20, dispatching: 30, executing: 55, reworking: 65, reviewing: 85, needs_user: 70, blocked: 60, completed: 100, cancelled: 0, reverted: 100 };
  const terminalPhase = phase === "completed" || phase === "cancelled" || phase === "reverted";
  const gapItems = terminalPhase ? [] : getTaskGapItems(task);
  const dashboardWorkers = getDashboardWorkerRows(task);
  const laneNames = uniqueStrings([
    ...executions.map((item: any) => item.project),
    ...sessions.map((item: any) => item.project),
  ].filter(Boolean));
  const workers = [...dashboardWorkers];
  for (const name of laneNames) {
    if (workers.some((item: any) => item.agent === name)) continue;
    const execution = [...executions].reverse().find((item: any) => item.project === name);
    const session = [...sessions].reverse().find((item: any) => item.project === name);
    workers.push({ agent: name, task: "", status: execution?.state === "succeeded" ? "done" : execution?.state === "failed" ? "failed" : session?.status === "open" ? "running" : "pending", summary: "", files_changed: [], verification: [], blockers: [] });
  }
  const activeAgents = terminalPhase ? [] : uniqueStrings([
    ...executions.filter(item => ["spawning", "ready", "prompt_accepted", "running", "reviewing"].includes(item.state)).map(item => item.project),
    ...workers.filter((item: any) => ["running", "in_progress", "pending", "partial", "blocked"].includes(String(item.status || ""))).map((item: any) => item.agent),
  ].filter(Boolean));
  const files = uniqueStrings([
    ...(Array.isArray(summary.files_changed) ? summary.files_changed : []),
    ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item: any) => item?.path || item) : []),
  ].filter(Boolean));
  const verification = uniqueStrings(Array.isArray(summary.verification_executed) ? summary.verification_executed : []);
  const workflowTimeline = buildUserWorkflowTimeline(task, summary, phase);
  const agentQuestions = buildUserAgentQuestionRows(summary);
  const conflictWarnings = buildUserConflictWarnings(summary);
  const workOrderPreview = buildUserWorkOrderPreview(task, summary, planMode);
  const executionStory = buildUserExecutionStory(task, summary, executions, phase, workOrderPreview);
  const acceptanceReview = buildUserAcceptanceReview(task, summary, executions, phase);
  const agentCoordination = buildUserAgentCoordinationProtocol(task, summary, executions, workOrderPreview, acceptanceReview);
  const liveTodoPlan = buildLiveMainAgentTodoPlan(task, phase, workers, executions, summary);
  const liveMainAgentDecision = buildLiveMainAgentDecisionForTask(task, phase, liveTodoPlan, summary);
  const completed: string[] = [];
  const completedWorkers = workers.filter((item: any) => item.status === "done");
  if (completedWorkers.length) completed.push(`${completedWorkers.length} 个项目已完成修改`);
  if (files.length) completed.push(`修改了 ${files.length} 个文件`);
  if (verification.length) completed.push(`${verification.length} 项检查已执行`);
  const blockers = uniqueStrings([
    ...(task?.intake_state === "awaiting_confirmation" && planMode?.risk?.summary ? [planMode.risk.summary] : []),
    ...gapItems.map(taskCardGapLabel).filter(Boolean),
  ]).slice(0, 6);
  let nextAction = "正在理解你的需求";
  if (phase === "queued") nextAction = "即将开始修改";
  else if (phase === "executing") nextAction = "完成修改后会自动运行检查";
  else if (phase === "reworking") nextAction = "修复后会重新运行检查";
  else if (phase === "reviewing") nextAction = "检查通过后自动交付";
  else if (phase === "needs_user") nextAction = task?.intake_state === "awaiting_confirmation" ? "请确认执行前计划，确认后才会派发子 Agent" : "请补充卡片中列出的信息";
  else if (phase === "blocked") nextAction = "系统正在重试或切换执行器";
  else if (phase === "completed") nextAction = "可以查看改动、继续修改或安全撤销";
  else if (phase === "cancelled") nextAction = "任务已停止，不会继续执行";
  else if (phase === "reverted") nextAction = "最近一轮改动已恢复到任务开始前";
  return {
    version: 1,
    visible,
    task_id: task?.id || "",
    title: task?.title || "开发任务",
    goal: task?.business_goal || task?.goal || task?.title || "",
    phase,
    phase_label: phaseLabels[phase] || phase,
    status: task?.status || "pending",
    progress: progressByPhase[phase] ?? 0,
    active_agents: activeAgents.map((name: string) => `${userAgentRole(name)} · ${name} 正在处理`),
    agents: workers.map((item: any) => ({ name: `${userAgentRole(item.agent)} · ${item.agent}`, status: item.status, summary: userAgentProgress(item), blockers: item.blockers.slice(0, 3) })),
    live_todo_plan: liveTodoPlan,
    mainAgentDecision: liveMainAgentDecision,
    main_agent_decision: liveMainAgentDecision,
    workflow_timeline: workflowTimeline,
    agent_questions: agentQuestions,
    conflict_warnings: conflictWarnings,
    work_order_preview: workOrderPreview,
    execution_story: executionStory,
    acceptance_review: acceptanceReview,
    agent_coordination: agentCoordination,
    agentCoordination,
    plan_mode: planMode ? {
      title: planMode.title || "执行前计划",
      mode: planMode.mode || "",
      requires_confirmation: planMode.requires_confirmation === true,
      auto_continue: planMode.auto_continue === true,
      next_step: planMode.next_step || "",
      risk: planMode.risk ? { level: planMode.risk.level || "low", summary: planMode.risk.summary || "", reasons: Array.isArray(planMode.risk.reasons) ? planMode.risk.reasons.slice(0, 6) : [] } : null,
      impact_scope: planMode.impact_scope ? { areas: Array.isArray(planMode.impact_scope.areas) ? planMode.impact_scope.areas.slice(0, 6) : [], projects: Array.isArray(planMode.impact_scope.projects) ? planMode.impact_scope.projects.slice(0, 8) : [], multi_agent: planMode.impact_scope.multi_agent === true } : null,
      read_only_exploration: planMode.read_only_exploration ? { summary: compactMemoryText(planMode.read_only_exploration.summary || "", 520), projects: Array.isArray(planMode.read_only_exploration.projects) ? planMode.read_only_exploration.projects.slice(0, 8) : [], knowledge_used: planMode.read_only_exploration.knowledge_used === true, code_snapshot_used: planMode.read_only_exploration.code_snapshot_used === true } : null,
      acceptance: Array.isArray(planMode.acceptance) ? planMode.acceptance.slice(0, 6) : [],
      permission_boundaries: Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries.slice(0, 6) : [],
      session_strategy: planMode.session_strategy || null,
    } : null,
    completed: completed.slice(0, 6),
    blockers,
    next_action: nextAction,
    delivery: { headline: summary.headline || task?.status_detail || "", files: files.slice(0, 30), changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 30) : [], verification: verification.slice(0, 20), risks: uniqueStrings([...(summary.risks || []), ...(summary.remaining_items || []), ...(summary.advisory_needs || [])]).slice(0, 10), acceptance_passed: summary.acceptance_gate_passed === true },
    actions: buildUserTaskActions(task, phase, executions),
    technical: { trace_id: task?.trace_id || "", execution_ids: executions.map(item => item.id), session_ids: sessions.map(item => item.id), gap_fingerprint: terminalPhase ? "" : getTaskGapFingerprint(task), entity_chain_endpoint: `/api/tasks/entity-chain?id=${encodeURIComponent(task?.id || "")}`, mainAgentDecision: liveMainAgentDecision, main_agent_decision: liveMainAgentDecision },
    updated_at: task?.updated_at || new Date().toISOString(),
  };
}

function shouldShowUserTaskCard(task: any, summary: any = {}, executions: any[] = []) {
  const explicit = task?.workflow_meta?.intake?.task_intent || task?.workflowMeta?.intake?.task_intent;
  if (explicit?.executable === false) return false;
  if (explicit?.executable === true) return true;
  const hasWorkEvidence = Number(summary.assignment_count || 0) > 0
    || Number(summary.actual_file_change_count || 0) > 0
    || Number(summary.worker_notification_count || 0) > 0
    || Number(summary.receipt_count || 0) > 0
    || (Array.isArray(summary.receipts) && summary.receipts.length > 0)
    || (Array.isArray(summary.receipt_statuses) && summary.receipt_statuses.length > 0)
    || (Array.isArray(executions) && executions.length > 0 && executions.some((item: any) => ["running", "reviewing", "succeeded", "failed"].includes(String(item.state || ""))));
  if (hasWorkEvidence) return true;
  const intent = classifyGroupProjectTaskIntent(String(task?.business_goal || task?.title || ""));
  return intent.executable;
}

function timelineStatusForUser(item: any) {
  const status = String(item?.status || "").toLowerCase();
  if (["ok", "done", "success", "succeeded", "completed"].includes(status)) return "done";
  if (["fail", "failed", "error"].includes(status)) return "failed";
  if (["warn", "warning", "blocked"].includes(status)) return "warning";
  if (["active", "running", "in_progress"].includes(status)) return "active";
  return "pending";
}

function timelineLabelForUser(item: any) {
  const type = String(item?.type || "");
  const agent = item?.agent ? `${item.agent}：` : "";
  const title = String(item?.title || "").trim();
  if (type === "queued_group_task") return "主 Agent 已接收任务";
  if (type === "coordinator_plan") return "主 Agent 已制定协作计划";
  if (type === "reasoning_plan" || type === "reasoning_preflight") return "主 Agent 已复核目标";
  if (type === "sandbox_rehearsal") return "已完成任务前预演";
  if (type === "conflict_plan") return "已预判潜在修改冲突";
  if (type === "dispatch") return "已派发给子 Agent";
  if (type === "child_agent_start") return `${agent}开始处理`;
  if (type === "child_agent_rework") return `${agent}开始返工`;
  if (type === "child_agent_receipt") return `${agent}提交结果`;
  if (type === "agent_qa_question") return `${agent}向其他 Agent 确认问题`;
  if (type === "agent_qa_waiting") return `${agent}等待依赖回答`;
  if (type === "agent_qa_accepted") return "主 Agent 已采纳 Agent 回答";
  if (type === "agent_qa_resume") return `${agent}拿到回答并继续执行`;
  if (type === "coordinator_review") return "主 Agent 正在验收";
  if (type === "acceptance_gate") return "已检查交付质量";
  if (type === "task_rollback") return "已安全撤销改动";
  return title || "协作状态更新";
}

function buildUserWorkflowTimeline(task: any, summary: any, phase: string) {
  const timeline = Array.isArray(summary?.timeline) && summary.timeline.length
    ? summary.timeline
    : (Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []);
  const visible = timeline
    .filter((item: any) => !/CCM_AGENT_RECEIPT|scratchpad|Trace|session|原始提示词/i.test(`${item?.title || ""}\n${item?.detail || ""}`))
    .map((item: any) => ({
      id: item.id || `${item.at || ""}:${item.type || ""}:${item.title || ""}`,
      at: item.at || "",
      label: timelineLabelForUser(item),
      detail: compactMemoryText(item.detail || "", 140),
      agent: item.agent || "",
      status: timelineStatusForUser(item),
      phase: item.phase || "",
    }))
    .filter((item: any) => item.label)
    .slice(-8);
  if (visible.length) return visible;
  const fallback: any[] = [
    { id: "understand", label: "主 Agent 正在理解需求", status: ["planning", "queued", "dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : "active" },
    { id: "dispatch", label: "安排合适的项目 Agent", status: ["dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : phase === "planning" ? "pending" : "active" },
    { id: "execute", label: "子 Agent 修改并验证", status: ["reviewing", "completed"].includes(phase) ? "done" : phase === "executing" ? "active" : "pending" },
    { id: "review", label: "主 Agent 验收交付", status: phase === "completed" ? "done" : phase === "reviewing" ? "active" : "pending" },
  ];
  return fallback;
}

function buildUserAgentQuestionRows(summary: any) {
  const items = Array.isArray(summary?.agent_qa) ? summary.agent_qa : [];
  return items.slice(-6).map((item: any) => {
    const accepted = item.acceptance?.accepted === true || item.status === "resumed" || item.resumed_at;
    const waiting = ["waiting", "asking", "queued", "timeout", "manual"].includes(String(item.status || ""));
    return {
      id: item.id || `${item.from_agent || ""}:${item.to_agent || ""}:${item.question || ""}`,
      from: item.from_agent || "子 Agent",
      to: item.to_agent || "目标 Agent",
      question: compactMemoryText(item.question || "", 160),
      answer: compactMemoryText(item.answer || "", 160),
      status: accepted ? "accepted" : waiting ? "waiting" : item.status || "answered",
      label: accepted ? "已采纳并继续" : waiting ? "等待回答" : item.answer ? "已回答" : "已记录",
    };
  });
}

function buildUserConflictWarnings(summary: any) {
  const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
  const plans = timeline.filter((item: any) => item.type === "conflict_plan" && item.data);
  return plans.flatMap((item: any) => {
    const conflicts = Array.isArray(item.data?.conflicts) ? item.data.conflicts : [];
    if (!conflicts.length && item.detail) return [{ id: item.id || "conflict", title: "已启用冲突保护", detail: compactMemoryText(item.detail, 160), agents: [] }];
    return conflicts.map((conflict: any, index: number) => ({
      id: `${item.id || "conflict"}:${index}`,
      title: `${(conflict.projects || []).join(" 与 ") || "多个 Agent"} 可能修改同一范围`,
      detail: compactMemoryText(conflict.reason || "系统已改为更安全的执行顺序", 160),
      agents: conflict.projects || [],
      scopes: conflict.scopes || [],
    }));
  }).slice(-4);
}

function splitUserAcceptanceText(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => compactMemoryText(item, 160)).filter(Boolean);
  return String(value || "")
    .split(/(?:\n|；|;|。|\d+[、.]\s*)+/)
    .map(item => compactMemoryText(item, 160))
    .filter(Boolean)
    .slice(0, 8);
}

function getTaskPlanMode(task: any) {
  return task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
}

function buildUserWorkOrderPreview(task: any, summary: any = {}, planMode: any = null) {
  const plan = planMode || getTaskPlanMode(task);
  const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const sandboxPlan = Array.isArray(task?.sandbox_rehearsal?.agent_plan)
    ? task.sandbox_rehearsal.agent_plan
    : Array.isArray(task?.workflow_meta?.sandbox_rehearsal?.agent_plan)
      ? task.workflow_meta.sandbox_rehearsal.agent_plan
      : [];
  const planProjects = Array.isArray(plan?.impact_scope?.projects) ? plan.impact_scope.projects : [];
  const fallbackProjects = uniqueStrings([
    ...planProjects,
    task?.target_project,
  ].filter(Boolean)).slice(0, 6);
  const sourceRows = assignmentEvidence.length
    ? assignmentEvidence
    : sandboxPlan.length
      ? sandboxPlan
      : fallbackProjects.map((project: string) => ({ project, task: task?.title || task?.business_goal || "等待主 Agent 细化工作单", reason: "来自执行前计划影响范围" }));
  const acceptance = splitUserAcceptanceText(plan?.acceptance || task?.acceptance_criteria || task?.acceptanceCriteria);
  const areas = Array.isArray(plan?.impact_scope?.areas) ? plan.impact_scope.areas : [];
  const fileHints = Array.isArray(plan?.impact_scope?.file_hints) ? plan.impact_scope.file_hints : [];
  const boundaries = Array.isArray(plan?.permission_boundaries) ? plan.permission_boundaries : [];
  const orders = sourceRows.map((item: any, index: number) => {
    const project = String(item.project || item.agent || item.target_project || item.targetName || `Agent ${index + 1}`).trim();
    const objective = compactMemoryText(item.task || item.summary || item.description || task?.business_goal || task?.title || "等待主 Agent 细化工作单", 220);
    const projectRole = userAgentRole(project);
    return {
      id: item.assignment_id || item.id || `work_order_${index + 1}_${stableTaskEntityId("agent", project).slice(-8)}`,
      order: index + 1,
      project,
      role: projectRole,
      title: `${projectRole} · ${project}`,
      objective,
      reason: compactMemoryText(item.reason || plan?.risk?.summary || "主 Agent 根据只读探索和影响范围分派", 180),
      depends_on: Array.isArray(item.dependsOn || item.depends_on) ? (item.dependsOn || item.depends_on).slice(0, 6) : (item.dependsOn || item.depends_on ? [item.dependsOn || item.depends_on] : []),
      allowed_scope: uniqueStrings([
        project ? `仅在 ${project} 项目职责范围内修改` : "",
        ...areas,
        ...fileHints,
      ].filter(Boolean)).slice(0, 8),
      forbidden_scope: uniqueStrings([
        "不要修改无关模块或用户已有改动",
        "不要编造未执行的验证结果",
        ...boundaries.filter((line: any) => /不得|禁止|等待|只能|边界|确认|删除|部署|迁移|生产/i.test(String(line || ""))),
      ].filter(Boolean)).slice(0, 8),
      acceptance: acceptance.length ? acceptance.slice(0, 6) : [
        "返回结构化回执",
        taskRequiresCodeChanges(task) ? "提供真实文件变更" : "说明无需代码变更的依据",
        taskRequiresVerification(task) ? "提供已执行验证记录" : "说明检查依据",
      ],
      status: item.status || (summary.assignment_count ? "dispatched" : task?.intake_state === "awaiting_confirmation" ? "waiting_confirmation" : "planned"),
    };
  }).slice(0, 8);
  return {
    title: summary.assignment_count ? "子 Agent 工作单" : "准备派发的工作单",
    source: assignmentEvidence.length ? "dispatch_evidence" : sandboxPlan.length ? "sandbox_rehearsal" : "plan_mode_preview",
    ready: orders.length > 0,
    requires_confirmation: task?.intake_state === "awaiting_confirmation" || plan?.requires_confirmation === true,
    summary: orders.length
      ? `主 Agent 准备让 ${orders.length} 个子 Agent 按边界执行；每个 Agent 必须回传文件、验证和阻塞情况。`
      : "主 Agent 还没有形成可展示的子 Agent 工作单。",
    orders,
  };
}

function executionStoryStatus(conditionDone: boolean, conditionActive: boolean, phase: string) {
  if (conditionDone) return "done";
  if (conditionActive) return "active";
  if (["blocked", "needs_user"].includes(phase)) return "warning";
  if (phase === "cancelled" || phase === "reverted") return "failed";
  return "pending";
}

function buildUserExecutionStory(task: any, summary: any = {}, executions: any[] = [], phase = "planning", workOrderPreview: any = null) {
  const files = Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes : [];
  const verification = Array.isArray(summary.verification_executed) ? summary.verification_executed : [];
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const qaRows = Array.isArray(summary.agent_qa) ? summary.agent_qa : [];
  const runningExecutions = executions.filter((item: any) => ["spawning", "ready", "prompt_accepted", "running"].includes(String(item.state || "")));
  const reviewingExecutions = executions.filter((item: any) => String(item.state || "") === "reviewing");
  const failedExecutions = executions.filter((item: any) => String(item.state || "") === "failed");
  const steps = [
    {
      id: "read_context",
      label: "读取项目和上下文",
      detail: task?.workflow_meta?.plan_mode || task?.intake_draft ? "已完成只读探索，形成执行边界" : "读取群聊上下文、项目记忆和必要代码快照",
      status: executionStoryStatus(!!(task?.workflow_meta?.plan_mode || task?.intake_draft || summary.coordination_plan_count), phase === "planning", phase),
      evidence: compactMemoryText((task?.workflow_meta?.plan_mode || task?.intake_draft)?.read_only_exploration?.summary || "", 180),
    },
    {
      id: "prepare_work_orders",
      label: "准备子 Agent 工作单",
      detail: workOrderPreview?.orders?.length ? `${workOrderPreview.orders.length} 个工作单已形成` : "等待主 Agent 细化派发范围",
      status: executionStoryStatus(!!workOrderPreview?.orders?.length, phase === "dispatching", phase),
      evidence: workOrderPreview?.orders?.map((item: any) => item.project).join("、") || "",
    },
    {
      id: "dispatch_agents",
      label: "派发给子 Agent",
      detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条` : "确认后才会派发",
      status: executionStoryStatus(Number(summary.assignment_count || 0) > 0, ["queued", "dispatching"].includes(phase), phase),
      evidence: receipts.length ? `${receipts.length} 条回执/状态` : "",
    },
    {
      id: "edit_files",
      label: "修改文件",
      detail: files.length ? `已捕获 ${files.length} 个文件改动` : runningExecutions.length ? `${runningExecutions.length} 个 Agent 正在修改` : "等待实际文件改动",
      status: executionStoryStatus(files.length > 0, runningExecutions.length > 0 || phase === "executing", phase),
      evidence: files.slice(0, 4).map((item: any) => item.path || item).join("、"),
    },
    {
      id: "run_checks",
      label: "运行验证",
      detail: verification.length ? `已执行 ${verification.length} 项检查` : reviewingExecutions.length ? "正在验收/检查" : "等待验证结果",
      status: executionStoryStatus(verification.length > 0, reviewingExecutions.length > 0 || phase === "reviewing", phase),
      evidence: verification.slice(0, 3).join("；"),
    },
    {
      id: "resolve_dependencies",
      label: "处理依赖/返工",
      detail: qaRows.length ? `Agent 问答 ${qaRows.length} 条` : failedExecutions.length ? `${failedExecutions.length} 个执行失败，等待恢复` : "暂无开放依赖",
      status: failedExecutions.length ? "warning" : qaRows.some((item: any) => !item.answer && item.status !== "resumed") ? "active" : qaRows.length ? "done" : "pending",
      evidence: qaRows.slice(-2).map((item: any) => `${item.from_agent || "Agent"}→${item.to_agent || "Agent"}`).join("、"),
    },
    {
      id: "final_review",
      label: "主 Agent 验收",
      detail: summary.acceptance_gate_passed === true ? "验收通过，可以交付" : summary.acceptance_gate ? `仍有 ${summary.acceptance_gate.failed_count || 0} 个缺口` : "等待交付证据",
      status: summary.acceptance_gate_passed === true ? "done" : phase === "reviewing" ? "active" : summary.acceptance_gate?.failed_count ? "warning" : "pending",
      evidence: summary.acceptance_gate?.failed_checks?.slice?.(0, 3)?.map((item: any) => item.label).join("、") || "",
    },
  ];
  return {
    title: "执行过程",
    style: "codex-cursor-lite",
    current_step: steps.find((item: any) => item.status === "active")?.id || steps.find((item: any) => item.status === "warning")?.id || "",
    steps,
  };
}

function buildUserAcceptanceReview(task: any, summary: any = {}, executions: any[] = [], phase = "planning") {
  const gate = summary.acceptance_gate || {};
  const gateChecks = Array.isArray(gate.checks) ? gate.checks : [];
  const hasDoneReceipt = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    task?.receipt,
  ].filter(Boolean).some((item: any) => String(item?.status || "") === "done");
  const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || 0);
  const verificationCount = Number(summary.verification_executed?.length || 0);
  const checkById = (id: string) => gateChecks.find((item: any) => item.id === id);
  const checks = [
    {
      id: "work_order",
      label: "派发工作单",
      ok: Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group",
      detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条` : "还没有可验收的派发证据",
    },
    {
      id: "receipt",
      label: "子 Agent 回执",
      ok: hasDoneReceipt || task?.assign_type !== "group",
      detail: hasDoneReceipt ? "已有 done 回执" : "缺少子 Agent 完成回执",
    },
    {
      id: "ack_gate",
      label: "ACK 前置审核",
      ok: !(taskRequiresCodeChanges(task) || taskRequiresVerification(task)) || summary.ack_gate_passed === true || !summary.ack_review,
      detail: summary.ack_review?.rejected?.length ? `需重写 ACK ${summary.ack_review.rejected.length} 条` : "等待 ACK 审核",
    },
    {
      id: "receipt_quality",
      label: "回执质量",
      ok: !(taskRequiresCodeChanges(task) || taskRequiresVerification(task)) || summary.receipt_quality_gate_passed === true || !summary.receipt_quality,
      detail: summary.weak_receipt_quality?.length ? `弱回执 ${summary.weak_receipt_quality.length} 条` : "等待高质量 ACK/回执",
    },
    {
      id: "actual_diff",
      label: "真实文件 Diff",
      ok: !taskRequiresCodeChanges(task) || actualChangeCount > 0,
      detail: taskRequiresCodeChanges(task) ? `捕获 ${actualChangeCount} 个文件` : "该任务允许无代码变更",
    },
    {
      id: "verification",
      label: "已执行验证",
      ok: !taskRequiresVerification(task) || verificationCount > 0,
      detail: taskRequiresVerification(task) ? `已执行 ${verificationCount} 项` : "该任务不强制验证",
    },
    {
      id: "goal_coverage",
      label: "目标覆盖",
      ok: summary.acceptance_gate_passed === true || (summary.has_final_review === true && !summary.acceptance_gate?.failed_count && !summary.blockers?.length && !summary.blocking_needs?.length),
      detail: summary.acceptance_gate_passed === true ? "主 Agent 已确认目标覆盖" : "等待主 Agent 最终验收确认",
    },
    {
      id: "runner_source",
      label: "验证来源可信",
      ok: !taskRequiresVerification(task) || summary.verification_source_gate_passed === true,
      detail: taskRequiresVerification(task) ? `外部 Runner ${summary.external_runner_verification_count || 0} 条` : "不强制",
    },
  ].map(item => {
    const fromGate = checkById(item.id) || checkById(item.id === "actual_diff" ? "actual_changes" : item.id);
    return fromGate ? { ...item, ok: fromGate.ok === true, detail: fromGate.detail || item.detail } : item;
  });
  const failed = checks.filter(item => !item.ok);
  const pass = failed.length === 0 && (summary.acceptance_gate_passed === true || (task?.status === "done" && gate.pass === true));
  return {
    title: "主 Agent 验收",
    pass,
    status: pass ? "passed" : phase === "reviewing" ? "reviewing" : failed.length ? "needs_rework" : "pending",
    headline: pass
      ? "证据齐全，允许交付"
      : failed.length
        ? `还缺 ${failed.length} 项证据，不能宣布完成`
        : "等待子 Agent 提交交付证据",
    checks,
    missing: failed.map(item => item.label).slice(0, 8),
    next_action: pass ? "可以交付最终报告" : "继续返工或补齐缺失证据后再验收",
  };
}

function scoreChildAgentReceipt(task: any, receipt: any = {}) {
  const receiptText = [
    receipt.summary,
    ...(Array.isArray(receipt.actions) ? receipt.actions : []),
    ...(Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : []),
  ].filter(Boolean).join("\n");
  const contractLikely = /接口|API|api|schema|DTO|类型|字段|契约|路由|endpoint|request|response/i.test(receiptText);
  const ack = receipt.ack || null;
  const contractChanges = Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes) : [];
  const checks = [
    { id: "status_done", label: "状态明确", ok: String(receipt.status || "") === "done" },
    { id: "structured_ack", label: "结构化 ACK", ok: !!ack && (!!ack.understoodGoal || !!ack.goal || (Array.isArray(ack.plannedScope) && ack.plannedScope.length > 0)) },
    { id: "summary", label: "说明完成内容", ok: String(receipt.summary || "").trim().length >= 8 },
    { id: "actions", label: "列出执行动作", ok: Array.isArray(receipt.actions) && receipt.actions.length > 0 },
    { id: "files", label: "列出文件变更", ok: !taskRequiresCodeChanges(task) || (Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) && (receipt.filesChanged || receipt.files_changed || receipt.files).length > 0) },
    { id: "verification", label: "列出已执行验证", ok: !taskRequiresVerification(task) || (Array.isArray(receipt.verification || receipt.tests) && (receipt.verification || receipt.tests).length > 0) },
    { id: "contract_changes", label: "结构化契约变化", ok: !contractLikely || contractChanges.length > 0 },
    { id: "no_open_blockers", label: "无开放阻塞", ok: !(Array.isArray(receipt.blockers) && receipt.blockers.length) && !(Array.isArray(receipt.needs) && receipt.needs.some((item: any) => !isAdvisoryNeed(item, task))) },
    { id: "memory_declared", label: "声明记忆使用", ok: Array.isArray(receipt.memoryUsed || receipt.memory_used) || Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) },
  ];
  const passed = checks.filter(item => item.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  return {
    score,
    grade: score >= 85 ? "good" : score >= 60 ? "partial" : "weak",
    pass: score >= 85,
    checks,
    missing: checks.filter(item => !item.ok).map(item => item.label),
  };
}

function buildCoordinationEventStream(task: any, summary: any = {}, executions: any[] = [], ackReview: any = null, contractTransfer: any = null, receiptRows: any[] = [], targetedRework: any[] = []) {
  const timeline = Array.isArray(summary.timeline) ? summary.timeline : [];
  const events: any[] = [];
  const add = (type: string, label: string, status = "info", detail = "", data: any = null) => {
    events.push({ id: `${type}_${events.length + 1}`, type, label, status, detail: compactMemoryText(detail, 220), data });
  };
  if (Array.isArray(summary.assignment_evidence) && summary.assignment_evidence.length) add("work_order_sent", "工作单已派发", "ok", `已派发 ${summary.assignment_evidence.length} 条`);
  for (const row of Array.isArray(ackReview?.rows) ? ackReview.rows : []) add("ack_received", `${row.agent || "子 Agent"} ACK ${row.status}`, row.status === "approved" ? "ok" : "warn", row.reason, row);
  for (const item of executions || []) add("heartbeat_received", `${item.project || "Agent"} ${item.state || "pending"}`, ["failed", "cancelled"].includes(String(item.state || "")) ? "warn" : "info", item.id || "", { execution_id: item.id, state: item.state });
  if (contractTransfer?.required) add("contract_changed", "检测到结构化契约变化", contractTransfer.status === "ready" ? "ok" : "warn", contractTransfer.next_action, contractTransfer);
  for (const row of receiptRows || []) add("receipt_scored", `${row.agent || "Agent"} 回执评分 ${row.quality?.score || 0}`, row.quality?.grade === "good" ? "ok" : "warn", (row.quality?.missing || []).join("、"), row);
  for (const item of targetedRework || []) add("targeted_rework_created", item.title || "精准返工建议", "warn", item.reason || "", item);
  for (const item of timeline.filter((entry: any) => /agent_qa|rework|dispatch|acceptance/i.test(String(entry.type || ""))).slice(-6)) {
    add(String(item.type || "timeline"), item.title || "协作事件", timelineStatusForUser(item) === "failed" ? "warn" : "info", item.detail || "", { timeline_id: item.id || "" });
  }
  return events.slice(-18);
}

function buildTargetedReworkSuggestions(task: any, summary: any = {}, acceptanceReview: any = null, receiptQualityRows: any[] = []) {
  const missing = new Set<string>(Array.isArray(acceptanceReview?.missing) ? acceptanceReview.missing : []);
  const suggestions: any[] = [];
  const add = (id: string, title: string, target = "", reason = "", action = "gap_continue") => {
    if (suggestions.some(item => item.id === id && item.target === target)) return;
    suggestions.push({ id, title, target, reason: compactMemoryText(reason, 220), action, kind: "targeted_rework", tone: action === "replan" ? "outline" : "warning", label: title });
  };
  if (missing.has("真实文件 Diff")) add("missing_diff", "只派实现返工", task?.target_project || "", "任务要求代码变更，但系统没有捕获真实文件 Diff。");
  if (missing.has("已执行验证")) add("missing_verification", "只派验证返工", task?.target_project || "", "任务要求验证，但回执没有可采信的已执行验证。");
  if (missing.has("子 Agent 回执")) add("missing_receipt", "要求子 Agent 补回执", task?.target_project || "", "缺少 done 状态结构化回执。");
  if (missing.has("目标覆盖")) add("missing_goal_review", "主 Agent 重新复盘目标覆盖", "coordinator", "缺少最终复盘或仍有未解决阻塞。", "replan");
  if (missing.has("回执质量")) add("weak_receipt", "要求补充高质量回执", task?.target_project || "", "回执质量门禁未通过，需要补 ACK/动作/文件/验证/契约/记忆声明。", "gap_continue");
  for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : []) {
    add("failed_verification", "只修失败验证点", task?.target_project || "", String(value), "gap_continue");
  }
  for (const row of receiptQualityRows.filter((item: any) => item.quality?.grade !== "good")) {
    add("weak_receipt", "要求补充高质量回执", row.agent || row.project || "", `回执评分 ${row.quality?.score || 0}：${(row.quality?.missing || []).join("、")}`, "gap_continue");
  }
  return suggestions.slice(0, 8);
}

function buildUserAgentCoordinationProtocol(task: any, summary: any = {}, executions: any[] = [], workOrderPreview: any = null, acceptanceReview: any = null) {
  const orders = Array.isArray(workOrderPreview?.orders) ? workOrderPreview.orders : [];
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const receiptRows = receipts.map((receipt: any) => ({
    agent: receipt.agent || receipt.project || "",
    status: receipt.status || receipt.receipt_status || "",
    summary: compactMemoryText(receipt.summary || "", 160),
    quality: scoreChildAgentReceipt(task, receipt),
  })).slice(0, 10);
  const handoff = orders.map((order: any) => {
    const matchName = (value: any) => String(value || "").toLowerCase() === String(order.project || "").toLowerCase();
    const receipt = receipts.find((item: any) => matchName(item.agent || item.project));
    const notification = notifications.find((item: any) => matchName(item.task_id || item.agent || item.project));
    const execution = executions.find((item: any) => matchName(item.project));
    const accepted = !!(receipt || notification || execution);
    return {
      agent: order.project,
      role: order.role,
      objective: order.objective,
      status: accepted ? "accepted" : workOrderPreview?.requires_confirmation ? "waiting_confirmation" : "waiting_ack",
      detail: accepted ? "已看到执行/回执/通知证据" : "等待子 Agent 接单确认",
    };
  }).slice(0, 10);
  const heartbeat = uniqueStrings([
    ...executions.map((item: any) => `${item.project || "Agent"}：${item.state || "pending"}`),
    ...notifications.map((item: any) => `${item.task_id || item.agent || "Agent"}：${item.status || "unknown"}${item.summary ? ` · ${item.summary}` : ""}`),
  ]).slice(0, 10).map((item: string, index: number) => ({ id: `heartbeat_${index + 1}`, text: compactMemoryText(item, 180) }));
  const contractSync = extractContractSyncHints(task, summary);
  const ackReview = buildAckPreflightReview(task, receipts, orders);
  const contractTransfer = buildContractTransferPlan(contractSync, orders);
  const contractInjectionGate = evaluateContractInjectionGate(contractTransfer.rows || [], Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []);
  const targetedRework = buildTargetedReworkSuggestions(task, summary, acceptanceReview, receiptRows);
  if (ackReview.rejected?.length) {
    for (const row of ackReview.rejected.slice(0, 4)) {
      targetedRework.push({ id: "ack_rewrite", title: "要求重写接单 ACK", target: row.agent || "", reason: row.reason || "ACK 不完整", action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "要求重写 ACK" });
    }
  }
  if (contractTransfer.status === "needs_contract_changes" || contractTransfer.status === "needs_target") {
    targetedRework.push({ id: "contract_sync", title: "同步结构化契约", target: "", reason: contractTransfer.next_action, action: "gap_continue", kind: "targeted_rework", tone: "warning", label: "同步契约" });
  }
  if (contractInjectionGate.required && !contractInjectionGate.pass) {
    for (const row of contractInjectionGate.missing.slice(0, 4)) {
      targetedRework.push({
        id: "contract_inject",
        title: "注入契约给依赖 Agent",
        target: row.target,
        reason: `${row.endpoint || row.type || "contract"}：${row.summary || "结构化契约变化需要同步"}`,
        action: "gap_continue",
        kind: "targeted_rework",
        tone: "warning",
        label: "注入契约",
      });
    }
  }
  const coordinationEvents = buildCoordinationEventStream(task, summary, executions, ackReview, contractTransfer, receiptRows, targetedRework);
  const weakReceipts = receiptRows.filter((row: any) => row.quality.grade !== "good");
  const healthScoreParts = [
    handoff.length ? Math.round((handoff.filter((item: any) => item.status === "accepted").length / handoff.length) * 100) : 100,
    receiptRows.length ? Math.round(receiptRows.reduce((sum: number, row: any) => sum + row.quality.score, 0) / receiptRows.length) : (orders.length ? 40 : 100),
    contractSync.status === "needs_sync" ? 50 : 100,
    targetedRework.length ? 60 : 100,
  ];
  const health = Math.round(healthScoreParts.reduce((sum, value) => sum + value, 0) / healthScoreParts.length);
  return {
    version: 1,
    source: "main-child-agent-coordination-6.0",
    title: "主 Agent ↔ 子 Agent 协作",
    health,
    status: health >= 85 ? "healthy" : health >= 60 ? "needs_attention" : "blocked",
    ack_review: ackReview,
    handoff,
    heartbeat,
    contract_sync: contractSync,
    contract_transfer: contractTransfer,
    contract_injection_gate: contractInjectionGate,
    coordination_events: coordinationEvents,
    receipt_quality: receiptRows,
    weak_receipts: weakReceipts,
    targeted_rework: targetedRework,
    next_action: targetedRework.length
      ? "按缺口精准返工，不整轮重跑"
      : weakReceipts.length
        ? "要求子 Agent 补充更完整回执"
        : contractSync.status === "needs_sync"
          ? "同步跨 Agent 接口/字段契约"
          : "继续跟踪执行和验收",
  };
}

function buildUserCoordinationAcknowledgement(task: any, assignments: any[] = []) {
  const projects = uniqueStrings((assignments || []).map((item: any) => item.project).filter(Boolean));
  const scope = projects.length ? `预计由 ${projects.join("、")} 处理` : "我正在确认涉及的项目";
  const goal = compactMemoryText(task?.business_goal || task?.title || "这项需求", 180).replace(/[。！？!?；;，,]+$/u, "");
  return `我明白了：${goal}。${scope}，后续进度会持续更新在这张任务卡中。`;
}

function classifyGroupProjectTaskIntent(message: string, uploadedFiles: any[] = []) {
  const text = String(message || "").trim();
  const compact = text.replace(/\s+/g, "");
  const hasAttachment = Array.isArray(uploadedFiles) && uploadedFiles.length > 0;
  const greetingOnly = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)[。.!！?？\s]*$/i.test(compact);
  const questionOnly = /^(这个|那个|你|我|项目|知识库|群聊|全局Agent|主Agent|子Agent).{0,40}(是什么|是啥|什么意思|怎么用|能用吗|可以用吗|怎么样|有问题吗|需要吗)[。.!！?？\s]*$/i.test(compact);
  const projectAnalysisSignals = /项目|代码|仓库|架构|技术栈|目录|文件|模块|接口|页面|组件|数据库|配置|依赖|知识库|主\s*Agent|子\s*Agent|agent|Agent|这个.*项目|什么项目/i.test(text);
  const actionSignals = [
    /(?:帮我|给我|请|麻烦|需要|开始|继续).{0,24}(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|跑|改|加|做|写)/i,
    /(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|跑).{0,40}(?:功能|接口|页面|组件|代码|项目|文件|数据库|服务|测试|配置|bug|Bug|API|api)/i,
    /(?:把|将).{1,80}(?:改成|修改为|接入|迁移|重构|删掉|删除|加上|加入|换成|拆成|合并)/i,
    /(?:报错|错误|bug|Bug|失败|不能用|崩溃|异常).{0,40}(?:修|修复|看一下|排查|解决|处理)/i,
    /(?:PR|提交|发布|上线|构建|编译|单测|测试|接口|页面|组件|schema|数据库|路由|权限|登录|支付|订单|表单|样式|前端|后端).{0,40}(?:实现|新增|修改|修复|优化|检查|补充|接入|部署)/i,
  ];
  const executable = hasAttachment || (!greetingOnly && !questionOnly && actionSignals.some(pattern => pattern.test(text)));
  const analysisEligible = !executable && !greetingOnly && projectAnalysisSignals;
  return {
    executable,
    analysisEligible,
    kind: executable ? "task" : analysisEligible ? "project_analysis" : greetingOnly ? "greeting" : questionOnly ? "question" : "conversation",
    reason: executable
      ? (hasAttachment ? "包含附件，按项目任务处理" : "包含明确开发/修改/执行意图")
      : greetingOnly
        ? "普通问候，不创建任务卡"
        : analysisEligible
          ? "项目/知识库相关只读询问，进入项目分析但不创建任务卡"
        : questionOnly
          ? "普通询问，不创建任务卡"
          : "未发现明确项目执行动作",
  };
}

function shouldUseProjectAnalysisMode(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any }) {
  const mode = String(input.messageMode || "conversation").trim().toLowerCase();
  if (!input.isOrchestrated) return false;
  if (mode === "project_analysis") return input.taskIntent?.kind !== "greeting";
  if (["project_task", "daily_dev", "mission"].includes(mode) && input.taskIntent?.analysisEligible === true) return true;
  return false;
}

function shouldCreatePersistentGroupTask(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any; forceProjectTask?: boolean }) {
  const mode = String(input.messageMode || "conversation").trim().toLowerCase();
  return !!input.isOrchestrated
    && ["project_task", "daily_dev", "mission"].includes(mode)
    && (!!input.forceProjectTask || input.taskIntent?.executable === true);
}

function classifyPlanModeRisk(message: string, group: any, taskIntent: any = {}, attachmentCount = 0) {
  const text = String(message || "");
  const routableCount = getRoutableMembers(group || {}).length;
  const lower = text.toLowerCase();
  const signals = {
    destructive: /删除|清空|清理|移除|drop\s+table|truncate|purge|永久|销毁|撤销|覆盖/i.test(text),
    migration: /迁移|重构|拆分|合并|数据库|schema|权限|登录|支付|订单|部署|上线|生产|线上|配置|环境变量/i.test(text),
    crossProject: /跨项目|多项目|所有项目|全部项目|前后端|全栈|多个 Agent|多个项目/i.test(text) || routableCount > 1 && /前端|后端|接口|页面|数据库|全栈/i.test(text),
    vague: taskIntent?.executable === true && text.replace(/\s+/g, "").length < 18 && /优化|修复|改一下|处理|看一下|做一下/i.test(text),
    attachment: attachmentCount > 0,
  };
  const reasons = [
    signals.destructive ? "包含删除、清理、覆盖或不可逆操作" : "",
    signals.migration ? "涉及迁移、重构、数据库、权限、支付、部署或配置边界" : "",
    signals.crossProject ? "可能涉及多个项目或前后端契约" : "",
    signals.vague ? "需求较短或范围模糊，需要先确认影响范围" : "",
    signals.attachment ? "包含附件，需要先只读解析需求文档" : "",
  ].filter(Boolean);
  const requiresConfirmation = signals.destructive || signals.migration || signals.crossProject || signals.vague || signals.attachment;
  const level = signals.destructive || signals.migration ? "high" : requiresConfirmation ? "medium" : "low";
  return {
    level,
    requiresConfirmation,
    reasons,
    signals,
    summary: reasons.length ? reasons.join("；") : "低风险明确开发需求，可自动进入执行队列",
    lower,
  };
}

function buildGroupPlanModePreflight(input: { group: any; message: string; ctx: CollabCtx; configs?: any[]; taskIntent?: any; attachmentCount?: number; coordinatorProject?: string }) {
  const group = normalizeGroupOrchestrator(input.group);
  const configs = input.configs || getConfigs();
  const message = String(input.message || "");
  const risk = classifyPlanModeRisk(message, group, input.taskIntent, input.attachmentCount || 0);
  const members = getRoutableMembers(group);
  const coordinatorProject = input.coordinatorProject || getCoordinatorMember(group).project;
  const projectNames = members.map((member: any) => member.project).filter(Boolean);
  const relevantProjects = projectNames.filter((name: string) => message.toLowerCase().includes(String(name).toLowerCase())).slice(0, 6);
  const selectedProjects = relevantProjects.length ? relevantProjects : projectNames.slice(0, Math.min(3, projectNames.length));
  const areas = [
    /页面|前端|ui|组件|样式/i.test(message) ? "前端页面与交互" : "",
    /接口|后端|服务|数据库|api/i.test(message) ? "后端接口与数据契约" : "",
    /权限|登录|支付|订单/i.test(message) ? "业务权限与关键流程" : "",
    /测试|验证|bug|报错|修复/i.test(message) ? "测试、回归与缺陷修复" : "",
  ].filter(Boolean);
  if (!areas.length) areas.push("由主 Agent 只读探索后收敛影响范围");
  let readOnlyContext = "";
  try {
    readOnlyContext = compactMemoryText(buildGroupProjectAnalysisContext(group, message, input.ctx, configs), 2600);
  } catch (error: any) {
    readOnlyContext = `只读探索失败：${compactMemoryText(error?.message || error, 240)}`;
  }
  const acceptance = [
    "必须有主 Agent 计划、派发证据和子 Agent 结构化回执",
    "涉及代码时必须有系统实际捕获的文件变更",
    "必须有已执行验证记录，不能只写建议验证",
    "最终报告必须列出完成内容、变更文件、验证结果、风险和待确认事项",
  ];
  const permissionBoundaries = [
    "执行前只读探索不得修改文件、不得运行破坏性命令",
    "删除、清理、迁移、部署、跨项目契约变更必须等待用户确认",
    "子 Agent 只能在对应项目工作区和工作单范围内修改",
    "任务完成前必须保留 native session / scratchpad 续跑上下文",
  ];
  return {
    title: "执行前计划",
    mode: "cc-style-plan-mode",
    source: "group-main-agent-plan-mode-4.0",
    coordinator: coordinatorProject,
    group_id: group?.id || "",
    requirement: compactFormText(message, ""),
    read_only_exploration: {
      summary: readOnlyContext,
      projects: selectedProjects,
      knowledge_used: readOnlyContext.includes("本地知识库召回"),
      code_snapshot_used: readOnlyContext.includes("只读代码快照"),
    },
    impact_scope: {
      areas,
      projects: selectedProjects,
      multi_agent: selectedProjects.length > 1 || risk.signals.crossProject,
    },
    risk,
    acceptance,
    permission_boundaries: permissionBoundaries,
    sub_agent_work_order_requirements: [
      "每个工作单必须包含目标、背景、允许修改范围、禁止事项、验收标准和回执格式",
      "子 Agent 必须返回修改文件、执行动作、验证命令/结果、阻塞点和是否需要主 Agent 返工",
      "返工必须复用原任务上下文和原生会话，不能重新开一个失忆任务",
    ],
    session_strategy: {
      native_resume_first: true,
      keep_task_session_until_final_review: true,
      fallback: "native 不可用时使用 scratchpad 续跑，并注入上轮回执、未完成 Todo 和验收缺口",
    },
    requires_confirmation: risk.requiresConfirmation,
    auto_continue: !risk.requiresConfirmation,
    next_step: risk.requiresConfirmation ? "等待用户确认后创建执行队列并派发子 Agent" : "低风险明确任务，自动进入执行队列",
    generated_at: new Date().toISOString(),
  };
}

const PROJECT_ANALYSIS_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".vite",
  ".cache",
  ".parcel-cache",
  ".ccm-worktrees",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "target",
  "vendor",
]);

const PROJECT_ANALYSIS_SAFE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".prisma",
  ".sql",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".php",
  ".rb",
]);

const PROJECT_ANALYSIS_SAFE_FILENAMES = new Set([
  "README",
  "README.md",
  "package.json",
  "pnpm-workspace.yaml",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "nuxt.config.ts",
  "tsconfig.json",
  "tailwind.config.js",
  "tailwind.config.ts",
  "docker-compose.yml",
  "Dockerfile",
]);

function isSensitiveProjectAnalysisFile(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const base = path.basename(normalized).toLowerCase();
  return /(^|\/)\.env($|[.\-/])|secret|credential|token|private[-_]?key|id_rsa|\.pem$|\.p12$|\.pfx$|\.sqlite$|\.db$/i.test(normalized)
    || ["npmrc", ".npmrc", ".yarnrc", ".pypirc"].includes(base);
}

function isProjectAnalysisCandidate(filePath: string, root: string) {
  const relativePath = path.relative(root, filePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) return false;
  if (isSensitiveProjectAnalysisFile(relativePath)) return false;
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  return PROJECT_ANALYSIS_SAFE_EXTENSIONS.has(ext) || PROJECT_ANALYSIS_SAFE_FILENAMES.has(base);
}

function collectProjectAnalysisFiles(root: string, maxEntries = 1200) {
  const files: string[] = [];
  let visited = 0;
  const walk = (dir: string, depth = 0) => {
    if (visited >= maxEntries || depth > 5) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => !PROJECT_ANALYSIS_IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".ccm-"))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    } catch { return; }
    for (const entry of entries) {
      if (visited >= maxEntries) break;
      visited += 1;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (isProjectAnalysisCandidate(full, root)) files.push(full);
    }
  };
  walk(root);
  return files;
}

function buildProjectAnalysisQueryTerms(message: string) {
  return String(message || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-./\u4e00-\u9fa5]+/gu, " ")
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2)
    .slice(0, 18);
}

function scoreProjectAnalysisFile(filePath: string, root: string, queryTerms: string[]) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
  const lower = relativePath.toLowerCase();
  let score = 0;
  if (/^readme/i.test(path.basename(relativePath))) score += 90;
  if (["package.json", "vite.config.ts", "vite.config.js", "next.config.js", "tsconfig.json"].includes(path.basename(relativePath))) score += 70;
  if (/(^|\/)(src|app|pages|routes|router|components|server|backend|frontend|api|lib|utils)\//i.test(relativePath)) score += 45;
  if (/(main|index|app|server|route|router|api|schema|model|store|config)\./i.test(path.basename(relativePath))) score += 25;
  for (const term of queryTerms) {
    if (lower.includes(term)) score += 35;
  }
  const depthPenalty = relativePath.split("/").length * 2;
  return score - depthPenalty;
}

function readProjectAnalysisFileSnippet(filePath: string, maxChars = 2600) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 240_000) return "";
    const buffer = fs.readFileSync(filePath);
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
    if (sample.includes(0)) return "";
    const content = buffer.toString("utf-8").replace(/\r\n/g, "\n").trim();
    if (!content) return "";
    return content.length > maxChars ? `${content.slice(0, maxChars)}\n…（已截断，仅用于只读分析）` : content;
  } catch {
    return "";
  }
}

function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string) {
  if (!workDir) return "";
  try {
    const realRoot = fs.realpathSync(workDir);
    if (!fs.existsSync(realRoot) || !fs.statSync(realRoot).isDirectory()) return "- 代码快照：工作目录不可读。";
    const queryTerms = buildProjectAnalysisQueryTerms(message);
    const candidates = collectProjectAnalysisFiles(realRoot);
    const selected = candidates
      .map(file => ({ file, score: scoreProjectAnalysisFile(file, realRoot, queryTerms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    if (!selected.length) return "- 代码快照：未找到适合只读分析的源码/配置文件。";
    const parts: string[] = [
      "### 只读代码快照",
      "说明：以下为群聊主 Agent 为回答项目分析问题读取的有限源码片段；它不能修改文件，完整实现仍以子 Agent 执行时读取的真实仓库为准。",
    ];
    let total = 0;
    for (const item of selected) {
      const relativePath = path.relative(realRoot, item.file).replace(/\\/g, "/");
      const snippet = readProjectAnalysisFileSnippet(item.file, 2600);
      if (!snippet) continue;
      const block = `\n#### ${project}/${relativePath}\n\`\`\`\n${snippet}\n\`\`\``;
      if (total + block.length > 16_000) break;
      total += block.length;
      parts.push(block);
    }
    return parts.length > 2 ? parts.join("\n") : "- 代码快照：候选文件为空或不可读。";
  } catch (error: any) {
    return `- 代码快照：读取失败，${compactMemoryText(error?.message || error, 180)}。`;
  }
}

function buildGroupProjectAnalysisContext(group: any, message: string, ctx: CollabCtx, configs = getConfigs()) {
  const normalized = normalizeGroupOrchestrator(group);
  const members = getRoutableMembers(normalized);
  const lines: string[] = [
    "【只读项目分析上下文】",
    "用途：帮助群聊主 Agent 回答用户关于项目、架构、代码、知识库和协作状态的询问。",
    "边界：这是只读分析；不得创建任务、不得派发子 Agent、不得声明已修改文件或运行命令。",
  ];
  if (!members.length) {
    lines.push("- 当前群聊还没有绑定可分析的项目 Agent。");
  }
  for (const member of members.slice(0, 8)) {
    const runtime = resolveMemberRuntime(member.project, normalized, configs);
    const workDir = runtime?.workDir || "";
    const resources = getProjectExtraConfig(member.project);
    lines.push("");
    lines.push(`## 项目 ${member.project}`);
    lines.push(`- 执行器：${runtime?.agentType || member.agent || "未配置"}`);
    lines.push(`- 工作目录：${workDir || "未配置"}`);
    if (workDir) {
      try {
        const entries = fs.existsSync(workDir)
          ? fs.readdirSync(workDir).filter(name => !["node_modules", ".git", "dist", "build"].includes(name)).slice(0, 16)
          : [];
        lines.push(`- 顶层目录：${entries.length ? entries.join("、") : "目录为空或不可读"}`);
      } catch (error: any) {
        lines.push(`- 顶层目录：读取失败，${compactMemoryText(error?.message || error, 160)}`);
      }
    }
    lines.push(compactMemoryText(buildProjectMemoryPacket(member.project, { workDir, resources, query: message }), 2200));
    if (workDir) lines.push(compactPreserveLines(buildProjectCodeReadOnlySnapshot(member.project, workDir, message), 18_000));
  }
  try {
    const { queryKnowledgeBase } = require("./rag");
    const rag = queryKnowledgeBase(message, 3);
    if (rag) {
      lines.push("");
      lines.push("## 本地知识库召回");
      lines.push(compactMemoryText(rag, 2200));
    }
  } catch {}
  return lines.filter(Boolean).join("\n");
}

function runCollaborationUxSelfTest() {
  const task = {
    id: "ux-task",
    title: "增加负责人筛选",
    business_goal: "给工单页面增加负责人筛选",
    workflow_type: "daily_dev",
    assign_type: "group",
    requires_code_changes: true,
    requires_verification: true,
    status: "done",
    trace_id: "trace-ux",
    delivery_summary: {
      headline: "负责人筛选已完成",
      actual_file_change_count: 2,
      actual_file_changes: [{ path: "frontend/app.js" }, { path: "backend/server.js" }],
      verification_executed: ["npm test passed by external runner (exit 0)"],
      external_runner_verification_count: 1,
      verification_source_gate_passed: true,
      coordination_plan_count: 1,
      assignment_count: 1,
      worker_notification_count: 1,
      assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选", reason: "前端页面变更" }],
      worker_notifications: [{ task_id: "collab-web", status: "completed", summary: "已修改负责人筛选并运行 npm test" }],
      has_final_review: true,
      review_status: "complete",
      acceptance_gate_passed: true,
      receipt_statuses: [{ agent: "collab-web", status: "done", summary: "raw receipt should stay technical" }],
      ack_gate_passed: true,
      ack_review: { status: "approved", rejected: [], rows: [{ agent: "collab-web", status: "approved", reason: "ACK 目标和范围清晰" }] },
      receipts: [{
        agent: "collab-web",
        status: "done",
        summary: "已完成负责人筛选并同步接口字段 GET /api/users?role=owner",
        actions: ["修改筛选组件", "同步接口字段 GET /api/users?role=owner"],
        filesChanged: ["frontend/app.js", "backend/server.js"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
          understoodGoal: "给工单页面增加负责人筛选",
          plannedScope: ["frontend/app.js", "backend/server.js"],
          forbiddenScope: ["不改无关页面"],
          verificationPlan: ["npm test"],
          unclear: [],
        },
        contractChanges: [{
          type: "api",
          endpoint: "GET /api/users?role=owner",
          response: "返回可筛选负责人列表",
          consumers: ["collab-web"],
          note: "负责人筛选使用该接口字段",
        }],
        blockers: [],
        needs: [],
        memoryUsed: ["项目记忆：筛选页面结构"],
      }],
      timeline: [
        { id: "tl-plan", type: "coordinator_plan", title: "主 Agent 生成计划", status: "ok", phase: "planning", agent: "coordinator" },
        { id: "tl-conflict", type: "conflict_plan", title: "跨 Agent 冲突保护", detail: "检测到前后端可能同时修改 shared/types.ts", status: "warn", phase: "planning", data: { conflicts: [{ projects: ["frontend", "backend"], reason: "可能同时修改共享类型", scopes: ["shared/types.ts"] }] } },
        { id: "tl-qa", type: "agent_qa_question", title: "frontend 向 backend 提问", detail: "确认筛选字段", status: "active", phase: "executing", agent: "frontend" },
        { id: "tl-review", type: "coordinator_review", title: "主 Agent 验收", status: "ok", phase: "reviewing", agent: "coordinator" },
      ],
      agent_qa: [{ id: "qa-ux", from_agent: "frontend", to_agent: "backend", question: "负责人字段叫什么？", answer: "ownerId", status: "resumed", acceptance: { accepted: true } }],
    },
  };
  const card = buildTaskCardView(task, [{ id: "exec-ux", project: "collab-web", state: "succeeded", checkpointIds: ["checkpoint-ux"] }], []);
  const failedCard = buildTaskCardView({ ...task, status: "failed", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const missingEvidenceCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { headline: "等待证据", assignment_count: 1, assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选" }], receipt_statuses: [] } }, [], []);
  const activeCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const reviewingCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [{ id: "exec-review", project: "collab-web", state: "reviewing" }], []);
  const reworkingCard = buildTaskCardView({ ...task, status: "in_progress", collaboration_state: { phase: "reworking" }, delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const revertedCard = buildTaskCardView({ ...task, status: "cancelled", rolled_back_at: new Date().toISOString() }, [], []);
  const greetingCard = buildTaskCardView({ id: "hello-task", title: "你好", business_goal: "你好", status: "pending", workflow_meta: { intake: { task_intent: { executable: false } } } }, [], []);
  const highRiskPlan = classifyPlanModeRisk("删除旧订单表并上线新的支付权限", { members: [{ role: "coordinator", project: "api" }, { role: "member", project: "web" }] }, { executable: true }, 0);
  const lowRiskPlan = classifyPlanModeRisk("给设置页按钮文案改成保存", { members: [{ role: "coordinator", project: "web" }] }, { executable: true }, 0);
  const awaitingPlanCard = buildTaskCardView({
    id: "plan-task",
    title: "调整支付流程",
    business_goal: "调整支付流程",
    status: "pending",
    intake_state: "awaiting_confirmation",
    intake_draft: {
      title: "执行前计划",
      mode: "cc-style-plan-mode",
      requires_confirmation: true,
      risk: highRiskPlan,
      impact_scope: { projects: ["api", "web"], areas: ["后端接口与数据契约", "前端页面与交互"], multi_agent: true },
      read_only_exploration: { summary: "只读代码快照和本地知识库召回已用于评估。", projects: ["api", "web"], knowledge_used: true, code_snapshot_used: true },
      acceptance: ["必须有结构化回执", "必须有文件变更和验证证据"],
      permission_boundaries: ["确认前不得修改文件", "删除和部署必须等待用户确认"],
    },
    workflow_meta: { intake: { task_intent: { executable: true } } },
  }, [], []);
  const report = buildUserDeliveryReport(task, task.delivery_summary, "done", "负责人筛选已完成");
  const groupReport = buildTaskGroupReportMessage(task, "done", "负责人筛选已完成");
  const acknowledgement = buildUserCoordinationAcknowledgement({ ...task, business_goal: "增加负责人筛选。" }, [{ project: "collab-web" }]);
  const ackGapTask = {
    ...task,
    status: "in_progress",
    delivery_summary: {
      ...task.delivery_summary,
      ack_gate_passed: false,
      ack_review: {
        status: "needs_review",
        rejected: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围" }],
        rows: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围", planned_scope: [], unclear: [] }],
      },
      acceptance_gate_passed: false,
    },
  };
  const ackGapDraft = buildTaskGapContinuationDraft(ackGapTask);
  const contractGapTask = {
    ...task,
    status: "in_progress",
    delivery_summary: {
      ...task.delivery_summary,
      assignment_evidence: [{ project: "collab-api", task: "修改负责人 API", reason: "后端契约提供方" }],
      receipts: [{
        agent: "collab-api",
        status: "done",
        summary: "新增 GET /api/users?role=owner",
        actions: ["更新接口"],
        filesChanged: ["backend/server.ts"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: { understoodGoal: "修改负责人 API", plannedScope: ["backend/server.ts"], verificationPlan: ["npm test"], unclear: [] },
        contractChanges: [{ type: "api", endpoint: "GET /api/users?role=owner", summary: "返回负责人列表", consumers: ["collab-web"] }],
        blockers: [],
        needs: [],
        memoryUsed: [],
        memoryIgnored: ["自测样例"],
      }],
      contract_injection_gate_passed: false,
    },
  };
  const contractGapDraft = buildTaskGapContinuationDraft(contractGapTask);
  const contractInjectedGate = evaluateContractInjectionGate(
    getTaskContractInjectionRows(contractGapTask).rows,
    [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }]
  );
  const contractGenericApiGate = evaluateContractInjectionGate(
    getTaskContractInjectionRows(contractGapTask).rows,
    [{ project: "collab-web", task: "改前端 API 调用", message_id: "m-original" }]
  );
  const codeSnapshotSelfTest = (() => {
    const tempRoot = fs.mkdtempSync(path.join(process.env.TEMP || CCM_DIR, "ccm-project-analysis-"));
    try {
      fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, "node_modules"), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, "package.json"), JSON.stringify({ scripts: { dev: "vite" }, dependencies: { vue: "^3.0.0" } }), "utf-8");
      fs.writeFileSync(path.join(tempRoot, "src", "payment.ts"), "export function createPayment() { return 'ok' }\n", "utf-8");
      fs.writeFileSync(path.join(tempRoot, ".env"), "SECRET_SHOULD_NOT_APPEAR=1\n", "utf-8");
      fs.writeFileSync(path.join(tempRoot, "node_modules", "ignored.js"), "SHOULD_NOT_APPEAR\n", "utf-8");
      const snapshot = buildProjectCodeReadOnlySnapshot("demo", tempRoot, "支付功能在哪里");
      return {
        pass: snapshot.includes("src/payment.ts") && snapshot.includes("createPayment") && !snapshot.includes("SECRET_SHOULD_NOT_APPEAR") && !snapshot.includes("SHOULD_NOT_APPEAR"),
        hasSourceFile: snapshot.includes("src/payment.ts"),
        hidesSecret: !snapshot.includes("SECRET_SHOULD_NOT_APPEAR"),
        hidesDependencies: !snapshot.includes("SHOULD_NOT_APPEAR"),
      };
    } catch (error: any) {
      return { pass: false, error: compactMemoryText(error?.message || error, 240) };
    } finally {
      try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
    }
  })();
  const checks = {
    simplePhaseLanguage: card.phase_label === "已完成",
    conciseAgentLanguage: card.agents.every((item: any) => !/receipt|回执|门禁|session|trace/i.test(item.summary)),
    simpleActions: card.actions.some((item: any) => item.label === "查看改动")
      && card.actions.some((item: any) => item.label === "继续修改")
      && card.actions.some((item: any) => item.label === "安全撤销")
      && failedCard.actions.some((item: any) => item.label === "重新执行")
      && activeCard.actions.some((item: any) => item.label === "停止"),
    revertedPhase: revertedCard.phase === "reverted" && revertedCard.phase_label === "已安全撤销",
    technicalIdsStayCollapsed: !!card.technical.trace_id,
    userWorkflowTimelineVisible: card.workflow_timeline.length >= 4 && card.workflow_timeline.some((item: any) => item.label.includes("预判潜在修改冲突")),
    liveTodoPlanVisible: card.live_todo_plan?.source === "ccm-live-task-todo" && Array.isArray(card.mainAgentDecision?.user_plan_steps) && card.mainAgentDecision.user_plan_steps.some((step: any) => step.id === "final_delivery_report" && step.status === "completed"),
    liveTodoReviewing: reviewingCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.id === "coordinator_review" && step.status === "reviewing"),
    liveTodoReworking: reworkingCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.status === "reworking"),
    liveTodoFailedNeedsConfirmation: failedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => ["needs_confirmation", "failed"].includes(step.status)),
    liveTodoCancelled: revertedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => step.status === "cancelled"),
    liveTodoEvidenceTraceable: card.mainAgentDecision?.user_plan_steps?.every((step: any) => Array.isArray(step.evidence) && step.evidence.length > 0),
    liveTodoFailureHasActions: failedCard.mainAgentDecision?.user_plan_steps?.some((step: any) => ["needs_confirmation", "failed"].includes(step.status) && Array.isArray(step.actions) && step.actions.some((action: any) => ["retry", "gap_continue", "switch_executor", "cancel"].includes(action.kind))),
    agentQaVisible: card.agent_questions[0]?.label === "已采纳并继续",
    conflictWarningsVisible: card.conflict_warnings[0]?.title.includes("frontend"),
    greetingDoesNotCreateTaskCard: classifyGroupProjectTaskIntent("你好").executable === false,
    ordinaryQuestionDoesNotCreateTaskCard: classifyGroupProjectTaskIntent("这个知识库怎么用？").executable === false,
    explicitDevelopmentCreatesTaskCard: classifyGroupProjectTaskIntent("帮我给项目A新增支付接口并改前端页面").executable === true,
    projectTaskModeQuestionDoesNotCreatePersistentTask: shouldCreatePersistentGroupTask({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好，这是一个什么项目") }) === false,
    projectTaskQuestionUsesReadOnlyAnalysis: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好，这是一个什么项目") }) === true,
    explicitAnalysisGreetingDoesNotReadProjects: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: classifyGroupProjectTaskIntent("你好") }) === false,
    explicitAnalysisModeReadsProjectContext: shouldUseProjectAnalysisMode({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: classifyGroupProjectTaskIntent("这个项目架构是什么") }) === true,
    projectAnalysisReadsSafeCodeSnapshot: codeSnapshotSelfTest.pass === true,
    forceTaskCanBypassIntentGate: shouldCreatePersistentGroupTask({ isOrchestrated: true, messageMode: "project_task", taskIntent: classifyGroupProjectTaskIntent("你好"), forceProjectTask: true }) === true,
    nonTaskCardIsHidden: greetingCard.visible === false,
    planModeHighRiskRequiresConfirmation: highRiskPlan.requiresConfirmation === true && highRiskPlan.level === "high",
    planModeLowRiskAutoContinues: lowRiskPlan.requiresConfirmation === false && lowRiskPlan.level === "low",
    awaitingPlanCardNeedsUser: awaitingPlanCard.phase === "needs_user" && awaitingPlanCard.actions.some((item: any) => item.kind === "confirm_plan"),
    awaitingPlanCardShowsPlan: awaitingPlanCard.plan_mode?.requires_confirmation === true && awaitingPlanCard.plan_mode?.read_only_exploration?.code_snapshot_used === true,
    workOrderPreviewVisible: card.work_order_preview?.orders?.some((item: any) => item.project === "collab-web" && item.allowed_scope?.length && item.acceptance?.length),
    executionStoryShowsCodingFlow: ["read_context", "prepare_work_orders", "dispatch_agents", "edit_files", "run_checks", "final_review"].every(id => card.execution_story?.steps?.some((item: any) => item.id === id)),
    acceptanceReviewHardGateVisible: card.acceptance_review?.checks?.some((item: any) => item.id === "actual_diff" && item.ok) && card.acceptance_review?.checks?.some((item: any) => item.id === "verification" && item.ok),
    missingEvidenceAcceptanceReviewBlocksCompletion: missingEvidenceCard.acceptance_review?.pass === false && missingEvidenceCard.acceptance_review?.missing?.includes("真实文件 Diff") && missingEvidenceCard.acceptance_review?.missing?.includes("已执行验证"),
    agentCoordinationProtocolVisible: card.agent_coordination?.source === "main-child-agent-coordination-6.0" && card.agent_coordination?.handoff?.some((item: any) => item.agent === "collab-web" && item.status === "accepted"),
    agentCoordinationHeartbeatVisible: card.agent_coordination?.heartbeat?.some((item: any) => /collab-web/.test(item.text)),
    agentCoordinationContractSyncVisible: card.agent_coordination?.contract_sync?.required === true && card.agent_coordination?.contract_sync?.status === "structured",
    agentCoordinationReceiptQualityScores: card.agent_coordination?.receipt_quality?.some((item: any) => item.agent === "collab-web" && item.quality?.grade === "good"),
    agentCoordinationTargetedReworkForMissingEvidence: missingEvidenceCard.agent_coordination?.targeted_rework?.some((item: any) => item.id === "missing_diff") && missingEvidenceCard.agent_coordination?.targeted_rework?.some((item: any) => item.id === "missing_verification"),
    agentCoordinationAckReviewApproved: card.agent_coordination?.ack_review?.rows?.some((item: any) => item.agent === "collab-web" && item.status === "approved"),
    agentCoordinationContractTransferReady: card.agent_coordination?.contract_transfer?.rows?.some((item: any) => item.target === "collab-web" && item.status === "ready_to_inject"),
    ackGapBlocksCompletion: canCompleteDailyDevFromDeliverySummary(ackGapTask, { status: "done" }, ackGapTask.delivery_summary) === false,
    ackGapCreatesRewriteDraft: getTaskGapItems(ackGapTask).some((item: string) => item.startsWith("ack_rewrite:collab-web")) && ackGapDraft.includes("需要先返工的 ACK 前置审核"),
    contractGapCreatesInjectionDraft: getTaskGapItems(contractGapTask).some((item: string) => item.startsWith("contract_inject:collab-web")) && contractGapDraft.includes("需要注入依赖 Agent 的 contractChanges") && contractGapDraft.includes("collab-web"),
    contractInjectionGateRecognizesConsumerRerun: contractInjectedGate.pass === true && contractInjectedGate.rows[0]?.assignment_message_id === "m-contract",
    contractInjectionGateRejectsGenericApiAssignment: contractGenericApiGate.pass === false && contractGenericApiGate.rows[0]?.assignment_message_id === "",
    agentCoordinationEventStreamVisible: ["work_order_sent", "ack_received", "contract_changed", "receipt_scored"].every(type => card.agent_coordination?.coordination_events?.some((item: any) => item.type === type)),
    acceptanceReviewIncludesAckGate: card.acceptance_review?.checks?.some((item: any) => item.id === "ack_gate" && item.ok),
    agentCoordinationContractInjectAction: card.agent_coordination?.targeted_rework?.some((item: any) => item.id === "contract_inject" && item.target === "collab-web"),
    reportHasFourUserSections: ["完成内容", "变更文件", "验证结果", "风险与待确认"].every(label => report.includes(label)),
    reportHidesProtocol: !/CCM_AGENT_RECEIPT|Trace|session|scratchpad|门禁|派发证据/i.test(report),
    groupReportFormatsObjects: groupReport.includes("frontend/app.js") && !groupReport.includes("[object Object]"),
    acknowledgementHasCleanPunctuation: !acknowledgement.includes("。。"),
    followupClassification: classifyTaskContinuation("再加一个负责人筛选") === "supplement" && classifyTaskContinuation("目标调整为只改前端") === "revise_goal" && classifyTaskContinuation("这是一个新任务：部署测试环境") === "new_task",
    followupDetection: looksLikeTaskContinuation("再加一个状态筛选"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, card, report };
}

function buildInlineTaskRuntime(task: any) {
  const executions = listExecutions({ taskId: task.id });
  const sessions = listTaskAgentSessions({ taskId: task.id });
  const running = executions.filter(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state));
  const failed = executions.filter(item => item.state === "failed");
  const reviewing = executions.filter(item => item.state === "reviewing");
  const mergeReady = executions.filter(item => item.green?.level === "merge_ready");
  return {
    taskId: task.id,
    status: task.status,
    statusText: task.status_detail || "",
    updatedAt: task.updated_at || new Date().toISOString(),
    lifecycle: deriveTaskLifecycle(task, executions),
    reasoning: task.reasoning_loop ? {
      planVersion: Number(task.reasoning_loop.plan_version || 0),
      openAssertions: (task.reasoning_loop.assertions || []).filter((item: any) => item.status !== "passed").length,
      deviations: (task.reasoning_loop.deviations || []).length,
      recoveryChecks: (task.reasoning_loop.recovery_checks || []).length,
      lastDecision: task.reasoning_loop.explanations?.[task.reasoning_loop.explanations.length - 1] || null,
    } : null,
    counts: { total: executions.length, running: running.length, reviewing: reviewing.length, failed: failed.length, mergeReady: mergeReady.length },
    agents: executions.map(item => ({
      project: item.project,
      state: item.state,
      green: item.green?.level || "none",
      failureClass: item.failure?.failureClass || "",
      runtimeFallbacks: (item.events || []).filter((event: any) => event.name === "runtime.fallback").length,
      conflictGroup: item.workspace?.conflictGroup || "",
    })),
    sessions: sessions.map(session => ({
      project: session.project,
      agentType: session.agentType,
      status: session.status,
      nativeSessionId: session.nativeSessionId || "",
      ...getTaskAgentSessionContinuity(session),
    })),
    taskCard: buildTaskCardView(task, executions, sessions),
    task_card: buildTaskCardView(task, executions, sessions),
  };
}

function updateGroupTaskInlineStatus(task: any, status: string, detail = "") {
  if (!task?.group_id || !task?.id) return null;
  const messages = getGroupMessages(task.group_id);
  const runtime = buildInlineTaskRuntime({ ...task, status, status_detail: detail || task.status_detail });
  let changed = false;
  const next = messages.map((message: any) => {
    if (message?.task_id !== task.id) return message;
    changed = true;
    return {
      ...message,
      task: message.task ? { ...message.task, status, status_detail: detail || task.status_detail || "" } : message.task,
      taskRuntime: runtime,
      task_runtime: runtime,
      workflow: { ...(message.workflow || {}), phase: status === "done" ? "complete" : status === "failed" || status === "cancelled" ? "needs_rework" : status === "in_progress" ? "executing" : (message.workflow?.phase || "dispatching"), updated_at: new Date().toISOString() },
    };
  });
  if (changed) saveGroupMessages(task.group_id, next);
  return runtime;
}

function loadAgentQaItems() {
  if (!fs.existsSync(AGENT_QA_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(AGENT_QA_FILE, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAgentQaItems(items: any[]) {
  fs.writeFileSync(AGENT_QA_FILE, JSON.stringify((items || []).slice(-800), null, 2));
}

function upsertAgentQaItem(item: any) {
  const items = loadAgentQaItems();
  const idx = items.findIndex((entry: any) => entry.id === item.id);
  const existing = idx >= 0 ? items[idx] : {};
  const now = new Date().toISOString();
  const next = {
    created_at: existing.created_at || item.created_at || now,
    retry_count: Number(existing.retry_count || item.retry_count || 0),
    manual_takeover: !!(existing.manual_takeover || item.manual_takeover),
    ...existing,
    ...item,
    updated_at: now,
  };
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  saveAgentQaItems(items);
  return next;
}

function markExpiredAgentQaItems(groupId = "") {
  const nowMs = Date.now();
  const items = loadAgentQaItems();
  let changed = false;
  const expired: any[] = [];
  for (const item of items) {
    if (groupId && item.group_id !== groupId) continue;
    if (!["waiting", "asking", "queued"].includes(String(item.status || ""))) continue;
    const timeoutAt = item.timeout_at ? Date.parse(item.timeout_at) : 0;
    if (!timeoutAt || timeoutAt > nowMs) continue;
    item.status = "timeout";
    item.timed_out_at = new Date().toISOString();
    item.updated_at = item.timed_out_at;
    item.audit = [...(Array.isArray(item.audit) ? item.audit : []), { at: item.timed_out_at, type: "timeout", detail: "目标 Agent 未在预期时间内回答" }].slice(-30);
    appendAgentQaTrace(item.task_id || "", "agent.qa.timeout", item, "目标 Agent 未在截止时间前回答，等待主 Agent 重试、换人或人工接管", "warn", { deadline_at: item.deadline_at || item.timeout_at || "" });
    if (item.task_id) appendTaskTimelineEvent(item.task_id, { type: "agent_qa_timeout", title: `${item.to_agent || "目标 Agent"} 回答超时`, detail: `问题 ${item.id} 已触发超时熔断`, status: "warn", phase: "waiting_dependency", agent: item.from_agent || "", data: { qa_id: item.id, deadline_at: item.deadline_at || item.timeout_at || "" } });
    expired.push(item);
    changed = true;
  }
  if (changed) saveAgentQaItems(items);
  return expired;
}

function getAgentQaItemsForGroup(groupId: string, limit = 80) {
  markExpiredAgentQaItems(groupId || "");
  return loadAgentQaItems()
    .filter((item: any) => !groupId || item.group_id === groupId)
    .slice(-limit);
}

function setAgentQaManualTakeover(id: string, reason = "") {
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return null;
  return upsertAgentQaItem({
    ...current,
    status: "manual",
    manual_takeover: true,
    manual_reason: compactMemoryText(reason || "用户接管该 Agent 问答", 500),
    manual_at: new Date().toISOString(),
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: new Date().toISOString(), type: "manual_takeover", detail: reason || "用户接管" }].slice(-30),
  });
}

function buildAgentQaMessage(kind: "question" | "answer" | "resume", qa: any, content = "") {
  const qaContent = content || qa.answer || qa.question || "";
  return {
    id: "m" + Date.now().toString(36) + "qa" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: kind === "answer" ? qa.to_agent : qa.from_agent,
    type: "agent_qa",
    content: qaContent,
    timestamp: new Date().toISOString(),
    task_id: qa.task_id || undefined,
    qa: {
      ...qa,
      kind,
      status: kind === "question" ? "waiting" : qa.status || "answered",
    },
  };
}

function emitAgentQaEvent(streamRes: any, kind: "question" | "answer" | "resume", qa: any, content = "") {
  writeSse(streamRes, {
    type: "agent_qa",
    kind,
    qa: {
      ...qa,
      kind,
      content: content || qa.answer || qa.question || "",
    },
  });
}

function setAgentQaArbitration(id: string, decision: "accept" | "reject", reason = "") {
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return null;
  const at = new Date().toISOString();
  const accepted = decision === "accept";
  const next = upsertAgentQaItem({
    ...current,
    status: accepted ? "answered" : "rejected",
    acceptance: {
      ...(current.acceptance || {}),
      status: accepted ? "accepted" : "rejected",
      accepted,
      reason: compactMemoryText(reason || (accepted ? "主 Agent 人工采纳回答" : "主 Agent 人工拒绝回答"), 800),
      arbitrated_by: "group_coordinator_manual",
      arbitrated_at: at,
    },
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at, type: accepted ? "manual_accept" : "manual_reject", detail: reason || "主 Agent 人工仲裁" }].slice(-30),
  });
  appendAgentQaTrace(next.task_id || "", accepted ? "agent.qa.accepted" : "agent.qa.rejected", next, next.acceptance.reason, accepted ? "ok" : "warn", { acceptance: next.acceptance });
  if (accepted) writeAcceptedAgentQaToProjectMemory(next);
  if (next.task_id) appendTaskTimelineEvent(next.task_id, { type: accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `主 Agent ${accepted ? "采纳" : "拒绝"}问答`, detail: next.acceptance.reason, status: accepted ? "ok" : "warn", phase: accepted ? "executing" : "waiting_dependency", agent: next.from_agent || "", data: { qa_id: next.id, acceptance: next.acceptance } });
  return next;
}

function appendAgentQaTrace(taskId: string, type: string, qa: any, message: string, status = "info", data: any = {}) {
  if (!taskId) return "";
  const task = getTaskById(taskId);
  if (!task) return "";
  const traceId = ensureTraceId(task.trace_id || "", `task_${taskId}`);
  if (traceId !== task.trace_id) updateTask(taskId, { trace_id: traceId });
  appendTraceEvent(traceId, {
    id: `${qa?.id || qa?.question_id || "qa"}:${type}:${Date.now()}`,
    type,
    status,
    task_id: taskId,
    group_id: qa?.group_id || task.group_id || "",
    agent: qa?.from_agent || "",
    message: compactMemoryText(message, 1000),
    data: { qa_id: qa?.id || qa?.question_id || "", from: qa?.from_agent || "", to: qa?.to_agent || "", ...data },
  });
  return traceId;
}

function writeAcceptedAgentQaToProjectMemory(qa: any) {
  if (!qa?.acceptance?.accepted || Number(qa.acceptance.score || 0) < 60 || !qa.from_agent) return null;
  try {
    return updateProjectMemoryFromReceipt({
      project: qa.from_agent,
      workDir: qa.continuation?.source_work_dir || "",
      groupId: qa.group_id || "",
      taskId: qa.task_id || "",
      receipt: {
        status: "done",
        summary: `Agent 协作结论：${compactMemoryText(qa.question, 260)} → ${compactMemoryText(qa.answer, 700)}`,
        filesChanged: [],
        verification: [],
        newDecisions: [{
          decision: compactMemoryText(qa.answer, 1000),
          reason: `由 ${qa.to_agent} 回答 ${qa.from_agent}，主 Agent 证据门禁评分 ${qa.acceptance.score}${qa.answer_evidence?.length ? `；证据：${qa.answer_evidence.slice(0, 6).join("、")}` : ""}`,
          source: "agent_collaboration_8",
        }],
      },
    });
  } catch (error: any) {
    safeAddGroupLog(qa.group_id || "", "warning", "agent_qa_memory", `Agent 问答写入项目记忆失败：${error?.message || error}`, { qa_id: qa.id });
    return null;
  }
}

function getGroupMemoryFile(groupId: string) {
  return path.join(GROUP_MEMORY_DIR, `${groupId}.json`);
}

function getGroupMemoryBackupFile(groupId: string) {
  return `${getGroupMemoryFile(groupId)}.bak`;
}

function createEmptyGroupMemory(groupId: string) {
  return {
    groupId,
    goal: "",
    summary: "",
    currentPhase: "idle",
    decisions: [],
    completed: [],
    blocked: [],
    workerLedger: [],
    agentMemories: {},
    messageDigest: "",
    messageCompression: { enabled: true, recentLimit: 12, olderLimit: 30, totalMessages: 0, compressedMessages: 0, lastCompressedAt: "" },
    openQuestions: [],
    nextActions: [],
    updated_at: new Date().toISOString(),
  };
}

function loadGroupMemory(groupId: string) {
  const file = getGroupMemoryFile(groupId);
  if (!fs.existsSync(file)) return createEmptyGroupMemory(groupId);
  try {
    return { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(file, "utf-8")) };
  } catch {
    const backup = getGroupMemoryBackupFile(groupId);
    try {
      const recovered = { ...createEmptyGroupMemory(groupId), ...JSON.parse(fs.readFileSync(backup, "utf-8")) };
      const temp = `${file}.${process.pid}.recover.tmp`;
      fs.writeFileSync(temp, JSON.stringify(recovered, null, 2), "utf-8");
      fs.renameSync(temp, file);
      return recovered;
    } catch {}
    return createEmptyGroupMemory(groupId);
  }
}

function saveGroupMemory(groupId: string, memory: any) {
  if (!fs.existsSync(GROUP_MEMORY_DIR)) fs.mkdirSync(GROUP_MEMORY_DIR, { recursive: true });
  const next = compressGroupMemory({
    ...createEmptyGroupMemory(groupId),
    ...(memory || {}),
    groupId,
    updated_at: new Date().toISOString(),
  });
  const file = getGroupMemoryFile(groupId);
  const backup = getGroupMemoryBackupFile(groupId);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  if (fs.existsSync(file)) {
    try {
      JSON.parse(fs.readFileSync(file, "utf-8"));
      fs.copyFileSync(file, backup);
    } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(temp, file);
  return next;
}

export function runGroupMemoryStorageRecoverySelfTest() {
  const groupId = `memory-storage-self-test-${process.pid}-${Date.now()}`;
  const file = getGroupMemoryFile(groupId);
  const backup = getGroupMemoryBackupFile(groupId);
  try {
    const first = saveGroupMemory(groupId, { goal: "first-valid-state", decisions: [{ decision: "keep" }] });
    saveGroupMemory(groupId, { goal: "second-valid-state" });
    fs.writeFileSync(file, "{broken-json", "utf-8");
    const recovered = loadGroupMemory(groupId);
    const checks = {
      atomicFileIsValidJson: (() => { try { JSON.parse(fs.readFileSync(file, "utf-8")); return true; } catch { return false; } })(),
      backupRecoveryWorks: recovered.goal === first.goal && recovered.decisions?.[0]?.decision === "keep",
      backupExists: fs.existsSync(backup),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    for (const target of [file, backup]) try { fs.unlinkSync(target); } catch {}
  }
}

function uniqueByKey(items: any[], keyFn: (item: any) => string, limit = 20) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of [...(items || [])].reverse()) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.unshift(item);
  }
  return result.slice(-limit);
}

function compactMemoryText(value: any, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function compactPreserveLines(value: any, max = 2200) {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}

function summarizeMemoryItems(title: string, items: any[], mapper: (item: any) => string) {
  const values = (items || []).map(mapper).filter(Boolean);
  if (!values.length) return "";
  return `${title}: ${values.join("；")}`;
}

function compressGroupMemory(memory: any) {
  const next = { ...(memory || {}) };
  const summaryParts: string[] = [];
  const compressList = (key: string, keep = 8, title = key, mapper = (item: any) => JSON.stringify(item)) => {
    const items = Array.isArray(next[key]) ? next[key] : [];
    if (items.length <= keep) return;
    const oldItems = items.slice(0, Math.max(0, items.length - keep));
    next[key] = items.slice(-keep);
    const summary = summarizeMemoryItems(title, oldItems, mapper);
    if (summary) summaryParts.push(summary);
  };

  compressList("decisions", 8, "历史决策", (item: any) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
  compressList("completed", 10, "历史完成", (item: any) => `${item.project || "unknown"}:${item.summary || ""}`);
  compressList("blocked", 8, "历史阻塞", (item: any) => `${item.project || "unknown"}:${item.reason || ""}`);
  compressList("workerLedger", 18, "历史 Worker 通知", (item: any) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
  if (!next.agentMemories || !Object.keys(next.agentMemories || {}).length) {
    next.agentMemories = normalizeAgentMemories({}, next.workerLedger || []);
  }
  compressList("openQuestions", 6, "历史问题", (item: any) => String(item.question || item));
  compressList("nextActions", 6, "历史下一步", (item: any) => String(item.action || item));

  const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
  next.summary = compactMemoryText(mergedSummary, 1800);
  return next;
}

function buildGroupMemoryContext(memory: any) {
  if (!memory || (!memory.goal && !memory.decisions?.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !Object.keys(memory.agentMemories || {}).length && !memory.openQuestions?.length && !memory.nextActions?.length)) {
    return "";
  }
  const lines = [
    "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
    `- 原始/当前目标：${memory.goal || "未记录"}`,
    `- 当前阶段：${memory.currentPhase || "idle"}`,
  ];
  if (memory.summary) lines.push(`- 压缩摘要：${compactMemoryText(memory.summary, 900)}`);
  if (memory.messageDigest) lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 900)}`);
  if (memory.messageCompression?.compressedMessages) lines.push(`- 压缩状态：共 ${memory.messageCompression.totalMessages || 0} 条消息，旧消息压缩 ${memory.messageCompression.compressedMessages || 0} 条，近期原文 ${memory.messageCompression.recentLimit || 0} 条。`);
  const addList = (title: string, items: any[], mapper: (item: any) => string) => {
    if (!items?.length) return;
    lines.push(`- ${title}：`);
    for (const item of items.slice(-6)) lines.push(`  - ${mapper(item)}`);
  };
  addList("关键决策", memory.decisions || [], (item: any) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
  addList("已完成", memory.completed || [], (item: any) => `${item.project || "unknown"}：${item.summary || ""}`);
  addList("阻塞/未完成", memory.blocked || [], (item: any) => `${item.project || "unknown"}：${item.reason || ""}`);
  addList("Worker scratchpad", memory.workerLedger || [], (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
  addList("开放问题", memory.openQuestions || [], (item: any) => String(item.question || item));
  addList("下一步", memory.nextActions || [], (item: any) => String(item.action || item));
  return lines.join("\n");
}

function normalizeAgentMemoryProject(project: string) {
  return String(project || "").trim() || "unknown";
}

function formatAgentMemoryReceipt(item: any) {
  return [
    `[${item.status || item.receiptStatus || "unknown"}]`,
    item.summary || "无摘要",
    item.filesChanged?.length ? `文件：${item.filesChanged.slice(0, 6).join("、")}` : "",
    item.verification?.length ? `验证：${item.verification.slice(0, 4).join("、")}` : "",
    item.blockers?.length ? `阻塞：${item.blockers.slice(0, 3).join("、")}` : "",
    item.needs?.length ? `需要：${item.needs.slice(0, 3).join("、")}` : "",
  ].filter(Boolean).join("；");
}

function createEmptyAgentMemory(project: string) {
  return {
    project: normalizeAgentMemoryProject(project),
    summary: "",
    recentReceipts: [],
    frequentFiles: [],
    verificationHints: [],
    blockers: [],
    needs: [],
    stats: { totalReceipts: 0, compressedReceipts: 0, recentReceipts: 0, lastUpdatedAt: "" },
  };
}

function upsertAgentMemory(agentMemories: any = {}, item: any = {}) {
  const normalized = normalizeWorkerLedgerItem(item);
  const project = normalizeAgentMemoryProject(normalized.project);
  if (!project || project === "unknown") return agentMemories || {};
  const current = { ...createEmptyAgentMemory(project), ...((agentMemories || {})[project] || {}) };
  const entry = {
    time: normalized.time,
    taskId: normalized.taskId,
    status: normalized.status,
    receiptStatus: normalized.receiptStatus,
    summary: compactMemoryText(normalized.summary, 420),
    filesChanged: normalized.filesChanged || [],
    verification: normalized.verification || [],
    blockers: normalized.blockers || [],
    needs: normalized.needs || [],
  };
  const allReceipts = uniqueByKey([...(current.recentReceipts || []), entry], (x: any) => [x.taskId || "", x.status || "", x.receiptStatus || "", x.summary || ""].join("|"), 20);
  const older = allReceipts.slice(0, Math.max(0, allReceipts.length - 8));
  const recentReceipts = allReceipts.slice(-8);
  const summaryParts = [current.summary || "", ...older.map((x: any) => formatAgentMemoryReceipt(x))].filter(Boolean);
  const files = Array.from(new Set([...(current.frequentFiles || []), ...(entry.filesChanged || [])].filter(Boolean))).slice(-20);
  const verification = Array.from(new Set([...(current.verificationHints || []), ...(entry.verification || [])].filter(Boolean))).slice(-20);
  const blockers = Array.from(new Set([...(current.blockers || []), ...(entry.blockers || [])].filter(Boolean))).slice(-20);
  const needs = Array.from(new Set([...(current.needs || []), ...(entry.needs || [])].filter(Boolean))).slice(-20);
  const totalReceipts = Math.max(Number(current.stats?.totalReceipts || 0) + 1, recentReceipts.length + Number(current.stats?.compressedReceipts || 0));
  return {
    ...(agentMemories || {}),
    [project]: {
      project,
      summary: compactMemoryText(summaryParts.join(" | "), 1800),
      recentReceipts,
      frequentFiles: files,
      verificationHints: verification,
      blockers,
      needs,
      stats: {
        totalReceipts,
        compressedReceipts: Math.max(0, totalReceipts - recentReceipts.length),
        recentReceipts: recentReceipts.length,
        lastUpdatedAt: new Date().toISOString(),
      },
    },
  };
}

function normalizeAgentMemories(agentMemories: any = {}, workerLedger: any[] = []) {
  let next = { ...(agentMemories || {}) };
  for (const item of workerLedger || []) next = upsertAgentMemory(next, item);
  return next;
}

function buildAgentMemoryPacket(groupId: string, targetProject: string, task = "") {
  const memory = loadGroupMemory(groupId);
  const project = normalizeAgentMemoryProject(targetProject);
  const agentMemory = { ...createEmptyAgentMemory(project), ...((memory.agentMemories || {})[project] || {}) };
  const ownCompleted = (memory.completed || []).filter((item: any) => item.project === project).slice(-4);
  const otherCompleted = (memory.completed || []).filter((item: any) => item.project !== project).slice(-4);
  const ownBlocked = (memory.blocked || []).filter((item: any) => item.project === project).slice(-4);
  const globalBlocked = (memory.blocked || []).filter((item: any) => item.project !== project).slice(-3);
  const relatedLedger = (memory.workerLedger || []).filter((item: any) => item.project !== project).slice(-5);
  const lines = [
    "子 Agent 受控记忆包（平台生成，优先级高于第三方 CLI 自带历史）：",
    `- 目标子 Agent：${project}`,
    `- 群聊目标：${memory.goal || "未记录"}`,
    `- 当前阶段：${memory.currentPhase || "idle"}`,
    "- 记忆边界：只以本包、本轮任务、近期原文窗口和明确前置输出为准；不要假定 Claude Code/Cursor/Codex 等第三方 Agent 内部 session 记得旧上下文。",
    "- 上下文策略：旧消息已由 CCM 平台压缩；如果需要原文，应在回执 needs 中按 message id 请求用户或主 Agent 补充。",
  ];
  if (agentMemory.stats?.totalReceipts) {
    lines.push(`- 子 Agent 记忆统计：总回执 ${agentMemory.stats.totalReceipts}，压缩 ${agentMemory.stats.compressedReceipts || 0}，近期保留 ${agentMemory.stats.recentReceipts || 0}。`);
  }
  if (agentMemory.summary) lines.push(`- 你的长期压缩摘要：${compactMemoryText(agentMemory.summary, 900)}`);
  if (memory.summary) lines.push(`- 群聊全局压缩摘要：${compactMemoryText(memory.summary, 500)}`);
  if (memory.messageDigest) lines.push(`- 群聊旧消息压缩：${compactMemoryText(memory.messageDigest, 500)}`);
  if (task) lines.push(`- 你本次任务：${compactMemoryText(task, 900)}`);
  const addList = (title: string, items: any[], mapper: (item: any) => string, limit = 6) => {
    const list = (items || []).filter(Boolean).slice(-limit);
    if (!list.length) return;
    lines.push(`- ${title}：`);
    for (const item of list) lines.push(`  - ${mapper(item)}`);
  };
  addList("你的近期结构化回执", agentMemory.recentReceipts || [], (item: any) => formatAgentMemoryReceipt(item), 8);
  addList("你常涉及的文件", agentMemory.frequentFiles || [], (item: any) => String(item), 10);
  addList("你已有验证线索", agentMemory.verificationHints || [], (item: any) => String(item), 8);
  addList("你仍需处理的阻塞", [...(agentMemory.blockers || []), ...(agentMemory.needs || [])], (item: any) => String(item), 8);
  addList("你之前的完成记录", ownCompleted, (item: any) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`, 4);
  addList("其他 Agent 已完成", otherCompleted, (item: any) => `${item.project || "unknown"}：${item.summary || ""}`, 4);
  addList("其他 Agent 近期回执", relatedLedger, (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`, 5);
  addList("与你相关的阻塞", ownBlocked, (item: any) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`, 4);
  addList("全局阻塞", globalBlocked, (item: any) => `${item.project || "unknown"}：${item.reason || ""}`, 3);
  addList("开放问题", memory.openQuestions || [], (item: any) => String(item.question || item), 4);
  addList("下一步", memory.nextActions || [], (item: any) => String(item.action || item), 4);
  lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改；必须用 memoryUsed / memoryIgnored 声明本轮是否使用了本记忆包、项目记忆、历史结论、共享文档或知识库。");
  return lines.join("\n");
}

function getGroupMessageMemoryWho(message: any) {
  if (message?.role === "user") return `[用户 -> ${message.target || "all"}]`;
  if (message?.role === "thinking") return "[系统思考]";
  return `[${message?.agent || "Agent"}]`;
}

function buildGroupMessageMemoryLine(message: any, max = 260) {
  const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
  const id = message?.id ? `#${message.id}` : "#local";
  const who = getGroupMessageMemoryWho(message);
  const content = compactMemoryText(message?.content || message?.delivery_summary?.headline || "", max);
  const extras: string[] = [];
  if (Array.isArray(message?.assignments) && message.assignments.length) {
    extras.push(`派发:${message.assignments.slice(0, 4).map((item: any) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
  }
  if (message?.fileChanges?.count) extras.push(`文件变更:${message.fileChanges.count}`);
  if (message?.delivery_summary?.headline) extras.push(`交付:${compactMemoryText(message.delivery_summary.headline, 120)}`);
  return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}

function buildCompressedGroupMessageDigest(messages: any[], limit = 30) {
  const source = (messages || []).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  if (!source.length) return "";
  const omitted = Math.max(0, source.length - limit);
  const lines = source.slice(-limit).map((message: any) => buildGroupMessageMemoryLine(message, 220));
  if (omitted > 0) lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
  return lines.join("\n");
}

function buildGroupContextPacket(groupId: string, options: any = {}) {
  const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
  const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
  const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
  const allMessages = getGroupMessages(groupId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const recentMessages = allMessages.slice(-recentLimit);
  const olderMessages = allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
  const digest = buildCompressedGroupMessageDigest(olderMessages, olderLimit);
  const compression = {
    enabled: true,
    recentLimit,
    olderLimit,
    totalMessages: allMessages.length,
    compressedMessages: olderMessages.length,
    recentMessages: recentMessages.length,
    lastCompressedAt: new Date().toISOString(),
  };
  const memory = saveGroupMemory(groupId, {
    ...loadGroupMemory(groupId),
    messageDigest: digest,
    messageCompression: compression,
  });
  const sections = [buildGroupMemoryContext(memory)];
  if (digest) {
    sections.push([
      "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
      digest,
    ].join("\n"));
  }
  if (recentMessages.length) {
    sections.push([
      `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
      buildRecentGroupContext(recentMessages, fullCount),
    ].join("\n"));
  }
  return sections.filter(Boolean).join("\n\n");
}
function buildChildAgentDevelopmentContract(targetProject: string, taskText = "", options: any = {}) {
  const requiresCodeChanges = options.requires_code_changes !== false && options.requiresCodeChanges !== false;
  const source = options.source ? `- 来源：${options.source}` : "";
  const acceptance = options.acceptance || options.acceptance_criteria || options.acceptanceCriteria || "";
  const verificationHints = Array.isArray(options.verification_hints || options.verificationHints)
    ? (options.verification_hints || options.verificationHints).map((item: any) => String(item || "").trim()).filter(Boolean)
    : [];
  const capabilityProfile = options.capability_profile || options.capabilityProfile || getProjectAgentCapabilityProfile(targetProject, options.work_dir || options.workDir || "");
  const capabilityLines = buildProjectAgentProfileContractLines(capabilityProfile);
  return [
    "子 Agent 开发契约（必须遵守）：",
    `- 你的身份：${targetProject} 项目子 Agent。只在自己的项目职责和工作目录内处理。`,
    source,
    ...capabilityLines,
    taskText ? `- 本次工作单：${compactMemoryText(taskText, 900)}` : "",
    acceptance ? `- 验收标准：${compactMemoryText(acceptance, 900)}` : "",
    requiresCodeChanges
      ? "- 完成条件：必须产生可捕获的实际文件变更；没有实际变更时不得把 status 写为 done。"
      : "- 完成条件：如不需要代码变更，必须说明原因、产出和验证依据。",
    "- 实施要求：先理解上下文，再做最小必要改动；不要改无关模块，不要删除用户已有改动。",
    "- 接单确认：开始执行前先用 1-3 句话确认你理解的目标、准备查看/修改的范围；如果范围不清楚，先写 blocked/needs_info，不要盲改。",
    "- 进度心跳：长任务中请在关键阶段说明当前状态，例如正在读文件、正在修改、正在运行验证、等待依赖或遇到阻塞；不要长时间无状态输出。",
    "- 契约同步：如果你改动接口、字段、schema、路由、类型、配置或前后端契约，必须在回执 actions/summary 中写清契约变化，方便主 Agent 通知依赖 Agent。",
    "- 验证要求：只记录实际运行过的命令或人工核验；未运行的验证必须明确写成建议，不能伪造。",
    verificationHints.length ? `- 推荐优先执行的项目验证：${verificationHints.slice(0, 6).join("；")}` : "",
    verificationHints.length ? "- 项目验证命令会通过 Claude Code allowed-tools 按项目配置预授权；必须先真实尝试运行，只有看到本轮命令输出确实失败/阻塞时，才能写 blocked 或建议人工补跑。" : "",
    "- 阻塞处理：缺字段、缺权限、接口不明确、环境失败时，status 写 blocked/needs_info，并列出需要谁补什么。",
    "- 记忆使用要求：如果本轮使用了平台注入的群聊摘要、项目记忆、历史结论、共享文档或知识库，请在回执 memoryUsed 写明使用项；如果没有使用或无法判断，请在 memoryIgnored 写明原因。",
    "- 回执质量要求：status=done 只有在目标覆盖、文件/产出和验证证据都齐全时才能写；缺文件、缺验证、仍有依赖或不确定时写 blocked/needs_info/partial。",
    "- ACK 结构要求：CCM_AGENT_RECEIPT 中必须包含 ack 对象，字段包括 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear；如果不清楚，unclear 必须列出问题且 status 不得写 done。",
    "- contractChanges 结构要求：如果涉及接口、字段、schema、路由、类型、配置或前后端契约变化，CCM_AGENT_RECEIPT 中必须包含 contractChanges 数组，写明 type、endpoint/path、request、response、fields、consumers、note。",
    "- 回执要求：回复末尾必须包含 JSON 格式 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、ack、contractChanges、memoryUsed、memoryIgnored。",
  ].filter(Boolean).join("\n");
}

function normalizeWorkerLedgerItem(item: any = {}) {
  return {
    time: item.time || new Date().toISOString(),
    taskId: String(item.taskId || item.task_id || "").trim(),
    project: String(item.project || item.agent || "").trim(),
    status: String(item.status || "").trim(),
    receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
    summary: compactMemoryText(item.summary || "", 320),
    filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
    verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
    blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
    needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
    memoryUsed: normalizeStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
    memoryIgnored: normalizeStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
  };
}

function findLatestWorkerLedger(memory: any, project: string) {
  const target = String(project || "").trim();
  if (!target) return null;
  return [...(memory?.workerLedger || [])].reverse().find((item: any) => item.project === target) || null;
}

function appendWorkerLedger(memory: any, item: any) {
  const normalized = normalizeWorkerLedgerItem(item);
  if (!normalized.project && !normalized.summary) return memory;
  return {
    ...(memory || {}),
    workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x: any) => [
      x.taskId || "",
      x.project || "",
      x.status || "",
      x.summary || "",
    ].join("|"), 40),
  };
}

function getTaskById(taskId: string) {
  if (!taskId) return null;
  return loadTasks().find((task: any) => task.id === taskId) || null;
}

function buildChildAgentTaskText(childTaskText: string, task: any = null) {
  if (!task || task.workflow_type !== "daily_dev") return childTaskText;
  return [
    "原始业务开发任务上下文：",
    `- 任务：${task.title || "未命名任务"}`,
    task.business_goal || task.businessGoal ? `- 业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 700)}` : "",
    task.acceptance_criteria || task.acceptanceCriteria ? `- 全局验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 700)}` : "",
    task.source_documents || task.sourceDocuments ? `- 关联文档摘要：${compactMemoryText(task.source_documents || task.sourceDocuments, 900)}` : "",
    "",
    "主 Agent 指派给你的子任务：",
    childTaskText || "请根据原始业务开发任务上下文完成你负责的实现与验证。",
  ].filter(line => line !== "").join("\n");
}

function buildQueuedGroupTaskMessage(task: any) {
  const base = [
    `📋 执行任务：${task.title}`,
    task.description || "",
  ].filter(Boolean).join("\n");
  if (task?.workflow_type !== "daily_dev") {
    return `${base}\n\n请完成此任务并回复 "✅ 任务完成"。`;
  }

  const requiresCodeChanges = taskRequiresCodeChanges(task);
  const requiresVerification = taskRequiresVerification(task);
  return [
    "【主 Agent 业务开发工作单】",
    `任务标题：${task.title || "未命名任务"}`,
    `业务目标：${compactMemoryText(task.business_goal || task.businessGoal || task.title || "", 900)}`,
    task.acceptance_criteria || task.acceptanceCriteria
      ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 900)}`
      : "",
    task.source_documents || task.sourceDocuments
      ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1200)}`
      : "",
    "",
    "完整任务说明：",
    task.description || "无",
    "",
    "执行要求：",
    "- 先根据业务目标、文档和验收标准判断影响范围，再派发给对应项目子 Agent。",
    "- 每个被派发的子 Agent 必须拿到明确的实现范围、文件/模块方向、验收标准和风险提示。",
    "- 子 Agent 必须返回 CCM_AGENT_RECEIPT；缺回执、缺证据或状态不是 done 时不能判定完成。",
    requiresCodeChanges
      ? "- 完成门禁：必须有系统实际捕获的代码/配置/文档文件变更。"
      : "- 本任务允许无代码变更，但最终报告必须说明可验收产出和依据。",
    requiresVerification
      ? "- 验证门禁：必须有可采信的已执行验证记录；只写建议运行、未运行或失败验证不能完成。"
      : "- 本任务不强制验证门禁，但仍建议记录实际检查依据。",
    "- 主 Agent 必须等待子 Agent 完成并复盘；发现缺口时继续返工或向用户明确索要信息。",
    "- 最终报告必须说明完成内容、涉及项目/文件、已执行验证、风险、阻塞和仍需用户确认的事项。",
  ].filter(line => line !== "").join("\n");
}

function updateGroupMemory(groupId: string, patch: any = {}) {
  const memory = loadGroupMemory(groupId);
  const next = { ...memory };
  if (patch.goal && !next.goal) next.goal = compactMemoryText(patch.goal, 500);
  if (patch.currentPhase) next.currentPhase = patch.currentPhase;
  if (patch.decision) {
    next.decisions = uniqueByKey([...(next.decisions || []), {
      time: new Date().toISOString(),
      decision: compactMemoryText(patch.decision, 260),
      reason: compactMemoryText(patch.reason || "", 220),
    }], (item: any) => `${item.decision}|${item.reason}`, 20);
  }
  if (patch.completed) {
    const item = patch.completed;
    next.completed = uniqueByKey([...(next.completed || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      summary: compactMemoryText(item.summary || "", 260),
      filesChanged: item.filesChanged || [],
      verification: item.verification || [],
    }], (x: any) => `${x.project}|${x.summary}`, 30);
    next.blocked = (next.blocked || []).filter((x: any) => x.project !== item.project);
  }
  if (patch.blocked) {
    const item = patch.blocked;
    next.blocked = uniqueByKey([...(next.blocked || []), {
      time: new Date().toISOString(),
      project: item.project || "",
      reason: compactMemoryText(item.reason || "", 260),
      needs: item.needs || [],
    }], (x: any) => `${x.project}|${x.reason}`, 30);
  }
  if (patch.messageDigest) {
    next.messageDigest = compactMemoryText([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
  }
  if (patch.messageCompression) {
    next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
  }
  if (patch.workerLedger || patch.workerNotification) {
    const item = patch.workerLedger || patch.workerNotification;
    const merged = appendWorkerLedger(next, item);
    next.workerLedger = merged.workerLedger || [];
    next.agentMemories = upsertAgentMemory(next.agentMemories || {}, item);
  }
  if (patch.openQuestion) {
    next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
      time: new Date().toISOString(),
      question: compactMemoryText(patch.openQuestion, 260),
    }], (x: any) => x.question, 20);
  }
  if (patch.nextAction) {
    next.nextActions = uniqueByKey([...(next.nextActions || []), {
      time: new Date().toISOString(),
      action: compactMemoryText(patch.nextAction, 260),
    }], (x: any) => x.action, 20);
  }
  return saveGroupMemory(groupId, next);
}

function normalizePlanAssignments(assignments: any[]) {
  return (assignments || []).map((item: any) => ({
    ...item,
    status: item.status || "pending",
    statusText: item.statusText || "待处理",
    attempt: Number(item.attempt || 1),
    rework: !!item.rework,
    continuationOf: String(item.continuationOf || item.continuation_of || "").trim(),
    continuationStrategy: String(item.continuationStrategy || item.continuation_strategy || "").trim(),
  }));
}

function getWorkflowPhaseFromAssignments(assignments: any[] = []) {
  const items = assignments || [];
  if (items.length === 0) return "understanding";
  const statuses = items.map((item: any) => String(item.status || "pending"));
  if (statuses.some(s => ["failed", "blocked", "needs_info", "partial"].includes(s))) return "needs_rework";
  if (statuses.some(s => s === "running")) return "executing";
  if (statuses.every(s => s === "done")) return "reviewing";
  return "dispatching";
}

function buildWorkflowMeta(phase: string, label = "") {
  return {
    phase,
    label: label || phase,
    updated_at: new Date().toISOString(),
  };
}

function getInitialWorkflowMeta(assignments: any[], dispatchPolicy: any, label = "主 Agent 初始计划") {
  const action = String(dispatchPolicy?.action || "");
  if (action === "ask_user") return buildWorkflowMeta("needs_user", "等待用户补充");
  if (action === "hold") return buildWorkflowMeta("hold", "暂不执行");
  if (action === "direct_answer") return buildWorkflowMeta("complete", "直接回复");
  if (dispatchPolicy?.requiresConfirmation) return buildWorkflowMeta("needs_user", "等待用户确认");
  return buildWorkflowMeta((assignments || []).length ? "dispatching" : "understanding", label);
}

function updateGroupMessageAssignmentStatus(
  groupId: string,
  messageId: string,
  project: string,
  status: string,
  statusText = ""
) {
  if (!messageId || !project) return null;
  const messages = getGroupMessages(groupId);
  let changed = false;
  let workflow: any = null;
  for (const msg of messages) {
    if (msg.id !== messageId || !Array.isArray(msg.assignments)) continue;
    msg.assignments = msg.assignments.map((item: any) => {
      if (item.project !== project) return item;
      changed = true;
      return {
        ...item,
        status,
        statusText: statusText || status,
        updated_at: new Date().toISOString(),
      };
    });
    const phase = getWorkflowPhaseFromAssignments(msg.assignments);
    msg.workflow = {
      ...(msg.workflow || {}),
      ...buildWorkflowMeta(phase),
      phase,
    };
    workflow = msg.workflow;
  }
  if (changed) saveGroupMessages(groupId, messages);
  return workflow;
}

function safeAddGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  try {
    const logs = fs.existsSync(GROUP_LOGS_FILE_SHARED)
      ? JSON.parse(fs.readFileSync(GROUP_LOGS_FILE_SHARED, "utf-8"))
      : {};
    if (!logs[groupId]) logs[groupId] = [];
    logs[groupId].push({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    });
    if (logs[groupId].length > 500) logs[groupId] = logs[groupId].slice(-500);
    fs.writeFileSync(GROUP_LOGS_FILE_SHARED, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

// === 群聊日志管理 ===
function loadGroupLogs() {
  try {
    if (fs.existsSync(GROUP_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(GROUP_LOGS_FILE, "utf-8"));
    }
  } catch (e: any) {
    console.error("加载群聊日志失败:", e.message);
  }
  return {};
}

function saveGroupLogs(logs: any) {
  try {
    fs.writeFileSync(GROUP_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

function addGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  const logs = loadGroupLogs();
  if (!logs[groupId]) logs[groupId] = [];

  logs[groupId].push({
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  });

  if (logs[groupId].length > 500) {
    logs[groupId] = logs[groupId].slice(-500);
  }

  saveGroupLogs(logs);
}

// === 任务日志系统 ===
const TASK_LOGS_FILE = path.join(CCM_DIR, "task-logs.json");

function loadTaskLogs() {
  try {
    if (fs.existsSync(TASK_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(TASK_LOGS_FILE, "utf-8"));
    }
  } catch (e: any) {
    console.error("加载任务日志失败:", e.message);
  }
  return {};
}

function saveTaskLogs(logs: any): void {
  try {
    fs.writeFileSync(TASK_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存任务日志失败:", e.message);
  }
}

function addTaskLog(taskId: string, level: string, message: string): void {
  const logs = loadTaskLogs();
  if (!logs[taskId]) logs[taskId] = [];

  logs[taskId].push({
    timestamp: new Date().toISOString(),
    level,
    message
  });

  if (logs[taskId].length > 100) {
    logs[taskId] = logs[taskId].slice(-100);
  }

  saveTaskLogs(logs);
  console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}

function appendTaskTimelineEvent(taskId: string, event: any = {}) {
  if (!taskId) return null;
  try {
    const tasks = loadTasks();
    const idx = tasks.findIndex((task: any) => task.id === taskId);
    if (idx < 0) return null;
    const now = new Date().toISOString();
    const current = Array.isArray(tasks[idx].workflow_timeline) ? tasks[idx].workflow_timeline : [];
    const nextEvent = {
      id: event.id || `tl_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
      at: event.at || now,
      type: event.type || "event",
      title: String(event.title || event.message || "任务事件"),
      detail: String(event.detail || ""),
      status: event.status || event.level || "info",
      agent: event.agent || "",
      phase: event.phase || "",
      data: event.data || {},
    };
    tasks[idx].workflow_timeline = [...current, nextEvent].slice(-160);
    tasks[idx].updated_at = now;
    tasks[idx].trace_id = ensureTraceId(tasks[idx].trace_id, "task");
    saveTasks(tasks);
    appendTraceEvent(tasks[idx].trace_id, { id: `timeline:${taskId}:${nextEvent.id}`, type: `timeline.${nextEvent.type}`, status: nextEvent.status, task_id: taskId, group_id: tasks[idx].group_id || "", agent: nextEvent.agent, message: nextEvent.detail || nextEvent.title, data: { phase: nextEvent.phase, ...(nextEvent.data || {}) } });
    return nextEvent;
  } catch (e: any) {
    console.warn("记录任务时间线失败:", e?.message || e);
    return null;
  }
}

function getTaskTimeline(task: any, execution: any = {}) {
  const timeline = [
    ...(Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []),
    ...(Array.isArray(execution?.timeline) ? execution.timeline : []),
  ].filter(Boolean);
  const seen = new Set<string>();
  return timeline.filter((item: any) => {
    const key = item.id || `${item.at}|${item.type}|${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(-160);
}

function getTaskLogs(taskId: string, limit = 50) {
  const logs = loadTaskLogs();
  const taskLogs = logs[taskId] || [];
  return taskLogs.slice(-limit);
}

function clearTaskLogs(taskId: string) {
  const logs = loadTaskLogs();
  delete logs[taskId];
  saveTaskLogs(logs);
}

// === 飞书消息与认证模块 ===
export const FEISHU_SCOPES = [
  "im:message",           // 发送消息
  "im:message.group_at_msg", // 群聊 @ 消息
  "im:chat",              // 获取群聊信息
  "im:chat:readonly",     // 读取群聊信息
  "contact:user.id:readonly", // 读取用户 ID
];

async function getFeishuTenantToken(appId: string, appSecret: string): Promise<string | null> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await response.json() as any;
    return data.tenant_access_token || null;
  } catch (e: any) {
    console.error("获取飞书 tenant_access_token 失败:", e.message);
    return null;
  }
}

async function getFeishuUserToken(appId: string, appSecret: string, code: string): Promise<any> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: appSecret,
        code: code,
        redirect_uri: "http://localhost:3080/api/feishu/callback"
      })
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    console.error("获取 user_access_token 失败:", data.msg);
    return null;
  } catch (e: any) {
    console.error("获取 user_access_token 失败:", e.message);
    return null;
  }
}

async function refreshFeishuUserToken(appId: string, appSecret: string, refreshToken: string): Promise<any> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: appId,
        client_secret: appSecret,
        refresh_token: refreshToken
      })
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    return null;
  } catch (e: any) {
    console.error("刷新 user_access_token 失败:", e.message);
    return null;
  }
}

async function getFeishuUserInfo(accessToken: string): Promise<any> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    return null;
  } catch (e: any) {
    console.error("获取用户信息失败:", e.message);
    return null;
  }
}

async function getFeishuChatList(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data.items || [];
    }
    return [];
  } catch (e: any) {
    console.error("获取群聊列表失败:", e.message);
    return [];
  }
}

async function getValidFeishuToken() {
  const config = loadFeishuConfig();
  if (!config.app_id || !config.app_secret) return null;

  if (config.user_access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    if (expiresAt > new Date()) {
      return config.user_access_token;
    }

    if (config.user_refresh_token) {
      const refreshed = await refreshFeishuUserToken(config.app_id, config.app_secret, config.user_refresh_token);
      if (refreshed) {
        config.user_access_token = refreshed.access_token;
        config.user_refresh_token = refreshed.refresh_token;
        config.token_expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        saveFeishuConfig(config);
        return refreshed.access_token;
      }
    }
  }

  return await getFeishuTenantToken(config.app_id, config.app_secret);
}

async function sendFeishuMessageToUser(userId: string, content: string, msgType: string = "interactive"): Promise<boolean> {
  const config = loadFeishuConfig();
  if (!userId || userId === "test") {
    if (config.authorized_user?.open_id) {
      userId = config.authorized_user.open_id;
    } else {
      console.log("[飞书通知] 未配置用户 ID，请先完成授权");
      return false;
    }
  }

  const token = await getValidFeishuToken();
  if (!token) {
    console.log("[飞书通知] 无法获取 Token，请检查 App ID 和 Secret");
    return false;
  }

  try {
    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        receive_id: userId,
        msg_type: msgType,
        content: typeof content === "string" ? content : JSON.stringify(content)
      })
    });

    const result = await response.json() as any;
    if (result.code === 0) {
      console.log("[飞书通知] 消息发送成功");
      return true;
    } else {
      console.error("[飞书通知] 消息发送失败:", result.msg);
      return false;
    }
  } catch (e: any) {
    console.error("[飞书通知] 发送失败:", e.message);
    return false;
  }
}

function buildFeishuReportCard(title: string, markdown: string) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: String(title || "开发报告").slice(0, 80) }, template: "blue" },
    elements: [{
      tag: "div",
      text: { tag: "lark_md", content: String(markdown || "暂无内容").slice(0, 12000) },
    }],
  };
}

async function sendFeishuWebhookReportMessage(config: any, options: { title: string; markdown: string }): Promise<any> {
  const webhookUrl = String(config.webhook_url || "").trim();
  if (!webhookUrl) return { success: false, error: "请先配置飞书群机器人 Webhook 地址" };
  const body: any = { msg_type: "interactive", card: buildFeishuReportCard(options.title, options.markdown) };
  const signKey = String(config.sign_key || "").trim();
  if (signKey && signKey !== "******") {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    body.timestamp = timestamp;
    body.sign = crypto.createHmac("sha256", signKey).update(`${timestamp}\n${signKey}`).digest("base64");
  }
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json() as any;
    if (result.code === 0 || result.StatusCode === 0) {
      return { success: true, target_type: "webhook", target_id: webhookUrl.replace(/(hook|webhook)\/.+$/i, "$1/***") };
    }
    return { success: false, error: result.msg || result.StatusMessage || `飞书机器人接口错误 ${result.code ?? result.StatusCode ?? response.status}`, code: result.code ?? result.StatusCode };
  } catch (error: any) {
    return { success: false, error: error?.message || "飞书机器人发送失败" };
  }
}

export async function sendFeishuReportMessage(options: {
  title: string;
  markdown: string;
}): Promise<any> {
  const config = loadFeishuConfig();
  if (config.enabled === false) return { success: false, error: "飞书全局推送已关闭" };
  return sendFeishuWebhookReportMessage(config, options);
}
async function sendTaskCompletionNotification(task: any, result: string) {
  const summary = task?.delivery_summary || {};
  const sourceReport = String(summary.user_report || result || "");
  const resultSummary = sourceReport.substring(0, 900) + (sourceReport.length > 900 ? "..." : "");
  const fileCount = summary.actual_file_change_count ?? summary.files_changed?.length ?? 0;
  const verificationCount = summary.verification?.length || 0;
  const missingVerificationCount = summary.verification_required_missing?.length || 0;
  const reviewStatus = summary.has_final_review ? (summary.review_status || "complete") : "无";
  const priority = task.priority === "high" ? "高" : task.priority === "normal" ? "中" : "低";
  const markdown = [
    `**任务标题**：${task.title || "未命名任务"}`,
    `**目标项目**：${task.target_project || "群聊"}`,
    `**优先级**：${priority}`,
    `**完成时间**：${new Date().toLocaleString("zh-CN")}`,
    `**实际文件变更**：${fileCount} 个`,
    `**验证记录**：${verificationCount} 条`,
    `**缺命令验证**：${missingVerificationCount} 项`,
    `**主 Agent 复盘**：${reviewStatus}`,
    "",
    `**用户交付报告**：\n${resultSummary || "无"}`,
  ].join("\n");
  const notification = await sendFeishuReportMessage({
    title: "任务完成通知",
    markdown,
  });
  if (!notification.success) console.warn("[飞书通知] 任务完成通知发送失败:", notification.error || "未知错误");
}

async function sendTaskFailureNotification(task: any, errorMsg: string) {
  const markdown = [
    `**任务标题**：${task.title || "未命名任务"}`,
    `**目标项目**：${task.target_project || "群聊"}`,
    `**失败时间**：${new Date().toLocaleString("zh-CN")}`,
    "",
    `**错误信息**：\n${String(errorMsg || "未知错误").substring(0, 900)}`,
  ].join("\n");
  const notification = await sendFeishuReportMessage({
    title: "任务执行失败",
    markdown,
  });
  if (!notification.success) console.warn("[飞书通知] 任务失败通知发送失败:", notification.error || "未知错误");
}

function formatListForGroupReport(items: any, empty = "无", formatter: (item: any) => string = (item) => String(item || "")) {
  const values = Array.isArray(items) ? items.map(formatter).map((item: any) => String(item || "").trim()).filter(Boolean) : [];
  if (values.length === 0) return empty;
  return values.slice(0, 8).map((item: string) => `- ${item}`).join("\n");
}

function formatDeliveryFileItem(item: any) {
  if (!item || typeof item === "string") return String(item || "").trim();
  const pathText = item.path || item.file || "";
  if (!pathText) return "";
  const agent = item.agent ? `${item.agent} · ` : "";
  const status = item.status ? ` (${item.status})` : "";
  const diff = Number(item.additions || item.deletions || 0) > 0 ? ` +${Number(item.additions || 0)}/-${Number(item.deletions || 0)}` : "";
  return `${agent}${pathText}${status}${diff}`.trim();
}

function formatDeliveryMissingVerification(item: any) {
  const agent = item?.agent || "未知 Agent";
  const required = Array.isArray(item?.required) ? item.required.join(" / ") : "";
  return `${agent}: ${required || "未提供项目验证命令执行证据"}`;
}

function formatDeliveryReworkItem(item: any) {
  const project = item?.project ? `${item.project}: ` : "";
  const attempt = item?.attempt ? `第 ${item.attempt} 轮 ` : "";
  const reason = item?.reason ? `（${item.reason}）` : "";
  const taskText = item?.task || "主 Agent 已生成返工工作单";
  return compactMemoryText(`${project}${attempt}${taskText}${reason}`, 320);
}

function formatDeliveryAssignmentItem(item: any) {
  const project = item?.project || "未知 Agent";
  const status = item?.status ? ` [${item.statusText || item.status}]` : "";
  const dependsOn = item?.dependsOn ? `；依赖 ${item.dependsOn}` : "";
  const continuation = item?.continuationStrategy ? `；续跑 ${item.continuationStrategy}` : "";
  const attempt = item?.attempt ? `；第 ${item.attempt} 轮` : "";
  const reason = item?.reason ? `（${item.reason}）` : "";
  return compactMemoryText(`${project}${status}: ${item?.task || "子 Agent 工作单"}${dependsOn}${continuation}${attempt}${reason}`, 360);
}

function formatReportLines(items: any, formatter: (item: any) => string = (item) => String(item || ""), limit = 10) {
  const values = Array.isArray(items) ? items.map(formatter).map(item => String(item || "").trim()).filter(Boolean) : [];
  if (!values.length) return "- 无";
  return values.slice(0, limit).map(item => `- ${item}`).join("\n");
}

function buildUserDeliveryReport(task: any, summary: any, status: "done" | "waiting" | "failed", detail = "") {
  const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
  const risks = uniqueStrings([...(summary?.blockers || []), ...(summary?.blocking_needs || []), ...(summary?.advisory_needs || []), ...(summary?.risks || [])]);
  const lines = [
    `# ${task?.title || "任务交付"}`,
    "",
    `状态：${statusText}`,
    `完成内容：${compactMemoryText(summary?.headline || detail || task?.status_detail || "任务已处理", 500)}`,
    "",
    `变更文件：${Number(summary?.actual_file_change_count || 0)} 个`,
    formatReportLines(summary?.actual_file_changes || summary?.files_changed, formatDeliveryFileItem, 12),
    "",
    `验证结果：${Array.isArray(summary?.verification_executed) ? summary.verification_executed.length : 0} 项已执行`,
    formatReportLines(summary?.verification_executed, (item) => item, 12),
    risks.length ? "" : "",
    risks.length ? "风险与待确认：" : "风险与待确认：无",
    risks.length ? formatReportLines(risks, (item) => item, 8) : "",
  ];
  return lines.filter(line => line !== "").join("\n");
}

function buildTaskGroupReportMessage(task: any, status: "done" | "waiting" | "failed", detail = "") {
  const summary = task?.delivery_summary || {};
  const title = status === "done"
    ? "任务交付完成"
    : status === "waiting"
      ? "任务需要继续处理"
      : "任务执行失败";
  const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
  const fileChanges = summary.actual_file_changes || summary.files_changed || task?.file_changes?.files || [];
  const verification = summary.verification || task?.receipt?.verification || [];
  const blockers = summary.blockers || task?.receipt?.blockers || [];
  const needs = summary.needs || task?.receipt?.needs || [];

  return [
    `【${title}】`,
    `任务：${task?.title || "未命名任务"}`,
    `状态：${statusText}`,
    summary.headline ? `完成内容：${summary.headline}` : "",
    `变更文件：${Number(summary.actual_file_change_count ?? fileChanges.length ?? 0)} 个`,
    formatListForGroupReport(fileChanges, "无", formatDeliveryFileItem),
    `验证结果：${Array.isArray(verification) ? verification.length : 0} 项`,
    formatListForGroupReport(verification, "无", (item) => typeof item === "string" ? item : (item?.command && item?.result ? `${item.command} — ${item.result}` : item?.command || item?.summary || "")),
    blockers.length || needs.length ? `风险与待确认：\n${formatListForGroupReport([...blockers, ...needs])}` : "风险与待确认：无",
  ].filter(Boolean).join("\n");
}

function appendTaskGroupReport(task: any, status: "done" | "waiting" | "failed", detail = "") {
  if (!task?.group_id) return;
  appendGroupMessage(task.group_id, {
    id: "m" + Date.now().toString(36) + "delivery" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: "system",
    content: buildTaskGroupReportMessage(task, status, detail),
    timestamp: new Date().toISOString(),
    task_id: task.id,
    delivery_summary: task.delivery_summary || null,
  });
}

function syncTaskBacklogStatus(task: any, status: "queued" | "in_progress" | "done" | "blocked" | "failed", result = "") {
  const backlogFile = task?.workflow_meta?.intake?.backlog_file;
  if (!task?.group_id || !backlogFile) return null;
  return markDailyDevBacklogStatus(task.group_id, backlogFile, status, {
    task_id: task.id,
    result: result || task.status_detail || task.result || status,
  });
}

// === 协作与辅助规则 ===
function getTaskTargetKey(task: any) {
  if (task.assign_type === "group" && task.group_id) {
    return `group:${task.group_id}`;
  }
  return `project:${task.target_project}`;
}

function isActionableMentionText(text: string) {
  const value = String(text || "").trim();
  if (value.length < 4) return false;
  if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value)) return false;
  return true;
}

function normalizeMentionTask(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function stripMessageListPrefix(line: string) {
  return String(line || "").trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
}

function escapeRegExp(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractActionableMentions(text: string, group: any, sourceProject = "") {
  const memberNames = (group.members || [])
    .map((m: any) => String(m.project || "").trim())
    .filter(Boolean)
    .sort((a: string, b: string) => b.length - a.length);
  const members = new Set(memberNames);
  const results: any[] = [];
  const seen = new Set<string>();
  for (const line of String(text || "").split(/\r?\n/)) {
    const normalized = stripMessageListPrefix(line);
    let targetName = "";
    let message = "";
    for (const name of memberNames) {
      const token = `@${name}`;
      if (!normalized.startsWith(token)) continue;
      const rest = normalized.slice(token.length);
      if (rest && !/^[\s：:，,、\-—]/.test(rest)) continue;
      targetName = name;
      message = rest.replace(/^[\s：:，,、\-—]+/, "").trim();
      break;
    }

    if (!targetName) {
      const match = normalized.match(/^@([^\s：:，,、\-—]+)(?:\s+|[：:，,、\-—]+)([\s\S]+)$/);
      if (!match) continue;
      targetName = match[1];
      message = match[2].trim();
    }

    if (!members.has(targetName) || targetName === sourceProject) continue;
    if (!isActionableMentionText(message)) continue;
    const key = `${targetName}\n${normalizeMentionTask(message)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ mention: `@${targetName}`, targetName, message });
  }
  return results;
}

function buildAgentQaProtocolInstructions(currentAgent: string, memberList: string) {
  const members = memberList || "暂无可询问成员";
  return [
    "",
    "[Agent-to-Agent 工作中询问协议]",
    `- 你是 ${currentAgent || "当前子 Agent"}。如果执行中被其他 Agent 的接口、字段、约束、评审结论阻塞，不要臆测，可以向群聊内其他子 Agent 提问。可询问成员：${members}`,
    "- 首选使用内部工具协议：在回复末尾输出 <tool_call> JSON，系统会记录问题、转交目标 Agent、收到回答后自动把答案注入给你同 Agent 续跑。",
    "- ask_agent 示例：<tool_call>{\"name\":\"ask_agent\",\"arguments\":{\"target\":\"后端Agent\",\"question\":\"请确认 POST /api/orders 的字段和响应结构\",\"reason\":\"前端联调需要契约\",\"evidence\":[\"src/orders/api.ts\"],\"required_capabilities\":[\"api\"],\"blocking\":true}}</tool_call>",
    "- 不确定该问谁时 target 可以写 auto，主 Agent 会按能力标签和当前问答负载选择；回答必须尽量附文件、接口、文档或验证证据。",
    "- request_review 示例：<tool_call>{\"name\":\"request_review\",\"arguments\":{\"target\":\"测试Agent\",\"question\":\"请评审这次变更是否覆盖订单创建失败分支\",\"blocking\":true}}</tool_call>",
    "- 如果你正在回答其他 Agent 的问题，可以直接自然语言回答；也可以用 reply_agent：<tool_call>{\"name\":\"reply_agent\",\"arguments\":{\"answer\":\"结论...\",\"evidence\":\"接口/文件/验证证据...\"}}</tool_call>",
    "- 兼容旧格式：CCM_AGENT_REQUESTS [{\"type\":\"ask_agent\",\"target\":\"后端Agent\",\"question\":\"...\",\"reason\":\"...\",\"blocking\":true}]",
    "- target 必须是群聊成员名或 auto；question 要具体到接口、文件、字段、验收点或风险。涉及高风险操作、账号密钥、生产数据、业务方向不明确时，说明需要用户确认，不要让其他 Agent 代替用户拍板。",
    "- Agent 问答是 advisory_read_only：被询问 Agent 只能给结论和证据，不能借询问修改文件、扩大 MCP/工具权限或跨项目操作。",
    "- 如果没有阻塞，请不要输出 ask_agent/request_review/CCM_AGENT_REQUESTS。",
    "",
  ].join("\n");
}

function stripCodeFence(value: string) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function parseInternalToolCalls(text: string) {
  const calls: any[] = [];
  const rawText = String(text || "");
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const body = stripCodeFence(match[1]);
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) calls.push(...parsed);
      else calls.push(parsed);
    } catch {}
  }
  return calls
    .filter((call: any) => call && typeof call === "object")
    .map((call: any) => ({
      name: String(call.name || call.tool || call.type || "").trim(),
      arguments: call.arguments || call.args || call.input || {},
      raw: call,
    }));
}

function normalizeAgentQaRequest(raw: any, group: any, sourceProject = "") {
  if (!raw || typeof raw !== "object") return null;
  const targetName = String(raw.target || raw.to || raw.to_agent || raw.agent || raw.project || raw.targetName || "auto").trim();
  const question = String(raw.question || raw.message || raw.prompt || raw.request || "").trim();
  const type = String(raw.type || raw.kind || "ask_agent").trim() || "ask_agent";
  if (!question || question.length < 4) return null;
  const members = new Set((group.members || []).map((m: any) => String(m.project || "").trim()).filter(Boolean));
  if (targetName.toLowerCase() !== "auto" && (!members.has(targetName) || targetName === sourceProject)) return null;
  return {
    type: /review/i.test(type) ? "request_review" : "ask_agent",
    targetName,
    question: compactMemoryText(question, 1600),
    reason: compactMemoryText(String(raw.reason || raw.context || raw.evidence || "").trim(), 500),
    evidence: uniqueStrings(raw.evidence || raw.references || raw.sources || []).slice(0, 20),
    required_capabilities: uniqueStrings(raw.required_capabilities || raw.requiredCapabilities || raw.capabilities || []).slice(0, 20),
    deadline_ms: Number(raw.deadline_ms || raw.deadlineMs || 0) || undefined,
    parent_question_id: String(raw.parent_question_id || raw.parentQuestionId || "").trim(),
    depth: Math.max(0, Number(raw.depth || 0)),
    hop_path: Array.isArray(raw.hop_path || raw.hopPath) ? (raw.hop_path || raw.hopPath) : [],
    blocking: raw.blocking !== false,
  };
}

function extractAgentQaRequests(text: string, group: any, sourceProject = "") {
  const rawText = String(text || "");
  const requests: any[] = [];
  const seen = new Set<string>();
  const push = (item: any) => {
    const normalized = normalizeAgentQaRequest(item, group, sourceProject);
    if (!normalized) return;
    const key = `${normalized.type}\n${normalized.targetName}\n${normalizeMentionTask(normalized.question)}`;
    if (seen.has(key)) return;
    seen.add(key);
    requests.push(normalized);
  };

  for (const call of parseInternalToolCalls(rawText)) {
    const name = call.name.toLowerCase();
    if (!["ask_agent", "request_review"].includes(name)) continue;
    push({ ...(call.arguments || {}), type: name });
  }

  const markerRegex = /CCM_AGENT_REQUESTS\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|$))/gi;
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = markerRegex.exec(rawText)) !== null) {
    const candidate = stripCodeFence(markerMatch[1]);
    const arrayMatch = candidate.match(/\[[\s\S]*\]/);
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const jsonText = arrayMatch?.[0] || objectMatch?.[0] || "";
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) parsed.forEach(push);
      else push(parsed);
    } catch {}
  }

  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*CCM_(?:ASK_AGENT|REQUEST_REVIEW)\s+@([^\s:：]+)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    push({
      type: /REQUEST_REVIEW/i.test(line) ? "request_review" : "ask_agent",
      target: match[1],
      question: match[2],
      blocking: true,
    });
  }
  return requests;
}

function extractAgentQaReplies(text: string, qaId = "") {
  const replies: any[] = [];
  for (const call of parseInternalToolCalls(text)) {
    if (call.name.toLowerCase() !== "reply_agent") continue;
    const args = call.arguments || {};
    const answer = [args.answer, args.evidence ? `证据：${args.evidence}` : ""].filter(Boolean).join("\n").trim();
    if (!answer) continue;
    const questionId = String(args.question_id || args.qa_id || args.id || "").trim();
    if (questionId && qaId && questionId !== qaId) continue;
    replies.push({ answer, evidence: uniqueStrings(args.evidence || args.sources || args.references || []).slice(0, 30), questionId });
  }
  return replies;
}

function stripAgentQaProtocolBlocks(text: string) {
  return String(text || "")
    .replace(/<tool_call>\s*[\s\S]*?\s*<\/tool_call>/gi, (block) => {
      const calls = parseInternalToolCalls(block);
      return calls.some(call => ["ask_agent", "request_review", "reply_agent"].includes(call.name.toLowerCase())) ? "" : block;
    })
    .replace(/\n?CCM_AGENT_REQUESTS\s*[:：]?\s*[\s\S]*?(?=\n\s*(?:CCM_AGENT_RECEIPT|$))/gi, "")
    .replace(/^\s*CCM_(?:ASK_AGENT|REQUEST_REVIEW)\s+@[^\n]+\n?/gim, "")
    .trim();
}
function extractStructuredAssignments(result: any, group: any, sourceProject = "") {
  const memberNames = new Set((group.members || [])
    .map((m: any) => String(m.project || "").trim())
    .filter(Boolean));
  const assignments = Array.isArray(result?.assignments) ? result.assignments : [];
  const seen = new Set<string>();
  const mentions: any[] = [];

  for (const item of assignments) {
    const targetName = String(item?.project || item?.targetName || "").trim();
    const message = String(item?.task || item?.message || "").trim();
    if (!memberNames.has(targetName) || targetName === sourceProject) continue;
    if (!isActionableMentionText(message)) continue;
    const key = `${targetName}\n${normalizeMentionTask(message)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({
      mention: `@${targetName}`,
      targetName,
      message,
      reason: String(item?.reason || "").trim(),
      dependsOn: String(item?.dependsOn || "").trim(),
      rework: !!item?.rework,
      attempt: Number(item?.attempt || 1),
      continuationOf: String(item?.continuationOf || item?.continuation_of || "").trim(),
      continuationStrategy: String(item?.continuationStrategy || item?.continuation_strategy || "").trim(),
      structured: true,
    });
  }

  return mentions;
}

function getCoordinatorActionMentions(result: any, group: any, sourceProject = "") {
  const structured = extractStructuredAssignments(result, group, sourceProject);
  if (structured.length > 0) return structured;
  return extractActionableMentions(result?.content || "", group, sourceProject);
}

function escapeTaskNotificationText(value: any) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeTaskNotificationText(value: any) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeTaskNotificationStatus(text: string, receipt: any = null) {
  const receiptStatus = String(receipt?.status || "").trim();
  if (!receipt) return "missing_receipt";
  if (receiptStatus === "done") return "completed";
  if (receiptStatus === "failed" || checkTaskFailure(text)) return "failed";
  if (receiptStatus === "blocked" || receiptStatus === "needs_info") return "blocked";
  if (receiptStatus === "partial") return "partial";
  return "completed";
}

function buildTaskNotification(agent: string, text: string, receipt: any = null) {
  const status = normalizeTaskNotificationStatus(text, receipt);
  const summary = receipt?.summary || (status === "missing_receipt" ? "Worker completed without CCM_AGENT_RECEIPT" : compactMemoryText(text, 240));
  return [
    "<task-notification>",
    `<task-id>${escapeTaskNotificationText(agent)}</task-id>`,
    `<status>${escapeTaskNotificationText(status)}</status>`,
    `<receipt-status>${escapeTaskNotificationText(receipt?.status || "missing")}</receipt-status>`,
    `<summary>${escapeTaskNotificationText(summary)}</summary>`,
    `<result>${escapeTaskNotificationText(compactMemoryText(text, 1800))}</result>`,
    `<usage><duration_ms>0</duration_ms></usage>`,
    "</task-notification>",
  ].join("\n");
}

function extractTaskNotificationTag(text: string, tag: string) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(text || "").match(pattern);
  return match ? unescapeTaskNotificationText(match[1].trim()) : "";
}

function parseTaskNotificationsFromText(text: string) {
  const raw = String(text || "");
  const blocks = [...raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/gi)];
  return blocks.map((match) => {
    const block = `<task-notification>${match[1]}</task-notification>`;
    return {
      task_id: extractTaskNotificationTag(block, "task-id"),
      status: extractTaskNotificationTag(block, "status"),
      receipt_status: extractTaskNotificationTag(block, "receipt-status"),
      summary: compactMemoryText(extractTaskNotificationTag(block, "summary"), 600),
      result: compactMemoryText(extractTaskNotificationTag(block, "result"), 1000),
    };
  }).filter((item: any) => item.task_id || item.status || item.summary);
}

function getCollectedOutputAgent(output: string) {
  const notificationAgent = extractTaskNotificationTag(output, "task-id");
  if (notificationAgent) return notificationAgent;
  return (String(output || "").match(/^【([^】]+)】/) || [])[1]?.trim() || "";
}

function getCollectedOutputReceiptStatus(output: string) {
  const receiptStatus = extractTaskNotificationTag(output, "receipt-status");
  if (receiptStatus) return receiptStatus;
  return (String(output || "").match(/-\s*状态：\s*([a-zA-Z_]+)/) || [])[1]?.trim() || "";
}

function formatCollectedAgentOutput(agent: string, text: string, receipt: any = null) {
  const body = String(text || "").trim();
  return [
    buildTaskNotification(agent, body, receipt),
    "",
    `【${agent}】`,
    body,
    "",
    formatAgentReceiptForReview(receipt),
  ].join("\n");
}

function getAgentDependencyStateFromOutputs(agent: string, outputs: string[] = []) {
  const text = outputs.filter(Boolean).join("\n\n");
  const notifications = parseTaskNotificationsFromText(text)
    .filter((item: any) => !item.task_id || item.task_id === agent);
  const latestNotification = notifications.at(-1);
  const problemNotification = latestNotification && (() => {
    const item = latestNotification;
    const status = String(item.status || "").trim();
    const receiptStatus = String(item.receipt_status || "").trim();
    return status !== "completed" || (!!receiptStatus && receiptStatus !== "done") ? item : null;
  })();
  if (problemNotification) {
    return {
      ok: false,
      status: problemNotification.status || "blocked",
      reason: `${agent} 前置输出未完成：通知 ${problemNotification.status || "unknown"} / 回执 ${problemNotification.receipt_status || "missing"}；${problemNotification.summary || ""}`,
    };
  }
  if (notifications.length > 0) {
    return { ok: true, status: "done", reason: `${agent} 前置输出已完成` };
  }
  const receipts = parseFormattedReceiptsFromText(text).filter((item: any) => item.agent === agent);
  const latestReceipt = receipts.at(-1);
  const problemReceipt = latestReceipt?.status !== "done" ? latestReceipt : null;
  if (problemReceipt) {
    return {
      ok: false,
      status: problemReceipt.status || "blocked",
      reason: `${agent} 前置回执不是 done：${problemReceipt.status || "unknown"}；${problemReceipt.summary || ""}`,
    };
  }
  if (receipts.some((item: any) => item.status === "done")) {
    return { ok: true, status: "done", reason: `${agent} 前置回执已完成` };
  }
  return {
    ok: false,
    status: "missing_receipt",
    reason: `${agent} 前置输出缺少可验收的 task-notification/CCM_AGENT_RECEIPT`,
  };
}

function checkTaskCompletion(response: string) {
  if (!response) return false;
  const completionMarkers = [
    "✅ 任务完成", "✅ 已完成", "✅ 完成", "任务已完成",
    "已完成任务", "已经完成", "done", "completed", "finished"
  ];
  const lowerResponse = response.toLowerCase();
  return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}

function checkTaskFailure(response: string) {
  if (!response) return false;
  return /\bAgent 错误:|响应超时|^❌\s*错误|转发给 @.+ 失败|转发失败:\s*spawn EPERM|\bspawn\s+EPERM\b|自动返工已达上限/i.test(response);
}

type TaskExecutionStatus = "done" | "waiting" | "failed";

function normalizeTaskResultText(value: any, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function buildTaskExecutionResult(status: TaskExecutionStatus, result: string, details: any = {}) {
  return {
    status,
    result: normalizeTaskResultText(result, 1200),
    report: normalizeTaskResultText(details.report || result, 12000),
    detail: details.detail || "",
    receipt: details.receipt || null,
    review: details.review || null,
    fileChanges: details.fileChanges || null,
    deliverySummary: details.deliverySummary || null,
    assignments: Array.isArray(details.assignments) ? details.assignments : [],
    coordinationPlan: details.coordinationPlan || null,
    dispatchPolicy: details.dispatchPolicy || null,
    executionOrder: details.executionOrder || "",
    coordinatorRuntime: details.coordinatorRuntime || details.runtime || "",
    coordinatorAgent: details.coordinatorAgent || "",
  };
}

function getReadyDailyDevMembers(group: any, configs = getConfigs()) {
  const normalizedGroup = group ? normalizeGroupOrchestrator(group) : null;
  const coordinator = normalizedGroup ? getCoordinatorMember(normalizedGroup) : null;
  const routableMembers = normalizedGroup ? getRoutableMembers(normalizedGroup) : [];
  const readyMembers = routableMembers
    .map((member: any) => {
      const runtime = resolveMemberRuntime(member.project, normalizedGroup, configs);
      const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
      return {
        project: member.project,
        configured: !!runtime,
        workDir: runtime?.workDir || "",
        workDirExists: !!workDirState?.exists,
        workDirWritable: !!workDirState?.writable,
      };
    })
    .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable);

  return { normalizedGroup, coordinator, routableMembers, readyMembers };
}

function validateDailyDevGroupReady(group: any) {
  const readiness = getReadyDailyDevMembers(group);
  if (!readiness.normalizedGroup) throw new Error("开发群聊不存在");
  if (!readiness.coordinator?.project) throw new Error("开发群聊缺少主 Agent 协调者");
  if (readiness.routableMembers.length === 0) {
    throw new Error("开发群聊至少需要 1 个可派发的项目子 Agent，不能只有主 Agent");
  }
  if (readiness.readyMembers.length === 0) {
    const details = readiness.routableMembers
      .map((member: any) => {
        const ready = readiness.readyMembers.find((item: any) => item.project === member.project);
        return ready
          ? `${member.project}: ok`
          : `${member.project}: 项目配置缺失或工作目录不可读写`;
      })
      .join("；");
    throw new Error(`开发群聊没有可执行的项目子 Agent：${details || "请检查项目配置和工作目录"}`);
  }
  return readiness;
}

function splitEvidenceList(value: any) {
  if (Array.isArray(value)) return normalizeStringArray(value);
  const text = String(value || "").trim();
  if (!text || text === "无" || text === "未提供" || text === "未填写") return [];
  return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}

function uniqueStrings(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of splitEvidenceList(list)) {
      if (seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function taskRequiresVerification(task: any) {
  if (task?.requires_verification === false || task?.requiresVerification === false) return false;
  return task?.workflow_type === "daily_dev";
}

function isSuggestedOnlyVerification(value: any) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /建议|可运行|可以运行|待运行|未运行|未执行|未验证|没有运行|无法运行|未提供|todo|not\s+run|not\s+executed|suggest/i.test(text);
}

function isFailedVerification(value: any) {
  const text = String(value || "").trim();
  if (!text) return false;
  const normalized = text
    .replace(/\b0\s+(?:failed|failures?|errors?)\b/gi, "")
    .replace(/\b(?:no|zero)\s+(?:failed|failures?|errors?)\b/gi, "")
    .replace(/(?:零|0)\s*(?:个|项|条)?\s*(?:失败|错误)/g, "")
    .replace(/(?:无失败|没有失败|全部通过|全数通过)/g, "");
  return /失败|未通过|报错|错误|超时|中断|无法执行|无法自动执行|无法运行|被.*拦截|拦截|阻塞|审批|failed|failure|error|timeout|denied|blocked|not\s+allowed|requires\s+approval|permission/i.test(normalized);
}

function isAdvisoryNeed(value: any, task: any = null) {
  const text = String(value || "").trim();
  const controlledSmokeCleanup = task?.workflow_meta?.smoke_test === true
    && /(?:smoke|路径门禁|目标文件).{0,100}(?:映射|清理|忽略|合规交付|系统捕获)/i.test(text);
  return controlledSmokeCleanup
    || /^(?:建议|可选|如需|推荐|后续可|optional\b|recommend(?:ed)?\b)/i.test(text)
    || /可由.{0,40}(?:主 Agent|用户|coordinator)?.{0,20}(?:决定|选择)(?:是否)?/i.test(text)
    || /人工(?:确认|检查|核验)/i.test(text);
}

function receiptHasOpenNeeds(receipt: any, task: any = null) {
  const blockers = splitEvidenceList(receipt?.blockers || []);
  const needs = splitEvidenceList(receipt?.needs || []).filter((item: string) => {
    const text = String(item || "").trim();
    return !isAdvisoryNeed(text, task);
  });
  return blockers.length > 0 || needs.length > 0;
}
function getVerificationEvidenceGate(receipts: any[] = []) {
  const executed: string[] = [];
  const suggested: string[] = [];
  const failed: string[] = [];
  const values = uniqueStrings(...(receipts || []).map((receipt: any) => receipt?.verification || []));
  for (const item of values) {
    if (isFailedVerification(item)) {
      failed.push(item);
      continue;
    }
    if (isSuggestedOnlyVerification(item)) {
      suggested.push(item);
      continue;
    }
    executed.push(item);
  }
  return {
    pass: executed.length > 0 && failed.length === 0,
    executed,
    suggested,
    failed,
  };
}

function normalizeVerificationMatchText(value: any) {
  return String(value || "")
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isManualVerificationEvidence(value: any) {
  const text = String(value || "").trim();
  if (!text || isSuggestedOnlyVerification(text) || isFailedVerification(text)) return false;
  return /人工核验|手动核验|人工检查|手动检查|manual\s+(check|verification|verified)|checked\s+manually/i.test(text);
}

function verificationTextMatchesCommand(text: string, command: string) {
  const normalizedText = normalizeVerificationMatchText(text);
  const normalizedCommand = normalizeVerificationMatchText(command);
  return !!normalizedCommand && normalizedText.includes(normalizedCommand);
}

function getRequiredVerificationCoverage(receipts: any[] = []) {
  const required: any[] = [];
  const covered: any[] = [];
  const missing: any[] = [];

  for (const receipt of receipts || []) {
    const agent = String(receipt?.agent || "").trim();
    if (!agent) continue;
    const commands = getConfiguredProjectVerificationCommands(agent);
    if (!commands.length) continue;
    const verification = splitEvidenceList(receipt?.verification || []);
    const executed = verification.filter(item => !isSuggestedOnlyVerification(item) && !isFailedVerification(item));
    const externalRunner = executed.filter(item => /passed by external runner\s*\(exit 0\)/i.test(item));
    const manual = executed.some(isManualVerificationEvidence);
    const matched = commands.filter(command => externalRunner.some(item => verificationTextMatchesCommand(item, command)));
    const item = {
      agent,
      required: commands.slice(0, 6),
      executed,
      external_runner: externalRunner,
      matched,
      manual,
    };
    required.push(item);
    if (matched.length > 0) covered.push(item);
    else missing.push(item);
  }

  return {
    pass: missing.length === 0,
    required,
    covered,
    missing,
  };
}

function parseFormattedReceiptsFromText(text: string) {
  const raw = String(text || "");
  const sections = raw.split(/\n(?=【[^】]+】)/g).filter(Boolean);
  const receipts: any[] = [];
  for (const section of sections) {
    const agent = (section.match(/^【([^】]+)】/) || [])[1]?.trim();
    if (!agent) continue;
    const getLine = (label: string) => (section.match(new RegExp(`-\\s*${label}：\\s*([^\\n]+)`)) || [])[1]?.trim() || "";
    const status = getLine("状态");
    if (!status) continue;
    receipts.push({
      agent,
      status,
      summary: getLine("摘要"),
      actions: splitEvidenceList(getLine("动作")),
      filesChanged: splitEvidenceList(getLine("文件")),
      verification: splitEvidenceList(getLine("验证")),
      memoryUsed: splitEvidenceList(getLine("使用记忆")),
      memoryIgnored: splitEvidenceList(getLine("未用记忆")),
      blockers: splitEvidenceList(getLine("阻塞")),
      needs: splitEvidenceList(getLine("需要补充")),
    });
  }
  return receipts;
}

function summarizeFileChange(file: any, agent = "") {
  if (!file?.path) return null;
  const diff = file.diff || {};
  const project = String(file.project || file.projectName || file.target_project || agent || "");
  return {
    path: String(file.path),
    agent,
    project,
    status: file.statusText || file.statusKind || "",
    status_kind: file.statusKind || "",
    additions: Number(diff.additions || file.additions || 0),
    deletions: Number(diff.deletions || file.deletions || 0),
  };
}

function extractActualFileChanges(fileChanges: any, agent = "") {
  if (!fileChanges?.files || !Array.isArray(fileChanges.files)) return [];
  return fileChanges.files
    .map((file: any) => summarizeFileChange(file, agent))
    .filter(Boolean);
}

function collectTaskActualFileChanges(task: any, execution: any) {
  const changes: any[] = [];
  changes.push(...extractActualFileChanges(task?.file_changes, task?.target_project || ""));
  changes.push(...extractActualFileChanges(execution?.fileChanges, task?.target_project || ""));

  if (task?.id) {
    for (const record of listExecutions({ taskId: task.id })) {
      changes.push(...extractActualFileChanges(record.fileChanges, record.project || record.agent || ""));
    }
  }

  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id)) {
      if (message?.task_id !== task.id) continue;
      changes.push(...extractActualFileChanges(message.fileChanges, message.agent || ""));
    }
  }

  const seen = new Set<string>();
  return changes.filter((change: any) => {
    const key = `${change.agent || ""}|${change.path}|${change.status_kind || change.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTaskCoordinationPlans(task: any, execution: any) {
  const plans: any[] = [];
  const addPlan = (plan: any, source = "", message: any = null) => {
    if (!plan || typeof plan !== "object") return;
    plans.push({
      ...plan,
      source,
      message_id: message?.id || "",
      agent: message?.agent || "",
      timestamp: message?.timestamp || "",
      assignments: Array.isArray(message?.assignments) ? message.assignments.length : undefined,
    });
  };
  addPlan(execution?.coordinationPlan, "execution");
  addPlan(task?.coordination_plan || task?.coordinationPlan, "task");
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id)) {
      if (message?.task_id !== task.id) continue;
      addPlan(message.coordinationPlan || message.coordination_plan, "group-message", message);
    }
  }
  const seen = new Set<string>();
  return plans.filter((plan: any) => {
    const key = `${plan.source}|${plan.message_id}|${JSON.stringify(plan.phases || [])}|${JSON.stringify(plan.targets || [])}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTaskAssignmentEvidence(task: any, execution: any) {
  const items: any[] = [];
  const addAssignments = (assignments: any[], source = "", message: any = null) => {
    for (const assignment of assignments || []) {
      if (!assignment || typeof assignment !== "object") continue;
      const project = String(assignment.project || assignment.targetName || "").trim();
      const taskText = String(assignment.task || assignment.message || "").trim();
      if (!project && !taskText) continue;
      items.push({
        project,
        task: compactMemoryText(taskText, 700),
        reason: compactMemoryText(assignment.reason || "", 260),
        dependsOn: String(assignment.dependsOn || "").trim(),
        status: String(assignment.status || "").trim(),
        statusText: String(assignment.statusText || "").trim(),
        rework: !!assignment.rework,
        attempt: Number(assignment.attempt || 0) || undefined,
        continuationOf: String(assignment.continuationOf || assignment.continuation_of || "").trim(),
        continuationStrategy: String(assignment.continuationStrategy || assignment.continuation_strategy || "").trim(),
        source,
        message_id: message?.id || "",
        timestamp: message?.timestamp || "",
      });
    }
  };

  addAssignments(Array.isArray(execution?.assignments) ? execution.assignments : [], "execution", execution);
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id)) {
      if (message?.task_id !== task.id) continue;
      addAssignments(Array.isArray(message?.assignments) ? message.assignments : [], "group-message", message);
    }
  }

  const seen = new Set<string>();
  return items.filter((item: any) => {
    const key = [
      item.project,
      item.task,
      item.dependsOn,
      item.rework ? "rework" : "",
      item.attempt || "",
      item.continuationStrategy,
      item.message_id,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTaskReworkEvidence(task: any, execution: any) {
  const items: any[] = [];
  const addItem = (item: any, source = "", message: any = null) => {
    if (!item || typeof item !== "object") return;
    const project = String(item.project || item.targetName || "").trim();
    const taskText = String(item.task || item.message || item.content || "").trim();
    const reason = String(item.reason || "").trim();
    if (!project && !taskText && !reason) return;
    items.push({
      project,
      task: compactMemoryText(taskText, 700),
      reason: compactMemoryText(reason, 300),
      attempt: Number(item.attempt || 0) || undefined,
      source,
      message_id: message?.id || "",
      timestamp: message?.timestamp || "",
    });
  };

  const addFromMessage = (message: any, source = "group-message") => {
    const assignments = Array.isArray(message?.assignments) ? message.assignments : [];
    for (const assignment of assignments) {
      if (assignment?.rework || /返工|rework/i.test(String(assignment?.task || ""))) {
        addItem(assignment, source, message);
      }
    }
    const content = String(message?.content || "");
    if (/主 Agent 返工工作单|第 \d+ 轮验收后返工|系统验收门禁/.test(content)) {
      addItem({
        project: message?.agent || "coordinator",
        task: content,
        reason: "主 Agent 复盘后生成返工证据",
      }, source, message);
    }
  };

  addFromMessage(execution, "execution");
  if (task?.group_id && task?.id) {
    for (const message of getGroupMessages(task.group_id)) {
      if (message?.task_id !== task.id) continue;
      addFromMessage(message, "group-message");
    }
  }
  const seen = new Set<string>();
  return items.filter((item: any) => {
    const key = `${item.project}|${item.message_id}|${item.task}|${item.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferTaskImpactScope(task: any, assignments: any[] = [], mentions: any[] = []) {
  const text = [task?.title, task?.description, task?.business_goal, task?.acceptance_criteria, ...(assignments || []).map((item: any) => `${item.project || ""} ${item.task || ""}`)].filter(Boolean).join("\n");
  const projectNames = uniqueStrings(
    assignments.map((item: any) => item.project || item.agent),
    mentions.map((item: any) => item.targetName || String(item.mention || "").replace(/^@/, "")),
    [task?.target_project].filter(Boolean)
  ).filter(Boolean);
  const areas: string[] = [];
  if (/前端|页面|组件|vue|react|css|样式|表单|路由|frontend|web|ui/i.test(text)) areas.push("前端页面/组件");
  if (/后端|接口|api|服务|controller|service|route|数据库|sql|schema|backend/i.test(text)) areas.push("后端接口/服务");
  if (/测试|验证|test|spec|e2e|lint|build/i.test(text)) areas.push("测试/构建验证");
  if (/文档|README|markdown|prd|说明/i.test(text)) areas.push("文档/说明");
  const fileHints = uniqueStrings((text.match(/[\w@./-]+\.(?:vue|tsx?|jsx?|css|scss|json|md|yml|yaml|py|go|rs|java|kt|sql)/gi) || []).slice(0, 20));
  return {
    projects: projectNames,
    areas: areas.length ? areas : ["待主 Agent 按项目结构确认"],
    file_hints: fileHints,
    requires_code_changes: taskRequiresCodeChanges(task),
    requires_verification: taskRequiresVerification(task),
  };
}

function buildTaskSandboxRehearsal(task: any, group: any, coordinatorResult: any = {}, assignments: any[] = [], mentions: any[] = [], dispatchPolicy: any = null) {
  const impact = inferTaskImpactScope(task, assignments, mentions);
  const targetProjects = impact.projects.length ? impact.projects : (group?.members || []).map((m: any) => m.project).filter(Boolean).slice(0, 6);
  const verificationPlan = targetProjects.map((project: string) => {
    const config = getConfigs().find((item: any) => item.name === project);
    const info = config ? getConfigInfo(config.path) : [];
    const workDir = info?.[0]?.workDir || "";
    return {
      project,
      commands: workDir ? buildProjectVerificationHints(project, workDir).slice(0, 5) : [],
    };
  });
  const riskItems = uniqueStrings([
    dispatchPolicy?.risk,
    ...(Array.isArray(coordinatorResult?.missingInfo) ? coordinatorResult.missingInfo : []),
    taskRequiresCodeChanges(task) ? "完成时必须捕获真实文件变更" : "允许无代码变更，但必须说明原因",
    taskRequiresVerification(task) ? "完成时必须提供已执行验证证据" : "验证可按任务性质降级",
  ].filter(Boolean));
  return {
    id: `sandbox_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    generated_at: new Date().toISOString(),
    status: dispatchPolicy?.requiresConfirmation ? "needs_user" : "ready",
    title: task?.title || "任务前沙盘演练",
    business_goal: task?.business_goal || task?.title || "",
    dispatch_action: dispatchPolicy?.action || "delegate",
    dispatch_reason: dispatchPolicy?.reason || "主 Agent 已生成可执行计划",
    impact_scope: impact,
    agent_plan: (assignments || []).map((item: any, index: number) => ({
      order: index + 1,
      project: item.project || item.agent || item.target_project || "未命名 Agent",
      task: item.task || item.summary || item.description || "等待主 Agent 补全工作单",
      reason: item.reason || "",
      depends_on: item.dependsOn || item.depends_on || [],
    })),
    verification_plan: verificationPlan,
    risks: riskItems,
    gate_requirements: [
      "主 Agent 计划与派发证据",
      "子 Agent 结构化回执",
      taskRequiresCodeChanges(task) ? "真实文件变更" : "代码变更可选",
      taskRequiresVerification(task) ? "已执行验证记录" : "验证记录可选",
      "主 Agent 最终验收",
    ],
  };
}

function buildAcceptanceGate(task: any, execution: any, summary: any, finalStatus: string) {
  const checks = [
    { id: "coordinator_plan", label: "主 Agent 计划", ok: Number(summary.coordination_plan_count || 0) > 0, detail: `计划 ${summary.coordination_plan_count || 0} 条` },
    { id: "assignment", label: "子 Agent 派发", ok: Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group", detail: `派发 ${summary.assignment_count || 0} 条` },
    { id: "worker_receipt", label: "子 Agent 回执", ok: (summary.receipt_statuses || []).some((item: any) => item.status === "done") || task?.assign_type !== "group", detail: `回执 ${(summary.receipt_statuses || []).length} 条` },
    { id: "ack_gate", label: "ACK 前置审核", ok: !(taskRequiresCodeChanges(task) || taskRequiresVerification(task)) || summary.ack_gate_passed === true, detail: summary.ack_review?.rejected?.length ? `需重写 ACK ${summary.ack_review.rejected.length} 条` : "通过" },
    { id: "receipt_quality", label: "回执质量", ok: !taskRequiresCodeChanges(task) && !taskRequiresVerification(task) || summary.receipt_quality_gate_passed === true, detail: summary.weak_receipt_quality?.length ? `弱回执 ${summary.weak_receipt_quality.length} 条` : "通过" },
    { id: "contract_injection", label: "契约注入依赖 Agent", ok: summary.contract_injection_gate_passed !== false, detail: summary.contract_injection_gate?.missing?.length ? `待注入 ${summary.contract_injection_gate.missing.length} 个 Agent` : "通过" },
    { id: "final_review", label: "主 Agent 验收", ok: !!summary.has_final_review || finalStatus === "failed" || task?.assign_type !== "group", detail: summary.review_status || "" },
    { id: "actual_changes", label: "真实文件变更", ok: !taskRequiresCodeChanges(task) || Number(summary.actual_file_change_count || 0) > 0, detail: `变更 ${summary.actual_file_change_count || 0} 个文件` },
    { id: "verification", label: "已执行验证", ok: !taskRequiresVerification(task) || Number(summary.verification_executed?.length || 0) > 0, detail: `已执行 ${summary.verification_executed?.length || 0} 条` },
    { id: "required_verification", label: "项目验证命令覆盖", ok: !taskRequiresVerification(task) || summary.verification_required_gate_passed !== false, detail: summary.verification_required_missing?.length ? `缺 ${summary.verification_required_missing.length} 项` : "已覆盖" },
    { id: "verification_source", label: "独立 Runner 验证来源", ok: !taskRequiresVerification(task) || summary.verification_source_gate_passed === true, detail: `外部 Runner ${summary.external_runner_verification_count || 0} 条` },
    { id: "agent_qa", label: "Agent 协作问答", ok: !taskRequiresAgentQa(task) || summary.agent_qa_gate_passed === true, detail: taskRequiresAgentQa(task) ? `问答 ${summary.agent_qa_count || 0}，采纳 ${summary.agent_qa_accepted_count || 0}，续跑 ${summary.agent_qa_resumed_count || 0}` : "未要求" },
    { id: "goal_coverage", label: "目标覆盖", ok: finalStatus === "failed" || task?.assign_type !== "group" || (!!summary.has_final_review && !(summary.blockers || []).length && !(summary.blocking_needs || []).length), detail: summary.has_final_review ? "已完成主 Agent 最终复盘" : "等待主 Agent 最终复盘确认目标覆盖" },
    { id: "no_blockers", label: "无开放阻塞", ok: !(summary.blockers || []).length && !(summary.blocking_needs || []).length && !(summary.agent_qa_has_open_items), detail: `阻塞 ${(summary.blockers || []).length}，待补 ${(summary.blocking_needs || []).length}` },
    { id: "policy", label: "项目边界", ok: summary.project_policy_gate_passed !== false, detail: summary.project_policy_violations?.length ? `违规 ${summary.project_policy_violations.length} 项` : "通过" },
  ];
  const failed = checks.filter(item => !item.ok);
  return {
    pass: failed.length === 0,
    status: failed.length === 0 ? "passed" : finalStatus === "failed" ? "failed" : "blocked",
    failed_count: failed.length,
    checks,
    failed_checks: failed,
    generated_at: new Date().toISOString(),
  };
}
function taskRequiresCodeChanges(task: any) {
  if (task?.requires_code_changes === false || task?.requiresCodeChanges === false) return false;
  return task?.workflow_type === "daily_dev";
}

function buildDeliverySummary(task: any, execution: any, finalStatus: string) {
  const latestTask = task?.id ? loadTasks().find((item: any) => item.id === task.id) : null;
  task = latestTask ? { ...task, ...latestTask } : task;
  const executionText = execution?.report || execution?.result || "";
  const kernelExecutions = task?.id ? listExecutions({ taskId: task.id }) : [];
  const receiptCandidates = [
    ...kernelExecutions.map((record: any) => record.receipt).filter(Boolean),
    ...(execution?.receipt ? [execution.receipt] : []),
    ...parseFormattedReceiptsFromText(executionText),
  ].filter(Boolean);
  // Execution entities contain the newest durable receipt for each Worker.
  // Historical blocked/missing receipts must not override a later done receipt.
  const receiptAgents = new Set<string>();
  const receipts = receiptCandidates.filter((receipt: any) => {
    const agent = String(receipt?.agent || "").trim().toLowerCase();
    if (!agent) return true;
    if (receiptAgents.has(agent)) return false;
    receiptAgents.add(agent);
    return true;
  });
  const actualFileChanges = collectTaskActualFileChanges(task, execution);
  const coordinationPlans = collectTaskCoordinationPlans(task, execution);
  const latestCoordinationPlan = coordinationPlans[coordinationPlans.length - 1] || null;
  const assignmentEvidence = collectTaskAssignmentEvidence(task, execution);
  const dependencyEvidence = assignmentEvidence.filter((item: any) => item.dependsOn);
  const continuationEvidence = assignmentEvidence.filter((item: any) => item.rework || item.continuationStrategy);
  const reworkEvidence = collectTaskReworkEvidence(task, execution);
  const workerNotifications = parseTaskNotificationsFromText(executionText);
  const agents = uniqueStrings(
    receipts.map((receipt: any) => receipt.agent),
    workerNotifications.map((item: any) => item.task_id),
    assignmentEvidence.map((item: any) => item.project)
  );
  const actualFilePaths = uniqueStrings(actualFileChanges.map((file: any) => file.path));
  const filesChanged = uniqueStrings(...receipts.map((receipt: any) => receipt.filesChanged), actualFilePaths);
  const verification = uniqueStrings(...receipts.map((receipt: any) => receipt.verification));
  const verificationGate = getVerificationEvidenceGate(receipts);
  const requiredVerificationCoverage = getRequiredVerificationCoverage(receipts);
  const externalRunnerVerification = uniqueStrings(
    ...receipts.map((receipt: any) => (receipt.verification || []).filter(
      (item: any) => /passed by external runner\s*\(exit 0\)/i.test(String(item))
    ))
  );
  const projectAgentProfiles = agents
    .map((agent: string) => getProjectAgentCapabilityProfile(agent))
    .filter((profile: any) => profile.configured);
  const policyEvidenceExclusions = uniqueStrings(
    Array.isArray(task?.policy_evidence_exclusions) ? task.policy_evidence_exclusions : [],
    task?.workflow_meta?.smoke_test && task?.workflow_meta?.smoke_file ? [task.workflow_meta.smoke_file] : []
  );
  const projectPolicyViolations = collectProjectPolicyViolations(actualFileChanges, policyEvidenceExclusions);
  const blockers = uniqueStrings(...receipts.map((receipt: any) => receipt.blockers));
  if (projectPolicyViolations.length) blockers.push(...projectPolicyViolations.map((item: any) => item.message));
  const needs = uniqueStrings(...receipts.map((receipt: any) => receipt.needs));
  if (finalStatus !== "done" && execution?.detail && !needs.length && !blockers.length) {
    needs.push(String(execution.detail));
  }
  const actions = uniqueStrings(...receipts.map((receipt: any) => receipt.actions));
  const advisoryNeeds = needs.filter((item: any) => isAdvisoryNeed(item, task));
  const blockingNeeds = needs.filter((item: any) => !advisoryNeeds.includes(item));
  const receiptStatuses = receipts.map((receipt: any) => ({
    agent: receipt.agent,
    status: receipt.status,
    summary: receipt.summary || "",
    memoryUsed: Array.isArray(receipt.memoryUsed) ? receipt.memoryUsed.slice(0, 12) : [],
    memoryIgnored: Array.isArray(receipt.memoryIgnored) ? receipt.memoryIgnored.slice(0, 12) : [],
  }));
  const receiptEvidence = receipts.map((receipt: any) => ({
    agent: receipt.agent || "",
    status: receipt.status || "",
    summary: String(receipt.summary || "").slice(0, 800),
    actions: Array.isArray(receipt.actions) ? receipt.actions.slice(0, 20) : [],
    filesChanged: Array.isArray(receipt.filesChanged) ? receipt.filesChanged.slice(0, 50) : [],
    verification: Array.isArray(receipt.verification) ? receipt.verification.slice(0, 30) : [],
    ack: receipt.ack || null,
    contractChanges: Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes).slice(0, 12) : [],
    memoryUsed: Array.isArray(receipt.memoryUsed) ? receipt.memoryUsed.slice(0, 20) : [],
    memoryIgnored: Array.isArray(receipt.memoryIgnored) ? receipt.memoryIgnored.slice(0, 20) : [],
    blockers: Array.isArray(receipt.blockers) ? receipt.blockers.slice(0, 20) : [],
    needs: Array.isArray(receipt.needs) ? receipt.needs.slice(0, 20) : [],
  }));
  const memoryUsageEvidence = receiptEvidence
    .filter((receipt: any) => receipt.memoryUsed?.length || receipt.memoryIgnored?.length)
    .map((receipt: any) => ({
      agent: receipt.agent,
      used: receipt.memoryUsed || [],
      ignored: receipt.memoryIgnored || [],
    }));
  const receiptQuality = receiptEvidence.map((receipt: any) => ({
    agent: receipt.agent || "",
    status: receipt.status || "",
    score: scoreChildAgentReceipt(task, receipt).score,
    grade: scoreChildAgentReceipt(task, receipt).grade,
    missing: scoreChildAgentReceipt(task, receipt).missing,
  }));
  const doneReceiptQuality = receiptQuality.filter((item: any) => item.status === "done");
  const receiptQualityGatePassed = !taskRequiresCodeChanges(task) && !taskRequiresVerification(task)
    ? true
    : doneReceiptQuality.length > 0 && doneReceiptQuality.every((item: any) => item.grade === "good");
  const ackReviewForGate = buildAckPreflightReview(task, receiptEvidence, assignmentEvidence.map((item: any) => ({ project: item.project, objective: item.task })));
  const ackGatePassed = !(taskRequiresCodeChanges(task) || taskRequiresVerification(task))
    || (ackReviewForGate.status === "approved" && !ackReviewForGate.rejected?.length);
  const contractSyncForGate = extractContractSyncHints(task, {
    receipts: receiptEvidence,
    assignment_evidence: assignmentEvidence,
  });
  const contractTransferForGate = buildContractTransferPlan(
    contractSyncForGate,
    assignmentEvidence.map((item: any) => ({ project: item.project, objective: item.task }))
  );
  const contractInjectionGate = evaluateContractInjectionGate(contractTransferForGate.rows || [], assignmentEvidence);
  const review = execution?.review || null;
  const reviewStatus = review?.status || "";
  const taskAgentQa = getAgentQaItemsForGroup(String(task?.group_id || task?.groupId || ""), 120)
    .filter((item: any) => !task?.id || !item.task_id || item.task_id === task.id)
    .map((item: any) => ({
      id: item.id,
      from_agent: item.from_agent,
      to_agent: item.to_agent,
      type: item.type,
      status: item.status,
      question: item.question,
      answer: item.answer,
      blocking: item.blocking !== false,
      execution_id: item.execution_id || "",
      deadline_at: item.deadline_at || item.timeout_at || "",
      evidence: item.evidence || [],
      answer_evidence: item.answer_evidence || [],
      routing: item.routing || null,
      admission: item.admission || null,
      acceptance: item.acceptance || null,
      permission_contract: item.permission_contract || null,
      permission_boundary: item.permission_boundary || null,
      arbitration: item.arbitration || null,
      timeout_at: item.timeout_at || "",
      injected_at: item.injected_at || "",
      resumed_at: item.resumed_at || "",
      retry_count: Number(item.retry_count || 0),
      manual_takeover: !!item.manual_takeover,
    }));
  const openAgentQa = taskAgentQa.filter((item: any) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || "")));
  const resolvedAgentQa = taskAgentQa.filter((item: any) => ["answered", "injected", "resumed"].includes(String(item.status || "")));
  const acceptedAgentQa = taskAgentQa.filter((item: any) => item.acceptance?.accepted === true);
  const resumedAgentQa = taskAgentQa.filter((item: any) => item.status === "resumed" || item.resumed_at);
  const agentQaRequired = taskRequiresAgentQa(task);
  const headline = finalStatus === "done"
    ? "主 Agent 已验收完成"
    : finalStatus === "failed"
      ? "任务执行失败"
      : "任务仍需继续推进";
  const taskSessions = task?.id ? listTaskAgentSessions({ taskId: task.id }) : [];
  const sessionContinuity = taskSessions.map((session: any) => ({
    id: session.id,
    project: session.project,
    executor: session.agentType,
    native_session_id: session.nativeSessionId || "",
    resume_mode: session.resumeMode,
    status: session.status,
    turn_count: Number(session.turnCount || 0),
    last_turn_succeeded: session.lastTurnSucceeded,
    degraded: session.resumeMode === "scratchpad" && getTaskAgentSessionContinuity(session).degraded,
    reason: session.lastError || session.closeReason || "",
  }));
  const lifecycleState = task?.status === "cancelled" ? "cancelled"
    : finalStatus === "done" ? "completed"
      : finalStatus === "failed" ? "failed"
        : openAgentQa.length ? "waiting_dependency"
          : reworkEvidence.length ? "rework"
            : task?.status === "pending" || task?.status === "queued" ? "queued"
              : review ? "reviewing" : "executing";

  const summary: any = {
    headline,
    status: finalStatus,
    detail: execution?.detail || "",
    workflow_type: task?.workflow_type || "general",
    business_goal: task?.business_goal || task?.title || "",
    coordination_plans: coordinationPlans,
    latest_coordination_plan: latestCoordinationPlan,
    coordination_plan_count: coordinationPlans.length,
    assignment_evidence: assignmentEvidence,
    assignment_count: assignmentEvidence.length,
    dependency_evidence: dependencyEvidence,
    dependency_count: dependencyEvidence.length,
    continuation_evidence: continuationEvidence,
    continuation_count: continuationEvidence.length,
    rework_evidence: reworkEvidence,
    rework_count: reworkEvidence.length,
    has_rework_evidence: reworkEvidence.length > 0,
    requires_code_changes: taskRequiresCodeChanges(task),
    requires_verification: taskRequiresVerification(task),
    agents,
    project_agent_profiles: projectAgentProfiles,
    policy_evidence_exclusions: policyEvidenceExclusions,
    project_policy_violations: projectPolicyViolations,
    project_policy_gate_passed: projectPolicyViolations.length === 0,
    worker_notifications: workerNotifications,
    worker_notification_count: workerNotifications.length,
    worker_notification_statuses: workerNotifications.map((item: any) => ({
      task_id: item.task_id,
      status: item.status,
      receipt_status: item.receipt_status,
      summary: item.summary,
    })),
    agent_qa: taskAgentQa,
    agent_qa_count: taskAgentQa.length,
    agent_qa_open_count: openAgentQa.length,
    agent_qa_resolved_count: resolvedAgentQa.length,
    agent_qa_has_open_items: openAgentQa.length > 0,
    agent_qa_required: agentQaRequired,
    agent_qa_accepted_count: acceptedAgentQa.length,
    agent_qa_resumed_count: resumedAgentQa.length,
    agent_qa_gate_passed: !agentQaRequired || (acceptedAgentQa.length > 0 && resumedAgentQa.length > 0),
    sandbox_rehearsal: task?.workflow_meta?.sandbox_rehearsal || task?.sandbox_rehearsal || execution?.sandbox_rehearsal || null,
    timeline: getTaskTimeline(task, execution),
    receipt_statuses: receiptStatuses,
    receipts: receiptEvidence,
    receipt_quality: receiptQuality,
    receipt_quality_gate_passed: receiptQualityGatePassed,
    weak_receipt_quality: receiptQuality.filter((item: any) => item.grade !== "good"),
    ack_review: ackReviewForGate,
    ack_gate_passed: ackGatePassed,
    contract_sync: contractSyncForGate,
    contract_transfer: contractTransferForGate,
    contract_injection_required: contractTransferForGate.required === true,
    contract_injection_status: contractInjectionGate.status,
    contract_injection_rows: contractInjectionGate.rows,
    contract_injection_gate: contractInjectionGate,
    contract_injection_gate_passed: contractInjectionGate.pass,
    memory_usage: memoryUsageEvidence,
    memory_usage_count: memoryUsageEvidence.length,
    memory_usage_declared: memoryUsageEvidence.some((item: any) => item.used?.length),
    actions,
    files_changed: filesChanged,
    actual_file_changes: actualFileChanges,
    actual_file_change_count: actualFileChanges.length,
    has_actual_file_changes: actualFileChanges.length > 0,
    verification,
    verification_executed: verificationGate.executed,
    verification_suggested: verificationGate.suggested,
    verification_failed: verificationGate.failed,
    verification_required: requiredVerificationCoverage.required,
    verification_required_missing: requiredVerificationCoverage.missing,
    verification_required_covered: requiredVerificationCoverage.covered,
    external_runner_verification: externalRunnerVerification,
    external_runner_verification_count: externalRunnerVerification.length,
    verification_sources: [
      ...(externalRunnerVerification.length ? ["external_runner"] : []),
      ...(verificationGate.executed.length > externalRunnerVerification.length ? ["agent_receipt"] : []),
    ],
    verification_source_gate_passed: !taskRequiresVerification(task) || externalRunnerVerification.length > 0,
    has_executed_verification: verificationGate.executed.length > 0,
    verification_required_gate_passed: requiredVerificationCoverage.pass,
    verification_gate_passed: verificationGate.pass && requiredVerificationCoverage.pass,
    blockers,
    needs,
    blocking_needs: blockingNeeds,
    advisory_needs: advisoryNeeds,
    review_status: reviewStatus,
    has_final_review: !!review,
    lifecycle: {
      state: lifecycleState,
      terminal: ["completed", "cancelled"].includes(lifecycleState),
      final_acceptance_required: true,
      session_close_rule: "only_after_final_acceptance_or_explicit_cancel",
    },
    session_continuity: sessionContinuity,
    session_count: sessionContinuity.length,
    native_session_count: sessionContinuity.filter((item: any) => item.resume_mode === "native" && item.native_session_id).length,
    degraded_session_count: sessionContinuity.filter((item: any) => item.degraded).length,
    generated_at: new Date().toISOString(),
  };
  summary.acceptance_gate = buildAcceptanceGate(task, execution, summary, finalStatus);
  summary.acceptance_gate_passed = summary.acceptance_gate.pass;
  summary.reasoning_loop = buildTaskReasoningState(task, summary);
  summary.plan_version = summary.reasoning_loop.plan_version;
  summary.reasoning_deviation_count = summary.reasoning_loop.deviations.length;
  summary.reasoning_open_assertions = summary.reasoning_loop.assertions.filter((item: any) => item.status !== "passed").length;
  summary.timeline_count = Array.isArray(summary.timeline) ? summary.timeline.length : 0;
  summary.user_report = buildUserDeliveryReport(
    task,
    summary,
    finalStatus as any,
    execution?.report || execution?.result || execution?.detail || ""
  );
  return summary;
}

function getTaskExecutionFromReceipt(response: string, receipt: any, details: any = {}) {
  if (!receipt) {
    if (checkTaskFailure(response)) {
      return buildTaskExecutionResult("failed", response, { ...details, detail: details.detail || "Agent 输出包含失败标记" });
    }
    if (checkTaskCompletion(response)) {
      return buildTaskExecutionResult("done", response, { ...details, detail: details.detail || "兼容旧 Agent：检测到完成标记但缺少结构化回执" });
    }
    return buildTaskExecutionResult("waiting", response, { ...details, detail: details.detail || "缺少 CCM_AGENT_RECEIPT，无法可靠验收" });
  }

  if (receipt.status === "done") {
    return buildTaskExecutionResult("done", response, { ...details, receipt, detail: receipt.summary || details.detail || "子 Agent 回执确认完成" });
  }
  if (receipt.status === "failed") {
    return buildTaskExecutionResult("failed", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || "子 Agent 回执失败" });
  }
  return buildTaskExecutionResult("waiting", response, { ...details, receipt, detail: receipt.summary || receipt.blockers?.join("；") || details.detail || `子 Agent 回执状态为 ${receipt.status}` });
}

function getGroupTaskExecutionStatus(review: any, coordinatorResult: any, outputText: string, task: any = null) {
  const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
  const action = String(dispatchPolicy.action || "");
  const runtime = String(coordinatorResult?.runtime || "");
  const isDailyDev = task?.workflow_type === "daily_dev";
  const receipts = parseFormattedReceiptsFromText(outputText);
  const childReceipts = receipts.filter((receipt: any) => receipt.agent && receipt.agent !== coordinatorResult?.agent);
  const workerNotifications = parseTaskNotificationsFromText(outputText);
  const verificationGate = getVerificationEvidenceGate(childReceipts);
  const requiredVerificationCoverage = getRequiredVerificationCoverage(childReceipts);
  const coordinatorEvidence = {
    assignments: normalizePlanAssignments(Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : []),
    coordinationPlan: coordinatorResult?.coordinationPlan || null,
    dispatchPolicy,
    executionOrder: coordinatorResult?.executionOrder || "parallel",
    coordinatorRuntime: runtime,
    coordinatorAgent: coordinatorResult?.agent || "",
  };
  const childAgents = uniqueStrings(childReceipts.map((receipt: any) => receipt.agent));
  const assignedProjects = new Set(coordinatorEvidence.assignments.map((item: any) => String(item.project || item.targetName || "").trim()).filter(Boolean));
  const notifiedProjects = new Set(workerNotifications.map((item: any) => String(item.task_id || "").trim()).filter(Boolean));
  const coordinationPlan = coordinatorEvidence.coordinationPlan || {};
  const hasCoordinationPlan = !!coordinationPlan && (
    Array.isArray(coordinationPlan.phases) && coordinationPlan.phases.length > 0
    || Array.isArray(coordinationPlan.targets) && coordinationPlan.targets.length > 0
    || String(coordinationPlan.strategy || "").trim()
  );
  const missingAssignedProjects = childAgents.filter((agent: string) => !assignedProjects.has(agent));
  const missingWorkerNotifications = childAgents.filter((agent: string) => !notifiedProjects.has(agent));
  const buildGroupResult = (status: TaskExecutionStatus, details: any = {}) => buildTaskExecutionResult(status, outputText, {
    ...coordinatorEvidence,
    ...details,
  });

  if (/llm-error|llm-not-configured/.test(runtime) || checkTaskFailure(outputText)) {
    return buildGroupResult("failed", {
      review,
      detail: runtime ? `主 Agent 运行失败：${runtime}` : "协作输出包含失败标记",
    });
  }

  if (dispatchPolicy.requiresConfirmation || action === "ask_user" || action === "hold") {
    return buildGroupResult("waiting", {
      review,
      detail: dispatchPolicy.reason || "主 Agent 需要用户确认后继续",
    });
  }

  if (isDailyDev && childReceipts.length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少子 Agent 回执，不能判定完成；主 Agent 需要派发至少一个项目 Agent 执行代码工作或明确等待用户调整范围",
    });
  }

  if (isDailyDev && childReceipts.some((receipt: any) => receipt.status !== "done")) {
    const failed = childReceipts
      .filter((receipt: any) => receipt.status === "failed")
      .map((receipt: any) => `${receipt.agent}:${receipt.summary || receipt.blockers?.join("；") || "failed"}`)
      .join("；");
    if (failed) {
      return buildGroupResult("failed", {
        review,
        detail: `业务开发任务子 Agent 执行失败：${failed}`,
      });
    }
    const pending = childReceipts
      .filter((receipt: any) => receipt.status !== "done")
      .map((receipt: any) => `${receipt.agent}:${receipt.status}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务仍有子 Agent 未完成：${pending}`,
    });
  }

  const doneReceiptsWithOpenNeeds = childReceipts.filter((receipt: any) => receipt.status === "done" && receiptHasOpenNeeds(receipt, task));
  if (isDailyDev && doneReceiptsWithOpenNeeds.length > 0) {
    const open = doneReceiptsWithOpenNeeds
      .map((receipt: any) => `${receipt.agent}:${[...(splitEvidenceList(receipt.blockers || [])), ...(splitEvidenceList(receipt.needs || []))].join("；")}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务子 Agent 回执仍有未解决阻塞/需要补充：${open}`,
    });
  }

  if (isDailyDev && taskRequiresAgentQa(task)) {
    const qaGate = getTaskAgentQaGate(task);
    if (!qaGate.pass) {
      return buildGroupResult("waiting", {
        review,
        detail: `任务明确要求 Agent 协作问答，但证据不足：问答 ${qaGate.total}，已采纳 ${qaGate.accepted}，已唤醒续跑 ${qaGate.resumed}。主 Agent 必须让相关子 Agent 通过 ask_agent 提问、采纳带证据回答并恢复原任务会话后再验收。`,
        agentQaGate: qaGate,
      });
    }
  }

  if (isDailyDev && !hasCoordinationPlan) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
    });
  }

  if (isDailyDev && coordinatorEvidence.assignments.length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少主 Agent 派发子 Agent 的 assignment evidence，不能判定完成",
    });
  }

  if (isDailyDev && missingAssignedProjects.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少目标子 Agent 的派发证据：${missingAssignedProjects.join("、")}`,
    });
  }

  if (isDailyDev && missingWorkerNotifications.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少目标子 Agent 的 task-notification：${missingWorkerNotifications.join("、")}`,
    });
  }

  if (isDailyDev && !review) {
    return buildGroupResult("waiting", {
      detail: "业务开发任务缺少主 Agent 最终复盘，不能判定完成",
    });
  }

  if (isDailyDev && taskRequiresCodeChanges(task) && collectTaskActualFileChanges(task, {}).length === 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "业务开发任务缺少系统实际捕获的代码变更，不能判定完成；请让子 Agent 执行代码修改，或在创建任务时关闭代码变更要求",
    });
  }

  if (isDailyDev && taskRequiresVerification(task) && !verificationGate.pass) {
    const failed = verificationGate.failed.length ? `失败验证：${verificationGate.failed.join("；")}` : "";
    const suggested = verificationGate.suggested.length ? `仅建议/未执行验证：${verificationGate.suggested.join("；")}` : "";
    return buildGroupResult("waiting", {
      review,
      detail: ["业务开发任务缺少可验收的已执行验证记录，不能判定完成", failed, suggested].filter(Boolean).join("；"),
    });
  }

  if (isDailyDev && taskRequiresVerification(task) && !requiredVerificationCoverage.pass) {
    const missing = requiredVerificationCoverage.missing
      .map((item: any) => `${item.agent}: ${item.required.join(" / ")}`)
      .join("；");
    return buildGroupResult("waiting", {
      review,
      detail: `业务开发任务缺少项目配置验证命令的执行证据，不能判定完成；缺失：${missing}`,
    });
  }

  if (review) {
    const status = String(review.status || "");
    if (status === "complete") {
      return buildGroupResult("done", { review, detail: "主 Agent 复盘判定完成" });
    }
    if (status === "needs_user" || status === "needs_followup") {
      return buildGroupResult("waiting", { review, detail: status === "needs_user" ? "主 Agent 需要用户补充" : "主 Agent 仍发现返工项" });
    }
  }

  if (Array.isArray(coordinatorResult?.assignments) && coordinatorResult.assignments.length > 0) {
    return buildGroupResult("waiting", {
      review,
      detail: "已派发子 Agent，但缺少最终复盘完成证据",
    });
  }

  return buildGroupResult("done", {
    review,
    detail: "主 Agent 已直接处理且未产生子任务",
  });
}

function getDailyDevCompletionGateSelfTest() {
  const task = { workflow_type: "daily_dev", title: "self-test", requires_code_changes: true };
  const taskWithActualChanges = {
    ...task,
    file_changes: {
      files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }],
      count: 1,
    },
  };
  const coordinatorResult = { agent: "coordinator", assignments: [], dispatchPolicy: {} };
  const plannedCoordinatorResult = {
    agent: "coordinator",
    assignments: [{ project: "frontend", task: "修改页面并提交回执" }],
    coordinationPlan: {
      strategy: "research_synthesis_implementation_verification",
      phases: ["理解需求", "分配任务", "协同执行", "复盘验收"],
      targets: ["frontend"],
    },
    dispatchPolicy: {},
  };
  const doneReceipt = {
    agent: "frontend",
    status: "done",
    summary: "完成测试改动",
    actions: ["修改页面"],
    filesChanged: ["src/App.vue"],
    verification: ["npm test"],
    blockers: [],
    needs: [],
  };
  const doneReceiptText = [
    "完成了页面改动",
    "",
    "结构化回执：",
    "- 状态：done",
    "- 摘要：完成测试改动",
    "- 动作：修改页面",
    "- 文件：src/App.vue",
    "- 验证：npm test",
    "- 阻塞：无",
    "- 需要补充：无",
  ].join("\n");
  const doneWorkerOutput = formatCollectedAgentOutput("frontend", doneReceiptText, doneReceipt);
  const noChild = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    "主 Agent 自己说已经完成",
    task
  );
  const withChild = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    [
      "【frontend】",
      "完成了页面改动",
      "",
      "结构化回执：",
      "- 状态：done",
      "- 摘要：完成测试改动",
      "- 动作：修改页面",
      "- 文件：src/App.vue",
      "- 验证：npm test",
      "- 阻塞：无",
      "- 需要补充：无",
    ].join("\n"),
    task
  );
  const withFailedChild = getGroupTaskExecutionStatus(
    { status: "needs_user", content: "主 Agent 复盘发现子 Agent 运行失败" },
    coordinatorResult,
    [
      "【frontend】",
      "执行失败",
      "",
      "结构化回执：",
      "- 状态：failed",
      "- 摘要：spawn EPERM",
      "- 动作：未填写",
      "- 文件：无",
      "- 验证：未提供",
      "- 阻塞：spawn EPERM",
      "- 需要补充：检查运行环境",
    ].join("\n"),
    task
  );
  const withActualChange = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    doneWorkerOutput,
    taskWithActualChanges
  );
  const withActualChangeNoCoordinationEvidence = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    doneWorkerOutput,
    taskWithActualChanges
  );
  const waitingExecutionWithCompleteEvidence = { ...withActualChange, status: "waiting", detail: "" };
  const waitingSummaryWithCompleteEvidence = buildDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, "waiting");
  const waitingEvidencePromotesToDone = canCompleteDailyDevFromDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, waitingSummaryWithCompleteEvidence);
  const blockedVerificationReceipt = { ...doneReceipt, verification: ["mvn test -B -q → 仍需交互审批，命令被沙箱拦截"], blockers: ["mvn test 被沙箱拦截"], needs: ["用户本地补充 mvn test 输出"] };
  const optionalRecommendationDoesNotBlock = !receiptHasOpenNeeds({ ...doneReceipt, blockers: [], needs: ["建议用户 npm start 后人工确认页面样式"] });
  const blockedVerificationOutput = formatCollectedAgentOutput("frontend", "验证被沙箱拦截", blockedVerificationReceipt);
  const blockedVerificationGate = getVerificationEvidenceGate([blockedVerificationReceipt]);
  const zeroFailureVerificationGate = getVerificationEvidenceGate([{ verification: ["npm test — 11/11 通过，0 failed（exit code 0）"] }]);
  const withDoneReceiptButOpenNeeds = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    blockedVerificationOutput,
    taskWithActualChanges
  );
  const blockedSummary = buildDeliverySummary(taskWithActualChanges, withDoneReceiptButOpenNeeds, "waiting");
  const blockedEvidenceDoesNotPromote = !canCompleteDailyDevFromDeliverySummary(taskWithActualChanges, withDoneReceiptButOpenNeeds, blockedSummary);
  const withActualChangeNoExecutedVerification = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    formatCollectedAgentOutput("frontend", [
      "完成了页面改动",
      "",
      "结构化回执：",
      "- 状态：done",
      "- 摘要：完成测试改动",
      "- 动作：修改页面",
      "- 文件：src/App.vue",
      "- 验证：建议运行 npm test",
      "- 阻塞：无",
      "- 需要补充：无",
    ].join("\n"), {
      ...doneReceipt,
      verification: ["建议运行 npm test"],
    }),
    taskWithActualChanges
  );
  const runnerMergedReceipt = extractAgentReceipt([
    "```json",
    "{\"ccm_receipt\":true,\"status\":\"done\",\"summary\":\"完成测试改动\",\"actions\":[\"修改页面\"],\"filesChanged\":[\"src/App.vue\"],\"verification\":[\"等待外部 runner 验证\"],\"blockers\":[],\"needs\":[]}",
    "```",
    "CCM_RUNNER_VERIFICATION",
    "```json",
    "{\"ccm_runner_verification\":true,\"status\":\"passed\",\"verification\":[\"npm run check passed by external runner (exit 0)\",\"npm run build passed by external runner (exit 0)\"],\"failed\":[]}",
    "```",
  ].join("\n"), "frontend");
  const runnerVerificationMerged = !!runnerMergedReceipt
    && runnerMergedReceipt.verification.includes("npm run check passed by external runner (exit 0)")
    && runnerMergedReceipt.verification.includes("npm run build passed by external runner (exit 0)");
  return {
    noChildReceiptStatus: noChild.status,
    noChildReceiptDetail: noChild.detail,
    withChildReceiptStatus: withChild.status,
    withChildReceiptDetail: withChild.detail,
    withFailedChildStatus: withFailedChild.status,
    withFailedChildDetail: withFailedChild.detail,
    withActualChangeStatus: withActualChange.status,
    withActualChangeNoCoordinationEvidenceStatus: withActualChangeNoCoordinationEvidence.status,
    withActualChangeNoCoordinationEvidenceDetail: withActualChangeNoCoordinationEvidence.detail,
    waitingEvidencePromotesToDone,
    blockedVerificationFailsGate: blockedVerificationGate.pass === false && blockedVerificationGate.failed.length > 0,
    zeroFailuresCountAsPass: zeroFailureVerificationGate.pass === true && zeroFailureVerificationGate.failed.length === 0,
    optionalRecommendationDoesNotBlock,
    doneReceiptWithOpenNeedsStatus: withDoneReceiptButOpenNeeds.status,
    blockedEvidenceDoesNotPromote,
    withActualChangeNoExecutedVerificationStatus: withActualChangeNoExecutedVerification.status,
    withActualChangeNoExecutedVerificationDetail: withActualChangeNoExecutedVerification.detail,
    runnerVerificationMerged,
    pass: noChild.status === "waiting"
      && withChild.status === "waiting"
      && withFailedChild.status === "failed"
      && withActualChange.status === "done"
      && waitingEvidencePromotesToDone
      && blockedVerificationGate.pass === false
      && zeroFailureVerificationGate.pass === true
      && optionalRecommendationDoesNotBlock
      && withDoneReceiptButOpenNeeds.status === "waiting"
      && blockedEvidenceDoesNotPromote
      && withActualChangeNoCoordinationEvidence.status === "waiting"
      && withActualChangeNoExecutedVerification.status === "waiting"
      && runnerVerificationMerged,
  };
}

function buildDailyDevWorkflowRehearsal(payload: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const groupId = payload.group_id || payload.groupId || groups[0]?.id || "";
  const group = groups.find((item: any) => item.id === groupId) || groups[0] || null;
  const { normalizedGroup, coordinator, routableMembers, readyMembers } = getReadyDailyDevMembers(group, configs);

  const selectedMember = readyMembers[0] || routableMembers[0] || { project: "demo-agent" };
  const verificationCommands = getConfiguredProjectVerificationCommands(selectedMember.project);
  const verificationText = verificationCommands[0] || "npm run check";
  const businessGoal = compactFormText(payload.business_goal || payload.businessGoal || "演练：给设置页增加一个业务开发闭环状态提示", "演练：给设置页增加一个业务开发闭环状态提示");
  const description = buildDailyDevTaskDescription({
    business_goal: businessGoal,
    scope: payload.scope || "由主 Agent 拆给一个子 Agent，子 Agent 返回结构化回执，主 Agent 完成复盘。",
    documents: payload.documents || "演练不读取真实业务文档，仅验证任务模板和完成门禁。",
    acceptance: payload.acceptance || "必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据和交付摘要。",
    constraints: payload.constraints || "不创建真实任务，不修改业务仓库。",
    requires_code_changes: true,
  });
  const rehearsalReceipt = {
    agent: selectedMember.project,
    status: "done",
    summary: "完成演练改动",
    actions: ["修改演练文件"],
    filesChanged: ["src/daily-dev-rehearsal.ts"],
    verification: [verificationText],
    blockers: [],
    needs: [],
  };
  const receiptText = [
    `【${selectedMember.project}】`,
    "已完成演练改动。",
    "",
    "结构化回执：",
    "- 状态：done",
    "- 摘要：完成演练改动",
    "- 动作：修改演练文件",
    "- 文件：src/daily-dev-rehearsal.ts",
    `- 验证：${verificationText}`,
    "- 阻塞：无",
    "- 需要补充：无",
  ].join("\n");
  const workerNotificationOutput = formatCollectedAgentOutput(selectedMember.project, receiptText, rehearsalReceipt);
  const rehearsalMemory = appendWorkerLedger(createEmptyGroupMemory("daily-dev-rehearsal"), {
    taskId: "daily-dev-rehearsal",
    project: selectedMember.project,
    status: "completed",
    receiptStatus: "done",
    summary: rehearsalReceipt.summary,
    filesChanged: rehearsalReceipt.filesChanged,
    verification: rehearsalReceipt.verification,
    blockers: [],
    needs: [],
  });
  const rehearsalScratchpadContext = buildGroupMemoryContext(rehearsalMemory);
  const review = { status: "complete", content: "主 Agent 复盘完成，演练满足验收证据。" };
  const coordinatorResult = {
    agent: coordinator.project,
    assignments: [{ project: selectedMember.project, task: "执行演练改动" }],
    coordinationPlan: {
      mode: "cc-style-coordinator",
      strategy: "research_synthesis_implementation_verification",
      executionOrder: "parallel",
      phases: ["理解需求", "研究与综合", "分配任务", "协同执行", "复盘验收"],
      targets: [selectedMember.project],
      missingInfo: [],
    },
    dispatchPolicy: {},
    runtime: "rehearsal",
  };
  const baseTask = {
    id: "daily-dev-rehearsal",
    title: businessGoal,
    description,
    group_id: normalizedGroup?.id || "",
    workflow_type: "daily_dev",
    requires_code_changes: true,
    requires_verification: true,
    business_goal: businessGoal,
    acceptance_criteria: "演练验收：必须记录主 Agent 计划、返工证据和已执行验证。",
    source_documents: "接口：POST /api/rehearsal/check\n字段：enabled(boolean), message(string)\n验收：报告展示主 Agent 计划和返工证据。",
  };
  const taskDocumentContext = buildTaskSourceDocumentsContext(baseTask);
  const noChangeExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, baseTask);
  const taskWithChanges = {
    ...baseTask,
    file_changes: {
      files: [{
        path: "src/daily-dev-rehearsal.ts",
        statusText: "修改",
        statusKind: "modified",
        diff: { additions: 3, deletions: 1 },
      }],
      count: 1,
    },
  };
  const doneExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, taskWithChanges);
  const propagatedAssignmentSummary = buildDeliverySummary(
    taskWithChanges,
    doneExecution,
    doneExecution.status === "done" ? "done" : "waiting"
  );
  const deliverySummary = buildDeliverySummary(taskWithChanges, {
    ...doneExecution,
    assignments: [...(doneExecution.assignments || []), {
      project: selectedMember.project,
      task: "主 Agent 返工工作单：补齐演练验证证据",
      reason: "演练模拟：首次回执缺少验证证据",
      rework: true,
      attempt: 2,
      continuationOf: selectedMember.project,
      continuationStrategy: "same_worker_scratchpad",
    }],
  }, doneExecution.status === "done" ? "done" : "waiting");
  const coordinatorProtocol = runCoordinatorProtocolSelfTest();
  const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
  const notificationPass = workerNotificationOutput.includes("<task-notification>")
    && extractTaskNotificationTag(workerNotificationOutput, "task-id") === selectedMember.project
    && extractTaskNotificationTag(workerNotificationOutput, "status") === "completed";
  const scratchpadPass = rehearsalScratchpadContext.includes("Worker scratchpad")
    && rehearsalScratchpadContext.includes("完成演练改动")
    && rehearsalScratchpadContext.includes(verificationText);
  const pass = !!normalizedGroup
    && readyMembers.length > 0
    && coordinatorProtocol.pass
    && reworkProtocol.pass
    && notificationPass
    && scratchpadPass
    && taskDocumentContext.includes("/api/rehearsal/check")
    && noChangeExecution.status === "waiting"
    && doneExecution.status === "done"
    && (doneExecution.assignments || []).length > 0
    && propagatedAssignmentSummary.assignment_count > 0
    && deliverySummary.actual_file_change_count > 0
    && deliverySummary.has_final_review
    && deliverySummary.assignment_count > 0
    && deliverySummary.continuation_count > 0
    && deliverySummary.rework_count > 0
    && deliverySummary.verification_gate_passed;

  return {
    success: true,
    pass,
    status: pass ? "ok" : "fail",
    generated_at: new Date().toISOString(),
    group: normalizedGroup ? {
      id: normalizedGroup.id,
      name: normalizedGroup.name || normalizedGroup.id,
      coordinator: coordinator.project,
      readyMemberCount: readyMembers.length,
      selectedMember: selectedMember.project,
    } : null,
    steps: [
      { id: "business-description", status: businessGoal ? "ok" : "fail", message: "业务描述已生成主 Agent 工作单" },
      { id: "task-document-context", status: taskDocumentContext.includes("/api/rehearsal/check") ? "ok" : "fail", message: taskDocumentContext.includes("/api/rehearsal/check") ? "任务表单里的业务/接口文档会进入主 Agent 文档上下文" : "任务级文档未进入主 Agent 文档上下文" },
      { id: "coordinator-protocol", status: coordinatorProtocol.pass ? "ok" : "fail", message: coordinatorProtocol.pass ? `主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 生成 ${coordinatorProtocol.assignmentCount} 个自包含子任务` : "主 Agent 协调协议自测失败" },
      { id: "coordinator-rework-protocol", status: reworkProtocol.pass ? "ok" : "fail", message: reworkProtocol.pass ? "主 Agent 验收发现缺口时会生成自包含返工工作单" : "主 Agent 返工协议自测失败" },
      { id: "worker-notification", status: notificationPass ? "ok" : "fail", message: notificationPass ? "子 Agent 演练输出已封装为 task-notification 并可被主 Agent 识别" : "子 Agent 演练输出未形成有效 task-notification" },
      { id: "worker-scratchpad", status: scratchpadPass ? "ok" : "fail", message: scratchpadPass ? "Worker 通知已写入协作 scratchpad，可进入后续上下文" : "Worker 通知未进入协作 scratchpad 上下文" },
      { id: "group-ready", status: normalizedGroup && readyMembers.length > 0 ? "ok" : "fail", message: normalizedGroup ? `可用子 Agent ${readyMembers.length} 个` : "没有可用开发群聊" },
      { id: "receipt-gate", status: noChangeExecution.status === "waiting" ? "ok" : "fail", message: "只有子 Agent 回执但没有实际变更时不会误判完成" },
      { id: "file-change-gate", status: doneExecution.status === "done" ? "ok" : "fail", message: "补齐实际文件变更证据后允许完成" },
      { id: "execution-assignment-propagation", status: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "ok" : "fail", message: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "执行结果会携带主 Agent 派发证据，交付摘要可直接验收" : "执行结果缺少主 Agent 派发证据" },
      { id: "assignment-evidence", status: deliverySummary.assignment_count > 0 ? "ok" : "fail", message: deliverySummary.assignment_count > 0 ? `交付摘要捕获 ${deliverySummary.assignment_count} 条主 Agent 派发证据` : "交付摘要未捕获主 Agent 派发证据" },
      { id: "continuation-evidence", status: deliverySummary.continuation_count > 0 ? "ok" : "fail", message: deliverySummary.continuation_count > 0 ? `交付摘要捕获 ${deliverySummary.continuation_count} 条续跑证据` : "交付摘要未捕获续跑证据" },
      { id: "rework-evidence", status: deliverySummary.rework_count > 0 ? "ok" : "fail", message: deliverySummary.rework_count > 0 ? `交付摘要捕获 ${deliverySummary.rework_count} 条返工证据` : "交付摘要未捕获主 Agent 返工证据" },
      { id: "verification-gate", status: deliverySummary.verification_gate_passed ? "ok" : "fail", message: "已执行验证记录会进入交付摘要并作为完成门禁" },
      { id: "delivery-summary", status: deliverySummary.actual_file_change_count > 0 ? "ok" : "fail", message: `交付摘要捕获 ${deliverySummary.actual_file_change_count} 个实际文件变更` },
    ],
    task_description: description,
    task_document_context: taskDocumentContext,
    no_change_result: { status: noChangeExecution.status, detail: noChangeExecution.detail },
    done_result: { status: doneExecution.status, detail: doneExecution.detail },
    propagated_assignment_summary: {
      assignment_count: propagatedAssignmentSummary.assignment_count,
      assignments: propagatedAssignmentSummary.assignment_evidence,
    },
    worker_notification: {
      status: extractTaskNotificationTag(workerNotificationOutput, "status"),
      task_id: extractTaskNotificationTag(workerNotificationOutput, "task-id"),
      receipt_status: extractTaskNotificationTag(workerNotificationOutput, "receipt-status"),
    },
    scratchpad_context: rehearsalScratchpadContext,
    coordinator_protocol: coordinatorProtocol,
    rework_protocol: reworkProtocol,
    delivery_summary: deliverySummary,
  };
}

function normalizeSmokeFilePath(value: any) {
  const raw = String(value || "ccm-daily-dev-smoke.md").trim().replace(/\\/g, "/");
  const file = raw || "ccm-daily-dev-smoke.md";
  if (path.isAbsolute(file) || file.startsWith("~/") || file.includes("\0")) {
    throw new Error("试运行文件必须是项目内相对路径");
  }
  const segments = file.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some(segment => segment === "." || segment === "..")) {
    throw new Error("试运行文件路径不能包含 . 或 ..");
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
    throw new Error("试运行文件路径只能包含字母、数字、点、下划线、短横线和斜杠");
  }
  return file;
}

function selectDailyDevSmokeTarget(payload: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const groupId = payload.group_id || payload.groupId || "";
  const candidates = groupId
    ? groups.filter((group: any) => group.id === groupId)
    : groups;

  for (const group of candidates) {
    const readiness = getReadyDailyDevMembers(group, configs);
    if (readiness.normalizedGroup && readiness.readyMembers.length > 0) {
      const requestedMember = payload.target_member || payload.targetMember || "";
      const selectedMember = readiness.readyMembers.find((member: any) => member.project === requestedMember)
        || readiness.readyMembers[0];
      return {
        group: readiness.normalizedGroup,
        coordinator: readiness.coordinator,
        selectedMember,
        readyMembers: readiness.readyMembers,
      };
    }
  }

  if (groupId) throw new Error("所选开发群聊没有可写工作目录的子 Agent");
  throw new Error("没有可用于真实试运行的开发群聊，请先配置群聊和可写的项目子 Agent");
}

function createDailyDevSmokeTask(payload: any, ctx: CollabCtx) {
  const smokeFile = normalizeSmokeFilePath(payload.smoke_file || payload.smokeFile);
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const groupName = target.group.name || target.group.id;
  const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
  const businessGoal = compactFormText(
    payload.business_goal || payload.businessGoal,
    `真实试运行：验证主 Agent 能派发 ${selectedProject} 子 Agent 完成可验收文件修改`
  );
  const description = buildDailyDevTaskDescription({
    business_goal: businessGoal,
    scope: [
      `主 Agent 必须把本任务派发给 @${selectedProject}。`,
      `${selectedProject} 子 Agent 只允许在自己的项目工作目录内新增或更新 ${smokeFile}。`,
      "文件内容写入本次试运行时间、群聊名称、目标 Agent、执行摘要和验证命令。",
      "不修改业务源码、依赖配置或其他无关文件。"
    ].join("\n"),
    documents: [
      "这是真实日常开发闭环 smoke 任务，用来验证：业务描述 -> 主 Agent 拆分 -> 子 Agent 改文件 -> 回执 -> 主 Agent 复盘 -> 系统捕获实际变更。",
      `目标群聊：${groupName}`,
      `目标子 Agent：${selectedProject}`,
      `目标文件：${smokeFile}`
    ].join("\n"),
    acceptance: [
      `主 Agent 需要明确派发给 @${selectedProject}，不能只给方案。`,
      `${selectedProject} 必须实际新增或更新 ${smokeFile}。`,
      "子 Agent 回复末尾必须追加 CCM_AGENT_RECEIPT，status=done，filesChanged 包含目标文件。",
      "主 Agent 必须完成最终复盘，说明实际文件变更、已执行验证和风险。",
      "系统必须捕获到实际文件变更和已执行验证记录后，任务才允许变为已完成。"
    ].join("\n"),
    constraints: [
      "这是受控试运行任务，目标是验证自动开发闭环。",
      "不要手动标记完成；必须通过队列执行和系统验收完成。",
      "如果无法写入目标文件或无法运行验证，回执 status 不能写 done，必须说明阻塞点。",
      payload.constraints || ""
    ].filter(Boolean).join("\n"),
    requires_code_changes: true,
  });

  const task = createTask({
    title: compactFormText(payload.title, `真实日常开发闭环试运行 - ${selectedProject}`),
    description,
    target_project: target.coordinator?.project || selectedProject,
    group_id: target.group.id,
    assign_type: "group",
    priority: payload.priority || "normal",
    auto_execute: autoExecute,
    workflow_type: "daily_dev",
    requires_code_changes: true,
    requires_verification: true,
    business_goal: businessGoal,
    acceptance_criteria: `修改 ${smokeFile}，子 Agent 回执 done，主 Agent 复盘 complete，系统捕获实际变更和已执行验证记录。`,
    source_documents: `daily-dev smoke target=${selectedProject}; file=${smokeFile}`,
    workflow_meta: {
      smoke_test: true,
      smoke_file: smokeFile,
      target_member: selectedProject,
      group_name: groupName,
    },
  });

  addTaskLog(task.id, "info", `创建真实日常开发闭环试运行任务：${selectedProject} -> ${smokeFile}`);
  let queueResult = null;
  if (autoExecute) queueResult = enqueueTask(task.id, ctx);

  return {
    success: true,
    task,
    group: { id: target.group.id, name: groupName, coordinator: target.coordinator?.project || "" },
    target_member: selectedProject,
    smoke_file: smokeFile,
    queued: !!queueResult?.queued,
    queue_result: queueResult,
    queue_status: getQueueStatus(),
  };
}

function getDailyDevSmokeStatus(payload: any = {}) {
  const tasks = loadTasks();
  const taskId = String(payload.task_id || payload.taskId || "").trim();
  const smokeTasks = tasks
    .filter((task: any) => task?.workflow_type === "daily_dev" && task?.workflow_meta?.smoke_test)
    .sort((a: any, b: any) => String(b.created_at || b.updated_at || "").localeCompare(String(a.created_at || a.updated_at || "")));
  const task = taskId
    ? tasks.find((item: any) => item.id === taskId)
    : smokeTasks[0];
  if (!task || !task.workflow_meta?.smoke_test) {
    return {
      success: true,
      pass: false,
      status: "no_task",
      message: taskId ? "未找到指定真实试运行任务" : "还没有创建真实日常开发闭环试运行任务",
      latest_task_id: smokeTasks[0]?.id || null,
      execution_readiness: getAgentExecutionReadiness(),
    };
  }

  const smokeFile = normalizeSmokeFilePath(task.workflow_meta.smoke_file || payload.smoke_file || payload.smokeFile);
  const group = loadGroups().find((item: any) => item.id === task.group_id) || null;
  const targetMember = task.workflow_meta.target_member || "";
  const runtime = targetMember && group ? resolveMemberRuntime(targetMember, group, getConfigs()) : null;
  const workDir = runtime?.workDir || "";
  const resolvedWorkDir = workDir ? path.resolve(workDir) : "";
  const resolvedSmokePath = resolvedWorkDir ? path.resolve(resolvedWorkDir, smokeFile) : "";
  const insideWorkDir = !!resolvedWorkDir && (resolvedSmokePath === resolvedWorkDir || resolvedSmokePath.startsWith(resolvedWorkDir + path.sep));
  const fileExists = insideWorkDir && fs.existsSync(resolvedSmokePath);
  const stat = fileExists ? fs.statSync(resolvedSmokePath) : null;
  const summary = task.delivery_summary || {};
  const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
  const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const targetAssignment = assignmentEvidence.find((item: any) => item?.project === targetMember);
  const hasTargetAssignment = !!targetAssignment;
  const hasTargetWorkerNotification = workerNotifications.some((item: any) => item?.task_id === targetMember || item?.agent === targetMember);
  const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || task.receipt?.status === "done";
  const hasFinalReview = !!(summary.has_final_review || task.review);
  const actualChangeCount = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
  const executedVerificationCount = Number(summary.verification_executed?.length || 0);
  const requiredVerificationPassed = summary.verification_required_gate_passed !== false;
  const openSmokeGaps = [
    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary.blocking_needs)
      ? summary.blocking_needs
      : (Array.isArray(summary.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, task)) : [])),
    ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
    ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
  ].filter(Boolean);
  const pass = task.status === "done"
    && fileExists
    && coordinationPlanCount > 0
    && hasTargetAssignment
    && hasTargetWorkerNotification
    && actualChangeCount > 0
    && hasDoneReceipt
    && hasFinalReview
    && executedVerificationCount > 0
    && requiredVerificationPassed
    && openSmokeGaps.length === 0;
  const missing = [
    task.status === "done" ? "" : "任务尚未完成",
    fileExists ? "" : "目标 smoke 文件不存在",
    coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据",
    hasTargetAssignment ? "" : "缺少主 Agent 派发给目标子 Agent 的证据",
    hasTargetWorkerNotification ? "" : "缺少目标子 Agent 的 Worker 通知",
    actualChangeCount > 0 ? "" : "未捕获实际文件变更",
    hasDoneReceipt ? "" : "缺少子 Agent done 回执",
    hasFinalReview ? "" : "缺少主 Agent 最终复盘",
    executedVerificationCount > 0 ? "" : "缺少已执行验证记录",
    requiredVerificationPassed ? "" : "缺少项目配置验证命令证据",
    openSmokeGaps.length ? `仍有未解决阻塞/补充/失败验证：${openSmokeGaps.slice(0, 3).join("；")}` : "",
  ].filter(Boolean);
  const readiness = getTaskAgentExecutionReadiness(task);
  const status = pass
    ? "passed"
    : readiness.ready === false
      ? "blocked"
      : (task.status === "failed" ? "failed" : "waiting");

  return {
    success: true,
    pass,
    status,
    message: pass
      ? "真实日常开发闭环试运行已通过"
      : (status === "blocked" ? readiness.message : `真实试运行尚未通过：${missing.join("、") || task.status_detail || "等待执行结果"}`),
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      status_detail: task.status_detail || "",
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed_at: task.completed_at || null,
    },
    target: {
      group_id: task.group_id || "",
      group_name: group?.name || task.workflow_meta.group_name || "",
      member: targetMember,
      work_dir: workDir,
      smoke_file: smokeFile,
      smoke_path: insideWorkDir ? resolvedSmokePath : "",
      file_exists: fileExists,
      file_size: stat?.size || 0,
      file_modified_at: stat ? stat.mtime.toISOString() : "",
    },
    evidence: {
      task_done: task.status === "done",
      file_exists: fileExists,
      assignment_count: assignmentEvidence.length,
      has_target_assignment: hasTargetAssignment,
      target_assignment: targetAssignment || null,
      worker_notification_count: workerNotifications.length,
      has_target_worker_notification: hasTargetWorkerNotification,
      coordination_plan_count: coordinationPlanCount,
      actual_file_change_count: actualChangeCount,
      has_done_receipt: hasDoneReceipt,
      has_final_review: hasFinalReview,
      executed_verification_count: executedVerificationCount,
      required_verification_passed: requiredVerificationPassed,
      missing,
      delivery_summary: summary,
    },
    execution_readiness: readiness,
  };
}

async function runAgentCliProbe(payload: any, ctx: CollabCtx) {
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const runtime = resolveMemberRuntime(selectedProject, target.group, getConfigs());
  if (!runtime?.workDir) throw new Error("未找到探针目标 Agent 的工作目录");
  const requestedAgentType = String(payload.agent_type || payload.agentType || "").trim().toLowerCase();
  const requestedRuntime = requestedAgentType
    ? getPublicAgentRuntimes().find((item: any) => item.id === requestedAgentType || item.aliases?.includes(requestedAgentType))
    : null;
  if (requestedAgentType && !requestedRuntime) throw new Error(`不支持的 Agent Runtime：${requestedAgentType}`);
  const agentType = requestedRuntime?.id || normalizeAgentRuntimeId(runtime.agentType || "claudecode");
  const probeTarget = {
    group_id: target.group.id,
    group_name: target.group.name || target.group.id,
    project: selectedProject,
    agent_type: agentType,
    work_dir: runtime.workDir,
  };
  const readiness = getAgentProbeExecutionReadiness(probeTarget);
  if (!readiness.ready) {
    const fixActions = readiness.fix_actions || buildAgentExecutionFixActions({ error: readiness.message, probe: readiness.probe, agentType });
    const result = {
      success: false,
      blocked: true,
      message: readiness.message,
      error: readiness.message,
      fix_actions: fixActions,
      target: probeTarget,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  }
  const started = Date.now();
  const capabilityWrite = payload.capability_write !== false && payload.capabilityWrite !== false;
  const writeToken = `CCM_WRITE_OK_${crypto.randomBytes(6).toString("hex")}`;
  const writeFileName = `.ccm-permission-probe-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.tmp`;
  const writeFilePath = path.join(runtime.workDir, writeFileName);
  const verifyWriteCapability = () => {
    if (!capabilityWrite) return { requested: false, pass: true, file: "", reason: "只读连通性探针" };
    try {
      const content = fs.existsSync(writeFilePath) ? fs.readFileSync(writeFilePath, "utf-8").trim() : "";
      return { requested: true, pass: content === writeToken, file: writeFileName, reason: content === writeToken ? "项目内写入握手通过" : "Agent 未能在项目目录写入握手文件" };
    } catch (error: any) {
      return { requested: true, pass: false, file: writeFileName, reason: `读取握手文件失败：${error?.message || error}` };
    }
  };
  const cleanupWriteProbe = () => { try { if (fs.existsSync(writeFilePath)) fs.unlinkSync(writeFilePath); } catch {} };
  const prompt = capabilityWrite ? [
    "这是 cc-connect 执行权限握手，不是业务任务。",
    `请使用你的文件写入工具，在当前项目根目录创建文件 ${writeFileName}，内容必须且只能是：${writeToken}`,
    "不要修改其他文件，不要删除这个握手文件；宿主会核验并自动清理。",
    "完成写入后只回复一行：CCM_AGENT_PROBE_OK",
  ].join("\n") : [
    "这是 cc-connect 执行通道健康探针。",
    "请不要修改任何文件，不要运行写入命令。",
    "只回复一行：CCM_AGENT_PROBE_OK",
  ].join("\n");
  try {
    const toolContext = buildAgentToolContext(ctx, target.group, selectedProject);
    const runtimeToolContext = prepareAgentRuntimeTools(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools);
    const timeoutMs = Math.max(15000, Math.min(300000, Number(payload.timeout_ms || payload.timeoutMs || 120000)));
    if (payload.native_session || payload.nativeSession) {
      const probeTaskId = `native-probe-${agentType}-${Date.now()}`;
      let nativeSessionId = agentType === "claudecode" ? crypto.randomUUID() : "";
      let firstErrored = false;
      const firstMarker = "CCM_NATIVE_SESSION_ROUND_1_OK";
      const firstOutput = await ctx.callAgentForGroupStream(selectedProject, `${prompt}\n本轮改为只回复一行：${firstMarker}`, runtime.workDir, agentType, {
        groupId: target.group.id,
        timeoutMs,
        allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
        taskId: probeTaskId,
        agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: false },
        onDone: (opts: any) => {
          firstErrored = opts.isError === true;
          nativeSessionId = String(opts.nativeSessionId || nativeSessionId || "");
        },
      });
      const writeCapability = verifyWriteCapability();
      cleanupWriteProbe();
      const firstOk = !firstErrored && firstOutput.includes(firstMarker) && !!nativeSessionId && writeCapability.pass;
      let secondErrored = false;
      const secondMarker = "CCM_NATIVE_SESSION_ROUND_2_OK";
      const secondOutput = firstOk
        ? await ctx.callAgentForGroupStream(selectedProject, `继续同一个健康探针会话。不要修改文件，只回复一行：${secondMarker}`, runtime.workDir, agentType, {
          groupId: target.group.id,
          timeoutMs,
          allowedTools: toolContext.allowedTools,
          mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
          taskId: probeTaskId,
          agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: true },
          onDone: (opts: any) => { secondErrored = opts.isError === true; },
        })
        : "";
      const ok = firstOk && !secondErrored && secondOutput.includes(secondMarker);
      const outputFailure = getAgentProbeOutputFailure(firstOutput || secondOutput);
      const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(firstOutput || secondOutput || ""));
      const nativeFailureMessage = !writeCapability.pass && explicitPermissionDrift
        ? `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`
        : (!writeCapability.pass && outputFailure.error !== "empty_output"
          ? outputFailure.message
          : (!writeCapability.pass ? `Agent 未完成项目写入握手：${writeCapability.reason}` : "Agent 原生会话两轮续跑探针失败"));
      const result = {
        success: ok,
        blocked: false,
        message: ok ? "Agent 原生会话两轮续跑与项目写入握手通过" : nativeFailureMessage,
        error: ok ? "" : (!writeCapability.pass && !explicitPermissionDrift ? outputFailure.error : (!writeCapability.pass ? writeCapability.reason : compactMemoryText(firstOutput || secondOutput || "未捕获探针输出", 500))),
        fix_actions: ok ? [] : buildAgentExecutionFixActions({ error: firstOutput || secondOutput, agentType }),
        execution_path: readiness.mode,
        expected_marker: secondMarker,
        target: probeTarget,
        duration_ms: Date.now() - started,
        native_session: { captured: !!nativeSessionId, session_id: nativeSessionId, first_round: firstOk, second_round: !secondErrored && secondOutput.includes(secondMarker) },
        capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
        output: compactMemoryText(secondOutput || firstOutput, 1000),
        readiness,
      };
      writeAgentProbeStatus(result);
      return result;
    }
    const output = await ctx.callAgent(selectedProject, prompt, runtime.workDir, agentType, Number(payload.timeout_ms || payload.timeoutMs || 120000), {
      tab: "groups",
      groupId: target.group.id,
      project: selectedProject,
      probe: true,
      allowedTools: toolContext.allowedTools,
      mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
    });
    const writeCapability = verifyWriteCapability();
    cleanupWriteProbe();
    const ok = /CCM_AGENT_PROBE_OK/i.test(output) && writeCapability.pass;
    const outputFailure = getAgentProbeOutputFailure(output);
    const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(output || ""));
    const failure = ok ? null : (!writeCapability.pass && explicitPermissionDrift)
      ? { message: `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`, error: writeCapability.reason }
      : (!writeCapability.pass && outputFailure.error === "empty_output")
        ? { message: `Agent 未完成项目写入握手：${writeCapability.reason}`, error: writeCapability.reason }
        : outputFailure;
    const fixActions = ok ? [] : buildAgentExecutionFixActions({
      error: failure?.error || failure?.message || output,
      agentType,
      probe: { target: { agent_type: agentType }, output, message: failure?.message, error: failure?.error },
    });
    const result = {
      success: ok,
      blocked: false,
      message: ok ? "Agent CLI 探针通过" : failure?.message,
      error: ok ? "" : failure?.error,
      fix_actions: fixActions,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      target: probeTarget,
      duration_ms: Date.now() - started,
      output: String(output || "").slice(0, 2000),
      capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  } catch (e: any) {
    cleanupWriteProbe();
    const fixActions = buildAgentExecutionFixActions({
      error: e.message || String(e),
      agentType,
      probe: { target: { agent_type: agentType }, message: e.message || String(e), error: e.message || String(e) },
    });
    const result = {
      success: false,
      blocked: false,
      message: e.message || "Agent CLI 探针失败",
      error: e.message || String(e),
      fix_actions: fixActions,
      execution_path: readiness.mode,
      expected_marker: "CCM_AGENT_PROBE_OK",
      target: probeTarget,
      duration_ms: Date.now() - started,
      output: "",
      readiness,
    };
    writeAgentProbeStatus(result);
    return result;
  }
}

function taskRequiresAgentQa(task: any) {
  if (task?.requires_agent_qa === false || task?.requiresAgentQa === false) return false;
  if (task?.requires_agent_qa === true || task?.requiresAgentQa === true) return true;
  const text = [task?.title, task?.description, task?.business_goal, task?.acceptance_criteria, task?.source_documents].filter(Boolean).join("\n");
  return /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(text);
}

function getTaskAgentQaGate(task: any) {
  const items = task?.group_id ? getAgentQaItemsForGroup(String(task.group_id), 200).filter((item: any) => item.task_id === task.id) : [];
  const accepted = items.filter((item: any) => item.acceptance?.accepted === true);
  const resumed = items.filter((item: any) => item.status === "resumed" || item.resumed_at);
  return {
    required: taskRequiresAgentQa(task),
    pass: !taskRequiresAgentQa(task) || (accepted.length > 0 && resumed.length > 0),
    total: items.length,
    accepted: accepted.length,
    resumed: resumed.length,
    qa_ids: items.map((item: any) => item.id).filter(Boolean),
  };
}

async function runRuntimeFallbackProbe(payload: any, ctx: CollabCtx) {
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const runtime = resolveMemberRuntime(selectedProject, target.group, getConfigs());
  if (!runtime?.workDir) throw new Error("未找到探针目标 Agent 的工作目录");
  const normalizeRequestedRuntime = (value: any, fallback: string) => {
    const requested = String(value || fallback).trim().toLowerCase();
    const descriptor = getPublicAgentRuntimes().find((item: any) => item.id === requested || item.aliases?.includes(requested));
    if (!descriptor) throw new Error(`不支持的 Agent Runtime：${requested}`);
    return descriptor.id;
  };
  const primaryRuntime = normalizeRequestedRuntime(payload.primary_runtime || payload.primaryRuntime, "gemini");
  const fallbackRuntime = normalizeRequestedRuntime(payload.fallback_runtime || payload.fallbackRuntime, "codex");
  const timeoutMs = Math.max(15000, Math.min(120000, Number(payload.timeout_ms || payload.timeoutMs || 30000)));
  const marker = "CCM_RUNTIME_FALLBACK_OK";
  const prompt = `这是 cc-connect 执行器切换探针。不要修改任何文件，不要运行写入命令。只回复一行：${marker}`;
  const toolContext = buildAgentToolContext(ctx, target.group, selectedProject);
  const taskId = `fallback-probe-${Date.now()}`;
  const attempts: any[] = [];
  let previousOutput = "";
  let switched = false;
  for (const [index, agentType] of [primaryRuntime, fallbackRuntime].entries()) {
    const runtimeToolContext = prepareAgentRuntimeTools(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools);
    let errored = false;
    const attemptPrompt = index === 0 ? prompt : buildRuntimeRecoveryPrompt({
      originalPrompt: prompt,
      previousOutput,
      failure: previousOutput,
      fromRuntime: primaryRuntime,
      toRuntime: fallbackRuntime,
      attempt: 2,
    });
    const output = await ctx.callAgentForGroupStream(selectedProject, attemptPrompt, runtime.workDir, agentType, {
      groupId: target.group.id,
      timeoutMs,
      allowedTools: toolContext.allowedTools,
      mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
      taskId,
      onDone: (opts: any) => { errored = opts.isError === true; },
    });
    const ok = !errored && output.includes(marker);
    attempts.push({ runtime: agentType, success: ok, error: errored, output: compactMemoryText(output, 500) });
    if (ok) {
      return {
        success: true,
        message: index === 0 ? "主执行器探针通过，未触发切换" : "主执行器失败后已自动切换并续跑成功",
        switched,
        primary_runtime: primaryRuntime,
        final_runtime: agentType,
        attempts,
      };
    }
    previousOutput = output;
    if (index === 0) {
      const decision = shouldSwitchRuntime(errored ? `Agent 进程退出：${output}` : output);
      if (!decision.switchRuntime) {
        return { success: false, message: "主执行器失败但未被判定为可恢复故障", switched: false, primary_runtime: primaryRuntime, final_runtime: primaryRuntime, attempts, decision };
      }
      switched = true;
      attempts[0].decision = decision;
    }
  }

  return { success: false, message: "执行器切换后仍失败", switched, primary_runtime: primaryRuntime, final_runtime: fallbackRuntime, attempts };
}

function parseJsonCandidate(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

function normalizeStringArray(value: any) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => String(item || "").trim()).filter(Boolean);
}
function extractRunnerVerificationEvidence(text: string) {
  const raw = String(text || "");
  const markerIndex = raw.lastIndexOf("CCM_RUNNER_VERIFICATION");
  if (markerIndex < 0) return null;
  const searchArea = raw.slice(markerIndex);
  const fencePattern = new RegExp("```(?:json)?\\s*([\\s\\S]*?)```", "gi");
  const fenced = ([...searchArea.matchAll(fencePattern)]).map(match => parseJsonCandidate(match[1].trim())).filter(Boolean).pop() as any;
  const data = fenced && fenced.ccm_runner_verification ? fenced : null;
  if (!data) return null;
  return {
    status: String(data.status || "").trim(),
    verification: normalizeStringArray(data.verification),
    failed: normalizeStringArray(data.failed),
  };
}

function mergeRunnerVerificationIntoReceipt(receipt: any, raw: string) {
  if (!receipt) return receipt;
  const runnerVerification = extractRunnerVerificationEvidence(raw);
  if (!runnerVerification) return receipt;
  const passed = runnerVerification.verification || [];
  const failed = runnerVerification.failed || [];
  if (!passed.length && !failed.length) return receipt;
  return {
    ...receipt,
    verification: uniqueStrings(receipt.verification || [], passed, failed),
    blockers: failed.length ? uniqueStrings(receipt.blockers || [], failed) : (receipt.blockers || []),
  };
}

function normalizeAgentReceipt(raw: any, agent: string) {
  if (!raw || typeof raw !== "object") return null;
  const status = String(raw.status || "").trim().toLowerCase();
  const allowed = new Set(["done", "partial", "blocked", "failed", "needs_info"]);
  if (!raw.ccm_receipt && !allowed.has(status)) return null;
  const memoryUsed = normalizeStringArray(raw.memoryUsed || raw.memory_used || raw.memoryReferences || raw.memory_references);
  const memoryIgnored = normalizeStringArray(raw.memoryIgnored || raw.memory_ignored);
  const ackRaw = raw.ack || raw.ACK || raw.acknowledgement || raw.acknowledgment || null;
  const ack = ackRaw && typeof ackRaw === "object" ? {
    understoodGoal: String(ackRaw.understoodGoal || ackRaw.goal || ackRaw.summary || "").trim(),
    plannedScope: normalizeStringArray(ackRaw.plannedScope || ackRaw.scope || ackRaw.allowedScope),
    forbiddenScope: normalizeStringArray(ackRaw.forbiddenScope || ackRaw.outOfScope || ackRaw.forbidden),
    verificationPlan: normalizeStringArray(ackRaw.verificationPlan || ackRaw.verification || ackRaw.tests),
    unclear: normalizeStringArray(ackRaw.unclear || ackRaw.questions || ackRaw.needsInfo),
  } : null;
  const contractChanges = Array.isArray(raw.contractChanges || raw.contract_changes)
    ? (raw.contractChanges || raw.contract_changes).filter((item: any) => item && typeof item === "object").map((item: any) => ({
      type: String(item.type || "").trim(),
      endpoint: String(item.endpoint || item.path || "").trim(),
      request: compactMemoryText(item.request || item.requestSchema || "", 400),
      response: compactMemoryText(item.response || item.responseSchema || "", 400),
      fields: normalizeStringArray(item.fields || item.changedFields),
      producers: normalizeStringArray(item.producers || item.provider || item.owner),
      consumers: normalizeStringArray(item.consumers || item.consumer || item.dependents),
      note: compactMemoryText(item.note || item.summary || "", 300),
    })).slice(0, 12)
    : [];
  return {
    agent,
    status: allowed.has(status) ? status : "partial",
    summary: String(raw.summary || "").trim(),
    actions: normalizeStringArray(raw.actions),
    filesChanged: normalizeStringArray(raw.filesChanged || raw.files_changed || raw.files),
    verification: normalizeStringArray(raw.verification || raw.tests),
    blockers: normalizeStringArray(raw.blockers),
    needs: normalizeStringArray(raw.needs || raw.followUps || raw.follow_ups),
    ack,
    contractChanges,
    memoryUsed,
    memoryIgnored,
  };
}

function extractAgentReceipt(response: string, agent: string) {
  const raw = String(response || "");
  const fencedBlocks = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
    .map(match => parseJsonCandidate(match[1].trim()))
    .filter(Boolean);
  for (let i = fencedBlocks.length - 1; i >= 0; i--) {
    const receipt = normalizeAgentReceipt(fencedBlocks[i], agent);
    if (receipt) return mergeRunnerVerificationIntoReceipt(receipt, raw);
  }

  const markerIndex = raw.lastIndexOf("CCM_AGENT_RECEIPT");
  const searchArea = markerIndex >= 0 ? raw.slice(markerIndex) : raw;
  const start = searchArea.indexOf("{");
  const end = searchArea.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const receipt = normalizeAgentReceipt(parseJsonCandidate(searchArea.slice(start, end + 1)), agent);
    if (receipt) return mergeRunnerVerificationIntoReceipt(receipt, raw);
  }
  return null;
}

function getReceiptAssignmentStatus(response: string, receipt: any) {
  if (receipt?.status === "failed") return { status: "failed", text: "失败" };
  if (receipt?.status === "blocked") return { status: "blocked", text: "阻塞" };
  if (receipt?.status === "needs_info") return { status: "needs_info", text: "需补充信息" };
  if (receipt?.status === "partial") return { status: "partial", text: "部分完成" };
  if (checkTaskFailure(response)) return { status: "failed", text: "执行失败" };
  return { status: "done", text: "已完成" };
}

function formatAgentReceiptForReview(receipt: any) {
  if (!receipt) return "结构化回执：缺失";
  return [
    "结构化回执：",
    `- 状态：${receipt.status}`,
    `- 摘要：${receipt.summary || "未填写"}`,
    `- 动作：${receipt.actions.length ? receipt.actions.join("；") : "未填写"}`,
    `- 文件：${receipt.filesChanged.length ? receipt.filesChanged.join("；") : "无"}`,
    `- 验证：${receipt.verification.length ? receipt.verification.join("；") : "未提供"}`,
    `- 使用记忆：${receipt.memoryUsed?.length ? receipt.memoryUsed.join("；") : "未声明"}`,
    `- 未用记忆：${receipt.memoryIgnored?.length ? receipt.memoryIgnored.join("；") : "无"}`,
    `- 阻塞：${receipt.blockers.length ? receipt.blockers.join("；") : "无"}`,
    `- 需要补充：${receipt.needs.length ? receipt.needs.join("；") : "无"}`,
  ].join("\n");
}

export function buildEvidenceGateFollowUps(group: any, outputs: string[]) {
  const routable = new Set(getRoutableMembers(group).map((m: any) => m.project));
  const seen = new Set<string>();
  const followUps: any[] = [];

  for (const output of [...(outputs || [])].reverse()) {
    const text = String(output || "");
    const agent = getCollectedOutputAgent(text);
    if (!agent || !routable.has(agent) || seen.has(agent)) continue;

    const notificationStatus = extractTaskNotificationTag(text, "status");
    const status = getCollectedOutputReceiptStatus(text);
    if (notificationStatus === "missing_receipt" || text.includes("结构化回执：缺失")) {
      seen.add(agent);
      followUps.push({
        mention: `@${agent}`,
        targetName: agent,
        project: agent,
        message: "主 Agent 验收未收到你的 CCM_AGENT_RECEIPT。请补充结构化回执，并明确：实际完成事项、是否修改文件、验证方式、阻塞点；不能把建议当作已完成。",
        reason: "缺少结构化回执，主 Agent 无法验收完成状态",
      });
      continue;
    }

    if (status && status !== "done") {
      seen.add(agent);
      followUps.push({
        mention: `@${agent}`,
        targetName: agent,
        project: agent,
        message: `主 Agent 验收发现你的回执状态为 ${status}。请继续处理到可验收状态，或明确说明仍需用户/其他 Agent 提供什么；完成后必须再次提交 CCM_AGENT_RECEIPT，status 只能在确有证据时写 done。`,
        reason: `结构化回执状态不是 done：${status}`,
      });
      continue;
    }

    const receipt = parseFormattedReceiptsFromText(text)[0];
    const verificationGate = getVerificationEvidenceGate(receipt ? [receipt] : []);
    if (status === "done" && !verificationGate.pass) {
      seen.add(agent);
      const reason = verificationGate.failed.length
        ? `验证未通过：${verificationGate.failed.join("；")}`
        : verificationGate.suggested.length
          ? `验证记录只是建议或未执行：${verificationGate.suggested.join("；")}`
          : "缺少已执行验证记录";
      followUps.push({
        mention: `@${agent}`,
        targetName: agent,
        project: agent,
        message: `主 Agent 验收发现你的 done 回执缺少可采信的已执行验证证据。请实际运行必要检查或说明人工核验结果；如果验证失败，先修复后再提交 CCM_AGENT_RECEIPT。当前缺口：${reason}`,
        reason,
      });
      continue;
    }

    const requiredVerificationCoverage = getRequiredVerificationCoverage(receipt ? [receipt] : []);
    if (status === "done" && !requiredVerificationCoverage.pass) {
      seen.add(agent);
      const missing = requiredVerificationCoverage.missing
        .map((item: any) => item.required.join(" / "))
        .join("；");
      const reason = `缺少项目配置验证命令执行证据：${missing}`;
      followUps.push({
        mention: `@${agent}`,
        targetName: agent,
        project: agent,
        message: `主 Agent 验收发现你的 done 回执没有覆盖项目配置的验证命令。请实际运行以下命令之一并把命令与结果写入 CCM_AGENT_RECEIPT.verification；如果无法运行，请写明人工核验结果和原因。需要覆盖：${missing}`,
        reason,
      });
    }
  }

  return followUps;
}

function buildCodedCoordinatorReview(
  group: any,
  outputs: string[],
  options: { allowFollowUps?: boolean; round?: number; maxRounds?: number } = {}
) {
  const coordinator = getCoordinatorMember(group);
  const allowFollowUps = options.allowFollowUps !== false;
  const round = Math.max(1, Number(options.round || 1));
  const maxRounds = Math.max(round, Number(options.maxRounds || 3));
  const gateFollowUps = buildEvidenceGateFollowUps(group, outputs);
  const gaps = gateFollowUps.map((item: any) => String(item.reason || item.message || "").trim()).filter(Boolean);
  const followUps = allowFollowUps ? gateFollowUps : [];
  const status = followUps.length > 0
    ? "needs_followup"
    : gaps.length > 0
      ? "needs_user"
      : "complete";
  const lines = ["📋 **规则协调复盘**", ""];
  if (status === "complete") {
    lines.push("已完成规则验收：子 Agent 回执和验证证据未发现必须自动返工的缺口。");
  } else {
    lines.push(`第 ${round}/${maxRounds} 轮规则验收发现缺口：${gaps.join("；") || "仍缺少可验收证据"}`);
  }
  if (followUps.length) {
    lines.push("", "我会继续追问：");
    for (const item of followUps) lines.push(`@${item.targetName || item.project} ${item.message}`);
  } else if (gaps.length) {
    lines.push("", "已达到自动返工上限，需要用户确认是否继续派发或人工介入。");
  }
  return {
    agent: coordinator.project,
    status,
    followUps,
    gaps,
    conflicts: [],
    content: lines.join("\n").trim(),
    confidence: status === "complete" ? 0.82 : 0.68,
    runtime: "coded-review",
  };
}

function writeSse(res: any, data: any) {
  if (!res || res.writableEnded || res.destroyed) return;
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
}

function emitAssignmentStatus(
  streamRes: any,
  groupId: string,
  planMessageId: string,
  project: string,
  status: string,
  statusText = ""
) {
  if (!planMessageId || !project) return;
  const text = statusText || status;
  const workflow = updateGroupMessageAssignmentStatus(groupId, planMessageId, project, status, text);
  writeSse(streamRes, {
    type: "assignment_status",
    planMessageId,
    project,
    status,
    statusText: text,
    workflow,
  });
}

// === 跨 Agent 并行与递归协作（核心）===
async function processCrossAgents(
  groupId: string,
  group: any,
  sourceProject: string,
  output: string,
  atMentions: any[],
  configs: any[],
  ctx: CollabCtx,
  streamRes: any = null,
  depth = 0,
  seenMentions = new Set<string>(),
  executionOrder = "parallel",
  planMessageId = "",
  taskId = ""
): Promise<string[]> {
  const collectedOutputs: string[] = [];
  if (depth > 3) {
    console.log("[跨Agent协作] 达到最大递归深度，停止继续转发");
    return collectedOutputs;
  }
  const sourceTask = getTaskById(taskId);
  const mentionLabels = atMentions.map(m => typeof m === "string" ? m : m.mention).filter(Boolean);
  console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${mentionLabels.join(", ")}`);

  let uniqueMentions = atMentions.filter((m, idx, arr) => {
    const key = typeof m === "string" ? m : `${m.targetName}:${m.message}`;
    return arr.findIndex(item => (typeof item === "string" ? item : `${item.targetName}:${item.message}`) === key) === idx;
  });

  const getMentionTargetName = (mention: any) => {
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    return typeof mention === "string"
      ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr)
      : mention.targetName;
  };
  const conflictInputs = uniqueMentions.map((mention: any, index: number) => {
    const project = getMentionTargetName(mention);
    const runtime = resolveMemberRuntime(project, group, configs);
    const profile = getProjectAgentCapabilityProfile(project, runtime?.workDir || "");
    return {
      key: `${project}:${index}`,
      project,
      task: typeof mention === "string" ? output : String(mention.message || mention.task || output || ""),
      workDir: runtime?.workDir || path.join(process.cwd(), `.ccm-missing-${project}`),
      writablePaths: profile.writable_paths || [],
    };
  });
  const conflictPlan = buildCollaborationConflictPlan(conflictInputs, executionOrder);
  uniqueMentions = uniqueMentions.map((mention: any, index: number) => {
    const lane = conflictPlan.lanes[index];
    const base = typeof mention === "string"
      ? { mention, targetName: getMentionTargetName(mention), message: output, structured: false }
      : mention;
    return { ...base, conflictWorkspaceKey: lane?.conflictWorkspaceKey || "", conflictGroup: lane?.conflictGroup || "", mergeOwner: lane?.mergeOwner !== false };
  });
  if (conflictPlan.protected) {
    const conflictText = `主 Agent 检测到 ${conflictPlan.conflicts.length} 组潜在修改冲突，已自动改为串行执行并让冲突 Agent 复用同一隔离 worktree。`;
    if (taskId) {
      addTaskLog(taskId, "warning", conflictText);
      appendTaskTimelineEvent(taskId, { type: "conflict_plan", title: "跨 Agent 冲突保护", detail: conflictText, status: "warn", phase: "planning", agent: sourceProject, data: conflictPlan });
    }
    appendGroupMessage(groupId, {
      id: "m" + Date.now().toString(36) + "conflict" + crypto.randomBytes(2).toString("hex"),
      role: "assistant",
      agent: "system",
      type: "conflict_plan",
      content: conflictText,
      timestamp: new Date().toISOString(),
      task_id: taskId || undefined,
      conflictPlan,
      workflow: buildWorkflowMeta("planning", "冲突保护计划"),
    });
    writeSse(streamRes, { type: "conflict_plan", text: conflictText, taskId, conflictPlan });
  }
  const completedOutputsByAgent = new Map<string, string[]>();
  const dependencyStates = new Map<string, any>();
  const rememberMentionOutputs = (mention: any, outputs: string[]) => {
    const agent = getMentionTargetName(mention);
    if (!agent || !outputs?.length) return;
    completedOutputsByAgent.set(agent, [...(completedOutputsByAgent.get(agent) || []), ...outputs.filter(Boolean)]);
    dependencyStates.set(agent, getAgentDependencyStateFromOutputs(agent, completedOutputsByAgent.get(agent) || []));
  };
  const getBlockingDependency = (mention: any) => {
    if (typeof mention === "string") return null;
    const dependsOn = String(mention.dependsOn || "").trim();
    if (!dependsOn) return null;
    const dependencyInBatch = uniqueMentions.some((item: any) => getMentionTargetName(item) === dependsOn);
    if (!dependencyInBatch) return null;
    const state = dependencyStates.get(dependsOn);
    if (!state || state.ok) return null;
    return { dependsOn, state };
  };
  const skipMentionDueToDependency = (mention: any, dependency: any) => {
    const targetName = getMentionTargetName(mention);
    const dependsOn = dependency?.dependsOn || "前置 Agent";
    const reason = dependency?.state?.reason || `${dependsOn} 前置依赖未满足`;
    const summary = `依赖未满足，暂不执行 ${targetName}：${reason}`;
    const receipt = {
      agent: targetName,
      status: "blocked",
      summary,
      actions: [],
      filesChanged: [],
      verification: [],
      blockers: [summary],
      needs: [`等待 ${dependsOn} 返回 done 回执和可采信验证证据`],
    };
    const outputs = [formatCollectedAgentOutput(targetName, summary, receipt)];
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "blocked", `依赖未满足：${dependsOn}`);
    if (taskId) addTaskLog(taskId, "warning", `跳过子 Agent：${targetName}；依赖 ${dependsOn} 未满足；${reason}`);
    updateGroupMemory(groupId, {
      currentPhase: "needs_rework",
      blocked: {
        project: targetName,
        reason: summary,
        needs: receipt.needs,
      },
      workerLedger: {
        taskId,
        project: targetName,
        status: "blocked",
        receiptStatus: "blocked",
        summary,
        blockers: receipt.blockers,
        needs: receipt.needs,
      },
      nextAction: `主 Agent 先返工 ${dependsOn}，再继续 ${targetName}`,
    });
    appendGroupMessage(groupId, {
      id: "m" + Date.now().toString(36) + "dep" + crypto.randomBytes(2).toString("hex"),
      role: "assistant",
      agent: "system",
      content: `⏸️ @${targetName} 暂不执行\n${summary}`,
      timestamp: new Date().toISOString(),
      task_id: taskId || undefined,
    });
    writeSse(streamRes, { type: "status", text: summary, agent: targetName });
    return outputs;
  };
  const buildDependencyOutputPacket = (mention: any, targetName: string) => {
    const dependencyNames = new Set<string>();
    const explicit = typeof mention !== "string" ? String(mention.dependsOn || "").trim() : "";
    if (explicit) dependencyNames.add(explicit);
    if (!explicit && executionOrder === "backend_first" && /app|web|front|frontend|前端/i.test(targetName)) {
      for (const [agent] of completedOutputsByAgent.entries()) {
        if (/cloud|api|server|backend|service|后端/i.test(agent)) dependencyNames.add(agent);
      }
    }
    const sections: string[] = [];
    for (const agent of dependencyNames) {
      const outputs = completedOutputsByAgent.get(agent) || [];
      if (!outputs.length) continue;
      sections.push(`【${agent} 前置输出】\n${compactMemoryText(outputs.join("\n\n---\n\n"), 1800)}`);
    }
    if (!sections.length) return "";
    return [
      "前置 Agent 输出（主 Agent 注入；你必须吸收这些结论，不能重新猜测依赖方契约）：",
      ...sections,
    ].join("\n\n");
  };

  const executeMentionJob = async (mention: any): Promise<string[]> => {
    const outputs: string[] = [];
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;
    const coordinatorProject = getCoordinatorMember(group).project;
    const failChildDispatch = (reason: string, needs: string[] = []) => {
      const summary = String(reason || "子 Agent 派发失败");
      const content = `❌ 子 Agent 派发失败：@${targetName}\n${summary}`;
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", summary);
      if (taskId) addTaskLog(taskId, "error", `子 Agent 派发失败：${targetName}；${summary}`);
      if (taskId) appendTaskTimelineEvent(taskId, { type: "child_agent_failed", title: `子 Agent 派发失败：${targetName}`, detail: summary, status: "fail", phase: "dispatching", agent: targetName, data: { needs } });
      outputs.push(formatCollectedAgentOutput(targetName, content, {
        agent: targetName,
        status: "failed",
        summary,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [summary],
        needs,
      }));
      updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: { project: targetName, reason: summary, needs },
        workerLedger: {
          taskId,
          project: targetName,
          status: "failed",
          receiptStatus: "failed",
          summary,
          blockers: [summary],
          needs,
        },
        nextAction: `主 Agent 复盘 ${targetName} 派发阻塞并决定是否调整配置或询问用户`,
      });
      appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "preflight" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        content,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
      });
      writeSse(streamRes, { type: "status", text: content, agent: targetName });
      return outputs;
    };

    const targetMember = group.members.find((m: any) => m.project === targetName && m.project !== sourceProject);
    if (!targetMember) {
      return failChildDispatch("未找到群聊成员", ["检查主 Agent 生成的目标 Agent 名称是否已加入当前开发群聊"]);
    }

    const atRegex = new RegExp(`@${escapeRegExp(targetName)}\\s+([^@]+?)(?=\\s*@|$)`, "is");
    const atMatch = output.match(atRegex);
    let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;

    if (!atMessage || atMessage.length < 5) {
      const lines = output.split("\n");
      const relevantLines = [];
      let found = false;
      for (const line of lines) {
        if (line.includes(`@${targetName}`)) {
          found = true;
          relevantLines.push(line.replace(`@${targetName}`, "").trim());
        } else if (found && line.trim() && !line.startsWith("@")) {
          relevantLines.push(line.trim());
        } else if (found && line.includes("@")) {
          break;
        }
      }
      atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
    }
    const taskKey = `${sourceProject}->${targetName}:${normalizeMentionTask(atMessage)}`;
    if (seenMentions.has(taskKey)) {
      addGroupLog(groupId, "info", "collaboration", `跳过重复协作: ${sourceProject} -> ${targetName}`, { task: atMessage.substring(0, 160) });
      return outputs;
    }
    seenMentions.add(taskKey);

    let tWorkDir = process.cwd();
    let tAgentType = "claudecode";
    const runtime = resolveMemberRuntime(targetName, group, configs);
    if (!runtime?.workDir) {
      return failChildDispatch("项目配置不存在或未绑定运行时", [
        `在项目管理中为 ${targetName} 配置项目路径和 Agent 类型`,
      ]);
    }
    const workDirState = getWorkDirState(runtime.workDir);
    if (!workDirState.exists || !workDirState.writable) {
      const reason = `工作目录不可用：${workDirState.path || runtime.workDir}（${!workDirState.exists ? "不存在或不是目录" : "不可读写"}）`;
      return failChildDispatch(reason, [
        "检查项目路径是否存在",
        "确认 Web 服务或外部 Runner 对该目录有读写权限",
      ]);
    }
    tWorkDir = workDirState.path || runtime.workDir;
    const taskRuntimeOverride = String(
      sourceTask?.runtime_overrides?.[targetName]
      || sourceTask?.runtime_overrides?.["*"]
      || sourceTask?.runtime_override
      || ""
    ).trim();
    tAgentType = taskRuntimeOverride || runtime.agentType || targetMember.agent || "claudecode";
    let activeTaskSession = taskId ? openTaskAgentSession({
      scopeId: taskId,
      taskId,
      groupId,
      project: targetName,
      agentType: tAgentType,
    }) : null;
    if (activeTaskSession) {
      addTaskLog(taskId, "info", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复" : "创建"}任务级原生会话（${activeTaskSession.agentType}，第 ${activeTaskSession.turnCount + 1} 轮）`);
      appendTaskTimelineEvent(taskId, {
        type: activeTaskSession.turnCount > 0 ? "native_session_resume" : "native_session_open",
        title: `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`,
        detail: `${activeTaskSession.agentType} / ${activeTaskSession.resumeMode}`,
        status: "active",
        phase: "executing",
        agent: targetName,
        data: { sessionRecordId: activeTaskSession.id, nativeSessionId: activeTaskSession.nativeSessionId, turn: activeTaskSession.turnCount + 1 },
      });
      writeSse(streamRes, { type: "native_session", taskId, agent: targetName, session: { project: targetName, agentType: activeTaskSession.agentType, mode: activeTaskSession.resumeMode, turn: activeTaskSession.turnCount + 1, resumed: activeTaskSession.turnCount > 0 } });
      if (sourceTask) updateGroupTaskInlineStatus(sourceTask, "in_progress", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`);
    }
    const preparedWorkDir = prepareChildAgentWorkDir(tWorkDir, {
      mode: getChildAgentIsolationMode(group, sourceTask),
      taskId: taskId || "",
      agentName: mention.conflictWorkspaceKey || targetName,
      sourceProject,
      reuseKey: mention.conflictWorkspaceKey ? `${taskId || planMessageId}-${mention.conflictWorkspaceKey}` : "",
      failClosed: true,
    });
    tWorkDir = preparedWorkDir.workDir;
    const laneExecutionId = taskId ? `${taskId}--${targetName}` : "";
    if (laneExecutionId) {
      ensureExecution({ task: sourceTask || { id: taskId, title: atMessage, target_project: targetName }, project: targetName, agent: targetName, workDir: tWorkDir, executionId: laneExecutionId });
      attachExecutionWorkspace(laneExecutionId, {
        ...preparedWorkDir,
        project: targetName,
        mode: preparedWorkDir.mode,
        conflictGroup: mention.conflictGroup || "",
        conflictWorkspaceKey: mention.conflictWorkspaceKey || "",
        mergeOwner: mention.mergeOwner !== false,
      });
      if (!loadExecution(laneExecutionId)?.checkpointIds?.length) {
        try { createExecutionCheckpoint({ executionId: laneExecutionId, taskId, workDir: tWorkDir, mode: preparedWorkDir.mode, label: `${targetName} 开始执行前` }); }
        catch (error: any) { addTaskLog(taskId, "warning", `无法创建 ${targetName} 文件检查点：${error.message}`); }
      }
      transitionExecution(laneExecutionId, "spawning", `${targetName} 执行通道准备中`);
    }
    const worktreeNotice = buildChildAgentWorktreeNotice(preparedWorkDir);
   if (preparedWorkDir.mode === "worktree") {
      const text = `子 Agent ${targetName} 已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`;
      if (taskId) addTaskLog(taskId, "info", text);
      addGroupLog(groupId, "info", "worktree", text, {
        agent: targetName,
        worktreePath: preparedWorkDir.worktreePath,
        worktreeBranch: preparedWorkDir.worktreeBranch,
      });
    } else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
      const text = `子 Agent ${targetName} 请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`;
      if (taskId) addTaskLog(taskId, "warning", text);
      addGroupLog(groupId, "warn", "worktree", text, {
        agent: targetName,
        originalWorkDir: preparedWorkDir.originalWorkDir,
      });
    }

    const continuationStrategy = typeof mention === "string" ? "" : String(mention.continuationStrategy || mention.continuation_strategy || "").trim();
    const continuationOf = typeof mention === "string" ? "" : String(mention.continuationOf || mention.continuation_of || "").trim();
    const isContinuation = !!continuationStrategy || (typeof mention !== "string" && !!mention.rework);

    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "running", "执行中");
    if (taskId) addTaskLog(taskId, "info", `子 Agent 开始执行：${sourceProject} -> ${targetName}${isContinuation ? "（同 Worker 续跑）" : ""}；工作单：${compactMemoryText(atMessage, 220)}`);
    if (taskId) appendTaskTimelineEvent(taskId, { type: isContinuation ? "child_agent_rework" : "child_agent_start", title: `${targetName} 开始执行`, detail: compactMemoryText(atMessage, 500), status: "active", phase: isContinuation ? "rework" : "executing", agent: targetName, data: { sourceProject, continuationStrategy, continuationOf } });

    appendGroupMessage(groupId, {
      id: "m" + Date.now().toString(36) + "fwd",
      role: "assistant", agent: sourceProject,
      content: `📤 → @${targetName}\n${atMessage}`,
      timestamp: new Date().toISOString(),
      task_id: taskId || undefined,
    });
    writeSse(streamRes, { type: "status", text: `📨 ${sourceProject} 已 @${targetName}，等待 ${targetName} 回复...`, agent: targetName });
    ctx.setAgentActivity(targetName, "working", `被 ${sourceProject} @ 协作`, { tab: "groups", groupId }, 330000);
    ctx.broadcastPetSpeech(targetName, { role: "status", text: `${sourceProject} @ 我协作，正在处理...`, source: "group" });

    const tContext = buildGroupContextPacket(groupId, { recentLimit: 15, olderLimit: 30, fullCount: 5 });
    const childTaskText = buildChildAgentTaskText(atMessage, sourceTask);
    const memoryPacket = buildAgentMemoryPacket(groupId, targetName, childTaskText);
    const dependencyOutputPacket = buildDependencyOutputPacket(mention, targetName);
    const continuationNotice = isContinuation ? [
      "Worker 续跑提示：",
      `- 本次任务是主 Agent 验收后的同 Worker 续跑/返工，目标 Worker：${continuationOf || targetName}。`,
      `- 续跑策略：${continuationStrategy || "same_worker_scratchpad"}。`,
      "- 你必须优先参考上方“协作 scratchpad / 你自己的 Worker 通知”，承接上一轮结果补齐缺口；不要重复已完成且有证据的工作。",
      "- 如果上一轮状态是 blocked/needs_info/failed，先处理阻塞或明确 needs；不能把未解决阻塞写成 done。",
    ].join("\n") : "";

    if (targetName === coordinatorProject) {
      const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
      const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
      const result = await runGroupOrchestrator({
        group,
        message: atMessage,
        context: tContext,
        source: sourceProject,
        sharedFilesContext,
      });
      const planAssignments = normalizePlanAssignments((result as any).assignments || []);
      const dispatchPolicy = (result as any).dispatchPolicy || null;
      const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "二级协调计划");
      outputs.push(formatCollectedAgentOutput(coordinatorProject, result.content, {
        agent: coordinatorProject,
        status: "done",
        summary: "主 Agent 已完成二级协调计划",
        actions: ["生成二级协作计划"],
        filesChanged: [],
        verification: ["已返回结构化 assignments"],
        blockers: [],
        needs: [],
      }));
      appendGroupMessage(groupId, {
        id: responseMessageId,
        role: "assistant",
        agent: coordinatorProject,
        content: result.content,
        timestamp: new Date().toISOString(),
        assignments: planAssignments,
        executionOrder: (result as any).executionOrder || "parallel",
        runtime: (result as any).runtime || "",
        dispatchPolicy,
        coordinationPlan: (result as any).coordinationPlan || null,
        workflow: workflowMeta,
        task_id: taskId || undefined,
      });
      writeSse(streamRes, {
        type: "agent_done",
        agent: coordinatorProject,
        text: result.content,
        messageId: responseMessageId,
        assignments: planAssignments,
        executionOrder: (result as any).executionOrder || "parallel",
        runtime: (result as any).runtime || "",
        dispatchPolicy,
        coordinationPlan: (result as any).coordinationPlan || null,
        workflow: workflowMeta,
      });
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "done", "已完成");

      const nestedMentions = getCoordinatorActionMentions(result, group, coordinatorProject);
      if (nestedMentions.length > 0) {
        const nestedOutputs = await processCrossAgents(
          groupId,
          group,
          coordinatorProject,
          result.content,
          nestedMentions,
          configs,
          ctx,
          streamRes,
          depth + 1,
          seenMentions,
          (result as any).executionOrder || "parallel",
          responseMessageId,
          taskId
        );
        outputs.push(...nestedOutputs);
      }
      return outputs;
    }

    const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== targetName).join(", ");
    const collaborationInstructions = targetName === coordinatorProject
      ? buildCoordinatorCollaborationInstructions(getRoutableMembers(group).map((m: any) => m.project).join(", "))
      : buildMemberCollaborationInstructions(targetName, memberList);
    const advisoryOnly = !!mention.advisoryOnly;
    const projectResourcesConfig = getProjectExtraConfig(targetName);
    const toolContext = advisoryOnly
      ? { prompt: "\n[Agent 问答权限隔离]\n- 当前请求仅允许提供只读建议，不注入任何额外 MCP 或 Skill。\n", allowedTools: { mcp: [], skill: [] } }
      : buildAgentToolContext(ctx, group, targetName);
    let runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes);
    const developmentContract = buildChildAgentDevelopmentContract(targetName, childTaskText, {
      source: `${sourceProject} @ 协作`,
      acceptance: sourceTask?.acceptance_criteria || "",
      requires_code_changes: advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true),
      verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
      work_dir: tWorkDir,
    });
    const projectExecutionBrief = buildProjectExecutionBrief(targetName, childTaskText, {
      workDir: tWorkDir,
      resources: projectResourcesConfig,
      query: childTaskText,
      verificationHints: buildProjectVerificationHints(targetName, tWorkDir),
    });
    const tPrompt = `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}${buildAgentQaProtocolInstructions(targetName, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}

${developmentContract}

${advisoryOnly ? `[只读协作契约]
- 这是任务内问答，不是新的开发工作单。
- 只读取必要上下文并回答问题；不得编辑、创建、删除或格式化任何文件。
- 不得安装依赖、切换权限、调用写入型 MCP，也不得扩大原任务项目边界。
- 回答需包含结论、证据和不确定项；如需实际修改，返回 needs 交由主 Agent 另行派发。` : ""}

${worktreeNotice}

${mention.conflictWorkspaceKey ? `[跨 Agent 冲突保护]
- 本任务与同仓库其他 Agent 的修改范围可能重叠。
- 主 Agent 已将相关工作单改为串行，并让它们复用隔离工作区 ${mention.conflictWorkspaceKey}。
- 执行前先检查工作区已有修改，承接前一个 Agent 的结果；不得覆盖或回退已有正确变更。` : ""}

${memoryPacket}

${projectExecutionBrief}

${continuationNotice}

${dependencyOutputPacket}

${activeTaskSession ? `[任务级原生会话]
- 会话记录：${activeTaskSession.id}
- 当前轮次：${activeTaskSession.turnCount + 1}
- 续跑模式：${activeTaskSession.resumeMode === "native" ? "恢复同一个 CLI 原生会话" : "平台 scratchpad 续跑"}
- 此会话只在主 Agent 最终验收完成后关闭；返工必须承接上一轮结论，不得从零重做。` : ""}

以下是群聊最近的消息记录：
${tContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${childTaskText}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;

    try {
      const responseMessageId = "m" + Date.now().toString(36) + "cross" + crypto.randomBytes(2).toString("hex");
      let targetFileChanges = null;
      let targetWorkEvents: any[] = [];
      let targetNativeSessionId = "";
      let targetSessionSucceeded = true;
      let targetSessionError = "";
      const laneChangeSnapshot = tWorkDir ? ctx.createFileChangeSnapshot(tWorkDir) : null;
      const fallbackConfig = projectResourcesConfig;
      const defaultAttemptTimeout = sourceTask?.workflow_type === "daily_dev" ? 300000 : 120000;
      const configuredAttemptTimeout = Number(
        sourceTask?.runtime_attempt_timeout_ms
        || sourceTask?.runtimeAttemptTimeoutMs
        || fallbackConfig.runtime_attempt_timeout_ms
        || fallbackConfig.runtimeAttemptTimeoutMs
        || defaultAttemptTimeout
      );
      const runtimeAttemptTimeoutMs = Math.max(30000, Math.min(300000, Number.isFinite(configuredAttemptTimeout) ? configuredAttemptTimeout : defaultAttemptTimeout));
      const baseRuntimeCandidates = buildRuntimeRecoveryCandidates(tAgentType, fallbackConfig.fallback_agents || fallbackConfig.fallbackAgents || fallbackConfig.runtime_fallbacks || fallbackConfig.runtimeFallbacks || []);
      const runtimeCandidates = activeTaskSession?.resumeMode === "native" && activeTaskSession.nativeSessionId
        ? [baseRuntimeCandidates[0], baseRuntimeCandidates[0], ...baseRuntimeCandidates.slice(1)]
        : baseRuntimeCandidates;
      let activeRuntime = tAgentType;
      let tOutput = "";
      let previousOutput = "";
      let previousReceipt: any = null;
      for (let attemptIndex = 0; attemptIndex < runtimeCandidates.length; attemptIndex++) {
        activeRuntime = runtimeCandidates[attemptIndex];
        if (attemptIndex > 0) {
          const previousRuntime = runtimeCandidates[attemptIndex - 1];
          const sameRuntimeResume = activeRuntime === previousRuntime;
          if (!sameRuntimeResume) {
            runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, activeRuntime, toolContext.allowedTools, streamRes);
            activeTaskSession = taskId ? openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: targetName, agentType: activeRuntime }) : null;
          }
          const recoveryText = sameRuntimeResume
            ? `${targetName} 正在恢复同一个 ${activeRuntime} 原生会话，从失败点继续`
            : `${targetName} 执行器自动切换：${previousRuntime} → ${activeRuntime}，从已有工作区和回执继续`;
          if (taskId) {
            addTaskLog(taskId, "warning", recoveryText);
            appendTaskTimelineEvent(taskId, { type: sameRuntimeResume ? "native_session_retry" : "runtime_fallback", title: sameRuntimeResume ? `${targetName} 恢复原生会话` : `${targetName} 切换执行器`, detail: recoveryText, status: "warn", phase: "executing", agent: targetName, data: { from: previousRuntime, to: activeRuntime, attempt: attemptIndex + 1 } });
            if (sourceTask) {
              const recoveredReasoning = buildTaskPreflightReasoning(sourceTask, recoveryText, true);
              updateTask(taskId, { reasoning_loop: recoveredReasoning });
              appendTaskTimelineEvent(taskId, { type: "reasoning_recovery_check", title: `${targetName} 切换/续跑前重新核对目标`, detail: `原始目标、当前工作区和验收条件已重新注入；计划 v${recoveredReasoning.plan_version}`, status: "ok", phase: "planning", agent: targetName, data: recoveredReasoning.recovery_checks[recoveredReasoning.recovery_checks.length - 1] || {} });
            }
          }
          writeSse(streamRes, { type: sameRuntimeResume ? "native_session" : "runtime_fallback", agent: targetName, taskId, fromRuntime: previousRuntime, toRuntime: activeRuntime, attempt: attemptIndex + 1, text: recoveryText, session: sameRuntimeResume ? { project: targetName, agentType: activeRuntime, mode: "native", turn: activeTaskSession?.turnCount + 1, resumed: true } : undefined });
          if (laneExecutionId) transitionExecution(laneExecutionId, "spawning", recoveryText, { name: sameRuntimeResume ? "session.native_retry" : "runtime.fallback", status: "warning", data: { from: previousRuntime, to: activeRuntime, attempt: attemptIndex + 1 } });
          if (sourceTask) updateGroupTaskInlineStatus(sourceTask, "in_progress", recoveryText);
        }
        const recoveryAuditPacket = sourceTask ? [
          "【恢复前强制复核】",
          `原始业务目标：${sourceTask.business_goal || sourceTask.title || "未记录"}`,
          `当前任务状态：${sourceTask.status || "unknown"}；不得沿用旧回执假设当前代码状态。`,
          `验收条件：${sourceTask.acceptance_criteria || "未记录；缺失时不得宣告完成"}`,
          `剩余门禁缺口：${(sourceTask.delivery_summary?.acceptance_gate?.failed_checks || []).map((item: any) => item.label || item.id).join("、") || "以当前真实检查结果为准"}`,
          "继续前必须重新读取当前文件/分支状态，只处理仍未满足的缺口，并在回执中说明目标是否仍一致。",
        ].join("\n") : "";
        const attemptPrompt = attemptIndex === 0 ? tPrompt : `${buildRuntimeRecoveryPrompt({
          originalPrompt: tPrompt,
          previousOutput,
          previousReceipt,
          failure: previousOutput,
          fromRuntime: runtimeCandidates[attemptIndex - 1],
          toRuntime: activeRuntime,
          attempt: attemptIndex + 1,
        })}\n\n${recoveryAuditPacket}`;
        targetNativeSessionId = "";
        targetSessionSucceeded = true;
        targetSessionError = "";
        const attemptOutput = await ctx.callAgentForGroupStream(targetName, attemptPrompt, tWorkDir, activeRuntime, {
          res: streamRes,
          groupId,
          timeoutMs: runtimeAttemptTimeoutMs,
          messageId: responseMessageId,
          allowedTools: toolContext.allowedTools,
          mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
          taskId,
          executionId: laneExecutionId,
          agentSession: activeTaskSession ? getTaskAgentSessionOptions(activeTaskSession) : null,
          initialWorkEvents: [runtimeToolContext.workEvent],
          onDone: (opts: any) => {
            targetFileChanges = opts.fileChanges;
            targetWorkEvents = [...targetWorkEvents, ...(Array.isArray(opts.workEvents) ? opts.workEvents : [])].slice(-80);
            targetNativeSessionId = String(opts.nativeSessionId || "");
            targetSessionSucceeded = opts.isError !== true;
            targetSessionError = String(opts.error || opts.message || "");
          }
        });
        const attemptFailureText = targetSessionSucceeded ? attemptOutput : `Agent 进程退出：${targetSessionError || attemptOutput}`;
        const attemptRecoveryDecision = shouldSwitchRuntime(attemptFailureText);
        const permissionDrift = !!sourceTask && taskRequiresCodeChanges(sourceTask) && attemptRecoveryDecision.permissionDrift === true;
        if (activeTaskSession) {
          activeTaskSession = recordTaskAgentSessionTurn(activeTaskSession.id, { nativeSessionId: targetNativeSessionId, success: targetSessionSucceeded && !permissionDrift, error: targetSessionError || (permissionDrift || !targetSessionSucceeded ? attemptOutput : ""), permissionDrift }) || activeTaskSession;
          if (taskId) addTaskLog(taskId, targetSessionSucceeded ? "info" : "warning", `${targetName} 会话轮次已记录：${activeTaskSession.agentType} turn=${activeTaskSession.turnCount}${activeTaskSession.nativeSessionId ? "，已捕获原生 session ID" : "，使用 scratchpad 续跑保护"}`);
        }
        if (permissionDrift && taskId) {
          const detail = `${targetName} 声明需要项目写入，但执行器实际为只读；旧 native session 已隔离，将自动重建或切换执行器`;
          addTaskLog(taskId, "warning", detail);
          appendTaskTimelineEvent(taskId, { type: "permission_drift", title: `${targetName} 权限漂移已自动恢复`, detail, status: "warn", phase: "reworking", agent: targetName, data: { runtime: activeRuntime, session_id: activeTaskSession?.id || "", native_session_id: targetNativeSessionId || "" } });
          if (laneExecutionId) transitionExecution(laneExecutionId, "spawning", detail, { name: "permission.drift", status: "warning", failureClass: "permission", data: { runtime: activeRuntime } });
        }
        const failedAttempt = !targetSessionSucceeded || checkTaskFailure(attemptOutput);
        const effectiveFailedAttempt = failedAttempt || permissionDrift;
        if (!effectiveFailedAttempt) { tOutput = attemptOutput; break; }
        previousOutput = attemptOutput;
        previousReceipt = extractAgentReceipt(attemptOutput, targetName);
        const fallbackDecision = attemptRecoveryDecision;
        if (!fallbackDecision.switchRuntime || attemptIndex >= runtimeCandidates.length - 1) { tOutput = attemptOutput; break; }
      }
      if (laneChangeSnapshot) targetFileChanges = ctx.getFileChanges(targetName, laneChangeSnapshot);
      let targetReceipt = extractAgentReceipt(tOutput, targetName);
      if (advisoryOnly) {
        const advisoryChanges = Array.isArray(targetFileChanges?.files) ? targetFileChanges.files : Array.isArray(targetFileChanges) ? targetFileChanges : [];
        const boundary = evaluateAdvisoryPermissionBoundary(advisoryChanges, { mcp: [], skill: [] }, toolContext.allowedTools);
        if (!boundary.pass) {
          targetReceipt = {
            agent: targetName,
            status: "failed",
            summary: "Agent 问答违反 advisory_read_only 权限契约，回答已隔离",
            actions: [],
            filesChanged: advisoryChanges.map((item: any) => item?.path || item).filter(Boolean),
            verification: [],
            blockers: [boundary.reason],
            needs: ["由主 Agent 重新派发正式开发工作单后才能修改文件"],
            permission_boundary: boundary,
          };
          tOutput = `${stripAgentQaProtocolBlocks(tOutput)}\n\n权限门禁：${boundary.reason}`;
          if (taskId) appendTaskTimelineEvent(taskId, { type: "agent_qa_permission_violation", title: `${targetName} 问答越权已隔离`, detail: boundary.reason, status: "fail", phase: "waiting_dependency", agent: targetName, data: boundary });
          appendAgentQaTrace(taskId, "agent.qa.permission_violation", { id: mention.requestId, group_id: groupId, from_agent: sourceProject, to_agent: targetName }, boundary.reason, "fail", boundary);
        }
      }
      outputs.push(formatCollectedAgentOutput(targetName, tOutput, targetReceipt));
      if (taskId && targetReceipt) {
        const verificationCount = Array.isArray(targetReceipt.verification) ? targetReceipt.verification.length : 0;
        const fileCount = Array.isArray(targetReceipt.filesChanged) ? targetReceipt.filesChanged.length : 0;
        addTaskLog(taskId, targetReceipt.status === "done" ? "success" : "warning", `子 Agent 回执：${targetName} status=${targetReceipt.status}，文件 ${fileCount} 个，验证 ${verificationCount} 条；${targetReceipt.summary || "无摘要"}`);
        appendTaskTimelineEvent(taskId, { type: "child_agent_receipt", title: `${targetName} 提交回执`, detail: targetReceipt.summary || "无摘要", status: targetReceipt.status === "done" ? "ok" : "warn", phase: "executing", agent: targetName, data: { receipt: targetReceipt, fileCount, verificationCount } });
      }
      if (targetReceipt) {
        if (laneExecutionId) {
          const green = evaluateGreenContract({ receipt: targetReceipt, fileChanges: targetFileChanges, requiresChanges: sourceTask ? taskRequiresCodeChanges(sourceTask) : true, requiresVerification: sourceTask?.requires_verification !== false, requiredLevel: "project" });
          transitionExecution(laneExecutionId, targetReceipt.status === "failed" ? "failed" : "reviewing", targetReceipt.status === "done" ? "子 Agent 已交付，等待主 Agent 验收" : (targetReceipt.summary || "子 Agent 回执未完成"), {
            green,
            receipt: targetReceipt,
            fileChanges: targetFileChanges,
            runnerVerification: extractRunnerVerificationEvidence(tOutput),
            outputPreview: tOutput,
          });
        }
        if (targetReceipt.status === "done" || targetReceipt.status === "partial") {
          updateGroupMemory(groupId, {
            currentPhase: targetReceipt.status === "done" ? "executing" : "needs_rework",
            completed: {
              project: targetName,
              summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
              filesChanged: targetReceipt.filesChanged || [],
              verification: targetReceipt.verification || [],
              memoryUsed: targetReceipt.memoryUsed || [],
              memoryIgnored: targetReceipt.memoryIgnored || [],
            },
            workerLedger: {
              taskId,
              project: targetName,
              status: targetReceipt.status === "done" ? "completed" : "partial",
              receiptStatus: targetReceipt.status,
              summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
              filesChanged: targetReceipt.filesChanged || [],
              verification: targetReceipt.verification || [],
              blockers: targetReceipt.blockers || [],
              needs: targetReceipt.needs || [],
              memoryUsed: targetReceipt.memoryUsed || [],
              memoryIgnored: targetReceipt.memoryIgnored || [],
            },
            nextAction: targetReceipt.status === "done" ? `等待主 Agent 验收 ${targetName} 回执` : `主 Agent 复盘 ${targetName} 的部分完成回执`,
          });
        } else {
          updateGroupMemory(groupId, {
            currentPhase: "needs_rework",
            blocked: {
              project: targetName,
              reason: targetReceipt.blockers?.join("；") || targetReceipt.summary || targetReceipt.status,
              needs: targetReceipt.needs || [],
            },
            workerLedger: {
              taskId,
              project: targetName,
              status: targetReceipt.status || "blocked",
              receiptStatus: targetReceipt.status,
              summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
              filesChanged: targetReceipt.filesChanged || [],
              verification: targetReceipt.verification || [],
              blockers: targetReceipt.blockers || [],
              needs: targetReceipt.needs || [],
              memoryUsed: targetReceipt.memoryUsed || [],
              memoryIgnored: targetReceipt.memoryIgnored || [],
            },
            nextAction: `主 Agent 复盘 ${targetName} 阻塞并决定是否返工或询问用户`,
          });
        }
      } else {
        if (taskId) addTaskLog(taskId, "warning", `子 Agent 未提供结构化回执：${targetName}；主 Agent 后续验收会要求补充 CCM_AGENT_RECEIPT`);
        updateGroupMemory(groupId, {
          currentPhase: "reviewing",
          blocked: {
            project: targetName,
            reason: "子 Agent 未提供结构化回执，主 Agent 需要验收时确认是否补充",
            needs: ["补充 CCM_AGENT_RECEIPT"],
          },
          workerLedger: {
            taskId,
            project: targetName,
            status: "missing_receipt",
            receiptStatus: "missing",
            summary: compactMemoryText(tOutput, 220),
            blockers: ["缺少 CCM_AGENT_RECEIPT"],
            needs: ["补充 CCM_AGENT_RECEIPT"],
          },
          nextAction: `主 Agent 验收 ${targetName} 自然语言回复`,
        });
      }

      appendGroupMessage(groupId, {
        id: responseMessageId,
        role: "assistant", agent: targetName,
        content: tOutput,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
        receipt: targetReceipt || undefined,
        fileChanges: targetFileChanges,
        workEvents: targetWorkEvents,
      });
      const qaResult = await handleAgentQaRequests({
        groupId,
        group,
        sourceProject: targetName,
        sourceOutput: tOutput,
        originalPrompt: tPrompt,
        sourceWorkDir: tWorkDir,
        sourceAgentType: tAgentType,
        allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
        configs,
        ctx,
        streamRes,
        taskId,
        qaDepth: depth,
      });
      if (qaResult.outputs.length) outputs.push(...qaResult.outputs);
      const downstreamOutput = qaResult.resumedOutput || tOutput;
      const assignmentStatus = getReceiptAssignmentStatus(downstreamOutput, extractAgentReceipt(downstreamOutput, targetName) || targetReceipt);
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, assignmentStatus.status, assignmentStatus.text);

      const nestedMentions = extractActionableMentions(downstreamOutput, group, targetName);
      if (nestedMentions.length > 0) {
        const newMentions = nestedMentions.filter(m => m.targetName !== targetName);
        if (newMentions.length > 0) {
          const nestedOutputs = await processCrossAgents(groupId, group, targetName, downstreamOutput, newMentions, configs, ctx, streamRes, depth + 1, seenMentions, "parallel", "", taskId);
          outputs.push(...nestedOutputs);
        }
      }
    } catch (error: any) {
      console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
      emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", error.message || "执行失败");
      if (taskId) addTaskLog(taskId, "error", `子 Agent 执行失败：${targetName}；${error.message || "未知错误"}`);
      outputs.push(formatCollectedAgentOutput(targetName, `❌ 转发失败: ${error.message}`, {
        agent: targetName,
        status: "failed",
        summary: `转发失败: ${error.message}`,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [String(error.message || "执行失败")],
        needs: [],
      }));
      updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: {
          project: targetName,
          reason: `转发失败: ${error.message || "执行失败"}`,
          needs: [],
        },
        workerLedger: {
          taskId,
          project: targetName,
          status: "failed",
          receiptStatus: "failed",
          summary: `转发失败: ${error.message || "执行失败"}`,
          blockers: [String(error.message || "执行失败")],
          needs: [],
        },
        nextAction: `主 Agent 复盘 ${targetName} 执行失败并决定是否重试`,
      });
      appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "err",
        role: "assistant", agent: "system",
        content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
      });
    }
    return outputs;
  };

  const hasExplicitDependencies = uniqueMentions.some((mention: any) => typeof mention !== "string" && String(mention.dependsOn || "").trim());

  if (hasExplicitDependencies) {
    const pending = [...uniqueMentions];
    const completed = new Set<string>();
    let guard = 0;
    while (pending.length > 0 && guard < 20) {
      guard++;
      const readyIndex = pending.findIndex((mention: any) => {
        if (typeof mention === "string") return true;
        const dependsOn = String(mention.dependsOn || "").trim();
        const dependencyInBatch = uniqueMentions.some((item: any) => getMentionTargetName(item) === dependsOn);
        return !dependsOn || !dependencyInBatch || completed.has(dependsOn) || dependencyStates.has(dependsOn);
      });
      const index = readyIndex >= 0 ? readyIndex : 0;
      const [mention] = pending.splice(index, 1);
      const dependencyIssue = getBlockingDependency(mention);
      const outputs = dependencyIssue
        ? skipMentionDueToDependency(mention, dependencyIssue)
        : await executeMentionJob(mention);
      collectedOutputs.push(...outputs);
      rememberMentionOutputs(mention, outputs);
      completed.add(getMentionTargetName(mention));
    }
  } else if (conflictPlan.effectiveOrder === "sequential" || conflictPlan.effectiveOrder === "backend_first") {
    // 串行执行：后端优先或按顺序
    const backendMentions: any[] = [];
    const frontendMentions: any[] = [];
    const otherMentions: any[] = [];

    for (const mention of uniqueMentions) {
      const targetName = getMentionTargetName(mention);
      const targetMember = group.members.find((m: any) => m.project === targetName);
      const kind = targetMember ? (/cloud|api|server|backend|service|后端/i.test(targetName) ? "backend" : /app|web|front|frontend|前端/i.test(targetName) ? "frontend" : "other") : "other";
      if (kind === "backend") backendMentions.push(mention);
      else if (kind === "frontend") frontendMentions.push(mention);
      else otherMentions.push(mention);
    }

    // 先执行后端
    for (const mention of backendMentions) {
      const outputs = await executeMentionJob(mention);
      collectedOutputs.push(...outputs);
      rememberMentionOutputs(mention, outputs);
    }
    // 再执行前端
    for (const mention of frontendMentions) {
      const failedBackend = backendMentions
        .map((item: any) => ({ name: getMentionTargetName(item), state: dependencyStates.get(getMentionTargetName(item)) }))
        .find((item: any) => item.name && item.state && !item.state.ok);
      const outputs = failedBackend
        ? skipMentionDueToDependency(mention, { dependsOn: failedBackend.name, state: failedBackend.state })
        : await executeMentionJob(mention);
      collectedOutputs.push(...outputs);
      rememberMentionOutputs(mention, outputs);
    }
    // 最后其他
    for (const mention of otherMentions) {
      const outputs = await executeMentionJob(mention);
      collectedOutputs.push(...outputs);
      rememberMentionOutputs(mention, outputs);
    }
  } else {
    // 默认并行执行
    const settledOutputs = await Promise.all(uniqueMentions.map(mention => executeMentionJob(mention)));
    settledOutputs.forEach((outputs, index) => {
      collectedOutputs.push(...outputs);
      rememberMentionOutputs(uniqueMentions[index], outputs);
    });
  }
  return collectedOutputs;
}

function arbitrateAgentQaRequest(request: any, group: any, sourceProject = "") {
  const text = `${request.question || ""}\n${request.reason || ""}`;
  const members = new Set((group.members || []).map((m: any) => String(m.project || "").trim()).filter(Boolean));
  if (!members.has(request.targetName)) {
    return { decision: "reject", reason: `目标 Agent 不在当前群聊成员中：${request.targetName}` };
  }
  if (request.targetName === sourceProject) {
    return { decision: "reject", reason: "不能把问题发回给自己" };
  }
  if (/用户确认|业务方确认|产品确认|人工确认|生产数据|密钥|token|密码|支付|扣款|删除生产|合规|隐私/i.test(text)) {
    return { decision: "ask_user", reason: "问题涉及用户/业务/高风险确认，需要主 Agent 暂停并让用户拍板" };
  }
  return { decision: "ask_agent", reason: request.reason || "目标 Agent 具备该问题的上下文" };
}

async function resumeAgentQaFromStoredContinuation(qa: any, group: any, ctx: CollabCtx, streamRes: any = null) {
  if (!qa?.acceptance?.accepted || qa.blocking === false) return { resumed: false, reason: "回答未采纳或不是阻塞问题" };
  const continuation = qa.continuation || {};
  const runtime = resolveMemberRuntime(qa.from_agent, group, getConfigs());
  const workDir = String(continuation.source_work_dir || runtime?.workDir || "").trim();
  const agentType = String(continuation.source_agent_type || runtime?.agentType || "claudecode").trim();
  if (!workDir) return { resumed: false, reason: "缺少原 Agent 工作目录，无法安全续跑" };
  const toolContext = buildAgentToolContext(ctx, group, qa.from_agent);
  const runtimeTools = prepareAgentRuntimeTools(qa.group_id, qa.from_agent, workDir, agentType, continuation.allowed_tools || toolContext.allowedTools, streamRes);
  let session = openTaskAgentSession({ scopeId: qa.task_id, taskId: qa.task_id, groupId: qa.group_id, project: qa.from_agent, agentType });
  let nativeSessionId = "";
  let succeeded = true;
  let error = "";
  const prompt = [
    "CCM Agent 协作协议已收到一个先前阻塞问题的合格回答。请从同一任务会话继续，不要从零重做。",
    `问题 ID：${qa.id}`,
    `原任务：${compactMemoryText(continuation.original_prompt || "", 2400)}`,
    `问题：${qa.question}`,
    `回答：${compactMemoryText(qa.answer || "", 3000)}`,
    qa.answer_evidence?.length ? `证据：${qa.answer_evidence.join("；")}` : "",
    "只处理回答解除后的剩余缺口；完成后提交新的 CCM_AGENT_RECEIPT。",
  ].filter(Boolean).join("\n\n");
  const messageId = "m" + Date.now().toString(36) + "qawake" + crypto.randomBytes(2).toString("hex");
  const output = await ctx.callAgentForGroupStream(qa.from_agent, prompt, workDir, agentType, {
    res: streamRes,
    groupId: qa.group_id,
    timeoutMs: 300000,
    messageId,
    allowedTools: continuation.allowed_tools || toolContext.allowedTools,
    mcpConfigPath: continuation.mcp_config_path || runtimeTools.audit.mcpConfigPath,
    taskId: qa.task_id,
    executionId: qa.execution_id || qa.task_id,
    agentSession: session ? getTaskAgentSessionOptions(session) : null,
    onDone: (opts: any) => {
      nativeSessionId = String(opts?.nativeSessionId || "");
      succeeded = opts?.isError !== true;
      error = String(opts?.error || opts?.message || "");
    },
  });
  if (session) session = recordTaskAgentSessionTurn(session.id, { nativeSessionId, success: succeeded, error: error || (!succeeded ? output : "") }) || session;
  const at = new Date().toISOString();
  const resumed = upsertAgentQaItem({
    ...qa,
    status: "resumed",
    injected_at: qa.injected_at || at,
    resumed_at: at,
    resume_message_id: messageId,
    audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at, type: "event_wakeup", detail: "回答到达后自动唤醒原 Agent 任务会话" }].slice(-30),
  });
  appendGroupMessage(qa.group_id, { id: messageId, role: "assistant", agent: qa.from_agent, type: "agent_qa_resume", content: output, timestamp: at, task_id: qa.task_id, qa: { ...resumed, kind: "resume", status: "resumed" } });
  emitAgentQaEvent(streamRes, "resume", resumed, output);
  appendAgentQaTrace(qa.task_id, "agent.qa.event_wakeup", resumed, `${qa.from_agent} 已在回答到达后自动续跑`, succeeded ? "ok" : "warn", { session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" });
  if (qa.task_id) appendTaskTimelineEvent(qa.task_id, { type: "agent_qa_resume", title: `${qa.from_agent} 已由回答事件唤醒`, detail: compactMemoryText(output, 500), status: succeeded ? "ok" : "warn", phase: "executing", agent: qa.from_agent, data: { qa_id: qa.id, session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" } });
  if (qa.task_id) updateGroupTaskInlineStatus(getTaskById(qa.task_id) || { id: qa.task_id, group_id: qa.group_id }, "in_progress", `${qa.from_agent} 已收到回答并自动续跑`);
  return { resumed: true, item: resumed, output, session };
}

async function retryAgentQaItem(id: string, ctx: CollabCtx, streamRes: any = null) {
  markExpiredAgentQaItems();
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return { success: false, error: "问答记录不存在" };
  if (Number(current.retry_count || 0) >= 2) return { success: false, error: "该问答已达到最大重试次数，请换 Agent 或人工接管" };
  const group = loadGroups().find((item: any) => item.id === current.group_id);
  if (!group) return { success: false, error: "群聊不存在" };
  const request = {
    type: current.type || "ask_agent",
    targetName: current.to_agent,
    question: current.question,
    reason: current.reason || "用户触发重试",
    blocking: current.blocking !== false,
  };
  const retryStartedAt = new Date().toISOString();
  const qa = upsertAgentQaItem({
    ...current,
    status: "asking",
    retry_count: Number(current.retry_count || 0) + 1,
    timeout_at: new Date(Date.now() + AGENT_QA_TIMEOUT_MS).toISOString(),
    retry_started_at: retryStartedAt,
    manual_takeover: false,
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: retryStartedAt, type: "retry", detail: "用户触发重试目标 Agent 回答" }].slice(-30),
  });
  appendGroupMessage(current.group_id, buildAgentQaMessage("question", qa, qa.question));
  emitAgentQaEvent(streamRes, "question", qa, qa.question);
  const mention = {
    mention: `@${request.targetName}`,
    targetName: request.targetName,
    message: [
      `【Agent-to-Agent ${request.type === "request_review" ? "评审请求重试" : "询问重试"}】`,
      `来自：${current.from_agent}`,
      request.reason ? `原因：${request.reason}` : "",
      `问题：${request.question}`,
      "请直接回答该 Agent 的问题；可以自然语言回答，也可以输出 reply_agent 工具调用。",
    ].filter(Boolean).join("\n"),
    requestId: qa.id,
    advisoryOnly: true,
    permissionContract: qa.permission_contract || { mode: "advisory_read_only", write_scope_expanded: false, mcp_scope_expanded: false },
    structured: true,
  };
  const outputs = await processCrossAgents(current.group_id, group, current.from_agent, current.question, [mention], getConfigs(), ctx, streamRes || null, 1, new Set<string>(), "sequential", "", current.task_id || "");
  const joined = outputs.join("\n\n---\n\n");
  const reply = extractAgentQaReplies(joined, qa.id).pop();
  const answerText = reply?.answer || stripAgentQaProtocolBlocks(joined);
  const acceptance = evaluateCollaborationAnswer({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, loadAgentQaItems().filter((item: any) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance));
  const completed = upsertAgentQaItem({
    ...qa,
    status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
    answer: compactMemoryText(answerText || "目标 Agent 重试后仍未返回可用回答", 4000),
    answer_evidence: acceptance.evidence,
    acceptance,
    answered_at: new Date().toISOString(),
    audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || "重试已完成" }].slice(-30),
  });
  appendGroupMessage(current.group_id, buildAgentQaMessage("answer", completed, completed.answer));
  emitAgentQaEvent(streamRes, "answer", completed, completed.answer);
  if (completed.acceptance?.accepted) writeAcceptedAgentQaToProjectMemory(completed);
  appendAgentQaTrace(current.task_id || "", "agent.qa.retry_answer", completed, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance });
  const wakeup = acceptance.accepted ? await resumeAgentQaFromStoredContinuation(completed, group, ctx, streamRes) : { resumed: false, reason: acceptance.reason };
  return { success: true, item: wakeup.resumed ? wakeup.item : completed, wakeup };
}

async function handleAgentQaRequests(input: {
  groupId: string;
  group: any;
  sourceProject: string;
  sourceOutput: string;
  originalPrompt: string;
  sourceWorkDir: string;
  sourceAgentType: string;
  allowedTools: any;
  mcpConfigPath?: string;
  configs: any[];
  ctx: CollabCtx;
  streamRes?: any;
  taskId?: string;
  qaDepth?: number;
}) {
  markExpiredAgentQaItems(input.groupId);
  const qaDepth = Number(input.qaDepth || 0);
  const requests = qaDepth > 0 ? [] : extractAgentQaRequests(input.sourceOutput, input.group, input.sourceProject);
  if (!requests.length) return { outputs: [], resumedOutput: "" };

  const outputs: string[] = [];
  const answers: any[] = [];
  for (const rawRequest of requests.slice(0, 5)) {
    const now = new Date().toISOString();
    const openItems = loadAgentQaItems();
    const profiles = Object.fromEntries((input.group?.members || []).map((member: any) => {
      const project = String(member?.project || "").trim();
      const runtime = resolveMemberRuntime(project, input.group, input.configs);
      return [project, getProjectAgentCapabilityProfile(project, runtime?.workDir || "")];
    }).filter((entry: any[]) => entry[0]));
    const routing = selectCollaborationTarget({ request: rawRequest, group: input.group, sourceProject: input.sourceProject, profiles, openItems });
    const request = { ...rawRequest, targetName: routing.targetName };
    const sourceTask = input.taskId ? getTaskById(input.taskId) : null;
    const contract = buildCollaborationQuestionContract({
      ...request,
      group_id: input.groupId,
      task_id: input.taskId || `conversation:${input.groupId}`,
      execution_id: sourceTask?.execution_id || sourceTask?.active_execution_id || input.taskId || "",
      from_agent: input.sourceProject,
      to_agent: request.targetName,
    });
    const admission = evaluateCollaborationQuestionAdmission(contract, openItems);
    const arbitration = arbitrateAgentQaRequest(request, input.group, input.sourceProject);
    if (!admission.allowed) {
      arbitration.decision = "reject";
      arbitration.reason = admission.reason;
    }
    const qaBase = {
      ...contract,
      id: contract.question_id,
      status: arbitration.decision === "ask_agent" ? "waiting" : arbitration.decision,
      timeout_at: contract.deadline_at,
      routing,
      admission,
      arbitration,
      continuation: {
        source_work_dir: input.sourceWorkDir,
        source_agent_type: input.sourceAgentType,
        original_prompt: compactMemoryText(input.originalPrompt, 4000),
        allowed_tools: input.allowedTools || { mcp: [], skill: [] },
        mcp_config_path: input.mcpConfigPath || "",
      },
      retry_count: 0,
      manual_takeover: false,
      created_at: now,
      updated_at: now,
      audit: [{ at: now, type: "created", detail: arbitration.reason || "主 Agent 已仲裁" }],
    };
    const qa = upsertAgentQaItem(qaBase);
    appendGroupMessage(input.groupId, buildAgentQaMessage("question", qa, request.question));
    emitAgentQaEvent(input.streamRes, "question", qa, request.question);
    safeAddGroupLog(input.groupId, "info", "agent_qa", `${input.sourceProject} 向 ${request.targetName} 提问`, {
      qa_id: qa.id,
      from: input.sourceProject,
      to: request.targetName,
      question: request.question,
      arbitration,
    });
    if (input.taskId) addTaskLog(input.taskId, "info", `Agent 问答：${input.sourceProject} -> ${request.targetName}；${request.question.slice(0, 220)}`);
    if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: "agent_qa_question", title: `${input.sourceProject} 向 ${request.targetName} 提问`, detail: request.question, status: "active", phase: "executing", agent: input.sourceProject, data: { qa_id: qa.id, request, arbitration } });
    appendAgentQaTrace(input.taskId || "", "agent.qa.question", qa, request.question, "active", { routing, admission, permission_contract: qa.permission_contract });
    if (input.taskId && qa.blocking && arbitration.decision === "ask_agent") {
      updateGroupTaskInlineStatus(sourceTask || { id: input.taskId, group_id: input.groupId }, "in_progress", `等待 ${request.targetName} 回答：${compactMemoryText(request.question, 180)}`);
      appendTaskTimelineEvent(input.taskId, { type: "agent_qa_waiting", title: `${input.sourceProject} 等待 ${request.targetName}`, detail: `问题 ${qa.id} 已进入等待；回答到达后自动唤醒原会话`, status: "active", phase: "waiting_dependency", agent: input.sourceProject, data: { qa_id: qa.id, deadline_at: qa.deadline_at } });
    }

    if (arbitration.decision === "ask_user") {
      const needsUser = upsertAgentQaItem({
        ...qa,
        status: "needs_user",
        needs_user_at: new Date().toISOString(),
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "needs_user", detail: arbitration.reason }].slice(-30),
      });
      appendGroupMessage(input.groupId, buildAgentQaMessage("answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`));
      emitAgentQaEvent(input.streamRes, "answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`);
      continue;
    }
    if (arbitration.decision !== "ask_agent") {
      const rejected = upsertAgentQaItem({
        ...qa,
        status: "rejected",
        failed_at: new Date().toISOString(),
        answer: arbitration.reason,
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "rejected", detail: arbitration.reason }].slice(-30),
      });
      appendGroupMessage(input.groupId, buildAgentQaMessage("answer", rejected, arbitration.reason));
      emitAgentQaEvent(input.streamRes, "answer", rejected, arbitration.reason);
      continue;
    }

    const askingQa = upsertAgentQaItem({ ...qa, status: "asking", asked_at: new Date().toISOString() });
    const mention = {
      mention: `@${request.targetName}`,
      targetName: request.targetName,
      message: [
        `【Agent-to-Agent ${request.type === "request_review" ? "评审请求" : "询问"}】`,
        `问题 ID：${qa.id}；任务：${qa.task_id}；Execution：${qa.execution_id || "未绑定"}`,
        `来自：${input.sourceProject}`,
        request.reason ? `原因：${request.reason}` : "",
        qa.evidence?.length ? `已有证据：${qa.evidence.join("；")}` : "",
        `问题：${request.question}`,
        "权限契约：advisory_read_only。只允许读取和回答，不得修改文件、扩大工具/MCP 权限、跨项目执行或代替用户批准高风险操作。",
        "请直接回答该 Agent 的问题；如果涉及接口/字段/文件/验证，请给出可执行、可引用的证据。建议使用 reply_agent 并分别提供 answer 与 evidence。",
      ].filter(Boolean).join("\n"),
      requestId: qa.id,
      advisoryOnly: true,
      permissionContract: qa.permission_contract,
      structured: true,
    };
    const answerOutputs = await processCrossAgents(input.groupId, input.group, input.sourceProject, input.sourceOutput, [mention], input.configs, input.ctx, input.streamRes || null, 1, new Set<string>(), "sequential", "", input.taskId || "");
    const joinedAnswerText = answerOutputs.join("\n\n---\n\n");
    const reply = extractAgentQaReplies(joinedAnswerText, qa.id).pop();
    const answerText = reply?.answer || stripAgentQaProtocolBlocks(joinedAnswerText);
    const answerReceipt = parseFormattedReceiptsFromText(joinedAnswerText).find((item: any) => item.agent === request.targetName) || null;
    const boundary = answerReceipt?.permission_boundary || evaluateAdvisoryPermissionBoundary(
      (answerReceipt?.filesChanged || []).map((item: any) => typeof item === "string" ? { path: item } : item),
      { mcp: [], skill: [] },
      { mcp: [], skill: [] }
    );
    const siblingAnswers = loadAgentQaItems().filter((item: any) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance);
    const acceptance = evaluateCollaborationAnswer({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, siblingAnswers);
    if (!boundary.pass) {
      acceptance.status = "rejected";
      acceptance.accepted = false;
      acceptance.reason = boundary.reason;
    }
    const completedQa = upsertAgentQaItem({
      ...askingQa,
      status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
      answer: compactMemoryText(answerText || "目标 Agent 未返回可用回答", 4000),
      answer_evidence: acceptance.evidence,
      acceptance,
      permission_boundary: boundary,
      answered_at: new Date().toISOString(),
      audit: [...(Array.isArray(askingQa.audit) ? askingQa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || (answerText ? "目标 Agent 已回答" : "目标 Agent 未返回可用回答") }].slice(-30),
    });
    appendGroupMessage(input.groupId, buildAgentQaMessage("answer", completedQa, completedQa.answer));
    emitAgentQaEvent(input.streamRes, "answer", completedQa, completedQa.answer);
    if (completedQa.acceptance?.accepted) writeAcceptedAgentQaToProjectMemory(completedQa);
    appendAgentQaTrace(input.taskId || "", "agent.qa.answer", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance, permission_boundary: boundary });
    if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: acceptance.accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `${request.targetName} 回答${acceptance.accepted ? "已采纳" : "未采纳"}`, detail: acceptance.reason, status: acceptance.accepted ? "ok" : "warn", phase: acceptance.accepted ? "executing" : "waiting_dependency", agent: request.targetName, data: { qa_id: qa.id, acceptance, permission_boundary: boundary } });
    if (completedQa.status === "answered") answers.push(completedQa);
    outputs.push(...answerOutputs);
  }

  const blockingAnswers = answers.filter(item => item.blocking !== false && item.status === "answered");
  if (!blockingAnswers.length) return { outputs, resumedOutput: "" };

  const injectedAt = new Date().toISOString();
  const injectedAnswers = blockingAnswers.map((item: any) => upsertAgentQaItem({
    ...item,
    status: "injected",
    injected_at: injectedAt,
    audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: injectedAt, type: "injected", detail: "回答已注入回原 Agent 续跑上下文" }].slice(-30),
  }));
  const resumePrompt = [
    "你正在 CCM 群聊中继续执行同一轮子 Agent 工作。系统刚刚帮你向其他子 Agent 提问并收到回答。",
    "请基于这些回答继续原任务，不要重复已经完成的工作；如果答案解除阻塞，请继续实现/验证；如果仍阻塞，请明确写入 CCM_AGENT_RECEIPT.blockers/needs。",
    "",
    "【你上一轮原始任务】",
    compactMemoryText(input.originalPrompt, 1800),
    "",
    "【你上一轮输出】",
    compactMemoryText(stripAgentQaProtocolBlocks(input.sourceOutput), 1800),
    "",
    "【其他 Agent 回答】",
    injectedAnswers.map((item, index) => `#${index + 1} ${item.to_agent} 回答 ${item.from_agent}\n问题：${item.question}\n回答：${compactMemoryText(item.answer, 1800)}`).join("\n\n"),
    "",
    "请继续完成你的工作，并在末尾提交新的 CCM_AGENT_RECEIPT。若还需要继续问其他 Agent，可以再次输出 ask_agent/request_review，但本轮系统只会记录，避免无限循环。",
  ].join("\n");

  const resumeMessageId = "m" + Date.now().toString(36) + "qar" + crypto.randomBytes(2).toString("hex");
  let resumeSession = input.taskId ? openTaskAgentSession({
    scopeId: input.taskId,
    taskId: input.taskId,
    groupId: input.groupId,
    project: input.sourceProject,
    agentType: input.sourceAgentType,
  }) : null;
  let resumedNativeSessionId = "";
  let resumeSucceeded = true;
  let resumeError = "";
  const resumedOutput = await input.ctx.callAgentForGroupStream(input.sourceProject, resumePrompt, input.sourceWorkDir, input.sourceAgentType, {
    res: input.streamRes || null,
    groupId: input.groupId,
    timeoutMs: 300000,
    messageId: resumeMessageId,
    allowedTools: input.allowedTools,
    mcpConfigPath: input.mcpConfigPath || "",
    taskId: input.taskId || "",
    executionId: input.taskId || "",
    agentSession: resumeSession ? getTaskAgentSessionOptions(resumeSession) : null,
    onDone: (opts: any) => {
      resumedNativeSessionId = String(opts?.nativeSessionId || "");
      resumeSucceeded = opts?.isError !== true;
      resumeError = String(opts?.error || opts?.message || "");
    },
  });
  if (resumeSession) {
    resumeSession = recordTaskAgentSessionTurn(resumeSession.id, {
      nativeSessionId: resumedNativeSessionId,
      success: resumeSucceeded,
      error: resumeError || (!resumeSucceeded ? resumedOutput : ""),
    }) || resumeSession;
  }
  const resumedAt = new Date().toISOString();
  const resumedAnswerIds = injectedAnswers.map((item: any) => {
    const updated = upsertAgentQaItem({
      ...item,
      status: "resumed",
      resumed_at: resumedAt,
      resume_message_id: resumeMessageId,
      audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: resumedAt, type: "resumed", detail: "原 Agent 已拿到回答并续跑" }].slice(-30),
    });
    return updated.id;
  });
  appendGroupMessage(input.groupId, {
    id: resumeMessageId,
    role: "assistant",
    agent: input.sourceProject,
    type: "agent_qa_resume",
    content: resumedOutput,
    timestamp: new Date().toISOString(),
    task_id: input.taskId || undefined,
    qa: {
      kind: "resume",
      from_agent: input.sourceProject,
      answers: resumedAnswerIds,
      status: "resumed",
      injected_at: injectedAt,
      resumed_at: resumedAt,
    },
  });
  const resumeQa = {
    id: "qa_resume_" + Date.now().toString(36) + "_" + crypto.randomBytes(2).toString("hex"),
    group_id: input.groupId,
    task_id: input.taskId || "",
    from_agent: input.sourceProject,
    to_agent: input.sourceProject,
    status: "resumed",
    answer: compactMemoryText(resumedOutput, 2000),
    injected_at: injectedAt,
    resumed_at: resumedAt,
  };
  emitAgentQaEvent(input.streamRes, "resume", resumeQa, resumedOutput);
  outputs.push(formatCollectedAgentOutput(input.sourceProject, resumedOutput, extractAgentReceipt(resumedOutput, input.sourceProject)));
  if (input.taskId) addTaskLog(input.taskId, "info", `Agent 问答完成后已续跑：${input.sourceProject}`);
  if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: "agent_qa_resume", title: `${input.sourceProject} 拿到回答并续跑`, detail: compactMemoryText(resumedOutput, 500), status: resumeSucceeded ? "ok" : "warn", phase: "executing", agent: input.sourceProject, data: { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" } });
  appendAgentQaTrace(input.taskId || "", "agent.qa.resumed", resumeQa, `${input.sourceProject} 已被回答事件唤醒并续跑`, resumeSucceeded ? "ok" : "warn", { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" });
  if (input.taskId) updateGroupTaskInlineStatus(getTaskById(input.taskId) || { id: input.taskId, group_id: input.groupId }, "in_progress", `${input.sourceProject} 已收到回答并从${resumeSession?.resumeMode === "native" ? "原生会话" : "任务会话"}续跑`);
  updateGroupMemory(input.groupId, {
    currentPhase: "executing",
    decisions: {
      type: "agent_qa_acceptance",
      taskId: input.taskId || "",
      project: input.sourceProject,
      summary: `${input.sourceProject} 已采纳 ${injectedAnswers.length} 条 Agent 回答并续跑`,
      qa_ids: resumedAnswerIds,
      evidence: injectedAnswers.flatMap((item: any) => item.answer_evidence || []).slice(0, 20),
    },
    nextAction: `主 Agent 等待 ${input.sourceProject} 续跑回执并进行最终验收`,
  });
  return { outputs, resumedOutput };
}

async function appendCoordinatorMessage(
  groupId: string,
  agent: string,
  content: string,
  streamRes: any = null,
  suffix = "review",
  metadata: any = {}
) {
  const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
  appendGroupMessage(groupId, {
    id: messageId,
    role: "assistant",
    agent,
    content,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
  writeSse(streamRes, {
    type: "agent_done",
    agent,
    text: content,
    messageId,
    ...metadata,
  });
  return messageId;
}

function buildCoordinatorReworkTask(
  item: any,
  input: { userMessage: string; coordinatorOutput: string; round: number; maxRounds: number; previousLedger?: any }
) {
  const project = String(item?.targetName || item?.project || "").trim();
  const rawTask = String(item?.message || item?.task || "").trim();
  const reason = String(item?.reason || "主 Agent 复盘发现仍缺少可验收证据").trim();
  if (/主 Agent 返工工作单|返工轮次|必须再次提交 CCM_AGENT_RECEIPT/i.test(rawTask)) return rawTask;
  const previous = input.previousLedger || item?.previousLedger || null;
  const previousSummary = previous ? [
    previous.summary ? `摘要：${compactMemoryText(previous.summary, 260)}` : "",
    previous.filesChanged?.length ? `文件：${previous.filesChanged.slice(0, 8).join("、")}` : "",
    previous.verification?.length ? `验证：${previous.verification.slice(0, 8).join("、")}` : "",
    previous.blockers?.length ? `阻塞：${previous.blockers.slice(0, 8).join("、")}` : "",
    previous.needs?.length ? `需要：${previous.needs.slice(0, 8).join("、")}` : "",
  ].filter(Boolean).join("；") : "";
  return [
    `主 Agent 返工工作单：${project}`,
    `- 返工轮次：第 ${input.round + 1}/${input.maxRounds} 轮执行；这是主 Agent 验收后派发的补充任务。`,
    "- 续跑语义：优先继续同一个 Worker 的上下文；系统会把该 Worker 的上一轮 task-notification/scratchpad 注入给你。不要从零开始猜测，也不要重复已完成且已验证的工作。",
    previousSummary ? `- 上一轮 Worker 通知摘要：${previousSummary}` : "- 上一轮 Worker 通知摘要：暂无可用记录；请按本工作单和群聊记忆继续补齐缺口。",
    `- 原始需求：${compactMemoryText(input.userMessage, 500)}`,
    `- 初始协调计划摘要：${compactMemoryText(input.coordinatorOutput, 900)}`,
    `- 返工原因：${reason}`,
    `- 本次返工任务：${rawTask}`,
    "- 你的职责：只处理本项目范围内的代码、配置、验证或说明；如果依赖其他 Agent/用户，写清 blockers/needs。",
    "- 交付要求：补齐主 Agent 点名的缺口，明确实际动作、文件变更、验证结果和剩余风险。",
    "- 验证要求：实际运行与你补充内容相关的最小必要验证；未运行的只能写成建议，不能伪造成已执行。",
    "- 回执要求：最后必须再次提交 CCM_AGENT_RECEIPT，status 只有在有证据时才能写 done。",
  ].join("\n");
}

function getCoordinatorReworkProtocolSelfTest() {
  const task = buildCoordinatorReworkTask(
    {
      project: "web-app",
      message: "补充订单退款审核入口的实际验证记录，并说明修改文件。",
      reason: "done 回执缺少可采信的已执行验证证据",
    },
    {
      userMessage: "按接口文档实现订单退款审核功能。",
      coordinatorOutput: "主 Agent 计划：先后端接口，再前端对接，最后验收回执。",
      round: 1,
      maxRounds: 3,
    }
  );
  const checks = {
    hasReworkPacket: task.includes("主 Agent 返工工作单"),
    hasRound: task.includes("第 2/3 轮执行"),
    hasContinuationSemantics: task.includes("续跑语义") && task.includes("同一个 Worker"),
    hasScratchpadContext: task.includes("task-notification/scratchpad"),
    hasOriginalRequirement: task.includes("原始需求"),
    hasCoordinatorPlan: task.includes("初始协调计划摘要"),
    hasReason: task.includes("返工原因"),
    hasVerification: task.includes("验证要求"),
    hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
  };
}

async function runCoordinatorReviewLoop(input: {
  groupId: string;
  group: any;
  userMessage: string;
  coordinatorOutput: string;
  crossOutputs: string[];
  configs: any[];
  ctx: CollabCtx;
  streamRes?: any;
  executionOrder?: string;
  taskId?: string;
}) {
  const coordinator = getCoordinatorMember(input.group);
  const seenMentions = new Set<string>();
  const allOutputs = [...(input.crossOutputs || [])];
  // One automatic rework is enough for a user-facing collaboration task.
  // More rounds tend to repeat the same evidence request and make the task
  // appear stuck.  After that single rework, surface the remaining gap and
  // wait for an explicit user action.
  const maxReviewRounds = 2;
  if (allOutputs.length === 0) return null;

  let lastReview: any = null;

  for (let round = 1; round <= maxReviewRounds; round++) {
    const allowFollowUps = round < maxReviewRounds;
    let review: any = await runLlmCoordinatorReview(
      input.group,
      input.userMessage,
      input.coordinatorOutput,
      allOutputs,
      { allowFollowUps, round, maxRounds: maxReviewRounds }
    );

    if (!review) {
      review = buildCodedCoordinatorReview(input.group, allOutputs, {
        allowFollowUps,
        round,
        maxRounds: maxReviewRounds,
      });
    }

    lastReview = review;
    const llmFollowUps = Array.isArray((review as any).followUps) ? (review as any).followUps : [];
    const gateFollowUps = buildEvidenceGateFollowUps(input.group, allOutputs);
    // Never dispatch another Worker from the final review round.  Previously
    // LLM-proposed follow-ups bypassed `allowFollowUps`, so the last round could
    // start one more execution even though the loop was already exhausted.
    const followUps = allowFollowUps
      ? uniqueByKey(
          [...llmFollowUps, ...gateFollowUps],
          (item: any) => `${String(item?.targetName || item?.project || "").trim()}|${normalizeMentionTask(String(item?.message || item?.task || ""))}`,
          20
        )
      : [];
    const memorySnapshot = loadGroupMemory(input.groupId);
    const reworkFollowUps = followUps.map((item: any) => ({
      ...item,
      continuationOf: String(item?.targetName || item?.project || "").trim(),
      continuationStrategy: "same_worker_scratchpad",
      previousLedger: findLatestWorkerLedger(memorySnapshot, String(item?.targetName || item?.project || "").trim()),
      message: buildCoordinatorReworkTask(item, {
        userMessage: input.userMessage,
        coordinatorOutput: input.coordinatorOutput,
        round,
        maxRounds: maxReviewRounds,
        previousLedger: findLatestWorkerLedger(memorySnapshot, String(item?.targetName || item?.project || "").trim()),
      }),
    }));
    const gateReasons = gateFollowUps.map((item: any) => String(item.reason || "").trim()).filter(Boolean);
    if (!allowFollowUps && gateReasons.length) {
      (review as any).status = "needs_user";
    }
    let reviewContent = gateReasons.length
      ? `${review.content}\n\n系统验收门禁：${gateReasons.join("；")}${allowFollowUps ? "" : "\n已达到自动返工上限，需要用户确认是否继续派发或人工介入。"}`
      : review.content;
    if (reworkFollowUps.length) {
      reviewContent = [
        reviewContent,
        "",
        "主 Agent 返工工作单：",
        ...reworkFollowUps.map((item: any) => `@${item.targetName || item.project} ${compactMemoryText(item.message || item.task || "", 900)}`),
      ].join("\n");
    }
    const followUpAssignments = normalizePlanAssignments(reworkFollowUps.map((item: any) => ({
      project: String(item?.targetName || item?.project || "").trim(),
      task: String(item?.message || item?.task || "").trim(),
      reason: String(item?.reason || "主 Agent 复盘后发现仍有缺口，需要补充处理").trim(),
      dependsOn: String(item?.dependsOn || "").trim(),
      rework: true,
      continuationOf: String(item?.continuationOf || item?.targetName || item?.project || "").trim(),
      continuationStrategy: String(item?.continuationStrategy || "same_worker_scratchpad").trim(),
      attempt: round + 1,
    })).filter((item: any) => item.project && item.task));

    const reviewMessageId = await appendCoordinatorMessage(
      input.groupId,
      coordinator.project,
      reviewContent,
      input.streamRes,
      `review${round}`,
      followUpAssignments.length > 0
        ? {
            assignments: followUpAssignments,
            executionOrder: input.executionOrder || "parallel",
            runtime: "llm-review",
            workflow: buildWorkflowMeta("rework", `第 ${round} 轮验收后返工`),
          }
        : {
            runtime: "llm-review",
            workflow: buildWorkflowMeta((review as any).status === "needs_user" ? "needs_user" : "reviewing", `第 ${round} 轮主 Agent 验收`),
        }
    );
    updateGroupMemory(input.groupId, {
      currentPhase: followUpAssignments.length > 0 ? "rework" : ((review as any).status === "needs_user" ? "needs_user" : "reviewing"),
      decision: `主 Agent 第 ${round} 轮验收：${(review as any).status || "review"}`,
      reason: gateReasons.join("；") || ((review as any).gaps || []).join("；") || ((review as any).conflicts || []).join("；"),
      openQuestion: (review as any).content?.includes("需要你确认") ? (review as any).content : "",
      nextAction: followUpAssignments.length > 0 ? `执行第 ${round} 轮返工计划` : "等待用户确认或进入最终总结",
    });

    if (followUps.length === 0) return review;

    writeSse(input.streamRes, { type: "status", text: `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问相关子 Agent...`, agent: coordinator.project });
    const followOutputs = await processCrossAgents(
      input.groupId,
      input.group,
      coordinator.project,
      reviewContent,
      reworkFollowUps,
      input.configs,
      input.ctx,
      input.streamRes,
      round,
      seenMentions,
      input.executionOrder || "parallel",
      reviewMessageId,
      input.taskId || ""
    );
    allOutputs.push(...followOutputs);
  }

  const finalSummary = lastReview
    || await runLlmCoordinatorSummary(input.group, input.userMessage, allOutputs)
    || buildCodedCoordinatorSummary(input.group, allOutputs);

  if (finalSummary) {
    await appendCoordinatorMessage(
      input.groupId,
      finalSummary.agent || coordinator.project,
      finalSummary.content,
      input.streamRes,
      "final",
      { workflow: buildWorkflowMeta((finalSummary as any).status === "needs_user" ? "needs_user" : "complete", "最终验收") }
    );
    updateGroupMemory(input.groupId, {
      currentPhase: (finalSummary as any).status === "needs_user" ? "needs_user" : "complete",
      decision: "主 Agent 完成最终验收",
      reason: compactMemoryText(finalSummary.content || "", 300),
      nextAction: (finalSummary as any).status === "needs_user" ? "等待用户补充信息" : "本轮协作已完成",
    });
  }
  return finalSummary;
}

// === 执行任务核心 ===
async function executeTask(task: any, ctx: CollabCtx) {
  const configs = getConfigs();

  if (task.assign_type === "group" && task.group_id) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === task.group_id);
    if (!group) throw new Error("群聊不存在");
    const coordinatorProject = getCoordinatorMember(group).project;

    const message = buildQueuedGroupTaskMessage(task);
    appendTaskTimelineEvent(task.id, { type: "queued_group_task", title: "任务进入群聊主 Agent", detail: task.title || "", status: "active", phase: "intake", agent: coordinatorProject, data: { group_id: task.group_id } });

    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "task",
      role: "user",
      target: coordinatorProject,
      content: message,
      timestamp: new Date().toISOString(),
      task_id: task.id,
    });
    safeAddGroupLog(task.group_id, "info", "task", `任务派发到群聊: ${task.title}`, {
      task_id: task.id,
      priority: task.priority
    });

    updateGroupMemory(task.group_id, {
      goal: message,
      currentPhase: "dispatching",
      decision: "任务队列派发到群聊主 Agent",
      reason: task.title,
      nextAction: "主 Agent 拆分任务并协调子 Agent",
    });
    const context = buildGroupContextPacket(task.group_id, { recentLimit: 12, olderLimit: 30, fullCount: 5 });
    const sharedFilesContext = mergeCoordinatorDocumentContexts(
      buildCoordinatorSharedFilesContext(ctx, group),
      buildTaskSourceDocumentsContext(task)
    );
    let coordinatorResult = await runGroupOrchestrator({
      group,
      message,
      context,
      source: "task",
      sharedFilesContext,
    });
    let coordinatorOutput = coordinatorResult.content;
    const coordinatorTranscript = [coordinatorOutput].filter(Boolean);
    let coordinatorMessageId = "m" + Date.now().toString(36) + "coord";
    let planAssignments = normalizePlanAssignments((coordinatorResult as any).assignments || []);
    let dispatchPolicy = (coordinatorResult as any).dispatchPolicy || null;
    let workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "任务队列协调");
    appendGroupMessage(task.group_id, {
      id: coordinatorMessageId,
      role: "assistant",
      agent: coordinatorProject,
      content: buildUserCoordinationAcknowledgement(task, planAssignments),
      technical_content: coordinatorOutput,
      timestamp: new Date().toISOString(),
      task_id: task.id,
      assignments: planAssignments,
      executionOrder: (coordinatorResult as any).executionOrder || "parallel",
      runtime: (coordinatorResult as any).runtime || "",
      dispatchPolicy,
      coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
      workflow: workflowMeta,
    });
    appendTaskTimelineEvent(task.id, { type: "coordinator_plan", title: "主 Agent 生成计划", detail: compactMemoryText(coordinatorOutput, 500), status: planAssignments.length ? "ok" : "warn", phase: "planning", agent: coordinatorProject, data: { assignments: planAssignments, dispatchPolicy, coordinationPlan: (coordinatorResult as any).coordinationPlan || null } });
    const semanticReasoning = (coordinatorResult as any).analysis?.reasoning || {};
    const taskReasoning = normalizeAgentReasoningState(task.reasoning_loop, task.business_goal || task.title || "");
    updateReasoningPlan(taskReasoning, (coordinatorResult as any).coordinationPlan?.phases || [], "群聊主 Agent 基于语义拆分形成协调计划");
    captureReasoningFacts(taskReasoning, "coordinator_semantic_analysis", {
      known_facts: semanticReasoning.knownFacts || [],
      assumptions_to_verify: semanticReasoning.assumptionsToVerify || [],
      dependency_rationale: semanticReasoning.dependencyRationale || [],
      assignments: planAssignments.map((item: any) => ({ project: item.project, dependsOn: item.dependsOn || "", reason: item.reason || "" })),
      replan_triggers: semanticReasoning.replanTriggers || [],
    });
    explainReasoningDecision(taskReasoning, dispatchPolicy?.action || (planAssignments.length ? "delegate" : "hold"), dispatchPolicy?.reason || "群聊主 Agent 根据语义分析、依赖与风险形成当前安排");
    (semanticReasoning.verificationAssertions || []).forEach((label: string, index: number) => setReasoningAssertion(taskReasoning, { id: `semantic_${index + 1}`, label, kind: "semantic_acceptance", status: "pending", reason: "群聊主 Agent 在派发前定义" }));
    if ((semanticReasoning.assumptionsToVerify || []).length) recordReasoningDeviation(taskReasoning, "unverified_assumptions", `待 Worker 核验：${semanticReasoning.assumptionsToVerify.join("；")}`, "info");
    updateTask(task.id, { reasoning_loop: taskReasoning, coordination_plan: (coordinatorResult as any).coordinationPlan || null });
    appendTaskTimelineEvent(task.id, { type: "reasoning_plan", title: `主 Agent 推理计划 v${taskReasoning.plan_version}`, detail: `事实 ${(semanticReasoning.knownFacts || []).length} · 假设 ${(semanticReasoning.assumptionsToVerify || []).length} · 断言 ${(semanticReasoning.verificationAssertions || []).length}`, status: "ok", phase: "planning", agent: coordinatorProject, data: { plan_version: taskReasoning.plan_version, reasoning: semanticReasoning } });

    let validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
    if (task.workflow_type === "daily_dev" && validMentions.length === 0 && getRoutableMembers(group).length > 0) {
      const repairResult = runCodedGroupOrchestrator({
        group,
        message,
        context,
        source: "daily-dev-dispatch-repair",
        sharedFilesContext,
      }) as any;
      const repairMentions = getCoordinatorActionMentions(repairResult, group, coordinatorProject);
      const repairAssignments = normalizePlanAssignments(repairResult.assignments || []);
      if (repairMentions.length > 0 || repairAssignments.length > 0) {
        const repairOutput = [
          "主 Agent 派发修复：业务开发任务缺少可执行 assignments，系统已启用规则协调器补充派发计划。",
          "",
          repairResult.content || "",
        ].join("\n").trim();
        coordinatorResult = {
          ...repairResult,
          content: repairOutput,
          runtime: repairResult.runtime || "coded-dispatch-repair",
        };
        coordinatorOutput = repairOutput;
        coordinatorTranscript.push(repairOutput);
        coordinatorMessageId = "m" + Date.now().toString(36) + "repair";
        planAssignments = normalizePlanAssignments((coordinatorResult as any).assignments || []);
        dispatchPolicy = (coordinatorResult as any).dispatchPolicy || null;
        workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "daily_dev 派发修复");
        appendGroupMessage(task.group_id, {
          id: coordinatorMessageId,
          role: "assistant",
          agent: coordinatorProject,
          content: coordinatorOutput,
          timestamp: new Date().toISOString(),
          task_id: task.id,
          assignments: planAssignments,
          executionOrder: (coordinatorResult as any).executionOrder || "parallel",
          runtime: (coordinatorResult as any).runtime || "",
          dispatchPolicy,
          coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
          workflow: workflowMeta,
        });
        validMentions = repairMentions.length > 0
          ? repairMentions
          : getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
        addTaskLog(task.id, "info", `daily_dev 主 Agent 空派发已自动补派: ${validMentions.map(m => m.mention).join(", ") || planAssignments.map((item: any) => `@${item.project}`).join(", ")}`);
        updateGroupMemory(task.group_id, {
          currentPhase: "dispatching",
          decision: "daily_dev 空派发计划修复",
          reason: "主 Agent 未产生可执行派发，已启用规则协调器补充派发计划",
          nextAction: "子 Agent 按补派计划执行并返回结构化回执",
        });
      } else {
        addTaskLog(task.id, "warning", "daily_dev 主 Agent 空派发修复未产生可执行目标");
      }
    }

    const sandboxRehearsal = buildTaskSandboxRehearsal(task, group, coordinatorResult, planAssignments, validMentions, dispatchPolicy);
    const tasksForRehearsal = loadTasks();
    const rehearsalTaskIndex = tasksForRehearsal.findIndex((item: any) => item.id === task.id);
    if (rehearsalTaskIndex >= 0) {
      tasksForRehearsal[rehearsalTaskIndex].workflow_meta = { ...(tasksForRehearsal[rehearsalTaskIndex].workflow_meta || {}), sandbox_rehearsal: sandboxRehearsal };
      tasksForRehearsal[rehearsalTaskIndex].sandbox_rehearsal = sandboxRehearsal;
      saveTasks(tasksForRehearsal);
    }
    appendTaskTimelineEvent(task.id, { type: "sandbox_rehearsal", title: "任务前沙盘演练", detail: `${sandboxRehearsal.impact_scope.areas.join("、")}；${sandboxRehearsal.agent_plan.length} 个 Agent 计划`, status: sandboxRehearsal.status === "ready" ? "ok" : "warn", phase: "planning", agent: coordinatorProject, data: sandboxRehearsal });
    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "sandbox",
      role: "assistant",
      agent: coordinatorProject,
      type: "task_rehearsal",
      content: [`任务前沙盘演练：${sandboxRehearsal.title}`, `影响范围：${sandboxRehearsal.impact_scope.areas.join("、")}`, `计划派发：${sandboxRehearsal.agent_plan.map((item: any) => item.project).join("、") || "待确认"}`, `门禁：${sandboxRehearsal.gate_requirements.join("、")}`].join("\n"),
      timestamp: new Date().toISOString(),
      task_id: task.id,
      taskRehearsal: sandboxRehearsal,
      workflow: buildWorkflowMeta("planning", "任务前沙盘演练"),
    });

    let crossOutputs: string[] = [];
    let reviewResult: any = null;
    if (validMentions.length > 0) {
      addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
      appendTaskTimelineEvent(task.id, { type: "dispatch", title: "主 Agent 派发子 Agent", detail: validMentions.map(m => m.mention).join(", "), status: "active", phase: "dispatching", agent: coordinatorProject, data: { mentions: validMentions } });
      crossOutputs = await processCrossAgents(
        task.group_id,
        group,
        coordinatorProject,
        coordinatorOutput,
        validMentions,
        configs,
        ctx,
        null,
        0,
        new Set<string>(),
        (coordinatorResult as any).executionOrder || "parallel",
        coordinatorMessageId,
        task.id
      );
      reviewResult = await runCoordinatorReviewLoop({
        groupId: task.group_id,
        group,
        userMessage: message,
        coordinatorOutput,
        crossOutputs,
        configs,
        ctx,
        executionOrder: (coordinatorResult as any).executionOrder || "parallel",
        taskId: task.id,
      });
      appendTaskTimelineEvent(task.id, { type: "coordinator_review", title: "主 Agent 验收", detail: compactMemoryText(reviewResult?.content || reviewResult?.detail || "", 500), status: reviewResult?.status === "done" ? "ok" : "warn", phase: "reviewing", agent: coordinatorProject, data: { review: reviewResult?.review || reviewResult } });
    }

    const outputText = [...coordinatorTranscript, ...crossOutputs, reviewResult?.content || ""].filter(Boolean).join("\n\n---\n\n");
    return getGroupTaskExecutionStatus(reviewResult, coordinatorResult, outputText, task);
  } else {
    const config = configs.find(c => c.name === task.target_project);
    if (!config) throw new Error("项目配置不存在");
    appendTaskTimelineEvent(task.id, { type: "direct_task", title: "直接任务进入项目 Agent", detail: task.title || "", status: "active", phase: "dispatching", agent: task.target_project });

    const info = getConfigInfo(config.path);
    let workDir = info[0]?.workDir;
    const agentType = info[0]?.agent || "claudecode";

    const toolContext = buildAgentToolContext(ctx, null, task.target_project);
    const preparedWorkDir = prepareChildAgentWorkDir(workDir, {
      mode: getChildAgentIsolationMode(null, task),
      taskId: task.id,
      agentName: task.target_project,
      sourceProject: "task-queue",
      failClosed: true,
    });
    workDir = preparedWorkDir.workDir;
    ensureExecution({ task, project: task.target_project, agent: task.target_project, workDir, executionId: task.id });
    attachExecutionWorkspace(task.id, { ...preparedWorkDir, project: task.target_project, mode: preparedWorkDir.mode });
    if (!loadExecution(task.id)?.checkpointIds?.length) {
      try { createExecutionCheckpoint({ executionId: task.id, taskId: task.id, workDir, mode: preparedWorkDir.mode, label: "项目 Agent 开始执行前" }); }
      catch (error: any) { addTaskLog(task.id, "warning", `无法创建任务前文件检查点：${error.message}`); }
    }
    const worktreeNotice = buildChildAgentWorktreeNotice(preparedWorkDir);
    const runtimeToolContext = prepareAgentRuntimeTools(task.group_id || "", task.target_project, workDir, agentType, toolContext.allowedTools);
    if (preparedWorkDir.mode === "worktree") {
      addTaskLog(task.id, "info", `直接任务已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`);
    } else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
      addTaskLog(task.id, "warning", `直接任务请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`);
    }
    const directSandboxRehearsal = buildTaskSandboxRehearsal(
      task,
      { members: [{ project: task.target_project }] },
      { content: task.description || task.title, dispatchPolicy: { action: "delegate", reason: "直接任务派发给目标项目 Agent" } },
      [{ project: task.target_project, task: task.description || task.title, reason: "直接任务" }],
      [{ targetName: task.target_project, mention: `@${task.target_project}` }],
      { action: "delegate", reason: "直接任务派发给目标项目 Agent" }
    );
    const directTasksForRehearsal = loadTasks();
    const directRehearsalTaskIndex = directTasksForRehearsal.findIndex((item: any) => item.id === task.id);
    if (directRehearsalTaskIndex >= 0) {
      directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta = { ...(directTasksForRehearsal[directRehearsalTaskIndex].workflow_meta || {}), sandbox_rehearsal: directSandboxRehearsal };
      directTasksForRehearsal[directRehearsalTaskIndex].sandbox_rehearsal = directSandboxRehearsal;
      saveTasks(directTasksForRehearsal);
    }
    appendTaskTimelineEvent(task.id, { type: "sandbox_rehearsal", title: "任务前沙盘演练", detail: `${directSandboxRehearsal.impact_scope.areas.join("、")}；直接派发给 ${task.target_project}`, status: "ok", phase: "planning", agent: task.target_project, data: directSandboxRehearsal });
    const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
    const directTaskText = buildChildAgentTaskText(`${task.title}\n${task.description || ""}`, task);
    const developmentContract = buildChildAgentDevelopmentContract(task.target_project, directTaskText, {
      source: "任务队列",
      acceptance: task.acceptance_criteria || "",
      requires_code_changes: task.requires_code_changes,
      verification_hints: buildProjectVerificationHints(task.target_project, workDir),
      work_dir: workDir,
    });
    const message = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${developmentContract}\n\n${worktreeNotice}\n\n📋 执行任务：${task.title}\n${directTaskText}

请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执，格式如下：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "memoryUsed": ["本轮实际使用的记忆/知识库/历史结论；未使用填空数组"],
  "memoryIgnored": ["没有使用或无法使用记忆的原因；没有填空数组"],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
    const output = await ctx.callAgent(task.target_project, message, workDir, agentType, 300000, { allowedTools: toolContext.allowedTools, mcpConfigPath: runtimeToolContext.audit.mcpConfigPath, taskId: task.id, executionId: task.id });
    const fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
    const receipt = extractAgentReceipt(output, task.target_project);
    const result = getTaskExecutionFromReceipt(output, receipt, { fileChanges });
    const green = evaluateGreenContract({ receipt, fileChanges, requiresChanges: taskRequiresCodeChanges(task), requiresVerification: task.requires_verification !== false, requiredLevel: "project" });
    transitionExecution(task.id, result.status === "failed" ? "failed" : "reviewing", result.status === "done" ? "项目 Agent 已交付，进入验收" : result.detail, {
      green,
      receipt,
      fileChanges,
      runnerVerification: extractRunnerVerificationEvidence(output),
      outputPreview: output,
    });
    return { ...result, executionKernel: { executionId: task.id, green } };
  }
}

function ensureTaskKernelExecution(task: any) {
  if (!task?.id) return null;
  if (loadExecution(task.id)) return loadExecution(task.id);
  let project = String(task.target_project || "");
  if (task.assign_type === "group" && task.group_id) {
    const group = loadGroups().find((item: any) => item.id === task.group_id);
    if (group) project = getCoordinatorMember(group).project;
  }
  const config = getConfigs().find((item: any) => item.name === project);
  const workDir = config ? String(getConfigInfo(config.path)?.[0]?.workDir || "") : "";
  if (!project || !workDir || !fs.existsSync(workDir)) return null;
  return ensureExecution({ task, project, agent: project, workDir, executionId: task.id });
}

function finalizeTaskKernel(task: any, execution: any, deliverySummary: any, state: "succeeded" | "failed" | "reviewing" | "cancelled", message: string) {
  ensureTaskKernelExecution(task);
  const records = listExecutions({ taskId: task.id });
  let rootGreen: any = null;
  for (const record of records) {
    if (state === "cancelled") { transitionExecution(record.id, "cancelled", message); continue; }
    if (state === "failed") {
      const failure = classifyExecutionFailure(message);
      transitionExecution(record.id, "failed", message, { failure, failureClass: failure.failureClass });
      continue;
    }
    let branchFresh = true;
    if (record.workspace?.mode === "worktree" && record.workspace?.worktreePath) {
      try { branchFresh = inspectBranchFreshness(record.workspace.worktreePath, record.workspace.baseBranch || "").fresh; } catch { branchFresh = false; }
    }
    const acceptancePassed = deliverySummary?.acceptance_gate_passed !== false && state === "succeeded";
    let green = record.green || { level: "none", pass: false };
    if (record.id === task.id) {
      green = evaluateGreenContract({
        receipt: execution?.receipt || { status: execution?.status, verification: deliverySummary?.verification_executed || [] },
        fileChanges: extractActualFileChanges(execution?.fileChanges, task.target_project || record.project),
        requiresChanges: taskRequiresCodeChanges(task),
        requiresVerification: task.requires_verification !== false,
        workspacePassed: acceptancePassed,
        branchFresh,
        reviewPassed: state === "succeeded",
        requiredLevel: record.workspace?.mode === "worktree" ? "merge_ready" : "project",
      });
      rootGreen = green;
    } else if (state === "succeeded" && acceptancePassed && branchFresh && ["project", "workspace", "merge_ready"].includes(String(green.level))) {
      green = { ...green, level: record.workspace?.mode === "worktree" ? "merge_ready" : green.level, pass: true, reviewedAt: new Date().toISOString() };
    }
    transitionExecution(record.id, state, message, { green });
  }
  if (records.length) updateTask(task.id, { execution_kernel: { execution_id: task.id, state, green: rootGreen, updated_at: new Date().toISOString() } });
  return rootGreen;
}

// 队列处理
async function processTargetQueue(targetKey: string, ctx: CollabCtx) {
  if (runningTasks.has(targetKey)) {
    console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
    return;
  }

  const queue = taskQueues.get(targetKey);
  if (!queue || queue.length === 0) return;

  runningTasks.set(targetKey, true);
  console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);

  while (queue.length > 0) {
    const taskId = queue.shift();
    if (!taskId) continue;
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived" || task.archived || task.deleted_at) {
      addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
      continue;
    }
    if (isTaskPaused(task)) {
      addTaskLog(taskId, "info", `任务已暂停，跳过本次队列执行`);
      continue;
    }

    const traceId = ensureTraceId(task.trace_id, "task");
    const leaseResult = acquireTaskLease(taskId, traceId, 45_000);
    if (!leaseResult.acquired) {
      addTaskLog(taskId, "warning", `任务已有存活 Worker 租约，本实例跳过重复执行（owner=${leaseResult.lease?.owner_id || "unknown"}）`);
      appendTraceEvent(traceId, { type: "task.duplicate_execution_suppressed", status: "warning", task_id: taskId, group_id: task.group_id || "", message: "检测到有效执行租约，阻止重复执行" });
      continue;
    }
    let leaseHeartbeat: any = null;
    let enqueueFollowupAfterRound = false;
    const executionFollowupRevision = Number(task.followup_revision || 0);

    addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);

    try {
      runningTaskIds.add(taskId);
      leaseHeartbeat = setInterval(() => renewTaskLease(taskId, 45_000), 10_000);
      ensureTaskKernelExecution(task);
      transitionExecution(taskId, "spawning", "任务队列正在启动开发执行内核");
      const reasoningLoop = buildTaskPreflightReasoning(task, "主 Agent 执行前重新核对目标、当前状态和验收条件", Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery);
      const startedTask = updateTask(taskId, { status: "in_progress", trace_id: traceId, started_at: new Date().toISOString(), reasoning_loop: reasoningLoop, execution_lease: { owner_id: leaseResult.lease.owner_id, acquired_at: leaseResult.lease.acquired_at, recovery_count: leaseResult.lease.recovery_count } }) || task;
      appendTaskTimelineEvent(taskId, { type: "reasoning_preflight", title: "主 Agent 已复核目标与验收", detail: `计划版本 v${reasoningLoop.plan_version} · 待证明 ${reasoningLoop.assertions.filter(item => item.status !== "passed").length} 项`, status: "ok", phase: "planning", data: { plan_version: reasoningLoop.plan_version, fact_hash: reasoningLoop.fact_snapshots[reasoningLoop.fact_snapshots.length - 1]?.hash || "", recovery: Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery } });
      updateGroupTaskInlineStatus(startedTask, "in_progress", "主 Agent 已开始协调执行");
      addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
      syncTaskBacklogStatus(startedTask, "in_progress", "任务已进入执行阶段");
      await ctx.onTaskStatusChange?.(startedTask, "in_progress");

      addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
      const execution = await executeTask(startedTask, ctx);
      const result = execution.result || execution.report || "";

      if (isTaskCancellationRequested(taskId)) {
        const cancelledTask = updateTask(taskId, { status: "cancelled", result: "任务已取消", status_detail: "任务已由用户取消", cancelled_at: new Date().toISOString() }) || { ...task, status: "cancelled" };
        updateGroupTaskInlineStatus(cancelledTask, "cancelled", "任务已由用户取消");
        finalizeTaskKernel(task, execution, null, "cancelled", "任务已由用户取消");
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
        addTaskLog(taskId, "warning", "任务执行进程已终止，状态更新为已取消");
        await ctx.onTaskStatusChange?.(cancelledTask, "cancelled", "任务已由用户取消");
        continue;
      }

      const latestWithFollowups = loadTasks().find((item: any) => item.id === taskId) || startedTask;
      if (Number(latestWithFollowups.followup_revision || 0) > executionFollowupRevision) {
        const pending = Array.isArray(latestWithFollowups.pending_followups) ? latestWithFollowups.pending_followups : [];
        const deliverySummary = buildDeliverySummary(latestWithFollowups, execution, "waiting");
        const resumedTask = updateTask(taskId, {
          status: "pending",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: deliverySummary,
          reasoning_loop: deliverySummary.reasoning_loop,
          consumed_followup_revision: Number(latestWithFollowups.followup_revision || 0),
          pending_followups: pending.map((item: any) => ({ ...item, status: "accepted", accepted_at: new Date().toISOString() })),
          status_detail: `已接收 ${Math.max(1, pending.filter((item: any) => item.status !== "accepted").length)} 条追加要求，继续使用当前任务和 Agent 会话`,
        }) || latestWithFollowups;
        updateGroupTaskInlineStatus(resumedTask, "pending", resumedTask.status_detail);
        finalizeTaskKernel(task, execution, deliverySummary, "reviewing", "当前轮次已完成，正在承接用户追加要求");
        addTaskLog(taskId, "info", "当前执行轮次结束，用户追加要求将在同一任务、Trace 和 Agent 会话中继续");
        enqueueFollowupAfterRound = true;
        continue;
      }

      addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);

      if (execution.status === "failed") {
        const deliverySummary = buildDeliverySummary(task, execution, "failed");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: "fail", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        const failedTask = updateTask(taskId, {
          status: "failed",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: execution.detail || "Agent 回执失败",
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: deliverySummary,
          reasoning_loop: deliverySummary.reasoning_loop,
        }) || { ...task, status: "failed", result: result.substring(0, 500) };
        updateGroupTaskInlineStatus(failedTask, "failed", execution.detail || "Agent 回执失败");
        finalizeTaskKernel(task, execution, deliverySummary, "failed", execution.detail || "Agent 回执失败");
        addTaskLog(taskId, "error", `❌ 任务执行失败：${execution.detail || "Agent 回执失败"}`);
        syncTaskBacklogStatus(failedTask, "blocked", execution.detail || result.substring(0, 500));
        await ctx.onTaskStatusChange?.(failedTask, "failed", result.substring(0, 500));
        appendTaskGroupReport(failedTask, "failed", execution.detail || result.substring(0, 500));
        await sendTaskFailureNotification(failedTask, execution.detail || result.substring(0, 500));
        continue;
      }

      if (checkTaskFailure(result)) {
        throw new Error(result.substring(0, 500));
      }

      const isCompleted = execution.status === "done";

      if (isCompleted) {
        const deliverySummary = buildDeliverySummary(task, execution, "done");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: deliverySummary.acceptance_gate_passed ? "门禁通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        if (!deliverySummary.acceptance_gate_passed) {
          const detail = `验收门禁未通过：${deliverySummary.acceptance_gate?.failed_count || 1} 项缺口，任务保持进行中`;
          const waitingTask = updateTask(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: deliverySummary, reasoning_loop: deliverySummary.reasoning_loop }) || task;
          updateGroupTaskInlineStatus(waitingTask, "in_progress", detail);
          finalizeTaskKernel(task, execution, deliverySummary, "reviewing", detail);
          addTaskLog(taskId, "warning", detail);
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
          continue;
        }
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
        const finalizedDeliverySummary = buildDeliverySummary(task, execution, "done");
        const completedTask = updateTask(taskId, {
          status: "done",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: execution.detail || "验收通过",
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: finalizedDeliverySummary,
          reasoning_loop: finalizedDeliverySummary.reasoning_loop,
          execution_readiness: null,
          daily_dev_execution_readiness: null,
          completed_at: new Date().toISOString()
        }) || { ...task, status: "done", result: result.substring(0, 500) };
        updateGroupTaskInlineStatus(completedTask, "done", execution.detail || "验收通过");
        finalizeTaskKernel(task, execution, finalizedDeliverySummary, "succeeded", execution.detail || "验收通过");
        addTaskLog(taskId, "success", `✅ 任务完成：${execution.detail || "验收通过"}`);
        syncTaskBacklogStatus(completedTask, "done", execution.detail || result.substring(0, 500));
        await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
        appendTaskGroupReport(completedTask, "done", execution.detail || result.substring(0, 500));
        await sendTaskCompletionNotification(completedTask, result);
      } else {
        const deliverySummary = buildDeliverySummary(task, execution, "waiting");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: deliverySummary.acceptance_gate_passed ? "门禁通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过，任务继续推进`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        if (canCompleteDailyDevFromDeliverySummary(task, execution, deliverySummary)) {
          const promotedExecution = {
            ...execution,
            status: "done",
            detail: "daily_dev 验收证据齐全，系统自动完成",
          };
          const promotedSummary = buildDeliverySummary(task, promotedExecution, "done");
          appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: promotedSummary.acceptance_gate_passed ? "门禁通过并自动完成" : `${promotedSummary.acceptance_gate?.failed_count || 0} 项未通过`, status: promotedSummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: promotedSummary.acceptance_gate || {} });
          closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
          const finalizedPromotedSummary = buildDeliverySummary(task, promotedExecution, "done");
          const completedTask = updateTask(taskId, {
            status: "done",
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: promotedExecution.detail,
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: finalizedPromotedSummary,
            reasoning_loop: finalizedPromotedSummary.reasoning_loop,
            execution_readiness: null,
            daily_dev_execution_readiness: null,
            completed_at: new Date().toISOString()
          }) || { ...task, status: "done", result: result.substring(0, 500) };
          updateGroupTaskInlineStatus(completedTask, "done", promotedExecution.detail);
          finalizeTaskKernel(task, promotedExecution, finalizedPromotedSummary, "succeeded", promotedExecution.detail);
          addTaskLog(taskId, "success", `✅ 任务完成：${promotedExecution.detail}`);
          syncTaskBacklogStatus(completedTask, "done", promotedExecution.detail);
          await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
          appendTaskGroupReport(completedTask, "done", promotedExecution.detail);
          await sendTaskCompletionNotification(completedTask, result);
        } else {
          const waitingTask = updateTask(taskId, {
            status: "in_progress",
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: execution.detail || "等待补充信息或返工",
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: deliverySummary,
            reasoning_loop: deliverySummary.reasoning_loop,
          }) || { ...task, status: "in_progress", result: result.substring(0, 500) };
          updateGroupTaskInlineStatus(waitingTask, "in_progress", execution.detail || "等待补充信息或返工");
          finalizeTaskKernel(task, execution, deliverySummary, "reviewing", execution.detail || "等待补充信息或返工");
          addTaskLog(taskId, "warning", `任务仍需继续：${execution.detail || "验收未完成"}`);
          syncTaskBacklogStatus(waitingTask, "blocked", execution.detail || result.substring(0, 500));
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", result.substring(0, 500));
          appendTaskGroupReport(waitingTask, "waiting", execution.detail || result.substring(0, 500));
        }
      }
    } catch (error: any) {
      console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
      const failure = classifyExecutionFailure(error);
      const cancelled = failure.failureClass === "cancelled" || isTaskCancellationRequested(taskId);
      const failedExecution = buildTaskExecutionResult("failed", `执行失败: ${error.message}`, { detail: String(error.message || "执行失败") });
      const failedDeliverySummary = buildDeliverySummary(task, failedExecution, "failed");
      const failedTask = updateTask(taskId, {
        status: cancelled ? "cancelled" : "failed",
        result: cancelled ? "任务已取消" : `执行失败: ${error.message}`,
        status_detail: String(error.message || "执行失败").slice(0, 500),
        failure_class: failure.failureClass,
        delivery_summary: failedDeliverySummary,
        reasoning_loop: failedDeliverySummary.reasoning_loop,
      }) || { ...task, status: cancelled ? "cancelled" : "failed", result: cancelled ? "任务已取消" : `执行失败: ${error.message}` };
      updateGroupTaskInlineStatus(failedTask, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : String(error.message || "执行失败"));
      finalizeTaskKernel(task, failedExecution, failedTask.delivery_summary, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : error.message);
      if (cancelled) {
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
        clearTaskCancellation(taskId);
      }
      addTaskLog(taskId, cancelled ? "warning" : "error", cancelled ? "任务已取消，运行中的 Agent 进程已终止" : `❌ 任务执行失败: ${error.message}`);
      syncTaskBacklogStatus(failedTask, "blocked", error.message);
      await ctx.onTaskStatusChange?.(failedTask, cancelled ? "cancelled" : "failed", String(error.message || ""));
      appendTaskGroupReport(failedTask, cancelled ? "waiting" : "failed", cancelled ? "任务已取消" : error.message);
      if (!cancelled) await sendTaskFailureNotification(failedTask, error.message);
    } finally {
      if (leaseHeartbeat) clearInterval(leaseHeartbeat);
      runningTaskIds.delete(taskId);
      const finalTask = loadTasks().find((item: any) => item.id === taskId);
      releaseTaskLease(taskId, finalTask?.status || "unknown");
      if (enqueueFollowupAfterRound && finalTask && finalTask.status !== "cancelled") enqueueTask(taskId, ctx);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  runningTasks.delete(targetKey);
  console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}

function enqueueTask(taskId: string, ctx: CollabCtx) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.log(`[任务队列] 任务 ${taskId} 不存在`);
    return { queued: false, message: "任务不存在" };
  }

  if (task.status === "done") {
    addTaskLog(taskId, "info", "任务已完成，跳过入队");
    return { queued: false, message: "任务已完成，跳过入队" };
  }
  if (isTaskPaused(task)) {
    addTaskLog(taskId, "info", "任务已暂停，跳过入队");
    return { queued: false, message: "任务已暂停，跳过入队" };
  }

  const readiness = getTaskAgentExecutionReadiness(task);
  if (!readiness.ready) {
    const message = readiness.message || "Agent CLI 执行通道不可用，任务暂不入队";
    const fixActions = Array.isArray(readiness.fix_actions) ? readiness.fix_actions : [];
    const firstFixAction = fixActions[0] ? `；建议：${fixActions[0]}` : "";
    const lastBlockedAt = Date.parse(task.last_queue_blocked_at || 0);
    const sameReason = String(task.status_detail || "") === message.slice(0, 500);
    const recentlyRecorded = Number.isFinite(lastBlockedAt) && Date.now() - lastBlockedAt < AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS;
    if (!sameReason || !recentlyRecorded) {
      updateTask(taskId, {
        status: "pending",
        status_detail: message.slice(0, 500),
        last_queue_blocked_at: new Date().toISOString(),
        execution_readiness: readiness,
      });
      addTaskLog(taskId, "warning", `任务暂不入队：${message}${firstFixAction}`);
    }
    return { queued: false, blocked: true, duplicate_block_suppressed: sameReason && recentlyRecorded, reason: "agent_process", message, readiness };
  }

  const targetKey = getTaskTargetKey(task);

  if (!taskQueues.has(targetKey)) {
    taskQueues.set(targetKey, []);
  }

  const queue = taskQueues.get(targetKey)!;

  if (queue.includes(taskId) || runningTaskIds.has(taskId)) {
    addTaskLog(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
    return { queued: false, message: "任务已在队列中或正在执行" };
  }

  const newPriority = PRIORITY_WEIGHT[task.priority] || 2;
  let insertIndex = queue.length;

  for (let i = 0; i < queue.length; i++) {
    const queuedTask = tasks.find(t => t.id === queue[i]);
    if (!queuedTask) continue;
    const queuedPriority = PRIORITY_WEIGHT[queuedTask.priority] || 2;
    if (newPriority > queuedPriority) {
      insertIndex = i;
      break;
    }
  }

  queue.splice(insertIndex, 0, taskId);
  console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
  updateTask(taskId, { queued_at: new Date().toISOString() });
  addTaskLog(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);

  processTargetQueue(targetKey, ctx);
  return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1 };
}

export function createAndQueueTask(task: any, ctx: CollabCtx) {
  const newTask = createTask({ ...task, auto_execute: true });
  const queueResult = enqueueTask(newTask.id, ctx);
  return { task: newTask, queueResult };
}

function backfillTaskTraceIds() {
  const tasks = loadTasks();
  let changed = 0;
  for (const task of tasks) {
    if (task.trace_id) continue;
    task.trace_id = createTraceId("task");
    task.updated_at = task.updated_at || new Date().toISOString();
    appendTraceEvent(task.trace_id, { id: `task:${task.id}:trace-backfill`, type: "task.trace_backfilled", status: "info", task_id: task.id, group_id: task.group_id || "", agent: task.target_project || "", message: "历史任务已补齐统一 Trace ID", data: { original_created_at: task.created_at || "" } });
    changed++;
  }
  if (changed) saveTasks(tasks);
  return changed;
}

export function resumeTaskQueues(ctx: CollabCtx, options: any = {}) {
  const traceBackfilled = backfillTaskTraceIds();
  const tasks = loadTasks();
  const autoStartupRecovery = options.force === true || options.manual === true || /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_STARTUP_TASK_RECOVERY || ""));
  const resumable = tasks.filter((task: any) => {
    if (isRecoverableAutoTask(task)) return true;
    return autoStartupRecovery
      && task?.auto_execute !== false
      && task?.recovery_pending === true
      && ["pending", "needs_user", "in_progress"].includes(String(task.status || ""));
  });

  const results = [];
  if (!autoStartupRecovery) {
    for (const task of resumable) {
      const traceId = ensureTraceId(task.trace_id, "task");
      const recoveryReasoning = buildTaskPreflightReasoning(task, "服务启动发现未完成自动任务：已进入手动恢复模式，等待用户确认是否继续", true);
      const patch: any = {
        trace_id: traceId,
        is_paused: true,
        paused: true,
        recovery_pending: true,
        recovery: { ...(task.recovery || {}), pending_since: new Date().toISOString(), previous_status: task.status, mode: "manual_startup_recovery" },
        reasoning_loop: recoveryReasoning,
        status_detail: task.status === "in_progress"
          ? "服务启动时检测到未完成执行，已暂停等待用户手动恢复"
          : "服务启动时检测到待执行任务，已暂停等待用户手动恢复",
      };
      if (task.status === "in_progress") patch.status = "needs_user";
      updateTask(task.id, patch);
      addTaskLog(task.id, "warning", patch.status_detail);
      appendTaskTimelineEvent(task.id, { type: "startup_manual_recovery", title: "启动恢复已进入手动模式", detail: patch.status_detail, status: "warn", phase: "needs_user", data: { previous_status: task.status } });
      results.push({ task_id: task.id, queued: false, manual_recovery_required: true, message: patch.status_detail });
    }
    return {
      resumed: 0,
      total: resumable.length,
      trace_backfilled: traceBackfilled,
      manual_recovery: true,
      results,
      queue_status: getQueueStatus(),
    };
  }

  for (const task of resumable) {
    const traceId = ensureTraceId(task.trace_id, "task");
    const recoveryLease = acquireTaskLease(task.id, traceId, 45_000);
    if (!recoveryLease.acquired) {
      addTaskLog(task.id, "info", `启动恢复跳过：另一个存活实例仍持有任务租约（owner=${recoveryLease.lease?.owner_id || "unknown"}）`);
      results.push({ task_id: task.id, queued: false, active_elsewhere: true, message: "另一个实例仍在执行" });
      continue;
    }
    const recoveryReasoning = buildTaskPreflightReasoning(task, "服务启动恢复：重新核对原始目标、当前代码状态、剩余缺口与验收条件", true);
    if (task.status === "in_progress") {
      updateTask(task.id, {
        status: "pending",
        trace_id: traceId,
        is_paused: false,
        paused: false,
        recovery_pending: false,
        result: "服务启动时检测到未完成执行，已自动恢复排队",
        recovery: { recovered_at: new Date().toISOString(), lease_recovery_count: recoveryLease.lease.recovery_count, previous_status: "in_progress" },
        reasoning_loop: recoveryReasoning,
      });
      addTaskLog(task.id, "warning", "服务启动时检测到任务处于进行中，已恢复为待执行并重新入队");
    } else {
      updateTask(task.id, {
        status: task.status === "needs_user" ? "pending" : task.status,
        is_paused: false,
        paused: false,
        recovery_pending: false,
        reasoning_loop: recoveryReasoning,
        recovery: { ...(task.recovery || {}), revalidated_at: new Date().toISOString(), lease_recovery_count: recoveryLease.lease.recovery_count, previous_status: task.status, mode: "manual_resume" },
      });
      addTaskLog(task.id, "info", "服务启动恢复自动执行任务，重新加入队列");
    }
    appendTaskTimelineEvent(task.id, { type: "reasoning_recovery_check", title: "恢复前已重新核对任务", detail: `原始目标、当前状态与验收条件已复核；剩余 ${recoveryReasoning.assertions.filter(item => item.status !== "passed").length} 项待证明`, status: recoveryReasoning.recovery_checks[recoveryReasoning.recovery_checks.length - 1]?.acceptance_revalidated ? "ok" : "warn", phase: "planning", data: recoveryReasoning.recovery_checks[recoveryReasoning.recovery_checks.length - 1] || {} });
    const queued = enqueueTask(task.id, ctx);
    if (!queued.queued) releaseTaskLease(task.id, "recovery_not_queued");
    results.push({ task_id: task.id, ...queued });
  }

  return {
    resumed: results.filter(item => item.queued).length,
    total: resumable.length,
    trace_backfilled: traceBackfilled,
    results,
    queue_status: getQueueStatus(),
  };
}

function getQueueStatus(taskSnapshot?: any[]) {
  let totalQueued = 0;
  const targetStatus: any = {};

  for (const [targetKey, queue] of taskQueues.entries()) {
    totalQueued += queue.length;
    targetStatus[targetKey] = {
      queued: queue.length,
      running: runningTasks.has(targetKey)
    };
  }

  const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : loadTasks();
  return {
    total_queued: totalQueued,
    running_targets: runningTasks.size,
    target_status: targetStatus,
    pending_tasks: tasks.filter(t => t.status === "pending").length,
    in_progress_tasks: tasks.filter(t => t.status === "in_progress").length,
    failed_tasks: tasks.filter(t => t.status === "failed").length,
    running_task_ids: Array.from(runningTaskIds)
  };
}

function getTaskTargetKeyFromTask(task: any) {
  if (task?.assign_type === "group" && task?.group_id) return `group:${task.group_id}`;
  return `project:${task?.target_project || "unknown"}`;
}

function isTaskQueuedInMemory(taskId: string) {
  for (const queue of taskQueues.values()) {
    if (queue.includes(taskId)) return true;
  }
  return false;
}

function getTaskAgeMs(task: any, now = Date.now()) {
  const time = Date.parse(task?.updated_at || task?.started_at || task?.queued_at || task?.created_at || "");
  return Number.isFinite(time) ? Math.max(0, now - time) : 0;
}

function isWatchdogGapReworkCandidate(task: any, now = Date.now(), cooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, maxCount = TASK_WATCHDOG_GAP_REWORK_MAX) {
  if (!task?.auto_execute || task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  if (!hasDailyDevContinuationGaps(task)) return false;
  if (!canAutoContinueTaskGaps(task)) return false;
  if (Number(task.auto_gap_continue_count || 0) >= maxCount) return false;
  return getTaskAgeMs(task, now) >= cooldownMs;
}

function hasFreshSuccessfulAgentProbe(readiness: any) {
  return readiness?.probe?.success === true
    && Number(readiness?.probe?.age_ms || Infinity) < AGENT_PROBE_SUCCESS_FRESH_MS;
}

function getTaskWatchdogStatus(staleMs = TASK_WATCHDOG_STALE_MS, gapCooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = TASK_WATCHDOG_GAP_REWORK_MAX, taskSnapshot?: any[]) {
  const now = Date.now();
  const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : loadTasks();
  const stalePending: any[] = [];
  const stalledInProgress: any[] = [];
  const runningLong: any[] = [];
  const runtimeFailed: any[] = [];
  const gapRework: any[] = [];

  for (const task of tasks) {
    if (!task?.auto_execute || task.status === "done" || isTaskPaused(task)) continue;
    const ageMs = getTaskAgeMs(task, now);
    const base = {
      id: task.id,
      title: task.title,
      status: task.status,
      target_key: getTaskTargetKeyFromTask(task),
      age_ms: ageMs,
      updated_at: task.updated_at || null,
      started_at: task.started_at || null,
      queued_at: task.queued_at || null,
    };
    if (isRecoverableRuntimeFailure(task)) {
      runtimeFailed.push({
        ...base,
        reason: getTaskFailureText(task).slice(0, 500),
        retry_count: Number(task.retry_count || 0),
      });
    } else if (isWatchdogGapReworkCandidate(task, now, gapCooldownMs, gapMaxCount)) {
      const summary = task.delivery_summary || {};
      gapRework.push({
        ...base,
        reason: [
          Number(summary.coordination_plan_count || 0) <= 0 ? "缺少主 Agent 协调计划证据" : "",
          Number(summary.assignment_count || 0) <= 0 ? "缺少主 Agent 派发证据" : "",
          Number(summary.worker_notification_count || 0) <= 0 ? "缺少 Worker 通知" : "",
          ...(Array.isArray(summary.blockers) ? summary.blockers : []),
          ...(Array.isArray(summary.needs) ? summary.needs : []),
          ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item: any) => `${item?.agent || "Agent"} 缺少验证命令证据`) : []),
          ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
          ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
        ].filter(Boolean).join("；").slice(0, 500) || task.status_detail || "存在交付缺口",
        auto_gap_continue_count: Number(task.auto_gap_continue_count || 0),
      });
    } else if (task.status === "pending" && !isTaskQueuedInMemory(task.id) && ageMs >= staleMs) {
      stalePending.push(base);
    } else if (task.status === "in_progress" && !runningTaskIds.has(task.id) && ageMs >= staleMs) {
      stalledInProgress.push(base);
    } else if (task.status === "in_progress" && runningTaskIds.has(task.id) && ageMs >= staleMs) {
      runningLong.push(base);
    }
  }

  return {
    stale_ms: staleMs,
    checked_at: new Date().toISOString(),
    stale_pending: stalePending,
    stalled_in_progress: stalledInProgress,
    running_long: runningLong,
    runtime_failed: runtimeFailed,
    gap_rework: gapRework,
    queue_status: getQueueStatus(tasks),
  };
}

export function runTaskWatchdog(ctx: CollabCtx, options: any = {}) {
  const staleMs = Number(options.staleMs || options.stale_ms || TASK_WATCHDOG_STALE_MS);
  const gapCooldownMs = Number(options.gapCooldownMs || options.gap_cooldown_ms || TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS);
  const gapMaxCount = Math.max(1, Math.min(20, Number(options.gapMaxCount || options.gap_max_count || TASK_WATCHDOG_GAP_REWORK_MAX)));
  const taskSnapshot = loadTasks();
  const status = getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount, taskSnapshot);
  const recoverable = [...status.stale_pending, ...status.stalled_in_progress];
  const results: any[] = [];
  const gapResults: any[] = [];
  const executionReadiness = getAgentExecutionReadiness();
  const freshRecoveryProbeGroups = getAgentRecoveryProbeGroups(taskSnapshot)
    .filter((group: any) => getAgentProbeHealth(readAgentProbeStatus(group.probe_target)).successFresh);
  const dailyDevExecutionReadiness = executionReadiness;
  const canAutoRetryRuntimeFailures = executionReadiness.ready && freshRecoveryProbeGroups.length > 0;
  const canAutoContinueGaps = executionReadiness.ready === true;
  let blockedRecovery: any = null;
  let runtimeRetry: any = null;

  for (const item of recoverable) {
    const task = taskSnapshot.find(t => t.id === item.id);
    if (!task || task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id)) continue;
    const patch: any = {
      status: "pending",
      status_detail: task.status === "in_progress"
        ? "任务看门狗检测到执行中断，已恢复排队"
        : "任务看门狗检测到待处理任务未入队，已恢复排队",
      watchdog_recovered_at: new Date().toISOString(),
      watchdog_recoveries: Number(task.watchdog_recoveries || 0) + 1,
    };
    if (task.status === "in_progress") {
      patch.result = "任务看门狗检测到执行中断，已恢复为待执行并重新入队";
    }
    updateTask(task.id, patch);
    addTaskLog(task.id, "warning", patch.status_detail);
    results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
  }

  if (options.recover_agent_blocked !== false && options.recoverAgentBlocked !== false && freshRecoveryProbeGroups.length > 0) {
    blockedRecovery = aggregateBlockedRecovery(freshRecoveryProbeGroups.map((group: any) =>
      recoverAgentExecutionBlockedTasks(ctx, "目标项目 Agent CLI 探针通过后立即恢复任务", { probeTarget: group.probe_target, taskSnapshot })
    ));
  }

  if (options.continue_gaps !== false && options.continueGaps !== false && canAutoContinueGaps) {
    for (const item of status.gap_rework) {
      const task = taskSnapshot.find(t => t.id === item.id);
      if (!task || !isWatchdogGapReworkCandidate(task, Date.now(), gapCooldownMs, gapMaxCount)) continue;
      const message = buildTaskGapContinuationDraft(task);
      const result = continueTaskWithMessage(task.id, message, ctx, {
        source: "watchdog_gap_rework",
        auto_execute: true,
        status_detail: "任务看门狗已按交付缺口生成返工说明，等待主 Agent 继续执行",
      });
      addTaskLog(task.id, result.success ? "info" : "warning", result.success
        ? "任务看门狗已按交付缺口自动续跑"
        : `任务看门狗续跑缺口失败：${result.error || "未知错误"}`);
      gapResults.push({ task_id: task.id, ...result, task: undefined });
    }
  }

  if (options.retry_runtime_failures !== false && canAutoRetryRuntimeFailures && status.runtime_failed.length > 0) {
    runtimeRetry = aggregateRuntimeRecovery(freshRecoveryProbeGroups.map((group: any) =>
      retryRuntimeFailedTasks(ctx, {
        reason: "目标执行通道恢复后看门狗自动重试",
        limit: status.runtime_failed.length,
        probeTarget: group.probe_target,
      })
    ));
  }

  const stateChanged = results.length > 0 || gapResults.length > 0 || Number(blockedRecovery?.recovered || 0) > 0 || Number(runtimeRetry?.queued || 0) > 0;
  return {
    success: true,
    recovered: results.filter(item => item.queued).length + Number(blockedRecovery?.recovered || 0),
    total_recoverable: recoverable.length + Number(blockedRecovery?.total_blocked || 0),
    stale_recovered: results.filter(item => item.queued).length,
    stale_recoverable: recoverable.length,
    blocked_recovery: blockedRecovery,
    runtime_failed_total: status.runtime_failed.length,
    runtime_retried: runtimeRetry?.retried || 0,
    runtime_queued: runtimeRetry?.queued || 0,
    gap_rework_total: status.gap_rework.length,
    gap_continued: gapResults.filter(item => item.success).length,
    gap_queued: gapResults.filter(item => item.queued).length,
    gap_results: gapResults,
    gap_continue_skipped_reason: status.gap_rework.length > 0 && !canAutoContinueGaps ? dailyDevExecutionReadiness.message : "",
    runtime_retry: runtimeRetry,
    runtime_retry_skipped_reason: status.runtime_failed.length > 0 && !canAutoRetryRuntimeFailures
      ? (executionReadiness.ready ? "等待目标项目 Agent CLI 探针通过后再自动重试" : executionReadiness.message)
      : "",
    execution_readiness: executionReadiness,
    daily_dev_execution_readiness: dailyDevExecutionReadiness,
    results,
    status: stateChanged ? getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount) : status,
  };
}

function cleanupRuntimeDebt(options: any = {}) {
  const dryRun = options.dry_run === true || options.dryRun === true;
  const includePending = options.include_pending !== false && options.includePending !== false;
  const includeInProgress = options.include_in_progress !== false && options.includeInProgress !== false;
  const status = getTaskWatchdogStatus(Number(options.stale_ms || options.staleMs || TASK_WATCHDOG_STALE_MS));
  const candidates = [
    ...(includePending ? status.stale_pending.map((item: any) => ({ ...item, debt_type: "stale_pending" })) : []),
    ...(includeInProgress ? status.stalled_in_progress.map((item: any) => ({ ...item, debt_type: "stalled_in_progress" })) : []),
  ];
  const results: any[] = [];
  for (const item of candidates) {
    const task = loadTasks().find((entry: any) => entry.id === item.id);
    if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived") continue;
    const detail = item.debt_type === "stalled_in_progress"
      ? "运行治理中心清理：任务长时间处于执行中但没有活跃运行，已暂停等待用户处理"
      : "运行治理中心清理：任务长时间待执行但未入队，已暂停等待用户处理";
    if (!dryRun) {
      const removedFromQueue = removeTaskFromQueues(task.id);
      releaseTaskLease(task.id, "runtime_debt_cleanup");
      clearTaskCancellation(task.id);
      const updated = updateTask(task.id, {
        status: "needs_user",
        auto_execute: false,
        is_paused: true,
        paused: true,
        recovery_pending: true,
        status_detail: detail,
        runtime_debt_cleanup: {
          cleaned_at: new Date().toISOString(),
          debt_type: item.debt_type,
          previous_status: task.status,
          removed_from_queue: removedFromQueue,
        },
      });
      addTaskLog(task.id, "warning", detail);
      appendTaskTimelineEvent(task.id, { type: "runtime_debt_cleanup", title: "运行债务已暂停", detail, status: "warn", phase: "needs_user", data: { debt_type: item.debt_type, removed_from_queue: removedFromQueue } });
      results.push({ task_id: task.id, debt_type: item.debt_type, cleaned: true, removed_from_queue: removedFromQueue, status: updated?.status || "needs_user" });
    } else {
      results.push({ task_id: task.id, debt_type: item.debt_type, cleaned: false, dry_run: true, status: task.status, title: task.title });
    }
  }
  return {
    success: true,
    dry_run: dryRun,
    total: candidates.length,
    cleaned: results.filter(item => item.cleaned).length,
    results,
    status: dryRun ? status : getTaskWatchdogStatus(),
  };
}

function getAgentRecoveryWorkSummary() {
  const tasks = loadTasks();
  const blockedPending = tasks
    .filter(isAgentExecutionBlockedPendingTask)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      target_key: getTaskTargetKeyFromTask(task),
      blocked_at: task.last_queue_blocked_at || null,
      status_detail: String(task.status_detail || "").slice(0, 300),
    }));
  const runtimeFailed = tasks
    .filter(isRecoverableRuntimeFailure)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      target_key: getTaskTargetKeyFromTask(task),
      retry_count: Number(task.retry_count || 0),
      reason: getTaskFailureText(task).slice(0, 300),
    }));
  return {
    blocked_pending: blockedPending,
    runtime_failed: runtimeFailed,
    total: blockedPending.length + runtimeFailed.length,
  };
}

function getAgentRecoveryProbePayload(target: any = {}) {
  const normalized = normalizeAgentProbeTarget(target);
  const payload: any = {};
  if (normalized.groupId) payload.group_id = normalized.groupId;
  if (normalized.project) payload.target_member = normalized.project;
  return payload;
}

function taskMatchesAgentProbeTarget(task: any, target: any = null) {
  if (!target) return true;
  const required = getTaskRequiredProbeTarget(task);
  const hasRequired = !!(required.groupId || required.project || required.agentType);
  if (!hasRequired) return false;
  return doesProbeTargetMatchRequired(target, required);
}

function buildAgentRecoveryProbeGroups(tasks: any[]) {
  const groups = new Map<string, any>();
  for (const task of tasks) {
    const probeTarget = getTaskRequiredProbeTarget(task);
    const key = getAgentProbeTargetStatusKey(probeTarget) || "default";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        probe_target: key === "default" ? null : probeTarget,
        probe_payload: key === "default" ? {} : getAgentRecoveryProbePayload(probeTarget),
        task_ids: [],
        blocked_pending: 0,
        runtime_failed: 0,
      });
    }
    const group = groups.get(key);
    group.task_ids.push(task.id);
    if (isAgentExecutionBlockedPendingTask(task)) group.blocked_pending += 1;
    if (isRecoverableRuntimeFailure(task)) group.runtime_failed += 1;
  }
  return Array.from(groups.values());
}

function getAgentRecoveryProbeGroups(taskSnapshot?: any[]) {
  const tasks = (Array.isArray(taskSnapshot) ? taskSnapshot : loadTasks()).filter((task: any) => isAgentExecutionBlockedPendingTask(task) || isRecoverableRuntimeFailure(task));
  return buildAgentRecoveryProbeGroups(tasks);
}

function aggregateBlockedRecovery(results: any[]) {
  const flattened = results.flatMap((item: any) => Array.isArray(item?.results) ? item.results : []);
  return {
    total_blocked: results.reduce((sum: number, item: any) => sum + Number(item?.total_blocked || 0), 0),
    recovered: results.reduce((sum: number, item: any) => sum + Number(item?.recovered || 0), 0),
    results: flattened,
  };
}

function aggregateRuntimeRecovery(results: any[]) {
  const flattened = results.flatMap((item: any) => Array.isArray(item?.results) ? item.results : []);
  return {
    success: true,
    total_recoverable: results.reduce((sum: number, item: any) => sum + Number(item?.total_recoverable || 0), 0),
    retried: results.reduce((sum: number, item: any) => sum + Number(item?.retried || 0), 0),
    queued: results.reduce((sum: number, item: any) => sum + Number(item?.queued || 0), 0),
    auto_execute: results.some((item: any) => item?.auto_execute !== false),
    results: flattened,
    queue_status: getQueueStatus(),
  };
}

function recoverAgentExecutionBlockedTasks(ctx: CollabCtx, reason = "执行通道恢复后自动重新入队", options: any = {}) {
  const probeTarget = options.probeTarget || options.probe_target || null;
  const candidates = (Array.isArray(options.taskSnapshot) ? options.taskSnapshot : loadTasks())
    .filter(isAgentExecutionBlockedPendingTask)
    .filter((task: any) => taskMatchesAgentProbeTarget(task, probeTarget));
  const results: any[] = [];
  for (const task of candidates) {
    const readiness = getTaskAgentExecutionReadiness(task);
    if (!readiness.ready) {
      results.push({ task_id: task.id, queued: false, skipped: true, reason: "task_readiness_not_satisfied", message: readiness.message, readiness });
      continue;
    }
    updateTask(task.id, {
      status: "pending",
      status_detail: reason,
      execution_readiness: null,
      recovered_after_agent_probe_at: new Date().toISOString(),
    });
    addTaskLog(task.id, "info", reason);
    results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
  }
  return {
    total_blocked: candidates.length,
    recovered: results.filter(item => item.queued).length,
    results,
  };
}

export function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options: any = {}) {
  const work = getAgentRecoveryWorkSummary();
  if (work.total === 0) {
    return Promise.resolve({ success: true, skipped: true, reason: "没有等待执行通道恢复的自动任务", work });
  }
  if (agentRecoveryProbeInFlight) {
    return Promise.resolve({ success: true, skipped: true, reason: "执行通道探针正在运行", work });
  }

  agentRecoveryProbeInFlight = true;
  const timeoutMs = Number(options.timeout_ms || options.timeoutMs || AGENT_RECOVERY_PROBE_TIMEOUT_MS);
  const probeGroups = getAgentRecoveryProbeGroups();
  return Promise.all(probeGroups.map(async (group: any) => {
    const probe = await runAgentCliProbe({
      ...options,
      ...group.probe_payload,
      timeout_ms: timeoutMs,
      source: "agent-recovery-monitor",
    }, ctx);
    if (!probe?.success) {
      return {
        success: false,
        group,
        probe,
        message: probe?.message || "执行通道探针未通过",
      };
    }
    const blockedRecovery = recoverAgentExecutionBlockedTasks(ctx, "执行通道自动探针通过后恢复目标任务", { probeTarget: group.probe_target });
    const runtimeRecovery = retryRuntimeFailedTasks(ctx, {
      reason: "执行通道自动探针通过后重试",
      limit: group.runtime_failed || 100,
      probeTarget: group.probe_target,
    });
    return {
      success: true,
      group,
      probe,
      blocked_recovery: blockedRecovery,
      runtime_recovery: runtimeRecovery,
    };
  }))
    .then((target_results: any[]) => {
      const successes = target_results.filter((item: any) => item.success);
      const failures = target_results.filter((item: any) => !item.success);
      const blockedRecoveries = successes.map((item: any) => item.blocked_recovery);
      const runtimeRecoveries = successes.map((item: any) => item.runtime_recovery);
      const blockedRecovery = aggregateBlockedRecovery(blockedRecoveries);
      const runtimeRecovery = aggregateRuntimeRecovery(runtimeRecoveries);
      return {
        success: successes.length > 0,
        skipped: false,
        work,
        probe_groups: probeGroups,
        target_results,
        failures,
        message: successes.length > 0 ? "目标执行通道探针通过，已按项目 Agent 恢复任务" : (failures[0]?.message || "执行通道探针未通过"),
        probe: target_results[0]?.probe || null,
        blocked_recovery: blockedRecovery,
        runtime_recovery: runtimeRecovery,
      };
    })
    .finally(() => {
      agentRecoveryProbeInFlight = false;
    });
}

export function startAgentRecoveryMonitor(ctx: CollabCtx) {
  if (agentRecoveryMonitorTimer) clearInterval(agentRecoveryMonitorTimer);
  const tick = () => {
    runAgentRecoveryMonitorOnce(ctx)
      .then((result: any) => {
        if (result?.skipped) return;
        if (result?.success) {
          const recovered = Number(result.blocked_recovery?.recovered || 0);
          const retried = Number(result.runtime_recovery?.queued || 0);
          console.log(`[执行通道恢复监控] 探针通过，自动恢复 ${recovered} 个阻塞任务，重试 ${retried} 个执行失败任务`);
        } else {
          console.log(`[执行通道恢复监控] 探针未通过：${result?.message || "未知原因"}`);
        }
      })
      .catch((e: any) => console.error("[执行通道恢复监控]", e.message));
  };
  agentRecoveryMonitorTimer = setInterval(tick, AGENT_RECOVERY_PROBE_INTERVAL_MS);
  setTimeout(tick, 10 * 1000);
  console.log("[执行通道恢复监控] 已启动");
}

export function stopAgentRecoveryMonitor() {
  if (agentRecoveryMonitorTimer) clearInterval(agentRecoveryMonitorTimer);
  agentRecoveryMonitorTimer = null;
}

export function startTaskWatchdog(ctx: CollabCtx) {
  if (taskWatchdogTimer) clearInterval(taskWatchdogTimer);
  const autoRecover = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_TASK_WATCHDOG_RECOVERY || ""));
  const tick = () => {
    try {
      const expiredQa = markExpiredAgentQaItems();
      if (expiredQa.length) console.log(`[Agent 问答看门狗] ${expiredQa.length} 个问答已超时`);
      const status = getTaskWatchdogStatus();
      const recoverable = status.stale_pending.length + status.stalled_in_progress.length + status.runtime_failed.length + status.gap_rework.length;
      if (!autoRecover) {
        if (recoverable > 0) console.log(`[任务看门狗] 手动恢复模式：发现 ${recoverable} 个需要处理的任务，等待用户点击恢复`);
        return;
      }
      const result = runTaskWatchdog(ctx);
      if (result.total_recoverable > 0 || result.runtime_failed_total > 0 || result.gap_rework_total > 0) {
        console.log(`[任务看门狗] 自动恢复 ${result.recovered}/${result.total_recoverable} 个任务，运行时重试 ${result.runtime_queued || 0}，缺口续跑 ${result.gap_queued || 0}`);
      }
    } catch (e: any) {
      console.error("[任务看门狗]", e.message);
    }
  };
  taskWatchdogTimer = setInterval(tick, TASK_WATCHDOG_INTERVAL_MS);
  console.log(`[任务看门狗] 已启动（${autoRecover ? "自动恢复模式" : "手动恢复模式"}）`);
}

export function stopTaskWatchdog() {
  if (taskWatchdogTimer) clearInterval(taskWatchdogTimer);
  taskWatchdogTimer = null;
}

function getRuntimeMonitorControlStatus() {
  return {
    task_watchdog_active: !!taskWatchdogTimer,
    agent_recovery_monitor_active: !!agentRecoveryMonitorTimer,
    agent_recovery_probe_in_flight: agentRecoveryProbeInFlight,
  };
}

function applyRuntimeMonitorControl(action: string, ctx: CollabCtx) {
  const normalized = String(action || "status").trim().toLowerCase();
  if (normalized === "stop" || normalized === "pause") {
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    return { success: true, action: "stop", ...getRuntimeMonitorControlStatus() };
  }
  if (normalized === "start" || normalized === "resume") {
    startTaskWatchdog(ctx);
    startAgentRecoveryMonitor(ctx);
    return { success: true, action: "start", ...getRuntimeMonitorControlStatus() };
  }
  return { success: true, action: "status", ...getRuntimeMonitorControlStatus() };
}

function createDiagnosticCheck(id: string, label: string, status: "ok" | "warn" | "fail", message: string, detail: any = undefined) {
  return { id, label, status, message, ...(detail !== undefined ? { detail } : {}) };
}

const GROUP_MAIN_AGENT_ACTIONS = [
  {
    id: "read_group_context",
    label: "读取群聊上下文",
    category: "context",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["buildGroupContextPacket", "buildRecentGroupContext", "buildGroupMemoryContext"],
    evidence: ["recent_messages", "group_memory", "active_goal"],
    description: "读取当前群聊最近消息、压缩摘要、当前目标和协作记忆，作为主 Agent 判断的第一层上下文。",
  },
  {
    id: "read_project_code_snapshot",
    label: "读取项目代码快照",
    category: "context",
    risk: "read",
    permissionMode: "auto_read_in_project_analysis",
    userVisible: false,
    backend: ["buildGroupProjectAnalysisContext", "buildProjectCodeReadOnlySnapshot"],
    evidence: ["safe_file_snippets", "project_memory", "work_dir"],
    description: "只读读取群聊绑定项目的有限代码片段，过滤密钥、依赖和构建产物，用于项目分析和任务前理解。",
  },
  {
    id: "query_knowledge_base",
    label: "查询知识库",
    category: "context",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["queryKnowledgeBase"],
    evidence: ["rag_citations", "matched_documents"],
    description: "检索本地知识库，为回答、计划或子 Agent 工作单提供依据；知识库内容不等于执行授权。",
  },
  {
    id: "inspect_task_status",
    label: "查看任务状态",
    category: "observe",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: true,
    backend: ["loadTasks", "buildInlineTaskRuntime", "listExecutions", "listTaskAgentSessions"],
    evidence: ["task_status", "execution_state", "session_state"],
    description: "查看任务、执行器、会话、时间线和验收状态，用于判断继续、等待、返工还是回复用户。",
  },
  {
    id: "create_project_task",
    label: "创建项目任务",
    category: "act",
    risk: "write",
    permissionMode: "requires_current_execution_intent",
    userVisible: true,
    backend: ["createTask", "shouldCreatePersistentGroupTask", "getInitialWorkflowMeta"],
    evidence: ["task_id", "task_card", "workflow_meta"],
    description: "只有当前用户消息明确要求实现/修改/修复/执行时，才创建持久任务卡。",
  },
  {
    id: "dispatch_child_agent",
    label: "派发子 Agent",
    category: "act",
    risk: "write",
    permissionMode: "requires_current_execution_intent",
    userVisible: true,
    backend: ["runGroupOrchestrator", "prepareAgentRuntimeTools", "ctx.callAgent", "queueTaskExecution"],
    evidence: ["dispatch_policy", "assignments", "execution_id"],
    description: "把自包含工作单派发给绑定项目 Agent，要求子 Agent 读取真实项目、执行、验证并提交结构化回执。",
  },
  {
    id: "ask_user_clarification",
    label: "追问用户",
    category: "decide",
    risk: "safe",
    permissionMode: "auto_when_missing_required_info",
    userVisible: true,
    backend: ["dispatchPolicy.action=ask_user", "questionForUser", "appendGroupMessage"],
    evidence: ["missing_info", "clarification_question"],
    description: "当目标、项目、授权或高风险范围不清时，主 Agent 先问一个最关键问题，不派发子 Agent。",
  },
  {
    id: "govern_task_lifecycle",
    label: "停止/取消/归档任务",
    category: "govern",
    risk: "high",
    permissionMode: "requires_explicit_user_command",
    userVisible: true,
    backend: ["requestTaskCancellation", "archiveTask", "restoreArchivedTask", "purgeArchivedTask", "releaseTaskLease"],
    evidence: ["cancellation_record", "archive_record", "cleanup_result"],
    description: "停止、取消、归档和永久清除任务属于治理动作，必须来自用户明确指令或按钮操作。",
  },
  {
    id: "read_child_agent_receipts",
    label: "读取子 Agent 回执",
    category: "observe",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["extractAgentReceipt", "buildUserAgentQuestionRows", "runLlmCoordinatorReview"],
    evidence: ["CCM_AGENT_RECEIPT", "receipt_statuses", "verification"],
    description: "读取子 Agent 的结构化回执、文件变更、验证结果和阻塞原因，供主 Agent 验收。",
  },
  {
    id: "replan_from_observation",
    label: "重新规划",
    category: "decide",
    risk: "safe",
    permissionMode: "auto_after_failed_assertion",
    userVisible: true,
    backend: ["recordReasoningDeviation", "recordReasoningRecoveryCheck", "updateReasoningPlan", "createReworkTask"],
    evidence: ["failed_assertions", "gap_fingerprint", "rework_plan"],
    description: "当回执缺证据、验证失败、目标偏离或依赖事实变化时，主 Agent 重新规划并决定返工、等待或停止。",
  },
  {
    id: "generate_final_reply",
    label: "生成最终回复",
    category: "reply",
    risk: "safe",
    permissionMode: "auto_after_verification",
    userVisible: true,
    backend: ["buildUserDeliveryReport", "buildTaskGroupReportMessage", "appendGroupMessage"],
    evidence: ["acceptance_gate", "files_changed", "verification_executed", "risks"],
    description: "只有完成验收或明确说明未完成/风险后，主 Agent 才生成给用户看的最终回复。",
  },
] as const;

function getGroupMainAgentActionRegistry() {
  return GROUP_MAIN_AGENT_ACTIONS.map(action => ({ ...action, backend: [...action.backend], evidence: [...action.evidence] }));
}

function buildGroupMainAgentActionContext() {
  return [
    "【CCM 群聊主 Agent 可用动作注册表】",
    "原则：先理解和观察，再决定是否行动；只读动作可自动执行，写入/治理动作必须有当前用户消息授权或显式按钮操作。",
    ...GROUP_MAIN_AGENT_ACTIONS.map(action =>
      `- ${action.id}｜${action.label}｜类别=${action.category}｜风险=${action.risk}｜权限=${action.permissionMode}｜证据=${action.evidence.join("、")}`
    ),
  ].join("\n");
}

function runGroupMainAgentActionRegistrySelfTest() {
  const required = [
    "read_group_context",
    "read_project_code_snapshot",
    "query_knowledge_base",
    "inspect_task_status",
    "create_project_task",
    "dispatch_child_agent",
    "ask_user_clarification",
    "govern_task_lifecycle",
    "read_child_agent_receipts",
    "replan_from_observation",
    "generate_final_reply",
  ];
  const registry = getGroupMainAgentActionRegistry();
  const ids = new Set<string>(registry.map(action => action.id));
  const missing = required.filter(id => !ids.has(id));
  const duplicateIds = registry
    .map(action => action.id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);
  const highRiskRequiresExplicit = registry
    .filter(action => action.risk === "high")
    .every(action => String(action.permissionMode).includes("explicit"));
  const writeRequiresExecutionIntent = registry
    .filter(action => action.risk === "write")
    .every(action => /execution_intent|explicit/i.test(String(action.permissionMode)));
  const readActionsHaveEvidence = registry
    .filter(action => action.risk === "read")
    .every(action => action.evidence.length > 0 && action.backend.length > 0);
  const finalReplyRequiresVerification = registry
    .find(action => action.id === "generate_final_reply")?.evidence.includes("acceptance_gate") === true;
  const context = buildGroupMainAgentActionContext();
  const checks = {
    coversRequiredActions: missing.length === 0,
    noDuplicateIds: duplicateIds.length === 0,
    highRiskRequiresExplicit,
    writeRequiresExecutionIntent,
    readActionsHaveEvidence,
    finalReplyRequiresVerification,
    contextMentionsAllActions: required.every(id => context.includes(id)),
  };
  return { pass: Object.values(checks).every(Boolean), checks, missing, duplicateIds, total: registry.length, actions: registry, context };
}

function getGroupMainAgentAction(id: string) {
  return getGroupMainAgentActionRegistry().find(action => action.id === id) || null;
}

function normalizeMainAgentActionIds(ids: any[]) {
  const known = new Set<string>(getGroupMainAgentActionRegistry().map(action => action.id));
  const result: string[] = [];
  for (const raw of ids || []) {
    const id = String(raw || "").trim();
    if (!id || !known.has(id) || result.includes(id)) continue;
    result.push(id);
  }
  return result;
}

function buildMainAgentPermissionJudgement(actionIds: string[], input: { taskIntent?: any; messageMode?: string; explicitGovernance?: boolean } = {}) {
  return actionIds.map(id => {
    const action = getGroupMainAgentAction(id);
    const risk = String(action?.risk || "safe");
    const executable = input.taskIntent?.executable === true;
    const explicitGovernance = input.explicitGovernance === true;
    const allowed = risk === "read" || risk === "safe"
      ? true
      : risk === "write"
        ? executable
        : explicitGovernance;
    return {
      action_id: id,
      risk,
      allowed,
      permission_mode: action?.permissionMode || "",
      reason: allowed
        ? (risk === "write" ? "当前用户消息包含明确执行意图" : risk === "high" ? "用户显式触发治理动作" : "只读或安全决策动作")
        : (risk === "write" ? "当前消息不是明确执行请求" : "高风险治理动作需要用户显式指令或按钮操作"),
    };
  });
}

const GROUP_MAIN_AGENT_LOOP_STAGES = [
  { id: "observe", label: "Observe", title: "观察上下文", actions: ["read_group_context", "read_project_code_snapshot", "query_knowledge_base", "inspect_task_status"], purpose: "先看群聊、项目、知识库和任务状态，避免盲目派发。" },
  { id: "think", label: "Think", title: "判断意图", actions: [], purpose: "判断普通问答、项目分析、开发任务、治理动作或续跑。" },
  { id: "plan", label: "Plan", title: "形成计划", actions: ["create_project_task", "ask_user_clarification"], purpose: "形成用户可读计划、Todo、风险和工作单边界。" },
  { id: "act", label: "Act", title: "执行动作", actions: ["dispatch_child_agent", "govern_task_lifecycle"], purpose: "只在授权后创建任务、派发子 Agent 或执行治理动作。" },
  { id: "monitor", label: "Monitor", title: "跟踪执行", actions: ["read_child_agent_receipts", "inspect_task_status"], purpose: "持续读取子 Agent 回执、任务状态、文件变更和验证结果。" },
  { id: "reflect", label: "Reflect", title: "复盘返工", actions: ["replan_from_observation"], purpose: "发现缺口时重规划、返工、追问或切换执行器。" },
  { id: "respond", label: "Respond", title: "回复用户", actions: ["generate_final_reply"], purpose: "只在证据足够或需要用户决定时，给出清晰回复。" },
];

function loopStageStatus(stage: any, input: { mode: string; actionIds: string[]; blockedActions: string[]; observations: any; verified?: boolean }) {
  const actionIds = input.actionIds || [];
  const blockedActions = input.blockedActions || [];
  const stageActions = stage.actions || [];
  const hasAction = stageActions.some((id: string) => actionIds.includes(id));
  const blocked = stageActions.some((id: string) => blockedActions.includes(id));
  if (blocked) return "needs_confirmation";
  if (stage.id === "think") return "completed";
  if (stage.id === "reflect") {
    if (actionIds.includes("replan_from_observation") || input.observations?.needs_replan || input.observations?.acceptance_gate_passed === false) return "in_progress";
    if (input.verified) return "completed";
    return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
  }
  if (stage.id === "respond") return actionIds.includes("generate_final_reply") ? (input.verified ? "completed" : "in_progress") : "pending";
  if (stage.id === "monitor") {
    if (actionIds.includes("read_child_agent_receipts") || input.observations?.receipt_count || input.observations?.queued) return input.verified ? "completed" : "in_progress";
    return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
  }
  if (stage.id === "act") {
    if (hasAction) return input.verified ? "completed" : "in_progress";
    return ["conversation", "project_analysis"].includes(input.mode) ? "skipped" : "pending";
  }
  if (stage.id === "plan") {
    if (hasAction || ["project_task", "delegation", "followup", "governance"].includes(input.mode)) return "completed";
    return input.mode === "conversation" ? "skipped" : "completed";
  }
  if (stage.id === "observe") return hasAction ? "completed" : "pending";
  return hasAction ? "completed" : "pending";
}

function buildGroupMainAgentInternalLoop(input: {
  mode: string;
  actionIds: string[];
  permissions: any[];
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  observations?: any;
  verified?: boolean;
}) {
  const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const blockedActions = permissions.filter((item: any) => item.allowed === false).map((item: any) => item.action_id);
  const observations = input.observations || {};
  const toolChoiceReason = (stage: any, stageActions: string[]) => {
    if (stage.id === "observe") {
      if (input.mode === "conversation") return "普通对话只读群聊上下文，不读取项目代码。";
      if (input.mode === "project_analysis") return "项目分析只读项目快照和知识库，不创建任务。";
      return "开发/续跑任务需要读取任务状态、项目上下文和历史证据。";
    }
    if (stage.id === "think") return input.taskIntent?.reason || input.dispatchPolicy?.reason || "根据消息模式、意图分类和风险信号判断下一步。";
    if (stage.id === "plan") return observations.requires_confirmation ? "风险或范围需要用户确认，先形成计划卡。" : "形成 Todo、工作单边界和验收标准。";
    if (stage.id === "act") return blockedActions.some((id: string) => stageActions.includes(id)) ? "存在未授权动作，暂停执行。" : "当前消息授权允许执行对应动作。";
    if (stage.id === "monitor") return "读取子 Agent 回执、执行状态、Diff 和验证证据。";
    if (stage.id === "reflect") return observations.acceptance_gate_passed === false || observations.needs_replan ? "验收或执行存在缺口，需要返工/重规划。" : "暂无返工证据。";
    return input.verified ? "证据边界通过，生成回复。" : "仍需说明等待确认、继续执行或缺口。";
  };
  const stages = GROUP_MAIN_AGENT_LOOP_STAGES.map(stage => {
    const stageActions = (stage.actions || []).filter((id: string) => actionIds.includes(id));
    const status = loopStageStatus(stage, { mode: input.mode, actionIds, blockedActions, observations, verified: input.verified });
    return {
      id: stage.id,
      label: stage.label,
      title: stage.title,
      status,
      purpose: stage.purpose,
      actions: stageActions,
      tool_choice: toolChoiceReason(stage, stageActions),
      evidence: [
        stage.id === "think" && input.taskIntent?.kind ? `intent=${input.taskIntent.kind}` : "",
        stage.id === "plan" && Array.isArray(input.assignments) ? `assignments=${input.assignments.length}` : "",
        stage.id === "act" && input.dispatchPolicy?.action ? `dispatch=${input.dispatchPolicy.action}` : "",
        stage.id === "monitor" && observations.receipt_count !== undefined ? `receipts=${observations.receipt_count}` : "",
        stage.id === "reflect" && observations.acceptance_gate_passed !== undefined ? `acceptance=${observations.acceptance_gate_passed}` : "",
      ].filter(Boolean),
    };
  });
  const current = stages.find((stage: any) => ["needs_confirmation", "failed", "in_progress", "reviewing", "reworking"].includes(stage.status))
    || [...stages].reverse().find((stage: any) => stage.status === "completed")
    || stages[0];
  const completedCount = stages.filter((stage: any) => ["completed", "skipped"].includes(stage.status)).length;
  return {
    version: 1,
    source: "group-main-agent-loop-5.0",
    pattern: "observe-think-plan-act-monitor-reflect-respond",
    current_stage: current?.id || "observe",
    current_label: current?.title || "观察上下文",
    progress: { completed: completedCount, total: stages.length },
    stages,
    next_action: current?.status === "needs_confirmation"
      ? "等待用户确认后继续"
      : current?.id === "respond"
        ? "生成或更新用户回复"
        : current?.purpose || "",
  };
}

function mainAgentPlanStepStatus(actionIds: string[], blockedActions: string[], actionId: string, fallback: string = "pending") {
  if (blockedActions.includes(actionId)) return "needs_confirmation";
  return actionIds.includes(actionId) ? "completed" : fallback;
}

function buildMainAgentUserPlanSteps(input: {
  mode: string;
  actionIds: string[];
  permissions: any[];
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  taskId?: string;
}) {
  const mode = String(input.mode || "conversation");
  const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
  const blockedActions = (input.permissions || []).filter((item: any) => item.allowed === false).map((item: any) => item.action_id);
  const hasDispatch = actionIds.includes("dispatch_child_agent");
  const assignmentCount = Array.isArray(input.assignments) ? input.assignments.length : 0;
  const steps: any[] = [];
  const add = (id: string, content: string, status: string, activeForm = content, detail = "") => {
    steps.push({ id, content, activeForm, status, detail });
  };

  add(
    "understand_intent",
    "确认用户这句话是普通询问、项目分析还是开发任务",
    "completed",
    "正在判断用户意图",
    input.taskIntent?.reason || input.dispatchPolicy?.reason || ""
  );
  add(
    "read_group_context",
    "读取当前群聊上下文，避免脱离前文判断",
    mainAgentPlanStepStatus(actionIds, blockedActions, "read_group_context"),
    "正在读取群聊上下文"
  );

  if (mode === "project_analysis") {
    add(
      "read_project_code_snapshot",
      "只读读取绑定项目的结构和相关代码快照",
      mainAgentPlanStepStatus(actionIds, blockedActions, "read_project_code_snapshot"),
      "正在只读查看项目结构和代码"
    );
    add(
      "query_knowledge_base",
      "查询知识库，补充项目背景和历史结论",
      mainAgentPlanStepStatus(actionIds, blockedActions, "query_knowledge_base", "skipped"),
      "正在查询知识库"
    );
    add(
      "decide_dispatch",
      "判断是否需要派发子 Agent：本轮是只读分析，不创建任务",
      "skipped",
      "正在判断是否派发子 Agent"
    );
    add(
      "generate_final_reply",
      "把分析结果整理成用户能看懂的回复",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
      "正在生成回复"
    );
    return steps;
  }

  if (mode === "project_task" || mode === "delegation") {
    add(
      "read_project_code_snapshot",
      "确认涉及的项目、范围和可能影响的代码位置",
      actionIds.includes("read_project_code_snapshot") ? mainAgentPlanStepStatus(actionIds, blockedActions, "read_project_code_snapshot") : "pending",
      "正在确认项目和代码范围"
    );
    add(
      "create_project_task",
      "把明确需求创建成可跟踪的项目任务卡",
      mainAgentPlanStepStatus(actionIds, blockedActions, "create_project_task", input.taskId ? "completed" : "pending"),
      "正在创建项目任务卡",
      input.taskId ? `任务 ${input.taskId}` : ""
    );
    add(
      "dispatch_child_agent",
      assignmentCount > 0 ? `派发给 ${assignmentCount} 个子 Agent 执行` : "判断是否需要派发子 Agent，并生成工作单",
      blockedActions.includes("dispatch_child_agent") ? "needs_confirmation" : hasDispatch ? "in_progress" : "pending",
      "正在派发子 Agent"
    );
    add(
      "read_child_agent_receipts",
      "等待子 Agent 回执，再由主 Agent 验收",
      hasDispatch ? "pending" : "skipped",
      "正在等待子 Agent 回执"
    );
    add(
      "verify_and_reply",
      "汇总修改、验证结果和风险，生成最终回复",
      "pending",
      "正在验收并生成最终回复",
      "参考 Claude Code TodoWrite 的验证推动：复杂任务必须保留验收步骤。"
    );
    return steps;
  }

  if (mode === "followup") {
    add(
      "inspect_task_status",
      "查看原任务当前状态和子 Agent 进度",
      mainAgentPlanStepStatus(actionIds, blockedActions, "inspect_task_status"),
      "正在查看任务状态"
    );
    add(
      "replan_from_observation",
      "把追加要求合并进原计划，必要时重新安排",
      mainAgentPlanStepStatus(actionIds, blockedActions, "replan_from_observation"),
      "正在重新规划"
    );
    add(
      "generate_final_reply",
      "告诉用户追加要求如何并入当前任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
      "正在生成回复"
    );
    return steps;
  }

  if (mode === "governance") {
    add(
      "inspect_task_status",
      "读取任务状态，确认要操作的是哪一个任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "inspect_task_status"),
      "正在查看任务状态"
    );
    add(
      "govern_task_lifecycle",
      "执行停止、取消、归档或删除前等待用户明确确认",
      blockedActions.includes("govern_task_lifecycle") ? "needs_confirmation" : mainAgentPlanStepStatus(actionIds, blockedActions, "govern_task_lifecycle"),
      "正在等待治理确认"
    );
    add(
      "generate_final_reply",
      "说明本轮治理动作是否已执行",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply", blockedActions.length ? "pending" : "completed"),
      "正在生成回复"
    );
    return steps;
  }

  add(
    "decide_dispatch",
    "判断是否需要派发子 Agent：本轮不需要创建任务",
    "skipped",
    "正在判断是否派发子 Agent"
  );
  if (actionIds.includes("ask_user_clarification")) {
    add(
      "ask_user_clarification",
      "信息不足时先追问用户，不擅自开任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "ask_user_clarification"),
      "正在追问用户"
    );
  }
  add(
    "generate_final_reply",
    "直接回答用户的问题",
    mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
    "正在生成回复"
  );
  return steps;
}

function normalizeLiveTodoStatus(status: string) {
  const value = String(status || "pending");
  if (["done", "completed", "success", "succeeded"].includes(value)) return "completed";
  if (["running", "active", "in_progress", "executing"].includes(value)) return "in_progress";
  if (["review", "reviewing", "testing"].includes(value)) return "reviewing";
  if (["rework", "reworking", "retrying"].includes(value)) return "reworking";
  if (["blocked", "warning", "needs_info", "partial"].includes(value)) return "needs_confirmation";
  if (["failed", "error"].includes(value)) return "failed";
  if (["cancelled", "canceled"].includes(value)) return "cancelled";
  if (["skipped", "skip"].includes(value)) return "skipped";
  return value || "pending";
}

function buildTodoStepEvidence(input: { task: any; summary: any; workers: any[]; executions: any[]; stepId: string; phase: string }) {
  const { task, summary, workers, executions, stepId, phase } = input;
  const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
  const receipts = [
    ...(Array.isArray(summary?.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const files = uniqueStrings([
    ...(Array.isArray(summary?.files_changed) ? summary.files_changed : []),
    ...(Array.isArray(summary?.actual_file_changes) ? summary.actual_file_changes.map((item: any) => item?.path || item?.file || item) : []),
  ].filter(Boolean)).slice(0, 8);
  const verification = uniqueStrings(Array.isArray(summary?.verification_executed) ? summary.verification_executed : []).slice(0, 8);
  const blockers = uniqueStrings([
    ...(Array.isArray(summary?.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary?.needs) ? summary.needs : []),
    ...(Array.isArray(summary?.verification_failed) ? summary.verification_failed.map((item: any) => `验证失败：${String(item)}`) : []),
  ].filter(Boolean)).slice(0, 8);
  const evidence: any[] = [];
  const add = (type: string, title: string, detail = "", data: any = null) => {
    evidence.push({ type, title, detail: compactMemoryText(detail || "", 220), data });
  };
  if (stepId === "understand_intent") add("task", "需求目标", task?.business_goal || task?.title || "", { task_id: task?.id || "" });
  if (stepId === "read_group_context") add("trace", "Trace", task?.trace_id ? `Trace ${task.trace_id}` : "当前任务没有 Trace ID", { trace_id: task?.trace_id || "" });
  if (stepId === "create_project_task") add("task", "任务卡", `任务 ${task?.id || ""} · ${task?.status || ""}`, { task_id: task?.id || "", status: task?.status || "" });
  if (stepId === "dispatch_child_agent") {
    const dispatchEvents = timeline.filter((item: any) => ["dispatch", "coordinator_plan", "sandbox_rehearsal", "conflict_plan"].includes(String(item?.type || ""))).slice(-4);
    for (const item of dispatchEvents) add("trace", item.title || "派发证据", item.detail || item.phase || "", { id: item.id || "", type: item.type || "" });
    if (!dispatchEvents.length) add("trace", "派发状态", phase === "planning" ? "主 Agent 仍在形成派发计划" : "已进入任务执行链路");
  }
  if (stepId === "child_agent_execution") {
    for (const worker of workers.slice(0, 8)) add("agent", worker.agent || "子 Agent", `${worker.status || "pending"} · ${worker.summary || worker.task || ""}`, { agent: worker.agent, status: worker.status });
    for (const execution of executions.slice(-4)) add("execution", execution.project || "执行器", `${execution.state || ""} · ${execution.id || ""}`, { execution_id: execution.id || "", project: execution.project || "" });
    if (!workers.length && !executions.length) add("agent", "子 Agent", "等待执行通道开始处理");
  }
  if (stepId === "read_child_agent_receipts") {
    for (const receipt of receipts.slice(0, 8)) add("receipt", receipt.agent || receipt.project || "子 Agent 回执", `${receipt.status || receipt.receipt_status || ""} · ${receipt.summary || ""}`, receipt);
    if (!receipts.length) add("receipt", "回执", "尚未收到可验收回执");
  }
  if (stepId === "coordinator_review") {
    if (verification.length) add("verification", "已执行验证", verification.join("；"), { verification });
    if (summary?.acceptance_gate) add("acceptance", "验收门禁", summary.acceptance_gate_passed === true ? "已通过" : "未通过或等待中", summary.acceptance_gate);
    if (blockers.length) add("blocker", "阻塞/失败原因", blockers.join("；"), { blockers });
    if (!verification.length && !summary?.acceptance_gate && !blockers.length) add("acceptance", "验收", "等待主 Agent 汇总回执并验收");
  }
  if (stepId === "final_delivery_report") {
    if (summary?.headline || task?.status_detail) add("report", "交付摘要", summary.headline || task.status_detail || "");
    if (files.length) add("files", "修改文件", files.join("；"), { files });
    if (verification.length) add("verification", "验证结果", verification.join("；"), { verification });
    if (blockers.length) add("blocker", "遗留风险", blockers.join("；"), { blockers });
  }
  return evidence.slice(0, 10);
}

function buildTodoStepActions(input: { task: any; stepId: string; status: string; phase: string; summary: any }) {
  const { task, stepId, status, phase, summary } = input;
  const taskId = task?.id || "";
  if (!taskId) return [];
  const actions: any[] = [];
  const add = (id: string, label: string, kind: string, tone = "outline") => actions.push({ id, label, kind, tone, task_id: taskId, step_id: stepId });
  if (["failed", "needs_confirmation"].includes(status)) {
    if (stepId === "dispatch_child_agent") add("retry", "重新派发", "retry", "primary");
    if (["child_agent_execution", "read_child_agent_receipts", "coordinator_review"].includes(stepId)) add("gap_continue", "按缺口返工", "gap_continue", "warning");
    if (["child_agent_execution", "coordinator_review"].includes(stepId)) add("switch_executor", "切换执行器", "switch_executor", "outline");
    add("cancel", "取消任务", "cancel", "danger");
  }
  if (status === "reworking") add("view_pipeline", "查看协作看板", "view_pipeline", "outline");
  if (status === "reviewing" && stepId === "coordinator_review") {
    add("gap_continue", "按缺口返工", "gap_continue", "warning");
    if (summary?.acceptance_gate_passed === true) add("confirm_done", "标记已处理", "confirm_done", "success");
  }
  if (status === "completed" && stepId === "final_delivery_report") add("view_pipeline", "查看交付证据", "view_pipeline", "outline");
  if (["in_progress", "reviewing", "reworking"].includes(status) && !["completed", "cancelled"].includes(phase)) add("cancel", "取消任务", "cancel", "danger");
  return actions.slice(0, 4);
}

function buildLiveMainAgentTodoPlan(task: any, phase: string, workers: any[], executions: any[], summary: any = {}) {
  const assignmentCount = Number(summary.assignment_count || (Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.length : 0) || 0);
  const receiptCount = Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0) || 0);
  const workerNotificationCount = Number(summary.worker_notification_count || (Array.isArray(summary.worker_notifications) ? summary.worker_notifications.length : 0) || 0);
  const hasDispatchEvidence = assignmentCount > 0 || workerNotificationCount > 0 || workers.length > 0 || executions.length > 0;
  const terminal = ["completed", "cancelled", "reverted"].includes(phase);
  const failed = task?.status === "failed" || phase === "blocked" || workers.some((item: any) => ["failed", "blocked", "partial", "needs_info"].includes(String(item.status || "")));
  const reworking = phase === "reworking" || executions.some((item: any) => /rework|retry|recover/i.test(String(item.state || item.phase || "")));
  const allWorkersDone = workers.length > 0 && workers.every((item: any) => ["done", "completed", "succeeded"].includes(String(item.status || "")));
  const activeWorkers = uniqueStrings(workers
    .filter((item: any) => ["running", "in_progress", "pending", "partial", "blocked", "reviewing"].includes(String(item.status || "")))
    .map((item: any) => item.agent)
    .filter(Boolean));
  const verificationCount = Number((Array.isArray(summary.verification_executed) ? summary.verification_executed.length : 0) || 0);
  const acceptancePassed = summary.acceptance_gate_passed === true || task?.status === "done";
  const steps: any[] = [];
  const add = (id: string, content: string, status: string, activeForm: string, detail = "") => {
    const normalizedStatus = normalizeLiveTodoStatus(status);
    steps.push({
      id,
      content,
      status: normalizedStatus,
      activeForm,
      detail,
      evidence: buildTodoStepEvidence({ task, summary, workers, executions, stepId: id, phase }),
      actions: buildTodoStepActions({ task, stepId: id, status: normalizedStatus, phase, summary }),
    });
  };

  add("understand_intent", "确认需求目标和涉及范围", "completed", "正在确认需求目标", task?.business_goal || task?.title || "");
  add("read_group_context", "读取群聊上下文和任务历史", "completed", "正在读取群聊上下文");
  add("create_project_task", "创建可跟踪的项目任务卡", task?.id ? "completed" : "pending", "正在创建项目任务卡", task?.id ? `任务 ${task.id}` : "");

  let dispatchStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) dispatchStatus = "cancelled";
  else if (hasDispatchEvidence || ["dispatching", "executing", "reviewing", "reworking", "completed"].includes(phase)) dispatchStatus = "completed";
  else if (["queued", "planning"].includes(phase)) dispatchStatus = "in_progress";
  add(
    "dispatch_child_agent",
    hasDispatchEvidence ? `派发给 ${Math.max(assignmentCount, workers.length, executions.length, 1)} 个子 Agent 或执行通道` : "判断是否需要派发子 Agent",
    dispatchStatus,
    "正在派发子 Agent"
  );

  let workerStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) workerStatus = "cancelled";
  else if (failed) workerStatus = "failed";
  else if (reworking) workerStatus = "reworking";
  else if (allWorkersDone || (receiptCount > 0 && ["reviewing", "completed"].includes(phase))) workerStatus = "completed";
  else if (activeWorkers.length || phase === "executing") workerStatus = "in_progress";
  add(
    "child_agent_execution",
    activeWorkers.length ? `${activeWorkers.join("、")} 正在执行` : workers.length ? "子 Agent 执行并提交结果" : "等待子 Agent 开始执行",
    workerStatus,
    "子 Agent 正在执行",
    workers.map((item: any) => `${item.agent}:${item.status || "pending"}`).join("；")
  );

  let receiptStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) receiptStatus = "cancelled";
  else if (failed) receiptStatus = "needs_confirmation";
  else if (receiptCount > 0 && (allWorkersDone || ["reviewing", "completed"].includes(phase))) receiptStatus = "completed";
  else if (hasDispatchEvidence) receiptStatus = "in_progress";
  add(
    "read_child_agent_receipts",
    receiptCount > 0 ? `读取 ${receiptCount} 条子 Agent 回执` : "等待子 Agent 回执",
    receiptStatus,
    "正在等待和读取回执"
  );

  let reviewStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) reviewStatus = "cancelled";
  else if (failed) reviewStatus = reworking ? "reworking" : "needs_confirmation";
  else if (phase === "reviewing") reviewStatus = "reviewing";
  else if (phase === "completed") reviewStatus = "completed";
  else if (receiptCount > 0 || allWorkersDone) reviewStatus = "reviewing";
  add(
    "coordinator_review",
    verificationCount > 0 ? `主 Agent 验收并检查 ${verificationCount} 项验证` : "主 Agent 验收子 Agent 结果",
    reviewStatus,
    "主 Agent 正在验收",
    acceptancePassed ? "验收门禁已通过" : ""
  );

  let finalStatus = "pending";
  if (phase === "completed") finalStatus = "completed";
  else if (["cancelled", "reverted"].includes(phase)) finalStatus = "cancelled";
  else if (task?.status === "failed") finalStatus = "failed";
  add(
    "final_delivery_report",
    phase === "completed" ? "生成最终交付报告，说明改动、验证和风险" : "等待验收完成后生成交付报告",
    finalStatus,
    "正在生成交付报告",
    summary.headline || task?.status_detail || ""
  );

  return {
    title: "我正在这样处理",
    source: "ccm-live-task-todo",
    phase,
    task_id: task?.id || "",
    updated_at: task?.updated_at || new Date().toISOString(),
    steps,
  };
}

function buildLiveMainAgentDecisionForTask(task: any, phase: string, liveTodoPlan: any, summary: any = {}) {
  const steps = Array.isArray(liveTodoPlan?.steps) ? liveTodoPlan.steps : [];
  const selectedActions = normalizeMainAgentActionIds([
    "read_group_context",
    "inspect_task_status",
    "dispatch_child_agent",
    "read_child_agent_receipts",
    ...(phase === "reworking" ? ["replan_from_observation"] : []),
    "generate_final_reply",
  ]);
  const blockedActions = steps.some((step: any) => step.status === "needs_confirmation" || step.status === "failed") ? ["generate_final_reply"] : [];
  const passed = phase === "completed" || summary.acceptance_gate_passed === true;
  const permissions = selectedActions.map((id: string) => ({ action_id: id, risk: ["dispatch_child_agent"].includes(id) ? "write" : "safe", allowed: !blockedActions.includes(id), reason: blockedActions.includes(id) ? "仍有执行缺口，等待返工或用户确认" : "来自任务生命周期的状态更新" }));
  const observation = {
    live_task_phase: phase,
    receipt_count: Number(summary.receipt_count || 0),
    acceptance_gate_passed: summary.acceptance_gate_passed === true,
    needs_replan: phase === "reworking" || summary.acceptance_gate_passed === false,
  };
  const internalLoop = buildGroupMainAgentInternalLoop({
    mode: phase === "reworking" ? "followup" : "delegation",
    actionIds: selectedActions,
    permissions,
    taskIntent: { kind: "task", executable: true, reason: "根据任务真实执行状态刷新内部循环" },
    dispatchPolicy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step: any) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
    assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [],
    observations: observation,
    verified: passed,
  });
  return {
    version: 2,
    trace_id: task?.trace_id || "",
    group_id: task?.group_id || "",
    task_id: task?.id || "",
    message_id: "",
    coordinator: task?.target_project || "coordinator",
    mode: phase === "reworking" ? "followup" : "delegation",
    decision: {
      selected_actions: selectedActions,
      dispatch_policy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step: any) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
      reason: "任务执行状态实时闭环",
    },
    internal_loop: internalLoop,
    loop: internalLoop,
    user_plan_steps: steps,
    todo_plan: liveTodoPlan,
    permissions,
    observation,
    verify: {
      passed,
      blocked_actions: blockedActions,
      conclusion: passed ? "任务 Todo 已闭环并通过验收" : "任务仍在执行、验收或返工中",
    },
    reply: {
      kind: "task_card",
      message_id: "",
      preview: task?.status_detail || summary.headline || "",
    },
    created_at: new Date().toISOString(),
  };
}

function buildMainAgentDecisionChain(input: {
  groupId: string;
  traceId: string;
  messageId?: string;
  taskId?: string;
  coordinator?: string;
  mode?: "conversation" | "project_analysis" | "project_task" | "delegation" | "followup" | "governance";
  messageMode?: string;
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  observations?: any;
  reply?: any;
  explicitGovernance?: boolean;
}) {
  const mode = input.mode || "conversation";
  const policyAction = String(input.dispatchPolicy?.action || "").trim();
  const actionIds = normalizeMainAgentActionIds([
    "read_group_context",
    ...(mode === "project_analysis" ? ["read_project_code_snapshot", "query_knowledge_base"] : []),
    ...(mode === "project_task" ? ["create_project_task", "dispatch_child_agent", "inspect_task_status"] : []),
    ...(mode === "followup" ? ["inspect_task_status", "replan_from_observation"] : []),
    ...(mode === "governance" ? ["govern_task_lifecycle", "inspect_task_status"] : []),
    ...(policyAction === "ask_user" ? ["ask_user_clarification"] : []),
    ...(policyAction === "delegate" || (input.assignments || []).length ? ["dispatch_child_agent", "read_child_agent_receipts"] : []),
    ...(mode === "delegation" ? ["inspect_task_status"] : []),
    "generate_final_reply",
  ]);
  const permissions = buildMainAgentPermissionJudgement(actionIds, {
    taskIntent: input.taskIntent,
    messageMode: input.messageMode,
    explicitGovernance: input.explicitGovernance,
  });
  const blocked = permissions.filter(item => !item.allowed);
  const userPlanSteps = buildMainAgentUserPlanSteps({
    mode,
    actionIds,
    permissions,
    taskIntent: input.taskIntent,
    dispatchPolicy: input.dispatchPolicy,
    assignments: input.assignments,
    taskId: input.taskId,
  });
  const observations = {
    message_mode: input.messageMode || "",
    intent_kind: input.taskIntent?.kind || "",
    executable: input.taskIntent?.executable === true,
    analysis_eligible: input.taskIntent?.analysisEligible === true,
    dispatch_action: policyAction || (mode === "project_task" ? "create_task" : "direct_reply"),
    assignment_count: (input.assignments || []).length,
    ...(input.observations || {}),
  };
  const verified = blocked.length === 0
    && (mode !== "project_task" || input.taskId)
    && (mode !== "project_analysis" || actionIds.includes("read_project_code_snapshot"))
    && actionIds.includes("generate_final_reply");
  const internalLoop = buildGroupMainAgentInternalLoop({
    mode,
    actionIds,
    permissions,
    taskIntent: input.taskIntent,
    dispatchPolicy: input.dispatchPolicy,
    assignments: input.assignments || [],
    observations,
    verified,
  });
  const chain = {
    version: 2,
    trace_id: input.traceId,
    group_id: input.groupId,
    task_id: input.taskId || "",
    message_id: input.messageId || "",
    coordinator: input.coordinator || "coordinator",
    mode,
    decision: {
      selected_actions: actionIds,
      dispatch_policy: input.dispatchPolicy || null,
      reason: input.dispatchPolicy?.reason || input.taskIntent?.reason || "",
    },
    internal_loop: internalLoop,
    loop: internalLoop,
    user_plan_steps: userPlanSteps,
    todo_plan: {
      title: "我准备这样处理",
      source: "cc-style-todo",
      strategy: "完整列表替换；普通用户看计划步骤，内部 Action/Trace 折叠",
      verification_nudge: userPlanSteps.length >= 3 && !userPlanSteps.some(step => /验证|验收|verify/i.test(step.content)),
      steps: userPlanSteps,
    },
    permissions,
    observation: observations,
    verify: {
      passed: verified,
      blocked_actions: blocked.map(item => item.action_id),
      conclusion: verified ? "主 Agent 本轮动作链路满足权限和证据边界" : "主 Agent 本轮存在未授权或证据不足的动作",
    },
    reply: {
      kind: input.reply?.kind || (mode === "project_task" ? "task_card" : "assistant_message"),
      message_id: input.reply?.messageId || input.messageId || "",
      preview: compactMemoryText(input.reply?.text || "", 240),
    },
    created_at: new Date().toISOString(),
  };
  return chain;
}

function appendMainAgentDecisionTrace(input: Parameters<typeof buildMainAgentDecisionChain>[0]) {
  const chain = buildMainAgentDecisionChain(input);
  appendTraceEvent(input.traceId, {
    id: `main-agent-decision:${input.messageId || input.taskId || Date.now()}:${chain.mode}`,
    type: "main_agent_decision",
    status: chain.verify.passed ? "ok" : "warning",
    task_id: input.taskId || "",
    group_id: input.groupId,
    agent: input.coordinator || "coordinator",
    message: `${chain.mode}：${chain.decision.selected_actions.join(" -> ")}`,
    data: chain,
  });
  return chain;
}

function mainAgentPetStateFromDecision(decision: any) {
  if (!decision?.verify?.passed) return { state: "waiting", text: "这个操作需要确认一下。" };
  const mode = String(decision?.mode || "");
  if (mode === "project_analysis") return { state: "thinking", text: "我在只读查看项目上下文。" };
  if (mode === "project_task") return { state: "planning", text: "我已创建任务，正在安排执行。" };
  if (mode === "delegation") return { state: "building", text: "我正在派发子 Agent 协作。" };
  if (mode === "followup") return { state: "working", text: "我把追加要求并入原任务了。" };
  if (mode === "governance") return { state: "waiting", text: "任务治理动作需要明确确认。" };
  return { state: "thinking", text: "我在组织这次回复。" };
}

function applyMainAgentDecisionPetState(ctx: any, decision: any) {
  if (!ctx || !decision?.coordinator) return;
  const pet = mainAgentPetStateFromDecision(decision);
  const groupTarget = { tab: "groups", groupId: decision.group_id || "" };
  const globalDetail = decision.coordinator && decision.coordinator !== "global-agent"
    ? `${decision.coordinator}：${pet.text}`
    : pet.text;
  try {
    ctx.setAgentActivity?.(decision.coordinator, pet.state, pet.text, groupTarget, 90 * 1000);
    ctx.broadcastPetSpeech?.(decision.coordinator, { role: decision.verify?.passed ? "status" : "attention", text: pet.text, source: "group", mode: "replace" });
    if (decision.coordinator !== "global-agent") {
      ctx.setAgentActivity?.("global-agent", pet.state, globalDetail, groupTarget, 90 * 1000);
      ctx.broadcastPetSpeech?.("global-agent", { role: decision.verify?.passed ? "status" : "attention", text: globalDetail, source: "workspace-group", mode: "replace" });
    }
  } catch {}
}

function runGroupMainAgentToolLoopSelfTest() {
  const conversation = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-conversation",
    messageId: "m1",
    coordinator: "coordinator",
    mode: "conversation",
    messageMode: "conversation",
    taskIntent: classifyGroupProjectTaskIntent("你好"),
    dispatchPolicy: { action: "answer", reason: "普通问候" },
    reply: { text: "你好，我在。" },
  });
  const analysis = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-analysis",
    messageId: "m2",
    coordinator: "coordinator",
    mode: "project_analysis",
    messageMode: "project_analysis",
    taskIntent: classifyGroupProjectTaskIntent("这个项目架构是什么"),
    dispatchPolicy: { action: "project_analysis", reason: "只读项目分析" },
    observations: { code_snapshot: true, knowledge_recall: true },
    reply: { text: "这是只读分析。" },
  });
  const projectTask = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-task",
    messageId: "m3",
    taskId: "task-loop",
    coordinator: "coordinator",
    mode: "project_task",
    messageMode: "project_task",
    taskIntent: classifyGroupProjectTaskIntent("帮我修复登录 bug 并跑测试"),
    dispatchPolicy: { action: "delegate", reason: "明确修复请求" },
    assignments: [{ project: "demo" }],
    observations: { task_created: true, queued: true },
    reply: { kind: "task_card", text: "任务已创建。" },
  });
  const unsafeGovernance = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-governance",
    messageId: "m4",
    coordinator: "coordinator",
    mode: "governance",
    messageMode: "conversation",
    taskIntent: classifyGroupProjectTaskIntent("你好"),
    dispatchPolicy: { action: "hold", reason: "没有显式治理授权" },
    explicitGovernance: false,
    reply: { text: "需要确认。" },
  });
  const checks = {
    conversationDoesNotCreateTask: !conversation.decision.selected_actions.includes("create_project_task") && !conversation.decision.selected_actions.includes("dispatch_child_agent"),
    projectAnalysisIsReadOnly: analysis.decision.selected_actions.includes("read_project_code_snapshot") && !analysis.decision.selected_actions.includes("create_project_task"),
    explicitTaskCreatesAndDispatches: projectTask.decision.selected_actions.includes("create_project_task") && projectTask.decision.selected_actions.includes("dispatch_child_agent") && projectTask.verify.passed,
    highRiskGovernanceBlockedWithoutExplicitCommand: unsafeGovernance.decision.selected_actions.includes("govern_task_lifecycle") && unsafeGovernance.verify.passed === false,
    allHaveTraceShape: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.decision && item.observation && item.verify && item.reply),
    allHaveUserTodoPlan: [conversation, analysis, projectTask, unsafeGovernance].every(item => Array.isArray(item.user_plan_steps) && item.user_plan_steps.length >= 3 && item.todo_plan?.source === "cc-style-todo"),
    conversationTodoSkipsDispatch: conversation.user_plan_steps.some((step: any) => step.id === "decide_dispatch" && step.status === "skipped"),
    projectTaskTodoTracksExecution: projectTask.user_plan_steps.some((step: any) => step.id === "create_project_task" && step.status === "completed") && projectTask.user_plan_steps.some((step: any) => step.id === "dispatch_child_agent" && step.status === "in_progress"),
    governanceTodoNeedsConfirmation: unsafeGovernance.user_plan_steps.some((step: any) => step.status === "needs_confirmation"),
    allHaveInternalLoop: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.internal_loop?.pattern === "observe-think-plan-act-monitor-reflect-respond" && item.internal_loop.stages?.length === 7),
    conversationLoopSkipsAct: conversation.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "skipped"),
    projectAnalysisLoopReadOnly: analysis.internal_loop?.stages?.some((stage: any) => stage.id === "observe" && stage.actions.includes("read_project_code_snapshot")) && analysis.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "skipped"),
    projectTaskLoopActsAndMonitors: projectTask.internal_loop?.stages?.some((stage: any) => stage.id === "act" && ["completed", "in_progress"].includes(stage.status)) && projectTask.internal_loop?.stages?.some((stage: any) => stage.id === "monitor" && ["completed", "in_progress"].includes(stage.status)),
    governanceLoopBlocksUnauthorizedAct: unsafeGovernance.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "needs_confirmation"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, samples: { conversation, analysis, projectTask, unsafeGovernance } };
}

function getWorkDirState(workDir: string) {
  const resolved = path.resolve(String(workDir || ""));
  if (!resolved) return { exists: false, writable: false, path: "" };
  try {
    const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
    if (!stat?.isDirectory()) return { exists: false, writable: false, path: resolved };
    try {
      fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
      return { exists: true, writable: true, path: resolved };
    } catch {
      return { exists: true, writable: false, path: resolved };
    }
  } catch {
    return { exists: false, writable: false, path: resolved };
  }
}

let childProcessCapabilityCache: any = null;

function getChildProcessCapability() {
  if (childProcessCapabilityCache) return childProcessCapabilityCache;
  try {
    const result = spawnSync(process.execPath, ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    });
    childProcessCapabilityCache = {
      ok: !result.error && result.status === 0,
      status: result.status,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim(),
      error: result.error ? `${(result.error as any).code || ""} ${result.error.message || result.error}`.trim() : "",
    };
    return childProcessCapabilityCache;
  } catch (e: any) {
    childProcessCapabilityCache = { ok: false, status: null, stdout: "", stderr: "", error: e.message || String(e) };
    return childProcessCapabilityCache;
  }
}

function readRunnerJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
}

function normalizeAgentProbeTarget(target: any = {}) {
  return {
    groupId: String(target.group_id || target.groupId || "").trim(),
    project: String(target.project || target.target_member || target.targetMember || "").trim(),
    agentType: String(target.agent_type || target.agentType || "").trim(),
  };
}

function getAgentProbeTargetStatusKey(target: any) {
  const normalized = normalizeAgentProbeTarget(target);
  if (!normalized.groupId && !normalized.project && !normalized.agentType) return "";
  const clean = (value: string, fallback: string) => String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "") || fallback;
  return [
    clean(normalized.groupId, "any-group"),
    clean(normalized.project, "any-project"),
    clean(normalized.agentType, "any-agent"),
  ].join("__");
}

function getAgentProbeTargetStatusFile(target: any) {
  const key = getAgentProbeTargetStatusKey(target);
  return key ? path.join(AGENT_PROBE_TARGET_STATUS_DIR, `${key}.json`) : "";
}

function attachAgentProbeAge(data: any) {
  if (!data) return null;
  const checkedAt = data?.checked_at ? Date.parse(data.checked_at) : 0;
  return {
    ...data,
    age_ms: checkedAt ? Date.now() - checkedAt : null,
  };
}

function readAgentProbeStatusFile(file: string) {
  try {
    if (!file || !fs.existsSync(file)) return null;
    return attachAgentProbeAge(readRunnerJson(file));
  } catch {
    return null;
  }
}

function doesProbeTargetMatchRequired(probeTarget: any, requiredTarget: any) {
  const required = normalizeAgentProbeTarget(requiredTarget);
  if (!required.groupId && !required.project && !required.agentType) return true;
  const target = normalizeAgentProbeTarget(probeTarget);
  return (!required.groupId || target.groupId === required.groupId)
    && (!required.project || target.project === required.project)
    && (!required.agentType || target.agentType === required.agentType);
}

function listAgentProbeTargetStatuses(requiredTarget: any = null) {
  try {
    if (!fs.existsSync(AGENT_PROBE_TARGET_STATUS_DIR)) return [];
    return fs.readdirSync(AGENT_PROBE_TARGET_STATUS_DIR)
      .filter(file => file.endsWith(".json"))
      .map(file => readAgentProbeStatusFile(path.join(AGENT_PROBE_TARGET_STATUS_DIR, file)))
      .filter(Boolean)
      .filter((probe: any) => !requiredTarget || doesProbeTargetMatchRequired(probe?.target, requiredTarget))
      .sort((a: any, b: any) => Date.parse(b?.checked_at || "") - Date.parse(a?.checked_at || ""));
  } catch {
    return [];
  }
}

function readAgentProbeStatus(requiredTarget: any = null) {
  const required = normalizeAgentProbeTarget(requiredTarget || {});
  const hasRequired = !!(required.groupId || required.project || required.agentType);
  if (hasRequired) {
    const exactFile = getAgentProbeTargetStatusFile(required);
    const exact = readAgentProbeStatusFile(exactFile);
    if (exact) return exact;
    const matched = listAgentProbeTargetStatuses(required)[0];
    if (matched) return matched;
  }

  const latest = readAgentProbeStatusFile(AGENT_PROBE_STATUS_FILE);
  if (!hasRequired) return latest;
  return latest && doesProbeTargetMatchRequired(latest?.target, required) ? latest : null;
}

function getAgentProbeHealth(probe: any) {
  if (!probe) {
    return {
      status: "missing",
      successFresh: false,
      failureRecent: false,
      message: "尚未运行 Agent CLI 探针",
    };
  }
  const age = Number(probe.age_ms ?? Infinity);
  if (probe.success === true && age < AGENT_PROBE_SUCCESS_FRESH_MS) {
    return {
      status: "ok",
      successFresh: true,
      failureRecent: false,
      message: "Agent CLI 探针最近通过",
    };
  }
  if (probe.success === false && age < AGENT_PROBE_FAILURE_BLOCK_MS) {
    return {
      status: "failed",
      successFresh: false,
      failureRecent: true,
      message: probe.message || probe.error || "Agent CLI 探针最近失败",
    };
  }
  return {
    status: probe.success === true ? "stale_ok" : "stale_failed",
    successFresh: false,
    failureRecent: false,
    message: probe.success === true ? "Agent CLI 探针已过期，建议复检" : "Agent CLI 失败探针已过期，建议复检",
  };
}

function writeAgentProbeStatus(data: any) {
  try {
    if (!fs.existsSync(AGENT_RUNNER_DIR)) fs.mkdirSync(AGENT_RUNNER_DIR, { recursive: true });
    const target = data?.target || null;
    const fixActions = Array.isArray(data?.fix_actions) && data.fix_actions.length
      ? data.fix_actions
      : (data?.readiness?.fix_actions || buildAgentExecutionFixActions({
        error: data?.message || data?.error || data?.output || "",
        agentType: target?.agent_type || data?.readiness?.probe?.target?.agent_type || "",
        probe: data,
      }));
    const payload = {
      success: !!data?.success,
      blocked: !!data?.blocked,
      message: String(data?.message || data?.error || "").slice(0, 1000),
      error: String(data?.error || "").slice(0, 1000),
      fix_actions: uniqueStrings(fixActions).slice(0, 6),
      target: target ? {
        group_id: target.group_id || "",
        group_name: target.group_name || "",
        project: target.project || "",
        agent_type: target.agent_type || "",
        work_dir: target.work_dir || "",
      } : null,
      execution_path: data?.execution_path || data?.readiness?.mode || "",
      expected_marker: data?.expected_marker || "CCM_AGENT_PROBE_OK",
      output_preview: String(data?.output || "").slice(0, 1000),
      duration_ms: Number(data?.duration_ms || 0),
      capabilities: data?.capabilities && typeof data.capabilities === "object" ? data.capabilities : null,
      native_session: data?.native_session && typeof data.native_session === "object" ? data.native_session : null,
      readiness_mode: data?.readiness?.mode || "",
      checked_at: new Date().toISOString(),
    };
    const writeJsonAtomic = (file: string) => {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf-8");
      fs.renameSync(tmp, file);
    };
    writeJsonAtomic(AGENT_PROBE_STATUS_FILE);
    const targetFile = getAgentProbeTargetStatusFile(target);
    if (targetFile) writeJsonAtomic(targetFile);
  } catch {}
}

function buildRunnerFixHint(error: string, agentType: string) {
  const command = getAgentCommandLabel(agentType);
  const text = String(error || "");
  if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    return `请先在同一台机器上确认 ${command} 可以连接模型 API；当前 Runner 能启动命令，但底层 CLI/API 连接被拒绝`;
  }
  if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
    return `请安装或加入 PATH：${command}`;
  }
  if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
    return `请检查 ${command} 的登录状态或 API Key 权限`;
  }
  return `请在子 Agent 工作目录中手动运行 ${command} 验证 CLI 是否可用`;
}

function buildAgentExecutionFixActions(input: {
  error?: string;
  agentType?: string;
  childProcess?: any;
  externalRunner?: any;
  probe?: any;
} = {}) {
  const text = [input.error, input.probe?.message, input.probe?.error, input.externalRunner?.last_result?.error, input.externalRunner?.last_result?.output]
    .filter(Boolean)
    .join("\n");
  const agentType = input.agentType || input.externalRunner?.last_result?.agentType || input.probe?.target?.agent_type || "claudecode";
  const command = getAgentCommandLabel(agentType);
  const actions: string[] = [];

  if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    actions.push(`在同一台机器的普通终端里运行 ${command}，确认它能连接模型 API`);
    actions.push("检查 Claude/Codex 等 CLI 的登录状态、代理环境变量、网络出口和模型 API Base URL");
    actions.push("如果使用本地代理或转发服务，先确认服务端口正在监听且没有被防火墙拦截");
  } else if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
    actions.push(`安装对应 CLI，或把 ${command} 所在目录加入 PATH`);
  } else if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
    actions.push(`重新登录或刷新 ${command} 的 API Key/Token 权限`);
  } else if (/spawn\s+EPERM|spawnSync .* EPERM/i.test(text) || input.childProcess?.ok === false) {
    actions.push("当前 Node 进程不能直接启动子 Agent CLI；在独立 PowerShell 里运行 npm run agent-runner:ps");
    actions.push("确认外部 Agent Runner 在线后，再点击“复检执行通道”或“立即恢复自动任务”");
  } else {
    actions.push(`在子 Agent 工作目录中手动运行 ${command}，确认 CLI 能正常返回`);
  }

  actions.push("修复后在设置页点击“复检执行通道”或“立即恢复自动任务”，系统会自动重试等待中的开发任务");
  return uniqueStrings(actions).slice(0, 6);
}

function getAgentProbeOutputFailure(output: any) {
  const text = String(output || "").trim();
  if (!text) {
    return {
      message: "Agent CLI 已返回空输出，未包含预期探针标记",
      error: "empty_output",
    };
  }
  if (checkTaskFailure(text) || /Agent Runner 错误|Agent 错误|响应超时|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    return {
      message: `Agent CLI 探针失败：${compactMemoryText(text, 500)}`,
      error: compactMemoryText(text, 1000),
    };
  }
  return {
    message: "Agent CLI 已返回，但未包含预期探针标记",
    error: compactMemoryText(text, 1000),
  };
}

function getAgentExecutionReadiness(probeTarget: any = null) {
  const childProcess = getChildProcessCapability();
  const probe = readAgentProbeStatus(probeTarget);
  const probeHealth = getAgentProbeHealth(probe);
  if (probeHealth.failureRecent) {
    const externalRunner = getExternalAgentRunnerStatus();
    const message = `Agent CLI 探针最近失败：${probeHealth.message}`;
    return {
      ready: false,
      mode: "agent-cli-probe-failed",
      message,
      fix_actions: buildAgentExecutionFixActions({
        error: message,
        childProcess,
        externalRunner,
        probe,
      }),
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  if (childProcess.ok) {
    return {
      ready: true,
      mode: "node-child-process",
      message: probeHealth.successFresh
        ? `Node 可启动子进程，且 Agent CLI 探针最近通过：${childProcess.stdout || "ok"}`
        : `Node 可启动子进程，Agent CLI 调用底座可用但模型 CLI 连通性未复检：${childProcess.stdout || "ok"}`,
      fix_actions: [],
      childProcess,
      probe,
      probeHealth,
    };
  }

  const externalRunner = getExternalAgentRunnerStatus();
  const lastResult = externalRunner.last_result || null;
  const lastFailure = lastResult?.success === false;
  const recentFailure = lastFailure && Number(lastResult?.age_ms || 0) < 15 * 60 * 1000;
  if (externalRunner.active && (!recentFailure || probeHealth.successFresh)) {
    return {
      ready: true,
      mode: "external-runner",
      message: recentFailure && probeHealth.successFresh
        ? "Node 直接启动子进程受限，外部 Agent Runner 最近有失败记录，但 Agent CLI 探针已新鲜通过，允许继续通过 Runner 执行"
        : "Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行",
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }

  const message = lastFailure
    ? `外部 Agent Runner 最近执行 ${lastResult.command || "Agent CLI"} 失败：${lastResult.error || lastResult.output || "未知错误"}；${lastResult.hint || "请检查子 Agent CLI"}`
    : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcess.error || childProcess.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`;
  return {
    ready: false,
    mode: externalRunner.active ? "external-runner-blocked" : "blocked",
    message,
    fix_actions: buildAgentExecutionFixActions({
      error: message,
      childProcess,
      externalRunner,
      probe,
    }),
    childProcess,
    externalRunner,
    probe,
    probeHealth,
  };
}

function enforceAgentProbeExecutionReadiness(capability: any = {}) {
  const childProcess = capability.childProcess || { ok: false };
  const externalRunner = capability.externalRunner || { active: false };
  const probe = capability.probe || null;
  const probeHealth = capability.probeHealth || getAgentProbeHealth(probe);
  if (childProcess.ok) {
    return {
      ready: true,
      mode: "node-child-process-probe",
      message: `Node 可启动子进程，可重新运行 Agent CLI 探针：${childProcess.stdout || "ok"}`,
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  if (externalRunner.active) {
    return {
      ready: true,
      mode: "external-runner-probe",
      message: "Node 直接启动子进程受限，但外部 Agent Runner 在线，可重新运行 Agent CLI 探针",
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  const message = `无法运行 Agent CLI 探针：Node 无法启动子进程，且外部 Agent Runner 未在线；${childProcess.error || childProcess.stderr || "请启用执行通道"}`;
  return {
    ready: false,
    mode: "probe-runner-blocked",
    message,
    fix_actions: buildAgentExecutionFixActions({
      error: message,
      childProcess,
      externalRunner,
      probe,
    }),
    childProcess,
    externalRunner,
    probe,
    probeHealth,
  };
}

function getAgentProbeExecutionReadiness(probeTarget: any = null) {
  return enforceAgentProbeExecutionReadiness({
    childProcess: getChildProcessCapability(),
    externalRunner: getExternalAgentRunnerStatus(),
    probe: readAgentProbeStatus(probeTarget),
  });
}

function taskRequiresFreshAgentProbe(task: any) {
  return task?.workflow_type === "daily_dev";
}

function getTaskRequiredProbeTarget(task: any) {
  const meta = task?.workflow_meta || task?.workflowMeta || {};
  const groupId = String(task?.group_id || task?.groupId || meta.group_id || meta.groupId || "").trim();
  const targetMember = String(meta.target_member || meta.targetMember || meta.probe_target_project || meta.probeTargetProject || "").trim();
  const targetProject = String(task?.target_project || task?.targetProject || "").trim();
  const project = targetMember || (task?.assign_type === "project" || !task?.assign_type ? targetProject : "");
  const taskRuntime = String(
    task?.runtime_overrides?.[project]
    || task?.runtime_overrides?.["*"]
    || task?.runtime_override
    || ""
  ).trim();
  const agentType = String(meta.agent_type || meta.agentType || meta.probe_agent_type || meta.probeAgentType || taskRuntime || "").trim();
  return { groupId, project, agentType };
}

function getProbeTargetLabel(probe: any) {
  const target = probe?.target || {};
  const project = String(target.project || "").trim();
  const agentType = String(target.agent_type || target.agentType || "").trim();
  return [project, agentType].filter(Boolean).join(" / ") || "未知目标";
}

function doesProbeMatchTaskTarget(probe: any, task: any) {
  const required = getTaskRequiredProbeTarget(task);
  if (!required.groupId && !required.project && !required.agentType) return true;
  return doesProbeTargetMatchRequired(probe?.target, required);
}

function taskNeedsGroupWideAgentProbe(task: any) {
  if (!taskRequiresFreshAgentProbe(task)) return false;
  const required = getTaskRequiredProbeTarget(task);
  const assignType = String(task?.assign_type || task?.assignType || "").trim();
  return !!required.groupId && !required.project && (!assignType || assignType === "group");
}

function getExecutableProbeTargetsFromDevGroup(group: any) {
  return (group?.members || [])
    .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable)
    .map((member: any) => ({
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      agent_type: member.agentType || member.agent || "claudecode",
      work_dir: member.workDir || "",
      requires_write: member.requiresWrite !== false,
    }));
}

function getExecutableProbeTargetsForTaskGroup(task: any) {
  if (!taskNeedsGroupWideAgentProbe(task)) return null;
  const required = getTaskRequiredProbeTarget(task);
  const groups = loadGroups();
  const configs = getConfigs();
  const group = groups
    .map((item: any) => normalizeGroupOrchestrator(item))
    .find((item: any) => String(item.id || "").trim() === required.groupId);
  if (!group) return [];
  const routableMembers = getRoutableMembers(group);
  const members = routableMembers.map((member: any) => {
    const runtime = resolveMemberRuntime(member.project, group, configs);
    const taskRuntime = String(
      task?.runtime_overrides?.[member.project]
      || task?.runtime_overrides?.["*"]
      || task?.runtime_override
      || ""
    ).trim();
    const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
    return {
      project: member.project,
      configured: !!runtime,
      // A user-selected task executor is the authoritative probe target for
      // this task.  Otherwise a healthy fallback could never pass admission
      // when the project's static primary runtime is down.
      agentType: taskRuntime || runtime?.agentType || member.agent || "",
      workDir: runtime?.workDir || "",
      workDirExists: !!workDirState?.exists,
      workDirWritable: !!workDirState?.writable,
    };
  });
  return getExecutableProbeTargetsFromDevGroup({
    id: group.id,
    name: group.name || group.id,
    members,
  });
}

function summarizeAgentProbeTargets(targets: any[], probeResolver: any = readAgentProbeStatus) {
  const rows = (targets || []).map((target: any) => {
    const runtimeCandidates = buildRuntimeRecoveryCandidates(target.agent_type || "claudecode");
    const candidates = runtimeCandidates.map((agentType: any) => {
      const candidateTarget = { ...target, agent_type: agentType };
      const candidateProbe = probeResolver(candidateTarget);
      const candidateHealth = getAgentProbeHealth(candidateProbe);
      const candidateWriteReady = target.requires_write === false || candidateProbe?.capabilities?.write?.pass === true;
      return { agentType, probe: candidateProbe, probeHealth: candidateHealth, writeReady: candidateWriteReady, ready: candidateHealth.successFresh === true && doesProbeTargetMatchRequired(candidateProbe?.target, candidateTarget) && candidateWriteReady };
    });
    const selected = candidates.find((item: any) => item.ready) || candidates[0];
    const probe = selected?.probe;
    const probeHealth = selected?.probeHealth || getAgentProbeHealth(probe);
    const writeReady = selected?.writeReady === true;
    return {
      ...target,
      effective_agent_type: selected?.agentType || target.agent_type,
      fallback_active: !!selected?.ready && selected?.agentType !== target.agent_type,
      runtime_candidates: candidates.map((item: any) => ({ agent_type: item.agentType, ready: item.ready, probe_status: item.probeHealth?.status || "missing" })),
      probe,
      probeHealth,
      writeReady,
      ready: selected?.ready === true,
    };
  });
  const readyRows = rows.filter((row: any) => row.ready);
  const missingRows = rows.filter((row: any) => row.probeHealth?.status === "missing");
  const staleRows = rows.filter((row: any) => row.probeHealth?.status === "stale_ok" || row.probeHealth?.status === "stale_failed");
  const failedRows = rows.filter((row: any) => row.probeHealth?.failureRecent);
  return {
    total: rows.length,
    ready: readyRows.length,
    missing: missingRows.length,
    stale: staleRows.length,
    failed_recent: failedRows.length,
    allReady: rows.length > 0 && readyRows.length === rows.length,
    rows,
  };
}

function getTaskGroupAgentProbeReadiness(task: any) {
  const rawTargets = getExecutableProbeTargetsForTaskGroup(task);
  const targets = rawTargets?.map((target: any) => ({ ...target, requires_write: taskRequiresCodeChanges(task) }));
  if (!targets) return null;
  const summary = summarizeAgentProbeTargets(targets);
  const failed = summary.rows.filter((row: any) => !row.ready);
  const failedLabels = failed
    .slice(0, 5)
    .map((row: any) => `${row.project || "unknown"}(${row.agent_type || "agent"}:${row.probeHealth?.status || "missing"})`)
    .join("、");
  const groupLabel = String(targets[0]?.group_name || getTaskRequiredProbeTarget(task).groupId || "目标群聊").trim();
  return {
    ready: summary.allReady,
    mode: "group-target-agent-cli-probe",
    message: summary.allReady
      ? `daily_dev 群聊任务已具备真实执行准入：${groupLabel} 的 ${summary.ready}/${summary.total} 个可执行项目 Agent 探针近期成功`
      : `daily_dev 群聊任务需要所有可执行项目 Agent 通过真实 CLI 探针：${groupLabel} 当前通过 ${summary.ready}/${summary.total}，未复检 ${summary.missing}，过期 ${summary.stale}，最近失败 ${summary.failed_recent}${failedLabels ? `；未通过：${failedLabels}` : ""}`,
    summary,
    fix_actions: [
      "在设置页的“项目 Agent 执行探针”中点击“复检全部”，让系统实际调用该群聊下每个可执行项目 Agent CLI",
      "也可以逐个选择项目 Agent 复检；全部通过后再恢复 daily_dev 群聊任务",
    ],
  };
}

function enforceTaskAgentProbeReadiness(task: any, readiness: any) {
  if (!taskRequiresFreshAgentProbe(task)) return readiness;
  const groupReadiness = getTaskGroupAgentProbeReadiness(task);
  if (groupReadiness) {
    return {
      ...readiness,
      ready: groupReadiness.ready,
      mode: groupReadiness.ready ? readiness.mode : "agent-cli-probe-required",
      message: groupReadiness.message,
      fix_actions: groupReadiness.ready ? [] : uniqueStrings([
        ...groupReadiness.fix_actions,
        ...(Array.isArray(readiness.fix_actions) ? readiness.fix_actions : []),
      ]).slice(0, 6),
      groupProbeReadiness: groupReadiness,
    };
  }
  if (!readiness.ready) return readiness;
  const probeHealth = readiness.probeHealth || getAgentProbeHealth(readiness.probe);
  const probeMatchesTarget = doesProbeMatchTaskTarget(readiness.probe, task);
  if (probeHealth?.successFresh && probeMatchesTarget) return readiness;
  const requiredTarget = getTaskRequiredProbeTarget(task);
  const targetHint = requiredTarget.groupId || requiredTarget.project || requiredTarget.agentType
    ? `目标：${[requiredTarget.groupId, requiredTarget.project, requiredTarget.agentType].filter(Boolean).join(" / ")}；当前探针：${getProbeTargetLabel(readiness.probe)}；`
    : "";
  const mismatchHint = probeHealth?.successFresh && !probeMatchesTarget ? "已有新鲜探针但目标不匹配；" : "";
  const message = `daily_dev 任务需要先通过目标项目 Agent CLI 真实探针：${targetHint}${mismatchHint}${probeHealth?.message || "尚未复检模型 CLI/API 连通性"}`;
  return {
    ...readiness,
    ready: false,
    mode: "agent-cli-probe-required",
    message,
    fix_actions: uniqueStrings([
      "在设置页点击“复检执行通道”，让系统实际调用目标子 Agent CLI 并确认模型 API 可用",
      ...(Array.isArray(readiness.fix_actions) ? readiness.fix_actions : []),
      "探针通过后再创建真实试运行任务或恢复 daily_dev 队列",
    ]).slice(0, 6),
    probeHealth,
  };
}

function getTaskAgentExecutionReadiness(task: any) {
  return enforceTaskAgentProbeReadiness(task, getAgentExecutionReadiness(getTaskRequiredProbeTarget(task)));
}

function getExternalAgentRunnerStatus() {
  const runnerDir = path.join(CCM_DIR, "agent-runner");
  const heartbeatFile = path.join(runnerDir, "heartbeat.json");
  const requestsDir = path.join(runnerDir, "requests");
  const resultsDir = path.join(runnerDir, "results");
  let heartbeat: any = null;
  try {
    if (fs.existsSync(heartbeatFile)) heartbeat = readRunnerJson(heartbeatFile);
  } catch {}
  const updatedAt = heartbeat?.updated_at ? Date.parse(heartbeat.updated_at) : 0;
  const ageMs = updatedAt ? Date.now() - updatedAt : null;
  const pid = heartbeat?.pid ? Number(heartbeat.pid) : 0;
  let processAlive = false;
  if (pid > 0) {
    try {
      process.kill(pid, 0);
      processAlive = true;
    } catch {
      processAlive = false;
    }
  }
  const activeWindowMs = heartbeat?.status === "running" ? 10 * 60 * 1000 : 15000;
  const active = !!heartbeat && processAlive && ageMs !== null && ageMs < activeWindowMs && heartbeat.status !== "error";
  const listJsonFiles = (dir: string) => {
    try { return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith(".json")) : []; } catch { return []; }
  };
  const requestFiles = listJsonFiles(requestsDir);
  const resultFiles = listJsonFiles(resultsDir);
  const resultIds = new Set(resultFiles.map(file => file.replace(/\.json$/, "")));
  const pendingRequests = requestFiles.filter(file => !resultIds.has(file.replace(/\.json$/, ""))).length;
  let lastResult: any = null;
  try {
    if (fs.existsSync(resultsDir)) {
      const latest = resultFiles
        .map(file => {
          const full = path.join(resultsDir, file);
          const stat = fs.statSync(full);
          return { file, full, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
      if (latest) {
        const data = readRunnerJson(latest.full);
        lastResult = {
          id: data?.id || latest.file.replace(/\.json$/, ""),
          success: data?.success !== false,
          error: String(data?.error || "").slice(0, 500),
          output: String(data?.output || "").slice(0, 500),
          agentType: data?.agentType || "",
          command: data?.command || getAgentCommandLabel(data?.agentType || ""),
          exitCode: data?.exitCode ?? null,
          runner: data?.runner || "",
          completed_at: data?.completed_at || new Date(latest.mtimeMs).toISOString(),
          age_ms: Date.now() - latest.mtimeMs,
        };
        lastResult.hint = buildRunnerFixHint(lastResult.error || lastResult.output, lastResult.agentType || "");
      }
    }
  } catch {}
  return {
    active,
    status: heartbeat?.status || "missing",
    detail: heartbeat?.detail || "",
    pid: pid || null,
    process_alive: processAlive,
    updated_at: heartbeat?.updated_at || "",
    age_ms: ageMs,
    pending_requests: pendingRequests,
    requests: requestFiles.length,
    results: resultFiles.length,
    last_result: lastResult,
  };
}

function buildAgentProbeMatrix(devGroups: any[]) {
  const targets = devGroups.flatMap((group: any) => (group.members || []).map((member: any) => {
    const target = {
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      agent_type: member.agentType || member.agent || "claudecode",
      work_dir: member.workDir || "",
    };
    const fallbackRow = member.configured && member.workDirExists && member.workDirWritable
      ? summarizeAgentProbeTargets([{ ...target, requires_write: true }]).rows[0]
      : null;
    const probe = fallbackRow?.probe || null;
    const probeHealth = fallbackRow?.probeHealth || getAgentProbeHealth(probe);
    const taskReadiness = member.configured && member.workDirExists && member.workDirWritable
      ? {
        ready: fallbackRow?.ready === true,
        mode: fallbackRow?.fallback_active ? "fallback-agent-cli-probe" : "agent-cli-probe",
        message: fallbackRow?.ready
          ? (fallbackRow?.fallback_active
            ? `默认执行器不可用，备用执行器 ${fallbackRow.effective_agent_type} 已通过真实写入探针`
            : "目标执行器已通过真实写入探针")
          : (probeHealth.message || "目标项目 Agent 尚未通过探针"),
        fix_actions: [],
      }
      : {
        ready: false,
        mode: "member-not-executable",
        message: !member.configured
          ? "项目 Agent 未配置执行器或工作目录"
          : (!member.workDirExists ? "项目 Agent 工作目录不存在" : "项目 Agent 工作目录不可写"),
      };
    const status = taskReadiness.ready === true
      ? "ok"
      : (member.configured && member.workDirExists && member.workDirWritable ? "warn" : "fail");
    return {
      key: getAgentProbeTargetStatusKey(target),
      status,
      ready: taskReadiness.ready === true,
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      role: member.role || "member",
      agent_type: target.agent_type,
      effective_agent_type: fallbackRow?.effective_agent_type || target.agent_type,
      fallback_active: fallbackRow?.fallback_active === true,
      runtime_candidates: fallbackRow?.runtime_candidates || [],
      command: getAgentCommandLabel(fallbackRow?.effective_agent_type || target.agent_type),
      configured: !!member.configured,
      workDir: member.workDir || "",
      workDirExists: !!member.workDirExists,
      workDirWritable: !!member.workDirWritable,
      probe,
      probeHealth,
      readiness: {
        ready: taskReadiness.ready === true,
        mode: taskReadiness.mode || "",
        message: taskReadiness.message || probeHealth.message || "",
        fix_actions: Array.isArray(taskReadiness.fix_actions) ? taskReadiness.fix_actions : [],
      },
      checked_at: probe?.checked_at || "",
      age_ms: probe?.age_ms ?? null,
      message: taskReadiness.ready === true
        ? "目标项目 Agent 可执行 daily_dev"
        : (taskReadiness.message || probeHealth.message || "目标项目 Agent 尚未通过探针"),
    };
  }));
  const executable = targets.filter((target: any) => target.configured && target.workDirExists && target.workDirWritable);
  const ready = executable.filter((target: any) => target.ready);
  const stale = executable.filter((target: any) => target.probeHealth?.status === "stale_ok" || target.probeHealth?.status === "stale_failed");
  const missing = executable.filter((target: any) => target.probeHealth?.status === "missing");
  const failedRecent = executable.filter((target: any) => target.probeHealth?.failureRecent);
  const groupSummaries = devGroups.map((group: any) => {
    const groupTargets = getExecutableProbeTargetsFromDevGroup(group);
    const summary = summarizeAgentProbeTargets(groupTargets);
    return {
      group_id: group.id,
      group_name: group.name || group.id,
      orchestratorEnabled: group.orchestratorEnabled !== false,
      executable: summary.total,
      ready: summary.ready,
      missing: summary.missing,
      stale: summary.stale,
      failed_recent: summary.failed_recent,
      all_ready: summary.allReady,
      targets: summary.rows.map((row: any) => ({
        project: row.project,
        agent_type: row.agent_type,
        effective_agent_type: row.effective_agent_type || row.agent_type,
        fallback_active: row.fallback_active === true,
        ready: row.ready,
        probe_status: row.probeHealth?.status || "missing",
      })),
    };
  });
  const fullyReadyGroups = groupSummaries.filter((group: any) => group.orchestratorEnabled && group.executable > 0 && group.all_ready);
  return {
    total: targets.length,
    executable: executable.length,
    ready: ready.length,
    blocked: targets.filter((target: any) => !target.ready).length,
    missing: missing.length,
    stale: stale.length,
    failed_recent: failedRecent.length,
    group_total: groupSummaries.length,
    group_ready: fullyReadyGroups.length,
    groups: groupSummaries,
    targets,
  };
}

function buildDailyDevAgentDiagnostics() {
  const checks: any[] = [];
  const config = loadOrchestratorConfig();
  const publicConfig = publicOrchestratorConfig(config);
  const groups = loadGroups();
  const configs = getConfigs();
  const tasks = loadTasks();
  const cronJobs = loadCronJobs();
  const enabledCronJobs = cronJobs.filter((job: any) => job?.enabled !== false);
  const autoTasks = tasks.filter((task: any) => task?.auto_execute);
  const devGroups = groups.map((group: any) => {
    const normalized = normalizeGroupOrchestrator(group);
    const coordinator = getCoordinatorMember(normalized);
    const routableMembers = getRoutableMembers(normalized);
    const backlogFiles = Array.isArray(normalized.shared_files)
      ? normalized.shared_files.filter((file: any) => isDailyDevBacklogFile(file))
      : [];
    const backlogCounts = backlogFiles.reduce((acc: any, file: any) => {
      const status = readDailyDevBacklogStatus(file) || "unknown";
      acc[status] = Number(acc[status] || 0) + 1;
      return acc;
    }, {});
    const members = routableMembers.map((member: any) => {
      const runtime = resolveMemberRuntime(member.project, normalized, configs);
      const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
      const verification = getProjectVerificationHintDetail(member.project, workDirState?.path || runtime?.workDir || "");
      return {
        project: member.project,
        role: member.role || "member",
        configured: !!runtime,
        agentType: runtime?.agentType || member.agent || "",
        workDir: runtime?.workDir || "",
        workDirExists: !!workDirState?.exists,
        workDirWritable: !!workDirState?.writable,
        verification,
      };
    });
    const readyMembers = members.filter((member: any) => member.configured && member.workDirExists && member.workDirWritable);
    return {
      id: normalized.id,
      name: normalized.name || normalized.id,
      orchestratorEnabled: normalized.orchestrator?.enabled !== false,
      coordinator: coordinator.project,
      sharedFiles: Array.isArray(normalized.shared_files) ? normalized.shared_files.length : 0,
      backlogFiles: backlogFiles.length,
      readyBacklogs: Number(backlogCounts.ready || 0),
      backlogCounts,
      memberCount: members.length,
      readyMemberCount: readyMembers.length,
      members,
    };
  });
  const groupsWithReadyMembers = devGroups.filter((group: any) => group.orchestratorEnabled && group.readyMemberCount > 0);
  const agentProbeMatrix = buildAgentProbeMatrix(devGroups);
  const dailyDevCronJobs = enabledCronJobs.filter((job: any) => job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);

  const llmConfigured = !!(config.enabled && String(config.apiUrl || "").trim() && String(config.apiKey || "").trim() && String(config.model || "").trim());
  checks.push(createDiagnosticCheck(
    "orchestrator-config",
    "主 Agent 大模型",
    llmConfigured ? "ok" : (config.fallbackToRules ? "warn" : "fail"),
    llmConfigured
      ? `已配置 ${publicConfig.model}，可由 LLM 主 Agent 理解业务描述并拆分任务`
      : (config.fallbackToRules ? "LLM 配置不完整，会降级到规则主 Agent；可工作但理解复杂业务会变弱" : "LLM 配置不完整，主 Agent 不会自动分派子 Agent"),
    { enabled: publicConfig.enabled, apiUrl: publicConfig.apiUrl, model: publicConfig.model, hasKey: publicConfig.hasKey, fallbackToRules: publicConfig.fallbackToRules }
  ));

  const coordinatorProtocol = runCoordinatorProtocolSelfTest();
  checks.push(createDiagnosticCheck(
    "coordinator-protocol",
    "主 Agent 协调协议",
    coordinatorProtocol.pass ? "ok" : "fail",
    coordinatorProtocol.pass
      ? `规则主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 派发 ${coordinatorProtocol.assignmentCount} 个自包含子 Agent 工作单；策略：${coordinatorProtocol.coordinationStrategy || coordinatorProtocol.coordinationPlan?.strategy || "未声明"}`
      : "规则主 Agent 未能稳定生成计划、派发和自包含子 Agent 工作单",
    coordinatorProtocol
  ));

  const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
  checks.push(createDiagnosticCheck(
    "coordinator-rework-protocol",
    "主 Agent 返工协议",
    reworkProtocol.pass ? "ok" : "fail",
    reworkProtocol.pass
      ? "主 Agent 验收发现缺口时，会生成自包含返工工作单并要求子 Agent 再次回执"
      : "主 Agent 返工工作单缺少轮次、原始需求、初始计划、验证或回执要求",
    reworkProtocol
  ));

  const collaborationProtocol = runCollaborationProtocolSelfTest();
  const workerProtocolPass = !!(
    collaborationProtocol.pass
    && Object.values(collaborationProtocol.taskNotificationChecks || {}).every(Boolean)
    && Object.values(collaborationProtocol.scratchpadChecks || {}).every(Boolean)
  );
  checks.push(createDiagnosticCheck(
    "worker-notification-scratchpad",
    "Worker 通知与协作 scratchpad",
    workerProtocolPass ? "ok" : "fail",
    workerProtocolPass
      ? "子 Agent 输出会封装为 task-notification，缺回执可触发返工，并写入协作 scratchpad 供后续 Worker 复用"
      : "Worker 通知、缺回执门禁或协作 scratchpad 自测未通过",
    {
      taskNotificationChecks: collaborationProtocol.taskNotificationChecks || {},
      scratchpadChecks: collaborationProtocol.scratchpadChecks || {},
      structuredAssignmentChecks: collaborationProtocol.structuredAssignmentChecks || {},
    }
  ));

  checks.push(createDiagnosticCheck(
    "project-configs",
    "项目 Agent 配置",
    configs.length > 0 ? "ok" : "fail",
    configs.length > 0 ? `已发现 ${configs.length} 个项目配置` : "未发现项目配置，子 Agent 没有可执行仓库",
    configs.map((configItem: any) => ({ name: configItem.name, file: configItem.file }))
  ));

  checks.push(createDiagnosticCheck(
    "groups",
    "开发群聊",
    groupsWithReadyMembers.length > 0 ? "ok" : "fail",
    groupsWithReadyMembers.length > 0
      ? `已有 ${groupsWithReadyMembers.length} 个群聊可由主 Agent 派发给子 Agent`
      : "没有可用的开发群聊；需要创建群聊并加入至少一个已配置项目 Agent",
    devGroups
  ));

  const invalidMembers = devGroups.flatMap((group: any) =>
    group.members
      .filter((member: any) => !member.configured || !member.workDirExists || !member.workDirWritable)
      .map((member: any) => ({ group: group.name, ...member }))
  );
  checks.push(createDiagnosticCheck(
    "member-runtime",
    "子 Agent 可执行目录",
    invalidMembers.length === 0 && groupsWithReadyMembers.length > 0 ? "ok" : (groupsWithReadyMembers.length > 0 ? "warn" : "fail"),
    invalidMembers.length === 0 && groupsWithReadyMembers.length > 0
      ? "所有群聊子 Agent 都能解析到可读写工作目录"
      : (groupsWithReadyMembers.length > 0 ? `${invalidMembers.length} 个子 Agent 的项目配置或工作目录需要检查` : "还没有可验证的子 Agent 工作目录"),
    invalidMembers
  ));

  const readyMembersForVerification = devGroups.flatMap((group: any) =>
    group.members
      .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable)
      .map((member: any) => ({ group: group.name, ...member }))
  );
  const projectAgentProfiles = readyMembersForVerification.map((member: any) => ({
    group: member.group,
    project: member.project,
    profile: getProjectAgentCapabilityProfile(member.project, member.workDir || ""),
  }));
  const incompleteProjectAgentProfiles = projectAgentProfiles.filter((item: any) => {
    const profile = item.profile || {};
    return !profile.responsibility || !profile.capabilities?.length || !profile.delivery_contract;
  });
  checks.push(createDiagnosticCheck(
    "project-agent-capabilities",
    "项目 Agent 能力边界",
    incompleteProjectAgentProfiles.length === 0 && projectAgentProfiles.length > 0 ? "ok" : (projectAgentProfiles.length > 0 ? "warn" : "fail"),
    projectAgentProfiles.length === 0
      ? "还没有可检查能力边界的可执行子 Agent"
      : incompleteProjectAgentProfiles.length === 0
        ? "可执行子 Agent 均配置了职责、能力标签和交付规范；路径门禁按项目配置启用"
        : `${incompleteProjectAgentProfiles.length} 个可执行子 Agent 缺少职责、能力标签或交付规范；可在项目管理 -> 项目工具配置中填写`,
    {
      total: projectAgentProfiles.length,
      incomplete: incompleteProjectAgentProfiles.length,
      members: projectAgentProfiles.map((item: any) => ({
        group: item.group,
        project: item.project,
        responsibility: item.profile.responsibility,
        capabilities: item.profile.capabilities,
        writable_paths: item.profile.writable_paths,
        forbidden_paths: item.profile.forbidden_paths,
        has_delivery_contract: !!item.profile.delivery_contract,
      })),
    }
  ));

  const missingVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "missing");
  const configuredVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "configured");
  const inferredVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "inferred");
  checks.push(createDiagnosticCheck(
    "project-verification",
    "项目验证命令",
    missingVerificationMembers.length === 0 && readyMembersForVerification.length > 0 ? "ok" : (readyMembersForVerification.length > 0 ? "warn" : "fail"),
    readyMembersForVerification.length === 0
      ? "还没有可检查验证命令的可执行子 Agent"
      : missingVerificationMembers.length === 0
        ? `可执行子 Agent 均有验证命令：${configuredVerificationMembers.length} 个手动配置，${inferredVerificationMembers.length} 个自动推断`
        : `${missingVerificationMembers.length} 个可执行子 Agent 缺少验证命令；可在项目管理 -> 项目工具配置中填写`,
    {
      total: readyMembersForVerification.length,
      configured: configuredVerificationMembers.length,
      inferred: inferredVerificationMembers.length,
      missing: missingVerificationMembers.length,
      members: readyMembersForVerification.map((member: any) => ({
        group: member.group,
        project: member.project,
        source: member.verification?.source || "missing",
        commands: member.verification?.commands || [],
      })),
    }
  ));

  const runtimeConsistency = getAgentRuntimeConsistencyStatus();
  checks.push(createDiagnosticCheck(
    "agent-runtime-consistency",
    "项目 Agent 执行器映射",
    runtimeConsistency.pass ? "ok" : "fail",
    runtimeConsistency.pass
      ? `所有可配置项目 Agent 都有对应执行器：${runtimeConsistency.agents.map((agent: any) => agent.type).join("、")}`
      : `存在可配置但不可执行的项目 Agent：${runtimeConsistency.missing.map((agent: any) => agent.type).join("、")}`,
    runtimeConsistency
  ));

  const childProcessCapability = getChildProcessCapability();
  const externalRunnerStatus = getExternalAgentRunnerStatus();
  const probeStatus = readAgentProbeStatus();
  const probeHealth = getAgentProbeHealth(probeStatus);
  const executionReadiness = getAgentExecutionReadiness();
  const runnerLastFailure = externalRunnerStatus.last_result?.success === false;
  const runnerRecentFailure = runnerLastFailure
    && Number(externalRunnerStatus.last_result?.age_ms || 0) < 15 * 60 * 1000;
  const runnerFailureBlocks = runnerLastFailure && (!externalRunnerStatus.active || runnerRecentFailure);
  const agentProcessReady = executionReadiness.ready === true;
  const dailyDevExecutionReady = Number(agentProbeMatrix.group_ready || 0) > 0;
  const matrixReadinessMessage = agentProbeMatrix.executable > 0
    ? `daily_dev 群聊接单需要至少一个开发群聊的所有可执行项目 Agent 通过真实 CLI 探针：当前全员通过 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total} 个群聊，项目探针通过 ${agentProbeMatrix.ready}/${agentProbeMatrix.executable}，未复检 ${agentProbeMatrix.missing}，过期 ${agentProbeMatrix.stale}，最近失败 ${agentProbeMatrix.failed_recent}`
    : "daily_dev 需要先配置至少一个具备可写工作目录的项目 Agent";
  const baseDailyDevReadiness = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, executionReadiness);
  const dailyDevExecutionReadiness = dailyDevExecutionReady
    ? {
      ready: true,
      mode: "group-target-agent-cli-probe",
      message: `已有 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total} 个开发群聊的可执行项目 Agent 全员通过真实 CLI 探针`,
      probe_matrix: agentProbeMatrix,
    }
    : {
      ...baseDailyDevReadiness,
      message: matrixReadinessMessage,
      probe_matrix: agentProbeMatrix,
    };
  const executionFixActions = agentProcessReady ? [] : (executionReadiness.fix_actions || buildAgentExecutionFixActions({
    error: externalRunnerStatus.last_result?.error || externalRunnerStatus.last_result?.output || probeStatus?.message || childProcessCapability.error || childProcessCapability.stderr || "",
    childProcess: childProcessCapability,
    externalRunner: externalRunnerStatus,
    probe: probeStatus,
  }));
  checks.push(createDiagnosticCheck(
    "agent-process",
    "Agent CLI 进程能力",
    agentProcessReady ? "ok" : "fail",
    executionReadiness.mode === "agent-cli-probe-failed"
      ? executionReadiness.message
      : childProcessCapability.ok
      ? executionReadiness.message
      : (runnerFailureBlocks
        ? `外部 Agent Runner 最近执行 ${externalRunnerStatus.last_result?.command || "Agent CLI"} 失败：${externalRunnerStatus.last_result?.error || "未知错误"}；${externalRunnerStatus.last_result?.hint || "请检查子 Agent CLI"}`
        : (externalRunnerStatus.active
        ? `Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行`
        : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcessCapability.error || childProcessCapability.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`)),
    { childProcess: childProcessCapability, externalRunner: externalRunnerStatus, probe: probeStatus, probeHealth, readiness: executionReadiness, fix_actions: executionFixActions, runtimes: getPublicAgentRuntimes() }
  ));

  checks.push(createDiagnosticCheck(
    "agent-cli-probe",
    "Agent CLI 连通探针",
    agentProbeMatrix.ready > 0 ? "ok" : (agentProbeMatrix.executable > 0 ? "warn" : "fail"),
    agentProbeMatrix.ready > 0
      ? `已有 ${agentProbeMatrix.ready}/${agentProbeMatrix.executable} 个项目 Agent 探针新鲜通过`
      : (agentProbeMatrix.executable > 0 ? `尚无项目 Agent 探针新鲜通过：${probeHealth.message}` : "没有可执行的项目 Agent 可运行探针"),
    {
      probe: probeStatus,
      probeHealth,
      probeMatrix: agentProbeMatrix,
      fresh_success_ms: AGENT_PROBE_SUCCESS_FRESH_MS,
      failure_block_ms: AGENT_PROBE_FAILURE_BLOCK_MS,
      fix_actions: probeHealth.failureRecent ? executionFixActions : [],
    }
  ));

  checks.push(createDiagnosticCheck(
    "daily-dev-execution-readiness",
    "daily_dev 执行准入",
    dailyDevExecutionReady ? "ok" : "fail",
    dailyDevExecutionReady
      ? "daily_dev 任务已具备真实执行准入：至少一个开发群聊的可执行项目 Agent 已全员通过真实 CLI 探针"
      : matrixReadinessMessage,
    {
      readiness: dailyDevExecutionReadiness,
      required: ["fresh_target_agent_cli_probe"],
      probeMatrix: agentProbeMatrix,
      fix_actions: dailyDevExecutionReadiness.fix_actions || [],
    }
  ));

  const queueStatus = getQueueStatus();
  checks.push(createDiagnosticCheck(
    "task-queue",
    "任务队列",
    "ok",
    `队列接口可用：${queueStatus.total_queued} 个排队，${queueStatus.running_targets} 个目标执行中`,
    queueStatus
  ));

  const watchdogStatus = getTaskWatchdogStatus();
  const watchdogRecoverable = watchdogStatus.stale_pending.length + watchdogStatus.stalled_in_progress.length;
  const runtimeRecoverable = watchdogStatus.runtime_failed.length;
  const gapReworkRecoverable = watchdogStatus.gap_rework.length;
  checks.push(createDiagnosticCheck(
    "task-watchdog",
    "任务看门狗",
    watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0 ? "warn" : "ok",
    watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0
      ? `发现 ${watchdogRecoverable} 个卡住自动任务、${runtimeRecoverable} 个执行通道失败任务、${gapReworkRecoverable} 个可按缺口续跑任务；当前为手动恢复模式`
      : "自动任务看门狗可用，当前没有检测到卡住的可恢复任务",
    { ...watchdogStatus, auto_recovery: /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_TASK_WATCHDOG_RECOVERY || "")) }
  ));

  const recoveryWork = getAgentRecoveryWorkSummary();
  checks.push(createDiagnosticCheck(
    "agent-recovery-monitor",
    "执行通道恢复监控",
    recoveryWork.total > 0 ? "warn" : "ok",
    recoveryWork.total > 0
      ? `${agentRecoveryMonitorTimer ? "自动恢复监控已启动" : "手动复检模式"}：发现 ${recoveryWork.blocked_pending.length} 个等待执行通道的任务、${recoveryWork.runtime_failed.length} 个可重试失败任务`
      : `${agentRecoveryMonitorTimer ? "自动恢复监控已启动" : "手动复检模式"}，当前没有等待执行通道恢复的自动任务`,
    {
      active: !!agentRecoveryMonitorTimer,
      probe_in_flight: agentRecoveryProbeInFlight,
      interval_ms: AGENT_RECOVERY_PROBE_INTERVAL_MS,
      work: recoveryWork,
    }
  ));

  checks.push(createDiagnosticCheck(
    "cron-dispatch",
    "定时派发",
    enabledCronJobs.length > 0 ? "ok" : "warn",
    enabledCronJobs.length > 0
      ? `已启用 ${enabledCronJobs.length} 个定时任务，可自动创建开发任务`
      : "暂无启用中的定时任务；需要自动接活时可在定时任务页创建",
    { total: cronJobs.length, enabled: enabledCronJobs.length }
  ));

  const cronDailyDevProtocol = runCronDailyDevProtocolSelfTestSafe();
  checks.push(createDiagnosticCheck(
    "cron-daily-dev-protocol",
    "定时业务开发协议",
    cronDailyDevProtocol.pass ? "ok" : "fail",
    cronDailyDevProtocol.pass
      ? "daily_dev 定时任务会创建群聊主 Agent 任务，并把定时提示词写入任务级业务/接口文档"
      : "daily_dev 定时任务未能稳定生成主 Agent 闭环任务或缺少任务级文档",
    cronDailyDevProtocol
  ));

  checks.push(createDiagnosticCheck(
    "receipt-gate",
    "完成回执验收",
    "ok",
    "子 Agent 输出必须包含 CCM_AGENT_RECEIPT，队列会按结构化回执和主 Agent 复盘判定完成",
    { autoTaskCount: autoTasks.length }
  ));

  const dailyDevGateSelfTest = getDailyDevCompletionGateSelfTest();
  checks.push(createDiagnosticCheck(
    "daily-dev-completion-gate",
    "业务开发完成门禁",
    dailyDevGateSelfTest.pass ? "ok" : "fail",
    dailyDevGateSelfTest.pass
      ? "daily_dev 任务必须具备主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 最终复盘、实际代码变更证据和已执行验证记录，不能把建议性回复误判为完成"
      : "daily_dev 完成门禁自检失败，需要检查任务验收逻辑",
    { requiredEvidence: ["coordinator_plan", "assignment_evidence", "worker_notification", "child_agent_receipt", "coordinator_final_review", "actual_file_changes", "executed_verification"], selfTest: dailyDevGateSelfTest }
  ));

  const collaborationUx = runCollaborationUxSelfTest();
  checks.push(createDiagnosticCheck(
    "group-collaboration-ux",
    "群聊 AI 编程体验",
    collaborationUx.pass ? "ok" : "fail",
    collaborationUx.pass
      ? "群聊使用对话/项目分析/项目任务三态、任务意图门禁和单任务卡；普通问候不展示任务卡，项目询问可只读分析，内部协议默认进入技术详情"
      : "群聊协作体验自检失败，需要检查任务卡、交付摘要或追加要求分类",
    collaborationUx
  ));

  const mainAgentActions = runGroupMainAgentActionRegistrySelfTest();
  checks.push(createDiagnosticCheck(
    "group-main-agent-action-registry",
    "群聊主 Agent 动作注册表",
    mainAgentActions.pass ? "ok" : "fail",
    mainAgentActions.pass
      ? `群聊主 Agent 已登记 ${mainAgentActions.total} 个可治理动作：只读观察、任务创建、子 Agent 派发、追问、任务治理、回执读取、重规划和最终回复均有权限边界与完成证据`
      : "群聊主 Agent 动作注册表不完整，需要补齐动作、权限门禁或完成证据",
    mainAgentActions
  ));

  const mainAgentToolLoop = runGroupMainAgentToolLoopSelfTest();
  checks.push(createDiagnosticCheck(
    "group-main-agent-tool-loop",
    "群聊主 Agent 多步工作循环",
    mainAgentToolLoop.pass ? "ok" : "fail",
    mainAgentToolLoop.pass
      ? "群聊主 Agent 已具备 decision -> action -> observation -> verify -> reply 链路模型；普通对话不派发，项目分析只读，明确任务才创建/派发，高风险治理必须显式授权"
      : "群聊主 Agent 多步工作循环自检失败，需要检查动作选择、权限判断或验收链路",
    mainAgentToolLoop
  ));

  const rehearsal = buildDailyDevWorkflowRehearsal();
  checks.push(createDiagnosticCheck(
    "daily-dev-rehearsal",
    "闭环演练",
    rehearsal.pass ? "ok" : "fail",
    rehearsal.pass
      ? "日常开发闭环演练通过：任务模板、子 Agent 回执、主 Agent 复盘、实际变更门禁、验证门禁和交付摘要均可闭合"
      : "日常开发闭环演练未通过，请先检查开发群聊、子 Agent 工作目录或完成门禁",
    {
      group: rehearsal.group,
      steps: rehearsal.steps,
      taskDocumentContext: rehearsal.task_document_context,
      noChangeResult: rehearsal.no_change_result,
      doneResult: rehearsal.done_result,
      propagatedAssignmentSummary: rehearsal.propagated_assignment_summary,
      workerNotification: rehearsal.worker_notification,
      scratchpadContext: rehearsal.scratchpad_context,
      reworkProtocol: rehearsal.rework_protocol,
      deliverySummary: rehearsal.delivery_summary,
    }
  ));

  const smokeStatus = getDailyDevSmokeStatus();
  const mainAgentCapabilityEvidence = [
    { id: "business_intake", label: "接收业务描述/文档", ok: cronDailyDevProtocol.pass, evidence: cronDailyDevProtocol.pass ? "任务级业务/接口文档会进入 daily_dev 任务" : "定时/任务入口未稳定写入业务文档" },
    { id: "configurable_project_agents", label: "读取可配置项目 Agent", ok: configs.length > 0 && groupsWithReadyMembers.length > 0, evidence: `项目配置 ${configs.length} 个，可执行开发群聊 ${groupsWithReadyMembers.length} 个` },
    { id: "coordinator_plan", label: "主 Agent 计划", ok: coordinatorProtocol.pass, evidence: coordinatorProtocol.pass ? `可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划` : "协调计划自测失败" },
    { id: "structured_dispatch", label: "结构化派发", ok: Object.values(collaborationProtocol.structuredAssignmentChecks || {}).every(Boolean), evidence: "assignments 会保留目标、任务、依赖和续跑语义" },
    { id: "worker_execution_receipt", label: "子 Agent 执行与回执", ok: workerProtocolPass, evidence: workerProtocolPass ? "task-notification、CCM_AGENT_RECEIPT 和 scratchpad 自测通过" : "Worker 通知/回执协议自测失败" },
    { id: "review_rework", label: "主 Agent 复盘返工", ok: reworkProtocol.pass, evidence: reworkProtocol.pass ? "发现缺口会生成同 Worker 续跑返工工作单" : "返工协议自测失败" },
    { id: "completion_gate", label: "完成门禁", ok: dailyDevGateSelfTest.pass, evidence: dailyDevGateSelfTest.pass ? "必须有计划、派发、Worker 通知、回执、复盘、实际变更和已执行验证" : "完成门禁自测失败" },
    { id: "workflow_rehearsal", label: "闭环演练", ok: rehearsal.pass, evidence: rehearsal.pass ? "模拟闭环可闭合" : "闭环演练失败" },
    { id: "live_execution_probe", label: "真实执行准入", ok: dailyDevExecutionReady, evidence: dailyDevExecutionReady ? `全员探针通过群聊 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total}` : matrixReadinessMessage, liveGate: true },
  ];
  const mainAgentCoreReady = mainAgentCapabilityEvidence.filter((item: any) => !item.liveGate).every((item: any) => item.ok);
  checks.push(createDiagnosticCheck(
    "main-agent-capability",
    "群聊主 Agent 实用性",
    !mainAgentCoreReady ? "fail" : (dailyDevExecutionReady ? "ok" : "warn"),
    !mainAgentCoreReady
      ? "主 Agent 日常开发闭环仍有核心协议缺口，暂不能稳定替你接开发任务"
      : (dailyDevExecutionReady
        ? "主 Agent 已具备接收业务任务、计划、派发、验收返工和总结交付的真实执行准入"
        : "主 Agent 协议闭环已具备，但真实替你干活前还需要目标开发群的项目 Agent 全员 CLI 探针通过"),
    {
      core_ready: mainAgentCoreReady,
      live_ready: dailyDevExecutionReady,
      evidence: mainAgentCapabilityEvidence,
    }
  ));

  checks.push(createDiagnosticCheck(
    "daily-dev-smoke-status",
    "真实试运行",
    smokeStatus.pass ? "ok" : (smokeStatus.status === "blocked" || smokeStatus.status === "failed" ? "warn" : "warn"),
    smokeStatus.message,
    smokeStatus
  ));

  checks.push(createDiagnosticCheck(
    "shared-docs",
    "业务文档入口",
    devGroups.some((group: any) => group.readyBacklogs > 0 || group.sharedFiles > 0) ? "ok" : "warn",
    devGroups.some((group: any) => group.readyBacklogs > 0)
      ? "已有 ready 状态的业务需求池文件，定时 daily_dev 可自动认领并派发"
      : devGroups.some((group: any) => group.sharedFiles > 0)
      ? "已有群聊共享文件，主 Agent 拆分任务时会带入文档上下文；可通过业务开发任务入口沉淀 ready 需求池"
      : "尚未上传群聊共享文件；也可以先把业务文档直接写进任务描述",
    devGroups.map((group: any) => ({
      id: group.id,
      name: group.name,
      sharedFiles: group.sharedFiles,
      backlogFiles: group.backlogFiles,
      readyBacklogs: group.readyBacklogs,
      backlogCounts: group.backlogCounts,
    }))
  ));

  const failCount = checks.filter(check => check.status === "fail").length;
  const warnCount = checks.filter(check => check.status === "warn").length;
  const readiness = failCount > 0 ? "blocked" : (warnCount > 0 ? "partial" : "ready");
  const totalReadyBacklogs = devGroups.reduce((sum: number, group: any) => sum + Number(group.readyBacklogs || 0), 0);
  const totalSharedFiles = devGroups.reduce((sum: number, group: any) => sum + Number(group.sharedFiles || 0), 0);
  const executableGroups = groupsWithReadyMembers.length;
  const continuationGapTasks = tasks.filter((task: any) => hasDailyDevContinuationGaps(task));
  const autopilotNextActions: string[] = [];
  if (!dailyDevExecutionReady) autopilotNextActions.push("先在设置页对目标开发群点击“复检全部”，至少让一个开发群聊的所有可执行项目 Agent 全员通过真实 CLI 探针");
  if (executableGroups === 0) autopilotNextActions.push("创建开发群聊，并加入至少一个具备可写工作目录的项目子 Agent");
  if (missingVerificationMembers.length > 0) autopilotNextActions.push("为缺少验证命令的项目子 Agent 配置项目验证命令，提升自动验收可靠性");
  if (continuationGapTasks.length > 0 && dailyDevExecutionReady) autopilotNextActions.push("运行一次自动开发或等待 daily_dev 定时任务，系统会优先续跑已有交付缺口任务");
  if (!smokeStatus.pass) autopilotNextActions.push(smokeStatus.status === "no_task" ? "创建真实试运行任务，验证主 Agent 到子 Agent 写文件的端到端闭环" : "查看真实试运行状态，按缺口续跑或修复执行通道后再复检");
  if (continuationGapTasks.length === 0 && totalReadyBacklogs === 0 && totalSharedFiles === 0) autopilotNextActions.push("上传 PRD、接口说明或业务描述到开发群聊，或在任务派发页创建业务开发任务");
  if (totalSharedFiles > 0 && totalReadyBacklogs === 0) autopilotNextActions.push("等待 daily_dev 定时任务自动导入共享文档，或在需求池里点击“导入共享文档”");
  if (dailyDevCronJobs.length === 0) autopilotNextActions.push("创建并启用 daily_dev 定时任务，让系统定时认领 ready 需求");
  if (totalReadyBacklogs > 0 && dailyDevExecutionReady) autopilotNextActions.push("可以批量派发可接活需求，主 Agent 会拆分给子 Agent 执行");
  if (recoveryWork.total > 0) autopilotNextActions.push("执行通道恢复后运行恢复监控，自动重试等待中的开发任务");
  if (autopilotNextActions.length === 0) autopilotNextActions.push("自动开发链路已具备接单条件：继续补充业务文档或等待定时任务触发");
  const autopilotMode = !dailyDevExecutionReady || executableGroups === 0
    ? "blocked"
    : continuationGapTasks.length > 0
      ? "ready_to_continue"
      : totalReadyBacklogs > 0
        ? "ready_to_dispatch"
        : totalSharedFiles > 0
          ? "ready_to_import"
          : "waiting_input";
  const autopilot = {
    mode: autopilotMode,
    ready: autopilotMode === "ready_to_dispatch" && dailyDevExecutionReady,
    headline: autopilotMode === "blocked"
      ? "自动开发暂不可用"
      : autopilotMode === "ready_to_continue"
        ? "已有任务可续跑"
        : autopilotMode === "ready_to_dispatch"
          ? "已有需求可派发"
          : autopilotMode === "ready_to_import"
            ? "已有业务文档待导入"
            : "等待业务输入",
    counts: {
      executableGroups,
      readyBacklogs: totalReadyBacklogs,
      sharedFiles: totalSharedFiles,
      continuationGaps: continuationGapTasks.length,
      dailyDevCronJobs: dailyDevCronJobs.length,
      queuedTasks: queueStatus.total_queued,
      recoveryWork: recoveryWork.total,
      verificationConfigured: configuredVerificationMembers.length,
      verificationInferred: inferredVerificationMembers.length,
      verificationMissing: missingVerificationMembers.length,
      agentProbeReady: agentProbeMatrix.ready,
      agentProbeExecutable: agentProbeMatrix.executable,
    },
    next_actions: autopilotNextActions.slice(0, 5),
    recent_cron: dailyDevCronJobs
      .filter((job: any) => job.last_run || job.last_result)
      .slice(0, 5)
      .map((job: any) => ({
        id: job.id,
        name: job.name,
        last_status: job.last_status || "never",
        last_result: job.last_result || "",
        last_run: job.last_run || "",
        last_run_meta: job.last_run_meta || null,
      })),
  };
  const summary = readiness === "ready"
    ? "主 Agent 日常开发闭环已具备接单条件"
    : readiness === "partial"
      ? "主 Agent 已可接单，但仍有建议完善项"
      : "主 Agent 暂不能稳定替你执行开发任务，请先处理失败项";

  return {
    success: true,
    generated_at: new Date().toISOString(),
    readiness,
    ready: readiness !== "blocked",
    summary,
    counts: {
      checks: checks.length,
      ok: checks.filter(check => check.status === "ok").length,
      warn: warnCount,
      fail: failCount,
      groups: groups.length,
      readyGroups: groupsWithReadyMembers.length,
      projectConfigs: configs.length,
      cronJobs: cronJobs.length,
      enabledCronJobs: enabledCronJobs.length,
      autoTasks: autoTasks.length,
    },
    autopilot,
    agent_probe_matrix: agentProbeMatrix,
    checks,
    groups: devGroups,
    queue_status: queueStatus,
  };
}

function getAgentProbeBatchTargets(payload: any = {}) {
  const diagnostics = buildDailyDevAgentDiagnostics();
  const includeReady = !!(payload.include_ready || payload.includeReady);
  const onlyMissing = !!(payload.only_missing || payload.onlyMissing);
  const groupId = String(payload.group_id || payload.groupId || "").trim();
  const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
  const requestedKeys = new Set(requestedTargets.map((target: any) => [
    String(target.group_id || target.groupId || "").trim(),
    String(target.target_member || target.targetMember || target.project || "").trim(),
  ].filter(Boolean).join("::")).filter(Boolean));
  const limit = Math.max(1, Math.min(20, Number(payload.limit || requestedTargets.length || 3)));
  const targets = (diagnostics.agent_probe_matrix?.targets || [])
    .filter((target: any) => target.configured && target.workDirExists && target.workDirWritable)
    .filter((target: any) => !groupId || target.group_id === groupId)
    .filter((target: any) => {
      if (requestedKeys.size === 0) return true;
      return requestedKeys.has(`${target.group_id}::${target.project}`) || requestedKeys.has(target.group_id) || requestedKeys.has(target.project);
    })
    .filter((target: any) => includeReady || !target.ready)
    .filter((target: any) => !onlyMissing || target.probeHealth?.status === "missing")
    .slice(0, limit);
  return { targets, diagnostics, limit, includeReady, onlyMissing };
}

async function runAgentCliProbeBatch(payload: any, ctx: CollabCtx) {
  const selection = getAgentProbeBatchTargets(payload);
  const timeoutMs = Number(payload.timeout_ms || payload.timeoutMs || 120000);
  const dryRun = !!(payload.dry_run || payload.dryRun);
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      total: selection.targets.length,
      passed: 0,
      failed: 0,
      skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
      limit: selection.limit,
      include_ready: selection.includeReady,
      only_missing: selection.onlyMissing,
      auto_resume: false,
      resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
      targets: selection.targets.map((target: any) => ({
        group_id: target.group_id,
        group_name: target.group_name,
        project: target.project,
        agent_type: target.agent_type,
        command: target.command,
        probe_status: target.probeHealth?.status || "missing",
      })),
      probe_matrix: selection.diagnostics.agent_probe_matrix,
      message: selection.targets.length === 0 ? "没有需要批量复检的可执行项目 Agent" : `将复检 ${selection.targets.length} 个项目 Agent`,
    };
  }
  const results: any[] = [];
  for (const target of selection.targets) {
    const result = await runAgentCliProbe({
      ...payload,
      group_id: target.group_id,
      target_member: target.project,
      timeout_ms: timeoutMs,
      source: "agent-cli-probe-batch",
    }, ctx);
    results.push({
      group_id: target.group_id,
      group_name: target.group_name,
      project: target.project,
      agent_type: target.agent_type,
      success: !!result?.success,
      blocked: !!result?.blocked,
      message: result?.message || result?.error || "",
      result,
    });
  }
  const after = buildDailyDevAgentDiagnostics();
  return {
    success: results.some((item: any) => item.success),
    total: selection.targets.length,
    passed: results.filter((item: any) => item.success).length,
    failed: results.filter((item: any) => !item.success).length,
    skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
    limit: selection.limit,
    include_ready: selection.includeReady,
    only_missing: selection.onlyMissing,
    timeout_ms: timeoutMs,
    auto_resume: false,
    resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
    results,
    probe_matrix: after.agent_probe_matrix,
    message: results.length === 0
      ? "没有需要批量复检的可执行项目 Agent"
      : `批量复检完成：通过 ${results.filter((item: any) => item.success).length}/${results.length}`,
  };
}

export interface CollabCtx {
  PORT: number;
  callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
  callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
  setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number) => void;
  broadcastPetSpeech: (agent: string, payload: any) => void;
  createFileChangeSnapshot: (workDir: string) => any;
  getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
  recordMetric: (agent: string, data: any) => void;
  toolManager: any;
  buildUploadedFilesContext: (files: any[], title?: string) => string;
  summarizeUploadedFiles: (files: any[]) => string;
  buildFilesContext: (files: any[], title?: string) => string;
  collectRequestBuffer: (req: any) => Promise<Buffer>;
  getMultipartBoundary: (contentType: string) => string;
  parseMultipart: (buffer: Buffer, boundary: string) => any;
  getSharedFilePath: (name: string) => string;
  createSharedFileRecord: (name: string, source?: string) => any;
  normalizeSharedFileList: (files: any[]) => any[];
  onTaskStatusChange?: (task: any, status: string, result?: string) => void | Promise<void>;
}

function buildCoordinatorSharedFilesContext(ctx: CollabCtx, group: any) {
  const content = ctx.buildFilesContext(
    group?.shared_files || [],
    "以下是群聊共享文档/文件（主 Agent 拆分任务时必须读取，并在子 Agent 工作单中引用相关文档、接口、字段、业务规则或验收要求）："
  );
  return content.trim() ? content : undefined;
}

function buildTaskSourceDocumentsContext(task: any) {
  const lines = [
    "[任务级业务/接口文档]",
    task?.business_goal || task?.businessGoal ? `业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 600)}` : "",
    task?.acceptance_criteria || task?.acceptanceCriteria ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 800)}` : "",
    task?.source_documents || task?.sourceDocuments ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1800)}` : "",
  ].filter(Boolean);
  return lines.length > 1 ? lines.join("\n") : "";
}

function mergeCoordinatorDocumentContexts(...contexts: any[]) {
  const text = contexts
    .map((item: any) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\n");
  return text || undefined;
}

export function runCollaborationProtocolSelfTest() {
  const reworkProtocol = getCoordinatorReworkProtocolSelfTest();
  const agentCollaborationProtocol = runAgentCollaborationProtocolSelfTest();
  const assignmentGroup = {
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "backend-service" },
      { project: "web-app" },
    ],
  };
  const structuredMentions = getCoordinatorActionMentions({
    content: "我已经形成计划，下面按结构化 assignments 派发。",
    assignments: [
      {
        project: "backend-service",
        task: "主 Agent 工作单：实现退款审核接口 POST /api/refunds/:id/audit，并返回 CCM_AGENT_RECEIPT。",
        reason: "后端负责接口契约",
      },
      {
        project: "web-app",
        task: "主 Agent 工作单：对接退款审核接口并补充页面验证，返回 CCM_AGENT_RECEIPT。",
        reason: "前端负责页面入口",
        dependsOn: "backend-service",
        rework: true,
        attempt: 2,
        continuationOf: "web-app",
        continuationStrategy: "same_worker_scratchpad",
      },
    ],
  }, assignmentGroup, "coordinator");
  const taskDocumentContext = buildTaskSourceDocumentsContext({
    business_goal: "实现订单退款审核功能",
    acceptance_criteria: "后端校验权限，前端展示审核结果，主 Agent 输出交付报告。",
    source_documents: "接口：POST /api/refunds/:id/audit\n字段：approved(boolean), reason(string)\n验收：子 Agent 回执和已执行验证。",
  });
  const mergedDocumentContext = mergeCoordinatorDocumentContexts("", taskDocumentContext);
  const taskDocumentChecks = {
    hasBusinessGoal: taskDocumentContext.includes("业务目标"),
    hasAcceptance: taskDocumentContext.includes("验收标准"),
    hasSourceDocument: taskDocumentContext.includes("/api/refunds/:id/audit"),
    mergeKeepsTaskDocument: String(mergedDocumentContext || "").includes("approved(boolean)"),
  };
  const structuredAssignmentChecks = {
    hasTwoMentions: structuredMentions.length === 2,
    preservesTarget: structuredMentions.some((item: any) => item.targetName === "backend-service"),
    preservesTask: structuredMentions.some((item: any) => String(item.message || "").includes("/api/refunds/:id/audit")),
    preservesDependency: structuredMentions.some((item: any) => item.targetName === "web-app" && item.dependsOn === "backend-service"),
    preservesContinuation: structuredMentions.some((item: any) => item.targetName === "web-app" && item.rework === true && item.attempt === 2 && item.continuationStrategy === "same_worker_scratchpad"),
  };
  const executionFixActions = buildAgentExecutionFixActions({
    error: "API Error: Unable to connect to API (ConnectionRefused)",
    agentType: "claudecode",
  });
  const executionFixChecks = {
    hasCliCheck: executionFixActions.some((item: string) => item.includes("claude --permission-mode acceptEdits -p") || item.includes("claude -p")),
    hasApiNetworkHint: executionFixActions.some((item: string) => item.includes("代理环境变量") || item.includes("API Base URL")),
    hasRetryAction: executionFixActions.some((item: string) => item.includes("复检执行通道") || item.includes("立即恢复自动任务")),
  };
  const recentFailedProbeHealth = getAgentProbeHealth({
    success: false,
    message: "API Error: Unable to connect to API (ConnectionRefused)",
    checked_at: new Date().toISOString(),
    age_ms: 1000,
  });
  const freshOkProbeHealth = getAgentProbeHealth({
    success: true,
    message: "Agent CLI 探针通过",
    checked_at: new Date().toISOString(),
    age_ms: 1000,
  });
  const readyWithoutProbe = {
    ready: true,
    mode: "node-child-process",
    message: "Node 可启动子进程",
    probeHealth: { status: "missing", successFresh: false, message: "尚未运行 Agent CLI 探针" },
  };
  const readyWithFreshProbe = {
    ...readyWithoutProbe,
    probeHealth: freshOkProbeHealth,
    probe: { success: true, age_ms: 1000, target: { group_id: "g-dev", project: "backend-service", agent_type: "claudecode" }, capabilities: { write: { pass: true } } },
  };
  const backendProbeKey = getAgentProbeTargetStatusKey({ group_id: "g-dev", project: "backend-service", agent_type: "claudecode" });
  const webProbeKey = getAgentProbeTargetStatusKey({ group_id: "g-dev", project: "web-app", agent_type: "codex" });
  const targetMatchPartial = doesProbeTargetMatchRequired(
    { group_id: "g-dev", project: "web-app", agent_type: "codex" },
    { groupId: "g-dev", project: "web-app" }
  );
  const groupProbeTargets = [
    { group_id: "g-dev", group_name: "Dev", project: "backend-service", agent_type: "claudecode" },
    { group_id: "g-dev", group_name: "Dev", project: "web-app", agent_type: "codex" },
  ];
  const groupProbeOneMissing = summarizeAgentProbeTargets(groupProbeTargets, (target: any) => {
    if (target.project === "backend-service") return { success: true, age_ms: 1000, target, capabilities: { write: { pass: true } } };
    return null;
  });
  const groupProbeAllFresh = summarizeAgentProbeTargets(groupProbeTargets, (target: any) => ({
    success: true,
    age_ms: 1000,
    target,
    capabilities: { write: { pass: true } },
  }));
  const explicitProjectDoesNotNeedGroupProbe = taskNeedsGroupWideAgentProbe({
    workflow_type: "daily_dev",
    assign_type: "project",
    group_id: "g-dev",
    workflow_meta: { target_member: "backend-service" },
  }) === false;
  const recoveryProbeGroups = buildAgentRecoveryProbeGroups([
    {
      id: "t-blocked-backend",
      auto_execute: true,
      status: "pending",
      last_queue_blocked_at: new Date().toISOString(),
      workflow_type: "daily_dev",
      group_id: "g-dev",
      workflow_meta: { target_member: "backend-service", agent_type: "claudecode" },
    },
    {
      id: "t-runtime-web",
      auto_execute: true,
      status: "failed",
      status_detail: "Agent Runner 错误: ConnectionRefused",
      workflow_type: "daily_dev",
      group_id: "g-dev",
      workflow_meta: { target_member: "web-app", agent_type: "codex" },
    },
  ]);
  const backendRecoveryGroup = recoveryProbeGroups.find((group: any) => group.probe_target?.project === "backend-service");
  const webRecoveryGroup = recoveryProbeGroups.find((group: any) => group.probe_target?.project === "web-app");
  const targetRecoveryMatch = taskMatchesAgentProbeTarget(
    { workflow_type: "daily_dev", group_id: "g-dev", workflow_meta: { target_member: "web-app" } },
    { groupId: "g-dev", project: "web-app" }
  );
  const retryProbeAfterRecentFailure = enforceAgentProbeExecutionReadiness({
    childProcess: { ok: true, stdout: "ok" },
    externalRunner: { active: false },
    probeHealth: recentFailedProbeHealth,
  });
  const runnerProbeFailure = getAgentProbeOutputFailure("[web-app] Agent Runner 错误: API Error: Unable to connect to API (ConnectionRefused)");
  const freshProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: 1000 } });
  const staleProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: AGENT_PROBE_SUCCESS_FRESH_MS + 1000 } });
  const dailyDevProbeRequired = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
  const dailyDevWatchdogGapGate = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
  const dailyDevProbePassed = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithFreshProbe);
  const dailyDevProbeTargetMismatch = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev", workflow_meta: { target_member: "web-app" } }, readyWithFreshProbe);
  const generalProbeNotRequired = enforceTaskAgentProbeReadiness({ workflow_type: "general" }, readyWithoutProbe);
  const probeHealthChecks = {
    recentFailureBlocks: recentFailedProbeHealth.failureRecent === true && recentFailedProbeHealth.status === "failed",
    freshSuccessPasses: freshOkProbeHealth.successFresh === true && freshOkProbeHealth.status === "ok",
    probeCanRetryAfterRecentFailure: retryProbeAfterRecentFailure.ready === true && retryProbeAfterRecentFailure.mode === "node-child-process-probe",
    probeFailureKeepsRunnerError: String(runnerProbeFailure.message || "").includes("ConnectionRefused") && String(runnerProbeFailure.error || "").includes("Agent Runner 错误"),
    freshProbeEnablesImmediateRecovery: freshProbeRecoveryGate === true,
    staleProbeDoesNotEnableImmediateRecovery: staleProbeRecoveryGate === false,
    dailyDevRequiresFreshProbe: dailyDevProbeRequired.ready === false && dailyDevProbeRequired.mode === "agent-cli-probe-required",
    dailyDevWatchdogGapsRequireFreshProbe: dailyDevWatchdogGapGate.ready === false && dailyDevWatchdogGapGate.mode === "agent-cli-probe-required",
    dailyDevFreshProbePasses: dailyDevProbePassed.ready === true,
    dailyDevFreshProbeMustMatchTarget: dailyDevProbeTargetMismatch.ready === false && String(dailyDevProbeTargetMismatch.message || "").includes("目标不匹配"),
    groupProbeRequiresAllMembers: groupProbeOneMissing.allReady === false && groupProbeOneMissing.ready === 1 && groupProbeOneMissing.total === 2,
    groupProbeAllMembersPass: groupProbeAllFresh.allReady === true && groupProbeAllFresh.ready === 2,
    explicitProjectBypassesGroupWideProbe: explicitProjectDoesNotNeedGroupProbe === true,
    targetProbeKeysAreIsolated: !!backendProbeKey && !!webProbeKey && backendProbeKey !== webProbeKey,
    targetProbePartialMatchWorks: targetMatchPartial === true,
    recoveryProbeGroupsAreTargeted: recoveryProbeGroups.length === 2 && !!backendRecoveryGroup && !!webRecoveryGroup,
    recoveryProbePayloadKeepsTarget: webRecoveryGroup?.probe_payload?.group_id === "g-dev" && webRecoveryGroup?.probe_payload?.target_member === "web-app",
    recoveryTargetMatchWorks: targetRecoveryMatch === true,
    generalTaskDoesNotRequireProbe: generalProbeNotRequired.ready === true,
  };
  const notifiedOutput = formatCollectedAgentOutput("backend-service", "已实现退款审核接口并运行 npm test。", {
    agent: "backend-service",
    status: "done",
    summary: "完成退款审核接口",
    actions: ["实现 POST /api/refunds/:id/audit"],
    filesChanged: ["src/refunds/audit.ts"],
    verification: ["npm test passed"],
    blockers: [],
    needs: [],
  });
  const missingReceiptOutput = formatCollectedAgentOutput("web-app", "已处理页面入口，但未提交回执。", null);
  const notificationFollowUps = buildEvidenceGateFollowUps(assignmentGroup, [missingReceiptOutput]);
  const taskNotificationChecks = {
    hasXmlEnvelope: notifiedOutput.includes("<task-notification>") && notifiedOutput.includes("</task-notification>"),
    hasTaskId: getCollectedOutputAgent(notifiedOutput) === "backend-service",
    hasCompletedStatus: extractTaskNotificationTag(notifiedOutput, "status") === "completed",
    detectsMissingReceipt: notificationFollowUps.some((item: any) => item.targetName === "web-app" && String(item.reason || "").includes("缺少结构化回执")),
  };
  const blockedDependencyOutput = formatCollectedAgentOutput("backend-service", "后端接口字段未确认，无法继续。", {
    agent: "backend-service",
    status: "blocked",
    summary: "接口字段未确认",
    actions: ["检查接口文档"],
    filesChanged: [],
    verification: [],
    blockers: ["approved 字段语义缺失"],
    needs: ["用户或后端确认字段契约"],
  });
  const doneDependencyState = getAgentDependencyStateFromOutputs("backend-service", [notifiedOutput]);
  const blockedDependencyState = getAgentDependencyStateFromOutputs("backend-service", [blockedDependencyOutput]);
  const recoveredDependencyState = getAgentDependencyStateFromOutputs("backend-service", [blockedDependencyOutput, notifiedOutput]);
  const dependencyGateChecks = {
    doneDependencyPasses: doneDependencyState.ok === true,
    blockedDependencyStopsDownstream: blockedDependencyState.ok === false && blockedDependencyState.status === "blocked",
    blockedDependencyExplainsReason: String(blockedDependencyState.reason || "").includes("接口字段未确认"),
    latestRecoveredReceiptUnblocksDownstream: recoveredDependencyState.ok === true && recoveredDependencyState.status === "done",
  };
  const notificationDeliverySummary = buildDeliverySummary({
    title: "通知摘要自测",
    workflow_type: "daily_dev",
    requires_verification: false,
  }, {
    report: notifiedOutput,
    review: { status: "complete", content: "主 Agent 已复盘通知" },
  }, "waiting");
  const notificationDeliveryChecks = {
    summaryHasWorkerNotification: notificationDeliverySummary.worker_notification_count === 1,
    summaryKeepsNotificationTaskId: notificationDeliverySummary.worker_notifications?.[0]?.task_id === "backend-service",
    summaryUsesNotificationAgent: notificationDeliverySummary.agents?.includes("backend-service"),
    userReportHidesNotificationProtocol: !String(notificationDeliverySummary.user_report || "").includes("Worker 通知"),
  };
  const failedNotificationSummary = buildDeliverySummary({
    id: "task-gap",
    title: "通知缺口续跑自测",
    workflow_type: "daily_dev",
    requires_verification: false,
  }, {
    report: formatCollectedAgentOutput("web-app", "页面入口处理失败，缺少接口字段。", {
      agent: "web-app",
      status: "blocked",
      summary: "缺少退款审核接口字段",
      actions: ["检查订单详情页入口"],
      filesChanged: [],
      verification: [],
      blockers: ["approved 字段含义未确认"],
      needs: ["后端确认字段契约"],
    }),
    review: { status: "needs_followup", content: "主 Agent 需要 web-app 继续返工" },
  }, "waiting");
  const gapTask = {
    id: "task-gap",
    title: "退款审核入口",
    workflow_type: "daily_dev",
    status: "in_progress",
    delivery_summary: failedNotificationSummary,
  };
  const gapDraft = buildTaskGapContinuationDraft(gapTask);
  const missingCoordinationTask = {
    id: "task-missing-coordination",
    title: "缺协作证据续跑自测",
    workflow_type: "daily_dev",
    status: "in_progress",
    delivery_summary: {
      status: "waiting",
      detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
      coordination_plan_count: 0,
      assignment_count: 0,
      worker_notification_count: 0,
      receipt_statuses: [{ agent: "web-app", status: "done", summary: "已完成页面改动" }],
      has_final_review: true,
      actual_file_change_count: 1,
      verification_executed: ["npm test"],
    },
  };
  const missingCoordinationDraft = buildTaskGapContinuationDraft(missingCoordinationTask);
  const gapFingerprint = getTaskGapFingerprint(gapTask);
  const attemptedGapTask = {
    ...gapTask,
    collaboration_state: { gap: { fingerprint: gapFingerprint, items: getTaskGapItems(gapTask), auto_attempts: 1 } },
  };
  const changedGapTask = {
    ...attemptedGapTask,
    delivery_summary: {
      ...failedNotificationSummary,
      blockers: [...(failedNotificationSummary.blockers || []), "新增：支付权限规则需要用户确认"],
    },
  };
  const exhaustedGapState = reconcileTaskCollaborationState(attemptedGapTask, attemptedGapTask.collaboration_state);
  const userTaskCard = buildTaskCardView({ ...attemptedGapTask, collaboration_state: exhaustedGapState }, [], []);
  const continuationGapChecks = {
    workerNotificationTriggersGap: hasDailyDevContinuationGaps(gapTask),
    draftIncludesWorkerNotification: gapDraft.includes("上一轮 Worker 通知") && gapDraft.includes("web-app"),
    draftIncludesSameWorkerStrategy: gapDraft.includes("same_worker_scratchpad") && gapDraft.includes("同 Worker 续跑目标"),
    missingCoordinationTriggersGap: hasDailyDevContinuationGaps(missingCoordinationTask),
    draftIncludesCoordinationEvidenceGap: missingCoordinationDraft.includes("需要补齐的主 Agent 协作证据")
      && missingCoordinationDraft.includes("协调计划")
      && missingCoordinationDraft.includes("派发证据")
      && missingCoordinationDraft.includes("Worker 通知"),
    firstGapCanAutoContinue: canAutoContinueTaskGaps(gapTask) === true,
    unchangedGapDoesNotLoop: canAutoContinueTaskGaps(attemptedGapTask) === false,
    changedGapAllowsNewTargetedAttempt: getTaskGapFingerprint(changedGapTask) !== gapFingerprint && canAutoContinueTaskGaps(changedGapTask) === true,
    exhaustedGapNeedsUserDecision: exhaustedGapState.phase === "needs_user" && exhaustedGapState.needs_user === true,
    automaticContinuationIsInternal: isAutomaticGapContinuationSource("watchdog_gap_rework") && !isAutomaticGapContinuationSource("user"),
    userTaskCardExplainsNextAction: userTaskCard.phase === "needs_user" && userTaskCard.blockers.length > 0 && /补充|确认/.test(String(userTaskCard.next_action)),
    userTaskCardHidesProtocolTerms: !JSON.stringify({ completed: userTaskCard.completed, blockers: userTaskCard.blockers, next_action: userTaskCard.next_action }).includes("CCM_AGENT_RECEIPT"),
  };
  const scratchpadMemory = appendWorkerLedger(createEmptyGroupMemory("selftest"), {
    taskId: "task-refund",
    project: "backend-service",
    status: "completed",
    receiptStatus: "done",
    summary: "后端确认 POST /api/refunds/:id/audit 契约",
    verification: ["npm test passed"],
  });
  const scratchpadContext = buildGroupMemoryContext(scratchpadMemory);
  const scratchpadChecks = {
    storesWorkerLedger: Array.isArray(scratchpadMemory.workerLedger) && scratchpadMemory.workerLedger.length === 1,
    contextIncludesScratchpad: scratchpadContext.includes("Worker scratchpad"),
    contextIncludesWorkerSummary: scratchpadContext.includes("/api/refunds/:id/audit"),
  };
  const qaRequiredTask = { workflow_type: "daily_dev", assign_type: "group", description: "前端必须通过 ask_agent 向后端询问接口后续跑" };
  const qaGateCheck = buildAcceptanceGate(qaRequiredTask, null, {
    coordination_plan_count: 1,
    assignment_count: 2,
    receipt_statuses: [{ status: "done" }],
    has_final_review: true,
    actual_file_change_count: 1,
    verification_executed: ["npm test"],
    verification_required_gate_passed: true,
    verification_source_gate_passed: true,
    external_runner_verification_count: 1,
    blockers: [],
    needs: [],
    agent_qa_count: 0,
    agent_qa_accepted_count: 0,
    agent_qa_resumed_count: 0,
    agent_qa_gate_passed: false,
    project_policy_gate_passed: true,
  }, "waiting");
  const agentQaRequirementChecks = {
    infersExplicitAskAgentRequirement: taskRequiresAgentQa(qaRequiredTask),
    explicitFalseDisablesRequirement: taskRequiresAgentQa({ ...qaRequiredTask, requires_agent_qa: false }) === false,
    missingQaBlocksAcceptance: qaGateCheck.checks.find((item: any) => item.id === "agent_qa")?.ok === false && qaGateCheck.pass === false,
  };
  return {
    pass: reworkProtocol.pass
      && agentCollaborationProtocol.pass
      && Object.values(taskDocumentChecks).every(Boolean)
      && Object.values(structuredAssignmentChecks).every(Boolean)
      && Object.values(executionFixChecks).every(Boolean)
      && Object.values(probeHealthChecks).every(Boolean)
      && Object.values(taskNotificationChecks).every(Boolean)
      && Object.values(dependencyGateChecks).every(Boolean)
      && Object.values(notificationDeliveryChecks).every(Boolean)
      && Object.values(continuationGapChecks).every(Boolean)
      && Object.values(scratchpadChecks).every(Boolean)
      && Object.values(agentQaRequirementChecks).every(Boolean),
    reworkProtocol,
    agentCollaborationProtocol,
    taskDocumentContextPreview: taskDocumentContext.slice(0, 600),
    taskDocumentChecks,
    structuredAssignmentChecks,
    executionFixChecks,
    executionFixActions,
    probeHealthChecks,
    taskNotificationChecks,
    dependencyGateChecks,
    notificationDeliveryChecks,
    continuationGapChecks,
    scratchpadChecks,
    agentQaRequirementChecks,
  };
}

function normalizeToolSelection(tools: any = {}) {
  return {
    mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x: any) => String(x || "").trim()).filter(Boolean) : [],
    skill: Array.isArray(tools.skill) ? tools.skill.map((x: any) => String(x || "").trim()).filter(Boolean) : [],
  };
}

function mergeToolSelections(...items: any[]) {
  const merged = { mcp: new Set<string>(), skill: new Set<string>() };
  for (const item of items) {
    const normalized = normalizeToolSelection(item);
    for (const name of normalized.mcp) merged.mcp.add(name);
    for (const name of normalized.skill) merged.skill.add(name);
  }
  return {
    mcp: Array.from(merged.mcp),
    skill: Array.from(merged.skill),
  };
}

function getProjectToolSelection(projectName: string) {
  const configs = loadProjectConfigs();
  return normalizeToolSelection(configs?.[projectName]?.tools || {});
}

function getProjectExtraConfig(projectName: string) {
  const configs = loadProjectConfigs();
  return configs?.[projectName] || {};
}

function normalizeProjectConfigList(value: any): string[] {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}

function getProjectAgentCapabilityProfile(projectName: string, workDir = "") {
  const config = getProjectExtraConfig(projectName);
  const verification = getProjectVerificationHintDetail(projectName, workDir);
  const responsibility = String(config.responsibility || config.role_scope || config.roleScope || "").trim();
  const capabilities = normalizeProjectConfigList(config.capabilities || config.capability_tags || config.capabilityTags);
  const writablePaths = normalizeProjectConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths);
  const forbiddenPaths = normalizeProjectConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths);
  const deliveryContract = String(config.delivery_contract || config.deliveryContract || "").trim();
  return {
    project: projectName,
    configured: !!(responsibility || capabilities.length || writablePaths.length || forbiddenPaths.length || deliveryContract || verification.commands.length),
    responsibility,
    capabilities,
    writable_paths: writablePaths,
    forbidden_paths: forbiddenPaths,
    delivery_contract: deliveryContract,
    verification_source: verification.source,
    verification_commands: verification.commands,
    work_dir: workDir || "",
  };
}

function buildProjectAgentProfileContractLines(profile: any) {
  if (!profile?.configured) return [];
  return [
    profile.responsibility ? `- 项目 Agent 职责范围：${compactMemoryText(profile.responsibility, 500)}` : "",
    profile.capabilities?.length ? `- 项目 Agent 能力标签：${profile.capabilities.slice(0, 12).join("；")}` : "",
    profile.writable_paths?.length ? `- 允许写入范围：${profile.writable_paths.slice(0, 12).join("；")}` : "",
    profile.forbidden_paths?.length ? `- 禁止触碰范围：${profile.forbidden_paths.slice(0, 12).join("；")}` : "",
    profile.delivery_contract ? `- 项目交付规范：${compactMemoryText(profile.delivery_contract, 700)}` : "",
    profile.work_dir ? `- 当前工作目录：${profile.work_dir}` : "",
    profile.writable_paths?.length || profile.forbidden_paths?.length
      ? "- 路径门禁：若确需越过上述范围，不能直接修改；必须在 blockers/needs 中说明并等待主 Agent 或用户确认。"
      : "",
  ].filter(Boolean);
}

function normalizePolicyPath(value: any) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function policyPathMatches(filePath: string, pattern: string) {
  const file = normalizePolicyPath(filePath);
  const raw = normalizePolicyPath(pattern);
  if (!raw || raw === "**" || raw === "**/*" || raw === "*") return true;
  const prefix = raw.replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
  return file === prefix || file.startsWith(`${prefix}/`);
}

function collectProjectPolicyViolations(actualFileChanges: any[] = [], evidenceExclusions: any[] = []) {
  const violations: any[] = [];
  const excludedPaths = new Set((evidenceExclusions || []).map((item: any) => normalizePolicyPath(typeof item === "string" ? item : item?.path)).filter(Boolean));
  for (const change of actualFileChanges || []) {
    const agent = String(change?.agent || "").trim();
    const filePath = normalizePolicyPath(change?.path);
    if (!agent || !filePath) continue;
    if (excludedPaths.has(filePath)) continue;
    const profile = getProjectAgentCapabilityProfile(agent);
    const writable = Array.isArray(profile.writable_paths) ? profile.writable_paths : [];
    const forbidden = Array.isArray(profile.forbidden_paths) ? profile.forbidden_paths : [];
    // These directories are generated by CCM while preparing native runtimes.
    // They are orchestration metadata, not an agent-authored project deliverable.
    if ([".claude", ".cursor", ".codex"].some(prefix => filePath === prefix || filePath.startsWith(`${prefix}/`))) continue;
    // Older evidence produced before the porcelain parser fix may be missing the
    // first character of a tracked path (for example `ackend/` -> `backend/`).
    // Reconcile only when it unambiguously matches a configured writable prefix.
    const repairedPath = writable.reduce((current: string, pattern: string) => {
      if (current !== filePath) return current;
      const prefix = normalizePolicyPath(pattern).replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
      if (prefix.length > 1 && (filePath === prefix.slice(1) || filePath.startsWith(`${prefix.slice(1)}/`))) {
        return `${prefix[0]}${filePath}`;
      }
      return current;
    }, filePath);
    const forbiddenMatch = forbidden.find((pattern: string) => policyPathMatches(repairedPath, pattern));
    if (forbiddenMatch) {
      violations.push({ agent, path: repairedPath, rule: "forbidden_paths", pattern: forbiddenMatch, message: `${agent} 修改了禁止范围 ${forbiddenMatch}: ${repairedPath}` });
      continue;
    }
    const hasStrictWritable = writable.length > 0 && !writable.some((pattern: string) => ["**", "**/*", "*"].includes(normalizePolicyPath(pattern)));
    if (hasStrictWritable && !writable.some((pattern: string) => policyPathMatches(repairedPath, pattern))) {
      violations.push({ agent, path: repairedPath, rule: "writable_paths", pattern: writable.join("; "), message: `${agent} 文件变更不在允许写入范围: ${repairedPath}` });
    }
  }
  return violations;
}

function buildAgentToolContext(ctx: CollabCtx, group: any, projectName: string) {
  const allowedTools = mergeToolSelections(group?.tools || {}, getProjectToolSelection(projectName));
  const prompt = ctx.toolManager.buildToolPrompt(allowedTools);
  return { prompt, allowedTools };
}

function prepareAgentRuntimeTools(
  groupId: string,
  projectName: string,
  workDir: string,
  agentType: string,
  allowedTools: any,
  streamRes: any = null
) {
  const audit = syncRuntimeTools(workDir, agentType, allowedTools);
  const level = audit.mode === "failed" || audit.missing.mcp.length || audit.missing.skill.length ? "warning" : "info";
  const missingNames = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
  const missingSuffix = missingNames.length ? `；未找到或未启用：${missingNames.join("、")}` : "";
  const warningSuffix = audit.warnings?.length ? `；${audit.warnings.join("；")}` : "";
  const summary = audit.mode === "native-and-proxy"
    ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已同步原生工具：MCP ${audit.synced.mcp.length}，Skill ${audit.synced.skill.length}${missingSuffix}${warningSuffix}`
    : audit.mode === "ccm-proxy-only"
      ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
      : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`;
  recordRuntimeToolSyncAudit(audit, projectName, groupId);
  if (groupId) safeAddGroupLog(groupId, level, "runtime-tool-sync", summary, audit);
  const workEvent = {
    id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
    time: new Date().toISOString(),
    agent: projectName,
    kind: audit.mode === "failed" ? "error" : "tool",
    text: summary,
    runtimeToolSync: audit,
  };
  if (streamRes) {
    writeSse(streamRes, { type: "agent_work_event", agent: projectName, event: workEvent });
    if (audit.mode === "failed") writeSse(streamRes, { type: "status", text: `工具同步提示：${summary}` });
  }
  return { audit, workEvent, prompt: buildRuntimeToolSyncPrompt(audit) };
}

function normalizeVerificationCommands(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map(item => item.trim()).filter(Boolean);
}

function readPackageJsonScripts(workDir: string) {
  try {
    const file = path.join(workDir, "package.json");
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
  } catch {
    return {};
  }
}

function getConfiguredProjectVerificationCommands(projectName: string) {
  const projectConfig = getProjectExtraConfig(projectName);
  return normalizeVerificationCommands(
    projectConfig.verification_commands
      || projectConfig.verificationCommands
      || projectConfig.test_commands
      || projectConfig.testCommands
      || projectConfig.check_commands
      || projectConfig.checkCommands
  );
}

function inferProjectVerificationCommands(workDir = "") {
  const dir = String(workDir || "").trim();
  if (!dir || !fs.existsSync(dir)) return [];
  const hints: string[] = [];
  const scripts = readPackageJsonScripts(dir);
  const scriptNames = Object.keys(scripts);
  const addNpmScript = (name: string) => {
    if (scriptNames.includes(name)) hints.push(`npm run ${name}`);
  };
  addNpmScript("check");
  addNpmScript("typecheck");
  addNpmScript("lint");
  addNpmScript("test");
  addNpmScript("build");
  if (fs.existsSync(path.join(dir, "pom.xml"))) hints.push("mvn test");
  if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts"))) hints.push("gradle test");
  if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml"))) hints.push("pytest");
  if (fs.existsSync(path.join(dir, "go.mod"))) hints.push("go test ./...");
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) hints.push("cargo test");
  return uniqueStrings(hints).slice(0, 6);
}

function getAgentRuntimeConsistencyStatus() {
  const runtimes = getPublicAgentRuntimes();
  const runtimeKeys = new Set<string>();
  for (const runtime of runtimes) {
    runtimeKeys.add(String(runtime.id || "").toLowerCase());
    for (const alias of runtime.aliases || []) runtimeKeys.add(String(alias || "").toLowerCase());
  }
  const agents = (AGENTS || []).map((agent: any) => ({
    type: String(agent.type || "").trim(),
    name: String(agent.name || agent.type || "").trim(),
  })).filter((agent: any) => agent.type);
  const missing = agents.filter((agent: any) => !runtimeKeys.has(agent.type.toLowerCase()));
  return {
    pass: missing.length === 0 && agents.length > 0,
    agents,
    runtimes: runtimes.map((runtime: any) => ({ id: runtime.id, aliases: runtime.aliases, commandLabel: runtime.commandLabel })),
    missing,
  };
}

function getProjectVerificationHintDetail(projectName: string, workDir = "") {
  const configured = getConfiguredProjectVerificationCommands(projectName);
  if (configured.length > 0) {
    return { source: "configured", commands: configured.slice(0, 6) };
  }
  const inferred = inferProjectVerificationCommands(workDir);
  return {
    source: inferred.length > 0 ? "inferred" : "missing",
    commands: inferred,
  };
}

function buildProjectVerificationHints(projectName: string, workDir = "") {
  return getProjectVerificationHintDetail(projectName, workDir).commands;
}

function compactFormText(value: any, fallback = "未填写") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  return text || fallback;
}

function makeDailyDevBacklogFileName(title: string) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = String(title || "requirement")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "requirement";
  return `backlog-${day}-${slug}-${crypto.randomBytes(3).toString("hex")}.md`;
}

function buildDailyDevBacklogUserQuestion(quality: any) {
  const missing = Array.isArray(quality?.missing) ? quality.missing.filter(Boolean) : [];
  if (!missing.length) return "请补充业务目标、开发范围、业务/接口文档或验收标准后再派发。";
  return `为了让主 Agent 稳定拆分并派发给子 Agent，请补充：${missing.join("、")}。`;
}

function buildDailyDevBacklogDocument(payload: any, title: string, goal: string) {
  const createdAt = new Date().toISOString();
  const quality = evaluateDailyDevIntakeQuality(payload || {}, goal || payload?.business_goal || payload?.businessGoal || "");
  const initialState = quality.pass ? "ready" : "needs_user";
  return [
    `# ${compactFormText(title, goal.slice(0, 60) || "业务开发需求")}`,
    "",
    `- 状态: ${initialState}`,
    `- 类型: daily_dev`,
    `- 优先级: ${compactFormText(payload.priority, "normal")}`,
    `- 创建时间: ${createdAt}`,
    `- 代码变更: ${payload.requires_code_changes === false || payload.requiresCodeChanges === false ? "允许无代码变更" : "必须有实际文件变更"}`,
    "",
    "## 业务目标",
    compactFormText(goal),
    "",
    "## 开发范围",
    compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
    "",
    "## 业务/接口文档",
    compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
    "",
    "## 验收标准",
    compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
    "",
    "## 约束/注意事项",
    compactFormText(payload.constraints || payload.notes, "无"),
    "",
    "## 需要用户补充",
    quality.pass ? "无" : buildDailyDevBacklogUserQuestion(quality),
    "",
    "## 主 Agent 执行要求",
    "- 读取本需求后，先判断涉及项目和子 Agent。",
    "- 拆分成可执行工作单，派发给对应子 Agent 编写代码。",
    "- 等待 CCM_AGENT_RECEIPT，并在最终报告中引用变更文件、验证结果和风险。",
  ].join("\n");
}

function persistDailyDevBacklogFile(groups: any[], group: any, payload: any, title: string, goal: string) {
  if (payload.persist_documents === false || payload.persistDocuments === false) return null;
  if (!group.shared_files) group.shared_files = [];
  const name = makeDailyDevBacklogFileName(title || goal);
  const quality = evaluateDailyDevIntakeQuality(payload || {}, goal || payload?.business_goal || payload?.businessGoal || "");
  const initialState = quality.pass ? "ready" : "needs_user";
  const content = buildDailyDevBacklogDocument(payload, title, goal);
  const record = {
    name,
    type: "text",
    readable: true,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: "daily_dev_backlog",
    status: initialState,
    needs_user_question: initialState === "needs_user" ? buildDailyDevBacklogUserQuestion(quality) : "",
    state_history: [{
      state: initialState,
      reason: initialState === "ready" ? "需求信息足够，等待主 Agent 认领" : "需求信息不足，等待用户补充",
      actor: "system",
      at: new Date().toISOString(),
    }],
  };
  group.shared_files.push(record);
  saveGroups(groups);
  return { name, content, status: initialState };
}
function readDailyDevBacklogStatus(file: any) {
  const explicit = String(file?.status || "").trim().toLowerCase();
  if (explicit) return explicit;
  const match = String(file?.content || "").match(/^\s*-\s*状态\s*:\s*([^\n\r]+)/mi);
  return String(match?.[1] || "").trim().toLowerCase();
}

function readDailyDevBacklogPriority(file: any) {
  const explicit = String(file?.priority || "").trim().toLowerCase();
  const match = String(file?.content || "").match(/^\s*-\s*优先级\s*:\s*([^\n\r]+)/mi);
  const priority = explicit || String(match?.[1] || "normal").trim().toLowerCase();
  return PRIORITY_WEIGHT[priority] ? priority : "normal";
}
const DAILY_DEV_BACKLOG_STATES = ["draft", "needs_user", "ready", "planned", "dispatched", "running", "reviewing", "blocked", "failed", "done"];

function normalizeDailyDevBacklogState(status: any) {
  const value = String(status || "").trim().toLowerCase();
  if (DAILY_DEV_BACKLOG_STATES.includes(value)) return value;
  if (value === "queued") return "dispatched";
  if (value === "in_progress") return "running";
  return value || "draft";
}
function dailyDevBacklogStateLabel(state: string) {
  return ({
    draft: "草稿",
    needs_user: "待补充",
    ready: "可接活",
    planned: "已计划",
    dispatched: "已派发",
    running: "执行中",
    reviewing: "验收中",
    blocked: "阻塞",
    failed: "失败",
    done: "完成",
  } as any)[state] || state || "未知";
}

function appendDailyDevBacklogHistory(file: any, state: string, reason = "", actor = "system") {
  if (!file) return;
  const history = Array.isArray(file.state_history) ? file.state_history : [];
  const last = history[history.length - 1];
  if (last?.state === state && last?.reason === reason) return;
  file.state_history = [...history, {
    state,
    reason: String(reason || "").slice(0, 500),
    actor,
    at: new Date().toISOString(),
  }].slice(-30);
}

function inferDailyDevBacklogInitialState(payload: any, goal: string) {
  const quality = evaluateDailyDevIntakeQuality(payload || {}, goal || payload?.business_goal || payload?.businessGoal || "");
  return quality.pass ? "ready" : "needs_user";
}

function getDailyDevBacklogTask(file: any) {
  const taskId = String(file?.task_id || "").trim();
  if (!taskId) return null;
  return loadTasks().find((task: any) => task.id === taskId) || null;
}

function getDailyDevBacklogQuality(file: any) {
  const payload = extractDailyDevBacklogPayload(file);
  return evaluateDailyDevIntakeQuality(payload, payload.business_goal || "");
}

function buildDailyDevBacklogStateCard(file: any, group: any) {
  const rawStatus = readDailyDevBacklogStatus(file) || "draft";
  const task = getDailyDevBacklogTask(file);
  const quality = getDailyDevBacklogQuality(file);
  let state = normalizeDailyDevBacklogState(rawStatus);
  let owner = "用户";
  let nextAction = "补充业务目标、范围、文档或验收标准";
  let blocker = "";
  let questionToUser = String(file?.needs_user_question || "");
  const evidence: string[] = [];

  if (!quality.pass && !task && !["blocked", "failed", "done"].includes(state)) {
    state = "needs_user";
    blocker = quality.missing.join("；");
    questionToUser = questionToUser || buildDailyDevBacklogUserQuestion(quality);
  }

  if (task) {
    owner = task.target_project || "主 Agent";
    evidence.push(`关联任务 ${task.id}`);
    const summary = task.delivery_summary || {};
    const phase = getTaskExecutionPhase(task);
    if (task.status === "done") {
      state = "done";
      nextAction = "查看交付报告或发起新需求";
      if (summary.has_final_review) evidence.push("主 Agent 已复盘");
      if (summary.actual_file_change_count) evidence.push(`实际变更 ${summary.actual_file_change_count} 个`);
      if (summary.verification_executed?.length) evidence.push(`已验证 ${summary.verification_executed.length} 项`);
    } else if (task.status === "failed") {
      state = "failed";
      owner = "主 Agent / 用户";
      nextAction = "点击重试或按阻塞项继续";
      blocker = task.status_detail || task.result || file.last_result || "任务执行失败";
    } else if (phase === "blocked" || taskNeedsUserIntervention(task)) {
      state = "blocked";
      owner = "用户 / 系统恢复";
      nextAction = "按阻塞项补充信息或复检执行通道";
      blocker = task.status_detail || (summary.blockers || summary.needs || [])[0] || file.last_result || "等待人工处理";
    } else if (task.status === "in_progress") {
      state = summary.has_final_review || summary.receipt_statuses?.length ? "reviewing" : "running";
      owner = state === "reviewing" ? "主 Agent" : "子 Agent";
      nextAction = state === "reviewing" ? "等待主 Agent 汇总验收" : "等待子 Agent 执行并返回回执";
    } else if (isTaskQueuedInMemory(task.id)) {
      state = "dispatched";
      owner = "任务队列";
      nextAction = "等待队列调度主 Agent";
    } else {
      state = "planned";
      owner = "主 Agent";
      nextAction = "加入队列或等待定时接活调度";
    }
  } else if (state === "ready") {
    owner = "主 Agent";
    nextAction = dailyDevGroupCanDispatch(group?.id || "") ? "等待自动接活，或点击立即派发" : "先修复群聊/项目 Agent 配置";
  } else if (state === "dispatched" || rawStatus === "queued") {
    owner = "主 Agent";
    nextAction = "等待任务创建或队列恢复";
  } else if (state === "blocked") {
    owner = "用户";
    nextAction = "补充信息后恢复为 ready";
    blocker = file.last_result || "需求被标记阻塞";
  } else if (state === "failed") {
    owner = "用户 / 主 Agent";
    nextAction = "恢复为 ready 后重派";
    blocker = file.last_result || "需求处理失败";
  }

  return {
    state,
    raw_status: rawStatus,
    owner,
    next_action: nextAction,
    blocker,
    question_to_user: questionToUser,
    quality,
    evidence,
    history: Array.isArray(file.state_history) ? file.state_history : [],
  };
}

function isDailyDevBacklogFile(file: any) {
  const content = String(file?.content || "");
  return file?.category === "daily_dev_backlog"
    || /^backlog-[\w-]+\.md$/i.test(String(file?.name || ""))
    || /类型\s*:\s*daily_dev/i.test(content);
}

function extractMarkdownSection(content: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "mi");
  return String(content.match(pattern)?.[1] || "").trim();
}

function replaceBacklogStatusLine(content: string, status: string) {
  const line = `- 状态: ${status}`;
  if (/^\s*-\s*状态\s*:/mi.test(content)) {
    return content.replace(/^\s*-\s*状态\s*:[^\n\r]*/mi, line);
  }
  return `${line}\n${content}`;
}

function extractDailyDevBacklogPayload(file: any) {
  const content = String(file?.content || "");
  const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file?.name || "业务开发需求").trim();
  const businessGoal = extractMarkdownSection(content, "业务目标") || title;
  const acceptance = extractMarkdownSection(content, "验收标准");
  const documents = [
    `群聊需求池文件：${file.name}`,
    content,
  ].filter(Boolean).join("\n\n");
  return {
    title,
    business_goal: businessGoal,
    scope: extractMarkdownSection(content, "开发范围"),
    documents,
    acceptance,
    constraints: extractMarkdownSection(content, "约束/注意事项"),
    priority: readDailyDevBacklogPriority(file),
    requires_code_changes: !/代码变更\s*:\s*允许无代码变更/i.test(content),
    backlog_file: file.name,
  };
}

function isImportableDailyDevSourceFile(file: any, options: any = {}) {
  if (!file || file.readable === false || isDailyDevBacklogFile(file)) return false;
  if (!options.force && file.daily_dev_imported_backlog) return false;
  const content = String(file.content || "").trim();
  if (content.length < 20) return false;
  const name = String(file.name || "");
  return /\.(md|markdown|txt|prd|json|yaml|yml)$/i.test(name) || file.type === "text" || file.type === "markdown";
}

function firstUsefulParagraph(content: string, max = 600) {
  const cleaned = String(content || "")
    .split(/\n{2,}/)
    .map(part => part.replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s*/gm, "").trim())
    .find(Boolean) || "";
  return compactFormText(cleaned.slice(0, max), "");
}

function buildDailyDevPayloadFromSharedFile(file: any, group: any, options: any = {}) {
  const content = String(file.content || "").trim();
  const heading = String(content.match(/^#\s+(.+)$/m)?.[1] || "").trim();
  const title = compactFormText(options.title || heading || file.name, "共享文档业务需求").replace(/\.(md|markdown|txt|prd|json|yaml|yml)$/i, "");
  const goal = extractMarkdownSection(content, "业务目标")
    || extractMarkdownSection(content, "目标")
    || firstUsefulParagraph(content, 500)
    || title;
  return {
    title,
    business_goal: goal,
    scope: extractMarkdownSection(content, "开发范围") || extractMarkdownSection(content, "范围") || "由主 Agent 根据源共享文档判断涉及项目和改动范围。",
    documents: [`源共享文档：${file.name}`, `所属开发群聊：${group?.name || group?.id || "未命名群聊"}`, content].join("\n\n"),
    acceptance: extractMarkdownSection(content, "验收标准")
      || extractMarkdownSection(content, "验收")
      || "主 Agent 最终报告必须说明完成内容、涉及文件、验证结果、风险和仍需补充事项。",
    constraints: extractMarkdownSection(content, "约束/注意事项") || extractMarkdownSection(content, "约束") || "",
    priority: options.priority || readDailyDevBacklogPriority(file) || "normal",
    requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
  };
}

export function importSharedDocsToDailyDevBacklog(options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const groups = loadGroups();
  const imported: any[] = [];
  const skipped: any[] = [];

  for (const group of groups.filter((item: any) => !groupId || item.id === groupId)) {
    const files = Array.isArray(group.shared_files) ? group.shared_files : [];
    for (const file of files) {
      if (imported.length >= limit) break;
      if (!isImportableDailyDevSourceFile(file, options)) {
        if (file && !isDailyDevBacklogFile(file)) skipped.push({ group_id: group.id, name: file.name, reason: file.daily_dev_imported_backlog ? "已导入" : "不可导入" });
        continue;
      }
      const payload = buildDailyDevPayloadFromSharedFile(file, group, options);
      const backlog = persistDailyDevBacklogFile(groups, group, payload, payload.title, payload.business_goal);
      if (!backlog) {
        skipped.push({ group_id: group.id, name: file.name, reason: "未启用需求池写入" });
        continue;
      }
      const now = new Date().toISOString();
      file.daily_dev_imported_backlog = backlog.name;
      file.daily_dev_imported_at = now;
      file.daily_dev_import_status = "imported";
      file.updated_at = now;
      imported.push({ group_id: group.id, group_name: group.name || group.id, source: file.name, backlog: backlog.name, title: payload.title });
    }
  }

  saveGroups(groups);
  return {
    success: true,
    imported: imported.length,
    skipped: skipped.length,
    items: imported,
    skipped_items: skipped.slice(0, 20),
    counts: listDailyDevBacklogs(groupId).reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function claimReadyDailyDevBacklog(groupId: string, claim: any = {}) {
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;
  const files = Array.isArray(group.shared_files) ? group.shared_files : [];
  const candidates = files
    .map((file: any, index: number) => ({ file, index }))
    .filter(({ file }: any) => file?.readable !== false && isDailyDevBacklogFile(file) && readDailyDevBacklogStatus(file) === "ready")
    .sort((a: any, b: any) => {
      const pa = PRIORITY_WEIGHT[readDailyDevBacklogPriority(a.file)] || 2;
      const pb = PRIORITY_WEIGHT[readDailyDevBacklogPriority(b.file)] || 2;
      if (pa !== pb) return pb - pa;
      return Date.parse(a.file.created_at || a.file.updated_at || "") - Date.parse(b.file.created_at || b.file.updated_at || "");
    });
  const selected = candidates[0];
  if (!selected) return null;

  const file = files[selected.index];
  const now = new Date().toISOString();
  file.status = "planned";
  file.claimed_at = now;
  file.claimed_by = claim.source || "daily_dev_cron";
  file.claimed_by_cron_job_id = claim.cron_job_id || null;
  file.updated_at = now;
  appendDailyDevBacklogHistory(file, "planned", "定时任务已认领，准备创建主 Agent 任务", claim.source || "daily_dev_cron");
  file.content = replaceBacklogStatusLine(String(file.content || ""), "planned");
  saveGroups(groups);
  return extractDailyDevBacklogPayload(file);
}

export function markDailyDevBacklogStatus(groupId: string, fileName: string, status: string, meta: any = {}) {
  if (!groupId || !fileName) return null;
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group || !Array.isArray(group.shared_files)) return null;
  const file = group.shared_files.find((item: any) => item?.name === fileName);
  if (!file) return null;
  const now = new Date().toISOString();
  const nextState = normalizeDailyDevBacklogState(status);
  file.status = nextState;
  file.updated_at = now;
  if (meta.task_id) file.task_id = meta.task_id;
  if (meta.result) file.last_result = String(meta.result).slice(0, 800);
  if (nextState === "done") file.completed_at = now;
  if (nextState === "blocked" || nextState === "failed" || nextState === "needs_user") file.blocked_at = now;
  appendDailyDevBacklogHistory(file, nextState, meta.result || meta.reason || `状态变更为 ${nextState}`, meta.actor || "system");
  file.content = replaceBacklogStatusLine(String(file.content || ""), nextState);
  saveGroups(groups);
  return file;
}

function listDailyDevBacklogs(groupId = "") {
  const groups = loadGroups();
  return groups
    .filter((group: any) => !groupId || group.id === groupId)
    .flatMap((group: any) => {
      const files = Array.isArray(group.shared_files) ? group.shared_files : [];
      return files
        .filter((file: any) => isDailyDevBacklogFile(file))
        .map((file: any) => {
          const content = String(file.content || "");
          const title = String(content.match(/^#\s+(.+)$/m)?.[1] || file.name || "业务开发需求").trim();
          const stateCard = buildDailyDevBacklogStateCard(file, group);
          return {
            group_id: group.id,
            group_name: group.name || group.id,
            name: file.name,
            title,
            status: stateCard.state,
            raw_status: stateCard.raw_status,
            state: stateCard.state,
            state_label: dailyDevBacklogStateLabel(stateCard.state),
            owner: stateCard.owner,
            next_action: stateCard.next_action,
            blocker: stateCard.blocker,
            question_to_user: stateCard.question_to_user,
            quality: stateCard.quality,
            evidence: stateCard.evidence,
            state_history: stateCard.history,
            priority: readDailyDevBacklogPriority(file),
            task_id: file.task_id || null,
            claimed_by_cron_job_id: file.claimed_by_cron_job_id || null,
            created_at: file.created_at || "",
            updated_at: file.updated_at || "",
            claimed_at: file.claimed_at || "",
            completed_at: file.completed_at || "",
            blocked_at: file.blocked_at || "",
            last_result: file.last_result || "",
            business_goal: extractMarkdownSection(content, "业务目标") || title,
          };
        });
    })
    .sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = { needs_user: 0, ready: 1, planned: 2, dispatched: 3, running: 4, reviewing: 5, blocked: 6, failed: 7, done: 8, draft: 9, queued: 3, in_progress: 4 };
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      const pa = PRIORITY_WEIGHT[a.priority] || 2;
      const pb = PRIORITY_WEIGHT[b.priority] || 2;
      if (pa !== pb) return pb - pa;
      return Date.parse(a.created_at || a.updated_at || "") - Date.parse(b.created_at || b.updated_at || "");
    });
}

function dailyDevGroupCanDispatch(groupId: string) {
  try {
    const group = loadGroups().find(g => g.id === groupId);
    if (!group) return false;
    validateDailyDevGroupReady(group);
    return true;
  } catch {
    return false;
  }
}

function dispatchDailyDevBacklog(groupId: string, fileName: string, ctx: CollabCtx, options: any = {}) {
  const groups = loadGroups();
  const group = groups.find(g => g.id === groupId);
  if (!group || !Array.isArray(group.shared_files)) {
    return { success: false, status: 404, error: "开发群聊或需求池不存在" };
  }
  let groupReadiness: any = null;
  try {
    groupReadiness = validateDailyDevGroupReady(group);
  } catch (e: any) {
    return { success: false, status: 409, error: e.message };
  }
  const file = group.shared_files.find((item: any) => item?.name === fileName);
  if (!file || !isDailyDevBacklogFile(file)) {
    return { success: false, status: 404, error: "需求池文件不存在" };
  }
  const currentStatus = readDailyDevBacklogStatus(file);
  if (currentStatus === "done") {
    return { success: false, status: 409, error: "已完成需求不能重新派发，请先恢复为 ready" };
  }
  if (["queued", "planned", "dispatched", "in_progress", "running", "reviewing"].includes(currentStatus) && file.task_id && !options.force) {
    return { success: false, status: 409, error: "需求已经关联执行任务，如需重派请先恢复为 ready" };
  }

  const payload = extractDailyDevBacklogPayload(file);
  const now = new Date().toISOString();
  file.status = "planned";
  file.claimed_at = now;
  file.claimed_by = options.source || "manual_backlog_dispatch";
  file.updated_at = now;
  appendDailyDevBacklogHistory(file, "planned", "需求已被认领，正在创建主 Agent 任务", options.source || "manual_backlog_dispatch");
  file.content = replaceBacklogStatusLine(String(file.content || ""), "planned");
  saveGroups(groups);

  try {
    const taskPayload = { ...payload, documents: payload.documents, source_documents: payload.documents };
    const task = createTask({
      title: payload.title,
      description: buildDailyDevTaskDescription(taskPayload),
      target_project: groupReadiness.coordinator.project,
      group_id: groupId,
      assign_type: "group",
      priority: payload.priority || "normal",
      auto_execute: options.auto_execute !== false && options.autoExecute !== false,
      workflow_type: "daily_dev",
      requires_code_changes: payload.requires_code_changes !== false,
      requires_verification: true,
      business_goal: payload.business_goal,
      acceptance_criteria: payload.acceptance || "",
      source_documents: payload.documents,
      workflow_meta: {
        ...(options.workflow_meta || options.workflowMeta || {}),
        intake: {
          backlog_file: payload.backlog_file,
          source: "manual-backlog-dispatch",
          dispatched_at: now,
        },
      },
    });
    file.task_id = task.id;
    file.status = "dispatched";
    file.last_result = "已由用户从需求池立即派发给主 Agent";
    file.updated_at = new Date().toISOString();
    appendDailyDevBacklogHistory(file, "dispatched", "已创建主 Agent 任务并交给队列", options.source || "manual_backlog_dispatch");
    file.content = replaceBacklogStatusLine(String(file.content || ""), "dispatched");
    saveGroups(groups);

    let queueResult = null;
    if (task.auto_execute) {
      queueResult = enqueueTask(task.id, ctx);
      if (queueResult?.blocked) {
        markDailyDevBacklogStatus(groupId, fileName, "dispatched", {
          task_id: task.id,
          result: queueResult.message || "任务已创建，等待执行通道恢复",
        });
      }
    }
    return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
  } catch (e: any) {
    markDailyDevBacklogStatus(groupId, fileName, "ready", {
      result: `立即派发失败，已恢复为 ready：${e.message}`,
    });
    return { success: false, status: 400, error: e.message };
  }
}

function dispatchReadyDailyDevBacklogs(ctx: CollabCtx, options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const candidates = listDailyDevBacklogs(groupId)
    .filter((item: any) => item.status === "ready")
    .filter((item: any) => !options.only_executable_groups || dailyDevGroupCanDispatch(item.group_id))
    .slice(0, limit);

  const results = candidates.map((item: any) => {
    const result = dispatchDailyDevBacklog(item.group_id, item.name, ctx, {
      auto_execute: autoExecute,
      source: "bulk-backlog-dispatch",
      workflow_meta: {
        bulk_dispatch: {
          source: "daily-dev-backlog-bulk",
          requested_at: new Date().toISOString(),
        },
      },
    });
    return {
      group_id: item.group_id,
      group_name: item.group_name,
      name: item.name,
      title: item.title,
      priority: item.priority,
      ...result,
    };
  });

  return {
    success: true,
    total_candidates: candidates.length,
    dispatched: results.filter((item: any) => item.success).length,
    queued: results.filter((item: any) => item.queued).length,
    failed: results.filter((item: any) => !item.success).length,
    auto_execute: autoExecute,
    limit,
    results,
    items: listDailyDevBacklogs(groupId),
    queue_status: getQueueStatus(),
  };
}

function runDailyDevAutopilotOnce(ctx: CollabCtx, options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const gapContinueLimit = Math.max(1, Math.min(50, Number(options.gap_continue_limit || options.gapContinueLimit || 5)));
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const dailyDevExecutionReadiness = getAgentExecutionReadiness();
  const canAutoExecuteDailyDev = !autoExecute || dailyDevExecutionReadiness.ready === true;
  const gapContinueResult = !canAutoExecuteDailyDev
    ? { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
    : options.continue_gaps === false || options.continueGaps === false
    ? { success: true, total_candidates: 0, continued: 0, queued: 0, blocked: 0, failed: 0, results: [] }
    : continueDailyDevTasksFromGaps(ctx, {
      group_id: groupId,
      limit: gapContinueLimit,
      auto_execute: autoExecute,
      max_per_task: options.max_gap_continue_per_task || options.maxGapContinuePerTask || 3,
    });
  const shouldImport = options.import_shared_docs !== false && options.importSharedDocs !== false;
  const importResult = shouldImport
    ? importSharedDocsToDailyDevBacklog({
      group_id: groupId,
      limit,
      force: !!options.force_import || !!options.forceImport,
      priority: options.priority || "normal",
      requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
    })
    : { success: true, imported: 0, skipped: 0, items: [], skipped_items: [], counts: {} };
  const dispatchResult = canAutoExecuteDailyDev
    ? dispatchReadyDailyDevBacklogs(ctx, {
      group_id: groupId,
      limit,
      auto_execute: autoExecute,
      only_executable_groups: options.only_executable_groups !== false && options.onlyExecutableGroups !== false,
    })
    : { success: true, skipped: true, skip_reason: dailyDevExecutionReadiness.message, dispatched: 0, queued: 0, failed: 0, results: [], items: listDailyDevBacklogs(groupId), queue_status: getQueueStatus() };
  const diagnostics = buildDailyDevAgentDiagnostics();
  const blockedItems = [
    ...(gapContinueResult.results || []).filter((item: any) => item.queue_result?.blocked),
    ...(dispatchResult.results || []).filter((item: any) => item.queue_result?.blocked),
  ];
  const failedItems = [
    ...(gapContinueResult.results || []).filter((item: any) => !item.success),
    ...(dispatchResult.results || []).filter((item: any) => !item.success),
  ];
  const readyBacklogCount = listDailyDevBacklogs(groupId).filter((item: any) => item.status === "ready").length;
  const continuationGapCount = loadTasks().filter((task: any) => (!groupId || task.group_id === groupId) && hasDailyDevContinuationGaps(task)).length;
  const hasPendingDailyDevWork = readyBacklogCount > 0 || importResult.imported > 0 || continuationGapCount > 0;
  const outcomeStatus = (!canAutoExecuteDailyDev && autoExecute && hasPendingDailyDevWork) || blockedItems.length > 0
    ? "waiting_execution"
    : failedItems.length > 0
      ? "partial_failure"
      : gapContinueResult.queued > 0
        ? "continued"
        : dispatchResult.queued > 0
          ? "queued"
          : dispatchResult.dispatched > 0
            ? "created"
            : (importResult.imported > 0 ? "imported" : "idle");
  const blockedMessage = blockedItems[0]?.queue_result?.message || (!canAutoExecuteDailyDev ? dailyDevExecutionReadiness.message : "");
  const nextActions = outcomeStatus === "waiting_execution"
    ? ["先点击“复检执行通道”并让 Agent CLI 真实探针通过，系统会再派发或恢复 daily_dev 任务", blockedMessage].filter(Boolean)
    : outcomeStatus === "idle"
      ? ["上传业务文档到开发群聊，或在任务派发页创建业务开发任务"]
      : diagnostics.autopilot?.next_actions || [];
  return {
    success: true,
    outcome: {
      status: outcomeStatus,
      message: outcomeStatus === "waiting_execution"
        ? (!canAutoExecuteDailyDev
          ? `已有 ${readyBacklogCount} 个 ready 需求、${continuationGapCount} 个续跑缺口等待执行准入；请先复检 Agent CLI`
          : `已有 ${gapContinueResult.continued || 0} 个续跑任务、${dispatchResult.dispatched || 0} 个新任务等待执行，但执行通道阻塞`)
        : outcomeStatus === "continued"
          ? `已按交付缺口续跑 ${gapContinueResult.continued || 0} 个任务，入队 ${gapContinueResult.queued || 0} 个`
        : outcomeStatus === "queued"
          ? `已派发 ${dispatchResult.dispatched || 0} 条需求，入队 ${dispatchResult.queued || 0} 条`
          : outcomeStatus === "created"
            ? `已创建 ${dispatchResult.dispatched || 0} 个任务，等待队列处理`
            : outcomeStatus === "imported"
              ? `已导入 ${importResult.imported || 0} 份共享文档，等待下一轮派发`
              : "没有新的共享文档或 ready 需求",
      blocked: outcomeStatus === "waiting_execution",
      next_actions: nextActions.slice(0, 4),
    },
    continued: gapContinueResult.continued || 0,
    gap_queued: gapContinueResult.queued || 0,
    imported: importResult.imported || 0,
    import_skipped: importResult.skipped || 0,
    dispatched: dispatchResult.dispatched || 0,
    queued: dispatchResult.queued || 0,
    failed: (gapContinueResult.failed || 0) + (dispatchResult.failed || 0),
    gap_continue_result: gapContinueResult,
    import_result: importResult,
    dispatch_result: dispatchResult,
    autopilot: diagnostics.autopilot,
    execution_readiness: dailyDevExecutionReadiness,
    can_auto_execute_daily_dev: canAutoExecuteDailyDev,
    ready_backlog_count: readyBacklogCount,
    continuation_gap_count: continuationGapCount,
    has_pending_daily_dev_work: hasPendingDailyDevWork,
    queue_status: getQueueStatus(),
  };
}

const DEFAULT_DAILY_DEV_CRON_PROMPT = [
  "请按日常开发主 Agent 工作流执行：",
  "1. 优先续跑已有 daily_dev 任务的交付缺口，再检查群聊共享文档和 ready backlog。",
  "2. 先理解业务目标、接口/字段、影响范围和验收标准，再拆给对应项目子 Agent 开发。",
  "3. 子 Agent 必须修改代码后返回 CCM_AGENT_RECEIPT，说明动作、文件、验证和阻塞点。",
  "4. 主 Agent 必须等待回执并复盘；发现缺口时继续返工或说明需要用户补充的信息。",
  "5. 最终报告要包含完成内容、涉及项目/文件、验证结果、风险和下一步。"
].join("\n");

function isDailyDevCronJobForGroup(job: any, groupId: string) {
  return (job?.target_type === "group" || job?.group_id)
    && job?.group_id === groupId
    && (job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);
}

function ensureDailyDevAutopilotCronJobs(options: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const jobs = loadCronJobs();
  const now = new Date().toISOString();
  const schedule = String(options.schedule || "*/30 * * * *").trim();
  const limit = Math.max(1, Math.min(100, Number(options.limit || groups.length || 1)));
  const backlogBatchLimit = Math.max(1, Math.min(20, Number(options.backlog_batch_limit || options.backlogBatchLimit || 3)));
  const gapContinueLimit = Math.max(1, Math.min(20, Number(options.gap_continue_limit || options.gapContinueLimit || 3)));
  const enableExisting = options.enable_existing !== false && options.enableExisting !== false;
  const created: any[] = [];
  const existing: any[] = [];
  const enabled: any[] = [];
  const skipped: any[] = [];

  for (const group of groups) {
    if (created.length >= limit) break;
    const readiness = getReadyDailyDevMembers(group, configs);
    const groupName = readiness.normalizedGroup?.name || readiness.normalizedGroup?.id || group.id;
    if (!readiness.normalizedGroup || readiness.normalizedGroup.orchestrator?.enabled === false || readiness.readyMembers.length === 0) {
      skipped.push({
        group_id: group.id,
        group_name: groupName,
        reason: readiness.readyMembers.length === 0 ? "没有可写工作目录的子 Agent" : "群聊主 Agent 未启用",
      });
      continue;
    }
    const found = jobs.find((job: any) => isDailyDevCronJobForGroup(job, readiness.normalizedGroup.id));
    if (found) {
      if (found.enabled === false && enableExisting) {
        found.enabled = true;
        found.updated_at = now;
        found.next_run = found.next_run || null;
        enabled.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name });
      } else {
        existing.push({ id: found.id, group_id: readiness.normalizedGroup.id, name: found.name, enabled: found.enabled !== false });
      }
      continue;
    }
    const job = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: `日常业务开发 - ${groupName}`,
      target_type: "group",
      workflow_type: "daily_dev",
      requires_code_changes: options.requires_code_changes !== false && options.requiresCodeChanges !== false,
      project: "",
      group_id: readiness.normalizedGroup.id,
      schedule,
      prompt: String(options.prompt || DEFAULT_DAILY_DEV_CRON_PROMPT).trim(),
      priority: options.priority || "normal",
      backlog_batch_limit: backlogBatchLimit,
      import_shared_docs: options.import_shared_docs !== false && options.importSharedDocs !== false,
      continue_gaps: options.continue_gaps !== false && options.continueGaps !== false,
      gap_continue_limit: gapContinueLimit,
      enabled: true,
      created_at: now,
      updated_at: now,
      created_by: "daily_dev_autopilot_ensure",
      last_run: null,
      last_run_key: null,
      last_status: "never",
      last_result: "",
      last_task_id: null,
      run_count: 0,
      next_run: null,
    };
    jobs.push(job);
    created.push({
      id: job.id,
      name: job.name,
      group_id: job.group_id,
      group_name: groupName,
      schedule: job.schedule,
      ready_members: readiness.readyMembers.map((member: any) => member.project),
    });
  }

  if (created.length > 0 || enabled.length > 0) saveCronJobs(jobs);
  return {
    success: true,
    created: created.length,
    enabled: enabled.length,
    existing: existing.length,
    skipped: skipped.length,
    schedule,
    created_jobs: created,
    enabled_jobs: enabled,
    existing_jobs: existing,
    skipped_groups: skipped,
    jobs: loadCronJobs(),
  };
}

function buildDailyDevTaskDescription(payload: any) {
  const requiresCodeChanges = payload.requires_code_changes !== false && payload.requiresCodeChanges !== false;
  const planMode = payload.plan_mode || payload.planMode || null;
  const planLines = planMode ? [
    "",
    "执行前只读探索（Plan Mode）：",
    compactFormText(planMode.read_only_exploration?.summary || "已进入只读探索，执行前不得修改文件。"),
    "",
    "影响范围预判：",
    [
      Array.isArray(planMode.impact_scope?.projects) && planMode.impact_scope.projects.length ? `项目：${planMode.impact_scope.projects.join("、")}` : "",
      Array.isArray(planMode.impact_scope?.areas) && planMode.impact_scope.areas.length ? `区域：${planMode.impact_scope.areas.join("、")}` : "",
      planMode.impact_scope?.multi_agent ? "需要多 Agent 协作或至少由主 Agent 统一验收。" : "可由主 Agent 判断是否需要派发子 Agent。",
    ].filter(Boolean).join("\n") || "由主 Agent 只读探索后继续收敛。",
    "",
    "风险与权限边界：",
    [
      planMode.risk?.summary ? `风险：${planMode.risk.summary}` : "",
      ...(Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries.map((item: any) => `- ${item}`) : []),
    ].filter(Boolean).join("\n") || "无额外权限边界。",
    "",
    "子 Agent 工作单要求：",
    (Array.isArray(planMode.sub_agent_work_order_requirements) ? planMode.sub_agent_work_order_requirements : []).map((item: any) => `- ${item}`).join("\n") || "- 工作单必须自包含目标、背景、边界、验收标准和回执格式。",
    "",
    "会话续跑策略：",
    planMode.session_strategy?.native_resume_first
      ? "优先复用 native session；任务完成并通过主 Agent 最终验收前，不得销毁任务级会话。native 不可用时使用 scratchpad 注入上轮回执、未完成 Todo 和验收缺口继续。"
      : "任务完成并通过主 Agent 最终验收前，必须保留可恢复上下文。",
  ] : [];
  const lines = [
    "业务目标：",
    compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description),
    "",
    "开发范围：",
    compactFormText(payload.scope || payload.development_scope || payload.developmentScope),
    "",
    "业务/接口文档：",
    compactFormText(payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments),
    "",
    "验收标准：",
    compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria),
    "",
    "约束/注意事项：",
    compactFormText(payload.constraints || payload.notes, "无"),
    "",
    "代码变更要求：",
    requiresCodeChanges
      ? "必须产生实际代码/配置/文档文件变更；系统会用执行前后的工作区差异作为完成门禁。"
      : "本任务允许不产生代码变更，但仍必须说明调研、验证或方案产出。",
    "",
    "验证证据要求：",
    "必须至少提供一条可采信的已执行验证记录，例如实际运行的构建、类型检查、测试、lint、接口自测或人工核验结果；只写建议运行、未运行或失败验证不能完成。",
    "",
    "主 Agent 执行要求：",
    "- 先理解业务目标和文档，再判断需要哪些子 Agent 参与。",
    "- 把任务拆成可执行工作单，派给对应项目子 Agent 编写或修改代码。",
    "- 子 Agent 必须返回 CCM_AGENT_RECEIPT，说明修改文件、执行动作、验证方式和阻塞点。",
    requiresCodeChanges
      ? "- 这是开发交付任务；如果没有实际文件变更，不允许把任务判定为完成。"
      : "- 如无需改代码，必须在最终报告中说明原因和可验收产出。",
    "- 主 Agent 必须等待子 Agent 回执并复盘；发现缺口时继续追问或返工，不能提前宣布完成。",
    "- 最终报告要说明完成内容、涉及项目/文件、已执行验证、风险和仍需用户确认的事项。",
    ...planLines,
  ];
  return lines.join("\n");
}

function evaluateDailyDevIntakeQuality(payload: any, goal: string) {
  const textLen = (value: any) => String(value || "").replace(/\s+/g, " ").trim().length;
  const scope = payload.scope || payload.development_scope || payload.developmentScope;
  const documents = payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments;
  const acceptance = payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria;
  const checks = [
    { key: "business_goal", ok: textLen(goal) >= 8, label: "业务目标至少说明要解决什么问题" },
    { key: "scope", ok: textLen(scope) >= 8, label: "开发范围需要说明涉及页面、接口、模块或权限等边界" },
    { key: "documents", ok: textLen(documents) >= 12, label: "业务/接口文档需要包含字段、规则、链接或共享文件说明" },
    { key: "acceptance", ok: textLen(acceptance) >= 8, label: "验收标准需要说明主 Agent 最终必须证明什么" },
  ];
  const passed = checks.filter(item => item.ok).map(item => item.key);
  const missing = checks.filter(item => !item.ok).map(item => item.label);
  const pass = checks[0].ok && checks[3].ok && (checks[1].ok || checks[2].ok);
  return {
    pass,
    score: passed.length,
    total: checks.length,
    passed,
    missing,
    message: pass
      ? "业务需求信息足够创建日常开发任务"
      : "业务需求信息不足，主 Agent 可能无法稳定拆分给子 Agent",
  };
}

function buildTaskContinuationBlock(message: string) {
  return [
    "",
    "---",
    "",
    `用户补充说明（${new Date().toISOString()}）：`,
    compactFormText(message),
    "",
    "继续执行要求：",
    "- 主 Agent 必须结合原始任务和本次补充说明继续推进。",
    "- 如果此前有阻塞、缺口或返工项，优先用补充说明消解后再派发子 Agent。",
    "- 不要丢弃已有任务上下文、回执和验收标准；最终报告需要覆盖完整任务。"
  ].join("\n");
}

function createTask(task: any) {
  const tasks = loadTasks();
  const idempotencyKey = String(task.idempotency_key || task.idempotencyKey || "").trim();
  if (idempotencyKey) {
    const existing = tasks.find((item: any) => String(item.idempotency_key || "") === idempotencyKey);
    if (existing) return existing;
  }
  const semanticGoal = compactFormText(task.business_goal || task.businessGoal || task.description || task.title, "").toLowerCase().replace(/\s+/g, " ");
  const semanticTarget = [task.group_id || task.groupId || "", task.target_project || task.targetProject || "", task.workflow_type || task.workflowType || "general"].join("|").toLowerCase();
  if (semanticGoal && task.allow_duplicate !== true && task.allowDuplicate !== true) {
    const duplicate = [...tasks].reverse().find((item: any) => {
      if (item.archived || item.deleted_at || ["done", "cancelled", "archived", "failed"].includes(String(item.status || ""))) return false;
      if (Date.now() - Date.parse(item.created_at || "") > 5 * 60 * 1000) return false;
      const itemGoal = compactFormText(item.business_goal || item.description || item.title, "").toLowerCase().replace(/\s+/g, " ");
      const itemTarget = [item.group_id || "", item.target_project || "", item.workflow_type || "general"].join("|").toLowerCase();
      return itemGoal === semanticGoal && itemTarget === semanticTarget;
    });
    if (duplicate) return { ...duplicate, deduplicated: true, duplicate_reason: "5 分钟内已存在相同目标与执行范围的活动任务" };
  }
  const traceId = ensureTraceId(task.trace_id || task.traceId, "task");
  const newTask = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: task.title,
    description: task.description || "",
    target_project: task.target_project,
    group_id: task.group_id || null,
    assign_type: task.assign_type || "project",
    status: "pending",
    priority: task.priority || "normal",
    auto_execute: !!(task.auto_execute || task.autoExecute),
    workflow_type: task.workflow_type || task.workflowType || "general",
    business_goal: task.business_goal || task.businessGoal || "",
    acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || "",
    source_documents: task.source_documents || task.sourceDocuments || "",
    source_attachments: Array.isArray(task.source_attachments || task.sourceAttachments)
      ? (task.source_attachments || task.sourceAttachments)
      : [],
    requires_code_changes: task.requires_code_changes ?? task.requiresCodeChanges ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
    requires_verification: task.requires_verification ?? task.requiresVerification ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
    requires_agent_qa: task.requires_agent_qa ?? task.requiresAgentQa ?? false,
    workflow_meta: task.workflow_meta || task.workflowMeta || null,
    parent_task_id: task.parent_task_id || task.parentTaskId || null,
    global_mission_id: task.global_mission_id || task.globalMissionId || null,
    mission_target: task.mission_target || task.missionTarget || null,
    mission_dependencies: Array.isArray(task.mission_dependencies || task.missionDependencies)
      ? (task.mission_dependencies || task.missionDependencies)
      : [],
    child_task_ids: Array.isArray(task.child_task_ids || task.childTaskIds) ? (task.child_task_ids || task.childTaskIds) : [],
    mission_plan: task.mission_plan || task.missionPlan || null,
    followups: Array.isArray(task.followups) ? task.followups : [],
    intake_state: task.intake_state || task.intakeState || null,
    intake_draft: task.intake_draft || task.intakeDraft || null,
    cron_job_id: task.cron_job_id || null,
    cron_trigger: task.cron_trigger || null,
    trace_id: traceId,
    idempotency_key: idempotencyKey || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  appendTraceEvent(traceId, { id: `task:${newTask.id}:created`, type: "task.created", status: "ok", task_id: newTask.id, group_id: newTask.group_id || "", agent: newTask.target_project || "", message: newTask.title, data: { workflow_type: newTask.workflow_type, assign_type: newTask.assign_type, idempotency_key: idempotencyKey ? "present" : "absent" } });
  return newTask;
}

function classifyTaskContinuation(message: string) {
  const text = String(message || "").trim();
  if (/(?:这是|作为|创建|开始).{0,10}(?:新任务|另一个任务)|与当前任务无关|另外一个项目/i.test(text)) return "new_task";
  if (/(?:目标|需求|方案).{0,12}(?:改成|调整为|替换为)|不要.{0,30}(?:改为|改成)|以.+为准/i.test(text)) return "revise_goal";
  return "supplement";
}

function looksLikeTaskContinuation(message: string) {
  return /^(?:再|还要|还需要|另外补充|补充|继续|接着|顺便|刚才|上面|这个任务|把它)|(?:改成|调整为|再加|再补|继续修改|基于刚才)/i.test(String(message || "").trim());
}

function getGlobalMissionChildDeliveryEvidence(task: any) {
  const executions = task?.id ? listExecutions({ taskId: task.id }) : [];
  const worktrees = executions.filter((item: any) => item?.workspace?.mode === "worktree");
  const unmerged = worktrees.filter((item: any) => !item?.workspace?.mergedAt || !item?.workspace?.mergeCommit);
  return {
    execution_count: executions.length,
    execution_states: executions.map((item: any) => ({
      execution_id: item.id,
      agent: item.agent || item.project || "",
      state: item.state || "",
      green_level: item.green?.level || "none",
      green_passed: item.green?.pass === true,
      workspace_mode: item.workspace?.mode || "shared",
      merge_status: item.workspace?.mode === "worktree"
        ? (item.workspace?.mergedAt && item.workspace?.mergeCommit ? "merged" : "merge_pending")
        : "not_required",
      merge_commit: item.workspace?.mergeCommit || "",
    })),
    merge_required: worktrees.length > 0,
    merge_passed: unmerged.length === 0,
    merge_pending_execution_ids: unmerged.map((item: any) => item.id),
    merge_commits: worktrees.map((item: any) => item.workspace?.mergeCommit).filter(Boolean),
  };
}

function globalMissionChildGatePassed(task: any) {
  if (!task || task.status !== "done") return false;
  const summary = task.delivery_summary || {};
  const evidence = getGlobalMissionChildDeliveryEvidence(task);
  if (!evidence.merge_passed) return false;
  if (task.assign_type === "group") return summary.acceptance_gate_passed === true;
  const requiresCode = taskRequiresCodeChanges(task);
  const requiresVerification = taskRequiresVerification(task);
  const actualChanges = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
  const executedVerification = Number(summary.verification_executed?.length || 0);
  const failedVerification = Number(summary.verification_failed?.length || 0);
  if (requiresCode && actualChanges <= 0) return false;
  if (requiresVerification && executedVerification <= 0) return false;
  if (failedVerification > 0 || summary.verification_required_gate_passed === false || (requiresVerification && summary.verification_source_gate_passed !== true)) return false;
  return true;
}

function refreshGlobalMissionParentInTaskList(tasks: any[], parentId: string) {
  if (!parentId) return null;
  const parent = tasks.find((item: any) => item.id === parentId && item.workflow_type === "global_mission");
  if (!parent) return null;
  const children = tasks.filter((item: any) => item.parent_task_id === parentId);
  const rows = children.map((child: any) => ({
    ...getGlobalMissionChildDeliveryEvidence(child),
    task_id: child.id,
    title: child.title,
    target_type: child.mission_target?.type || child.assign_type,
    target: child.mission_target?.name || child.group_id || child.target_project || "",
    status: child.status,
    status_detail: child.status_detail || child.result || "",
    gate_passed: globalMissionChildGatePassed(child),
    actual_file_change_count: Number(child.delivery_summary?.actual_file_change_count || child.file_changes?.count || 0),
    actual_file_changes: Array.isArray(child.delivery_summary?.actual_file_changes)
      ? child.delivery_summary.actual_file_changes.map((item: any) => ({
        ...(item || {}),
        project: item?.project || item?.target_project || child.target_project || child.mission_target?.name || "",
      }))
      : [],
    verification_count: Number(child.delivery_summary?.verification_executed?.length || 0),
    receipt_status: child.receipt?.status || "",
    blockers: [
      ...(Array.isArray(child.delivery_summary?.blockers) ? child.delivery_summary.blockers : []),
      ...(Array.isArray(child.delivery_summary?.needs) ? child.delivery_summary.needs : []),
    ],
  }));
  const completed = rows.filter((item: any) => item.status === "done").length;
  const passed = rows.filter((item: any) => item.gate_passed).length;
  const failed = rows.filter((item: any) => item.status === "failed").length;
  const blocked = rows.filter((item: any) => item.status === "failed" || item.blockers.length > 0 || (item.status === "done" && !item.gate_passed)).length;
  const allPassed = rows.length > 0 && passed === rows.length;
  const now = new Date().toISOString();
  const actualFileChanges = rows
    .flatMap((row: any) => Array.isArray(row.actual_file_changes) ? row.actual_file_changes : [])
    .filter((item: any) => item?.path);
  const controlMode = parent.supervisor_control?.mode || "automatic";
  const cancelled = parent.status === "cancelled";
  parent.status = allPassed ? "done" : cancelled ? "cancelled" : "in_progress";
  parent.status_detail = allPassed
    ? "所有群聊主 Agent和项目 Agent子任务均已通过交付门禁"
    : cancelled
      ? (parent.status_detail || "全局任务已取消")
      : controlMode === "manual"
        ? "全局任务已由用户人工接管"
        : controlMode === "paused"
          ? "全局任务监工已暂停"
    : failed > 0
      ? `${failed} 个子任务执行失败，等待全局 Agent重试或用户干预`
      : blocked > 0
        ? `${blocked} 个子任务存在验收缺口或阻塞`
        : `跨项目任务执行中：${completed}/${rows.length} 已完成`;
  parent.mission_summary = {
    total: rows.length,
    completed,
    passed,
    failed,
    blocked,
    pending: rows.length - completed - failed,
    all_passed: allPassed,
    children: rows,
    updated_at: now,
  };
  parent.delivery_summary = {
    headline: allPassed ? "全局开发任务已完成并通过全部门禁" : "全局开发任务仍在执行或验收中",
    global_mission: true,
    child_tasks: rows,
    actual_file_changes: actualFileChanges,
    actual_file_change_count: actualFileChanges.length,
    child_task_count: rows.length,
    completed_count: completed,
    passed_count: passed,
    failed_count: failed,
    blocked_count: blocked,
    acceptance_gate_passed: allPassed,
    generated_at: now,
  };
  parent.updated_at = now;
  if (allPassed) parent.completed_at = parent.completed_at || now;
  else if (!cancelled) delete parent.completed_at;
  return parent;
}

function updateTask(id: string, updates: any) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const previousStatus = tasks[idx].status;
  const previousReceiptKey = String(tasks[idx].receipt_idempotency_key || "");
  const previousCollaborationState = tasks[idx].collaboration_state || {};
  tasks[idx].trace_id = ensureTraceId(tasks[idx].trace_id || updates.trace_id || updates.traceId, "task");
  if (updates.receipt) {
    updates.receipt_idempotency_key = crypto.createHash("sha256").update(JSON.stringify(updates.receipt)).digest("hex");
  }
  Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
  if (updates.delivery_summary && typeof updates.delivery_summary === "object") {
    tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
  } else if (updates.status === "done" || updates.status === "cancelled") {
    tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
  } else if (updates.collaboration_state && typeof updates.collaboration_state === "object") {
    tasks[idx].collaboration_state = { ...previousCollaborationState, ...updates.collaboration_state, updated_at: new Date().toISOString() };
  }
  tasks[idx].lifecycle = deriveTaskLifecycle(tasks[idx], listExecutions({ taskId: id }));
  if (updates.status === "done") {
    tasks[idx].completed_at = updates.completed_at || new Date().toISOString();
  } else if (updates.status && updates.status !== "done") {
    delete tasks[idx].completed_at;
  }
  if (tasks[idx].parent_task_id) {
    refreshGlobalMissionParentInTaskList(tasks, tasks[idx].parent_task_id);
  }
  saveTasks(tasks);
  if (updates.status && updates.status !== previousStatus) {
    appendTraceEvent(tasks[idx].trace_id, { id: `task:${id}:status:${updates.status}:${tasks[idx].updated_at}`, type: "task.status_changed", status: updates.status === "failed" ? "error" : updates.status === "done" ? "ok" : "info", task_id: id, group_id: tasks[idx].group_id || "", agent: tasks[idx].target_project || "", message: `${previousStatus || "unknown"} → ${updates.status}`, data: { from: previousStatus || "", to: updates.status, detail: String(updates.status_detail || updates.result || "").slice(0, 500) } });
  }
  if (updates.receipt && updates.receipt_idempotency_key !== previousReceiptKey) {
    appendTraceEvent(tasks[idx].trace_id, { id: `task:${id}:receipt:${updates.receipt_idempotency_key}`, type: "worker.receipt_persisted", status: updates.receipt.status === "done" ? "ok" : updates.receipt.status === "failed" ? "error" : "warning", task_id: id, group_id: tasks[idx].group_id || "", agent: updates.receipt.agent || tasks[idx].target_project || "", message: updates.receipt.summary || `回执状态 ${updates.receipt.status || "unknown"}`, data: { receipt_status: updates.receipt.status || "", filesChanged: updates.receipt.filesChanged || [], verification: updates.receipt.verification || [] } });
  }
  return tasks[idx];
}

export function refreshGlobalDevelopmentMissions() {
  const tasks = loadTasks();
  const parents = tasks.filter((item: any) => item.workflow_type === "global_mission");
  for (const parent of parents) refreshGlobalMissionParentInTaskList(tasks, parent.id);
  saveTasks(tasks);
  return parents.map((parent: any) => tasks.find((item: any) => item.id === parent.id));
}

export function getGlobalDevelopmentMission(id: string) {
  refreshGlobalDevelopmentMissions();
  const tasks = loadTasks();
  const mission = tasks.find((item: any) => item.id === id && item.workflow_type === "global_mission");
  if (!mission) return null;
  return {
    mission,
    children: tasks.filter((item: any) => item.parent_task_id === id),
  };
}

function getMissionDependencyRefs(task: any) {
  const value = task?.mission_dependencies || task?.mission_target?.depends_on || task?.mission_target?.dependsOn || [];
  return (Array.isArray(value) ? value : [value]).map((item: any) => String(item || "").trim()).filter(Boolean);
}

function missionChildMatchesRef(task: any, ref: string) {
  const target = task?.mission_target || {};
  return [task?.id, target.name, target.project, target.group_id, task?.target_project, task?.group_id]
    .filter(Boolean)
    .some(value => String(value).toLowerCase() === String(ref).toLowerCase());
}

function removeTaskFromQueues(taskId: string) {
  let removed = 0;
  for (const queue of taskQueues.values()) {
    let index = queue.indexOf(taskId);
    while (index >= 0) {
      queue.splice(index, 1);
      removed++;
      index = queue.indexOf(taskId);
    }
  }
  runningTaskIds.delete(taskId);
  return removed;
}

export function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options: any = {}) {
  const initial = getGlobalDevelopmentMission(id);
  if (!initial) return { success: false, error: "全局任务不存在", terminal: true };
  const maxAttempts = Math.max(1, Math.min(20, Number(options.max_attempts || options.maxAttempts || 3)));
  const staleMs = Math.max(30_000, Number(options.stale_ms || options.staleMs || TASK_WATCHDOG_STALE_MS));
  const autoMerge = options.auto_merge !== false && options.autoMerge !== false;
  const actions: any[] = [];
  const waitingUser: any[] = [];
  const childByRef = (ref: string) => initial.children.find((item: any) => missionChildMatchesRef(item, ref));
  const dependencyGraph = new Map(initial.children.map((child: any) => [child.id, getMissionDependencyRefs(child).map(ref => childByRef(ref)?.id).filter(Boolean)]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();
  const visit = (taskId: string, stack: string[] = []) => {
    if (visiting.has(taskId)) {
      const start = stack.indexOf(taskId);
      for (const idInCycle of stack.slice(Math.max(0, start))) cyclic.add(idInCycle);
      cyclic.add(taskId);
      return;
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependencyId of dependencyGraph.get(taskId) || []) visit(dependencyId, [...stack, taskId]);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const child of initial.children) visit(child.id);

  for (const child of initial.children) {
    if (cyclic.has(child.id)) {
      waitingUser.push({ task_id: child.id, reason: "检测到循环依赖，需要用户修改目标依赖或人工接管" });
      actions.push({ type: "dependency_cycle", task_id: child.id, dependencies: dependencyGraph.get(child.id) || [] });
      continue;
    }
    const dependencyRefs = getMissionDependencyRefs(child);
    const dependencies = dependencyRefs.map(ref => ({ ref, task: childByRef(ref) }));
    const unknownDependencies = dependencies.filter(item => !item.task).map(item => item.ref);
    const blockingDependencies = dependencies.filter(item => item.task && !globalMissionChildGatePassed(item.task));
    if (unknownDependencies.length > 0) {
      waitingUser.push({ task_id: child.id, reason: `找不到前置依赖：${unknownDependencies.join("、")}` });
      actions.push({ type: "dependency_invalid", task_id: child.id, dependencies: unknownDependencies });
      continue;
    }
    if (blockingDependencies.length > 0) {
      actions.push({ type: "dependency_wait", task_id: child.id, dependencies: blockingDependencies.map(item => item.task.id) });
      continue;
    }

    const attempts = Math.max(Number(child.retry_count || 0), Number(child.auto_gap_continue_count || 0));
    if (child.status === "done") {
      const evidence = getGlobalMissionChildDeliveryEvidence(child);
      if (evidence.merge_required && !evidence.merge_passed && autoMerge) {
        for (const executionId of evidence.merge_pending_execution_ids) {
          try {
            const result = mergeExecutionWorktree(executionId, {
              commit: true,
              message: `chore: 合并全局任务 ${id} 的交付变更`,
            });
            actions.push({ type: "worktree_merged", task_id: child.id, execution_id: executionId, result });
          } catch (error: any) {
            if (attempts >= maxAttempts) {
              waitingUser.push({ task_id: child.id, reason: `自动合并失败且已达到返工上限：${error?.message || error}` });
              actions.push({ type: "merge_failed", task_id: child.id, execution_id: executionId, error: error?.message || String(error) });
            } else {
              const message = `全局 Agent 最终合并失败：${error?.message || error}。请调查跨 Agent 冲突，在原任务会话中解决冲突、重新运行验证并提交完整结构化回执。`;
              const result = continueTaskWithMessage(child.id, message, ctx, {
                source: "mission_supervisor_gap_rework",
                auto_execute: true,
                idempotency_key: `${id}:merge:${executionId}:${attempts + 1}`,
                status_detail: "全局 Agent 检测到合并冲突，已按缺口返工",
              });
              actions.push({ type: "merge_conflict_rework", task_id: child.id, execution_id: executionId, result: { success: result.success, queued: result.queued }, error: error?.message || String(error) });
            }
          }
        }
      } else if (!globalMissionChildGatePassed(child)) {
        if (attempts >= maxAttempts) {
          waitingUser.push({ task_id: child.id, reason: "交付门禁未通过且已达到自动返工上限" });
        } else {
          const result = continueTaskWithMessage(child.id, buildTaskGapContinuationDraft(child), ctx, {
            source: "mission_supervisor_gap_rework",
            auto_execute: true,
            idempotency_key: `${id}:gate:${child.id}:${attempts + 1}`,
            status_detail: "全局 Agent 检测到交付证据缺口，已自动返工",
          });
          actions.push({ type: "gate_gap_rework", task_id: child.id, result: { success: result.success, queued: result.queued } });
        }
      }
      continue;
    }

    if (child.status === "failed") {
      if (attempts >= maxAttempts) {
        waitingUser.push({ task_id: child.id, reason: child.status_detail || child.result || "子任务失败且已达到自动重试上限" });
      } else {
        const runtimeFailure = isRecoverableRuntimeFailure(child);
        const result = runtimeFailure
          ? retryTask(child.id, ctx, `全局任务 ${id} 监工检测到执行器异常，恢复原生会话或切换执行器后重试`, true)
          : continueTaskWithMessage(child.id, `全局 Agent 检测到本轮失败：${child.status_detail || child.result || "未知失败"}。请先调查根因，只针对失败缺口返工，保留已完成成果，重新运行相关验证并提交结构化回执。`, ctx, {
              source: "mission_supervisor_failure_rework",
              auto_execute: true,
              idempotency_key: `${id}:failure:${child.id}:${attempts + 1}`,
              status_detail: "全局 Agent 已按失败根因要求自动返工",
            });
        actions.push({ type: runtimeFailure ? "runtime_recovery" : "failure_rework", task_id: child.id, result: { success: result.success, queued: result.queued } });
      }
      continue;
    }

    if (child.status === "cancelled") {
      waitingUser.push({ task_id: child.id, reason: "子任务已取消" });
      continue;
    }

    if (child.status === "pending" && !isTaskQueuedInMemory(child.id) && !runningTaskIds.has(child.id)) {
      if (child.auto_execute === false) {
        waitingUser.push({ task_id: child.id, reason: "子任务配置为手动启动，等待用户确认派发" });
        actions.push({ type: "manual_dispatch_required", task_id: child.id });
        continue;
      }
      const result = enqueueTask(child.id, ctx);
      actions.push({ type: dependencyRefs.length ? "dependency_released" : "queue_recovered", task_id: child.id, result });
      continue;
    }

    if (child.status === "in_progress" && !runningTaskIds.has(child.id) && getTaskAgeMs(child) >= staleMs) {
      if (attempts >= maxAttempts) {
        waitingUser.push({ task_id: child.id, reason: "子任务执行超时且已达到恢复上限" });
      } else {
        const result = retryTask(child.id, ctx, `全局任务 ${id} 监工检测到执行中断或超时`, true);
        actions.push({ type: "stalled_recovery", task_id: child.id, result: { success: result.success, queued: result.queued } });
      }
    }
  }

  const current = getGlobalDevelopmentMission(id)!;
  const summary = current.mission.mission_summary || {};
  const terminal = summary.all_passed === true;
  if (actions.length > 0 || terminal || waitingUser.length > 0) {
    appendTraceEvent(current.mission.trace_id, {
      id: `mission:${id}:supervisor:${Date.now()}`,
      type: terminal ? "mission.delivery_completed" : "mission.supervisor_cycle",
      status: terminal ? "ok" : waitingUser.length ? "warning" : "info",
      task_id: id,
      message: terminal ? "全局任务全部交付门禁通过" : `监工执行 ${actions.length} 个动作，${waitingUser.length} 项需要人工处理`,
      data: { actions, waiting_user: waitingUser, summary },
    });
  }
  return {
    success: true,
    mission: current.mission,
    children: current.children,
    terminal,
    waiting_user: waitingUser,
    actions,
  };
}

export async function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload: any = {}) {
  const current = getGlobalDevelopmentMission(id);
  if (!current) return { success: false, status: 404, error: "全局任务不存在" };
  const op = String(operation || "").toLowerCase();
  const now = new Date().toISOString();
  if (!["pause", "resume", "cancel", "takeover", "update_goal"].includes(op)) {
    return { success: false, status: 400, error: `不支持的全局任务操作：${operation}` };
  }

  if (op === "update_goal") {
    const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal, current.mission.business_goal || current.mission.description || "");
    const acceptance = compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria, current.mission.acceptance_criteria || "");
    updateTask(id, { business_goal: goal, description: goal, acceptance_criteria: acceptance, status_detail: "用户已修改全局目标，监工将按新目标继续" });
    for (const child of current.children) {
      if (["cancelled"].includes(child.status)) continue;
      const followup = `全局目标已修改：${goal}\n新的验收标准：${acceptance || "沿用原标准"}`;
      updateTask(child.id, {
        business_goal: goal,
        acceptance_criteria: acceptance,
        description: `${child.description || ""}${buildTaskContinuationBlock(followup)}`,
        followups: [...(Array.isArray(child.followups) ? child.followups : []), { time: now, message: followup, source: "mission_supervisor_goal_update" }],
      });
    }
  } else if (op === "cancel") {
    for (const child of current.children) {
      if (["done", "cancelled"].includes(child.status)) continue;
      removeTaskFromQueues(child.id);
      const reason = compactFormText(payload.reason, "用户取消全局任务");
      requestTaskCancellation(child.id, reason, String(payload.actor || "global-agent"));
      const running = runningTaskIds.has(child.id);
      updateTask(child.id, { status: running ? "in_progress" : "cancelled", status_detail: running ? "全局任务取消请求已发送，正在终止执行" : "随全局任务取消", cancellation_requested_at: now, cancellation_reason: reason });
      await ctx.onTaskStatusChange?.(child, running ? "cancelling" : "cancelled", reason);
    }
    updateTask(id, { status: "cancelled", status_detail: compactFormText(payload.reason, "全局任务已取消"), cancelled_at: now });
  } else {
    const paused = op === "pause" || op === "takeover";
    for (const child of current.children) {
      if (["done", "cancelled"].includes(child.status)) continue;
      updateTask(child.id, { is_paused: paused, paused, status_detail: paused ? (op === "takeover" ? "已转为人工接管" : "全局监工已暂停后续调度") : "全局监工已恢复调度" });
      if (paused) removeTaskFromQueues(child.id);
    }
    updateTask(id, {
      is_paused: paused,
      paused,
      supervisor_control: { mode: op === "takeover" ? "manual" : paused ? "paused" : "automatic", updated_at: now, actor: payload.actor || "user" },
      status_detail: op === "takeover" ? "用户已人工接管，自动监工停止操作" : paused ? "全局任务监工已暂停" : "全局任务监工已恢复",
    });
  }
  return { success: true, operation: op, ...getGlobalDevelopmentMission(id) };
}

export function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx) {
  const missionIdempotencyKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
  if (missionIdempotencyKey) {
    const existingParent = loadTasks().find((item: any) => item.workflow_type === "global_mission" && item.idempotency_key === missionIdempotencyKey);
    if (existingParent) {
      const taskMap = new Map(loadTasks().map((item: any) => [item.id, item]));
      return { success: true, duplicate: true, mission: existingParent, children: (existingParent.child_task_ids || []).map((id: string) => ({ task: taskMap.get(id) })).filter((item: any) => item.task), rejected: [] };
    }
  }
  const missionTraceId = ensureTraceId(payload.trace_id || payload.traceId, "mission");
  const groups = loadGroups();
  const configs = getConfigs();
  const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
  const fallbackTarget = groups[0]
    ? [{ type: "group", group_id: groups[0].id, reason: "未明确目标，交由默认开发群聊主 Agent分析" }]
    : configs[0]
      ? [{ type: "project", project: configs[0].name, reason: "未明确目标，交由默认项目 Agent分析" }]
      : [];
  const targets = (requestedTargets.length > 0 ? requestedTargets : fallbackTarget)
    .map((item: any) => ({
      ...item,
      type: String(item.type || item.target_type || (item.group_id || item.groupId ? "group" : "project")).toLowerCase(),
      group_id: item.group_id || item.groupId || "",
      project: item.project || item.project_name || item.projectName || "",
      task: item.task || item.instructions || item.message || "",
      reason: item.reason || "",
    }));

  const resolved: any[] = [];
  const rejected: any[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (target.type === "group") {
      const group = groups.find((item: any) => item.id === target.group_id || item.name === target.group_id);
      if (!group) {
        rejected.push({ target, reason: "群聊不存在" });
        continue;
      }
      let readiness: any;
      try {
        readiness = validateDailyDevGroupReady(group);
      } catch (error: any) {
        rejected.push({ target, reason: error.message });
        continue;
      }
      const key = `group:${group.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({
        ...target,
        type: "group",
        group_id: group.id,
        name: group.name || group.id,
        coordinator: readiness.coordinator.project,
      });
      continue;
    }
    const config = configs.find((item: any) => item.name === target.project);
    if (!config) {
      rejected.push({ target, reason: "项目不存在" });
      continue;
    }
    const key = `project:${config.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push({ ...target, type: "project", project: config.name, name: config.name });
  }
  if (resolved.length === 0) {
    throw new Error(rejected[0]?.reason || "没有可分派的群聊主 Agent或项目 Agent");
  }

  const title = compactFormText(payload.title, compactFormText(payload.business_goal || payload.businessGoal, "全局开发任务").slice(0, 80));
  const businessGoal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || title, title);
  const acceptance = compactFormText(
    payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria,
    "所有子任务必须完成实际代码变更和已执行验证；群聊主 Agent与项目 Agent交付门禁全部通过后，全局 Agent才能报告完成。"
  );
  const sourceDocuments = compactFormText(payload.documents || payload.source_documents || payload.sourceDocuments, "");
  const sourceAttachments = Array.isArray(payload.source_attachments || payload.sourceAttachments)
    ? (payload.source_attachments || payload.sourceAttachments)
    : [];
  const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
  const parent = createTask({
    title,
    description: businessGoal,
    target_project: "global-agent",
    assign_type: "global",
    priority: payload.priority || "normal",
    auto_execute: false,
    workflow_type: "global_mission",
    business_goal: businessGoal,
    acceptance_criteria: acceptance,
    source_documents: sourceDocuments,
    source_attachments: sourceAttachments,
    requires_code_changes: resolved.some((item: any) => item.requires_code_changes !== false),
    requires_verification: true,
    mission_plan: {
      execution_order: payload.execution_order || payload.executionOrder || "parallel",
      targets: resolved,
      rejected,
      created_at: new Date().toISOString(),
    },
    workflow_meta: {
      intake: {
        source: payload.source || "global-agent",
        created_at: new Date().toISOString(),
        attachment_count: sourceAttachments.length,
      },
      global_control: {
        owner_agent: "global-agent",
        state: "dispatching",
      },
    },
    trace_id: missionTraceId,
    idempotency_key: missionIdempotencyKey || null,
  });
  appendTaskTimelineEvent(parent.id, {
    type: "global_mission_plan",
    title: "全局 Agent生成跨项目总计划",
    detail: `已识别 ${resolved.length} 个执行目标`,
    status: "active",
    phase: "planning",
    agent: "global-agent",
    data: { targets: resolved, rejected },
  });

  const children: any[] = [];
  for (const target of resolved) {
    const childGoal = compactFormText(target.task, businessGoal);
    const childTitle = compactMemoryText(`${title} - ${target.name}`, 100);
    const child = createTask({
      title: childTitle,
      description: buildDailyDevTaskDescription({
        title: childTitle,
        business_goal: childGoal,
        scope: target.reason || payload.scope || "由目标 Agent根据总任务识别负责范围",
        documents: sourceDocuments,
        acceptance,
        constraints: `这是全局任务 ${parent.id} 的子任务；必须向全局 Agent提供可审计交付证据。`,
      }),
      target_project: target.type === "group" ? target.coordinator : target.project,
      group_id: target.type === "group" ? target.group_id : null,
      assign_type: target.type === "group" ? "group" : "project",
      priority: payload.priority || "normal",
      auto_execute: autoExecute,
      workflow_type: "daily_dev",
      business_goal: childGoal,
      acceptance_criteria: acceptance,
      source_documents: sourceDocuments,
      source_attachments: sourceAttachments,
      requires_code_changes: target.requires_code_changes !== false && payload.requires_code_changes !== false,
      requires_verification: target.requires_verification !== false && payload.requires_verification !== false,
      parent_task_id: parent.id,
      global_mission_id: parent.id,
      mission_target: target,
      mission_dependencies: Array.isArray(target.depends_on || target.dependsOn)
        ? (target.depends_on || target.dependsOn)
        : (target.depends_on || target.dependsOn ? [target.depends_on || target.dependsOn] : []),
      workflow_meta: {
        global_mission: {
          parent_task_id: parent.id,
          owner_agent: "global-agent",
          target_type: target.type,
          target_name: target.name,
        },
      },
      trace_id: missionTraceId,
      idempotency_key: missionIdempotencyKey ? `${missionIdempotencyKey}:target:${target.type}:${target.group_id || target.project}` : null,
    });
    appendTaskTimelineEvent(child.id, {
      type: "global_mission_dispatch",
      title: "全局 Agent派发子任务",
      detail: target.reason || childGoal,
      status: autoExecute ? "active" : "pending",
      phase: "dispatching",
      agent: "global-agent",
      data: { parent_task_id: parent.id, target },
    });
    const hasDependencies = Array.isArray(child.mission_dependencies) && child.mission_dependencies.length > 0;
    const queueResult = autoExecute && !hasDependencies
      ? enqueueTask(child.id, ctx)
      : { queued: false, message: hasDependencies ? "子任务已创建，等待前置依赖通过交付门禁" : "子任务已创建，等待手动启动" };
    children.push({ task: child, target, queue_result: queueResult });
  }

  const updatedParent = updateTask(parent.id, {
    status: "in_progress",
    child_task_ids: children.map((item: any) => item.task.id),
    status_detail: `全局 Agent已向 ${children.length} 个目标派发子任务`,
  }) || parent;
  refreshGlobalDevelopmentMissions();
  return {
    success: true,
    mission: getGlobalDevelopmentMission(updatedParent.id)?.mission || updatedParent,
    children,
    rejected,
  };
}

function canCompleteDailyDevFromDeliverySummary(task: any, execution: any, summary: any) {
  if (task?.workflow_type !== "daily_dev") return false;
  if (!summary || execution?.status === "failed") return false;
  const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || execution?.receipt?.status === "done"
    || task?.receipt?.status === "done";
  const hasBlockingReceipt = receiptStatuses.some((item: any) => ["failed", "blocked", "needs_info", "partial"].includes(String(item?.status || "")));
  const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || execution?.fileChanges?.count || 0);
  const executedVerificationCount = Number(summary.verification_executed?.length || 0);
  const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
  const assignmentCount = Number(summary.assignment_count || 0);
  const workerNotificationCount = Number(summary.worker_notification_count || 0);
  const openSummaryItems = [
    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary.blocking_needs)
      ? summary.blocking_needs
      : (Array.isArray(summary.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, task)) : [])),
    ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
    ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
  ].filter(Boolean);
  if (hasBlockingReceipt || openSummaryItems.length > 0) return false;
  if (coordinationPlanCount <= 0 || assignmentCount <= 0 || workerNotificationCount <= 0) return false;
  if (!hasDoneReceipt || !summary.has_final_review) return false;
  if (taskRequiresCodeChanges(task) && actualChangeCount <= 0) return false;
  if (taskRequiresVerification(task) && executedVerificationCount <= 0) return false;
  if (taskRequiresVerification(task) && summary.verification_required_gate_passed === false) return false;
  if (taskRequiresVerification(task) && summary.verification_source_gate_passed !== true) return false;
  if ((taskRequiresCodeChanges(task) || taskRequiresVerification(task)) && summary.ack_gate_passed !== true) return false;
  if ((taskRequiresCodeChanges(task) || taskRequiresVerification(task)) && summary.receipt_quality_gate_passed !== true) return false;
  if (summary.contract_injection_gate_passed === false) return false;
  if (summary.acceptance_gate && summary.acceptance_gate.pass !== true) return false;
  return true;
}

function reconcileTaskDeliveryEvidence(taskId: string) {
  const task = loadTasks().find((item: any) => item.id === taskId);
  if (!task) return { success: false, status: 404, error: "任务不存在" };
  const execution = {
    status: "waiting",
    detail: task.status_detail || "重新核对持久化交付证据",
    report: task.final_report || task.result || "",
    result: task.result || "",
    receipt: task.receipt || null,
    review: task.review || null,
    fileChanges: task.file_changes || null,
  };
  const summary = buildDeliverySummary(task, execution, "waiting");
  const eligible = canCompleteDailyDevFromDeliverySummary(task, execution, summary);
  if (!eligible) {
    const updated = updateTask(taskId, { delivery_summary: summary, reasoning_loop: summary.reasoning_loop });
    addTaskLog(taskId, "info", `交付证据复核完成：仍有 ${summary.acceptance_gate?.failed_count || 0} 项门禁未通过`);
    return { success: true, completed: false, task: updated, delivery_summary: summary };
  }
  const completedExecution = { ...execution, status: "done", detail: "持久化交付证据复核通过，系统自动完成" };
  const completedSummary = buildDeliverySummary(task, completedExecution, "done");
  closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "持久化交付证据复核通过");
  const finalizedSummary = buildDeliverySummary(task, completedExecution, "done");
  const completedTask = updateTask(taskId, {
    status: "done",
    status_detail: completedExecution.detail,
    delivery_summary: finalizedSummary,
    reasoning_loop: finalizedSummary.reasoning_loop,
    execution_readiness: null,
    daily_dev_execution_readiness: null,
    completed_at: new Date().toISOString(),
  }) || task;
  updateGroupTaskInlineStatus(completedTask, "done", completedExecution.detail);
  finalizeTaskKernel(task, completedExecution, completedSummary, "succeeded", completedExecution.detail);
  syncTaskBacklogStatus(completedTask, "done", completedExecution.detail);
  appendTaskGroupReport(completedTask, "done", completedExecution.detail);
  addTaskLog(taskId, "success", `✅ ${completedExecution.detail}`);
  return { success: true, completed: true, task: completedTask, delivery_summary: finalizedSummary };
}
function validateTaskManualStatusUpdate(current: any, updates: any) {
  if (updates?.status !== "done") return null;
  if (current?.workflow_type !== "daily_dev") return null;
  const summary = updates.delivery_summary || current.delivery_summary || null;
  const missing: string[] = [];
  const review = updates.review || current.review || null;
  const receiptStatuses = Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : [];
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || current.receipt?.status === "done"
    || updates.receipt?.status === "done";
  const requiresCodeChanges = taskRequiresCodeChanges(current);
  const requiresVerification = taskRequiresVerification(current);
  const actualChangeCount = Number(summary?.actual_file_change_count || current.file_changes?.count || 0);
  const executedVerificationCount = Number(summary?.verification_executed?.length || 0);
  const coordinationPlanCount = Number(summary?.coordination_plan_count || 0);
  const assignmentCount = Number(summary?.assignment_count || 0);
  const workerNotificationCount = Number(summary?.worker_notification_count || 0);

  if (!summary) missing.push("交付摘要");
  if (coordinationPlanCount <= 0) missing.push("主 Agent 协调计划");
  if (assignmentCount <= 0) missing.push("主 Agent 派发证据");
  if (workerNotificationCount <= 0) missing.push("Worker 通知");
  if (!hasDoneReceipt) missing.push("子 Agent 完成回执");
  if (!summary?.has_final_review && !review) missing.push("主 Agent 最终复盘");
  if (requiresCodeChanges && actualChangeCount <= 0) missing.push("系统实际捕获的代码变更");
  if (requiresVerification && executedVerificationCount <= 0) missing.push("已执行验证记录");
  if (Array.isArray(summary?.blockers) && summary.blockers.length > 0) missing.push("未解决阻塞项");
  const blockingNeeds = Array.isArray(summary?.blocking_needs)
    ? summary.blocking_needs
    : (Array.isArray(summary?.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, current)) : []);
  if (blockingNeeds.length > 0) missing.push("仍需补充事项");
  if (Array.isArray(summary?.verification_failed) && summary.verification_failed.length > 0) missing.push("失败验证记录");
  if (Array.isArray(summary?.verification_suggested) && summary.verification_suggested.length > 0) missing.push("仅建议/未执行验证记录");
  if (requiresVerification && summary?.verification_required_gate_passed === false) missing.push("项目配置验证命令执行证据");
  if (requiresVerification && summary?.verification_source_gate_passed !== true) missing.push("独立外部 Runner 验证来源");
  if ((requiresCodeChanges || requiresVerification) && summary?.ack_gate_passed !== true) missing.push("ACK 前置审核通过");
  if ((requiresCodeChanges || requiresVerification) && summary?.receipt_quality_gate_passed !== true) missing.push("高质量子 Agent 回执（ACK/动作/文件/验证/契约/记忆声明）");
  if (summary?.contract_injection_gate_passed === false) missing.push("contractChanges 已注入依赖 Agent");
  if (taskRequiresAgentQa(current) && summary?.agent_qa_gate_passed !== true) missing.push("已采纳并完成原会话续跑的 Agent 协作问答");
  if (summary?.acceptance_gate && summary.acceptance_gate.pass !== true) missing.push("主 Agent 硬验收门禁通过");

  if (missing.length === 0) return null;
  return `业务开发任务不能手动标记完成，缺少验收证据：${missing.join("、")}。请通过队列让主 Agent 继续执行，或在任务报告中补齐证据后由系统完成。`;
}

function buildTaskGapContinuationDraft(task: any) {
  const summary = task?.delivery_summary || {};
  const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
  const assignmentCount = Number(summary.assignment_count || assignmentEvidence.length || 0);
  const workerNotificationCount = Number(summary.worker_notification_count || workerNotifications.length || 0);
  const relatedWorkers = uniqueStrings([
    ...workerNotifications.map((item: any) => item.task_id),
    ...assignmentEvidence.map((item: any) => item.project),
    ...((Array.isArray(summary.receipts) ? summary.receipts : []).map((item: any) => item.agent)),
    ...((Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []).map((item: any) => item.agent)),
    ...((Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []).map((item: any) => item.agent)),
  ].filter(Boolean)).slice(0, 8);
  const lines: string[] = [
    `请继续推进任务：${task?.title || ""}`,
    "",
  ];
  if (relatedWorkers.length) {
    lines.push("同 Worker 续跑目标：");
    relatedWorkers.forEach(worker => lines.push(`- ${worker}：continuationStrategy=same_worker_scratchpad，优先承接上一轮 Worker 通知和回执继续处理。`));
    lines.push("");
  }
  if (workerNotifications.length) {
    lines.push("上一轮 Worker 通知：");
    workerNotifications.slice(0, 10).forEach((item: any) => {
      lines.push(`- ${item.task_id || "未知 Worker"}：通知 ${item.status || "unknown"} / 回执 ${item.receipt_status || "missing"}；${String(item.summary || item.result || "无摘要").slice(0, 500)}`);
    });
    lines.push("");
  }
  const blockers = [
    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary.needs) ? summary.needs : []),
  ].filter(Boolean);
  if (blockers.length) {
    lines.push("需要处理的阻塞/待补充：");
    blockers.slice(0, 10).forEach((item: any) => lines.push(`- ${String(item).slice(0, 500)}`));
    lines.push("");
  }
  const coordinationGaps = [
    coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据：请先重新理解业务文档，输出可验收的协调计划，再派发 Worker。",
    assignmentCount > 0 ? "" : "缺少主 Agent 派发证据：请生成 self-contained assignment，并明确派发给目标项目子 Agent。",
    workerNotificationCount > 0 ? "" : "缺少 Worker 通知：请让目标子 Agent 实际执行并返回 task-notification 与 CCM_AGENT_RECEIPT。",
  ].filter(Boolean);
  if (coordinationGaps.length) {
    lines.push("需要补齐的主 Agent 协作证据：");
    coordinationGaps.forEach(item => lines.push(`- ${item}`));
    lines.push("");
  }
  if (summary.agent_qa_required && summary.agent_qa_gate_passed !== true) {
    lines.push("需要补齐的 Agent 协作问答证据：");
    lines.push(`- 当前问答 ${Number(summary.agent_qa_count || 0)} 条、采纳 ${Number(summary.agent_qa_accepted_count || 0)} 条、回答后续跑 ${Number(summary.agent_qa_resumed_count || 0)} 条。`);
    lines.push("- 让实际被阻塞的子 Agent 输出 ask_agent/request_review，目标 Agent 提供文件、合同或验证证据；主 Agent 采纳后必须自动恢复原任务会话。不得用普通 @消息冒充 Agent QA。");
    lines.push("");
  }
  const ackRewriteRows = getTaskAckRewriteRows(task);
  if (ackRewriteRows.length) {
    lines.push("需要先返工的 ACK 前置审核：");
    ackRewriteRows.slice(0, 10).forEach((row: any) => {
      lines.push(`- ${row.agent}：${row.reason || "ACK 不合格"}。请只重写接单 ACK，必须包含 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear。`);
      if (row.unclear?.length) lines.push(`  - 未澄清项：${row.unclear.join("；")}`);
    });
    lines.push("- ACK 未通过前不得宣布 daily_dev 完成；ACK 合格后再继续实现、验证或验收。");
    lines.push("");
  }
  const contractInjection = getTaskContractInjectionRows(task);
  const contractGate = evaluateContractInjectionGate(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []);
  if (contractGate.required && !contractGate.pass) {
    lines.push("需要注入依赖 Agent 的 contractChanges：");
    contractGate.missing.slice(0, 12).forEach((row: any) => {
      const endpoint = row.endpoint || row.type || "contract";
      lines.push(`- ${row.target}：续跑同一任务和同 Agent 会话，注入 ${endpoint}。${row.summary || "结构化契约变化需要同步给消费者 Agent"}`);
    });
    lines.push("- 主 Agent 必须优先复用原任务、原 Trace、原 native session/scratchpad，通过同一任务卡继续派发，不要新建无关任务。");
    lines.push("- 依赖 Agent 收到注入后必须说明是否需要适配代码、是否已完成适配和验证；回执里保留 contractChanges 消费结论。");
    lines.push("");
  }
  if (Array.isArray(summary.verification_required_missing) && summary.verification_required_missing.length) {
    lines.push("需要补齐的项目验证命令证据：");
    summary.verification_required_missing.slice(0, 10).forEach((item: any) => {
      const required = Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置验证命令";
      lines.push(`- ${item?.agent || "未知 Agent"}：请实际运行并回执 ${required}`);
    });
    lines.push("");
  }
  if (Array.isArray(summary.verification_suggested) && summary.verification_suggested.length) {
    lines.push("以下验证只是建议或未执行，需要改为实际执行结果：");
    summary.verification_suggested.slice(0, 10).forEach((item: any) => lines.push(`- ${String(item).slice(0, 500)}`));
    lines.push("");
  }
  if (Array.isArray(summary.verification_failed) && summary.verification_failed.length) {
    lines.push("以下验证失败，需要修复后重新验证：");
    summary.verification_failed.slice(0, 10).forEach((item: any) => lines.push(`- ${String(item).slice(0, 500)}`));
    lines.push("");
  }
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ].filter((item: any) => item && item.status && item.status !== "done");
  if (receipts.length) {
    lines.push("需要跟进的子 Agent 回执：");
    receipts.slice(0, 8).forEach((item: any) => {
      lines.push(`- ${item.agent || "未知 Agent"}：${item.status || "unknown"}；${String(item.summary || item.message || "无摘要").slice(0, 500)}`);
      const needs = [
        ...(Array.isArray(item.blockers) ? item.blockers : []),
        ...(Array.isArray(item.needs) ? item.needs : []),
      ].filter(Boolean);
      needs.slice(0, 5).forEach((need: any) => lines.push(`  - ${String(need).slice(0, 500)}`));
    });
    lines.push("");
  }
  if (task?.review?.content || task?.review?.summary) {
    lines.push("主 Agent 复盘提示：");
    lines.push(String(task.review.content || task.review.summary).slice(0, 1200));
    lines.push("");
  }
  lines.push("继续执行要求：");
  lines.push("- 主 Agent 先判断这些阻塞是否已被本次补充消解。");
  lines.push("- 如可继续，优先派发给相关子 Agent 返工，并保持同 Worker scratchpad 续跑；不要重新派给无关 Agent。");
  lines.push("- 子 Agent 返工工作单必须写清上一轮通知/回执缺口、补齐动作、实际文件变更和验证命令。");
  lines.push("- 完成后仍需主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 复盘、实际变更证据和已执行验证记录。");
  return lines.filter((line, index, arr) => line || arr[index - 1]).join("\n").trim();
}

function buildTargetedReworkContinuationDraft(task: any, payload: any = {}) {
  const base = buildTaskGapContinuationDraft(task);
  const kind = compactFormText(payload.rework_kind || payload.reworkKind || payload.kind, "targeted_rework");
  const target = compactFormText(payload.target || payload.agent || payload.project, "");
  const reason = compactFormText(payload.reason || payload.detail || payload.message, "");
  const title = compactFormText(payload.title || payload.label, "");
  const kindLabel: any = {
    missing_diff: "缺少真实文件 Diff：只派实现返工",
    missing_verification: "缺少已执行验证：只派验证返工",
    missing_receipt: "缺少子 Agent 回执：要求补结构化回执",
    missing_goal_review: "目标覆盖不足：主 Agent 重新复盘",
    failed_verification: "验证失败：只修失败点",
    weak_receipt: "回执质量不足：要求补 ACK/动作/文件/验证/契约/记忆声明",
    contract_sync: "契约未同步：补结构化 contractChanges",
    contract_inject: "注入契约给依赖 Agent：按 contractChanges 续跑",
    ack_rewrite: "ACK 不合格：先重写接单确认",
  };
  return [
    "【精准返工指令】",
    `返工类型：${kindLabel[kind] || title || kind}`,
    target ? `目标 Agent：${target}` : "",
    reason ? `触发原因：${reason}` : "",
    "",
    "执行方式：",
    "- 只处理本条精准返工缺口，不要整轮重跑。",
    "- 优先复用原任务、原 Trace、原 native session / scratchpad。",
    "- 如果目标 Agent 明确，优先让同一个 Agent 续跑；如果缺口属于主 Agent 复盘，则主 Agent 先重新规划。",
    "- 完成后必须提交新的 CCM_AGENT_RECEIPT；若涉及接口/字段/schema/类型变化，必须补 contractChanges。",
    "",
    base,
  ].filter(Boolean).join("\n");
}

function getTaskGapItems(task: any) {
  const summary = task?.delivery_summary || {};
  const items: string[] = [];
  if (Number(summary.coordination_plan_count || 0) <= 0) items.push("coordination_plan");
  if (Number(summary.assignment_count || 0) <= 0) items.push("assignment_evidence");
  if (Number(summary.worker_notification_count || 0) <= 0) items.push("worker_notification");
  for (const value of Array.isArray(summary.blockers) ? summary.blockers : []) items.push(`blocker:${compactMemoryText(value, 240)}`);
  for (const value of Array.isArray(summary.needs) ? summary.needs : []) items.push(`need:${compactMemoryText(value, 240)}`);
  for (const value of Array.isArray(summary.verification_failed) ? summary.verification_failed : []) items.push(`verification_failed:${compactMemoryText(value, 240)}`);
  for (const value of Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []) items.push(`verification_unexecuted:${compactMemoryText(value, 240)}`);
  for (const value of Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing : []) {
    const required = (Array.isArray(value?.required) ? value.required : []).map((item: any) => compactMemoryText(item, 160)).sort().join("|");
    items.push(`verification_required:${compactMemoryText(value?.agent || "agent", 80)}:${required}`);
  }
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  for (const receipt of receipts) {
    const status = String(receipt?.status || "").trim();
    if (status && status !== "done") items.push(`receipt:${compactMemoryText(receipt?.agent || "agent", 80)}:${status}`);
  }
  for (const row of getTaskAckRewriteRows(task)) {
    items.push(`ack_rewrite:${compactMemoryText(row.agent, 80)}:${row.status}:${compactMemoryText(row.reason, 180)}`);
  }
  const contractInjection = getTaskContractInjectionRows(task);
  const contractGate = evaluateContractInjectionGate(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []);
  for (const row of contractGate.missing || []) {
    items.push(`contract_inject:${compactMemoryText(row.target, 80)}:${compactMemoryText(row.endpoint || row.type || "contract", 180)}`);
  }
  for (const notification of Array.isArray(summary.worker_notifications) ? summary.worker_notifications : []) {
    const status = String(notification?.status || "").trim();
    const receiptStatus = String(notification?.receipt_status || "").trim();
    if (["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status) || (receiptStatus && receiptStatus !== "done")) {
      items.push(`notification:${compactMemoryText(notification?.task_id || notification?.agent || "worker", 80)}:${status}:${receiptStatus}`);
    }
  }
  if (summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true) items.push("agent_qa_evidence");
  return uniqueStrings(items.filter(Boolean)).sort();
}

function getTaskGapFingerprint(task: any) {
  const items = getTaskGapItems(task);
  if (!items.length) return "";
  return crypto.createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 24);
}

function isAutomaticGapContinuationSource(source: any) {
  return /(gap_rework|autopilot_gap|watchdog_gap|automatic_gap)/i.test(String(source || ""));
}

function canAutoContinueTaskGaps(task: any) {
  if (!hasDailyDevContinuationGaps(task)) return false;
  const fingerprint = getTaskGapFingerprint(task);
  const previous = task?.collaboration_state?.gap || {};
  return !(fingerprint && previous.fingerprint === fingerprint && Number(previous.auto_attempts || 0) >= 1);
}

function reconcileTaskCollaborationState(task: any, previous: any = {}) {
  const now = new Date().toISOString();
  if (task?.status === "done") return { ...previous, phase: "completed", needs_user: false, completed_at: task.completed_at || now, updated_at: now };
  if (task?.status === "cancelled") return { ...previous, phase: "cancelled", needs_user: false, updated_at: now };
  const items = getTaskGapItems(task);
  const fingerprint = items.length ? getTaskGapFingerprint(task) : "";
  const oldGap = previous?.gap || {};
  const sameGap = !!fingerprint && oldGap.fingerprint === fingerprint;
  const attempts = sameGap ? Number(oldGap.auto_attempts || 0) : 0;
  const exhausted = items.length > 0 && attempts >= 1;
  return {
    ...previous,
    phase: exhausted ? "needs_user" : items.length ? "reviewing" : task?.status === "in_progress" ? "executing" : "planning",
    needs_user: exhausted,
    gap: items.length ? { ...oldGap, fingerprint, items, auto_attempts: attempts, updated_at: now } : null,
    updated_at: now,
  };
}

function hasDailyDevContinuationGaps(task: any) {
  if (!task || task.workflow_type !== "daily_dev") return false;
  if (task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  const summary = task.delivery_summary || {};
  const hasSummaryGaps = [
    summary.blockers,
    summary.needs,
    summary.verification_required_missing,
    summary.verification_suggested,
    summary.verification_failed,
  ].some((items: any) => Array.isArray(items) && items.length > 0);
  const hasReceiptGaps = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ].some((item: any) => item?.status && item.status !== "done");
  const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
    .some((item: any) => {
      const status = String(item?.status || "").trim();
      const receiptStatus = String(item?.receipt_status || "").trim();
      return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
        || (!!receiptStatus && receiptStatus !== "done");
    });
  const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
    || Number(summary.assignment_count || 0) <= 0
    || Number(summary.worker_notification_count || 0) <= 0;
  const hasAgentQaGap = summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true;
  const hasAckGateGap = (taskRequiresCodeChanges(task) || taskRequiresVerification(task))
    && (summary.ack_gate_passed === false || getTaskAckRewriteRows(task).length > 0);
  const contractInjection = getTaskContractInjectionRows(task);
  const contractGate = evaluateContractInjectionGate(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []);
  const hasContractInjectionGap = contractGate.required && !contractGate.pass;
  return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps || hasAgentQaGap || hasAckGateGap || hasContractInjectionGap;
}

function taskNeedsUserIntervention(task: any) {
  const summary = task?.delivery_summary || {};
  return task?.status === "failed"
    || isAgentExecutionBlockedPendingTask(task)
    || [
      summary.blockers,
      summary.needs,
      summary.verification_failed,
      summary.verification_required_missing,
      summary.project_policy_violations,
    ].some((items: any) => Array.isArray(items) && items.length > 0)
    || [
      ...(Array.isArray(summary.receipts) ? summary.receipts : []),
      ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item: any) => ["failed", "blocked", "partial", "needs_info", "missing_receipt"].includes(String(item?.status || "")));
}

function getTaskExecutionPhase(task: any) {
  if (task?.status === "done") return "done";
  if (runningTaskIds.has(task?.id) || task?.status === "in_progress") return "running";
  if (taskNeedsUserIntervention(task)) return "blocked";
  if (isTaskQueuedInMemory(task?.id)) return "queued";
  if (task?.status === "pending") return "pending";
  return task?.status || "unknown";
}

function getDashboardWorkerRows(task: any) {
  const summary = task?.delivery_summary || {};
  const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const names = uniqueStrings([
    ...assignments.map((item: any) => item.project || item.agent || item.target_project),
    ...receipts.map((item: any) => item.agent || item.project || item.target_project),
    ...notifications.map((item: any) => item.task_id || item.agent || item.project),
  ].filter(Boolean)).slice(0, 12);

  return names.map((name: string) => {
    const matchName = (item: any) => String(item?.project || item?.agent || item?.target_project || item?.task_id || "").toLowerCase() === name.toLowerCase();
    const assignment = assignments.find(matchName) || {};
    const receipt = receipts.find(matchName) || {};
    const notification = notifications.find(matchName) || {};
    return {
      agent: name,
      task: assignment.task || assignment.summary || notification.task || "",
      status: receipt.status || notification.receipt_status || notification.status || assignment.status || (task?.status === "in_progress" ? "running" : "pending"),
      summary: receipt.summary || notification.summary || assignment.reason || "",
      files_changed: Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : [],
      verification: Array.isArray(receipt.verification || receipt.tests) ? (receipt.verification || receipt.tests) : [],
      blockers: [
        ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
        ...(Array.isArray(receipt.needs) ? receipt.needs : []),
      ].filter(Boolean),
    };
  });
}

function getTaskDashboardActions(task: any, phase: string) {
  const actions: any[] = [];
  if (isTaskPaused(task)) {
    actions.push({ id: "resume", label: "继续执行", kind: "resume", tone: "primary" });
  } else if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "pause", label: "暂停", kind: "pause", tone: "outline" });
  }
  if (task?.status !== "done") {
    actions.push({ id: "supplement", label: "补充说明", kind: "continue", tone: "primary" });
    actions.push({ id: "replan", label: "重新规划", kind: "continue", tone: "outline" });
    actions.push({ id: "redispatch", label: "重派", kind: "retry", tone: "outline" });
    actions.push({ id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" });
  }
  if (hasDailyDevContinuationGaps(task)) {
    actions.push({ id: "gap_continue", label: "按缺口返工", kind: "gap_continue", tone: "warning" });
  }
  if (task?.status === "pending" && !isTaskQueuedInMemory(task?.id) && !isAgentExecutionBlockedPendingTask(task)) {
    actions.push({ id: "queue", label: "加入队列", kind: "queue", tone: "primary" });
  }
  if (task?.delivery_summary) actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
  if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
    actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
  }
  if (task?.status !== "done" && canCompleteDailyDevFromDeliverySummary(task, {}, task?.delivery_summary)) {
    actions.push({ id: "confirm_done", label: "人工确认完成", kind: "confirm_done", tone: "success" });
  }
  if (phase === "blocked" && isAgentExecutionBlockedPendingTask(task)) {
    actions.unshift({ id: "probe", label: "复检执行通道", kind: "probe", tone: "warning" });
  }
  if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
  }
  return actions;
}

function buildExecutionDashboard(limit = 12) {
  const tasks = loadTasks()
    .filter((task: any) => !task.archived && !task.deleted_at)
    .slice()
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
  const queueStatus = getQueueStatus();
  const phaseCounts: any = { pending: 0, queued: 0, running: 0, blocked: 0, done: 0, failed: 0, unknown: 0 };
  const rows = tasks.map((task: any) => {
    const summary = task.delivery_summary || {};
    const phase = getTaskExecutionPhase(task);
    phaseCounts[phase] = Number(phaseCounts[phase] || 0) + 1;
    const latestPlan = summary.latest_coordination_plan || {};
    const blockers = [
      ...(Array.isArray(summary.blockers) ? summary.blockers : []),
      ...(Array.isArray(summary.needs) ? summary.needs : []),
      ...(Array.isArray(summary.verification_failed) ? summary.verification_failed.map((item: any) => `验证失败：${String(item)}`) : []),
      ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item: any) => `${item?.agent || "未知 Agent"} 缺验证：${Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置命令"}`) : []),
      ...(Array.isArray(summary.project_policy_violations) ? summary.project_policy_violations : []),
    ].filter(Boolean);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      phase,
      priority: task.priority || "normal",
      workflow_type: task.workflow_type || "",
      assign_type: task.assign_type || "",
      target_project: task.target_project || "",
      group_id: task.group_id || "",
      created_at: task.created_at,
      updated_at: task.updated_at,
      status_detail: task.status_detail || "",
      headline: summary.headline || task.final_report || task.result || "",
      execution_readiness: task.execution_readiness || null,
      main_plan: {
        count: Number(summary.coordination_plan_count || (Array.isArray(summary.coordination_plans) ? summary.coordination_plans.length : 0) || (latestPlan?.phases?.length ? 1 : 0)),
        strategy: latestPlan.strategy || "",
        phases: Array.isArray(latestPlan.phases) ? latestPlan.phases.slice(0, 8) : [],
      },
      assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.slice(0, 12) : [],
      workers: getDashboardWorkerRows(task),
      evidence: {
        actual_file_change_count: Number(summary.actual_file_change_count || task.file_changes?.count || 0),
        actual_file_changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 12) : [],
        verification_executed: Array.isArray(summary.verification_executed) ? summary.verification_executed.slice(0, 12) : [],
        verification_failed: Array.isArray(summary.verification_failed) ? summary.verification_failed.slice(0, 12) : [],
        verification_required_missing: Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.slice(0, 12) : [],
        has_final_review: !!summary.has_final_review || !!task.review,
        receipt_count: Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0)),
      },
      rework_records: [
        ...(Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []),
        ...(Array.isArray(task.followups) ? task.followups.map((item: any) => ({
          time: item.time,
          source: item.source || "user",
          summary: item.message || item.summary || "用户补充说明",
        })) : []),
      ].slice(0, 12),
      blockers: blockers.slice(0, 12),
      recent_logs: getTaskLogs(task.id, 5),
      actions: getTaskDashboardActions(task, phase),
      raw_task: task,
    };
  });
  const activeRows = rows.filter((item: any) => item.phase !== "done").slice(0, limit);
  const recentDoneRows = rows.filter((item: any) => item.phase === "done").slice(0, Math.max(0, limit - activeRows.length));
  return {
    success: true,
    generated_at: new Date().toISOString(),
    queue_status: queueStatus,
    summary: {
      total: tasks.length,
      active: activeRows.length,
      queued: Number(phaseCounts.queued || 0),
      running: Number(phaseCounts.running || 0),
      blocked: Number(phaseCounts.blocked || 0),
      pending: Number(phaseCounts.pending || 0),
      done: Number(phaseCounts.done || 0),
    },
    phase_counts: phaseCounts,
    items: [...activeRows, ...recentDoneRows],
  };
}

export function continueDailyDevTasksFromGaps(ctx: CollabCtx, options: any = {}) {
  const groupId = String(options.group_id || options.groupId || "").trim();
  const limit = Math.max(1, Math.min(50, Number(options.limit || 5)));
  const maxPerTask = Math.max(1, Math.min(20, Number(options.max_per_task || options.maxPerTask || 3)));
  const candidates = loadTasks()
    .filter(task => hasDailyDevContinuationGaps(task))
    .filter(task => canAutoContinueTaskGaps(task))
    .filter(task => !groupId || task.group_id === groupId)
    .filter(task => Number(task.auto_gap_continue_count || 0) < maxPerTask)
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
    .slice(0, limit);
  const results = candidates.map((task: any) => {
    const message = buildTaskGapContinuationDraft(task);
    const result = continueTaskWithMessage(task.id, message, ctx, {
      source: options.source || "autopilot_gap_rework",
      auto_execute: options.auto_execute,
      autoExecute: options.autoExecute,
      status_detail: "自动驾驶已按交付缺口生成返工说明，等待主 Agent 继续执行",
    });
    return {
      task_id: task.id,
      title: task.title,
      group_id: task.group_id,
      ...result,
      task: undefined,
      continuation_message: message,
    };
  });
  return {
    success: true,
    total_candidates: candidates.length,
    continued: results.filter((item: any) => item.success).length,
    queued: results.filter((item: any) => item.queued).length,
    blocked: results.filter((item: any) => item.queue_result?.blocked).length,
    failed: results.filter((item: any) => !item.success).length,
    limit,
    max_per_task: maxPerTask,
    results,
  };
}

function continueTaskWithMessage(taskId: string, message: string, ctx: CollabCtx, options: any = {}) {
  if (!taskId) return { success: false, status: 400, error: "缺少任务 ID" };
  if (!compactFormText(message, "")) return { success: false, status: 400, error: "请输入补充说明" };

  const tasks = loadTasks();
  const current = tasks.find(t => t.id === taskId);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  const continuationKind = String(options.continuation_kind || options.continuationKind || "auto") === "auto"
    ? classifyTaskContinuation(message)
    : String(options.continuation_kind || options.continuationKind);
  if (continuationKind === "new_task") {
    return { success: false, status: 409, new_task_suggested: true, error: "这条要求看起来是一个独立新任务，请直接在群聊发送，不会混入当前任务。" };
  }
  const currentlyRunning = runningTaskIds.has(taskId);
  const source = String(options.source || "user");
  const automaticGapContinuation = isAutomaticGapContinuationSource(source);
  const gapFingerprint = automaticGapContinuation ? getTaskGapFingerprint(current) : "";
  const gapItems = automaticGapContinuation ? getTaskGapItems(current) : [];
  if (automaticGapContinuation && !canAutoContinueTaskGaps(current)) {
    return {
      success: false,
      status: 409,
      needs_user: true,
      error: "相同交付缺口已经自动返工过一次，但没有出现新的验收证据；请补充业务信息、调整方案或人工选择重试。",
      gap_fingerprint: gapFingerprint,
      gap_items: gapItems,
    };
  }
  const explicitOperationKey = String(options.idempotency_key || options.idempotencyKey || options.request_id || options.requestId || "").trim();
  const automaticOperationKey = automaticGapContinuation && gapFingerprint ? `auto-gap:${gapFingerprint}` : "";
  const operationKey = explicitOperationKey || automaticOperationKey;
  const operation = operationKey ? acquireIdempotency({ scope: "task-continue", key: `${taskId}:${operationKey}`, traceId: current.trace_id, leaseMs: 60_000 }) : null;
  if (operation && !operation.acquired) {
    return { success: true, duplicate: true, task: loadTasks().find((item: any) => item.id === taskId) || current, ...(operation.record?.result || {}), trace_id: operation.traceId };
  }

  const followup = {
    time: new Date().toISOString(),
    message: compactFormText(message, ""),
    source,
    kind: continuationKind,
    status: currentlyRunning ? "queued_for_current_task" : "accepted",
  };
  const nextDescription = `${current.description || ""}${buildTaskContinuationBlock(followup.message)}`;
  const previousGap = current.collaboration_state?.gap || {};
  const autoAttempts = automaticGapContinuation
    ? (previousGap.fingerprint === gapFingerprint ? Number(previousGap.auto_attempts || 0) : 0) + 1
    : Number(previousGap.auto_attempts || 0);
  const nextCollaborationState = {
    ...(current.collaboration_state || {}),
    phase: "reworking",
    needs_user: false,
    gap: automaticGapContinuation ? {
      ...previousGap,
      fingerprint: gapFingerprint,
      items: gapItems,
      auto_attempts: autoAttempts,
      last_auto_continue_at: followup.time,
    } : previousGap,
    last_continuation: { source, at: followup.time, automatic: automaticGapContinuation },
  };
  const updates: any = {
    description: nextDescription,
    followups: automaticGapContinuation ? (Array.isArray(current.followups) ? current.followups : []) : [...(Array.isArray(current.followups) ? current.followups : []), followup],
    internal_continuations: automaticGapContinuation ? [...(Array.isArray(current.internal_continuations) ? current.internal_continuations : []), followup].slice(-20) : (Array.isArray(current.internal_continuations) ? current.internal_continuations : []),
    status: currentlyRunning ? "in_progress" : "pending",
    is_paused: false,
    paused: false,
    ...(currentlyRunning ? {} : { result: "", final_report: "" }),
    followup_revision: Number(current.followup_revision || 0) + 1,
    pending_followups: [...(Array.isArray(current.pending_followups) ? current.pending_followups : []), followup].slice(-20),
    status_detail: options.status_detail || (currentlyRunning
      ? "已收到追加要求，本轮结束后将在同一任务中继续"
      : automaticGapContinuation ? `已按 ${gapItems.length} 个交付缺口自动返工，等待主 Agent 继续执行` : "已收到补充说明，等待主 Agent 继续执行"),
    collaboration_state: nextCollaborationState,
    last_continue_at: followup.time,
    last_continue_source: followup.source,
  };
  if (continuationKind === "revise_goal") {
    updates.business_goal = `${current.business_goal || current.title || ""}\n目标调整：${followup.message}`.trim();
  }
  if (current.status === "done") {
    const reopened = reopenTaskAgentSessions(taskId, "用户在同一任务中继续修改，恢复已验收会话");
    updates.reopened_session_count = reopened.length;
  }
  if (automaticGapContinuation) {
    updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
    updates.last_auto_gap_continue_at = followup.time;
  }
  const task = updateTask(taskId, updates);
  addTaskLog(taskId, "info", automaticGapContinuation
    ? `按交付缺口自动继续（${gapFingerprint}）：${gapItems.join("、").slice(0, 300)}`
    : `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);

  if (task?.assign_type === "group" && task.group_id && !automaticGapContinuation) {
    const group = loadGroups().find(g => g.id === task.group_id);
    const target = group ? getCoordinatorMember(group).project : "coordinator";
    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
      role: "user",
      target,
      content: `任务补充说明：${followup.message}`,
      timestamp: followup.time,
      task_id: taskId,
    });
    safeAddGroupLog(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
  } else if (task?.assign_type === "group" && task.group_id && automaticGapContinuation) {
    updateGroupTaskInlineStatus(task, "pending", `已自动按 ${gapItems.length} 个交付缺口返工，不新增重复消息`);
    safeAddGroupLog(task.group_id, "info", "task", `任务按相同卡片继续返工: ${task.title}`, { task_id: taskId, gap_fingerprint: gapFingerprint, gap_items: gapItems });
  }

  let queueResult = null;
  if (!currentlyRunning && options.auto_execute !== false && options.autoExecute !== false) {
    queueResult = enqueueTask(taskId, ctx);
  }
  if (operationKey) completeIdempotency("task-continue", `${taskId}:${operationKey}`, { task_id: taskId, queued: !!queueResult?.queued, followup_time: followup.time });
  return {
    success: true,
    task,
    message: followup.message,
    queued: !!queueResult?.queued,
    deferred: currentlyRunning,
    same_task_trace: true,
    continuation_kind: continuationKind,
    trace_id: task?.trace_id || current.trace_id || "",
    queue_result: queueResult,
    queue_status: getQueueStatus(),
  };
}

function retryTask(id: string, ctx: CollabCtx, reason = "", autoExecute = true) {
  if (runningTaskIds.has(id)) {
    return { success: false, status: 409, error: "任务正在执行中，请等待本轮结束后再重试" };
  }
  const current = loadTasks().find(t => t.id === id);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  if (current.status === "done") return { success: false, status: 409, error: "已完成任务不能重试" };

  const retryCount = Number(current.retry_count || 0) + 1;
  clearTaskCancellation(id);
  const retryReason = compactFormText(reason, "用户重新入队");
  const previousDelivery = (current.delivery_summary || current.receipt || current.review || current.final_report || current.result)
    ? {
        retry: retryCount,
        archived_at: new Date().toISOString(),
        reason: retryReason,
        status: current.status,
        status_detail: current.status_detail || "",
        receipt: current.receipt || null,
        review: current.review || null,
        file_changes: current.file_changes || null,
        delivery_summary: current.delivery_summary || null,
        final_report: current.final_report || "",
        result: current.result || "",
      }
    : null;
  const task = updateTask(id, {
    status: "pending",
    is_paused: false,
    paused: false,
    queued_at: null,
    started_at: null,
    result: "",
    final_report: "",
    status_detail: `第 ${retryCount} 次重试，等待主 Agent 重新执行`,
    // 当前证据在新一轮产出前仍是唯一可追溯事实；同时冻结到历史，禁止重试把证据链抹掉。
    delivery_history: previousDelivery
      ? [...(Array.isArray(current.delivery_history) ? current.delivery_history : []), previousDelivery].slice(-20)
      : (Array.isArray(current.delivery_history) ? current.delivery_history : []),
    retry_count: retryCount,
    last_retry_at: new Date().toISOString(),
    last_retry_reason: retryReason,
  });
  if (task) updateGroupTaskInlineStatus(task, "pending", `第 ${retryCount} 次重试，等待主 Agent 重新执行`);
  addTaskLog(id, "info", `任务重新入队重试：${retryReason}`);
  const queueResult = autoExecute ? enqueueTask(id, ctx) : null;
  return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
}

function switchTaskExecutor(id: string, requestedRuntime: string, ctx: CollabCtx, options: any = {}) {
  if (runningTaskIds.has(id)) return { success: false, status: 409, error: "任务正在执行中，请先暂停或等待本轮结束后再切换执行器" };
  const current = loadTasks().find((task: any) => task.id === id);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  if (current.archived || current.deleted_at) return { success: false, status: 409, error: "归档任务不能切换执行器，请先恢复" };
  if (["done", "cancelled"].includes(String(current.status || ""))) return { success: false, status: 409, error: "已结束任务不能切换执行器" };

  const requested = String(requestedRuntime || "").trim().toLowerCase();
  const descriptor = getPublicAgentRuntimes().find((runtime: any) => runtime.id === requested || runtime.aliases?.includes(requested));
  if (!descriptor) return { success: false, status: 400, error: `不支持的执行器：${requested || "未指定"}` };
  if (!isRuntimeCommandAvailable(descriptor.id)) return { success: false, status: 409, error: `${descriptor.label} 当前不可用，请先安装或登录对应 CLI` };

  const project = String(options.project || options.target_project || options.targetProject || "").trim();
  const overrideKey = project || "*";
  const previousRuntime = String(current.runtime_overrides?.[overrideKey] || current.runtime_override || "").trim();
  const now = new Date().toISOString();
  const historyItem = {
    from: previousRuntime || "project_default",
    to: descriptor.id,
    project: project || "all",
    reason: compactFormText(options.reason, "用户手动切换执行器"),
    switched_at: now,
  };
  const sessions = closeTaskAgentSessions({ taskId: id }, `执行器切换为 ${descriptor.label}，旧原生会话已关闭`);
  const task = updateTask(id, {
    runtime_override: project ? current.runtime_override || "" : descriptor.id,
    runtime_overrides: { ...(current.runtime_overrides || {}), [overrideKey]: descriptor.id },
    runtime_switch_history: [...(Array.isArray(current.runtime_switch_history) ? current.runtime_switch_history : []), historyItem].slice(-20),
    status: "pending",
    is_paused: false,
    paused: false,
    queued_at: null,
    status_detail: `已切换到 ${descriptor.label}，等待从现有工作区和证据继续执行`,
    collaboration_state: { ...(current.collaboration_state || {}), phase: "reworking", needs_user: false, updated_at: now },
    last_runtime_switch_at: now,
  });
  if (!task) return { success: false, status: 500, error: "切换执行器后保存任务失败" };
  addTaskLog(id, "warning", `执行器切换：${historyItem.from} → ${descriptor.id}${project ? `（${project}）` : "（全部项目 Agent）"}；关闭 ${sessions.length} 个旧会话`);
  appendTaskTimelineEvent(id, { type: "runtime_switch", title: "用户切换执行器", detail: `${historyItem.from} → ${descriptor.id}`, status: "warn", phase: "reworking", agent: project || "all", data: { ...historyItem, sessions_closed: sessions.length } });
  appendTraceEvent(current.trace_id, { type: "task.runtime_switched", status: "warning", task_id: id, group_id: current.group_id || "", agent: project || "all", message: `${historyItem.from} → ${descriptor.id}`, data: { ...historyItem, sessions_closed: sessions.length } });
  updateGroupTaskInlineStatus(task, "pending", task.status_detail);
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const queueResult = autoExecute ? enqueueTask(id, ctx) : null;
  return { success: true, task, runtime: descriptor, previous_runtime: historyItem.from, project: project || null, sessions_closed: sessions.length, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
}

function retryRuntimeFailedTasks(ctx: CollabCtx, options: any = {}) {
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const dryRun = !!(options.dry_run || options.dryRun);
  const limit = Math.max(1, Math.min(100, Number(options.limit || 100)));
  const probeTarget = options.probeTarget || options.probe_target || null;
  const candidates = loadTasks()
    .filter(isRecoverableRuntimeFailure)
    .filter((task: any) => taskMatchesAgentProbeTarget(task, probeTarget))
    .sort((a: any, b: any) => Date.parse(a.updated_at || a.created_at || "") - Date.parse(b.updated_at || b.created_at || ""))
    .slice(0, limit);
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      total_recoverable: candidates.length,
      retried: 0,
      queued: 0,
      auto_execute: autoExecute,
      results: candidates.map((task: any) => ({
        task_id: task.id,
        title: task.title,
        status: task.status,
        retry_count: Number(task.retry_count || 0),
        previous_failure: getTaskFailureText(task).slice(0, 500),
      })),
      queue_status: getQueueStatus(),
    };
  }
  const results = candidates.map((task: any) => {
    const reason = options.reason || "执行通道恢复后批量重试";
    const result = retryTask(task.id, ctx, reason, autoExecute);
    return {
      task_id: task.id,
      title: task.title,
      previous_failure: getTaskFailureText(task).slice(0, 500),
      ...result,
    };
  });
  return {
    success: true,
    total_recoverable: candidates.length,
    retried: results.filter((item: any) => item.success).length,
    queued: results.filter((item: any) => item.queued).length,
    auto_execute: autoExecute,
    results,
    queue_status: getQueueStatus(),
  };
}

function archiveTask(id: string, reason = "用户删除任务") {
  const tasks = loadTasks();
  const index = tasks.findIndex(task => task.id === id);
  if (index < 0) return null;
  const current = tasks[index];
  if (current.archived || current.deleted_at) return current;
  removeTaskFromQueues(id);
  const running = runningTaskIds.has(id);
  let cancellation: any = null;
  if (!['done', 'cancelled'].includes(String(current.status || ''))) {
    try { cancellation = requestTaskCancellation(id, reason, "task-governance"); } catch {}
  }
  const sessions = closeTaskAgentSessions({ taskId: id }, `${reason}，关闭任务级原生会话`);
  const leaseReleased = releaseTaskLease(id, "archived");
  const idempotencySettled = current.trace_id ? settleIdempotencyByTrace(current.trace_id, "failed", { archived: true, task_id: id, reason }) : [];
  const worktrees: any[] = [];
  for (const execution of listExecutions({ taskId: id })) {
    if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt) continue;
    try { worktrees.push({ execution_id: execution.id, ...cleanupExecutionWorktree(execution.id, true) }); }
    catch (error: any) { worktrees.push({ execution_id: execution.id, success: false, error: error.message }); }
  }
  const now = new Date().toISOString();
  const cleanup = {
    queue_removed: true,
    cancellation,
    sessions_closed: sessions.length,
    lease_released: leaseReleased,
    idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0),
    worktrees,
    running_at_request: running,
    completed_at: now,
  };
  tasks[index] = {
    ...current,
    previous_status: current.status,
    status: "archived",
    status_detail: reason,
    archived: true,
    archived_at: now,
    deleted_at: now,
    auto_execute_before_archive: current.auto_execute !== false,
    auto_execute: false,
    cleanup,
    collaboration_state: { ...(current.collaboration_state || {}), phase: "cancelled", needs_user: false, updated_at: now },
    updated_at: now,
  };
  saveTasks(tasks);
  updateGroupTaskInlineStatus(tasks[index], "cancelled", "任务已删除并归档");
  appendTraceEvent(current.trace_id, { type: "task.archived", status: "warning", task_id: id, group_id: current.group_id || "", message: reason, data: cleanup });
  return tasks[index];
}

function restoreArchivedTask(id: string) {
  const tasks = loadTasks();
  const index = tasks.findIndex(task => task.id === id);
  if (index < 0) return null;
  const current = tasks[index];
  if (!current.archived && !current.deleted_at) return current;
  clearTaskCancellation(id);
  const now = new Date().toISOString();
  const restoredStatus = current.previous_status === "done" ? "done" : "pending";
  tasks[index] = {
    ...current,
    status: restoredStatus,
    status_detail: restoredStatus === "done" ? "已从归档恢复" : "已从归档恢复，等待重新执行",
    archived: false,
    archived_at: null,
    deleted_at: null,
    restored_at: now,
    auto_execute: restoredStatus !== "done" ? current.auto_execute_before_archive !== false : false,
    collaboration_state: { ...(current.collaboration_state || {}), phase: restoredStatus === "done" ? "completed" : "planning", needs_user: false, updated_at: now },
    updated_at: now,
  };
  saveTasks(tasks);
  updateGroupTaskInlineStatus(tasks[index], restoredStatus, tasks[index].status_detail);
  appendTraceEvent(current.trace_id, { type: "task.restored", status: "info", task_id: id, group_id: current.group_id || "", message: "任务已从归档恢复" });
  return tasks[index];
}

function purgeArchivedTask(id: string) {
  const tasks = loadTasks();
  const current = tasks.find(task => task.id === id);
  if (!current) return null;
  if (!current.archived && !current.deleted_at) throw new Error("任务必须先删除归档，才能永久清除");
  removeTaskFromQueues(id);
  requestTaskCancellation(id, "永久清除归档任务", "task-governance");
  closeTaskAgentSessions({ taskId: id }, "永久清除归档任务");
  releaseTaskLease(id, "purged");
  for (const execution of listExecutions({ taskId: id })) {
    if (execution.workspace?.mode === "worktree" && !execution.workspace?.cleanedAt) {
      try { cleanupExecutionWorktree(execution.id, true); } catch {}
    }
  }
  const purgedSessions = purgeTaskAgentSessions(id);
  const purgedExecutionArtifacts = purgeTaskExecutionArtifacts(id);
  clearTaskCancellation(id);
  saveTasks(tasks.filter(task => task.id !== id));
  return { ...current, purge_cleanup: { sessions: purgedSessions.length, ...purgedExecutionArtifacts } };
}

export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  if (pathname === "/api/tasks/entity-chain" && req.method === "GET") {
    const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
    const chain = buildTaskEntityChain(taskId);
    if (!chain) { sendJson(res, { error: "任务不存在" }, 404); return true; }
    sendJson(res, { success: true, chain });
    return true;
  }

  if (pathname === "/api/tasks/execution-dashboard" && req.method === "GET") {
    const limit = Math.max(1, Math.min(50, Number(parsed.query.limit || 12)));
    sendJson(res, buildExecutionDashboard(limit));
    return true;
  }

  if (pathname === "/api/tasks/executions" && req.method === "GET") {
    const executionId = String(parsed.query.execution_id || parsed.query.executionId || "");
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    sendJson(res, { success: true, execution: executionId ? loadExecution(executionId) : null, executions: executionId ? [] : listExecutions(taskId ? { taskId } : {}) });
    return true;
  }

  if (pathname === "/api/tasks/native-sessions" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
    const sessions = listTaskAgentSessions({ taskId }).map(session => ({ ...session, continuity: getTaskAgentSessionContinuity(session) }));
    sendJson(res, { success: true, task_id: taskId, sessions });
    return true;
  }

  if (pathname === "/api/orchestrator/resilience" && req.method === "GET") {
    const runtimes = getPublicAgentRuntimes().map(runtime => ({ id: runtime.id, label: runtime.label, available: isRuntimeCommandAvailable(runtime.id), sessionResume: runtime.capabilities.sessionResume }));
    sendJson(res, { success: true, self_test: runCollaborationResilienceSelfTest(), runtimes });
    return true;
  }

  if (pathname === "/api/reliability/traces" && req.method === "GET") {
    const traceId = String(parsed.query.id || parsed.query.trace_id || "").trim();
    const taskId = String(parsed.query.task_id || "").trim();
    if (traceId) {
      const trace = getTrace(traceId);
      if (!trace) return sendJson(res, { success: false, error: "Trace 不存在" }, 404);
      sendJson(res, { success: true, trace });
      return true;
    }
    const traces = listTraces(Number(parsed.query.limit || 50)).filter((trace: any) => !taskId || trace.task_id === taskId || trace.events?.some((event: any) => event.task_id === taskId));
    sendJson(res, { success: true, traces });
    return true;
  }

  if (pathname === "/api/reliability/self-test" && req.method === "GET") {
    sendJson(res, { success: true, result: runReliabilityLedgerSelfTest() });
    return true;
  }

  if (pathname === "/api/reliability/drills/run" && req.method === "POST") {
    try {
      const outcome = runScheduledProductionReliabilityDrill({ force: true });
      const result = outcome.result;
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    } catch (error: any) {
      sendJson(res, { success: false, error: error.message || String(error) }, 500);
    }
    return true;
  }

  if (pathname === "/api/reliability/drills/status" && req.method === "GET") {
    sendJson(res, { success: true, status: getReliabilityDrillStatus() });
    return true;
  }

  if (pathname === "/api/reliability/soak/status" && req.method === "GET") {
    sendJson(res, { success: true, state: getSoakTestStatus(), report: getSoakReport() });
    return true;
  }

  if (pathname === "/api/reliability/process-lifecycle" && req.method === "GET") {
    sendJson(res, { success: true, ...getProcessLifecycleSnapshot({ limit: Number(parsed.query?.limit || 5000), event_limit: Number(parsed.query?.event_limit || 100) }) });
    return true;
  }

  if (pathname === "/api/reliability/process-lifecycle/self-test" && req.method === "GET") {
    sendJson(res, { success: true, self_test: runProcessLifecycleSelfTest() });
    return true;
  }

  if (pathname === "/api/reliability/debt" && req.method === "GET") {
    sendJson(res, { success: true, debt: inspectReliabilityDebt() });
    return true;
  }

  if (pathname === "/api/reliability/debt/reconcile" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = reconcileStabilityDebt(payload.reason || "用户启动生产级稳定性验收前清理历史债务");
        sendJson(res, { success: result.pass, result }, result.pass ? 200 : 409);
      } catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/reliability/restart-intent" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try { sendJson(res, { success: true, intent: registerRestartIntent(body ? JSON.parse(body) : {}) }); }
      catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/reliability/soak/self-test" && req.method === "GET") {
    sendJson(res, { success: true, result: runSoakTestSelfTest() });
    return true;
  }

  if (["/api/reliability/soak/start", "/api/reliability/soak/stop", "/api/reliability/soak/sample"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (pathname.endsWith("/start")) sendJson(res, { success: true, ...(await startSoakTest(payload)) });
        else if (pathname.endsWith("/stop")) sendJson(res, { success: true, state: stopSoakTest(payload.reason || "用户停止浸泡测试") });
        else sendJson(res, { success: true, state: await sampleSoakTestNow() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error.message || String(error) }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/execution-kernel/self-test" && req.method === "GET") {
    try { sendJson(res, { success: true, ...runExecutionKernelSelfTest() }); }
    catch (e: any) { sendJson(res, { success: false, error: e.message }, 500); }
    return true;
  }

  if (pathname === "/api/tasks/rollback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = loadTasks().find((item: any) => item.id === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        if (runningTaskIds.has(taskId)) return sendJson(res, { error: "任务仍在执行，请先停止后再撤销" }, 409);
        const checkpointIds = uniqueStrings(listExecutions({ taskId }).flatMap((item: any) => item.checkpointIds || [])).reverse();
        if (!checkpointIds.length) return sendJson(res, { error: "该任务没有可用的安全检查点" }, 409);
        const reason = compactFormText(payload.reason, "用户安全撤销任务改动");
        const rollbacks = checkpointIds.map((checkpointId: string) => rollbackExecutionCheckpoint(checkpointId, reason, { allowShared: true }));
        const now = new Date().toISOString();
        const summary = { ...(task.delivery_summary || {}), headline: "最近一轮改动已安全撤销", acceptance_gate_passed: false, reverted: true, reverted_at: now };
        const updated = updateTask(taskId, { status: "cancelled", auto_execute: false, rolled_back_at: now, rollback_reason: reason, rollback_results: rollbacks, status_detail: "已安全撤销到任务开始前", delivery_summary: summary });
        closeTaskAgentSessions({ taskId }, "用户安全撤销任务改动");
        updateGroupTaskInlineStatus(updated || task, "cancelled", "已安全撤销到任务开始前");
        appendTaskTimelineEvent(taskId, { type: "task_rollback", title: "安全撤销完成", detail: `已恢复 ${rollbacks.length} 个检查点`, status: "ok", phase: "cancelled", data: { checkpoint_ids: checkpointIds } });
        addTaskLog(taskId, "warning", `安全撤销完成：恢复 ${rollbacks.length} 个检查点`);
        sendJson(res, { success: true, task: updated, rollbacks });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = loadTasks().find((item: any) => item.id === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        if (task.status === "done") return sendJson(res, { error: "已完成任务不能取消" }, 409);
        for (const queue of taskQueues.values()) {
          let index = queue.indexOf(taskId);
          while (index >= 0) { queue.splice(index, 1); index = queue.indexOf(taskId); }
        }
        const reason = compactFormText(payload.reason, "用户主动停止任务");
        const cancellation = requestTaskCancellation(taskId, reason, String(payload.actor || "local-user"));
        const isRunning = runningTaskIds.has(taskId);
        const sessions = closeTaskAgentSessions({ taskId }, "用户取消任务，关闭任务级原生会话");
        const idempotencySettled = task.trace_id ? settleIdempotencyByTrace(task.trace_id, "failed", { cancelled: true, task_id: taskId, reason }) : [];
        const worktrees: any[] = [];
        for (const execution of listExecutions({ taskId })) {
          if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt) continue;
          try { worktrees.push({ execution_id: execution.id, ...cleanupExecutionWorktree(execution.id, true) }); }
          catch (error: any) { worktrees.push({ execution_id: execution.id, success: false, error: error.message }); }
        }
        const updated = updateTask(taskId, { status: isRunning ? "in_progress" : "cancelled", auto_execute: false, is_paused: true, paused: true, status_detail: isRunning ? "取消请求已发送，正在终止 Agent 进程" : "任务已取消", cancellation_requested_at: new Date().toISOString(), cancellation_reason: reason, cancellation_cleanup: { sessions_closed: sessions.length, idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0), worktrees }, ...(isRunning ? {} : { cancelled_at: new Date().toISOString() }) });
        if (!isRunning) {
          releaseTaskLease(taskId, "cancelled");
          clearTaskCancellation(taskId);
        }
        updateGroupTaskInlineStatus(updated || task, isRunning ? "in_progress" : "cancelled", isRunning ? "正在终止 Agent 进程" : "任务已取消");
        addTaskLog(taskId, "warning", isRunning ? "已发送取消请求，正在终止 Agent 进程树" : "已从队列移除并取消任务");
        await ctx.onTaskStatusChange?.(updated || task, isRunning ? "cancelling" : "cancelled", reason);
        sendJson(res, { success: true, task: updated, running: isRunning, cancellation, cleanup: updated?.cancellation_cleanup, queue_status: getQueueStatus() });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (["/api/tasks/execution/rollback", "/api/tasks/execution/merge", "/api/tasks/execution/cleanup"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        let result: any;
        if (pathname.endsWith("/rollback")) result = rollbackExecutionCheckpoint(String(payload.checkpoint_id || payload.checkpointId || ""), String(payload.reason || ""), { allowShared: payload.allow_shared === true || payload.allowShared === true });
        else if (pathname.endsWith("/merge")) result = mergeExecutionWorktree(String(payload.execution_id || payload.executionId || ""), { force: !!payload.force, commit: payload.commit !== false, message: payload.message || "" });
        else result = cleanupExecutionWorktree(String(payload.execution_id || payload.executionId || ""), !!payload.force);
        const executionId = String(payload.execution_id || payload.executionId || result?.executionId || "");
        const executionRecord = executionId ? loadExecution(executionId) : null;
        const task = executionRecord?.taskId ? loadTasks().find((item: any) => item.id === executionRecord.taskId) : null;
        if (task?.trace_id) {
          const action = pathname.endsWith("/merge") ? "merge" : pathname.endsWith("/rollback") ? "rollback" : "cleanup";
          appendTraceEvent(task.trace_id, { id: `execution:${executionId}:${action}:${result?.mergeCommit || result?.rolledBackAt || result?.cleanedAt || "done"}`, type: `execution.${action}`, status: "ok", task_id: task.id, group_id: task.group_id || "", agent: executionRecord?.project || "", message: result?.duplicate ? `${action} 重复请求已复用原结果` : `${action} 操作完成`, data: result });
        }
        sendJson(res, result);
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks/execution/checkpoint" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const executionId = String(payload.execution_id || payload.executionId || "").trim();
        if (!executionId) return sendJson(res, { error: "缺少 Execution ID" }, 400);
        const execution = loadExecution(executionId);
        if (!execution) return sendJson(res, { error: "执行记录不存在" }, 404);
        const workDir = String(execution.workspace?.worktreePath || execution.workspace?.workDir || execution.packet?.workDir || "").trim();
        if (!workDir || !fs.existsSync(workDir)) return sendJson(res, { error: "执行工作目录不存在" }, 409);
        const checkpoint = createExecutionCheckpoint({ executionId, taskId: execution.taskId, workDir, mode: execution.workspace?.mode || execution.packet?.isolation?.mode || "shared", label: String(payload.label || "用户检查点") });
        if (execution.taskId) {
          const task = loadTasks().find((item: any) => item.id === execution.taskId);
          if (task?.trace_id) appendTraceEvent(task.trace_id, { type: "execution.checkpoint", status: "ok", task_id: task.id, agent: execution.project, message: `已创建检查点 ${checkpoint.id}`, data: { execution_id: executionId, checkpoint_id: checkpoint.id } });
        }
        sendJson(res, { success: true, checkpoint });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks" && req.method === "GET") {
    const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
    const onlyArchived = String(parsed.query.archived || "") === "true";
    const allTasks = loadTasks();
    const tasks = onlyArchived
      ? allTasks.filter((task: any) => task.archived || task.deleted_at)
      : includeArchived ? allTasks : allTasks.filter((task: any) => !task.archived && !task.deleted_at);
    sendJson(res, { tasks, archived_count: allTasks.filter((task: any) => task.archived || task.deleted_at).length });
    return true;
  }

  if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const requirement = compactFormText(payload.requirement || payload.goal || payload.message, "");
        if (!requirement) return sendJson(res, { error: "请先说说你想完成什么" }, 400);
        const groups = loadGroups();
        const group = groups.find((item: any) => item.id === (payload.group_id || payload.groupId)) || null;
        const requestedProject = compactFormText(payload.target_project || payload.targetProject, "");
        const coordinator = group?.members?.find((member: any) => member.role === "coordinator")?.project || group?.members?.[0]?.project || "";
        const targetProject = requestedProject || coordinator || getConfigs()[0]?.name || "";
        if (!targetProject && !group) return sendJson(res, { error: "还没有可执行项目，请先添加项目或开发群聊" }, 409);
        const lower = requirement.toLowerCase();
        const areas = [
          /(页面|前端|ui|组件|样式)/i.test(lower) ? "前端页面与交互" : "",
          /(接口|后端|服务|数据库|api)/i.test(lower) ? "后端接口与数据" : "",
          /(测试|修复|bug|报错)/i.test(lower) ? "测试与回归验证" : "",
        ].filter(Boolean);
        if (!areas.length) areas.push(group ? "群聊内相关项目" : "目标项目");
        const acceptance = compactFormText(payload.acceptance_criteria || payload.acceptanceCriteria, "") || [
          "目标功能按描述完成，并覆盖主要正常流程",
          "相关项目通过现有构建或测试命令",
          "交付报告列出实际修改文件、验证结果和剩余风险",
        ].join("；");
        const risks = [
          group ? "多个项目之间的接口或数据契约需要保持一致" : "实现范围可能需要根据现有代码进一步收敛",
          "涉及既有行为时需要回归验证，避免影响当前功能",
        ];
        const title = compactFormText(payload.title, "") || requirement.replace(/\s+/g, " ").slice(0, 48);
        const intakeDraft = {
          requirement,
          project: targetProject,
          group_id: group?.id || "",
          group_name: group?.name || "",
          scope: areas,
          acceptance,
          risks,
          generated_at: new Date().toISOString(),
        };
        const task = createTask({
          title,
          description: requirement,
          business_goal: requirement,
          acceptance_criteria: acceptance,
          target_project: targetProject,
          group_id: group?.id || null,
          assign_type: group ? "group" : "project",
          workflow_type: group ? "daily_dev" : "general",
          requires_code_changes: payload.requires_code_changes !== false,
          requires_verification: true,
          auto_execute: false,
          intake_state: "awaiting_confirmation",
          intake_draft: intakeDraft,
        });
        const updated = updateTask(task.id, { status: "pending", auto_execute: false, intake_state: "awaiting_confirmation", intake_draft: intakeDraft, status_detail: "执行计划已准备好，等待你确认" }) || task;
        appendTraceEvent(updated.trace_id, { type: "intake.previewed", status: "ok", task_id: updated.id, group_id: updated.group_id || "", agent: targetProject, message: "已生成执行前确认卡，尚未开始执行", data: intakeDraft });
        sendJson(res, { success: true, task: updated, confirmation: intakeDraft, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/usability/intake/confirm" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (current.intake_state === "confirmed") return sendJson(res, { success: true, duplicate: true, task: current, trace_id: current.trace_id });
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效" }, 409);
        const task = updateTask(taskId, {
          intake_state: "confirmed",
          confirmed_at: new Date().toISOString(),
          auto_execute: true,
          status: "pending",
          status_detail: "你已确认执行计划，正在进入执行队列",
        }) || current;
        appendTraceEvent(task.trace_id, { type: "intake.confirmed", status: "ok", task_id: task.id, group_id: task.group_id || "", agent: task.target_project || "", message: "用户确认执行，复用原 Task/Trace 开始工作" });
        appendTaskTimelineEvent(task.id, { type: "plan_mode_confirmed", title: "用户已确认执行前计划", detail: "复用同一任务和 Trace 进入执行队列", status: "ok", phase: "queued", agent: task.target_project || "", data: { same_task_trace: true } });
        const queueResult = enqueueTask(task.id, ctx);
        const updated = updateTask(task.id, {
          status_detail: queueResult.message || "已进入执行队列",
          workflow_meta: {
            ...(task.workflow_meta || {}),
            project_mission: {
              ...((task.workflow_meta || {}).project_mission || {}),
              control_state: "queued",
            },
          },
        }) || task;
        updateGroupTaskInlineStatus(updated, updated.status, updated.status_detail || "已进入执行队列");
        sendJson(res, { success: true, task: updated, queued: !!queueResult.queued, queue_result: queueResult, trace_id: task.trace_id, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const task = createTask(payload);
        let queueResult = null;
        if (payload.auto_execute || payload.autoExecute) {
          queueResult = enqueueTask(task.id, ctx);
        }
        sendJson(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      let operationKey = "";
      try {
        const payload = body ? JSON.parse(body) : {};
        operationKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
        const traceId = ensureTraceId(payload.trace_id || payload.traceId, "daily-dev");
        const groupId = payload.group_id || payload.groupId;
        if (!groupId) return sendJson(res, { error: "请选择目标开发群聊" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, { error: "开发群聊不存在" }, 404);
        const groupReadiness = validateDailyDevGroupReady(group);
        const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
        if (!goal) return sendJson(res, { error: "请输入业务目标" }, 400);
        const quality = evaluateDailyDevIntakeQuality(payload, goal);
        const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
        if (!quality.pass && !forceQualityGate) {
          return sendJson(res, {
            success: false,
            needs_confirmation: true,
            error: quality.message,
            quality,
          }, 422);
        }
        const operation = operationKey ? acquireIdempotency({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
        if (operation && !operation.acquired) {
          const existingTask = operation.record?.result?.task_id ? loadTasks().find((item: any) => item.id === operation.record.result.task_id) : null;
          sendJson(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
          return;
        }
        const title = compactFormText(payload.title, goal.slice(0, 60));
        const backlogFile = persistDailyDevBacklogFile(groups, group, payload, title, goal);
        const sourceDocuments = [
          payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
          backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
        ].filter(Boolean).join("\n\n");
        const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };

        const task = createTask({
          title,
          description: buildDailyDevTaskDescription(taskPayload),
          target_project: groupReadiness.coordinator.project,
          group_id: groupId,
          assign_type: "group",
          priority: payload.priority || "normal",
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          workflow_type: "daily_dev",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
          requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
          business_goal: goal,
          acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
          source_documents: sourceDocuments,
          workflow_meta: {
            ...(payload.workflow_meta || payload.workflowMeta || {}),
            intake_quality: quality,
            intake: backlogFile ? {
              backlog_file: backlogFile.name,
              persisted_at: new Date().toISOString(),
              source: "create-daily-dev",
            } : null,
          },
          trace_id: traceId,
          idempotency_key: operationKey || null,
        });
        if (backlogFile) {
          markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
            task_id: task.id,
            result: "业务开发任务已创建并关联此需求池条目",
          });
        }
        let queueResult = null;
        if (task.auto_execute) {
          queueResult = enqueueTask(task.id, ctx);
          if (backlogFile && queueResult?.blocked) {
            markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
              task_id: task.id,
              result: queueResult.message || "任务已创建，等待执行通道恢复",
            });
          }
        }
        if (operationKey) completeIdempotency("create-daily-dev", operationKey, { task_id: task.id, queued: !!queueResult?.queued });
        sendJson(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        if (operationKey) {
          try { failIdempotency("create-daily-dev", operationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
    const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
    const items = listDailyDevBacklogs(groupId);
    const counts = items.reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {});
    sendJson(res, { success: true, items, counts });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        const status = String(payload.status || "").trim();
        if (!groupId || !name || !status) return sendJson(res, { error: "缺少 group_id、name 或 status" }, 400);
        if (!["draft", "needs_user", "ready", "planned", "dispatched", "queued", "in_progress", "running", "reviewing", "blocked", "done", "failed"].includes(status)) {
          return sendJson(res, { error: "不支持的需求池状态" }, 400);
        }
        const file = markDailyDevBacklogStatus(groupId, name, status, {
          result: payload.reason || `用户手动设置为 ${status}`,
        });
        if (!file) return sendJson(res, { error: "需求池文件不存在" }, 404);
        const items = listDailyDevBacklogs(groupId);
        sendJson(res, { success: true, file, items });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = importSharedDocsToDailyDevBacklog({
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          force: !!payload.force,
          priority: payload.priority || "normal",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        if (!groupId || !name) return sendJson(res, { error: "缺少 group_id 或 name" }, 400);
        const result = dispatchDailyDevBacklog(groupId, name, ctx, {
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          force: !!payload.force,
        });
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = dispatchReadyDailyDevBacklogs(ctx, {
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/update" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, ...updates } = JSON.parse(body);
        const current = loadTasks().find(t => t.id === id);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        const validationError = validateTaskManualStatusUpdate(current, updates);
        if (validationError) return sendJson(res, { error: validationError }, 409);
        const task = updateTask(id, updates);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        updateGroupTaskInlineStatus(task, task.status, task.status_detail || "任务状态已更新");
        sendJson(res, { success: true, task });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/reconcile-delivery" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const result = reconcileTaskDeliveryEvidence(taskId);
        sendJson(res, result, result.success ? 200 : (result.status || 400));
      } catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/continue" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        const message = compactFormText(payload.message || payload.followup || payload.note, "");
        const result = continueTaskWithMessage(taskId, message, ctx, {
          source: payload.source || "user",
          auto_execute: payload.auto_execute,
          autoExecute: payload.autoExecute,
          continuationKind: payload.continuation_kind || payload.continuationKind || "auto",
          idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
        });
        if (!result.success) return sendJson(res, { error: result.error, new_task_suggested: result.new_task_suggested === true, continuation_kind: result.new_task_suggested ? "new_task" : undefined }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/continue-from-gaps" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const current = loadTasks().find(t => t.id === taskId);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        if (current.status === "done") return sendJson(res, { error: "已完成任务不需要按缺口继续" }, 409);

        const targeted = payload.rework_kind || payload.reworkKind || payload.target || payload.agent || payload.project || payload.reason;
        const message = compactFormText(payload.message, "") || (targeted ? buildTargetedReworkContinuationDraft(current, payload) : buildTaskGapContinuationDraft(current));
        const result = continueTaskWithMessage(taskId, message, ctx, {
          source: payload.source || (targeted ? "targeted_gap_rework" : "auto_gap_rework"),
          auto_execute: payload.auto_execute,
          autoExecute: payload.autoExecute,
          status_detail: targeted ? "已按精准缺口生成返工说明，等待主 Agent 继续执行" : "已按交付缺口生成返工说明，等待主 Agent 继续执行",
          idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
        });
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, {
          ...result,
          continuation_message: message,
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const task = archiveTask(payload.id, compactFormText(payload.reason, "用户删除任务并移入归档"));
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        sendJson(res, { success: true, task, cleanup: task.cleanup, archived: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/restore" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const task = restoreArchivedTask(payload.id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        sendJson(res, { success: true, task });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/purge" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const task = purgeArchivedTask(payload.id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        sendJson(res, { success: true, purged: true, task_id: task.id, cleanup: task.purge_cleanup || null });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks/bulk" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const ids = uniqueStrings(Array.isArray(payload.ids) ? payload.ids : []);
        const action = String(payload.action || "");
        if (!ids.length) return sendJson(res, { error: "请选择任务" }, 400);
        if (!["archive", "restore", "purge", "pause", "resume", "cancel"].includes(action)) return sendJson(res, { error: "不支持的批量操作" }, 400);
        const results = ids.map((id: string) => {
          try {
            if (action === "archive") return { id, success: !!archiveTask(id, "用户批量删除任务并移入归档") };
            if (action === "restore") return { id, success: !!restoreArchivedTask(id) };
            if (action === "purge") return { id, success: !!purgeArchivedTask(id) };
            if (action === "cancel") {
              removeTaskFromQueues(id);
              requestTaskCancellation(id, "用户批量取消任务", "task-governance");
              const task = updateTask(id, { status: "cancelled", auto_execute: false, cancelled_at: new Date().toISOString(), status_detail: "用户批量取消任务" });
              closeTaskAgentSessions({ taskId: id }, "用户批量取消任务");
              releaseTaskLease(id, "cancelled");
              return { id, success: !!task };
            }
            const paused = action === "pause";
            const task = updateTask(id, { status: paused ? "paused" : "pending", is_paused: paused, paused, status_detail: paused ? "用户批量暂停" : "用户批量恢复" });
            if (!paused && task) enqueueTask(id, ctx);
            return { id, success: !!task };
          } catch (error: any) { return { id, success: false, error: error.message }; }
        });
        sendJson(res, { success: results.every((item: any) => item.success), results }, results.some((item: any) => item.success) ? 200 : 409);
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_id } = JSON.parse(body);
        if (!task_id) return sendJson(res, { error: "缺少任务 ID" }, 400);

        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const queueResult = enqueueTask(task_id, ctx);
        sendJson(res, { success: true, message: queueResult.message, queued: queueResult.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/retry" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const operationKey = String(payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId || "").trim();
        const task = loadTasks().find((item: any) => item.id === taskId);
        const operation = operationKey ? acquireIdempotency({ scope: "task-retry", key: `${taskId}:${operationKey}`, traceId: task?.trace_id, leaseMs: 60_000 }) : null;
        if (operation && !operation.acquired) return sendJson(res, { success: true, duplicate: true, ...(operation.record?.result || {}), trace_id: operation.traceId });
        const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
        const result = retryTask(taskId, ctx, payload.reason || payload.message || "", autoExecute);
        if (!result.success) {
          if (operationKey) failIdempotency("task-retry", `${taskId}:${operationKey}`, result.error || "重试失败");
          return sendJson(res, { error: result.error }, result.status || 400);
        }
        if (operationKey) completeIdempotency("task-retry", `${taskId}:${operationKey}`, { task_id: taskId, queued: !!result.queue_result?.queued, retry_count: result.task?.retry_count });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/retry-runtime-failures" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, retryRuntimeFailedTasks(ctx, payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_ids } = JSON.parse(body);
        if (!task_ids || !Array.isArray(task_ids)) return sendJson(res, { error: "缺少任务 ID 列表" }, 400);

        const results = task_ids.map(id => ({ task_id: id, ...enqueueTask(id, ctx) }));
        const queuedCount = results.filter(r => r.queued).length;
        sendJson(res, { success: true, message: `${queuedCount}/${task_ids.length} 个任务已加入队列`, results, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
    sendJson(res, getQueueStatus());
    return true;
  }

  if (pathname === "/api/tasks/watchdog" && req.method === "GET") {
    const staleMs = parsed.query.stale_ms ? Number(parsed.query.stale_ms) : TASK_WATCHDOG_STALE_MS;
    sendJson(res, getTaskWatchdogStatus(staleMs));
    return true;
  }

  if (pathname === "/api/tasks/watchdog/resume" && req.method === "POST") {
    try {
      sendJson(res, runTaskWatchdog(ctx));
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/tasks/runtime-debt/cleanup" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, cleanupRuntimeDebt(payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue/resume" && req.method === "POST") {
    try {
      sendJson(res, { success: true, ...resumeTaskQueues(ctx, { force: true }) });
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
    taskQueues.clear();
    sendJson(res, { success: true, message: "队列已清空" });
    return true;
  }

  if (pathname === "/api/tasks/logs" && req.method === "GET") {
    const taskId = parsed.query.task_id;
    const limit = parseInt(parsed.query.limit) || 50;
    if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
    const logs = getTaskLogs(taskId, limit);
    sendJson(res, { success: true, logs });
    return true;
  }

  if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_id } = JSON.parse(body);
        if (!task_id) return sendJson(res, { error: "缺少任务 ID" }, 400);
        clearTaskLogs(task_id);
        sendJson(res, { success: true, message: "日志已清空" });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 群聊主 Agent / Orchestrator API ===
  if (pathname === "/api/orchestrator/config" && req.method === "GET") {
    sendJson(res, { success: true, config: publicOrchestratorConfig(loadOrchestratorConfig()) });
    return true;
  }

  if (pathname === "/api/orchestrator/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        const config = saveOrchestratorConfig(updates);
        sendJson(res, { success: true, config: publicOrchestratorConfig(config) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/test" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groups = loadGroups();
        const group = payload.group_id
          ? groups.find(g => g.id === payload.group_id)
          : groups[0];
        if (!group) return sendJson(res, { error: "请先创建一个群聊并添加项目 Agent" }, 400);
        const message = String(payload.message || "帮我排查登录页面调用接口失败的问题，前后端都看一下").trim();
        const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
        const result = await runGroupOrchestrator({ group, message, source: "test", sharedFilesContext });
        sendJson(res, { success: true, result });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/diagnostics" && req.method === "GET") {
    try {
      sendJson(res, buildDailyDevAgentDiagnostics());
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/main-agent-actions" && req.method === "GET") {
    try {
      const selfTest = runGroupMainAgentActionRegistrySelfTest();
      const toolLoopSelfTest = runGroupMainAgentToolLoopSelfTest();
      sendJson(res, {
        success: true,
        version: "group-main-agent-action-registry-1.0",
        actions: getGroupMainAgentActionRegistry(),
        selfTest,
        toolLoopSelfTest,
      });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/runtime-monitors") {
    if (req.method === "GET") {
      sendJson(res, applyRuntimeMonitorControl("status", ctx));
      return true;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          sendJson(res, applyRuntimeMonitorControl(payload.action || "status", ctx));
        } catch (e: any) {
          sendJson(res, { success: false, error: e.message }, 400);
        }
      });
      return true;
    }
  }

  if (pathname === "/api/orchestrator/daily-dev-autopilot/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = runDailyDevAutopilotOnce(ctx, {
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          import_shared_docs: payload.import_shared_docs !== false && payload.importSharedDocs !== false,
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-autopilot/ensure-cron" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, ensureDailyDevAutopilotCronJobs(payload));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-rehearsal" && (req.method === "GET" || req.method === "POST")) {
    if (req.method === "GET") {
      try {
        sendJson(res, buildDailyDevWorkflowRehearsal());
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, buildDailyDevWorkflowRehearsal(payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-smoke-task" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, createDailyDevSmokeTask(payload, ctx));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-smoke-status" && (req.method === "GET" || req.method === "POST")) {
    if (req.method === "GET") {
      try {
        sendJson(res, getDailyDevSmokeStatus({
          task_id: parsed.query.task_id || parsed.query.taskId,
        }));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, getDailyDevSmokeStatus(payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/agent-cli-probe/batch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await runAgentCliProbeBatch(payload, ctx);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/agent-cli-probe" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await runAgentCliProbe(payload, ctx);
        sendJson(res, result, result.success ? 200 : (result.blocked ? 409 : 500));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/switch-executor" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const result = switchTaskExecutor(taskId, payload.runtime || payload.agent_type || payload.agentType, ctx, payload);
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/runtime-fallback-probe" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await runRuntimeFallbackProbe(payload, ctx);
        sendJson(res, result, result.success ? 200 : 500);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/agent-recovery-monitor/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await runAgentRecoveryMonitorOnce(ctx, payload);
        sendJson(res, result, result.success ? 200 : 409);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  // === 群聊 API ===
  if (pathname === "/api/groups" && req.method === "GET") {
    sendJson(res, { groups: loadGroups() });
    return true;
  }

  if (pathname === "/api/groups/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, members } = JSON.parse(body);
        const groups = loadGroups();
        const id = "g" + Date.now().toString(36);
        const allMembers = Array.isArray(members) ? members : [];
        const group = normalizeGroupOrchestrator({
          id, name, members: allMembers,
          created_at: new Date().toISOString(),
        });
        groups.push(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/members" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, add, remove } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (add) {
          for (const m of add) {
            if (!group.members.find((x: any) => x.project === m.project)) {
              group.members.push(m);
            }
          }
        }
        if (remove) {
          const coordinatorProject = getCoordinatorMember(group).project;
          group.members = group.members.filter((m: any) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
        }
        normalizeGroupOrchestrator(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        const groups = loadGroups().filter(g => g.id !== id);
        saveGroups(groups);
        try {
          fs.unlinkSync(path.join(GROUP_MESSAGES_DIR, `${id}.json`));
        } catch {}
        try {
          fs.unlinkSync(getGroupMemoryFile(id));
        } catch {}
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, name } = JSON.parse(body);
        if (!name || !name.trim()) return sendJson(res, { error: "群聊名称不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.name = name.trim();
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    sendJson(res, { tools: group.tools || { mcp: [], skill: [] } });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, tools } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.tools = tools;
        saveGroups(groups);
        sendJson(res, { success: true, tools: group.tools });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const before = JSON.stringify(group.shared_files || []);
    group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
    if (JSON.stringify(group.shared_files) !== before) saveGroups(groups);
    sendJson(res, { files: group.shared_files || [] });
    return true;
  }

  if (pathname === "/api/groups/shared/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name, content } = JSON.parse(body);
        if (!name || !content) return sendJson(res, { error: "文件名和内容不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        const existing = group.shared_files.findIndex((f: any) => f.name === name);
        if (existing >= 0) {
          group.shared_files[existing].content = content;
          group.shared_files[existing].type = "text";
          group.shared_files[existing].readable = true;
          group.shared_files[existing].updated_at = new Date().toISOString();
        } else {
          group.shared_files.push({
            name,
            type: "text",
            readable: true,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        group.shared_files = group.shared_files.filter((f: any) => f.name !== name);
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/import" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, file_names } = JSON.parse(body);
        if (!file_names || !Array.isArray(file_names)) return sendJson(res, { error: "请提供文件名列表" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];

        let imported = 0;
        for (const name of file_names) {
          const filePath = ctx.getSharedFilePath(name);
          if (filePath && fs.existsSync(filePath)) {
            const record = ctx.createSharedFileRecord(name, "global");
            if (!record) continue;
            const existing = group.shared_files.findIndex((f: any) => f.name === name);
            if (existing >= 0) {
              group.shared_files[existing] = {
                ...group.shared_files[existing],
                ...record,
                created_at: group.shared_files[existing].created_at || record.created_at,
                updated_at: new Date().toISOString()
              };
            } else {
              group.shared_files.push(record);
            }
            imported++;
          }
        }
        saveGroups(groups);
        sendJson(res, { success: true, imported, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/agent-collaboration/protocol" && req.method === "GET") {
    const items = getAgentQaItemsForGroup(String(parsed.query.group_id || parsed.query.id || ""), parseInt(parsed.query.limit) || 100);
    sendJson(res, {
      success: true,
      version: "8.0",
      mode: "task_bound_structured_collaboration",
      selftest: runAgentCollaborationProtocolSelfTest(),
      summary: {
        total: items.length,
        open: items.filter((item: any) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || ""))).length,
        accepted: items.filter((item: any) => item.acceptance?.accepted === true).length,
        rejected: items.filter((item: any) => item.acceptance?.accepted === false).length,
        resumed: items.filter((item: any) => item.status === "resumed").length,
        permission_violations: items.filter((item: any) => item.permission_boundary?.pass === false).length,
      },
      items,
    });
    return true;
  }

  if (pathname === "/api/agent-qa/arbitrate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const decision = String(payload.decision || "").toLowerCase();
        if (!["accept", "reject"].includes(decision)) return sendJson(res, { success: false, error: "decision 必须是 accept 或 reject" }, 400);
        const item = setAgentQaArbitration(String(payload.id || payload.qa_id || ""), decision as "accept" | "reject", String(payload.reason || ""));
        if (!item) return sendJson(res, { success: false, error: "问答记录不存在" }, 404);
        const group = loadGroups().find((entry: any) => entry.id === item.group_id);
        const wakeup = decision === "accept" && group ? await resumeAgentQaFromStoredContinuation(item, group, ctx, null) : { resumed: false };
        sendJson(res, { success: true, item: wakeup.resumed ? (wakeup as any).item : item, wakeup });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/agent-qa/manual-takeover" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const item = setAgentQaManualTakeover(String(payload.id || payload.qa_id || ""), String(payload.reason || ""));
        if (!item) return sendJson(res, { success: false, error: "问答记录不存在" }, 404);
        sendJson(res, { success: true, item });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/agent-qa/retry" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = await retryAgentQaItem(String(payload.id || payload.qa_id || ""), ctx, null);
        sendJson(res, result, result.success ? 200 : 400);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }
  if (pathname === "/api/agent-qa/list" && req.method === "GET") {
    const groupId = parsed.query.group_id || parsed.query.id || "";
    const limit = parseInt(parsed.query.limit) || 100;
    sendJson(res, { success: true, items: getAgentQaItemsForGroup(String(groupId || ""), limit) });
    return true;
  }

  if (pathname === "/api/groups/messages" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const limit = parseInt(parsed.query.limit) || 100;
    const rawMessages = getGroupMessages(groupId).slice(-limit);
    const taskIds = new Set(rawMessages.map((message: any) => String(message?.task_id || message?.task?.id || "")).filter(Boolean));
    const taskMap = new Map(loadTasks().filter((task: any) => taskIds.has(String(task.id))).map((task: any) => [String(task.id), task]));
    const runtimeMap = new Map<string, any>();
    const messages = rawMessages.map((message: any) => {
      const taskId = String(message?.task_id || message?.task?.id || "");
      const task = taskMap.get(taskId);
      if (!task) return message;
      if (!runtimeMap.has(taskId)) runtimeMap.set(taskId, buildInlineTaskRuntime(task));
      const runtime = runtimeMap.get(taskId);
      return { ...message, taskRuntime: runtime, task_runtime: runtime };
    });
    // Polling is a read path. Persisting memory here rewrote backups every few
    // seconds and could block the event loop even when nothing had changed.
    const memory = loadGroupMemory(String(groupId));
    sendJson(res, { messages, memory, agentQa: getAgentQaItemsForGroup(String(groupId), 100) });
    return true;
  }

  if (pathname === "/api/groups/messages/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const groupId = String(payload.id || payload.group_id || "").trim();
        if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const group = loadGroups().find((item: any) => item.id === groupId);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        const before = getGroupMessages(groupId).length;
        saveGroupMessages(groupId, []);
        if (payload.clear_memory === true || payload.clearMemory === true) {
          try { fs.unlinkSync(getGroupMemoryFile(groupId)); } catch {}
        }
        sendJson(res, { success: true, cleared: before, memory_cleared: payload.clear_memory === true || payload.clearMemory === true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const project = parsed.query.project ? String(parsed.query.project) : "";
    const memory = saveGroupMemory(groupId, loadGroupMemory(groupId));
    sendJson(res, {
      success: true,
      memory,
      context: buildGroupMemoryContext(memory),
      agentPacket: project ? buildAgentMemoryPacket(groupId, project) : "",
    });
    return true;
  }

  if (pathname === "/api/groups/logs" && req.method === "GET") {
    const groupId = parsed.query.id;
    const limit = parseInt(parsed.query.limit) || 100;
    const category = parsed.query.category;

    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const logs = loadGroupLogs();
    let groupLogs = logs[groupId] || [];
    if (category) {
      groupLogs = groupLogs.filter((l: any) => l.category === category);
    }
    sendJson(res, { logs: groupLogs.slice(-limit) });
    return true;
  }

  if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id } = JSON.parse(body);
        const logs = loadGroupLogs();
        delete logs[group_id];
        saveGroupLogs(logs);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);

    const logs = loadGroupLogs();
    const initialCount = (logs[groupId] || []).length;
    let lastCount = initialCount;

    const interval = setInterval(() => {
      try {
        const currentLogs = loadGroupLogs();
        const groupLogs = currentLogs[groupId] || [];

        if (groupLogs.length > lastCount) {
          const newLogs = groupLogs.slice(lastCount);
          for (const log of newLogs) {
            res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
          }
          lastCount = groupLogs.length;
        }
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      }
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
    });
    return true;
  }

  if (pathname === "/api/groups/send" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleGroupSend = async (payload: any, uploadedFiles = []) => {
      let reliabilityOperationKey = "";
      try {
        const { group_id, target_project, message, client_message_id } = payload;
        const userMessage = String(message || "").trim();
        const uploadedFilesContext = ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
        const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
        const messageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
        const userMessageForHistory = attachmentSummary
          ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
          : userMessage;
        if (!messageForAgent) return sendJson(res, { error: "消息或附件不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);
        normalizeGroupOrchestrator(group);

        const routing = selectGroupTargets(group, target_project);
        const isBroadcast = routing.isBroadcast;
        const isOrchestrated = routing.orchestrated;
        const targetMembers = routing.members;

        if (targetMembers.length === 0) {
          return sendJson(res, { error: "没有找到目标项目" }, 400);
        }

        const messageMode = String(payload.message_mode || payload.messageMode || "conversation").trim().toLowerCase();
        const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId, "group");
        const taskIntent = classifyGroupProjectTaskIntent(userMessage, uploadedFiles);
        const forceProjectTask = payload.force_task === true || payload.forceTask === true;
        const persistentTaskRequest = shouldCreatePersistentGroupTask({ isOrchestrated, messageMode, taskIntent, forceProjectTask });
        const projectAnalysisRequest = shouldUseProjectAnalysisMode({ isOrchestrated, messageMode, taskIntent }) && !persistentTaskRequest;
        const continuationKind = classifyTaskContinuation(userMessage);
        const continuationTask = persistentTaskRequest && continuationKind !== "new_task" && looksLikeTaskContinuation(userMessage)
          ? loadTasks()
            .filter((item: any) => item.group_id === group_id && !item.archived && !item.deleted_at && !["cancelled", "archived"].includes(String(item.status || "")))
            .filter((item: any) => item.status !== "done" || Date.now() - Date.parse(item.completed_at || item.updated_at || "") < 30 * 60 * 1000)
            .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0]
          : null;
        const groupOperationKey = persistentTaskRequest && client_message_id ? `${group_id}:${String(client_message_id)}` : "";
        reliabilityOperationKey = groupOperationKey;
        const groupOperation = groupOperationKey
          ? acquireIdempotency({ scope: "group-task-message", key: groupOperationKey, traceId: messageTraceId, leaseMs: 10 * 60 * 1000, metadata: { group_id, client_message_id: String(client_message_id) } })
          : null;
        if (groupOperation && !groupOperation.acquired) {
          const replay = groupOperation.record?.result || {};
          res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
          writeSse(res, { type: "duplicate_suppressed", text: groupOperation.inProgress ? "相同群聊消息正在处理，已阻止重复派发" : "相同群聊消息已经处理，返回原任务", traceId: groupOperation.traceId, task: replay.task || null, queue: replay.queue || null });
          writeSse(res, { type: "done", taskId: replay.task?.id || "", traceId: groupOperation.traceId });
          res.end();
          return;
        }

        const userMsg = {
          id: client_message_id ? String(client_message_id) : "m" + Date.now().toString(36),
          role: "user",
          target: routing.targetLabel,
          content: userMessageForHistory,
          timestamp: new Date().toISOString(),
          trace_id: messageTraceId,
          ...(continuationTask ? { task_id: continuationTask.id } : {}),
        };
        appendGroupMessage(group_id, userMsg);
        for (const member of targetMembers) {
          ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
        }

        addGroupLog(group_id, "info", "message", `用户发送消息给 ${isOrchestrated ? '主 Agent' : isBroadcast ? '所有人' : target_project}`, {
          message: userMessageForHistory.substring(0, 200),
          target: routing.targetLabel,
          is_broadcast: isBroadcast,
          orchestrated: isOrchestrated,
          task_intent: taskIntent,
          task_card_allowed: persistentTaskRequest,
        });

        const configs = getConfigs();
        if (continuationTask) {
          const continuation = continueTaskWithMessage(continuationTask.id, messageForAgent, ctx, {
            source: "group_chat_followup",
            continuationKind,
            auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
            idempotencyKey: client_message_id ? `group-followup:${client_message_id}` : "",
          });
          if (!continuation.success) return sendJson(res, { error: continuation.error, new_task_suggested: continuation.new_task_suggested }, continuation.status || 400);
          if (groupOperationKey) completeIdempotency("group-task-message", groupOperationKey, { task: continuation.task, queue: continuation.queue_result, continuation: true });
          res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
          const continuationDecision = appendMainAgentDecisionTrace({
            groupId: group_id,
            traceId: continuation.trace_id || messageTraceId,
            messageId: userMsg.id,
            taskId: continuation.task?.id || continuationTask.id,
            coordinator: getCoordinatorMember(group).project,
            mode: "followup",
            messageMode,
            taskIntent,
            dispatchPolicy: { action: "replan", reason: `追加要求：${continuationKind}`, nextStep: continuation.deferred ? "等待当前轮完成后继续" : "已并入原任务" },
            observations: { continuation_kind: continuationKind, same_task: true, deferred: continuation.deferred === true },
            reply: { kind: "task_update", text: continuation.deferred ? "追加要求已收到，本轮结束后继续" : "追加要求已并入原任务" },
          });
          applyMainAgentDecisionPetState(ctx, continuationDecision);
          writeSse(res, { type: "task_updated", agent: getCoordinatorMember(group).project, text: continuation.deferred ? "追加要求已收到，本轮结束后继续" : "追加要求已并入原任务", task: continuation.task, taskId: continuation.task?.id, traceId: continuation.trace_id, continuationKind, sameTaskTrace: true });
          writeSse(res, { type: "main_agent_decision", decision: continuationDecision, traceId: continuation.trace_id || messageTraceId });
          writeSse(res, { type: "done", taskId: continuation.task?.id, traceId: continuation.trace_id });
          res.end();
          return;
        }
        // 项目任务模式会创建持久工单。后续执行由可恢复任务队列持有，不依赖本次 SSE 连接。
        if (persistentTaskRequest) {
          const groupReadiness = validateDailyDevGroupReady(group);
          const coordinator = groupReadiness.coordinator || getCoordinatorMember(group);
          const attachmentRecords = (uploadedFiles || []).map((file: any) => ({
            name: file.filename || file.name || "",
            path: file.savedPath || file.path || "",
            size: Number(file.size || 0),
          })).filter((file: any) => file.name || file.path);
          const firstDirectiveLine = userMessage.split(/\r?\n/).map((line: string) => line.trim()).find(Boolean) || "";
          const attachmentTitle = attachmentRecords.map((file: any) => file.name).filter(Boolean).join("、");
          const taskTitle = compactMemoryText(firstDirectiveLine || (attachmentTitle ? `处理需求文档：${attachmentTitle}` : "项目开发任务"), 80);
          const sourceDocuments = [
            userMessage ? `用户原始开发指令：\n${userMessage}` : "",
            uploadedFilesContext ? `用户提交的开发文档：${uploadedFilesContext}` : "",
          ].filter(Boolean).join("\n\n");
          const acceptanceCriteria = [
            "主 Agent 必须完成需求理解、计划、子 Agent 分派、执行跟踪、必要返工和最终验收。",
            "涉及代码的任务必须提供实际文件变更和已执行的构建或测试证据。",
            "最终报告必须说明完成内容、变更文件、验证结果、风险以及仍需用户处理的事项。",
          ].join(" ");
          const now = new Date().toISOString();
          const flagEnabled = (value: any, fallback = true) => {
            if (value === undefined || value === null || value === "") return fallback;
            return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
          };
          const planModePreflight = buildGroupPlanModePreflight({
            group,
            message: userMessage || taskTitle,
            ctx,
            configs,
            taskIntent,
            attachmentCount: attachmentRecords.length,
            coordinatorProject: coordinator.project,
          });
          const requestedAutoExecute = flagEnabled(payload.auto_execute ?? payload.autoExecute, true);
          const autoExecute = requestedAutoExecute && planModePreflight.requires_confirmation !== true;
          const inferredAgentQa = /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(userMessage);
          const requiresAgentQa = flagEnabled(payload.requires_agent_qa ?? payload.requiresAgentQa, inferredAgentQa);
          let task = createTask({
            title: taskTitle,
            description: buildDailyDevTaskDescription({
              title: taskTitle,
              business_goal: userMessage || taskTitle,
              scope: "由项目主 Agent 根据用户指令、附件和项目上下文识别影响范围。",
              documents: sourceDocuments,
              acceptance: acceptanceCriteria,
              constraints: "主 Agent 对任务全程负责；验收门禁未通过时不得向用户报告完成。",
              plan_mode: planModePreflight,
            }),
            target_project: coordinator.project,
            group_id,
            assign_type: "group",
            priority: payload.priority || "normal",
            auto_execute: autoExecute,
            workflow_type: "daily_dev",
            requires_code_changes: flagEnabled(payload.requires_code_changes ?? payload.requiresCodeChanges, true),
            requires_verification: flagEnabled(payload.requires_verification ?? payload.requiresVerification, true),
            requires_agent_qa: requiresAgentQa,
            business_goal: userMessage || taskTitle,
            acceptance_criteria: acceptanceCriteria,
            source_documents: sourceDocuments,
            source_attachments: attachmentRecords,
            intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
            intake_draft: planModePreflight,
            workflow_meta: {
              plan_mode: planModePreflight,
              intake: {
                source: "group-chat-project-task",
                message_mode: messageMode,
                client_message_id: client_message_id || null,
                accepted_at: now,
                attachment_count: attachmentRecords.length,
                task_intent: taskIntent,
                plan_mode: planModePreflight,
                requires_confirmation: planModePreflight.requires_confirmation === true,
                auto_continue: planModePreflight.auto_continue === true,
                requested_auto_execute: requestedAutoExecute,
              },
              project_mission: {
                owner_agent: coordinator.project,
                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
                user_directive: userMessage || "请读取并完成附件中的开发需求",
              },
            },
            trace_id: messageTraceId,
            idempotency_key: groupOperationKey ? `group-task-message:${groupOperationKey}` : null,
          });
          task = updateTask(task.id, {
            auto_execute: autoExecute,
            intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
            intake_draft: planModePreflight,
            status_detail: planModePreflight.requires_confirmation
              ? "执行前计划已准备好，等待你确认后才会派发子 Agent"
              : "执行前计划已完成，低风险任务自动进入执行队列",
            workflow_meta: {
              ...(task.workflow_meta || {}),
              plan_mode: planModePreflight,
              intake: {
                ...((task.workflow_meta || {}).intake || {}),
                plan_mode: planModePreflight,
                requires_confirmation: planModePreflight.requires_confirmation === true,
                auto_continue: planModePreflight.auto_continue === true,
                requested_auto_execute: requestedAutoExecute,
              },
              project_mission: {
                ...((task.workflow_meta || {}).project_mission || {}),
                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
              },
            },
          }) || task;
          appendTaskTimelineEvent(task.id, {
            type: planModePreflight.requires_confirmation ? "plan_mode_waiting_confirmation" : "plan_mode_auto_continue",
            title: planModePreflight.requires_confirmation ? "主 Agent 已生成执行前计划" : "主 Agent 已完成执行前计划",
            detail: planModePreflight.risk?.summary || taskTitle,
            status: "active",
            phase: "intake",
            agent: coordinator.project,
            data: { attachment_count: attachmentRecords.length, source: "group-chat", plan_mode: planModePreflight },
          });

          const receiptMessageId = "m" + Date.now().toString(36) + "mission";
          const understoodGoal = compactMemoryText(userMessage || task.title, 180).replace(/[。.!！]+$/g, "");
          const receiptContent = planModePreflight.requires_confirmation
            ? `我先按只读方式看了一轮：${understoodGoal}。这个需求${planModePreflight.risk?.summary ? `因为「${planModePreflight.risk.summary}」` : "需要先确认范围"}，我已经整理好执行前计划。你确认后，我再派发子 Agent 开始修改。`
            : `我明白了：${understoodGoal}。我已完成执行前只读检查，风险较低，会进入队列开始修改和检查，进度会持续更新在下方任务卡中。`;
          const receiptMessage = {
            id: receiptMessageId,
            role: "assistant",
            agent: coordinator.project,
            type: "project_task_intake",
            content: receiptContent,
            timestamp: now,
            task_id: task.id,
            trace_id: messageTraceId,
            task: {
              id: task.id,
              title: task.title,
              status: task.status,
              workflow_type: task.workflow_type,
              attachment_count: attachmentRecords.length,
              intake_state: task.intake_state,
            },
            workflow: buildWorkflowMeta("understanding", "主 Agent 已接管"),
            taskRuntime: buildInlineTaskRuntime(task),
            task_runtime: buildInlineTaskRuntime(task),
          };
          appendGroupMessage(group_id, receiptMessage);
          updateGroupMemory(group_id, {
            goal: userMessageForHistory,
            currentPhase: "understanding",
            decision: `项目主 Agent 已创建持久任务 ${task.id}`,
            reason: task.title,
            nextAction: planModePreflight.requires_confirmation ? "等待用户确认执行前计划" : "主 Agent读取需求和项目上下文，生成执行计划并分派子 Agent",
          });

          const queueResult = task.auto_execute && task.intake_state !== "awaiting_confirmation"
            ? enqueueTask(task.id, ctx)
            : { queued: false, message: planModePreflight.requires_confirmation ? "任务已创建，等待用户确认执行前计划" : "任务已创建，等待手动启动" };
          const queueText = queueResult?.queued
            ? `任务已进入执行队列（位置 ${queueResult.position || 1}）`
            : `任务已保存；${queueResult?.message || "等待执行通道恢复"}`;
          addTaskLog(task.id, queueResult?.queued ? "success" : "warning", queueText);
          if (groupOperationKey) completeIdempotency("group-task-message", groupOperationKey, { task: { id: task.id, title: task.title, status: task.status, workflow_type: task.workflow_type }, queue: queueResult });
          const mainAgentDecision = appendMainAgentDecisionTrace({
            groupId: group_id,
            traceId: messageTraceId,
            messageId: receiptMessageId,
            taskId: task.id,
            coordinator: coordinator.project,
            mode: "project_task",
            messageMode,
            taskIntent,
            dispatchPolicy: planModePreflight.requires_confirmation
              ? { action: "await_confirmation", reason: planModePreflight.risk?.summary || taskIntent.reason, nextStep: "等待用户确认执行前计划" }
              : { action: "delegate", reason: taskIntent.reason, nextStep: queueResult?.queued ? "等待子 Agent 执行和回执" : "等待执行通道恢复或手动启动" },
            assignments: [{ project: coordinator.project, task: task.title }],
            observations: {
              task_created: true,
              plan_mode: true,
              requires_confirmation: planModePreflight.requires_confirmation === true,
              auto_continue: planModePreflight.auto_continue === true,
              risk_level: planModePreflight.risk?.level || "low",
              risk_reasons: planModePreflight.risk?.reasons || [],
              read_only_exploration: true,
              impact_scope: planModePreflight.impact_scope,
              permission_boundaries: planModePreflight.permission_boundaries,
              auto_execute: task.auto_execute !== false,
              queued: queueResult?.queued === true,
              queue_position: queueResult?.position || 0,
              attachment_count: attachmentRecords.length,
            },
            reply: { kind: "task_card", messageId: receiptMessageId, text: receiptContent },
          });
          applyMainAgentDecisionPetState(ctx, mainAgentDecision);
          try {
            const storedMessages = getGroupMessages(group_id);
            const storedIndex = storedMessages.findIndex((item: any) => item.id === receiptMessageId);
            if (storedIndex >= 0) {
              storedMessages[storedIndex] = { ...storedMessages[storedIndex], mainAgentDecision, main_agent_decision: mainAgentDecision };
              saveGroupMessages(group_id, storedMessages);
            }
          } catch {}

          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          writeSse(res, {
            type: "task_created",
            agent: coordinator.project,
            text: receiptContent,
            messageId: receiptMessageId,
            task: {
              id: task.id,
              title: task.title,
              status: task.status,
              workflow_type: task.workflow_type,
              attachment_count: attachmentRecords.length,
            },
            traceId: messageTraceId,
            queue: queueResult,
            workflow: receiptMessage.workflow,
            mainAgentDecision,
          });
          writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
          writeSse(res, { type: "status", text: queueText, agent: coordinator.project });
          writeSse(res, { type: "done", messageId: receiptMessageId, taskId: task.id });
          res.end();
          return;
        }

        if (isBroadcast && isOrchestrated) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          const coordinator = getCoordinatorMember(group);
          const conversationalOnly = (["project_task", "daily_dev", "mission"].includes(messageMode) && !persistentTaskRequest) || projectAnalysisRequest;
          writeSse(res, {
            type: "status",
            text: projectAnalysisRequest
              ? `🔎 主 Agent ${coordinator.project} 正在只读分析项目...`
              : conversationalOnly
              ? `💬 主 Agent ${coordinator.project} 正在回复...`
              : `🧠 主 Agent ${coordinator.project} 正在协调群聊...`,
            agent: coordinator.project
          });
          ctx.setAgentActivity(coordinator.project, "working", projectAnalysisRequest ? "主 Agent 正在只读分析项目" : conversationalOnly ? "主 Agent 正在回复" : "主 Agent 正在协调群聊", { tab: "groups", groupId: group_id });
          ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: projectAnalysisRequest ? "正在查看项目上下文..." : conversationalOnly ? "正在回复..." : "主 Agent 正在协调群聊...", source: "group" });

          updateGroupMemory(group_id, {
            ...(conversationalOnly ? {} : { goal: userMessageForHistory }),
            currentPhase: projectAnalysisRequest ? "project_analysis" : conversationalOnly ? "conversation" : "understanding",
            decision: projectAnalysisRequest ? `只读项目分析：${taskIntent.reason}` : conversationalOnly ? `普通对话：${taskIntent.reason}` : "用户把消息交给主 Agent 协调",
            reason: routing.targetLabel,
            nextAction: projectAnalysisRequest ? "主 Agent 基于项目上下文直接回答，不创建任务卡" : conversationalOnly ? "主 Agent 直接回复用户，不创建任务卡" : "主 Agent 先判断是否需要派发子 Agent",
          });
          const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
          const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
          const projectAnalysisContext = projectAnalysisRequest ? buildGroupProjectAnalysisContext(group, messageForAgent, ctx, configs) : "";
          const coordinatorResult = await runGroupOrchestrator({
            group,
            message: projectAnalysisRequest
              ? `${messageForAgent}\n\n[模式]\n只读项目分析：请基于项目上下文回答用户问题，不要派发子 Agent，不要创建任务，不要承诺修改。`
              : messageForAgent,
            context: projectAnalysisRequest ? `${context}\n\n${projectAnalysisContext}` : context,
            source: "user",
            sharedFilesContext: [sharedFilesContext, projectAnalysisContext].filter(Boolean).join("\n\n"),
          });

          try {
            const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
            const outputText = coordinatorResult.content;
            const rawPlanAssignments = normalizePlanAssignments((coordinatorResult as any).assignments || []);
            const planAssignments = conversationalOnly || projectAnalysisRequest ? [] : rawPlanAssignments;
            const dispatchPolicy = projectAnalysisRequest
              ? { action: "project_analysis", reason: taskIntent.reason, nextStep: "已基于只读项目上下文回答用户" }
              : conversationalOnly
              ? { action: "answer", reason: taskIntent.reason, nextStep: "已按普通对话回复用户" }
              : ((coordinatorResult as any).dispatchPolicy || null);
            const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "主 Agent 初始计划");
            const mainAgentDecision = appendMainAgentDecisionTrace({
              groupId: group_id,
              traceId: messageTraceId,
              messageId: responseMessageId,
              coordinator: coordinator.project,
              mode: projectAnalysisRequest ? "project_analysis" : planAssignments.length || dispatchPolicy?.action === "delegate" ? "delegation" : "conversation",
              messageMode,
              taskIntent,
              dispatchPolicy,
              assignments: planAssignments,
              observations: {
                context_packet: true,
                shared_files_context: !!sharedFilesContext,
                project_analysis_context: !!projectAnalysisContext,
                runtime: (coordinatorResult as any).runtime || "",
                execution_order: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              },
              reply: { kind: "assistant_message", messageId: responseMessageId, text: outputText },
            });
            applyMainAgentDecisionPetState(ctx, mainAgentDecision);
            writeSse(res, {
              type: "agent_done",
              agent: coordinator.project,
              text: outputText,
              messageId: responseMessageId,
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
            });
            writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant",
              agent: coordinator.project,
              content: outputText,
              timestamp: new Date().toISOString(),
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
            });
            updateGroupMemory(group_id, {
              currentPhase: workflowMeta.phase,
              decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "主 Agent 已完成派发判断"}`,
              reason: dispatchPolicy?.risk || "",
              nextAction: dispatchPolicy?.nextStep || (planAssignments.length ? "等待子 Agent 回执" : "等待用户继续补充"),
            });

            addGroupLog(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
              response_length: outputText.length,
              response_preview: outputText.substring(0, 300),
              runtime: "coded-orchestrator",
            });

            let crossOutputs: string[] = [];
            const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
            if (validMentions.length > 0) {
              writeSse(res, { type: "status", text: "🧩 主 Agent 正在分派子 Agent..." });
              const execOrder = (coordinatorResult as any).executionOrder || "parallel";
              crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set<string>(), execOrder, responseMessageId);
              await runCoordinatorReviewLoop({
                groupId: group_id,
                group,
                userMessage: messageForAgent,
                coordinatorOutput: outputText,
                crossOutputs,
                configs,
                ctx,
                streamRes: res,
                executionOrder: execOrder,
              });
            }
            writeSse(res, { type: "done", messageId: responseMessageId });
            res.end();
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            try { res.end(); } catch {}
          }
          return;
        }

        if (isBroadcast) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 并行处理中，${targetMembers.length} 个 Agent 同时工作...` })}\n\n`);
          for (const member of targetMembers) {
            ctx.setAgentActivity(member.project, "working", "群聊协作中", { tab: "groups", groupId: group_id });
            ctx.broadcastPetSpeech(member.project, { role: "status", text: "群聊协作中，正在思考...", source: "group" });
          }

          const getAgentPrompt = (member: any) => {
            const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });

            const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
            const collaborationInstructions = buildMemberCollaborationInstructions(member.project, memberList);
            const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

            const toolContext = buildAgentToolContext(ctx, group, member.project);
            const memberConfig = configs.find(c => c.name === member.project);
            const memberWorkDir = memberConfig ? getConfigInfo(memberConfig.path)[0]?.workDir : "";
            const memoryPacket = buildAgentMemoryPacket(group_id, member.project, messageForAgent);
            const developmentContract = buildChildAgentDevelopmentContract(member.project, messageForAgent, {
              source: "群聊广播",
              verification_hints: buildProjectVerificationHints(member.project, memberWorkDir),
              work_dir: memberWorkDir,
            });

            return {
              prompt: `${collaborationInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`,
              allowedTools: toolContext.allowedTools,

            };
          };

          const agentPromises = targetMembers.map(member => {
            return new Promise<void>(async (resolve) => {
              const config = configs.find(c => c.name === member.project);
              if (!config) {
                resolve();
                return;
              }

              const info = getConfigInfo(config.path);
              const workDir = info[0]?.workDir;
              const agentType = info[0]?.agent || "claudecode";
              const agentPrompt = getAgentPrompt(member);

              try {
                const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, agentPrompt.allowedTools, res);
                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                let memberFileChanges = null;
                let memberWorkEvents: any[] = [];
                const text = await ctx.callAgentForGroupStream(member.project, `${agentPrompt.prompt}${runtimeToolContext.prompt}`, workDir, agentType, {
                  res,
                  groupId: group_id,
                  timeoutMs: 300000,
                  messageId: responseMessageId,
                  allowedTools: agentPrompt.allowedTools,
                  mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                  initialWorkEvents: [runtimeToolContext.workEvent],
                  onDone: (opts: any) => { memberFileChanges = opts.fileChanges; memberWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
                });
                appendGroupMessage(group_id, {
                  id: responseMessageId,
                  role: "assistant", agent: member.project,
                  content: text,
                  timestamp: new Date().toISOString(),
                  fileChanges: memberFileChanges,
                  workEvents: memberWorkEvents,
                });
                const validMentions = extractActionableMentions(text, group, member.project);
                if (validMentions.length > 0) {
                  writeSse(res, { type: "status", text: `🧩 ${member.project} 正在分配协作任务...` });
                  await processCrossAgents(group_id, group, member.project, text, validMentions, configs, ctx, res);
                }
              } catch (e: any) {
                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
              } finally {
                resolve();
              }
            });
          });

          Promise.all(agentPromises).then(() => {
            writeSse(res, { type: "done" });
            try {
              res.end();
            } catch {}
          });
          return;
        }

        // 单个 Agent 模式
        const target_project_actual = targetMembers[0].project;
        const coordinatorProject = getCoordinatorMember(group).project;
        const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
        if (target_project_actual === coordinatorProject) {
          const sharedFilesCtx2 = buildCoordinatorSharedFilesContext(ctx, group);
          updateGroupMemory(group_id, {
            goal: userMessageForHistory,
            currentPhase: "understanding",
            decision: "用户直接点名主 Agent",
            reason: target_project_actual,
            nextAction: "主 Agent 判断是否直接答复或派发子 Agent",
          });
          const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
          const coordinatorResult = await runGroupOrchestrator({
            group,
            message: messageForAgent,
            context,
            source: "direct",
            sharedFilesContext: sharedFilesCtx2,
          });
          const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
          const planAssignments2 = normalizePlanAssignments((coordinatorResult as any).assignments || []);
          const dispatchPolicy2 = (coordinatorResult as any).dispatchPolicy || null;
          const workflowMeta2 = getInitialWorkflowMeta(planAssignments2, dispatchPolicy2, "主 Agent 初始计划");

            if (useStream) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              "Access-Control-Allow-Origin": "*",
            });
            writeSse(res, { type: "status", text: "🧠 代码协调器正在分配任务...", agent: coordinatorProject });
            writeSse(res, {
              type: "agent_done",
              agent: coordinatorProject,
              text: coordinatorResult.content,
              messageId: responseMessageId,
              assignments: planAssignments2,
              executionOrder: (coordinatorResult as any).executionOrder || "parallel",
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy: dispatchPolicy2,
              coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
              workflow: workflowMeta2,
            });
          }

          appendGroupMessage(group_id, {
            id: responseMessageId,
            role: "assistant",
            agent: coordinatorProject,
            content: coordinatorResult.content,
            timestamp: new Date().toISOString(),
            assignments: planAssignments2,
            executionOrder: (coordinatorResult as any).executionOrder || "parallel",
            runtime: (coordinatorResult as any).runtime || "",
            dispatchPolicy: dispatchPolicy2,
            coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
            workflow: workflowMeta2,
          });
          updateGroupMemory(group_id, {
            currentPhase: workflowMeta2.phase,
            decision: `${dispatchPolicy2?.action || "unknown"}：${dispatchPolicy2?.reason || "主 Agent 已完成派发判断"}`,
            reason: dispatchPolicy2?.risk || "",
            nextAction: dispatchPolicy2?.nextStep || (planAssignments2.length ? "等待子 Agent 回执" : "等待用户继续补充"),
          });

          const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
          let crossOutputs: string[] = [];
          let reviewResult: any = null;
          if (validMentions.length > 0) {
            if (useStream) writeSse(res, { type: "status", text: "🧩 代码协调器正在分派子 Agent..." });
            const execOrder2 = (coordinatorResult as any).executionOrder || "parallel";
            crossOutputs = await processCrossAgents(group_id, group, coordinatorProject, coordinatorResult.content, validMentions, configs, ctx, useStream ? res : null, 0, new Set<string>(), execOrder2, responseMessageId);
            reviewResult = await runCoordinatorReviewLoop({
              groupId: group_id,
              group,
              userMessage: messageForAgent,
              coordinatorOutput: coordinatorResult.content,
              crossOutputs,
              configs,
              ctx,
              streamRes: useStream ? res : null,
              executionOrder: execOrder2,
            });
          }

          if (useStream) {
            writeSse(res, { type: "done", messageId: responseMessageId });
            res.end();
          } else {
            sendJson(res, {
              success: true,
              reply: reviewResult?.content ? `${coordinatorResult.content}\n\n---\n\n${reviewResult.content}` : coordinatorResult.content,
              cross_pending: validMentions.length > 0
            });
          }
          return;
        }

        const runtime = resolveMemberRuntime(target_project_actual, group, configs);
        if (!runtime) return sendJson(res, { error: "项目配置不存在" }, 400);
        const workDir = runtime.workDir;
        const agentType = runtime.agentType;

        const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });
        const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== target_project_actual).join(", ");
        let atInstructions = "";
        if (target_project_actual === coordinatorProject) {
          atInstructions = buildCoordinatorCollaborationInstructions(memberList);
        } else {
          atInstructions = buildMemberCollaborationInstructions(target_project_actual, memberList);
        }

        let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

        const toolContext = buildAgentToolContext(ctx, group, target_project_actual);
        const runtimeToolContext = prepareAgentRuntimeTools(group_id, target_project_actual, workDir, agentType, toolContext.allowedTools, useStream ? res : null);
        const projectConfig = getProjectExtraConfig(target_project_actual);

        if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
          sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
        }

        const memoryPacket = buildAgentMemoryPacket(group_id, target_project_actual, messageForAgent);
        const developmentContract = buildChildAgentDevelopmentContract(target_project_actual, messageForAgent, {
          source: "群聊点名",
          verification_hints: buildProjectVerificationHints(target_project_actual, workDir),
          work_dir: workDir,
        });
        const fullPrompt = `${atInstructions}${buildAgentQaProtocolInstructions(target_project_actual, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;

        if (useStream) {
          const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
          const startedAt = Date.now();
          const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;

          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
          ctx.setAgentActivity(target_project_actual, "working", "群聊协作中", { tab: "groups", groupId: group_id });
          ctx.broadcastPetSpeech(target_project_actual, { role: "status", text: "Agent 正在思考...", source: "group" });

          try {
            let targetFileChanges = null;
            let targetWorkEvents: any[] = [];
            const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
              res,
              groupId: group_id,
              timeoutMs: 300000,
              messageId: responseMessageId,
              allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,

        initialWorkEvents: [runtimeToolContext.workEvent],
              onDone: (opts: any) => { targetFileChanges = opts.fileChanges; targetWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
            });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant", agent: target_project_actual,
              content: outputText.trim(),
              timestamp: new Date().toISOString(),
              fileChanges: targetFileChanges,
                    workEvents: targetWorkEvents,
            });

            addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
              agent: target_project_actual,
              response_length: outputText.length,
              response_preview: outputText.substring(0, 300)
            });

            const qaResult = await handleAgentQaRequests({
              groupId: group_id,
              group,
              sourceProject: target_project_actual,
              sourceOutput: outputText,
              originalPrompt: fullPrompt,
              sourceWorkDir: workDir,
              sourceAgentType: agentType,
              allowedTools: toolContext.allowedTools,
              mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
              configs,
              ctx,
              streamRes: res,
              taskId: "",
              qaDepth: 0,
            });
            const downstreamOutput = qaResult.resumedOutput || outputText;
            const validMentions = extractActionableMentions(downstreamOutput, group, target_project_actual);
            if (validMentions.length > 0) {
              writeSse(res, { type: "status", text: "🧩 主 Agent 正在分配任务..." });
              try {
                await processCrossAgents(group_id, group, target_project_actual, downstreamOutput, validMentions, configs, ctx, res);
              } catch (err: any) {
                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
              }
            }
            writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
            res.end();
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            ctx.recordMetric(target_project_actual, {
              success: false,
              durationMs: Date.now() - startedAt,
              fileChangeCount: 0
            });
            try { res.end(); } catch {}
          }
          return;
        }

        // 非流式
          const output = await ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id, allowedTools: toolContext.allowedTools, mcpConfigPath: runtimeToolContext.audit.mcpConfigPath });

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "a",
          role: "assistant", agent: target_project_actual,
          content: output,
          timestamp: new Date().toISOString(),
        });

        const validMentions = extractActionableMentions(output, group, target_project_actual);
        if (validMentions.length > 0) {
          sendJson(res, { success: true, reply: output, cross_pending: true });
          setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
          return;
        }

        sendJson(res, { success: true, reply: output });
      } catch (e: any) {
        if (reliabilityOperationKey) {
          try { failIdempotency("group-task-message", reliabilityOperationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      ctx.collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = ctx.getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = ctx.parseMultipart(buffer, boundary);
          handleGroupSend(fields, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        await handleGroupSend(JSON.parse(body));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/broadcast" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, message } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36),
          role: "user", target: "all", content: message,
          timestamp: new Date().toISOString(),
        });

        const replies = [];
        const configs = getConfigs();

        for (const member of group.members) {
          const config = configs.find(c => c.name === member.project);
          if (!config) continue;
          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });

          const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
          const toolContext = buildAgentToolContext(ctx, group, member.project);
          const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, toolContext.allowedTools);

          const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
          const memberInstructions = buildMemberCollaborationInstructions(member.project, memberList);
          const memoryPacket = buildAgentMemoryPacket(group_id, member.project, message);
          const fullPrompt = `${memberInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${memoryPacket}\n\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;

          const output = await ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, {
            tab: "groups",
            groupId: group_id,
            allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,

          });

          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + member.project,
            role: "assistant", agent: member.project, content: output,
            timestamp: new Date().toISOString(),
          });
          replies.push({ project: member.project, reply: output, receipt: extractAgentReceipt(output, member.project) });
        }

        sendJson(res, { success: true, replies });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/decompose" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, requirement } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        const configs = getConfigs();
        const coordinator = getCoordinatorMember(group);
        const members = getRoutableMembers(group);
        const memberList = members.map((m: any) => `${m.project}(${m.agent})`).join(", ");

        const tasks = decomposeRequirementWithCodedCoordinator(group, requirement);
        const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);

        const createdTasks = tasks.map(t => createTask({
          title: t.title,
          description: t.description || "",
          target_project: t.target_project || coordinator.project,
          priority: t.priority || "normal"
        }));

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "decompose",
          role: "assistant",
          agent: coordinator.project,
          content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i+1}. [${t.target_project}] ${t.title}`).join("\n")}`,
          timestamp: new Date().toISOString(),
        });

        sendJson(res, { success: true, tasks: createdTasks, raw_output: output });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { task_id, group_id } = JSON.parse(body);
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const configs = getConfigs();
        const config = configs.find(c => c.name === task.target_project);
        if (!config) return sendJson(res, { error: "项目配置不存在" }, 400);

        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";

        updateTask(task_id, { status: "in_progress" });

        const executePrompt = `你正在执行一个开发任务，请完成它。

任务标题：${task.title}
任务描述：${task.description || "无"}

请直接开始实现。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执，格式如下：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明实际完成/确认了什么",
  "actions": ["实际执行的动作"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "memoryUsed": ["本轮实际使用的记忆/知识库/历史结论；未使用填空数组"],
  "memoryIgnored": ["没有使用或无法使用记忆的原因；没有填空数组"],
  "blockers": ["阻塞点；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;

        const group = group_id ? loadGroups().find(g => g.id === group_id) : null;
        const toolContext = buildAgentToolContext(ctx, group, task.target_project);
        const runtimeToolContext = prepareAgentRuntimeTools(group_id || "", task.target_project, workDir, agentType, toolContext.allowedTools);
        const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        const taskResult = await ctx.callAgent(
          task.target_project,
          `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${executePrompt}`,
          workDir,
          agentType,
          300000,
          { tab: group_id ? "groups" : "projects", groupId: group_id, project: task.target_project, allowedTools: toolContext.allowedTools, mcpConfigPath: runtimeToolContext.audit.mcpConfigPath }
        );
        const fileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
        const execution = getTaskExecutionFromReceipt(taskResult, extractAgentReceipt(taskResult, task.target_project), { fileChanges });
        const isCompleted = execution.status === "done";

        updateTask(task_id, {
          status: isCompleted ? "done" : "in_progress",
          result: taskResult.substring(0, 500),
          final_report: execution.report || taskResult,
          status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
          receipt: execution.receipt || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: buildDeliverySummary(task, execution, isCompleted ? "done" : "waiting"),
        });

        if (group_id) {
          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + "task",
            role: "assistant",
            agent: task.target_project,
            content: `📋 任务执行${isCompleted ? "完成" : "中"}：${task.title}\n${taskResult.substring(0, 300)}`,
            timestamp: new Date().toISOString(),
            task_id,
            fileChanges,
          });
        }

        sendJson(res, { success: true, task, completed: isCompleted, result: taskResult });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const tasks = loadTasks().filter(t => t.status === "pending");

        if (tasks.length === 0) {
          return sendJson(res, { success: true, message: "没有待执行的任务" });
        }

        const results = tasks.map(task => ({
          task_id: task.id,
          title: task.title,
          ...enqueueTask(task.id, ctx)
        }));
        const queuedCount = results.filter(r => r.queued).length;

        sendJson(res, {
          success: true,
          message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
          results,
          queue_status: getQueueStatus()
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, project, diff, reviewers } = JSON.parse(body);
        if (!diff) return sendJson(res, { error: "请提供代码变更内容" }, 400);

        const configs = getConfigs();
        const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;

        const reviewResults = [];
        const reviewGroup = group_id ? loadGroups().find(g => g.id === group_id) : null;
        for (const reviewer of (reviewers || [])) {
          const config = configs.find(c => c.name === reviewer);
          if (!config) continue;

          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          try {
            const toolContext = buildAgentToolContext(ctx, reviewGroup, reviewer);
            const runtimeToolContext = prepareAgentRuntimeTools(group_id || "", reviewer, workDir, agentType, toolContext.allowedTools);
            const result = await ctx.callAgent(
              reviewer,
              `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${reviewPrompt}`,
              workDir,
              agentType,
              120000,
              { tab: group_id ? "groups" : "projects", groupId: group_id, project: reviewer, allowedTools: toolContext.allowedTools, mcpConfigPath: runtimeToolContext.audit.mcpConfigPath }
            );
            reviewResults.push({ reviewer, result });
          } catch (e: any) {
            reviewResults.push({ reviewer, error: e.message });
          }
        }

        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          const coordinator = group ? getCoordinatorMember(group) : { project: "coordinator" };
          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + "review",
            role: "assistant",
            agent: coordinator.project,
            content: `🔍 代码审查完成：${project}\n${reviewResults.map(r => `【${r.reviewer}】${r.result?.substring(0, 200) || r.error}`).join("\n\n")}`,
            timestamp: new Date().toISOString(),
          });
        }

        sendJson(res, { success: true, reviews: reviewResults });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/collaboration/stats" && req.method === "GET") {
    const tasks = loadTasks();
    const groups = loadGroups();

    const stats = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t: any) => t.status === "pending").length,
      in_progress_tasks: tasks.filter((t: any) => t.status === "in_progress").length,
      done_tasks: tasks.filter((t: any) => t.status === "done").length,
      failed_tasks: tasks.filter((t: any) => t.status === "failed").length,
      completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t: any) => t.status === "done").length / tasks.length * 100) : 0,
      groups_count: groups.length,
      recent_activities: [] as any[]
    };

    for (const group of groups.slice(0, 3)) {
      const messages = getGroupMessages(group.id).slice(-5);
      for (const msg of messages) {
        stats.recent_activities.push({
          group: group.name,
          agent: msg.agent || "user",
          content: msg.content?.substring(0, 100),
          timestamp: msg.timestamp
        });
      }
    }

    stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    stats.recent_activities = stats.recent_activities.slice(0, 10);

    sendJson(res, stats);
    return true;
  }

  if (pathname === "/api/test/mentions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { text, group_id } = JSON.parse(body);
        let validMentions: any[] = [];
        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          if (group) {
            validMentions = extractActionableMentions(text, group, "");
          }
        }
        sendJson(res, {
          success: true,
          input: text,
          valid_mentions: validMentions.map(m => m.mention),
          extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 飞书配置与授权相关路由 ===
  if (pathname === "/api/feishu/config" && req.method === "GET") {
    const config = loadFeishuConfig();
    sendJson(res, {
      config: {
        enabled: config.enabled !== false,
        notification_channel: "webhook",
        app_id: config.app_id || "",
        app_secret: config.app_secret ? "******" : "",
        webhook_url: config.webhook_url || "",
        sign_key: config.sign_key ? "******" : "",
        webhook_ready: !!config.webhook_url,
        notification_ready: !!config.webhook_url,
        control_bot_app_id: config.control_bot_app_id || config.app_id || "",
        control_bot_app_secret: (config.control_bot_app_secret || config.app_secret) ? "******" : "",
        control_bot_verification_token: config.control_bot_verification_token ? "******" : "",
        control_bot_encrypt_key: config.control_bot_encrypt_key ? "******" : "",
        control_bot_enabled: config.control_bot_enabled === true,
        control_bot_ready: !!(config.control_bot_enabled && (config.control_bot_app_id || config.app_id) && (config.control_bot_app_secret || config.app_secret)),
        control_bot_event_path: "/api/feishu/bot/event",
        control_bot_public_base_url: config.control_bot_public_base_url || "",
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        const config = loadFeishuConfig();

        config.notification_channel = "webhook";
        if (updates.webhook_url !== undefined) config.webhook_url = String(updates.webhook_url || "").trim();
        if (updates.sign_key !== undefined && updates.sign_key !== "******") config.sign_key = String(updates.sign_key || "").trim();
        if (updates.enabled !== undefined) config.enabled = updates.enabled;
        if (updates.control_bot_enabled !== undefined) config.control_bot_enabled = updates.control_bot_enabled === true;
        if (updates.control_bot_app_id !== undefined) config.control_bot_app_id = String(updates.control_bot_app_id || "").trim();
        if (updates.control_bot_app_secret !== undefined && updates.control_bot_app_secret !== "******") config.control_bot_app_secret = String(updates.control_bot_app_secret || "").trim();
        if (updates.control_bot_verification_token !== undefined && updates.control_bot_verification_token !== "******") config.control_bot_verification_token = String(updates.control_bot_verification_token || "").trim();
        if (updates.control_bot_encrypt_key !== undefined && updates.control_bot_encrypt_key !== "******") config.control_bot_encrypt_key = String(updates.control_bot_encrypt_key || "").trim();
        if (updates.control_bot_public_base_url !== undefined) config.control_bot_public_base_url = String(updates.control_bot_public_base_url || "").trim().replace(/\/$/, "");

        console.log("[飞书配置] 保存配置:", { channel: "webhook", webhook: config.webhook_url ? "已配置" : "空", control_bot: config.control_bot_enabled ? "启用" : "关闭" });
        saveFeishuConfig(config);
        sendJson(res, { success: true, message: "飞书配置已保存" });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
    const config = loadFeishuConfig();
    if (!config.app_id) {
      sendJson(res, { error: "请先配置 App ID" }, 400);
      return true;
    }
    const scopes = (config.scopes || FEISHU_SCOPES).join(" ");
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
    sendJson(res, { success: true, auth_url: authUrl });
    return true;
  }

  if (pathname === "/api/feishu/callback" && req.method === "GET") {
    const code = parsed.query.code;
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>授权失败：缺少 code 参数</h1>");
      return true;
    }

    const config = loadFeishuConfig();
    if (!config.app_id || !config.app_secret) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
      return true;
    }

    getFeishuUserToken(config.app_id, config.app_secret, code).then(tokenData => {
      if (!tokenData) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>授权失败：获取 Token 失败</h1>");
        return;
      }

      config.user_access_token = tokenData.access_token;
      config.user_refresh_token = tokenData.refresh_token;
      config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      config.authorized = true;

      return getFeishuUserInfo(tokenData.access_token).then(userInfo => {
        if (userInfo) {
          config.authorized_user = {
            name: userInfo.name,
            open_id: userInfo.open_id,
            avatar: userInfo.avatar_url
          };
        }
        saveFeishuConfig(config);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>飞书授权成功</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1 style="color:#22c55e">✅ 飞书授权成功！</h1>
            <p>用户：${userInfo?.name || '未知'}</p>
            <p>授权已生效，可以关闭此页面。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
      });
    }).catch(err => {
      console.error("[飞书授权] 回调处理失败:", err.message);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>授权失败：服务器错误</h1>");
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/revoke" && req.method === "POST") {
    const config = loadFeishuConfig();
    config.authorized = false;
    config.user_access_token = "";
    config.user_refresh_token = "";
    config.token_expires_at = null;
    config.authorized_user = null;
    saveFeishuConfig(config);
    sendJson(res, { success: true, message: "授权已撤销" });
    return true;
  }

  if (pathname === "/api/feishu/chats" && req.method === "GET") {
    getValidFeishuToken().then(async (token) => {
      if (!token) {
        sendJson(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
        return;
      }
      const chats = await getFeishuChatList(token);
      if (!res.headersSent) {
        sendJson(res, { success: true, chats: chats || [] });
      }
    }).catch(err => {
      console.error("[飞书] 获取群聊列表失败:", err.message);
      if (!res.headersSent) {
        sendJson(res, { error: "获取群聊列表失败" }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/test" && req.method === "POST") {
    const config = loadFeishuConfig();
    if (!config.webhook_url) {
      sendJson(res, { error: "请先保存飞书群机器人 Webhook 地址" }, 400);
      return true;
    }
    sendFeishuReportMessage({
      title: "ccm 飞书通知测试",
      markdown: `配置验证成功\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n后续开发日报、周报和任务状态会通过飞书群机器人通知。`,
    }).then(result => {
      if (result.success) sendJson(res, { success: true, message: "测试通知已发送，请检查飞书", result });
      else sendJson(res, { error: result.error || "发送失败", result }, 400);
    }).catch((error: any) => sendJson(res, { error: error?.message || "发送失败" }, 500));
    return true;
  }
  return false;
}


































