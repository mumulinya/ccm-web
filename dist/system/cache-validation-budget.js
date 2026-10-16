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
exports.currentCacheValidationBinding = currentCacheValidationBinding;
exports.withCacheValidationBinding = withCacheValidationBinding;
exports.isCacheValidationControlError = isCacheValidationControlError;
exports.createCacheValidationRun = createCacheValidationRun;
exports.readCacheValidationRun = readCacheValidationRun;
exports.updateCacheValidationMetadata = updateCacheValidationMetadata;
exports.mutateCacheValidationMetadata = mutateCacheValidationMetadata;
exports.activeCacheValidationRun = activeCacheValidationRun;
exports.cacheValidationForSession = cacheValidationForSession;
exports.renewCacheValidationRun = renewCacheValidationRun;
exports.claimCacheValidationRecovery = claimCacheValidationRecovery;
exports.resumeCacheValidationRun = resumeCacheValidationRun;
exports.finishCacheValidationRun = finishCacheValidationRun;
exports.cacheValidationBackgroundDeferred = cacheValidationBackgroundDeferred;
exports.waitForCacheValidationBackground = waitForCacheValidationBackground;
exports.reserveCacheValidationRequest = reserveCacheValidationRequest;
exports.completeCacheValidationRequest = completeCacheValidationRequest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const async_hooks_1 = require("async_hooks");
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const ROOT = path.join(utils_1.CCM_DIR, 'reliability', 'cache-validation');
const FILE = path.join(ROOT, 'state.json');
const LEASE_MS = 45 * 60_000;
const caller = new async_hooks_1.AsyncLocalStorage();
function currentCacheValidationBinding() { return caller.getStore(); }
function withCacheValidationBinding(id, fn) { return caller.run({ validationId: id, executionOrigin: 'probe' }, fn); }
const error = (code) => Object.assign(new Error(code), { code });
function isCacheValidationControlError(value) { return String(value?.code || '').startsWith('CCM_CACHE_VALIDATION_'); }
function read() {
    if (!fs.existsSync(FILE)) {
        if (fs.existsSync(path.join(ROOT, 'initialized')))
            throw error('CCM_CACHE_VALIDATION_STORAGE_UNAVAILABLE');
        return { runs: {} };
    }
    try {
        const value = JSON.parse(fs.readFileSync(FILE, 'utf8'));
        if (!value.runs || typeof value.runs !== 'object' || value.activeId && !value.runs[value.activeId])
            throw new Error();
        for (const run of Object.values(value.runs))
            if (!Number.isSafeInteger(run.used) || run.used < 0 || !Number.isInteger(run.limit) || run.limit > 12
                || run.limit < 1 || !Array.isArray(run.requests) || run.requests.length !== run.used || run.used > run.limit || !Number.isFinite(run.leaseUntil))
                throw new Error();
        return value;
    }
    catch {
        throw error('CCM_CACHE_VALIDATION_STORAGE_UNAVAILABLE');
    }
}
function transaction(fn) {
    try {
        return (0, atomic_json_file_1.withFileLock)(FILE, () => { const store = read(); const value = fn(store); (0, atomic_json_file_1.writeJsonAtomic)(FILE, store); fs.writeFileSync(path.join(ROOT, 'initialized'), '1'); return value; });
    }
    catch (e) {
        if (isCacheValidationControlError(e))
            throw e;
        throw error('CCM_CACHE_VALIDATION_STORAGE_UNAVAILABLE');
    }
}
function closeWindow(run, reason, at = new Date().toISOString()) {
    run.windows ||= [{ openedAt: run.createdAt, closedAt: run.metadata.finishedAt }];
    const current = run.windows.at(-1);
    if (current && !current.closedAt) {
        current.closedAt = at;
        current.reason = reason;
    }
}
function active(store) {
    const run = store.runs[store.activeId || ''];
    if (run && run.status === 'running' && run.leaseUntil <= Date.now()) {
        run.status = 'expired';
        closeWindow(run, 'expired', new Date(run.leaseUntil).toISOString());
        delete store.activeId;
        return undefined;
    }
    return run?.status === 'running' ? run : undefined;
}
function assertNoInFlightRequests(store) {
    for (const [id, row] of Object.entries(store.inFlight || {})) {
        try {
            process.kill(row.pid, 0);
            throw error('CCM_CACHE_VALIDATION_REQUEST_IN_FLIGHT');
        }
        catch (e) {
            if (isCacheValidationControlError(e))
                throw e;
            if (e.code !== 'ESRCH')
                throw error('CCM_CACHE_VALIDATION_REQUEST_IN_FLIGHT');
            delete store.inFlight[id];
        }
    }
}
function createCacheValidationRun(input) {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 12 || !input.sessionId)
        throw error('CCM_CACHE_VALIDATION_INPUT_INVALID');
    return transaction(store => {
        if (active(store))
            throw error('CCM_CACHE_VALIDATION_ALREADY_RUNNING');
        assertNoInFlightRequests(store);
        const id = `cv_${(0, crypto_1.randomUUID)()}`;
        const run = { id, trace_id: `trace_${(0, crypto_1.randomUUID)()}`, sessionId: input.sessionId, limit: input.limit, used: 0, status: 'running', controllerPid: process.pid, leaseUntil: Date.now() + LEASE_MS, createdAt: new Date().toISOString(), requests: [], rejections: [], metadata: input.metadata || {} };
        run.windows = [{ openedAt: run.createdAt }];
        store.runs[id] = run;
        store.activeId = id;
        return run;
    });
}
function readCacheValidationRun(id) { return read().runs[id]; }
function updateCacheValidationMetadata(id, metadata) {
    return mutateCacheValidationMetadata(id, previous => ({ ...previous, ...metadata }));
}
function mutateCacheValidationMetadata(id, update) {
    return transaction(store => { const run = store.runs[id]; if (!run)
        throw error('CCM_CACHE_VALIDATION_NOT_FOUND'); run.metadata = update(run.metadata); return run; });
}
function activeCacheValidationRun() { const store = read(); return store.activeId && store.runs[store.activeId]?.leaseUntil <= Date.now() ? transaction(active) : active(store); }
function cacheValidationForSession(sessionId) { return Object.values(read().runs).filter(run => run.sessionId === sessionId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; }
function renewCacheValidationRun(id) {
    return transaction(store => { const run = active(store); if (run?.id !== id || run.controllerPid !== process.pid)
        throw error('CCM_CACHE_VALIDATION_NOT_ACTIVE'); run.leaseUntil = Date.now() + LEASE_MS; return run; });
}
/** Atomically own recovery cleanup before examining a dead controller's baseline. */
function claimCacheValidationRecovery(id) {
    return transaction(store => {
        const current = active(store), run = store.runs[id];
        if (!run || run.status === 'completed' || run.metadata.validationSealed || run.used >= run.limit || current && current.id !== id)
            throw error('CCM_CACHE_VALIDATION_CANNOT_RESUME');
        if (run.controllerPid && run.controllerPid !== process.pid) {
            try {
                process.kill(run.controllerPid, 0);
                throw error('CCM_CACHE_VALIDATION_CONTROLLER_ACTIVE');
            }
            catch (e) {
                if (e.code !== 'ESRCH')
                    throw e;
            }
        }
        run.controllerPid = process.pid;
        run.leaseUntil = Date.now() + LEASE_MS;
        return run;
    });
}
function resumeCacheValidationRun(id) {
    return transaction(store => {
        const current = active(store);
        const run = store.runs[id];
        if (!run || run.status === 'completed' || run.metadata.validationSealed || run.used >= run.limit || current && current.id !== id)
            throw error('CCM_CACHE_VALIDATION_CANNOT_RESUME');
        if (current?.controllerPid && current.controllerPid !== process.pid) {
            try {
                process.kill(current.controllerPid, 0);
                throw error('CCM_CACHE_VALIDATION_CONTROLLER_ACTIVE');
            }
            catch (e) {
                if (e.code !== 'ESRCH')
                    throw e;
            }
        }
        assertNoInFlightRequests(store);
        run.windows ||= [{ openedAt: run.createdAt, closedAt: run.metadata.finishedAt }];
        if (run.status !== 'running')
            run.windows.push({ openedAt: new Date().toISOString() });
        run.status = 'running';
        run.controllerPid = process.pid;
        run.leaseUntil = Date.now() + LEASE_MS;
        delete run.metadata.finishedAt;
        delete run.metadata.observationFinishedAt;
        store.activeId = id;
        return run;
    });
}
function finishCacheValidationRun(id, status = 'completed') {
    return transaction(store => { const run = store.runs[id]; if (!run)
        throw error('CCM_CACHE_VALIDATION_NOT_FOUND'); if (run.status === 'running')
        run.status = status; closeWindow(run, run.status); run.metadata.finishedAt = new Date().toISOString(); if (store.activeId === id)
        delete store.activeId; return run; });
}
function cacheValidationBackgroundDeferred() { return !!activeCacheValidationRun(); }
async function waitForCacheValidationBackground(signal) {
    while (cacheValidationBackgroundDeferred()) {
        if (signal?.aborted)
            throw error('CCM_CACHE_VALIDATION_BACKGROUND_CANCELLED');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
/** Must run outside diagnostic best-effort catches, before each actual send. */
function reserveCacheValidationRequest(options = {}, config = {}, protocol = '', transport = 'http') {
    const id = options.cacheValidationId || config.cacheValidationId || caller.getStore()?.validationId;
    const outcome = transaction(store => {
        const run = active(store);
        const track = (permit) => { (store.inFlight ||= {})[permit.requestId] = { pid: process.pid, at: new Date().toISOString() }; return { permit }; };
        if (!run) {
            if (id && store.runs[id])
                store.runs[id].rejections.push({ at: new Date().toISOString(), reason: 'not_active', contentStored: false });
            return id ? { code: 'CCM_CACHE_VALIDATION_NOT_ACTIVE' } : track({ requestId: (0, crypto_1.randomUUID)(), transport });
        }
        if (id && id !== run.id) {
            run.rejections.push({ at: new Date().toISOString(), reason: 'id_mismatch', contentStored: false });
            return { code: 'CCM_CACHE_VALIDATION_ID_MISMATCH' };
        }
        const context = options.modelRequestContext;
        const purpose = String(context?.purpose || options.requestAttribution?.purpose || 'unrecorded');
        if (!id) {
            const auxiliary = ['auxiliary', 'probe'].includes(context?.requestClass || options.requestAttribution?.requestClass);
            if (auxiliary) {
                run.rejections.push({ at: new Date().toISOString(), reason: 'background_deferred', purpose, contentStored: false });
                return { code: 'CCM_CACHE_VALIDATION_BACKGROUND_DEFERRED' };
            }
            run.status = 'interrupted';
            closeWindow(run, 'unrelated_foreground');
            delete store.activeId;
            run.rejections.push({ at: new Date().toISOString(), reason: 'unrelated_foreground', contentStored: false });
            return track({ requestId: (0, crypto_1.randomUUID)(), transport });
        }
        if (run.used >= run.limit) {
            run.rejections.push({ at: new Date().toISOString(), reason: 'budget_exhausted', contentStored: false });
            return { code: 'CCM_CACHE_VALIDATION_BUDGET_EXHAUSTED' };
        }
        const permit = { requestId: (0, crypto_1.randomUUID)(), ordinal: ++run.used, at: new Date().toISOString(), protocol, transport, purpose: purpose.slice(0, 200), status: 'reserved', pid: process.pid };
        run.requests.push(permit);
        return track({ ...permit, validationRunId: run.id, trace_id: run.trace_id });
    });
    if (outcome.code)
        throw error(outcome.code);
    return outcome.permit;
}
function completeCacheValidationRequest(id, requestId, status) {
    transaction(store => { const row = store.runs[id]?.requests.find(row => row.requestId === requestId); if (row)
        row.status = status; if (store.inFlight)
        delete store.inFlight[requestId]; });
}
//# sourceMappingURL=cache-validation-budget.js.map