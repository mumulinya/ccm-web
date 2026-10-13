"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigationTargets = void 0;
exports.navigationResultNeedsRefresh = navigationResultNeedsRefresh;
exports.enqueueNavigation = enqueueNavigation;
exports.recoverNavigationJobs = recoverNavigationJobs;
exports.runNextScopeNavigation = runNextScopeNavigation;
exports.recordNavigationCompletion = recordNavigationCompletion;
exports.stopNavigationValidationJobs = stopNavigationValidationJobs;
const crypto_1 = require("crypto");
const cache_validation_budget_1 = require("./cache-validation-budget");
const scope_navigation_execution_1 = require("./scope-navigation-execution");
const scope_navigation_contract_1 = require("./scope-navigation-contract");
const alive = (pid) => { try {
    process.kill(pid, 0);
    return true;
}
catch (error) {
    return error.code !== 'ESRCH';
} };
const navigationTargets = (store, job) => store.documents.filter((row) => row.active &&
    (job.kind === 'project' ? row.kind === 'project' && row.projectId === job.projectId : row.groupId === job.groupId));
exports.navigationTargets = navigationTargets;
function navigationResultNeedsRefresh(row, documentValid, config) {
    if (row.generationOutcome === 'failed')
        return false;
    if (!row.generation)
        return false;
    if (!documentValid())
        return true;
    if (!row.generatedInputDigest)
        return false; // 旧文档不能被追认满足新合同。
    const snapshot = { scope: row.kind === 'project' ? 'project' : 'group', scopeId: row.kind === 'project' ? row.projectId : row.groupId, contractVersion: scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT };
    return row.generationContractVersion !== scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT
        || row.generationIdentity !== (0, scope_navigation_contract_1.navigationDigest)((0, scope_navigation_contract_1.scopeNavigationRequestOptions)(config, snapshot).providerContextCache.sessionId);
}
const valid = (store, job) => { const rows = (0, exports.navigationTargets)(store, job); return rows.length > 0 && rows.every((row) => row.inputChecksum === job.inputChecksum); };
function enqueueNavigation(store, input) {
    const existing = store.jobs.find((job) => job.kind === input.kind && job.projectId === input.projectId && job.groupId === input.groupId && job.inputChecksum === input.inputChecksum);
    if (existing) {
        if (input.force) {
            existing.force = true;
            existing.triggerSource = 'manual';
        }
        return existing;
    }
    const binding = (0, cache_validation_budget_1.currentCacheValidationBinding)();
    const run = binding && (0, cache_validation_budget_1.readCacheValidationRun)(binding.validationId);
    const job = { ...input, key: `nav_${(0, crypto_1.randomUUID)()}`, contractVersion: scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT,
        triggerSource: input.force ? 'manual' : 'automatic', attempts: 0, availableAt: Date.now(), queuedAt: new Date().toISOString(),
        ...(run ? { validationId: run.id, trace_id: run.trace_id } : {}) };
    store.jobs.push(job);
    return job;
}
function record(store, job, outcome, reason) {
    store.generationEvidence ||= [];
    store.generationEvidence.push({ taskId: job.key, kind: job.kind, scopeId: job.projectId || job.groupId,
        contractVersion: job.contractVersion, inputDigest: job.inputDigest, executionIdentity: job.executionIdentity,
        triggerSource: job.triggerSource || 'legacy', validationId: job.validationId, trace_id: job.trace_id,
        requestIds: job.requestIds || [], receipts: job.receipts || [], outcome, reason,
        queuedAt: job.queuedAt, finishedAt: new Date().toISOString(), contentStored: false });
    store.generationEvidence = store.generationEvidence.slice(-2000);
}
function recoverNavigationJobs(store) {
    for (const job of [...store.jobs]) {
        if (!valid(store, job)) {
            record(store, job, 'superseded');
            store.jobs = store.jobs.filter((row) => row.key !== job.key);
            continue;
        }
        if (!job.leasedAt)
            continue;
        // 新进程启动不能抢走仍存活的执行者；无旧合同发送证据时也保守地停止。
        if (job.leasePid && alive(job.leasePid) && Date.now() - job.leasedAt <= 5 * 60_000)
            continue;
        if (job.dispatchedAt || !job.leaseToken) {
            record(store, job, 'unknown', 'process_lost_after_dispatch');
            for (const row of (0, exports.navigationTargets)(store, job)) {
                row.status = 'failed';
                row.failure = '生成请求结果未知，请核对后主动重新生成';
                row.generationOutcome = 'unknown';
            }
            store.jobs = store.jobs.filter((row) => row.key !== job.key);
        }
        else {
            delete job.leasedAt;
            delete job.leasePid;
            delete job.leaseToken;
        }
    }
}
const staleError = () => Object.assign(new Error('认知生成任务已过期'), { code: 'CCM_SCOPE_NAVIGATION_SUPERSEDED' });
async function runNextScopeNavigation(runtime, selectedKey) {
    const job = runtime.transaction(store => {
        recoverNavigationJobs(store);
        const row = store.jobs.find((item) => (!selectedKey || item.key === selectedKey) && item.availableAt <= Date.now() && !item.leasedAt);
        if (!row)
            return null;
        row.contractVersion = scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT;
        row.leaseToken = (0, crypto_1.randomUUID)();
        row.leasePid = process.pid;
        row.leasedAt = Date.now();
        row.targetRevisions = (0, exports.navigationTargets)(store, row).map((item) => ({ id: item.documentId, revision: item.revision }));
        for (const target of (0, exports.navigationTargets)(store, row))
            target.status = 'generating';
        return { ...row };
    });
    if (!job)
        return { outcome: 'idle' };
    const operation = async () => {
        let prepared;
        let configuration;
        const identityOf = (config, data) => (0, scope_navigation_contract_1.navigationDigest)((0, scope_navigation_contract_1.scopeNavigationRequestOptions)(config, data.snapshot).providerContextCache.sessionId);
        const update = (fn) => runtime.transaction(store => {
            const saved = store.jobs.find((item) => item.key === job.key && item.leaseToken === job.leaseToken);
            if (!saved || !valid(store, saved) || (0, exports.navigationTargets)(store, saved).length !== job.targetRevisions.length
                || job.targetRevisions.some((target) => !(0, exports.navigationTargets)(store, saved).some((row) => row.documentId === target.id && row.revision === target.revision)))
                throw staleError();
            return fn(store, saved);
        });
        try {
            prepared = runtime.prepare(job);
            configuration = runtime.config();
            if (prepared.inputChecksum && prepared.inputChecksum !== job.inputChecksum)
                throw staleError();
            job.inputDigest = prepared.snapshot.inputDigest;
            job.executionIdentity = identityOf(configuration, prepared);
            const reused = update((store, saved) => {
                Object.assign(saved, { inputDigest: job.inputDigest, executionIdentity: job.executionIdentity });
                const rows = (0, exports.navigationTargets)(store, saved);
                if (saved.force || !rows.every((row) => row.generatedInputDigest === job.inputDigest && row.generationContractVersion === scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT
                    && row.generationIdentity === job.executionIdentity && runtime.documentValid(row)))
                    return false;
                for (const row of rows) {
                    row.status = 'ready';
                    row.refreshReasons = [];
                    row.lastCheckedAt = new Date().toISOString();
                    row.generationOutcome = 'local_reuse';
                    row.generationTaskId = job.key;
                    row.generationTriggerSource = job.triggerSource;
                    if (prepared.fingerprint) {
                        row.readyFingerprint = row.currentFingerprint = prepared.fingerprint;
                        row.inputChecksum = prepared.inputChecksum;
                    }
                }
                record(store, saved, 'local_reuse');
                store.jobs = store.jobs.filter((item) => item.key !== job.key);
                return true;
            });
            if (reused)
                return { outcome: 'local_reuse', taskId: job.key };
            const beforeSend = () => {
                const current = runtime.prepare(job);
                if (current.inputChecksum && current.inputChecksum !== prepared.inputChecksum
                    || current.snapshot.inputDigest !== job.inputDigest || current.snapshot.prompt !== prepared.snapshot.prompt
                    || identityOf(runtime.config(), current) !== job.executionIdentity)
                    throw staleError();
                update((_store, saved) => { saved.leasedAt = Date.now(); });
            };
            const output = await (0, scope_navigation_execution_1.withScopeNavigationExecution)({ beforeSend,
                dispatched: permit => update((_store, saved) => {
                    saved.dispatchedAt ||= new Date().toISOString();
                    saved.requestIds ||= [];
                    saved.requestIds.push(permit.requestId);
                    job.dispatchedAt = saved.dispatchedAt;
                    job.requestIds = [...saved.requestIds];
                }),
                completed: receipt => runtime.transaction(store => {
                    const saved = store.jobs.find((item) => item.key === job.key && item.leaseToken === job.leaseToken);
                    if (!saved)
                        return;
                    saved.receipts ||= [];
                    saved.receipts.push({ requestId: receipt.requestId, status: receipt.status, protocol: receipt.protocol,
                        cacheFields: receipt.cacheFieldEvidence, cacheFieldOmissionReason: receipt.cacheFieldOmissionReason,
                        breakpointOmissionReason: receipt.breakpointOmissionReason, comparison: receipt.wireReuseEvidence?.comparison,
                        cacheReported: receipt.cache_usage_reported, readTokens: receipt.cacheReadInputTokens, inputTokens: receipt.totalInputTokens, contentStored: false });
                    job.receipts = [...saved.receipts];
                }) }, () => runtime.send(prepared, job, configuration));
            beforeSend(); // 提交前检查当前真实资料与配置；不申请发送额度。
            update((_store, saved) => { Object.assign(job, saved); });
            runtime.commit(job, { ...output, inputDigest: job.inputDigest, executionIdentity: job.executionIdentity });
            return { outcome: 'model', taskId: job.key, requestIds: job.requestIds };
        }
        catch (error) {
            if (error.code === 'CCM_SCOPE_NAVIGATION_SUPERSEDED') {
                runtime.transaction(store => {
                    const saved = store.jobs.find((item) => item.key === job.key);
                    if (saved) {
                        record(store, saved, 'superseded', 'input_or_target_changed');
                        store.jobs = store.jobs.filter((item) => item.key !== job.key);
                        for (const target of (0, exports.navigationTargets)(store, saved))
                            if (target.inputChecksum === saved.inputChecksum && target.status === 'generating')
                                target.status = target.generation ? 'stale' : 'queued';
                    }
                });
                return { outcome: 'superseded', taskId: job.key };
            }
            if ((0, cache_validation_budget_1.isCacheValidationControlError)(error)) {
                runtime.transaction(store => {
                    const saved = store.jobs.find((item) => item.key === job.key);
                    if (!saved)
                        return;
                    if (saved.dispatchedAt || error.code !== 'CCM_CACHE_VALIDATION_BACKGROUND_DEFERRED') {
                        record(store, saved, 'stopped', error.code);
                        store.jobs = store.jobs.filter((item) => item.key !== saved.key);
                        for (const row of (0, exports.navigationTargets)(store, saved)) {
                            row.status = 'failed';
                            row.failure = error.code;
                        }
                        return;
                    }
                    delete saved.leasedAt;
                    delete saved.leasePid;
                    delete saved.leaseToken;
                    for (const row of (0, exports.navigationTargets)(store, saved))
                        if (row.status === 'generating')
                            row.status = 'queued';
                });
            }
            else
                runtime.fail(job, error);
            throw error;
        }
    };
    return job.validationId ? (0, cache_validation_budget_1.withCacheValidationBinding)(job.validationId, operation) : operation();
}
function recordNavigationCompletion(store, job, outcome, reason) { record(store, job, outcome, reason); }
function stopNavigationValidationJobs(store, validationId, reason) {
    const jobs = store.jobs.filter((job) => job.validationId === validationId);
    for (const job of jobs) {
        if (job.leasePid && alive(job.leasePid))
            throw new Error('验证派生任务仍在运行');
        record(store, job, job.dispatchedAt ? 'unknown' : 'stopped', reason);
        for (const row of (0, exports.navigationTargets)(store, job).filter((row) => row.inputChecksum === job.inputChecksum)) {
            row.status = 'failed';
            row.failure = reason;
            if (job.dispatchedAt)
                row.generationOutcome = 'unknown';
        }
    }
    store.jobs = store.jobs.filter((job) => job.validationId !== validationId);
    return jobs.length;
}
//# sourceMappingURL=scope-navigation-runtime.js.map