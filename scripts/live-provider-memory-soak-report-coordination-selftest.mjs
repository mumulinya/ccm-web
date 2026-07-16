import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}

function report(unsigned) {
  return { ...unsigned, reportChecksum: digest(unsigned) };
}

function waitForFile(file, timeoutMs = 10_000) {
  const end = Date.now() + timeoutMs;
  const sleep = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < end) {
    if (fs.existsSync(file)) return;
    Atomics.wait(sleep, 0, 0, 20);
  }
  throw new Error(`timed out waiting for ${file}`);
}

function parseResult(output, label) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`${label}=`));
  if (!line) throw new Error(`${label} missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

function spawnWorker(workerMode, env) {
  const child = spawn(process.execPath, [scriptFile, workerMode], { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let closed = false;
  const done = new Promise(resolve => {
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("close", code => { closed = true; resolve({ code, stdout, stderr }); });
    child.on("error", error => { closed = true; resolve({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }); });
  });
  return { child, done, get closed() { return closed; } };
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-report-coordination-"));
  const stateFile = path.join(home, "phase367-state.json");
  const marker = path.join(home, "phase367-marker");
  const release = path.join(home, "phase367-release");
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE367_HOME: home, PHASE367_STATE: stateFile, PHASE367_MARKER: marker, PHASE367_RELEASE: release };
  let checks = 0;
  const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
  const ok = (value, message) => { checks += 1; assert.ok(value, message); };
  try {
    const setupRun = spawnSync(process.execPath, [scriptFile, "setup"], { cwd: root, env, encoding: "utf8", timeout: 30_000 });
    equal(setupRun.status, 0, setupRun.stderr || setupRun.stdout);
    const setup = parseResult(setupRun.stdout, "PHASE367_SETUP");
    equal(setup.reportCount, 4, "setup should commit four reports");

    const fleet = spawnWorker("fleet-hold", env);
    waitForFile(marker);
    const retention = spawnWorker("retention", env);
    await new Promise(resolve => setTimeout(resolve, 500));
    equal(retention.closed, false, "retention must wait while fleet commit owns the report-set lock");
    ok(fs.existsSync(setup.files.singleProtected), "referenced child must exist while retention waits");
    ok(fs.existsSync(setup.files.multiProtected), "referenced multi report must exist while retention waits");
    fs.writeFileSync(release, "release\n", "utf8");
    const fleetDone = await fleet.done;
    const retentionDone = await retention.done;
    equal(fleetDone.code, 0, fleetDone.stderr || fleetDone.stdout);
    equal(retentionDone.code, 0, retentionDone.stderr || retentionDone.stdout);
    const retentionResult = parseResult(retentionDone.stdout, "PHASE367_RETENTION");
    equal(retentionResult.prunedCount, 2, "retention should prune only unreferenced old reports");
    equal(retentionResult.skippedCount, 0, "coordinated retention should not skip stable candidates");
    equal(retentionResult.reportSetLockHeld, true, "execute audit should prove report-set lock ownership");
    ok(fs.existsSync(setup.files.singleProtected), "fleet reference should protect child report");
    ok(fs.existsSync(setup.files.multiProtected), "fleet reference should protect source report");
    equal(fs.existsSync(setup.files.singleUnreferenced), false, "unreferenced child should be pruned");
    equal(fs.existsSync(setup.files.multiUnreferenced), false, "unreferenced multi report should be pruned");

    fs.rmSync(marker, { force: true });
    fs.rmSync(release, { force: true });
    const holder = spawnWorker("hold-lock", env);
    waitForFile(marker);
    const writer = spawnWorker("writer", env);
    await new Promise(resolve => setTimeout(resolve, 500));
    equal(writer.closed, false, "writer must wait while another process owns the report-set lock");
    fs.writeFileSync(release, "release\n", "utf8");
    const holderDone = await holder.done;
    const writerDone = await writer.done;
    equal(holderDone.code, 0, holderDone.stderr || holderDone.stdout);
    equal(writerDone.code, 0, writerDone.stderr || writerDone.stdout);
    const writerResult = parseResult(writerDone.stdout, "PHASE367_WRITER");
    ok(fs.existsSync(writerResult.file), "blocked writer should commit after lock release");

    fs.rmSync(marker, { force: true });
    fs.rmSync(release, { force: true });
    const crashRun = spawnSync(process.execPath, [scriptFile, "crash-lock"], { cwd: root, env, encoding: "utf8", timeout: 30_000 });
    equal(crashRun.status, 73, "crash worker should exit while owning the lock");
    const crashState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    ok(fs.existsSync(crashState.lockFile), "crashed process should leave a durable lock file");
    const recoveryRun = spawnSync(process.execPath, [scriptFile, "writer"], { cwd: root, env, encoding: "utf8", timeout: 30_000 });
    equal(recoveryRun.status, 0, recoveryRun.stderr || recoveryRun.stdout);
    const recoveryWriter = parseResult(recoveryRun.stdout, "PHASE367_WRITER");
    ok(fs.existsSync(recoveryWriter.file), "new writer should recover an abandoned local lock");
    equal(fs.existsSync(crashState.lockFile), false, "recovered lock should be released after commit");

    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8", timeout: 30_000 });
    equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseResult(restartRun.stdout, "PHASE367_RESTART");
    equal(restart.referencedSingleCount, 1, "restart should rebuild the protected child edge");
    equal(restart.referencedMultiCount, 1, "restart should rebuild the protected multi edge");
    equal(restart.prunableCount, 0, "restart should not expose a protected report as prunable");
    equal(restart.coordinated, true, "inventory should expose all coordinated writer kinds");
    equal(restart.memoryCenterCoordinated, true, "Memory Center should expose shared-lock coordination");
    equal(restart.tamperedCommitRejected, true, "report store should reject a tampered checksum");
    equal(restart.pathTraversalRejected, true, "report store should reject a path-traversing file name");
    equal(restart.temporaryFileCount, 0, "atomic commits should leave no temporary files");
    equal(restart.lowerEvidencePreserved, true, "report coordination must not touch lower memory evidence");
    ok(restart.auditCount >= 1, "retention execute should leave a durable audit");
    equal(restart.auditBodyFree, true, "coordination audit must remain body-free");
    console.log(JSON.stringify({ pass: true, checks, pruned: retentionResult.prunedCount, staleLockRecovered: true, reportCount: restart.reportCount }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE367_HOME;
const stateFile = process.env.PHASE367_STATE;
const marker = process.env.PHASE367_MARKER;
const release = process.env.PHASE367_RELEASE;
if (!home || !stateFile) throw new Error("Phase 367 worker environment is incomplete");
const require = createRequire(import.meta.url);
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const nowMs = Date.parse("2026-07-16T10:00:00.000Z");
const oldAt = new Date(nowMs - 40 * 24 * 60 * 60_000).toISOString();
const policy = { nowMs, singleRetentionDays: 10, multiRetentionDays: 10, fleetRetentionDays: 90, graceHours: 0, minimumSingleReports: 0, minimumMultiReports: 0, minimumFleetReports: 1, maximumSingleReports: 20, maximumMultiReports: 20, maximumFleetReports: 20 };

if (mode === "setup") {
  const singleProtected = report({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "phase367-single-protected", generatedAt: oldAt, groupId: "phase367-protected", groupSessionId: "gcs_phase367_protected", providers: [] });
  const singleUnreferenced = report({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "phase367-single-unreferenced", generatedAt: oldAt, groupId: "phase367-unreferenced", groupSessionId: "gcs_phase367_unreferenced", providers: [] });
  const singleProtectedFile = store.commitLiveProviderMemorySoakReport(singleProtected, { kind: "single" });
  const singleUnreferencedFile = store.commitLiveProviderMemorySoakReport(singleUnreferenced, { kind: "single" });
  const multiProtected = report({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: "phase367-multi-protected", generatedAt: oldAt, groups: [{ groupId: "phase367-protected", groupSessionId: "gcs_phase367_protected", childReportChecksum: singleProtected.reportChecksum }] });
  const multiUnreferenced = report({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: "phase367-multi-unreferenced", generatedAt: oldAt, groups: [] });
  const multiProtectedFile = store.commitLiveProviderMemorySoakReport(multiProtected, { kind: "multi" });
  const multiUnreferencedFile = store.commitLiveProviderMemorySoakReport(multiUnreferenced, { kind: "multi" });
  const lowerEvidenceFiles = [
    path.join(home, ".cc-connect", "memory-context-consumption-receipts", "phase367.json"),
    path.join(home, ".cc-connect", "memory-context-consumption-recoveries", "phase367.json"),
    path.join(home, ".cc-connect", "task-agent-continuation-soak", "phase367.jsonl"),
  ];
  for (const file of lowerEvidenceFiles) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "lower evidence\n", "utf8"); }
  const state = { policy, singleChecksum: singleProtected.reportChecksum, multiChecksum: multiProtected.reportChecksum, files: { singleProtected: singleProtectedFile, singleUnreferenced: singleUnreferencedFile, multiProtected: multiProtectedFile, multiUnreferenced: multiUnreferencedFile }, lowerEvidenceFiles, lockFile: `${store.LIVE_PROVIDER_MEMORY_SOAK_REPORT_SET_LOCK_TARGET}.lock` };
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE367_SETUP=${JSON.stringify({ reportCount: 4, files: state.files })}`);
  process.exit(0);
}

