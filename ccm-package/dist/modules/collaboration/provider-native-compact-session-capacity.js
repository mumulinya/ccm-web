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
exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_LEDGER_SCHEMA = exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_SCHEMA = void 0;
exports.getProviderNativeCompactSessionCapacityLedgerFile = getProviderNativeCompactSessionCapacityLedgerFile;
exports.verifyProviderNativeCompactSessionCapacityBaseline = verifyProviderNativeCompactSessionCapacityBaseline;
exports.readProviderNativeCompactSessionCapacityLedger = readProviderNativeCompactSessionCapacityLedger;
exports.recordProviderNativeCompactSessionOutcome = recordProviderNativeCompactSessionOutcome;
exports.consumeProviderNativeCompactSessionCapacity = consumeProviderNativeCompactSessionCapacity;
exports.buildProviderNativeCompactSessionCapacitySummary = buildProviderNativeCompactSessionCapacitySummary;
exports.getProviderNativeCompactSessionGenerationFence = getProviderNativeCompactSessionGenerationFence;
exports.resetProviderNativeCompactSessionCapacity = resetProviderNativeCompactSessionCapacity;
exports.reconcileProviderNativeCompactSessionCapacityReset = reconcileProviderNativeCompactSessionCapacityReset;
exports.deleteProviderNativeCompactSessionCapacity = deleteProviderNativeCompactSessionCapacity;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const group_compact_head_1 = require("./group-compact-head");
exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_SCHEMA = "ccm-provider-native-compact-session-capacity-v1";
exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_LEDGER_SCHEMA = "ccm-provider-native-compact-session-capacity-ledger-v1";
const ROOT = path.join(utils_1.CCM_DIR, "provider-native-compact-session-capacity");
const CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27";
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
    return String(value || "unknown").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function finiteTokens(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function ledgerIdentity(ledger) {
    const { ledger_checksum: _checksum, file: _file, checksum_valid: _valid, ...identity } = ledger || {};
    return identity;
}
function baselineIdentity(baseline) {
    const { baseline_checksum: _checksum, ...identity } = baseline || {};
    return identity;
}
function sessionKey(taskAgentSessionId, nativeSessionId) {
    return `pncs_${checksum({ taskAgentSessionId, nativeSessionId }, 24)}`;
}
function getProviderNativeCompactSessionCapacityLedgerFile(groupId, groupSessionId = "default") {
    const sessionId = String(groupSessionId || "default").trim() || "default";
    if (sessionId === "default")
        return path.join(ROOT, `${clean(groupId)}.json`);
    return path.join(ROOT, clean(groupId), `${clean(sessionId)}.json`);
}
function emptyLedger(groupId, groupSessionId, file) {
    return {
        schema: exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_LEDGER_SCHEMA,
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        generation: 1,
        last_reset: null,
        reset_history: [],
        rejected_outcomes: [],
        sessions: [],
        updated_at: "",
        ledger_checksum: "",
        checksum_valid: true,
        file,
    };
}
function verifyProviderNativeCompactSessionCapacityBaseline(baseline) {
    if (baseline?.schema !== exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_SCHEMA || Number(baseline?.version || 0) !== 1)
        return false;
    if (!String(baseline?.group_id || "") || !String(baseline?.group_session_id || ""))
        return false;
    if (!String(baseline?.task_agent_session_id || "") || !String(baseline?.native_session_id || ""))
        return false;
    return String(baseline?.baseline_checksum || "") === checksum(baselineIdentity(baseline));
}
function readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId = "default") {
    const sessionId = String(groupSessionId || "default").trim() || "default";
    const file = getProviderNativeCompactSessionCapacityLedgerFile(groupId, sessionId);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            const valid = parsed?.schema === exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_LEDGER_SCHEMA
                && Number(parsed?.version || 0) === 1
                && String(parsed?.group_id || "") === String(groupId)
                && String(parsed?.group_session_id || "") === sessionId
                && String(parsed?.ledger_checksum || "") === checksum(ledgerIdentity(parsed));
            if (valid)
                return {
                    ...parsed,
                    generation: Math.max(1, Number(parsed.generation || 1)),
                    last_reset: parsed.last_reset || null,
                    reset_history: Array.isArray(parsed.reset_history) ? parsed.reset_history : [],
                    rejected_outcomes: Array.isArray(parsed.rejected_outcomes) ? parsed.rejected_outcomes : [],
                    checksum_valid: true,
                    recovered_from_backup: candidate !== file,
                    file,
                };
        }
        catch { }
    }
    return emptyLedger(String(groupId || ""), sessionId, file);
}
function writeLedger(file, ledger) {
    const core = {
        schema: exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_LEDGER_SCHEMA,
        version: 1,
        group_id: String(ledger.group_id || ""),
        group_session_id: String(ledger.group_session_id || "default"),
        generation: Math.max(1, Number(ledger.generation || 1)),
        last_reset: ledger.last_reset || null,
        reset_history: Array.isArray(ledger.reset_history) ? ledger.reset_history.slice(-32) : [],
        rejected_outcomes: Array.isArray(ledger.rejected_outcomes) ? ledger.rejected_outcomes.slice(-96) : [],
        sessions: Array.isArray(ledger.sessions) ? ledger.sessions.slice(-160) : [],
        updated_at: String(ledger.updated_at || new Date().toISOString()),
    };
    const output = { ...core, ledger_checksum: checksum(core) };
    (0, atomic_json_file_1.writeJsonAtomic)(file, output);
    return { ...output, checksum_valid: true, file };
}
function recordProviderNativeCompactSessionOutcome(receipt = {}) {
    const groupId = String(receipt.group_id || "").trim();
    const groupSessionId = String(receipt.group_session_id || "default").trim() || "default";
    const taskAgentSessionId = String(receipt.task_agent_session_id || "").trim();
    const nativeSessionId = String(receipt.native_session_id || "").trim();
    const receiptId = String(receipt.receipt_id || "").trim();
    const receiptChecksum = String(receipt.receipt_checksum || "").trim();
    const legacyAcceptedOnly = Number(receipt.version || 0) < 2 && String(receipt.status || "") === "native_applied";
    const projectedStatus = legacyAcceptedOnly ? "request_accepted" : String(receipt.status || "unverified");
    const strongProviderOutcome = !legacyAcceptedOnly
        && projectedStatus === "native_applied"
        && receipt.strong_proof === true
        && receipt.provider_outcome_verified === true;
    if (!groupId || !taskAgentSessionId || !nativeSessionId || !receiptId || !receiptChecksum) {
        return { recorded: false, reason: "exact_provider_session_and_receipt_required" };
    }
    const file = getProviderNativeCompactSessionCapacityLedgerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId);
        const ledgerGeneration = Math.max(1, Number(ledger.generation || 1));
        const outcomeGeneration = Math.max(1, Number(receipt.capacity_generation || receipt.provider_session_capacity_generation || 1));
        if (outcomeGeneration !== ledgerGeneration) {
            const rejectedOutcome = {
                receipt_id: receiptId,
                receipt_checksum: receiptChecksum,
                task_agent_session_id: taskAgentSessionId,
                native_session_id: nativeSessionId,
                outcome_generation: outcomeGeneration,
                current_generation: ledgerGeneration,
                reason: outcomeGeneration < ledgerGeneration ? "stale_generation_after_compact_reset" : "future_generation_not_observed",
                sent_at: String(receipt.sent_at || ""),
                rejected_at: new Date().toISOString(),
            };
            const saved = writeLedger(file, {
                ...ledger,
                rejected_outcomes: [...(ledger.rejected_outcomes || []), rejectedOutcome],
                updated_at: rejectedOutcome.rejected_at,
            });
            return { recorded: false, stale: outcomeGeneration < ledgerGeneration, reason: rejectedOutcome.reason, rejectedOutcome, ledger: saved, file };
        }
        const key = sessionKey(taskAgentSessionId, nativeSessionId);
        const sessions = Array.isArray(ledger.sessions) ? [...ledger.sessions] : [];
        const index = sessions.findIndex((item) => item.session_key === key);
        const previous = index >= 0 ? sessions[index] : null;
        const outcomes = Array.isArray(previous?.outcomes) ? [...previous.outcomes] : [];
        const existed = outcomes.some((item) => item.receipt_id === receiptId);
        if (!existed) {
            outcomes.push({
                receipt_id: receiptId,
                receipt_checksum: receiptChecksum,
                status: projectedStatus,
                strong_proof: strongProviderOutcome,
                legacy_request_accepted_only: legacyAcceptedOnly,
                capacity_generation: outcomeGeneration,
                plan_checksum: String(receipt.plan_checksum || ""),
                apply_plan_checksum: String(receipt.apply_plan_checksum || ""),
                request_patch_checksum: String(receipt.request_patch_checksum || ""),
                execution_id: String(receipt.execution_id || ""),
                runner_request_id: String(receipt.runner_request_id || ""),
                memory_context_snapshot_id: String(receipt.memory_context_snapshot_id || ""),
                memory_context_snapshot_checksum: String(receipt.memory_context_snapshot_checksum || ""),
                provider_request_id: String(receipt.provider_request_id || ""),
                provider_response_input_tokens: finiteTokens(receipt.provider_response_input_tokens),
                provider_response_output_tokens: finiteTokens(receipt.provider_response_output_tokens),
                cleared_input_tokens: finiteTokens(receipt.cleared_input_tokens),
                cleared_thinking_turns: finiteTokens(receipt.cleared_thinking_turns),
                cleared_tool_uses: finiteTokens(receipt.cleared_tool_uses),
                sent_at: String(receipt.sent_at || ""),
                outcome_at: String(receipt.accepted_at || receipt.created_at || new Date().toISOString()),
                capacity_consumed_at: "",
            });
        }
        const stickyBetaLatched = previous?.sticky_beta_latched === true
            || (Array.isArray(receipt.beta_headers) && receipt.beta_headers.includes(CONTEXT_MANAGEMENT_BETA));
        const nextSession = {
            session_key: key,
            group_id: groupId,
            group_session_id: groupSessionId,
            task_agent_session_id: taskAgentSessionId,
            native_session_id: nativeSessionId,
            generation: ledgerGeneration,
            sticky_beta_latched: stickyBetaLatched,
            latest_capacity_baseline: previous?.latest_capacity_baseline || null,
            outcomes: outcomes.slice(-96),
            updated_at: new Date().toISOString(),
        };
        if (index >= 0)
            sessions[index] = nextSession;
        else
            sessions.push(nextSession);
        const saved = writeLedger(file, { ...ledger, sessions, updated_at: new Date().toISOString() });
        return { recorded: !existed, idempotent: existed, session: nextSession, ledger: saved, file };
    });
}
function consumeProviderNativeCompactSessionCapacity(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default").trim() || "default";
    const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
    const nativeSessionId = String(input.nativeSessionId || input.native_session_id || "").trim();
    const rawActiveTokens = finiteTokens(input.rawActiveTokens || input.raw_active_tokens);
    if (!groupId || !taskAgentSessionId || !nativeSessionId)
        return null;
    const file = getProviderNativeCompactSessionCapacityLedgerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId);
        const ledgerGeneration = Math.max(1, Number(ledger.generation || 1));
        const key = sessionKey(taskAgentSessionId, nativeSessionId);
        const sessions = Array.isArray(ledger.sessions) ? [...ledger.sessions] : [];
        const index = sessions.findIndex((item) => item.session_key === key);
        if (index < 0)
            return null;
        const session = { ...sessions[index] };
        const outcomes = (Array.isArray(session.outcomes) ? session.outcomes : []).map((item) => ({ ...item }));
        const pending = outcomes.filter((item) => item.status === "native_applied" && item.strong_proof === true && !item.capacity_consumed_at);
        const latestApplied = [...outcomes].reverse().find((item) => item.status === "native_applied" && item.strong_proof === true);
        if (!latestApplied) {
            return {
                schema: exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_SCHEMA,
                version: 1,
                group_id: groupId,
                group_session_id: groupSessionId,
                task_agent_session_id: taskAgentSessionId,
                native_session_id: nativeSessionId,
                generation: ledgerGeneration,
                sticky_beta_latched: session.sticky_beta_latched === true,
                status: "awaiting_strong_provider_outcome",
                pending_outcome_count: 0,
                effective_context_tokens: rawActiveTokens,
                raw_active_tokens: rawActiveTokens,
                provider_cleared_input_tokens: 0,
                baseline_checksum: "",
            };
        }
        const consumedAt = String(input.consumedAt || input.consumed_at || new Date().toISOString());
        const pendingIds = new Set(pending.map((item) => item.receipt_id));
        for (const outcome of outcomes) {
            if (pendingIds.has(outcome.receipt_id))
                outcome.capacity_consumed_at = consumedAt;
        }
        const clearedInputTokens = finiteTokens(latestApplied.cleared_input_tokens);
        const providerInputTokens = finiteTokens(latestApplied.provider_response_input_tokens);
        const localEffectiveTokens = rawActiveTokens > 0 ? Math.max(0, rawActiveTokens - clearedInputTokens) : 0;
        const effectiveContextTokens = providerInputTokens || localEffectiveTokens;
        const core = {
            schema: exports.PROVIDER_NATIVE_COMPACT_SESSION_CAPACITY_SCHEMA,
            version: 1,
            group_id: groupId,
            group_session_id: groupSessionId,
            task_agent_session_id: taskAgentSessionId,
            native_session_id: nativeSessionId,
            generation: ledgerGeneration,
            sticky_beta_latched: session.sticky_beta_latched === true,
            status: "provider_outcome_applied",
            source_receipt_id: String(latestApplied.receipt_id || ""),
            source_receipt_checksum: String(latestApplied.receipt_checksum || ""),
            source_plan_checksum: String(latestApplied.plan_checksum || ""),
            source_apply_plan_checksum: String(latestApplied.apply_plan_checksum || ""),
            raw_active_tokens: rawActiveTokens,
            provider_response_input_tokens: providerInputTokens,
            provider_cleared_input_tokens: clearedInputTokens,
            provider_pre_edit_input_tokens_estimate: providerInputTokens > 0 ? providerInputTokens + clearedInputTokens : 0,
            local_effective_context_tokens: localEffectiveTokens,
            effective_context_tokens: effectiveContextTokens,
            token_basis: providerInputTokens > 0 ? "provider_response_post_edit_input" : "local_raw_minus_latest_provider_clear",
            pending_outcome_count: pending.length,
            consumed_outcome_count: pending.length,
            calculation: "latest strong provider outcome only; cleared_input_tokens are not cumulatively summed across repeated stateless requests",
            consumed_at: pending.length ? consumedAt : String(session.latest_capacity_baseline?.consumed_at || consumedAt),
        };
        const baseline = { ...core, baseline_checksum: checksum(core) };
        session.outcomes = outcomes.slice(-96);
        session.latest_capacity_baseline = baseline;
        session.updated_at = consumedAt;
        sessions[index] = session;
        writeLedger(file, { ...ledger, sessions, updated_at: consumedAt });
        return baseline;
    });
}
function buildProviderNativeCompactSessionCapacitySummary(groupId, groupSessionId = "default") {
    const ledger = readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId);
    const sessions = (Array.isArray(ledger.sessions) ? ledger.sessions : []).map((session) => ({
        session_key: String(session.session_key || ""),
        task_agent_session_id: String(session.task_agent_session_id || ""),
        native_session_id: String(session.native_session_id || ""),
        generation: Math.max(1, Number(session.generation || ledger.generation || 1)),
        sticky_beta_latched: session.sticky_beta_latched === true,
        outcome_count: Array.isArray(session.outcomes) ? session.outcomes.length : 0,
        pending_strong_outcome_count: (Array.isArray(session.outcomes) ? session.outcomes : [])
            .filter((item) => item.status === "native_applied" && item.strong_proof === true && !item.capacity_consumed_at).length,
        latest_capacity_baseline: verifyProviderNativeCompactSessionCapacityBaseline(session.latest_capacity_baseline)
            ? session.latest_capacity_baseline
            : null,
        updated_at: String(session.updated_at || ""),
    }));
    return {
        schema: "ccm-provider-native-compact-session-capacity-summary-v1",
        version: 1,
        group_id: String(groupId || ""),
        group_session_id: String(groupSessionId || "default"),
        generation: Math.max(1, Number(ledger.generation || 1)),
        last_reset: ledger.last_reset || null,
        reset_count: Array.isArray(ledger.reset_history) ? ledger.reset_history.length : 0,
        rejected_outcome_count: Array.isArray(ledger.rejected_outcomes) ? ledger.rejected_outcomes.length : 0,
        recent_rejected_outcomes: (Array.isArray(ledger.rejected_outcomes) ? ledger.rejected_outcomes : []).slice(-12).reverse(),
        ledger_file: ledger.file,
        checksum_valid: ledger.checksum_valid === true,
        session_count: sessions.length,
        sticky_beta_session_count: sessions.filter((item) => item.sticky_beta_latched).length,
        pending_strong_outcome_count: sessions.reduce((sum, item) => sum + item.pending_strong_outcome_count, 0),
        provider_cleared_input_tokens_latest_total: sessions.reduce((sum, item) => sum + finiteTokens(item.latest_capacity_baseline?.provider_cleared_input_tokens), 0),
        sessions,
        updated_at: String(ledger.updated_at || ""),
    };
}
function getProviderNativeCompactSessionGenerationFence(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "default").trim() || "default";
    const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
    const nativeSessionId = String(input.nativeSessionId || input.native_session_id || "").trim();
    if (!groupId || !taskAgentSessionId || !nativeSessionId)
        return null;
    const ledger = readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId);
    return {
        schema: "ccm-provider-native-compact-session-generation-fence-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        generation: Math.max(1, Number(ledger.generation || 1)),
        last_reset_id: String(ledger.last_reset?.reset_id || ""),
        last_reset_at: String(ledger.last_reset?.reset_at || ""),
        ledger_checksum: String(ledger.ledger_checksum || ""),
        ledger_checksum_valid: ledger.checksum_valid === true,
    };
}
function resetProviderNativeCompactSessionCapacity(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_provider_compact_reset");
    const compactHead = input.compactHead || input.compact_head || null;
    const boundaryId = String(input.boundaryId || input.boundary_id || compactHead?.boundary_id || "").trim();
    const compactTransactionReceiptChecksum = String(input.compactTransactionReceiptChecksum
        || input.compact_transaction_receipt_checksum
        || compactHead?.compact_transaction_receipt_checksum
        || "").trim();
    if (!boundaryId || !compactTransactionReceiptChecksum)
        throw new Error("durable_compact_boundary_and_receipt_required_for_provider_compact_reset");
    if (compactHead) {
        const verification = (0, group_compact_head_1.verifyGroupCompactHead)(compactHead, { groupId, groupSessionId });
        if (!verification.valid)
            throw new Error(`provider_compact_reset_head_invalid:${verification.issues.join(",")}`);
        if (String(compactHead.boundary_id || "") !== boundaryId
            || String(compactHead.compact_transaction_receipt_checksum || "") !== compactTransactionReceiptChecksum) {
            throw new Error("provider_compact_reset_head_binding_mismatch");
        }
    }
    const file = getProviderNativeCompactSessionCapacityLedgerFile(groupId, groupSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readProviderNativeCompactSessionCapacityLedger(groupId, groupSessionId);
        const previousReset = ledger.last_reset || null;
        const compactHeadGeneration = Math.max(0, Number(input.compactHeadGeneration || input.compact_head_generation || compactHead?.generation || 0));
        const previousCompactHeadGeneration = Math.max(0, Number(previousReset?.compact_head_generation || 0));
        const sameBoundary = String(previousReset?.boundary_id || "") === boundaryId
            && String(previousReset?.compact_transaction_receipt_checksum || "") === compactTransactionReceiptChecksum;
        if (sameBoundary) {
            return {
                schema: "ccm-provider-native-compact-session-capacity-reset-v1",
                reset: false,
                idempotent: true,
                status: "current",
                group_id: groupId,
                group_session_id: groupSessionId,
                previous_generation: Math.max(1, Number(previousReset?.previous_generation || ledger.generation || 1)),
                generation: Math.max(1, Number(ledger.generation || 1)),
                reset_id: String(previousReset?.reset_id || ""),
                reset_checksum: String(previousReset?.reset_checksum || ""),
                boundary_id: boundaryId,
                compact_head_generation: compactHeadGeneration || previousCompactHeadGeneration,
                retired_session_count: Number(previousReset?.retired_session_count || 0),
                file,
                ledger_checksum: String(ledger.ledger_checksum || ""),
            };
        }
        if (compactHeadGeneration > 0 && previousCompactHeadGeneration > compactHeadGeneration) {
            return {
                schema: "ccm-provider-native-compact-session-capacity-reset-v1",
                reset: false,
                idempotent: false,
                status: "fail_closed",
                reason: "stale_compact_head_generation",
                group_id: groupId,
                group_session_id: groupSessionId,
                generation: Math.max(1, Number(ledger.generation || 1)),
                boundary_id: boundaryId,
                compact_head_generation: compactHeadGeneration,
                current_compact_head_generation: previousCompactHeadGeneration,
                file,
                ledger_checksum: String(ledger.ledger_checksum || ""),
            };
        }
        if (compactHeadGeneration > 0
            && previousCompactHeadGeneration === compactHeadGeneration
            && previousCompactHeadGeneration > 0) {
            return {
                schema: "ccm-provider-native-compact-session-capacity-reset-v1",
                reset: false,
                idempotent: false,
                status: "fail_closed",
                reason: "compact_head_generation_boundary_collision",
                group_id: groupId,
                group_session_id: groupSessionId,
                generation: Math.max(1, Number(ledger.generation || 1)),
                boundary_id: boundaryId,
                compact_head_generation: compactHeadGeneration,
                current_boundary_id: String(previousReset?.boundary_id || ""),
                file,
                ledger_checksum: String(ledger.ledger_checksum || ""),
            };
        }
        const previousGeneration = Math.max(1, Number(ledger.generation || 1));
        const generation = previousGeneration + 1;
        const resetAt = String(input.resetAt || input.reset_at || new Date().toISOString());
        const reason = String(input.reason || "group_memory_compacted").trim().slice(0, 300);
        const resetCore = {
            previous_generation: previousGeneration,
            generation,
            group_id: groupId,
            group_session_id: groupSessionId,
            boundary_id: boundaryId,
            compact_transaction_receipt_checksum: compactTransactionReceiptChecksum,
            compact_head_id: String(input.compactHeadId || input.compact_head_id || compactHead?.head_id || ""),
            compact_head_generation: compactHeadGeneration,
            compact_head_checksum: String(input.compactHeadChecksum || input.compact_head_checksum || compactHead?.head_checksum || ""),
            reason,
            retired_session_count: Array.isArray(ledger.sessions) ? ledger.sessions.length : 0,
            reset_at: resetAt,
        };
        const reset = {
            reset_id: `pncr_${checksum(resetCore, 24)}`,
            ...resetCore,
            reset_checksum: checksum(resetCore),
        };
        const saved = writeLedger(file, {
            ...ledger,
            generation,
            last_reset: reset,
            reset_history: [...(ledger.reset_history || []), reset],
            sessions: [],
            updated_at: resetAt,
        });
        return {
            schema: "ccm-provider-native-compact-session-capacity-reset-v1",
            reset: true,
            idempotent: false,
            status: "reset",
            group_id: groupId,
            group_session_id: groupSessionId,
            previous_generation: previousGeneration,
            generation,
            reset_id: reset.reset_id,
            reset_checksum: reset.reset_checksum,
            boundary_id: boundaryId,
            compact_head_generation: compactHeadGeneration,
            retired_session_count: reset.retired_session_count,
            file,
            ledger_checksum: saved.ledger_checksum,
        };
    });
}
function reconcileProviderNativeCompactSessionCapacityReset(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const compactHead = input.compactHead || input.compact_head || null;
    const auditBase = {
        schema: "ccm-provider-native-compact-session-capacity-reconciliation-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        compact_head_id: String(compactHead?.head_id || ""),
        compact_head_generation: Math.max(0, Number(compactHead?.generation || 0)),
        boundary_id: String(compactHead?.boundary_id || ""),
        compact_transaction_receipt_checksum: String(compactHead?.compact_transaction_receipt_checksum || ""),
    };
    if (!groupId || !groupSessionId.startsWith("gcs_")) {
        return { ...auditBase, status: "rejected", recovered: false, idempotent: false, issues: ["exact_group_session_required"] };
    }
    if (!compactHead) {
        return { ...auditBase, status: "not_applicable", recovered: false, idempotent: true, issues: ["compact_head_missing"] };
    }
    const verification = (0, group_compact_head_1.verifyGroupCompactHead)(compactHead, { groupId, groupSessionId });
    if (!verification.valid) {
        return { ...auditBase, status: "fail_closed", recovered: false, idempotent: false, issues: verification.issues };
    }
    try {
        const reset = resetProviderNativeCompactSessionCapacity({
            groupId,
            groupSessionId,
            compactHead,
            boundaryId: compactHead.boundary_id,
            compactTransactionReceiptChecksum: compactHead.compact_transaction_receipt_checksum,
            reason: input.reason || "restart_reconcile_durable_compact_boundary",
            resetAt: input.resetAt || input.reset_at || compactHead.committed_at || new Date().toISOString(),
        });
        if (reset.status === "fail_closed") {
            return { ...auditBase, status: "fail_closed", recovered: false, idempotent: false, issues: [reset.reason], reset };
        }
        return {
            ...auditBase,
            status: reset.reset === true ? "recovered" : "current",
            recovered: reset.reset === true,
            idempotent: reset.idempotent === true,
            issues: [],
            generation: Number(reset.generation || 1),
            reset_id: String(reset.reset_id || ""),
            reset_checksum: String(reset.reset_checksum || ""),
            reset,
            reconciled_at: new Date().toISOString(),
        };
    }
    catch (error) {
        return {
            ...auditBase,
            status: "failed",
            recovered: false,
            idempotent: false,
            issues: [String(error?.message || error).slice(0, 300)],
            reconciled_at: new Date().toISOString(),
        };
    }
}
function deleteProviderNativeCompactSessionCapacity(groupId, groupSessionId = "default") {
    const file = getProviderNativeCompactSessionCapacityLedgerFile(groupId, groupSessionId);
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
        return { deleted, file, groupId, groupSessionId };
    });
}
//# sourceMappingURL=provider-native-compact-session-capacity.js.map