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
exports.taskRunStorePath = taskRunStorePath;
exports.loadTaskRuns = loadTaskRuns;
exports.getTaskRun = getTaskRun;
exports.activeTaskRunId = activeTaskRunId;
exports.validateActiveTaskRun = validateActiveTaskRun;
exports.listTaskRuns = listTaskRuns;
exports.createTaskRunRecord = createTaskRunRecord;
exports.patchTaskRun = patchTaskRun;
exports.claimTaskRunLease = claimTaskRunLease;
exports.releaseTaskRunLease = releaseTaskRunLease;
exports.recordTaskRunFromTask = recordTaskRunFromTask;
exports.syncTaskRunFromTask = syncTaskRunFromTask;
exports.taskRunStoreChecksum = taskRunStoreChecksum;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const task_workflow_model_1 = require("./task-workflow-model");
const TASK_RUNS_FILE = path.join(utils_1.CCM_DIR, "task-runs.json");
const TASK_RUNS_LOCK = path.join(utils_1.CCM_DIR, "task-runs-identity-v1");
function text(value, fallback = "") { const normalized = String(value ?? "").trim(); return normalized || fallback; }
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function normalizeRecord(raw) {
    if (!raw || !text(raw.run_id) || !text(raw.task_id) || !text(raw.trace_id))
        return null;
    return {
        schema: "ccm-task-run-record-v1",
        run_id: text(raw.run_id),
        task_id: text(raw.task_id),
        trace_id: text(raw.trace_id),
        spec_revision: Math.max(1, Number(raw.spec_revision || 1)),
        trigger: ["user", "automation", "retry", "resume"].includes(text(raw.trigger)) ? raw.trigger : "user",
        status: ["queued", "running", "verifying", "waiting_user", "blocked", "completed", "failed", "cancelled", "recovery_required"].includes(text(raw.status)) ? raw.status : "recovery_required",
        attempt: Math.max(1, Number(raw.attempt || 1)),
        parent_run_id: text(raw.parent_run_id),
        created_at: text(raw.created_at, new Date().toISOString()),
        updated_at: text(raw.updated_at, raw.created_at || new Date().toISOString()),
        queue_lane: text(raw.queue_lane),
        lease: raw.lease && typeof raw.lease === "object" ? raw.lease : null,
        execution_evidence: Array.isArray(raw.execution_evidence) ? raw.execution_evidence : [],
        verification_result: raw.verification_result ?? null,
        delivery_result: raw.delivery_result ?? null,
        task_spec_checksum: text(raw.task_spec_checksum),
        ...(text(raw.automation_definition_id) ? { automation_definition_id: text(raw.automation_definition_id) } : {}),
        ...(Number(raw.automation_definition_revision || 0) > 0 ? { automation_definition_revision: Number(raw.automation_definition_revision) } : {}),
        history: Array.isArray(raw.history) ? raw.history.slice(-50) : [],
    };
}
function readStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(TASK_RUNS_FILE, { schema: "ccm-task-run-store-v1", runs: [] });
    const rows = Array.isArray(raw) ? raw : raw?.runs;
    return (Array.isArray(rows) ? rows : []).map(normalizeRecord).filter(Boolean);
}
function writeStore(runs) {
    (0, atomic_json_file_1.writeJsonAtomic)(TASK_RUNS_FILE, { schema: "ccm-task-run-store-v1", version: 1, updated_at: new Date().toISOString(), runs });
}
function taskRunStorePath() { return TASK_RUNS_FILE; }
function loadTaskRuns() { return readStore(); }
function getTaskRun(runId) {
    const id = text(runId);
    return readStore().find(item => item.run_id === id) || null;
}
function activeTaskRunId(task) {
    return text(task?.active_run_id || task?.run_id || task?.task_run?.run_id);
}
function validateActiveTaskRun(task, runId) {
    if (task?.task_spec?.schema !== "ccm-task-spec-v1")
        return { ok: true, runId: "" };
    const requested = text(runId);
    const active = activeTaskRunId(task);
    if (!requested)
        return { ok: false, code: "TASK_RUN_REQUIRED", error: "新任务运行控制必须提供 run_id" };
    const run = getTaskRun(requested);
    if (!run || run.task_id !== text(task?.id))
        return { ok: false, code: "TASK_RUN_MISMATCH", error: "run_id 与任务不匹配" };
    if (active && active !== requested)
        return { ok: false, code: "TASK_RUN_NOT_ACTIVE", error: "只能控制任务当前活动运行，历史运行仅支持回放" };
    return { ok: true, runId: requested };
}
function listTaskRuns(taskId) {
    const id = text(taskId);
    return readStore().filter(item => !id || item.task_id === id).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
function createTaskRunRecord(input, taskSpec, trigger = "user", options = {}) {
    if (!taskSpec || taskSpec.schema !== "ccm-task-spec-v1")
        throw new Error("创建 TaskRun 前必须提供有效 TaskSpec");
    return (0, atomic_json_file_1.withFileLock)(TASK_RUNS_LOCK, () => {
        const runs = readStore();
        const base = (0, task_workflow_model_1.buildTaskRunV1)({
            ...input,
            run_id: "",
            task_run: null,
            trace_id: text(input?.trace_id || input?.traceId),
            automation_definition: input?.automation_definition,
        }, taskSpec, trigger);
        const requested = text(options.runId || input?.run_id);
        const runId = requested || `run_${crypto.randomUUID()}`;
        const duplicate = runs.find(item => item.run_id === runId);
        if (duplicate) {
            if (duplicate.task_id !== taskSpec.task_id || (duplicate.task_spec_checksum && duplicate.task_spec_checksum !== text(taskSpec.checksum))) {
                throw new Error("run_id 已绑定到其他任务或规格");
            }
            return duplicate;
        }
        const now = new Date().toISOString();
        const record = {
            schema: "ccm-task-run-record-v1",
            ...base,
            run_id: runId,
            parent_run_id: text(options.parentRunId || input?.parent_run_id),
            queue_lane: text(input?.queue_scope || input?.queueScope),
            lease: null,
            execution_evidence: [],
            verification_result: null,
            delivery_result: null,
            task_spec_checksum: text(taskSpec.checksum),
            history: [{ at: now, status: base.status, trigger, reason: "created" }],
        };
        runs.push(record);
        writeStore(runs);
        return record;
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function patchTaskRun(runId, updates, options = {}) {
    const id = text(runId);
    if (!id)
        return null;
    return (0, atomic_json_file_1.withFileLock)(TASK_RUNS_LOCK, () => {
        const runs = readStore();
        const index = runs.findIndex(item => item.run_id === id);
        if (index < 0)
            return null;
        const current = runs[index];
        if (options.expectedRevision != null && Number(options.expectedRevision) !== Number(current.spec_revision))
            throw new Error("TaskRun 规格版本冲突");
        const nextStatus = updates?.status ? text(updates.status) : current.status;
        const now = new Date().toISOString();
        const next = {
            ...current,
            ...updates,
            schema: "ccm-task-run-record-v1",
            run_id: current.run_id,
            task_id: current.task_id,
            trace_id: current.trace_id,
            status: nextStatus,
            attempt: Math.max(1, Number(updates?.attempt || current.attempt || 1)),
            updated_at: now,
            history: [...current.history, ...(current.status !== nextStatus ? [{ at: now, status: nextStatus, reason: text(updates?.reason || updates?.status_detail) }] : [])].slice(-50),
        };
        runs[index] = next;
        writeStore(runs);
        return next;
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function claimTaskRunLease(runId, owner, ttlMs = 60_000) {
    const current = getTaskRun(runId);
    const now = Date.now();
    const lease = current?.lease;
    if (lease && Number(lease.expires_at_ms || 0) > now && text(lease.owner) !== text(owner))
        return { claimed: false, run: current, reason: "lease_owned" };
    const next = patchTaskRun(runId, { lease: { owner: text(owner), token: crypto.randomUUID(), acquired_at: new Date(now).toISOString(), expires_at_ms: now + Math.max(1_000, ttlMs) } });
    return { claimed: !!next, run: next, reason: next ? "claimed" : "run_missing" };
}
function releaseTaskRunLease(runId, owner, status) {
    const current = getTaskRun(runId);
    if (!current)
        return null;
    if (current.lease && text(current.lease.owner) !== text(owner))
        return current;
    return patchTaskRun(runId, { lease: null, ...(status ? { status } : {}) });
}
function recordTaskRunFromTask(task) {
    const run = task?.task_run;
    if (!run?.run_id || !task?.task_spec?.checksum)
        return null;
    const existing = getTaskRun(run.run_id);
    if (!existing)
        return createTaskRunRecord(task, task.task_spec, run.trigger || "user", { runId: run.run_id, parentRunId: task.parent_run_id });
    const projectedStatus = taskStatusToRunStatus(task);
    return patchTaskRun(run.run_id, {
        ...(projectedStatus ? { status: projectedStatus } : {}),
        attempt: run.attempt,
        queue_lane: run.queue_lane || task.queue_scope,
        ...(run.execution_evidence !== undefined ? { execution_evidence: run.execution_evidence } : {}),
        ...(run.verification_result !== undefined ? { verification_result: run.verification_result } : {}),
        ...(run.delivery_result !== undefined ? { delivery_result: run.delivery_result } : {}),
    });
}
function taskStatusToRunStatus(task) {
    const status = text(task?.status).toLowerCase();
    if (["done", "completed"].includes(status))
        return "completed";
    if (["in_progress", "running"].includes(status))
        return "running";
    if (["reviewing", "verifying"].includes(status))
        return "verifying";
    if (["needs_user", "waiting_user", "awaiting_confirmation"].includes(status))
        return "waiting_user";
    if (["cancelled", "canceled"].includes(status))
        return "cancelled";
    if (status === "failed")
        return "failed";
    if (status === "blocked")
        return task?.recovery_required === true || text(task?.acceptance_state) === "recovery_required"
            ? "recovery_required"
            : "blocked";
    if (["pending", "queued"].includes(status))
        return "queued";
    return null;
}
/**
 * Keep the independent TaskRun record aligned with the task projection at
 * execution boundaries. The task record remains the legacy/UI projection;
 * run identity and evidence stay in task-runs.json.
 */
function syncTaskRunFromTask(task, updates = {}) {
    const runId = text(task?.active_run_id || task?.run_id || task?.task_run?.run_id);
    if (!runId)
        return null;
    const run = getTaskRun(runId);
    if (!run)
        return null;
    const status = updates.status || taskStatusToRunStatus({ ...task, ...updates });
    return patchTaskRun(runId, {
        ...(status ? { status } : {}),
        ...(updates.queue_lane !== undefined ? { queue_lane: text(updates.queue_lane) } : {}),
        ...(updates.lease !== undefined ? { lease: updates.lease } : {}),
        ...(updates.execution_evidence !== undefined ? { execution_evidence: updates.execution_evidence } : {}),
        ...(updates.verification_result !== undefined ? { verification_result: updates.verification_result } : {}),
        ...(updates.delivery_result !== undefined ? { delivery_result: updates.delivery_result } : {}),
        ...(updates.reason ? { reason: text(updates.reason) } : {}),
    });
}
function taskRunStoreChecksum() {
    return checksum(readStore());
}
//# sourceMappingURL=task-run-store.js.map