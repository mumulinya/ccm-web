#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const childScript = path.join(root, "scripts", "task-agent-live-provider-native-memory-soak.mjs");
const require = createRequire(import.meta.url);
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const recovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const reportStore = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const item = process.argv[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, "true");
  }
}

const fixtureAdapter = String(process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE || "").trim();
const live = args.get("live") === "true" || process.env.CCM_RUN_LIVE_PROVIDER_MEMORY_SOAK === "1";
const groupCount = Math.max(1, Math.min(8, Number(args.get("groups") || process.env.CCM_LIVE_MULTI_GROUP_COUNT || 2)));
const concurrency = Math.max(1, Math.min(3, Number(args.get("concurrency") || process.env.CCM_LIVE_MULTI_GROUP_CONCURRENCY || 1)));
const timeoutMs = Math.max(15_000, Math.min(300_000, Number(args.get("timeout-ms") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_TIMEOUT_MS || 120_000)));
const codexModel = String(args.get("codex-model") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CODEX_MODEL || "gpt-5.4-mini");
const provider = runtime.normalizeAgentRuntimeId(String(args.get("provider") || "codex"));
if (!["claudecode", "codex", "cursor"].includes(provider)) throw new Error("live multi-group memory soak provider is unsupported");
const providerModel = String(args.get("model") || (provider === "claudecode"
  ? process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CLAUDE_MODEL || "sonnet"
  : provider === "cursor"
    ? process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CURSOR_MODEL || "gpt-5.4-mini-none"
    : codexModel));
