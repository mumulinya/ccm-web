"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitReviewSettings = commitReviewSettings;
exports.preCommitReview = preCommitReview;
exports.verifyCommittedReview = verifyCommittedReview;
const settings_1 = require("./settings");
const service_1 = require("./service");
const snapshot_1 = require("./snapshot");
const git_workspace_runtime_1 = require("../modules/tools/git-workspace-runtime");
function commitReviewSettings() {
    const settings = (0, settings_1.loadReviewSettings)();
    return { enabled: settings.enabled, mode: settings.commitMode, localChecks: true, model: settings.enabled ? settings.model.model : '', requiresReview: settings.enabled && settings.commitMode !== 'off', budget: { timeoutMs: settings.timeoutMs, maxCalls: settings.maxCalls, ocrTokenBudget: settings.ocrTokenBudget } };
}
async function preCommitReview(input) {
    const policy = (0, settings_1.freezeReviewPolicy)('commit');
    if (input.allFiles) {
        const tracked = (await (0, git_workspace_runtime_1.runGitCommand)(input.root, ['diff', '--name-only', '-z', 'HEAD'])).stdout;
        const untracked = (await (0, git_workspace_runtime_1.runGitCommand)(input.root, ['ls-files', '--others', '--exclude-standard', '-z'])).stdout;
        input.files = [...new Set((tracked + untracked).split('\0').filter(Boolean))];
    }
    if (input.body.review_job_id)
        return (0, service_1.assertReviewForCommit)(input.body.review_job_id, input.project, input.files, input.before.checksum, policy);
    if (policy.required)
        throw Object.assign(new Error('请先在提交预览中运行 ReviewAgent 审核'), { code: 'code_review_required' });
    // Local checks still run for old clients and while AI review is disabled.
    const subject = await (0, snapshot_1.gitReviewSubject)(input.project, input.root, input.files, input.before.checksum);
    const job = await (0, service_1.awaitReviewJob)((0, service_1.createReviewJob)(subject, policy).id);
    return (0, service_1.assertReviewForCommit)(job.id, input.project, input.files, input.before.checksum, policy);
}
async function verifyCommittedReview(job, root, committed) {
    if (committed.noop)
        return false;
    const paths = (await (0, git_workspace_runtime_1.runGitCommand)(root, ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', committed.fullHash])).stdout.split('\0').filter(Boolean);
    const expected = new Set(job.subject.files.map(f => f.path));
    if (paths.length !== expected.size || paths.some(p => !expected.has(p)))
        return true;
    for (const f of job.subject.files) {
        if (f.after === null)
            continue;
        const result = await (0, git_workspace_runtime_1.runGitCommand)(root, ['rev-parse', `${committed.fullHash}:${f.path}`]);
        if (!f.afterBlobHash || result.stdout.trim() !== f.afterBlobHash)
            return true;
    }
    return false;
}
//# sourceMappingURL=git-integration.js.map