if (mode === "fleet-hold") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  store.withLiveProviderMemorySoakReportSetLock(() => {
    const fleet = report({ schema: "ccm-live-provider-multi-group-memory-fleet-report-v1", version: 1, generatedAt: oldAt, groups: [{ groupId: "phase367-protected", groupSessionId: "gcs_phase367_protected", sourceReportChecksum: state.multiChecksum }] });
    store.commitLiveProviderMemorySoakReport(fleet, { kind: "fleet", fileName: "fleet-phase367-protected.json", lockHeld: true });
    fs.writeFileSync(marker, "held\n", "utf8");
    waitForFile(release);
  });
  process.exit(0);
}

if (mode === "retention") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const result = retention.reconcileLiveProviderMemorySoakReports({ ...state.policy, prune: true, dryRun: false, lockTimeoutMs: 15_000 });
  console.log(`PHASE367_RETENTION=${JSON.stringify({ prunedCount: result.pruned.length, skippedCount: result.skipped.length, reportSetLockHeld: result.audit.reportSetLockHeld })}`);
  process.exit(0);
}

if (mode === "hold-lock") {
  store.withLiveProviderMemorySoakReportSetLock(() => {
    fs.writeFileSync(marker, "held\n", "utf8");
    waitForFile(release);
  });
  process.exit(0);
}

