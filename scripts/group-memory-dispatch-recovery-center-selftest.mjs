import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const prefix = `phase251-dispatch-recovery-${nonce}`;
const controlDir = path.join(runtimeRoot, prefix, "memory-control");
process.env.CCM_MEMORY_CONTROL_DIR = controlDir;

const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const wal = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "typed-memory-dispatch-wal.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const trackedFiles = new Set();
const trackedTaskIds = new Set();
let checks = 0;

function ok(value, message) { checks += 1; assert.ok(value, message); }
function equal(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }
function hash(value, length = 32) { return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length); }

function trackDirect(id) {
  trackedFiles.add(path.join(runtimeRoot, "agent-runner", "requests", `${id}.json`));
  trackedFiles.add(path.join(runtimeRoot, "agent-runner", "results", `${id}.json`));
  trackedFiles.add(path.join(runtimeRoot, "agent-runner", "transcripts", `${id}.jsonl`));
}

function buildFixture(label) {
  const groupId = `${prefix}-${label}-group`;
  const groupSessionId = `gcs_phase251_${label}_${nonce}`;
  const taskId = `${prefix}-${label}-task`;
  const project = "phase251-project";
  trackedTaskIds.add(taskId);
  const session = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "codex" });
  const taskAgentSessionId = session.id;
  const scope = `child-agent:${project}:${taskAgentSessionId}:precompact`;
  const content = `phase251 ${label} durable memory `.repeat(120);
  const doc = { relPath: `project/${label}.md`, checksum: hash(content), type: "project", name: label, description: content.slice(0, 100), snippet: content, score: 10 };
  const recall = { schema: "ccm-group-typed-memory-recall-v1", version: 1, recalled: [doc], surfaced: [doc.relPath] };
  const capsule = memory.buildChildTypedMemoryDeliveryCapsule({
    groupId, groupSessionId, targetProject: project, taskId, taskAgentSessionId,
    ledgerScope: { scope, compactEpoch: "precompact", taskId, taskAgentSessionId }, recall,
  }, { modelContextWindow: 200_000 });
  const lease = kernel.buildWorkerTypedMemoryDeliveryLease(capsule, { query: `phase251 ${label}`, attemptSequence: 1 });
  const bundle = {
    schema: "ccm-group-memory-context-v1", group_id: groupId, group_session_id: groupSessionId, target_project: project,
    session_binding: { task_id: taskId, task_agent_session_id: taskAgentSessionId }, typed_memory_recall: recall,
    typed_memory_delivery_capsule: capsule, typed_memory_delivery_lease: lease,
    group_state: { typedMemory: { recall, deliveryCapsule: capsule, deliveryLease: lease, ledger: { scope, compactEpoch: "precompact", taskId, taskAgentSessionId } } },
  };
  const packet = kernel.buildWorkerContextPacket({ group: { id: groupId, members: [{ project }] }, project, task: label, taskId, groupSessionId, taskAgentSessionId, memory: bundle });
  const prompt = `phase251 secret prompt ${label} capsule=${capsule.capsule_checksum}`;
  sessions.bindTaskAgentMemoryContextSnapshot(taskAgentSessionId, { taskId, groupId, project, agentType: "codex", turn: 1, executionId: taskId, workerContextPacket: packet, memoryContext: bundle, renderedPrompt: prompt });
  const admission = memory.admitChildTypedMemoryDelivery(bundle, { workerContextPacket: packet, renderedPrompt: prompt, attemptSequence: 1, skipGroupSessionPresenceCheck: true });
  const dispatchWal = memory.createChildTypedMemoryDispatchWal(admission, { memoryBundle: bundle, workerContextPacket: packet, renderedPrompt: prompt, snapshotRenderedPrompt: prompt, executionId: taskId });
  trackedFiles.add(dispatchWal.record.file);
  return { groupId, groupSessionId, taskId, project, taskAgentSessionId, scope, bundle, packet, prompt, admission, dispatchWal };
}

function resolveInput(row, action, reason) {
  return {
    action, ticketId: row.ticketId, ticketChecksum: row.ticketChecksum, recordChecksum: row.recordChecksum,
    runnerRequestId: row.runnerRequestId || "", requestChecksum: row.direct?.requestChecksum || "",
    transcriptHeadChecksum: row.direct?.transcript?.headChecksum || "", explicitConfirmation: true,
    actor: "phase251-selftest", reason,
  };
}

