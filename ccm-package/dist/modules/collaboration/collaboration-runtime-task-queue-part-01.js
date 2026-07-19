"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_WEIGHT = exports.agentRecoveryProbeInFlight = exports.agentRecoveryMonitorTimer = exports.taskWatchdogTimer = exports.AGENT_PROBE_TARGET_STATUS_DIR = exports.AGENT_PROBE_STATUS_FILE = exports.AGENT_RUNNER_DIR = exports.AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS = exports.AGENT_PROBE_FAILURE_BLOCK_MS = exports.AGENT_PROBE_SUCCESS_FRESH_MS = exports.AGENT_RECOVERY_PROBE_TIMEOUT_MS = exports.AGENT_RECOVERY_PROBE_INTERVAL_MS = exports.TASK_WATCHDOG_GAP_REWORK_MAX = exports.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS = exports.TASK_WATCHDOG_STALE_MS = exports.TASK_WATCHDOG_INTERVAL_MS = exports.coordinationSettlementInFlight = exports.runningTaskIds = exports.runningTasks = exports.taskQueues = exports.markDailyDevBacklogStatus = exports.importSharedDocsToDailyDevBacklog = exports.claimReadyDailyDevBacklog = exports.runGroupMemoryStorageRecoverySelfTest = exports.loadGroups = exports.sendFeishuReportMessage = exports.FEISHU_SCOPES = void 0;
exports.setTaskWatchdogTimer = setTaskWatchdogTimer;
exports.setAgentRecoveryMonitorTimer = setAgentRecoveryMonitorTimer;
exports.setAgentRecoveryProbeInFlight = setAgentRecoveryProbeInFlight;
exports.runCronDailyDevProtocolSelfTestSafe = runCronDailyDevProtocolSelfTestSafe;
exports.isTaskPaused = isTaskPaused;
exports.getTaskFailureText = getTaskFailureText;
exports.getChildAgentIsolationMode = getChildAgentIsolationMode;
exports.isRecoverableRuntimeFailure = isRecoverableRuntimeFailure;
exports.isAgentExecutionBlockedPendingTask = isAgentExecutionBlockedPendingTask;
exports.hasStrongTaskAcceptanceEvidence = hasStrongTaskAcceptanceEvidence;
exports.deriveTaskLifecycle = deriveTaskLifecycle;
exports.buildTaskPreflightReasoning = buildTaskPreflightReasoning;
exports.userAgentRole = userAgentRole;
exports.isVisibleChildAgentName = isVisibleChildAgentName;
exports.getTaskWorkItems = getTaskWorkItems;
exports.persistTaskWorkItems = persistTaskWorkItems;
exports.claimTaskWorkItemForAgent = claimTaskWorkItemForAgent;
exports.updateTaskWorkItemFromReceipt = updateTaskWorkItemFromReceipt;
exports.requeueTaskWorkItemsForWatchdog = requeueTaskWorkItemsForWatchdog;
exports.groupSessionIdForTask = groupSessionIdForTask;
exports.buildTaskEntityChain = buildTaskEntityChain;
exports.buildTaskCardView = buildTaskCardView;
exports.normalizeContinuationKind = normalizeContinuationKind;
exports.buildContinuationUserDecision = buildContinuationUserDecision;
exports.buildUserContinuationStatus = buildUserContinuationStatus;
exports.shouldResumeAfterGoalRevisionInterruption = shouldResumeAfterGoalRevisionInterruption;
exports.buildGoalRevisionInterruptedStatus = buildGoalRevisionInterruptedStatus;
exports.buildUserAgentQuestionRows = buildUserAgentQuestionRows;
exports.splitUserAcceptanceText = splitUserAcceptanceText;
exports.getTaskPlanMode = getTaskPlanMode;
exports.buildUserCompletionReadinessSummary = buildUserCompletionReadinessSummary;
exports.buildUserAcceptanceReview = buildUserAcceptanceReview;
exports.normalizeMemoryGateAgent = normalizeMemoryGateAgent;
exports.getTaskAgentMemoryContextSnapshotSources = getTaskAgentMemoryContextSnapshotSources;
exports.summarizeTaskAgentMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot;
exports.evaluateReceiptTaskAgentMemoryContextSnapshot = evaluateReceiptTaskAgentMemoryContextSnapshot;
exports.collectTaskMemoryDispatchFreshnessGates = collectTaskMemoryDispatchFreshnessGates;
exports.evaluateReceiptMemoryDispatchGate = evaluateReceiptMemoryDispatchGate;
exports.collectTaskReadPlanRevalidationGates = collectTaskReadPlanRevalidationGates;
exports.evaluateReceiptReadPlanRevalidationGate = evaluateReceiptReadPlanRevalidationGate;
exports.collectTaskPostCompactReinjectionGates = collectTaskPostCompactReinjectionGates;
exports.collectTaskPostCompactDispatchMarkers = collectTaskPostCompactDispatchMarkers;
exports.evaluateReceiptPostCompactReinjectionGate = evaluateReceiptPostCompactReinjectionGate;
exports.collectTaskApiMicrocompactEditPlans = collectTaskApiMicrocompactEditPlans;
exports.evaluateReceiptApiMicrocompactEditPlan = evaluateReceiptApiMicrocompactEditPlan;
exports.collectTaskGlobalMemoryReceiptGates = collectTaskGlobalMemoryReceiptGates;
exports.collectTaskGlobalMemoryHealthGates = collectTaskGlobalMemoryHealthGates;
exports.configuredProjectWorkDir = configuredProjectWorkDir;
exports.collectTaskTypedMemoryConsumptionRows = collectTaskTypedMemoryConsumptionRows;
exports.collectTaskTypedMemoryPressureRecallUsageRows = collectTaskTypedMemoryPressureRecallUsageRows;
exports.evaluateReceiptGlobalMemoryUsageGate = evaluateReceiptGlobalMemoryUsageGate;
exports.evaluateReceiptGlobalMemoryHealthGate = evaluateReceiptGlobalMemoryHealthGate;
exports.buildMemoryGateVisibleSummary = buildMemoryGateVisibleSummary;
exports.buildGlobalMemoryReceiptVisibleSummary = buildGlobalMemoryReceiptVisibleSummary;
exports.buildGlobalMemoryHealthGateVisibleSummary = buildGlobalMemoryHealthGateVisibleSummary;
exports.buildReadPlanRevalidationGateVisibleSummary = buildReadPlanRevalidationGateVisibleSummary;
exports.buildPostCompactReinjectionGateVisibleSummary = buildPostCompactReinjectionGateVisibleSummary;
exports.buildApiMicrocompactReceiptVisibleSummary = buildApiMicrocompactReceiptVisibleSummary;
exports.buildPostCompactDispatchMarkerVisibleSummary = buildPostCompactDispatchMarkerVisibleSummary;
exports.evaluateChildAgentHandoffQuality = evaluateChildAgentHandoffQuality;
exports.scoreChildAgentReceipt = scoreChildAgentReceipt;
exports.compactRuntimeToolAudit = compactRuntimeToolAudit;
exports.runtimeToolSnapshotFromAudit = runtimeToolSnapshotFromAudit;
exports.attachInvokedSkillsToReceipt = attachInvokedSkillsToReceipt;
exports.collectRuntimeToolingFromSources = collectRuntimeToolingFromSources;
exports.buildRuntimeKernelSnapshot = buildRuntimeKernelSnapshot;
exports.buildUserCoordinationAcknowledgement = buildUserCoordinationAcknowledgement;
exports.sanitizeDispatchLaunchText = sanitizeDispatchLaunchText;
exports.normalizeGroupDispatchLaunchRowStatus = normalizeGroupDispatchLaunchRowStatus;
exports.buildDispatchLaunchSummary = buildDispatchLaunchSummary;
exports.buildRevisedPlanModeDraft = buildRevisedPlanModeDraft;
exports.buildAcceptedPlanModeDraft = buildAcceptedPlanModeDraft;
exports.classifyGroupProjectTaskIntent = classifyGroupProjectTaskIntent;
exports.normalizeGroupAgentGatewayTaskIntent = normalizeGroupAgentGatewayTaskIntent;
exports.classifyGroupProjectTaskIntentWithAgent = classifyGroupProjectTaskIntentWithAgent;
exports.shouldUseProjectAnalysisMode = shouldUseProjectAnalysisMode;
exports.shouldCreatePersistentGroupTask = shouldCreatePersistentGroupTask;
exports.classifyPlanModeRisk = classifyPlanModeRisk;
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const logs_1 = require("./logs");
const work_items_1 = require("../../agents/work-items");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const collaboration_runtime_task_queue_part_02_1 = require("./collaboration-runtime-task-queue-part-02");
var feishu_1 = require("./feishu");
Object.defineProperty(exports, "FEISHU_SCOPES", { enumerable: true, get: function () { return feishu_1.FEISHU_SCOPES; } });
Object.defineProperty(exports, "sendFeishuReportMessage", { enumerable: true, get: function () { return feishu_1.sendFeishuReportMessage; } });
var storage_1 = require("./storage");
Object.defineProperty(exports, "loadGroups", { enumerable: true, get: function () { return storage_1.loadGroups; } });
var memory_1 = require("./memory");
Object.defineProperty(exports, "runGroupMemoryStorageRecoverySelfTest", { enumerable: true, get: function () { return memory_1.runGroupMemoryStorageRecoverySelfTest; } });
var daily_dev_backlog_1 = require("./daily-dev-backlog");
Object.defineProperty(exports, "claimReadyDailyDevBacklog", { enumerable: true, get: function () { return daily_dev_backlog_1.claimReadyDailyDevBacklog; } });
Object.defineProperty(exports, "importSharedDocsToDailyDevBacklog", { enumerable: true, get: function () { return daily_dev_backlog_1.importSharedDocsToDailyDevBacklog; } });
Object.defineProperty(exports, "markDailyDevBacklogStatus", { enumerable: true, get: function () { return daily_dev_backlog_1.markDailyDevBacklogStatus; } });
// === 任务队列系统（支持并行执行）===
exports.taskQueues = new Map(); // 每个目标（群聊/Agent）独立队列
exports.runningTasks = new Map(); // 正在运行的任务目标
exports.runningTaskIds = new Set(); // 正在运行的任务 ID
exports.coordinationSettlementInFlight = new Set();
exports.TASK_WATCHDOG_INTERVAL_MS = 60 * 1000;
exports.TASK_WATCHDOG_STALE_MS = 15 * 60 * 1000;
exports.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS = 60 * 1000;
exports.TASK_WATCHDOG_GAP_REWORK_MAX = 3;
exports.AGENT_RECOVERY_PROBE_INTERVAL_MS = 5 * 60 * 1000;
exports.AGENT_RECOVERY_PROBE_TIMEOUT_MS = 45 * 1000;
exports.AGENT_PROBE_SUCCESS_FRESH_MS = 30 * 60 * 1000;
exports.AGENT_PROBE_FAILURE_BLOCK_MS = 15 * 60 * 1000;
exports.AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS = 5 * 60 * 1000;
exports.AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
exports.AGENT_PROBE_STATUS_FILE = path.join(exports.AGENT_RUNNER_DIR, "probe-status.json");
exports.AGENT_PROBE_TARGET_STATUS_DIR = path.join(exports.AGENT_RUNNER_DIR, "probe-targets");
exports.taskWatchdogTimer = null;
exports.agentRecoveryMonitorTimer = null;
exports.agentRecoveryProbeInFlight = false;
function setTaskWatchdogTimer(value) {
    exports.taskWatchdogTimer = value;
}
function setAgentRecoveryMonitorTimer(value) {
    exports.agentRecoveryMonitorTimer = value;
}
function setAgentRecoveryProbeInFlight(value) {
    exports.agentRecoveryProbeInFlight = value;
}
function runCronDailyDevProtocolSelfTestSafe() {
    try {
        const cronModule = require("../scheduling/cron");
        if (typeof cronModule.runCronDailyDevProtocolSelfTest === "function") {
            return cronModule.runCronDailyDevProtocolSelfTest();
        }
        return {
            pass: false,
            error: "cron 模块未导出 runCronDailyDevProtocolSelfTest",
        };
    }
    catch (error) {
        return {
            pass: false,
            error: error?.message || String(error || "cron 协议自测加载失败"),
        };
    }
}
// 优先级权重
exports.PRIORITY_WEIGHT = { high: 3, normal: 2, low: 1 };
function isTaskPaused(task) {
    return require("./collaboration-task-card").isTaskPaused.apply(null, arguments);
}
function getTaskFailureText(task) {
    return require("./collaboration-task-card").getTaskFailureText.apply(null, arguments);
}
function getChildAgentIsolationMode(group = null, task = null) {
    return require("./collaboration-task-card").getChildAgentIsolationMode.apply(null, arguments);
}
function isRecoverableRuntimeFailure(task) {
    return require("./collaboration-task-card").isRecoverableRuntimeFailure.apply(null, arguments);
}
function isAgentExecutionBlockedPendingTask(task) {
    return require("./collaboration-task-card").isAgentExecutionBlockedPendingTask.apply(null, arguments);
}
function isPositiveAcceptanceEvidenceText(value) {
    return require("./collaboration-task-card").isPositiveAcceptanceEvidenceText.apply(null, arguments);
}
function isBareAcceptanceMarker(value) {
    return require("./collaboration-task-card").isBareAcceptanceMarker.apply(null, arguments);
}
function isStrongExecutedVerificationText(value) {
    return require("./collaboration-task-card").isStrongExecutedVerificationText.apply(null, arguments);
}
function flattenAcceptanceEvidenceRows(...values) {
    return require("./collaboration-task-card").flattenAcceptanceEvidenceRows.apply(null, arguments);
}
function evidenceRowText(row) {
    return require("./collaboration-task-card").evidenceRowText.apply(null, arguments);
}
function rowEvidenceCount(row) {
    return require("./collaboration-task-card").rowEvidenceCount.apply(null, arguments);
}
function isStrongPositiveReviewRow(row) {
    return require("./collaboration-task-card").isStrongPositiveReviewRow.apply(null, arguments);
}
function hasStrongTaskAcceptanceEvidence(task, executions = [], explicitSummary = null) {
    return require("./collaboration-task-card").hasStrongTaskAcceptanceEvidence.apply(null, arguments);
}
function deriveTaskLifecycle(task, executions = []) {
    return require("./collaboration-task-card").deriveTaskLifecycle.apply(null, arguments);
}
function buildTaskPreflightReasoning(task, reason = "任务执行前复核", recovery = false) {
    return require("./collaboration-task-card").buildTaskPreflightReasoning.apply(null, arguments);
}
function getTaskRecoveryChecks(task) {
    return require("./collaboration-task-card").getTaskRecoveryChecks.apply(null, arguments);
}
function hasTaskRecoveryEvidence(task) {
    return require("./collaboration-task-card").hasTaskRecoveryEvidence.apply(null, arguments);
}
function buildMainAgentRecoverySummary(task, phase, sessions = [], workItems = [], gapItems = []) {
    return require("./collaboration-task-card").buildMainAgentRecoverySummary.apply(null, arguments);
}
function taskCardPhase(task, executions) {
    return require("./collaboration-task-card").taskCardPhase.apply(null, arguments);
}
function taskCardGapLabel(item) {
    return require("./collaboration-task-card").taskCardGapLabel.apply(null, arguments);
}
function userAgentRole(project) {
    return require("./collaboration-task-card").userAgentRole.apply(null, arguments);
}
function userAgentProgress(worker) {
    return require("./collaboration-task-card").userAgentProgress.apply(null, arguments);
}
function sanitizeUserAgentProgressText(value, fallback = "", max = 180) {
    return require("./collaboration-task-card").sanitizeUserAgentProgressText.apply(null, arguments);
}
function normalizeUserAgentProgressStatus(status, phase = "") {
    return require("./collaboration-task-card").normalizeUserAgentProgressStatus.apply(null, arguments);
}
function userAgentProgressStatusLabel(status) {
    return require("./collaboration-task-card").userAgentProgressStatusLabel.apply(null, arguments);
}
function userAgentProgressDefaultSummary(agent, status, currentFocus = "", blockers = []) {
    return require("./collaboration-task-card").userAgentProgressDefaultSummary.apply(null, arguments);
}
function userAgentProgressNextAction(status, currentFocus = "") {
    return require("./collaboration-task-card").userAgentProgressNextAction.apply(null, arguments);
}
function userAgentSessionStatus(session) {
    return require("./collaboration-task-card").userAgentSessionStatus.apply(null, arguments);
}
function userAgentSessionSummary(session, status) {
    return require("./collaboration-task-card").userAgentSessionSummary.apply(null, arguments);
}
function userAgentSessionEvidence(session, status) {
    return require("./collaboration-task-card").userAgentSessionEvidence.apply(null, arguments);
}
function agentNameMatches(value, name) {
    return require("./collaboration-task-card").agentNameMatches.apply(null, arguments);
}
function latestAgentMatch(rows, name, picker) {
    return require("./collaboration-task-card").latestAgentMatch.apply(null, arguments);
}
function isVisibleChildAgentName(name) {
    return require("./collaboration-task-card").isVisibleChildAgentName.apply(null, arguments);
}
function buildUserAgentProgressSummary(task, summary = {}, workers = [], executions = [], sessions = [], workItems = [], phase = "") {
    return require("./collaboration-task-card").buildUserAgentProgressSummary.apply(null, arguments);
}
function normalizeUserChangeFile(item, fallback = {}) {
    return require("./collaboration-task-card").normalizeUserChangeFile.apply(null, arguments);
}
function pushUserChangeFiles(target, value, fallback = {}) {
    return require("./collaboration-task-card").pushUserChangeFiles.apply(null, arguments);
}
function userChangeFileKey(file) {
    return require("./collaboration-task-card").userChangeFileKey.apply(null, arguments);
}
function isGenericChangeOwner(value) {
    return require("./collaboration-task-card").isGenericChangeOwner.apply(null, arguments);
}
function pickChangeOwner(current, incoming) {
    return require("./collaboration-task-card").pickChangeOwner.apply(null, arguments);
}
function mergeUserChangeFile(current, incoming) {
    return require("./collaboration-task-card").mergeUserChangeFile.apply(null, arguments);
}
function uniqueUserChangeFiles(rawFiles) {
    return require("./collaboration-task-card").uniqueUserChangeFiles.apply(null, arguments);
}
function buildUserChangeSummary(task, summary = {}, workers = [], workItems = []) {
    return require("./collaboration-task-card").buildUserChangeSummary.apply(null, arguments);
}
function buildUserTaskActions(task, phase, executions) {
    return require("./collaboration-task-card").buildUserTaskActions.apply(null, arguments);
}
function getTaskWorkItems(task, executions = []) {
    return require("./collaboration-task-card").getTaskWorkItems.apply(null, arguments);
}
function persistTaskWorkItems(taskId, items, meta = {}) {
    if (!taskId || !Array.isArray(items))
        return null;
    return (0, collaboration_runtime_runtime_tools_1.updateTask)(taskId, {
        work_items: items,
        work_item_summary: (0, work_items_1.buildMainAgentWorkItemSummary)(items),
        work_item_runtime: {
            ...((0, collaboration_runtime_task_queue_part_02_1.getTaskById)(taskId)?.work_item_runtime || {}),
            ...meta,
            updated_at: new Date().toISOString(),
        },
    });
}
function claimTaskWorkItemForAgent(taskId, agent, detail = "", options = {}) {
    const task = (0, collaboration_runtime_task_queue_part_02_1.getTaskById)(taskId);
    const target = String(agent || "").trim();
    if (!task || !target) {
        const claim = { ok: false, reason: "task_not_found", items: [] };
        return { ...claim, summary: (0, work_items_1.buildMainAgentWorkItemClaimSummary)(claim, target, options.itemRef || target) };
    }
    const items = getTaskWorkItems(task);
    const claim = (0, work_items_1.claimMainAgentWorkItem)(items, options.itemRef || target, target, {
        checkOwnerBusy: options.checkOwnerBusy === true,
        now: new Date().toISOString(),
    });
    const at = new Date().toISOString();
    const claimSummary = (0, work_items_1.buildMainAgentWorkItemClaimSummary)(claim, target, options.itemRef || target);
    const runtimeMeta = {
        last_claim_summary: claimSummary,
        last_claim_attempt: {
            agent: target,
            item_id: claim.item?.id || "",
            result: claim.ok ? "claimed" : "waiting",
            reason: claim.reason || "",
            at,
        },
    };
    if (claim.ok) {
        runtimeMeta.last_claim = { agent: target, item_id: claim.item?.id || "", at, detail: detail || claimSummary.headline };
    }
    else if (claim.reason === "blocked") {
        runtimeMeta.last_claim_blocked = { agent: target, blocking: claim.blocking || [], at };
    }
    persistTaskWorkItems(taskId, claim.items, runtimeMeta);
    (0, logs_1.addTaskLog)(taskId, claim.ok ? "info" : "warning", claimSummary.headline);
    (0, logs_1.appendTaskTimelineEvent)(taskId, {
        type: claim.ok ? "work_item_claimed" : "work_item_claim_waiting",
        title: claim.ok ? `${target} 已接下工作项` : "工作项暂未派发",
        detail: claimSummary.headline,
        status: claim.ok ? "active" : "warn",
        phase: claim.ok ? "executing" : claim.reason === "blocked" ? "waiting_dependency" : "waiting_dispatch",
        agent: target,
        data: {
            work_item_id: claim.item?.id || "",
            reason: claim.reason || "",
            blocking: claim.blocking || [],
            busy_work_item_id: claim.busy?.id || "",
        },
    });
    return { ...claim, summary: claimSummary };
}
function updateTaskWorkItemFromReceipt(taskId, agent, receipt = null, fileChanges = null, detail = "", options = {}) {
    const task = (0, collaboration_runtime_task_queue_part_02_1.getTaskById)(taskId);
    const target = String(agent || receipt?.agent || receipt?.project || "").trim();
    if (!task || !target)
        return null;
    const rawFiles = Array.isArray(receipt?.filesChanged || receipt?.files_changed || receipt?.files)
        ? (receipt.filesChanged || receipt.files_changed || receipt.files)
        : Array.isArray(fileChanges?.files)
            ? fileChanges.files.map((item) => item?.path || item?.file || item).filter(Boolean)
            : [];
    const patch = {
        status: (0, work_items_1.normalizeMainAgentWorkItemStatus)(receipt?.status || receipt?.receipt_status || "blocked"),
        lastReceipt: receipt || null,
        evidence: [receipt?.summary || detail].filter(Boolean),
        filesChanged: rawFiles,
        verification: Array.isArray(receipt?.verification || receipt?.tests) ? (receipt.verification || receipt.tests) : [],
        blockers: Array.isArray(receipt?.blockers) ? receipt.blockers : [],
        needs: Array.isArray(receipt?.needs) ? receipt.needs : [],
        completedAt: (0, work_items_1.normalizeMainAgentWorkItemStatus)(receipt?.status || "") === "completed" ? new Date().toISOString() : "",
    };
    const previousItems = getTaskWorkItems(task);
    const nextItems = (0, work_items_1.updateMainAgentWorkItem)(previousItems, target, patch);
    let unlockSummary = patch.status === "completed"
        ? (0, work_items_1.buildMainAgentWorkItemUnlockSummary)(previousItems, nextItems, { completedAgent: target })
        : null;
    const updated = persistTaskWorkItems(taskId, nextItems, {
        last_receipt: { agent: target, status: receipt?.status || "", at: new Date().toISOString() },
        ...(unlockSummary ? { last_unlock_summary: unlockSummary } : {}),
    });
    if (unlockSummary) {
        (0, logs_1.addTaskLog)(taskId, "info", unlockSummary.headline);
        (0, logs_1.appendTaskTimelineEvent)(taskId, {
            type: "work_item_dependency_unlocked",
            title: unlockSummary.title,
            detail: unlockSummary.headline,
            status: "ok",
            phase: "dispatching",
            agent: target,
            data: { unlocked_work_item_ids: unlockSummary.technical.unlocked_work_item_ids },
        });
        const next = unlockSummary.next_claimable[0];
        const canAutoContinue = options.ctx
            && options.autoContinueUnlocked !== false
            && task.auto_execute !== false
            && task.status !== "done"
            && !isTaskPaused(task)
            && next?.id;
        if (canAutoContinue) {
            const latestTask = (0, collaboration_runtime_task_queue_part_02_1.getTaskById)(taskId) || updated || task;
            const message = (0, collaboration_runtime_runtime_tools_1.buildTargetedReworkContinuationDraft)(latestTask, {
                rework_kind: "next_claimable_work_item",
                work_item_id: next.id,
                target: next.target || next.owner || "",
                reason: next.subject || "继续处理已解锁工作项",
                title: "自动派发已解锁工作项",
            });
            const autoResult = (0, collaboration_runtime_runtime_tools_1.continueTaskWithMessage)(taskId, message, options.ctx, {
                source: "dependency_unlocked_next_work_item",
                internal: true,
                auto_execute: true,
                rework_kind: "next_claimable_work_item",
                work_item_id: next.id,
                target: next.target || next.owner || "",
                reason: next.subject || "继续处理已解锁工作项",
                title: "自动派发已解锁工作项",
                status_detail: sanitizeUserAgentProgressText(`${target} 前置工作已完成，我已自动接上 ${next.target || next.owner || "后续执行成员"} 的下一步`, "前置工作已完成，我已自动接上下一步。", 220),
                idempotency_key: `dependency-unlock:${taskId}:${next.id}:${target}`,
            });
            const autoStatus = autoResult.success
                ? autoResult.deferred
                    ? "auto_dispatch_deferred"
                    : autoResult.queued
                        ? "auto_dispatch_queued"
                        : "ready_to_dispatch"
                : "auto_dispatch_blocked";
            unlockSummary = (0, work_items_1.buildMainAgentWorkItemUnlockSummary)(previousItems, nextItems, {
                completedAgent: target,
                status: autoStatus,
                headline: autoResult.success
                    ? `${target} 完成后，“${next.subject || "后续工作项"}”已经解锁，我已自动接上派发。`
                    : `${target} 完成后，“${next.subject || "后续工作项"}”已经解锁，但自动接续暂未开始。`,
                next_action: autoResult.success
                    ? autoResult.deferred
                        ? "当前执行轮结束后，我会继续派发这个已解锁工作项。"
                        : autoResult.queued
                            ? "任务已加入执行队列，我会继续跟踪执行成员结果。"
                            : "我已记录接续请求，会继续跟踪派发状态。"
                    : "执行通道暂时不可用，我会保留已解锁工作项并稍后重试。",
                auto_dispatch: { success: autoResult.success, queued: autoResult.queued, deferred: autoResult.deferred, error: autoResult.error || "" },
            }) || unlockSummary;
            persistTaskWorkItems(taskId, getTaskWorkItems((0, collaboration_runtime_task_queue_part_02_1.getTaskById)(taskId) || latestTask), { last_unlock_summary: unlockSummary });
            (0, logs_1.addTaskLog)(taskId, autoResult.success ? "info" : "warning", unlockSummary.headline);
        }
    }
    (0, logs_1.appendTaskTimelineEvent)(taskId, {
        type: "work_item_receipt",
        title: `${target} 工作项结果说明`,
        detail: receipt?.summary || detail || `状态 ${receipt?.status || "unknown"}`,
        status: patch.status === "completed" ? "ok" : patch.status === "failed" ? "fail" : "warn",
        phase: patch.status === "completed" ? "reviewing" : "rework",
        agent: target,
        data: { receipt, files: rawFiles },
    });
    return updated;
}
function requeueTaskWorkItemsForWatchdog(task, staleMs, reason, nowMs = Date.now()) {
    const currentItems = getTaskWorkItems(task);
    const result = (0, work_items_1.requeueStaleMainAgentWorkItems)(currentItems, { staleMs, nowMs, reason });
    if (!result.requeued.length)
        return result;
    persistTaskWorkItems(task.id, result.items, {
        last_requeue: {
            at: new Date(nowMs).toISOString(),
            reason,
            item_ids: result.requeued.map((item) => item.id),
        },
    });
    (0, logs_1.addTaskLog)(task.id, "warning", `看门狗释放 ${result.requeued.length} 个卡住的子 Agent 工作项：${reason}`);
    (0, logs_1.appendTaskTimelineEvent)(task.id, {
        type: "work_item_requeued",
        title: "看门狗已释放卡住的工作项",
        detail: result.requeued.map((item) => `${item.target || item.owner}:${item.subject}`).join("；").slice(0, 500),
        status: "warn",
        phase: "reworking",
        data: { item_ids: result.requeued.map((item) => item.id), reason },
    });
    return result;
}
function stableTaskEntityId(prefix, value) {
    return require("./collaboration-task-card").stableTaskEntityId.apply(null, arguments);
}
function groupSessionIdForTask(task) {
    return require("./collaboration-task-card").groupSessionIdForTask.apply(null, arguments);
}
function buildTaskEntityChain(taskId) {
    return require("./collaboration-task-card").buildTaskEntityChain.apply(null, arguments);
}
function buildTaskCardView(task, executions, sessions) {
    return require("./collaboration-task-card").buildTaskCardView.apply(null, arguments);
}
function normalizeContinuationKind(kind) {
    return require("./collaboration-task-card").normalizeContinuationKind.apply(null, arguments);
}
function buildContinuationUserDecision(input = {}) {
    return require("./collaboration-task-card").buildContinuationUserDecision.apply(null, arguments);
}
function buildUserContinuationStatus(task, phase = "") {
    return require("./collaboration-task-card").buildUserContinuationStatus.apply(null, arguments);
}
function shouldResumeAfterGoalRevisionInterruption(task, executionFollowupRevision = 0) {
    return require("./collaboration-task-card").shouldResumeAfterGoalRevisionInterruption.apply(null, arguments);
}
function buildGoalRevisionInterruptedStatus(pending = []) {
    return require("./collaboration-task-card").buildGoalRevisionInterruptedStatus.apply(null, arguments);
}
function shouldShowUserTaskCard(task, summary = {}, executions = []) {
    return require("./collaboration-task-card").shouldShowUserTaskCard.apply(null, arguments);
}
function timelineStatusForUser(item) {
    return require("./collaboration-task-card").timelineStatusForUser.apply(null, arguments);
}
function timelineLabelForUser(item) {
    return require("./collaboration-task-card").timelineLabelForUser.apply(null, arguments);
}
function buildUserWorkflowTimeline(task, summary, phase) {
    return require("./collaboration-task-card").buildUserWorkflowTimeline.apply(null, arguments);
}
function buildUserAgentQuestionRows(summary) {
    return require("./collaboration-task-card").buildUserAgentQuestionRows.apply(null, arguments);
}
function buildUserConflictWarnings(summary) {
    return require("./collaboration-task-card").buildUserConflictWarnings.apply(null, arguments);
}
function splitUserAcceptanceText(value) {
    return require("./collaboration-task-card").splitUserAcceptanceText.apply(null, arguments);
}
function getTaskPlanMode(task) {
    return require("./collaboration-task-card").getTaskPlanMode.apply(null, arguments);
}
function buildUserWorkOrderPreview(task, summary = {}, planMode = null) {
    return require("./collaboration-task-card").buildUserWorkOrderPreview.apply(null, arguments);
}
function executionStoryStatus(conditionDone, conditionActive, phase) {
    return require("./collaboration-task-card").executionStoryStatus.apply(null, arguments);
}
function buildUserExecutionStory(task, summary = {}, executions = [], phase = "planning", workOrderPreview = null) {
    return require("./collaboration-task-card").buildUserExecutionStory.apply(null, arguments);
}
function buildUserCompletionReadinessSummary(task, summary = {}, workItems = [], phase = "planning") {
    return require("./collaboration-task-card").buildUserCompletionReadinessSummary.apply(null, arguments);
}
function sanitizeAcceptanceVisibleText(value, fallback = "验收检查已整理。", max = 220) {
    return require("./collaboration-task-card").sanitizeAcceptanceVisibleText.apply(null, arguments);
}
function normalizeUserAcceptanceCheck(item, context = {}) {
    return require("./collaboration-task-card").normalizeUserAcceptanceCheck.apply(null, arguments);
}
function buildUserAcceptanceReview(task, summary = {}, executions = [], phase = "planning") {
    return require("./collaboration-task-card").buildUserAcceptanceReview.apply(null, arguments);
}
function planAlignmentEvidenceLabels(summary = {}, task = {}) {
    return require("./collaboration-task-card").planAlignmentEvidenceLabels.apply(null, arguments);
}
function planCriterionStatus(criterion, summary = {}, task = {}, acceptanceReview = null) {
    return require("./collaboration-task-card").planCriterionStatus.apply(null, arguments);
}
function buildUserPlanAlignmentReview(task, summary = {}, phase = "planning", planMode = null, workOrderPreview = null, acceptanceReview = null) {
    return require("./collaboration-task-card").buildUserPlanAlignmentReview.apply(null, arguments);
}
function buildUserHandoffSummary(task, summary = {}, phase = "planning", nextAction = "", blockers = [], acceptanceReview = null, planAlignment = null, changeSummary = null) {
    return require("./collaboration-task-card").buildUserHandoffSummary.apply(null, arguments);
}
function extractMemoryDispatchFreshnessGateFromValue(value) {
    return require("./collaboration-memory-gates").extractMemoryDispatchFreshnessGateFromValue.apply(null, arguments);
}
function normalizeMemoryGateAgent(value) {
    return require("./collaboration-memory-gates").normalizeMemoryGateAgent.apply(null, arguments);
}
function getTaskAgentMemoryContextSnapshotSources(context = {}) {
    return require("./collaboration-memory-gates").getTaskAgentMemoryContextSnapshotSources.apply(null, arguments);
}
function forEachTaskAgentMemoryContextSnapshotSource(context = {}, visit) {
    return require("./collaboration-memory-gates").forEachTaskAgentMemoryContextSnapshotSource.apply(null, arguments);
}
function summarizeTaskAgentMemoryContextSnapshot(snapshot = {}) {
    return require("./collaboration-memory-gates").summarizeTaskAgentMemoryContextSnapshot.apply(null, arguments);
}
function evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptTaskAgentMemoryContextSnapshot.apply(null, arguments);
}
function collectTaskMemoryDispatchFreshnessGates(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskMemoryDispatchFreshnessGates.apply(null, arguments);
}
function evaluateReceiptMemoryDispatchGate(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptMemoryDispatchGate.apply(null, arguments);
}
function extractReadPlanRevalidationGateFromValue(value) {
    return require("./collaboration-memory-gates").extractReadPlanRevalidationGateFromValue.apply(null, arguments);
}
function collectTaskReadPlanRevalidationGates(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskReadPlanRevalidationGates.apply(null, arguments);
}
function evaluateReceiptReadPlanRevalidationGate(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptReadPlanRevalidationGate.apply(null, arguments);
}
function extractPostCompactReinjectionGateFromValue(value) {
    return require("./collaboration-memory-gates").extractPostCompactReinjectionGateFromValue.apply(null, arguments);
}
function collectTaskPostCompactReinjectionGates(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskPostCompactReinjectionGates.apply(null, arguments);
}
function extractPostCompactDispatchMarkerFromValue(value) {
    return require("./collaboration-memory-gates").extractPostCompactDispatchMarkerFromValue.apply(null, arguments);
}
function collectTaskPostCompactDispatchMarkers(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskPostCompactDispatchMarkers.apply(null, arguments);
}
function normalizePostCompactCandidateUsageState(value) {
    return require("./collaboration-memory-gates").normalizePostCompactCandidateUsageState.apply(null, arguments);
}
function collectReceiptPostCompactCandidateUsageRows(receipt = {}) {
    return require("./collaboration-memory-gates").collectReceiptPostCompactCandidateUsageRows.apply(null, arguments);
}
function structuredUsageMatchesCandidate(row, gate, candidate) {
    return require("./collaboration-memory-gates").structuredUsageMatchesCandidate.apply(null, arguments);
}
function evaluatePostCompactReinjectionCandidateReference(gate, declarationText = "", structuredUsageRows = []) {
    return require("./collaboration-memory-gates").evaluatePostCompactReinjectionCandidateReference.apply(null, arguments);
}
function evaluateReceiptPostCompactReinjectionGate(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptPostCompactReinjectionGate.apply(null, arguments);
}
function extractApiMicrocompactEditPlanFromValue(value) {
    return require("./collaboration-memory-gates").extractApiMicrocompactEditPlanFromValue.apply(null, arguments);
}
function extractApiMicrocompactNativeApplyPlanFromValue(value) {
    return require("./collaboration-memory-gates").extractApiMicrocompactNativeApplyPlanFromValue.apply(null, arguments);
}
function extractApiMicrocompactSessionBindingFromValue(value) {
    return require("./collaboration-memory-gates").extractApiMicrocompactSessionBindingFromValue.apply(null, arguments);
}
function collectTaskApiMicrocompactEditPlans(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskApiMicrocompactEditPlans.apply(null, arguments);
}
function normalizeApiMicrocompactUsageState(value) {
    return require("./collaboration-memory-gates").normalizeApiMicrocompactUsageState.apply(null, arguments);
}
function collectReceiptApiMicrocompactUsageRows(receipt = {}) {
    return require("./collaboration-memory-gates").collectReceiptApiMicrocompactUsageRows.apply(null, arguments);
}
function evaluateReceiptApiMicrocompactEditPlan(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptApiMicrocompactEditPlan.apply(null, arguments);
}
function extractGlobalAgentMemoryRecallFromValue(value) {
    return require("./collaboration-memory-gates").extractGlobalAgentMemoryRecallFromValue.apply(null, arguments);
}
function collectTaskGlobalMemoryReceiptGates(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskGlobalMemoryReceiptGates.apply(null, arguments);
}
function extractGlobalMemoryHealthGateFromValue(value) {
    return require("./collaboration-memory-gates").extractGlobalMemoryHealthGateFromValue.apply(null, arguments);
}
function collectTaskGlobalMemoryHealthGates(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskGlobalMemoryHealthGates.apply(null, arguments);
}
function extractTypedMemoryRecallFromValue(value, depth = 0) {
    return require("./collaboration-memory-gates").extractTypedMemoryRecallFromValue.apply(null, arguments);
}
function collectTaskTypedMemoryPressureRecallDocs(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskTypedMemoryPressureRecallDocs.apply(null, arguments);
}
function collectTaskTypedMemoryRecallDocs(task = {}, context = {}) {
    return require("./collaboration-memory-gates").collectTaskTypedMemoryRecallDocs.apply(null, arguments);
}
function collectReceiptTypedMemoryUsageRows(receipt = {}) {
    return require("./collaboration-memory-gates").collectReceiptTypedMemoryUsageRows.apply(null, arguments);
}
function configuredProjectWorkDir(project) {
    return require("./collaboration-memory-gates").configuredProjectWorkDir.apply(null, arguments);
}
function verifyTypedMemoryCurrentSourceEvidence(evidence = null, project = "", context = {}) {
    return require("./collaboration-memory-gates").verifyTypedMemoryCurrentSourceEvidence.apply(null, arguments);
}
function typedMemoryUsageStateFromReceipt(doc, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").typedMemoryUsageStateFromReceipt.apply(null, arguments);
}
function collectTaskTypedMemoryConsumptionRows(task = {}, receipts = [], context = {}) {
    return require("./collaboration-memory-gates").collectTaskTypedMemoryConsumptionRows.apply(null, arguments);
}
function typedMemoryPressureRecallDocRefs(doc = {}) {
    return require("./collaboration-memory-gates").typedMemoryPressureRecallDocRefs.apply(null, arguments);
}
function normalizeTypedMemoryPressureUsageState(value) {
    return require("./collaboration-memory-gates").normalizeTypedMemoryPressureUsageState.apply(null, arguments);
}
function collectReceiptMemoryProvenanceUsageRows(receipt = {}) {
    return require("./collaboration-memory-gates").collectReceiptMemoryProvenanceUsageRows.apply(null, arguments);
}
function pressureRecallUsageStateFromReceipt(doc = {}, receipt = {}) {
    return require("./collaboration-memory-gates").pressureRecallUsageStateFromReceipt.apply(null, arguments);
}
function collectTaskTypedMemoryPressureRecallUsageRows(task = {}, receipts = [], context = {}) {
    return require("./collaboration-memory-gates").collectTaskTypedMemoryPressureRecallUsageRows.apply(null, arguments);
}
function normalizeGlobalMemoryUsageState(value) {
    return require("./collaboration-memory-gates").normalizeGlobalMemoryUsageState.apply(null, arguments);
}
function globalMemoryUsageSnippet(text, id) {
    return require("./collaboration-memory-gates").globalMemoryUsageSnippet.apply(null, arguments);
}
function collectReceiptGlobalMemoryUsageRows(receipt = {}) {
    return require("./collaboration-memory-gates").collectReceiptGlobalMemoryUsageRows.apply(null, arguments);
}
function evaluateReceiptGlobalMemoryUsageGate(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptGlobalMemoryUsageGate.apply(null, arguments);
}
function evaluateReceiptGlobalMemoryHealthGate(task, receipt = {}, context = {}) {
    return require("./collaboration-memory-gates").evaluateReceiptGlobalMemoryHealthGate.apply(null, arguments);
}
function buildMemoryGateVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildMemoryGateVisibleSummary.apply(null, arguments);
}
function buildGlobalMemoryReceiptVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildGlobalMemoryReceiptVisibleSummary.apply(null, arguments);
}
function buildGlobalMemoryHealthGateVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildGlobalMemoryHealthGateVisibleSummary.apply(null, arguments);
}
function buildReadPlanRevalidationGateVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildReadPlanRevalidationGateVisibleSummary.apply(null, arguments);
}
function buildPostCompactReinjectionGateVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildPostCompactReinjectionGateVisibleSummary.apply(null, arguments);
}
function buildApiMicrocompactReceiptVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildApiMicrocompactReceiptVisibleSummary.apply(null, arguments);
}
function buildPostCompactDispatchMarkerVisibleSummary(summary = {}) {
    return require("./collaboration-memory-gates").buildPostCompactDispatchMarkerVisibleSummary.apply(null, arguments);
}
function receiptEvidenceStrings(...values) {
    return require("./collaboration-coordination-ux").receiptEvidenceStrings.apply(null, arguments);
}
function isConcreteReceiptFileEvidence(value) {
    return require("./collaboration-coordination-ux").isConcreteReceiptFileEvidence.apply(null, arguments);
}
function isConcreteReceiptActionEvidence(value) {
    return require("./collaboration-coordination-ux").isConcreteReceiptActionEvidence.apply(null, arguments);
}
function evaluateChildAgentHandoffQuality(task, receipt = {}) {
    return require("./collaboration-coordination-ux").evaluateChildAgentHandoffQuality.apply(null, arguments);
}
function scoreChildAgentReceipt(task, receipt = {}, context = {}) {
    return require("./collaboration-coordination-ux").scoreChildAgentReceipt.apply(null, arguments);
}
function buildCoordinationEventStream(task, summary = {}, executions = [], ackReview = null, contractTransfer = null, receiptRows = [], targetedRework = []) {
    return require("./collaboration-coordination-ux").buildCoordinationEventStream.apply(null, arguments);
}
function compactRuntimeToolAudit(audit = {}) {
    return require("./collaboration-coordination-ux").compactRuntimeToolAudit.apply(null, arguments);
}
function runtimeToolSnapshotFromAudit(audit = {}, allowedTools = {}) {
    return require("./collaboration-coordination-ux").runtimeToolSnapshotFromAudit.apply(null, arguments);
}
function attachInvokedSkillsToReceipt(receipt, text, allowedTools = {}, audit = null) {
    return require("./collaboration-coordination-ux").attachInvokedSkillsToReceipt.apply(null, arguments);
}
function collectRuntimeToolingFromSources(task = {}, execution = {}, lifecycle = [], receipts = []) {
    return require("./collaboration-coordination-ux").collectRuntimeToolingFromSources.apply(null, arguments);
}
function buildRuntimeKernelSnapshot(task = {}, summary = {}) {
    return require("./collaboration-coordination-ux").buildRuntimeKernelSnapshot.apply(null, arguments);
}
function buildTargetedReworkSuggestions(task, summary = {}, acceptanceReview = null, receiptQualityRows = []) {
    return require("./collaboration-coordination-ux").buildTargetedReworkSuggestions.apply(null, arguments);
}
function buildChildAgentPlanReviewSummary(ackReview = {}, orders = []) {
    return require("./collaboration-coordination-ux").buildChildAgentPlanReviewSummary.apply(null, arguments);
}
function buildUserAgentCoordinationProtocol(task, summary = {}, executions = [], workOrderPreview = null, acceptanceReview = null) {
    return require("./collaboration-coordination-ux").buildUserAgentCoordinationProtocol.apply(null, arguments);
}
function buildUserReceiptReworkSummary(task, summary = {}, agentCoordination = null) {
    return require("./collaboration-coordination-ux").buildUserReceiptReworkSummary.apply(null, arguments);
}
function buildUserCoordinationAcknowledgement(task, assignments = []) {
    return require("./collaboration-coordination-ux").buildUserCoordinationAcknowledgement.apply(null, arguments);
}
function sanitizeDispatchLaunchText(value, fallback = "", max = 220) {
    return require("./collaboration-coordination-ux").sanitizeDispatchLaunchText.apply(null, arguments);
}
function normalizeGroupDispatchLaunchRowStatus(rawValue = "dispatched") {
    return require("./collaboration-coordination-ux").normalizeGroupDispatchLaunchRowStatus.apply(null, arguments);
}
function buildDispatchLaunchSummary(input) {
    return require("./collaboration-task-intake").buildDispatchLaunchSummary(input);
}
function buildRevisedPlanModeDraft(planMode = {}, feedback = "") {
    return require("./collaboration-task-intake").buildRevisedPlanModeDraft(planMode, feedback);
}
function buildAcceptedPlanModeDraft(planMode = {}, feedback = "", acceptedAt = new Date().toISOString()) {
    return require("./collaboration-task-intake").buildAcceptedPlanModeDraft(planMode, feedback, acceptedAt);
}
function classifyGroupProjectTaskIntent(message, uploadedFiles = []) {
    return require("./collaboration-task-intake").classifyGroupProjectTaskIntent(message, uploadedFiles);
}
function normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, messageMode = "conversation") {
    return require("./collaboration-task-intake").normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, messageMode);
}
async function classifyGroupProjectTaskIntentWithAgent(input) {
    return require("./collaboration-task-intake").classifyGroupProjectTaskIntentWithAgent(input);
}
function shouldUseProjectAnalysisMode(input) {
    return require("./collaboration-task-intake").shouldUseProjectAnalysisMode(input);
}
function shouldCreatePersistentGroupTask(input) {
    return require("./collaboration-task-intake").shouldCreatePersistentGroupTask(input);
}
function classifyPlanModeRisk(message, group, taskIntent = {}, attachmentCount = 0) {
    return require("./collaboration-task-intake").classifyPlanModeRisk(message, group, taskIntent, attachmentCount);
}
//# sourceMappingURL=collaboration-runtime-task-queue-part-01.js.map