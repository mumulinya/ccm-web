import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const prefix = `phase248-consume-ticket-${nonce}`;
const project = "phase248-project";
let checks = 0;

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (!child.name.startsWith(prefix)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function makeDoc(relPath, content) {
  return {
    relPath,
    checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 32),
    type: "project",
    name: relPath,
    description: content.slice(0, 120),
    snippet: content,
    score: 10,
  };
}

function makeArtifacts(label, options = {}) {
  const groupId = `${prefix}-${label}`;
  const groupSessionId = `gcs_${label}_${nonce}`;
  const taskId = `${prefix}-task-${label}`;
  const taskAgentSessionId = `tas_phase248_${label}_${nonce}`;
  const compactEpoch = String(options.compactEpoch || "precompact");
  const scope = `child-agent:${project}:${taskAgentSessionId}:${compactEpoch}`;
  const docs = options.docs || [makeDoc(`project/${label}.md`, `phase248 ${label} memory `.repeat(160))];
  const recall = { schema: "ccm-group-typed-memory-recall-v1", version: 1, recalled: docs, surfaced: docs.map(doc => doc.relPath) };
  const capsule = memory.buildChildTypedMemoryDeliveryCapsule({
    groupId,
    groupSessionId,
    targetProject: project,
    taskId,
    taskAgentSessionId,
    ledgerScope: { scope, compactEpoch, taskId, taskAgentSessionId },
    recall,
  }, {
    modelContextWindow: 200_000,
    sessionDeliveredBytes: Number(options.sessionDeliveredBytes || 0),
  });
  const attemptSequence = Number(options.attemptSequence || 1);
  const lease = kernel.buildWorkerTypedMemoryDeliveryLease(capsule, { query: `phase248 ${label}`, attemptSequence, generatedAt: "2026-07-14T01:00:00.000Z" });
  const bundle = {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    session_binding: { task_id: taskId, task_agent_session_id: taskAgentSessionId },
    typed_memory_recall: recall,
    typed_memory_delivery_capsule: capsule,
    typed_memory_delivery_lease: lease,
    group_state: { typedMemory: { recall, deliveryCapsule: capsule, deliveryLease: lease, ledger: { scope, compactEpoch, taskId, taskAgentSessionId } } },
  };
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, members: [{ project }] },
    project,
    task: `phase248 ${label}`,
    taskId,
    groupSessionId,
    taskAgentSessionId,
    memory: bundle,
  });
  return { groupId, groupSessionId, typedScopeId: `${groupId}--${groupSessionId}`, taskId, taskAgentSessionId, compactEpoch, scope, attemptSequence, docs, recall, capsule, lease, bundle, packet };
}

function admit(artifact, prompt, options = {}) {
  return memory.admitChildTypedMemoryDelivery(artifact.bundle, {
    workerContextPacket: artifact.packet,
    renderedPrompt: prompt,
    attemptSequence: options.attemptSequence ?? artifact.attemptSequence,
    admittedAt: options.admittedAt,
    dispatchWindowMs: options.dispatchWindowMs,
    skipGroupSessionPresenceCheck: options.skipGroupSessionPresenceCheck ?? true,
  });
}

function commit(artifact, admission, prompt, options = {}) {
  return memory.commitChildTypedMemoryDelivery(artifact.bundle, {
    workerContextPacket: artifact.packet,
    dispatchEvidence: {
      renderedPrompt: options.renderedPrompt ?? prompt,
      dispatchTicket: options.dispatchTicket ?? admission?.ticket,
      dispatchStartedAt: options.dispatchStartedAt ?? admission?.ticket?.admitted_at,
      dispatched: options.dispatched ?? true,
      executionReturned: options.executionReturned ?? true,
    },
  });
}

