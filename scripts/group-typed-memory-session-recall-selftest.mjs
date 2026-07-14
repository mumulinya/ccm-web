import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase243-session-recall-${nonce}`;
const groupSessionId = `gcs_phase243_${nonce}`;
const typedScopeId = `${groupId}--${groupSessionId}`;
const project = "phase243-project";
const relPath = "session-recall-rule.md";
const query = "PHASE243_SESSION_RECALL_RULE deployment verification";

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (child.name !== groupId && !child.name.startsWith(`${groupId}.`) && !child.name.startsWith(`${groupId}--`)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function writeRule(version) {
  typed.upsertGroupTypedMemoryDocument(typedScopeId, {
    type: "project",
    slug: "session-recall-rule",
    name: "Session recall rule",
    description: `PHASE243_SESSION_RECALL_RULE ${version}`,
    source: "selftest:phase243-session-recall",
    body: `# Session recall rule\nPHASE243_SESSION_RECALL_RULE ${version}: verify deployment before completion.`,
    updatedAt: new Date().toISOString(),
  });
  return typed.scanGroupTypedMemoryDocuments(typedScopeId).find(row => row.relPath === relPath);
}

function buildBundle(taskId, taskAgentSessionId) {
  return memory.buildAgentMemoryContextBundle(groupId, project, query, {
    groupSessionId,
    taskId,
    taskAgentSessionId,
    agentType: "codex",
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
  });
}

function recalled(bundle, marker = "") {
  const rows = bundle?.group_state?.typedMemory?.recall?.recalled || [];
  return rows.some(row => row.relPath === relPath && (!marker || `${row.description}\n${row.snippet}`.includes(marker)));
}

function commitBundle(bundle, taskId, taskAgentSessionId) {
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, members: [{ project }] },
    project,
    task: query,
    taskId,
    groupSessionId,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = packet.typed_memory_delivery_capsule?.capsule_checksum || "";
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    skipGroupSessionPresenceCheck: true,
  });
  assert.equal(admission.admitted, true, "delivery must pass dispatch-time consume admission");
  return memory.commitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    dispatchEvidence: {
      dispatched: true,
      executionReturned: true,
      renderedPrompt,
      dispatchTicket: admission.ticket,
      dispatchStartedAt: admission.ticket?.admitted_at || new Date().toISOString(),
    },
  });
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  const original = writeRule("v1");
  assert.ok(original?.checksum, "fixture memory must have a checksum");

  const scopeA = memory.buildChildTypedMemoryRecallLedgerScope(project, {
    task_id: "phase243-task-a",
    task_agent_session_id: "tas_phase243_a",
  }, {}, {});
  const scopeB = memory.buildChildTypedMemoryRecallLedgerScope(project, {
    task_id: "phase243-task-b",
    task_agent_session_id: "tas_phase243_b",
  }, {}, {});
  const scopeAfterCompact = memory.buildChildTypedMemoryRecallLedgerScope(project, {
    task_id: "phase243-task-a",
    task_agent_session_id: "tas_phase243_a",
  }, { compactBoundary: { id: "phase243-boundary-2" } }, {});

  assert.notEqual(scopeA.scope, scopeB.scope, "different task Agent sessions need independent recall scopes");
  assert.notEqual(scopeA.scope, scopeAfterCompact.scope, "a new compact epoch must reset recall dedupe");
  assert.equal(scopeA.sessionBound, true, "task Agent session scope must be explicitly bound");

  const firstA = buildBundle("phase243-task-a", "tas_phase243_a");
  assert.equal(firstA.group_state.typedMemory.ledger.scope, scopeA.scope, "real worker bundle must use the session recall scope");
  assert.equal(firstA.group_state.typedMemory.ledger.sessionBound, true, "real worker bundle must expose session-bound recall metadata");
  assert.equal(recalled(firstA, "v1"), true, "Session A must receive the relevant memory on first dispatch");
  assert.equal(typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, scopeA.scope).deliveryCount, 0, "bundle construction must not surface memory before dispatch");
  assert.equal(commitBundle(firstA, "phase243-task-a", "tas_phase243_a").committed, true, "successful dispatch must commit Session A memory");

  const repeatedA = buildBundle("phase243-task-a", "tas_phase243_a");
  assert.equal(recalled(repeatedA), false, "the same task Agent session and compact epoch should dedupe unchanged memory");

  const firstB = buildBundle("phase243-task-b", "tas_phase243_b");
  assert.equal(firstB.group_state.typedMemory.ledger.scope, scopeB.scope, "Session B must use its own recall scope");
  assert.equal(recalled(firstB, "v1"), true, "a new task Agent session must receive memory seen by Session A");
  assert.equal(commitBundle(firstB, "phase243-task-b", "tas_phase243_b").committed, true, "successful dispatch must commit Session B memory independently");

  const updated = writeRule("v2");
  assert.notEqual(updated.checksum, original.checksum, "updated memory must have a new checksum");
  const changedAlreadySurfaced = typed.getAlreadySurfacedGroupTypedMemory(typedScopeId, scopeA.scope);
  assert.equal(changedAlreadySurfaced.includes(relPath), false, "an old checksum must not suppress an updated memory document");
  const updatedA = buildBundle("phase243-task-a", "tas_phase243_a");
  assert.equal(recalled(updatedA, "v2"), true, "updated memory must be re-injected into the same task Agent session");

  assert.equal(typed.getAlreadySurfacedGroupTypedMemory(typedScopeId, scopeA.scope).includes(relPath), false, "updated memory must remain pending until delivery");
  assert.equal(commitBundle(updatedA, "phase243-task-a", "tas_phase243_a").committed, true, "updated memory delivery must commit after dispatch");
  const currentAlreadySurfaced = typed.getAlreadySurfacedGroupTypedMemory(typedScopeId, scopeA.scope);
  assert.equal(currentAlreadySurfaced.includes(relPath), true, "the current checksum should dedupe after successful surfacing");

  const directRecall = typed.buildGroupTypedMemoryRecall(typedScopeId, query, { max: 5 });
  for (let i = 0; i < typed.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES + 5; i += 1) {
    typed.recordGroupTypedMemoryRecall(typedScopeId, `phase243-retention-${i}`, directRecall, query, {
      scopeMetadata: { scopeKind: "selftest", taskId: `retention-${i}` },
    });
  }
  const boundedLedger = typed.readGroupTypedMemoryRecallLedger(typedScopeId);
  assert.equal(Object.keys(boundedLedger.scopes).length, typed.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES, "recall scopes must remain bounded");
  assert.equal(Object.hasOwn(boundedLedger.scopes, "phase243-retention-0"), false, "old recall scopes should be pruned first");

  console.log(JSON.stringify({
    pass: true,
    checks: 20,
    taskSessionIsolation: true,
    sameSessionDedup: true,
    changedChecksumResurfaced: true,
    compactEpochReset: true,
    boundedScopes: Object.keys(boundedLedger.scopes).length,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
