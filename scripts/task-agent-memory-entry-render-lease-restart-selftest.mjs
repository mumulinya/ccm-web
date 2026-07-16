import assert from "node:assert/strict";
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
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE377_STAGE_${stage}=`));
  if (!line) throw new Error(`Phase 377 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-entry-render-lease-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, PHASE377_HOME: home };
  try {
    const runStage = stage => {
      const run = spawnSync(process.execPath, [scriptFile, stage], { cwd: root, env, encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(run.status, 0, run.stderr || run.stdout);
      return parseStage(run.stdout, stage.replace(/-/g, "_"));
    };
    const ownerCrash = runStage("owner-crash");
    const recoveredBaseline = runStage("recover-baseline");
    const holder = spawn(process.execPath, [scriptFile, "hold-delta"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let holderStdout = "";
    let holderStderr = "";
    holder.stdout.on("data", chunk => holderStdout += chunk);
    holder.stderr.on("data", chunk => holderStderr += chunk);
    const readyFile = path.join(home, "phase377-holder-ready.json");
    const deadline = Date.now() + 15_000;
    while (!fs.existsSync(readyFile) && Date.now() < deadline) sleep(25);
    assert.ok(fs.existsSync(readyFile), `holder did not become ready: ${holderStderr || holderStdout}`);
    const contender = runStage("contend");
    fs.writeFileSync(path.join(home, "phase377-holder-release"), "release\n", "utf8");
    const holderExit = await new Promise(resolve => holder.once("exit", code => resolve(code)));
    assert.equal(holderExit, 0, holderStderr || holderStdout);
    const held = parseStage(holderStdout, "hold_delta");
    const takeover = runStage("takeover-delta");
    const audit = runStage("audit");
    const checks = [ownerCrash, recoveredBaseline, contender, held, takeover, audit].reduce((sum, row) => sum + Number(row.checks || 0), 0);
    console.log(JSON.stringify({ pass: true, checks, ownerCrash, recoveredBaseline, contender, held, takeover, audit }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}

const home = process.env.PHASE377_HOME;
if (!home) throw new Error("PHASE377_HOME is required");
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const worker = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(home, "phase377-state.json");
const heldMemoryFile = path.join(home, "phase377-held-memory.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const throws = (fn, matcher, message) => { checks += 1; assert.throws(fn, matcher, message); };

function memoryContext(state, revision) {
  const alpha = `PHASE377_ALPHA_R${revision}_` + (revision === 1 ? "a" : "x").repeat(900);
  const beta = "PHASE377_BETA_STABLE_" + "b".repeat(5000);
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: state.groupSessionId,
    target_project: state.project,
    rendered_text: ["[PHASE377 MEMORY]", alpha, beta].join("\n"),
    memory_policy: { use: "session" },
    session_binding: { binding_id: `gmb_phase377_${state.groupSessionId}`, task_id: state.taskId, task_agent_session_id: state.taskAgentSessionId },
    compaction: {},
    typed_memory_recall: {
      schema: "ccm-group-typed-memory-recall-v1",
      version: 1,
      recalled: [
        { relPath: "memory/alpha.md", checksum: `alpha-${revision}`, snippet: alpha },
        { relPath: "memory/beta.md", checksum: "beta-1", snippet: beta },
      ],
      surfaced: ["memory/alpha.md", "memory/beta.md"],
    },
  };
}

function bindPrepared(state, prepared, revision, turn) {
  const projection = worker.renderMemoryContextForWorker(prepared.memoryContext);
  const prompt = `phase377 turn ${turn}\n${projection}\nexecute`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    nativeSessionId: state.nativeSessionId,
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase377_${turn}`, memory: prepared.memoryContext },
    memoryContext: memoryContext(state, revision),
    renderedPrompt: prompt,
    renderedMemoryContext: memoryContext(state, revision).rendered_text,
    requireMemoryPromptInjectionProof: true,
  });
  return { bound, prompt };
}

function deliver(state, item, turn) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: item.bound.snapshot.snapshot_id,
    renderedPrompt: item.prompt,
    snapshotRenderedPrompt: item.prompt,
    executionId: `${state.taskId}-turn-${turn}`,
    runtime: "codex",
    attempt: turn,
    nativeSessionId: state.nativeSessionId,
    runnerRequestId: `adr_phase377_${turn}`,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: `phase377 delivered turn ${turn}`,
  });
}

if (mode === "owner-crash") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `phase377-group-${nonce}`,
    groupSessionId: `gcs_phase377_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `phase377-task-${nonce}`,
    project: "phase377-project",
    nativeSessionId: `thread-phase377-${nonce}`,
  };
  const opened = sessions.openTaskAgentSession({ scopeId: state.taskId, taskId: state.taskId, groupId: state.groupId, project: state.project, agentType: "codex" });
  state.taskAgentSessionId = opened.id;
  const prepared = sessions.prepareTaskAgentMemoryEntrySyncContext(opened.id, memoryContext(state, 1));
  equal(prepared.prepared, true, "owner should prepare the first render transaction");
  equal(prepared.plan.render_fencing_token, 1, "first render lease should start at fencing token one");
  ok(/^tamerl_[a-f0-9]{24}$/.test(prepared.plan.render_lease_id), "render lease should have a durable identity");
  state.crashedLeaseId = prepared.plan.render_lease_id;
  state.crashedFencingToken = prepared.plan.render_fencing_token;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE377_STAGE_owner_crash=${JSON.stringify({ checks, leaseId: state.crashedLeaseId, fencingToken: state.crashedFencingToken })}`);
  process.exit(0);
}

if (mode === "recover-baseline") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const prepared = sessions.prepareTaskAgentMemoryEntrySyncContext(state.taskAgentSessionId, memoryContext(state, 1));
  equal(prepared.staleRenderLeaseRecovered, true, "dead render owner should be recovered immediately after restart");
  equal(prepared.plan.recovered_stale_lease_id, state.crashedLeaseId, "replacement plan should cite the crashed lease");
  equal(prepared.plan.render_fencing_token, state.crashedFencingToken + 1, "takeover must advance the fencing token");
  const reused = sessions.prepareTaskAgentMemoryEntrySyncContext(state.taskAgentSessionId, memoryContext(state, 1));
  equal(reused.renderLeaseReused, true, "same owner and source should idempotently reuse its prepared render lease");
  equal(reused.plan.render_lease_id, prepared.plan.render_lease_id, "idempotent prepare should retain lease identity");
  equal(reused.plan.plan_checksum, prepared.plan.plan_checksum, "idempotent prepare should retain the exact plan checksum");
  const item = bindPrepared(state, reused, 1, 1);
  equal(item.bound.snapshot.context.memory_entry_sync.render_fencing_token, prepared.plan.render_fencing_token, "snapshot should bind takeover fencing token");
  equal(deliver(state, item, 1).syncCommit.status, "committed", "recovered baseline should commit normally");
  sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, { nativeSessionId: state.nativeSessionId, success: true });
  state.baselineLeaseId = prepared.plan.render_lease_id;
  state.baselineFencingToken = prepared.plan.render_fencing_token;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE377_STAGE_recover_baseline=${JSON.stringify({ checks, leaseId: state.baselineLeaseId, fencingToken: state.baselineFencingToken })}`);
  process.exit(0);
}

if (mode === "hold-delta") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const prepared = sessions.prepareTaskAgentMemoryEntrySyncContext(state.taskAgentSessionId, memoryContext(state, 2));
  equal(prepared.plan.transport_mode, "delta", "live holder should prepare a delta from the committed baseline");
  equal(prepared.plan.render_fencing_token, state.baselineFencingToken + 1, "holder should advance the fencing token");
  fs.writeFileSync(heldMemoryFile, `${JSON.stringify({ memoryContext: prepared.memoryContext, plan: prepared.plan }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(home, "phase377-holder-ready.json"), `${JSON.stringify({ pid: process.pid, leaseId: prepared.plan.render_lease_id, fencingToken: prepared.plan.render_fencing_token })}\n`, "utf8");
  const deadline = Date.now() + 20_000;
  while (!fs.existsSync(path.join(home, "phase377-holder-release")) && Date.now() < deadline) sleep(25);
  ok(fs.existsSync(path.join(home, "phase377-holder-release")), "holder should receive orchestrated release after contention check");
  console.log(`PHASE377_STAGE_hold_delta=${JSON.stringify({ checks, leaseId: prepared.plan.render_lease_id, fencingToken: prepared.plan.render_fencing_token })}`);
  process.exit(0);
}

if (mode === "contend") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const holder = JSON.parse(fs.readFileSync(path.join(home, "phase377-holder-ready.json"), "utf8"));
  let error = null;
  try { sessions.prepareTaskAgentMemoryEntrySyncContext(state.taskAgentSessionId, memoryContext(state, 3)); } catch (caught) { error = caught; }
  equal(error?.code, "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY", "live owner should exclude another process from rendering the same tas_*");
  equal(error?.leaseId, holder.leaseId, "busy response should identify the active render lease");
  equal(error?.fencingToken, holder.fencingToken, "busy response should expose the active fencing token");
  const session = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(session.memoryEntrySyncRenderLease.lease_id, holder.leaseId, "contender must not replace the live owner's lease");
  console.log(`PHASE377_STAGE_contend=${JSON.stringify({ checks, blockedBy: holder.leaseId })}`);
  process.exit(0);
}

if (mode === "takeover-delta") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const held = JSON.parse(fs.readFileSync(heldMemoryFile, "utf8"));
  const prepared = sessions.prepareTaskAgentMemoryEntrySyncContext(state.taskAgentSessionId, memoryContext(state, 2));
  equal(prepared.staleRenderLeaseRecovered, true, "dead delta renderer should be recoverable");
  equal(prepared.plan.recovered_stale_lease_id, held.plan.render_lease_id, "takeover delta should cite the dead holder lease");
  equal(prepared.plan.render_fencing_token, held.plan.render_fencing_token + 1, "delta takeover must advance fencing token");
  equal(prepared.plan.transport_mode, "delta", "takeover should recompute the current delta rather than reuse stale Prompt text");
  const item = bindPrepared(state, prepared, 2, 2);
  equal(deliver(state, item, 2).syncCommit.status, "committed", "takeover delta should commit");
  state.holdLeaseId = held.plan.render_lease_id;
  state.takeoverLeaseId = prepared.plan.render_lease_id;
  state.takeoverFencingToken = prepared.plan.render_fencing_token;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE377_STAGE_takeover_delta=${JSON.stringify({ checks, leaseId: state.takeoverLeaseId, fencingToken: state.takeoverFencingToken })}`);
  process.exit(0);
}

if (mode === "audit") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const held = JSON.parse(fs.readFileSync(heldMemoryFile, "utf8"));
  const current = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(current.memoryEntrySyncRenderLease.status, "bound", "latest takeover lease should be bound to a snapshot");
  equal(current.memoryEntrySyncRenderLease.lease_id, state.takeoverLeaseId, "latest bound lease should be the takeover owner");
  equal(current.memoryEntrySyncRenderFencingToken, state.takeoverFencingToken, "session should retain monotonic fencing head");
  equal(current.memoryEntrySyncRenderLeaseTakeoverCount, 2, "session should count both crashed-owner takeovers");
  ok((current.memoryEntrySyncRenderLeaseHistory || []).some(row => row.lease_id === state.crashedLeaseId), "history should retain first crashed lease");
  ok((current.memoryEntrySyncRenderLeaseHistory || []).some(row => row.lease_id === state.holdLeaseId), "history should retain live-holder crash lease");
  const staleProjection = worker.renderMemoryContextForWorker(held.memoryContext);
  throws(() => sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn: 3,
    workerContextPacket: { packet_id: "wcp_phase377_stale", memory: held.memoryContext },
    memoryContext: memoryContext(state, 2),
    renderedPrompt: `stale held prompt\n${staleProjection}`,
    renderedMemoryContext: memoryContext(state, 2).rendered_text,
    requireMemoryPromptInjectionProof: true,
  }), /render_lease_not_prepared|render_lease_id_stale|render_fencing_token_stale|changed before snapshot bind/, "superseded held Prompt must never bind after takeover");
  const afterStale = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(afterStale.memoryEntrySyncRenderLease.status, "bound", "stale Prompt rejection must not reject the newer bound lease");
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memoryEntryRenderLeaseActiveCount, 0, "inventory should show no active render lease after bind");
  equal(inventory.summary.memoryEntryRenderLeaseBoundCount, 1, "inventory should show the latest bound lease");
  equal(inventory.summary.memoryEntryRenderLeaseTakeoverCount, 2, "inventory should expose crash takeovers");
  equal(inventory.summary.memoryEntryRenderLeaseStaleCount, 0, "recovered leases should not remain stale");
  equal(inventory.summary.memoryEntryRenderLeaseMaxFencingToken, state.takeoverFencingToken, "inventory should expose monotonic fencing head");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memoryEntryRenderLeaseTakeoverCount, 2, "Memory Center should expose render lease takeovers");
  equal(report.overall.memoryEntryRenderLeaseMaxFencingToken, state.takeoverFencingToken, "Memory Center should expose render fencing head");
  console.log(`PHASE377_STAGE_audit=${JSON.stringify({ checks, takeovers: 2, fencingToken: state.takeoverFencingToken })}`);
  process.exit(0);
}

throw new Error(`unknown Phase 377 mode:${mode}`);
