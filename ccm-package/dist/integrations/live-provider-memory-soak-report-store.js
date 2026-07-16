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
exports.LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET = exports.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR = exports.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR = void 0;
exports.liveProviderMemorySoakReportKind = liveProviderMemorySoakReportKind;
exports.verifyLiveProviderMemorySoakReport = verifyLiveProviderMemorySoakReport;
exports.withLiveProviderMemorySoakReportSetLock = withLiveProviderMemorySoakReportSetLock;
exports.commitLiveProviderMemorySoakReport = commitLiveProviderMemorySoakReport;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
exports.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR = path.join(utils_1.CCM_DIR, "reliability", "live-provider-memory-soak");
exports.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR = path.join(utils_1.CCM_DIR, "reliability", "live-provider-multi-group-soak");
exports.LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET = path.join(utils_1.CCM_DIR, "reliability", "live-provider-memory-soak-report-set");
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
function liveProviderMemorySoakReportKind(report) {
    if (report?.schema === "ccm-live-provider-native-memory-soak-report-v2" && Number(report?.version || 0) === 2)
        return "single";
    if (report?.schema === "ccm-live-provider-multi-group-memory-soak-report-v1" && Number(report?.version || 0) === 1)
        return "multi";
    if (report?.schema === "ccm-live-provider-multi-group-memory-fleet-report-v1" && Number(report?.version || 0) === 1)
        return "fleet";
    if (report?.schema === "ccm-live-provider-memory-endurance-report-v1" && Number(report?.version || 0) === 1)
        return "endurance";
    return "unknown";
}
function verifyLiveProviderMemorySoakReport(report, expectedKind) {
    const kind = liveProviderMemorySoakReportKind(report);
    const reportChecksum = String(report?.reportChecksum || "");
    const expectedChecksum = digest(reportCore(report));
    const checksumValid = !!reportChecksum && reportChecksum === expectedChecksum;
    return {
        valid: kind !== "unknown" && checksumValid && (!expectedKind || kind === expectedKind),
        kind,
        reportChecksum,
        expectedChecksum,
        checksumValid,
    };
}
function withLiveProviderMemorySoakReportSetLock(operation, options = {}) {
    return (0, atomic_json_file_1.withFileLock)(exports.LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET, operation, {
        timeoutMs: Math.max(1_000, Number(options.timeoutMs || 60_000)),
        retryMs: Math.max(5, Number(options.retryMs || 20)),
        staleMs: Math.max(1_000, Number(options.staleMs || 10 * 60_000)),
    });
}
function reportDirectory(kind) {
    return kind === "single" ? exports.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR : exports.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR;
}
function defaultReportName(report, kind) {
    if (kind === "fleet" || kind === "endurance")
        return `${kind}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.json`;
    const runId = String(report?.runId || "").trim();
    if (!/^[a-zA-Z0-9._-]{4,200}$/.test(runId))
        throw new Error("live Provider memory soak report runId is invalid");
    return `${runId}.json`;
}
function validateReportName(value) {
    const name = String(value || "").trim();
    if (!/^[a-zA-Z0-9._-]{4,220}\.json$/.test(name) || path.basename(name) !== name) {
        throw new Error("live Provider memory soak report file name is invalid");
    }
    return name;
}
function commitReport(report, kind, fileName) {
    const verification = verifyLiveProviderMemorySoakReport(report, kind);
    if (!verification.valid)
        throw new Error(`live Provider memory soak ${kind} report failed schema/checksum verification`);
    const directory = reportDirectory(kind);
    const name = validateReportName(fileName || defaultReportName(report, kind));
    const file = path.join(directory, name);
    fs.mkdirSync(directory, { recursive: true });
    const temp = `${file}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
    let fd = null;
    try {
        fd = fs.openSync(temp, "wx", 0o600);
        fs.writeFileSync(fd, `${JSON.stringify(report, null, 2)}\n`, "utf8");
        fs.fsyncSync(fd);
    }
    finally {
        if (fd !== null)
            fs.closeSync(fd);
    }
    try {
        fs.renameSync(temp, file);
    }
    finally {
        try {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
        catch { }
    }
    return file;
}
function commitLiveProviderMemorySoakReport(report, options) {
    const operation = () => commitReport(report, options.kind, options.fileName);
    return options.lockHeld === true ? operation() : withLiveProviderMemorySoakReportSetLock(operation, options.lockOptions);
}
//# sourceMappingURL=live-provider-memory-soak-report-store.js.map