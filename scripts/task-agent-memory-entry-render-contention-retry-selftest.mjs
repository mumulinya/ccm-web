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
const WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));
const sleep = ms => Atomics.wait(WAIT_ARRAY, 0, 0, ms);

function parseStage(output, stage) {
  const key = `PHASE378_STAGE_${stage.replace(/-/g, "_")}=`;
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(key));
  if (!line) throw new Error(`Phase 378 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

function waitForFile(file, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file) && Date.now() < deadline) sleep(20);
  assert.ok(fs.existsSync(file), `timed out waiting for ${file}`);
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-entry-contention-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE378_HOME: home };
  const runStage = stage => {
    const run = spawnSync(process.execPath, [scriptFile, stage], { cwd: root, env, encoding: "utf8", timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    return parseStage(run.stdout, stage);
  };
  const spawnStage = stage => {
    const child = spawn(process.execPath, [scriptFile, stage], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    return { child, stdout: () => stdout, stderr: () => stderr };
  };
  try {
    const setup = runStage("setup");

    const resolvedHolder = spawnStage("hold-resolved");
    waitForFile(path.join(home, "phase378-resolved-ready"));
    const waiter = spawnStage("wait-resolved");
    waitForFile(path.join(home, "phase378-waiter-ready"));
    sleep(120);
    fs.writeFileSync(path.join(home, "phase378-resolved-release"), "release\n", "utf8");
    const resolvedHolderExit = await new Promise(resolve => resolvedHolder.child.once("exit", resolve));
    const waiterExit = await new Promise(resolve => waiter.child.once("exit", resolve));
    assert.equal(resolvedHolderExit, 0, resolvedHolder.stderr() || resolvedHolder.stdout());
    assert.equal(waiterExit, 0, waiter.stderr() || waiter.stdout());
    const heldResolved = parseStage(resolvedHolder.stdout(), "hold-resolved");
    const resolved = parseStage(waiter.stdout(), "wait-resolved");

    const timeoutHolder = spawnStage("hold-timeout");
    waitForFile(path.join(home, "phase378-timeout-ready"));
    const timeout = runStage("wait-timeout");
    fs.writeFileSync(path.join(home, "phase378-timeout-release"), "release\n", "utf8");
    const timeoutHolderExit = await new Promise(resolve => timeoutHolder.child.once("exit", resolve));
    assert.equal(timeoutHolderExit, 0, timeoutHolder.stderr() || timeoutHolder.stdout());
    const heldTimeout = parseStage(timeoutHolder.stdout(), "hold-timeout");

    const sameProcess = runStage("same-process");
    const audit = runStage("audit");
    const checks = [setup, heldResolved, resolved, heldTimeout, timeout, sameProcess, audit].reduce((sum, row) => sum + Number(row.checks || 0), 0);
    console.log(JSON.stringify({ pass: true, checks, setup, heldResolved, resolved, heldTimeout, timeout, sameProcess, audit }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE378_HOME;
if (!home) throw new Error("PHASE378_HOME is required");
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const worker = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));
const entrySync = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-memory-entry-sync.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase378-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function memoryContext(item, revision) {
  const changed = `PHASE378_${item.label.toUpperCase()}_R${revision}_` + "x".repeat(500);
  const stable = "PHASE378_STABLE_" + "s".repeat(3000);
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: item.groupId,
    group_session_id: item.groupSessionId,
    target_project: item.project,
    rendered_text: ["[PHASE378 MEMORY]", changed, stable].join("\n"),
    memory_policy: { use: "session" },
    session_binding: { binding_id: `gmb_${item.groupSessionId}`, task_id: item.taskId, task_agent_session_id: item.taskAgentSessionId },
    typed_memory_recall: {
      schema: "ccm-group-typed-memory-recall-v1",
      version: 1,
      recalled: [
        { relPath: "memory/changed.md", checksum: `changed-${revision}`, snippet: changed },
        { relPath: "memory/stable.md", checksum: "stable-1", snippet: stable },
      ],
      surfaced: ["memory/changed.md", "memory/stable.md"],
    },
  };
}

function openFixture(label) {
  const nonce = `${label}-${process.pid}-${Date.now().toString(36)}`;
  const item = {
    label,
    groupId: `phase378-${label}-group-${nonce}`,
    groupSessionId: `gcs_phase378_${label}_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `phase378-${label}-task-${nonce}`,
    project: `phase378-${label}-project`,
  };
  item.taskAgentSessionId = sessions.openTaskAgentSession({ scopeId: item.taskId, taskId: item.taskId, groupId: item.groupId, project: item.project, agentType: "codex" }).id;
  return item;
}

