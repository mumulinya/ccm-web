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
exports.groupMemoryCompactionHooks = exports.GROUP_COMPACTION_HOOK_LEDGER_DIR = void 0;
exports.cleanHookLedgerGroupId = cleanHookLedgerGroupId;
exports.exactHookLedgerSessionId = exactHookLedgerSessionId;
exports.getGroupMemoryCompactionHookLedgerFile = getGroupMemoryCompactionHookLedgerFile;
exports.emptyHookLedger = emptyHookLedger;
exports.readHookLedgerFile = readHookLedgerFile;
exports.writeHookLedgerFile = writeHookLedgerFile;
exports.hookResultSummary = hookResultSummary;
exports.normalizeHookLedgerEntry = normalizeHookLedgerEntry;
exports.buildHookLedgerStats = buildHookLedgerStats;
exports.appendGroupMemoryCompactionHookLedgerEntries = appendGroupMemoryCompactionHookLedgerEntries;
exports.readGroupMemoryCompactionHookLedger = readGroupMemoryCompactionHookLedger;
exports.registerGroupMemoryCompactionHook = registerGroupMemoryCompactionHook;
exports.runGroupMemoryCompactionHooks = runGroupMemoryCompactionHooks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_projections_1 = require("./group-compaction-projections");
exports.GROUP_COMPACTION_HOOK_LEDGER_DIR = path.join(utils_1.CCM_DIR, "group-memory-compaction-hooks");
exports.groupMemoryCompactionHooks = {
    pre: new Set(),
    post: new Set(),
};
function cleanHookLedgerGroupId(groupId) {
    return String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-");
}
function exactHookLedgerSessionId(groupSessionId) {
    const id = String(groupSessionId || "").trim();
    return id.startsWith("gcs_") ? id : "";
}
function getGroupMemoryCompactionHookLedgerFile(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = exactHookLedgerSessionId(groupSessionId);
    if (!id || !sessionId)
        throw new Error("exact_group_session_required_for_compaction_hook_ledger");
    return path.join(exports.GROUP_COMPACTION_HOOK_LEDGER_DIR, cleanHookLedgerGroupId(id), `${cleanHookLedgerGroupId(sessionId)}.json`);
}
function emptyHookLedger(groupId = "", groupSessionId = "", file = "", scopeIssues = []) {
    const sessionId = exactHookLedgerSessionId(groupSessionId);
    return {
        schema: "ccm-group-memory-compaction-hook-ledger-v2",
        version: group_compaction_receipts_1.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
        groupId: String(groupId || ""),
        groupSessionId: sessionId,
        scopeId: sessionId ? `${String(groupId || "")}::${sessionId}` : "",
        scopeValid: scopeIssues.length === 0 && !!String(groupId || "") && !!sessionId,
        scopeIssues,
        rejectedEntryCount: 0,
        entries: [],
        stats: {},
        updatedAt: "",
        file,
    };
}
function readHookLedgerFile(file, groupId = "", groupSessionId = "") {
    const sessionId = exactHookLedgerSessionId(groupSessionId);
    try {
        if (fs.existsSync(file)) {
            const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
            const issues = [];
            if (parsed.schema !== "ccm-group-memory-compaction-hook-ledger-v2"
                || Number(parsed.version || 0) !== group_compaction_receipts_1.GROUP_COMPACTION_HOOK_LEDGER_VERSION)
                issues.push("hook_ledger_schema_invalid");
            if (String(parsed.groupId || "") !== String(groupId || ""))
                issues.push("hook_ledger_group_mismatch");
            if (String(parsed.groupSessionId || "") !== sessionId)
                issues.push("hook_ledger_group_session_mismatch");
            if (String(parsed.scopeId || "") !== `${String(groupId || "")}::${sessionId}`)
                issues.push("hook_ledger_scope_mismatch");
            const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
            const entries = rawEntries.filter((entry) => String(entry?.group_id || "") === String(groupId || "")
                && String(entry?.group_session_id || "") === sessionId);
            if (entries.length !== rawEntries.length)
                issues.push("hook_ledger_mixed_session_entries");
            return {
                schema: "ccm-group-memory-compaction-hook-ledger-v2",
                version: group_compaction_receipts_1.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
                groupId: String(groupId || ""),
                groupSessionId: sessionId,
                scopeId: `${String(groupId || "")}::${sessionId}`,
                scopeValid: issues.length === 0,
                scopeIssues: issues,
                rejectedEntryCount: rawEntries.length - entries.length,
                entries: issues.length ? [] : entries,
                stats: issues.length ? {} : buildHookLedgerStats(entries),
                updatedAt: String(parsed.updatedAt || ""),
                file,
            };
        }
    }
    catch {
        return emptyHookLedger(groupId, sessionId, file, ["hook_ledger_unreadable"]);
    }
    return emptyHookLedger(groupId, sessionId, file);
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
        text: (0, group_compaction_projections_1.compactText)(result.summary || result.note || result.message || "", 420),
    };
}
function normalizeHookLedgerEntry(raw = {}) {
    const cancelled = raw.cancelled === true;
    return {
        entry_id: String(raw.entry_id || raw.entryId || `hook_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`),
        hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
        group_id: String(raw.group_id || raw.groupId || ""),
        group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
        phase: String(raw.phase || ""),
        hook_index: Number(raw.hook_index ?? raw.hookIndex ?? 0),
        ok: raw.ok === true,
        cancelled,
        status: cancelled ? "cancelled" : raw.ok === true ? "ok" : "fail",
        duration_ms: Number(raw.duration_ms || raw.durationMs || 0),
        error: (0, group_compaction_projections_1.compactText)(raw.error || "", 500),
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
        pre: { total: 0, ok: 0, failed: 0, cancelled: 0, durationMs: 0 },
        post: { total: 0, ok: 0, failed: 0, cancelled: 0, durationMs: 0 },
        ok: 0,
        failed: 0,
        cancelled: 0,
        avgDurationMs: 0,
        latestAt: "",
    };
    for (const entry of entries) {
        const phase = entry.phase === "post" ? "post" : "pre";
        stats[phase].total++;
        stats[phase].durationMs += Number(entry.duration_ms || 0);
        if (entry.cancelled === true || entry.status === "cancelled") {
            stats.cancelled++;
            stats[phase].cancelled++;
        }
        else if (entry.ok) {
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
function appendGroupMemoryCompactionHookLedgerEntries(groupId, groupSessionId, entries = []) {
    const sessionId = exactHookLedgerSessionId(groupSessionId);
    if (!sessionId)
        throw new Error("exact_group_session_required_for_compaction_hook_ledger");
    const normalized = entries.map(normalizeHookLedgerEntry).filter(entry => entry.group_id || groupId);
    if (!normalized.length)
        return readGroupMemoryCompactionHookLedger(groupId, sessionId);
    if (normalized.some(entry => entry.group_session_id && entry.group_session_id !== sessionId)) {
        throw new Error("compaction_hook_ledger_cross_session_entry_rejected");
    }
    const file = getGroupMemoryCompactionHookLedgerFile(groupId, sessionId);
    const ledger = readHookLedgerFile(file, groupId, sessionId);
    if (ledger.scopeValid === false && fs.existsSync(file))
        throw new Error(`compaction_hook_ledger_scope_invalid:${ledger.scopeIssues.join(",")}`);
    const allEntries = [...(ledger.entries || []), ...normalized.map(entry => ({
            ...entry,
            group_id: entry.group_id || groupId,
            group_session_id: sessionId,
        }))].slice(-500);
    const next = {
        schema: "ccm-group-memory-compaction-hook-ledger-v2",
        version: group_compaction_receipts_1.GROUP_COMPACTION_HOOK_LEDGER_VERSION,
        groupId,
        groupSessionId: sessionId,
        scopeId: `${groupId}::${sessionId}`,
        scopeValid: true,
        scopeIssues: [],
        rejectedEntryCount: 0,
        entries: allEntries,
        stats: buildHookLedgerStats(allEntries),
        updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
    };
    writeHookLedgerFile(file, next);
    return { ...next, file };
}
function readGroupMemoryCompactionHookLedger(groupId, groupSessionId) {
    const id = String(groupId || "").trim();
    const sessionId = exactHookLedgerSessionId(groupSessionId);
    if (!id || !sessionId)
        return emptyHookLedger(id, sessionId, "", ["exact_group_session_required"]);
    const file = getGroupMemoryCompactionHookLedgerFile(id, sessionId);
    const ledger = readHookLedgerFile(file, id, sessionId);
    return {
        ...ledger,
        file,
        stats: buildHookLedgerStats(Array.isArray(ledger.entries) ? ledger.entries : []),
    };
}
function registerGroupMemoryCompactionHook(phase, hook) {
    if (phase !== "pre" && phase !== "post")
        throw new Error(`Unsupported group memory compaction hook phase: ${phase}`);
    exports.groupMemoryCompactionHooks[phase].add(hook);
    return () => exports.groupMemoryCompactionHooks[phase].delete(hook);
}
function throwIfCompactionHookAborted(signal) {
    if (!signal?.aborted)
        return;
    const reason = signal.reason;
    if (reason instanceof Error)
        throw reason;
    const error = new Error("group compaction cancelled while running hook");
    error.code = "GROUP_COMPACTION_CANCELLED";
    throw error;
}
async function runGroupMemoryCompactionHooks(phase, input) {
    const results = [];
    const hooks = [...exports.groupMemoryCompactionHooks[phase]];
    const hookRunId = String(input.hookRunId || input.hook_run_id || `gmch_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`);
    const ledgerEntries = [];
    const abortSignal = input.abortSignal || input.abort_signal || null;
    throwIfCompactionHookAborted(abortSignal);
    if (!hooks.length) {
        const entry = normalizeHookLedgerEntry({
            hook_run_id: hookRunId,
            group_id: input.groupId,
            group_session_id: input.groupSessionId,
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
            appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), String(input.groupSessionId || ""), [entry]);
        return [{ ok: true, result: { noHooksRegistered: true }, hookRunId, ledgerEntry: entry }];
    }
    for (let index = 0; index < hooks.length; index += 1) {
        throwIfCompactionHookAborted(abortSignal);
        const hook = hooks[index];
        const started = Date.now();
        const at = new Date(started).toISOString();
        try {
            const result = await hook({ ...input, phase, signal: abortSignal });
            throwIfCompactionHookAborted(abortSignal);
            const entry = normalizeHookLedgerEntry({
                hook_run_id: hookRunId,
                group_id: input.groupId,
                group_session_id: input.groupSessionId,
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
            const cancellation = abortSignal?.aborted === true;
            const entry = normalizeHookLedgerEntry({
                hook_run_id: hookRunId,
                group_id: input.groupId,
                group_session_id: input.groupSessionId,
                phase,
                hook_index: index,
                ok: false,
                cancelled: cancellation,
                duration_ms: Date.now() - started,
                error: (0, group_compaction_projections_1.compactText)(error?.message || error, 400),
                at,
                boundary_id: input.boundary?.id || "",
                summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
                summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
            });
            ledgerEntries.push(entry);
            if (cancellation) {
                if (input.groupId)
                    appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), String(input.groupSessionId || ""), ledgerEntries);
                throwIfCompactionHookAborted(abortSignal);
            }
            results.push({ ok: false, error: entry.error, hookRunId, ledgerEntry: entry });
        }
    }
    if (ledgerEntries.length && input.groupId)
        appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), String(input.groupSessionId || ""), ledgerEntries);
    return results;
}
//# sourceMappingURL=group-compaction-hooks.js.map