try {
  const strong = buildFixture("strong");
  let strongWal = memory.markChildTypedMemoryDispatchStarted(strong.dispatchWal, { transport: "server_direct_cli" });
  const strongDirect = spool.createDirectAgentDispatchRequest({ projectName: strong.project, message: strong.prompt, workDir: root, agentType: "codex", taskId: strong.taskId, executionId: strong.taskId, taskAgentSessionId: strong.taskAgentSessionId, groupId: strong.groupId });
  trackDirect(strongDirect.id);
  spool.markDirectAgentDispatchStarted(strongDirect.id, { runnerPid: process.pid });
  strongWal = memory.markChildTypedMemoryDispatchStarted({ required: true, record: strongWal }, { transport: "server_direct_cli", runnerRequestId: strongDirect.id });
  spool.appendDirectAgentDispatchTranscript(strongDirect.id, "stdout", { text: "bounded child output" });
  spool.appendDirectAgentDispatchTranscript(strongDirect.id, "tool_loop_started", {});
  spool.appendDirectAgentDispatchTranscript(strongDirect.id, "tool_loop_completed", {});
  spool.completeDirectAgentDispatch(strongDirect.id, { success: true, output: "phase251 completed", nativeSessionId: "native-phase251", exitCode: 0 });
  let inventory = center.buildMemoryDispatchRecoveryInventory({ limit: 5000 });
  let strongRow = inventory.rows.find(row => row.ticketId === strongWal.ticket_id);
  equal(strongRow.recoverability, "recoverable_commit", "complete direct evidence must be recoverable");
  equal(strongRow.direct.transcript.valid, true, "incremental transcript hash chain must validate");
  equal(JSON.stringify(strongRow).includes(strong.prompt), false, "inventory must not expose the full child prompt");
  const recovered = center.resolveMemoryDispatchRecovery(resolveInput(strongRow, "retry_recovery", "recover from complete direct evidence"));
  ok(recovered.result.rows.some(row => row.action === "recovered_commit"), "manual retry must use the same strong recovery path");
  equal(wal.readTypedMemoryDispatchWal(strongWal.file).state, "committed", "strong recovery must commit WAL");
  equal(typed.getGroupTypedMemoryRecallScopeStats(`${strong.groupId}--${strong.groupSessionId}`, strong.scope).deliveryCount, 1, "strong recovery must consume surfaced memory once");
  equal(wal.verifyTypedMemoryDispatchWal(wal.readTypedMemoryDispatchWal(strongWal.file)).valid, true, "committed WAL without recovery payload must remain valid");

  inventory = center.buildMemoryDispatchRecoveryInventory({ limit: 5000 });
  strongRow = inventory.rows.find(row => row.ticketId === strongWal.ticket_id);
  equal(strongRow.recoverability, "terminal", "committed WAL must be terminal in inventory");
  const pruned = center.resolveMemoryDispatchRecovery(resolveInput(strongRow, "prune_terminal", "selftest terminal evidence retention completed"));
  equal(pruned.result.walDeleted, true, "terminal prune must delete exact WAL");
  equal(fs.existsSync(strongDirect.requestFile), false, "terminal prune must delete direct request");
  equal(fs.existsSync(strongDirect.resultFile), false, "terminal prune must delete direct result");

  const prepared = buildFixture("prepared");
  let preparedWal = memory.markChildTypedMemoryDispatchStarted(prepared.dispatchWal, { transport: "server_direct_cli" });
  const preparedDirect = spool.createDirectAgentDispatchRequest({ projectName: prepared.project, message: prepared.prompt, workDir: root, agentType: "codex", taskId: prepared.taskId, executionId: prepared.taskId, taskAgentSessionId: prepared.taskAgentSessionId, groupId: prepared.groupId });
  trackDirect(preparedDirect.id);
  preparedWal = memory.markChildTypedMemoryDispatchStarted({ required: true, record: preparedWal }, { transport: "server_direct_cli", runnerRequestId: preparedDirect.id });
  inventory = center.buildMemoryDispatchRecoveryInventory({ limit: 5000 });
  const preparedRow = inventory.rows.find(row => row.ticketId === preparedWal.ticket_id);
  equal(preparedRow.recoverability, "cancel_prepared", "unstarted direct request must only offer cancellation");
  center.resolveMemoryDispatchRecovery(resolveInput(preparedRow, "cancel_prepared", "cancel before process spawn"));
  equal(spool.readDirectAgentDispatchRequest(preparedDirect.id).status, "cancelled", "prepared request must become cancelled");
  equal(wal.readTypedMemoryDispatchWal(preparedWal.file).state, "cancelled", "prepared WAL must become cancelled");

  const uncertain = buildFixture("uncertain");
  const uncertainWal = memory.markChildTypedMemoryDispatchStarted(uncertain.dispatchWal, { transport: "server_direct_cli" });
  memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [uncertainWal.ticket_id] });
  inventory = center.buildMemoryDispatchRecoveryInventory({ limit: 5000 });
  let uncertainRow = inventory.rows.find(row => row.ticketId === uncertainWal.ticket_id);
  equal(uncertainRow.recoverability, "uncertain", "missing durable return evidence must remain uncertain");
  const acknowledgementInput = resolveInput(uncertainRow, "acknowledge_uncertain", "operator accepts that no commit can be inferred");
  const acknowledged = center.resolveMemoryDispatchRecovery(acknowledgementInput);
  equal(acknowledged.result.surfacedLedgerCommitted, false, "uncertain acknowledgement must never commit surfaced memory");
  uncertainRow = center.buildMemoryDispatchRecoveryInventory({ limit: 5000 }).rows.find(row => row.ticketId === uncertainWal.ticket_id);
  equal(uncertainRow.acknowledged, true, "uncertain acknowledgement must be visible in inventory");
  let replayBlocked = false;
  try { center.resolveMemoryDispatchRecovery(acknowledgementInput); } catch (error) { replayBlocked = /already consumed/.test(String(error?.message || error)); }
  equal(replayBlocked, true, "resolution receipts must be single use");

  const transcriptDirect = spool.createDirectAgentDispatchRequest({ projectName: "phase251-transcript", message: "private prompt must stay in request spool", workDir: root, agentType: "codex", taskId: `${prefix}-transcript`, taskAgentSessionId: `tas_${nonce}`, groupId: `${prefix}-transcript-group` });
  trackDirect(transcriptDirect.id);
  spool.markDirectAgentDispatchStarted(transcriptDirect.id, { runnerPid: process.pid });
  for (let index = 0; index < 180; index += 1) spool.appendDirectAgentDispatchTranscript(transcriptDirect.id, "stdout", { text: `${index}:` + "x".repeat(4096) });
  let transcript = spool.readDirectAgentDispatchTranscript(transcriptDirect.id, { limit: 500 });
  ok(transcript.bytes <= 512 * 1024, "incremental transcript must remain within its hard byte limit");
  equal(transcript.valid, true, "bounded transcript must validate before tampering");
  const lines = fs.readFileSync(transcript.file, "utf8").trim().split(/\r?\n/);
  const event = JSON.parse(lines[Math.min(2, lines.length - 1)]);
  event.payload = { text: "tampered transcript" };
  lines[Math.min(2, lines.length - 1)] = JSON.stringify(event);
  fs.writeFileSync(transcript.file, `${lines.join("\n")}\n`, "utf8");
  transcript = spool.readDirectAgentDispatchTranscript(transcriptDirect.id, { limit: 500 });
  equal(transcript.valid, false, "tampered transcript must fail closed");
  ok(transcript.issues.includes("transcript_checksum_invalid"), "tamper diagnostics must expose checksum failure");

  const centerSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf8");
  ok(centerSource.includes('"/api/memory-center/dispatch-recovery"'), "Memory Center must expose dispatch inventory API");
  ok(centerSource.includes('"/api/memory-center/dispatch-recovery/resolve"'), "Memory Center must expose guarded resolution API");
  equal(centerSource.includes("force_commit"), false, "Memory Center must not expose arbitrary forced commit");
  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf8");
  equal(globalSource.includes("dispatch-recovery") || globalSource.includes("appendDirectAgentDispatchTranscript"), false, "Global Agent must remain outside group dispatch transcripts");

  console.log(JSON.stringify({ pass: true, checks, recoverableCommit: true, transcriptHashChain: true, transcriptBounded: true, guardedResolve: true, singleUseReceipt: true, globalBoundaryPreserved: true }, null, 2));
} finally {
  for (const taskId of trackedTaskIds) {
    try { sessions.purgeTaskAgentSessions(taskId); } catch {}
  }
  for (const file of trackedFiles) {
    try { fs.unlinkSync(file); } catch {}
  }
  try { fs.rmSync(path.join(runtimeRoot, prefix), { recursive: true, force: true }); } catch {}
}
