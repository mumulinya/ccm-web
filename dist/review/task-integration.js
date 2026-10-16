"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newTaskReviewPolicy = newTaskReviewPolicy;
exports.startTaskCodeReviewBaseline = startTaskCodeReviewBaseline;
exports.runTaskCodeReview = runTaskCodeReview;
exports.codeReviewRepairGaps = codeReviewRepairGaps;
exports.reviewTaskWithRepair = reviewTaskWithRepair;
exports.reviewGroupTask = reviewGroupTask;
exports.validateTaskCodeReview = validateTaskCodeReview;
const db_1 = require("../core/db");
const settings_1 = require("./settings");
const dispatch_profile_1 = require("../agents/dispatch-profile");
const snapshot_1 = require("./snapshot");
const service_1 = require("./service");
const store_1 = require("./store");
const findings_1 = require("./findings");
const snapshot_2 = require("./snapshot");
function newTaskReviewPolicy(task) { return (0, settings_1.freezeReviewPolicy)((0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task).profile); }
function startTaskCodeReviewBaseline(task, project, root) {
    if (!task.code_review_policy)
        return; // Historical tasks keep their original policy.
    if (!(0, settings_1.validateReviewPolicy)(task.code_review_policy))
        throw new Error('任务代码审核策略损坏');
    (0, snapshot_1.captureReviewBaseline)(task, project, root);
    const current = (0, db_1.loadTasks)().find(t => t.id === task.id);
    if (current && !(current.code_review_baseline_projects || []).includes(project))
        update(task.id, { code_review_baseline_projects: [...(current.code_review_baseline_projects || []), project] });
}
function update(taskId, updates) { return require('../modules/collaboration/collaboration-task-service').updateTask(taskId, updates); }
async function runTaskCodeReview(taskId, project, root, options = {}) {
    const task = (0, db_1.loadTasks)().find(t => t.id === taskId);
    if (!task?.code_review_policy)
        return null;
    if (['done', 'completed', 'cancelled'].includes(task.status))
        throw new Error('任务已结束，不能启动审核');
    const subject = await (0, snapshot_1.taskReviewSubject)(task, project, root, options.workItemId || '');
    const job = (0, service_1.createReviewJob)(subject, task.code_review_policy, options.requestKey || '');
    update(taskId, { status: 'reviewing', acceptance_state: 'code_review_running', status_detail: 'ReviewAgent 正在调用 ocr 并核对代码', code_review_summary: (0, store_1.publicReviewJob)(job), code_review_job_ids: [...new Set([...(task.code_review_job_ids || []), job.id])] });
    const controller = new AbortController();
    const timer = setInterval(() => {
        const current = (0, db_1.loadTasks)().find(t => t.id === taskId);
        if (!current || current.status === 'cancelled' || current.is_paused) {
            controller.abort();
            const active = require('./store').readReviewJob(job.id);
            if (active && ['queued', 'running', 'recovery_required'].includes(active.status)) {
                try {
                    (0, service_1.cancelReviewJob)(active.id, active.revision);
                }
                catch { }
            }
        }
    }, 1000);
    let completed;
    try {
        completed = await (0, service_1.awaitReviewJob)(job.id, controller.signal);
    }
    finally {
        clearInterval(timer);
    }
    update(taskId, { code_review_summary: (0, store_1.publicReviewJob)(completed), acceptance_state: (0, findings_1.reviewCanProceed)(completed) ? 'code_review_passed' : 'code_review_blocked', status_detail: (0, findings_1.reviewCanProceed)(completed) ? '代码审核通过，继续功能验收' : completed.error || '代码审核发现问题，等待修复或人工核对' });
    return completed;
}
function codeReviewRepairGaps(job) {
    const blocking = job.findings.filter(f => (0, findings_1.blockingFinding)(f, job.policy));
    if (job.status !== 'completed' || job.conclusion !== 'blocked' || !blocking.length || blocking.some(f => f.state !== 'confirmed'))
        return [];
    return blocking.map(f => `${f.id} ${f.path}:${f.startLine} ${f.title}；触发：${f.trigger}；影响：${f.impact}；修复建议：${f.suggestion}`);
}
async function reviewTaskWithRepair(input) {
    while (true) {
        const job = await runTaskCodeReview(input.taskId, input.project, input.root, { workItemId: input.workItemId });
        if (!job || (0, findings_1.reviewCanProceed)(job))
            return job;
        const gaps = codeReviewRepairGaps(job);
        if (gaps.length && input.repair) {
            const task = (0, db_1.loadTasks)().find(t => t.id === input.taskId);
            const evidence = require('../modules/collaboration/dispatch-rework-evidence').captureDispatchReworkEvidenceSync(task, input.root);
            const reservation = require('../modules/collaboration/dispatch-rework-reservation').reservePersistentAutomaticRework(input.taskId, gaps.map(g => g.split('；')[0]), evidence);
            if (reservation.allowed) {
                update(input.taskId, { status: 'reworking', acceptance_state: 'code_review_reworking' });
                await input.repair(Number(reservation.task.rework_round), gaps);
                continue;
            }
        }
        update(input.taskId, { status: 'blocked', acceptance_state: 'code_review_blocked', status_detail: job.error || '代码审核未通过，需核对审核问题' });
        throw Object.assign(new Error(job.error || '代码审核未通过'), { code: 'CCM_CODE_REVIEW_BLOCKED', reviewJobId: job.id });
    }
}
async function reviewGroupTask(input, repair) {
    const task = (0, db_1.loadTasks)().find(t => t.id === input.taskId);
    if (!task?.code_review_policy)
        return;
    const items = task.plan_dispatch_contract?.workItems?.length ? task.plan_dispatch_contract.workItems : task.work_items || [];
    const projects = [...new Set([...(task.code_review_baseline_projects || []), ...items.map((w) => w.project || w.projectId).filter(Boolean)])];
    for (const project of [...new Set(projects)]) {
        const registered = (0, snapshot_2.registeredReviewWorkspace)(project, input.configs);
        const root = require('../agents/dispatch-acceptance-workspace').resolveDispatchAcceptanceWorkspace(task.id, project, registered, task.group_id);
        await reviewTaskWithRepair({ taskId: task.id, project, root, repair: (_round, gaps) => repair(project, gaps) });
    }
}
function validateTaskCodeReview(task, updates = {}) {
    const original = task.code_review_policy;
    if (updates.code_review_policy !== undefined && original && (0, settings_1.reviewHash)(updates.code_review_policy) !== (0, settings_1.reviewHash)(original))
        return '任务代码审核策略不可直接替换';
    if (!original)
        return null;
    if (!(0, settings_1.validateReviewPolicy)(original))
        return '任务代码审核策略无效';
    if (!['done', 'completed'].includes(String(updates.status || '')) || ['done', 'completed'].includes(task.status))
        return null;
    const jobs = (0, store_1.listReviewJobs)(task.id).filter(j => j.subject.attemptId === String(task.attempt_id || task.attemptId || task.execution_attempt || 1) && j.subject.generation === Number(task.generation || 1));
    if (!jobs.length)
        return original.required || task.code_review_baseline_projects?.length ? '当前任务代码审核证据缺失' : null;
    const projects = new Set(jobs.map(j => j.subject.project));
    for (const project of projects) {
        const job = jobs.find(j => j.subject.project === project);
        if (!job || job.policy.checksum !== original.checksum || job.subject.planChecksum !== (0, snapshot_1.reviewPlanFingerprint)(task) || !(0, findings_1.reviewCanProceed)(job) || !(0, snapshot_1.taskReviewSubjectIsCurrent)(job.subject))
            return '代码审核未通过、已过期或身份不符';
    }
    const expected = [...(task.code_review_baseline_projects || []), ...(task.plan_dispatch_contract?.workItems || task.work_items || []).map((w) => w.project || w.projectId).filter(Boolean)];
    if (expected.some((p) => !projects.has(p)))
        return '存在尚未完成代码审核的项目';
    return null;
}
//# sourceMappingURL=task-integration.js.map