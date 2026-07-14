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
exports.GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS = exports.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS = exports.GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION = exports.GROUP_COMPACTION_HOOK_LEDGER_VERSION = exports.GROUP_COMPACT_STRATEGY_DECISION_VERSION = exports.GROUP_PRESERVED_SEGMENT_VERSION = exports.GROUP_PTL_RECOVERY_VERSION = exports.GROUP_PTL_EMERGENCY_VERSION = exports.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT = exports.GROUP_PARTIAL_COMPACT_VERSION = exports.GROUP_POST_COMPACT_VERIFICATION_BUDGET = exports.GROUP_POST_COMPACT_SKILL_BUDGET = exports.GROUP_POST_COMPACT_FILE_BUDGET = exports.GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION = exports.GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION = exports.GROUP_POST_COMPACT_REINJECT_VERSION = exports.GROUP_TIME_BASED_MC_CLEARED_MESSAGE = exports.GROUP_TIME_BASED_MICRO_COMPACT_VERSION = exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA = exports.GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS = exports.GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION = exports.GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION = exports.GROUP_MICRO_COMPACT_MAX_RECORDS = exports.GROUP_MICRO_COMPACT_VERSION = exports.GROUP_COMPACT_MAX_ACTIVE_MESSAGES = exports.GROUP_MANUAL_COMPACT_BUFFER_TOKENS = exports.GROUP_ERROR_BUFFER_TOKENS = exports.GROUP_WARNING_BUFFER_TOKENS = exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS = exports.GROUP_CONTEXT_RESERVED_TOKENS = exports.GROUP_CONTEXT_WINDOW_DEFAULT = exports.GROUP_FACT_ANCHOR_LIMIT = exports.GROUP_COMPACT_MODEL_RETRY_MS = exports.GROUP_COMPACT_MAX_FAILURES = exports.GROUP_COMPACT_MAX_KEEP_TOKENS = exports.GROUP_COMPACT_MIN_KEEP_TOKENS = exports.GROUP_COMPACT_MIN_KEEP_MESSAGES = exports.GROUP_COMPACT_TRIGGER_TOKENS = exports.GROUP_MEMORY_COMPACTION_VERSION = void 0;
exports.buildGroupCompactEpoch = buildGroupCompactEpoch;
exports.verifyGroupCompactTransactionReceipt = verifyGroupCompactTransactionReceipt;
exports.buildGroupCompactTransactionReceipt = buildGroupCompactTransactionReceipt;
exports.getGroupMemoryCompactionHookLedgerFile = getGroupMemoryCompactionHookLedgerFile;
exports.readGroupMemoryCompactionHookLedger = readGroupMemoryCompactionHookLedger;
exports.registerGroupMemoryCompactionHook = registerGroupMemoryCompactionHook;
exports.evaluateGroupMemorySummaryQuality = evaluateGroupMemorySummaryQuality;
exports.estimateGroupTextTokens = estimateGroupTextTokens;
exports.estimateGroupMessageTokens = estimateGroupMessageTokens;
exports.calculateGroupMessagesToKeepIndex = calculateGroupMessagesToKeepIndex;
exports.buildGroupPreservedSegment = buildGroupPreservedSegment;
exports.buildGroupApiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan;
exports.buildGroupApiMicrocompactNativeApplyPlan = buildGroupApiMicrocompactNativeApplyPlan;
exports.buildGroupCompactStrategyDecision = buildGroupCompactStrategyDecision;
exports.buildGroupPtlRecoveryPlan = buildGroupPtlRecoveryPlan;
exports.getGroupAutoCompactThreshold = getGroupAutoCompactThreshold;
exports.resolveGroupModelContextCapacity = resolveGroupModelContextCapacity;
exports.getGroupEffectiveContextWindow = getGroupEffectiveContextWindow;
exports.calculateGroupCompactWarningState = calculateGroupCompactWarningState;
exports.buildGroupMicroCompactPlan = buildGroupMicroCompactPlan;
exports.buildPostCompactReinjectionPlan = buildPostCompactReinjectionPlan;
exports.buildGroupPostCompactRecoveryAudit = buildGroupPostCompactRecoveryAudit;
exports.buildGroupPostCompactCleanupAudit = buildGroupPostCompactCleanupAudit;
exports.buildDeterministicConversationSummary = buildDeterministicConversationSummary;
exports.renderConversationSummary = renderConversationSummary;
exports.buildGroupCompactionModelRequest = buildGroupCompactionModelRequest;
exports.buildBoundedRecentGroupContext = buildBoundedRecentGroupContext;
exports.buildRelevantHistoricalGroupContext = buildRelevantHistoricalGroupContext;
exports.compactGroupConversationMemory = compactGroupConversationMemory;
exports.runGroupMemoryPreservedSegmentSelfTest = runGroupMemoryPreservedSegmentSelfTest;
exports.runGroupMemoryPostCompactRecoveryAuditSelfTest = runGroupMemoryPostCompactRecoveryAuditSelfTest;
exports.runGroupMemoryCompactWarningSelfTest = runGroupMemoryCompactWarningSelfTest;
exports.runGroupMemoryCompactionSelfTest = runGroupMemoryCompactionSelfTest;
exports.runGroupMemoryModelCapacitySelfTest = runGroupMemoryModelCapacitySelfTest;
exports.runGroupCompactStrategyDecisionSelfTest = runGroupCompactStrategyDecisionSelfTest;
exports.runGroupPostCompactCleanupAuditSelfTest = runGroupPostCompactCleanupAuditSelfTest;
exports.runGroupApiMicroCompactEditPlanSelfTest = runGroupApiMicroCompactEditPlanSelfTest;
exports.runGroupApiMicrocompactNativeApplyPlanSelfTest = runGroupApiMicrocompactNativeApplyPlanSelfTest;
exports.runGroupMemoryQualityGateSelfTest = runGroupMemoryQualityGateSelfTest;
exports.runGroupMemoryMicroCompactSelfTest = runGroupMemoryMicroCompactSelfTest;
exports.runGroupMemoryTimeBasedMicroCompactSelfTest = runGroupMemoryTimeBasedMicroCompactSelfTest;
exports.runGroupMemoryCompactionHookSelfTest = runGroupMemoryCompactionHookSelfTest;
exports.runGroupMemoryPartialCompactSelfTest = runGroupMemoryPartialCompactSelfTest;
exports.runGroupMemoryPartialCompactSidecarSelfTest = runGroupMemoryPartialCompactSidecarSelfTest;
exports.runGroupMemoryPtlEmergencySelfTest = runGroupMemoryPtlEmergencySelfTest;
exports.runGroupMemoryPtlRecoverySelfTest = runGroupMemoryPtlRecoverySelfTest;
exports.runGroupMemoryCompactionIntegrationSelfTest = runGroupMemoryCompactionIntegrationSelfTest;
exports.runGroupMemoryCompactionStressSelfTest = runGroupMemoryCompactionStressSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const context_budget_1 = require("../../system/context-budget");
const model_capability_cache_1 = require("./model-capability-cache");
exports.GROUP_MEMORY_COMPACTION_VERSION = 3;
exports.GROUP_COMPACT_TRIGGER_TOKENS = 167_000;
exports.GROUP_COMPACT_MIN_KEEP_MESSAGES = 5;
exports.GROUP_COMPACT_MIN_KEEP_TOKENS = 10_000;
exports.GROUP_COMPACT_MAX_KEEP_TOKENS = 40_000;
exports.GROUP_COMPACT_MAX_FAILURES = 3;
exports.GROUP_COMPACT_MODEL_RETRY_MS = 15 * 60 * 1000;
exports.GROUP_FACT_ANCHOR_LIMIT = 500;
exports.GROUP_CONTEXT_WINDOW_DEFAULT = 200_000;
exports.GROUP_CONTEXT_RESERVED_TOKENS = 20_000;
exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS = 13_000;
exports.GROUP_WARNING_BUFFER_TOKENS = 20_000;
exports.GROUP_ERROR_BUFFER_TOKENS = 20_000;
exports.GROUP_MANUAL_COMPACT_BUFFER_TOKENS = 3_000;
exports.GROUP_COMPACT_MAX_ACTIVE_MESSAGES = 120;
exports.GROUP_MICRO_COMPACT_VERSION = 1;
exports.GROUP_MICRO_COMPACT_MAX_RECORDS = 80;
exports.GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS = 180_000;
exports.GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS = 40_000;
exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27";
exports.GROUP_TIME_BASED_MICRO_COMPACT_VERSION = 1;
exports.GROUP_TIME_BASED_MC_CLEARED_MESSAGE = "[Old group Agent result content cleared]";
exports.GROUP_POST_COMPACT_REINJECT_VERSION = 1;
exports.GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION = 1;
exports.GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION = 1;
exports.GROUP_POST_COMPACT_FILE_BUDGET = 5;
exports.GROUP_POST_COMPACT_SKILL_BUDGET = 5;
exports.GROUP_POST_COMPACT_VERIFICATION_BUDGET = 8;
exports.GROUP_PARTIAL_COMPACT_VERSION = 1;
exports.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT = 12;
exports.GROUP_PTL_EMERGENCY_VERSION = 1;
exports.GROUP_PTL_RECOVERY_VERSION = 1;
exports.GROUP_PRESERVED_SEGMENT_VERSION = 2;
exports.GROUP_COMPACT_STRATEGY_DECISION_VERSION = 1;
exports.GROUP_COMPACTION_HOOK_LEDGER_VERSION = 1;
exports.GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION = 1;
exports.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS = 5_000;
exports.GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS = 13_000;
const GROUP_COMPACTION_HOOK_LEDGER_DIR = path.join(utils_1.CCM_DIR, "group-memory-compaction-hooks");
const GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS = ["Bash", "Shell", "PowerShell", "Glob", "Grep", "Read", "FileRead", "WebFetch", "WebSearch"];
const GROUP_API_MICROCOMPACT_CLEARABLE_USES = ["Edit", "FileEdit", "Write", "FileWrite", "NotebookEdit"];
const groupMemoryCompactionHooks = {
    pre: new Set(),
    post: new Set(),
};
function groupCompactTransactionReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function buildGroupCompactEpoch(boundaryId) {
    const id = String(boundaryId || "").trim();
    return id ? `cmp_${crypto.createHash("sha256").update(id).digest("hex").slice(0, 16)}` : "precompact";
}
function verifyGroupCompactTransactionReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== "ccm-group-memory-compact-transaction-receipt-v1"
        || Number(receipt?.version || 0) !== exports.GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION)
        issues.push("compact_transaction_receipt_schema_invalid");
    const expectedReceiptId = `gctr_${crypto.createHash("sha256").update(`${receipt?.group_id || ""}\0${receipt?.boundary_id || ""}\0${receipt?.hook_run_id || ""}\0${receipt?.committed_at || ""}`).digest("hex").slice(0, 24)}`;
    if (String(receipt?.receipt_id || "") !== expectedReceiptId)
        issues.push("compact_transaction_receipt_id_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("compact_transaction_group_missing");
    if (!String(receipt?.boundary_id || ""))
        issues.push("compact_transaction_boundary_missing");
    if (!String(receipt?.summary_checksum || ""))
        issues.push("compact_transaction_summary_missing");
    if (Number(receipt?.summarized_message_count || 0) < 1)
        issues.push("compact_transaction_range_empty");
    if (!String(receipt?.preserved_segment_checksum || ""))
        issues.push("compact_transaction_preserved_segment_missing");
    if (Number(receipt?.hook_failure_count || 0) > 0)
        issues.push("compact_transaction_hook_failure");
    if (receipt?.recovery_audit_passed !== true)
        issues.push("compact_transaction_recovery_audit_failed");
    if (receipt?.cleanup_audit_passed !== true)
        issues.push("compact_transaction_cleanup_audit_failed");
    if (!String(receipt?.transcript_path || ""))
        issues.push("compact_transaction_transcript_missing");
    if (String(receipt?.compact_epoch || "") !== buildGroupCompactEpoch(String(receipt?.boundary_id || "")))
        issues.push("compact_transaction_epoch_invalid");
    if (String(receipt?.receipt_checksum || "") !== groupCompactTransactionReceiptChecksum(receipt))
        issues.push("compact_transaction_receipt_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("compact_transaction_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("compact_transaction_group_session_mismatch");
    if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId))
        issues.push("compact_transaction_boundary_mismatch");
    if (expected.compactEpoch && String(receipt?.compact_epoch || "") !== String(expected.compactEpoch))
        issues.push("compact_transaction_epoch_mismatch");
    if (expected.summaryChecksum && String(receipt?.summary_checksum || "") !== String(expected.summaryChecksum))
        issues.push("compact_transaction_summary_mismatch");
    return { valid: issues.length === 0, issues };
}
function buildGroupCompactTransactionReceipt(input = {}) {
    const boundary = input.boundary || {};
    const hookRows = [...(input.preHookResults || []), ...(input.postHookResults || [])].map((row) => ({
        phase: String(row?.ledgerEntry?.phase || ""),
        hook_index: Number(row?.ledgerEntry?.hook_index ?? -1),
        ok: row?.ok === true,
        boundary_id: String(row?.ledgerEntry?.boundary_id || ""),
        summary_checksum: String(row?.ledgerEntry?.summary_checksum || ""),
    }));
    const payload = {
        schema: "ccm-group-memory-compact-transaction-receipt-v1",
        version: exports.GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION,
        receipt_id: `gctr_${crypto.createHash("sha256").update(`${input.groupId || ""}\0${boundary.id || ""}\0${input.hookRunId || ""}\0${input.createdAt || boundary.createdAt || ""}`).digest("hex").slice(0, 24)}`,
        group_id: String(input.groupId || ""),
        group_session_id: String(input.groupSessionId || input.group_session_id || ""),
        boundary_id: String(boundary.id || ""),
        boundary_type: String(boundary.type || ""),
        compact_epoch: buildGroupCompactEpoch(String(boundary.id || "")),
        summarized_from_message_id: String(boundary.summarizedFromMessageId || ""),
        summarized_through_message_id: String(boundary.summarizedThroughMessageId || ""),
        summarized_message_count: Number(boundary.summarizedMessageCount || 0),
        summary_checksum: String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || ""),
        pre_compact_token_count: Number(boundary.preCompactTokenCount || 0),
        post_compact_token_count: Number(boundary.postCompactTokenCount || 0),
        preserved_segment_checksum: boundary.preservedSegment
            ? crypto.createHash("sha256").update(JSON.stringify(boundary.preservedSegment)).digest("hex")
            : "",
        hook_run_id: String(input.hookRunId || ""),
        pre_hook_count: hookRows.filter(row => row.phase === "pre").length,
        post_hook_count: hookRows.filter(row => row.phase === "post").length,
        hook_failure_count: hookRows.filter(row => !row.ok).length,
        hook_evidence_checksum: crypto.createHash("sha256").update(JSON.stringify(hookRows)).digest("hex"),
        recovery_audit_passed: boundary.post_compact_restore?.recoveryAudit?.pass === true,
        cleanup_audit_passed: boundary.post_compact_restore?.cleanupAudit?.pass === true,
        transcript_path: String(input.transcriptPath || boundary.post_compact_restore?.transcriptPath || ""),
        committed_at: String(input.createdAt || boundary.createdAt || new Date().toISOString()),
    };
    return { ...payload, receipt_checksum: groupCompactTransactionReceiptChecksum(payload) };
}
function cleanHookLedgerGroupId(groupId) {
    return String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-");
}
function getGroupMemoryCompactionHookLedgerFile(groupId) {
    return path.join(GROUP_COMPACTION_HOOK_LEDGER_DIR, `${cleanHookLedgerGroupId(groupId)}.json`);
}
function readHookLedgerFile(file, groupId = "") {
    try {
        if (fs.existsSync(file)) {
            const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
            return {
                schema: "ccm-group-memory-compaction-hook-ledger-v1",
                version: exports.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
                groupId: String(parsed.groupId || groupId || ""),
                entries: Array.isArray(parsed.entries) ? parsed.entries : [],
                stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
                updatedAt: String(parsed.updatedAt || ""),
            };
        }
    }
    catch { }
    return {
        schema: "ccm-group-memory-compaction-hook-ledger-v1",
        version: exports.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
        groupId: String(groupId || ""),
        entries: [],
        stats: {},
        updatedAt: "",
    };
}
function writeHookLedgerFile(file, ledger) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(ledger, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function hookResultSummary(result) {
    if (!result || typeof result !== "object")
        return {};
    const persistentRequirements = Array.isArray(result.persistentRequirements || result.mustKeep)
        ? (result.persistentRequirements || result.mustKeep)
        : [];
    const factAnchors = Array.isArray(result.factAnchors || result.anchors)
        ? (result.factAnchors || result.anchors)
        : [];
    const keys = Object.keys(result).filter(Boolean).slice(0, 16);
    return {
        keys,
        persistentRequirementCount: persistentRequirements.length,
        factAnchorCount: factAnchors.length,
        hasCandidates: Array.isArray(result.candidates) ? result.candidates.length > 0 : result.hasCandidates === true,
        checked: result.checked === true,
        text: compactText(result.summary || result.note || result.message || "", 420),
    };
}
function normalizeHookLedgerEntry(raw = {}) {
    return {
        entry_id: String(raw.entry_id || raw.entryId || `hook_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`),
        hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
        group_id: String(raw.group_id || raw.groupId || ""),
        phase: String(raw.phase || ""),
        hook_index: Number(raw.hook_index ?? raw.hookIndex ?? 0),
        ok: raw.ok === true,
        status: raw.ok === true ? "ok" : "fail",
        duration_ms: Number(raw.duration_ms || raw.durationMs || 0),
        error: compactText(raw.error || "", 500),
        result_summary: raw.result_summary || raw.resultSummary || hookResultSummary(raw.result),
        at: String(raw.at || ""),
        boundary_id: String(raw.boundary_id || raw.boundaryId || ""),
        summarized_through_message_id: String(raw.summarized_through_message_id || raw.summarizedThroughMessageId || ""),
        summary_checksum: String(raw.summary_checksum || raw.summaryChecksum || ""),
    };
}
function buildHookLedgerStats(entries = []) {
    const stats = {
        total: entries.length,
        pre: { total: 0, ok: 0, failed: 0, durationMs: 0 },
        post: { total: 0, ok: 0, failed: 0, durationMs: 0 },
        ok: 0,
        failed: 0,
        avgDurationMs: 0,
        latestAt: "",
    };
    for (const entry of entries) {
        const phase = entry.phase === "post" ? "post" : "pre";
        stats[phase].total++;
        stats[phase].durationMs += Number(entry.duration_ms || 0);
        if (entry.ok) {
            stats.ok++;
            stats[phase].ok++;
        }
        else {
            stats.failed++;
            stats[phase].failed++;
        }
        if (entry.at && (!stats.latestAt || String(entry.at) > stats.latestAt))
            stats.latestAt = String(entry.at);
    }
    stats.avgDurationMs = entries.length ? Math.round(entries.reduce((sum, item) => sum + Number(item.duration_ms || 0), 0) / entries.length) : 0;
    for (const phase of ["pre", "post"]) {
        stats[phase].avgDurationMs = stats[phase].total ? Math.round(stats[phase].durationMs / stats[phase].total) : 0;
    }
    return stats;
}
function appendGroupMemoryCompactionHookLedgerEntries(groupId, entries = []) {
    const normalized = entries.map(normalizeHookLedgerEntry).filter(entry => entry.group_id || groupId);
    if (!normalized.length)
        return readGroupMemoryCompactionHookLedger(groupId);
    const file = getGroupMemoryCompactionHookLedgerFile(groupId);
    const ledger = readHookLedgerFile(file, groupId);
    const allEntries = [...(ledger.entries || []), ...normalized.map(entry => ({ ...entry, group_id: entry.group_id || groupId }))].slice(-500);
    const next = {
        schema: "ccm-group-memory-compaction-hook-ledger-v1",
        version: exports.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
        groupId,
        entries: allEntries,
        stats: buildHookLedgerStats(allEntries),
        updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
    };
    writeHookLedgerFile(file, next);
    return { ...next, file };
}
function readGroupMemoryCompactionHookLedger(groupId) {
    const id = String(groupId || "").trim();
    const file = getGroupMemoryCompactionHookLedgerFile(id);
    const ledger = readHookLedgerFile(file, id);
    return {
        ...ledger,
        file,
        stats: buildHookLedgerStats(Array.isArray(ledger.entries) ? ledger.entries : []),
    };
}
function registerGroupMemoryCompactionHook(phase, hook) {
    if (phase !== "pre" && phase !== "post")
        throw new Error(`Unsupported group memory compaction hook phase: ${phase}`);
    groupMemoryCompactionHooks[phase].add(hook);
    return () => groupMemoryCompactionHooks[phase].delete(hook);
}
async function runGroupMemoryCompactionHooks(phase, input) {
    const results = [];
    const hooks = [...groupMemoryCompactionHooks[phase]];
    const hookRunId = String(input.hookRunId || input.hook_run_id || `gmch_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`);
    const ledgerEntries = [];
    if (!hooks.length) {
        const entry = normalizeHookLedgerEntry({
            hook_run_id: hookRunId,
            group_id: input.groupId,
            phase,
            hook_index: -1,
            ok: true,
            duration_ms: 0,
            result_summary: { noHooksRegistered: true },
            at: new Date().toISOString(),
            boundary_id: input.boundary?.id || "",
            summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
            summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
        });
        if (input.groupId)
            appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), [entry]);
        return [{ ok: true, result: { noHooksRegistered: true }, hookRunId, ledgerEntry: entry }];
    }
    for (let index = 0; index < hooks.length; index += 1) {
        const hook = hooks[index];
        const started = Date.now();
        const at = new Date(started).toISOString();
        try {
            const result = await hook({ ...input, phase });
            const entry = normalizeHookLedgerEntry({
                hook_run_id: hookRunId,
                group_id: input.groupId,
                phase,
                hook_index: index,
                ok: true,
                duration_ms: Date.now() - started,
                result_summary: hookResultSummary(result),
                at,
                boundary_id: input.boundary?.id || "",
                summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
                summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
            });
            ledgerEntries.push(entry);
            if (result)
                results.push({ ok: true, result, hookRunId, ledgerEntry: entry });
        }
        catch (error) {
            const entry = normalizeHookLedgerEntry({
                hook_run_id: hookRunId,
                group_id: input.groupId,
                phase,
                hook_index: index,
                ok: false,
                duration_ms: Date.now() - started,
                error: compactText(error?.message || error, 400),
                at,
                boundary_id: input.boundary?.id || "",
                summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
                summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
            });
            ledgerEntries.push(entry);
            results.push({ ok: false, error: entry.error, hookRunId, ledgerEntry: entry });
        }
    }
    if (ledgerEntries.length && input.groupId)
        appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), ledgerEntries);
    return results;
}
function compactText(value, max = 800) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    const head = Math.max(1, Math.floor(max * 0.68));
    const tail = Math.max(1, max - head - 20);
    return `${text.slice(0, head)} …[已压缩]… ${text.slice(-tail)}`;
}
function messageContent(message) {
    return String(message?.content || message?.delivery_summary?.headline || message?.result || "").trim();
}
function messageIdentity(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function messageActor(message) {
    return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}
function mergeUnique(existing = [], incoming = [], limit = 24, max = 700) {
    const result = new Map();
    for (const raw of [...existing, ...incoming]) {
        const value = compactText(raw, max);
        const key = value.toLowerCase();
        if (!value)
            continue;
        if (result.has(key))
            result.delete(key);
        result.set(key, value);
    }
    return [...result.values()].slice(-limit);
}
function mergeTaskStates(existing = [], incoming = [], limit = 30) {
    const keyed = new Map();
    const unkeyed = [];
    for (const raw of [...existing, ...incoming]) {
        const value = compactText(raw, 700);
        if (!value)
            continue;
        const match = value.match(/^\[([^\]]+)\]/);
        if (match)
            keyed.set(match[1], value);
        else
            unkeyed.push(value);
    }
    return [...unkeyed, ...keyed.values()].slice(-limit);
}
function stringArray(value, limit = 30) {
    const raw = Array.isArray(value) ? value : value == null ? [] : [value];
    return raw.map((item) => typeof item === "string" ? item : item?.path || item?.file || item?.name || JSON.stringify(item))
        .map((item) => compactText(item, 300))
        .filter(Boolean)
        .slice(0, limit);
}
function uniqueStrings(values = [], limit = 20) {
    const result = [];
    const seen = new Set();
    for (const raw of values) {
        const value = compactText(raw, 500);
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= limit)
            break;
    }
    return result;
}
function normalizedSearchTokens(value) {
    const text = String(value || "").toLowerCase();
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        tokens.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        tokens.add(chinese.slice(index, index + 2));
    return tokens;
}
function isGroundedInSource(value, source) {
    const item = compactText(value, 1200).toLowerCase();
    const corpus = String(source || "").toLowerCase();
    if (!item)
        return false;
    if (corpus.includes(item))
        return true;
    const tokens = [...normalizedSearchTokens(item)];
    if (!tokens.length)
        return false;
    let matches = 0;
    for (const token of tokens)
        if (corpus.includes(token) && ++matches >= Math.min(3, Math.max(1, Math.ceil(tokens.length * 0.25))))
            return true;
    return false;
}
function mergeSafeConversationSummary(previous, fallback, model, messages) {
    const source = messages.map(message => [messageContent(message), JSON.stringify(message?.assignments || []), JSON.stringify(message?.delivery_summary || {})].join("\n")).join("\n");
    const grounded = (items = []) => items.filter(item => isGroundedInSource(item, source));
    const safeModel = model || createEmptyConversationSummary();
    return {
        primaryRequest: fallback.primaryRequest || safeModel.primaryRequest || previous.primaryRequest,
        userMessages: mergeUnique(previous.userMessages, fallback.userMessages, 40, 900),
        keyConcepts: mergeUnique(previous.keyConcepts, [...grounded(safeModel.keyConcepts), ...fallback.keyConcepts], 24, 400),
        filesAndCode: mergeUnique(previous.filesAndCode, [...grounded(safeModel.filesAndCode), ...fallback.filesAndCode], 40, 500),
        errorsAndFixes: mergeUnique(previous.errorsAndFixes, [...grounded(safeModel.errorsAndFixes), ...fallback.errorsAndFixes], 30, 700),
        decisions: mergeUnique(previous.decisions, [...grounded(safeModel.decisions), ...fallback.decisions], 30, 700),
        completedWork: mergeUnique(previous.completedWork, [...grounded(safeModel.completedWork), ...fallback.completedWork], 30, 700),
        pendingTasks: mergeUnique(previous.pendingTasks, [...grounded(safeModel.pendingTasks), ...fallback.pendingTasks], 30, 700),
        currentWork: fallback.currentWork || safeModel.currentWork || previous.currentWork,
        nextStep: fallback.nextStep || safeModel.nextStep || previous.nextStep,
        participantState: mergeUnique(previous.participantState, [...grounded(safeModel.participantState), ...fallback.participantState], 20, 400),
        taskStates: mergeTaskStates(previous.taskStates, fallback.taskStates, 30),
    };
}
function validateSummaryPreservesFallback(summary, fallback) {
    const missing = [];
    const arrayKeys = [
        "userMessages", "filesAndCode", "errorsAndFixes", "decisions", "completedWork", "pendingTasks", "taskStates",
    ];
    for (const key of arrayKeys) {
        const actual = new Set((summary[key] || []).map(item => String(item)));
        for (const item of (fallback[key] || []))
            if (!actual.has(String(item)))
                missing.push(`${String(key)}:${compactText(item, 120)}`);
    }
    if (fallback.primaryRequest && summary.primaryRequest !== fallback.primaryRequest)
        missing.push("primaryRequest");
    if (fallback.currentWork && summary.currentWork !== fallback.currentWork)
        missing.push("currentWork");
    if (fallback.nextStep && summary.nextStep !== fallback.nextStep)
        missing.push("nextStep");
    return { pass: missing.length === 0, missing: missing.slice(0, 30) };
}
function buildGroupMemoryQualitySource(messages, memory = {}) {
    return [
        JSON.stringify(memory?.conversationSummary || {}),
        JSON.stringify((memory?.completed || []).slice(-40)),
        JSON.stringify((memory?.blocked || []).slice(-40)),
        JSON.stringify((memory?.workerLedger || []).slice(-80)),
        ...(messages || []).map((message) => [
            messageContent(message),
            JSON.stringify(message?.assignments || []),
            JSON.stringify(message?.receipt || {}),
            JSON.stringify(message?.delivery_summary || {}),
        ].join("\n")),
    ].join("\n");
}
function extractRequirementNeedles(text) {
    const raw = String(text || "");
    const needles = new Set();
    for (const match of raw.matchAll(/[A-Z][A-Z0-9_:-]{5,}/g))
        needles.add(match[0].toLowerCase());
    for (const match of raw.matchAll(/[A-Za-z0-9_.\/\\:-]{6,}/g)) {
        const token = match[0].toLowerCase();
        if (/^(must|never|always|required|should|please|cannot|without|memory|context)$/i.test(token))
            continue;
        needles.add(token);
    }
    for (const match of raw.matchAll(/(?:必须|不得|不能|禁止|务必|只能|始终|不要|验收|约束)[^，。；\n]{2,60}/g)) {
        needles.add(match[0].toLowerCase());
    }
    return [...needles].slice(0, 24);
}
function isRequirementRepresented(requirement, artifactText) {
    const raw = compactText(requirement, 1200).toLowerCase();
    const artifact = String(artifactText || "").toLowerCase();
    if (!raw)
        return true;
    if (artifact.includes(raw))
        return true;
    const prefix = raw.slice(0, Math.min(180, raw.length));
    if (prefix.length >= 24 && artifact.includes(prefix))
        return true;
    const needles = extractRequirementNeedles(raw);
    if (!needles.length)
        return prefix.length >= 12 && artifact.includes(prefix.slice(0, 80));
    const hardNeedles = needles.filter(item => /[a-z0-9_:-]*[0-9_:-][a-z0-9_:-]*/i.test(item) && item.length >= 6);
    const required = hardNeedles.length ? hardNeedles : needles;
    let matched = 0;
    for (const needle of required)
        if (artifact.includes(needle) && ++matched >= Math.min(required.length, Math.max(1, Math.ceil(required.length * 0.66))))
            return true;
    return false;
}
function extractBlockedTaskSignals(messages) {
    const signals = [];
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        const content = messageContent(message);
        const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
        const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
        const corpus = `${status}\n${content}`;
        if (taskId && /(失败|阻塞|未完成|超时|异常|需要|error|failed|blocked|timeout|needs_info|need info)/i.test(corpus)) {
            signals.push({ taskId, text: compactText(content || status, 220) });
        }
    }
    return signals.slice(-20);
}
function addQualityCheck(checks, check) {
    checks.push({ ...check, score: check.pass ? 100 : 0 });
}
function qualityPenalty(severity) {
    if (severity === "fatal")
        return 45;
    if (severity === "high")
        return 30;
    if (severity === "medium")
        return 16;
    return 8;
}
function evaluateGroupMemorySummaryQuality(summary, fallback, messages, memory = {}, options = {}) {
    const normalizedSummary = normalizeSummary(summary, createEmptyConversationSummary());
    const normalizedFallback = normalizeSummary(fallback, createEmptyConversationSummary());
    const checks = [];
    const fallbackValidation = validateSummaryPreservesFallback(normalizedSummary, normalizedFallback);
    addQualityCheck(checks, {
        id: "fallback_preserved",
        label: "结构化保底事实保留",
        pass: fallbackValidation.pass,
        severity: "fatal",
        detail: fallbackValidation.pass ? "摘要保留了确定性保底摘要中的关键字段。" : "摘要丢失了确定性保底摘要中的字段。",
        gaps: fallbackValidation.missing,
    });
    const persistedRequirements = Array.isArray(options.persistentRequirements)
        ? options.persistentRequirements
        : Array.isArray(memory?.persistentRequirements)
            ? memory.persistentRequirements
            : [];
    const incomingRequirements = extractPersistentRequirements(messages || []);
    const requirementMap = new Map();
    for (const item of [...persistedRequirements, ...incomingRequirements]) {
        const text = compactText(item?.text || item, 1200);
        if (text)
            requirementMap.set(text.toLowerCase(), { ...item, text });
    }
    const artifactText = [
        JSON.stringify(normalizedSummary),
        renderConversationSummary(normalizedSummary, 20_000),
        ...(Array.isArray(options.factAnchors) ? options.factAnchors : []).map((item) => item?.text || item),
        ...persistedRequirements.map((item) => item?.text || item),
        ...incomingRequirements.map((item) => item?.text || item),
    ].join("\n");
    const requirementGaps = [...requirementMap.values()]
        .filter((item) => !isRequirementRepresented(item.text || item, artifactText))
        .map((item) => `#${item.messageId || item.id || "memory"} ${compactText(item.text || item, 160)}`)
        .slice(0, 20);
    addQualityCheck(checks, {
        id: "persistent_requirements_preserved",
        label: "持久用户约束可进入上下文",
        pass: requirementGaps.length === 0,
        severity: "fatal",
        detail: requirementGaps.length === 0 ? "硬约束可从摘要或持久事实锚点恢复。" : "存在硬约束无法从摘要或持久事实锚点恢复。",
        gaps: requirementGaps,
    });
    const sourceText = buildGroupMemoryQualitySource(messages || [], memory);
    const summaryConcernText = [
        normalizedSummary.errorsAndFixes.join("\n"),
        normalizedSummary.pendingTasks.join("\n"),
        normalizedSummary.taskStates.join("\n"),
        normalizedSummary.currentWork,
        normalizedSummary.nextStep,
    ].join("\n").toLowerCase();
    const blockedSignals = extractBlockedTaskSignals(messages || []);
    const blockedGaps = blockedSignals
        .filter(signal => !summaryConcernText.includes(signal.taskId.toLowerCase()))
        .map(signal => `[${signal.taskId}] ${signal.text}`)
        .slice(0, 12);
    addQualityCheck(checks, {
        id: "blocked_not_marked_completed",
        label: "阻塞任务没有被改写成完成",
        pass: blockedGaps.length === 0,
        severity: "high",
        detail: blockedGaps.length === 0 ? "带 task id 的失败/阻塞信号仍在摘要问题域中可见。" : "部分失败/阻塞任务在摘要问题域中不可见，可能被完成态覆盖。",
        gaps: blockedGaps,
    });
    const completionText = normalizedSummary.completedWork.join("\n");
    const sweepingCompletionClaims = normalizedSummary.completedWork
        .filter(item => /(全部完成|全部处理|已上线|上线生产|完全完成|all done|completed all|fully complete|released to production)/i.test(String(item || "")))
        .filter(item => !isGroundedInSource(item, sourceText))
        .map(item => compactText(item, 180))
        .slice(0, 12);
    addQualityCheck(checks, {
        id: "no_ungrounded_completion",
        label: "不写入无来源完成态",
        pass: sweepingCompletionClaims.length === 0,
        severity: "high",
        detail: sweepingCompletionClaims.length === 0 ? "没有发现未由原始消息支撑的全量完成/上线类结论。" : "摘要包含原始消息无法支撑的全量完成/上线类结论。",
        evidence: sweepingCompletionClaims,
    });
    const sourceHasText = (messages || []).some(message => messageContent(message));
    const summaryHasSignal = !![
        normalizedSummary.primaryRequest,
        normalizedSummary.currentWork,
        normalizedSummary.nextStep,
        normalizedSummary.userMessages.join("\n"),
        normalizedSummary.filesAndCode.join("\n"),
        normalizedSummary.errorsAndFixes.join("\n"),
        normalizedSummary.pendingTasks.join("\n"),
        normalizedSummary.taskStates.join("\n"),
    ].join("").trim();
    addQualityCheck(checks, {
        id: "summary_not_empty",
        label: "摘要没有空洞化",
        pass: !sourceHasText || summaryHasSignal,
        severity: "medium",
        detail: !sourceHasText || summaryHasSignal ? "压缩区间有可用摘要信号。" : "压缩区间有内容，但摘要几乎为空。",
    });
    const sourceHasBlocked = /(失败|阻塞|未完成|超时|异常|error|failed|blocked|timeout|needs_info)/i.test(sourceText);
    const summaryKeepsBlocked = /(失败|阻塞|未完成|超时|异常|error|failed|blocked|timeout|needs_info)/i.test(summaryConcernText);
    const sourceHasSweepingCompletion = /(全部完成|全部处理|已上线|上线生产|all done|completed all|released to production)/i.test(sourceText);
    const completionOverBlocked = sourceHasBlocked
        && !summaryKeepsBlocked
        && !sourceHasSweepingCompletion
        && /(全部完成|全部处理|已上线|上线生产|all done|completed all|released to production)/i.test(completionText);
    addQualityCheck(checks, {
        id: "no_completion_over_blockers",
        label: "阻塞事实不被全量完成覆盖",
        pass: !completionOverBlocked,
        severity: "high",
        detail: completionOverBlocked ? "源消息存在失败/阻塞，但摘要只表现为全量完成。" : "未发现阻塞事实被全量完成覆盖。",
    });
    const failedChecks = checks.filter(check => !check.pass);
    const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + qualityPenalty(check.severity), 0)));
    const driftReasons = failedChecks
        .filter(check => ["fallback_preserved", "blocked_not_marked_completed", "no_ungrounded_completion", "no_completion_over_blockers"].includes(check.id))
        .map(check => `${check.id}: ${check.detail}`)
        .slice(0, 8);
    const hardFailures = failedChecks.filter(check => check.severity === "fatal" || check.severity === "high");
    const downgradeRequired = hardFailures.length > 0 || score < 70;
    const pass = !downgradeRequired && score >= 80;
    return {
        schema: "ccm-group-memory-quality-v1",
        score,
        pass,
        status: pass ? "pass" : score >= 60 && !failedChecks.some(check => check.severity === "fatal") ? "degraded" : "failed",
        checks,
        drift: { detected: driftReasons.length > 0, reasons: driftReasons },
        downgrade_required: downgradeRequired,
        downgrade_reason: downgradeRequired ? failedChecks.map(check => check.id).join(", ") : "",
        evaluated_at: String(options.evaluatedAt || new Date().toISOString()),
    };
}
function extractFactAnchors(messages) {
    const anchors = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        const messageId = messageIdentity(message, index);
        const timestamp = String(message?.timestamp || message?.time || "");
        const add = (type, text) => {
            const bounded = compactText(text, 2000);
            if (!bounded)
                return;
            const checksum = crypto.createHash("sha256").update(`${type}\n${bounded}`).digest("hex").slice(0, 16);
            anchors.push({ id: `${messageId}:${type}`, type, messageId, text: bounded, timestamp, checksum });
        };
        if (message?.role === "user")
            add("user_requirement", messageContent(message));
        if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason) {
            add("dispatch_decision", `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || messageContent(message)}`);
        }
    }
    return anchors;
}
function mergeFactAnchors(existing = [], incoming = []) {
    const result = new Map();
    for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
        if (!item?.id || !item?.text)
            continue;
        result.set(String(item.id), item);
    }
    return [...result.values()].slice(-exports.GROUP_FACT_ANCHOR_LIMIT);
}
function extractPersistentRequirements(messages) {
    return extractFactAnchors(messages).filter(item => item.type === "user_requirement"
        && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|must\b|never\b|always\b|do not\b|required?\b)/i.test(item.text));
}
function mergePersistentRequirements(existing = [], incoming = []) {
    const result = new Map();
    for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
        if (!item?.id || !item?.text)
            continue;
        result.set(String(item.id), item);
    }
    return [...result.values()].slice(-200);
}
function estimateGroupTextTokens(value) {
    return (0, context_budget_1.estimateTextTokens)(value);
}
function estimateGroupMessageTokens(message) {
    return estimateGroupTextTokens([
        message?.role || "",
        message?.agent || message?.target || "",
        messageContent(message),
        message?.assignments ? JSON.stringify(message.assignments) : "",
        message?.delivery_summary ? JSON.stringify(message.delivery_summary) : "",
    ].filter(Boolean).join("\n"));
}
function messageHasText(message) {
    return !!messageContent(message);
}
function groupMessageTaskId(message) {
    return String(message?.task_id
        || message?.taskId
        || message?.receipt?.taskId
        || message?.receipt?.task_id
        || message?.delivery_summary?.task_id
        || message?.delivery_summary?.taskId
        || "").trim();
}
/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
function calculateGroupMessagesToKeepIndex(messages, options = {}) {
    if (!messages.length)
        return 0;
    const floorIndex = Math.max(0, Math.min(messages.length, Number(options.floorIndex || 0)));
    const minMessages = Math.max(1, Number(options.minMessages || exports.GROUP_COMPACT_MIN_KEEP_MESSAGES));
    const minTokens = Math.max(1, Number(options.minTokens || exports.GROUP_COMPACT_MIN_KEEP_TOKENS));
    const maxTokens = Math.max(minTokens, Number(options.maxTokens || exports.GROUP_COMPACT_MAX_KEEP_TOKENS));
    let startIndex = messages.length;
    let totalTokens = 0;
    let textMessages = 0;
    for (let i = messages.length - 1; i >= floorIndex; i--) {
        const nextTokens = estimateGroupMessageTokens(messages[i]);
        if (textMessages >= minMessages && totalTokens >= minTokens && totalTokens + nextTokens > maxTokens)
            break;
        startIndex = i;
        totalTokens += nextTokens;
        if (messageHasText(messages[i]))
            textMessages++;
        if (textMessages >= minMessages && totalTokens >= minTokens)
            break;
    }
    const firstTaskId = groupMessageTaskId(messages[startIndex]);
    while (firstTaskId && startIndex > floorIndex && groupMessageTaskId(messages[startIndex - 1]) === firstTaskId) {
        startIndex--;
    }
    if (startIndex > floorIndex && messages[startIndex]?.role !== "user" && messages[startIndex - 1]?.role === "user")
        startIndex--;
    return startIndex;
}
function buildGroupPreservedSegment(messages, keepIndex, options = {}) {
    const safeKeepIndex = Math.max(0, Math.min((messages || []).length, Number(keepIndex || 0)));
    const preservedMessages = (messages || []).slice(safeKeepIndex);
    const preservedMessageIds = preservedMessages.map((message, index) => messageIdentity(message, safeKeepIndex + index));
    const tokenEstimate = preservedMessages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
    const textBlockMessageCount = preservedMessages.filter(messageHasText).length;
    const firstTaskId = groupMessageTaskId(messages?.[safeKeepIndex]);
    const firstTaskMessageCount = firstTaskId
        ? preservedMessages.filter((message) => groupMessageTaskId(message) === firstTaskId).length
        : 0;
    const protectedTaskTransaction = !!firstTaskId && firstTaskMessageCount > 1;
    const summarizedThroughMessageId = safeKeepIndex > 0 ? messageIdentity(messages[safeKeepIndex - 1], safeKeepIndex - 1) : "";
    const summaryChecksum = String(options.summaryChecksum || options.summary_checksum || "");
    const summaryMessageId = String(options.summaryMessageId || options.summary_message_id || (summaryChecksum && summarizedThroughMessageId
        ? `gcsum_${crypto.createHash("sha256")
            .update(`${options.groupId || options.group_id || options.scopeId || options.scope_id || "unscoped"}\n${summaryChecksum}\n${summarizedThroughMessageId}`)
            .digest("hex")
            .slice(0, 24)}`
        : ""));
    const headMessageId = preservedMessageIds[0] || "";
    const tailMessageId = preservedMessageIds[preservedMessageIds.length - 1] || "";
    return {
        schema: "ccm-group-preserved-segment-v1",
        version: exports.GROUP_PRESERVED_SEGMENT_VERSION,
        keepIndex: safeKeepIndex,
        floorIndex: Math.max(0, Number(options.floorIndex || 0)),
        preservedMessageCount: preservedMessages.length,
        preservedTextBlockMessageCount: textBlockMessageCount,
        preservedTokenEstimate: tokenEstimate,
        preservedMessageIds: preservedMessageIds.slice(-80),
        omittedPreservedMessageIds: Math.max(0, preservedMessageIds.length - 80),
        firstPreservedMessageId: headMessageId,
        lastPreservedMessageId: tailMessageId,
        summarizedThroughMessageId,
        summaryMessageId,
        summaryChecksum,
        headMessageId,
        anchorMessageId: summaryMessageId,
        tailMessageId,
        anchorKind: "compact_summary",
        anchorMode: "suffix_preserving",
        minTokens: Number(options.minTokens || options.min_tokens || exports.GROUP_COMPACT_MIN_KEEP_TOKENS),
        minTextBlockMessages: Number(options.minMessages || options.min_messages || exports.GROUP_COMPACT_MIN_KEEP_MESSAGES),
        maxTokens: Number(options.maxTokens || options.max_tokens || exports.GROUP_COMPACT_MAX_KEEP_TOKENS),
        protectedTaskTransaction,
        firstPreservedTaskId: firstTaskId,
        transcriptPath: options.transcriptPath || options.transcript_path || "",
        createdAt: options.now || new Date().toISOString(),
    };
}
function messageContentBlocks(message) {
    const blocks = [];
    const visit = (value, depth = 0) => {
        if (depth > 4 || value == null)
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item, depth + 1);
            return;
        }
        if (typeof value !== "object")
            return;
        if (value.type)
            blocks.push(value);
        if (Array.isArray(value.content))
            visit(value.content, depth + 1);
        if (Array.isArray(value.blocks))
            visit(value.blocks, depth + 1);
    };
    visit(message?.content);
    visit(message?.blocks);
    visit(message?.message?.content);
    return blocks;
}
function collectWindowBlockRefs(messages, offset = 0) {
    const toolUseIds = new Set();
    const toolResultIds = new Set();
    const thinkingMessageIds = new Set();
    const rows = [];
    (messages || []).forEach((message, localIndex) => {
        const index = offset + localIndex;
        const messageId = messageIdentity(message, index);
        for (const block of messageContentBlocks(message)) {
            const type = String(block?.type || "");
            if (type === "tool_use" || type === "server_tool_use") {
                const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
                if (id)
                    toolUseIds.add(id);
                rows.push({ type, id, messageId, index });
            }
            else if (type === "tool_result" || type === "web_search_tool_result") {
                const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
                if (id)
                    toolResultIds.add(id);
                rows.push({ type, id, messageId, index });
            }
            else if (type === "thinking" || type === "redacted_thinking") {
                thinkingMessageIds.add(messageId);
                rows.push({ type, id: messageId, messageId, index });
            }
        }
    });
    return { toolUseIds, toolResultIds, thinkingMessageIds, rows };
}
function collectApiMicroCompactSignals(messages = []) {
    const toolUseIds = new Set();
    const toolResultIds = new Set();
    const toolNames = new Set();
    const resultToolNames = new Set();
    let thinkingBlockCount = 0;
    let redactedThinkingBlockCount = 0;
    let toolUseBlockCount = 0;
    let toolResultBlockCount = 0;
    (messages || []).forEach((message, index) => {
        if (String(message?.role || "").toLowerCase() === "thinking")
            thinkingBlockCount += 1;
        const explicitToolCalls = Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : [];
        for (const call of explicitToolCalls) {
            const id = String(call?.id || call?.tool_use_id || call?.toolUseId || `tool-call-${index}`).trim();
            const name = String(call?.name || call?.function?.name || call?.tool || "").trim();
            if (id)
                toolUseIds.add(id);
            if (name)
                toolNames.add(name);
            toolUseBlockCount += 1;
        }
        const explicitResults = Array.isArray(message?.tool_results || message?.toolResults) ? (message.tool_results || message.toolResults) : [];
        for (const result of explicitResults) {
            const id = String(result?.tool_use_id || result?.toolUseId || result?.id || `tool-result-${index}`).trim();
            const name = String(result?.name || result?.tool || "").trim();
            if (id)
                toolResultIds.add(id);
            if (name)
                resultToolNames.add(name);
            toolResultBlockCount += 1;
        }
        for (const block of messageContentBlocks(message)) {
            const type = String(block?.type || "");
            if (type === "tool_use" || type === "server_tool_use") {
                const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
                const name = String(block.name || block.tool || block.tool_name || "").trim();
                if (id)
                    toolUseIds.add(id);
                if (name)
                    toolNames.add(name);
                toolUseBlockCount += 1;
            }
            else if (type === "tool_result" || type === "web_search_tool_result") {
                const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
                const name = String(block.name || block.tool || block.tool_name || "").trim();
                if (id)
                    toolResultIds.add(id);
                if (name)
                    resultToolNames.add(name);
                toolResultBlockCount += 1;
            }
            else if (type === "thinking") {
                thinkingBlockCount += 1;
            }
            else if (type === "redacted_thinking") {
                redactedThinkingBlockCount += 1;
            }
        }
    });
    return {
        toolUseIds: [...toolUseIds].slice(0, 60),
        toolResultIds: [...toolResultIds].slice(0, 60),
        toolNames: [...toolNames].slice(0, 30),
        resultToolNames: [...resultToolNames].slice(0, 30),
        toolUseBlockCount,
        toolResultBlockCount,
        thinkingBlockCount,
        redactedThinkingBlockCount,
        hasThinking: thinkingBlockCount > 0,
        hasToolUses: toolUseBlockCount > 0,
        hasToolResults: toolResultBlockCount > 0,
    };
}
function buildGroupApiMicroCompactEditPlan(messages = [], options = {}) {
    const maxInputTokens = Math.max(1, Number(options.maxInputTokens || options.max_input_tokens || exports.GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS));
    const targetInputTokens = Math.max(1, Math.min(maxInputTokens, Number(options.targetInputTokens || options.target_input_tokens || exports.GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS)));
    const clearAtLeastTokens = Math.max(0, maxInputTokens - targetInputTokens);
    const activeTokens = Number(options.activeTokens || options.active_tokens || (messages || []).reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0));
    const triggerValue = Math.max(targetInputTokens, Number(options.triggerTokens || options.trigger_tokens || maxInputTokens));
    const signals = collectApiMicroCompactSignals(messages);
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const latestMessageTime = Math.max(0, ...(messages || []).map((message) => Date.parse(String(message?.timestamp || message?.time || "")) || 0));
    const idleMinutes = Number.isFinite(Number(options.idleMinutes || options.idle_minutes))
        ? Number(options.idleMinutes || options.idle_minutes)
        : latestMessageTime > 0 ? Math.max(0, Math.round((nowMs - latestMessageTime) / 6000) / 10) : 0;
    const clearAllThinkingThresholdMinutes = Math.max(1, Number(options.clearAllThinkingAfterMinutes || options.clear_all_thinking_after_minutes || 60));
    const isRedactThinkingActive = options.isRedactThinkingActive === true || options.is_redact_thinking_active === true;
    const clearAllThinking = options.clearAllThinking === true || options.clear_all_thinking === true || idleMinutes >= clearAllThinkingThresholdMinutes;
    const force = options.force === true || options.recommend === true;
    const aboveTrigger = activeTokens >= triggerValue;
    const enableToolResultClearing = options.enableToolResultClearing !== false && options.enable_tool_result_clearing !== false;
    const enableToolUseClearing = options.enableToolUseClearing === true || options.enable_tool_use_clearing === true || force;
    const edits = [];
    const strategies = [];
    const addStrategy = (strategy, recommended, reason) => {
        const row = { ...strategy, recommended: recommended === true, reason };
        strategies.push(row);
        if (recommended) {
            const { recommended: _recommended, reason: _reason, ...apiShape } = row;
            edits.push(apiShape);
        }
    };
    if (signals.hasThinking && !isRedactThinkingActive) {
        addStrategy({
            type: "clear_thinking_20251015",
            keep: clearAllThinking ? { type: "thinking_turns", value: 1 } : "all",
        }, true, clearAllThinking ? "idle cache likely missed; keep only last thinking turn" : "preserve model-visible previous thinking blocks");
    }
    if (enableToolResultClearing && signals.hasToolResults) {
        addStrategy({
            type: "clear_tool_uses_20250919",
            trigger: { type: "input_tokens", value: triggerValue },
            clear_at_least: { type: "input_tokens", value: clearAtLeastTokens },
            clear_tool_inputs: GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
        }, force || aboveTrigger, aboveTrigger ? "input tokens exceed API microcompact trigger" : "tool results present but below trigger; keep as advisory until pressure rises");
    }
    if (enableToolUseClearing && signals.hasToolUses) {
        addStrategy({
            type: "clear_tool_uses_20250919",
            trigger: { type: "input_tokens", value: triggerValue },
            clear_at_least: { type: "input_tokens", value: clearAtLeastTokens },
            exclude_tools: GROUP_API_MICROCOMPACT_CLEARABLE_USES,
        }, force || aboveTrigger, "keep recent tool uses while preserving edit/write safety boundaries");
    }
    const config = edits.length ? { edits } : undefined;
    const base = {
        schema: "ccm-api-microcompact-edit-plan-v1",
        version: exports.GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION,
        groupId: String(options.groupId || options.group_id || ""),
        targetProject: String(options.targetProject || options.target_project || ""),
        source: "claude-code-api-microcompact-compatible",
        advisoryOnly: options.advisoryOnly !== false && options.advisory_only !== false,
        canApplyNatively: options.canApplyNatively === true || options.can_apply_natively === true,
        activeTokens,
        maxInputTokens,
        targetInputTokens,
        clearAtLeastTokens,
        trigger: { type: "input_tokens", value: triggerValue },
        aboveTrigger,
        idleMinutes,
        clearAllThinking,
        clearAllThinkingThresholdMinutes,
        isRedactThinkingActive,
        signalCounts: {
            thinkingBlocks: signals.thinkingBlockCount,
            redactedThinkingBlocks: signals.redactedThinkingBlockCount,
            toolUses: signals.toolUseBlockCount,
            toolResults: signals.toolResultBlockCount,
        },
        toolNames: signals.toolNames,
        resultToolNames: signals.resultToolNames,
        clearableResultTools: GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
        clearableUseExcludeTools: GROUP_API_MICROCOMPACT_CLEARABLE_USES,
        strategies,
        contextManagement: config || null,
        editCount: edits.length,
        recommended: edits.length > 0,
        reason: edits.length
            ? "api context-management edits available for executor that supports native microcompact"
            : signals.hasThinking || signals.hasToolResults || signals.hasToolUses
                ? "signals present but edit trigger not reached"
                : "no thinking/tool context edit signals detected",
        createdAt: options.now || new Date().toISOString(),
    };
    const { createdAt: _createdAt, idleMinutes: _idleMinutes, ...planIdentity } = base;
    return {
        ...base,
        planChecksum: crypto.createHash("sha256").update(JSON.stringify(planIdentity)).digest("hex").slice(0, 24),
    };
}
function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan = {}, options = {}) {
    const rawAgentType = String(options.agentType || options.agent_type || options.runtime || "unknown").trim().toLowerCase();
    const agentType = rawAgentType === "claude" ? "claudecode" : rawAgentType || "unknown";
    const apiRuntimes = new Set(["anthropic-api", "anthropic-sdk", "claude-api", "claude-sdk"]);
    const cliRuntimes = new Set(["claudecode", "cursor", "codex", "gemini", "qoder", "test-agent-native"]);
    const transport = String(options.transport
        || options.executorTransport
        || options.executor_transport
        || (apiRuntimes.has(agentType) ? "anthropic_api" : "cli")).trim().toLowerCase();
    const provider = String(options.provider || options.apiProvider || options.api_provider || (transport.includes("anthropic") ? "anthropic" : "")).trim().toLowerCase();
    const betaHeaders = [
        ...(Array.isArray(options.betaHeaders || options.beta_headers) ? (options.betaHeaders || options.beta_headers) : []),
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const planValid = apiEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1";
    const contextManagement = apiEditPlan?.contextManagement || apiEditPlan?.context_management || null;
    const planHasEdits = planValid && Array.isArray(contextManagement?.edits) && contextManagement.edits.length > 0;
    const explicitCapability = options.supportsApiContextManagement === true
        || options.supports_api_context_management === true
        || options.nativeContextManagement === true
        || options.native_context_management === true;
    const apiTransport = ["api", "anthropic_api", "anthropic-sdk", "claude_api", "provider_api"].includes(transport);
    const requestLayerAvailable = options.nativeApiRequestLayer === true
        || options.native_api_request_layer === true
        || (apiRuntimes.has(agentType) && apiTransport);
    const betaHeaderEnabled = options.contextManagementBetaHeaderEnabled === true
        || options.context_management_beta_header_enabled === true
        || betaHeaders.includes(exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA);
    const featureEnabled = options.enabled !== false && options.featureEnabled !== false && options.feature_enabled !== false;
    const cliAdvisoryBoundary = cliRuntimes.has(agentType) || transport === "cli" || transport === "external_cli";
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const taskAgentSessionId = String(options.taskAgentSessionId
        || options.task_agent_session_id
        || sessionBinding?.task_agent_session_id
        || sessionBinding?.taskAgentSessionId
        || "").trim();
    const nativeSessionId = String(options.nativeSessionId
        || options.native_session_id
        || sessionBinding?.native_session_id
        || sessionBinding?.nativeSessionId
        || "").trim();
    const memoryContextSnapshotId = String(options.memoryContextSnapshotId || options.memory_context_snapshot_id || "").trim();
    const memoryContextSnapshotChecksum = String(options.memoryContextSnapshotChecksum || options.memory_context_snapshot_checksum || "").trim();
    const nativeApplyReady = planHasEdits
        && explicitCapability
        && requestLayerAvailable
        && apiTransport
        && betaHeaderEnabled
        && featureEnabled
        && !cliAdvisoryBoundary;
    const checks = [
        { id: "edit_plan_valid", pass: planValid, evidence: apiEditPlan?.schema || "missing" },
        { id: "context_management_edits_present", pass: planHasEdits, evidence: `edits=${contextManagement?.edits?.length || 0}` },
        { id: "executor_capability_declared", pass: explicitCapability, evidence: explicitCapability ? "supports_api_context_management" : "not_declared" },
        { id: "native_api_request_layer_available", pass: requestLayerAvailable, evidence: transport || "unknown" },
        { id: "api_transport_selected", pass: apiTransport && !cliAdvisoryBoundary, evidence: `${agentType}:${transport}` },
        { id: "context_management_beta_enabled", pass: betaHeaderEnabled, evidence: exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA },
        { id: "feature_enabled", pass: featureEnabled, evidence: featureEnabled ? "enabled" : "disabled" },
    ];
    const failedChecks = checks.filter(item => !item.pass).map(item => item.id);
    const requestPatch = nativeApplyReady ? {
        body: {
            context_management: contextManagement,
        },
        beta_headers: [exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA],
    } : null;
    const base = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        version: exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION,
        groupId: String(options.groupId || options.group_id || apiEditPlan?.groupId || apiEditPlan?.group_id || ""),
        targetProject: String(options.targetProject || options.target_project || apiEditPlan?.targetProject || apiEditPlan?.target_project || ""),
        apiEditPlanChecksum: String(apiEditPlan?.planChecksum || apiEditPlan?.plan_checksum || ""),
        executor: {
            agentType,
            transport,
            provider,
            cli: cliAdvisoryBoundary,
        },
        capability: {
            supportsApiContextManagement: explicitCapability,
            nativeApiRequestLayer: requestLayerAvailable,
            contextManagementBetaHeaderEnabled: betaHeaderEnabled,
            requiredBetaHeader: exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA,
        },
        mode: nativeApplyReady ? "native_api_context_management" : "advisory_only",
        nativeApplyReady,
        advisoryOnly: !nativeApplyReady,
        requestPatch,
        requestPatchChecksum: requestPatch ? crypto.createHash("sha256").update(JSON.stringify(requestPatch)).digest("hex").slice(0, 24) : "",
        sessionBinding: sessionBinding?.schema ? sessionBinding : null,
        session_binding: sessionBinding?.schema ? sessionBinding : null,
        sessionBindingRequired: !!(taskAgentSessionId || nativeSessionId || memoryContextSnapshotId || memoryContextSnapshotChecksum),
        taskAgentSessionId,
        task_agent_session_id: taskAgentSessionId,
        nativeSessionId,
        native_session_id: nativeSessionId,
        memoryContextSnapshotId,
        memory_context_snapshot_id: memoryContextSnapshotId,
        memoryContextSnapshotChecksum,
        memory_context_snapshot_checksum: memoryContextSnapshotChecksum,
        receiptContract: {
            required_receipt_fields: ["apiMicrocompactUsage", "task_agent_session_id", "memory_context_snapshot_id"],
            required_plan_checksum: String(apiEditPlan?.planChecksum || apiEditPlan?.plan_checksum || ""),
            required_apply_plan_checksum: "",
            required_request_patch_checksum: "",
            required_task_agent_session_id: taskAgentSessionId,
            required_native_session_id: nativeSessionId,
            required_memory_context_snapshot_id: memoryContextSnapshotId,
            required_memory_context_snapshot_checksum: memoryContextSnapshotChecksum,
            receipt_should_match_session: !!(taskAgentSessionId || nativeSessionId),
            receipt_should_match_memory_context_snapshot: !!(memoryContextSnapshotId || memoryContextSnapshotChecksum),
            native_applied_requires_request_patch_checksum: nativeApplyReady,
        },
        checks,
        failedChecks,
        action: nativeApplyReady
            ? "merge_request_patch_into_provider_api_request"
            : "surface_edit_plan_as_context_pressure_advisory",
        reason: nativeApplyReady
            ? "executor exposes Anthropic API request construction with context-management beta enabled"
            : cliAdvisoryBoundary
                ? "external CLI executor does not expose provider request body; keep API microcompact advisory"
                : failedChecks.length
                    ? `native apply readiness checks failed: ${failedChecks.join(",")}`
                    : "native apply is not available",
        createdAt: options.now || new Date().toISOString(),
    };
    return {
        ...base,
        applyPlanChecksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
        receiptContract: {
            ...base.receiptContract,
            required_apply_plan_checksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
            required_request_patch_checksum: base.requestPatchChecksum,
        },
    };
}
function buildGroupCompactWindowInvariants(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const startIndex = Math.max(0, Math.min(messages.length, Number(input.startIndex || 0)));
    const keepIndex = Math.max(startIndex, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
    const compactedMessages = Array.isArray(input.messagesToCompact)
        ? input.messagesToCompact
        : messages.slice(startIndex, keepIndex);
    const keptMessages = Array.isArray(input.keptMessages)
        ? input.keptMessages
        : messages.slice(keepIndex);
    const compactedRefs = collectWindowBlockRefs(compactedMessages, startIndex);
    const keptRefs = collectWindowBlockRefs(keptMessages, keepIndex);
    const missingToolUses = [...keptRefs.toolResultIds].filter(id => !keptRefs.toolUseIds.has(id) && compactedRefs.toolUseIds.has(id));
    const splitThinkingMessageIds = [...keptRefs.thinkingMessageIds].filter(id => compactedRefs.thinkingMessageIds.has(id));
    const firstKeptTaskId = groupMessageTaskId(keptMessages[0]);
    const previousTaskId = keepIndex > startIndex ? groupMessageTaskId(messages[keepIndex - 1]) : "";
    const noSplitTaskTransactions = !firstKeptTaskId || firstKeptTaskId !== previousTaskId;
    const preservedSegment = input.preservedSegment || {};
    const preservedCount = Number(preservedSegment.preservedMessageCount || keptMessages.length || 0);
    const preservedTokens = Number(preservedSegment.preservedTokenEstimate || keptMessages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0));
    const minTokens = Number(preservedSegment.minTokens || input.minTokens || exports.GROUP_COMPACT_MIN_KEEP_TOKENS);
    const minMessages = Number(preservedSegment.minTextBlockMessages || input.minMessages || exports.GROUP_COMPACT_MIN_KEEP_MESSAGES);
    return {
        noSplitTaskTransactions,
        noSplitToolResultPairs: missingToolUses.length === 0,
        noSplitThinkingBlocks: splitThinkingMessageIds.length === 0,
        preservedRecentWindowRecorded: preservedSegment?.schema === "ccm-group-preserved-segment-v1" || keptMessages.length > 0,
        preservedTokenFloorSatisfied: preservedTokens >= Math.min(minTokens, Math.max(1, preservedTokens)),
        preservedMessageFloorSatisfied: preservedCount >= Math.min(minMessages, Math.max(1, preservedCount)),
        missingToolUseIds: missingToolUses.slice(0, 12),
        splitThinkingMessageIds: splitThinkingMessageIds.slice(0, 12),
        firstKeptTaskId,
        previousTaskId,
        compactedBlockCount: compactedRefs.rows.length,
        keptBlockCount: keptRefs.rows.length,
    };
}
function buildGroupCompactStrategyDecision(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const keepIndex = Math.max(0, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
    const startIndex = Math.max(0, Math.min(keepIndex, Number(input.startIndex ?? Math.max(0, keepIndex - (Array.isArray(input.messagesToCompact) ? input.messagesToCompact.length : 0)))));
    const messagesToCompact = Array.isArray(input.messagesToCompact) ? input.messagesToCompact : messages.slice(startIndex, keepIndex);
    const keptMessages = Array.isArray(input.keptMessages) ? input.keptMessages : messages.slice(keepIndex);
    const partialCompact = input.partialCompact || null;
    const microCompact = input.microCompact || null;
    const ptlEmergency = input.ptlEmergency || null;
    const ptlRecovery = input.ptlRecovery || null;
    const compacted = input.compacted === true;
    const primaryCompact = input.primaryCompact !== false && messagesToCompact.length > 0;
    const preCompactTokenCount = Number(input.preCompactTokenCount || input.activeTokens || 0);
    const postCompactTokenEstimate = Number(input.postCompactTokenCount || input.postCompactTokenEstimate || 0);
    const triggerTokens = Number(input.triggerTokens || input.autoCompactThreshold || 0);
    const tokenPressurePercent = triggerTokens > 0
        ? Math.round((Number(input.activeTokens || preCompactTokenCount || 0) / triggerTokens) * 1000) / 10
        : null;
    const reasons = [];
    let mode = "normal_compact";
    if (!compacted) {
        mode = messagesToCompact.length <= 0 ? "recent_window_only" : "skip_below_threshold";
        reasons.push(messagesToCompact.length <= 0 ? "no eligible older messages beyond preserved window" : "below auto compact pressure threshold");
    }
    else if (ptlEmergency?.engaged) {
        mode = "ptl_emergency";
        reasons.push(ptlEmergency.reason || "post compact token pressure still too high");
    }
    else if (ptlRecovery?.recovered) {
        mode = "ptl_recovery";
        reasons.push(ptlRecovery.reason || "previous PTL emergency recovered");
    }
    else if (partialCompact?.enabled && partialCompact?.sidecar === true && !primaryCompact) {
        mode = "partial_sidecar";
        reasons.push(partialCompact.reason || "manual partial sidecar keeps raw transcript unchanged");
    }
    else if (partialCompact?.enabled && partialCompact?.sidecar !== true) {
        mode = "partial_compact";
        reasons.push(partialCompact.reason || "manual partial compact selected a primary boundary");
    }
    else if (microCompact?.timeBased?.triggered || Number(microCompact?.compactedMessageCount || 0) > 0 || Number(microCompact?.tokensFreed || 0) > 0) {
        mode = "micro_compact";
        reasons.push(microCompact?.timeBased?.triggered ? "time based micro compact assisted primary summary" : "large agent output micro compact assisted primary summary");
    }
    else {
        reasons.push(input.force ? "manual compact requested" : input.reason || "auto compact selected session-memory style summary plus recent window");
    }
    if (input.force)
        reasons.push("force=true");
    if (input.preCompactWarning?.level)
        reasons.push(`pressure=${input.preCompactWarning.level}`);
    const preservedSegment = input.preservedSegment || (messages.length
        ? buildGroupPreservedSegment(messages, keepIndex, {
            floorIndex: startIndex,
            summaryChecksum: input.summaryChecksum || "",
            transcriptPath: input.transcriptPath || "",
            now: input.now,
        })
        : null);
    const invariants = buildGroupCompactWindowInvariants({
        messages,
        messagesToCompact,
        keptMessages,
        startIndex,
        keepIndex,
        preservedSegment,
    });
    const base = {
        schema: "ccm-group-compact-strategy-decision-v1",
        version: exports.GROUP_COMPACT_STRATEGY_DECISION_VERSION,
        decisionId: String(input.decisionId || `gcsd_${crypto.createHash("sha1").update([
            input.groupId || "",
            input.now || "",
            mode,
            startIndex,
            keepIndex,
            messages.length,
            input.summaryChecksum || "",
        ].join(":")).digest("hex").slice(0, 16)}`),
        groupId: String(input.groupId || ""),
        mode,
        strategy: "cc-session-memory-v3-compatible",
        compacted,
        primaryCompact,
        reason: compactText(input.reason || reasons.filter(Boolean).join("; "), 700),
        reasons: reasons.filter(Boolean).map(item => compactText(item, 240)).slice(0, 8),
        startIndex,
        keepIndex,
        activeMessageCount: Number(input.activeMessageCount ?? Math.max(0, messages.length - startIndex)),
        messagesToSummarize: messagesToCompact.length,
        keptMessages: keptMessages.length,
        summarizedFromMessageId: messagesToCompact.length ? messageIdentity(messagesToCompact[0], startIndex) : "",
        summarizedThroughMessageId: messagesToCompact.length ? messageIdentity(messagesToCompact[messagesToCompact.length - 1], keepIndex - 1) : "",
        firstKeptMessageId: keptMessages.length ? messageIdentity(keptMessages[0], keepIndex) : "",
        lastKeptMessageId: keptMessages.length ? messageIdentity(keptMessages[keptMessages.length - 1], messages.length - 1) : "",
        preCompactTokenCount,
        postCompactTokenEstimate,
        activeTokensBeforeCompact: Number(input.activeTokens || preCompactTokenCount || 0),
        triggerTokens,
        tokenPressurePercent,
        reductionRatio: preCompactTokenCount > 0 && postCompactTokenEstimate > 0
            ? Math.round(Math.max(0, 1 - postCompactTokenEstimate / preCompactTokenCount) * 1000) / 1000
            : null,
        sessionMemoryAvailable: input.sessionMemoryAvailable === true || !!input.sessionMemory?.schema || !!input.memory?.sessionMemory?.schema,
        preservedSegment,
        microCompact: microCompact ? {
            schema: microCompact.schema || "",
            recordCount: Number(microCompact.recordCount || 0),
            compactedMessageCount: Number(microCompact.compactedMessageCount || 0),
            tokensFreed: Number(microCompact.tokensFreed || 0),
            timeBasedTriggered: microCompact.timeBased?.triggered === true,
            timeBasedClearedCount: Number(microCompact.timeBased?.clearedCount || 0),
        } : null,
        partialCompact: partialCompact ? {
            requested: partialCompact.requested === true,
            enabled: partialCompact.enabled === true,
            sidecar: partialCompact.sidecar === true,
            direction: partialCompact.direction || "",
            reason: partialCompact.reason || "",
            selectedMessageId: partialCompact.selectedMessageId || "",
            summarizedThroughMessageId: partialCompact.summarizedThroughMessageId || "",
        } : null,
        ptlEmergency: ptlEmergency ? {
            engaged: ptlEmergency.engaged === true,
            emergencyLevel: ptlEmergency.emergencyLevel || "",
            reason: ptlEmergency.reason || "",
            messageDigestMaxChars: Number(ptlEmergency.messageDigestMaxChars || 0),
        } : null,
        ptlRecovery: ptlRecovery ? {
            recovered: ptlRecovery.recovered === true,
            reason: ptlRecovery.reason || "",
            restoredMessageDigestMaxChars: Number(ptlRecovery.restoredMessageDigestMaxChars || 0),
            contextBudgetPressure: ptlRecovery.contextBudgetPressure ?? null,
        } : null,
        transcriptPath: String(input.transcriptPath || ""),
        summaryChecksum: String(input.summaryChecksum || ""),
        invariants,
        invariantPass: Object.entries(invariants)
            .filter(([, value]) => typeof value === "boolean")
            .every(([, value]) => value === true),
        createdAt: input.now || new Date().toISOString(),
    };
    return {
        ...base,
        decisionChecksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
    };
}
function resolvePartialCompactWindow(messages, previousBoundaryIndex, options = {}) {
    const request = options?.partialCompact || options?.groupPartialCompact || null;
    if (!request)
        return null;
    const startIndex = Math.max(0, Math.min(messages.length, previousBoundaryIndex + 1));
    const direction = String(request.direction || request.mode || "up_to").toLowerCase().replace(/[-\s]+/g, "_");
    const selectedMessageId = compactText(request.messageId || request.throughMessageId || request.untilMessageId || "", 240);
    const base = {
        schema: "ccm-group-partial-compact-v1",
        version: exports.GROUP_PARTIAL_COMPACT_VERSION,
        requested: true,
        enabled: false,
        supported: false,
        direction,
        startIndex,
        keepIndex: startIndex,
        selectedIndex: -1,
        selectedMessageId,
        sidecar: false,
        reason: compactText(request.reason || "", 500),
    };
    if (!messages.length)
        return { ...base, reason: base.reason || "empty_messages" };
    let selectedIndex = -1;
    if (selectedMessageId) {
        selectedIndex = messages.findIndex((message, index) => messageIdentity(message, index) === selectedMessageId);
    }
    const rawIndex = request.index ?? request.messageIndex ?? request.throughIndex ?? request.untilIndex;
    const numericIndex = Number(rawIndex);
    if (selectedIndex < 0 && Number.isFinite(numericIndex) && numericIndex >= 0 && numericIndex < messages.length) {
        selectedIndex = Math.trunc(numericIndex);
    }
    const findRangeIndex = (idKeys, indexKeys, fallback = -1) => {
        for (const key of idKeys) {
            const id = compactText(request[key], 240);
            if (!id)
                continue;
            const found = messages.findIndex((message, index) => messageIdentity(message, index) === id);
            if (found >= 0)
                return found;
        }
        for (const key of indexKeys) {
            const value = Number(request[key]);
            if (Number.isFinite(value) && value >= 0 && value < messages.length)
                return Math.trunc(value);
        }
        return fallback;
    };
    if (direction === "range" || direction === "from") {
        const rangeStart = findRangeIndex(["fromMessageId", "startMessageId", "messageId"], ["fromIndex", "startIndex", "index", "messageIndex"], selectedIndex);
        const rangeEnd = direction === "from"
            ? findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex"], messages.length - 1)
            : findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId", "messageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex", "index", "messageIndex"], selectedIndex);
        if (rangeStart < 0 || rangeEnd < 0)
            return { ...base, reason: base.reason || "selected_message_not_found" };
        if (rangeEnd < rangeStart) {
            return {
                ...base,
                supported: true,
                selectedIndex: rangeStart,
                selectedMessageId: messageIdentity(messages[rangeStart], rangeStart),
                sidecar: true,
                reason: base.reason || "invalid_range_end_before_start",
            };
        }
        return {
            ...base,
            enabled: true,
            supported: true,
            sidecar: true,
            primaryWindow: false,
            direction,
            selectedIndex: rangeStart,
            selectedMessageId: messageIdentity(messages[rangeStart], rangeStart),
            rangeStartIndex: rangeStart,
            rangeEndIndex: rangeEnd,
            summarizedFromMessageId: messageIdentity(messages[rangeStart], rangeStart),
            summarizedThroughMessageId: messageIdentity(messages[rangeEnd], rangeEnd),
            summarizedMessageCount: rangeEnd - rangeStart + 1,
            keepIndex: startIndex,
            rawTranscriptUnmodified: true,
            reason: base.reason || `manual_partial_compact_${direction}_sidecar`,
        };
    }
    if (selectedIndex < 0)
        return { ...base, reason: base.reason || "selected_message_not_found" };
    const actualSelectedId = messageIdentity(messages[selectedIndex], selectedIndex);
    if (direction !== "up_to") {
        return {
            ...base,
            selectedIndex,
            selectedMessageId: actualSelectedId,
            reason: base.reason || `unsupported_direction_${direction}`,
        };
    }
    if (selectedIndex < startIndex) {
        return {
            ...base,
            selectedIndex,
            selectedMessageId: actualSelectedId,
            reason: base.reason || "selected_message_before_current_boundary",
        };
    }
    const keepIndex = selectedIndex + 1;
    return {
        ...base,
        enabled: true,
        supported: true,
        direction: "up_to",
        keepIndex,
        selectedIndex,
        selectedMessageId: actualSelectedId,
        summarizedFromMessageId: messages[startIndex] ? messageIdentity(messages[startIndex], startIndex) : "",
        summarizedThroughMessageId: actualSelectedId,
        preservedLaterMessageCount: Math.max(0, messages.length - keepIndex),
        reason: base.reason || "manual_partial_compact_up_to",
    };
}
function buildGroupPtlEmergencyPlan(input) {
    const config = input.config || {};
    const explicitlyEnabled = config.ptlEmergency === true
        || config.groupPtlEmergency === true
        || config.memoryPtlEmergency === true;
    const triggerTokens = Number(input.triggerTokens || 0);
    const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
    const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
    const pressure = Number(input.contextBudget?.pressure || 0);
    const shouldEngage = explicitlyEnabled || postRatio >= 0.95 || pressure >= 100;
    if (!shouldEngage)
        return null;
    const emergencyLevel = explicitlyEnabled
        ? "forced"
        : postRatio >= 1 || pressure >= 100
            ? "critical"
            : "high";
    const messageDigestMaxChars = emergencyLevel === "critical" ? 6000 : emergencyLevel === "high" ? 8000 : 7000;
    const compactedIds = (input.messagesToCompact || []).map((message, index) => messageIdentity(message, Number(input.startIndex || 0) + index));
    const condensedMessageIds = compactedIds.length > 50
        ? [...compactedIds.slice(0, 24), ...compactedIds.slice(-24)]
        : compactedIds;
    const reason = explicitlyEnabled
        ? "forced_by_config"
        : pressure >= 100
            ? "context_budget_pressure_exhausted"
            : "post_compact_tokens_near_trigger";
    return {
        schema: "ccm-group-ptl-emergency-v1",
        version: exports.GROUP_PTL_EMERGENCY_VERSION,
        engaged: true,
        emergencyLevel,
        reason,
        activeTokensBeforeCompact: Number(input.activeTokens || 0),
        triggerTokens,
        preCompactTokenCount: Number(input.preCompactTokenCount || 0),
        postCompactTokenCount,
        postCompactRatio: Math.round(postRatio * 1000) / 1000,
        contextBudgetPressure: pressure,
        summaryRenderMaxChars: messageDigestMaxChars,
        messageDigestMaxChars,
        rawTranscriptPath: input.transcriptPath,
        rawTranscriptUnmodified: true,
        compactedRange: {
            fromMessageId: input.messagesToCompact?.length
                ? messageIdentity(input.messagesToCompact[0], Number(input.startIndex || 0))
                : "",
            throughMessageId: input.messagesToCompact?.length
                ? messageIdentity(input.messagesToCompact[input.messagesToCompact.length - 1], Number(input.keepIndex || 1) - 1)
                : "",
            messageCount: input.messagesToCompact?.length || 0,
        },
        condensedMessageIds,
        omittedCondensedMessageIds: Math.max(0, compactedIds.length - condensedMessageIds.length),
        preservedRecentMessageIds: (input.keptMessages || []).slice(-40).map((message, index) => messageIdentity(message, Number(input.keepIndex || 0) + Math.max(0, (input.keptMessages || []).length - 40) + index)),
        safeguards: [
            "raw_transcript_retained",
            "deterministic_summary_fallback",
            "quality_gate_checked",
            "fact_anchor_recovery",
            "typed_memory_recall_available",
        ],
        createdAt: input.now || new Date().toISOString(),
    };
}
function buildGroupPtlRecoveryPlan(input = {}) {
    const previous = input.previousPtlEmergency || input.previous_ptl_emergency || null;
    if (!previous?.engaged)
        return null;
    if (input.currentPtlEmergency?.engaged)
        return null;
    const config = input.config || {};
    const pressure = Number(input.contextBudget?.pressure || 0);
    const triggerTokens = Number(input.triggerTokens || previous.triggerTokens || 0);
    const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
    const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
    const pressureThreshold = Math.max(20, Math.min(95, Number(config.ptlRecoveryPressure || config.ptl_recovery_pressure || 72)));
    const ratioThreshold = Math.max(0.2, Math.min(0.95, Number(config.ptlRecoveryRatio || config.ptl_recovery_ratio || 0.82)));
    const explicitlyForced = config.ptlRecover === true || config.ptlRecovery === true || config.groupPtlRecovery === true;
    const safe = explicitlyForced || (pressure <= pressureThreshold && postRatio <= ratioThreshold && input.contextBudget?.compact_recommended !== true);
    if (!safe)
        return null;
    return {
        schema: "ccm-group-ptl-recovery-v1",
        version: exports.GROUP_PTL_RECOVERY_VERSION,
        recovered: true,
        reason: explicitlyForced ? "forced_by_config" : "context_pressure_back_in_safe_band",
        previousEmergencyLevel: previous.emergencyLevel || "",
        previousEmergencyReason: previous.reason || "",
        previousMessageDigestMaxChars: Number(previous.messageDigestMaxChars || previous.summaryRenderMaxChars || 0),
        restoredMessageDigestMaxChars: Number(input.restoredMessageDigestMaxChars || 14_000),
        triggerTokens,
        postCompactTokenCount,
        postCompactRatio: Math.round(postRatio * 1000) / 1000,
        contextBudgetPressure: pressure,
        pressureThreshold,
        ratioThreshold,
        summaryChecksum: input.summaryChecksum || "",
        rawTranscriptPath: input.transcriptPath || previous.rawTranscriptPath || "",
        rawTranscriptUnmodified: true,
        recoveredAt: input.now || new Date().toISOString(),
    };
}
function getGroupAutoCompactThreshold(config = {}) {
    const capacity = resolveGroupModelContextCapacity(config);
    const configuredThreshold = Number(config?.modelAutoCompactTokenLimit
        || config?.model_auto_compact_token_limit
        || config?.memoryAutoCompactTokenLimit
        || config?.memory_auto_compact_token_limit
        || 0);
    if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
        return Math.max(18_000, Math.min(Math.floor(configuredThreshold), capacity.effectiveContextWindow - exports.GROUP_MANUAL_COMPACT_BUFFER_TOKENS));
    }
    return Math.max(18_000, capacity.effectiveContextWindow - exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS);
}
function resolveGroupModelContextCapacity(config = {}) {
    const capabilities = config?.modelCapabilities || config?.model_capabilities || {};
    const providerCapability = Number(capabilities?.max_input_tokens || capabilities?.context_window || 0) > 0
        ? {
            source: "explicit_provider_capability",
            contextWindow: Number(capabilities.max_input_tokens || capabilities.context_window),
            maxOutputTokens: Number(capabilities.max_output_tokens || exports.GROUP_CONTEXT_RESERVED_TOKENS),
            verified: capabilities.verified === true,
            checkedAt: capabilities.checked_at || capabilities.checkedAt,
            expiresAt: capabilities.expires_at || capabilities.expiresAt,
            evidenceId: capabilities.evidence_id || capabilities.evidenceId,
        }
        : null;
    const capacity = (0, model_capability_cache_1.resolveTrustedModelContextCapacity)({
        provider: config?.provider || config?.agentProvider || config?.format || "group-main-agent",
        model: config?.model || "",
        modelContextWindow: config?.modelContextWindow
            || config?.model_context_window
            || config?.memoryContextWindowTokens
            || config?.contextWindowTokens
            || process.env.CCM_GROUP_CONTEXT_WINDOW_TOKENS,
        modelMaxOutputTokens: config?.modelMaxOutputTokens
            || config?.model_max_output_tokens
            || config?.maxOutputTokens,
        capacityCheckedAt: config?.modelCapacityCheckedAt || config?.model_capacity_checked_at,
        providerCapability,
        nativeExecutorReceipt: config?.nativeModelCapabilityReceipt || config?.native_model_capability_receipt,
    });
    const legacyReserve = Number(config?.memoryReservedTokens || config?.memory_reserved_tokens || 0);
    if (!(legacyReserve > 0))
        return capacity;
    const reservedOutputTokens = Math.min(capacity.contextWindow - 16_000, Math.max(0, legacyReserve));
    const effectiveContextWindow = Math.max(18_000, capacity.contextWindow - reservedOutputTokens);
    return {
        ...capacity,
        reservedOutputTokens,
        effectiveContextWindow,
        autoCompactBufferTokens: exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS,
        autoCompactThreshold: Math.max(18_000, effectiveContextWindow - exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS),
        reserveSource: "legacy_user_setting",
    };
}
function getGroupEffectiveContextWindow(config = {}) {
    return resolveGroupModelContextCapacity(config).effectiveContextWindow;
}
function calculateGroupCompactWarningState(input = {}) {
    const config = input.config || {};
    const tokenUsage = Math.max(0, Number(input.activeTokens ?? input.tokenUsage ?? input.token_usage ?? 0));
    const effectiveContextWindow = Number(input.effectiveContextWindow || input.effective_context_window || getGroupEffectiveContextWindow(config));
    const autoCompactThreshold = Math.max(1, Number(input.autoCompactThreshold || input.auto_compact_threshold || getGroupAutoCompactThreshold(config)));
    const warningBufferTokens = Number(config.groupWarningBufferTokens || config.warningBufferTokens || exports.GROUP_WARNING_BUFFER_TOKENS);
    const errorBufferTokens = Number(config.groupErrorBufferTokens || config.errorBufferTokens || exports.GROUP_ERROR_BUFFER_TOKENS);
    const manualCompactBufferTokens = Number(config.groupManualCompactBufferTokens || config.manualCompactBufferTokens || exports.GROUP_MANUAL_COMPACT_BUFFER_TOKENS);
    const warningThreshold = Math.max(0, autoCompactThreshold - warningBufferTokens);
    const errorThreshold = Math.max(0, autoCompactThreshold - errorBufferTokens);
    const blockingOverride = Number(config.groupBlockingLimitTokens || config.blockingLimitTokens || process.env.CCM_GROUP_BLOCKING_LIMIT_TOKENS || 0);
    const blockingThreshold = blockingOverride > 0
        ? blockingOverride
        : Math.max(0, effectiveContextWindow - manualCompactBufferTokens);
    const percentLeft = Math.max(0, Math.round(((autoCompactThreshold - tokenUsage) / autoCompactThreshold) * 100));
    const isAboveWarningThreshold = tokenUsage >= warningThreshold;
    const isAboveErrorThreshold = tokenUsage >= errorThreshold;
    const isAboveAutoCompactThreshold = tokenUsage >= autoCompactThreshold;
    const isAtBlockingLimit = tokenUsage >= blockingThreshold;
    const suppressed = input.suppressed === true || input.suppress === true;
    const level = suppressed
        ? "suppressed"
        : isAtBlockingLimit
            ? "blocking"
            : isAboveAutoCompactThreshold
                ? "auto_compact"
                : isAboveErrorThreshold
                    ? "error"
                    : isAboveWarningThreshold
                        ? "warning"
                        : "ok";
    const recommendation = suppressed
        ? "suppress_warning_until_next_pressure_sample"
        : isAtBlockingLimit
            ? "block_new_context_until_compacted_or_ptl_recovered"
            : isAboveAutoCompactThreshold
                ? "auto_compact_now"
                : isAboveWarningThreshold
                    ? "compact_soon_or_reduce_raw_context"
                    : "continue";
    return {
        schema: "ccm-group-compact-warning-v1",
        version: 1,
        tokenUsage,
        activeMessageCount: Number(input.activeMessageCount || input.active_message_count || 0),
        percentLeft,
        level,
        recommendation,
        suppressed,
        suppressReason: suppressed ? compactText(input.suppressReason || input.suppress_reason || "post_compaction_warning_suppression", 240) : "",
        thresholds: {
            effectiveContextWindow,
            autoCompactThreshold,
            warningThreshold,
            errorThreshold,
            blockingThreshold,
            autoCompactBufferTokens: exports.GROUP_AUTOCOMPACT_BUFFER_TOKENS,
            warningBufferTokens,
            errorBufferTokens,
            manualCompactBufferTokens,
        },
        flags: {
            isAboveWarningThreshold,
            isAboveErrorThreshold,
            isAboveAutoCompactThreshold,
            isAtBlockingLimit,
        },
        createdAt: input.now || new Date().toISOString(),
    };
}
function createEmptyConversationSummary() {
    return {
        primaryRequest: "",
        userMessages: [],
        keyConcepts: [],
        filesAndCode: [],
        errorsAndFixes: [],
        decisions: [],
        completedWork: [],
        pendingTasks: [],
        currentWork: "",
        nextStep: "",
        participantState: [],
        taskStates: [],
    };
}
function extractFiles(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
        ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
        ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
            ? message.delivery_summary.actual_file_changes.map((item) => item?.path || item?.file || item)
            : []),
    ];
    const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}
