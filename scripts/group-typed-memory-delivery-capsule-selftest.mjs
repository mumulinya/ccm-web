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
const groupId = `phase244-delivery-capsule-${nonce}`;
const groupSessionId = `gcs_phase244_${nonce}`;
const typedScopeId = `${groupId}--${groupSessionId}`;
const project = "phase244-project";
const taskId = "phase244-task";
const taskAgentSessionId = "tas_phase244_worker";
const sentinel = "PHASE244_DELIVERY_SENTINEL";
const query = `${sentinel} verify deployment capsule before completion`;

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

function buildPacket(memoryBundle) {
  return kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 244", members: [{ project }] },
    project,
    task: query,
    taskId,
    traceId: "phase244-trace",
    agentType: "codex",
    memory: memoryBundle,
    verification: { commands: ["npm test"] },
  });
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  typed.upsertGroupTypedMemoryDocument(typedScopeId, {
    type: "project",
    slug: "delivery-capsule-rule",
    name: "Delivery capsule rule",
    description: `${sentinel} must reach the final third-party Agent prompt.`,
    source: "selftest:phase244-delivery-capsule",
    body: `# Delivery capsule rule\n${sentinel}: verify the current deployment source before marking work complete.\n${"bounded-detail ".repeat(180)}`,
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
  assert.equal(capsule.schema, "ccm-child-typed-memory-delivery-capsule-v1", "bundle must expose the delivery capsule");
  assert.equal(capsule.group_id, groupId, "capsule must bind the exact group");
  assert.equal(capsule.group_session_id, groupSessionId, "capsule must bind the exact group chat session");
  assert.equal(capsule.task_agent_session_id, taskAgentSessionId, "capsule must bind the task Agent session");
  assert.equal(capsule.delivery_complete, true, "all recalled documents must be delivered");
  assert.ok(capsule.delivered_chars <= 4800, "capsule total content must stay bounded");
  assert.ok(capsule.rows.every(row => row.delivered_chars <= 1200), "each delivered memory excerpt must stay bounded");
  assert.ok(capsule.rows.some(row => row.content.includes(sentinel)), "task-relevant memory content must enter the capsule");

  const validated = kernel.validateWorkerTypedMemoryDeliveryCapsule(capsule);
  assert.equal(validated.checksum_valid, true, "capsule and per-row checksums must verify");

  const syntheticBundle = {
    ...bundle,
    rendered_text: `GENERIC_MEMORY_HEAD\n${"generic-context-without-sentinel ".repeat(500)}\nGENERIC_MEMORY_TAIL`,
  };
  const packet = buildPacket(syntheticBundle);
  const prompt = kernel.renderWorkerContextPacket(packet);
  assert.equal(packet.typed_memory_delivery_capsule.checksum_valid, true, "WorkerContextPacket must carry a validated capsule");
  assert.equal(packet.memory_recall_trust_contract.delivery_capsule_checksum, capsule.capsule_checksum, "trust contract must bind the capsule checksum");
  assert.equal(packet.memory_recall_trust_contract.delivery_capsule_complete, true, "trust contract must require complete delivery");
  assert.equal(packet.acceptance.typed_memory_delivery_capsule_checksum_valid, true, "acceptance must expose capsule integrity");
  assert.ok(prompt.includes("## Typed memory delivery capsule"), "final Worker prompt must render the capsule as a dedicated section");
  assert.ok(prompt.includes(sentinel), "final Worker prompt must retain memory content independently of generic memory truncation");
  assert.ok(prompt.indexOf("## Typed memory delivery capsule") < prompt.indexOf("Memory recall trust contract"), "capsule must render before the generic memory/trust sections");

  const proof = kernel.buildWorkerContextMemoryReinjectionProof(packet);
  assert.equal(proof.typed_memory_delivery_capsule_checksum_valid, true, "reinjection proof must verify capsule integrity");
  assert.equal(proof.typed_memory_delivery_capsule_complete, true, "reinjection proof must verify complete relPath delivery");

  const tamperedBundle = structuredClone(syntheticBundle);
  tamperedBundle.typed_memory_delivery_capsule.rows[0].content = "PHASE244_TAMPERED_CAPSULE_BODY";
  tamperedBundle.typedMemoryDeliveryCapsule = tamperedBundle.typed_memory_delivery_capsule;
  tamperedBundle.group_state.typedMemory.deliveryCapsule = tamperedBundle.typed_memory_delivery_capsule;
  const tamperedPacket = buildPacket(tamperedBundle);
  const tamperedPrompt = kernel.renderWorkerContextPacket(tamperedPacket);
  assert.equal(tamperedPacket.typed_memory_delivery_capsule.checksum_valid, false, "tampered capsule must fail integrity validation");
  assert.ok(tamperedPrompt.includes("INVALID delivery capsule"), "tampered capsule must render a fail-closed warning");
  assert.ok(!tamperedPrompt.includes("PHASE244_TAMPERED_CAPSULE_BODY"), "tampered capsule content must not reach the Worker prompt");

  console.log(JSON.stringify({
    pass: true,
    checks: 21,
    capsuleChecksum: capsule.capsule_checksum,
    deliveredDocuments: capsule.delivered_count,
    deliveredChars: capsule.delivered_chars,
    finalPromptContainsMemory: true,
    tamperFailsClosed: true,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
