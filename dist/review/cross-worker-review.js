"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCrossWorker = reviewCrossWorker;
const db_1 = require("../core/db");
const task_integration_1 = require("./task-integration");
const dispatch_acceptance_workspace_1 = require("../agents/dispatch-acceptance-workspace");
/** Review a worker before its receipt can unlock dependent workers. Repairs
 * use the same mention/worker/session path as the original assignment. */
async function reviewCrossWorker(input) {
    const { env, mention } = input, deps = env.deps;
    const task = (0, db_1.loadTasks)().find(t => t.id === env.taskId);
    const project = typeof mention === 'string' ? mention.replace(/^@/, '') : mention.targetName;
    if (!task?.code_review_policy || !project || mention?.verificationOnly || deps.isCoordinatorTestAgentName(project))
        return input.outputs;
    if (!deps.getAgentDependencyStateFromOutputs(project, input.outputs)?.ok)
        return input.outputs;
    const runtime = deps.resolveMemberRuntime(project, env.group, env.configs);
    let outputs = input.outputs;
    try {
        const root = (0, dispatch_acceptance_workspace_1.resolveDispatchAcceptanceWorkspace)(task.id, project, runtime.workDir, task.group_id);
        await (0, task_integration_1.reviewTaskWithRepair)({ taskId: task.id, project, root, repair: async (_round, gaps) => {
                const message = `ReviewAgent 已确认以下问题，请在原工作项中逐项修复：\n${gaps.join('\n')}`;
                outputs = await input.execute({ ...(typeof mention === 'string' ? { targetName: project, mention } : mention), message, task: message,
                    rework: true, continuationOf: project, continuationStrategy: 'reuse_native_session' });
                if (!deps.getAgentDependencyStateFromOutputs(project, outputs)?.ok)
                    throw new Error('原开发 Agent 未提交成功返工回执');
            } });
        return outputs;
    }
    catch (error) {
        const summary = error.message || '代码审核未通过';
        if (!['cancelled', 'done', 'completed'].includes((0, db_1.loadTasks)().find(t => t.id === task.id)?.status))
            deps.updateTask(task.id, { status: 'blocked', acceptance_state: 'code_review_blocked', status_detail: summary });
        const receipt = { agent: project, status: 'blocked', summary, actions: [], filesChanged: [], verification: [], blockers: [summary], needs: ['修复审核问题或人工核对后复审'] };
        deps.updateTaskWorkItemFromReceipt(task.id, project, receipt, null, summary);
        return [deps.formatCollectedAgentOutput(project, summary, receipt)];
    }
}
//# sourceMappingURL=cross-worker-review.js.map