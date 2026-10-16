"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewJob = createReviewJob;
exports.pumpReviews = pumpReviews;
exports.cancelReviewJob = cancelReviewJob;
exports.decideReviewFinding = decideReviewFinding;
exports.attestReviewArtifacts = attestReviewArtifacts;
exports.awaitReviewJob = awaitReviewJob;
exports.assertReviewForCommit = assertReviewForCommit;
exports.controlReviewRun = controlReviewRun;
exports.reconcileReviewRuns = reconcileReviewRuns;
exports.startReviewRecovery = startReviewRecovery;
const agent_run_store_1 = require("../agents/agent-run-store");
const store_1 = require("./store");
const settings_1 = require("./settings");
const review_agent_1 = require("./review-agent");
const findings_1 = require("./findings");
const snapshot_1 = require("./snapshot");
const unified_evidence_registry_1 = require("../system/unified-evidence-registry");
const controllers = new Map();
let pumping = false;
function publishReviewEvidence(job) {
    (0, unified_evidence_registry_1.recordEvidence)({ evidenceType: 'review', taskId: job.subject.taskId, workItemId: job.subject.workItemId,
        scope: 'review_agent', scopeId: job.subject.project, exactSessionId: job.subject.exactSessionId || job.id, generation: job.subject.generation,
        operationFingerprint: job.subject.checksum, sourceChecksum: (0, settings_1.reviewHash)([job.coverage, job.findings]), producerAgentId: 'review-agent',
        subject: '代码审核', references: [job.id], status: job.conclusion === 'passed' || job.conclusion === 'not_required' ? 'valid' : 'invalid', summary: `代码审核：${job.conclusion}`, contentStored: false });
}
function createReviewJob(subject, policy, requestKey = '') {
    if (!(0, settings_1.validateReviewPolicy)(policy))
        throw new Error('审核策略快照无效');
    const at = new Date().toISOString(), id = (0, store_1.newReviewId)();
    const key = (0, settings_1.reviewHash)([subject.kind, subject.taskId, subject.project, subject.workItemId, subject.attemptId, subject.checksum, policy.checksum, requestKey]);
    // Rechecks keep unresolved findings, never interpret absence as a fix.
    const previous = (0, store_1.listReviewJobs)(subject.taskId || undefined, subject.project).find(j => j.subject.kind === subject.kind && j.subject.taskId === subject.taskId && j.subject.workItemId === subject.workItemId
        && j.subject.generation === subject.generation && j.subject.attemptId === subject.attemptId
        && (subject.kind !== 'git' || (0, settings_1.reviewHash)(j.subject.requestedFiles) === (0, settings_1.reviewHash)(subject.requestedFiles)));
    const findings = (previous?.findings || []).map(f => {
        const fresh = previous?.policy.checksum === policy.checksum && f.decision?.subjectChecksum === subject.checksum;
        return { ...f, state: (fresh ? f.state : f.state === 'resolved' ? 'resolved' : 'awaiting_recheck'), decision: fresh ? f.decision : undefined };
    });
    const result = (0, store_1.ensureReviewJob)({ id, runId: '', revision: 1, key, policy, subject, status: 'queued', stage: 'queued', findings,
        coverage: [], conclusion: 'pending', error: '', ownerPid: 0, leaseUntil: 0, createdAt: at, updatedAt: at, elapsedMs: 0, usage: [], history: [] });
    if (!result.created && subject.targetDir !== result.job.subject.targetDir)
        require('./maintenance').removeUnusedReviewSubject(subject);
    void pumpReviews().catch(() => { });
    return result.job;
}
async function pumpReviews() {
    if (pumping)
        return;
    pumping = true;
    const owner = `review:${process.pid}`;
    try {
        if (!(0, store_1.acquireReviewLock)('global-review-execution', owner))
            return;
        const renew = setInterval(() => (0, store_1.acquireReviewLock)('global-review-execution', owner), 10000);
        renew.unref();
        try {
            for (let candidate of (0, store_1.queuedReviewJobs)()) {
                if (candidate.status === 'running' && candidate.leaseUntil < Date.now()) {
                    const run = candidate.runId && (0, agent_run_store_1.getAgentRun)(candidate.runId);
                    if (run && Date.parse(run.leaseExpiresAt || '') > Date.now())
                        continue;
                    // A restart rechecks unchanged immutable input, preserving this job ID and prior work.
                    candidate = (0, store_1.updateReviewJob)(candidate.id, j => { j.status = 'queued'; j.stage = 'recovery'; j.coverage = j.coverage.filter(c => ['ocr', 'semgrep', 'osv'].includes(c.tool) && ['complete', 'skipped'].includes(c.status)); j.history.push({ type: 'recovered', at: new Date().toISOString() }); });
                }
                if (candidate.status === 'queued')
                    await executeJob(candidate);
            }
        }
        finally {
            clearInterval(renew);
            (0, store_1.releaseReviewLock)('global-review-execution', owner);
        }
    }
    finally {
        pumping = false;
    }
}
async function executeJob(input) {
    const owner = `review:${process.pid}:${input.id}`;
    const controller = new AbortController();
    controllers.set(input.id, controller);
    let job = input;
    const started = Date.now();
    const timer = setTimeout(() => controller.abort(), job.policy.settings.timeoutMs);
    const heartbeat = setInterval(() => { try {
        (0, store_1.updateReviewJob)(job.id, j => { if (j.status === 'running')
            j.leaseUntil = Date.now() + 30000; });
        if (job.runId)
            (0, agent_run_store_1.heartbeatAgentRunLease)(job.runId, owner, '', 30000);
    }
    catch { } }, 10000);
    heartbeat.unref();
    try {
        if (job.policy.resources && (0, settings_1.reviewHash)((0, settings_1.reviewResourceFingerprints)(job.policy.settings)) !== (0, settings_1.reviewHash)(job.policy.resources))
            throw new Error('审核程序、可信规则或离线数据库已变化，需要重新创建审核');
        if (!await (0, snapshot_1.reviewSubjectIsCurrent)(job.subject))
            throw new Error('审核输入已过期，需要刷新或重审');
        const run = (0, agent_run_store_1.createAgentRun)({ traceId: job.subject.traceId, taskId: job.subject.taskId, attemptId: job.subject.attemptId,
            scope: 'review_agent', scopeId: job.subject.project, agentId: 'review-agent', runtimeId: 'review-agent',
            workspacePath: job.subject.targetDir, source: 'code-review', executionId: job.id, idempotencyKey: `review:${job.id}` });
        job.runId = run.run.runId;
        const lease = (0, agent_run_store_1.claimAgentRunLease)(job.runId, owner, 30000);
        if (!lease.acquired)
            throw new Error('审核执行租约被占用');
        let currentRun = lease.run;
        if (['running', 'starting', 'recovering'].includes(currentRun?.status) && input.stage === 'recovery') {
            (0, agent_run_store_1.transitionAgentRun)(job.runId, 'recovery_required', '恢复中断审核的只读执行');
            currentRun = (0, agent_run_store_1.getAgentRun)(job.runId);
        }
        if (currentRun?.status === 'created' || currentRun?.status === 'leased' || currentRun?.status === 'queued')
            (0, agent_run_store_1.transitionAgentRun)(job.runId, 'starting', 'ReviewAgent 启动');
        if (currentRun?.status === 'recovery_required')
            (0, agent_run_store_1.transitionAgentRun)(job.runId, 'recovering', '恢复同一审核');
        (0, agent_run_store_1.transitionAgentRun)(job.runId, 'running', 'ReviewAgent 正在独立审核');
        job = (0, store_1.updateReviewJob)(job.id, j => { j.runId = job.runId; j.status = 'running'; j.ownerPid = process.pid; j.leaseUntil = Date.now() + 30000; j.credentialsCleared = false; });
        const event = (stage, value) => {
            if ((0, store_1.readReviewJob)(job.id)?.status === 'cancelled') {
                controller.abort();
                throw new Error('审核已取消');
            }
            value.stage = stage;
            (0, store_1.updateReviewJob)(job.id, j => { Object.assign(j, { stage, findings: value.findings, coverage: value.coverage, usage: value.usage }); });
            (0, agent_run_store_1.appendAgentRunEvent)(job.runId, { eventType: `review.${stage}`, message: `代码审核：${stage}`, payload: { coverageCount: value.coverage.length, findingCount: value.findings.length, contentStored: false } });
        };
        await (0, review_agent_1.executeReviewAgent)(job, controller.signal, event);
        if (controller.signal.aborted)
            throw new Error('审核已取消或超时');
        if (!await (0, snapshot_1.reviewSubjectIsCurrent)(job.subject))
            throw new Error('审核期间代码已变化，结果不能用于交付');
        if (job.policy.resources && (0, settings_1.reviewHash)((0, settings_1.reviewResourceFingerprints)(job.policy.settings)) !== (0, settings_1.reviewHash)(job.policy.resources))
            throw new Error('审核期间规则或扫描资源已变化，结果已失效');
        job.conclusion = (0, findings_1.evaluateReviewJob)(job);
        publishReviewEvidence(job);
        (0, store_1.updateReviewJob)(job.id, j => { j.findings = job.findings; j.coverage = job.coverage; j.usage = job.usage; j.status = 'completed'; j.conclusion = job.conclusion; j.stage = 'completed'; j.elapsedMs = Date.now() - started; j.leaseUntil = 0; });
        (0, agent_run_store_1.transitionAgentRun)(job.runId, 'succeeded', 'ReviewAgent 已返回审核结论', { result: { reviewJobId: job.id, conclusion: job.conclusion, contentStored: false } });
    }
    catch (error) {
        const current = (0, store_1.readReviewJob)(job.id);
        if (current && !['cancelled', 'completed'].includes(current.status))
            (0, store_1.updateReviewJob)(job.id, j => { j.status = 'failed'; j.stage = 'failed'; j.error = (0, findings_1.safeReviewText)(error.message); j.conclusion = 'incomplete'; j.elapsedMs = Date.now() - started; j.leaseUntil = 0; });
        if (job.runId) {
            try {
                (0, agent_run_store_1.transitionAgentRun)(job.runId, current?.status === 'cancelled' ? 'cancelled' : 'failed', '审核未完成', { error: { code: 'review_incomplete' } });
            }
            catch { }
        }
    }
    finally {
        clearTimeout(timer);
        clearInterval(heartbeat);
        controllers.delete(job.id);
        if (job.runId)
            (0, agent_run_store_1.releaseAgentRunLease)(job.runId, owner);
    }
}
function cancelReviewJob(id, revision) {
    const job = (0, store_1.updateReviewJob)(id, j => { if (!['queued', 'running', 'recovery_required'].includes(j.status))
        throw new Error('审核已结束'); j.status = 'cancelled'; j.stage = 'cancelled'; j.conclusion = 'incomplete'; }, revision);
    controllers.get(id)?.abort();
    return job;
}
function decideReviewFinding(id, findingId, revision, actor, input) {
    const job = (0, store_1.updateReviewJob)(id, job => {
        if (job.status !== 'completed')
            throw new Error('审核尚未结束，不能修改问题决定');
        const f = job.findings.find(r => r.id === findingId);
        if (!f)
            throw new Error('问题不存在');
        if (!['confirmed', 'false_positive', 'waived'].includes(input.state) || typeof input.reason !== 'string' || input.reason.trim().length < 5)
            throw new Error('请填写至少五个字的核对或豁免理由');
        if (['scope', 'secret'].includes(f.category) && input.state === 'waived')
            throw new Error('禁止范围和真实密钥泄露不能直接豁免');
        if ((['critical', 'unknown'].includes(f.severity) || ['security', 'test_integrity', 'secret', 'scope'].includes(f.category) || job.policy.level === 'strict') && actor.role !== 'admin')
            throw Object.assign(new Error('该问题需要管理员核对'), { status: 403 });
        f.state = input.state;
        f.decision = { actor: actor.userId, role: actor.role, reason: (0, findings_1.safeReviewText)(input.reason), at: new Date().toISOString(), subjectChecksum: job.subject.checksum };
        if (input.state === 'false_positive')
            (0, store_1.saveRuleDraft)({ id: `draft_${job.id}_${f.id}`, status: 'draft', project: job.subject.project, findingId: f.id,
                pattern: f.path, instruction: `审核该位置时核对以下已确认上下文，不得据此永久忽略风险：${f.decision.reason}`, reason: f.decision.reason, createdAt: f.decision.at, createdBy: actor.userId });
        job.history.push({ type: input.state, findingId, reason: f.decision.reason, at: f.decision.at });
        job.conclusion = (0, findings_1.evaluateReviewJob)(job);
    }, revision);
    publishReviewEvidence(job);
    return job;
}
/** A signed manual check supplements non-text artifacts only. It cannot waive
 * a missing model, failed scanner, uncovered text or an unresolved defect. */