const groupPrefix = String(args.get("group-prefix") || process.env.CCM_LIVE_MULTI_GROUP_PREFIX || "phase365-live-group").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "phase365-live-group";
const runId = `lpmg_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;

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

function terminateTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else {
    try { process.kill(pid, "SIGKILL"); } catch {}
  }
}

function runChild(index) {
  const groupId = `${groupPrefix}-${runId}-${index + 1}`;
  const groupSessionId = `gcs_${runId}_${index + 1}`;
  const childArgs = [
    childScript,
    ...(live ? ["--live"] : []),
    "--providers", provider,
    "--timeout-ms", String(timeoutMs),
    ...(provider === "claudecode" ? ["--claude-model", providerModel] : provider === "cursor" ? ["--cursor-model", providerModel] : ["--codex-model", providerModel, "--codex-receipt-recovery"]),
    "--group-id", groupId,
    "--group-session-id", groupSessionId,
  ];
  return new Promise(resolve => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const childEnv = { ...process.env, CCM_CONTINUATION_SOAK_EPOCH: `svc_${runId}_${index + 1}` };
    if (fixtureAdapter && childEnv.CCM_PHASE363_FIXTURE_STATE) childEnv.CCM_PHASE363_FIXTURE_STATE = `${childEnv.CCM_PHASE363_FIXTURE_STATE}.${index + 1}`;
    const child = spawn(process.execPath, childArgs, {
      cwd: root,
      env: childEnv,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      terminateTree(child.pid);
    }, timeoutMs * 2 + 60_000);
    const finish = (code, issue = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ index, groupId, groupSessionId, code: Number.isInteger(code) ? code : -1, timedOut, issue, durationMs: Date.now() - startedAt, stdout, stderr });
    };
    child.stdout.on("data", chunk => { if (stdout.length < 4 * 1024 * 1024) stdout += String(chunk); });
    child.stderr.on("data", chunk => { if (stderr.length < 512 * 1024) stderr += String(chunk); });
    child.on("error", () => finish(-1, "child_spawn_failed"));
    child.on("close", code => finish(code, timedOut ? "child_timeout" : code === 0 ? "" : "child_failed"));
  });
}

function parseChildReport(output) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith("PHASE363_LIVE_PROVIDER_MEMORY_SOAK="));
  if (!line) return null;
  try { return JSON.parse(line.slice(line.indexOf("=") + 1)); } catch { return null; }
}

async function runPool() {
  const results = new Array(groupCount);
  let cursor = 0;
  const worker = async () => {
    while (cursor < groupCount) {
      const index = cursor;
      cursor += 1;
      results[index] = await runChild(index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, groupCount) }, () => worker()));
  return results;
}

if (!live && !fixtureAdapter) {
  console.error("Live multi-group memory soak is disabled. Re-run with --live or configure the deterministic fixture adapter.");
  process.exit(2);
}

const startedAt = new Date().toISOString();
const childRuns = await runPool();
const childReports = childRuns.map(child => parseChildReport(child.stdout));
const rows = childRuns.map(child => {
  const report = childReports[child.index];
  const provider = report?.providers?.[0] || null;
  const continuation = soak.buildTaskAgentContinuationSoakReport({ groupId: child.groupId, groupSessionId: child.groupSessionId });
  const inventory = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: child.groupId });
  const recoveryRows = inventory.rows.filter(item => item.groupSessionId === child.groupSessionId);
  const memoryContinuityMode = provider.provider === "codex" ? "receipt_recovery" : "native_session_resume";
  const memoryContinuityVerified = memoryContinuityMode === "receipt_recovery"
    ? provider?.receiptRecovery?.recovered === true && provider?.receiptRecovery?.receiptValid === true && provider?.receiptRecovery?.suppressTaskReplay !== true
    : provider?.status === "passed" && provider?.initial?.status === "passed" && provider?.resume?.status === "passed" && /^[a-f0-9]{64}$/.test(String(provider?.sessionChecksum || ""));
  const issues = [];
  if (child.code !== 0 || child.timedOut) issues.push(child.issue || "child_failed");
  if (!report || report.groupId !== child.groupId || report.groupSessionId !== child.groupSessionId) issues.push("child_report_identity_mismatch");
  if (report?.passedCount !== 1 || !memoryContinuityVerified) issues.push(memoryContinuityMode === "receipt_recovery" ? "child_receipt_recovery_unproven" : "child_native_session_memory_unproven");
  if (continuation.overall.validChainCount !== 1 || continuation.overall.invalidChainCount !== 0) issues.push("child_continuation_chain_invalid");
  if (memoryContinuityMode === "receipt_recovery" && continuation.overall.liveProviderMemoryProbeReceiptRecoveryPassedCount !== 1) issues.push("child_continuation_receipt_counter_missing");
  if (memoryContinuityMode === "receipt_recovery" && (recoveryRows.length !== 1 || recoveryRows[0]?.status !== "recovered" || recoveryRows[0]?.valid !== true || recoveryRows[0]?.receiptValid !== true)) issues.push("child_recovery_inventory_invalid");
  if (memoryContinuityMode === "native_session_resume" && recoveryRows.length !== 0) issues.push("child_native_session_unexpected_recovery_inventory");
  return {
    index: child.index + 1,
    groupId: child.groupId,
    groupSessionId: child.groupSessionId,
    status: issues.length ? "failed" : "passed",
    issues: [...new Set(issues)],
    durationMs: child.durationMs,
    childReportChecksum: String(report?.reportChecksum || ""),
    sentinelChecksum: String(provider?.sentinelChecksum || ""),
    sessionChecksum: String(provider?.sessionChecksum || ""),
    challengeChecksum: String(provider?.receiptRecovery?.challengeChecksum || ""),
    recoveryIdChecksum: digest(provider?.receiptRecovery?.recoveryId || ""),
    memoryContinuityMode,
    memoryContinuityVerified,
    recoveryStatus: memoryContinuityMode === "receipt_recovery" ? String(provider?.receiptRecovery?.status || "") : memoryContinuityVerified ? "native_session_resume_verified" : "native_session_resume_unverified",
    receiptValid: memoryContinuityVerified,
    continuationValidChainCount: Number(continuation.overall.validChainCount || 0),
    recoveryInventoryCount: recoveryRows.length,
  };
});

const { report, reportFile } = reportStore.withLiveProviderMemorySoakReportSetLock(() => {
  for (let index = 0; index < rows.length; index += 1) {
    const childReport = childReports[index];
    let durableValid = false;
    try {
      const file = path.resolve(String(childReport?.reportFile || ""));
      const relative = path.relative(path.resolve(reportStore.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR), file);
      const inside = !!relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
      const durable = inside ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
      const verification = reportStore.verifyLiveProviderMemorySoakReport(durable, "single");
      durableValid = verification.valid === true
        && verification.reportChecksum === rows[index].childReportChecksum
        && durable?.groupId === rows[index].groupId
        && durable?.groupSessionId === rows[index].groupSessionId;
    } catch {}
    if (!durableValid) {
      rows[index].issues.push("child_report_not_durable_at_multi_commit");
      rows[index].status = "failed";
    }
  }
  const uniqueGroupIds = new Set(rows.map(row => row.groupId)).size;
  const uniqueGroupSessions = new Set(rows.map(row => row.groupSessionId)).size;
  const uniqueSentinels = new Set(rows.map(row => row.sentinelChecksum).filter(Boolean)).size;
  const uniqueChallenges = new Set(rows.map(row => row.challengeChecksum).filter(Boolean)).size;
  const challengeIsolationValid = provider === "codex" ? uniqueChallenges === groupCount : uniqueChallenges === 0;
  const isolationValid = uniqueGroupIds === groupCount && uniqueGroupSessions === groupCount && uniqueSentinels === groupCount && challengeIsolationValid;
  if (!isolationValid) rows.forEach(row => { if (!row.issues.includes("cross_group_identity_collision")) row.issues.push("cross_group_identity_collision"); row.status = "failed"; });
  const unsigned = {
    schema: "ccm-live-provider-multi-group-memory-soak-report-v1",
    version: 1,
    runId,
    startedAt,
    generatedAt: new Date().toISOString(),
    accountBacked: !fixtureAdapter,
    provider,
    model: providerModel,
    requestedGroupCount: groupCount,
    concurrency,
    timeoutMs,
    passedCount: rows.filter(row => row.status === "passed").length,
    failedCount: rows.filter(row => row.status !== "passed").length,
    isolationValid,
    uniqueGroupIds,
    uniqueGroupSessions,
    uniqueSentinels,
    uniqueChallenges,
    challengeIsolationRequired: provider === "codex",
    challengeIsolationValid,
    groups: rows,
  };
  const report = { ...unsigned, reportChecksum: digest(JSON.stringify(canonical(unsigned))) };
  const reportFile = reportStore.commitLiveProviderMemorySoakReport(report, { kind: "multi", fileName: `${runId}.json`, lockHeld: true });
  return { report, reportFile };
});
console.log(`PHASE365_LIVE_MULTI_GROUP_MEMORY_SOAK=${JSON.stringify({ ...report, reportFile })}`);
if (report.passedCount !== groupCount || !report.isolationValid) process.exitCode = 1;