function extractRuntimeSkillFacts(message) {
    const facts = [];
    const actor = message?.agent || message?.role || "Agent";
    const add = (item) => {
        const name = typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name;
        const hash = typeof item === "object" && item?.contentHash ? `#${item.contentHash}` : "";
        if (name)
            facts.push(`${actor} 使用 Skill:${name}${hash}`);
    };
    for (const item of Array.isArray(message?.invokedSkills) ? message.invokedSkills : [])
        add(item);
    for (const item of Array.isArray(message?.receipt?.invokedSkills) ? message.receipt.invokedSkills : [])
        add(item);
    for (const item of Array.isArray(message?.delivery_summary?.runtime_tooling?.invoked_skills) ? message.delivery_summary.runtime_tooling.invoked_skills : [])
        add(item);
    for (const item of Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : [])
        if (/Skill\s*[:：]/i.test(String(item || "")))
            add(item);
    return Array.from(new Set(facts)).slice(0, 12);
}
function extractVerificationFacts(message) {
    return uniqueStrings([
        ...stringArray(message?.verification, 12),
        ...stringArray(message?.tests, 12),
        ...stringArray(message?.receipt?.verification, 12),
        ...stringArray(message?.receipt?.tests, 12),
        ...stringArray(message?.delivery_summary?.verification_executed, 12),
        ...stringArray(message?.delivery_summary?.verification_failed, 12),
        ...stringArray(message?.delivery_summary?.verification_suggested, 12),
        ...stringArray(message?.delivery_summary?.verification_required_missing, 12),
    ], 16);
}
function extractMessageStatus(message) {
    return String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").trim();
}
function messageTimestampMs(message) {
    const raw = message?.timestamp || message?.time || message?.created_at || message?.updated_at || "";
    const parsed = Date.parse(String(raw || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function isGroupMicroCompactableMessage(message, includeUser = false) {
    if (!message)
        return false;
    if (!includeUser && message.role === "user")
        return false;
    if (messageContent(message))
        return true;
    const artifacts = extractPostCompactArtifacts(message);
    return !!(artifacts.files.length || artifacts.skills.length || artifacts.verification.length || artifacts.blockers.length);
}
function resolveGroupTimeBasedMicroCompact(messages, options = {}, includeUser = false) {
    const raw = options.timeBased || options.time_based || options.timeBasedMicroCompact || options.time_based_micro_compact || {};
    const enabled = raw.enabled === true || options.timeBased === true || options.time_based === true || options.timeBasedMicroCompact === true;
    const thresholdMinutes = Math.max(1, Number(raw.gapThresholdMinutes || raw.gap_threshold_minutes || options.gapThresholdMinutes || options.gap_threshold_minutes || 60));
    const keepRecent = Math.max(1, Number(raw.keepRecent || raw.keep_recent || options.keepRecent || options.keep_recent || 5));
    const nowMs = Date.parse(String(raw.now || options.now || "")) || Date.now();
    const compactable = (messages || [])
        .map((message, index) => ({ message, index }))
        .filter(item => isGroupMicroCompactableMessage(item.message, includeUser));
    const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || message?.agent);
    const lastAssistantMs = messageTimestampMs(lastAssistant);
    const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
    const force = raw.force === true || options.forceTimeBased === true || options.force_time_based === true;
    const triggered = enabled && compactable.length > keepRecent && (force || (!!lastAssistantMs && gapMinutes >= thresholdMinutes));
    const keepSet = new Set(compactable.slice(-keepRecent).map(item => item.index));
    const clearSet = new Set(triggered ? compactable.filter(item => !keepSet.has(item.index)).map(item => item.index) : []);
    return {
        schema: "ccm-group-time-based-micro-compact-v1",
        version: exports.GROUP_TIME_BASED_MICRO_COMPACT_VERSION,
        enabled,
        triggered,
        force,
        gapMinutes,
        gapThresholdMinutes: thresholdMinutes,
        keepRecent,
        compactableCount: compactable.length,
        clearedCount: clearSet.size,
        keptCount: Math.min(keepRecent, compactable.length),
        lastAssistantAt: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
        now: new Date(nowMs).toISOString(),
        clearSet,
        keepSet,
        reason: !enabled
            ? "disabled"
            : compactable.length <= keepRecent
                ? "not_enough_compactable_messages"
                : triggered
                    ? force
                        ? "forced"
                        : "assistant_gap_exceeded_threshold"
                    : "gap_under_threshold",
    };
}
function extractPostCompactArtifacts(message) {
    const delivery = message?.delivery_summary || {};
    const receipt = message?.receipt || {};
    const files = uniqueStrings([
        ...extractFiles(message),
        ...stringArray(receipt.filesChanged || receipt.files_changed || receipt.files, 16),
        ...stringArray(delivery.actual_file_changes, 16),
        ...stringArray(delivery.filesChanged || delivery.files_changed || delivery.files, 16),
    ], 18);
    const skills = uniqueStrings(extractRuntimeSkillFacts(message).map(item => item.replace(/^.*?Skill:/i, "")), 10);
    const verification = extractVerificationFacts(message);
    const blockers = uniqueStrings([
        ...stringArray(message?.blockers, 8),
        ...stringArray(message?.needs, 8),
        ...stringArray(receipt.blockers, 8),
        ...stringArray(receipt.needs, 8),
        ...stringArray(delivery.blockers, 8),
        ...stringArray(delivery.needs, 8),
    ], 12);
    return { files, skills, verification, blockers };
}
function buildGroupMicroCompactPlan(messages, options = {}) {
    const maxChars = Math.max(600, Number(options.maxChars || options.max_chars || 1800));
    const includeUser = options.includeUser === true || options.include_user === true;
    const timeBased = resolveGroupTimeBasedMicroCompact(messages, options, includeUser);
    const records = [];
    let tokensBefore = 0;
    let tokensAfter = 0;
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        if (!includeUser && message?.role === "user")
            continue;
        const content = messageContent(message);
        if (!content)
            continue;
        const compacted = (0, context_budget_1.microCompactText)(content, maxChars);
        const artifacts = extractPostCompactArtifacts(message);
        const timeBasedCleared = timeBased.clearSet.has(index);
        const clearedText = `${exports.GROUP_TIME_BASED_MC_CLEARED_MESSAGE} #${messageIdentity(message, index)}; raw transcript retained.`;
        const effectiveTokensAfter = timeBasedCleared ? estimateGroupTextTokens(clearedText) : compacted.tokens_after;
        tokensBefore += compacted.tokens_before;
        tokensAfter += effectiveTokensAfter;
        if (!timeBasedCleared && !compacted.compacted && !artifacts.files.length && !artifacts.skills.length && !artifacts.verification.length && !artifacts.blockers.length)
            continue;
        records.push({
            messageId: messageIdentity(message, index),
            index,
            role: message?.role || "",
            actor: messageActor(message),
            agent: message?.agent || "",
            taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
            status: extractMessageStatus(message),
            timestamp: String(message?.timestamp || message?.time || ""),
            compacted: timeBasedCleared || compacted.compacted,
            compactReason: timeBasedCleared ? "time_based_microcompact" : compacted.compacted ? "size_based_microcompact" : "artifact_index",
            timeBasedCleared,
            originalChars: compacted.original_chars,
            compactedChars: timeBasedCleared ? clearedText.length : compacted.compacted_chars,
            tokensBefore: compacted.tokens_before,
            tokensAfter: effectiveTokensAfter,
            tokensFreed: Math.max(0, compacted.tokens_before - effectiveTokensAfter),
            checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
            text: timeBasedCleared ? clearedText : compacted.compacted ? compacted.text : compactText(content, Math.min(maxChars, 900)),
            files: artifacts.files,
            skills: artifacts.skills,
            verification: artifacts.verification,
            blockers: artifacts.blockers,
        });
    }
    const boundedRecords = records.slice(-exports.GROUP_MICRO_COMPACT_MAX_RECORDS);
    const compactedRecords = boundedRecords.filter(item => item.compacted);
    return {
        schema: "ccm-group-micro-compact-v1",
        version: exports.GROUP_MICRO_COMPACT_VERSION,
        sourceMessageCount: (messages || []).length,
        recordCount: boundedRecords.length,
        compactedMessageCount: compactedRecords.length,
        tokensBefore,
        tokensAfter,
        tokensFreed: Math.max(0, tokensBefore - tokensAfter),
        maxChars,
        timeBased: {
            ...timeBased,
            clearSet: undefined,
            keepSet: undefined,
        },
        records: boundedRecords,
    };
}
function buildPostCompactReinjectionPlan(messages, microCompact = {}, options = {}) {
    const fileBudget = Math.max(1, Number(options.fileBudget || options.file_budget || exports.GROUP_POST_COMPACT_FILE_BUDGET));
    const skillBudget = Math.max(1, Number(options.skillBudget || options.skill_budget || exports.GROUP_POST_COMPACT_SKILL_BUDGET));
    const verificationBudget = Math.max(1, Number(options.verificationBudget || options.verification_budget || exports.GROUP_POST_COMPACT_VERIFICATION_BUDGET));
    const fileRows = [];
    const skillRows = [];
    const verificationRows = [];
    const blockerRows = [];
    const addRows = (rows, values, source, kind) => {
        for (const value of values || [])
            rows.push({
                value,
                sourceMessageId: source.messageId || source.id || "",
                actor: source.actor || "",
                taskId: source.taskId || "",
                status: source.status || "",
                kind,
            });
    };
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        const source = {
            messageId: messageIdentity(message, index),
            actor: messageActor(message),
            taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
            status: extractMessageStatus(message),
        };
        const artifacts = extractPostCompactArtifacts(message);
        addRows(fileRows, artifacts.files, source, "file");
        addRows(skillRows, artifacts.skills, source, "skill");
        addRows(verificationRows, artifacts.verification, source, "verification");
        addRows(blockerRows, artifacts.blockers, source, "blocker");
    }
    for (const record of Array.isArray(microCompact?.records) ? microCompact.records : []) {
        addRows(fileRows, record.files || [], record, "file");
        addRows(skillRows, record.skills || [], record, "skill");
        addRows(verificationRows, record.verification || [], record, "verification");
        addRows(blockerRows, record.blockers || [], record, "blocker");
    }
    const uniqueRows = (rows, limit) => {
        const seen = new Set();
        const result = [];
        for (const row of rows.reverse()) {
            const key = String(row.value || "").toLowerCase();
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            result.unshift(row);
            if (result.length >= limit)
                break;
        }
        return result;
    };
    const files = uniqueRows(fileRows, fileBudget);
    const skills = uniqueRows(skillRows, skillBudget);
    const verification = uniqueRows(verificationRows, verificationBudget);
    const blockers = uniqueRows(blockerRows, verificationBudget);
    return {
        schema: "ccm-post-compact-reinjection-v1",
        version: exports.GROUP_POST_COMPACT_REINJECT_VERSION,
        strategy: "restore_artifact_hints_after_summary_compact",
        budgets: { files: fileBudget, skills: skillBudget, verification: verificationBudget },
        files,
        skills,
        verification,
        blockers,
        hasCandidates: !!(files.length || skills.length || verification.length || blockers.length),
    };
}
function buildGroupPostCompactRecoveryAudit(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const boundary = input.boundary || {};
    const preservedSegment = input.preservedSegment || boundary.preservedSegment || boundary.post_compact_restore?.preservedSegment || null;
    const reinjectionPlan = input.postCompactReinject || boundary.post_compact_restore?.reinjectionPlan || null;
    const contextPressureWarning = input.contextPressureWarning || null;
    const contextBudget = input.contextBudget || boundary.context_budget || null;
    const transcriptPath = String(input.transcriptPath || boundary.post_compact_restore?.transcriptPath || "");
    const summaryChecksum = String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || "");
    const fromIndex = messages.findIndex((message, index) => messageIdentity(message, index) === boundary.summarizedFromMessageId);
    const throughIndex = messages.findIndex((message, index) => messageIdentity(message, index) === boundary.summarizedThroughMessageId);
    const keepIndex = Number(input.keepIndex ?? throughIndex + 1);
    const ptlEmergency = input.ptlEmergency || boundary.ptlEmergency || boundary.post_compact_restore?.ptlEmergency || null;
    const ptlRecovery = input.ptlRecovery || boundary.ptlRecovery || boundary.post_compact_restore?.ptlRecovery || null;
    const partialSidecarSegment = input.partialSidecarSegment || boundary.partialSidecarSegment || boundary.post_compact_restore?.partialSidecarSegment || null;
    const candidateCounts = {
        files: Array.isArray(reinjectionPlan?.files) ? reinjectionPlan.files.length : 0,
        skills: Array.isArray(reinjectionPlan?.skills) ? reinjectionPlan.skills.length : 0,
        verification: Array.isArray(reinjectionPlan?.verification) ? reinjectionPlan.verification.length : 0,
        blockers: Array.isArray(reinjectionPlan?.blockers) ? reinjectionPlan.blockers.length : 0,
    };
    const addCheck = (checks, id, label, pass, severity, detail, evidence = []) => {
        checks.push({
            id,
            label,
            pass: pass === true,
            severity,
            detail: compactText(detail, 700),
            evidence: evidence.map(item => compactText(item, 260)).filter(Boolean).slice(0, 6),
        });
    };
    const checks = [];
    addCheck(checks, "raw_transcript_path_recorded", "raw transcript path recorded", !!transcriptPath, "fatal", transcriptPath ? `raw transcript: ${transcriptPath}` : "missing raw transcript path");
    addCheck(checks, "boundary_range_resolvable", "compacted boundary range resolvable", fromIndex >= 0 && throughIndex >= fromIndex, "fatal", `from=${boundary.summarizedFromMessageId || ""}(${fromIndex}) through=${boundary.summarizedThroughMessageId || ""}(${throughIndex})`);
    addCheck(checks, "compact_window_matches_keep_index", "compact window matches keep index", throughIndex >= 0 && keepIndex === throughIndex + 1, "high", `keepIndex=${keepIndex}, expected=${throughIndex + 1}`);
    addCheck(checks, "summary_checksum_present", "summary checksum present", summaryChecksum.length >= 12, "fatal", summaryChecksum ? `checksum=${summaryChecksum}` : "missing summary checksum");
    addCheck(checks, "summary_digest_available", "summary digest available", !!String(input.messageDigest || "").trim() || !!Object.keys(input.conversationSummary || {}).length, "high", "conversation summary can be rendered for child-agent packet");
    addCheck(checks, "preserved_segment_recorded", "preserved raw segment recorded", preservedSegment?.schema === "ccm-group-preserved-segment-v1" && Number(preservedSegment.preservedMessageCount || 0) > 0, "high", preservedSegment?.schema ? `preserved=${preservedSegment.preservedMessageCount || 0}, first=${preservedSegment.firstPreservedMessageId || ""}, last=${preservedSegment.lastPreservedMessageId || ""}` : "missing preservedSegment");
    addCheck(checks, "post_compact_reinject_plan_recorded", "post compact reinjection plan recorded", reinjectionPlan?.schema === "ccm-post-compact-reinjection-v1", "high", reinjectionPlan?.schema ? `candidates=${candidateCounts.files + candidateCounts.skills + candidateCounts.verification + candidateCounts.blockers}` : "missing reinjection plan");
    addCheck(checks, "context_budget_recorded", "context budget recorded", Number(contextBudget?.estimated_tokens || 0) > 0 && Number(contextBudget?.max_tokens || 0) > 0, "medium", `estimated=${contextBudget?.estimated_tokens || 0}, max=${contextBudget?.max_tokens || 0}, pressure=${contextBudget?.pressure ?? ""}`);
    addCheck(checks, "post_compact_warning_suppressed", "post compact warning suppressed until next sample", contextPressureWarning?.schema === "ccm-group-compact-warning-v1" && contextPressureWarning.suppressed === true, "medium", contextPressureWarning?.schema ? `level=${contextPressureWarning.level || ""}, suppressed=${contextPressureWarning.suppressed === true}` : "missing context pressure warning");
    addCheck(checks, "ptl_state_consistent", "PTL emergency and recovery are mutually exclusive", !(ptlEmergency?.engaged && ptlRecovery?.recovered), "fatal", `emergency=${ptlEmergency?.engaged === true}, recovery=${ptlRecovery?.recovered === true}`);
    addCheck(checks, "partial_sidecar_raw_contract", "partial sidecar keeps raw transcript contract", !partialSidecarSegment || partialSidecarSegment.rawTranscriptUnmodified === true, "medium", partialSidecarSegment ? `sidecar=${partialSidecarSegment.id || ""}, rawUnmodified=${partialSidecarSegment.rawTranscriptUnmodified === true}` : "no partial sidecar");
    const failed = checks.filter(check => !check.pass);
    const fatalFailed = failed.some(check => check.severity === "fatal");
    const highFailed = failed.some(check => check.severity === "high");
    const status = fatalFailed ? "failed" : highFailed || failed.length ? "degraded" : "pass";
    return {
        schema: "ccm-post-compact-recovery-audit-v1",
        version: exports.GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION,
        status,
        pass: status === "pass",
        action: status === "pass"
            ? "safe_to_inject_child_agent_memory_packet"
            : status === "degraded"
                ? "inject_with_raw_recovery_warning"
                : "repair_or_rebuild_memory_before_dispatch",
        createdAt: input.now || new Date().toISOString(),
        groupId: String(input.groupId || ""),
        boundaryId: String(boundary.id || ""),
        summarizedFromMessageId: String(boundary.summarizedFromMessageId || ""),
        summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || ""),
        compactedMessageCount: Number(boundary.summarizedMessageCount || 0),
        keepIndex,
        messageCount: messages.length,
        keptRecentMessageCount: Math.max(0, messages.length - keepIndex),
        summaryChecksum,
        transcriptPath,
        candidateCounts,
        cleanupPolicy: {
            resetDerivedCompactState: true,
            childAgentIsolation: "child_agent_compact_or_session_restart_must_not_clobber_group_or_global_memory_state",
            nextDispatchContext: "derive_fresh_memory_packet_from_saved_group_memory_and_raw_transcript_paths",
        },
        checks,
        failedChecks: failed.map(check => check.id),
        passedChecks: checks.length - failed.length,
        checkCount: checks.length,
    };
}
function buildGroupPostCompactCleanupAudit(input = {}) {
    const boundary = input.boundary || {};
    const restore = boundary.post_compact_restore || {};
    const microCompact = input.microCompact || restore.microCompact || null;
    const reinjectionPlan = input.postCompactReinject || restore.reinjectionPlan || null;
    const recoveryAudit = input.postCompactRecoveryAudit || restore.recoveryAudit || null;
    const compactStrategyDecision = input.compactStrategyDecision || restore.strategyDecision || boundary.compactStrategyDecision || null;
    const apiMicroCompactEditPlan = input.apiMicroCompactEditPlan || restore.apiMicroCompactEditPlan || boundary.apiMicroCompactEditPlan || null;
    const transcriptPath = String(input.transcriptPath || restore.transcriptPath || compactStrategyDecision?.transcriptPath || "");
    const preservedSegment = input.preservedSegment || restore.preservedSegment || compactStrategyDecision?.preservedSegment || null;
    const skillHints = uniqueStrings([
        ...stringArray((reinjectionPlan?.skills || []).map((item) => item.value || item.name || item), 20),
        ...(Array.isArray(microCompact?.records) ? microCompact.records.flatMap((record) => stringArray(record.skills || [], 8)) : []),
    ], 24);
    const checks = [];
    const addCheck = (id, label, pass, severity, detail, evidence = []) => {
        checks.push({
            id,
            label,
            pass: pass === true,
            severity,
            detail: compactText(detail, 700),
            evidence: evidence.map(item => compactText(item, 260)).filter(Boolean).slice(0, 6),
        });
    };
    addCheck("microcompact_tracking_reset_policy", "microcompact tracking reset policy recorded", !!microCompact?.schema || Number(microCompact?.recordCount || 0) === 0, "medium", microCompact?.schema
        ? `microCompact=${microCompact.schema}; records=${microCompact.recordCount || 0}; compacted=${microCompact.compactedMessageCount || 0}`
        : "no microcompact records; cleanup policy still records reset boundary");
    addCheck("raw_transcript_preserved", "raw transcript preserved before cleanup", !!transcriptPath, "fatal", transcriptPath ? `raw transcript=${transcriptPath}` : "missing raw transcript path");
    addCheck("child_context_packets_rebuilt", "child context packets must be rebuilt after compact", true, "high", "next child Agent dispatch derives a fresh memory packet from group memory, source manifest, gates, and raw transcript");
    addCheck("invoked_skills_preserved", "invoked skills are preserved across cleanup", true, "high", skillHints.length
        ? `preserved skill hints: ${skillHints.slice(0, 6).join(", ")}`
        : "no invoked skill hints detected; cleanup policy intentionally does not clear skill continuity snapshots");
    addCheck("recovery_audit_linked", "cleanup is linked to recovery audit", recoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1" || input.partialSidecarOnly === true, "high", recoveryAudit?.schema
        ? `recovery=${recoveryAudit.status || "unknown"}; action=${recoveryAudit.action || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar only; primary recovery audit not required"
            : "missing post compact recovery audit");
    addCheck("strategy_decision_linked", "cleanup is linked to strategy decision", compactStrategyDecision?.schema === "ccm-group-compact-strategy-decision-v1", "high", compactStrategyDecision?.schema
        ? `mode=${compactStrategyDecision.mode || "unknown"}; decision=${compactStrategyDecision.decisionId || ""}`
        : "missing compact strategy decision");
    addCheck("api_microcompact_edit_plan_recorded", "API microcompact edit plan recorded", apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1" || input.partialSidecarOnly === true, "medium", apiMicroCompactEditPlan?.schema
        ? `edits=${apiMicroCompactEditPlan.editCount || 0}; advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}; trigger=${apiMicroCompactEditPlan.trigger?.value || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar only; primary API context edit plan not required"
            : "missing API microcompact edit plan");
    addCheck("preserved_segment_survives_cleanup", "preserved segment survives cleanup", preservedSegment?.schema === "ccm-group-preserved-segment-v1" || input.partialSidecarOnly === true, "high", preservedSegment?.schema
        ? `preserved=${preservedSegment.preservedMessageCount || 0}; first=${preservedSegment.firstPreservedMessageId || ""}; last=${preservedSegment.lastPreservedMessageId || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar keeps raw transcript unchanged"
            : "missing preserved segment");
    const failed = checks.filter(check => !check.pass);
    const fatalFailed = failed.some(check => check.severity === "fatal");
    const highFailed = failed.some(check => check.severity === "high");
    const status = fatalFailed ? "failed" : highFailed || failed.length ? "degraded" : "pass";
    const cleanupActions = [
        {
            id: "reset_microcompact_tracking",
            action: "reset_derived_microcompact_state",
            status: "recorded",
            evidence: microCompact?.schema || "no_microcompact_records",
        },
        {
            id: "rebuild_child_context_packets",
            action: "derive_fresh_child_agent_memory_context_after_compact",
            status: "required",
            evidence: compactStrategyDecision?.decisionId || boundary.id || "",
        },
        {
            id: "preserve_skill_continuity",
            action: "do_not_clear_invoked_skill_or_tool_continuity_snapshots",
            status: "recorded",
            evidence: skillHints.slice(0, 8),
        },
        {
            id: "preserve_raw_recovery_sources",
            action: "keep_group_messages_json_and_typed_memory_as_source_of_truth",
            status: transcriptPath ? "recorded" : "missing",
            evidence: transcriptPath,
        },
        {
            id: "do_not_delete_ledgers",
            action: "candidate_usage_replay_hook_and_dispatch_ledgers_are_retained_for_audit",
            status: "recorded",
            evidence: input.hookRunId || input.groupId || "",
        },
        {
            id: "record_api_context_management_plan",
            action: "surface_clear_thinking_and_tool_result_edit_plan_to_supported_child_executors",
            status: apiMicroCompactEditPlan?.schema ? "recorded" : "missing",
            evidence: apiMicroCompactEditPlan?.planChecksum || "",
        },
    ];
    return {
        schema: "ccm-post-compact-cleanup-audit-v1",
        version: exports.GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION,
        status,
        pass: status === "pass",
        action: status === "pass"
            ? "cleanup_recorded_and_safe_to_dispatch_fresh_child_context"
            : status === "degraded"
                ? "dispatch_with_cleanup_warning_and_rebuild_context"
                : "repair_cleanup_contract_before_dispatch",
        createdAt: input.now || new Date().toISOString(),
        groupId: String(input.groupId || ""),
        boundaryId: String(boundary.id || ""),
        compactStrategyDecisionId: String(compactStrategyDecision?.decisionId || ""),
        apiMicroCompactEditPlanId: String(apiMicroCompactEditPlan?.planChecksum || ""),
        mode: String(compactStrategyDecision?.mode || ""),
        transcriptPath,
        summaryChecksum: String(input.summaryChecksum || restore.summaryChecksum || compactStrategyDecision?.summaryChecksum || ""),
        partialSidecarOnly: input.partialSidecarOnly === true,
        preserveInvokedSkills: true,
        preserveToolContinuity: true,
        resetDerivedCompactState: true,
        childAgentIsolation: "subagent_or_third_party_cli_session_cleanup_must_not_clobber_group_or_global_memory",
        sourceOfTruth: "group memory json + group messages transcript + typed MEMORY.md sidecars",
        skillHints,
        apiMicroCompactEditPlan,
        cleanupActions,
        checks,
        failedChecks: failed.map(check => check.id),
        passedChecks: checks.length - failed.length,
        checkCount: checks.length,
    };
}
function buildGroupPartialCompactSidecarSegment(input) {
    const partial = input.partialCompact || {};
    if (!partial?.enabled || !partial?.sidecar)
        return null;
    const start = Math.max(0, Math.min((input.messages || []).length, Number(partial.rangeStartIndex ?? partial.selectedIndex ?? 0)));
    const end = Math.max(start, Math.min((input.messages || []).length - 1, Number(partial.rangeEndIndex ?? partial.selectedIndex ?? start)));
    const messagesToSummarize = (input.messages || []).slice(start, end + 1);
    if (!messagesToSummarize.length)
        return null;
    const fallback = buildDeterministicConversationSummary(messagesToSummarize, input.memory || {}, createEmptyConversationSummary());
    const validation = validateSummaryPreservesFallback(fallback, fallback);
    const factAnchors = mergeFactAnchors([], extractFactAnchors(messagesToSummarize));
    const persistentRequirements = mergePersistentRequirements([], extractPersistentRequirements(messagesToSummarize));
    const quality = evaluateGroupMemorySummaryQuality(fallback, fallback, messagesToSummarize, input.memory || {}, {
        evaluatedAt: input.now,
        factAnchors,
        persistentRequirements,
    });
    const microCompact = buildGroupMicroCompactPlan(messagesToSummarize, input.config?.microCompact || input.config?.groupMicroCompact || {});
    const reinjectionPlan = buildPostCompactReinjectionPlan(messagesToSummarize, microCompact, input.config?.postCompactReinject || {});
    const sourceTokens = messagesToSummarize.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(fallback)).digest("hex").slice(0, 24);
    const segmentKey = crypto.createHash("sha256").update([
        partial.direction,
        partial.summarizedFromMessageId,
        partial.summarizedThroughMessageId,
        summaryChecksum,
    ].join("\n")).digest("hex").slice(0, 20);
    return {
        schema: "ccm-group-partial-compact-segment-v1",
        version: exports.GROUP_PARTIAL_COMPACT_VERSION,
        id: `partial-${segmentKey}`,
        direction: partial.direction,
        sidecar: true,
        range: {
            startIndex: start,
            endIndex: end,
            fromMessageId: messageIdentity(messagesToSummarize[0], start),
            throughMessageId: messageIdentity(messagesToSummarize[messagesToSummarize.length - 1], end),
            messageCount: messagesToSummarize.length,
        },
        sourceTokens,
        summary: fallback,
        messageDigest: renderConversationSummary(fallback, Number(input.config?.partialSegmentDigestChars || 6000)),
        summaryChecksum,
        validation,
        quality: {
            score: quality.score,
            status: quality.status,
            pass: quality.pass,
            driftDetected: quality.drift.detected,
        },
        microCompact,
        reinjectionPlan,
        factAnchors,
        persistentRequirements,
        rawTranscriptPath: input.transcriptPath,
        rawTranscriptUnmodified: true,
        reason: compactText(partial.reason || "", 500),
        createdAt: input.now || new Date().toISOString(),
    };
}
function mergeGroupPartialCompactSegments(existing = [], incoming = null, limit = exports.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT) {
    const keyed = new Map();
    for (const segment of Array.isArray(existing) ? existing : []) {
        const key = segment?.id || `${segment?.range?.fromMessageId || ""}:${segment?.range?.throughMessageId || ""}:${segment?.summaryChecksum || ""}`;
        if (!key)
            continue;
        keyed.set(String(key), segment);
    }
    if (incoming) {
        const key = incoming.id || `${incoming?.range?.fromMessageId || ""}:${incoming?.range?.throughMessageId || ""}:${incoming?.summaryChecksum || ""}`;
        if (key) {
            keyed.delete(String(key));
            keyed.set(String(key), incoming);
        }
    }
    return [...keyed.values()].slice(-limit);
}
function buildPartialSidecarOnlyMemory(input) {
    const previousState = input.memory?.compaction || {};
    const partialSegments = mergeGroupPartialCompactSegments(previousState.partialSegments, input.partialSegment);
    const compactStrategyDecision = input.compactStrategyDecision || previousState.compactStrategyDecision || null;
    const postCompactCleanupAudit = input.postCompactCleanupAudit || previousState.postCompactCleanupAudit || null;
    const apiMicroCompactEditPlan = input.apiMicroCompactEditPlan || previousState.apiMicroCompactEditPlan || null;
    return {
        ...input.memory,
        factAnchors: mergeFactAnchors(input.memory?.factAnchors, Array.isArray(input.partialSegment?.factAnchors) ? input.partialSegment.factAnchors : []),
        persistentRequirements: mergePersistentRequirements(input.memory?.persistentRequirements, Array.isArray(input.partialSegment?.persistentRequirements) ? input.partialSegment.persistentRequirements : []),
        compaction: {
            ...previousState,
            version: exports.GROUP_MEMORY_COMPACTION_VERSION,
            enabled: true,
            health: previousState.health || "partial_sidecar",
            partialCompact: input.partialCompact,
            partialSegments,
            lastPartialCompactedAt: input.now,
            lastPartialSegmentId: input.partialSegment?.id || "",
            transcriptPath: input.transcriptPath,
            compactStrategyDecision,
            postCompactCleanupAudit,
            apiMicroCompactEditPlan,
        },
        messageCompression: {
            ...(input.memory?.messageCompression || {}),
            enabled: true,
            strategy: "cc-session-memory-v3+partial-sidecar",
            totalMessages: (input.messages || []).length,
            partialCompact: input.partialCompact,
            partialSegments: partialSegments.slice(-exports.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
            compactStrategyDecision,
            postCompactCleanupAudit,
            apiMicroCompactEditPlan,
            lastCompressedAt: input.now,
        },
    };
}
function normalizeHookAnchor(raw, index, type = "user_requirement") {
    const text = compactText(raw?.text || raw?.requirement || raw?.value || raw, 2000);
    if (!text)
        return null;
    const messageId = String(raw?.messageId || raw?.message_id || `hook-${index}`);
    return {
        id: String(raw?.id || `${messageId}:${type}`),
        type: String(raw?.type || type) === "dispatch_decision" ? "dispatch_decision" : "user_requirement",
        messageId,
        text,
        timestamp: String(raw?.timestamp || raw?.time || ""),
        checksum: crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16),
    };
}
function extractHookAnchors(results, key, type) {
    const anchors = [];
    for (const entry of results || []) {
        const result = entry?.result || {};
        const values = [
            ...(Array.isArray(result?.[key]) ? result[key] : []),
            ...(key === "persistentRequirements" && Array.isArray(result?.mustKeep) ? result.mustKeep : []),
            ...(key === "factAnchors" && Array.isArray(result?.anchors) ? result.anchors : []),
        ];
        values.forEach((item, index) => {
            const anchor = normalizeHookAnchor(item, anchors.length + index, type);
            if (anchor)
                anchors.push(anchor);
        });
    }
    return anchors;
}
function memorySeed(memory) {
    const completed = (memory?.completed || []).slice(-12).map((item) => `${item.project || "unknown"}: ${item.summary || ""}`);
    const blocked = (memory?.blocked || []).slice(-10).map((item) => `${item.project || "unknown"}: ${item.reason || item.summary || ""}`);
    const decisions = (memory?.decisions || []).slice(-12).map((item) => `${item.decision || ""}${item.reason ? `（${item.reason}）` : ""}`);
    return { completed, blocked, decisions };
}
function buildDeterministicConversationSummary(messages, memory, previous = {}) {
    const base = { ...createEmptyConversationSummary(), ...(previous || {}) };
    const users = [];
    const files = [];
    const errors = [];
    const decisions = [];
    const completed = [];
    const pending = [];
    const participantState = [];
    const taskStates = [];
    const runtimeFacts = [];
    for (let index = 0; index < messages.length; index++) {
        const message = messages[index];
        const content = messageContent(message);
        if (!content)
            continue;
        const id = messageIdentity(message, index);
        const actor = message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
        if (message?.role === "user")
            users.push(`#${id} ${compactText(content, 900)}`);
        files.push(...extractFiles(message));
        runtimeFacts.push(...extractRuntimeSkillFacts(message));
        if (/(错误|失败|异常|阻塞|超时|拒绝|error|failed|timeout|blocked)/i.test(content))
            errors.push(`${actor}: ${compactText(content, 600)}`);
        if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
            decisions.push(`${actor}: ${message?.dispatchPolicy?.action || "delegate"}；${compactText(message?.dispatchPolicy?.reason || content, 500)}`);
            for (const assignment of message.assignments || []) {
                if (!["done", "complete", "completed", "success"].includes(String(assignment?.status || "").toLowerCase())) {
                    pending.push(`${assignment?.project || assignment?.target || "unknown"}: ${compactText(assignment?.task || assignment?.reason || "待执行", 500)}`);
                }
            }
        }
        const receiptStatus = String(message?.receipt?.status || message?.delivery_summary?.status || "").toLowerCase();
        const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
        if (taskId && receiptStatus)
            taskStates.push(`[${taskId}] ${receiptStatus}；${actor}：${compactText(message?.receipt?.summary || message?.delivery_summary?.headline || content, 500)}`);
        if (["done", "complete", "completed", "success"].includes(receiptStatus) || message?.delivery_summary?.has_final_review) {
            completed.push(`${actor}: ${compactText(message?.delivery_summary?.headline || message?.receipt?.summary || content, 600)}`);
        }
        if (message?.agent)
            participantState.push(`${message.agent}: ${receiptStatus || message?.workflow?.phase || "最近有发言"}`);
    }
    const seed = memorySeed(memory);
    const latestUser = [...messages].reverse().find((item) => item?.role === "user" && messageContent(item));
    const latestMessage = [...messages].reverse().find((item) => messageContent(item));
    const nextAction = (memory?.nextActions || []).slice(-1)[0];
    return {
        primaryRequest: compactText(messageContent(latestUser) || base.primaryRequest || memory?.goal, 1200),
        userMessages: mergeUnique(base.userMessages, users, 40, 900),
        keyConcepts: mergeUnique(base.keyConcepts, runtimeFacts, 24, 400),
        filesAndCode: mergeUnique(base.filesAndCode, files, 40, 500),
        errorsAndFixes: mergeUnique(base.errorsAndFixes, errors, 30, 700),
        decisions: mergeUnique(base.decisions, [...seed.decisions, ...decisions], 30, 700),
        completedWork: mergeUnique(base.completedWork, [...seed.completed, ...completed], 30, 700),
        pendingTasks: mergeUnique(base.pendingTasks, [...seed.blocked, ...pending], 30, 700),
        currentWork: compactText(messageContent(latestMessage) || base.currentWork, 1200),
        nextStep: compactText(nextAction?.action || nextAction || base.nextStep, 900),
        participantState: mergeUnique(base.participantState, participantState, 20, 400),
        taskStates: mergeTaskStates(base.taskStates, taskStates, 30),
    };
}
function normalizeSummary(value, fallback) {
    const raw = value?.conversationSummary || value?.summary || value || {};
    return {
        primaryRequest: compactText(raw.primaryRequest || raw.primary_request || fallback.primaryRequest, 1200),
        userMessages: mergeUnique([], raw.userMessages || raw.user_messages || fallback.userMessages, 40, 900),
        keyConcepts: mergeUnique([], raw.keyConcepts || raw.key_concepts || fallback.keyConcepts, 24, 400),
        filesAndCode: mergeUnique([], raw.filesAndCode || raw.files_and_code || fallback.filesAndCode, 40, 500),
        errorsAndFixes: mergeUnique([], raw.errorsAndFixes || raw.errors_and_fixes || fallback.errorsAndFixes, 30, 700),
        decisions: mergeUnique([], raw.decisions || fallback.decisions, 30, 700),
        completedWork: mergeUnique([], raw.completedWork || raw.completed_work || fallback.completedWork, 30, 700),
        pendingTasks: mergeUnique([], raw.pendingTasks || raw.pending_tasks || fallback.pendingTasks, 30, 700),
        currentWork: compactText(raw.currentWork || raw.current_work || fallback.currentWork, 1200),
        nextStep: compactText(raw.nextStep || raw.next_step || fallback.nextStep, 900),
        participantState: mergeUnique([], raw.participantState || raw.participant_state || fallback.participantState, 20, 400),
        taskStates: mergeTaskStates([], raw.taskStates || raw.task_states || fallback.taskStates, 30),
    };
}
function renderConversationSummary(summary, maxChars = 14_000) {
    if (!summary)
        return "";
    const normalized = normalizeSummary(summary, createEmptyConversationSummary());
    const lines = [
        "群聊会话压缩摘要（压缩边界前的历史）：",
        `- 用户当前/最近主目标：${normalized.primaryRequest || "未明确"}`,
    ];
    const add = (title, items, limit = 10) => {
        if (!items?.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items.slice(-limit))
            lines.push(`  - ${item}`);
    };
    add("用户历史要求", normalized.userMessages, 14);
    add("关键概念/约束", normalized.keyConcepts, 10);
    add("文件与代码", normalized.filesAndCode, 12);
    add("错误与修复", normalized.errorsAndFixes, 10);
    add("关键决策", normalized.decisions, 10);
    add("已完成工作", normalized.completedWork, 10);
    add("待办/阻塞", normalized.pendingTasks, 10);
    add("成员状态", normalized.participantState, 8);
    add("最新任务状态（同一任务以最后一条为准）", normalized.taskStates, 12);
    if (normalized.currentWork)
        lines.push(`- 压缩前正在进行：${normalized.currentWork}`);
    if (normalized.nextStep)
        lines.push(`- 下一步：${normalized.nextStep}`);
    const text = lines.join("\n");
    if (text.length <= maxChars)
        return text;
    const head = Math.max(1, Math.floor(maxChars * 0.62));
    const tail = Math.max(1, maxChars - head - 36);
    return `${text.slice(0, head)}\n…[中间摘要已折叠，可回溯原始记录]…\n${text.slice(-tail)}`;
}
function buildCompactionTimeline(messages) {
    const userMessages = messages
        .filter((item) => item?.role === "user" && messageContent(item))
        .slice(-40)
        .map((item, index) => `${messageIdentity(item, index)} [用户 -> ${item?.target || "all"}] ${compactText(messageContent(item), 1000)}`);
    const timeline = messages.slice(-80).map((item, index) => {
        const actor = item?.role === "user" ? `用户 -> ${item?.target || "all"}` : item?.agent || item?.role || "Agent";
        return `${messageIdentity(item, index)} [${actor}] ${compactText(messageContent(item), 900)}`;
    });
    return { userMessages, timeline };
}
function extractJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced)
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    return null;
}
function normalizeOpenAiUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/chat/completions`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}
function normalizeAnthropicUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/v1\/messages$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/messages`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}
async function callCompactionModel(config, system, user, maxOutputTokens = exports.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
    if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model)
        return null;
    const anthropic = config.format === "anthropic-compatible"
        || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
        || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Math.min(Number(config.timeoutMs) || 90_000, 120_000)));
    try {
        const response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : normalizeOpenAiUrl(config.apiUrl), {
            method: "POST",
            headers: anthropic
                ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
                : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
            body: JSON.stringify(anthropic ? {
                model: config.model,
                max_tokens: maxOutputTokens,
                temperature: 0.1,
                system,
                messages: [{ role: "user", content: user }],
            } : {
                model: config.model,
                max_tokens: maxOutputTokens,
                temperature: 0.1,
                messages: [{ role: "system", content: system }, { role: "user", content: user }],
            }),
            signal: controller.signal,
        });
        const body = await response.text();
        if (!response.ok)
            throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
        const data = JSON.parse(body);
        const content = anthropic
            ? (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("")
            : data?.choices?.[0]?.message?.content || "";
        return extractJsonObject(content);
    }
    finally {
        clearTimeout(timeout);
    }
}
function fitCompactionPromptToTokenBudget(system, user, maxInputTokens) {
    const initialTokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(user);
    if (initialTokens <= maxInputTokens)
        return { user, initialTokens, finalTokens: initialTokens, clipped: false };
    let low = 256;
    let high = Math.max(low, user.length);
    let best = (0, context_budget_1.compactPreserveEdges)(user, low, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = (0, context_budget_1.compactPreserveEdges)(user, mid, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
        const tokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(candidate);
        if (tokens <= maxInputTokens) {
            best = candidate;
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    const finalTokens = (0, context_budget_1.estimateTextTokens)(system) + (0, context_budget_1.estimateTextTokens)(best);
    if (finalTokens > maxInputTokens)
        throw new Error(`memory compact request cannot fit model input budget: ${finalTokens}/${maxInputTokens}`);
    return { user: best, initialTokens, finalTokens, clipped: true };
}
function buildGroupCompactionModelRequest(messages, memory, fallback, config = {}) {
    const previous = memory?.conversationSummary || createEmptyConversationSummary();
    const timeline = buildCompactionTimeline(messages);
    const system = `你是群聊 Agent 会话压缩器。只生成 JSON，不调用工具，不创建任务，不向任何 Agent 派发。
你的摘要会替代压缩边界之前的原始消息，因此必须保真并支持主 Agent 无缝续跑。
参考 Claude Code compaction：保留用户明确要求、意图变化、技术决策、文件/代码、错误与修复、已完成、未完成、当前工作和下一步。
必须合并旧摘要，不能因为新消息覆盖仍有效的旧约束；已完成与待办冲突时，以时间较新的证据为准。
不要编造文件变更、测试或完成状态。`;
    const candidateUser = `旧结构化摘要：
${JSON.stringify(previous)}

平台结构化保底摘要：
${JSON.stringify(fallback)}

本次被压缩区间内的全部用户消息（已做长度保护）：
${timeline.userMessages.join("\n") || "无"}

本次被压缩区间的近期时间线：
${timeline.timeline.join("\n") || "无"}

返回以下 JSON，不要 Markdown：
{"primaryRequest":"","userMessages":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
    const capacity = resolveGroupModelContextCapacity(config);
    const maxOutputTokens = Math.max(1_000, Math.min(exports.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS, Number(config?.memoryCompactionMaxOutputTokens || config?.memory_compaction_max_output_tokens || exports.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS)));
    const providerSafeInput = Math.max(8_000, capacity.contextWindow - maxOutputTokens - exports.GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS);
    const configuredInputLimit = Number(config?.memoryCompactionMaxInputTokens || config?.memory_compaction_max_input_tokens || 0);
    const maxInputTokens = configuredInputLimit > 0
        ? Math.max(8_000, Math.min(providerSafeInput, configuredInputLimit))
        : providerSafeInput;
    const fitted = fitCompactionPromptToTokenBudget(system, candidateUser, maxInputTokens);
    return {
        system,
        user: fitted.user,
        maxOutputTokens,
        audit: {
            schema: "ccm-group-compaction-model-request-budget-v1",
            modelCapacity: capacity,
            maxInputTokens,
            maxOutputTokens,
            estimatedInputTokensBefore: fitted.initialTokens,
            estimatedInputTokens: fitted.finalTokens,
            withinBudget: fitted.finalTokens <= maxInputTokens,
            clipped: fitted.clipped,
            sourceMessageCount: messages.length,
            recentTimelineMessageLimit: 80,
            userMessageLimit: 40,
            sourceStrategy: "deterministic_full_history_aggregate_plus_bounded_recent_evidence",
            rawTranscriptPreserved: true,
        },
    };
}
async function summarizeWithModel(messages, memory, fallback, config) {
    const request = buildGroupCompactionModelRequest(messages, memory, fallback, config);
    const result = await callCompactionModel(config, request.system, request.user, request.maxOutputTokens);
    return {
        summary: result ? normalizeSummary(result, createEmptyConversationSummary()) : null,
        requestAudit: request.audit,
    };
}
function buildBoundedRecentGroupContext(messages, fullCount = 5) {
    const rows = (messages || []).map((message, index) => {
        const who = message?.role === "user" ? `[用户 -> ${message?.target || "all"}]` : `[${message?.agent || message?.role || "Agent"}]`;
        const isFull = index >= messages.length - fullCount;
        const max = message?.role === "user" ? (isFull ? 5000 : 1200) : (isFull ? 6000 : 900);
        const compacted = (0, context_budget_1.microCompactText)(messageContent(message), max);
        const content = compacted.text;
        const originalLength = messageContent(message).length;
        const suffix = compacted.compacted ? `\n[该消息原文 ${originalLength} 字符，已做 micro-compact；可按 #${messageIdentity(message, index)} 回溯]` : "";
        return `${who} ${content}${suffix}`;
    });
    return rows.join("\n");
}
function buildRelevantHistoricalGroupContext(messages, boundaryIndex, query, options = {}) {
    if (boundaryIndex < 0 || !messages?.length)
        return "";
    const queryTokens = [...normalizedSearchTokens(query)].slice(0, 120);
    if (!queryTokens.length)
        return "";
    const maxMessages = Math.max(1, Math.min(10, Number(options.maxMessages || 6)));
    const maxChars = Math.max(1000, Math.min(12_000, Number(options.maxChars || 6000)));
    const ranked = [];
    for (let index = 0; index <= boundaryIndex; index += 1) {
        const message = messages[index];
        const content = messageContent(message);
        if (!content)
            continue;
        const corpus = content.toLowerCase();
        let score = 0;
        for (const token of queryTokens)
            if (corpus.includes(token))
                score += token.length >= 4 ? 3 : 1;
        if (!score)
            continue;
        if (message?.role === "user")
            score += 4;
        if (message?.dispatchPolicy || message?.delivery_summary || message?.receipt)
            score += 2;
        if (/(错误|失败|阻塞|error|failed|blocked|\.(?:ts|js|vue|java|py|go|rs)\b)/i.test(content))
            score += 1;
        ranked.push({ index, score, message });
    }
    const selected = ranked.sort((a, b) => b.score - a.score || b.index - a.index).slice(0, maxMessages).sort((a, b) => a.index - b.index);
    if (!selected.length)
        return "";
    const lines = ["按当前任务自动回溯到的压缩前原文证据（原文优先于摘要）："];
    let used = lines[0].length;
    for (const item of selected) {
        const actor = item.message?.role === "user" ? `用户 -> ${item.message?.target || "all"}` : item.message?.agent || item.message?.role || "Agent";
        const row = `- #${messageIdentity(item.message, item.index)} [${actor}] ${compactText(messageContent(item.message), 1400)}`;
        if (used + row.length > maxChars)
            break;
        lines.push(row);
        used += row.length;
    }
    return lines.length > 1 ? lines.join("\n") : "";
}
async function compactGroupConversationMemory(input) {
    const messages = input.messages || [];
    const memory = input.memory || {};
    const previousState = memory.compaction || {};
    const previousVersion = Number(previousState.version || 0);
    const requiresVersionMigration = previousVersion > 0 && previousVersion < exports.GROUP_MEMORY_COMPACTION_VERSION;
    const requiresValidationRepair = !!input.force && String(previousState.summarySource || "") === "structured-validation-fallback";
    const requiresMetadataRepair = !!input.force && !previousState.modelMode;
    const requiresExplicitRebuild = !!input.rebuild;
    const lastBoundaryId = requiresVersionMigration || requiresValidationRepair || requiresMetadataRepair || requiresExplicitRebuild ? "" : String(previousState.lastCompactedMessageId || "");
    let summarizedThroughIndex = lastBoundaryId ? messages.findIndex((message, index) => messageIdentity(message, index) === lastBoundaryId) : -1;
    if (lastBoundaryId && summarizedThroughIndex < 0)
        summarizedThroughIndex = -1;
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const partialCompact = resolvePartialCompactWindow(messages, summarizedThroughIndex, {
        ...(input.config || {}),
        partialCompact: input.partialCompact || input.config?.partialCompact,
    });
    const partialSidecarSegment = partialCompact?.sidecar
        ? buildGroupPartialCompactSidecarSegment({
            groupId: input.groupId,
            messages,
            memory,
            partialCompact,
            transcriptPath: input.transcriptPath,
            config: input.config,
            now,
        })
        : null;
    const keepWindowOptions = {
        floorIndex: summarizedThroughIndex + 1,
        minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || exports.GROUP_COMPACT_MIN_KEEP_MESSAGES,
        minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || exports.GROUP_COMPACT_MIN_KEEP_TOKENS,
        maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || exports.GROUP_COMPACT_MAX_KEEP_TOKENS,
    };
    const defaultKeepIndex = calculateGroupMessagesToKeepIndex(messages, keepWindowOptions);
    const primaryPartialCompact = partialCompact?.enabled === true && partialCompact?.sidecar !== true;
    const keepIndex = primaryPartialCompact ? partialCompact.keepIndex : defaultKeepIndex;
    const messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
    const sourceTokens = messagesToCompact.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
    const keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
    const previousSummaryTokens = estimateGroupTextTokens(JSON.stringify(memory.conversationSummary || {}));
    const activeTokens = sourceTokens + keptActiveTokens + previousSummaryTokens;
    const triggerTokens = getGroupAutoCompactThreshold(input.config);
    const activeMessageCount = messages.length - summarizedThroughIndex - 1;
    const preCompactWarning = calculateGroupCompactWarningState({
        activeTokens,
        activeMessageCount,
        autoCompactThreshold: triggerTokens,
        config: input.config,
        now,
    });
    const warningOnlyMemory = {
        ...memory,
        compaction: {
            ...(previousState || {}),
            version: exports.GROUP_MEMORY_COMPACTION_VERSION,
            enabled: true,
            contextPressureWarning: preCompactWarning,
            compactWarning: preCompactWarning,
            lastPressureSampleAt: now,
        },
        messageCompression: {
            ...(memory?.messageCompression || {}),
            contextPressureWarning: preCompactWarning,
        },
    };
    const shouldCompactPrimary = !!input.force
        || primaryPartialCompact
        || preCompactWarning.flags.isAboveAutoCompactThreshold
        || activeMessageCount >= exports.GROUP_COMPACT_MAX_ACTIVE_MESSAGES;
    const buildStrategyDecision = (overrides = {}) => buildGroupCompactStrategyDecision({
        groupId: input.groupId,
        messages,
        messagesToCompact,
        keptMessages: messages.slice(keepIndex),
        memory,
        startIndex: summarizedThroughIndex + 1,
        keepIndex,
        compacted: false,
        primaryCompact: shouldCompactPrimary && messagesToCompact.length > 0,
        partialCompact,
        partialSidecarSegment,
        preCompactWarning,
        activeTokens,
        activeMessageCount,
        triggerTokens,
        preCompactTokenCount: messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0),
        transcriptPath: input.transcriptPath,
        force: input.force,
        now,
        ...overrides,
    });
    if ((!shouldCompactPrimary || !messagesToCompact.length) && partialSidecarSegment) {
        const compactStrategyDecision = buildStrategyDecision({
            compacted: true,
            primaryCompact: false,
            reason: partialCompact?.reason || "partial sidecar only; primary compact skipped",
        });
        const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId: input.groupId,
            activeTokens,
            targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
            maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
            force: input.force,
            now,
        });
        const postCompactCleanupAudit = buildGroupPostCompactCleanupAudit({
            groupId: input.groupId,
            boundary: {
                id: partialSidecarSegment.id || "",
                type: "partial-sidecar",
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                post_compact_restore: {
                    strategyDecision: compactStrategyDecision,
                    apiMicroCompactEditPlan,
                    transcriptPath: input.transcriptPath,
                    microCompact: partialSidecarSegment.microCompact || null,
                    reinjectionPlan: partialSidecarSegment.reinjectionPlan || null,
                },
            },
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            microCompact: partialSidecarSegment.microCompact || null,
            postCompactReinject: partialSidecarSegment.reinjectionPlan || null,
            transcriptPath: input.transcriptPath,
            summaryChecksum: partialSidecarSegment.summaryChecksum || "",
            partialSidecarOnly: true,
            now,
        });
        const nextMemory = buildPartialSidecarOnlyMemory({
            memory,
            messages,
            partialCompact,
            partialSegment: partialSidecarSegment,
            transcriptPath: input.transcriptPath,
            now,
            compactStrategyDecision,
            postCompactCleanupAudit,
            apiMicroCompactEditPlan,
        });
        return { compacted: true, partialCompacted: true, memory: nextMemory, keepIndex, partialCompact, partialSegment: partialSidecarSegment, compactStrategyDecision, postCompactCleanupAudit, apiMicroCompactEditPlan };
    }
    if (!shouldCompactPrimary || !messagesToCompact.length) {
        const compactStrategyDecision = buildStrategyDecision({
            compacted: false,
            primaryCompact: false,
            reason: !messagesToCompact.length ? "recent window only; no eligible older messages" : "context pressure below compact threshold",
        });
        const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
            groupId: input.groupId,
            activeTokens,
            targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
            maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
            force: input.force,
            now,
        });
        const nextMemory = {
            ...warningOnlyMemory,
            compaction: {
                ...(warningOnlyMemory.compaction || {}),
                compactStrategyDecision,
                apiMicroCompactEditPlan,
            },
            messageCompression: {
                ...(warningOnlyMemory.messageCompression || {}),
                compactStrategyDecision,
                apiMicroCompactEditPlan,
            },
        };
        return { compacted: false, memory: nextMemory, keepIndex, partialCompact, contextPressureWarning: preCompactWarning, compactStrategyDecision, apiMicroCompactEditPlan };
    }
    const failures = Number(previousState.consecutiveFailures || 0);
    const compactionHookRunId = `gmch_${Date.now().toString(36)}_${crypto.createHash("sha1").update(`${input.groupId || ""}:${now}:${messages.length}`).digest("hex").slice(0, 8)}`;
    const preHookResults = await runGroupMemoryCompactionHooks("pre", {
        hookRunId: compactionHookRunId,
        groupId: input.groupId,
        messages,
        messagesToCompact,
        memory,
        keepIndex,
        partialCompact,
        summarizedThroughIndex,
        sourceTokens,
        activeTokens,
    });
    const hookFactAnchors = extractHookAnchors(preHookResults, "factAnchors", "dispatch_decision");
    const hookPersistentRequirements = extractHookAnchors(preHookResults, "persistentRequirements", "user_requirement");
    const previousSummary = normalizeSummary(memory.conversationSummary || {}, createEmptyConversationSummary());
    const hookMemory = hookPersistentRequirements.length
        ? { ...memory, persistentRequirements: mergePersistentRequirements(memory.persistentRequirements, hookPersistentRequirements) }
        : memory;
    const fallback = buildDeterministicConversationSummary(messagesToCompact, hookMemory, previousSummary);
    let conversationSummary = fallback;
    let summarySource = "structured";
    let failure = "";
    let modelRequestAudit = null;
    let validation = validateSummaryPreservesFallback(conversationSummary, fallback);
    let rejectedModelValidation = null;
    const lastFailureAtMs = Date.parse(String(previousState.lastFailureAt || "")) || 0;
    const retryWindowExpired = lastFailureAtMs > 0 && nowMs - lastFailureAtMs >= exports.GROUP_COMPACT_MODEL_RETRY_MS;
    const modelCompactionEnabled = input.config?.memoryCompactionUseModel === true
        || String(input.config?.memoryCompactionMode || "").toLowerCase() === "hybrid";
    const shouldAttemptModel = modelCompactionEnabled && (failures < exports.GROUP_COMPACT_MAX_FAILURES || retryWindowExpired);
    if (shouldAttemptModel) {
        try {
            const modelResult = await summarizeWithModel(messagesToCompact, memory, fallback, input.config);
            const modelSummary = modelResult.summary;
            modelRequestAudit = modelResult.requestAudit;
            if (modelSummary) {
                conversationSummary = mergeSafeConversationSummary(previousSummary, fallback, modelSummary, messagesToCompact);
                summarySource = "hybrid";
                validation = validateSummaryPreservesFallback(conversationSummary, fallback);
                if (!validation.pass) {
                    rejectedModelValidation = validation;
                    conversationSummary = fallback;
                    summarySource = "structured-validation-fallback";
                    validation = validateSummaryPreservesFallback(conversationSummary, fallback);
                }
            }
        }
        catch (error) {
            failure = compactText(error?.message || error, 400);
        }
    }
    const compactedFactAnchors = extractFactAnchors(messagesToCompact);
    const nextFactAnchors = mergeFactAnchors(memory.factAnchors, [
        ...compactedFactAnchors,
        ...hookFactAnchors,
        ...(Array.isArray(partialSidecarSegment?.factAnchors) ? partialSidecarSegment.factAnchors : []),
    ]);
    const nextPersistentRequirements = mergePersistentRequirements(memory.persistentRequirements, [
        ...extractPersistentRequirements(messagesToCompact),
        ...hookPersistentRequirements,
        ...(Array.isArray(partialSidecarSegment?.persistentRequirements) ? partialSidecarSegment.persistentRequirements : []),
    ]);
    let quality = evaluateGroupMemorySummaryQuality(conversationSummary, fallback, messagesToCompact, memory, {
        evaluatedAt: now,
        factAnchors: nextFactAnchors,
        persistentRequirements: nextPersistentRequirements,
    });
    let downgradedByQualityGate = false;
    let qualityDowngradeReason = "";
    if (quality.downgrade_required && summarySource === "hybrid") {
        const rejectedByQuality = {
            summarySource,
            validation,
            quality,
        };
        rejectedModelValidation = rejectedModelValidation
            ? { previous: rejectedModelValidation, qualityGate: rejectedByQuality }
            : rejectedByQuality;
        downgradedByQualityGate = true;
        qualityDowngradeReason = quality.downgrade_reason || "quality_gate_failed";
        failure = failure || qualityDowngradeReason;
        conversationSummary = fallback;
        summarySource = "structured-quality-fallback";
        validation = validateSummaryPreservesFallback(conversationSummary, fallback);
        quality = evaluateGroupMemorySummaryQuality(conversationSummary, fallback, messagesToCompact, memory, {
            evaluatedAt: now,
            factAnchors: nextFactAnchors,
            persistentRequirements: nextPersistentRequirements,
            downgradedFrom: rejectedByQuality.summarySource,
        });
    }
    const boundaryMessage = messages[keepIndex - 1];
    const keptMessages = messages.slice(keepIndex);
    const microCompact = buildGroupMicroCompactPlan(messagesToCompact, input.config?.microCompact || input.config?.groupMicroCompact || {});
    const postCompactReinject = buildPostCompactReinjectionPlan(messagesToCompact, microCompact, input.config?.postCompactReinject || {});
    const preCompactTokenCount = messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
    const postCompactTokenCount = estimateGroupTextTokens(JSON.stringify(conversationSummary))
        + keptMessages.reduce((sum, message) => sum + Math.min(estimateGroupMessageTokens(message), 2500), 0);
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
    const postCompactWarning = calculateGroupCompactWarningState({
        activeTokens: postCompactTokenCount,
        activeMessageCount: keptMessages.length,
        autoCompactThreshold: triggerTokens,
        config: input.config,
        suppressed: true,
        suppressReason: "post_compaction_until_next_group_memory_pressure_sample",
        now,
    });
    const reductionRatio = preCompactTokenCount > 0 ? Math.max(0, 1 - postCompactTokenCount / preCompactTokenCount) : 0;
    const pressurePercent = triggerTokens > 0 ? Math.round((activeTokens / triggerTokens) * 1000) / 10 : 0;
    const contextBudget = (0, context_budget_1.buildContextBudget)({
        context: {
            conversationSummary,
            microCompact: {
                compactedMessageCount: microCompact.compactedMessageCount,
                tokensFreed: microCompact.tokensFreed,
                records: (microCompact.records || []).slice(-12),
            },
            postCompactReinject,
            keptRecent: keptMessages.map((message, index) => ({
                id: messageIdentity(message, keepIndex + index),
                role: message?.role,
                agent: message?.agent,
                content: (0, context_budget_1.microCompactText)(messageContent(message), 1800).text,
            })),
        },
        maxChars: 48_000,
        maxTokens: triggerTokens,
    });
    const ptlEmergency = buildGroupPtlEmergencyPlan({
        groupId: input.groupId,
        messages,
        messagesToCompact,
        keptMessages,
        startIndex: summarizedThroughIndex + 1,
        keepIndex,
        conversationSummary,
        triggerTokens,
        activeTokens,
        preCompactTokenCount,
        postCompactTokenCount,
        contextBudget,
        transcriptPath: input.transcriptPath,
        config: input.config,
        now,
    });
    const ptlRecovery = buildGroupPtlRecoveryPlan({
        previousPtlEmergency: previousState.ptlEmergency,
        currentPtlEmergency: ptlEmergency,
        contextBudget,
        triggerTokens,
        postCompactTokenCount,
        restoredMessageDigestMaxChars: 14_000,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        config: input.config,
        now,
    });
    const effectiveContextBudget = ptlEmergency
        ? {
            ...contextBudget,
            ptl_emergency: {
                schema: ptlEmergency.schema,
                emergencyLevel: ptlEmergency.emergencyLevel,
                reason: ptlEmergency.reason,
                messageDigestMaxChars: ptlEmergency.messageDigestMaxChars,
            },
        }
        : ptlRecovery
            ? {
                ...contextBudget,
                ptl_recovery: {
                    schema: ptlRecovery.schema,
                    reason: ptlRecovery.reason,
                    restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
                    contextBudgetPressure: ptlRecovery.contextBudgetPressure,
                },
            }
            : contextBudget;
    const previousThrashCount = Number(previousState.thrashCount || 0);
    const thrashCount = reductionRatio < 0.2 ? previousThrashCount + 1 : 0;
    const health = ptlEmergency
        ? "ptl_emergency"
        : ptlRecovery
            ? "healthy"
            : !validation.pass || !quality.pass
                ? quality.status === "failed" ? "failed" : "degraded"
                : thrashCount >= 3 ? "thrashing" : "healthy";
    const preservedSegment = buildGroupPreservedSegment(messages, keepIndex, {
        groupId: input.groupId,
        floorIndex: summarizedThroughIndex + 1,
        minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || exports.GROUP_COMPACT_MIN_KEEP_MESSAGES,
        minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || exports.GROUP_COMPACT_MIN_KEEP_TOKENS,
        maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || exports.GROUP_COMPACT_MAX_KEEP_TOKENS,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        now,
    });
    const messageDigest = renderConversationSummary(conversationSummary, ptlEmergency?.messageDigestMaxChars || 14_000);
    const compactStrategyDecision = buildStrategyDecision({
        compacted: true,
        primaryCompact: true,
        keptMessages,
        microCompact,
        postCompactReinject,
        ptlEmergency,
        ptlRecovery,
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        reason: primaryPartialCompact
            ? partialCompact?.reason || "manual partial compact selected primary boundary"
            : input.force
                ? "manual compact requested"
                : "auto compact selected session-memory style summary plus recent window",
    });
    const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
        groupId: input.groupId,
        activeTokens: preCompactTokenCount,
        targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
        maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
        force: input.force,
        now,
    });
    const boundary = {
        id: `compact-${Date.now().toString(36)}`,
        type: primaryPartialCompact ? "partial-up-to" : input.force ? "manual" : "auto",
        summarizedFromMessageId: messageIdentity(messages[summarizedThroughIndex + 1], summarizedThroughIndex + 1),
        summarizedThroughMessageId: messageIdentity(boundaryMessage, keepIndex - 1),
        summarizedMessageCount: messagesToCompact.length,
        preservedMessageIds: keptMessages.slice(-40).map((message, index) => messageIdentity(message, keepIndex + index)),
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        post_compact_restore: {
            strategy: "conversation_summary_recent_reinject",
            preservedMessageIds: keptMessages.slice(-20).map((message, index) => messageIdentity(message, keepIndex + index)),
            preservedSegment,
            strategyDecision: compactStrategyDecision,
            apiMicroCompactEditPlan,
            summaryChecksum,
            transcriptPath: input.transcriptPath,
            microCompact,
            reinjectionPlan: postCompactReinject,
            partialSidecarSegment,
            ptlEmergency,
            ptlRecovery,
            recoveryAudit: null,
            cleanupAudit: null,
        },
        context_budget: effectiveContextBudget,
        partialCompact,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        summarySource,
        modelRequestAudit,
        quality: {
            score: quality.score,
            status: quality.status,
            driftDetected: quality.drift.detected,
            downgradedByQualityGate,
        },
        createdAt: now,
    };
    const postCompactRecoveryAudit = buildGroupPostCompactRecoveryAudit({
        groupId: input.groupId,
        messages,
        boundary,
        keepIndex,
        conversationSummary,
        messageDigest,
        summaryChecksum,
        transcriptPath: input.transcriptPath,
        preservedSegment,
        postCompactReinject,
        microCompact,
        contextPressureWarning: postCompactWarning,
        contextBudget: effectiveContextBudget,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        now,
    });
    boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
    const postHookResults = await runGroupMemoryCompactionHooks("post", {
        hookRunId: compactionHookRunId,
        groupId: input.groupId,
        messages,
        messagesToCompact,
        keptMessages,
        memory,
        conversationSummary,
        fallback,
        validation,
        quality,
        boundary,
        microCompact,
        postCompactReinject,
        partialCompact,
        partialSidecarSegment,
        ptlEmergency,
        ptlRecovery,
        summaryChecksum,
        compactStrategyDecision,
    });
    const postCompactCleanupAudit = buildGroupPostCompactCleanupAudit({
        groupId: input.groupId,
        boundary,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        microCompact,
        postCompactReinject,
        preservedSegment,
        transcriptPath: input.transcriptPath,
        summaryChecksum,
        hookRunId: compactionHookRunId,
        now,
    });
    boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
    const latestHookLedger = readGroupMemoryCompactionHookLedger(String(input.groupId || ""));
    const compactTransactionReceipt = buildGroupCompactTransactionReceipt({
        groupId: input.groupId,
        groupSessionId: input.groupSessionId,
        boundary,
        summaryChecksum,
        hookRunId: compactionHookRunId,
        preHookResults,
        postHookResults,
        transcriptPath: input.transcriptPath,
        createdAt: now,
    });
    boundary.compactTransactionReceipt = compactTransactionReceipt;
    boundary.post_compact_restore.compactTransactionReceipt = compactTransactionReceipt;
    const totalCompacted = requiresExplicitRebuild
        ? keepIndex
        : Math.max(Number(previousState.compactedMessageCount || 0) + messagesToCompact.length, keepIndex);
    const partialSegments = mergeGroupPartialCompactSegments(previousState.partialSegments, partialSidecarSegment);
    const nextMemory = {
        ...memory,
        conversationSummary,
        factAnchors: nextFactAnchors,
        persistentRequirements: nextPersistentRequirements,
        messageDigest,
        compactBoundary: boundary,
        compaction: {
            version: exports.GROUP_MEMORY_COMPACTION_VERSION,
            rebuiltAt: requiresExplicitRebuild ? now : String(previousState.rebuiltAt || ""),
            migratedFromVersion: requiresVersionMigration ? previousVersion : Number(previousState.migratedFromVersion || 0),
            enabled: true,
            lastCompactedMessageId: boundary.summarizedThroughMessageId,
            lastCompactedAt: now,
            compactedMessageCount: totalCompacted,
            totalMessagesSeen: messages.length,
            preservedRecentMessages: keptMessages.length,
            preCompactTokenCount,
            postCompactTokenCount,
            context_budget: effectiveContextBudget,
            activeTokensBeforeCompact: activeTokens,
            triggerTokens,
            pressurePercent,
            contextPressureWarning: postCompactWarning,
            compactWarning: postCompactWarning,
            preCompactWarning,
            postCompactRecoveryAudit,
            postCompactCleanupAudit,
            summarySource,
            modelMode: modelCompactionEnabled ? "hybrid-opt-in" : "session-memory-first",
            modelAttempted: shouldAttemptModel,
            modelRequestAudit,
            summaryChecksum,
            compactTransactionReceipt,
            deterministicFactsPreserved: true,
            validation,
            qualityGateVersion: quality.schema,
            quality,
            downgradedByQualityGate,
            qualityDowngradeReason,
            driftDetected: quality.drift.detected,
            microCompact,
            postCompactReinject,
            partialCompact,
            partialSegments,
            lastPartialCompactedAt: partialSidecarSegment ? now : String(previousState.lastPartialCompactedAt || ""),
            lastPartialSegmentId: partialSidecarSegment?.id || String(previousState.lastPartialSegmentId || ""),
            ptlEmergency,
            ptlRecovery,
            preservedSegment,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            hookResults: {
                pre: preHookResults.slice(-20),
                post: postHookResults.slice(-20),
            },
            hookLedger: {
                schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
                hookRunId: compactionHookRunId,
                file: latestHookLedger.file,
                stats: latestHookLedger.stats,
                recentEntries: (Array.isArray(latestHookLedger.entries) ? latestHookLedger.entries : [])
                    .filter((entry) => entry.hook_run_id === compactionHookRunId)
                    .slice(-20),
            },
            rejectedModelValidation,
            reductionRatio,
            thrashCount,
            health,
            consecutiveFailures: !modelCompactionEnabled || summarySource === "hybrid" ? 0 : Math.min(exports.GROUP_COMPACT_MAX_FAILURES, failures + (failure ? 1 : 0)),
            lastFailure: modelCompactionEnabled ? failure : "",
            lastFailureAt: modelCompactionEnabled ? (failure ? now : String(previousState.lastFailureAt || "")) : "",
            nextModelRetryAt: modelCompactionEnabled && failure && failures + 1 >= exports.GROUP_COMPACT_MAX_FAILURES
                ? new Date(nowMs + exports.GROUP_COMPACT_MODEL_RETRY_MS).toISOString()
                : "",
            transcriptPath: input.transcriptPath,
            boundaries: [...(Array.isArray(previousState.boundaries) ? previousState.boundaries : []), boundary].slice(-8),
        },
        messageCompression: {
            enabled: true,
            strategy: "cc-session-memory-v3+micro-compact",
            totalMessages: messages.length,
            compressedMessages: totalCompacted,
            recentMessages: keptMessages.length,
            recentLimit: keptMessages.length,
            olderLimit: totalCompacted,
            preCompactTokenCount,
            postCompactTokenCount,
            microCompactTokensFreed: microCompact.tokensFreed,
            partialCompact,
            partialSegments: partialSegments.slice(-exports.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
            ptlEmergency,
            ptlRecovery,
            preservedSegment,
            postCompactRecoveryAudit,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            postCompactCleanupAudit,
            compactTransactionReceipt,
            contextPressureWarning: postCompactWarning,
            lastCompressedAt: now,
        },
    };
    return { compacted: true, memory: nextMemory, boundary, keepIndex, contextPressureWarning: postCompactWarning, preCompactWarning, postCompactRecoveryAudit, postCompactCleanupAudit, compactStrategyDecision, apiMicroCompactEditPlan, compactTransactionReceipt };
}
async function runGroupMemoryPreservedSegmentSelfTest() {
    const messages = [
        ...Array.from({ length: 24 }, (_, index) => ({
            id: `ps-old-${index}`,
            role: index % 2 === 0 ? "user" : "assistant",
            target: index % 2 === 0 ? "coordinator" : undefined,
            agent: index % 2 === 1 ? "worker" : undefined,
            content: `preserved segment old message ${index} ${"上下文".repeat(40)}`,
        })),
        {
            id: "ps-task-user",
            role: "user",
            target: "coordinator",
            task_id: "preserved-task",
            content: "必须保留 PRESERVED_SEGMENT_SENTINEL，给 api 子 Agent 继续处理 src/preserved.ts。",
        },
        {
            id: "ps-task-result",
            role: "assistant",
            agent: "api",
            receipt: { status: "failed", taskId: "preserved-task", summary: "PRESERVED_SEGMENT_SENTINEL 仍需继续修复" },
            content: "api 回执：PRESERVED_SEGMENT_SENTINEL 失败，src/preserved.ts 还需要继续处理。",
        },
    ];
    const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 1, minTokens: 1, maxTokens: 5000 });
    const segment = buildGroupPreservedSegment(messages, keepIndex, {
        minMessages: 1,
        minTokens: 1,
        maxTokens: 5000,
        summaryChecksum: "preserved-segment-selftest",
        transcriptPath: "preserved-segment-raw.json",
        now: "2026-07-07T00:00:00.000Z",
    });
    const result = await compactGroupConversationMemory({
        groupId: "preserved-segment-self-test",
        messages,
        memory: { goal: "preserved segment selftest", compaction: {} },
        transcriptPath: "preserved-segment-raw.json",
        force: true,
        config: { minKeepMessages: 1, minKeepTokens: 1, maxKeepTokens: 5000 },
    });
    const boundarySegment = result.boundary?.preservedSegment || {};
    const checks = {
        keepIndexExpandedToTaskStart: keepIndex === 24 && messages[keepIndex]?.id === "ps-task-user",
        taskTransactionProtected: segment.protectedTaskTransaction === true
            && segment.firstPreservedMessageId === "ps-task-user"
            && segment.lastPreservedMessageId === "ps-task-result",
        segmentRecordsBudget: segment.preservedTokenEstimate > 0
            && segment.minTextBlockMessages === 1
            && segment.maxTokens === 5000,
        compactBoundaryCarriesSegment: result.compacted === true
            && boundarySegment.schema === "ccm-group-preserved-segment-v1"
            && boundarySegment.firstPreservedMessageId === "ps-task-user"
            && boundarySegment.lastPreservedMessageId === "ps-task-result",
        postCompactRestoreCarriesSegment: result.boundary?.post_compact_restore?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
        memoryCarriesSegment: result.memory?.compaction?.preservedSegment?.schema === "ccm-group-preserved-segment-v1"
            && result.memory?.messageCompression?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
        rawTranscriptUntouched: messages[24].content.includes("PRESERVED_SEGMENT_SENTINEL") && messages.length === 26,
    };
    return { pass: Object.values(checks).every(Boolean), checks, keepIndex, segment, boundarySegment };
}
async function runGroupMemoryPostCompactRecoveryAuditSelfTest() {
    const messages = Array.from({ length: 46 }, (_, index) => ({
        id: `audit-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "audit-worker" : undefined,
        task_id: index >= 10 && index <= 18 ? "audit-task" : undefined,
        content: index === 0
            ? "必须保留 RECOVERY_AUDIT_SENTINEL_20260707，压缩后子 Agent 仍要拿到恢复审计。"
            : index === 11
                ? "audit-worker 修改 src/recovery-audit.ts，执行 npm run check passed。"
                : `恢复审计测试消息 ${index} src/audit-${index}.ts ${"上下文".repeat(160)}`,
        receipt: index === 11 ? {
            status: "done",
            taskId: "audit-task",
            summary: "完成 recovery audit",
            filesChanged: ["src/recovery-audit.ts"],
            verification: ["npm run check passed"],
        } : undefined,
    }));
    const originalMessages = JSON.stringify(messages);
    const result = await compactGroupConversationMemory({
        groupId: "post-compact-recovery-audit-self-test",
        messages,
        memory: { goal: "压缩后恢复审计自测" },
        config: { memoryCompactionUseModel: false, minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 3200 },
        transcriptPath: "post-compact-recovery-audit-raw.json",
        force: true,
    });
    const audit = result.memory?.compaction?.postCompactRecoveryAudit || {};
    const boundaryAudit = result.boundary?.post_compact_restore?.recoveryAudit || {};
    const messageCompressionAudit = result.memory?.messageCompression?.postCompactRecoveryAudit || {};
    const checkById = new Map((audit.checks || []).map((check) => [check.id, check]));
    const candidateCounts = audit.candidateCounts || {};
    const candidateTotal = ["files", "skills", "verification", "blockers"].reduce((sum, key) => sum + Number(candidateCounts[key] || 0), 0);
    const checks = {
        compacted: result.compacted === true,
        auditRecordedInCompaction: audit.schema === "ccm-post-compact-recovery-audit-v1" && audit.status === "pass" && audit.pass === true,
        auditRecordedInBoundary: boundaryAudit.schema === "ccm-post-compact-recovery-audit-v1" && boundaryAudit.summaryChecksum === audit.summaryChecksum,
        auditRecordedInMessageCompression: messageCompressionAudit.schema === "ccm-post-compact-recovery-audit-v1",
        boundaryRangeResolvable: checkById.get("boundary_range_resolvable")?.pass === true
            && checkById.get("compact_window_matches_keep_index")?.pass === true,
        rawTranscriptRecoverable: checkById.get("raw_transcript_path_recorded")?.pass === true
            && audit.transcriptPath === "post-compact-recovery-audit-raw.json",
        preservedAndReinjectReady: checkById.get("preserved_segment_recorded")?.pass === true
            && checkById.get("post_compact_reinject_plan_recorded")?.pass === true
            && candidateTotal > 0,
        warningSuppressedAfterCompact: checkById.get("post_compact_warning_suppressed")?.pass === true,
        childAgentActionSafe: audit.action === "safe_to_inject_child_agent_memory_packet"
            && String(audit.cleanupPolicy?.childAgentIsolation || "").includes("child_agent"),
        rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
    };
    return { pass: Object.values(checks).every(Boolean), checks, audit };
}
function runGroupMemoryCompactWarningSelfTest() {
    const config = {
        memoryContextWindowTokens: 80_000,
        memoryReservedTokens: 20_000,
        groupWarningBufferTokens: 20_000,
        groupErrorBufferTokens: 10_000,
        groupManualCompactBufferTokens: 3_000,
    };
    const ok = calculateGroupCompactWarningState({ activeTokens: 10_000, config, now: "2026-07-07T00:00:00.000Z" });
    const warning = calculateGroupCompactWarningState({ activeTokens: 30_000, config, now: "2026-07-07T00:00:00.000Z" });
    const error = calculateGroupCompactWarningState({ activeTokens: 40_000, config, now: "2026-07-07T00:00:00.000Z" });
    const autoCompact = calculateGroupCompactWarningState({ activeTokens: 48_000, config, activeMessageCount: 120, now: "2026-07-07T00:00:00.000Z" });
    const blocking = calculateGroupCompactWarningState({ activeTokens: 58_000, config, now: "2026-07-07T00:00:00.000Z" });
    const suppressed = calculateGroupCompactWarningState({
        activeTokens: 20_000,
        config,
        suppressed: true,
        suppressReason: "selftest_post_compaction",
        now: "2026-07-07T00:00:00.000Z",
    });
    const checks = {
        effectiveWindowMatchesCcStyleBudget: getGroupEffectiveContextWindow(config) === 60_000,
        autoThresholdMatchesBuffer: getGroupAutoCompactThreshold(config) === 47_000,
        okLevel: ok.level === "ok" && ok.flags.isAboveWarningThreshold === false,
        warningLevel: warning.level === "warning" && warning.flags.isAboveWarningThreshold === true && warning.flags.isAboveErrorThreshold === false,
        errorLevel: error.level === "error" && error.flags.isAboveErrorThreshold === true && error.flags.isAboveAutoCompactThreshold === false,
        autoCompactLevel: autoCompact.level === "auto_compact" && autoCompact.flags.isAboveAutoCompactThreshold === true,
        blockingLevel: blocking.level === "blocking" && blocking.flags.isAtBlockingLimit === true,
        suppressedLevel: suppressed.level === "suppressed" && suppressed.suppressed === true && suppressed.recommendation.includes("suppress"),
        thresholdsRecorded: warning.thresholds.warningThreshold === 27_000
            && warning.thresholds.errorThreshold === 37_000
            && warning.thresholds.blockingThreshold === 57_000,
    };
    return { pass: Object.values(checks).every(Boolean), checks, states: { ok, warning, error, autoCompact, blocking, suppressed } };
}
function runGroupMemoryCompactionSelfTest() {
    const messages = [];
    for (let i = 0; i < 36; i++) {
        messages.push({ id: `u${i}`, role: "user", target: "coordinator", content: i === 0 ? "实现订单审核并保留权限校验" : `用户补充要求 ${i}` });
        messages.push({ id: `a${i}`, role: "assistant", agent: "backend", content: i === 10 ? "执行失败：mvn test 超时，需要修复" : `处理进度 ${i}，文件 src/order-${i}.ts`, receipt: i < 30 ? { status: "done", summary: `完成 ${i}` } : undefined });
    }
    const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 8, minTokens: 500, maxTokens: 1800 });
    const boundaryKeepIndex = calculateGroupMessagesToKeepIndex(messages, { floorIndex: 60, minMessages: 8, minTokens: 500, maxTokens: 1800 });
    const compacted = messages.slice(0, keepIndex);
    const kept = messages.slice(keepIndex);
    const summary = buildDeterministicConversationSummary(compacted, { goal: "实现订单审核", decisions: [], completed: [], blocked: [], nextActions: [{ action: "继续测试" }] });
    const bounded = buildBoundedRecentGroupContext([{ id: "large", role: "assistant", agent: "worker", content: "x".repeat(20_000) }], 1);
    const retrieval = buildRelevantHistoricalGroupContext(messages, Math.max(0, keepIndex - 1), "订单审核 权限校验");
    const unsafeModel = { ...createEmptyConversationSummary(), filesAndCode: ["src/fake-hallucination.ts"], completedWork: ["已经上线生产"] };
    const safeMerged = mergeSafeConversationSummary(createEmptyConversationSummary(), summary, unsafeModel, compacted);
    const anchors = extractFactAnchors(compacted);
    const checks = {
        keepsRecentMessages: kept.length >= 8,
        compactsOlderMessages: compacted.length > 0,
        preservesUserIntent: summary.userMessages.some(item => item.includes("实现订单审核")),
        preservesErrors: summary.errorsAndFixes.some(item => item.includes("mvn test")),
        preservesFiles: summary.filesAndCode.some(item => item.includes("src/order-")),
        preservesNextStep: summary.nextStep.includes("继续测试"),
        microCompactsLargeOutput: bounded.length < 8_000 && bounded.includes("micro-compact"),
        rawTranscriptUntouched: messages[0].content === "实现订单审核并保留权限校验" && messages.length === 72,
        neverCrossesPreviousBoundary: boundaryKeepIndex >= 60,
        retrievesCompressedOriginalEvidence: retrieval.includes("#u0") && retrieval.includes("权限校验"),
        rejectsUngroundedModelClaims: !safeMerged.filesAndCode.includes("src/fake-hallucination.ts") && !safeMerged.completedWork.includes("已经上线生产"),
        preservesDeterministicFacts: safeMerged.filesAndCode.some(item => item.includes("src/order-")) && safeMerged.userMessages.some(item => item.includes("权限校验")),
        storesChecksummedUserAnchors: anchors.some(item => item.messageId === "u0" && item.type === "user_requirement" && item.checksum.length === 16),
        adaptiveThresholdMatchesDefaultBudget: getGroupAutoCompactThreshold({}) === exports.GROUP_COMPACT_TRIGGER_TOKENS,
    };
    return { pass: Object.values(checks).every(Boolean), checks, keepIndex, keptMessages: kept.length, compactedMessages: compacted.length };
}
function runGroupMemoryModelCapacitySelfTest() {
    const defaultCapacity = resolveGroupModelContextCapacity({});
    const preset516 = {
        modelContextWindow: 516_000,
        modelAutoCompactTokenLimit: 460_000,
    };
    const preset1m = {
        model_context_window: 1_000_000,
        model_auto_compact_token_limit: 900_000,
    };
    const sentinel = "MODEL_CAPACITY_3MB_SENTINEL";
    const largeContent = `${sentinel}:${"上下文容量证据".repeat(220_000)}`;
    const messages = [
        { id: "large-3mb", role: "user", content: largeContent },
        { id: "tail", role: "assistant", content: "继续执行并保留原始记录" },
    ];
    const fallback = buildDeterministicConversationSummary(messages, { goal: sentinel });
    const request = buildGroupCompactionModelRequest(messages, {}, fallback, {
        model: "small-window-selftest",
        modelContextWindow: 64_000,
        modelMaxOutputTokens: 8_000,
    });
    const checks = {
        ccDefaultUsesTwentyKSummaryReserve: defaultCapacity.contextWindow === 200_000
            && defaultCapacity.reservedOutputTokens === 20_000
            && defaultCapacity.effectiveContextWindow === 180_000,
        ccDefaultAutoCompactThresholdIs167k: getGroupAutoCompactThreshold({}) === 167_000,
        preset516IsApplied: getGroupEffectiveContextWindow(preset516) === 496_000
            && getGroupAutoCompactThreshold(preset516) === 460_000,
        preset1mIsApplied: getGroupEffectiveContextWindow(preset1m) === 980_000
            && getGroupAutoCompactThreshold(preset1m) === 900_000,
        threeMbSourceIsNeverSentWhole: request.audit.estimatedInputTokensBefore < (0, context_budget_1.estimateTextTokens)(largeContent)
            && request.audit.estimatedInputTokens <= request.audit.maxInputTokens,
        requestCarriesCapacityProof: request.audit.schema === "ccm-group-compaction-model-request-budget-v1"
            && request.audit.withinBudget === true
            && request.audit.rawTranscriptPreserved === true,
        originalMemoryRemainsUntouched: messages[0].content.length === largeContent.length
            && messages[0].content.startsWith(sentinel),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        defaultCapacity,
        preset516Threshold: getGroupAutoCompactThreshold(preset516),
        preset1mThreshold: getGroupAutoCompactThreshold(preset1m),
        requestAudit: request.audit,
        sourceChars: largeContent.length,
    };
}
async function runGroupCompactStrategyDecisionSelfTest() {
    const messages = [];
    for (let i = 0; i < 28; i++) {
        messages.push({
            id: `csd-user-${i}`,
            role: "user",
            target: "coordinator",
            task_id: `csd-task-${Math.floor(i / 2)}`,
            content: i === 0
                ? "必须保留 COMPACT_STRATEGY_DECISION_SENTINEL，子 Agent 新会话要知道本次为什么压缩。"
                : `压缩策略决策用户消息 ${i} src/strategy-${i}.ts ${"上下文".repeat(25)}`,
        });
        messages.push({
            id: `csd-agent-${i}`,
            role: "assistant",
            agent: "api",
            task_id: `csd-task-${Math.floor(i / 2)}`,
            content: `api 输出 ${i}，涉及 src/strategy-${i}.ts，npm run check ${"执行结果".repeat(30)}`,
            receipt: { status: "done", taskId: `csd-task-${Math.floor(i / 2)}`, filesChanged: [`src/strategy-${i}.ts`], verification: ["npm run check"] },
        });
    }
    const directKeepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 2, minTokens: 1, maxTokens: 1400 });
    const directMicro = buildGroupMicroCompactPlan(messages.slice(0, directKeepIndex), { maxChars: 900 });
    const directPreserved = buildGroupPreservedSegment(messages, directKeepIndex, {
        minMessages: 2,
        minTokens: 1,
        maxTokens: 1400,
        summaryChecksum: "compact-strategy-direct-summary",
        transcriptPath: "compact-strategy-direct-raw.json",
        now: "2026-07-08T00:00:00.000Z",
    });
    const directDecision = buildGroupCompactStrategyDecision({
        groupId: "compact-strategy-direct",
        messages,
        messagesToCompact: messages.slice(0, directKeepIndex),
        keptMessages: messages.slice(directKeepIndex),
        keepIndex: directKeepIndex,
        compacted: true,
        primaryCompact: true,
        microCompact: directMicro,
        preservedSegment: directPreserved,
        preCompactTokenCount: 9000,
        postCompactTokenCount: 1800,
        summaryChecksum: "compact-strategy-direct-summary",
        transcriptPath: "compact-strategy-direct-raw.json",
        reason: "selftest direct strategy decision",
        now: "2026-07-08T00:00:00.000Z",
    });
    const compacted = await compactGroupConversationMemory({
        groupId: `compact-strategy-selftest-${process.pid}`,
        messages,
        memory: { goal: "compact strategy decision selftest", compaction: {} },
        transcriptPath: "compact-strategy-selftest-raw.json",
        force: true,
        config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1400, microCompact: { maxChars: 900 } },
    });
    const decision = compacted.memory?.compaction?.compactStrategyDecision || {};
    const boundaryDecision = compacted.boundary?.post_compact_restore?.strategyDecision || {};
    const checks = {
        directDecisionHasSchema: directDecision.schema === "ccm-group-compact-strategy-decision-v1"
            && directDecision.mode
            && directDecision.transcriptPath === "compact-strategy-direct-raw.json",
        directDecisionRecordsWindow: directDecision.messagesToSummarize === directKeepIndex
            && directDecision.keptMessages === messages.length - directKeepIndex
            && directDecision.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
        directDecisionPassesInvariants: directDecision.invariantPass === true
            && directDecision.invariants?.noSplitTaskTransactions === true
            && directDecision.invariants?.noSplitToolResultPairs === true,
        compactResultCarriesDecision: decision.schema === "ccm-group-compact-strategy-decision-v1"
            && decision.compacted === true
            && decision.summaryChecksum === compacted.memory?.compaction?.summaryChecksum,
        boundaryCarriesDecision: boundaryDecision.decisionChecksum === decision.decisionChecksum
            && compacted.boundary?.compactStrategyDecision?.decisionChecksum === decision.decisionChecksum,
        decisionMentionsCcStyleMode: ["normal_compact", "micro_compact", "partial_compact", "ptl_emergency", "ptl_recovery"].includes(decision.mode)
            && decision.strategy === "cc-session-memory-v3-compatible",
    };
    return { pass: Object.values(checks).every(Boolean), checks, decision: { mode: decision.mode, invariantPass: decision.invariantPass, decisionChecksum: decision.decisionChecksum } };
}
async function runGroupPostCompactCleanupAuditSelfTest() {
    const messages = [];
    for (let i = 0; i < 20; i++) {
        messages.push({
            id: `pcca-user-${i}`,
            role: "user",
            target: "coordinator",
            content: i === 0
                ? "必须保留 POST_COMPACT_CLEANUP_SENTINEL，压缩后不能清掉 skill/tool continuity。"
                : `cleanup audit 用户消息 ${i} src/cleanup-${i}.ts ${"上下文".repeat(30)}`,
        });
        messages.push({
            id: `pcca-agent-${i}`,
            role: "assistant",
            agent: "api",
            task_id: `pcca-task-${i}`,
            content: `Skill:typescript-audit#cleanup-${i}\napi cleanup 输出 ${i}，文件 src/cleanup-${i}.ts，npm run check ${"日志".repeat(40)}`,
            invokedSkills: [{ name: "typescript-audit", contentHash: `cleanup-${i}` }],
            receipt: { status: "done", filesChanged: [`src/cleanup-${i}.ts`], verification: ["npm run check"] },
        });
    }
    const result = await compactGroupConversationMemory({
        groupId: `post-compact-cleanup-selftest-${process.pid}`,
        messages,
        memory: { goal: "post compact cleanup audit selftest", compaction: {} },
        transcriptPath: "post-compact-cleanup-selftest-raw.json",
        force: true,
        config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1600, microCompact: { maxChars: 900 } },
    });
    const audit = result.memory?.compaction?.postCompactCleanupAudit || {};
    const boundaryAudit = result.boundary?.post_compact_restore?.cleanupAudit || {};
    const messageCompressionAudit = result.memory?.messageCompression?.postCompactCleanupAudit || {};
    const actionIds = (audit.cleanupActions || []).map((item) => item.id);
    const checkById = new Map((audit.checks || []).map((check) => [check.id, check]));
    const checks = {
        cleanupAuditHasSchema: audit.schema === "ccm-post-compact-cleanup-audit-v1"
            && audit.status === "pass"
            && audit.action === "cleanup_recorded_and_safe_to_dispatch_fresh_child_context",
        cleanupAuditRecordedEverywhere: boundaryAudit.schema === audit.schema
            && boundaryAudit.summaryChecksum === audit.summaryChecksum
            && messageCompressionAudit.schema === audit.schema,
        cleanupLinksStrategyAndRecovery: checkById.get("strategy_decision_linked")?.pass === true
            && checkById.get("recovery_audit_linked")?.pass === true
            && audit.compactStrategyDecisionId === result.memory?.compaction?.compactStrategyDecision?.decisionId,
        cleanupPreservesRawTranscript: checkById.get("raw_transcript_preserved")?.pass === true
            && audit.transcriptPath === "post-compact-cleanup-selftest-raw.json",
        cleanupPreservesSkillAndToolContinuity: audit.preserveInvokedSkills === true
            && audit.preserveToolContinuity === true
            && checkById.get("invoked_skills_preserved")?.pass === true,
        cleanupActionsCoverCcStyleState: ["reset_microcompact_tracking", "rebuild_child_context_packets", "preserve_skill_continuity", "preserve_raw_recovery_sources", "do_not_delete_ledgers"].every(id => actionIds.includes(id)),
        cleanupDoesNotMutateRawMessages: messages[0].content.includes("POST_COMPACT_CLEANUP_SENTINEL")
            && messages.length === 40,
    };
    return { pass: Object.values(checks).every(Boolean), checks, audit: { status: audit.status, actionIds, failedChecks: audit.failedChecks || [] } };
}
async function runGroupApiMicroCompactEditPlanSelfTest() {
    const messages = [
        {
            id: "api-mc-thinking",
            role: "assistant",
            agent: "api",
            timestamp: "2026-07-08T03:00:00.000Z",
            content: [
                { type: "thinking", thinking: "API_MICROCOMPACT_THINKING_SENTINEL" },
                { type: "tool_use", id: "tool-read-1", name: "Read", input: { file_path: "src/api-microcompact.ts" } },
            ],
        },
        {
            id: "api-mc-tool-result",
            role: "user",
            timestamp: "2026-07-08T03:01:00.000Z",
            content: [
                { type: "tool_result", tool_use_id: "tool-read-1", content: "src/api-microcompact.ts\nAPI_MICROCOMPACT_TOOL_RESULT_SENTINEL" },
            ],
        },
        ...Array.from({ length: 28 }, (_, index) => ({
            id: `api-mc-${index}`,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            target: index % 2 ? undefined : "coordinator",
            content: `API microcompact edit plan 自测 ${index}，src/api-microcompact-${index}.ts ${"上下文".repeat(40)}`,
        })),
    ];
    const direct = buildGroupApiMicroCompactEditPlan(messages, {
        groupId: "api-microcompact-direct",
        activeTokens: 220_000,
        force: true,
        now: "2026-07-08T04:30:00.000Z",
    });
    const compacted = await compactGroupConversationMemory({
        groupId: `api-microcompact-selftest-${process.pid}`,
        messages,
        memory: { goal: "api microcompact edit plan selftest", compaction: {} },
        transcriptPath: "api-microcompact-selftest-raw.json",
        force: true,
        config: {
            minKeepMessages: 2,
            minKeepTokens: 1,
            maxKeepTokens: 1600,
            apiMicrocompactMaxInputTokens: 1000,
            apiMicrocompactTargetInputTokens: 400,
        },
    });
    const plan = compacted.memory?.compaction?.apiMicroCompactEditPlan || {};
    const boundaryPlan = compacted.boundary?.post_compact_restore?.apiMicroCompactEditPlan || {};
    const editTypes = (direct.contextManagement?.edits || []).map((edit) => edit.type);
    const checks = {
        directPlanHasSchema: direct.schema === "ccm-api-microcompact-edit-plan-v1"
            && direct.source === "claude-code-api-microcompact-compatible"
            && direct.planChecksum,
        directPlanIncludesThinkingEdit: editTypes.includes("clear_thinking_20251015")
            && direct.signalCounts.thinkingBlocks >= 1,
        directPlanIncludesToolEdit: editTypes.includes("clear_tool_uses_20250919")
            && direct.signalCounts.toolUses >= 1
            && direct.signalCounts.toolResults >= 1,
        compactResultCarriesPlan: plan.schema === "ccm-api-microcompact-edit-plan-v1"
            && plan.editCount > 0
            && plan.contextManagement?.edits?.length === plan.editCount,
        boundaryAndCleanupCarryPlan: boundaryPlan.planChecksum === plan.planChecksum
            && compacted.memory?.compaction?.postCompactCleanupAudit?.apiMicroCompactEditPlanId === plan.planChecksum,
        planIsAdvisoryForThirdPartyCli: plan.advisoryOnly === true
            && plan.canApplyNatively === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, plan: { editCount: plan.editCount, checksum: plan.planChecksum, signalCounts: plan.signalCounts } };
}
function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
    const editPlan = buildGroupApiMicroCompactEditPlan([
        {
            id: "native-apply-thinking",
            role: "assistant",
            content: [{ type: "thinking", thinking: "NATIVE_APPLY_THINKING_SENTINEL" }],
        },
        {
            id: "native-apply-tool",
            role: "assistant",
            content: [{ type: "tool_use", id: "native-read", name: "Read", input: { file_path: "src/native.ts" } }],
        },
        {
            id: "native-apply-result",
            role: "user",
            content: [{ type: "tool_result", tool_use_id: "native-read", content: "native apply result" }],
        },
    ], {
        groupId: "native-apply-selftest",
        targetProject: "api",
        activeTokens: 220000,
        force: true,
        now: "2026-07-08T07:00:00.000Z",
    });
    const cli = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
        agentType: "claudecode",
        transport: "cli",
        now: "2026-07-08T07:01:00.000Z",
    });
    const native = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
        agentType: "claude-api",
        transport: "anthropic_api",
        provider: "anthropic",
        supportsApiContextManagement: true,
        nativeApiRequestLayer: true,
        contextManagementBetaHeaderEnabled: true,
        sessionBinding: {
            schema: "ccm-child-agent-memory-session-binding-v1",
            binding_id: "csm-native-apply-selftest",
            task_agent_session_id: "tas-native-apply-selftest",
            native_session_id: "native-native-apply-selftest",
        },
        now: "2026-07-08T07:02:00.000Z",
    });
    const missingBeta = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
        agentType: "claude-api",
        transport: "anthropic_api",
        provider: "anthropic",
        supportsApiContextManagement: true,
        nativeApiRequestLayer: true,
        now: "2026-07-08T07:03:00.000Z",
    });
    const checks = {
        cliStaysAdvisory: cli.schema === "ccm-api-microcompact-native-apply-plan-v1"
            && cli.mode === "advisory_only"
            && cli.nativeApplyReady === false
            && cli.requestPatch === null
            && cli.executor.cli === true,
        nativeApiBuildsRealRequestPatch: native.mode === "native_api_context_management"
            && native.nativeApplyReady === true
            && native.requestPatch?.body?.context_management?.edits?.length === editPlan.editCount
            && native.requestPatch?.beta_headers?.includes(exports.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA),
        nativePatchLinksEditPlan: native.apiEditPlanChecksum === editPlan.planChecksum
            && native.requestPatchChecksum
            && native.applyPlanChecksum,
        nativePatchBindsChildAgentSession: native.task_agent_session_id === "tas-native-apply-selftest"
            && native.sessionBindingRequired === true
            && native.receiptContract?.required_task_agent_session_id === "tas-native-apply-selftest"
            && native.receiptContract?.required_apply_plan_checksum === native.applyPlanChecksum,
        missingBetaFailsClosed: missingBeta.nativeApplyReady === false
            && missingBeta.failedChecks.includes("context_management_beta_enabled")
            && missingBeta.requestPatch === null,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        cli: { mode: cli.mode, reason: cli.reason, failedChecks: cli.failedChecks },
        native: { mode: native.mode, requestPatch: native.requestPatch, checksum: native.applyPlanChecksum },
        missingBeta: { mode: missingBeta.mode, failedChecks: missingBeta.failedChecks },
    };
}
function runGroupMemoryQualityGateSelfTest() {
    const messages = [
        {
            id: "q-user-0",
            role: "user",
            target: "coordinator",
            content: "必须保留 HARD_MEMORY_SENTINEL_20260707，不能在测试失败时声明全部完成。",
        },
        {
            id: "q-worker-0",
            role: "assistant",
            agent: "backend",
            task_id: "quality-task-1",
            content: "执行失败：vitest timeout，quality-task-1 blocked，需要继续修复。",
            receipt: { status: "failed", taskId: "quality-task-1", summary: "vitest timeout" },
        },
    ];
    const fallback = buildDeterministicConversationSummary(messages, {
        goal: "质量门禁自测",
        nextActions: [{ action: "继续修复 quality-task-1" }],
    });
    const persistentRequirements = mergePersistentRequirements([], extractPersistentRequirements(messages));
    const factAnchors = mergeFactAnchors([], extractFactAnchors(messages));
    const good = evaluateGroupMemorySummaryQuality(fallback, fallback, messages, {}, { persistentRequirements, factAnchors });
    const bad = {
        ...fallback,
        userMessages: [],
        errorsAndFixes: [],
        pendingTasks: [],
        taskStates: [],
        currentWork: "released to production PROD_RELEASE_999",
        nextStep: "",
        completedWork: mergeUnique(fallback.completedWork, ["released to production PROD_RELEASE_999"], 30, 700),
    };
    const badQuality = evaluateGroupMemorySummaryQuality(bad, fallback, messages, {}, { persistentRequirements, factAnchors });
    const checks = {
        goodSummaryPasses: good.pass === true && good.score >= 80,
        goodSummaryPreservesSentinel: JSON.stringify(fallback).includes("HARD_MEMORY_SENTINEL_20260707"),
        badSummaryFails: badQuality.pass === false && badQuality.downgrade_required === true,
        driftDetected: badQuality.drift.detected === true,
        missingFallbackDetected: badQuality.checks.some(check => check.id === "fallback_preserved" && check.pass === false),
        ungroundedCompletionDetected: badQuality.checks.some(check => check.id === "no_ungrounded_completion" && check.pass === false),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: good.score, status: good.status },
        bad: { score: badQuality.score, status: badQuality.status, downgrade_reason: badQuality.downgrade_reason },
    };
}
function runGroupMemoryMicroCompactSelfTest() {
    const longOutput = [
        "构建输出开始",
        "src/payment/callback.ts",
        "Skill:typescript-audit#abc123",
        "npm run check passed",
        "x".repeat(12_000),
        "构建输出结束 MICRO_COMPACT_TAIL_SENTINEL",
    ].join("\n");
    const messages = [
        {
            id: "mc-user-0",
            role: "user",
            content: "实现支付回调。",
        },
        {
            id: "mc-agent-0",
            role: "assistant",
            agent: "payment-agent",
            task_id: "mc-task",
            content: longOutput,
            invokedSkills: [{ name: "typescript-audit", contentHash: "abc123" }],
            receipt: {
                status: "done",
                filesChanged: ["src/payment/callback.ts"],
                verification: ["npm run check passed"],
            },
        },
    ];
    const micro = buildGroupMicroCompactPlan(messages, { maxChars: 1400 });
    const reinject = buildPostCompactReinjectionPlan(messages, micro);
    const checks = {
        compactedLongAgentOutput: micro.compactedMessageCount === 1 && micro.tokensFreed > 0,
        preservesTailSentinel: JSON.stringify(micro.records).includes("MICRO_COMPACT_TAIL_SENTINEL"),
        recordsChecksum: String(micro.records?.[0]?.checksum || "").length === 16,
        reinjectsFile: reinject.files.some((item) => String(item.value || "").includes("src/payment/callback.ts")),
        reinjectsSkill: reinject.skills.some((item) => String(item.value || "").includes("typescript-audit")),
        reinjectsVerification: reinject.verification.some((item) => String(item.value || "").includes("npm run check")),
    };
    return { pass: Object.values(checks).every(Boolean), checks, micro: { recordCount: micro.recordCount, compactedMessageCount: micro.compactedMessageCount, tokensFreed: micro.tokensFreed }, reinject };
}
function runGroupMemoryTimeBasedMicroCompactSelfTest() {
    const base = Date.parse("2026-07-07T00:00:00.000Z");
    const messages = Array.from({ length: 8 }, (_, index) => ({
        id: `tb-${index}`,
        role: "assistant",
        agent: "worker",
        timestamp: new Date(base + index * 60_000).toISOString(),
        task_id: `tb-task-${index}`,
        content: `time based micro compact output ${index} src/time-${index}.ts npm run check ${"结果".repeat(40)}`,
        receipt: {
            status: index % 3 === 0 ? "failed" : "done",
            taskId: `tb-task-${index}`,
            summary: `time based result ${index}`,
            verification: ["npm run check"],
            filesChanged: [`src/time-${index}.ts`],
        },
    }));
    const plan = buildGroupMicroCompactPlan(messages, {
        timeBased: {
            enabled: true,
            gapThresholdMinutes: 60,
            keepRecent: 3,
            now: "2026-07-07T02:30:00.000Z",
        },
        maxChars: 5000,
    });
    const notTriggered = buildGroupMicroCompactPlan(messages, {
        timeBased: {
            enabled: true,
            gapThresholdMinutes: 240,
            keepRecent: 3,
            now: "2026-07-07T02:30:00.000Z",
        },
        maxChars: 5000,
    });
    const cleared = (plan.records || []).filter((record) => record.timeBasedCleared);
    const keptIds = new Set(messages.slice(-3).map((message) => message.id));
    const checks = {
        timeBasedTriggered: plan.timeBased?.triggered === true && plan.timeBased.reason === "assistant_gap_exceeded_threshold",
        clearsOldButKeepsRecent: cleared.length === 5 && cleared.every((record) => !keptIds.has(record.messageId)),
        preservesArtifactHints: JSON.stringify(plan.records || []).includes("src/time-0.ts") && JSON.stringify(plan.records || []).includes("npm run check"),
        recordsClearedPlaceholder: cleared.every((record) => String(record.text || "").includes(exports.GROUP_TIME_BASED_MC_CLEARED_MESSAGE)),
        freesTokens: Number(plan.tokensFreed || 0) > 0 && Number(plan.tokensAfter || 0) < Number(plan.tokensBefore || 0),
        notTriggeredWhenGapBelowThreshold: notTriggered.timeBased?.triggered === false && (notTriggered.records || []).every((record) => record.timeBasedCleared !== true),
        rawTranscriptUntouched: messages[0].content.includes("time based micro compact output 0") && messages.length === 8,
    };
    return { pass: Object.values(checks).every(Boolean), checks, timeBased: plan.timeBased, cleared: cleared.map((record) => record.messageId) };
}
async function runGroupMemoryCompactionHookSelfTest() {
    const groupId = `hook-self-test-${process.pid}-${Date.now().toString(36)}`;
    const ledgerFile = getGroupMemoryCompactionHookLedgerFile(groupId);
    const messages = Array.from({ length: 90 }, (_, index) => ({
        id: `hook-${index}`,
        role: index % 2 ? "assistant" : "user",
        agent: index % 2 ? "hook-agent" : undefined,
        content: index === 1
            ? `Agent 输出 ${"x".repeat(6000)} src/hook-memory.ts`
            : `hook 测试消息 ${index} ${"内容".repeat(520)}`,
    }));
    const unregisterPre = registerGroupMemoryCompactionHook("pre", input => ({
        mustKeep: [{ id: "hook-must-keep", messageId: "hook-pre", text: `必须保留 HOOK_SENTINEL_${input.groupId}` }],
        factAnchors: [{ id: "hook-anchor", type: "dispatch_decision", messageId: "hook-pre", text: "hook 注入调度事实" }],
    }));
    const unregisterPost = registerGroupMemoryCompactionHook("post", input => ({
        checked: input.quality?.pass === true,
        microRecords: input.microCompact?.recordCount || 0,
    }));
    try {
        const result = await compactGroupConversationMemory({
            groupId,
            messages,
            memory: { goal: "hook 自测" },
            config: { memoryCompactionUseModel: false },
            transcriptPath: "hook-raw.json",
            force: true,
        });
        const checks = {
            compacted: result.compacted === true,
            preHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.pre) && result.memory.compaction.hookResults.pre.length >= 1,
            postHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.post) && result.memory.compaction.hookResults.post.length >= 1,
            hookRequirementPersisted: (result.memory?.persistentRequirements || []).some((item) => String(item.text || "").includes(`HOOK_SENTINEL_${groupId}`)),
            hookFactAnchorPersisted: (result.memory?.factAnchors || []).some((item) => String(item.text || "").includes("hook 注入调度事实")),
            microCompactStored: Number(result.memory?.compaction?.microCompact?.recordCount || 0) > 0,
            reinjectionStored: result.memory?.compaction?.postCompactReinject?.hasCandidates === true,
            hookLedgerStored: result.memory?.compaction?.hookLedger?.schema === "ccm-group-memory-compaction-hook-ledger-summary-v1"
                && result.memory.compaction.hookLedger?.recentEntries?.some((entry) => entry.phase === "pre")
                && result.memory.compaction.hookLedger?.recentEntries?.some((entry) => entry.phase === "post"),
            hookLedgerReadable: readGroupMemoryCompactionHookLedger(groupId).entries?.length >= 2
                && readGroupMemoryCompactionHookLedger(groupId).stats?.pre?.ok >= 1
                && readGroupMemoryCompactionHookLedger(groupId).stats?.post?.ok >= 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        unregisterPre();
        unregisterPost();
        try {
            if (fs.existsSync(ledgerFile))
                fs.unlinkSync(ledgerFile);
        }
        catch { }
    }
}
async function runGroupMemoryPartialCompactSelfTest() {
    const messages = Array.from({ length: 60 }, (_, index) => ({
        id: `m${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "partial-agent" : undefined,
        content: index === 0
            ? "必须保留 PARTIAL_COMPACT_SENTINEL_20260707，并只压缩到指定边界。"
            : `partial compact 阶段 ${index} src/partial-${index}.ts ${"上下文".repeat(220)}`,
    }));
    const originalMessages = JSON.stringify(messages);
    const result = await compactGroupConversationMemory({
        groupId: "partial-compact-self-test",
        messages,
        memory: { goal: "选择性压缩自测" },
        config: { memoryCompactionUseModel: false },
        transcriptPath: "partial-raw.json",
        partialCompact: { direction: "up_to", messageId: "m30", reason: "selftest selected boundary" },
    });
    const checks = {
        compacted: result.compacted === true,
        boundaryIsPartial: result.boundary?.type === "partial-up-to",
        compactedThroughSelected: result.boundary?.summarizedThroughMessageId === "m30" && result.memory?.compaction?.lastCompactedMessageId === "m30",
        laterMessagesRemainRaw: result.keepIndex === 31 && messages[result.keepIndex]?.id === "m31" && result.boundary?.preservedMessageIds?.includes("m31"),
        partialMetadataRecorded: result.memory?.compaction?.partialCompact?.schema === "ccm-group-partial-compact-v1"
            && result.memory.compaction.partialCompact.enabled === true
            && result.memory.compaction.partialCompact.direction === "up_to",
        summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PARTIAL_COMPACT_SENTINEL_20260707"),
        rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        keepIndex: result.keepIndex,
        boundary: result.boundary,
    };
}
async function runGroupMemoryPartialCompactSidecarSelfTest() {
    const messages = Array.from({ length: 48 }, (_, index) => ({
        id: `s${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "sidecar-agent" : undefined,
        content: index === 20
            ? "必须保留 PARTIAL_SIDECAR_SENTINEL_20260707，并只作为 sidecar 中段摘要，不推进主压缩边界。"
            : index === 24
                ? "执行失败：sidecar-task blocked，src/sidecar.ts 需要继续修复。"
                : `partial sidecar 阶段 ${index} src/sidecar-${index}.ts`,
        task_id: index >= 20 && index <= 30 ? "sidecar-task" : undefined,
        receipt: index === 24 ? { status: "failed", taskId: "sidecar-task", summary: "sidecar blocked" } : undefined,
    }));
    const originalMessages = JSON.stringify(messages);
    const result = await compactGroupConversationMemory({
        groupId: "partial-sidecar-self-test",
        messages,
        memory: {
            goal: "选择性 sidecar 压缩自测",
            compaction: {
                version: exports.GROUP_MEMORY_COMPACTION_VERSION,
                lastCompactedMessageId: "s5",
                compactedMessageCount: 6,
            },
        },
        config: { memoryCompactionUseModel: false },
        transcriptPath: "partial-sidecar-raw.json",
        partialCompact: { direction: "range", fromMessageId: "s20", throughMessageId: "s30", reason: "selftest sidecar range" },
    });
    const segment = result.memory?.compaction?.partialSegments?.[0] || {};
    const checks = {
        sidecarCompacted: result.compacted === true && result.partialCompacted === true,
        primaryBoundaryUnchanged: !result.boundary && result.memory?.compaction?.lastCompactedMessageId === "s5"
            && Number(result.memory?.compaction?.compactedMessageCount || 0) === 6,
        sidecarMetadataRecorded: segment.schema === "ccm-group-partial-compact-segment-v1"
            && segment.direction === "range"
            && segment.range?.fromMessageId === "s20"
            && segment.range?.throughMessageId === "s30",
        sidecarSummaryPreservesSentinel: JSON.stringify(segment.summary || {}).includes("PARTIAL_SIDECAR_SENTINEL_20260707")
            && String(segment.messageDigest || "").includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
        sidecarQualityPasses: segment.quality?.pass === true && Number(segment.quality?.score || 0) >= 80,
        sidecarReinjectsFile: JSON.stringify(segment.reinjectionPlan || {}).includes("src/sidecar-"),
        sidecarFactMerged: JSON.stringify(result.memory?.persistentRequirements || []).includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
        rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        partialSegment: segment,
    };
}
async function runGroupMemoryPtlEmergencySelfTest() {
    const messages = Array.from({ length: 70 }, (_, index) => ({
        id: `ptl-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "ptl-agent" : undefined,
        content: index === 0
            ? "必须保留 PTL_SENTINEL_20260707，PTL 紧急降级不得修改原始消息。"
            : `PTL 压力阶段 ${index} src/ptl-${index}.ts ${"高压上下文".repeat(280)}`,
    }));
    const originalMessages = JSON.stringify(messages);
    const result = await compactGroupConversationMemory({
        groupId: "ptl-emergency-self-test",
        messages,
        memory: { goal: "PTL 紧急降级自测" },
        config: { memoryCompactionUseModel: false, ptlEmergency: true },
        transcriptPath: "ptl-raw.json",
        force: true,
    });
    const maxDigest = Number(result.memory?.compaction?.ptlEmergency?.messageDigestMaxChars || 0);
    const checks = {
        compacted: result.compacted === true,
        ptlRecordedInCompaction: result.memory?.compaction?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
            && result.memory.compaction.ptlEmergency.engaged === true,
        ptlRecordedInBoundary: result.boundary?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
            && result.boundary.ptlEmergency.rawTranscriptUnmodified === true,
        ptlRecordedInMessageCompression: result.memory?.messageCompression?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1",
        healthDowngraded: result.memory?.compaction?.health === "ptl_emergency",
        digestIsBounded: maxDigest > 0 && String(result.memory?.messageDigest || "").length <= maxDigest + 200,
        qualityStillPasses: result.memory?.compaction?.quality?.pass === true,
        summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_SENTINEL_20260707"),
        rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        ptlEmergency: result.memory?.compaction?.ptlEmergency,
    };
}
async function runGroupMemoryPtlRecoverySelfTest() {
    const messages = Array.from({ length: 52 }, (_, index) => ({
        id: `ptlr-${index}`,
        role: index % 2 === 0 ? "user" : "assistant",
        target: index % 2 === 0 ? "coordinator" : undefined,
        agent: index % 2 === 1 ? "ptl-recovery-agent" : undefined,
        content: index === 0
            ? "必须保留 PTL_RECOVERY_SENTINEL_20260707，压力恢复后应退出紧急摘要。"
            : `PTL recovery 阶段 ${index} src/ptl-recovery-${index}.ts ${"恢复上下文".repeat(80)}`,
    }));
    const previousEmergency = {
        schema: "ccm-group-ptl-emergency-v1",
        version: exports.GROUP_PTL_EMERGENCY_VERSION,
        engaged: true,
        emergencyLevel: "critical",
        reason: "previous_context_pressure_exhausted",
        triggerTokens: exports.GROUP_COMPACT_TRIGGER_TOKENS,
        messageDigestMaxChars: 700,
        rawTranscriptPath: "ptl-recovery-raw.json",
    };
    const result = await compactGroupConversationMemory({
        groupId: "ptl-recovery-self-test",
        messages,
        memory: {
            goal: "PTL 自动恢复自测",
            compaction: {
                version: exports.GROUP_MEMORY_COMPACTION_VERSION,
                ptlEmergency: previousEmergency,
                health: "ptl_emergency",
            },
        },
        config: { memoryCompactionUseModel: false },
        transcriptPath: "ptl-recovery-raw.json",
        force: true,
    });
    const recovery = result.memory?.compaction?.ptlRecovery || {};
    const checks = {
        compacted: result.compacted === true,
        recoveryRecorded: recovery.schema === "ccm-group-ptl-recovery-v1" && recovery.recovered === true,
        emergencyCleared: !result.memory?.compaction?.ptlEmergency && !result.memory?.messageCompression?.ptlEmergency,
        healthHealthy: result.memory?.compaction?.health === "healthy",
        digestRestoredAboveEmergencyBudget: String(result.memory?.messageDigest || "").length > previousEmergency.messageDigestMaxChars,
        recoveryStoredInBoundaryBudget: result.boundary?.context_budget?.ptl_recovery?.schema === "ccm-group-ptl-recovery-v1",
        summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_RECOVERY_SENTINEL_20260707"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        recovery,
    };
}
async function runGroupMemoryCompactionIntegrationSelfTest() {
    const messages = Array.from({ length: 70 }, (_, index) => ({
        id: `m${index}`,
        role: index % 2 ? "assistant" : "user",
        agent: index % 2 ? "worker" : undefined,
        content: index === 0
            ? "实现支付回调，必须保留幂等校验"
            : index === 20
                ? "Error: signature mismatch in src/pay.ts"
                : `阶段 ${index} ${"内容".repeat(250)}`,
    }));
    const originalMessages = JSON.stringify(messages);
    const first = await compactGroupConversationMemory({
        groupId: "compaction-self-test",
        messages,
        memory: { goal: "支付回调", nextActions: [{ action: "继续验签测试" }] },
        config: {},
        transcriptPath: "raw.json",
        force: true,
    });
    const appended = messages.concat(Array.from({ length: 30 }, (_, index) => ({
        id: `n${index}`,
        role: index % 2 ? "assistant" : "user",
        agent: index % 2 ? "worker" : undefined,
        content: `新增阶段 ${index} ${"x".repeat(1000)}`,
    })));
    const second = first.compacted
        ? await compactGroupConversationMemory({
            groupId: "compaction-self-test",
            messages: appended,
            memory: first.memory,
            config: {},
            transcriptPath: "raw.json",
            force: true,
        })
        : { compacted: false };
    const migrated = await compactGroupConversationMemory({
        groupId: "compaction-migration-self-test",
        messages,
        memory: { compaction: { version: 2, lastCompactedMessageId: "m60" } },
        config: {},
        transcriptPath: "raw.json",
        force: true,
    });
    const expectedSecondStart = first.compacted ? messages[first.keepIndex]?.id : "";
    const checks = {
        actualAsyncCompaction: !!first.compacted,
        structuredFallbackWithoutModel: first.memory?.compaction?.summarySource === "structured",
        qualityGatePassed: first.memory?.compaction?.quality?.pass === true,
        microCompactRecorded: first.memory?.compaction?.microCompact?.schema === "ccm-group-micro-compact-v1",
        postCompactReinjectRecorded: first.memory?.compaction?.postCompactReinject?.schema === "ccm-post-compact-reinjection-v1",
        fallbackPreservesUserIntent: !!first.memory?.conversationSummary?.userMessages?.length,
        rawMessagesRemainImmutable: JSON.stringify(messages) === originalMessages,
        incrementalSecondCompaction: !!second.compacted,
        nextBoundaryStartsAfterPrevious: second.boundary?.summarizedFromMessageId === expectedSecondStart,
        postCompactRestoreAnchorsRecorded: Array.isArray(first.boundary?.post_compact_restore?.preservedMessageIds) && first.boundary.post_compact_restore.preservedMessageIds.length > 0,
        legacyVersionRebuildsFromRawTranscript: migrated.memory?.compaction?.version === exports.GROUP_MEMORY_COMPACTION_VERSION
            && migrated.memory?.compaction?.migratedFromVersion === 2
            && migrated.boundary?.summarizedFromMessageId === "m0",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
async function runGroupMemoryCompactionStressSelfTest() {
    const messages = [];
    let memory = { goal: "长期维护支付审计链路", nextActions: [{ action: "继续完成当前任务" }] };
    let lastBoundaryIndex = -1;
    let boundariesAdvance = true;
    let validationsPass = true;
    let checksumsPresent = true;
    let reductionsHealthy = true;
    for (let round = 0; round < 12; round += 1) {
        for (let offset = 0; offset < 100; offset += 1) {
            const index = round * 100 + offset;
            const role = index % 2 === 0 ? "user" : "assistant";
            const taskId = `stress-task-${Math.floor(index / 40)}`;
            const content = index === 0
                ? "必须保留审计日志，任何压缩都不得删除 AUDIT_SENTINEL_73921"
                : index === 640
                    ? "新的约束：支付回调必须使用幂等键 IDEMPOTENCY_V2"
                    : `${role === "user" ? "用户要求" : "Agent进度"} ${index}，处理 src/payment/module-${index}.ts，${"上下文".repeat(180)}`;
            messages.push({
                id: `stress-${index}`,
                role,
                agent: role === "assistant" ? "payment-agent" : undefined,
                target: role === "user" ? "coordinator" : undefined,
                task_id: taskId,
                content,
                receipt: role === "assistant" ? { status: index % 40 === 39 ? "done" : "partial", summary: `任务阶段 ${index}` } : undefined,
            });
        }
        const result = await compactGroupConversationMemory({
            groupId: "compaction-stress-test",
            messages,
            memory,
            config: {},
            transcriptPath: "stress-raw.json",
            force: true,
        });
        if (!result.compacted) {
            boundariesAdvance = false;
            break;
        }
        const boundaryIndex = messages.findIndex(item => item.id === result.boundary?.summarizedThroughMessageId);
        boundariesAdvance = boundariesAdvance && boundaryIndex > lastBoundaryIndex;
        lastBoundaryIndex = boundaryIndex;
        validationsPass = validationsPass && result.memory?.compaction?.validation?.pass === true;
        validationsPass = validationsPass && result.memory?.compaction?.quality?.pass === true;
        checksumsPresent = checksumsPresent && String(result.memory?.compaction?.summaryChecksum || "").length === 24;
        reductionsHealthy = reductionsHealthy && Number(result.memory?.compaction?.reductionRatio || 0) > 0.2;
        memory = result.memory;
    }
    const retrieval = buildRelevantHistoricalGroupContext(messages, lastBoundaryIndex, "审计日志 AUDIT_SENTINEL_73921");
    const persistent = Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [];
    const checks = {
        handlesTwelveIncrementalCompactions: boundariesAdvance && Number(memory?.compaction?.compactedMessageCount || 0) > 1000,
        summaryValidationNeverDrifts: validationsPass,
        everySummaryHasIntegrityChecksum: checksumsPresent,
        compactionActuallyReleasesContext: reductionsHealthy,
        persistentRequirementSurvives: persistent.some((item) => String(item.text || "").includes("AUDIT_SENTINEL_73921"))
            && persistent.some((item) => String(item.text || "").includes("IDEMPOTENCY_V2")),
        oldRawEvidenceIsAutomaticallyRetrievable: retrieval.includes("#stress-0") && retrieval.includes("AUDIT_SENTINEL_73921"),
        rawTranscriptRemainsUntouched: messages[0]?.content.includes("AUDIT_SENTINEL_73921") && messages.length === 1200,
        boundaryHistoryIsBounded: Array.isArray(memory?.compaction?.boundaries) && memory.compaction.boundaries.length <= 8,
    };
    return { pass: Object.values(checks).every(Boolean), checks, finalBoundaryIndex: lastBoundaryIndex };
}
//# sourceMappingURL=group-memory-compaction.js.map