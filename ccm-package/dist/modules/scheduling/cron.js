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
exports.runConflictResolutionMemoryMaintenanceSchedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick;
exports.runCronDailyDevProtocolSelfTest = runCronDailyDevProtocolSelfTest;
exports.syncCronTaskStatus = syncCronTaskStatus;
exports.startCronScheduler = startCronScheduler;
exports.stopCronScheduler = stopCronScheduler;
exports.getConflictResolutionMemoryMaintenanceSchedulerStatus = getConflictResolutionMemoryMaintenanceSchedulerStatus;
exports.handleCronApi = handleCronApi;
const utils_1 = require("../../core/utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const utils_2 = require("../../core/utils");
const collaboration_1 = require("../collaboration/collaboration");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const cron_job_store_1 = require("./cron-job-store");
const cron_dev_reports_1 = require("./cron-dev-reports");
const storage_1 = require("../collaboration/storage");
const group_memory_index_1 = require("../collaboration/group-memory-index");
const runningCronJobs = new Set();
let schedulerTimer = null;
const CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE = path.join(utils_2.CCM_DIR, "memory-control", "conflict-resolution-maintenance-scheduler.json");
let latestConflictResolutionMaintenanceTick = null;
function readConflictResolutionMaintenanceSchedulerState(file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return { schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1", version: 1, groups: {}, updated_at: "" };
    }
}
function writeConflictResolutionMaintenanceSchedulerState(value, file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function runConflictResolutionMemoryMaintenanceSchedulerTick(options = {}) {
    const at = String(options.at || options.now || new Date().toISOString());
    const atMs = Date.parse(at);
    const stateFile = String(options.stateFile || options.state_file || CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE);
    const state = readConflictResolutionMaintenanceSchedulerState(stateFile);
    const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids) ? (options.groupIds || options.group_ids) : [];
    const groupIds = [...new Set((explicitGroupIds.length ? explicitGroupIds : (0, storage_1.loadGroups)().map((group) => group.id || group.groupId))
            .map((value) => String(value || "").trim())
            .filter((groupId) => groupId && fs.existsSync((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile)(groupId))))];
    const tickWindowMs = Math.max(60_000, Number(options.tickWindowMs || options.tick_window_ms || 5 * 60 * 1000));
    const baseBackoffMs = Math.max(1_000, Number(options.baseBackoffMs || options.base_backoff_ms || 60_000));
    const maxBackoffMs = Math.max(baseBackoffMs, Number(options.maxBackoffMs || options.max_backoff_ms || 6 * 60 * 60 * 1000));
    const runner = typeof options.runMaintenance === "function"
        ? options.runMaintenance
        : (ids, runOptions) => (0, group_memory_index_1.runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance)(ids, runOptions);
    const telemetryRetentionRunner = typeof options.runTelemetryRetention === "function"
        ? options.runTelemetryRetention
        : (groupId, runOptions) => (0, group_memory_index_1.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention)(groupId, runOptions);
    const telemetryRecoveryRunner = typeof options.runTelemetryRecovery === "function"
        ? options.runTelemetryRecovery
        : (groupId, runOptions) => (0, group_memory_index_1.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger)(groupId, runOptions);
    const telemetryOrphanRunner = typeof options.runTelemetryOrphanReconciliation === "function"
        ? options.runTelemetryOrphanReconciliation
        : (groupId, runOptions) => (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans)(groupId, runOptions);
    const telemetryQuarantineRetentionRunner = typeof options.runTelemetryQuarantineRetention === "function"
        ? options.runTelemetryQuarantineRetention
        : (groupId, runOptions) => (0, group_memory_index_1.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention)(groupId, runOptions);
    const rows = [];
    for (const groupId of groupIds) {
        const groupState = state.groups?.[groupId] || {};
        const nextRetryMs = Date.parse(String(groupState.next_retry_at || ""));
        if (Number.isFinite(nextRetryMs) && Number.isFinite(atMs) && atMs < nextRetryMs) {
            rows.push({ groupId, status: "backoff", skipped: true, nextRetryAt: groupState.next_retry_at, destructiveActionAuthorized: false, deletedCount: 0 });
            continue;
        }
        const windowKey = Number.isFinite(atMs) ? Math.floor(atMs / tickWindowMs) : Math.floor(Date.now() / tickWindowMs);
        const operationKey = `${groupId}:${windowKey}`;
        const operation = (0, reliability_ledger_1.acquireIdempotency)({
            scope: "conflict-resolution-memory-maintenance",
            key: operationKey,
            leaseMs: Math.max(30_000, Math.min(tickWindowMs, 10 * 60 * 1000)),
            metadata: { group_id: groupId, maintenance_window: windowKey, scheduler: true, destructive_action_authorized: false },
        });
        if (!operation.acquired) {
            rows.push({
                groupId,
                status: "duplicate_suppressed",
                skipped: true,
                duplicate: true,
                inProgress: operation.inProgress === true,
                operationKey,
                destructiveActionAuthorized: false,
                deletedCount: 0,
            });
            continue;
        }
        try {
            const result = runner([groupId], {
                at,
                force: options.force === true,
                persist: true,
                emitNotifications: true,
                intervalMs: options.intervalMs || options.interval_ms,
                gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
            });
            if (result?.destructiveActionAuthorized !== false || Number(result?.deletedCount || 0) !== 0) {
                throw new Error("background maintenance violated non-destructive scheduler boundary");
            }
            const telemetryRecovery = telemetryRecoveryRunner(groupId, { at, apply: true, trigger: "background" });
            const telemetryOrphans = telemetryOrphanRunner(groupId, { at, persist: true, trigger: "background" });
            const telemetryQuarantineRetention = telemetryQuarantineRetentionRunner(groupId, { at, trigger: "background" });
            for (const telemetryResult of [telemetryRecovery, telemetryOrphans, telemetryQuarantineRetention]) {
                if (telemetryResult?.destructive_action_authorized !== false
                    || Number(telemetryResult?.created_task_count || 0) !== 0
                    || Number(telemetryResult?.created_approval_receipt_count || 0) !== 0
                    || Number(telemetryResult?.deleted_count || 0) !== 0) {
                    throw new Error("background delivery telemetry recovery violated non-destructive scheduler boundary");
                }
            }
            const telemetryRetention = telemetryRetentionRunner(groupId, {
                at,
                terminalAgeMs: options.deliveryTerminalAgeMs || options.delivery_terminal_age_ms,
                maxHotEntries: options.deliveryMaxHotEntries || options.delivery_max_hot_entries,
                maxCompactedEntries: options.deliveryMaxCompactedEntries || options.delivery_max_compacted_entries,
            });
            if (telemetryRetention?.destructive_action_authorized !== false
                || Number(telemetryRetention?.created_task_count || 0) !== 0
                || Number(telemetryRetention?.created_approval_receipt_count || 0) !== 0
                || Number(telemetryRetention?.deleted_count || 0) !== 0) {
                throw new Error("background delivery telemetry retention violated non-destructive scheduler boundary");
            }
            (0, reliability_ledger_1.completeIdempotency)("conflict-resolution-memory-maintenance", operationKey, {
                success: true,
                group_id: groupId,
                due_count: Number(result?.dueCount || 0),
                skipped_count: Number(result?.skippedCount || 0),
                destructive_action_authorized: false,
                deleted_count: 0,
                delivery_retention_status: telemetryRetention?.status || "",
                delivery_retention_generation: Number(telemetryRetention?.retention_generation || 0),
                delivery_recovery_status: telemetryRecovery?.status || "",
                delivery_orphan_candidate_count: Number(telemetryOrphans?.candidate_count || 0),
                delivery_quarantine_retention_status: telemetryQuarantineRetention?.status || "",
            });
            state.groups = { ...(state.groups || {}), [groupId]: {
                    failure_count: 0,
                    next_retry_at: "",
                    last_success_at: at,
                    last_operation_key: operationKey,
                    last_status: Number(result?.dueCount || 0) > 0 ? "completed" : "not_due",
                } };
            rows.push({ groupId, status: Number(result?.dueCount || 0) > 0 ? "completed" : "not_due", skipped: Number(result?.dueCount || 0) === 0, operationKey, result, telemetryRecovery, telemetryOrphans, telemetryQuarantineRetention, telemetryRetention, destructiveActionAuthorized: false, deletedCount: 0 });
        }
        catch (error) {
            (0, reliability_ledger_1.failIdempotency)("conflict-resolution-memory-maintenance", operationKey, error);
            const failureCount = Number(groupState.failure_count || 0) + 1;
            const backoffMs = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, Math.max(0, failureCount - 1)));
            const nextRetryAt = new Date((Number.isFinite(atMs) ? atMs : Date.now()) + backoffMs).toISOString();
            state.groups = { ...(state.groups || {}), [groupId]: {
                    ...groupState,
                    failure_count: failureCount,
                    next_retry_at: nextRetryAt,
                    last_failure_at: at,
                    last_error: String(error?.message || error).slice(0, 1000),
                    last_operation_key: operationKey,
                    last_status: "failed",
                } };
            rows.push({ groupId, status: "failed", skipped: false, operationKey, error: String(error?.message || error), failureCount, nextRetryAt, destructiveActionAuthorized: false, deletedCount: 0 });
        }
    }
    const value = {
        schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1",
        version: 1,
        groups: state.groups || {},
        updated_at: at,
    };
    if (options.persist !== false)
        writeConflictResolutionMaintenanceSchedulerState(value, stateFile);
    const report = {
        schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
        at,
        groupCount: groupIds.length,
        completedCount: rows.filter(row => row.status === "completed").length,
        notDueCount: rows.filter(row => row.status === "not_due").length,
        duplicateSuppressedCount: rows.filter(row => row.status === "duplicate_suppressed").length,
        backoffCount: rows.filter(row => row.status === "backoff").length,
        failedCount: rows.filter(row => row.status === "failed").length,
        destructiveActionAuthorized: false,
        deletedCount: 0,
        createdTaskCount: 0,
        createdApprovalReceiptCount: 0,
        deliveryRetentionCount: rows.filter(row => row.telemetryRetention).length,
        deliveryRetentionBlockedCount: rows.filter(row => row.telemetryRetention?.status === "blocked").length,
        deliveryRecoveryCount: rows.filter(row => row.telemetryRecovery?.recovered === true).length,
        deliveryRecoveryBlockedCount: rows.filter(row => row.telemetryRecovery?.status === "blocked").length,
        deliveryOrphanCandidateCount: rows.reduce((sum, row) => sum + Number(row.telemetryOrphans?.candidate_count || 0), 0),
        deliveryQuarantineRetentionCount: rows.filter(row => row.telemetryQuarantineRetention && row.telemetryQuarantineRetention.status !== "empty").length,
        deliveryQuarantineRetentionBlockedCount: rows.filter(row => row.telemetryQuarantineRetention?.status === "blocked").length,
        rows,
        stateFile,
    };
    latestConflictResolutionMaintenanceTick = report;
    return report;
}
function buildTaskFromCronJob(job, trigger) {
    const targetType = (0, cron_job_store_1.normalizeTargetType)(job);
    const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
    const requiresCodeChanges = workflowType === "daily_dev"
        ? (job.requires_code_changes ?? job.requiresCodeChanges ?? true)
        : false;
    const triggerText = trigger === "manual" ? "手动执行" : "计划执行";
    const buildCronSourceDocuments = (extra = "") => [
        `[定时任务 ${job.name || job.id || "未命名"}]`,
        `触发方式：${triggerText}`,
        `Cron 表达式：${job.schedule || ""}`,
        "定时任务提示词：",
        job.prompt || "",
        extra ? "\n已认领/生成的业务文档：" : "",
        extra,
    ].filter(Boolean).join("\n");
    const cronMeta = {
        workflow_type: workflowType,
        imported_shared_docs: null,
        claimed_backlogs: [],
    };
    const buildBacklogTask = (backlog, batchIndex = 0, batchTotal = 1) => {
        const description = [
            `定时任务来源：${job.name}`,
            `触发方式：${triggerText}`,
            `Cron 表达式：${job.schedule}`,
            `工作流类型：业务开发 daily_dev`,
            `需求池文件：${backlog.backlog_file}`,
            batchTotal > 1 ? `批量认领：第 ${batchIndex + 1}/${batchTotal} 条` : "",
            `代码变更要求：${requiresCodeChanges && backlog.requires_code_changes !== false ? "必须有实际文件变更才能完成" : "允许无代码变更"}`,
            "",
            "定时任务提示词：",
            job.prompt,
            "",
            "已认领的需求池内容：",
            backlog.documents,
            "",
            "主 Agent 执行要求：",
            "- 按已认领需求拆分给对应项目子 Agent。",
            "- 子 Agent 必须返回 CCM_AGENT_RECEIPT。",
            "- 最终报告必须覆盖完成内容、涉及文件、验证结果、风险和仍需用户确认的事项。",
        ].filter(line => line !== "").join("\n");
        return {
            title: `[定时] ${backlog.title}`,
            description,
            target_project: "coordinator",
            group_id: job.group_id,
            assign_type: "group",
            priority: backlog.priority || job.priority || "normal",
            auto_execute: true,
            workflow_type: "daily_dev",
            requires_code_changes: requiresCodeChanges && backlog.requires_code_changes !== false,
            requires_verification: true,
            business_goal: backlog.business_goal || backlog.title || String(job.prompt || job.name || "").slice(0, 500),
            acceptance_criteria: backlog.acceptance || "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。",
            source_documents: buildCronSourceDocuments(backlog.documents),
            workflow_meta: {
                intake: {
                    backlog_file: backlog.backlog_file,
                    claimed_by_cron_job_id: job.id,
                    cron_trigger: trigger,
                    claimed_at: new Date().toISOString(),
                },
                batch: batchTotal > 1 ? { index: batchIndex + 1, total: batchTotal } : null,
                cron: cronMeta,
            },
            cron_job_id: job.id,
            cron_trigger: trigger,
        };
    };
    if (workflowType === "daily_dev" && targetType === "group") {
        const shouldImportSharedDocs = job.import_shared_docs !== false && job.importSharedDocs !== false;
        if (shouldImportSharedDocs) {
            const importResult = (0, collaboration_1.importSharedDocsToDailyDevBacklog)({
                group_id: job.group_id,
                limit: Math.max(1, Math.min(20, Number(job.import_shared_docs_limit || job.importSharedDocsLimit || job.backlog_batch_limit || job.backlogBatchLimit || 1))),
                priority: job.priority || "normal",
                requires_code_changes: requiresCodeChanges,
                source: "cron",
            });
            cronMeta.imported_shared_docs = {
                imported: importResult.imported || 0,
                skipped: importResult.skipped || 0,
                items: (importResult.items || []).map((item) => ({
                    source: item.source,
                    backlog: item.backlog,
                    title: item.title,
                })),
            };
        }
        const batchLimit = Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1)));
        const claimed = [];
        for (let i = 0; i < batchLimit; i++) {
            const backlog = (0, collaboration_1.claimReadyDailyDevBacklog)(job.group_id, { source: "cron", cron_job_id: job.id, trigger });
            if (!backlog)
                break;
            claimed.push(backlog);
        }
        if (claimed.length > 0) {
            const total = claimed.length;
            cronMeta.claimed_backlogs = claimed.map((backlog) => ({
                backlog_file: backlog.backlog_file,
                title: backlog.title,
                priority: backlog.priority,
            }));
            const drafts = claimed.map((backlog, index) => buildBacklogTask(backlog, index, total));
            return { drafts: batchLimit > 1 ? drafts : [drafts[0]], meta: cronMeta };
        }
    }
    if (workflowType === "daily_dev" && targetType === "group" && job.run_without_backlog !== true && job.allow_empty_run !== true) {
        return { drafts: [], meta: cronMeta };
    }
    const description = [
        `定时任务来源：${job.name}`,
        `触发方式：${triggerText}`,
        `Cron 表达式：${job.schedule}`,
        workflowType === "daily_dev" ? "工作流类型：业务开发 daily_dev" : "",
        workflowType === "daily_dev"
            ? `代码变更要求：${requiresCodeChanges ? "必须有实际文件变更才能完成" : "允许无代码变更"}`
            : "",
        "",
        job.prompt,
    ].filter(line => line !== "").join("\n");
    const draft = {
        title: `[定时] ${job.name}`,
        description,
        target_project: targetType === "group" ? "coordinator" : job.project,
        group_id: targetType === "group" ? job.group_id : null,
        assign_type: targetType === "group" ? "group" : "project",
        priority: job.priority || "normal",
        auto_execute: true,
        workflow_type: workflowType,
        requires_code_changes: requiresCodeChanges,
        requires_verification: workflowType === "daily_dev",
        business_goal: workflowType === "daily_dev" ? String(job.prompt || job.name || "").slice(0, 500) : "",
        acceptance_criteria: workflowType === "daily_dev" ? "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。" : "",
        source_documents: workflowType === "daily_dev" ? buildCronSourceDocuments("来自定时任务提示词、群聊共享文件或 backlog 文档。") : "",
        cron_job_id: job.id,
        cron_trigger: trigger,
    };
    return { drafts: [draft], meta: cronMeta };
}
function runCronDailyDevProtocolSelfTest() {
    const job = {
        id: "cron-daily-dev-self-test",
        name: "退款审核定时开发",
        schedule: "*/30 * * * *",
        target_type: "group",
        group_id: "demo-group",
        workflow_type: "daily_dev",
        run_without_backlog: true,
        prompt: "按接口文档实现退款审核，接口 POST /api/refunds/:id/audit，字段 approved、reason。",
    };
    const result = buildTaskFromCronJob(job, "manual");
    const draft = Array.isArray(result?.drafts) ? result.drafts[0] : null;
    const sourceDocs = String(draft?.source_documents || "");
    const checks = {
        hasDraft: !!draft,
        workflowDailyDev: draft?.workflow_type === "daily_dev",
        targetCoordinatorGroup: draft?.assign_type === "group" && draft?.target_project === "coordinator",
        requiresVerification: draft?.requires_verification === true,
        sourceDocumentsIncludePrompt: sourceDocs.includes("/api/refunds") && sourceDocs.includes("approved"),
        hasCronMeta: draft?.cron_job_id === job.id && draft?.cron_trigger === "manual",
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        source_documents_preview: sourceDocs.slice(0, 500),
    };
}
function formatCronMetaSummary(meta = {}) {
    const imported = meta?.imported_shared_docs;
    const continued = meta?.continued_gap_tasks;
    const parts = [];
    if (continued)
        parts.push(`续跑缺口任务 ${Number(continued.continued || 0)} 个`);
    if (imported)
        parts.push(`导入共享文档 ${Number(imported.imported || 0)} 个`);
    if (Array.isArray(meta?.claimed_backlogs))
        parts.push(`认领需求 ${meta.claimed_backlogs.length} 条`);
    return parts.length ? `；${parts.join("，")}` : "";
}
function syncCronTaskStatus(task, status, result = "") {
    const cronJobId = task?.cron_job_id;
    if (!cronJobId)
        return;
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === cronJobId);
    if (!job)
        return;
    const resultText = String(result || task.result || "").trim();
    const patch = {
        last_task_id: task.id || job.last_task_id || null,
        next_run: job.enabled === false ? null : (0, cron_job_store_1.computeNextRun)(job.schedule),
    };
    if (status === "in_progress") {
        patch.last_status = "running_task";
        patch.last_result = "任务已进入执行阶段";
    }
    else if (status === "done") {
        patch.last_status = "done";
        patch.last_result = resultText || "任务执行完成";
    }
    else if (status === "waiting") {
        patch.last_status = "waiting";
        patch.last_result = resultText || "任务仍在进行，等待下一步处理";
    }
    else if (status === "failed") {
        patch.last_status = "failed";
        patch.last_result = resultText || "任务执行失败";
    }
    else {
        patch.last_status = status || "queued";
        patch.last_result = resultText || patch.last_result || "";
    }
    (0, cron_job_store_1.patchCronJob)(cronJobId, patch);
    const backlogFile = task?.workflow_meta?.intake?.backlog_file;
    if (task?.group_id && backlogFile) {
        const backlogStatus = status === "done"
            ? "done"
            : status === "failed"
                ? "blocked"
                : status === "waiting"
                    ? "blocked"
                    : status === "in_progress"
                        ? "in_progress"
                        : "queued";
        (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, backlogStatus, {
            task_id: task.id,
            result: resultText || patch.last_result || status,
        });
    }
}
async function runCronJobCore(id, ctx, trigger, reliability = null) {
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === id);
    if (!job)
        throw new Error("定时任务不存在");
    if (job.archived || job.deleted_at)
        throw new Error("定时任务已归档，请先恢复后再运行");
    if (runningCronJobs.has(id)) {
        return { success: false, message: "定时任务正在触发中，请稍后再试" };
    }
    const now = new Date();
    const nextRun = (0, cron_job_store_1.computeNextRun)(job.schedule, now);
    runningCronJobs.add(id);
    (0, cron_job_store_1.patchCronJob)(id, {
        last_run: now.toISOString(),
        last_run_key: (0, cron_job_store_1.minuteKey)(now),
        last_status: "running",
        last_result: "正在创建并派发任务...",
    });
    let taskDraft = null;
    let taskDrafts = [];
    let cronMeta = {};
    let gapContinueResult = null;
    try {
        (0, cron_job_store_1.validateCronJobPayload)(job);
        const targetType = (0, cron_job_store_1.normalizeTargetType)(job);
        const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
        const shouldContinueGaps = targetType === "group" && workflowType === "daily_dev"
            && job.continue_gaps !== false
            && job.continueGaps !== false;
        if (shouldContinueGaps) {
            gapContinueResult = (0, collaboration_1.continueDailyDevTasksFromGaps)(ctx, {
                group_id: job.group_id,
                limit: Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3))),
                auto_execute: true,
                source: "cron_gap_rework",
            });
        }
        taskDraft = buildTaskFromCronJob(job, trigger);
        cronMeta = taskDraft?.meta || {};
        if (gapContinueResult) {
            cronMeta.continued_gap_tasks = {
                continued: gapContinueResult.continued || 0,
                queued: gapContinueResult.queued || 0,
                blocked: gapContinueResult.blocked || 0,
                failed: gapContinueResult.failed || 0,
                task_ids: (gapContinueResult.results || []).filter((item) => item.success).map((item) => item.task_id),
            };
        }
        taskDrafts = Array.isArray(taskDraft?.drafts)
            ? taskDraft.drafts
            : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean));
        if (reliability?.operationKey) {
            taskDrafts = taskDrafts.map((draft, index) => ({
                ...draft,
                trace_id: reliability.traceId,
                idempotency_key: `cron:${reliability.operationKey}:draft:${index}:${draft?.workflow_meta?.intake?.backlog_file || draft?.title || "task"}`,
            }));
        }
        if (taskDrafts.length === 0) {
            const continuedCount = Number(gapContinueResult?.continued || 0);
            const queuedCount = Number(gapContinueResult?.queued || 0);
            const blockedCount = Number(gapContinueResult?.blocked || 0);
            const result = continuedCount > 0
                ? `本次定时任务续跑 ${continuedCount} 个交付缺口任务，入队 ${queuedCount} 个；没有 ready 状态的新需求池文件${formatCronMetaSummary(cronMeta)}`
                : `没有 ready 状态的业务需求池文件，本次定时任务跳过且未创建空任务${formatCronMetaSummary(cronMeta)}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "continued")) : "skipped",
                last_result: result,
                last_run_meta: cronMeta,
                last_task_ids: continuedCount > 0 ? (cronMeta.continued_gap_tasks?.task_ids || []) : job.last_task_ids,
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, gap_continue_result: gapContinueResult };
        }
        const created = taskDrafts.map((draft) => {
            const { task, queueResult } = (0, collaboration_1.createAndQueueTask)(draft, ctx);
            const backlogFile = task?.workflow_meta?.intake?.backlog_file;
            if (task?.group_id && backlogFile) {
                (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, "queued", {
                    task_id: task.id,
                    result: `${queueResult?.message || "任务已创建"}：${task.title}`,
                });
            }
            return { task, queueResult, queued: !!queueResult?.queued };
        });
        const queuedCount = created.filter(item => item.queued).length;
        if (created.length > 1) {
            const status = queuedCount > 0 ? "queued" : (created.some(item => item.queueResult?.blocked) ? "waiting" : "skipped");
            const result = `批量创建 ${created.length} 个业务开发任务，已入队 ${queuedCount} 个${formatCronMetaSummary(cronMeta)}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: status,
                last_result: result,
                last_run_meta: cronMeta,
                last_task_id: created[created.length - 1]?.task?.id || null,
                last_task_ids: created.map(item => item.task.id),
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            return {
                success: true,
                queued: queuedCount > 0,
                queued_count: queuedCount,
                task_count: created.length,
                tasks: created.map(item => item.task),
                results: created,
                job: updated,
            };
        }
        const { task, queueResult, queued } = created[0];
        const status = queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped");
        const result = `${queueResult?.message || "任务已创建"}：${task.title}${formatCronMetaSummary(cronMeta)}`;
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            last_status: status,
            last_result: result,
            last_run_meta: cronMeta,
            last_task_id: task.id,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        return { success: true, queued, task, queue_result: queueResult, job: updated };
    }
    catch (e) {
        const drafts = taskDrafts.length ? taskDrafts : (Array.isArray(taskDraft?.drafts) ? taskDraft.drafts : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean)));
        for (const draft of drafts) {
            const backlogFile = draft?.workflow_meta?.intake?.backlog_file;
            if (!draft?.group_id || !backlogFile)
                continue;
            (0, collaboration_1.markDailyDevBacklogStatus)(draft.group_id, backlogFile, "ready", {
                result: `定时任务创建失败，已恢复为 ready：${e.message}`,
            });
        }
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            last_status: "failed",
            last_result: e.message,
            last_run_meta: cronMeta,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        return { success: false, error: e.message, job: updated };
    }
    finally {
        try {
            (0, cron_dev_reports_1.upsertAutoDevDailyReport)((0, cron_dev_reports_1.localDateKey)());
        }
        catch (reportError) {
            console.error("[Cron] 生成开发日报失败", reportError?.message || reportError);
        }
        runningCronJobs.delete(id);
    }
}
async function runCronJob(id, ctx, trigger) {
    if (trigger !== "schedule")
        return runCronJobCore(id, ctx, trigger);
    const operationKey = `${id}:${(0, cron_job_store_1.minuteKey)(new Date())}`;
    const operation = (0, reliability_ledger_1.acquireIdempotency)({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
    if (!operation.acquired) {
        return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
    }
    try {
        const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId });
        if (result?.success === false) {
            (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, result.error || result.message || "定时任务执行失败");
            return result;
        }
        (0, reliability_ledger_1.completeIdempotency)("cron-schedule", operationKey, {
            success: true,
            queued: !!result?.queued,
            task_id: result?.task?.id || null,
            task_ids: result?.tasks?.map((task) => task.id) || [],
            message: result?.message || result?.error || "",
        });
        return result;
    }
    catch (error) {
        (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, error);
        throw error;
    }
}
async function tickCronScheduler(ctx) {
    const now = new Date();
    const key = (0, cron_job_store_1.minuteKey)(now);
    const jobs = (0, db_1.loadCronJobs)();
    for (const rawJob of jobs) {
        if (rawJob.archived || rawJob.deleted_at)
            continue;
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (!job.enabled)
            continue;
        if (job.schedule_error) {
            if (rawJob.last_status !== "invalid_schedule" || rawJob.last_result !== job.schedule_error) {
                (0, cron_job_store_1.patchCronJob)(job.id, {
                    last_status: "invalid_schedule",
                    last_result: job.schedule_error,
                    next_run: null,
                });
            }
            continue;
        }
        if (runningCronJobs.has(job.id))
            continue;
        if (job.last_run_key === key && (0, reliability_ledger_1.getIdempotencyRecord)("cron-schedule", `${job.id}:${key}`)?.status === "completed")
            continue;
        if (!(0, cron_job_store_1.matchesCron)(job.schedule, now))
            continue;
        runCronJob(job.id, ctx, "schedule")
            .then(result => {
            if (!result.success)
                console.error("[Cron]", job.name, result.error || result.message);
        })
            .catch((e) => console.error("[Cron]", job.name, e.message));
    }
    await (0, cron_dev_reports_1.tickAutoDevReportNotifications)(now);
    try {
        runConflictResolutionMemoryMaintenanceSchedulerTick({ at: now.toISOString() });
    }
    catch (error) {
        console.error("[Cron][MemoryMaintenance]", error?.message || error);
    }
}
function startCronScheduler(ctx) {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    const tick = () => tickCronScheduler(ctx).catch((e) => console.error("[Cron]", e.message));
    tick();
    schedulerTimer = setInterval(tick, 30 * 1000);
    console.log("[Cron] 定时任务调度器已启动");
}
function stopCronScheduler() {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    schedulerTimer = null;
}
function getConflictResolutionMemoryMaintenanceSchedulerStatus() {
    const latest = latestConflictResolutionMaintenanceTick;
    const safe = !latest || (latest.destructiveActionAuthorized === false
        && Number(latest.deletedCount || 0) === 0
        && Number(latest.createdTaskCount || 0) === 0
        && Number(latest.createdApprovalReceiptCount || 0) === 0
        && (latest.rows || []).every((row) => row.destructiveActionAuthorized === false && Number(row.deletedCount || 0) === 0));
    return {
        schema: "ccm-conflict-resolution-maintenance-scheduler-status-v1",
        activeWithCronScheduler: !!schedulerTimer,
        safe,
        latest,
        policy: "scheduler_verify_dry_run_only_no_task_no_approval_no_delete",
    };
}
function schedulerStatus() {
    return {
        running: !!schedulerTimer,
        interval_ms: 30 * 1000,
        running_job_ids: Array.from(runningCronJobs),
        conflict_resolution_memory_maintenance: latestConflictResolutionMaintenanceTick || {
            schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
            status: "not_run",
            destructiveActionAuthorized: false,
            deletedCount: 0,
            createdTaskCount: 0,
            createdApprovalReceiptCount: 0,
        },
    };
}
function readJsonBody(req, onDone, onError) {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
        try {
            onDone(body ? JSON.parse(body) : {});
        }
        catch (e) {
            onError(e);
        }
    });
}
// === Cron API 路由分流 ===
function handleCronApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/cron" && req.method === "GET") {
        const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
        const onlyArchived = String(parsed.query.archived || "") === "true";
        const allJobs = (0, db_1.loadCronJobs)();
        const jobs = onlyArchived ? allJobs.filter(job => job.archived || job.deleted_at) : includeArchived ? allJobs : allJobs.filter(job => !job.archived && !job.deleted_at);
        (0, utils_1.sendJson)(res, { jobs: jobs.map(cron_job_store_1.normalizeCronJob), archived_count: allJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
        return true;
    }
    if (pathname === "/api/cron/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, schedulerStatus());
        return true;
    }
    if (pathname === "/api/cron/create" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.createCronJob)(payload);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/update" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const { id, ...updates } = payload;
                const job = (0, cron_job_store_1.updateCronJob)(id, updates);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/delete" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.deleteCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/restore" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.restoreCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/purge" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.purgeCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, id: job.id });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/bulk" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const ids = Array.from(new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id || "")).filter(Boolean)));
                const action = String(payload.action || "");
                if (!ids.length)
                    return (0, utils_1.sendJson)(res, { error: "请选择定时任务" }, 400);
                if (!["archive", "restore", "purge", "enable", "disable"].includes(action))
                    return (0, utils_1.sendJson)(res, { error: "不支持的批量操作" }, 400);
                const results = ids.map((id) => {
                    try {
                        const job = action === "archive" ? (0, cron_job_store_1.deleteCronJob)(id)
                            : action === "restore" ? (0, cron_job_store_1.restoreCronJob)(id)
                                : action === "purge" ? (0, cron_job_store_1.purgeCronJob)(id)
                                    : (0, cron_job_store_1.updateCronJob)(id, { enabled: action === "enable" });
                        return { id, success: !!job };
                    }
                    catch (error) {
                        return { id, success: false, error: error.message };
                    }
                });
                (0, utils_1.sendJson)(res, { success: results.every((item) => item.success), results }, results.some((item) => item.success) ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/run" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            runCronJob(payload.id, ctx, "manual")
                .then((result) => {
                const status = result.success ? 200 : 400;
                (0, utils_1.sendJson)(res, result, status);
            })
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
        const today = String(parsed.query.date || (0, cron_dev_reports_1.localDateKey)());
        const report = (0, cron_dev_reports_1.upsertAutoDevDailyReport)(today);
        const reports = (0, db_1.loadDevReports)().slice(0, 30);
        const jobs = (0, db_1.loadCronJobs)().map(cron_job_store_1.normalizeCronJob).filter((job) => job.workflow_type === "daily_dev");
        (0, utils_1.sendJson)(res, {
            success: true,
            scheduler: schedulerStatus(),
            today: report,
            reports,
            weekly_reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20),
            notification: (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)()),
            daily_dev_jobs: jobs,
            backlog: report.backlog,
        });
        return true;
    }
    if (pathname === "/api/auto-dev/reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(120, Number(parsed.query.limit || 30)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(80, Number(parsed.query.limit || 20)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevWeeklyReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const report = (0, cron_dev_reports_1.upsertAutoDevWeeklyReport)(payload.date || (0, cron_dev_reports_1.localDateKey)());
                (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)()) });
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
                const config = (0, cron_dev_reports_1.saveNormalizedNotifyConfig)({
                    ...current,
                    daily_enabled: payload.daily_enabled === true,
                    daily_time: payload.daily_time ?? current.daily_time,
                    weekly_enabled: payload.weekly_enabled === true,
                    weekly_day: payload.weekly_day ?? current.weekly_day,
                    weekly_time: payload.weekly_time ?? current.weekly_time,
                    retry_limit: payload.retry_limit ?? current.retry_limit,
                    retry_interval_minutes: payload.retry_interval_minutes ?? current.retry_interval_minutes,
                    target_type: "user",
                    target_id: "",
                });
                (0, utils_1.sendJson)(res, { success: true, config });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/send" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const kind = payload.kind === "weekly" ? "weekly" : "daily";
            (0, cron_dev_reports_1.dispatchAutoDevReport)(kind, { date: payload.date || (0, cron_dev_reports_1.localDateKey)() })
                .then(result => (0, utils_1.sendJson)(res, result, result.success ? 200 : 400))
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const report = (0, cron_dev_reports_1.upsertAutoDevDailyReport)(payload.date || (0, cron_dev_reports_1.localDateKey)());
                (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevReports)().slice(0, 30) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=cron.js.map