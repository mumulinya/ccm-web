import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseWorker(output, provider) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE374_${provider}=`));
  if (!line) throw new Error(`Phase 374 ${provider} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const rootHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-cross-provider-canary-"));
  try {
    const results = [];
    for (const provider of ["claudecode", "cursor"]) {
      const home = path.join(rootHome, provider);
      fs.mkdirSync(home, { recursive: true });
      const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE374_HOME: home, PHASE374_PROVIDER: provider };
      const run = spawnSync(process.execPath, [scriptFile, "worker"], { cwd: root, env, encoding: "utf8", timeout: 120_000, maxBuffer: 10 * 1024 * 1024 });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      results.push(parseWorker(run.stdout, provider));
    }
    console.log(JSON.stringify({ pass: true, checks: results.reduce((sum, row) => sum + Number(row.checks || 0), 0), providers: results }, null, 2));
  } finally {
    fs.rmSync(rootHome, { recursive: true, force: true });
  }
  process.exit(0);
}

if (mode !== "worker") throw new Error(`unknown Phase 374 mode:${mode}`);
const home = process.env.PHASE374_HOME;
const provider = process.env.PHASE374_PROVIDER;
if (!home || !["claudecode", "cursor"].includes(provider)) throw new Error("Phase 374 worker environment is incomplete");
const bin = path.join(home, "bin");
fs.mkdirSync(bin, { recursive: true });
const commandName = provider === "claudecode" ? "claude" : "cursor-agent";
const commandFile = process.platform === "win32" ? path.join(bin, `${commandName}.cmd`) : path.join(bin, commandName);
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH || ""}`;
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const store = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
const transition = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-version-transition-ledger.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const multiScript = path.join(root, "scripts", "task-agent-live-multi-group-memory-soak.mjs");
const fixtureFile = path.join(home, "native-session-fixture.mjs");
const fixtureState = path.join(home, "fixture-state.json");
const model = provider === "claudecode" ? "phase374-sonnet" : "phase374-cursor-model";
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

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

function signed(unsigned) {
  return { ...unsigned, reportChecksum: digest(unsigned) };
}

function writeRuntime(version, stamp) {
  fs.writeFileSync(commandFile, process.platform === "win32" ? `@echo off\r\necho ${commandName} ${version}\r\n` : `#!/bin/sh\necho ${commandName} ${version}\n`, { encoding: "utf8", mode: 0o700 });
  const at = new Date(Date.now() + stamp * 4_000);
  fs.utimesSync(commandFile, at, at);
  const snapshot = runtime.captureAgentRuntimeVersionSnapshot(provider);
  equal(snapshot.status, "ok", `${provider} ${version} should be available`);
  equal(snapshot.semanticVersion, version, `${provider} ${version} should be detected`);
  return snapshot;
}

function commitBaseline(runId, generatedAt, snapshot) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `phase374-${provider}-${runId}-${index + 1}`;
    const groupSessionId = `gcs_phase374_${provider}_${runId}_${index + 1}`;
    const child = signed({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: `${runId}-child-${index + 1}`, generatedAt, accountBacked: true, groupId, groupSessionId, passedCount: 1, providers: [{ provider, version: snapshot.semanticVersion, model, providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum, status: "passed", issue: "", sentinelChecksum: digest(`${runId}:sentinel:${index}`), sessionChecksum: digest(`${runId}:session:${index}`), initial: { status: "passed" }, resume: { status: "passed" }, receiptRecovery: null, workspaceUnchanged: true }] });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId, groupSessionId, status: "passed", issues: [], durationMs: 35_000 + index * 1_000, childReportChecksum: child.reportChecksum, memoryContinuityMode: "native_session_resume", memoryContinuityVerified: true, recoveryStatus: "native_session_resume_verified", receiptValid: true });
  }
  const source = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId, generatedAt, accountBacked: true, provider, model, requestedGroupCount: 2, concurrency: 1, passedCount: 2, failedCount: 0, isolationValid: true, groups });
  store.commitLiveProviderMemorySoakReport(source, { kind: "multi" });
}

