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
const groupId = `phase284-selector-outcome-${nonce}`;
const sessionA = `gcs_phase284_a_${nonce}`;
const sessionB = `gcs_phase284_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "phase284-project";
const taskId = `phase284-task-${nonce}`;
const taskAgentSessionId = `tas_phase284_${nonce}`;
const query = "PHASE284_API_WARNING and PHASE284_USER_PREFERENCE";

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

function writeDoc(scopeId, slug, type, description, body) {
  typed.upsertGroupTypedMemoryDocument(scopeId, {
    type,
    slug,
    name: slug,
    description,
    source: "selftest:phase284-selector-outcome",
    body: `# ${slug}\n\n${body}`,
  });
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  writeDoc(scopeA, "phase284-api-warning", "feedback", "PHASE284_API_WARNING payment retry hazard", "Never retry a payment request without checking current state.");
  writeDoc(scopeA, "phase284-user-preference", "user", "PHASE284_USER_PREFERENCE concise reports", "The user wants concise engineering reports.");
  writeDoc(scopeB, "phase284-session-b", "project", "PHASE284_SESSION_B isolated memory", "Only Session B may use this memory.");

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
    manifestSelectorExecutor: async () => ({
      selected_memories: ["phase284-api-warning.md", "phase284-user-preference.md"],
      project: "phase284-selector",
      agentType: "codex",
      model: "phase284-test-model",
    }),
  });
  const selection = bundle.typed_memory_manifest_selection;
  const attached = bundle.typed_memory_manifest_selector_outcome;
  equal(selection.status, "selected", "selector must choose the two relevant headers");
  equal(selection.selectedRelPaths.length, 2, "selection decision must retain both chosen filenames");
  equal(typed.verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeA, selection).valid, true, "attached outcome must bind the exact selection and session");
  equal(attached.recalledSelectedRelPaths.length, 2, "both selected documents must survive recall scoring");
  equal(attached.attachedSelectedRelPaths.length, 1, "delivery budget must attach only one selected document");
  equal(attached.recalledNotAttachedRelPaths.length, 1, "budget clipping must remain explicitly observable");

  const beforeCommit = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  equal(beforeCommit.attachedOutcomeCount, 1, "bundle construction must create one attached outcome");
  equal(beforeCommit.committedOutcomeCount, 0, "bundle construction alone must not claim provider delivery");
  equal(beforeCommit.selectedAttachedDocumentCount, 1, "summary must count only the selected document that entered the capsule");
  equal(beforeCommit.recalledNotAttachedDocumentCount, 1, "summary must expose selected memory dropped by the capsule budget");

  const packet = kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 284", members: [{ project }] },
    project,
    task: query,
    taskId,
    groupSessionId: sessionA,
    taskAgentSessionId,
    memory: bundle,
  });
  const renderedPrompt = `phase284 prompt capsule=${bundle.typed_memory_delivery_capsule.capsule_checksum}`;
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
    skipGroupSessionPresenceCheck: true,
  });
  equal(admission.admitted, true, "trusted packet must pass dispatch-time admission");
  const committed = memory.commitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    dispatchEvidence: {
      dispatched: true,
      executionReturned: true,
      renderedPrompt,
      dispatchTicket: admission.ticket,
      dispatchStartedAt: admission.ticket.admitted_at,
    },
  });
  equal(committed.committed, true, "real dispatch witness must commit typed-memory delivery");
  equal(committed.manifest_selector_outcome.stage, "committed", "delivery commit must append a committed selector outcome");
  equal(typed.verifyGroupTypedMemoryManifestSelectorOutcome(committed.manifest_selector_outcome, scopeA, selection).valid, true, "committed outcome checksum and selection binding must verify");

  const afterCommit = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  equal(afterCommit.committedOutcomeCount, 1, "summary must count the committed provider delivery");
  equal(afterCommit.selectedCommittedDocumentCount, 1, "committed count must use the capsule-attached selected set");
  equal(afterCommit.closureValid, true, "attached and committed outcome chain must close successfully");

  const duplicate = memory.commitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    dispatchEvidence: {
      dispatched: true,
      executionReturned: true,
      renderedPrompt,
      dispatchTicket: admission.ticket,
      dispatchStartedAt: admission.ticket.admitted_at,
    },
  });
  equal(duplicate.committed, true, "delivery retry must stay idempotently committed");
  equal(duplicate.manifest_selector_outcome.checksum, committed.manifest_selector_outcome.checksum, "delivery retry must reuse the same committed outcome");

  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.[0] || {};
  equal(centerRow.manifestSelectorSelectedAttachedDocumentCount, 1, "Memory Center must expose attached selected documents");
  equal(centerRow.manifestSelectorSelectedCommittedDocumentCount, 1, "Memory Center must expose committed selected documents");
  equal(centerRow.manifestSelectorClosureValid, true, "Memory Center must expose a verified selector delivery closure");

  const committedFile = committed.manifest_selector_outcome.outcomeFile;
  const pristine = fs.readFileSync(committedFile, "utf-8");
  const tampered = JSON.parse(pristine);
  tampered.attachedSelectedRelPaths = [];
  fs.writeFileSync(committedFile, JSON.stringify(tampered, null, 2), "utf-8");
  const tamperedSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA);
  equal(tamperedSummary.valid, false, "tampered committed outcome must invalidate selector telemetry");
  ok(tamperedSummary.invalidOutcomeCount >= 1, "tampered outcome must be counted explicitly");
  fs.writeFileSync(committedFile, pristine, "utf-8");

  equal(typed.verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeB, selection).valid, false, "selector outcome must not cross group-chat sessions");
  const orphanSelection = await typed.selectGroupTypedMemoryManifest(scopeB, "PHASE284_SESSION_B", {
    executor: async () => ({ selected_memories: ["phase284-session-b.md"] }),
  });
  const future = Date.parse(orphanSelection.completedAt) + 10 * 60_000;
  const orphanSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeB, { nowMs: future, staleAfterMs: 60_000 });
  equal(orphanSummary.staleUnattachedDecisionCount, 1, "aged selected decision without a final bundle must become an orphan gap");
  equal(orphanSummary.closureValid, false, "orphan selection must fail delivery closure without corrupting decision integrity");

  const ephemeralBundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(groupId, project, "PHASE284_SESSION_B", {
    groupSessionId: sessionB,
    taskId: `${taskId}-ephemeral`,
    taskAgentSessionId: `${taskAgentSessionId}_ephemeral`,
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    recordManifestSelectorDecision: false,
    manifestSelectorExecutor: async () => ({ selected_memories: ["phase284-session-b.md"] }),
  });
  const ephemeralOutcome = ephemeralBundle.typed_memory_manifest_selector_outcome;
  equal(ephemeralOutcome.recorded, false, "disabling selector decision persistence must also disable outcome persistence");
  equal(fs.existsSync(path.join(typed.getGroupTypedMemoryManifestSelectorOutcomeDir(scopeB), `${ephemeralOutcome.requestId}.attached.json`)), false, "ephemeral selection must not leave an unmatched outcome file");

  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 284 must not create a legacy default session");
  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
