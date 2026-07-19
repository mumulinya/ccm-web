"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWatchdogGapReworkCandidate = isWatchdogGapReworkCandidate;
exports.hasFreshSuccessfulAgentProbe = hasFreshSuccessfulAgentProbe;
exports.getTaskWatchdogStatus = getTaskWatchdogStatus;
exports.runTaskWatchdog = runTaskWatchdog;
exports.cleanupRuntimeDebt = cleanupRuntimeDebt;
exports.getAgentRecoveryWorkSummary = getAgentRecoveryWorkSummary;
exports.getAgentRecoveryProbePayload = getAgentRecoveryProbePayload;
exports.taskMatchesAgentProbeTarget = taskMatchesAgentProbeTarget;
exports.buildAgentRecoveryProbeGroups = buildAgentRecoveryProbeGroups;
exports.getAgentRecoveryProbeGroups = getAgentRecoveryProbeGroups;
exports.aggregateBlockedRecovery = aggregateBlockedRecovery;
exports.aggregateRuntimeRecovery = aggregateRuntimeRecovery;
exports.recoverAgentExecutionBlockedTasks = recoverAgentExecutionBlockedTasks;
exports.runAgentRecoveryMonitorOnce = runAgentRecoveryMonitorOnce;
exports.startAgentRecoveryMonitor = startAgentRecoveryMonitor;
exports.stopAgentRecoveryMonitor = stopAgentRecoveryMonitor;
exports.startTaskWatchdog = startTaskWatchdog;
exports.stopTaskWatchdog = stopTaskWatchdog;
exports.applyRuntimeMonitorControl = applyRuntimeMonitorControl;
exports.createDiagnosticCheck = createDiagnosticCheck;
exports.getGroupMainAgentActionRegistry = getGroupMainAgentActionRegistry;
exports.runGroupMainAgentActionRegistrySelfTest = runGroupMainAgentActionRegistrySelfTest;
exports.normalizeMainAgentActionIds = normalizeMainAgentActionIds;
exports.buildMainAgentPermissionJudgement = buildMainAgentPermissionJudgement;
exports.buildGroupMainAgentInternalLoop = buildGroupMainAgentInternalLoop;
exports.mainAgentPlanStepStatus = mainAgentPlanStepStatus;
exports.buildUserVisiblePlanStep = buildUserVisiblePlanStep;
exports.buildMainAgentPlanVerificationReminder = buildMainAgentPlanVerificationReminder;
const db_1 = require("../../core/db");
const logs_1 = require("./logs");
const execution_kernel_1 = require("../../agents/execution-kernel");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const collaboration_runtime_coordinator_review_part_01_1 = require("./collaboration-runtime-coordinator-review-part-01");
function isWatchdogGapReworkCandidate(task, now = Date.now(), cooldownMs = collaboration_runtime_task_queue_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, maxCount = collaboration_runtime_task_queue_1.TASK_WATCHDOG_GAP_REWORK_MAX) {
    if (!task?.auto_execute || task.status === "done" || (0, collaboration_runtime_task_queue_1.isTaskPaused)(task) || collaboration_runtime_task_queue_1.runningTaskIds.has(task.id) || (0, collaboration_runtime_coordinator_review_part_01_1.isTaskQueuedInMemory)(task.id))
        return false;
    if (!(0, collaboration_runtime_runtime_tools_1.hasDailyDevContinuationGaps)(task))
        return false;
    if (!(0, collaboration_runtime_runtime_tools_1.canAutoContinueTaskGaps)(task))
        return false;
    if (Number(task.auto_gap_continue_count || 0) >= maxCount)
        return false;
    return (0, collaboration_runtime_coordinator_review_part_01_1.getTaskAgeMs)(task, now) >= cooldownMs;
}
function hasFreshSuccessfulAgentProbe(readiness) {
    return require("./collaboration-agent-probes").hasFreshSuccessfulAgentProbe(readiness);
}
function getTaskWatchdogStatus(staleMs = collaboration_runtime_task_queue_1.TASK_WATCHDOG_STALE_MS, gapCooldownMs = collaboration_runtime_task_queue_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = collaboration_runtime_task_queue_1.TASK_WATCHDOG_GAP_REWORK_MAX, taskSnapshot) {
    return require("./collaboration-task-runtime").getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount, taskSnapshot);
}
function runTaskWatchdog(ctx, options = {}) {
    return require("./collaboration-task-runtime").runTaskWatchdog(ctx, options);
}
function cleanupRuntimeDebt(options = {}) {
    const dryRun = options.dry_run === true || options.dryRun === true;
    const includePending = options.include_pending !== false && options.includePending !== false;
    const includeInProgress = options.include_in_progress !== false && options.includeInProgress !== false;
    const status = getTaskWatchdogStatus(Number(options.stale_ms || options.staleMs || collaboration_runtime_task_queue_1.TASK_WATCHDOG_STALE_MS));
    const candidates = [
        ...(includePending ? status.stale_pending.map((item) => ({ ...item, debt_type: "stale_pending" })) : []),
        ...(includeInProgress ? status.stalled_in_progress.map((item) => ({ ...item, debt_type: "stalled_in_progress" })) : []),
    ];
    const results = [];
    for (const item of candidates) {
        const task = (0, db_1.loadTasks)().find((entry) => entry.id === item.id);
        if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived")
            continue;
        const detail = item.debt_type === "stalled_in_progress"
            ? "运行治理中心清理：任务长时间处于执行中但没有活跃运行，已暂停等待用户处理"
            : "运行治理中心清理：任务长时间待执行但未入队，已暂停等待用户处理";
        if (!dryRun) {
            const removedFromQueue = (0, collaboration_runtime_runtime_tools_1.removeTaskFromQueues)(task.id);
            (0, reliability_ledger_1.releaseTaskLease)(task.id, "runtime_debt_cleanup");
            (0, execution_kernel_1.clearTaskCancellation)(task.id);
            const updated = (0, collaboration_runtime_runtime_tools_1.updateTask)(task.id, {
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
            (0, logs_1.addTaskLog)(task.id, "warning", detail);
            (0, logs_1.appendTaskTimelineEvent)(task.id, { type: "runtime_debt_cleanup", title: "运行债务已暂停", detail, status: "warn", phase: "needs_user", data: { debt_type: item.debt_type, removed_from_queue: removedFromQueue } });
            results.push({ task_id: task.id, debt_type: item.debt_type, cleaned: true, removed_from_queue: removedFromQueue, status: updated?.status || "needs_user" });
        }
        else {
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
    const tasks = (0, db_1.loadTasks)();
    const blockedPending = tasks
        .filter(collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)
        .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        target_key: (0, collaboration_runtime_coordinator_review_part_01_1.getTaskTargetKeyFromTask)(task),
        blocked_at: task.last_queue_blocked_at || null,
        status_detail: String(task.status_detail || "").slice(0, 300),
    }));
    const runtimeFailed = tasks
        .filter(collaboration_runtime_task_queue_1.isRecoverableRuntimeFailure)
        .map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        target_key: (0, collaboration_runtime_coordinator_review_part_01_1.getTaskTargetKeyFromTask)(task),
        retry_count: Number(task.retry_count || 0),
        reason: (0, collaboration_runtime_task_queue_1.getTaskFailureText)(task).slice(0, 300),
    }));
    return {
        blocked_pending: blockedPending,
        runtime_failed: runtimeFailed,
        total: blockedPending.length + runtimeFailed.length,
    };
}
function getAgentRecoveryProbePayload(target = {}) {
    const normalized = (0, collaboration_runtime_plan_tools_1.normalizeAgentProbeTarget)(target);
    const payload = {};
    if (normalized.groupId)
        payload.group_id = normalized.groupId;
    if (normalized.project)
        payload.target_member = normalized.project;
    return payload;
}
function taskMatchesAgentProbeTarget(task, target = null) {
    return require("./collaboration-agent-probes").taskMatchesAgentProbeTarget(task, target);
}
function buildAgentRecoveryProbeGroups(tasks) {
    return require("./collaboration-task-runtime").buildAgentRecoveryProbeGroups(tasks);
}
function getAgentRecoveryProbeGroups(taskSnapshot) {
    const tasks = (Array.isArray(taskSnapshot) ? taskSnapshot : (0, db_1.loadTasks)()).filter((task) => (0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task) || (0, collaboration_runtime_task_queue_1.isRecoverableRuntimeFailure)(task));
    return buildAgentRecoveryProbeGroups(tasks);
}
function aggregateBlockedRecovery(results) {
    const flattened = results.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
    return {
        total_blocked: results.reduce((sum, item) => sum + Number(item?.total_blocked || 0), 0),
        recovered: results.reduce((sum, item) => sum + Number(item?.recovered || 0), 0),
        results: flattened,
    };
}
function aggregateRuntimeRecovery(results) {
    const flattened = results.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
    return {
        success: true,
        total_recoverable: results.reduce((sum, item) => sum + Number(item?.total_recoverable || 0), 0),
        retried: results.reduce((sum, item) => sum + Number(item?.retried || 0), 0),
        queued: results.reduce((sum, item) => sum + Number(item?.queued || 0), 0),
        auto_execute: results.some((item) => item?.auto_execute !== false),
        results: flattened,
        queue_status: (0, collaboration_runtime_coordinator_review_part_01_1.getQueueStatus)(),
    };
}
function recoverAgentExecutionBlockedTasks(ctx, reason = "执行通道恢复后自动重新入队", options = {}) {
    const probeTarget = options.probeTarget || options.probe_target || null;
    const candidates = (Array.isArray(options.taskSnapshot) ? options.taskSnapshot : (0, db_1.loadTasks)())
        .filter(collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)
        .filter((task) => taskMatchesAgentProbeTarget(task, probeTarget));
    const results = [];
    for (const task of candidates) {
        const readiness = (0, collaboration_runtime_plan_tools_1.getTaskAgentExecutionReadiness)(task);
        if (!readiness.ready) {
            results.push({ task_id: task.id, queued: false, skipped: true, reason: "task_readiness_not_satisfied", message: readiness.message, readiness });
            continue;
        }
        (0, collaboration_runtime_runtime_tools_1.updateTask)(task.id, {
            status: "pending",
            status_detail: reason,
            execution_readiness: null,
            recovered_after_agent_probe_at: new Date().toISOString(),
        });
        (0, logs_1.addTaskLog)(task.id, "info", reason);
        results.push({ task_id: task.id, ...(0, collaboration_runtime_coordinator_review_part_01_1.enqueueTask)(task.id, ctx) });
    }
    return {
        total_blocked: candidates.length,
        recovered: results.filter(item => item.queued).length,
        results,
    };
}
function runAgentRecoveryMonitorOnce(ctx, options = {}) {
    return require("./collaboration-task-runtime").runAgentRecoveryMonitorOnce(ctx, options);
}
function startAgentRecoveryMonitor(ctx) {
    return require("./collaboration-task-runtime").startAgentRecoveryMonitor(ctx);
}
function stopAgentRecoveryMonitor() {
    return require("./collaboration-task-runtime").stopAgentRecoveryMonitor();
}
function startTaskWatchdog(ctx) {
    return require("./collaboration-task-runtime").startTaskWatchdog(ctx);
}
function stopTaskWatchdog() {
    return require("./collaboration-task-runtime").stopTaskWatchdog();
}
function getRuntimeMonitorControlStatus() {
    return {
        task_watchdog_active: !!collaboration_runtime_task_queue_1.taskWatchdogTimer,
        agent_recovery_monitor_active: !!collaboration_runtime_task_queue_1.agentRecoveryMonitorTimer,
        agent_recovery_probe_in_flight: collaboration_runtime_task_queue_1.agentRecoveryProbeInFlight,
    };
}
function applyRuntimeMonitorControl(action, ctx) {
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
function createDiagnosticCheck(id, label, status, message, detail = undefined) {
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
        id: "restore_task_context",
        label: "恢复任务上下文",
        category: "context",
        risk: "read",
        permissionMode: "auto_on_recovery",
        userVisible: true,
        backend: ["buildTaskPreflightReasoning", "recordReasoningRecoveryCheck", "resumeTaskQueues", "reopenTaskAgentSessions"],
        evidence: ["recovery_checks", "task_recovery", "work_items", "session_state"],
        description: "服务重启、执行器重试或用户继续旧任务时，重新灌回原始目标、未完成 Todo、执行队列和可恢复会话。",
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
        label: "读取子 Agent 结果说明",
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
];
function getGroupMainAgentActionRegistry() {
    return GROUP_MAIN_AGENT_ACTIONS.map(action => ({ ...action, backend: [...action.backend], evidence: [...action.evidence] }));
}
function buildGroupMainAgentActionContext() {
    return [
        "【CCM 群聊主 Agent 可用动作注册表】",
        "原则：先理解和观察，再决定是否行动；只读动作可自动执行，写入/治理动作必须有当前用户消息授权或显式按钮操作。",
        ...GROUP_MAIN_AGENT_ACTIONS.map(action => `- ${action.id}｜${action.label}｜类别=${action.category}｜风险=${action.risk}｜权限=${action.permissionMode}｜证据=${action.evidence.join("、")}`),
    ].join("\n");
}
function runGroupMainAgentActionRegistrySelfTest() {
    const required = [
        "read_group_context",
        "read_project_code_snapshot",
        "query_knowledge_base",
        "inspect_task_status",
        "restore_task_context",
        "create_project_task",
        "dispatch_child_agent",
        "ask_user_clarification",
        "govern_task_lifecycle",
        "read_child_agent_receipts",
        "replan_from_observation",
        "generate_final_reply",
    ];
    const registry = getGroupMainAgentActionRegistry();
    const ids = new Set(registry.map(action => action.id));
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
function getGroupMainAgentAction(id) {
    return getGroupMainAgentActionRegistry().find(action => action.id === id) || null;
}
function normalizeMainAgentActionIds(ids) {
    return require("./collaboration-task-card").normalizeMainAgentActionIds.apply(null, arguments);
}
function buildMainAgentPermissionJudgement(actionIds, input = {}) {
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
function loopStageStatus(stage, input) {
    return require("./collaboration-task-card").loopStageStatus.apply(null, arguments);
}
function buildGroupMainAgentInternalLoop(input) {
    return require("./collaboration-task-card").buildGroupMainAgentInternalLoop.apply(null, arguments);
}
function mainAgentPlanStepStatus(actionIds, blockedActions, actionId, fallback = "pending") {
    if (blockedActions.includes(actionId))
        return "needs_confirmation";
    return actionIds.includes(actionId) ? "completed" : fallback;
}
function buildUserVisiblePlanStep(input) {
    return require("./collaboration-task-card").buildUserVisiblePlanStep.apply(null, arguments);
}
function planStepHasVerificationSignal(step) {
    return require("./collaboration-task-card").planStepHasVerificationSignal.apply(null, arguments);
}
function summaryHasExecutedVerification(summary = {}) {
    return require("./collaboration-task-card").summaryHasExecutedVerification.apply(null, arguments);
}
function buildMainAgentPlanVerificationReminder(input) {
    return require("./collaboration-task-card").buildMainAgentPlanVerificationReminder.apply(null, arguments);
}
//# sourceMappingURL=collaboration-runtime-coordinator-review-part-02.js.map