function commitCanary(plan, snapshot, suffix, badNativeResume = false) {
  const groups = [];
  for (let index = 0; index < 2; index += 1) {
    const groupId = `${plan.groupPrefix}-${suffix}-${index + 1}`;
    const groupSessionId = `gcs_phase374_canary_${provider}_${suffix}_${index + 1}`;
    const child = signed({ schema: "ccm-live-provider-native-memory-soak-report-v2", version: 2, runId: `phase374-${provider}-${suffix}-child-${index + 1}`, generatedAt: new Date().toISOString(), accountBacked: true, groupId, groupSessionId, passedCount: 1, providers: [{ provider, version: snapshot.semanticVersion, model, providerRuntimeIdentityChecksum: snapshot.executableIdentityChecksum, status: "passed", issue: "", sentinelChecksum: digest(`${suffix}:sentinel:${index}`), sessionChecksum: digest(`${suffix}:session:${index}`), initial: { status: "passed" }, resume: { status: badNativeResume && index === 1 ? "memory_unverified" : "passed" }, receiptRecovery: null, workspaceUnchanged: true }] });
    store.commitLiveProviderMemorySoakReport(child, { kind: "single" });
    groups.push({ groupId, groupSessionId, status: "passed", issues: [], durationMs: 38_000 + index * 1_000, childReportChecksum: child.reportChecksum, memoryContinuityMode: "native_session_resume", memoryContinuityVerified: true, recoveryStatus: "native_session_resume_verified", receiptValid: true });
  }
  const report = signed({ schema: "ccm-live-provider-multi-group-memory-soak-report-v1", version: 1, runId: `phase374-${provider}-${suffix}-multi`, generatedAt: new Date().toISOString(), accountBacked: true, provider, model, requestedGroupCount: 2, concurrency: 1, passedCount: 2, failedCount: 0, isolationValid: true, groups });
  const reportFile = store.commitLiveProviderMemorySoakReport(report, { kind: "multi" });
  return { exitCode: 0, reportFile, reportChecksum: report.reportChecksum };
}

fs.writeFileSync(fixtureFile, String.raw`import fs from "node:fs";
const [provider, stage, requestedSessionId, prompt] = process.argv.slice(2);
const stateFile = process.env.CCM_PHASE363_FIXTURE_STATE;
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
const sessionId = requestedSessionId || state.sessionId || "phase374-native-session";
if (stage === "initial") {
  state.sessionId = sessionId;
  state.sentinel = String(prompt || "").match(/CCM_PHASE363_[A-Z]+_[a-f0-9]+/)?.[0] || "";
  fs.writeFileSync(stateFile, JSON.stringify(state), "utf8");
}
const text = stage === "initial" ? "INITIAL_OK" : state.sentinel;
console.log(JSON.stringify({ type: "system", subtype: "init", session_id: sessionId }));
console.log(JSON.stringify({ type: "result", subtype: "success", result: text, session_id: sessionId }));
`, "utf8");

const v1 = writeRuntime("1.0.0", 1);
const fixtureRun = spawnSync(process.execPath, [multiScript, "--provider", provider, "--model", model, "--groups", "2", "--concurrency", "1", "--timeout-ms", "10000", "--group-prefix", `phase374-fixture-${provider}`], {
  cwd: root,
  env: { ...process.env, HOME: home, USERPROFILE: home, CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE: fixtureFile, CCM_PHASE363_FIXTURE_STATE: fixtureState, CCM_CONTINUATION_SOAK_EPOCH: `svc_phase374_${provider}` },
  encoding: "utf8",
  timeout: 120_000,
  maxBuffer: 8 * 1024 * 1024,
});
equal(fixtureRun.status, 0, fixtureRun.stderr || fixtureRun.stdout);
const fixtureLine = String(fixtureRun.stdout || "").split(/\r?\n/).find(line => line.startsWith("PHASE365_LIVE_MULTI_GROUP_MEMORY_SOAK="));
ok(fixtureLine, `${provider} generic multi report should be emitted`);
const fixtureReport = JSON.parse(fixtureLine.slice(fixtureLine.indexOf("=") + 1));
equal(fixtureReport.provider, provider, "multi report should preserve selected Provider");
equal(fixtureReport.model, model, "multi report should preserve selected model");
equal(fixtureReport.passedCount, 2, "both native-session groups should pass");
equal(fixtureReport.isolationValid, true, "native-session groups should remain isolated");
equal(fixtureReport.challengeIsolationRequired, false, "non-Codex provider should not invent challenge ids");
equal(fixtureReport.uniqueChallenges, 0, "non-Codex provider should retain zero challenge ids");
ok(fixtureReport.groups.every(row => row.memoryContinuityMode === "native_session_resume" && row.memoryContinuityVerified === true && row.recoveryInventoryCount === 0), "each group should prove native same-session recall without CCM recovery inventory");

