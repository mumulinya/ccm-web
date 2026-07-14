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
exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS = exports.CONSERVATIVE_MAX_OUTPUT_TOKENS = exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS = exports.MODEL_CONTEXT_CAPACITY_SCHEMA = exports.MODEL_CAPABILITY_CACHE_SCHEMA = void 0;
exports.recordModelCapabilityEvidence = recordModelCapabilityEvidence;
exports.recordVerifiedNativeModelCapabilityReceipt = recordVerifiedNativeModelCapabilityReceipt;
exports.revokeModelCapabilityEvidence = revokeModelCapabilityEvidence;
exports.runModelCapabilityCacheMaintenance = runModelCapabilityCacheMaintenance;
exports.readModelCapabilityCache = readModelCapabilityCache;
exports.summarizeModelCapabilityCache = summarizeModelCapabilityCache;
exports.resolveTrustedModelContextCapacity = resolveTrustedModelContextCapacity;
exports.buildModelCapabilityRefreshPlan = buildModelCapabilityRefreshPlan;
exports.recordModelCapabilityRefreshOutcome = recordModelCapabilityRefreshOutcome;
exports.writeModelCapabilityRefreshPlan = writeModelCapabilityRefreshPlan;
exports.buildModelCapabilityRefreshOutcomeLedger = buildModelCapabilityRefreshOutcomeLedger;
exports.readModelCapabilityRefreshOutcomeLedger = readModelCapabilityRefreshOutcomeLedger;
exports.readInvalidPendingModelCapabilityRefreshOutcomes = readInvalidPendingModelCapabilityRefreshOutcomes;
exports.acknowledgeInvalidPendingModelCapabilityRefreshOutcome = acknowledgeInvalidPendingModelCapabilityRefreshOutcome;
exports.inspectModelCapabilityRefreshLease = inspectModelCapabilityRefreshLease;
exports.acquireModelCapabilityRefreshLease = acquireModelCapabilityRefreshLease;
exports.releaseModelCapabilityRefreshLease = releaseModelCapabilityRefreshLease;
exports.runModelCapabilityRefreshMaintenance = runModelCapabilityRefreshMaintenance;
exports.readModelCapabilityRefreshStatus = readModelCapabilityRefreshStatus;
exports.readModelCapabilityDowngradeAlerts = readModelCapabilityDowngradeAlerts;
exports.pruneModelCapabilityDowngradeAlerts = pruneModelCapabilityDowngradeAlerts;
exports.startModelCapabilityRefreshScheduler = startModelCapabilityRefreshScheduler;
exports.stopModelCapabilityRefreshScheduler = stopModelCapabilityRefreshScheduler;
exports.runModelCapabilityCacheSelfTest = runModelCapabilityCacheSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_1 = require("../../core/utils");
const runtime_1 = require("../../agents/runtime");
const agent_sessions_1 = require("../../tasks/agent-sessions");
exports.MODEL_CAPABILITY_CACHE_SCHEMA = "ccm-model-capability-cache-v1";
exports.MODEL_CONTEXT_CAPACITY_SCHEMA = "ccm-model-context-capacity-v2";
exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS = 200_000;
exports.CONSERVATIVE_MAX_OUTPUT_TOKENS = 20_000;
exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS = 13_000;
const CACHE_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-cache.json");
const REFRESH_QUEUE_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-queue.json");
const REFRESH_LEASE_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-queue.lease.json");
const REFRESH_JOURNAL_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-queue.jsonl");
const REFRESH_STATUS_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-status.json");
const REFRESH_OUTCOME_LEDGER_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-outcomes.json");
const REFRESH_OUTCOME_PENDING_DIR = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-outcome-pending");
const REFRESH_OUTCOME_QUARANTINE_DIR = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-outcome-invalid");
const REFRESH_OUTCOME_ACK_LEDGER_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-outcome-invalid-acknowledgements.json");
const REFRESH_ARCHIVE_DIR = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-refresh-archive");
const DOWNGRADE_JOURNAL_FILE = path.join(utils_1.CCM_DIR, "memory-control", "model-capability-downgrades.jsonl");
const SOURCE_PRIORITY = {
    explicit_provider_capability: 400,
    native_executor_receipt: 300,
    user_setting: 200,
};
const SOURCE_CONFIDENCE = {
    explicit_provider_capability: 1,
    native_executor_receipt: 0.95,
    user_setting: 0.8,
    cc_conservative_default: 0.6,
};
const SOURCE_TTL_MS = {
    explicit_provider_capability: 30 * 24 * 60 * 60 * 1000,
    native_executor_receipt: 14 * 24 * 60 * 60 * 1000,
    user_setting: 90 * 24 * 60 * 60 * 1000,
};
function clean(value) {
    return String(value || "").trim().toLowerCase();
}
function keyFor(provider, model) {
    return `${clean(provider) || "unknown"}::${clean(model) || "__default__"}`;
}
function stableJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}
function hash(value) {
    return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}