if (mode === "writer") {
  const runId = `phase367-writer-${process.pid}-${Date.now()}`;
  const single = report({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId, generatedAt: new Date().toISOString(), groupId: `phase367-writer-${process.pid}`, groupSessionId: `gcs_phase367_writer_${process.pid}`, providers: [] });
  const file = store.commitLiveProviderMemorySoakReport(single, { kind: "single" });
  console.log(`PHASE367_WRITER=${JSON.stringify({ file, checksum: single.reportChecksum })}`);
  process.exit(0);
}

if (mode === "crash-lock") {
  store.withLiveProviderMemorySoakReportSetLock(() => {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    process.exit(73);
  });
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const inventory = retention.buildLiveProviderMemorySoakRetentionInventory(state.policy);
  const auditFile = path.join(home, ".cc-connect", "reliability", "live-provider-memory-soak-retention-audit.jsonl");
  const audits = fs.readFileSync(auditFile, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: "phase367-protected" });
  const invalid = report({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "phase367-invalid-commit", generatedAt: new Date().toISOString(), groupId: "phase367-invalid", groupSessionId: "gcs_phase367_invalid", providers: [] });
  invalid.reportChecksum = "0".repeat(64);
  let tamperedCommitRejected = false;
  try { store.commitLiveProviderMemorySoakReport(invalid, { kind: "single" }); } catch { tamperedCommitRejected = true; }
  const traversal = report({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: "phase367-traversal-commit", generatedAt: new Date().toISOString(), groupId: "phase367-traversal", groupSessionId: "gcs_phase367_traversal", providers: [] });
  let pathTraversalRejected = false;
  try { store.commitLiveProviderMemorySoakReport(traversal, { kind: "single", fileName: "../phase367-escape.json" }); } catch { pathTraversalRejected = true; }
  const temporaryFileCount = [store.LIVE_PROVIDER_MEMORY_SOAK_SINGLE_REPORT_DIR, store.LIVE_PROVIDER_MEMORY_SOAK_MULTI_REPORT_DIR]
    .flatMap(directory => fs.existsSync(directory) ? fs.readdirSync(directory) : [])
    .filter(name => name.endsWith(".tmp")).length;
  console.log(`PHASE367_RESTART=${JSON.stringify({ reportCount: inventory.summary.reportCount, referencedSingleCount: inventory.summary.referencedSingleCount, referencedMultiCount: inventory.summary.referencedMultiCount, prunableCount: inventory.summary.prunableCount, coordinated: inventory.coordination?.sharedReportSetLock === true && inventory.coordination?.coordinatedWriterKinds?.length === 4, memoryCenterCoordinated: memoryCenter.overall?.liveProviderReportRetentionCoordinated === true, tamperedCommitRejected, pathTraversalRejected, temporaryFileCount, lowerEvidencePreserved: state.lowerEvidenceFiles.every(file => fs.existsSync(file)), auditCount: audits.length, auditBodyFree: audits.every(row => row.reportSetLockHeld === true && !JSON.stringify(row).includes("phase367-protected")) })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 367 mode: ${mode}`);