commitBaseline(`phase374-${provider}-base-a`, "2026-07-16T01:00:00.000Z", v1);
commitBaseline(`phase374-${provider}-base-b`, "2026-07-16T02:00:00.000Z", v1);
const baseline = endurance.auditLiveProviderMemoryEndurance({ provider });
equal(baseline.gatePassed, true, `${provider} baseline should pass`);
equal(baseline.providerFilter, provider, "endurance report should be Provider-scoped");
equal(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider }).approvable, true, `${provider} ordinary approval should support proven runtime`);
const v2 = writeRuntime("2.0.0", 2);
const preview = approval.buildLiveProviderMemoryVersionTransitionCanaryPreview({ provider });
equal(preview.approvable, true, `${provider} drift should offer transition canary`);
equal(preview.plan.provider, provider, "canary plan should preserve Provider");
equal(preview.plan.groups, 2, "canary should remain two groups");
equal(preview.plan.concurrency, 1, "canary should remain concurrency one");
const receipt = approval.createLiveProviderMemoryVersionTransitionCanaryApproval({ explicitApproval: true, riskAccepted: true, transitionAcknowledged: true, approvedBy: "phase374-user", enduranceReportChecksum: preview.enduranceReportChecksum, planChecksum: preview.planChecksum, provider });
const completed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: receipt.receiptId, receiptChecksum: receipt.receiptChecksum, explicitExecution: true, executionActor: "phase374-runner" }, plan => commitCanary(plan, v2, "success"));
equal(completed.status, "completed", `${provider} native-session canary should complete`);
equal(completed.evidencePromotionStatus, "promoted", `${provider} canary should promote endurance evidence`);
equal(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider }).approvable, true, `${provider} promotion should reopen ordinary approval`);
equal(approval.buildLiveProviderMemoryVersionTransitionCanaryPreview({ provider }).approvable, false, `${provider} promoted identity should no longer need canary`);
const ledger = transition.readLiveProviderMemoryVersionTransitionLedger();
equal(ledger.valid, true, `${provider} transition ledger should verify`);
equal(ledger.verifiedCount, 1, `${provider} transition should be verified`);

const v3 = writeRuntime("3.0.0", 3);
const badPreview = approval.buildLiveProviderMemoryVersionTransitionCanaryPreview({ provider });
const badReceipt = approval.createLiveProviderMemoryVersionTransitionCanaryApproval({ explicitApproval: true, riskAccepted: true, transitionAcknowledged: true, approvedBy: "phase374-user", enduranceReportChecksum: badPreview.enduranceReportChecksum, planChecksum: badPreview.planChecksum, provider });
const failed = approval.executeApprovedLiveProviderMemoryWave({ receiptId: badReceipt.receiptId, receiptChecksum: badReceipt.receiptChecksum, explicitExecution: true }, plan => commitCanary(plan, v3, "bad-native-resume", true));
equal(failed.status, "execution_failed", `${provider} missing native resume proof should fail`);
ok(failed.executionIssues.includes("transition_canary_native_session_memory_unproven"), "failure should identify native-session proof");
equal(failed.evidencePromotionStatus, "not_run", "invalid native-session evidence should not run promotion");
equal(approval.buildLiveProviderMemoryWaveApprovalPreview({ provider }).approvable, false, "failed new identity should remain unproven");
const memoryCenter = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: `phase374-${provider}-phase374-${provider}-base-a-1` });
equal(memoryCenter.liveProviderMemoryWaveApprovalProviderPreviews.length, 3, "Memory Center should expose three Provider approval previews");
equal(memoryCenter.liveProviderMemoryVersionTransitionCanaryProviderPreviews.length, 3, "Memory Center should expose three Provider canary previews");
equal(memoryCenter.liveProviderMemoryVersionTransitionCanaryProviderPreviews.find(row => row.plan?.provider === provider)?.approvable, true, "Memory Center should retain current Provider canary readiness");
equal(memoryCenter.liveProviderMemoryWaveApprovalProviderPreviews.find(row => row.plan?.provider === provider)?.approvable, false, "Memory Center should keep failed new identity out of ordinary approval");
const cliPreview = spawnSync(process.execPath, [path.join(root, "scripts", "task-agent-live-memory-wave-approval.mjs"), "transition-preview", "--provider", provider], { cwd: root, env: process.env, encoding: "utf8", timeout: 30_000 });
equal(cliPreview.status, 0, "Provider-scoped transition CLI should respond");
ok(String(cliPreview.stdout || "").includes(`\"provider\":\"${provider}\"`) && String(cliPreview.stdout || "").includes('"approvable":true'), "Provider-scoped CLI should expose exact canary readiness");

console.log(`PHASE374_${provider}=${JSON.stringify({ checks, provider, promoted: completed.evidencePromotionStatus, nativeFailure: failed.status })}`);
