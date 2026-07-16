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
exports.LIVE_PROVIDER_MEMORY_VERSION_TRANSITION_LEDGER_SCHEMA = void 0;
exports.verifyLiveProviderMemoryVersionTransitionLedger = verifyLiveProviderMemoryVersionTransitionLedger;
exports.recordLiveProviderMemoryVersionTransitionEvidence = recordLiveProviderMemoryVersionTransitionEvidence;
exports.readLiveProviderMemoryVersionTransitionLedger = readLiveProviderMemoryVersionTransitionLedger;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const live_provider_memory_soak_report_store_1 = require("./live-provider-memory-soak-report-store");
exports.LIVE_PROVIDER_MEMORY_VERSION_TRANSITION_LEDGER_SCHEMA = "ccm-live-provider-memory-version-transition-ledger-v1";
const LEDGER_FILE = path.join(utils_1.CCM_DIR, "reliability", "live-provider-memory-version-transition-ledger.json");
const DEFAULT_MAX_ENTRIES = 500;
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
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}
function entryCore(entry) {
    const { entryChecksum: _entryChecksum, ...core } = entry || {};
    return core;
}
function ledgerCore(ledger) {
    const { ledgerChecksum: _ledgerChecksum, ...core } = ledger || {};
    return core;
}
function emptyLedger() {
    return {
        schema: exports.LIVE_PROVIDER_MEMORY_VERSION_TRANSITION_LEDGER_SCHEMA,
        version: 1,
        generation: 0,
        updatedAt: "",
        chainAnchorChecksum: "",
        droppedEntryCount: 0,
        entries: [],
    };
}
function sealLedger(ledger) {
    const core = ledgerCore(ledger);
    return { ...core, ledgerChecksum: digest(core) };
}
function verifyLiveProviderMemoryVersionTransitionLedger(ledger) {
    const issues = [];
    if (!ledger || ledger.schema !== exports.LIVE_PROVIDER_MEMORY_VERSION_TRANSITION_LEDGER_SCHEMA || Number(ledger.version || 0) !== 1)
        issues.push("transition_ledger_schema_invalid");
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    let previous = String(ledger?.chainAnchorChecksum || "");
    for (const entry of entries) {
        if (String(entry?.previousEntryChecksum || "") !== previous)
            issues.push("transition_entry_chain_invalid");
        const expected = digest(entryCore(entry));
        if (String(entry?.entryChecksum || "") !== expected)
            issues.push("transition_entry_checksum_invalid");
        previous = String(entry?.entryChecksum || expected);
    }
    const expectedLedgerChecksum = digest(ledgerCore(ledger));
    if (String(ledger?.ledgerChecksum || "") !== expectedLedgerChecksum)
        issues.push("transition_ledger_checksum_invalid");
    return {
        valid: issues.length === 0,
        issues: [...new Set(issues)],
        expectedLedgerChecksum,
        headChecksum: previous,
        entryCount: entries.length,
    };
}
function loadLedger() {
    const ledger = (0, atomic_json_file_1.readJsonWithBackup)(LEDGER_FILE, null);
    if (!ledger)
        return { ledger: sealLedger(emptyLedger()), present: false, verification: { valid: true, issues: [], headChecksum: "", entryCount: 0 } };
    return { ledger, present: true, verification: verifyLiveProviderMemoryVersionTransitionLedger(ledger) };
}
function compactComparison(comparison) {
    return {
        transitionId: String(comparison?.transitionId || ""),
        transitionIndex: Number(comparison?.transitionIndex || 0),
        transitionKind: String(comparison?.transitionKind || ""),
        fromVersionKey: String(comparison?.fromVersionKey || ""),
        toVersionKey: String(comparison?.toVersionKey || ""),
        observedAt: String(comparison?.observedAt || ""),
        status: String(comparison?.status || ""),
        memoryContinuityVerified: comparison?.memoryContinuityVerified === true,
        sufficientEvidence: comparison?.sufficientEvidence === true,
        regressionDetected: comparison?.regressionDetected === true,
        reasons: Array.isArray(comparison?.reasons) ? comparison.reasons.map(String).slice(0, 12) : [],
        from: comparison?.from || {},
        to: comparison?.to || {},
        deltas: comparison?.deltas || {},
    };
}
function recordLiveProviderMemoryVersionTransitionEvidence(report, options = {}) {
    const verification = (0, live_provider_memory_soak_report_store_1.verifyLiveProviderMemorySoakReport)(report, "endurance");
    if (!verification.valid)
        throw new Error("version transition evidence requires a valid endurance report");
    const comparisons = Array.isArray(report?.providerVersionTrend?.comparisons) ? report.providerVersionTrend.comparisons : [];
    return (0, atomic_json_file_1.withFileLock)(LEDGER_FILE, () => {
        const loaded = loadLedger();
        if (loaded.present && !loaded.verification.valid)
            throw new Error(`version transition ledger invalid:${loaded.verification.issues.join(",")}`);
        const current = loaded.ledger;
        const entries = [...(Array.isArray(current.entries) ? current.entries : [])];
        let headChecksum = String(loaded.verification.headChecksum || current.chainAnchorChecksum || "");
        let appendedCount = 0;
        for (const raw of comparisons) {
            const comparison = compactComparison(raw);
            if (!/^[a-f0-9]{64}$/.test(comparison.transitionId) || !/^[a-f0-9]{64}$/.test(comparison.fromVersionKey) || !/^[a-f0-9]{64}$/.test(comparison.toVersionKey))
                continue;
            const evidenceChecksum = digest(comparison);
            if (entries.some(entry => entry.transitionId === comparison.transitionId && entry.evidenceChecksum === evidenceChecksum))
                continue;
            const core = {
                schema: "ccm-live-provider-memory-version-transition-entry-v1",
                version: 1,
                sequence: Number(current.droppedEntryCount || 0) + entries.length + 1,
                recordedAt: new Date(Number(options.nowMs ?? Date.now())).toISOString(),
                previousEntryChecksum: headChecksum,
                enduranceReportChecksum: verification.reportChecksum,
                sourceSetChecksum: String(report?.sourceSetChecksum || ""),
                evidenceChecksum,
                ...comparison,
            };
            const entry = { ...core, entryChecksum: digest(core) };
            entries.push(entry);
            headChecksum = entry.entryChecksum;
            appendedCount += 1;
        }
        const maximumEntries = Math.max(20, Number(options.maximumEntries ?? options.maximum_entries ?? DEFAULT_MAX_ENTRIES));
        let chainAnchorChecksum = String(current.chainAnchorChecksum || "");
        let droppedEntryCount = Number(current.droppedEntryCount || 0);
        if (entries.length > maximumEntries) {
            const removeCount = entries.length - maximumEntries;
            chainAnchorChecksum = entries[removeCount - 1].entryChecksum;
            entries.splice(0, removeCount);
            droppedEntryCount += removeCount;
        }
        const next = sealLedger({
            schema: exports.LIVE_PROVIDER_MEMORY_VERSION_TRANSITION_LEDGER_SCHEMA,
            version: 1,
            generation: Number(current.generation || 0) + (appendedCount > 0 ? 1 : 0),
            updatedAt: appendedCount > 0 ? new Date(Number(options.nowMs ?? Date.now())).toISOString() : String(current.updatedAt || ""),
            chainAnchorChecksum,
            droppedEntryCount,
            entries,
        });
        if (appendedCount > 0 || !loaded.present)
            (0, atomic_json_file_1.writeJsonAtomic)(LEDGER_FILE, next);
        return { ...readLiveProviderMemoryVersionTransitionLedger(), appendedCount };
    });
}
function readLiveProviderMemoryVersionTransitionLedger() {
    const loaded = loadLedger();
    const ledger = loaded.ledger;
    const verification = loaded.present ? loaded.verification : verifyLiveProviderMemoryVersionTransitionLedger(ledger);
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const latestByTransition = new Map();
    for (const entry of entries)
        latestByTransition.set(String(entry.transitionId || ""), entry);
    const latest = [...latestByTransition.values()];
    return {
        schema: "ccm-live-provider-memory-version-transition-inventory-v1",
        generatedAt: new Date().toISOString(),
        file: LEDGER_FILE,
        present: loaded.present,
        valid: verification.valid,
        issues: verification.issues,
        generation: Number(ledger.generation || 0),
        entryCount: entries.length,
        transitionCount: latest.length,
        verifiedCount: latest.filter(entry => entry.status === "verified").length,
        degradedCount: latest.filter(entry => entry.status === "degraded").length,
        insufficientCount: latest.filter(entry => entry.status === "insufficient_evidence").length,
        rollbackCount: latest.filter(entry => entry.transitionKind === "reappearance").length,
        droppedEntryCount: Number(ledger.droppedEntryCount || 0),
        headChecksum: verification.headChecksum,
        ledgerChecksum: String(ledger.ledgerChecksum || ""),
        referencedEnduranceReportChecksums: [...new Set(latest.map(entry => String(entry.enduranceReportChecksum || "")).filter(Boolean))],
        entries: entries.slice(-120).reverse(),
    };
}
//# sourceMappingURL=live-provider-memory-version-transition-ledger.js.map