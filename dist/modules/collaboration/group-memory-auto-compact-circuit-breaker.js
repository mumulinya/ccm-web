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
exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR = exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES = exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA = void 0;
exports.getGroupMemoryAutoCompactCircuitBreakerFile = getGroupMemoryAutoCompactCircuitBreakerFile;
exports.verifyGroupMemoryAutoCompactCircuitBreaker = verifyGroupMemoryAutoCompactCircuitBreaker;
exports.readGroupMemoryAutoCompactCircuitBreaker = readGroupMemoryAutoCompactCircuitBreaker;
exports.recordGroupMemoryAutoCompactCircuitBreakerOutcome = recordGroupMemoryAutoCompactCircuitBreakerOutcome;
exports.readGroupMemoryAutoCompactCircuitAdmission = readGroupMemoryAutoCompactCircuitAdmission;
exports.resetGroupMemoryAutoCompactCircuitBreaker = resetGroupMemoryAutoCompactCircuitBreaker;
exports.deleteGroupMemoryAutoCompactCircuitBreaker = deleteGroupMemoryAutoCompactCircuitBreaker;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const group_memory_auto_compact_circuit_policy_1 = require("./group-memory-auto-compact-circuit-policy");
exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA = "ccm-group-memory-auto-compact-circuit-breaker-v1";
exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;
exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR = path.join(utils_1.CCM_DIR, "group-memory-auto-compact-circuit-breakers");
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
function checksum(value, length = 64) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}
function clean(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function ledgerChecksum(ledger) {
    const payload = { ...(ledger || {}) };
    delete payload.ledger_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    delete payload.recovered_from_backup;
    return checksum(payload);
}
function getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId) {
    return path.join(exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR, clean(groupId), `${clean(groupSessionId)}.json`);
}
function emptyLedger(groupId, groupSessionId, file) {
    return {
        schema: exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA,
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        scope_id: `${groupId}::${groupSessionId}`,
        state: "closed",
        consecutive_failures: 0,
        max_consecutive_failures: exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES,
        failure_mode: "",
        open_count: 0,
        revision: 0,
        opened_at: "",
        last_failure_at: "",
        last_success_at: "",
        last_attempt_id: "",
        recent_events: [],
        updated_at: "",
        ledger_checksum: "",
        checksum_valid: true,
        file,
    };
}
function verifyGroupMemoryAutoCompactCircuitBreaker(ledger, expected = {}) {
    const issues = [];
    if (ledger?.schema !== exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA || Number(ledger?.version || 0) !== 1)
        issues.push("auto_compact_circuit_schema_invalid");
    if (!String(ledger?.group_id || ""))
        issues.push("auto_compact_circuit_group_missing");
    if (!String(ledger?.group_session_id || "").startsWith("gcs_"))
        issues.push("auto_compact_circuit_exact_session_missing");
    if (String(ledger?.scope_id || "") !== `${String(ledger?.group_id || "")}::${String(ledger?.group_session_id || "")}`)
        issues.push("auto_compact_circuit_scope_invalid");
    if (!["closed", "open"].includes(String(ledger?.state || "")))
        issues.push("auto_compact_circuit_state_invalid");
    const failures = Number(ledger?.consecutive_failures || 0);
    if (!Number.isInteger(failures) || failures < 0 || failures > exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES)
        issues.push("auto_compact_circuit_failure_count_invalid");
    if ((failures >= exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES) !== (ledger?.state === "open"))
        issues.push("auto_compact_circuit_state_count_mismatch");
    // failure_mode / open_count 为增量字段：历史台账没有这两项也必须判定为合法。
    if (ledger?.failure_mode !== undefined && ledger.failure_mode !== "" && !["transient", "structural", "cancelled"].includes(String(ledger.failure_mode))) {
        issues.push("auto_compact_circuit_failure_mode_invalid");
    }
    if (ledger?.open_count !== undefined) {
        const openCount = Number(ledger.open_count);
        if (!Number.isInteger(openCount) || openCount < 0)
            issues.push("auto_compact_circuit_open_count_invalid");
    }
    if (expected.groupId && String(ledger?.group_id || "") !== String(expected.groupId))
        issues.push("auto_compact_circuit_group_mismatch");
    if (expected.groupSessionId && String(ledger?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("auto_compact_circuit_group_session_mismatch");
    if (String(ledger?.ledger_checksum || "") !== ledgerChecksum(ledger))
        issues.push("auto_compact_circuit_checksum_invalid");
    return { valid: issues.length === 0, issues };
}
function readCandidate(file, groupId, groupSessionId) {
    try {
        if (!fs.existsSync(file))
            return null;
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        const verification = verifyGroupMemoryAutoCompactCircuitBreaker(ledger, { groupId, groupSessionId });
        return { ledger, verification };
    }
    catch (error) {
        return { ledger: null, verification: { valid: false, issues: [String(error?.message || error).slice(0, 160)] } };
    }
}
function readGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    const file = getGroupMemoryAutoCompactCircuitBreakerFile(id, sessionId);
    if (!id || !sessionId.startsWith("gcs_")) {
        return {
            ...emptyLedger(id, sessionId, file),
            state: "fail_closed",
            blocked: true,
            checksum_valid: false,
            issues: ["exact_group_session_required"],
        };
    }
    const primary = readCandidate(file, id, sessionId);
    if (primary?.verification.valid) {
        return {
            ...primary.ledger,
            checksum_valid: true,
            blocked: primary.ledger.state === "open",
            issues: [],
            file,
            recovered_from_backup: false,
        };
    }
    const backup = readCandidate(`${file}.bak`, id, sessionId);
    if (backup?.verification.valid) {
        return {
            ...backup.ledger,
            state: "fail_closed",
            recovery_state: String(backup.ledger.state || ""),
            blocked: true,
            checksum_valid: true,
            issues: [...new Set(["auto_compact_circuit_primary_unavailable", ...(primary?.verification.issues || [])])],
            file,
            recovered_from_backup: true,
        };
    }
    const invalidIssues = [
        ...(primary?.verification.issues || []),
        ...(backup?.verification.issues || []),
    ];
    if (fs.existsSync(file) || fs.existsSync(`${file}.bak`)) {
        return {
            ...emptyLedger(id, sessionId, file),
            state: "fail_closed",
            blocked: true,
            checksum_valid: false,
            issues: [...new Set(invalidIssues.length ? invalidIssues : ["auto_compact_circuit_unreadable"])],
        };
    }
    return { ...emptyLedger(id, sessionId, file), blocked: false, issues: [] };
}
function recordGroupMemoryAutoCompactCircuitBreakerOutcome(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const outcome = String(input.outcome || "").trim();
    const attemptId = String(input.attemptId || input.attempt_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("auto compact circuit breaker requires groupId + gcs_* identity");
    if (!attemptId)
        throw new Error("auto compact circuit breaker requires attemptId");
    // clean_run = 本轮压缩流程正常跑完但低于阈值被跳过：同样是流水线健康的证据，必须能闭合熔断。
    if (!["failure", "success", "clean_run"].includes(outcome))
        throw new Error("auto compact circuit breaker outcome must be failure, success or clean_run");
    const healthy = outcome === "success" || outcome === "clean_run";
    const classification = healthy
        ? { failureMode: "transient", errorClass: "", countsTowardCircuit: false }
        : (0, group_memory_auto_compact_circuit_policy_1.classifyAutoCompactFailure)(input.error || input.errorClass || input.error_class || input.reason);
    const failureMode = String(input.failureMode || input.failure_mode || "")
        || classification.failureMode;
    const file = getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId);
        const now = String(input.at || input.recordedAt || input.recorded_at || new Date().toISOString());
        if (current.last_attempt_id === attemptId)
            return { ...current, idempotent: true, recorded: false };
        if (current.state === "fail_closed" && !healthy)
            return { ...current, idempotent: false, recorded: false };
        const previousFailures = current.state === "fail_closed" ? exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES : Number(current.consecutive_failures || 0);
        // 用户主动取消不是流水线故障，不计入熔断。
        const counted = !healthy && classification.countsTowardCircuit;
        const consecutiveFailures = healthy
            ? 0
            : counted
                ? Math.min(exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES, previousFailures + 1)
                : previousFailures;
        const state = consecutiveFailures >= exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES ? "open" : "closed";
        const previousState = String(current.state || "closed");
        const openCount = state === "open"
            ? Number(current.open_count || 0) + (previousState === "open" ? 0 : 1)
            : Number(current.open_count || 0);
        const effectiveFailureMode = healthy ? "" : failureMode;
        const eventCore = {
            attempt_id: attemptId,
            outcome,
            reason: String(input.reason || (healthy ? `compact_${outcome}` : "compact_failed")).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
            error_class: String(input.errorClass || input.error_class || classification.errorClass || "").replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 100),
            error_fingerprint: input.error ? checksum(String(input.error), 24) : "",
            failure_mode: effectiveFailureMode,
            counted,
            consecutive_failures: consecutiveFailures,
            state,
            recorded_at: now,
        };
        const event = { event_id: `acbe_${checksum([groupId, groupSessionId, eventCore], 24)}`, ...eventCore };
        const payload = {
            schema: exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA,
            version: 1,
            group_id: groupId,
            group_session_id: groupSessionId,
            scope_id: `${groupId}::${groupSessionId}`,
            state,
            consecutive_failures: consecutiveFailures,
            max_consecutive_failures: exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES,
            failure_mode: effectiveFailureMode,
            open_count: openCount,
            revision: Number(current.revision || 0) + 1,
            // 重新打开时刷新 opened_at，否则退避窗口会锚在很久以前的第一次打开上。
            opened_at: state === "open" ? String(previousState === "open" ? current.opened_at || now : now) : "",
            last_failure_at: counted ? now : String(current.last_failure_at || ""),
            last_success_at: healthy ? now : String(current.last_success_at || ""),
            last_attempt_id: attemptId,
            recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event].slice(-80),
            updated_at: now,
        };
        const saved = { ...payload, ledger_checksum: ledgerChecksum(payload) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, saved);
        return { ...saved, checksum_valid: true, blocked: state === "open", issues: [], file, idempotent: false, recorded: true };
    });
}
/** 读取台账并按冷却策略推导本次调度是否放行（closed / half_open 试探 / open）。 */
function readGroupMemoryAutoCompactCircuitAdmission(groupId, groupSessionId, options = {}) {
    const ledger = readGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId);
    const admission = (0, group_memory_auto_compact_circuit_policy_1.evaluateAutoCompactCircuitAdmission)(ledger, options);
    return { ...admission, ledger };
}
/**
 * 人工重置：把熔断台账写回 closed。相较直接删除文件，这里保留 revision 与
 * 重置事件，便于审计「谁在什么时候解开了熔断」。
 */
function resetGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId, options = {}) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    if (!id || !sessionId.startsWith("gcs_"))
        throw new Error("auto compact circuit breaker reset requires groupId + gcs_* identity");
    const file = getGroupMemoryAutoCompactCircuitBreakerFile(id, sessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupMemoryAutoCompactCircuitBreaker(id, sessionId);
        const now = String(options.at || new Date().toISOString());
        const eventCore = {
            attempt_id: `reset_${checksum([id, sessionId, now], 16)}`,
            outcome: "reset",
            reason: String(options.reason || "manual_reset").replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
            error_class: "",
            error_fingerprint: "",
            failure_mode: "",
            counted: false,
            consecutive_failures: 0,
            state: "closed",
            actor: String(options.actor || "local-user").replace(/[^a-zA-Z0-9._@:-]+/g, "_").slice(0, 80),
            recorded_at: now,
        };
        const event = { event_id: `acbe_${checksum([id, sessionId, eventCore], 24)}`, ...eventCore };
        const payload = {
            schema: exports.GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA,
            version: 1,
            group_id: id,
            group_session_id: sessionId,
            scope_id: `${id}::${sessionId}`,
            state: "closed",
            consecutive_failures: 0,
            max_consecutive_failures: exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES,
            failure_mode: "",
            // 保留历史打开次数，退避阶梯不因一次人工重置而清零。
            open_count: Number(current.open_count || 0),
            revision: Number(current.revision || 0) + 1,
            opened_at: "",
            last_failure_at: String(current.last_failure_at || ""),
            last_success_at: String(current.last_success_at || ""),
            last_attempt_id: event.attempt_id,
            recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event].slice(-80),
            updated_at: now,
        };
        const saved = { ...payload, ledger_checksum: ledgerChecksum(payload) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, saved);
        return { ...saved, checksum_valid: true, blocked: false, issues: [], file, reset: true, previousState: String(current.state || "") };
    });
}
function deleteGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId) {
    const file = getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let deleted = 0;
        for (const candidate of [file, `${file}.bak`]) {
            try {
                if (fs.existsSync(candidate)) {
                    fs.unlinkSync(candidate);
                    deleted += 1;
                }
            }
            catch { }
        }
        return { deleted, groupId, groupSessionId, file };
    });
}
//# sourceMappingURL=group-memory-auto-compact-circuit-breaker.js.map