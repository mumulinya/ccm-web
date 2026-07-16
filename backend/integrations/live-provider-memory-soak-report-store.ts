import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, type FileLockOptions } from "../core/atomic-json-file";
import { CCM_DIR } from "../core/utils";

export const LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR = path.join(CCM_DIR, "reliability", "live-provider-memory-soak");
export const LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR = path.join(CCM_DIR, "reliability", "live-provider-multi-group-soak");
export const LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET = path.join(CCM_DIR, "reliability", "live-provider-memory-soak-report-set");

export type LiveProviderMemorySoakReportKind = "single" | "multi" | "fleet" | "endurance";

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}

function reportCore(report: any) {
  const { reportChecksum: _reportChecksum, reportFile: _reportFile, ...unsigned } = report || {};
  return unsigned;
}

export function liveProviderMemorySoakReportKind(report: any): LiveProviderMemorySoakReportKind | "unknown" {
  if (report?.schema === "ccm-live-provider-native-memory-soak-report-v2" && Number(report?.version || 0) === 2) return "single";
  if (report?.schema === "ccm-live-provider-multi-group-memory-soak-report-v1" && Number(report?.version || 0) === 1) return "multi";
  if (report?.schema === "ccm-live-provider-multi-group-memory-fleet-report-v1" && Number(report?.version || 0) === 1) return "fleet";
  if (report?.schema === "ccm-live-provider-memory-endurance-report-v1" && Number(report?.version || 0) === 1) return "endurance";
  return "unknown";
}

export function verifyLiveProviderMemorySoakReport(report: any, expectedKind?: LiveProviderMemorySoakReportKind) {
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

export function withLiveProviderMemorySoakReportSetLock<T>(operation: () => T, options: FileLockOptions = {}): T {
  return withFileLock(LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET, operation, {
    timeoutMs: Math.max(1_000, Number(options.timeoutMs || 60_000)),
    retryMs: Math.max(5, Number(options.retryMs || 20)),
    staleMs: Math.max(1_000, Number(options.staleMs || 10 * 60_000)),
  });
}

function reportDirectory(kind: LiveProviderMemorySoakReportKind) {
  return kind === "single" ? LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR : LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR;
}

function defaultReportName(report: any, kind: LiveProviderMemorySoakReportKind) {
  if (kind === "fleet" || kind === "endurance") return `${kind}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.json`;
  const runId = String(report?.runId || "").trim();
  if (!/^[a-zA-Z0-9._-]{4,200}$/.test(runId)) throw new Error("live Provider memory soak report runId is invalid");
  return `${runId}.json`;
}

function validateReportName(value: any) {
  const name = String(value || "").trim();
  if (!/^[a-zA-Z0-9._-]{4,220}\.json$/.test(name) || path.basename(name) !== name) {
    throw new Error("live Provider memory soak report file name is invalid");
  }
  return name;
}

function commitReport(report: any, kind: LiveProviderMemorySoakReportKind, fileName?: string) {
  const verification = verifyLiveProviderMemorySoakReport(report, kind);
  if (!verification.valid) throw new Error(`live Provider memory soak ${kind} report failed schema/checksum verification`);
  const directory = reportDirectory(kind);
  const name = validateReportName(fileName || defaultReportName(report, kind));
  const file = path.join(directory, name);
  fs.mkdirSync(directory, { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(5).toString("hex")}.tmp`;
  let fd: number | null = null;
  try {
    fd = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  try {
    fs.renameSync(temp, file);
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
  }
  return file;
}

export function commitLiveProviderMemorySoakReport(report: any, options: {
  kind: LiveProviderMemorySoakReportKind;
  fileName?: string;
  lockHeld?: boolean;
  lockOptions?: FileLockOptions;
}) {
  const operation = () => commitReport(report, options.kind, options.fileName);
  return options.lockHeld === true ? operation() : withLiveProviderMemorySoakReportSetLock(operation, options.lockOptions);
}
