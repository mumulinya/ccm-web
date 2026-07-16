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

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE362_STAGE_${stage}=`));
  if (!line) throw new Error(`phase362 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-recovery-provider-soak-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE362_HOME: tempRoot, CCM_CONTINUATION_SOAK_EPOCH: "svc_phase362_prepare" };
  try {
    const prepareRun = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8", timeout: 120_000 });
    assert.equal(prepareRun.status, 0, prepareRun.stderr || prepareRun.stdout);
    const prepare = parseStage(prepareRun.stdout, "prepare");
    const restartRun = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env: { ...env, CCM_CONTINUATION_SOAK_EPOCH: "svc_phase362_restart" }, encoding: "utf8", timeout: 120_000 });
    assert.equal(restartRun.status, 0, restartRun.stderr || restartRun.stdout);
    const restart = parseStage(restartRun.stdout, "restart");
    const checks = Number(prepare.checks || 0) + Number(restart.checks || 0);
    console.log(`PHASE362_RESULT=${JSON.stringify({ checks, passed: checks, prepare, restart })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE362_HOME;
if (!tempRoot) throw new Error("PHASE362_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const receipts = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const recovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const native = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const snapshotRoot = path.join(tempRoot, ".cc-connect", "task-agent-memory-context-snapshots");
const stateFile = path.join(tempRoot, "phase362-state.json");
const groupId = "phase362-provider-recovery-group";
const groupSessionId = "gcs_phase362_provider_recovery";
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function providerOutput(provider, sessionId) {
  if (provider === "codex") return `${JSON.stringify({ type: "thread.started", thread_id: sessionId })}\n${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "CCM_MEMORY_ACK_RECOVERED" } })}`;
  if (provider === "cursor") return JSON.stringify({ type: "result", subtype: "success", result: "CCM_MEMORY_ACK_RECOVERED", session_id: sessionId });
  return "CCM_MEMORY_ACK_RECOVERED";
}

function writeSnapshot(item) {
  const dir = path.join(snapshotRoot, item.opened.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `tams_phase362_${item.suffix}.json`);
  fs.writeFileSync(file, `${JSON.stringify({
    schema: "ccm-task-agent-memory-context-snapshot-v1",
    snapshot_id: `tams_phase362_${item.suffix}`,
    generated_at: new Date().toISOString(),
    session: { id: item.opened.id, group_id: item.groupId, task_id: item.taskId, project: item.project },
    context: {
      execution_id: item.taskId,
      group_session_memory_binding: { groupSessionId: item.groupSessionId },
      memory_context_consumption_receipt_required: true,
      memory_context_consumption_challenge: item.challenge,
    },
  }, null, 2)}\n`, "utf8");
  return file;
}

function createFixture(provider, suffix) {
  const taskId = `phase362-task-${suffix}`;
  const project = `phase362-project-${suffix}`;
  const opened = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: provider });
  const challenge = receipts.createMemoryContextConsumptionChallenge({ groupId, groupSessionId, taskId, executionId: taskId, project, taskAgentSessionId: opened.id, attempt: 1 });
  const runtimeVersionSnapshot = runtime.captureAgentRuntimeVersionSnapshot(provider);
  const nativeSessionId = crypto.randomUUID();
  const runnerRequestId = `runner-phase362-${suffix}`;
  const initialRaw = providerOutput(provider, nativeSessionId);
  const initialContract = ["codex", "cursor"].includes(provider)
    ? runtime.extractProviderOutputContractEvidence(provider, initialRaw, { runtimeVersionSnapshot })
    : null;
  const parentEvidence = native.buildNativeSessionContinuationEvidence({
    provider,
    runnerRequestId,
    requestedNativeSessionId: nativeSessionId,
    returnedNativeSessionId: ["codex", "cursor"].includes(provider) ? nativeSessionId : "",
    providerOutputContractEvidence: initialContract,
    providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
    nativeResumeRequested: false,
    runnerSuccess: true,
  });
  const item = { provider, suffix, groupId, groupSessionId, taskId, project, opened, challenge, runtimeVersionSnapshot, nativeSessionId, runnerRequestId, parentEvidence };
  item.snapshotFile = writeSnapshot(item);
  return item;
}

function recordReceipt(item) {
  return receipts.recordMemoryContextConsumptionReceipt({
    taskId: item.taskId,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    project: item.project,
    role: "project-child-agent",
    agentType: item.provider,
    taskAgentSessionId: item.opened.id,
    nativeSessionId: item.nativeSessionId,
    memoryReceiptChallenge: item.challenge,
    memoryReceiptFile: receipts.memoryContextConsumptionReceiptFile(item.challenge.challenge_id),
  }, { challenge_id: item.challenge.challenge_id });
}

async function runRecovery(item, faultInjectionPoint = "") {
  let continuationCalls = 0;
  const result = await recovery.recoverMemoryContextConsumptionReceipt({
    challenge: item.challenge,
    provider: item.provider,
    runnerRequestId: item.runnerRequestId,
    groupId: item.groupId,
    groupSessionId: item.groupSessionId,
    taskId: item.taskId,
    executionId: item.taskId,
    project: item.project,
    taskAgentSessionId: item.opened.id,
    nativeContinuationEvidence: item.parentEvidence,
    providerRuntimeVersionSnapshot: item.runtimeVersionSnapshot,
    trustedMemoryEnvelopeChecksum: `envelope-${item.suffix}`,
    trustedMemoryEnvelopeSourceChecksum: `source-${item.suffix}`,
    providerWorkCompleted: true,
    faultInjectionPoint,
  }, async request => {
    continuationCalls += 1;
    recordReceipt(item);
    const raw = providerOutput(item.provider, request.nativeSessionId);
    const contract = ["codex", "cursor"].includes(item.provider)
      ? runtime.extractProviderOutputContractEvidence(item.provider, raw, { runtimeVersionSnapshot: item.runtimeVersionSnapshot })
      : null;
    return {
      success: true,
      exitCode: 0,
      output: raw,
      nativeSessionId: ["codex", "cursor"].includes(item.provider) ? request.nativeSessionId : "",
      returnedNativeSessionId: ["codex", "cursor"].includes(item.provider) ? request.nativeSessionId : "",
      providerOutputContractEvidence: contract,
      providerRuntimeVersionSnapshot: item.runtimeVersionSnapshot,
    };
  });
  return { ...result, continuationCalls };
}

function decodeEmbeddedArgs(command) {
  for (const token of String(command || "").match(/[A-Za-z0-9+/=]{24,}/g) || []) {
    try {
      const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

if (mode === "prepare") {
  const providerRows = [];
  for (const provider of ["claudecode", "codex", "cursor"]) {
    const item = createFixture(provider, `provider-${provider}`);
    equal(item.runtimeVersionSnapshot.status, "ok", `${provider} real CLI version probe should succeed`);
    ok(item.runtimeVersionSnapshot.semanticVersion || item.runtimeVersionSnapshot.versionText, `${provider} version evidence should be non-empty`);
    equal(item.parentEvidence.nativeSessionReusable, true, `${provider} parent native session should be reusable`);
    const command = runtime.buildAgentCommand(provider, "phase362-recovery-prompt.txt", { persistSession: true, resumeSession: true, sessionId: item.nativeSessionId });
    if (provider === "claudecode") ok(command.includes("--resume") && command.includes(item.nativeSessionId), "Claude Code recovery command should resume exact session");
    else {
      const args = decodeEmbeddedArgs(command);
      ok(args.includes("--resume") || args.includes("resume"), `${provider} recovery command should request native resume`);
      ok(args.includes(item.nativeSessionId), `${provider} recovery command should bind exact session id`);
      if (provider === "codex") {
        ok(!args.includes("--sandbox"), "Codex resume must not use the unsupported --sandbox subcommand flag");
        ok(args.includes("-c") && args.some(value => String(value).startsWith("sandbox_mode=")), "Codex resume should preserve sandbox policy through config override");
      }
    }
    const result = await runRecovery(item);
    equal(result.continuationCalls, 1, `${provider} omission recovery should use one continuation`);
    equal(result.recovered, true, `${provider} controlled omission recovery should commit`);
    equal(result.record.recovery_native_continuation_evidence.nativeContinuationAcknowledged, true, `${provider} recovery continuation should be acknowledged`);
    equal(result.record.recovery_native_continuation_evidence.providerRuntimeVersion, item.runtimeVersionSnapshot.semanticVersion, `${provider} recovery should retain real CLI version`);
    providerRows.push({ provider, version: item.runtimeVersionSnapshot.semanticVersion, challengeId: item.challenge.challenge_id, sessionId: item.opened.id });
  }

  const crashRows = [];
  for (const point of recovery.MEMORY_CONTEXT_CONSUMPTION_RECOVERY_FAILPOINTS) {
    const item = createFixture("claudecode", `fault-${point.replace(/_/g, "-")}`);
    let caught = null;
    try { await runRecovery(item, point); } catch (error) { caught = error; }
    equal(caught?.code, "CCM_INJECTED_MEMORY_RECEIPT_RECOVERY_CRASH", `${point} should surface explicit simulated crash`);
    equal(caught?.faultPoint, point, `${point} should preserve fault identity`);
    const recordFile = path.join(recovery.memoryContextConsumptionRecoveryDirectory(), `${item.challenge.challenge_id}.json`);
    const record = JSON.parse(fs.readFileSync(recordFile, "utf8"));
    equal(record.status, point === "after_recovery_commit_before_return" ? "recovered" : "running", `${point} should leave the expected durable boundary state`);
    const old = new Date(Date.now() - 20 * 60_000);
    fs.utimesSync(recordFile, old, old);
    crashRows.push({ point, challengeId: item.challenge.challenge_id, statusBeforeRestart: record.status, sessionId: item.opened.id });
  }

  const report = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  equal(report.overall.validChainCount, 7, "provider and fault fixtures should retain seven valid exact-session soak chains");
  equal(report.overall.memoryRecoveryProviderCount, 3, "soak report should cover Claude Code, Codex, and Cursor");
  equal(report.overall.memoryRecoveryProviderVersionCount, 3, "soak report should retain all installed CLI versions");
  equal(report.overall.memoryRecoveryFaultInjectedCount, 4, "soak report should retain all four fault boundaries");
  equal(report.overall.memoryRecoveryRestartReconciledCount, 0, "restart reconciliation must not be recorded before process restart");
  ok(report.overall.memoryRecoveryCommittedCount >= 4, "three provider recoveries and post-commit crash should be committed");
  ok(report.overall.memoryRecoveryNativeAcknowledgedCount >= 4, "committed recoveries should retain native acknowledgement evidence");

  const memoryReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId });
  equal(memoryReport.overall.continuationSoakMemoryRecoveryProviderCount, 3, "Memory Center should expose provider recovery matrix coverage");
  equal(memoryReport.overall.continuationSoakMemoryRecoveryFaultInjectedCount, 4, "Memory Center should expose fault-injection coverage");

  fs.writeFileSync(stateFile, `${JSON.stringify({ groupId, groupSessionId, providerRows, crashRows }, null, 2)}\n`, "utf8");
  console.log(`PHASE362_STAGE_prepare=${JSON.stringify({ checks, providers: providerRows.map(row => `${row.provider}@${row.version}`), faults: crashRows.length })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const reconciliation = recovery.reconcileMemoryContextConsumptionRecoveries({ reconcileInterrupted: true, prune: false, interruptedAfterMinutes: 10 });
  equal(reconciliation.summary.interruptedCount, 3, "three pre-commit crashes should reconcile to interrupted after restart");
  equal(reconciliation.summary.interruptedReceiptUncommittedCount, 2, "two crashes should retain receipt without continuation commit");
  const report = soak.buildTaskAgentContinuationSoakReport({ groupId: state.groupId, groupSessionId: state.groupSessionId });
  equal(report.overall.validChainCount, 7, "restart should preserve all recovery soak chains");
  equal(report.overall.restartObservedChainCount, 3, "restart epoch should be visible on reconciled crash chains");
  equal(report.overall.memoryRecoveryProviderCount, 3, "restart should preserve three-provider coverage");
  equal(report.overall.memoryRecoveryProviderVersionCount, 3, "restart should preserve real CLI versions");
  equal(report.overall.memoryRecoveryFaultInjectedCount, 4, "restart should preserve fault-boundary evidence");
  equal(report.overall.memoryRecoveryRestartReconciledCount, 3, "restart should preserve reconciliation evidence");
  const inventory = recovery.buildMemoryContextConsumptionRecoveryInventory({ groupId: state.groupId });
  equal(inventory.summary.interruptedCount, 3, "restart inventory should preserve interrupted boundaries");
  equal(inventory.summary.recoveredCount, 4, "restart inventory should preserve three provider commits and post-commit crash");
  equal(inventory.summary.runningCount, 0, "restart should leave no stale running recovery");
  ok(inventory.rows.every(row => row.groupId === state.groupId), "restart inventory should remain exact-group scoped");
  const repeat = recovery.reconcileMemoryContextConsumptionRecoveries({ reconcileInterrupted: true, prune: false, interruptedAfterMinutes: 10 });
  equal(repeat.summary.interruptedCandidateCount, 0, "restart reconciliation should be idempotent");
  console.log(`PHASE362_STAGE_restart=${JSON.stringify({ checks, overall: report.overall })}`);
  process.exit(0);
}

throw new Error(`unknown phase362 mode: ${mode}`);