try {
  cleanupRuntimeResidue();

  const base = makeArtifacts("base");
  const basePrompt = `worker prompt capsule=${base.capsule.capsule_checksum}`;
  equal(typed.getGroupTypedMemoryRecallScopeStats(base.typedScopeId, base.scope).deliveryCount, 0, "prefetch preparation must not consume surfaced budget");
  const missingTicket = memory.commitChildTypedMemoryDelivery(base.bundle, {
    workerContextPacket: base.packet,
    dispatchEvidence: { renderedPrompt: basePrompt, dispatched: true, executionReturned: true },
  });
  equal(missingTicket.committed, false, "runner evidence without a consume ticket must fail closed");
  equal(missingTicket.reason, "dispatch_ticket_invalid", "missing consume ticket must have an explicit rejection reason");

  const baseAdmission = admit(base, basePrompt);
  equal(baseAdmission.admitted, true, "current pending lease must be admitted immediately before runner call");
  equal(baseAdmission.required, true, "typed memory must require a consume ticket");
  equal(baseAdmission.ticket.schema, "ccm-child-typed-memory-dispatch-ticket-v1", "admission must issue the dispatch ticket schema");
  equal(baseAdmission.ticket.consume_point, "immediately_before_runner_call", "ticket must declare the zero-wait consume point");
  equal(kernel.validateWorkerTypedMemoryDispatchTicket(baseAdmission.ticket, {
    lease: baseAdmission.lease,
    capsule: baseAdmission.capsule,
    workerContextPacket: base.packet,
    renderedPrompt: basePrompt,
  }).valid_for_dispatch, true, "Runtime Kernel must independently validate the ticket");

  const tamperedPromptAdmission = admit(base, "prompt without capsule checksum");
  equal(tamperedPromptAdmission.admitted, false, "prompt without capsule checksum must not consume the lease");
  equal(tamperedPromptAdmission.reason, "prompt_missing_capsule_checksum", "prompt omission must be distinguishable");
  const wrongTurnAdmission = admit(base, basePrompt, { attemptSequence: 2 });
  equal(wrongTurnAdmission.admitted, false, "an old task-agent turn must not consume the pending lease");
  equal(wrongTurnAdmission.reason, "task_agent_turn_changed", "turn mismatch must be distinguishable");
  const deletedSessionAdmission = memory.admitChildTypedMemoryDelivery(base.bundle, {
    workerContextPacket: base.packet,
    renderedPrompt: basePrompt,
    attemptSequence: 1,
  });
  equal(deletedSessionAdmission.admitted, false, "a bundle from a deleted gcs_* session must not dispatch");
  equal(deletedSessionAdmission.reason, "group_session_deleted_before_dispatch", "deleted group session must be distinguishable");

  const tamperedCommit = commit(base, baseAdmission, basePrompt, { renderedPrompt: `${basePrompt} changed` });
  equal(tamperedCommit.committed, false, "ticket must not authorize a different runner prompt");
  equal(tamperedCommit.reason, "dispatch_ticket_invalid", "prompt hash mismatch must fail at the ticket gate");
  ok(tamperedCommit.validation_issues.includes("prompt_checksum_binding_mismatch"), "ticket diagnostics must include prompt checksum mismatch");

  const expiredAdmission = admit(base, basePrompt, { admittedAt: "2026-07-14T01:00:00.000Z", dispatchWindowMs: 1000 });
  equal(expiredAdmission.admitted, true, "a ticket can be prepared at an explicit consume point");
  const expiredCommit = commit(base, expiredAdmission, basePrompt, { dispatchStartedAt: "2026-07-14T01:00:02.000Z" });
  equal(expiredCommit.committed, false, "runner start after dispatch_not_after must fail closed");
  ok(expiredCommit.validation_issues.includes("dispatch_started_after_ticket_expiry"), "expired runner start must be explicit");

  const validCommit = commit(base, baseAdmission, basePrompt);
  equal(validCommit.committed, true, "exact ticket, prompt and runner start must commit surfaced memory");
  equal(validCommit.stats.deliveryCount, 1, "valid consume ticket must count exactly one delivery");
  const retryAdmission = admit(base, basePrompt, { admittedAt: "2026-07-14T01:00:10.000Z" });
  equal(retryAdmission.admitted, true, "same lease provider retry must be admitted after the first commit");
  equal(retryAdmission.idempotentRetry, true, "same lease retry must be classified as idempotent");
  ok(retryAdmission.ticket.ticket_id !== baseAdmission.ticket.ticket_id, "a later provider retry must receive a new prompt-bound ticket");
  const retryCommit = commit(base, retryAdmission, basePrompt);
  equal(retryCommit.committed, true, "idempotent provider retry may replay the committed lease");
  equal(retryCommit.stats.deliveryCount, 1, "provider retry must not consume surfaced budget twice");

  const budget = makeArtifacts("budget");
  const budgetPrompt = `budget ${budget.capsule.capsule_checksum}`;
  const competitor = makeArtifacts("budget", { attemptSequence: 2 });
  const competitorPrompt = `competitor ${competitor.capsule.capsule_checksum}`;
  const competitorAdmission = admit(competitor, competitorPrompt);
  equal(competitorAdmission.admitted, true, "first competing pending lease must see the original budget snapshot");
  equal(commit(competitor, competitorAdmission, competitorPrompt).committed, true, "competing lease fixture must commit once");
  const staleBudgetAdmission = admit(budget, budgetPrompt);
  equal(staleBudgetAdmission.admitted, false, "pending lease with stale surfaced byte snapshot must not dispatch");
  equal(staleBudgetAdmission.reason, "surfaced_budget_changed_before_dispatch", "budget drift must be distinguishable");

  const compact = makeArtifacts("compact");
  const compactMemory = memory.createEmptyGroupMemory(compact.groupId, compact.groupSessionId);
  compactMemory.compaction = { summaryChecksum: "phase248-new-compact-boundary" };
  memory.saveGroupMemory(compact.groupId, compactMemory, compact.groupSessionId);
  const compactAdmission = admit(compact, `compact ${compact.capsule.capsule_checksum}`);
  equal(compactAdmission.admitted, false, "pending precompact lease must not cross a new compact boundary");
  equal(compactAdmission.reason, "compact_epoch_changed_before_dispatch", "compact drift must be distinguishable");

  const noMemoryAdmission = memory.admitChildTypedMemoryDelivery(null, { renderedPrompt: "ordinary global task" });
  equal(noMemoryAdmission.admitted, true, "non-group and Global Agent dispatches must remain admitted without group memory");
  equal(noMemoryAdmission.required, false, "Global Agent must not require a group consume ticket");

  const packetTamper = makeArtifacts("packet");
  const packetPrompt = `packet ${packetTamper.capsule.capsule_checksum}`;
  const packetAdmission = admit(packetTamper, packetPrompt);
  const forgedPacket = { ...packetTamper.packet, packet_id: `${packetTamper.packet.packet_id}-forged` };
  const packetTicketValidation = kernel.validateWorkerTypedMemoryDispatchTicket(packetAdmission.ticket, {
    lease: packetAdmission.lease,
    capsule: packetAdmission.capsule,
    workerContextPacket: forgedPacket,
    renderedPrompt: packetPrompt,
  });
  equal(packetTicketValidation.valid_for_dispatch, false, "ticket replay against another WorkerContextPacket must fail");
  ok(packetTicketValidation.validation_issues.includes("worker_packet_binding_mismatch"), "packet replay diagnostics must be explicit");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const mainAdmission = collaborationSource.indexOf("const typedMemoryDispatchAdmission = admitChildTypedMemoryDelivery");
  const mainCall = collaborationSource.indexOf("const attemptOutput = await ctx.callAgentForGroupStream", mainAdmission);
  const mainCommit = collaborationSource.indexOf("const typedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", mainCall);
  ok(mainAdmission >= 0 && mainAdmission < mainCall && mainCall < mainCommit, "group worker path must admit, call runner, then commit");
  const directAdmission = collaborationSource.indexOf("const directTypedMemoryDispatchAdmission = admitChildTypedMemoryDelivery");
  const directCall = collaborationSource.indexOf("output = await ctx.callAgent(task.target_project, message", directAdmission);
  const directCommit = collaborationSource.indexOf("const directTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", directCall);
  ok(directAdmission >= 0 && directAdmission < directCall && directCall < directCommit, "direct task path must admit, call runner, then commit");
  const autoAdmission = collaborationSource.indexOf("const autoAssignTypedMemoryDispatchAdmission = admitChildTypedMemoryDelivery");
  const autoCall = collaborationSource.indexOf("const taskResult = await ctx.callAgent(", autoAdmission);
  const autoCommit = collaborationSource.indexOf("const autoAssignTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", autoCall);
  ok(autoAdmission >= 0 && autoAdmission < autoCall && autoCall < autoCommit, "auto-assign path must admit, call runner, then commit");

  console.log(JSON.stringify({
    pass: true,
    checks,
    ticketSchema: baseAdmission.ticket.schema,
    missingTicketRejected: missingTicket.committed === false,
    expiredDispatchRejected: expiredCommit.committed === false,
    budgetDriftRejected: staleBudgetAdmission.admitted === false,
    compactDriftRejected: compactAdmission.admitted === false,
    providerRetryDeliveryCount: retryCommit.stats.deliveryCount,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
