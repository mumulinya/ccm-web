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
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase285-selector-consumption-${nonce}`;
const sessionA = `gcs_phase285_a_${nonce}`;
const sessionB = `gcs_phase285_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "phase285-project";

let checks = 0;
function equal(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }
function ok(value, message) { checks += 1; assert.ok(value, message); }

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

function writeDoc(scopeId, slug, body) {
  typed.upsertGroupTypedMemoryDocument(scopeId, {
    type: "project",
    slug,
    name: slug,
    description: `${slug} selector consumption evidence`,
    source: "selftest:phase285-selector-consumption",
    body: `# ${slug}\n\n${body}`,
  });
}

async function createCommitted(slug, suffix) {
  const taskId = `phase285-task-${suffix}-${nonce}`;
  const taskAgentSessionId = `tas_phase285_${suffix}_${nonce}`;
  const query = `Recall ${slug}`;
  const bundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, query, {
    groupSessionId: sessionA,
    taskId,
    taskAgentSessionId,
    taskAgentSessionTurn: 1,
    agentType: "codex",
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
    maxTypedMemoryDeliveryDocuments: 1,
    manifestSelectorExecutor: async () => ({ selected_memories: [`${slug}.md`] }),
  });
  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 285", members: [{ project }] },
    project,
    task: query,
    taskId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = `phase285 prompt capsule=${bundle.typed_memory_delivery_capsule.capsule_checksum}`;
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
    skipGroupSessionPresenceCheck: true,
  });
  assert.equal(admission.admitted, true);
  const deliveryReceipt = {
    schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
    status: "delivered",
    delivered: true,
    checksum: `receipt_${suffix}_${nonce}`,
    taskAgentSessionId,
    memoryContextSnapshotId: `tmcs_${suffix}_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot_checksum_${suffix}_${nonce}`,
    workerContextPacketId: packet.packet_id,
  };
  const delivery = memory.commitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    dispatchEvidence: {
      deliveryReceipt,
      dispatched: true,
      executionReturned: true,
      renderedPrompt,
      dispatchTicket: admission.ticket,
      dispatchStartedAt: admission.ticket.admitted_at,
    },
  });
  assert.equal(delivery.committed, true);
  const committed = delivery.manifest_selector_outcome;
  assert.ok(committed.memoryContextSnapshotId);
  assert.ok(committed.memoryContextSnapshotChecksum);
  assert.ok(committed.deliveryReceiptChecksum);
  return { taskId, taskAgentSessionId, bundle, committed, relPath: `${slug}.md` };
}

