"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleQueuedTaskReview = handleQueuedTaskReview;
const db_1 = require("../core/db");
const task_integration_1 = require("./task-integration");
const findings_1 = require("./findings");
function handleQueuedTaskReview(task, job, result, root) {
    if ((0, findings_1.reviewCanProceed)(job))
        return null;
    const update = require('../modules/collaboration/collaboration-task-service').updateTask;
    const current = (0, db_1.loadTasks)().find(t => t.id === task.id) || task, gaps = (0, task_integration_1.codeReviewRepairGaps)(job);
    if (gaps.length) {
        const evidence = require('../modules/collaboration/dispatch-rework-evidence').captureDispatchReworkEvidenceSync(current, root);
        const reservation = require('../modules/collaboration/dispatch-rework-reservation').reservePersistentAutomaticRework(task.id, gaps.map(g => g.split('；')[0]), evidence);
        if (reservation.allowed) {
            update(task.id, { status: 'pending', acceptance_state: 'code_review_reworking', status_detail: '代码审核确认缺陷，原开发 Agent 将按问题返工',
                workflow_meta: { ...(current.workflow_meta || {}), project_test_rework: { round: reservation.task.rework_round, instruction: gaps.join('\n'), created_at: new Date().toISOString() } } });
            return { ...result, status: 'waiting', requeue: true, detail: 'ReviewAgent 发现确定缺陷，已生成原工作项返工要求', codeReview: job.id };
        }
    }
    update(task.id, { status: 'blocked', acceptance_state: 'code_review_blocked', status_detail: job.error || '代码审核未通过，等待人工核对' });
    return { ...result, status: 'blocked', requeue: false, detail: job.error || '代码审核未通过', codeReview: job.id };
}
//# sourceMappingURL=task-queue-review.js.map