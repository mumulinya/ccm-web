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
exports.GROUP_REACTIVE_COMPACT_RETRY_LEASE_MS = exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_DIR = exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA = void 0;
exports.getGroupReactiveCompactRetryOwnershipFile = getGroupReactiveCompactRetryOwnershipFile;
exports.verifyGroupReactiveCompactRetryOwnership = verifyGroupReactiveCompactRetryOwnership;
exports.readGroupReactiveCompactRetryOwnership = readGroupReactiveCompactRetryOwnership;
exports.claimGroupReactiveCompactRetry = claimGroupReactiveCompactRetry;
exports.completeGroupReactiveCompactRetry = completeGroupReactiveCompactRetry;
exports.deleteGroupReactiveCompactRetryOwnership = deleteGroupReactiveCompactRetryOwnership;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA = "ccm-group-reactive-compact-retry-ownership-v1";
exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_DIR = path.join(utils_1.CCM_DIR, "group-reactive-compact-retry-ownership");
exports.GROUP_REACTIVE_COMPACT_RETRY_LEASE_MS = 2 * 60 * 1000;
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
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180) || "unknown";
}
function ledgerChecksum(ledger) {
    const payload = { ...(ledger || {}) };
    delete payload.ledger_checksum;
    delete payload.checksum_valid;
    delete payload.file;
    delete payload.recovered_from_backup;
    delete payload.blocked;
    delete payload.issues;
    return checksum(payload);
}
function processAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function normalizeChannel(value) {
    return String(value || "group_main_prompt_too_long").trim().replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 100);
}
function normalizeEpoch(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 220);
}
function entryKey(channel, retryEpoch) {
    return `${channel}::${retryEpoch}`;
}
function getGroupReactiveCompactRetryOwnershipFile(groupId, groupSessionId) {
    return path.join(exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_DIR, clean(groupId), `${clean(groupSessionId)}.json`);
}
function emptyLedger(groupId, groupSessionId, file) {
    return {
        schema: exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA,
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        scope_id: `${groupId}::${groupSessionId}`,
        revision: 0,
        next_fencing_token: 1,
        entries: [],
        updated_at: "",
        ledger_checksum: "",
        checksum_valid: true,
        file,
    };
}
function verifyGroupReactiveCompactRetryOwnership(ledger, expected = {}) {
    const issues = [];
    if (ledger?.schema !== exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA || Number(ledger?.version || 0) !== 1)
        issues.push("reactive_compact_retry_ownership_schema_invalid");
    if (!String(ledger?.group_id || ""))
        issues.push("reactive_compact_retry_ownership_group_missing");
    if (!String(ledger?.group_session_id || "").startsWith("gcs_"))
        issues.push("reactive_compact_retry_ownership_exact_session_missing");
    if (String(ledger?.scope_id || "") !== `${String(ledger?.group_id || "")}::${String(ledger?.group_session_id || "")}`)
        issues.push("reactive_compact_retry_ownership_scope_invalid");
    if (!Array.isArray(ledger?.entries))
        issues.push("reactive_compact_retry_ownership_entries_invalid");
    if (!Number.isInteger(Number(ledger?.revision || 0)) || Number(ledger?.revision || 0) < 0)
        issues.push("reactive_compact_retry_ownership_revision_invalid");
    if (!Number.isInteger(Number(ledger?.next_fencing_token || 0)) || Number(ledger?.next_fencing_token || 0) < 1)
        issues.push("reactive_compact_retry_ownership_fence_invalid");
    const keys = new Set();
    for (const entry of Array.isArray(ledger?.entries) ? ledger.entries : []) {
        const channel = normalizeChannel(entry?.channel);
        const retryEpoch = normalizeEpoch(entry?.retry_epoch);
        const key = entryKey(channel, retryEpoch);
        if (!retryEpoch)
            issues.push("reactive_compact_retry_epoch_missing");
        if (keys.has(key))
            issues.push("reactive_compact_retry_epoch_duplicate");
        keys.add(key);
        if (!String(entry?.entry_id || ""))
            issues.push("reactive_compact_retry_entry_id_missing");
        if (!["claimed", "recovered", "failed"].includes(String(entry?.state || "")))
            issues.push("reactive_compact_retry_state_invalid");
        if (!Number.isInteger(Number(entry?.fencing_token || 0)) || Number(entry?.fencing_token || 0) < 1)
            issues.push("reactive_compact_retry_entry_fence_invalid");
        if (!String(entry?.claim_id || ""))
            issues.push("reactive_compact_retry_claim_missing");
    }
    if (expected.groupId && String(ledger?.group_id || "") !== String(expected.groupId))
        issues.push("reactive_compact_retry_group_mismatch");
    if (expected.groupSessionId && String(ledger?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("reactive_compact_retry_group_session_mismatch");
    if (String(ledger?.ledger_checksum || "") !== ledgerChecksum(ledger))
        issues.push("reactive_compact_retry_ownership_checksum_invalid");
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function readCandidate(file, groupId, groupSessionId) {
    try {
        if (!fs.existsSync(file))
            return null;
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        return { ledger, verification: verifyGroupReactiveCompactRetryOwnership(ledger, { groupId, groupSessionId }) };
    }
    catch (error) {
        return { ledger: null, verification: { valid: false, issues: [String(error?.message || error).slice(0, 160)] } };
    }
}
function summarizeLedger(ledger) {
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    const totals = entries.reduce((result, entry) => {
        const state = ["claimed", "recovered", "failed"].includes(String(entry?.state || "")) ? String(entry.state) : "unknown";
        result[state] = Number(result[state] || 0) + 1;
        result.total += 1;
        return result;
    }, { total: 0, claimed: 0, recovered: 0, failed: 0, unknown: 0 });
    return { ...ledger, totals, latest_entry: entries.at(-1) || null };
}
function readGroupReactiveCompactRetryOwnership(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    const file = getGroupReactiveCompactRetryOwnershipFile(id, sessionId);
    if (!id || !sessionId.startsWith("gcs_")) {
        return summarizeLedger({
            ...emptyLedger(id, sessionId, file),
            state: "fail_closed",
            blocked: true,
            checksum_valid: false,
            issues: ["exact_group_session_required"],
        });
    }
    const primary = readCandidate(file, id, sessionId);
    if (primary?.verification.valid) {
        return summarizeLedger({ ...primary.ledger, checksum_valid: true, blocked: false, issues: [], file, recovered_from_backup: false });
    }
    const backup = readCandidate(`${file}.bak`, id, sessionId);
    if (backup?.verification.valid) {
        return summarizeLedger({
            ...backup.ledger,
            state: "fail_closed",
            blocked: true,
            checksum_valid: true,
            issues: [...new Set(["reactive_compact_retry_ownership_primary_unavailable", ...(primary?.verification.issues || [])])],
            file,
            recovered_from_backup: true,
        });
    }
    if (fs.existsSync(file) || fs.existsSync(`${file}.bak`)) {
        return summarizeLedger({
            ...emptyLedger(id, sessionId, file),
            state: "fail_closed",
            blocked: true,
            checksum_valid: false,
            issues: [...new Set([...(primary?.verification.issues || []), ...(backup?.verification.issues || []), "reactive_compact_retry_ownership_unreadable"])],
        });
    }
    return summarizeLedger({ ...emptyLedger(id, sessionId, file), blocked: false, issues: [] });
}
function leaseActive(entry, nowMs) {
    const ownerHost = String(entry?.owner_hostname || "");
    const ownerPid = Number(entry?.owner_pid || 0);
    if (ownerHost === os.hostname() && ownerPid > 0)
        return processAlive(ownerPid);
    const leaseMs = Date.parse(String(entry?.lease_expires_at || ""));
    return Number.isFinite(leaseMs) && leaseMs > nowMs;
}
function saveLedger(file, current, entries, now, nextFencingToken) {
    const payload = {
        schema: exports.GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA,
        version: 1,
        group_id: current.group_id,
        group_session_id: current.group_session_id,
        scope_id: current.scope_id,
        revision: Number(current.revision || 0) + 1,
        next_fencing_token: nextFencingToken,
        entries: entries.slice(-120),
        updated_at: now,
    };
    const saved = { ...payload, ledger_checksum: ledgerChecksum(payload) };
    (0, atomic_json_file_1.writeJsonAtomic)(file, saved);
    return summarizeLedger({ ...saved, checksum_valid: true, blocked: false, issues: [], file });
}
function claimGroupReactiveCompactRetry(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const channel = normalizeChannel(input.channel);
    const retryEpoch = normalizeEpoch(input.retryEpoch || input.retry_epoch || input.contextId || input.context_id);
    const claimId = String(input.claimId || input.claim_id || `rcco_${crypto.randomBytes(12).toString("hex")}`).trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("reactive compact retry ownership requires groupId + gcs_* identity");
    if (!retryEpoch)
        throw new Error("reactive compact retry ownership requires retry epoch");
    const file = getGroupReactiveCompactRetryOwnershipFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupReactiveCompactRetryOwnership(groupId, groupSessionId);
        if (current.blocked || current.state === "fail_closed")
            return { status: "fail_closed", acquired: false, ledger: current, issues: current.issues || [] };
        const nowMs = Number(input.nowMs || input.now_ms || Date.now());
        const now = String(input.at || new Date(nowMs).toISOString());
        const leaseMs = Math.max(5_000, Number(input.leaseMs || input.lease_ms || exports.GROUP_REACTIVE_COMPACT_RETRY_LEASE_MS));
        const key = entryKey(channel, retryEpoch);
        const entries = [...(current.entries || [])];
        const index = entries.findIndex((entry) => entryKey(normalizeChannel(entry.channel), normalizeEpoch(entry.retry_epoch)) === key);
        const existing = index >= 0 ? entries[index] : null;
        if (existing && ["recovered", "failed"].includes(String(existing.state || ""))) {
            return { status: "already_attempted", acquired: false, entry: existing, ledger: current };
        }
        if (existing?.state === "claimed" && existing.claim_id === claimId) {
            return { status: "current", acquired: false, entry: existing, ledger: current, idempotent: true };
        }
        if (existing?.state === "claimed" && leaseActive(existing, nowMs)) {
            return { status: "busy", acquired: false, entry: existing, ledger: current };
        }
        const fencingToken = Number(current.next_fencing_token || 1);
        const reclaimed = existing?.state === "claimed";
        const entry = {
            schema: "ccm-group-reactive-compact-retry-entry-v1",
            entry_id: String(existing?.entry_id || `rcre_${checksum([groupId, groupSessionId, channel, retryEpoch], 24)}`),
            channel,
            retry_epoch: retryEpoch,
            state: "claimed",
            claim_id: claimId,
            fencing_token: fencingToken,
            claim_generation: Number(existing?.claim_generation || 0) + 1,
            reclaimed,
            owner_pid: process.pid,
            owner_hostname: os.hostname(),
            lease_expires_at: new Date(nowMs + leaseMs).toISOString(),
            request_fingerprint: checksum(String(input.requestFingerprint || input.request_fingerprint || retryEpoch), 32),
            context_checksum: input.contextChecksum || input.context_checksum ? checksum(String(input.contextChecksum || input.context_checksum), 32) : "",
            input_chars: Math.max(0, Number(input.inputChars || input.input_chars || 0)),
            output_chars: 0,
            claimed_at: now,
            completed_at: "",
            outcome_reason: "",
            error_class: "",
            error_fingerprint: "",
        };
        if (index >= 0)
            entries[index] = entry;
        else
            entries.push(entry);
        const ledger = saveLedger(file, current, entries, now, fencingToken + 1);
        return { status: reclaimed ? "recovered_claim" : "acquired", acquired: true, reclaimed, entry, ledger };
    });
}
function completeGroupReactiveCompactRetry(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const channel = normalizeChannel(input.channel);
    const retryEpoch = normalizeEpoch(input.retryEpoch || input.retry_epoch || input.contextId || input.context_id);
    const claimId = String(input.claimId || input.claim_id || "").trim();
    const fencingToken = Number(input.fencingToken || input.fencing_token || 0);
    const outcome = String(input.outcome || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_") || !retryEpoch || !claimId || !Number.isInteger(fencingToken) || fencingToken < 1)
        throw new Error("reactive compact retry completion requires exact scope and fencing identity");
    if (!['recovered', 'failed'].includes(outcome))
        throw new Error("reactive compact retry completion outcome must be recovered or failed");
    const file = getGroupReactiveCompactRetryOwnershipFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupReactiveCompactRetryOwnership(groupId, groupSessionId);
        if (current.blocked || current.state === "fail_closed")
            return { status: "fail_closed", accepted: false, ledger: current, issues: current.issues || [] };
        const key = entryKey(channel, retryEpoch);
        const entries = [...(current.entries || [])];
        const index = entries.findIndex((entry) => entryKey(normalizeChannel(entry.channel), normalizeEpoch(entry.retry_epoch)) === key);
        const existing = index >= 0 ? entries[index] : null;
        if (!existing)
            return { status: "missing_claim", accepted: false, ledger: current };
        if (existing.claim_id !== claimId || Number(existing.fencing_token || 0) !== fencingToken || existing.state !== "claimed") {
            return { status: "stale_rejected", accepted: false, entry: existing, ledger: current };
        }
        const now = String(input.at || new Date(Number(input.nowMs || input.now_ms || Date.now())).toISOString());
        const completed = {
            ...existing,
            state: outcome,
            output_chars: Math.max(0, Number(input.outputChars || input.output_chars || 0)),
            completed_at: now,
            outcome_reason: String(input.reason || outcome).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
            error_class: String(input.errorClass || input.error_class || "").replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 100),
            error_fingerprint: input.error ? checksum(String(input.error), 24) : "",
        };
        entries[index] = completed;
        const ledger = saveLedger(file, current, entries, now, Number(current.next_fencing_token || fencingToken + 1));
        return { status: outcome, accepted: true, entry: completed, ledger };
    });
}
function deleteGroupReactiveCompactRetryOwnership(groupId, groupSessionId) {
    const file = getGroupReactiveCompactRetryOwnershipFile(groupId, groupSessionId);
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
//# sourceMappingURL=group-reactive-compact-retry-ownership.js.map