function consumptionInput(chain, usageState, extra = {}) {
  const receipt = {
    taskAgentSessionId: chain.taskAgentSessionId,
    typedMemoryUsage: extra.typedMemoryUsage || [{ relPath: chain.relPath, usageState, reason: `${usageState} in phase 285` }],
    memoryUsed: extra.memoryUsed || [],
    memoryIgnored: extra.memoryIgnored || [],
  };
  return {
    taskId: chain.taskId,
    targetProject: project,
    rows: [{
      task_agent_session_id: chain.taskAgentSessionId,
      target_project: project,
      rel_path: chain.relPath,
      usage_state: usageState,
      claimed_usage_state: extra.claimedUsageState || usageState,
      memory_context_snapshot_id: chain.committed.memoryContextSnapshotId,
      memory_context_snapshot_checksum: chain.committed.memoryContextSnapshotChecksum,
      delivery_receipt_checksum: chain.committed.deliveryReceiptChecksum,
      receipt_evidence_checksum: `receipt-evidence-${chain.taskAgentSessionId}`,
      evidence_tier: extra.evidenceTier || "bound_structured_receipt",
      evidence_confidence: extra.evidenceConfidence ?? 0.75,
      direct_reference: extra.directReference !== false,
      current_source_verified: extra.currentSourceVerified === true,
      current_source_proof_valid: extra.currentSourceProofValid === true,
      reason: extra.reason || `${usageState} in phase 285`,
    }],
    receipts: [receipt],
    generatedAt: new Date().toISOString(),
  };
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  for (const slug of ["phase285-used", "phase285-ignored", "phase285-verified", "phase285-unreported", "phase285-unexpected", "phase285-downgraded", "phase285-stale"]) {
    writeDoc(scopeA, slug, `${slug.toUpperCase()} body`);
  }
  writeDoc(scopeB, "phase285-session-b", "SESSION B ONLY");

  const used = await createCommitted("phase285-used", "used");
  const usedInput = consumptionInput(used, "used");
  const usedRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, usedInput);
  equal(usedRecord.recordedCount, 1, "used receipt must create one consumption outcome");
  equal(usedRecord.outcomes[0].documents[0].usageState, "used", "used state must survive bound receipt recording");
  equal(usedRecord.outcomes[0].receiptBindingValid, true, "snapshot and delivery receipt must bind to committed dispatch evidence");

  const duplicate = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, { ...usedInput, generatedAt: new Date().toISOString() });
  equal(duplicate.recordedCount, 0, "same receipt must not create a second consumption event");
  equal(duplicate.idempotentCount, 1, "same receipt must be reported as idempotent");

  const ignored = await createCommitted("phase285-ignored", "ignored");
  const ignoredRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumptionInput(ignored, "ignored", {
    memoryIgnored: [ignored.relPath],
  }));
  equal(ignoredRecord.outcomes[0].documents[0].usageState, "ignored", "explicit ignore must remain distinguishable from no receipt");

  const verified = await createCommitted("phase285-verified", "verified");
  const verifiedRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumptionInput(verified, "verified", {
    evidenceTier: "system_current_source_file_proof",
    evidenceConfidence: 1,
    currentSourceVerified: true,
    currentSourceProofValid: true,
  }));
  equal(verifiedRecord.outcomes[0].documents[0].usageState, "verified", "verified requires platform-recomputed current-source proof");

  const downgraded = await createCommitted("phase285-downgraded", "downgraded");
  const downgradedRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumptionInput(downgraded, "verified"));
  equal(downgradedRecord.outcomes[0].documents[0].usageState, "used", "unproved verified claim must be downgraded to used");
  ok(downgradedRecord.outcomes[0].documents[0].anomalyCodes.includes("verified_without_system_current_source_proof"), "verified downgrade must preserve anomaly attribution");

  const unreported = await createCommitted("phase285-unreported", "unreported");
  const unreportedRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumptionInput(unreported, "mentioned", {
    typedMemoryUsage: [],
    directReference: false,
  }));
  equal(unreportedRecord.outcomes[0].documents[0].usageState, "unreported", "surfaced document without per-relPath declaration must be unreported");

  const unexpected = await createCommitted("phase285-unexpected", "unexpected");
  const unexpectedRecord = typed.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeA, consumptionInput(unexpected, "used", {
    typedMemoryUsage: [
      { relPath: unexpected.relPath, usageState: "used", reason: "expected" },
      { relPath: "phase285-not-delivered.md", usageState: "used", reason: "must be rejected" },
    ],
  }));
  equal(unexpectedRecord.outcomes[0].unexpectedClaimedRelPaths[0], "phase285-not-delivered.md", "receipt must expose claims for memory that was never delivered");

  const summary = typed.summarizeGroupTypedMemoryManifestSelectorConsumption(scopeA);
  equal(summary.deliveredDocumentCount, 6, "summary must count every delivered document with a consumption outcome");
  equal(summary.usedDocumentCount, 3, "used count includes the unproved verified claim downgraded to used");
  equal(summary.verifiedDocumentCount, 1, "verified count must include only strong source proof");
  equal(summary.ignoredDocumentCount, 1, "ignored count must remain explicit");
  equal(summary.unreportedDocumentCount, 1, "unreported count must remain explicit");
  equal(summary.unexpectedClaimCount, 1, "unexpected relPath claim must become a closure gap");
  equal(summary.closureValid, false, "unreported or unexpected claims must fail consumption closure");

  const pristineFile = usedRecord.outcomes[0].consumptionFile;
  const pristine = fs.readFileSync(pristineFile, "utf-8");
  const tampered = JSON.parse(pristine);
  tampered.documents[0].usageState = "ignored";
  fs.writeFileSync(pristineFile, JSON.stringify(tampered, null, 2), "utf-8");
  const tamperedSummary = typed.summarizeGroupTypedMemoryManifestSelectorConsumption(scopeA);
  ok(tamperedSummary.invalidOutcomeCount >= 1, "tampered consumption outcome must fail checksum verification");
  fs.writeFileSync(pristineFile, pristine, "utf-8");

  equal(typed.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(usedRecord.outcomes[0], scopeB, used.committed).valid, false, "consumption outcome must not cross group-chat sessions");
  const incomplete = { ...usedRecord.outcomes[0], documents: [] };
  equal(typed.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(incomplete, scopeA, used.committed).documentsCoverAttached, false, "consumption outcome must cover every attached document");

  const stale = await createCommitted("phase285-stale", "stale");
  const staleAt = Date.parse(stale.committed.createdAt) + 10 * 60_000;
  const staleSummary = typed.summarizeGroupTypedMemoryManifestSelectorConsumption(scopeA, { nowMs: staleAt, staleAfterMs: 60_000 });
  equal(staleSummary.staleCommittedWithoutConsumptionCount, 1, "aged committed dispatch without receipt must become a closure gap");

  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.[0] || {};
  equal(centerRow.manifestSelectorConsumptionDeliveredDocumentCount, 6, "Memory Center must expose delivered documents with consumption receipts");
  equal(centerRow.manifestSelectorConsumptionVerifiedDocumentCount, 1, "Memory Center must expose strongly verified usage");
  equal(centerRow.manifestSelectorConsumptionUnreportedDocumentCount, 1, "Memory Center must expose missing per-document receipts");
  equal(centerRow.manifestSelectorConsumptionUnexpectedClaimCount, 1, "Memory Center must expose unexpected claims");
  equal(centerRow.manifestSelectorConsumptionClosureValid, false, "Memory Center must surface consumption closure gaps");

  let ignoreSelectorCalls = 0;
  const ignoredBundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, "ignore memory for this task", {
    groupSessionId: sessionA,
    taskId: `phase285-ignore-${nonce}`,
    taskAgentSessionId: `tas_phase285_ignore_${nonce}`,
    ignoreMemory: true,
    manifestSelectorExecutor: async () => { ignoreSelectorCalls += 1; return { selected_memories: ["phase285-used.md"] }; },
  });
  equal(ignoreSelectorCalls, 0, "user ignore-memory request must skip selector execution");
  equal(ignoredBundle.group_state.typedMemory.recall.ignored, true, "ignore-memory task must receive an empty typed-memory context");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  ok(collaborationSource.includes("recordGroupTypedMemoryManifestSelectorConsumptionOutcomes"), "delivery summary must record selector consumption outcomes");
  ok(collaborationSource.includes("每个 relPath"), "child-agent contract must require per-relPath typedMemoryUsage");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 285 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
