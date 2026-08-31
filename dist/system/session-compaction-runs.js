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
exports.throwIfSessionCompactionAborted = throwIfSessionCompactionAborted;
exports.startSessionCompactionRun = startSessionCompactionRun;
exports.updateSessionCompactionRun = updateSessionCompactionRun;
exports.finishSessionCompactionRun = finishSessionCompactionRun;
exports.cancelSessionCompactionRun = cancelSessionCompactionRun;
exports.getSessionCompactionRunActivity = getSessionCompactionRunActivity;
exports.cancelAllSessionCompactionRuns = cancelAllSessionCompactionRuns;
const crypto = __importStar(require("crypto"));
const activeRuns = new Map();
function key(scope, exactSessionId) {
    return `${scope}:${String(exactSessionId || "").trim()}`;
}
function safeRunId(value) {
    const normalized = String(value || "").trim();
    if (/^scr_[a-zA-Z0-9_-]{8,96}$/.test(normalized))
        return normalized;
    return `scr_${crypto.randomBytes(12).toString("hex")}`;
}
function cancelledError(reason = "Session compaction cancelled") {
    const error = reason instanceof Error ? reason : new Error(String(reason || "Session compaction cancelled"));
    error.code = "CCM_SESSION_COMPACTION_CANCELLED";
    return error;
}
function throwIfSessionCompactionAborted(signal) {
    if (!signal?.aborted)
        return;
    throw cancelledError(signal.reason);
}
function startSessionCompactionRun(input) {
    const exactSessionId = String(input.exactSessionId || "").trim();
    if (!exactSessionId)
        throw new Error("compaction_exact_session_required");
    const mapKey = key(input.scope, exactSessionId);
    const requestedRunId = safeRunId(input.runId);
    const existing = activeRuns.get(mapKey);
    if (existing) {
        if (existing.runId === requestedRunId)
            return { run: existing, reused: true };
        const error = new Error("当前会话已有压缩正在执行");
        error.code = "CCM_SESSION_COMPACTION_BUSY";
        error.compactionRunId = existing.runId;
        throw error;
    }
    const controller = new AbortController();
    const abortFromExternal = () => {
        if (!controller.signal.aborted)
            controller.abort(cancelledError(input.signal?.reason));
    };
    if (input.signal?.aborted)
        abortFromExternal();
    else
        input.signal?.addEventListener("abort", abortFromExternal, { once: true });
    const now = new Date().toISOString();
    const run = {
        scope: input.scope,
        exactSessionId,
        runId: requestedRunId,
        reason: String(input.reason || "session_compaction"),
        startedAt: now,
        updatedAt: now,
        stage: "starting",
        committed: false,
        controller,
        detachExternalSignal: input.signal ? () => input.signal?.removeEventListener("abort", abortFromExternal) : undefined,
    };
    activeRuns.set(mapKey, run);
    throwIfSessionCompactionAborted(run.controller.signal);
    return { run, reused: false };
}
function updateSessionCompactionRun(scope, exactSessionId, runId, updates) {
    const run = activeRuns.get(key(scope, exactSessionId));
    if (!run || run.runId !== runId)
        return null;
    if (updates.stage)
        run.stage = String(updates.stage);
    if (updates.committed === true)
        run.committed = true;
    run.updatedAt = new Date().toISOString();
    return run;
}
function finishSessionCompactionRun(scope, exactSessionId, runId) {
    const mapKey = key(scope, exactSessionId);
    const run = activeRuns.get(mapKey);
    if (!run || run.runId !== runId)
        return false;
    run.detachExternalSignal?.();
    activeRuns.delete(mapKey);
    return true;
}
function cancelSessionCompactionRun(input) {
    const run = activeRuns.get(key(input.scope, input.exactSessionId));
    if (!run)
        return { success: true, cancelled: false, status: "idle", committed: false, compactionRunId: String(input.runId || "") };
    if (input.runId && run.runId !== input.runId)
        return { success: true, cancelled: false, status: "superseded", committed: run.committed, compactionRunId: run.runId };
    if (!run.controller.signal.aborted)
        run.controller.abort(cancelledError(input.reason || "用户取消当前会话压缩"));
    run.stage = run.committed ? "committed_recovery_cancelled" : "cancelled_before_commit";
    run.updatedAt = new Date().toISOString();
    return { success: true, cancelled: true, status: run.stage, committed: run.committed, compactionRunId: run.runId };
}
function getSessionCompactionRunActivity(scope, exactSessionId) {
    const run = activeRuns.get(key(scope, exactSessionId));
    return run ? {
        active: true,
        status: run.controller.signal.aborted ? "cancelling" : "running",
        stage: run.stage,
        reason: run.reason,
        startedAt: run.startedAt,
        updatedAt: run.updatedAt,
        compactionRunId: run.runId,
        committed: run.committed,
        cancellable: !run.controller.signal.aborted,
        contentStored: false,
    } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "", compactionRunId: "", committed: false, cancellable: false, contentStored: false };
}
function cancelAllSessionCompactionRuns(reason = "服务正在停止") {
    const cancelled = [];
    for (const run of activeRuns.values()) {
        if (!run.controller.signal.aborted)
            run.controller.abort(cancelledError(reason));
        run.stage = run.committed ? "committed_recovery_cancelled" : "cancelled_before_commit";
        run.updatedAt = new Date().toISOString();
        cancelled.push(run.runId);
    }
    return { cancelled: cancelled.length, compactionRunIds: cancelled, contentStored: false };
}
//# sourceMappingURL=session-compaction-runs.js.map