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
exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_HEARTBEAT_MS = exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_LEASE_MS = exports.GROUP_COMPACTION_ACTIVITY_DIR = exports.GROUP_COMPACTION_ACTIVITY_SCHEMA = void 0;
exports.getGroupCompactionActivityFile = getGroupCompactionActivityFile;
exports.verifyGroupCompactionActivityLedger = verifyGroupCompactionActivityLedger;
exports.readGroupCompactionActivity = readGroupCompactionActivity;
exports.assertGroupCompactionNotCancelled = assertGroupCompactionNotCancelled;
exports.requestGroupCompactionCancellation = requestGroupCompactionCancellation;
exports.reconcileGroupCompactionActivity = reconcileGroupCompactionActivity;
exports.startGroupCompactionActivity = startGroupCompactionActivity;
exports.pulseGroupCompactionActivity = pulseGroupCompactionActivity;
exports.finishGroupCompactionActivity = finishGroupCompactionActivity;
exports.withGroupCompactionActivityCommitFence = withGroupCompactionActivityCommitFence;
exports.deleteGroupCompactionActivity = deleteGroupCompactionActivity;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
exports.GROUP_COMPACTION_ACTIVITY_SCHEMA = "ccm-group-compaction-activity-ledger-v1";
exports.GROUP_COMPACTION_ACTIVITY_DIR = path.join(utils_1.CCM_DIR, "group-compaction-activity");
exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_LEASE_MS = 90_000;
exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_HEARTBEAT_MS = 30_000;
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
function clean(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function processAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function ledgerChecksum(ledger) {
    const payload = { ...(ledger || {}) };
    delete payload.ledger_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    delete payload.exists;
    delete payload.recovered_from_backup;
    delete payload.issues;
    return checksum(payload);
}
function getGroupCompactionActivityFile(groupId, groupSessionId) {
    return path.join(exports.GROUP_COMPACTION_ACTIVITY_DIR, clean(groupId), `${clean(groupSessionId)}.json`);
}
function emptyLedger(groupId, groupSessionId) {
    const payload = {
        schema: exports.GROUP_COMPACTION_ACTIVITY_SCHEMA,
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        scope_id: `${groupId}::${groupSessionId}`,
        revision: 0,
        current: null,
        recent: [],
        updated_at: "",
    };
    return { ...payload, ledger_checksum: ledgerChecksum(payload) };
}
function verifyGroupCompactionActivityLedger(ledger, expected = {}) {
    const issues = [];
    if (ledger?.schema !== exports.GROUP_COMPACTION_ACTIVITY_SCHEMA || Number(ledger?.version || 0) !== 1)
        issues.push("group_compaction_activity_schema_invalid");
    if (!String(ledger?.group_id || ""))
        issues.push("group_compaction_activity_group_missing");
    if (!String(ledger?.group_session_id || "").startsWith("gcs_"))
        issues.push("group_compaction_activity_session_missing");
    if (String(ledger?.scope_id || "") !== `${String(ledger?.group_id || "")}::${String(ledger?.group_session_id || "")}`)
        issues.push("group_compaction_activity_scope_invalid");
    if (Number(ledger?.revision || 0) < 0)
        issues.push("group_compaction_activity_revision_invalid");
    if (!Array.isArray(ledger?.recent) || ledger.recent.length > 20)
        issues.push("group_compaction_activity_history_invalid");
    const rows = [ledger?.current, ...(Array.isArray(ledger?.recent) ? ledger.recent : [])].filter(Boolean);
    for (const row of rows) {
        if (!/^acba_[a-f0-9]{24}$/.test(String(row?.operation_id || "")))
            issues.push("group_compaction_activity_operation_invalid");
        if (!String(row?.stage || "") || !String(row?.started_at || "") || !String(row?.heartbeat_at || ""))
            issues.push("group_compaction_activity_timing_missing");
        if (row?.body_free !== true)
            issues.push("group_compaction_activity_body_policy_invalid");
        if (!Number.isFinite(Number(row?.lifecycle_generation || 0)) || Number(row?.lifecycle_generation || 0) < 1)
            issues.push("group_compaction_activity_lifecycle_missing");
        if (row?.cancel_requested_at) {
            if (!/^gcca_[a-f0-9]{24}$/.test(String(row?.cancel_request_id || "")))
                issues.push("group_compaction_activity_cancel_request_invalid");
            if (!/^[a-f0-9]{64}$/.test(String(row?.cancel_reason_checksum || "")))
                issues.push("group_compaction_activity_cancel_reason_checksum_invalid");
            if (!String(row?.cancel_requested_by || ""))
                issues.push("group_compaction_activity_cancel_actor_missing");
        }
        if (row?.commit_fence_status) {
            if (row.commit_fence_status !== "sealed")
                issues.push("group_compaction_activity_commit_fence_invalid");
            if (!["completed", "skipped"].includes(String(row?.status || "")))
                issues.push("group_compaction_activity_commit_fence_status_invalid");
            if (!String(row?.commit_sealed_at || ""))
                issues.push("group_compaction_activity_commit_fence_time_missing");
        }
    }
    if (ledger?.current && String(ledger.current.status || "") !== "running")
        issues.push("group_compaction_activity_current_status_invalid");
    if ((ledger?.recent || []).some((row) => !["completed", "skipped", "failed", "interrupted", "cancelled", "session_lifecycle_stale"].includes(String(row?.status || ""))))
        issues.push("group_compaction_activity_terminal_status_invalid");
    if (String(ledger?.ledger_checksum || "") !== ledgerChecksum(ledger))
        issues.push("group_compaction_activity_checksum_invalid");
    if (expected.groupId && String(ledger?.group_id || "") !== String(expected.groupId))
        issues.push("group_compaction_activity_group_mismatch");
    if (expected.groupSessionId && String(ledger?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("group_compaction_activity_session_mismatch");
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function persistLedger(file, ledger) {
    const base = { ...(ledger || {}) };
    delete base.ledger_checksum;
    delete base.checksum_valid;
    delete base.file;
    delete base.exists;
    delete base.recovered_from_backup;
    delete base.issues;
    const payload = {
        ...base,
        revision: Number(base?.revision || 0) + 1,
        recent: (Array.isArray(base?.recent) ? base.recent : []).slice(-20),
        updated_at: new Date().toISOString(),
    };
    const sealed = { ...payload, ledger_checksum: ledgerChecksum(payload) };
    (0, atomic_json_file_1.writeJsonAtomic)(file, sealed);
    return { ...sealed, checksum_valid: true, file };
}
function readGroupCompactionActivity(groupId, groupSessionId) {
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`))
        return { ...emptyLedger(groupId, groupSessionId), checksum_valid: true, file, exists: false };
    for (const candidate of [file, `${file}.bak`]) {
        try {
            const ledger = JSON.parse(fs.readFileSync(candidate, "utf8"));
            const verification = verifyGroupCompactionActivityLedger(ledger, { groupId, groupSessionId });
            if (verification.valid)
                return { ...ledger, checksum_valid: true, file, exists: true, recovered_from_backup: candidate !== file };
        }
        catch { }
    }
    return { ...emptyLedger(groupId, groupSessionId), checksum_valid: false, file, exists: true, issues: ["group_compaction_activity_unreadable_or_invalid"] };
}
function activityStillOwned(row, nowMs) {
    const leaseActive = Date.parse(String(row?.lease_expires_at || "")) > nowMs;
    if (!leaseActive)
        return false;
    if (String(row?.owner_hostname || "") === os.hostname())
        return processAlive(Number(row?.owner_pid || 0));
    return true;
}
function interruptedRow(row, reason, at) {
    return { ...row, status: "interrupted", stage: "interrupted", terminal_reason: reason, completed_at: at, heartbeat_at: at, lease_expires_at: at };
}
function groupCompactionCancelledError(row) {
    const error = new Error("group compaction cancelled for exact session");
    error.code = "GROUP_COMPACTION_CANCELLED";
    error.cancelRequestId = String(row?.cancel_request_id || "");
    error.cancelRequestedAt = String(row?.cancel_requested_at || "");
    error.cancelRequestedBy = String(row?.cancel_requested_by || "");
    error.cancelReasonChecksum = String(row?.cancel_reason_checksum || "");
    return error;
}
function assertGroupCompactionNotCancelled(input = {}) {
    const groupId = String(input.groupId || input.group_id || "");
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
    const operationId = String(input.operationId || input.operation_id || "");
    const ledger = readGroupCompactionActivity(groupId, groupSessionId);
    if (!ledger.checksum_valid)
        throw new Error("group compaction activity ledger failed integrity validation");
    if (!ledger.current || ledger.current.operation_id !== operationId)
        throw new Error("group compaction activity operation is not current");
    if (ledger.current.cancel_requested_at)
        throw groupCompactionCancelledError(ledger.current);
    return { cancelled: false, current: ledger.current, ledger };
}
function requestGroupCompactionCancellation(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact group session required for compaction cancellation");
    const expectedOperationId = String(input.operationId || input.operation_id || "");
    const actor = String(input.actor || input.cancelledBy || input.cancelled_by || "local-user").trim().slice(0, 160) || "local-user";
    const reason = String(input.reason || "").trim();
    if (!reason)
        throw new Error("compaction cancellation requires a reason");
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readGroupCompactionActivity(groupId, groupSessionId);
        if (!ledger.checksum_valid)
            throw new Error("group compaction activity ledger failed integrity validation");
        if (!ledger.current) {
            const latest = Array.isArray(ledger.recent) ? ledger.recent.at(-1) : null;
            if (expectedOperationId && latest?.operation_id === expectedOperationId && latest?.commit_fence_status === "sealed") {
                return { requested: false, reason: "compact_commit_already_sealed", terminal: latest, ledger };
            }
            return { requested: false, reason: "no_active_compaction", ledger };
        }
        if (expectedOperationId && ledger.current.operation_id !== expectedOperationId) {
            return { requested: false, reason: "compaction_operation_changed", current: ledger.current, ledger };
        }
        if (ledger.current.cancel_requested_at) {
            return { requested: true, alreadyRequested: true, cancelRequestId: ledger.current.cancel_request_id, current: ledger.current, ledger };
        }
        const requestedAt = String(input.requestedAt || input.requested_at || new Date().toISOString());
        const cancelRequestId = `gcca_${crypto.createHash("sha256").update(`${groupId}\0${groupSessionId}\0${ledger.current.operation_id}\0${requestedAt}\0${actor}`).digest("hex").slice(0, 24)}`;
        const current = {
            ...ledger.current,
            cancel_request_id: cancelRequestId,
            cancel_requested_at: requestedAt,
            cancel_requested_by: actor,
            cancel_reason_checksum: checksum(reason),
        };
        const saved = persistLedger(file, { ...ledger, current });
        return { requested: true, alreadyRequested: false, cancelRequestId, current: saved.current, ledger: saved };
    });
}
function reconcileGroupCompactionActivity(groupId, groupSessionId, options = {}) {
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`))
        return readGroupCompactionActivity(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readGroupCompactionActivity(groupId, groupSessionId);
        if (!ledger.checksum_valid)
            return ledger;
        const nowMs = Number(options.nowMs || options.now_ms || Date.now());
        if (!ledger.current || activityStillOwned(ledger.current, nowMs))
            return ledger;
        const at = new Date(nowMs).toISOString();
        return persistLedger(file, {
            ...ledger,
            current: null,
            recent: [...ledger.recent, interruptedRow(ledger.current, "owner_dead_or_lease_expired", at)],
        });
    });
}
function startGroupCompactionActivity(input = {}) {
    const fence = (0, group_session_lifecycle_head_1.normalizeGroupSessionLifecycleRuntimeFence)(input.lifecycleFence || input.lifecycle_fence || input);
    const lifecycleValidation = (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleRuntimeFence)(fence);
    if (!lifecycleValidation.valid)
        return { started: false, busy: false, reason: "session_lifecycle_stale", lifecycleValidation };
    const operationId = String(input.operationId || input.operation_id || "");
    if (!/^acba_[a-f0-9]{24}$/.test(operationId))
        throw new Error("group compaction activity requires acba_* operation id");
    const file = getGroupCompactionActivityFile(fence.groupId, fence.groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let ledger = readGroupCompactionActivity(fence.groupId, fence.groupSessionId);
        if (!ledger.checksum_valid)
            throw new Error("group compaction activity ledger failed integrity validation");
        const nowMs = Number(input.nowMs || input.now_ms || Date.now());
        const at = new Date(nowMs).toISOString();
        if (ledger.current && activityStillOwned(ledger.current, nowMs)) {
            return { started: false, busy: true, reason: "cross_process_compaction_active", current: ledger.current, ledger };
        }
        if (ledger.current)
            ledger = {
                ...ledger,
                current: null,
                recent: [...ledger.recent, interruptedRow(ledger.current, "recovered_before_new_compaction", at)],
            };
        const leaseMs = Math.max(1_000, Number(input.leaseMs || input.lease_ms || exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_LEASE_MS));
        const current = {
            operation_id: operationId,
            status: "running",
            stage: String(input.stage || "starting"),
            reason: String(input.reason || ""),
            owner_pid: process.pid,
            owner_hostname: os.hostname(),
            lifecycle_generation: fence.lifecycleGeneration,
            lifecycle_head_id: fence.lifecycleHeadId,
            lifecycle_head_checksum: fence.lifecycleHeadChecksum,
            started_at: at,
            heartbeat_at: at,
            lease_expires_at: new Date(nowMs + leaseMs).toISOString(),
            heartbeat_sequence: 0,
            model_wait_heartbeat_count: 0,
            body_free: true,
        };
        const saved = persistLedger(file, { ...ledger, current });
        return { started: true, busy: false, operationId, current: saved.current, ledger: saved, lifecycleValidation };
    });
}
function pulseGroupCompactionActivity(input = {}) {
    const fence = (0, group_session_lifecycle_head_1.normalizeGroupSessionLifecycleRuntimeFence)(input.lifecycleFence || input.lifecycle_fence || input);
    const lifecycleValidation = (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleRuntimeFence)(fence);
    if (!lifecycleValidation.valid) {
        const error = new Error(`group compaction activity lifecycle stale: ${lifecycleValidation.issues.join(",")}`);
        error.code = "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
        error.lifecycleValidation = lifecycleValidation;
        throw error;
    }
    const operationId = String(input.operationId || input.operation_id || "");
    const file = getGroupCompactionActivityFile(fence.groupId, fence.groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readGroupCompactionActivity(fence.groupId, fence.groupSessionId);
        if (!ledger.checksum_valid || !ledger.current || ledger.current.operation_id !== operationId)
            throw new Error("group compaction activity operation is not current");
        if (ledger.current.cancel_requested_at)
            throw groupCompactionCancelledError(ledger.current);
        const nowMs = Number(input.nowMs || input.now_ms || Date.now());
        const leaseMs = Math.max(1_000, Number(input.leaseMs || input.lease_ms || exports.GROUP_COMPACTION_ACTIVITY_DEFAULT_LEASE_MS));
        const stage = String(input.stage || ledger.current.stage || "running");
        const current = {
            ...ledger.current,
            stage,
            heartbeat_at: new Date(nowMs).toISOString(),
            lease_expires_at: new Date(nowMs + leaseMs).toISOString(),
            heartbeat_sequence: Number(ledger.current.heartbeat_sequence || 0) + 1,
            model_wait_heartbeat_count: Number(ledger.current.model_wait_heartbeat_count || 0) + (stage === "model_summary_wait" ? 1 : 0),
        };
        const saved = persistLedger(file, { ...ledger, current });
        return { pulsed: true, current: saved.current, ledger: saved, lifecycleValidation };
    });
}
function finishGroupCompactionActivity(input = {}) {
    const groupId = String(input.groupId || input.group_id || "");
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
    const operationId = String(input.operationId || input.operation_id || "");
    const status = String(input.status || "failed");
    if (!["completed", "skipped", "failed", "cancelled", "session_lifecycle_stale"].includes(status))
        throw new Error(`unsupported group compaction activity terminal status: ${status}`);
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    if (!fs.existsSync(file) && !fs.existsSync(`${file}.bak`))
        return { finished: false, reason: "activity_missing_after_session_cleanup" };
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readGroupCompactionActivity(groupId, groupSessionId);
        if (!ledger.checksum_valid || !ledger.current || ledger.current.operation_id !== operationId)
            return { finished: false, reason: "activity_not_current", ledger };
        const at = String(input.completedAt || input.completed_at || new Date().toISOString());
        const terminal = {
            ...ledger.current,
            status,
            stage: status,
            terminal_reason: String(input.reason || ""),
            boundary_id: String(input.boundaryId || input.boundary_id || ""),
            compact_transaction_receipt_checksum: String(input.compactTransactionReceiptChecksum || input.compact_transaction_receipt_checksum || ""),
            completed_at: at,
            heartbeat_at: at,
            lease_expires_at: at,
        };
        const saved = persistLedger(file, { ...ledger, current: null, recent: [...ledger.recent, terminal] });
        return { finished: true, terminal, ledger: saved };
    });
}
function withGroupCompactionActivityCommitFence(input = {}, operation) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const operationId = String(input.operationId || input.operation_id || "").trim();
    const status = String(input.status || "completed");
    if (!groupId || !groupSessionId.startsWith("gcs_") || !operationId)
        throw new Error("exact group compaction activity operation required for commit fence");
    if (!["completed", "skipped"].includes(status))
        throw new Error(`unsupported group compaction activity commit status: ${status}`);
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readGroupCompactionActivity(groupId, groupSessionId);
        if (!ledger.checksum_valid)
            throw new Error("group compaction activity ledger failed integrity validation");
        if (!ledger.current || ledger.current.operation_id !== operationId)
            throw new Error("group compaction activity operation is not current at commit fence");
        if (ledger.current.cancel_requested_at)
            throw groupCompactionCancelledError(ledger.current);
        const value = operation({ ledger, current: ledger.current });
        const at = String(input.committedAt || input.committed_at || new Date().toISOString());
        const terminal = {
            ...ledger.current,
            status,
            stage: status,
            terminal_reason: String(input.reason || (status === "completed" ? "compact_commit_completed" : "compact_not_required")),
            boundary_id: String(input.boundaryId || input.boundary_id || ""),
            compact_transaction_receipt_checksum: String(input.compactTransactionReceiptChecksum || input.compact_transaction_receipt_checksum || ""),
            commit_fence_status: "sealed",
            commit_sealed_at: at,
            completed_at: at,
            heartbeat_at: at,
            lease_expires_at: at,
        };
        const saved = persistLedger(file, { ...ledger, current: null, recent: [...ledger.recent, terminal] });
        return {
            value,
            compactionActivity: {
                finished: true,
                terminal,
                ledger: saved,
                commitFence: {
                    schema: "ccm-group-compaction-activity-commit-fence-v1",
                    status: "sealed",
                    group_id: groupId,
                    group_session_id: groupSessionId,
                    operation_id: operationId,
                    boundary_id: terminal.boundary_id,
                    compact_transaction_receipt_checksum: terminal.compact_transaction_receipt_checksum,
                    committed_at: at,
                    body_free: true,
                    ledger_checksum: saved.ledger_checksum,
                },
            },
        };
    });
}
function deleteGroupCompactionActivity(groupId, groupSessionId) {
    const file = getGroupCompactionActivityFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let deleted = 0;
        for (const target of [file, `${file}.bak`]) {
            try {
                if (fs.existsSync(target)) {
                    fs.unlinkSync(target);
                    deleted += 1;
                }
            }
            catch { }
        }
        return { deleted, file, groupId, groupSessionId };
    });
}
//# sourceMappingURL=group-compaction-activity.js.map