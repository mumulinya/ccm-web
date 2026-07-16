#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const recovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const reportStore = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const reportDir = reportStore.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR;

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const item = process.argv[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else args.set(key, "true");
}
const minimumPassingGroups = Math.max(1, Number(args.get("minimum-passing-groups") || 2));
const groupPrefix = String(args.get("group-prefix") || "").trim();

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

const { report, reportFile } = reportStore.withLiveProviderMemorySoakReportSetLock(() => {
  const sourceReports = [];
  if (fs.existsSync(reportDir)) {
  for (const entry of fs.readdirSync(reportDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.startsWith("fleet-")) continue;
    try {
      const report = JSON.parse(fs.readFileSync(path.join(reportDir, entry.name), "utf8"));
      if (report?.schema === "ccm-live-provider-multi-group-memory-soak-report-v1") sourceReports.push(report);
    } catch {}
  }
  }

const sourceRows = sourceReports.flatMap(report => (Array.isArray(report.groups) ? report.groups : []).map(row => ({ ...row, sourceRunId: report.runId, sourceReportChecksum: report.reportChecksum })))
  .filter(row => !groupPrefix || String(row.groupId || "").startsWith(groupPrefix));
const seen = new Set();
const rows = sourceRows.filter(row => {
  const key = `${row.groupId}:${row.groupSessionId}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(row => {
  const continuation = soak.buildTaskAgentContinuationSoakReport({ groupId: row.groupId, groupSessionId: row.groupSessionId });
  const inventory = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: row.groupId });
  const recoveryRows = inventory.rows.filter(item => item.groupSessionId === row.groupSessionId);
  const sourcePassed = row.status === "passed" && row.receiptValid === true && row.recoveryStatus === "recovered";
  const currentValid = continuation.overall.validChainCount === 1
    && continuation.overall.invalidChainCount === 0
    && continuation.overall.liveProviderMemoryProbeReceiptRecoveryPassedCount === 1
    && recoveryRows.length === 1
    && recoveryRows[0]?.status === "recovered"
    && recoveryRows[0]?.valid === true
    && recoveryRows[0]?.receiptValid === true;
  return {
    groupId: String(row.groupId || ""),
    groupSessionId: String(row.groupSessionId || ""),
    sourceRunId: String(row.sourceRunId || ""),
    sourceReportChecksum: String(row.sourceReportChecksum || ""),
    status: sourcePassed && currentValid ? "passed" : sourcePassed ? "stale_or_invalid" : "failed_observation",
    sourcePassed,
    currentValid,
    sentinelChecksum: String(row.sentinelChecksum || ""),
    sessionChecksum: String(row.sessionChecksum || ""),
    challengeChecksum: String(row.challengeChecksum || ""),
    recoveryIdChecksum: String(row.recoveryIdChecksum || ""),
    continuationValidChainCount: Number(continuation.overall.validChainCount || 0),
    receiptRecoveryPassedCount: Number(continuation.overall.liveProviderMemoryProbeReceiptRecoveryPassedCount || 0),
    recoveryInventoryCount: recoveryRows.length,
  };
});

const passingRows = rows.filter(row => row.status === "passed");
const failedRows = rows.filter(row => row.status === "failed_observation");
const staleRows = rows.filter(row => row.status === "stale_or_invalid");
const passingIsolationValid = new Set(passingRows.map(row => row.groupId)).size === passingRows.length
  && new Set(passingRows.map(row => row.groupSessionId)).size === passingRows.length
  && new Set(passingRows.map(row => row.sentinelChecksum)).size === passingRows.length
  && new Set(passingRows.map(row => row.challengeChecksum)).size === passingRows.length;
const unsigned = {
  schema: "ccm-live-provider-multi-group-memory-fleet-report-v1",
  version: 1,
  generatedAt: new Date().toISOString(),
  minimumPassingGroups,
  sourceReportCount: sourceReports.length,
  observedGroupCount: rows.length,
  passingGroupCount: passingRows.length,
  failedObservationCount: failedRows.length,
  staleOrInvalidCount: staleRows.length,
  passingIsolationValid,
  gatePassed: passingRows.length >= minimumPassingGroups && passingIsolationValid && staleRows.length === 0,
  groups: rows,
};
  const report = { ...unsigned, reportChecksum: digest(JSON.stringify(canonical(unsigned))) };
  const reportFile = reportStore.commitLiveProviderMemorySoakReport(report, { kind: "fleet", lockHeld: true });
  return { report, reportFile };
});
console.log(`PHASE365_LIVE_MULTI_GROUP_MEMORY_FLEET=${JSON.stringify({ ...report, reportFile })}`);
if (!report.gatePassed) process.exitCode = 1;
