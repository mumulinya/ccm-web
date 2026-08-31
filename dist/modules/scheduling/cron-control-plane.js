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
exports.cronPrincipal = cronPrincipal;
exports.cronTarget = cronTarget;
exports.cronTargetAccess = cronTargetAccess;
exports.canViewCronJob = canViewCronJob;
exports.canManageCronJob = canManageCronJob;
exports.assertCronTargetAccess = assertCronTargetAccess;
exports.assertCronManage = assertCronManage;
exports.assertCronTemplateAccess = assertCronTemplateAccess;
exports.cronExecutionAuthorization = cronExecutionAuthorization;
exports.resolveCronTemplate = resolveCronTemplate;
exports.previewCronSchedule = previewCronSchedule;
exports.activeCronRuns = activeCronRuns;
exports.resolveCronOverlap = resolveCronOverlap;
exports.missedCronOccurrences = missedCronOccurrences;
exports.latestMissedCronOccurrence = latestMissedCronOccurrence;
exports.occurrenceSlot = occurrenceSlot;
exports.cronFailureDecision = cronFailureDecision;
exports.cronSuccessPatch = cronSuccessPatch;
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const local_auth_1 = require("../system/local-auth");
const access_policy_1 = require("../system/access-policy");
const task_templates_1 = require("../collaboration/task-templates");
const cron_job_store_1 = require("./cron-job-store");
function cronPrincipal(req) {
    const auth = req?.ccmAuth || {};
    return { userId: String(auth.userId || auth.user_id || "system"), role: String(auth.role || "admin"), admin: auth.role === "admin" || auth.kind !== "browser" };
}
function cronTarget(job) {
    const type = (0, cron_job_store_1.normalizeTargetType)(job) === "group" ? "group" : "project";
    return { type: type, id: String(type === "group" ? job.group_id || job.groupId : job.project || "").trim() };
}
function cronTargetAccess(userId, role, job, level = "use") {
    const target = cronTarget(job);
    return !!target.id && (0, access_policy_1.hasResourceAccess)(userId, role, target.type, target.id, level);
}
function canViewCronJob(req, job) {
    const actor = cronPrincipal(req);
    if (actor.admin)
        return true;
    const owner = String(job.owner_id || job.ownerId || "legacy-system");
    return (owner === actor.userId && cronTargetAccess(actor.userId, actor.role, job, "use"))
        || (owner === "legacy-system" && cronTargetAccess(actor.userId, actor.role, job, "manage"));
}
function canManageCronJob(req, job) {
    const actor = cronPrincipal(req);
    if (actor.admin)
        return true;
    const owner = String(job.owner_id || job.ownerId || "legacy-system");
    return (owner === actor.userId && cronTargetAccess(actor.userId, actor.role, job, "use"))
        || (owner === "legacy-system" && cronTargetAccess(actor.userId, actor.role, job, "manage"));
}
function assertCronTargetAccess(req, job, level = "use") {
    const actor = cronPrincipal(req);
    if (actor.admin)
        return;
    if (!cronTargetAccess(actor.userId, actor.role, job, level)) {
        const error = new Error("当前账户没有目标项目或群聊的定时任务权限");
        error.status = 403;
        error.code = "RESOURCE_ACCESS_DENIED";
        throw error;
    }
}
function assertCronManage(req, job) {
    if (canManageCronJob(req, job))
        return;
    const error = new Error("只能管理自己创建的定时任务");
    error.status = 403;
    error.code = "CRON_OWNER_REQUIRED";
    throw error;
}
function assertCronTemplateAccess(req, job) {
    const templateId = String(job.task_template_id || job.taskTemplateId || "").trim();
    if (!templateId)
        return;
    const template = (0, task_templates_1.getTaskTemplate)(templateId);
    const actor = cronPrincipal(req);
    if (!template || (!actor.admin && template.createdBy !== actor.userId)) {
        const error = new Error("定时任务使用的任务模板不存在或无权访问");
        error.status = 403;
        error.code = "TASK_TEMPLATE_UNAVAILABLE";
        throw error;
    }
}
function cronExecutionAuthorization(job) {
    const ownerId = String(job.owner_id || job.ownerId || "legacy-system");
    if (ownerId === "legacy-system")
        return { allowed: true, ownerId, role: "system", legacy: true };
    const owner = (0, local_auth_1.listActiveLocalAuthUsers)().find(user => user.id === ownerId);
    if (!owner)
        return { allowed: false, ownerId, role: "user", reason: "定时任务所有者已停用或不存在" };
    if (owner.role === "admin")
        return { allowed: true, ownerId, role: owner.role };
    if (!(0, access_policy_1.hasFeatureAccess)(owner.id, owner.role, "schedule_ops"))
        return { allowed: false, ownerId, role: owner.role, reason: "定时任务功能权限已撤销" };
    if (!cronTargetAccess(owner.id, owner.role, job, "use"))
        return { allowed: false, ownerId, role: owner.role, reason: "定时任务目标权限已撤销" };
    return { allowed: true, ownerId, role: owner.role };
}
function resolveCronTemplate(job) {
    const templateId = String(job.task_template_id || job.taskTemplateId || "").trim();
    if (!templateId)
        return { template: null, rendered: null, title: String(job.name || ""), instructions: String(job.prompt || "") };
    const template = (0, task_templates_1.getTaskTemplate)(templateId);
    if (!template)
        throw new Error("定时任务使用的任务模板已不存在");
    const rendered = (0, task_templates_1.renderTaskTemplate)(template, job.template_variables || job.templateVariables || {});
    if (!rendered.valid)
        throw new Error(`定时任务缺少模板变量：${rendered.missing.join("、")}`);
    return { template, rendered, title: rendered.title, instructions: rendered.instructions };
}
function previewCronSchedule(job, count = 5, from = new Date()) {
    const normalized = (0, cron_job_store_1.normalizeCronJob)(job);
    const times = [];
    let cursor = new Date(from);
    for (let index = 0; index < Math.max(1, Math.min(20, count)); index += 1) {
        const next = (0, cron_job_store_1.computeNextRun)(normalized.schedule, cursor, normalized.timezone);
        if (!next)
            break;
        times.push(next);
        cursor = new Date(next);
    }
    const template = resolveCronTemplate(job);
    return {
        schema: "ccm-cron-preview-v1",
        valid: !normalized.schedule_error,
        scheduleError: normalized.schedule_error || "",
        timezone: normalized.timezone,
        nextRuns: times,
        renderedTask: { title: template.title, instructions: template.instructions, templateId: template.template?.id || "", templateRevision: template.template?.revision || null },
        policies: { overlap: normalized.overlap_policy, misfire: normalized.misfire_policy, catchUpLimit: normalized.catch_up_limit, consecutiveFailureLimit: normalized.consecutive_failure_limit },
        contentStored: false,
    };
}
const ACTIVE = new Set(["triggering", "running", "queued", "running_task", "waiting", "retry_waiting"]);
function activeCronRuns(job) {
    const tasks = (0, db_1.loadTasks)();
    return ((0, cron_job_store_1.normalizeCronJob)(job).run_history || []).filter((run) => {
        if (!ACTIVE.has(String(run.status || "")))
            return false;
        if (!(run.task_ids || []).length)
            return ["triggering", "running"].includes(String(run.status || ""));
        return (run.task_ids || []).some((id) => {
            const task = tasks.find((item) => String(item.id) === String(id));
            return task && !["done", "completed", "failed", "cancelled", "skipped"].includes(String(task.status || ""));
        });
    });
}
function projectWorktreeGate(job, activeRuns) {
    const target = cronTarget(job);
    if (target.type !== "project")
        return { allowed: false, reason: "群聊多项目任务不能直接声明安全并行" };
    const config = (0, db_1.getConfigs)().find((item) => String(item.name || "") === target.id);
    let info = null;
    try {
        info = config ? (0, db_1.getConfigInfo)(config.path)?.[0] : null;
    }
    catch { }
    const workDir = String(info?.workDir || info?.work_dir || "");
    if (!workDir || !fs.existsSync(workDir))
        return { allowed: false, reason: "项目路径不可用" };
    const probe = (0, child_process_1.spawnSync)("git", ["-C", workDir, "worktree", "list", "--porcelain"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
    if (probe.status !== 0)
        return { allowed: false, reason: "仓库不支持可验证的Git worktree" };
    const tasks = (0, db_1.loadTasks)();
    const previousTasks = activeRuns.flatMap(run => run.task_ids || []).map(id => tasks.find((task) => String(task.id) === String(id))).filter(Boolean);
    if (previousTasks.some((task) => task.queue_scope !== "isolated_parallel" && task.execution_workspace?.mode !== "worktree")) {
        return { allowed: false, reason: "上一轮没有在隔离工作区执行" };
    }
    return { allowed: true, reason: "Git worktree与上一轮隔离证据有效" };
}
function resolveCronOverlap(job) {
    const activeRuns = activeCronRuns(job);
    if (!activeRuns.length)
        return { action: "proceed", activeRuns, dependencyTaskIds: [], parallelSafe: false };
    const policy = (0, cron_job_store_1.normalizeCronJob)(job).overlap_policy;
    const dependencyTaskIds = [...new Set(activeRuns.flatMap((run) => run.task_ids || []).map(String).filter(Boolean))];
    if (policy === "skip")
        return { action: "skip", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "上一轮尚未完成，已按并发策略跳过" };
    if (policy === "cancel_previous") {
        const tasks = (0, db_1.loadTasks)().filter((task) => dependencyTaskIds.includes(String(task.id)));
        const unsafe = tasks.some((task) => task.recovery_required === true || task.side_effect_uncertain === true || task.execution_state === "recovery_required");
        return unsafe
            ? { action: "needs_user", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "上一轮存在不确定副作用，不能自动取消" }
            : { action: "cancel_previous", activeRuns, dependencyTaskIds, parallelSafe: false };
    }
    if (policy === "parallel_safe") {
        const gate = projectWorktreeGate(job, activeRuns);
        if (gate.allowed)
            return { action: "proceed", activeRuns, dependencyTaskIds: [], parallelSafe: true, reason: gate.reason };
        return { action: "queue", activeRuns, dependencyTaskIds, parallelSafe: false, reason: `${gate.reason}，已回退排队` };
    }
    return { action: "queue", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "等待上一轮任务完成" };
}
function missedCronOccurrences(job, now = new Date()) {
    const normalized = (0, cron_job_store_1.normalizeCronJob)(job);
    const start = String(job.next_run || normalized.next_run || "");
    if (!start || Date.parse(start) > now.getTime())
        return [];
    const rows = [];
    let cursor = new Date(start);
    const hardLimit = Math.max(1, Math.min(20, normalized.catch_up_limit || 5));
    while (cursor.getTime() <= now.getTime() && rows.length < hardLimit) {
        rows.push(cursor.toISOString());
        const next = (0, cron_job_store_1.computeNextRun)(normalized.schedule, cursor, normalized.timezone);
        if (!next || Date.parse(next) <= cursor.getTime())
            break;
        cursor = new Date(next);
    }
    return rows;
}
function latestMissedCronOccurrence(job, now = new Date()) {
    const normalized = (0, cron_job_store_1.normalizeCronJob)(job);
    const start = String(job.next_run || normalized.next_run || "");
    if (!start || Date.parse(start) > now.getTime())
        return "";
    let latest = start;
    let cursor = new Date(start);
    for (let index = 0; index < 10080; index += 1) {
        const next = (0, cron_job_store_1.computeNextRun)(normalized.schedule, cursor, normalized.timezone);
        if (!next || Date.parse(next) > now.getTime() || Date.parse(next) <= cursor.getTime())
            break;
        latest = next;
        cursor = new Date(next);
    }
    return latest;
}
function occurrenceSlot(job, scheduledFor) {
    const normalized = (0, cron_job_store_1.normalizeCronJob)(job);
    return (0, cron_job_store_1.minuteKey)(new Date(scheduledFor), normalized.timezone);
}
function cronFailureDecision(job) {
    const normalized = (0, cron_job_store_1.normalizeCronJob)(job);
    const consecutiveFailures = Number(normalized.consecutive_failures || 0) + 1;
    const paused = consecutiveFailures >= Number(normalized.consecutive_failure_limit || 3);
    return {
        consecutiveFailures,
        paused,
        patch: paused
            ? { consecutive_failures: consecutiveFailures, enabled: false, next_run: null, paused_reason: `连续失败 ${consecutiveFailures} 次，已自动暂停`, last_status: "paused_failure" }
            : { consecutive_failures: consecutiveFailures },
    };
}
function cronSuccessPatch() {
    return { consecutive_failures: 0, paused_reason: "" };
}
//# sourceMappingURL=cron-control-plane.js.map