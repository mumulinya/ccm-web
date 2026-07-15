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
exports.getGroupPromptCacheBreakDetectionFile = getGroupPromptCacheBreakDetectionFile;
exports.readGroupPromptCacheBreakDetection = readGroupPromptCacheBreakDetection;
exports.verifyGroupPromptCacheCompactionNotification = verifyGroupPromptCacheCompactionNotification;
exports.notifyGroupPromptCacheCompaction = notifyGroupPromptCacheCompaction;
exports.verifyGroupPromptCacheDeletionNotification = verifyGroupPromptCacheDeletionNotification;
exports.notifyGroupPromptCacheDeletion = notifyGroupPromptCacheDeletion;
exports.recordGroupPromptCacheUsage = recordGroupPromptCacheUsage;
exports.deleteGroupPromptCacheBreakDetection = deleteGroupPromptCacheBreakDetection;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const ROOT = path.join(os.homedir(), ".cc-connect", "group-prompt-cache-break-detection");
const SCHEMA = "ccm-group-prompt-cache-break-ledger-v1";
const NOTIFICATION_SCHEMA = "ccm-group-prompt-cache-compaction-notification-v1";
const CACHE_DELETION_NOTIFICATION_SCHEMA = "ccm-group-prompt-cache-deletion-notification-v1";
const VERSION = 1;
const MIN_CACHE_MISS_TOKENS = 2_000;
const MAX_EVENTS = 64;
function clean(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function sha(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}
function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function ledgerChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.file;
    delete payload.ledger_checksum;
    delete payload.checksum_valid;
    delete payload.recovered_from_backup;
    return sha(payload);
}
function receiptChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    return sha(payload);
}
function eventChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.event_checksum;
    return sha(payload);
}
function getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId) {
    return path.join(ROOT, clean(groupId), `${clean(groupSessionId)}.json`);
}
function emptyLedger(groupId, groupSessionId) {
    return {
        schema: SCHEMA,
        version: VERSION,
        group_id: String(groupId || ""),
        group_session_id: String(groupSessionId || ""),
        scope_id: `${String(groupId || "")}--${String(groupSessionId || "")}`,
        status: "empty",
        revision: 0,
        call_count: 0,
        cache_break_count: 0,
        baseline_generation: 0,
        previous_cache_read_tokens: null,
        pending_post_compaction: null,
        pending_cache_deletion: null,
        cache_deletion_notification_count: 0,
        cache_deletion_consumed_count: 0,
        recent_cache_deletion_notifications: [],
        last_event: null,
        recent_events: [],
        updated_at: "",
    };
}
function validateLedger(value, groupId, groupSessionId) {
    const issues = [];
    if (value?.schema !== SCHEMA || Number(value?.version || 0) !== VERSION)
        issues.push("schema_invalid");
    if (String(value?.group_id || "") !== groupId)
        issues.push("group_mismatch");
    if (String(value?.group_session_id || "") !== groupSessionId)
        issues.push("session_mismatch");
    if (String(value?.scope_id || "") !== `${groupId}--${groupSessionId}`)
        issues.push("scope_mismatch");
    if (String(value?.ledger_checksum || "") !== ledgerChecksum(value))
        issues.push("checksum_invalid");
    return { valid: issues.length === 0, issues };
}
function parseLedgerFile(file, groupId, groupSessionId) {
    try {
        const value = JSON.parse(fs.readFileSync(file, "utf-8"));
        const verification = validateLedger(value, groupId, groupSessionId);
        return { present: true, value, ...verification };
    }
    catch (error) {
        return { present: fs.existsSync(file), value: null, valid: false, issues: [error?.message || "parse_failed"] };
    }
}
function persistLedger(file, value) {
    const core = {
        ...value,
        recent_events: (Array.isArray(value?.recent_events) ? value.recent_events : []).slice(-MAX_EVENTS),
    };
    const stored = { ...core, ledger_checksum: ledgerChecksum(core) };
    (0, atomic_json_file_1.writeJsonAtomic)(file, stored);
    return { ...stored, file, checksum_valid: true };
}
function readGroupPromptCacheBreakDetection(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    const file = getGroupPromptCacheBreakDetectionFile(id, sessionId);
    const primary = parseLedgerFile(file, id, sessionId);
    if (primary.present && primary.valid)
        return { ...primary.value, file, checksum_valid: true, recovered_from_backup: false };
    const backup = parseLedgerFile(`${file}.bak`, id, sessionId);
    if (backup.present && backup.valid)
        return { ...backup.value, file, checksum_valid: true, recovered_from_backup: true };
    if (!primary.present && !backup.present) {
        const value = emptyLedger(id, sessionId);
        return { ...value, file, ledger_checksum: ledgerChecksum(value), checksum_valid: true, recovered_from_backup: false };
    }
    const value = emptyLedger(id, sessionId);
    return {
        ...value,
        status: "fail_closed",
        file,
        checksum_valid: false,
        recovered_from_backup: false,
        issues: [...primary.issues, ...backup.issues].slice(0, 8),
    };
}
function verifyGroupPromptCacheCompactionNotification(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== NOTIFICATION_SCHEMA || Number(receipt?.version || 0) !== VERSION)
        issues.push("prompt_cache_compaction_notification_schema_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("prompt_cache_compaction_notification_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("prompt_cache_compaction_notification_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`)
        issues.push("prompt_cache_compaction_notification_scope_invalid");
    if (!String(receipt?.boundary_id || ""))
        issues.push("prompt_cache_compaction_notification_boundary_missing");
    if (!String(receipt?.post_compact_session_state_reset_checksum || ""))
        issues.push("prompt_cache_compaction_notification_reset_receipt_missing");
    if (Number(receipt?.baseline_generation || 0) < 1)
        issues.push("prompt_cache_compaction_notification_generation_invalid");
    if (receipt?.baseline_status !== "reset_pending_next_api_success")
        issues.push("prompt_cache_compaction_notification_status_invalid");
    if (receipt?.body_free !== true)
        issues.push("prompt_cache_compaction_notification_body_free_missing");
    if (String(receipt?.receipt_checksum || "") !== receiptChecksum(receipt))
        issues.push("prompt_cache_compaction_notification_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("prompt_cache_compaction_notification_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("prompt_cache_compaction_notification_session_mismatch");
    if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId))
        issues.push("prompt_cache_compaction_notification_boundary_mismatch");
    if (expected.resetReceiptChecksum && String(receipt?.post_compact_session_state_reset_checksum || "") !== String(expected.resetReceiptChecksum))
        issues.push("prompt_cache_compaction_notification_reset_receipt_mismatch");
    return { valid: issues.length === 0, issues };
}
function notifyGroupPromptCacheCompaction(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_prompt_cache_compaction_notification");
    const boundaryId = String(input.boundaryId || input.boundary_id || "").trim();
    const resetReceiptChecksum = String(input.resetReceiptChecksum || input.reset_receipt_checksum || "").trim();
    const generation = Math.max(1, Number(input.generation || input.baseline_generation || 1));
    if (!boundaryId || !resetReceiptChecksum)
        throw new Error("compact_boundary_and_reset_receipt_required_for_prompt_cache_notification");
    const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
        if (current.pending_post_compaction?.boundary_id === boundaryId
            && current.pending_post_compaction?.post_compact_session_state_reset_checksum === resetReceiptChecksum) {
            return current.pending_post_compaction.notification;
        }
        const notifiedAt = String(input.notifiedAt || input.notified_at || new Date().toISOString());
        const core = {
            schema: NOTIFICATION_SCHEMA,
            version: VERSION,
            group_id: groupId,
            group_session_id: groupSessionId,
            scope_id: `${groupId}--${groupSessionId}`,
            boundary_id: boundaryId,
            post_compact_session_state_reset_checksum: resetReceiptChecksum,
            previous_cache_read_tokens: current.checksum_valid === true ? current.previous_cache_read_tokens : null,
            previous_baseline_generation: current.checksum_valid === true ? Number(current.baseline_generation || 0) : 0,
            baseline_generation: generation,
            baseline_status: "reset_pending_next_api_success",
            body_free: true,
            notified_at: notifiedAt,
        };
        const notification = { ...core, receipt_checksum: receiptChecksum(core) };
        persistLedger(file, {
            ...(current.checksum_valid === true ? current : emptyLedger(groupId, groupSessionId)),
            status: "post_compaction_pending",
            revision: Math.max(0, Number(current.revision || 0)) + 1,
            baseline_generation: generation,
            previous_cache_read_tokens: null,
            pending_post_compaction: {
                boundary_id: boundaryId,
                generation,
                post_compact_session_state_reset_checksum: resetReceiptChecksum,
                notification,
            },
            updated_at: notifiedAt,
        });
        return notification;
    });
}
function verifyGroupPromptCacheDeletionNotification(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== CACHE_DELETION_NOTIFICATION_SCHEMA || Number(receipt?.version || 0) !== VERSION)
        issues.push("prompt_cache_deletion_notification_schema_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("prompt_cache_deletion_notification_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("prompt_cache_deletion_notification_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`)
        issues.push("prompt_cache_deletion_notification_scope_invalid");
    if (!String(receipt?.execution_receipt_id || ""))
        issues.push("prompt_cache_deletion_notification_execution_receipt_missing");
    if (!String(receipt?.execution_receipt_checksum || ""))
        issues.push("prompt_cache_deletion_notification_execution_checksum_missing");
    if (!String(receipt?.plan_checksum || "") || !String(receipt?.apply_plan_checksum || ""))
        issues.push("prompt_cache_deletion_notification_plan_binding_missing");
    if (Number(receipt?.applied_edit_count || 0) < 1 || Number(receipt?.cleared_input_tokens || 0) < 1)
        issues.push("prompt_cache_deletion_notification_applied_edit_missing");
    if (receipt?.cache_deletion_status !== "pending_next_api_usage")
        issues.push("prompt_cache_deletion_notification_status_invalid");
    if (receipt?.body_free !== true)
        issues.push("prompt_cache_deletion_notification_body_free_missing");
    if (String(receipt?.receipt_checksum || "") !== receiptChecksum(receipt))
        issues.push("prompt_cache_deletion_notification_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("prompt_cache_deletion_notification_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("prompt_cache_deletion_notification_session_mismatch");
    if (expected.executionReceiptId && String(receipt?.execution_receipt_id || "") !== String(expected.executionReceiptId))
        issues.push("prompt_cache_deletion_notification_execution_receipt_mismatch");
    if (expected.executionReceiptChecksum && String(receipt?.execution_receipt_checksum || "") !== String(expected.executionReceiptChecksum))
        issues.push("prompt_cache_deletion_notification_execution_checksum_mismatch");
    return { valid: issues.length === 0, issues };
}
function notifyGroupPromptCacheDeletion(input = {}) {
    const executionReceipt = input.executionReceipt?.receipt || input.execution_receipt?.receipt
        || input.executionReceipt || input.execution_receipt || input.receipt || {};
    const groupId = String(input.groupId || input.group_id || executionReceipt.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || executionReceipt.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_prompt_cache_deletion_notification");
    const executionVerification = (0, provider_native_compact_execution_receipt_1.verifyProviderNativeCompactExecutionReceipt)(executionReceipt, { groupId, groupSessionId });
    const strongOutcome = executionVerification.valid
        && executionReceipt.status === "native_applied"
        && executionReceipt.strong_proof === true
        && executionReceipt.provider_outcome_verified === true
        && Number(executionReceipt.applied_edit_count || 0) >= 1
        && Number(executionReceipt.cleared_input_tokens || 0) > 0;
    if (!strongOutcome)
        throw new Error(`strong_native_microcompact_receipt_required:${executionVerification.issues.join(",") || executionReceipt.status || "unverified"}`);
    const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
        if (current.checksum_valid !== true)
            throw new Error("prompt_cache_ledger_fail_closed");
        const executionReceiptId = String(executionReceipt.receipt_id || "");
        const known = (Array.isArray(current.recent_cache_deletion_notifications) ? current.recent_cache_deletion_notifications : [])
            .find((entry) => entry.execution_receipt_id === executionReceiptId
            && entry.execution_receipt_checksum === executionReceipt.receipt_checksum);
        if (known)
            return known;
        const notifiedAt = String(input.notifiedAt || input.notified_at || new Date().toISOString());
        const core = {
            schema: CACHE_DELETION_NOTIFICATION_SCHEMA,
            version: VERSION,
            group_id: groupId,
            group_session_id: groupSessionId,
            scope_id: `${groupId}--${groupSessionId}`,
            execution_receipt_id: executionReceiptId,
            execution_receipt_checksum: String(executionReceipt.receipt_checksum || ""),
            plan_checksum: String(executionReceipt.plan_checksum || ""),
            apply_plan_checksum: String(executionReceipt.apply_plan_checksum || ""),
            provider_request_id: String(executionReceipt.provider_request_id || ""),
            applied_edit_count: Number(executionReceipt.applied_edit_count || 0),
            cleared_input_tokens: Number(executionReceipt.cleared_input_tokens || 0),
            baseline_generation: Math.max(0, Number(current.baseline_generation || 0)),
            previous_cache_read_tokens: current.previous_cache_read_tokens,
            cache_deletion_status: "pending_next_api_usage",
            body_free: true,
            notified_at: notifiedAt,
        };
        const notification = { ...core, receipt_checksum: receiptChecksum(core) };
        persistLedger(file, {
            ...current,
            status: "cache_deletion_pending",
            revision: Math.max(0, Number(current.revision || 0)) + 1,
            pending_cache_deletion: { notification, execution_receipt_id: executionReceiptId },
            cache_deletion_notification_count: Math.max(0, Number(current.cache_deletion_notification_count || 0)) + 1,
            recent_cache_deletion_notifications: [
                ...(Array.isArray(current.recent_cache_deletion_notifications) ? current.recent_cache_deletion_notifications : []),
                notification,
            ].slice(-MAX_EVENTS),
            updated_at: notifiedAt,
        });
        return notification;
    });
}
function recordGroupPromptCacheUsage(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        return { recorded: false, reason: "exact_group_session_required" };
    const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
        if (current.checksum_valid !== true)
            return { recorded: false, reason: "prompt_cache_ledger_fail_closed", ledger: current };
        const usage = input.usage || {};
        const provider = String(input.provider || "unknown").toLowerCase();
        const cacheRead = finite(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens);
        const cacheCreation = finite(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens);
        const directInput = finite(usage.directInputTokens ?? usage.direct_input_tokens);
        const previous = current.previous_cache_read_tokens === null || current.previous_cache_read_tokens === undefined
            ? null
            : finite(current.previous_cache_read_tokens);
        const pending = current.pending_post_compaction || null;
        const deletionPending = current.pending_cache_deletion || null;
        const deletionNotification = deletionPending?.notification || null;
        const isPostCompaction = !!pending?.boundary_id;
        const isCacheDeletion = !!deletionNotification?.execution_receipt_id;
        const tokenDrop = previous === null ? 0 : Math.max(0, previous - cacheRead);
        const dropRatio = previous && tokenDrop > 0 ? tokenDrop / previous : 0;
        const cacheBreak = provider === "anthropic"
            && !isPostCompaction
            && !isCacheDeletion
            && previous !== null
            && cacheRead < previous * 0.95
            && tokenDrop >= MIN_CACHE_MISS_TOKENS;
        const classification = provider !== "anthropic"
            ? "unsupported_provider"
            : isPostCompaction
                ? "post_compaction_baseline_reset"
                : isCacheDeletion
                    ? "expected_microcompact_cache_deletion"
                    : previous === null
                        ? "baseline_initialized"
                        : cacheBreak ? "cache_break" : "cache_stable";
        const at = String(input.at || new Date().toISOString());
        const eventCore = {
            schema: "ccm-group-prompt-cache-usage-event-v1",
            version: VERSION,
            event_id: `gpcu_${sha(`${groupId}\0${groupSessionId}\0${Number(current.call_count || 0) + 1}\0${at}`, 24)}`,
            group_id: groupId,
            group_session_id: groupSessionId,
            source: String(input.source || "group_main"),
            provider,
            model: String(input.model || ""),
            call_number: Number(current.call_count || 0) + 1,
            baseline_generation: Math.max(0, Number(current.baseline_generation || 0)),
            previous_cache_read_tokens: previous,
            cache_read_input_tokens: cacheRead,
            cache_creation_input_tokens: cacheCreation,
            direct_input_tokens: directInput,
            token_drop: tokenDrop,
            drop_ratio: Math.round(dropRatio * 10_000) / 10_000,
            classification,
            cache_break: cacheBreak,
            is_post_compaction: isPostCompaction,
            post_compact_boundary_id: String(pending?.boundary_id || ""),
            post_compact_notification_checksum: String(pending?.notification?.receipt_checksum || ""),
            cache_deletion_applied: isCacheDeletion,
            cache_deletion_notification_checksum: String(deletionNotification?.receipt_checksum || ""),
            microcompact_execution_receipt_id: String(deletionNotification?.execution_receipt_id || ""),
            microcompact_execution_receipt_checksum: String(deletionNotification?.execution_receipt_checksum || ""),
            microcompact_cleared_input_tokens: Number(deletionNotification?.cleared_input_tokens || 0),
            request_id: String(input.requestId || input.request_id || ""),
            body_free: true,
            recorded_at: at,
        };
        const event = { ...eventCore, event_checksum: eventChecksum(eventCore) };
        const stored = persistLedger(file, {
            ...current,
            status: cacheBreak ? "cache_break_detected" : "tracking",
            revision: Math.max(0, Number(current.revision || 0)) + 1,
            call_count: event.call_number,
            cache_break_count: Math.max(0, Number(current.cache_break_count || 0)) + (cacheBreak ? 1 : 0),
            previous_cache_read_tokens: provider === "anthropic" ? cacheRead : current.previous_cache_read_tokens,
            pending_post_compaction: null,
            pending_cache_deletion: null,
            cache_deletion_consumed_count: Math.max(0, Number(current.cache_deletion_consumed_count || 0)) + (isCacheDeletion ? 1 : 0),
            last_event: event,
            recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event],
            updated_at: at,
        });
        return { recorded: true, event, ledger: stored };
    });
}
function deleteGroupPromptCacheBreakDetection(groupId, groupSessionId) {
    const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
    let deleted = 0;
    for (const target of [file, `${file}.bak`, `${file}.lock`]) {
        try {
            if (fs.existsSync(target)) {
                fs.unlinkSync(target);
                deleted += 1;
            }
        }
        catch { }
    }
    return { file, deleted };
}
//# sourceMappingURL=group-prompt-cache-break-detection.js.map