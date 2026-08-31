"use strict";
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.getGroupTypedMemoryManifestSelectorShapeDir = getGroupTypedMemoryManifestSelectorShapeDir;
exports.getGroupTypedMemoryWriteShapeDir = getGroupTypedMemoryWriteShapeDir;
exports.getGroupTypedMemoryShapeTrendFile = getGroupTypedMemoryShapeTrendFile;
exports.getGroupTypedMemoryShapeTrendIncidentFile = getGroupTypedMemoryShapeTrendIncidentFile;
exports.groupTypedMemoryWriteShapeChecksum = groupTypedMemoryWriteShapeChecksum;
exports.verifyGroupTypedMemoryWriteShape = verifyGroupTypedMemoryWriteShape;
exports.recordGroupTypedMemoryWriteShape = recordGroupTypedMemoryWriteShape;
exports.summarizeGroupTypedMemoryWriteShapes = summarizeGroupTypedMemoryWriteShapes;
exports.groupTypedMemoryShapeTrendBucketChecksum = groupTypedMemoryShapeTrendBucketChecksum;
exports.groupTypedMemoryShapeTrendLedgerChecksum = groupTypedMemoryShapeTrendLedgerChecksum;
exports.groupTypedMemoryShapeTrendSummaryChecksum = groupTypedMemoryShapeTrendSummaryChecksum;
exports.groupTypedMemoryShapeTrendDate = groupTypedMemoryShapeTrendDate;
exports.emptyGroupTypedMemoryShapeTrendBucket = emptyGroupTypedMemoryShapeTrendBucket;
exports.emptyGroupTypedMemoryShapeTrendLedger = emptyGroupTypedMemoryShapeTrendLedger;
exports.groupTypedMemoryShapeTrendMetricsValid = groupTypedMemoryShapeTrendMetricsValid;
exports.verifyGroupTypedMemoryShapeTrendLedger = verifyGroupTypedMemoryShapeTrendLedger;
exports.readGroupTypedMemoryShapeTrendLedger = readGroupTypedMemoryShapeTrendLedger;
exports.normalizeGroupTypedMemoryShapeTrendContribution = normalizeGroupTypedMemoryShapeTrendContribution;
exports.applyGroupTypedMemoryShapeTrendContribution = applyGroupTypedMemoryShapeTrendContribution;
exports.rechainGroupTypedMemoryShapeTrendBuckets = rechainGroupTypedMemoryShapeTrendBuckets;
exports.recordGroupTypedMemoryShapeTrendContribution = recordGroupTypedMemoryShapeTrendContribution;
exports.summarizeGroupTypedMemoryShapeTrendBuckets = summarizeGroupTypedMemoryShapeTrendBuckets;
exports.verifyGroupTypedMemoryShapeTrendSummary = verifyGroupTypedMemoryShapeTrendSummary;
exports.summarizeGroupTypedMemoryShapeTrend = summarizeGroupTypedMemoryShapeTrend;
exports.groupTypedMemoryShapeTrendIncidentEventChecksum = groupTypedMemoryShapeTrendIncidentEventChecksum;
exports.groupTypedMemoryShapeTrendIncidentLedgerChecksum = groupTypedMemoryShapeTrendIncidentLedgerChecksum;
exports.groupTypedMemoryShapeTrendIncidentSummaryChecksum = groupTypedMemoryShapeTrendIncidentSummaryChecksum;
exports.groupTypedMemoryShapeTrendSignalState = groupTypedMemoryShapeTrendSignalState;
exports.emptyGroupTypedMemoryShapeTrendIncidentLedger = emptyGroupTypedMemoryShapeTrendIncidentLedger;
exports.replayGroupTypedMemoryShapeTrendIncidentEvents = replayGroupTypedMemoryShapeTrendIncidentEvents;
exports.verifyGroupTypedMemoryShapeTrendIncidentLedger = verifyGroupTypedMemoryShapeTrendIncidentLedger;
exports.readGroupTypedMemoryShapeTrendIncidentLedger = readGroupTypedMemoryShapeTrendIncidentLedger;
exports.appendGroupTypedMemoryShapeTrendIncidentEvent = appendGroupTypedMemoryShapeTrendIncidentEvent;
exports.compactGroupTypedMemoryShapeTrendIncidentEvents = compactGroupTypedMemoryShapeTrendIncidentEvents;
exports.commitGroupTypedMemoryShapeTrendIncidentLedger = commitGroupTypedMemoryShapeTrendIncidentLedger;
exports.syncGroupTypedMemoryShapeTrendIncident = syncGroupTypedMemoryShapeTrendIncident;
exports.verifyGroupTypedMemoryShapeTrendIncidentSummary = verifyGroupTypedMemoryShapeTrendIncidentSummary;
exports.summarizeGroupTypedMemoryShapeTrendIncidents = summarizeGroupTypedMemoryShapeTrendIncidents;
exports.acknowledgeGroupTypedMemoryShapeTrendIncident = acknowledgeGroupTypedMemoryShapeTrendIncident;
exports.groupTypedMemoryManifestSelectorShapeChecksum = groupTypedMemoryManifestSelectorShapeChecksum;
exports.verifyGroupTypedMemoryManifestSelectorShape = verifyGroupTypedMemoryManifestSelectorShape;
exports.recordGroupTypedMemoryManifestSelectorShape = recordGroupTypedMemoryManifestSelectorShape;
exports.summarizeGroupTypedMemoryManifestSelectorShapes = summarizeGroupTypedMemoryManifestSelectorShapes;
exports.groupTypedMemoryShapeDriftChecksum = groupTypedMemoryShapeDriftChecksum;
exports.summarizeGroupTypedMemoryShapeWindow = summarizeGroupTypedMemoryShapeWindow;
exports.groupTypedMemoryShapeMetricDelta = groupTypedMemoryShapeMetricDelta;
exports.verifyGroupTypedMemoryShapeDrift = verifyGroupTypedMemoryShapeDrift;
exports.buildGroupTypedMemoryShapeDrift = buildGroupTypedMemoryShapeDrift;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const typed_memory_shared_1 = require("./typed-memory-shared");
function getGroupTypedMemoryManifestSelectorShapeDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorShapeDir(scopeId);
}
function getGroupTypedMemoryWriteShapeDir(scopeId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(scopeId), typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_SHAPE_DIR);
}
function getGroupTypedMemoryShapeTrendFile(scopeId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(scopeId), typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_LEDGER);
}
function getGroupTypedMemoryShapeTrendIncidentFile(scopeId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(scopeId), typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_LEDGER);
}
function groupTypedMemoryWriteShapeChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.shapeFile;
    delete payload.valid;
    delete payload.recorded;
    delete payload.trendContribution;
    delete payload.trendContributionError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function verifyGroupTypedMemoryWriteShape(shape, expectedScopeId = "") {
    const beforeBytes = Number(shape?.beforeBytes || 0);
    const afterBytes = Number(shape?.afterBytes || 0);
    const beforeLines = Number(shape?.beforeLines || 0);
    const afterLines = Number(shape?.afterLines || 0);
    const inputBodyChars = Number(shape?.inputBodyChars || 0);
    const maxBodyChars = Number(shape?.maxBodyChars || 0);
    const checksumValid = !!shape && String(shape.checksum || "") === groupTypedMemoryWriteShapeChecksum(shape);
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(shape?.scopeId || ""))
        && (!expectedScopeId || String(shape?.scopeId || "") === expectedScopeId);
    const relPath = String(shape?.relPath || "");
    const operation = String(shape?.operation || "");
    const operationValid = operation === "create"
        ? shape.beforeExists === false && shape.changed === true
        : operation === "update"
            ? shape.beforeExists === true && shape.changed === true
            : operation === "noop" && shape.beforeExists === true && shape.changed === false;
    const valid = !!shape
        && shape.schema === "ccm-group-typed-memory-write-shape-v1"
        && Number(shape.version || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_SHAPE_VERSION
        && scopeValid
        && !!String(shape.eventId || "")
        && path.basename(relPath) === relPath
        && relPath.toLowerCase().endsWith(".md")
        && relPath.toLowerCase() !== typed_memory_shared_1.GROUP_TYPED_MEMORY_ENTRYPOINT.toLowerCase()
        && typed_memory_shared_1.VALID_TYPES.has(String(shape.memoryType || ""))
        && operationValid
        && beforeBytes >= 0
        && afterBytes > 0
        && Number(shape.deltaBytes || 0) === afterBytes - beforeBytes
        && beforeLines >= 0
        && afterLines > 0
        && Number(shape.deltaLines || 0) === afterLines - beforeLines
        && inputBodyChars >= 0
        && maxBodyChars > 0
        && shape.bodyTruncated === (inputBodyChars > maxBodyChars)
        && shape.nearBodyLimit === (inputBodyChars >= maxBodyChars * 0.9)
        && !!String(shape.documentChecksumAfter || "")
        && shape.bodyFree === true
        && Number.isFinite(Date.parse(String(shape.recordedAt || "")))
        && checksumValid;
    return { valid, checksumValid, scopeValid, operationValid, beforeBytes, afterBytes, inputBodyChars, maxBodyChars };
}
function recordGroupTypedMemoryWriteShape(scopeId, input = {}) {
    if (!(0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { recorded: false, reason: "exact_group_gcs_scope_required" };
    const beforeContent = String(input.beforeContent || input.before_content || "");
    const afterContent = String(input.afterContent || input.after_content || "");
    const beforeExists = input.beforeExists === true || input.before_exists === true;
    const changed = input.changed === true;
    const maxBodyChars = Math.max(1, Math.min(1_000_000, Number(input.maxBodyChars || input.max_body_chars || 12_000)));
    const inputBodyChars = String(input.inputBody || input.input_body || "").length;
    const recordedAt = String(input.recordedAt || input.recorded_at || (0, typed_memory_shared_1.now)());
    const relPath = String(input.relPath || input.rel_path || "");
    const operation = !beforeExists ? "create" : changed ? "update" : "noop";
    const core = {
        schema: "ccm-group-typed-memory-write-shape-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_SHAPE_VERSION,
        eventId: String(input.eventId || input.event_id || `mws_${(0, typed_memory_shared_1.checksum)([scopeId, relPath, recordedAt, crypto.randomBytes(8).toString("hex")], 24)}`),
        scopeId,
        relPath,
        memoryType: (0, typed_memory_shared_1.normalizeMemoryType)(input.memoryType || input.memory_type),
        operation,
        changed,
        beforeExists,
        beforeBytes: Buffer.byteLength(beforeContent, "utf-8"),
        afterBytes: Buffer.byteLength(afterContent, "utf-8"),
        deltaBytes: Buffer.byteLength(afterContent, "utf-8") - Buffer.byteLength(beforeContent, "utf-8"),
        beforeLines: (0, typed_memory_shared_1.groupTypedMemoryTextLineCount)(beforeContent),
        afterLines: (0, typed_memory_shared_1.groupTypedMemoryTextLineCount)(afterContent),
        deltaLines: (0, typed_memory_shared_1.groupTypedMemoryTextLineCount)(afterContent) - (0, typed_memory_shared_1.groupTypedMemoryTextLineCount)(beforeContent),
        inputBodyChars,
        maxBodyChars,
        bodyTruncated: inputBodyChars > maxBodyChars,
        nearBodyLimit: inputBodyChars >= maxBodyChars * 0.9,
        sourceChecksum: (0, typed_memory_shared_1.checksum)(String(input.source || ""), 24),
        documentChecksumBefore: beforeContent ? (0, typed_memory_shared_1.checksum)(beforeContent, 64) : "",
        documentChecksumAfter: (0, typed_memory_shared_1.checksum)(afterContent, 64),
        bodyFree: true,
        recordedAt,
    };
    const shape = { ...core, checksum: groupTypedMemoryWriteShapeChecksum(core) };
    if (!verifyGroupTypedMemoryWriteShape(shape, scopeId).valid)
        throw new Error("typed_memory_write_shape_invalid");
    if (input.recordShape === false || input.record_shape === false)
        return { ...shape, recorded: false };
    const dir = path.resolve(getGroupTypedMemoryWriteShapeDir(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.resolve(dir, `${(0, typed_memory_shared_1.safeSegment)(shape.eventId, "write-shape")}.json`);
    if (path.dirname(file).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_write_shape_path_invalid");
    (0, typed_memory_shared_1.writeTextAtomicRaw)(file, JSON.stringify(shape, null, 2));
    try {
        const files = fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".json"))
            .map(name => ({ file: path.resolve(dir, name), mtimeMs: fs.statSync(path.resolve(dir, name)).mtimeMs }))
            .filter(item => path.dirname(item.file).toLowerCase() === dir.toLowerCase())
            .sort((a, b) => b.mtimeMs - a.mtimeMs || b.file.localeCompare(a.file));
        for (const item of files.slice(typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_SHAPE_MAX_EVENTS)) {
            try {
                fs.unlinkSync(item.file);
            }
            catch { }
        }
    }
    catch { }
    let trendContribution = null;
    let trendContributionError = "";
    try {
        trendContribution = recordGroupTypedMemoryShapeTrendContribution(scopeId, {
            kind: "write",
            eventKey: shape.eventId,
            recordedAt: shape.recordedAt,
            metrics: {
                operation: shape.operation,
                changed: shape.changed,
                growthBytes: shape.deltaBytes,
                afterBytes: shape.afterBytes,
                nearBodyLimit: shape.nearBodyLimit,
                bodyTruncated: shape.bodyTruncated,
            },
        });
    }
    catch (error) {
        trendContributionError = (0, typed_memory_shared_1.compactText)(error?.message || error, 240);
    }
    return { ...shape, shapeFile: file, recorded: true, trendContribution, trendContributionError };
}
function summarizeGroupTypedMemoryWriteShapes(scopeId, options = {}) {
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync(getGroupTypedMemoryWriteShapeDir(scopeId)).filter(name => name.toLowerCase().endsWith(".json"))) {
            const file = path.join(getGroupTypedMemoryWriteShapeDir(scopeId), name);
            try {
                const shape = JSON.parse(fs.readFileSync(file, "utf-8"));
                rows.push({ ...shape, shapeFile: file, valid: verifyGroupTypedMemoryWriteShape(shape, scopeId).valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.eventId || "").localeCompare(String(a.eventId || "")));
    const validRows = rows.filter(row => row.valid === true);
    const invalidShapeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    const changedRows = validRows.filter(row => row.changed === true);
    return {
        schema: "ccm-group-typed-memory-write-shape-summary-v1",
        version: 1,
        scopeId,
        dir: getGroupTypedMemoryWriteShapeDir(scopeId),
        present: rows.length > 0 || unreadableCount > 0,
        valid: (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId) && invalidShapeCount === 0,
        shapeCount: rows.length + unreadableCount,
        validShapeCount: validRows.length,
        invalidShapeCount,
        createCount: validRows.filter(row => row.operation === "create").length,
        updateCount: validRows.filter(row => row.operation === "update").length,
        noopCount: validRows.filter(row => row.operation === "noop").length,
        changedCount: changedRows.length,
        bodyTruncatedCount: validRows.filter(row => row.bodyTruncated === true).length,
        nearBodyLimitCount: validRows.filter(row => row.nearBodyLimit === true).length,
        totalGrowthBytes: changedRows.reduce((sum, row) => sum + Number(row.deltaBytes || 0), 0),
        averageAfterBytes: validRows.length ? Number((validRows.reduce((sum, row) => sum + Number(row.afterBytes || 0), 0) / validRows.length).toFixed(3)) : 0,
        maxAfterBytes: validRows.reduce((max, row) => Math.max(max, Number(row.afterBytes || 0)), 0),
        latest: validRows[0] || null,
        rows: options.includeRows === true || options.include_rows === true ? validRows : undefined,
    };
}
function groupTypedMemoryShapeTrendBucketChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendLedgerChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.file;
    delete payload.present;
    delete payload.valid;
    delete payload.primaryValid;
    delete payload.recoveredFromBackup;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendSummaryChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendDate(value) {
    const ms = typeof value === "number" ? value : Date.parse(String(value || ""));
    return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
}
function emptyGroupTypedMemoryShapeTrendBucket(date) {
    return {
        date,
        sealed: false,
        sealedAt: "",
        selector: {
            runCount: 0,
            candidateTotal: 0,
            selectedTotal: 0,
            emptyCount: 0,
            selectedAgeWeightedDays: 0,
            selectedAgeDocumentCount: 0,
            freshCount: 0,
            staleCount: 0,
            candidateCapacityRunCount: 0,
            selectionCapacityRunCount: 0,
        },
        write: {
            eventCount: 0,
            changedCount: 0,
            createCount: 0,
            updateCount: 0,
            noopCount: 0,
            growthBytes: 0,
            afterBytesTotal: 0,
            maxAfterBytes: 0,
            nearBodyLimitCount: 0,
            truncatedBodyCount: 0,
        },
        consumption: {
            outcomeCount: 0,
            deliveredDocumentCount: 0,
            usedDocumentCount: 0,
            verifiedDocumentCount: 0,
            ignoredDocumentCount: 0,
            unreportedDocumentCount: 0,
            strongReceiptOutcomeCount: 0,
            unexpectedClaimCount: 0,
        },
        contributionKeys: [],
        previousBucketChecksum: "",
        updatedAt: "",
        checksum: "",
    };
}
function emptyGroupTypedMemoryShapeTrendLedger(scopeId) {
    const core = {
        schema: "ccm-group-typed-memory-shape-trend-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_VERSION,
        scopeId,
        bodyFree: true,
        retentionDays: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS,
        mutableDays: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS,
        maxKeysPerBucket: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET,
        generation: 0,
        headBucketChecksum: "",
        buckets: [],
        updatedAt: "",
    };
    return { ...core, checksum: groupTypedMemoryShapeTrendLedgerChecksum(core) };
}
function groupTypedMemoryShapeTrendMetricsValid(bucket) {
    const selector = bucket?.selector || {};
    const write = bucket?.write || {};
    const consumption = bucket?.consumption || {};
    const nonNegative = [
        selector.runCount, selector.candidateTotal, selector.selectedTotal, selector.emptyCount,
        selector.selectedAgeWeightedDays, selector.selectedAgeDocumentCount, selector.freshCount, selector.staleCount,
        selector.candidateCapacityRunCount, selector.selectionCapacityRunCount,
        write.eventCount, write.changedCount, write.createCount, write.updateCount, write.noopCount,
        write.afterBytesTotal, write.maxAfterBytes, write.nearBodyLimitCount, write.truncatedBodyCount,
        consumption.outcomeCount, consumption.deliveredDocumentCount, consumption.usedDocumentCount,
        consumption.verifiedDocumentCount, consumption.ignoredDocumentCount, consumption.unreportedDocumentCount,
        consumption.strongReceiptOutcomeCount, consumption.unexpectedClaimCount,
    ];
    return nonNegative.every(value => Number.isFinite(Number(value)) && Number(value) >= 0)
        && Number.isFinite(Number(write.growthBytes || 0))
        && Number(selector.selectedTotal || 0) <= Number(selector.candidateTotal || 0)
        && Number(selector.emptyCount || 0) <= Number(selector.runCount || 0)
        && Number(selector.candidateCapacityRunCount || 0) <= Number(selector.runCount || 0)
        && Number(selector.selectionCapacityRunCount || 0) <= Number(selector.runCount || 0)
        && Number(write.changedCount || 0) <= Number(write.eventCount || 0)
        && Number(write.createCount || 0) + Number(write.updateCount || 0) + Number(write.noopCount || 0) === Number(write.eventCount || 0)
        && Number(consumption.usedDocumentCount || 0) + Number(consumption.verifiedDocumentCount || 0)
            + Number(consumption.ignoredDocumentCount || 0) + Number(consumption.unreportedDocumentCount || 0)
            === Number(consumption.deliveredDocumentCount || 0)
        && Number(consumption.strongReceiptOutcomeCount || 0) <= Number(consumption.outcomeCount || 0);
}
function verifyGroupTypedMemoryShapeTrendLedger(ledger, expectedScopeId = "") {
    const buckets = Array.isArray(ledger?.buckets) ? ledger.buckets : [];
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(ledger?.scopeId || ""))
        && (!expectedScopeId || String(ledger?.scopeId || "") === expectedScopeId);
    let previousChecksum = "";
    let chainValid = true;
    let previousDate = "";
    const seenDates = new Set();
    for (const bucket of buckets) {
        const date = String(bucket?.date || "");
        const keys = Array.isArray(bucket?.contributionKeys) ? bucket.contributionKeys : [];
        const bucketValid = /^\d{4}-\d{2}-\d{2}$/.test(date)
            && (!previousDate || date > previousDate)
            && !seenDates.has(date)
            && String(bucket.previousBucketChecksum || "") === previousChecksum
            && String(bucket.checksum || "") === groupTypedMemoryShapeTrendBucketChecksum(bucket)
            && groupTypedMemoryShapeTrendMetricsValid(bucket)
            && keys.length <= typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET
            && new Set(keys).size === keys.length
            && keys.every((key) => typeof key === "string" && /^[a-f0-9]{32}$/.test(key))
            && (bucket.sealed !== true || keys.length === 0);
        if (!bucketValid)
            chainValid = false;
        previousChecksum = String(bucket?.checksum || "");
        previousDate = date;
        seenDates.add(date);
    }
    const checksumValid = !!ledger && String(ledger.checksum || "") === groupTypedMemoryShapeTrendLedgerChecksum(ledger);
    const valid = !!ledger
        && ledger.schema === "ccm-group-typed-memory-shape-trend-ledger-v1"
        && Number(ledger.version || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_VERSION
        && scopeValid
        && ledger.bodyFree === true
        && Number(ledger.retentionDays || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS
        && Number(ledger.mutableDays || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS
        && Number(ledger.maxKeysPerBucket || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET
        && buckets.length <= typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS
        && String(ledger.headBucketChecksum || "") === (buckets.length ? String(buckets[buckets.length - 1].checksum || "") : "")
        && chainValid
        && checksumValid;
    return { valid, checksumValid, scopeValid, chainValid, bucketCount: buckets.length };
}
function readGroupTypedMemoryShapeTrendLedger(scopeId) {
    const file = getGroupTypedMemoryShapeTrendFile(scopeId);
    let primary = null;
    let backup = null;
    try {
        primary = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    const primaryVerification = verifyGroupTypedMemoryShapeTrendLedger(primary, scopeId);
    if (primaryVerification.valid)
        return { ...primary, file, present: true, valid: true, primaryValid: true, recoveredFromBackup: false };
    try {
        backup = JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
    }
    catch { }
    const backupVerification = verifyGroupTypedMemoryShapeTrendLedger(backup, scopeId);
    if (backupVerification.valid)
        return { ...backup, file, present: true, valid: true, primaryValid: false, recoveredFromBackup: true };
    const present = fs.existsSync(file) || fs.existsSync(`${file}.bak`);
    if (present)
        return { ...(primary || backup || {}), file, present: true, valid: false, primaryValid: false, recoveredFromBackup: false };
    const empty = emptyGroupTypedMemoryShapeTrendLedger(scopeId);
    return { ...empty, file, present: false, valid: true, primaryValid: true, recoveredFromBackup: false };
}
function normalizeGroupTypedMemoryShapeTrendContribution(kind, input = {}) {
    const metrics = input.metrics || {};
    if (kind === "selector") {
        const selectedCount = Number(metrics.selectedCount || 0);
        const candidateCount = Number(metrics.candidateCount || 0);
        const selectedAgeAverage = Number(metrics.selectedAgeAverage ?? -1);
        return {
            candidateCount,
            selectedCount,
            emptyCount: selectedCount === 0 ? 1 : 0,
            selectedAgeWeightedDays: selectedCount > 0 && selectedAgeAverage >= 0 ? selectedAgeAverage * selectedCount : 0,
            selectedAgeDocumentCount: selectedCount,
            freshCount: Number(metrics.freshCount || 0),
            staleCount: Number(metrics.staleCount || 0),
            candidateCapacityRunCount: candidateCount >= typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES ? 1 : 0,
            selectionCapacityRunCount: selectedCount >= typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION ? 1 : 0,
        };
    }
    if (kind === "write") {
        const operation = String(metrics.operation || "");
        return {
            changedCount: metrics.changed === true ? 1 : 0,
            createCount: operation === "create" ? 1 : 0,
            updateCount: operation === "update" ? 1 : 0,
            noopCount: operation === "noop" ? 1 : 0,
            growthBytes: Number(metrics.growthBytes || 0),
            afterBytes: Number(metrics.afterBytes || 0),
            nearBodyLimitCount: metrics.nearBodyLimit === true ? 1 : 0,
            truncatedBodyCount: metrics.bodyTruncated === true ? 1 : 0,
        };
    }
    const documents = Array.isArray(metrics.documents) ? metrics.documents : [];
    return {
        deliveredDocumentCount: documents.length,
        usedDocumentCount: documents.filter((row) => row.usageState === "used").length,
        verifiedDocumentCount: documents.filter((row) => row.usageState === "verified").length,
        ignoredDocumentCount: documents.filter((row) => row.usageState === "ignored").length,
        unreportedDocumentCount: documents.filter((row) => row.usageState === "unreported").length,
        strongReceiptOutcomeCount: metrics.receiptBindingValid === true ? 1 : 0,
        unexpectedClaimCount: Number(metrics.unexpectedClaimCount || 0),
    };
}
function applyGroupTypedMemoryShapeTrendContribution(bucket, kind, metrics) {
    if (kind === "selector") {
        bucket.selector.runCount += 1;
        bucket.selector.candidateTotal += metrics.candidateCount;
        bucket.selector.selectedTotal += metrics.selectedCount;
        bucket.selector.emptyCount += metrics.emptyCount;
        bucket.selector.selectedAgeWeightedDays = Number((bucket.selector.selectedAgeWeightedDays + metrics.selectedAgeWeightedDays).toFixed(6));
        bucket.selector.selectedAgeDocumentCount += metrics.selectedAgeDocumentCount;
        bucket.selector.freshCount += metrics.freshCount;
        bucket.selector.staleCount += metrics.staleCount;
        bucket.selector.candidateCapacityRunCount += metrics.candidateCapacityRunCount;
        bucket.selector.selectionCapacityRunCount += metrics.selectionCapacityRunCount;
        return;
    }
    if (kind === "write") {
        bucket.write.eventCount += 1;
        bucket.write.changedCount += metrics.changedCount;
        bucket.write.createCount += metrics.createCount;
        bucket.write.updateCount += metrics.updateCount;
        bucket.write.noopCount += metrics.noopCount;
        bucket.write.growthBytes += metrics.growthBytes;
        bucket.write.afterBytesTotal += metrics.afterBytes;
        bucket.write.maxAfterBytes = Math.max(bucket.write.maxAfterBytes, metrics.afterBytes);
        bucket.write.nearBodyLimitCount += metrics.nearBodyLimitCount;
        bucket.write.truncatedBodyCount += metrics.truncatedBodyCount;
        return;
    }
    bucket.consumption.outcomeCount += 1;
    bucket.consumption.deliveredDocumentCount += metrics.deliveredDocumentCount;
    bucket.consumption.usedDocumentCount += metrics.usedDocumentCount;
    bucket.consumption.verifiedDocumentCount += metrics.verifiedDocumentCount;
    bucket.consumption.ignoredDocumentCount += metrics.ignoredDocumentCount;
    bucket.consumption.unreportedDocumentCount += metrics.unreportedDocumentCount;
    bucket.consumption.strongReceiptOutcomeCount += metrics.strongReceiptOutcomeCount;
    bucket.consumption.unexpectedClaimCount += metrics.unexpectedClaimCount;
}
function rechainGroupTypedMemoryShapeTrendBuckets(buckets) {
    let previousBucketChecksum = "";
    for (const bucket of buckets) {
        bucket.previousBucketChecksum = previousBucketChecksum;
        bucket.checksum = groupTypedMemoryShapeTrendBucketChecksum(bucket);
        previousBucketChecksum = bucket.checksum;
    }
    return previousBucketChecksum;
}
function recordGroupTypedMemoryShapeTrendContribution(scopeId, input = {}, options = {}) {
    if (!(0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { recorded: false, reason: "exact_group_gcs_scope_required" };
    const kind = String(input.kind || "");
    if (!["selector", "write", "consumption"].includes(kind))
        return { recorded: false, reason: "trend_contribution_kind_invalid" };
    const eventKey = String(input.eventKey || input.event_key || "");
    if (!eventKey)
        return { recorded: false, reason: "trend_contribution_key_required" };
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const recordedAt = String(input.recordedAt || input.recorded_at || new Date(nowMs).toISOString());
    const recordedMs = Date.parse(recordedAt);
    if (!Number.isFinite(recordedMs) || recordedMs > nowMs + 86_400_000)
        return { recorded: false, reason: "trend_contribution_time_invalid" };
    const bucketDate = groupTypedMemoryShapeTrendDate(recordedMs);
    const mutableCutoffDate = groupTypedMemoryShapeTrendDate(nowMs - (typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS - 1) * 86_400_000);
    const retentionCutoffDate = groupTypedMemoryShapeTrendDate(nowMs - (typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS - 1) * 86_400_000);
    if (!bucketDate || bucketDate < retentionCutoffDate)
        return { recorded: false, reason: "trend_contribution_outside_retention", bucketDate };
    if (bucketDate < mutableCutoffDate)
        return { recorded: false, reason: "trend_bucket_sealed", bucketDate };
    const metrics = normalizeGroupTypedMemoryShapeTrendContribution(kind, input);
    const contributionKey = (0, typed_memory_shared_1.checksum)([kind, eventKey], 32);
    const file = getGroupTypedMemoryShapeTrendFile(scopeId);
    const contribution = (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
        if (!current && (fs.existsSync(file) || fs.existsSync(`${file}.bak`)))
            throw new Error("typed_memory_shape_trend_ledger_unrecoverable");
        if (current && verifyGroupTypedMemoryShapeTrendLedger(current, scopeId).valid !== true)
            throw new Error("typed_memory_shape_trend_ledger_invalid");
        const ledger = current || emptyGroupTypedMemoryShapeTrendLedger(scopeId);
        let bucket = (ledger.buckets || []).find((row) => row.date === bucketDate);
        if (bucket?.sealed === true)
            return { recorded: false, reason: "trend_bucket_sealed", bucketDate, ledgerFile: file };
        if (!bucket) {
            bucket = emptyGroupTypedMemoryShapeTrendBucket(bucketDate);
            ledger.buckets.push(bucket);
        }
        if ((bucket.contributionKeys || []).includes(contributionKey))
            return { recorded: false, idempotent: true, reason: "already_recorded", bucketDate, ledgerFile: file };
        if ((bucket.contributionKeys || []).length >= typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET) {
            return { recorded: false, reason: "trend_bucket_key_capacity", bucketDate, ledgerFile: file };
        }
        applyGroupTypedMemoryShapeTrendContribution(bucket, kind, metrics);
        if (!groupTypedMemoryShapeTrendMetricsValid(bucket))
            throw new Error("typed_memory_shape_trend_contribution_invalid");
        bucket.contributionKeys.push(contributionKey);
        bucket.updatedAt = new Date(nowMs).toISOString();
        ledger.buckets = (ledger.buckets || [])
            .filter((row) => String(row.date || "") >= retentionCutoffDate)
            .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
        for (const row of ledger.buckets) {
            if (String(row.date || "") < mutableCutoffDate && row.sealed !== true) {
                row.sealed = true;
                row.sealedAt = new Date(nowMs).toISOString();
                row.contributionKeys = [];
            }
        }
        ledger.generation = Number(ledger.generation || 0) + 1;
        ledger.updatedAt = new Date(nowMs).toISOString();
        ledger.headBucketChecksum = rechainGroupTypedMemoryShapeTrendBuckets(ledger.buckets);
        ledger.checksum = groupTypedMemoryShapeTrendLedgerChecksum(ledger);
        if (!verifyGroupTypedMemoryShapeTrendLedger(ledger, scopeId).valid)
            throw new Error("typed_memory_shape_trend_ledger_write_invalid");
        (0, atomic_json_file_1.writeJsonAtomic)(file, ledger);
        return { recorded: true, idempotent: false, bucketDate, contributionKey, ledgerFile: file, generation: ledger.generation, ledgerChecksum: ledger.checksum };
    }, { timeoutMs: 5_000, retryMs: 10, staleMs: 60_000 });
    if (contribution?.recorded === true) {
        try {
            const trend = summarizeGroupTypedMemoryShapeTrend(scopeId, { nowMs });
            contribution.incidentTransition = syncGroupTypedMemoryShapeTrendIncident(scopeId, trend, { nowMs });
            contribution.incidentTransitionError = "";
        }
        catch (error) {
            contribution.incidentTransition = null;
            contribution.incidentTransitionError = (0, typed_memory_shared_1.compactText)(error?.message || error, 240);
        }
    }
    return contribution;
}
function summarizeGroupTypedMemoryShapeTrendBuckets(buckets) {
    const selector = buckets.reduce((acc, bucket) => {
        for (const key of Object.keys(acc))
            acc[key] += Number(bucket.selector?.[key] || 0);
        return acc;
    }, { runCount: 0, candidateTotal: 0, selectedTotal: 0, emptyCount: 0, selectedAgeWeightedDays: 0, selectedAgeDocumentCount: 0, freshCount: 0, staleCount: 0, candidateCapacityRunCount: 0, selectionCapacityRunCount: 0 });
    const write = buckets.reduce((acc, bucket) => {
        for (const key of ["eventCount", "changedCount", "createCount", "updateCount", "noopCount", "growthBytes", "afterBytesTotal", "nearBodyLimitCount", "truncatedBodyCount"])
            acc[key] += Number(bucket.write?.[key] || 0);
        acc.maxAfterBytes = Math.max(acc.maxAfterBytes, Number(bucket.write?.maxAfterBytes || 0));
        return acc;
    }, { eventCount: 0, changedCount: 0, createCount: 0, updateCount: 0, noopCount: 0, growthBytes: 0, afterBytesTotal: 0, maxAfterBytes: 0, nearBodyLimitCount: 0, truncatedBodyCount: 0 });
    const consumption = buckets.reduce((acc, bucket) => {
        for (const key of Object.keys(acc))
            acc[key] += Number(bucket.consumption?.[key] || 0);
        return acc;
    }, { outcomeCount: 0, deliveredDocumentCount: 0, usedDocumentCount: 0, verifiedDocumentCount: 0, ignoredDocumentCount: 0, unreportedDocumentCount: 0, strongReceiptOutcomeCount: 0, unexpectedClaimCount: 0 });
    const declaredDocumentCount = consumption.usedDocumentCount + consumption.verifiedDocumentCount + consumption.ignoredDocumentCount;
    return {
        selectorRunCount: selector.runCount,
        candidateTotal: selector.candidateTotal,
        selectedTotal: selector.selectedTotal,
        selectionRate: selector.candidateTotal ? Number((selector.selectedTotal / selector.candidateTotal).toFixed(6)) : null,
        emptySelectionCount: selector.emptyCount,
        emptySelectionRate: selector.runCount ? Number((selector.emptyCount / selector.runCount).toFixed(6)) : null,
        averageSelectedAgeDays: selector.selectedAgeDocumentCount ? Number((selector.selectedAgeWeightedDays / selector.selectedAgeDocumentCount).toFixed(6)) : -1,
        selectedStaleRate: selector.freshCount + selector.staleCount ? Number((selector.staleCount / (selector.freshCount + selector.staleCount)).toFixed(6)) : null,
        candidateCapacityRunCount: selector.candidateCapacityRunCount,
        selectionCapacityRunCount: selector.selectionCapacityRunCount,
        writeEventCount: write.eventCount,
        changedWriteCount: write.changedCount,
        writeGrowthBytes: write.growthBytes,
        averageWriteBytes: write.eventCount ? Number((write.afterBytesTotal / write.eventCount).toFixed(3)) : null,
        maxWriteBytes: write.maxAfterBytes,
        nearBodyLimitWriteCount: write.nearBodyLimitCount,
        truncatedBodyWriteCount: write.truncatedBodyCount,
        consumptionOutcomeCount: consumption.outcomeCount,
        deliveredDocumentCount: consumption.deliveredDocumentCount,
        declaredDocumentCount,
        usedDocumentCount: consumption.usedDocumentCount,
        verifiedDocumentCount: consumption.verifiedDocumentCount,
        ignoredDocumentCount: consumption.ignoredDocumentCount,
        unreportedDocumentCount: consumption.unreportedDocumentCount,
        receiptCoverageRate: consumption.deliveredDocumentCount ? Number(((consumption.deliveredDocumentCount - consumption.unreportedDocumentCount) / consumption.deliveredDocumentCount).toFixed(6)) : null,
        consumedUtilityRate: declaredDocumentCount ? Number(((consumption.usedDocumentCount + consumption.verifiedDocumentCount) / declaredDocumentCount).toFixed(6)) : null,
    };
}
function verifyGroupTypedMemoryShapeTrendSummary(summary, expectedScopeId = "") {
    const checksumValid = !!summary && String(summary.checksum || "") === groupTypedMemoryShapeTrendSummaryChecksum(summary);
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(summary?.scopeId || ""))
        && (!expectedScopeId || String(summary?.scopeId || "") === expectedScopeId);
    const valid = !!summary
        && summary.schema === "ccm-group-typed-memory-shape-trend-summary-v1"
        && Number(summary.version || 0) === 1
        && scopeValid
        && summary.bodyFree === true
        && summary.advisoryOnly === true
        && summary.autoTuning === false
        && summary.crossSessionReuse === false
        && ["invalid", "unobserved", "warming", "stable", "drift"].includes(String(summary.status || ""))
        && checksumValid;
    return { valid, checksumValid, scopeValid };
}
function summarizeGroupTypedMemoryShapeTrend(scopeId, options = {}) {
    const loaded = readGroupTypedMemoryShapeTrendLedger(scopeId);
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const recentWindowDays = Math.max(1, Math.min(30, Number(options.recentWindowDays || options.recent_window_days || 7)));
    const baselineWindowDays = Math.max(recentWindowDays, Math.min(90, Number(options.baselineWindowDays || options.baseline_window_days || 21)));
    const recentStartDate = groupTypedMemoryShapeTrendDate(nowMs - (recentWindowDays - 1) * 86_400_000);
    const baselineStartDate = groupTypedMemoryShapeTrendDate(nowMs - (recentWindowDays + baselineWindowDays - 1) * 86_400_000);
    const currentDate = groupTypedMemoryShapeTrendDate(nowMs);
    const buckets = loaded.valid === true && Array.isArray(loaded.buckets)
        ? loaded.buckets.filter((row) => String(row?.date || "") <= currentDate)
        : [];
    const recentBuckets = buckets.filter((row) => row.date >= recentStartDate);
    const baselineBuckets = buckets.filter((row) => row.date >= baselineStartDate && row.date < recentStartDate);
    const recent = summarizeGroupTypedMemoryShapeTrendBuckets(recentBuckets);
    const baseline = summarizeGroupTypedMemoryShapeTrendBuckets(baselineBuckets);
    const total = summarizeGroupTypedMemoryShapeTrendBuckets(buckets);
    const deltas = {
        selectionRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "selectionRate"),
        emptySelectionRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "emptySelectionRate"),
        averageSelectedAgeDays: groupTypedMemoryShapeMetricDelta(recent, baseline, "averageSelectedAgeDays"),
        selectedStaleRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "selectedStaleRate"),
        receiptCoverageRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "receiptCoverageRate"),
        consumedUtilityRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "consumedUtilityRate"),
        averageWriteBytes: groupTypedMemoryShapeMetricDelta(recent, baseline, "averageWriteBytes"),
    };
    const selectorSufficient = recent.selectorRunCount >= 3 && baseline.selectorRunCount >= 3;
    const consumptionSufficient = recent.declaredDocumentCount >= 3 && baseline.declaredDocumentCount >= 3;
    const writeSufficient = recent.writeEventCount >= 3 && baseline.writeEventCount >= 3;
    const signals = [];
    const signal = (code, severity, delta) => signals.push({ code, severity, delta });
    if (selectorSufficient) {
        if (deltas.selectionRate !== null && Math.abs(deltas.selectionRate) >= 0.2)
            signal("selection_rate_shift", "info", deltas.selectionRate);
        if (deltas.emptySelectionRate !== null && deltas.emptySelectionRate >= 0.25)
            signal("empty_selection_rise", "warning", deltas.emptySelectionRate);
        if (deltas.averageSelectedAgeDays !== null && deltas.averageSelectedAgeDays >= 7)
            signal("selected_age_rise", "warning", deltas.averageSelectedAgeDays);
        if (deltas.selectedStaleRate !== null && deltas.selectedStaleRate >= 0.25)
            signal("stale_selection_rise", "warning", deltas.selectedStaleRate);
    }
    if (consumptionSufficient) {
        if (deltas.receiptCoverageRate !== null && deltas.receiptCoverageRate <= -0.2)
            signal("receipt_coverage_drop", "warning", deltas.receiptCoverageRate);
        if (deltas.consumedUtilityRate !== null && deltas.consumedUtilityRate <= -0.2)
            signal("consumed_utility_drop", "warning", deltas.consumedUtilityRate);
    }
    if (writeSufficient) {
        if (deltas.averageWriteBytes !== null && deltas.averageWriteBytes >= 4_000)
            signal("write_size_growth", "warning", deltas.averageWriteBytes);
        if (recent.nearBodyLimitWriteCount / Math.max(1, recent.writeEventCount) >= 0.5)
            signal("write_capacity_pressure", "warning", null);
    }
    if (recent.truncatedBodyWriteCount > 0)
        signal("write_body_truncated", "warning", null);
    const comparisonReady = selectorSufficient || consumptionSufficient || writeSufficient;
    const status = loaded.valid !== true ? "invalid" : !loaded.present ? "unobserved" : !comparisonReady ? "warming" : signals.length ? "drift" : "stable";
    const oldestDate = buckets[0]?.date || "";
    const core = {
        schema: "ccm-group-typed-memory-shape-trend-summary-v1",
        version: 1,
        scopeId,
        bodyFree: true,
        advisoryOnly: true,
        autoTuning: false,
        crossSessionReuse: false,
        status,
        valid: loaded.valid === true,
        ledgerPresent: loaded.present === true,
        ledgerPrimaryValid: loaded.primaryValid === true,
        recoveredFromBackup: loaded.recoveredFromBackup === true,
        ledgerFile: loaded.file,
        ledgerChecksum: String(loaded.checksum || ""),
        generation: Number(loaded.generation || 0),
        bucketCount: buckets.length,
        mutableBucketCount: buckets.filter((row) => row.sealed !== true).length,
        sealedBucketCount: buckets.filter((row) => row.sealed === true).length,
        oldestDate,
        latestDate: buckets[buckets.length - 1]?.date || "",
        retentionDays: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS,
        mutableDays: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS,
        extendsBeyondHotRetention: !!oldestDate && oldestDate < baselineStartDate,
        recentWindowDays,
        baselineWindowDays,
        confidence: { selectorSufficient, consumptionSufficient, writeSufficient, comparisonReady },
        recent,
        baseline,
        total,
        deltas,
        signalCount: signals.length,
        warningSignalCount: signals.filter(row => row.severity === "warning").length,
        signals,
        buckets: options.includeBuckets === true || options.include_buckets === true ? buckets.slice(-60) : undefined,
        generatedAt: new Date(nowMs).toISOString(),
    };
    return { ...core, checksum: groupTypedMemoryShapeTrendSummaryChecksum(core) };
}
function groupTypedMemoryShapeTrendIncidentEventChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendIncidentLedgerChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.file;
    delete payload.present;
    delete payload.valid;
    delete payload.primaryValid;
    delete payload.recoveredFromBackup;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendIncidentSummaryChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryShapeTrendSignalState(trend) {
    const signals = (Array.isArray(trend?.signals) ? trend.signals : [])
        .map((row) => ({ code: String(row?.code || ""), severity: String(row?.severity || "") }))
        .filter((row) => row.code && ["info", "warning"].includes(row.severity))
        .sort((a, b) => a.code.localeCompare(b.code) || a.severity.localeCompare(b.severity));
    const actionable = trend?.valid === true && String(trend?.status || "") === "drift" && signals.length > 0;
    return {
        actionable,
        signalFingerprint: actionable ? (0, typed_memory_shared_1.checksum)(JSON.stringify({ status: "drift", signals }), 32) : "",
        signalCodes: signals.map((row) => row.code),
        warningSignalCount: signals.filter((row) => row.severity === "warning").length,
    };
}
function emptyGroupTypedMemoryShapeTrendIncidentLedger(scopeId) {
    const core = {
        schema: "ccm-group-typed-memory-shape-trend-incident-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION,
        scopeId,
        bodyFree: true,
        advisoryOnly: true,
        visibilityOnly: true,
        memoryMutationAuthorized: false,
        maxEvents: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS,
        retentionDays: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_RETENTION_DAYS,
        generation: 0,
        headEventChecksum: "",
        events: [],
        updatedAt: "",
    };
    return { ...core, checksum: groupTypedMemoryShapeTrendIncidentLedgerChecksum(core) };
}
function replayGroupTypedMemoryShapeTrendIncidentEvents(events, expectedScopeId = "") {
    const incidents = new Map();
    const seenEventIds = new Set();
    let previousEventChecksum = "";
    let chainValid = true;
    let semanticsValid = true;
    let activeIncident = null;
    for (const event of events) {
        const type = String(event?.type || "");
        const incidentId = String(event?.incidentId || "");
        const eventValid = !!event
            && event.schema === "ccm-group-typed-memory-shape-trend-incident-event-v1"
            && Number(event.version || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION
            && /^mste_[a-f0-9]{24}$/.test(String(event.eventId || ""))
            && !seenEventIds.has(String(event.eventId || ""))
            && /^msti_[a-f0-9]{24}$/.test(incidentId)
            && ["opened", "acknowledged", "resolved"].includes(type)
            && (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(event.scopeId || ""))
            && (!expectedScopeId || String(event.scopeId || "") === expectedScopeId)
            && event.bodyFree === true
            && event.advisoryOnly === true
            && event.visibilityOnly === true
            && event.memoryMutationAuthorized === false
            && Number.isFinite(Date.parse(String(event.at || "")))
            && String(event.previousEventChecksum || "") === previousEventChecksum
            && String(event.checksum || "") === groupTypedMemoryShapeTrendIncidentEventChecksum(event);
        if (!eventValid)
            chainValid = false;
        seenEventIds.add(String(event?.eventId || ""));
        previousEventChecksum = String(event?.checksum || "");
        if (type === "opened") {
            const openValid = !activeIncident
                && !incidents.has(incidentId)
                && String(event.trendStatus || "") === "drift"
                && /^[a-f0-9]{32}$/.test(String(event.signalFingerprint || ""))
                && Array.isArray(event.signalCodes)
                && event.signalCodes.length > 0
                && event.signalCodes.every((code) => typeof code === "string" && !!code)
                && Number(event.trendGeneration || 0) > 0
                && /^[a-f0-9]{64}$/.test(String(event.trendLedgerChecksum || ""))
                && /^[a-f0-9]{64}$/.test(String(event.trendSummaryChecksum || ""));
            if (!openValid)
                semanticsValid = false;
            const incident = { opened: event, acknowledgement: null, resolved: null };
            incidents.set(incidentId, incident);
            activeIncident = incident;
            continue;
        }
        const incident = incidents.get(incidentId);
        const targetValid = !!incident
            && !incident.resolved
            && String(event.targetIncidentChecksum || "") === String(incident.opened?.checksum || "");
        if (type === "acknowledged") {
            if (!targetValid || incident.acknowledgement || String(event.actor || "").length > 100 || !/^[a-f0-9]{32}$/.test(String(event.noteChecksum || "")))
                semanticsValid = false;
            else
                incident.acknowledgement = event;
        }
        else {
            if (!targetValid || activeIncident !== incident)
                semanticsValid = false;
            else {
                incident.resolved = event;
                activeIncident = null;
            }
        }
    }
    return {
        valid: chainValid && semanticsValid,
        chainValid,
        semanticsValid,
        incidents: [...incidents.values()],
        activeIncident,
        headEventChecksum: previousEventChecksum,
    };
}
function verifyGroupTypedMemoryShapeTrendIncidentLedger(ledger, expectedScopeId = "") {
    const events = Array.isArray(ledger?.events) ? ledger.events : [];
    const replay = replayGroupTypedMemoryShapeTrendIncidentEvents(events, expectedScopeId || String(ledger?.scopeId || ""));
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(ledger?.scopeId || ""))
        && (!expectedScopeId || String(ledger?.scopeId || "") === expectedScopeId);
    const checksumValid = !!ledger && String(ledger.checksum || "") === groupTypedMemoryShapeTrendIncidentLedgerChecksum(ledger);
    const valid = !!ledger
        && ledger.schema === "ccm-group-typed-memory-shape-trend-incident-ledger-v1"
        && Number(ledger.version || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION
        && scopeValid
        && ledger.bodyFree === true
        && ledger.advisoryOnly === true
        && ledger.visibilityOnly === true
        && ledger.memoryMutationAuthorized === false
        && Number(ledger.maxEvents || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS
        && Number(ledger.retentionDays || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_RETENTION_DAYS
        && events.length <= typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS
        && String(ledger.headEventChecksum || "") === replay.headEventChecksum
        && replay.valid
        && checksumValid;
    return { valid, checksumValid, scopeValid, chainValid: replay.chainValid, semanticsValid: replay.semanticsValid, eventCount: events.length };
}
function readGroupTypedMemoryShapeTrendIncidentLedger(scopeId) {
    const file = getGroupTypedMemoryShapeTrendIncidentFile(scopeId);
    let primary = null;
    let backup = null;
    try {
        primary = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    if (verifyGroupTypedMemoryShapeTrendIncidentLedger(primary, scopeId).valid)
        return { ...primary, file, present: true, valid: true, primaryValid: true, recoveredFromBackup: false };
    try {
        backup = JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
    }
    catch { }
    if (verifyGroupTypedMemoryShapeTrendIncidentLedger(backup, scopeId).valid)
        return { ...backup, file, present: true, valid: true, primaryValid: false, recoveredFromBackup: true };
    const present = fs.existsSync(file) || fs.existsSync(`${file}.bak`);
    if (present)
        return { ...(primary || backup || {}), file, present: true, valid: false, primaryValid: false, recoveredFromBackup: false };
    const empty = emptyGroupTypedMemoryShapeTrendIncidentLedger(scopeId);
    return { ...empty, file, present: false, valid: true, primaryValid: true, recoveredFromBackup: false };
}
function appendGroupTypedMemoryShapeTrendIncidentEvent(ledger, scopeId, type, input = {}) {
    const at = String(input.at || (0, typed_memory_shared_1.now)());
    const previousEventChecksum = String(ledger.events?.[ledger.events.length - 1]?.checksum || "");
    const incidentId = String(input.incidentId || `msti_${(0, typed_memory_shared_1.checksum)([scopeId, type, at, crypto.randomBytes(8).toString("hex")], 24)}`);
    const core = {
        schema: "ccm-group-typed-memory-shape-trend-incident-event-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION,
        eventId: `mste_${(0, typed_memory_shared_1.checksum)([scopeId, incidentId, type, at, crypto.randomBytes(8).toString("hex")], 24)}`,
        scopeId,
        type,
        incidentId,
        targetIncidentChecksum: String(input.targetIncidentChecksum || ""),
        signalFingerprint: String(input.signalFingerprint || ""),
        signalCodes: (0, typed_memory_shared_1.uniqueStrings)((input.signalCodes || []).map(String), 32).sort(),
        warningSignalCount: Number(input.warningSignalCount || 0),
        trendStatus: String(input.trendStatus || ""),
        trendGeneration: Number(input.trendGeneration || 0),
        trendLedgerChecksum: String(input.trendLedgerChecksum || ""),
        trendSummaryChecksum: String(input.trendSummaryChecksum || ""),
        actor: type === "acknowledged" ? (0, typed_memory_shared_1.compactText)(input.actor || "memory-center", 100) : "",
        noteChecksum: type === "acknowledged" ? (0, typed_memory_shared_1.checksum)(String(input.note || ""), 32) : "",
        noteChars: type === "acknowledged" ? String(input.note || "").length : 0,
        bodyFree: true,
        advisoryOnly: true,
        visibilityOnly: true,
        memoryMutationAuthorized: false,
        at,
        previousEventChecksum,
    };
    const event = { ...core, checksum: groupTypedMemoryShapeTrendIncidentEventChecksum(core) };
    ledger.events.push(event);
    return event;
}
function compactGroupTypedMemoryShapeTrendIncidentEvents(events, nowMs) {
    const replay = replayGroupTypedMemoryShapeTrendIncidentEvents(events);
    if (!replay.valid)
        return events;
    const cutoffMs = nowMs - typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_RETENTION_DAYS * 86_400_000;
    const removable = new Set();
    for (const incident of replay.incidents) {
        const resolvedMs = Date.parse(String(incident.resolved?.at || ""));
        if (incident.resolved && Number.isFinite(resolvedMs) && resolvedMs < cutoffMs)
            removable.add(String(incident.opened.incidentId || ""));
    }
    let kept = events.filter(event => !removable.has(String(event.incidentId || "")));
    while (kept.length > typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS) {
        const nextReplay = replayGroupTypedMemoryShapeTrendIncidentEvents(kept);
        const oldestResolved = nextReplay.incidents.find((incident) => !!incident.resolved);
        if (!oldestResolved)
            break;
        const incidentId = String(oldestResolved.opened.incidentId || "");
        kept = kept.filter(event => String(event.incidentId || "") !== incidentId);
    }
    let previousEventChecksum = "";
    const openedChecksums = new Map();
    for (const event of kept) {
        if (event.type !== "opened")
            event.targetIncidentChecksum = String(openedChecksums.get(String(event.incidentId || "")) || event.targetIncidentChecksum || "");
        event.previousEventChecksum = previousEventChecksum;
        event.checksum = groupTypedMemoryShapeTrendIncidentEventChecksum(event);
        if (event.type === "opened")
            openedChecksums.set(String(event.incidentId || ""), event.checksum);
        previousEventChecksum = event.checksum;
    }
    return kept;
}
function commitGroupTypedMemoryShapeTrendIncidentLedger(file, ledger, scopeId, nowMs) {
    ledger.events = compactGroupTypedMemoryShapeTrendIncidentEvents(ledger.events || [], nowMs);
    if (ledger.events.length > typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS)
        throw new Error("typed_memory_shape_trend_incident_capacity_exceeded");
    ledger.generation = Number(ledger.generation || 0) + 1;
    ledger.updatedAt = new Date(nowMs).toISOString();
    ledger.headEventChecksum = String(ledger.events[ledger.events.length - 1]?.checksum || "");
    ledger.checksum = groupTypedMemoryShapeTrendIncidentLedgerChecksum(ledger);
    if (!verifyGroupTypedMemoryShapeTrendIncidentLedger(ledger, scopeId).valid)
        throw new Error("typed_memory_shape_trend_incident_ledger_write_invalid");
    (0, atomic_json_file_1.writeJsonAtomic)(file, ledger);
    return ledger;
}
function syncGroupTypedMemoryShapeTrendIncident(scopeId, trendInput = null, options = {}) {
    if (!(0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { changed: false, reason: "exact_group_gcs_scope_required" };
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const trend = trendInput?.schema === "ccm-group-typed-memory-shape-trend-summary-v1"
        ? trendInput
        : summarizeGroupTypedMemoryShapeTrend(scopeId, { nowMs });
    if (trend.valid !== true || !verifyGroupTypedMemoryShapeTrendSummary(trend, scopeId).valid)
        return { changed: false, reason: "shape_trend_invalid" };
    const signalState = groupTypedMemoryShapeTrendSignalState(trend);
    const file = getGroupTypedMemoryShapeTrendIncidentFile(scopeId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
        if (!current && (fs.existsSync(file) || fs.existsSync(`${file}.bak`)))
            throw new Error("typed_memory_shape_trend_incident_ledger_unrecoverable");
        if (current && !verifyGroupTypedMemoryShapeTrendIncidentLedger(current, scopeId).valid)
            throw new Error("typed_memory_shape_trend_incident_ledger_invalid");
        const ledger = current || emptyGroupTypedMemoryShapeTrendIncidentLedger(scopeId);
        const replay = replayGroupTypedMemoryShapeTrendIncidentEvents(ledger.events || [], scopeId);
        const active = replay.activeIncident;
        if ((!signalState.actionable && !active)
            || (signalState.actionable && active && String(active.opened.signalFingerprint || "") === signalState.signalFingerprint)) {
            return { changed: false, reason: "incident_state_unchanged", activeIncidentId: String(active?.opened?.incidentId || ""), ledgerFile: file };
        }
        const events = [];
        if (active) {
            events.push(appendGroupTypedMemoryShapeTrendIncidentEvent(ledger, scopeId, "resolved", {
                incidentId: active.opened.incidentId,
                targetIncidentChecksum: active.opened.checksum,
                signalFingerprint: active.opened.signalFingerprint,
                signalCodes: active.opened.signalCodes,
                warningSignalCount: active.opened.warningSignalCount,
                trendStatus: trend.status,
                trendGeneration: trend.generation,
                trendLedgerChecksum: trend.ledgerChecksum,
                trendSummaryChecksum: trend.checksum,
                at: new Date(nowMs).toISOString(),
            }));
        }
        if (signalState.actionable) {
            events.push(appendGroupTypedMemoryShapeTrendIncidentEvent(ledger, scopeId, "opened", {
                signalFingerprint: signalState.signalFingerprint,
                signalCodes: signalState.signalCodes,
                warningSignalCount: signalState.warningSignalCount,
                trendStatus: trend.status,
                trendGeneration: trend.generation,
                trendLedgerChecksum: trend.ledgerChecksum,
                trendSummaryChecksum: trend.checksum,
                at: new Date(nowMs).toISOString(),
            }));
        }
        const committed = commitGroupTypedMemoryShapeTrendIncidentLedger(file, ledger, scopeId, nowMs);
        return {
            changed: true,
            transition: active && signalState.actionable ? "replaced" : active ? "resolved" : "opened",
            events,
            activeIncidentId: String(events.find(event => event.type === "opened")?.incidentId || ""),
            ledgerFile: file,
            generation: committed.generation,
            ledgerChecksum: committed.checksum,
        };
    }, { timeoutMs: 5_000, retryMs: 10, staleMs: 60_000 });
}
function verifyGroupTypedMemoryShapeTrendIncidentSummary(summary, expectedScopeId = "") {
    const checksumValid = !!summary && String(summary.checksum || "") === groupTypedMemoryShapeTrendIncidentSummaryChecksum(summary);
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(summary?.scopeId || ""))
        && (!expectedScopeId || String(summary?.scopeId || "") === expectedScopeId);
    const valid = !!summary
        && summary.schema === "ccm-group-typed-memory-shape-trend-incident-summary-v1"
        && Number(summary.version || 0) === typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION
        && scopeValid
        && summary.bodyFree === true
        && summary.advisoryOnly === true
        && summary.visibilityOnly === true
        && summary.memoryMutationAuthorized === false
        && ["invalid", "unobserved", "pending", "acknowledged", "resolved"].includes(String(summary.status || ""))
        && checksumValid;
    return { valid, checksumValid, scopeValid };
}
function summarizeGroupTypedMemoryShapeTrendIncidents(scopeId, options = {}) {
    const loaded = readGroupTypedMemoryShapeTrendIncidentLedger(scopeId);
    const events = loaded.valid === true && Array.isArray(loaded.events) ? loaded.events : [];
    const replay = replayGroupTypedMemoryShapeTrendIncidentEvents(events, scopeId);
    const active = replay.activeIncident;
    const acknowledged = !!active?.acknowledgement;
    const incidents = replay.incidents || [];
    const status = loaded.valid !== true ? "invalid" : active ? acknowledged ? "acknowledged" : "pending" : incidents.length ? "resolved" : "unobserved";
    const core = {
        schema: "ccm-group-typed-memory-shape-trend-incident-summary-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION,
        scopeId,
        bodyFree: true,
        advisoryOnly: true,
        visibilityOnly: true,
        memoryMutationAuthorized: false,
        valid: loaded.valid === true && replay.valid === true,
        status,
        ledgerPresent: loaded.present === true,
        ledgerPrimaryValid: loaded.primaryValid === true,
        recoveredFromBackup: loaded.recoveredFromBackup === true,
        ledgerFile: loaded.file,
        ledgerChecksum: String(loaded.checksum || ""),
        generation: Number(loaded.generation || 0),
        eventCount: events.length,
        incidentCount: incidents.length,
        pendingCount: active && !acknowledged ? 1 : 0,
        acknowledgedCount: incidents.filter((incident) => !!incident.acknowledgement).length,
        resolvedCount: incidents.filter((incident) => !!incident.resolved).length,
        activeIncident: active ? {
            incidentId: String(active.opened.incidentId || ""),
            incidentChecksum: String(active.opened.checksum || ""),
            signalFingerprint: String(active.opened.signalFingerprint || ""),
            signalCodes: active.opened.signalCodes || [],
            warningSignalCount: Number(active.opened.warningSignalCount || 0),
            trendGeneration: Number(active.opened.trendGeneration || 0),
            trendLedgerChecksum: String(active.opened.trendLedgerChecksum || ""),
            openedAt: String(active.opened.at || ""),
            acknowledged,
            acknowledgement: active.acknowledgement ? {
                eventId: String(active.acknowledgement.eventId || ""),
                actor: String(active.acknowledgement.actor || ""),
                acknowledgedAt: String(active.acknowledgement.at || ""),
                noteChecksum: String(active.acknowledgement.noteChecksum || ""),
            } : null,
        } : null,
        latestEvents: options.includeEvents === true || options.include_events === true
            ? events.slice(-60).reverse()
            : undefined,
        generatedAt: (0, typed_memory_shared_1.now)(),
    };
    return { ...core, checksum: groupTypedMemoryShapeTrendIncidentSummaryChecksum(core) };
}
function acknowledgeGroupTypedMemoryShapeTrendIncident(scopeId, input = {}) {
    if (!(0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { acknowledged: false, reason: "exact_group_gcs_scope_required" };
    if (input.explicitConfirmation !== true && input.explicit_confirmation !== true)
        return { acknowledged: false, reason: "explicit_confirmation_required" };
    const expectedIncidentId = String(input.incidentId || input.incident_id || "");
    const expectedIncidentChecksum = String(input.incidentChecksum || input.incident_checksum || "");
    const nowMs = Number(input.nowMs || input.now_ms || Date.now());
    const trendFile = getGroupTypedMemoryShapeTrendFile(scopeId);
    return (0, atomic_json_file_1.withFileLock)(trendFile, () => {
        const trend = summarizeGroupTypedMemoryShapeTrend(scopeId, { nowMs });
        if (trend.valid !== true || !verifyGroupTypedMemoryShapeTrendSummary(trend, scopeId).valid)
            return { acknowledged: false, reason: "shape_trend_invalid" };
        syncGroupTypedMemoryShapeTrendIncident(scopeId, trend, { nowMs });
        const file = getGroupTypedMemoryShapeTrendIncidentFile(scopeId);
        return (0, atomic_json_file_1.withFileLock)(file, () => {
            const current = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
            if (!current && !fs.existsSync(file) && !fs.existsSync(`${file}.bak`))
                return { acknowledged: false, reason: "no_active_shape_trend_incident" };
            if (!current)
                throw new Error("typed_memory_shape_trend_incident_ledger_unrecoverable");
            if (!verifyGroupTypedMemoryShapeTrendIncidentLedger(current, scopeId).valid)
                throw new Error("typed_memory_shape_trend_incident_ledger_invalid");
            const replay = replayGroupTypedMemoryShapeTrendIncidentEvents(current.events || [], scopeId);
            const active = replay.activeIncident;
            if (!active)
                return { acknowledged: false, reason: "no_active_shape_trend_incident" };
            if (expectedIncidentId && expectedIncidentId !== String(active.opened.incidentId || ""))
                return { acknowledged: false, reason: "shape_trend_incident_changed" };
            if (expectedIncidentChecksum && expectedIncidentChecksum !== String(active.opened.checksum || ""))
                return { acknowledged: false, reason: "shape_trend_incident_changed" };
            if (active.acknowledgement)
                return { acknowledged: true, idempotent: true, event: active.acknowledgement, summary: summarizeGroupTypedMemoryShapeTrendIncidents(scopeId) };
            const signalState = groupTypedMemoryShapeTrendSignalState(trend);
            if (!signalState.actionable || signalState.signalFingerprint !== String(active.opened.signalFingerprint || ""))
                return { acknowledged: false, reason: "shape_trend_incident_changed" };
            const event = appendGroupTypedMemoryShapeTrendIncidentEvent(current, scopeId, "acknowledged", {
                incidentId: active.opened.incidentId,
                targetIncidentChecksum: active.opened.checksum,
                signalFingerprint: signalState.signalFingerprint,
                signalCodes: signalState.signalCodes,
                warningSignalCount: signalState.warningSignalCount,
                trendStatus: trend.status,
                trendGeneration: trend.generation,
                trendLedgerChecksum: trend.ledgerChecksum,
                trendSummaryChecksum: trend.checksum,
                actor: input.actor || "memory-center",
                note: input.note || "",
                at: new Date(nowMs).toISOString(),
            });
            const committed = commitGroupTypedMemoryShapeTrendIncidentLedger(file, current, scopeId, nowMs);
            return { acknowledged: true, idempotent: false, event, ledgerChecksum: committed.checksum, summary: summarizeGroupTypedMemoryShapeTrendIncidents(scopeId) };
        }, { timeoutMs: 5_000, retryMs: 10, staleMs: 60_000 });
    }, { timeoutMs: 5_000, retryMs: 10, staleMs: 60_000 });
}
function groupTypedMemoryManifestSelectorShapeChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.shapeFile;
    delete payload.valid;
    delete payload.recorded;
    delete payload.idempotent;
    delete payload.trendContribution;
    delete payload.trendContributionError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function verifyGroupTypedMemoryManifestSelectorShape(shape, expectedScopeId = "", decision = null) {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorShape(shape, expectedScopeId, decision);
}
function recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, candidates = [], input = {}) {
    return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, candidates, input);
}
function summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, options);
}
function groupTypedMemoryShapeDriftChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.valid;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function summarizeGroupTypedMemoryShapeWindow(shapeRows, writeRows) {
    const candidateTotal = shapeRows.reduce((sum, row) => sum + Number(row.candidateCount || 0), 0);
    const selectedTotal = shapeRows.reduce((sum, row) => sum + Number(row.selectedCount || 0), 0);
    const selectedAgeWeight = shapeRows.reduce((sum, row) => {
        const count = Number(row.selectedCount || 0);
        const average = Number(row.selectedAgeDays?.average ?? -1);
        return average >= 0 ? sum + average * count : sum;
    }, 0);
    const freshCount = shapeRows.reduce((sum, row) => sum + Number(row.selectedFreshCount || 0), 0);
    const staleCount = shapeRows.reduce((sum, row) => sum + Number(row.selectedStaleCount || 0), 0);
    const documents = shapeRows.flatMap(row => row.consumption?.documents || []);
    const usedCount = documents.filter(row => row.usageState === "used").length;
    const verifiedCount = documents.filter(row => row.usageState === "verified").length;
    const ignoredCount = documents.filter(row => row.usageState === "ignored").length;
    const unreportedCount = documents.filter(row => row.usageState === "unreported").length;
    const declaredCount = usedCount + verifiedCount + ignoredCount;
    const changedWrites = writeRows.filter(row => row.changed === true);
    return {
        selectorRunCount: shapeRows.length,
        candidateTotal,
        selectedTotal,
        selectionRate: candidateTotal ? Number((selectedTotal / candidateTotal).toFixed(6)) : null,
        emptySelectionCount: shapeRows.filter(row => Number(row.selectedCount || 0) === 0).length,
        emptySelectionRate: shapeRows.length ? Number((shapeRows.filter(row => Number(row.selectedCount || 0) === 0).length / shapeRows.length).toFixed(6)) : null,
        averageCandidatesPerRun: shapeRows.length ? Number((candidateTotal / shapeRows.length).toFixed(6)) : null,
        averageSelectedAgeDays: selectedTotal ? Number((selectedAgeWeight / selectedTotal).toFixed(6)) : -1,
        selectedFreshCount: freshCount,
        selectedStaleCount: staleCount,
        selectedStaleRate: freshCount + staleCount ? Number((staleCount / (freshCount + staleCount)).toFixed(6)) : null,
        candidateCapacityRunCount: shapeRows.filter(row => Number(row.candidateCount || 0) >= typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES).length,
        selectionCapacityRunCount: shapeRows.filter(row => Number(row.selectedCount || 0) >= typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION).length,
        consumptionLinkedRunCount: shapeRows.filter(row => !!row.consumption).length,
        deliveredDocumentCount: documents.length,
        declaredDocumentCount: declaredCount,
        usedDocumentCount: usedCount,
        verifiedDocumentCount: verifiedCount,
        ignoredDocumentCount: ignoredCount,
        unreportedDocumentCount: unreportedCount,
        receiptCoverageRate: documents.length ? Number(((documents.length - unreportedCount) / documents.length).toFixed(6)) : null,
        consumedUtilityRate: declaredCount ? Number(((usedCount + verifiedCount) / declaredCount).toFixed(6)) : null,
        writeEventCount: writeRows.length,
        changedWriteCount: changedWrites.length,
        writeGrowthBytes: changedWrites.reduce((sum, row) => sum + Number(row.deltaBytes || 0), 0),
        averageWriteBytes: writeRows.length ? Number((writeRows.reduce((sum, row) => sum + Number(row.afterBytes || 0), 0) / writeRows.length).toFixed(3)) : null,
        nearBodyLimitWriteCount: writeRows.filter(row => row.nearBodyLimit === true).length,
        truncatedBodyWriteCount: writeRows.filter(row => row.bodyTruncated === true).length,
    };
}
function groupTypedMemoryShapeMetricDelta(recent, baseline, key) {
    const current = recent?.[key];
    const previous = baseline?.[key];
    return current === null || current === undefined || previous === null || previous === undefined || Number(current) < 0 || Number(previous) < 0
        ? null
        : Number((Number(current) - Number(previous)).toFixed(6));
}
function verifyGroupTypedMemoryShapeDrift(report, expectedScopeId = "") {
    const scopeValid = (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(String(report?.scopeId || ""))
        && (!expectedScopeId || String(report?.scopeId || "") === expectedScopeId);
    const checksumValid = !!report && String(report.checksum || "") === groupTypedMemoryShapeDriftChecksum(report);
    const valid = !!report
        && report.schema === "ccm-group-typed-memory-shape-drift-v1"
        && Number(report.version || 0) === 1
        && scopeValid
        && report.advisoryOnly === true
        && report.autoTuning === false
        && report.crossSessionReuse === false
        && report.bodyFree === true
        && Number(report.recentWindowDays || 0) > 0
        && Number(report.baselineWindowDays || 0) > 0
        && ["unobserved", "warming", "stable", "drift"].includes(String(report.status || ""))
        && checksumValid;
    return { valid, checksumValid, scopeValid };
}
function buildGroupTypedMemoryShapeDrift(scopeId, shapeRows, writeRows, options = {}) {
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const recentWindowDays = Math.max(1, Math.min(30, Number(options.recentWindowDays || options.recent_window_days || 7)));
    const baselineWindowDays = Math.max(recentWindowDays, Math.min(90, Number(options.baselineWindowDays || options.baseline_window_days || 21)));
    const minimumSelectorRuns = Math.max(2, Math.min(20, Number(options.minimumSelectorRuns || options.minimum_selector_runs || 3)));
    const minimumConsumptionDocuments = Math.max(2, Math.min(20, Number(options.minimumConsumptionDocuments || options.minimum_consumption_documents || 3)));
    const recentStartMs = nowMs - recentWindowDays * 86_400_000;
    const baselineStartMs = recentStartMs - baselineWindowDays * 86_400_000;
    const inWindow = (row, startMs, endMs) => {
        const atMs = Date.parse(String(row.recordedAt || ""));
        return Number.isFinite(atMs) && atMs >= startMs && atMs < endMs;
    };
    const recentShapeRows = shapeRows.filter(row => inWindow(row, recentStartMs, nowMs + 1));
    const baselineShapeRows = shapeRows.filter(row => inWindow(row, baselineStartMs, recentStartMs));
    const recentWriteRows = writeRows.filter(row => inWindow(row, recentStartMs, nowMs + 1));
    const baselineWriteRows = writeRows.filter(row => inWindow(row, baselineStartMs, recentStartMs));
    const recent = summarizeGroupTypedMemoryShapeWindow(recentShapeRows, recentWriteRows);
    const baseline = summarizeGroupTypedMemoryShapeWindow(baselineShapeRows, baselineWriteRows);
    const deltas = {
        selectionRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "selectionRate"),
        emptySelectionRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "emptySelectionRate"),
        averageCandidatesPerRun: groupTypedMemoryShapeMetricDelta(recent, baseline, "averageCandidatesPerRun"),
        averageSelectedAgeDays: groupTypedMemoryShapeMetricDelta(recent, baseline, "averageSelectedAgeDays"),
        selectedStaleRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "selectedStaleRate"),
        receiptCoverageRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "receiptCoverageRate"),
        consumedUtilityRate: groupTypedMemoryShapeMetricDelta(recent, baseline, "consumedUtilityRate"),
        averageWriteBytes: groupTypedMemoryShapeMetricDelta(recent, baseline, "averageWriteBytes"),
    };
    const selectorConfidenceSufficient = recent.selectorRunCount >= minimumSelectorRuns && baseline.selectorRunCount >= minimumSelectorRuns;
    const consumptionConfidenceSufficient = recent.declaredDocumentCount >= minimumConsumptionDocuments && baseline.declaredDocumentCount >= minimumConsumptionDocuments;
    const writeConfidenceSufficient = recent.writeEventCount >= minimumSelectorRuns && baseline.writeEventCount >= minimumSelectorRuns;
    const signals = [];
    const signal = (code, severity, metric, delta, reason) => signals.push({ code, severity, metric, delta, reason });
    if (selectorConfidenceSufficient) {
        if (deltas.selectionRate !== null && Math.abs(deltas.selectionRate) >= 0.2)
            signal("selection_rate_shift", "info", "selectionRate", deltas.selectionRate, "selection rate changed by at least 20 percentage points");
        if (deltas.emptySelectionRate !== null && deltas.emptySelectionRate >= 0.25)
            signal("empty_selection_rise", "warning", "emptySelectionRate", deltas.emptySelectionRate, "empty selector runs rose by at least 25 percentage points");
        if (deltas.averageSelectedAgeDays !== null && deltas.averageSelectedAgeDays >= 7)
            signal("selected_age_rise", "warning", "averageSelectedAgeDays", deltas.averageSelectedAgeDays, "selected memory age rose by at least seven days");
        if (deltas.selectedStaleRate !== null && deltas.selectedStaleRate >= 0.25)
            signal("stale_selection_rise", "warning", "selectedStaleRate", deltas.selectedStaleRate, "stale selected-memory share rose by at least 25 percentage points");
        if (recent.candidateCapacityRunCount / Math.max(1, recent.selectorRunCount) >= 0.5)
            signal("candidate_capacity_pressure", "warning", "candidateCapacityRunCount", null, "at least half of recent selector runs reached the 200-header cap");
        if (recent.selectionCapacityRunCount / Math.max(1, recent.selectorRunCount) >= 0.5)
            signal("selection_capacity_pressure", "info", "selectionCapacityRunCount", null, "at least half of recent selector runs filled all five selection slots");
    }
    if (consumptionConfidenceSufficient) {
        if (deltas.receiptCoverageRate !== null && deltas.receiptCoverageRate <= -0.2)
            signal("receipt_coverage_drop", "warning", "receiptCoverageRate", deltas.receiptCoverageRate, "structured receipt coverage fell by at least 20 percentage points");
        if (deltas.consumedUtilityRate !== null && deltas.consumedUtilityRate <= -0.2)
            signal("consumed_utility_drop", "warning", "consumedUtilityRate", deltas.consumedUtilityRate, "observed consumed utility fell by at least 20 percentage points");
    }
    if (writeConfidenceSufficient) {
        if (deltas.averageWriteBytes !== null && deltas.averageWriteBytes >= 4_000)
            signal("write_size_growth", "warning", "averageWriteBytes", deltas.averageWriteBytes, "average written memory size grew by at least 4000 bytes");
        if (recent.nearBodyLimitWriteCount / Math.max(1, recent.writeEventCount) >= 0.5)
            signal("write_capacity_pressure", "warning", "nearBodyLimitWriteCount", null, "at least half of recent writes approached the configured body limit");
    }
    if (recent.truncatedBodyWriteCount > 0)
        signal("write_body_truncated", "warning", "truncatedBodyWriteCount", null, "one or more recent typed-memory writes exceeded the configured body limit");
    const anyObserved = recent.selectorRunCount + baseline.selectorRunCount + recent.writeEventCount + baseline.writeEventCount > 0;
    const comparisonReady = selectorConfidenceSufficient || consumptionConfidenceSufficient || writeConfidenceSufficient;
    const status = !anyObserved ? "unobserved" : !comparisonReady ? "warming" : signals.length ? "drift" : "stable";
    const core = {
        schema: "ccm-group-typed-memory-shape-drift-v1",
        version: 1,
        scopeId,
        advisoryOnly: true,
        autoTuning: false,
        crossSessionReuse: false,
        bodyFree: true,
        status,
        generatedAt: new Date(nowMs).toISOString(),
        recentWindowDays,
        baselineWindowDays,
        minimumSelectorRuns,
        minimumConsumptionDocuments,
        retentionBounded: true,
        maxShapeRows: 200,
        maxWriteRows: typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_SHAPE_MAX_EVENTS,
        confidence: {
            selectorSufficient: selectorConfidenceSufficient,
            consumptionSufficient: consumptionConfidenceSufficient,
            writeSufficient: writeConfidenceSufficient,
            comparisonReady,
        },
        recent,
        baseline,
        deltas,
        signalCount: signals.length,
        warningSignalCount: signals.filter(row => row.severity === "warning").length,
        signals,
    };
    return { ...core, checksum: groupTypedMemoryShapeDriftChecksum(core) };
}
//# sourceMappingURL=typed-memory-shape-trend.js.map