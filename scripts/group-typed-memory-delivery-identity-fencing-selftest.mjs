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
const worker = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase245-delivery-fencing-${nonce}`;
const groupSessionId = `gcs_phase245_${nonce}`;
const typedScopeId = `${groupId}--${groupSessionId}`;
const project = "phase245-project";
const taskId = "phase245-task";
const taskAgentSessionId = "tas_phase245_worker";
const sentinel = "PHASE245_IDENTITY_FENCING_SENTINEL";
const memoryBodySentinel = "PHASE245_REPLAYED_MEMORY_BODY";
const query = `${sentinel} verify delivery identity before using memory`;

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

function packetFor(memoryBundle, overrides = {}) {
  return kernel.buildWorkerContextPacket({
    group: { id: overrides.groupId || groupId, name: "Phase 245", members: [{ project: overrides.project || project }] },
    project: overrides.project || project,
    task: query,
    taskId: overrides.taskId || taskId,
    taskAgentSessionId: overrides.taskAgentSessionId || undefined,
    traceId: "phase245-trace",
    agentType: "codex",
    memory: memoryBundle,
  });
}

function assertReplayRejected(label, memoryBundle, overrides = {}, expectedIssue) {
  const packet = packetFor(memoryBundle, overrides);
  const capsule = packet.typed_memory_delivery_capsule;
  const prompt = kernel.renderWorkerContextPacket(packet);
  assert.equal(capsule.checksum_valid, true, `${label}: replay fixture must retain a valid capsule checksum`);
  assert.equal(capsule.binding_valid, false, `${label}: identity mismatch must fail binding`);
  assert.equal(capsule.trusted_for_delivery, false, `${label}: identity mismatch must not be trusted`);
  assert.equal(capsule.delivery_complete, false, `${label}: identity mismatch must make delivery incomplete`);
  assert.ok(capsule.binding_issues.includes(expectedIssue), `${label}: expected binding issue must be reported`);
  assert.ok(prompt.includes("INVALID delivery capsule"), `${label}: final prompt must fail closed`);
  assert.ok(!prompt.includes(memoryBodySentinel), `${label}: replayed memory body must not reach the final prompt`);
  return capsule;
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  typed.upsertGroupTypedMemoryDocument(typedScopeId, {
    type: "project",
    slug: "identity-fencing-rule",
    name: "Identity fencing rule",
    description: `${sentinel} ${memoryBodySentinel} belongs only to its bound Worker session.`,
    source: "selftest:phase245-delivery-fencing",
    body: `# Identity fencing rule\n${sentinel}: ${memoryBodySentinel} must never cross its bound Worker identity.`,
    updatedAt: new Date().toISOString(),
  });

  const bundle = memory.buildAgentMemoryContextBundle(groupId, project, query, {
    groupSessionId,
    taskId,
    taskAgentSessionId,
    agentType: "codex",
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
  });
  const capsule = bundle.typed_memory_delivery_capsule;
  const synthetic = {
    ...bundle,
    rendered_text: `PHASE245_GENERIC_MEMORY_WITHOUT_SECRET\n${"bounded-generic-context ".repeat(120)}`,
  };

  const validPacket = packetFor(synthetic, { taskAgentSessionId });
  const validPrompt = kernel.renderWorkerContextPacket(validPacket);
  assert.equal(validPacket.typed_memory_delivery_capsule.checksum_valid, true);
  assert.equal(validPacket.typed_memory_delivery_capsule.binding_valid, true);
  assert.equal(validPacket.typed_memory_delivery_capsule.trusted_for_delivery, true);
  assert.equal(validPacket.typed_memory_delivery_capsule.delivery_complete, true);
  assert.equal(validPacket.acceptance.typed_memory_delivery_capsule_binding_valid, true);
  assert.equal(validPacket.acceptance.typed_memory_delivery_capsule_trusted, true);
  assert.equal(validPacket.memory_recall_trust_contract.delivery_capsule_binding_valid, true);
  assert.ok(validPrompt.includes(memoryBodySentinel));

  const wrapperPacket = packetFor({ schema: "ccm-worker-memory-context-v1", group_memory: synthetic }, { taskAgentSessionId });
  assert.equal(wrapperPacket.typed_memory_delivery_capsule.trusted_for_delivery, true, "wrapped group memory must retain exact binding validation");

  const stalePrebuiltPacket = structuredClone(validPacket);
  stalePrebuiltPacket.group.id = `${groupId}-stale-packet`;
  stalePrebuiltPacket.project = `${project}-stale-packet`;
  stalePrebuiltPacket.task_id = `${taskId}-stale-packet`;
  const reboundHandoff = worker.buildSelfContainedWorkerHandoff({
    group: { id: groupId, name: "Phase 245 current assignment", members: [{ project }] },
    project,
    task: query,
    taskId,
    agentType: "codex",
    workerContextPacket: stalePrebuiltPacket,
    memory: synthetic,
  });
  assert.equal(reboundHandoff.worker_context_packet.group.id, groupId, "current assignment must replace stale prebuilt group identity");
  assert.equal(reboundHandoff.worker_context_packet.project, project, "current assignment must replace stale prebuilt project identity");
  assert.equal(reboundHandoff.worker_context_packet.task_id, taskId, "current assignment must replace stale prebuilt task identity");
  assert.equal(reboundHandoff.worker_context_packet.typed_memory_delivery_capsule.trusted_for_delivery, true, "current memory must be revalidated after prebuilt packet replacement");
  assert.equal(reboundHandoff.worker_context_packet.memory_context_rebound?.schema, "ccm-worker-context-current-memory-rebound-v1");

  assertReplayRejected("cross-group", synthetic, { groupId: `${groupId}-other`, taskAgentSessionId }, "binding_group_id_mismatch");
  assertReplayRejected("cross-project", synthetic, { project: `${project}-other`, taskAgentSessionId }, "binding_target_project_mismatch");

  const crossSession = structuredClone(synthetic);
  crossSession.group_session_id = `${groupSessionId}_other`;
  assertReplayRejected("cross-group-session", crossSession, { taskAgentSessionId }, "binding_group_session_id_mismatch");

  const crossTask = structuredClone(synthetic);
  crossTask.session_binding.task_id = `${taskId}-other`;
  assertReplayRejected("cross-task", crossTask, { taskId: `${taskId}-other`, taskAgentSessionId }, "binding_task_id_mismatch");

  const crossTaskSession = structuredClone(synthetic);
  crossTaskSession.session_binding.task_agent_session_id = `${taskAgentSessionId}-other`;
  assertReplayRejected("cross-task-session", crossTaskSession, { taskAgentSessionId: `${taskAgentSessionId}-other` }, "binding_task_agent_session_id_mismatch");

  const crossRecallScope = structuredClone(synthetic);
  crossRecallScope.group_state.typedMemory.ledger.scope = `${capsule.recall_scope}:other`;
  assertReplayRejected("cross-recall-scope", crossRecallScope, { taskAgentSessionId }, "binding_recall_scope_mismatch");

  const crossCompactEpoch = structuredClone(synthetic);
  crossCompactEpoch.group_state.typedMemory.ledger.compactEpoch = `${capsule.compact_epoch}:other`;
  assertReplayRejected("cross-compact-epoch", crossCompactEpoch, { taskAgentSessionId }, "binding_compact_epoch_mismatch");

  const proof = kernel.buildWorkerContextMemoryReinjectionProof(validPacket);
  assert.equal(proof.typed_memory_delivery_capsule_binding_valid, true);
  assert.equal(proof.typed_memory_delivery_capsule_trusted, true);

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const directSessionOpen = collaborationSource.indexOf("let directTaskSession = openTaskAgentSession");
  const directMemoryBuild = collaborationSource.indexOf("const directGroupMemoryContext = task.group_id", directSessionOpen);
  const autoSessionOpen = collaborationSource.indexOf("let autoAssignTaskSession = openTaskAgentSession");
  const autoMemoryBuild = collaborationSource.indexOf("const autoAssignGroupMemoryContext = autoAssignGroupId", autoSessionOpen);
  assert.ok(directSessionOpen >= 0 && directSessionOpen < directMemoryBuild, "direct dispatch must open its task Agent session before memory recall");
  assert.ok(autoSessionOpen >= 0 && autoSessionOpen < autoMemoryBuild, "auto dispatch must open its task Agent session before memory recall");
  assert.ok(collaborationSource.slice(directMemoryBuild, directMemoryBuild + 900).includes("taskAgentSessionId: directTaskSession?.id"));
  assert.ok(collaborationSource.slice(autoMemoryBuild, autoMemoryBuild + 900).includes("taskAgentSessionId: autoAssignTaskSession?.id"));

  console.log(JSON.stringify({
    pass: true,
    checks: 69,
    capsuleChecksum: capsule.capsule_checksum,
    expectedBindingChecksum: validPacket.typed_memory_delivery_expected_binding.binding_checksum,
    replayClassesRejected: 7,
    directDispatchSessionFirst: true,
    autoDispatchSessionFirst: true,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