function attestReviewArtifacts(id, revision, actor, reason) {
    if (actor.role !== 'admin')
        throw Object.assign(new Error('非文本文件检查需要管理员确认'), { status: 403 });
    if (typeof reason !== 'string' || reason.trim().length < 5)
        throw new Error('请填写至少五个字的人工检查依据');
    const job = (0, store_1.updateReviewJob)(id, job => {
        const coverage = job.coverage.find(c => c.tool === 'source' && c.status === 'partial');
        if (job.status !== 'completed' || !coverage || coverage.skipped.some(s => !job.subject.files.find(f => f.path === s.path)?.binary))
            throw new Error('此审核不支持非文本证据补充');
        coverage.status = 'complete';
        coverage.completed = coverage.skipped.map(s => s.path);
        coverage.reason = `人工检查：${(0, findings_1.safeReviewText)(reason)}`;
        job.history.push({ type: `artifacts_attested:${actor.userId}`, reason: (0, findings_1.safeReviewText)(reason), at: new Date().toISOString() });
        job.conclusion = (0, findings_1.evaluateReviewJob)(job);
    }, revision);
    publishReviewEvidence(job);
    return job;
}
async function awaitReviewJob(id, signal) {
    while (true) {
        if (signal?.aborted)
            throw new Error('审核等待已取消');
        const job = (0, store_1.readReviewJob)(id);
        if (!job)
            throw new Error('审核不存在');
        if (!['queued', 'running', 'recovery_required'].includes(job.status))
            return job;
        void pumpReviews();
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}
async function assertReviewForCommit(id, project, files, workspaceChecksum, currentPolicy) {
    const job = (0, store_1.readReviewJob)(id);
    if (!job || job.subject.kind !== 'git' || job.subject.project !== project || job.subject.workspaceChecksum !== workspaceChecksum
        || job.policy.checksum !== currentPolicy.checksum || (0, settings_1.reviewHash)([...(job.subject.requestedFiles || job.subject.files.map(f => f.path))].sort()) !== (0, settings_1.reviewHash)([...new Set(files)].sort()))
        throw Object.assign(new Error('有效提交审核缺失或提交范围已变化'), { status: 409, code: 'code_review_required' });
    if (!(0, findings_1.reviewCanProceed)(job) || !await (0, snapshot_1.reviewSubjectIsCurrent)(job.subject))
        throw Object.assign(new Error('代码审核未通过或已失效，请返回审核面板'), { status: 409, code: 'code_review_blocked', review: (0, store_1.publicReviewJob)(job) });
    return job;
}
/** Generic runtime controls must not turn this read-only run into a developer. */
function controlReviewRun(runId, action) {
    const job = (0, store_1.listReviewJobs)().find(j => j.runId === runId);
    if (!job)
        throw new Error('审核记录缺失');
    if (action !== 'cancel')
        throw new Error('ReviewAgent 使用审核面板恢复或复审，不能通过开发 Agent 重试或重新分配');
    if (['queued', 'running', 'recovery_required'].includes(job.status))
        cancelReviewJob(job.id, job.revision);
    return { run: (0, agent_run_store_1.getAgentRun)(runId), review: (0, store_1.publicReviewJob)((0, store_1.readReviewJob)(job.id)) };
}
function reconcileReviewRuns() {
    for (const job of (0, store_1.listReviewJobs)()) {
        const run = job.runId && (0, agent_run_store_1.getAgentRun)(job.runId);
        if (!run || !['completed', 'failed', 'cancelled'].includes(job.status) || ['succeeded', 'failed', 'cancelled'].includes(run.status))
            continue;
        if (Date.parse(run.leaseExpiresAt || '') > Date.now())
            continue;
        try {
            if (!['running', 'recovering'].includes(run.status)) {
                (0, agent_run_store_1.transitionAgentRun)(run.runId, 'recovery_required', '核对已持久化审核结论');
                (0, agent_run_store_1.transitionAgentRun)(run.runId, 'recovering', '恢复审核收口');
            }
            (0, agent_run_store_1.transitionAgentRun)(run.runId, job.status === 'completed' ? 'succeeded' : job.status, '按持久化审核记录恢复收口', { result: { reviewJobId: job.id, conclusion: job.conclusion, contentStored: false } });
        }
        catch { }
    }
}
function startReviewRecovery() {
    const tick = () => { reconcileReviewRuns(); try {
        require('./maintenance').eraseExpiredReviewCredentials();
    }
    catch { } void pumpReviews().catch(() => { }); };
    const timer = setInterval(tick, 15000);
    timer.unref();
    tick();
    try {
        require('./maintenance').pruneStandaloneCodeReviews();
    }
    catch { }
    return () => clearInterval(timer);
}
//# sourceMappingURL=service.js.map