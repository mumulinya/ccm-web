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
exports.deleteGroupMemoryAutoCompactCircuitBreaker = deleteGroupMemoryAutoCompactCircuitBreaker;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
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
    if (!["failure", "success"].includes(outcome))
        throw new Error("auto compact circuit breaker outcome must be failure or success");
    const file = getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId);
        const now = String(input.at || input.recordedAt || input.recorded_at || new Date().toISOString());
        if (current.last_attempt_id === attemptId)
            return { ...current, idempotent: true, recorded: false };
        if (current.state === "fail_closed" && outcome !== "success")
            return { ...current, idempotent: false, recorded: false };
        const previousFailures = current.state === "fail_closed" ? exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES : Number(current.consecutive_failures || 0);
        const consecutiveFailures = outcome === "success"
            ? 0
            : Math.min(exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES, previousFailures + 1);
        const state = consecutiveFailures >= exports.GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES ? "open" : "closed";
        const eventCore = {
            attempt_id: attemptId,
            outcome,
            reason: String(input.reason || (outcome === "success" ? "compact_succeeded" : "compact_failed")).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
            error_class: String(input.errorClass || input.error_class || "").replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 100),
            error_fingerprint: input.error ? checksum(String(input.error), 24) : "",
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
            revision: Number(current.revision || 0) + 1,
            opened_at: state === "open" ? String(current.opened_at || now) : "",
            last_failure_at: outcome === "failure" ? now : String(current.last_failure_at || ""),
            last_success_at: outcome === "success" ? now : String(current.last_success_at || ""),
            last_attempt_id: attemptId,
            recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event].slice(-80),
            updated_at: now,
        };
        const saved = { ...payload, ledger_checksum: ledgerChecksum(payload) };
        (0, atomic_json_file_1.writeJsonAtomic)(file, saved);
        return { ...saved, checksum_valid: true, blocked: state === "open", issues: [], file, idempotent: false, recorded: true };
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