function entryChecksum(entry) {
    const { checksum: _checksum, ...core } = entry || {};
    return hash(core);
}
function emptyCache() {
    return { schema: exports.MODEL_CAPABILITY_CACHE_SCHEMA, version: 1, entries: [], updatedAt: "", checksum: "" };
}
function cacheChecksum(cache) {
    return hash({ schema: cache.schema, version: cache.version, entries: cache.entries, updatedAt: cache.updatedAt });
}
function readRawCache() {
    try {
        if (!fs.existsSync(CACHE_FILE))
            return emptyCache();
        const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
        const entries = Array.isArray(parsed.entries)
            ? parsed.entries.filter((entry) => entry && entry.checksum === entryChecksum(entry))
            : [];
        return { schema: exports.MODEL_CAPABILITY_CACHE_SCHEMA, version: 1, entries, updatedAt: String(parsed.updatedAt || ""), checksum: String(parsed.checksum || "") };
    }
    catch {
        return emptyCache();
    }
}
function writeCache(cache) {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    const next = { ...cache, schema: exports.MODEL_CAPABILITY_CACHE_SCHEMA, version: 1, updatedAt: new Date().toISOString() };
    next.checksum = cacheChecksum(next);
    const temp = `${CACHE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, CACHE_FILE);
    return next;
}
function normalizeEvidence(input, now = new Date()) {
    const source = String(input?.source || "");
    if (!SOURCE_PRIORITY[source])
        throw new Error("不可信的模型能力来源");
    const nativeValidation = source === "native_executor_receipt" ? (0, runtime_1.verifyNativeModelCapabilityReceipt)(input) : null;
    if (nativeValidation && !nativeValidation.valid)
        throw new Error(`原生执行器能力回执验证失败：${nativeValidation.gaps.join(",")}`);
    const provider = clean(input.provider);
    const model = clean(input.model);
    if (!provider)
        throw new Error("模型能力必须指定 provider");
    const contextWindow = Math.floor(Number(input.contextWindow || input.context_window || input.maxInputTokens || input.max_input_tokens || 0));
    const maxOutputTokens = Math.floor(Number(input.maxOutputTokens || input.max_output_tokens || exports.CONSERVATIVE_MAX_OUTPUT_TOKENS));
    if (!Number.isFinite(contextWindow) || contextWindow < 32_000 || contextWindow > 4_000_000)
        throw new Error("上下文窗口必须介于 32,000 和 4,000,000 token");
    if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16_000)
        throw new Error("最大输出 token 与上下文窗口不兼容");
    const checkedAt = new Date(input.checkedAt || input.checked_at || input.capturedAt || now.toISOString());
    if (!Number.isFinite(checkedAt.getTime()) || checkedAt.getTime() > now.getTime() + 5 * 60 * 1000)
        throw new Error("模型能力校验时间无效");
    const defaultExpiry = checkedAt.getTime() + SOURCE_TTL_MS[source];
    const requestedExpiry = new Date(input.expiresAt || input.expires_at || defaultExpiry);
    const expiresAt = new Date(Math.min(requestedExpiry.getTime(), defaultExpiry));
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= checkedAt)
        throw new Error("模型能力过期时间无效");
    const evidenceId = String(input.evidenceId || input.evidence_id || input.receiptId || input.receipt_id || `${source}:${keyFor(provider, model)}:${checkedAt.toISOString()}`);
    const core = {
        schema: "ccm-model-capability-cache-entry-v1",
        key: keyFor(provider, model),
        provider,
        model,
        source,
        confidence: SOURCE_CONFIDENCE[source],
        priority: SOURCE_PRIORITY[source],
        contextWindow,
        maxOutputTokens,
        checkedAt: checkedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        evidenceId,
        verified: source === "native_executor_receipt" ? true : input.verified === true,
        revoked: false,
        revokedAt: "",
        revocationReason: "",
        ...(source === "native_executor_receipt" ? {
            nativeReceiptChecksum: String(input.checksum || ""),
            runner: String(input.runner || ""),
            runnerRequestId: String(input.runnerRequestId || ""),
            groupId: String(input.groupId || ""),
            taskId: String(input.taskId || ""),
            executionId: String(input.executionId || ""),
            taskAgentSessionId: String(input.taskAgentSessionId || ""),
            nativeSessionId: String(input.nativeSessionId || ""),
            nativeEventChecksum: String(input.eventChecksum || ""),
        } : {}),
    };
    return { ...core, checksum: entryChecksum(core) };
}
function recordModelCapabilityEvidence(input) {
    const before = resolveTrustedModelContextCapacity({ provider: input.provider, model: input.model });
    const entry = normalizeEvidence(input);
    const refreshRequest = buildModelCapabilityRefreshPlan().requests.find((request) => request.provider === entry.provider
        && request.model === entry.model
        && request.source === entry.source) || null;
    const cache = readRawCache();
    const entries = cache.entries.filter((item) => !(item.key === entry.key && item.source === entry.source));
    entries.push(entry);
    const saved = writeCache({ ...cache, entries: entries.slice(-500) });
    const after = resolveTrustedModelContextCapacity({ provider: entry.provider, model: entry.model });
    let downgrade = null;
    if (Number(before.contextWindow || 0) > Number(after.contextWindow || 0)) {
        const affected = (0, agent_sessions_1.markTaskAgentSessionsForCapacityDowngrade)({
            provider: entry.provider,
            model: entry.model,
            currentContextWindow: after.contextWindow,
            previousEvidenceChecksum: before.evidenceChecksum,
            currentEvidenceChecksum: after.evidenceChecksum,
        });
        downgrade = {
            schema: "ccm-model-capability-downgrade-alert-v1",
            alertId: `mcda_${Date.now().toString(36)}_${entry.checksum.slice(0, 10)}`,
            provider: entry.provider,
            model: entry.model,
            previousContextWindow: before.contextWindow,
            currentContextWindow: after.contextWindow,
            previousSource: before.source,
            currentSource: after.source,
            previousEvidenceChecksum: before.evidenceChecksum || "",
            currentEvidenceChecksum: after.evidenceChecksum || "",
            affectedSessionCount: affected.marked,
            affectedSessions: affected.sessions,
            action: "rebuild_and_recompact_active_child_sessions_before_next_dispatch",
            detectedAt: new Date().toISOString(),
        };
        fs.mkdirSync(path.dirname(DOWNGRADE_JOURNAL_FILE), { recursive: true });
        fs.appendFileSync(DOWNGRADE_JOURNAL_FILE, `${JSON.stringify(downgrade)}\n`, "utf-8");
    }
    return { entry, cache: summarizeModelCapabilityCache(readModelCapabilityCache()), downgrade, refreshRequest };
}
function recordVerifiedNativeModelCapabilityReceipt(receipt, expected = {}) {
    const validation = (0, runtime_1.verifyNativeModelCapabilityReceipt)(receipt, expected);
    if (!validation.valid)
        return { recorded: false, validation };
    const result = recordModelCapabilityEvidence({
        ...receipt,
        source: "native_executor_receipt",
        checkedAt: receipt.capturedAt,
        evidenceId: `native:${receipt.checksum}`,
    });
    return { recorded: true, validation, ...result };
}
function revokeModelCapabilityEvidence(input = {}) {
    const provider = clean(input.provider);
    const model = clean(input.model);
    const evidenceId = String(input.evidenceId || input.evidence_id || "").trim();
    if (!provider && !evidenceId)
        throw new Error("撤销能力证据必须指定 provider 或 evidenceId");
    const cache = readRawCache();
    const revokedAt = new Date().toISOString();
    let revoked = 0;
    const entries = cache.entries.map((entry) => {
        const matches = (!provider || entry.provider === provider)
            && (!model || entry.model === model)
            && (!evidenceId || entry.evidenceId === evidenceId)
            && (!input.source || entry.source === input.source);
        if (!matches || entry.revoked === true)
            return entry;
        revoked++;
        const next = {
            ...entry,
            revoked: true,
            revokedAt,
            revocationReason: String(input.reason || "manual_revocation").slice(0, 500),
            revokedBy: String(input.actor || "memory-center").slice(0, 120),
        };
        return { ...next, checksum: entryChecksum(next) };
    });
    const saved = revoked ? writeCache({ ...cache, entries }) : cache;
    return { revoked, revokedAt: revoked ? revokedAt : "", cache: summarizeModelCapabilityCache(readModelCapabilityCache()), saved: revoked > 0 };
}
function runModelCapabilityCacheMaintenance(input = {}) {
    const cache = readModelCapabilityCache();
    const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
    const retentionMs = Math.max(1, Number(input.retentionDays || input.retention_days || 30)) * 24 * 60 * 60 * 1000;
    const providerFilter = clean(input.provider);
    const evidenceIds = new Set((Array.isArray(input.evidenceIds || input.evidence_ids) ? (input.evidenceIds || input.evidence_ids) : []).map((value) => String(value || "").trim()).filter(Boolean));
    const candidates = cache.entries.filter((entry) => {
        if (providerFilter && entry.provider !== providerFilter)
            return false;
        if (evidenceIds.size && !evidenceIds.has(entry.evidenceId))
            return false;
        const expiredLongEnough = entry.expired === true && now.getTime() - new Date(entry.expiresAt).getTime() >= retentionMs;
        const revokedLongEnough = entry.revoked === true && now.getTime() - new Date(entry.revokedAt || entry.expiresAt).getTime() >= retentionMs;
        return expiredLongEnough || revokedLongEnough;
    });
    if (input.dryRun !== false || !candidates.length) {
        return { schema: "ccm-model-capability-cache-maintenance-v1", dryRun: input.dryRun !== false, candidateCount: candidates.length, deletedCount: 0, candidateEvidenceIds: candidates.map((entry) => entry.evidenceId), ranAt: now.toISOString() };
    }
    const candidateChecksums = new Set(candidates.map((entry) => entry.checksum));
    const raw = readRawCache();
    const entries = raw.entries.filter((entry) => !candidateChecksums.has(entry.checksum));
    writeCache({ ...raw, entries });
    return { schema: "ccm-model-capability-cache-maintenance-v1", dryRun: false, candidateCount: candidates.length, deletedCount: candidates.length, candidateEvidenceIds: candidates.map((entry) => entry.evidenceId), ranAt: now.toISOString() };
}
function readModelCapabilityCache(now = new Date()) {
    const cache = readRawCache();
    const entries = cache.entries.map((entry) => {
        const checkedAtMs = new Date(entry.checkedAt).getTime();
        const expiresAtMs = new Date(entry.expiresAt).getTime();
        const ttlMs = Math.max(0, expiresAtMs - checkedAtMs);
        const refreshLeadMs = Math.min(24 * 60 * 60 * 1000, Math.max(60 * 60 * 1000, Math.floor(ttlMs * 0.2)));
        const refreshDueAt = new Date(expiresAtMs - refreshLeadMs).toISOString();
        return {
            ...entry,
            expired: expiresAtMs <= now.getTime(),
            refreshDue: expiresAtMs > now.getTime() && now.getTime() >= expiresAtMs - refreshLeadMs,
            refreshDueAt,
            revoked: entry.revoked === true,
            checksumValid: entry.checksum === entryChecksum(entry),
        };
    });
    return { ...cache, file: CACHE_FILE, entries, checksumValid: !cache.checksum || cache.checksum === cacheChecksum(cache) };
}
function summarizeModelCapabilityCache(cache = readModelCapabilityCache()) {
    const entries = Array.isArray(cache.entries) ? cache.entries : [];
    return {
        schema: exports.MODEL_CAPABILITY_CACHE_SCHEMA,
        file: CACHE_FILE,
        total: entries.length,
        active: entries.filter((entry) => entry.expired !== true && entry.revoked !== true).length,
        expired: entries.filter((entry) => entry.expired === true).length,
        revoked: entries.filter((entry) => entry.revoked === true).length,
        refreshDue: entries.filter((entry) => entry.refreshDue === true && entry.revoked !== true).length,
        providers: [...new Set(entries.map((entry) => entry.provider).filter(Boolean))].length,
        models: [...new Set(entries.map((entry) => entry.model).filter(Boolean))].length,
        updatedAt: cache.updatedAt || "",
        checksumValid: cache.checksumValid !== false,
    };
}
function capacityFromEntry(entry, cacheStatus) {
    const reservedOutputTokens = Math.min(20_000, Math.max(0, Number(entry.maxOutputTokens || exports.CONSERVATIVE_MAX_OUTPUT_TOKENS)));
    const effectiveContextWindow = Math.max(18_000, Number(entry.contextWindow) - reservedOutputTokens);
    return {
        schema: exports.MODEL_CONTEXT_CAPACITY_SCHEMA,
        provider: entry.provider || "",
        model: entry.model || "",
        contextWindow: Number(entry.contextWindow),
        maxOutputTokens: Number(entry.maxOutputTokens || 0),
        reservedOutputTokens,
        effectiveContextWindow,
        autoCompactBufferTokens: exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS,
        autoCompactThreshold: Math.max(18_000, effectiveContextWindow - exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS),
        source: entry.source,
        confidence: Number(entry.confidence || 0),
        checkedAt: entry.checkedAt || "",
        expiresAt: entry.expiresAt || "",
        evidenceId: entry.evidenceId || "",
        evidenceChecksum: entry.checksum || "",
        cacheStatus,
        conservativeFallback: false,
    };
}
function resolveTrustedModelContextCapacity(input = {}) {
    const provider = clean(input.provider || input.agentProvider || input.agent_provider || input.agentType || input.agent_type || input.format || "unknown");
    const model = clean(input.model || input.modelId || input.model_id || "");
    const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
    const transient = [];
    const evidenceInputs = [input.providerCapability, input.provider_capability, input.nativeExecutorReceipt, input.native_executor_receipt, input.userSetting, input.user_setting].filter(Boolean);
    for (const raw of evidenceInputs) {
        try {
            transient.push(normalizeEvidence({ provider, model, ...raw }, now));
        }
        catch { }
    }
    const explicitWindow = Number(input.modelContextWindow || input.model_context_window || input.memoryContextWindowTokens || input.contextWindowTokens || 0);
    if (explicitWindow > 0) {
        try {
            transient.push(normalizeEvidence({
                provider,
                model,
                source: "user_setting",
                contextWindow: explicitWindow,
                maxOutputTokens: Number(input.modelMaxOutputTokens || input.model_max_output_tokens || input.maxOutputTokens || exports.CONSERVATIVE_MAX_OUTPUT_TOKENS),
                checkedAt: input.capacityCheckedAt || input.capacity_checked_at,
            }, now));
        }
        catch { }
    }
    const cacheSnapshot = readModelCapabilityCache(now);
    const matchingCached = (cacheSnapshot.checksumValid === false ? [] : cacheSnapshot.entries).filter((entry) => {
        const providerMatches = entry.provider === provider;
        const modelMatches = model ? entry.model === model || !entry.model : !entry.model;
        return providerMatches && modelMatches;
    });
    const cached = matchingCached.filter((entry) => entry.expired !== true && entry.revoked !== true && entry.checksumValid !== false);
    const candidates = [...transient, ...cached]
        .filter((entry) => new Date(entry.expiresAt).getTime() > now.getTime())
        .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(b.checkedAt).localeCompare(String(a.checkedAt)));
    if (candidates.length)
        return capacityFromEntry(candidates[0], transient.includes(candidates[0]) ? "transient_trusted" : candidates[0].refreshDue === true ? "cache_hit_refresh_due" : "cache_hit");
    const staleSafeEntry = matchingCached
        .filter((entry) => entry.expired === true && entry.revoked !== true && entry.checksumValid !== false)
        .sort((a, b) => Number(a.contextWindow || 0) - Number(b.contextWindow || 0))[0];
    if (staleSafeEntry && Number(staleSafeEntry.contextWindow || 0) < exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS) {
        return {
            ...capacityFromEntry({ ...staleSafeEntry, source: "stale_safe_bound", confidence: Math.min(0.5, Number(staleSafeEntry.confidence || 0)) }, "stale_safe_bound"),
            conservativeFallback: true,
            fallbackReason: "expired_evidence_preserved_as_safe_upper_bound",
            staleEvidenceId: staleSafeEntry.evidenceId,
            staleEvidenceSource: staleSafeEntry.source,
        };
    }
    const contextWindow = exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS;
    const reservedOutputTokens = exports.CONSERVATIVE_MAX_OUTPUT_TOKENS;
    const effectiveContextWindow = contextWindow - reservedOutputTokens;
    return {
        schema: exports.MODEL_CONTEXT_CAPACITY_SCHEMA,
        provider,
        model,
        contextWindow,
        maxOutputTokens: reservedOutputTokens,
        reservedOutputTokens,
        effectiveContextWindow,
        autoCompactBufferTokens: exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS,
        autoCompactThreshold: effectiveContextWindow - exports.CONTEXT_AUTOCOMPACT_BUFFER_TOKENS,
        source: "cc_default_200k",
        confidence: SOURCE_CONFIDENCE.cc_conservative_default,
        checkedAt: "",
        expiresAt: "",
        evidenceId: "cc-conservative-default",
        evidenceChecksum: "",
        cacheStatus: "conservative_fallback",
        conservativeFallback: true,
        fallbackReason: cacheSnapshot.checksumValid === false
            ? "capability_cache_checksum_invalid"
            : matchingCached.some((entry) => entry.revoked === true)
                ? "trusted_capability_revoked"
                : matchingCached.some((entry) => entry.expired === true)
                    ? "trusted_capability_expired"
                    : "no_trusted_capability",
    };
}
function buildModelCapabilityRefreshPlan(input = {}) {
    const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
    const cache = readModelCapabilityCache(now);
    const latestOutcomes = new Map();
    for (const row of readRefreshJournal(2_000, String(input.journalFile || REFRESH_JOURNAL_FILE))) {
        if (row.type === "refresh_outcome" && row.evidenceId)
            latestOutcomes.set(String(row.evidenceId), row);
    }
    const requests = cache.entries
        .filter((entry) => entry.refreshDue === true && entry.revoked !== true && entry.checksumValid !== false)
        .map((entry) => {
        const outcome = latestOutcomes.get(String(entry.evidenceId || "")) || null;
        const retryAtMs = Date.parse(String(outcome?.retryAt || "")) || 0;
        const inBackoff = retryAtMs > now.getTime();
        return {
            requestId: `mcr_${hash([entry.key, entry.evidenceId, entry.expiresAt]).slice(0, 20)}`,
            provider: entry.provider,
            model: entry.model,
            source: entry.source,
            evidenceId: entry.evidenceId,
            evidenceChecksum: entry.checksum,
            refreshDueAt: entry.refreshDueAt,
            expiresAt: entry.expiresAt,
            action: outcome?.outcome === "unsupported" ? "require_provider_capability_or_user_setting" : inBackoff ? "wait_for_retry_window" : "refresh_on_next_native_execution",
            status: outcome?.outcome === "unsupported" ? "unsupported" : inBackoff ? `backoff_${outcome.outcome}` : "pending_native_telemetry",
            lastOutcome: outcome?.outcome || "",
            lastAttemptAt: outcome?.at || "",
            retryAt: outcome?.retryAt || "",
            attemptCount: Number(outcome?.attemptCount || 0),
        };
    });
    return {
        schema: "ccm-model-capability-refresh-plan-v1",
        generatedAt: now.toISOString(),
        requestCount: requests.length,
        requests,
        cacheChecksumValid: cache.checksumValid !== false,
    };
}
function recordModelCapabilityRefreshOutcome(input = {}) {
    const provider = clean(input.provider || input.agentType || input.agent_type);
    const model = clean(input.model || input.modelId || input.model_id);
    const outcome = String(input.outcome || "").trim();
    if (!provider || !["refreshed", "metadata_absent", "unsupported"].includes(outcome))
        return { recorded: false, reason: "invalid_outcome" };
    const now = new Date(input.at || Date.now());
    const journalFile = String(input.journalFile || REFRESH_JOURNAL_FILE);
    const plan = buildModelCapabilityRefreshPlan({ now, journalFile });
    const suppliedRequest = input.refreshRequest || input.refresh_request || null;
    const matches = suppliedRequest
        ? [suppliedRequest].filter((request) => request.provider === provider && (!request.model || (!!model && request.model === model)))
        : plan.requests.filter((request) => request.status === "pending_native_telemetry" && request.provider === provider && (!request.model || (!!model && request.model === model)));
    if (!matches.length)
        return { recorded: false, reason: "no_refresh_due", outcome };
    const rows = matches.map((request) => {
        const retryMs = outcome === "metadata_absent" ? 6 * 60 * 60 * 1000 : outcome === "unsupported" ? 7 * 24 * 60 * 60 * 1000 : 0;
        return {
            type: "refresh_outcome",
            schema: "ccm-model-capability-refresh-outcome-v1",
            at: now.toISOString(),
            requestId: request.requestId,
            evidenceId: request.evidenceId,
            evidenceChecksum: request.evidenceChecksum,
            provider,
            model,
            outcome,
            attemptCount: Number(request.attemptCount || 0) + 1,
            retryAt: retryMs ? new Date(now.getTime() + retryMs).toISOString() : "",
            runnerRequestId: String(input.runnerRequestId || input.runner_request_id || ""),
            taskId: String(input.taskId || input.task_id || ""),
            executionId: String(input.executionId || input.execution_id || ""),
            taskAgentSessionId: String(input.taskAgentSessionId || input.task_agent_session_id || ""),
            nativeSessionId: String(input.nativeSessionId || input.native_session_id || ""),
            receiptEvidenceChecksum: String(input.receiptEvidenceChecksum || input.receipt_evidence_checksum || ""),
            reason: String(input.reason || "").slice(0, 500),
        };
    });
    const leaseFile = String(input.leaseFile || (input.journalFile ? `${journalFile}.lease.json` : REFRESH_LEASE_FILE));
    const acquired = acquireModelCapabilityRefreshLease({ file: leaseFile, journalFile, ttlMs: 30_000 });
    if (acquired.acquired) {
        for (const row of rows)
            appendRefreshJournal({ ...row, fencingToken: Number(acquired.lease?.fencingToken || 0), leaseId: acquired.lease?.leaseId || "" }, journalFile);
        if (acquired.handle)
            releaseModelCapabilityRefreshLease(acquired.handle, "refresh-outcome-recorded");
        return { recorded: true, queued: false, outcome, count: rows.length, rows, lease: acquired.lease };
    }
    const pendingDir = String(input.pendingDir || (input.journalFile ? `${journalFile}.pending` : REFRESH_OUTCOME_PENDING_DIR));
    fs.mkdirSync(pendingDir, { recursive: true });
    const pendingFiles = [];
    for (const row of rows) {
        const file = path.join(pendingDir, `${row.requestId}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.json`);
        const temp = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(temp, `${JSON.stringify(row, null, 2)}\n`, "utf-8");
        fs.renameSync(temp, file);
        pendingFiles.push(file);
    }
    return { recorded: true, queued: true, outcome, count: rows.length, rows, pendingFiles, reason: acquired.reason || "lease_busy" };
}
function writeModelCapabilityRefreshPlan(input = {}) {
    const plan = buildModelCapabilityRefreshPlan(input);
    const file = String(input.file || input.queueFile || REFRESH_QUEUE_FILE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(plan, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, file);
    return { ...plan, file };
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
function refreshLeaseChecksum(value) {
    const { checksum: _checksum, ...core } = value || {};
    return hash(core);
}
function readRefreshJournal(limit = 500, file = REFRESH_JOURNAL_FILE) {
    try {
        if (!fs.existsSync(file))
            return [];
        return fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).slice(-limit).flatMap(line => {
            try {
                return [JSON.parse(line)];
            }
            catch {
                return [];
            }
        });
    }
    catch {
        return [];
    }
}
function appendRefreshJournal(entry, file = REFRESH_JOURNAL_FILE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf-8");
}
function invalidOutcomeEnvelopeChecksum(value) {
    const { checksum: _checksum, ...core } = value || {};
    return hash(core);
}
function quarantineInvalidPendingRefreshOutcome(input = {}) {
    const sourceFile = String(input.sourceFile || "");
    const quarantineDir = String(input.quarantineDir || REFRESH_OUTCOME_QUARANTINE_DIR);
    const rawContent = String(input.rawContent ?? fs.readFileSync(sourceFile, "utf-8"));
    const quarantinedAt = new Date().toISOString();
    const invalidOutcomeId = `mcroi_${hash({ sourceFile: path.basename(sourceFile), rawContent, quarantinedAt }).slice(0, 24)}`;
    const core = {
        schema: "ccm-model-capability-invalid-refresh-outcome-v1",
        invalidOutcomeId,
        status: "pending_ack",
        originalFileName: path.basename(sourceFile),
        reason: String(input.reason || "invalid_pending_outcome").slice(0, 500),
        rawContent,
        rawContentChecksum: hash(rawContent),
        quarantinedAt,
    };
    const envelope = { ...core, checksum: invalidOutcomeEnvelopeChecksum(core) };
    fs.mkdirSync(quarantineDir, { recursive: true });
    const incomingFile = path.join(quarantineDir, `.incoming-${path.basename(sourceFile)}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
    const targetFile = path.join(quarantineDir, `${invalidOutcomeId}.json`);
    fs.renameSync(sourceFile, incomingFile);
    try {
        const temp = `${targetFile}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(temp, `${JSON.stringify(envelope, null, 2)}\n`, "utf-8");
        fs.renameSync(temp, targetFile);
        fs.unlinkSync(incomingFile);
    }
    catch (error) {
        if (fs.existsSync(incomingFile) && !fs.existsSync(sourceFile)) {
            try {
                fs.renameSync(incomingFile, sourceFile);
            }
            catch { }
        }
        throw error;
    }
    return { ...envelope, file: targetFile };
}
function drainPendingRefreshOutcomes(input = {}) {
    const pendingDir = String(input.pendingDir || REFRESH_OUTCOME_PENDING_DIR);
    const journalFile = String(input.journalFile || REFRESH_JOURNAL_FILE);
    if (!fs.existsSync(pendingDir))
        return { drained: 0, quarantined: 0, failed: 0 };
    let drained = 0;
    let quarantined = 0;
    let failed = 0;
    for (const name of fs.readdirSync(pendingDir).filter(name => name.endsWith(".json")).slice(0, 2_000)) {
        const file = path.join(pendingDir, name);
        let rawContent = "";
        try {
            rawContent = fs.readFileSync(file, "utf-8");
            const row = JSON.parse(rawContent);
            if (row.schema !== "ccm-model-capability-refresh-outcome-v1")
                throw new Error("invalid pending outcome schema");
            appendRefreshJournal({ ...row, drainedAt: new Date().toISOString(), fencingToken: Number(input.fencingToken || 0), leaseId: String(input.leaseId || "") }, journalFile);
            fs.unlinkSync(file);
            drained++;
        }
        catch (error) {
            try {
                const invalid = quarantineInvalidPendingRefreshOutcome({
                    sourceFile: file,
                    rawContent,
                    reason: String(error?.message || error || "invalid_pending_outcome"),
                    quarantineDir: input.quarantineDir,
                });
                appendRefreshJournal({
                    type: "pending_outcome_invalid",
                    at: invalid.quarantinedAt,
                    invalidOutcomeId: invalid.invalidOutcomeId,
                    originalFileName: invalid.originalFileName,
                    reason: invalid.reason,
                    rawContentChecksum: invalid.rawContentChecksum,
                    fencingToken: Number(input.fencingToken || 0),
                    leaseId: String(input.leaseId || ""),
                }, journalFile);
                quarantined++;
            }
            catch {
                failed++;
            }
        }
    }
    return { drained, quarantined, failed };
}
function buildModelCapabilityRefreshOutcomeLedger(input = {}) {
    const journalFile = String(input.journalFile || REFRESH_JOURNAL_FILE);
    const archiveDir = String(input.archiveDir || (input.journalFile ? `${journalFile}.archive` : REFRESH_ARCHIVE_DIR));
    const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
    const retentionMs = Math.max(1, Number(input.retentionDays || 90)) * 24 * 60 * 60 * 1000;
    const archiveFiles = fs.existsSync(archiveDir)
        ? fs.readdirSync(archiveDir).filter(name => name.endsWith(".jsonl")).sort().slice(-2_000).map(name => path.join(archiveDir, name))
        : [];
    const archivedRows = archiveFiles.flatMap(file => readRefreshJournal(100_000, file));
    const activeRows = readRefreshJournal(100_000, journalFile);
    const outcomes = [...archivedRows, ...activeRows]
        .filter((row) => row.type === "refresh_outcome" && Date.parse(String(row.at || "")) >= now.getTime() - retentionMs)
        .sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const latestByEvidence = new Map();
    const providerRows = new Map();
    for (const row of outcomes) {
        latestByEvidence.set(String(row.evidenceId || row.requestId), row);
        const rows = providerRows.get(String(row.provider || "unknown")) || [];
        rows.push(row);
        providerRows.set(String(row.provider || "unknown"), rows);
    }
    const providers = [...providerRows.entries()].map(([provider, rows]) => {
        const refreshed = rows.filter(row => row.outcome === "refreshed").length;
        const metadataAbsent = rows.filter(row => row.outcome === "metadata_absent").length;
        const unsupported = rows.filter(row => row.outcome === "unsupported").length;
        let consecutiveMetadataAbsent = 0;
        for (let index = rows.length - 1; index >= 0 && rows[index].outcome === "metadata_absent"; index--)
            consecutiveMetadataAbsent++;
        const latest = rows[rows.length - 1] || {};
        const health = unsupported > 0 && refreshed === 0
            ? "unsupported"
            : consecutiveMetadataAbsent >= 3
                ? "degraded"
                : refreshed > 0
                    ? "healthy"
                    : rows.length
                        ? "monitor"
                        : "unknown";
        return {
            provider,
            health,
            total: rows.length,
            refreshed,
            metadataAbsent,
            unsupported,
            refreshSuccessRate: rows.length ? Math.round((refreshed / rows.length) * 1000) / 10 : 0,
            metadataAvailabilityRate: rows.length ? Math.round(((rows.length - metadataAbsent - unsupported) / rows.length) * 1000) / 10 : 0,
            consecutiveMetadataAbsent,
            latestOutcome: latest.outcome || "",
            latestAt: latest.at || "",
            latestRetryAt: latest.retryAt || "",
        };
    }).sort((a, b) => a.provider.localeCompare(b.provider));
    const core = {
        schema: "ccm-model-capability-refresh-outcome-ledger-v1",
        generatedAt: now.toISOString(),
        retentionDays: Math.max(1, Number(input.retentionDays || 90)),
        historySources: { activeJournalRows: activeRows.length, archiveFiles: archiveFiles.length, archivedJournalRows: archivedRows.length },
        outcomeCount: outcomes.length,
        latestOutcomes: [...latestByEvidence.values()].slice(-1_000),
        providers,
        totals: {
            refreshed: outcomes.filter((row) => row.outcome === "refreshed").length,
            metadataAbsent: outcomes.filter((row) => row.outcome === "metadata_absent").length,
            unsupported: outcomes.filter((row) => row.outcome === "unsupported").length,
            degradedProviders: providers.filter(row => row.health === "degraded" || row.health === "unsupported").length,
        },
    };
    return { ...core, checksum: hash(core) };
}
function writeModelCapabilityRefreshOutcomeLedger(input = {}) {
    const file = String(input.file || REFRESH_OUTCOME_LEDGER_FILE);
    const ledger = buildModelCapabilityRefreshOutcomeLedger(input);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(ledger, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, file);
    return { ...ledger, file };
}
function retainRefreshJournal(input = {}) {
    const file = String(input.journalFile || REFRESH_JOURNAL_FILE);
    const maxRows = Math.max(10, Number(input.maxRows || 5_000));
    if (!fs.existsSync(file))
        return { before: 0, retained: 0, archived: 0, archiveFile: "" };
    const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean);
    if (lines.length <= maxRows)
        return { before: lines.length, retained: lines.length, archived: 0, archiveFile: "" };
    const archivedLines = lines.slice(0, lines.length - maxRows);
    const retainedLines = lines.slice(-maxRows);
    const archiveDir = String(input.archiveDir || REFRESH_ARCHIVE_DIR);
    fs.mkdirSync(archiveDir, { recursive: true });
    const archiveFile = path.join(archiveDir, `refresh-${new Date().toISOString().replace(/[:.]/g, "-")}-${hash(archivedLines).slice(0, 10)}.jsonl`);
    fs.writeFileSync(archiveFile, `${archivedLines.join("\n")}\n`, { encoding: "utf-8", flag: "wx" });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${retainedLines.join("\n")}\n`, "utf-8");
    fs.renameSync(temp, file);
    return { before: lines.length, retained: retainedLines.length, archived: archivedLines.length, archiveFile };
}
function retainRefreshArchives(input = {}) {
    const archiveDir = String(input.archiveDir || REFRESH_ARCHIVE_DIR);
    const maxArchives = Math.max(1, Number(input.maxArchives || 50));
    const retentionDays = Math.max(1, Number(input.retentionDays || 180));
    const nowMs = input.now instanceof Date ? input.now.getTime() : Date.parse(String(input.now || "")) || Date.now();
    if (!fs.existsSync(archiveDir))
        return { scanned: 0, deleted: 0, expired: 0, overflow: 0, remaining: 0, maxArchives, retentionDays };
    const files = fs.readdirSync(archiveDir)
        .filter(name => name.endsWith(".jsonl"))
        .map(name => {
        const file = path.join(archiveDir, name);
        const stat = fs.statSync(file);
        return { name, file, modifiedAtMs: stat.mtimeMs };
    })
        .sort((a, b) => a.modifiedAtMs - b.modifiedAtMs || a.name.localeCompare(b.name));
    const expiredFiles = files.filter(row => nowMs - row.modifiedAtMs > retentionDays * 24 * 60 * 60 * 1000);
    const deleteFiles = new Set(expiredFiles.map(row => row.file));
    const afterExpiry = files.filter(row => !deleteFiles.has(row.file));
    for (const row of afterExpiry.slice(0, Math.max(0, afterExpiry.length - maxArchives)))
        deleteFiles.add(row.file);
    let deleted = 0;
    for (const file of deleteFiles) {
        try {
            fs.unlinkSync(file);
            deleted++;
        }
        catch { }
    }
    return {
        scanned: files.length,
        deleted,
        expired: expiredFiles.length,
        overflow: Math.max(0, afterExpiry.length - maxArchives),
        remaining: files.length - deleted,
        maxArchives,
        retentionDays,
    };
}
function readModelCapabilityRefreshOutcomeLedger(input = {}) {
    const file = String(input.file || REFRESH_OUTCOME_LEDGER_FILE);
    if (!fs.existsSync(file)) {
        return { schema: "ccm-model-capability-refresh-outcome-ledger-v1", file, present: false, schemaValid: false, checksumValid: false, valid: false, recoveryRequired: true, recoveryReason: "missing", outcomeCount: 0, latestOutcomes: [], providers: [], totals: {} };
    }
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        const { checksum, file: _file, ...core } = ledger;
        const schemaValid = ledger.schema === "ccm-model-capability-refresh-outcome-ledger-v1";
        const checksumValid = typeof checksum === "string" && checksum === hash(core);
        const valid = schemaValid && checksumValid;
        return { ...ledger, file, present: true, schemaValid, checksumValid, valid, recoveryRequired: !valid, recoveryReason: !schemaValid ? "invalid_schema" : !checksumValid ? "checksum_invalid" : "" };
    }
    catch (error) {
        return { schema: "ccm-model-capability-refresh-outcome-ledger-v1", file, present: true, schemaValid: false, checksumValid: false, valid: false, recoveryRequired: true, recoveryReason: "parse_error", error: String(error?.message || error), outcomeCount: 0, latestOutcomes: [], providers: [], totals: {} };
    }
}
function invalidOutcomeAcknowledgementChecksum(value) {
    const { checksum: _checksum, ...core } = value || {};
    return hash(core);
}
function readInvalidOutcomeAcknowledgementLedger(file = REFRESH_OUTCOME_ACK_LEDGER_FILE) {
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        const { checksum, ...core } = ledger;
        if (ledger.schema !== "ccm-model-capability-invalid-refresh-outcome-ack-ledger-v1" || checksum !== invalidOutcomeAcknowledgementChecksum(core))
            throw new Error("invalid acknowledgement ledger");
        return ledger;
    }
    catch {
        const core = { schema: "ccm-model-capability-invalid-refresh-outcome-ack-ledger-v1", version: 1, updatedAt: "", acknowledgements: [] };
        return { ...core, checksum: invalidOutcomeAcknowledgementChecksum(core) };
    }
}
function writeInvalidOutcomeAcknowledgementLedger(ledger, file = REFRESH_OUTCOME_ACK_LEDGER_FILE) {
    const core = {
        schema: "ccm-model-capability-invalid-refresh-outcome-ack-ledger-v1",
        version: 1,
        updatedAt: new Date().toISOString(),
        acknowledgements: Array.isArray(ledger.acknowledgements) ? ledger.acknowledgements : [],
    };
    const next = { ...core, checksum: invalidOutcomeAcknowledgementChecksum(core) };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, file);
    return next;
}
function readInvalidPendingModelCapabilityRefreshOutcomes(input = {}) {
    const quarantineDir = String(input.quarantineDir || REFRESH_OUTCOME_QUARANTINE_DIR);
    const acknowledgementLedgerFile = String(input.acknowledgementLedgerFile || REFRESH_OUTCOME_ACK_LEDGER_FILE);
    const ledger = readInvalidOutcomeAcknowledgementLedger(acknowledgementLedgerFile);
    const acknowledgements = new Map((ledger.acknowledgements || []).map((row) => [String(row.invalidOutcomeId || ""), row]));
    const outcomes = [];
    if (fs.existsSync(quarantineDir)) {
        for (const name of fs.readdirSync(quarantineDir).filter(name => name.endsWith(".json")).slice(-2_000)) {
            const file = path.join(quarantineDir, name);
            try {
                const envelope = JSON.parse(fs.readFileSync(file, "utf-8"));
                const checksumValid = envelope.checksum === invalidOutcomeEnvelopeChecksum(envelope);
                const acknowledgement = acknowledgements.get(String(envelope.invalidOutcomeId || "")) || null;
                outcomes.push({ ...envelope, rawContent: undefined, file, checksumValid, status: acknowledgement ? "acknowledged" : "pending_ack", acknowledgement });
            }
            catch (error) {
                outcomes.push({ invalidOutcomeId: path.basename(name, ".json"), originalFileName: name, file, status: "quarantine_corrupt", checksumValid: false, reason: String(error?.message || error) });
            }
        }
    }
    outcomes.sort((a, b) => String(b.quarantinedAt || "").localeCompare(String(a.quarantinedAt || "")));
    return {
        schema: "ccm-model-capability-invalid-refresh-outcome-index-v1",
        quarantineDir,
        acknowledgementLedgerFile,
        total: outcomes.length,
        pendingAcknowledgementCount: outcomes.filter(row => row.status === "pending_ack").length,
        acknowledgedCount: outcomes.filter(row => row.status === "acknowledged").length,
        outcomes,
    };
}
function acknowledgeInvalidPendingModelCapabilityRefreshOutcome(input = {}) {
    const invalidOutcomeId = String(input.invalidOutcomeId || input.invalid_outcome_id || "").trim();
    if (!/^mcroi_[a-f0-9]{24}$/.test(invalidOutcomeId))
        throw new Error("无效的隔离回执 ID");
    const quarantineDir = String(input.quarantineDir || REFRESH_OUTCOME_QUARANTINE_DIR);
    const file = path.join(quarantineDir, `${invalidOutcomeId}.json`);
    if (!fs.existsSync(file))
        throw new Error("隔离回执不存在");
    const journalFile = String(input.journalFile || REFRESH_JOURNAL_FILE);
    const leaseFile = String(input.leaseFile || (input.journalFile ? `${journalFile}.lease.json` : REFRESH_LEASE_FILE));
    const acquired = acquireModelCapabilityRefreshLease({ file: leaseFile, journalFile, ttlMs: 30_000 });
    if (!acquired.acquired)
        return { acknowledged: false, reason: acquired.reason || "lease_busy" };
    try {
        const acknowledgementLedgerFile = String(input.acknowledgementLedgerFile || REFRESH_OUTCOME_ACK_LEDGER_FILE);
        const ledger = readInvalidOutcomeAcknowledgementLedger(acknowledgementLedgerFile);
        const existing = (ledger.acknowledgements || []).find((row) => row.invalidOutcomeId === invalidOutcomeId);
        if (existing)
            return { acknowledged: true, alreadyAcknowledged: true, acknowledgement: existing };
        const acknowledgement = {
            invalidOutcomeId,
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: String(input.acknowledgedBy || input.acknowledged_by || "memory-center").slice(0, 100),
            note: String(input.note || "").slice(0, 500),
        };
        writeInvalidOutcomeAcknowledgementLedger({ acknowledgements: [...(ledger.acknowledgements || []), acknowledgement] }, acknowledgementLedgerFile);
        appendRefreshJournal({ type: "pending_outcome_acknowledged", at: acknowledgement.acknowledgedAt, ...acknowledgement, fencingToken: Number(acquired.lease?.fencingToken || 0), leaseId: String(acquired.lease?.leaseId || "") }, journalFile);
        return { acknowledged: true, alreadyAcknowledged: false, acknowledgement };
    }
    finally {
        if (acquired.handle)
            releaseModelCapabilityRefreshLease(acquired.handle, "invalid-outcome-acknowledged");
    }
}
function writeRefreshStatus(status, file = REFRESH_STATUS_FILE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(status, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, file);
}
function inspectModelCapabilityRefreshLease(input = {}) {
    const file = String(input.file || REFRESH_LEASE_FILE);
    let lease = null;
    try {
        lease = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    if (!lease)
        return { file, present: false, valid: true, active: false, lease: null };
    const atMs = Date.parse(String(input.at || "")) || Date.now();
    const checksumValid = lease.checksum === refreshLeaseChecksum(lease);
    const ownerLocal = String(lease.ownerHostname || "") === os.hostname();
    const ownerAlive = !ownerLocal || processAlive(Number(lease.ownerPid || 0));
    const unexpired = atMs < (Date.parse(String(lease.expiresAt || "")) || 0);
    const valid = lease.schema === "ccm-model-capability-refresh-lease-v1" && checksumValid && Number(lease.fencingToken || 0) > 0;
    return { file, present: true, valid, checksumValid, ownerAlive, unexpired, active: valid && lease.status === "active" && ownerAlive && unexpired, lease };
}
function writeRefreshLease(handle, value) {
    const core = { ...value };
    delete core.checksum;
    const lease = { ...core, checksum: refreshLeaseChecksum(core) };
    const body = JSON.stringify(lease, null, 2);
    fs.ftruncateSync(handle.fd, 0);
    fs.writeSync(handle.fd, body, 0, "utf-8");
    fs.fsyncSync(handle.fd);
    handle.lease = lease;
    return lease;
}
function acquireModelCapabilityRefreshLease(input = {}) {
    const file = String(input.file || REFRESH_LEASE_FILE);
    const at = String(input.at || new Date().toISOString());
    const atMs = Date.parse(at) || Date.now();
    const ttlMs = Math.max(5_000, Math.min(10 * 60_000, Number(input.ttlMs || 2 * 60_000)));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let recoveredLease = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        const status = inspectModelCapabilityRefreshLease({ file, at });
        if (status.present) {
            if (!status.valid)
                return { acquired: false, reason: "invalid_lease", status };
            if (status.active)
                return { acquired: false, reason: "lease_busy", status };
            recoveredLease = status.lease;
            try {
                fs.renameSync(file, `${file}.abandoned.${Date.now()}.${crypto.randomBytes(3).toString("hex")}`);
            }
            catch {
                if (fs.existsSync(file))
                    continue;
            }
        }
        let fd = -1;
        try {
            fd = fs.openSync(file, "wx+");
            const journalToken = readRefreshJournal(500, String(input.journalFile || REFRESH_JOURNAL_FILE)).reduce((max, row) => Math.max(max, Number(row.fencingToken || row.lease?.fencingToken || 0)), 0);
            const fencingToken = Math.max(journalToken, Number(recoveredLease?.fencingToken || 0)) + 1;
            const lease = {
                schema: "ccm-model-capability-refresh-lease-v1",
                leaseId: `mcrl_${crypto.randomBytes(12).toString("hex")}`,
                ownerPid: Number(input.ownerPid || process.pid),
                ownerHostname: String(input.ownerHostname || os.hostname()),
                ownerInstanceId: String(input.ownerInstanceId || `${os.hostname()}:${process.pid}`),
                fencingToken,
                recoveryCount: Number(recoveredLease?.recoveryCount || 0) + (recoveredLease?.status === "active" ? 1 : 0),
                status: "active",
                acquiredAt: at,
                expiresAt: new Date(atMs + ttlMs).toISOString(),
                releasedAt: "",
            };
            const handle = { fd, file, ttlMs, lease, released: false };
            writeRefreshLease(handle, lease);
            return { acquired: true, recovered: recoveredLease?.status === "active", handle, lease: handle.lease };
        }
        catch (error) {
            if (fd >= 0)
                try {
                    fs.closeSync(fd);
                }
                catch { }
            if (error?.code === "EEXIST")
                continue;
            return { acquired: false, reason: "lease_acquire_failed", error: String(error?.message || error) };
        }
    }
    return { acquired: false, reason: "lease_contended" };
}
function releaseModelCapabilityRefreshLease(handle, finalStatus = "completed") {
    if (!handle || handle.released || handle.fd < 0)
        return false;
    try {
        const releasedAt = new Date().toISOString();
        writeRefreshLease(handle, { ...handle.lease, status: "released", releasedAt, expiresAt: releasedAt, finalStatus });
        fs.closeSync(handle.fd);
        handle.released = true;
        const current = inspectModelCapabilityRefreshLease({ file: handle.file });
        if (current.lease?.leaseId === handle.lease.leaseId)
            try {
                fs.unlinkSync(handle.file);
            }
            catch { }
        return true;
    }
    catch {
        try {
            fs.closeSync(handle.fd);
        }
        catch { }
        handle.released = true;
        return false;
    }
}
function runModelCapabilityRefreshMaintenance(input = {}) {
    const startedAt = new Date().toISOString();
    const acquired = input.skipLease === true
        ? { acquired: true, recovered: false, handle: null, lease: { leaseId: "skip-lease", fencingToken: 0, ownerPid: process.pid, ownerHostname: os.hostname() } }
        : acquireModelCapabilityRefreshLease({ file: input.leaseFile, journalFile: input.journalFile, ttlMs: input.leaseTtlMs, at: input.now, ownerInstanceId: input.ownerInstanceId });
    if (!acquired.acquired) {
        const status = { schema: "ccm-model-capability-refresh-status-v1", success: false, skipped: true, reason: acquired.reason || "lease_busy", requestCount: 0, startedAt, completedAt: new Date().toISOString(), lease: acquired.status?.lease || null };
        writeRefreshStatus(status, String(input.statusFile || REFRESH_STATUS_FILE));
        appendRefreshJournal({ type: "skipped", at: status.completedAt, reason: status.reason, lease: status.lease }, String(input.journalFile || REFRESH_JOURNAL_FILE));
        return status;
    }
    let error = "";
    let plan = null;
    let pending = { drained: 0, quarantined: 0, failed: 0 };
    let retention = { before: 0, retained: 0, archived: 0, archiveFile: "" };
    let archiveRetention = { scanned: 0, deleted: 0, expired: 0, overflow: 0, remaining: 0 };
    let outcomeLedger = null;
    let ledgerRecovery = { recoveryRequired: false, recoveryReason: "", recovered: false, recoveredAt: "", previousChecksumValid: true };
    try {
        if (Number(input.holdMs || 0) > 0)
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(input.holdMs));
        const journalFile = String(input.journalFile || REFRESH_JOURNAL_FILE);
        const outcomeLedgerFile = String(input.outcomeLedgerFile || (input.journalFile ? `${journalFile}.outcomes.json` : REFRESH_OUTCOME_LEDGER_FILE));
        const archiveDir = String(input.archiveDir || (input.journalFile ? `${journalFile}.archive` : REFRESH_ARCHIVE_DIR));
        const previousLedger = readModelCapabilityRefreshOutcomeLedger({ file: outcomeLedgerFile });
        ledgerRecovery = {
            recoveryRequired: previousLedger.recoveryRequired === true,
            recoveryReason: String(previousLedger.recoveryReason || ""),
            recovered: false,
            recoveredAt: "",
            previousPresent: previousLedger.present === true,
            previousChecksumValid: previousLedger.checksumValid === true,
        };
        pending = drainPendingRefreshOutcomes({
            pendingDir: input.pendingDir || (input.journalFile ? `${journalFile}.pending` : REFRESH_OUTCOME_PENDING_DIR),
            quarantineDir: input.quarantineDir || (input.journalFile ? `${journalFile}.invalid` : REFRESH_OUTCOME_QUARANTINE_DIR),
            journalFile,
            fencingToken: acquired.lease?.fencingToken,
            leaseId: acquired.lease?.leaseId,
        });
        plan = writeModelCapabilityRefreshPlan({ now: input.now, file: input.queueFile, journalFile });
        if (ledgerRecovery.recoveryRequired) {
            ledgerRecovery.recovered = true;
            ledgerRecovery.recoveredAt = new Date().toISOString();
            appendRefreshJournal({
                type: "outcome_ledger_recovered",
                at: ledgerRecovery.recoveredAt,
                recoveryReason: ledgerRecovery.recoveryReason,
                previousPresent: ledgerRecovery.previousPresent,
                previousChecksumValid: ledgerRecovery.previousChecksumValid,
                fencingToken: Number(acquired.lease?.fencingToken || 0),
                leaseId: String(acquired.lease?.leaseId || ""),
            }, journalFile);
        }
        outcomeLedger = writeModelCapabilityRefreshOutcomeLedger({
            journalFile,
            file: outcomeLedgerFile,
            now: input.now,
            retentionDays: input.outcomeRetentionDays || 90,
            archiveDir,
        });
        retention = retainRefreshJournal({ journalFile, maxRows: Math.max(10, Number(input.maxJournalRows || 5_000) - 1), archiveDir });
        archiveRetention = retainRefreshArchives({ archiveDir, maxArchives: input.maxArchives || 50, retentionDays: input.archiveRetentionDays || 180, now: input.now });
    }
    catch (caught) {
        error = String(caught?.message || caught);
    }
    const completedAt = new Date().toISOString();
    const status = {
        schema: "ccm-model-capability-refresh-status-v1",
        success: !error,
        skipped: false,
        error,
        trigger: String(input.trigger || "manual"),
        requestCount: Number(plan?.requestCount || 0),
        pendingOutcomeDrained: Number(pending.drained || 0),
        pendingOutcomeQuarantined: Number(pending.quarantined || 0),
        pendingOutcomeFailed: Number(pending.failed || 0),
        journalRetention: retention,
        archiveRetention,
        ledgerRecovery,
        outcomeHealth: outcomeLedger ? { outcomeCount: outcomeLedger.outcomeCount, providers: outcomeLedger.providers, totals: outcomeLedger.totals, checksum: outcomeLedger.checksum } : null,
        startedAt,
        completedAt,
        lease: {
            leaseId: acquired.lease?.leaseId || "",
            fencingToken: Number(acquired.lease?.fencingToken || 0),
            recoveryCount: Number(acquired.lease?.recoveryCount || 0),
            recovered: acquired.recovered === true,
            ownerPid: Number(acquired.lease?.ownerPid || 0),
            ownerHostname: String(acquired.lease?.ownerHostname || ""),
        },
    };
    writeRefreshStatus(status, String(input.statusFile || REFRESH_STATUS_FILE));
    appendRefreshJournal({ type: error ? "failed" : "completed", at: completedAt, trigger: status.trigger, requestCount: status.requestCount, pendingOutcomeDrained: status.pendingOutcomeDrained, pendingOutcomeQuarantined: status.pendingOutcomeQuarantined, journalRetention: status.journalRetention, archiveRetention: status.archiveRetention, ledgerRecovery: status.ledgerRecovery, error, lease: status.lease, fencingToken: status.lease.fencingToken }, String(input.journalFile || REFRESH_JOURNAL_FILE));
    if (acquired.handle)
        releaseModelCapabilityRefreshLease(acquired.handle, error ? "failed" : "completed");
    return status;
}
function readModelCapabilityRefreshStatus() {
    try {
        return JSON.parse(fs.readFileSync(REFRESH_STATUS_FILE, "utf-8"));
    }
    catch {
        return { schema: "ccm-model-capability-refresh-status-v1", success: true, skipped: true, reason: "not_run", requestCount: 0, lease: null };
    }
}
function readModelCapabilityDowngradeAlerts(limit = 50) {
    try {
        if (!fs.existsSync(DOWNGRADE_JOURNAL_FILE))
            return [];
        return fs.readFileSync(DOWNGRADE_JOURNAL_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-Math.max(1, limit)).map(line => JSON.parse(line));
    }
    catch {
        return [];
    }
}
function pruneModelCapabilityDowngradeAlerts(input = {}) {
    const provider = clean(input.provider);
    const providerPrefix = clean(input.providerPrefix || input.provider_prefix);
    if (!provider && !providerPrefix)
        throw new Error("清理容量降级告警必须指定 provider 或 providerPrefix");
    const before = readModelCapabilityDowngradeAlerts(10_000);
    const keep = before.filter((alert) => {
        const alertProvider = clean(alert.provider);
        const matches = provider ? alertProvider === provider : alertProvider.startsWith(providerPrefix);
        return !matches;
    });
    const removed = before.length - keep.length;
    if (!removed)
        return { removed: 0, remaining: before.length };
    fs.mkdirSync(path.dirname(DOWNGRADE_JOURNAL_FILE), { recursive: true });
    const temp = `${DOWNGRADE_JOURNAL_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, keep.length ? `${keep.map((alert) => JSON.stringify(alert)).join("\n")}\n` : "", "utf-8");
    fs.renameSync(temp, DOWNGRADE_JOURNAL_FILE);
    return { removed, remaining: keep.length };
}
let refreshScheduler = null;
function startModelCapabilityRefreshScheduler(intervalMs = 60 * 60 * 1000) {
    if (refreshScheduler)
        return { started: false, reason: "already_running" };
    runModelCapabilityRefreshMaintenance({ trigger: "startup" });
    refreshScheduler = setInterval(() => {
        try {
            runModelCapabilityRefreshMaintenance({ trigger: "interval" });
        }
        catch { }
    }, Math.max(60_000, intervalMs));
    refreshScheduler.unref?.();
    return { started: true, intervalMs: Math.max(60_000, intervalMs), file: REFRESH_QUEUE_FILE };
}
function stopModelCapabilityRefreshScheduler() {
    if (!refreshScheduler)
        return false;
    clearInterval(refreshScheduler);
    refreshScheduler = null;
    return true;
}
function runModelCapabilityCacheSelfTest() {
    const now = new Date("2026-07-12T00:00:00.000Z");
    const explicit = resolveTrustedModelContextCapacity({ provider: "anthropic", model: "verified-model", now, providerCapability: { source: "explicit_provider_capability", contextWindow: 516_000, maxOutputTokens: 64_000 } });
    const unverifiedNative = resolveTrustedModelContextCapacity({ provider: "codex", model: "unknown", now, nativeExecutorReceipt: { source: "native_executor_receipt", verified: false, contextWindow: 1_000_000 } });
    const expired = resolveTrustedModelContextCapacity({ provider: "cursor", model: "stale", now, userSetting: { source: "user_setting", contextWindow: 1_000_000, checkedAt: "2025-01-01T00:00:00.000Z", expiresAt: "2025-02-01T00:00:00.000Z" } });
    return {
        pass: explicit.contextWindow === 516_000
            && explicit.source === "explicit_provider_capability"
            && unverifiedNative.contextWindow === exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS
            && unverifiedNative.conservativeFallback === true
            && expired.contextWindow === exports.CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
        checks: {
            explicitProviderWins: explicit.contextWindow === 516_000 && explicit.source === "explicit_provider_capability",
            unverifiedNativeRejected: unverifiedNative.conservativeFallback === true,
            expiredSettingFallsBack: expired.conservativeFallback === true,
            fallbackMatchesCcDefault: expired.autoCompactThreshold === 167_000,
        },
    };
}
//# sourceMappingURL=model-capability-cache.js.map