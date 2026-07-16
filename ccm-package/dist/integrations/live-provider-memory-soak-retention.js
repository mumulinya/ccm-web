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
exports.LIVE_PROVIDER_MEMORY_SOAK_RETENTION_SCHEMA = void 0;
exports.buildLiveProviderMemorySoakRetentionInventory = buildLiveProviderMemorySoakRetentionInventory;
exports.reconcileLiveProviderMemorySoakReports = reconcileLiveProviderMemorySoakReports;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const live_provider_memory_soak_report_store_1 = require("./live-provider-memory-soak-report-store");
const live_provider_memory_wave_approval_1 = require("./live-provider-memory-wave-approval");
const live_provider_memory_version_transition_ledger_1 = require("./live-provider-memory-version-transition-ledger");
exports.LIVE_PROVIDER_MEMORY_SOAK_RETENTION_SCHEMA = "ccm-live-provider-memory-soak-retention-v1";
const SINGLE_DIR = live_provider_memory_soak_report_store_1.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR;
const MULTI_DIR = live_provider_memory_soak_report_store_1.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR;
const AUDIT_FILE = path.join(utils_1.CCM_DIR, "reliability", "live-provider-memory-soak-retention-audit.jsonl");
const DEFAULT_SINGLE_RETENTION_DAYS = 30;
const DEFAULT_MULTI_RETENTION_DAYS = 30;
const DEFAULT_FLEET_RETENTION_DAYS = 90;
const DEFAULT_ENDURANCE_RETENTION_DAYS = 90;
const DEFAULT_GRACE_HOURS = 1;
const DEFAULT_MAX_SINGLE_REPORTS = 500;
const DEFAULT_MAX_MULTI_REPORTS = 200;
const DEFAULT_MAX_FLEET_REPORTS = 100;
const DEFAULT_MAX_ENDURANCE_REPORTS = 100;
const DEFAULT_MIN_SINGLE_REPORTS = 20;
const DEFAULT_MIN_MULTI_REPORTS = 10;
const DEFAULT_MIN_FLEET_REPORTS = 5;
const DEFAULT_MIN_ENDURANCE_REPORTS = 5;
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
function reportCore(report) {
    const { reportChecksum: _reportChecksum, reportFile: _reportFile, ...unsigned } = report || {};
    return unsigned;
}
function reportKind(report) {
    return (0, live_provider_memory_soak_report_store_1.liveProviderMemorySoakReportKind)(report);
}
function pathInside(file, root) {
    const relative = path.relative(path.resolve(root), path.resolve(file));
    return !!relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function scanDirectory(directory, allowedKinds, nowMs) {
    const rows = [];
    const unexpected = [];
    try {
        if (!fs.existsSync(directory))
            return { rows, unexpected };
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (!entry.isFile() || !entry.name.endsWith(".json")) {
                unexpected.push({ file, reason: "unexpected_report_entry" });
                continue;
            }
            try {
                const report = JSON.parse(fs.readFileSync(file, "utf8"));
                const kind = reportKind(report);
                const verification = (0, live_provider_memory_soak_report_store_1.verifyLiveProviderMemorySoakReport)(report);
                const reportChecksum = verification.reportChecksum;
                const checksumValid = verification.checksumValid;
                const stat = fs.statSync(file);
                const generatedMs = Date.parse(String(report?.generatedAt || ""));
                const effectiveMs = Number.isFinite(generatedMs) ? generatedMs : stat.mtimeMs;
                rows.push({
                    kind,
                    file,
                    name: entry.name,
                    report,
                    reportChecksum,
                    checksumValid,
                    valid: allowedKinds.includes(kind) && checksumValid,
                    generatedAt: Number.isFinite(generatedMs) ? new Date(generatedMs).toISOString() : "",
                    mtimeMs: stat.mtimeMs,
                    effectiveMs,
                    ageHours: Math.max(0, (nowMs - effectiveMs) / 3_600_000),
                    issues: [...(!allowedKinds.includes(kind) ? ["report_schema_invalid"] : []), ...(!checksumValid ? ["report_checksum_invalid"] : [])],
                });
            }
            catch (error) {
                let mtimeMs = 0;
                try {
                    mtimeMs = fs.statSync(file).mtimeMs;
                }
                catch { }
                rows.push({ kind: "unknown", file, name: entry.name, report: null, reportChecksum: "", checksumValid: false, valid: false, generatedAt: "", mtimeMs, effectiveMs: mtimeMs, ageHours: Math.max(0, (nowMs - mtimeMs) / 3_600_000), issues: ["report_json_invalid", String(error?.code || "parse_error")] });
            }
        }
    }
    catch (error) {
        unexpected.push({ file: directory, reason: error?.message || String(error) });
    }
    return { rows, unexpected };
}
function classifyCandidates(rows, policy, protectedChecksums, referenceLabel, referenceLabels = new Map()) {
    const valid = rows.filter(row => row.valid).sort((left, right) => right.effectiveMs - left.effectiveMs);
    for (let index = 0; index < valid.length; index += 1) {
        const row = valid[index];
        const referenced = protectedChecksums.has(row.reportChecksum);
        const reasons = [];
        if (!referenced && row.ageHours >= policy.graceHours && index >= policy.minimumRetained) {
            if (row.ageHours >= policy.retentionDays * 24)
                reasons.push("retention_expired");
            if (index >= policy.maximumReports)
                reasons.push("report_count_overflow");
        }
        row.referenced = referenced;
        row.protectedBy = referenced ? (referenceLabels.get(row.reportChecksum) || referenceLabel) : index < policy.minimumRetained ? "minimum_retained" : row.ageHours < policy.graceHours ? "fresh_grace" : "policy_window";
        row.candidateReasons = reasons;
        row.prunable = reasons.length > 0;
    }
    for (const row of rows.filter(row => !row.valid)) {
        row.referenced = false;
        row.protectedBy = "invalid_fail_closed";
        row.candidateReasons = [];
        row.prunable = false;
    }
    return valid;
}
function policyFromOptions(options = {}) {
    const minimum = (value, fallback) => Math.max(0, Number(value ?? fallback));
    const maximum = (value, fallback, floor) => Math.max(floor, Number(value ?? fallback));
    const graceHours = Math.max(0, Number(options.graceHours ?? options.grace_hours ?? DEFAULT_GRACE_HOURS));
    const singleMinimum = minimum(options.minimumSingleReports ?? options.minimum_single_reports, DEFAULT_MIN_SINGLE_REPORTS);
    const multiMinimum = minimum(options.minimumMultiReports ?? options.minimum_multi_reports, DEFAULT_MIN_MULTI_REPORTS);
    const fleetMinimum = minimum(options.minimumFleetReports ?? options.minimum_fleet_reports, DEFAULT_MIN_FLEET_REPORTS);
    const enduranceMinimum = minimum(options.minimumEnduranceReports ?? options.minimum_endurance_reports, DEFAULT_MIN_ENDURANCE_REPORTS);
    return {
        graceHours,
        single: { retentionDays: Math.max(1, Number(options.singleRetentionDays ?? options.single_retention_days ?? DEFAULT_SINGLE_RETENTION_DAYS)), maximumReports: maximum(options.maximumSingleReports ?? options.maximum_single_reports, DEFAULT_MAX_SINGLE_REPORTS, singleMinimum), minimumRetained: singleMinimum, graceHours },
        multi: { retentionDays: Math.max(1, Number(options.multiRetentionDays ?? options.multi_retention_days ?? DEFAULT_MULTI_RETENTION_DAYS)), maximumReports: maximum(options.maximumMultiReports ?? options.maximum_multi_reports, DEFAULT_MAX_MULTI_REPORTS, multiMinimum), minimumRetained: multiMinimum, graceHours },
        fleet: { retentionDays: Math.max(1, Number(options.fleetRetentionDays ?? options.fleet_retention_days ?? DEFAULT_FLEET_RETENTION_DAYS)), maximumReports: maximum(options.maximumFleetReports ?? options.maximum_fleet_reports, DEFAULT_MAX_FLEET_REPORTS, fleetMinimum), minimumRetained: fleetMinimum, graceHours },
        endurance: { retentionDays: Math.max(1, Number(options.enduranceRetentionDays ?? options.endurance_retention_days ?? DEFAULT_ENDURANCE_RETENTION_DAYS)), maximumReports: maximum(options.maximumEnduranceReports ?? options.maximum_endurance_reports, DEFAULT_MAX_ENDURANCE_REPORTS, enduranceMinimum), minimumRetained: enduranceMinimum, graceHours },
    };
}
function compactRow(row) {
    return {
        kind: row.kind,
        file: row.file,
        name: row.name,
        reportChecksum: row.reportChecksum,
        valid: row.valid === true,
        checksumValid: row.checksumValid === true,
        generatedAt: row.generatedAt,
        ageHours: Math.round(Number(row.ageHours || 0) * 100) / 100,
        referenced: row.referenced === true,
        protectedBy: String(row.protectedBy || ""),
        prunable: row.prunable === true,
        candidateReasons: row.candidateReasons || [],
        issues: row.issues || [],
    };
}
function buildLiveProviderMemorySoakRetentionInventory(options = {}) {
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const policy = policyFromOptions(options);
    const approvalInventory = (0, live_provider_memory_wave_approval_1.reconcileLiveProviderMemoryWaveApprovals)({ nowMs });
    const approvalEnduranceReferences = new Set(approvalInventory.referencedEnduranceReportChecksums || []);
    const approvalMultiReferences = new Set(approvalInventory.referencedMultiReportChecksums || []);
    const transitionInventory = (0, live_provider_memory_version_transition_ledger_1.readLiveProviderMemoryVersionTransitionLedger)();
    const singleScan = scanDirectory(SINGLE_DIR, ["single"], nowMs);
    const multiScan = scanDirectory(MULTI_DIR, ["multi", "fleet", "endurance"], nowMs);
    const fleetRows = multiScan.rows.filter(row => row.kind === "fleet" || !row.valid && row.name.startsWith("fleet-"));
    const enduranceRows = multiScan.rows.filter(row => row.kind === "endurance" || !row.valid && row.name.startsWith("endurance-"));
    const multiRows = multiScan.rows.filter(row => row.kind === "multi" || !row.valid && !row.name.startsWith("fleet-") && !row.name.startsWith("endurance-"));
    const retainedFleet = classifyCandidates(fleetRows, policy.fleet, new Set(), "").filter(row => !row.prunable);
    const transitionEnduranceReferences = new Set(transitionInventory.valid ? transitionInventory.referencedEnduranceReportChecksums || [] : enduranceRows.filter(row => row.valid).map(row => row.reportChecksum));
    const protectedEndurance = new Set([...approvalEnduranceReferences, ...transitionEnduranceReferences]);
    const enduranceReferenceLabels = new Map();
    for (const checksum of transitionEnduranceReferences)
        enduranceReferenceLabels.set(checksum, transitionInventory.valid ? "version_transition_ledger" : "invalid_transition_ledger_fail_closed");
    for (const checksum of approvalEnduranceReferences)
        enduranceReferenceLabels.set(checksum, "approval_receipt");
    const retainedEndurance = classifyCandidates(enduranceRows, policy.endurance, protectedEndurance, "retained_reference", enduranceReferenceLabels).filter(row => !row.prunable);
    const referencedMulti = new Set();
    const multiReferenceLabels = new Map();
    for (const checksum of approvalMultiReferences) {
        referencedMulti.add(checksum);
        multiReferenceLabels.set(checksum, "approval_execution_receipt");
    }
    for (const row of retainedFleet)
        for (const group of Array.isArray(row.report?.groups) ? row.report.groups : [])
            if (group?.sourceReportChecksum) {
                const checksum = String(group.sourceReportChecksum);
                referencedMulti.add(checksum);
                if (!multiReferenceLabels.has(checksum))
                    multiReferenceLabels.set(checksum, "fleet_report");
            }
    for (const row of retainedEndurance)
        for (const wave of Array.isArray(row.report?.waves) ? row.report.waves : [])
            if (wave?.sourceReportChecksum) {
                const checksum = String(wave.sourceReportChecksum);
                referencedMulti.add(checksum);
                if (!multiReferenceLabels.has(checksum))
                    multiReferenceLabels.set(checksum, "endurance_report");
            }
    const retainedMulti = classifyCandidates(multiRows, policy.multi, referencedMulti, "aggregate_report", multiReferenceLabels).filter(row => !row.prunable);
    const referencedSingle = new Set();
    for (const row of retainedMulti)
        for (const group of Array.isArray(row.report?.groups) ? row.report.groups : [])
            if (group?.childReportChecksum)
                referencedSingle.add(String(group.childReportChecksum));
    classifyCandidates(singleScan.rows, policy.single, referencedSingle, "multi_group_report");
    const allRows = [...singleScan.rows, ...multiRows, ...fleetRows, ...enduranceRows];
    const candidates = allRows.filter(row => row.prunable);
    return {
        schema: exports.LIVE_PROVIDER_MEMORY_SOAK_RETENTION_SCHEMA,
        generatedAt: new Date(nowMs).toISOString(),
        directories: { single: SINGLE_DIR, multi: MULTI_DIR },
        coordination: {
            schema: "ccm-live-provider-memory-soak-report-coordination-v1",
            sharedReportSetLock: true,
            executeUsesSharedLock: true,
            coordinatedWriterKinds: ["single", "multi", "fleet", "endurance"],
            lockTargetChecksum: digest(live_provider_memory_soak_report_store_1.LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET),
        },
        policy,
        summary: {
            reportCount: allRows.length,
            singleReportCount: singleScan.rows.length,
            multiReportCount: multiRows.length,
            fleetReportCount: fleetRows.length,
            enduranceReportCount: enduranceRows.length,
            validCount: allRows.filter(row => row.valid).length,
            invalidCount: allRows.filter(row => !row.valid).length,
            referencedSingleCount: singleScan.rows.filter(row => row.referenced).length,
            referencedMultiCount: multiRows.filter(row => row.referenced).length,
            approvalReferencedEnduranceCount: enduranceRows.filter(row => row.referenced && row.protectedBy === "approval_receipt").length,
            approvalReferencedMultiCount: multiRows.filter(row => row.referenced && row.protectedBy === "approval_execution_receipt").length,
            transitionReferencedEnduranceCount: enduranceRows.filter(row => row.referenced && row.protectedBy === "version_transition_ledger").length,
            transitionLedgerValid: transitionInventory.valid === true,
            transitionLedgerInvalidFailClosed: transitionInventory.present === true && transitionInventory.valid !== true,
            retainedApprovalCount: Number(approvalInventory.count || 0),
            invalidApprovalCount: Number(approvalInventory.invalidCount || 0),
            prunableCount: candidates.length,
            retentionExpiredCount: candidates.filter(row => row.candidateReasons.includes("retention_expired")).length,
            overflowCount: candidates.filter(row => row.candidateReasons.includes("report_count_overflow")).length,
            unexpectedEntryCount: singleScan.unexpected.length + multiScan.unexpected.length,
        },
        rows: allRows.sort((left, right) => right.effectiveMs - left.effectiveMs).slice(0, 240).map(compactRow),
        prunableRows: candidates.map(compactRow),
        unexpectedEntries: [...singleScan.unexpected, ...multiScan.unexpected].slice(0, 80),
    };
}
function appendAudit(record) {
    fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
    fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
}
function reconcileLiveProviderMemorySoakReportsLocked(options = {}) {
    const dryRun = options.dryRun !== false && options.prune !== true;
    const inventory = buildLiveProviderMemorySoakRetentionInventory(options);
    const pruned = [];
    const skipped = [];
    if (!dryRun) {
        for (const candidate of inventory.prunableRows) {
            const root = candidate.kind === "single" ? SINGLE_DIR : MULTI_DIR;
            if (!pathInside(candidate.file, root)) {
                skipped.push({ ...candidate, reason: "report_path_outside_managed_root" });
                continue;
            }
            try {
                const current = JSON.parse(fs.readFileSync(candidate.file, "utf8"));
                const checksum = String(current?.reportChecksum || "");
                if (!checksum || checksum !== candidate.reportChecksum || checksum !== digest(reportCore(current)) || reportKind(current) !== candidate.kind) {
                    skipped.push({ ...candidate, reason: "report_changed_or_invalid_before_prune" });
                    continue;
                }
                fs.unlinkSync(candidate.file);
                pruned.push({ kind: candidate.kind, file: candidate.file, reportChecksum: candidate.reportChecksum, reasons: candidate.candidateReasons });
            }
            catch (error) {
                skipped.push({ ...candidate, reason: error?.message || String(error) });
            }
        }
    }
    const audit = {
        schema: "ccm-live-provider-memory-soak-retention-audit-v1",
        at: new Date().toISOString(),
        dryRun,
        candidateCount: inventory.prunableRows.length,
        prunedCount: pruned.length,
        skippedCount: skipped.length,
        reportSetLockHeld: !dryRun,
        candidateChecksum: digest(inventory.prunableRows.map((row) => [row.kind, row.reportChecksum, row.candidateReasons])),
        prunedChecksum: digest(pruned.map(row => [row.kind, row.reportChecksum, row.reasons])),
    };
    appendAudit(audit);
    return { ...inventory, dryRun, pruned, skipped, audit };
}
function reconcileLiveProviderMemorySoakReports(options = {}) {
    const dryRun = options.dryRun !== false && options.prune !== true;
    if (dryRun)
        return reconcileLiveProviderMemorySoakReportsLocked(options);
    return (0, live_provider_memory_soak_report_store_1.withLiveProviderMemorySoakReportSetLock)(() => reconcileLiveProviderMemorySoakReportsLocked(options), { timeoutMs: Math.max(1_000, Number(options.lockTimeoutMs || options.lock_timeout_ms || 60_000)) });
}
//# sourceMappingURL=live-provider-memory-soak-retention.js.map