function readState() {
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

function receiptChecksumValid(receipt) {
  const payload = { ...receipt };
  delete payload.contention_checksum;
  return receipt.contention_checksum === crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

if (mode === "setup") {
  const state = { resolved: openFixture("resolved"), timeout: openFixture("timeout"), same: openFixture("same") };
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  equal(new Set(Object.values(state).map(item => item.groupId)).size, 3, "fixtures should use three isolated groups");
  equal(new Set(Object.values(state).map(item => item.taskAgentSessionId)).size, 3, "fixtures should use three isolated tas_* sessions");
  console.log(`PHASE378_STAGE_setup=${JSON.stringify({ checks })}`);
  process.exit(0);
}

function hold(label, releaseName, readyName) {
  const item = readState()[label];
  const prepared = sessions.prepareTaskAgentMemoryEntrySyncContext(item.taskAgentSessionId, memoryContext(item, 1));
  equal(prepared.plan.render_fencing_token, 1, `${label} holder should own fencing token one`);
  fs.writeFileSync(path.join(home, readyName), "ready\n", "utf8");
  waitForFile(path.join(home, releaseName), 15_000);
  console.log(`PHASE378_STAGE_hold_${label}=${JSON.stringify({ checks, leaseId: prepared.plan.render_lease_id })}`);
  process.exit(0);
}

if (mode === "hold-resolved") hold("resolved", "phase378-resolved-release", "phase378-resolved-ready");
if (mode === "hold-timeout") hold("timeout", "phase378-timeout-release", "phase378-timeout-ready");

if (mode === "wait-resolved") {
  const item = readState().resolved;
  fs.writeFileSync(path.join(home, "phase378-waiter-ready"), "ready\n", "utf8");
  const handoff = worker.buildSelfContainedWorkerHandoff({
    group: { id: item.groupId, active_session_id: item.groupSessionId },
    project: item.project,
    task: "phase378 production contention retry",
    taskId: item.taskId,
    taskAgentSessionId: item.taskAgentSessionId,
    agentType: "codex",
    memory: memoryContext(item, 2),
  });
  const plan = entrySync.taskAgentMemoryEntrySyncPlan(handoff.worker_context_packet.memory);
  equal(plan.render_fencing_token, 2, "production waiter should take over with the next fencing token");
  equal(plan.recovered_stale_lease_id.length > 0, true, "production waiter should cite the exited owner lease");
  const current = sessions.listTaskAgentSessions({ taskId: item.taskId })[0];
  equal(current.memoryEntrySyncRenderContentionCount, 1, "resolved contention should be recorded once");
  equal(current.memoryEntrySyncRenderWaitResolvedCount, 1, "resolved contention should increment success count");
  equal(current.memoryEntrySyncRenderWaitTimeoutCount || 0, 0, "resolved contention should not increment timeout count");
  ok(current.memoryEntrySyncRenderLastContention.retries >= 1 && current.memoryEntrySyncRenderLastContention.retries <= 2, "production policy should resolve within at most two conflict retries");
  ok(current.memoryEntrySyncRenderLastContention.waited_ms >= 80, "resolved contention should record bounded backoff time");
  ok(receiptChecksumValid(current.memoryEntrySyncRenderLastContention), "resolved contention receipt should be checksum sealed");
  console.log(`PHASE378_STAGE_wait_resolved=${JSON.stringify({ checks, waitedMs: current.memoryEntrySyncRenderLastContention.waited_ms })}`);
  process.exit(0);
}

if (mode === "wait-timeout") {
  const item = readState().timeout;
  let error = null;
  try {
    worker.buildSelfContainedWorkerHandoff({ group: { id: item.groupId, active_session_id: item.groupSessionId }, project: item.project, task: "phase378 timeout", taskId: item.taskId, taskAgentSessionId: item.taskAgentSessionId, agentType: "codex", memory: memoryContext(item, 2) });
  } catch (caught) { error = caught; }
  equal(error?.code, "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY", "live owner beyond retry budget should remain fail-closed");
  equal(error?.renderContentionStatus, "timeout", "exhausted retry budget should be classified as timeout");
  equal(error?.renderContentionRetries, 2, "timeout should stop after two head rechecks");
  ok(Number(error?.renderContentionWaitedMs || 0) >= 240, "timeout should expose bounded wait duration");
  ok(receiptChecksumValid(error?.renderContentionReceipt), "timeout should include a signed contention receipt");
  const current = sessions.listTaskAgentSessions({ taskId: item.taskId })[0];
  equal(current.memoryEntrySyncRenderWaitTimeoutCount, 1, "timeout should be durable in the exact tas_* session");
  equal(current.memoryEntrySyncRenderLease.owner_pid === process.pid, false, "contender must not replace the live owner");
  console.log(`PHASE378_STAGE_wait_timeout=${JSON.stringify({ checks, waitedMs: error.renderContentionWaitedMs })}`);
  process.exit(0);
}

if (mode === "same-process") {
  const item = readState().same;
  sessions.prepareTaskAgentMemoryEntrySyncContext(item.taskAgentSessionId, memoryContext(item, 1));
  const startedAt = Date.now();
  let error = null;
  try {
    worker.buildSelfContainedWorkerHandoff({ group: { id: item.groupId, active_session_id: item.groupSessionId }, project: item.project, task: "phase378 same process", taskId: item.taskId, taskAgentSessionId: item.taskAgentSessionId, agentType: "codex", memory: memoryContext(item, 2) });
  } catch (caught) { error = caught; }
  equal(error?.renderContentionStatus, "same_process", "same-process source conflict should not block its own event loop");
  equal(error?.renderContentionRetries, 0, "same-process conflict should not retry");
  equal(error?.renderContentionWaitedMs, 0, "same-process conflict should not sleep");
  ok(Date.now() - startedAt < 100, "same-process conflict should return immediately");
  const current = sessions.listTaskAgentSessions({ taskId: item.taskId })[0];
  equal(current.memoryEntrySyncRenderSameProcessConflictCount, 1, "same-process conflict should be independently observable");
  equal(current.memoryEntrySyncRenderLease.fencing_token, 1, "same-process contender must not advance fencing head");
  console.log(`PHASE378_STAGE_same_process=${JSON.stringify({ checks })}`);
  process.exit(0);
}

if (mode === "audit") {
  const state = readState();
  const fleet = sessions.buildTaskAgentMemoryContextSnapshotInventory();
  const resolved = fleet.groups.find(group => group.groupId === state.resolved.groupId);
  const timeout = fleet.groups.find(group => group.groupId === state.timeout.groupId);
  const same = fleet.groups.find(group => group.groupId === state.same.groupId);
  equal(resolved.memoryEntryRenderContentionCount, 1, "resolved group should contain only its own contention");
  equal(resolved.memoryEntryRenderWaitResolvedCount, 1, "resolved group should expose one recovery");
  equal(resolved.memoryEntryRenderWaitTimeoutCount || 0, 0, "resolved group must not inherit timeout metrics");
  equal(resolved.memoryEntryRenderContentionReceiptValidCount, 1, "resolved group should expose one verified contention receipt");
  equal(timeout.memoryEntryRenderContentionCount, 1, "timeout group should contain only its own contention");
  equal(timeout.memoryEntryRenderWaitTimeoutCount, 1, "timeout group should expose one timeout");
  equal(timeout.memoryEntryRenderWaitResolvedCount || 0, 0, "timeout group must not inherit resolved metrics");
  equal(same.memoryEntryRenderSameProcessConflictCount, 1, "same-process group should contain only its own conflict");
  equal(fleet.summary.memoryEntryRenderContentionCount, 3, "fleet inventory should aggregate all three isolated groups");
  equal(fleet.summary.memoryEntryRenderContentionReceiptValidCount, 3, "fleet inventory should verify each group's latest contention receipt");
  equal(fleet.summary.memoryEntryRenderContentionReceiptInvalidCount, 0, "untampered contention receipts should remain valid");
  const resolvedSession = sessions.listTaskAgentSessions({ taskId: state.resolved.taskId })[0];
  const tamperedReceipt = { ...resolvedSession.memoryEntrySyncRenderLastContention, waited_ms: resolvedSession.memoryEntrySyncRenderLastContention.waited_ms + 1 };
  equal(sessions.verifyTaskAgentMemoryEntryRenderContentionReceipt(tamperedReceipt).valid, false, "contention receipt tampering should fail verification");
  const resolvedReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.resolved.groupId });
  equal(resolvedReport.overall.memoryEntryRenderContentionCount, 1, "Memory Center group filter should preserve exact-group isolation");
  equal(resolvedReport.overall.memoryEntryRenderWaitTimeoutCount, 0, "Memory Center resolved group must not show another group's timeout");
  const workerSource = fs.readFileSync(path.join(root, "backend", "agents", "worker-handoff.ts"), "utf8");
  ok(workerSource.includes("prepareTaskAgentMemoryEntrySyncContextWithRetry"), "production worker handoff should use bounded contention retry");
  const intakeSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-task-intake.ts"), "utf8");
  ok(intakeSource.includes("taskAgentSessionId: options.task_agent_session_id"), "group child handoff should preserve exact tas_* identity");
  console.log(`PHASE378_STAGE_audit=${JSON.stringify({ checks, fleetContentions: 3 })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 378 mode:${mode}`);
