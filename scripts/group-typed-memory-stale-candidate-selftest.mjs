import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const globalAgent = require(path.join(root, "ccm-package", "dist", "modules", "global", "global-agent.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase242-stale-candidate-${nonce}`;
const sessionA = `gcs_phase242_a_${nonce}`;
const sessionB = `gcs_phase242_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "cc-connect-test";
const runtimeRoot = path.resolve(root, "..");
const fixtureDir = path.join(root, "scratch", groupId);
const sourceFile = path.join(fixtureDir, "current-source.txt");
const sourceRelativePath = path.relative(root, sourceFile).replace(/\\/g, "/");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function cleanupScope(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const parent = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${parent}${path.sep}`) && path.basename(dir).startsWith("phase242-stale-candidate-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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

function writeMemory(scopeId, slug, marker) {
  typed.upsertGroupTypedMemoryDocument(scopeId, {
    type: "project",
    slug,
    name: `${slug} memory`,
    description: `${marker} historical claim`,
    source: "phase242-selftest",
    body: `# ${slug}\n${marker}: historical claim that conflicts with current source.`,
  });
  return typed.scanGroupTypedMemoryDocuments(scopeId).find(row => row.relPath === `${slug}.md`);
}

function candidateRow(doc, action, options = {}) {
  const observed = sha256(sourceFile);
  return {
    target_project: project,
    task_id: options.taskId || `task-${doc.relPath}`,
    execution_id: options.executionId || `execution-${doc.relPath}`,
    task_agent_session_id: options.taskAgentSessionId || `tas-${doc.relPath}`,
    memory_context_snapshot_id: `snapshot-${doc.relPath}`,
    memory_context_snapshot_checksum: `snapshot-checksum-${doc.relPath}`,
    delivery_receipt_checksum: `delivery-checksum-${doc.relPath}`,
    rel_path: doc.relPath,
    document_checksum: doc.checksum,
    usage_state: options.usageState || "verified",
    current_source_proof_valid: options.proofValid !== false,
    current_source_relative_path: sourceRelativePath,
    current_source_claimed_checksum: options.claimedChecksum || observed,
    current_source_observed_checksum: options.observedChecksum || observed,
    current_source_proof_id: options.proofId === "" ? "" : `proof-${doc.relPath}`,
    evidence_valid: options.evidenceValid !== false,
    receipt_evidence_checksum: `receipt-${doc.relPath}`,
    conflict_detected: options.conflictDetected !== false,
    conflict_kind: options.conflictKind || "behavior_changed",
    recommended_memory_action: action,
    conflict_reason: options.conflictReason || `Current source disproves ${doc.relPath}`,
    replacement_memory: action === "update" ? (options.replacementMemory || `PHASE242_REPLACEMENT_${doc.relPath}: use the current source behavior.`) : "",
  };
}

try {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(sourceFile, "phase242 current source v1\n", "utf-8");
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const updateDoc = writeMemory(scopeA, "phase242-update", "PHASE242_UPDATE_OLD");
  const removeDoc = writeMemory(scopeA, "phase242-remove", "PHASE242_REMOVE_OLD");
  const rejectDoc = writeMemory(scopeA, "phase242-reject", "PHASE242_REJECT_OLD");
  const changedSourceDoc = writeMemory(scopeA, "phase242-source-change", "PHASE242_SOURCE_CHANGE_OLD");
  writeMemory(scopeB, "phase242-update", "PHASE242_SESSION_B_OLD");
  writeMemory(scopeB, "phase242-remove", "PHASE242_SESSION_B_REMOVE");

  const rows = [
    candidateRow(updateDoc, "update"),
    candidateRow(removeDoc, "remove"),
    candidateRow(rejectDoc, "update", { replacementMemory: "PHASE242_REJECTED_BODY_MUST_NOT_RENDER" }),
    candidateRow(changedSourceDoc, "remove"),
  ];
  const recorded = typed.recordGroupTypedMemoryStaleCandidates(scopeA, { rows });
  assert.equal(recorded.recorded_count, 4, "four proof-bound candidates must be recorded");
  assert.equal(recorded.pending_count, 4, "candidates must remain pending before user confirmation");
  const duplicate = typed.recordGroupTypedMemoryStaleCandidates(scopeA, { rows });
  assert.equal(duplicate.duplicate_count, 4, "receipt replay must be idempotent");

  const scopeBLedgerFile = typed.getGroupTypedMemoryStaleCandidateLedgerFile(scopeB);
  fs.mkdirSync(path.dirname(scopeBLedgerFile), { recursive: true });
  fs.copyFileSync(typed.getGroupTypedMemoryStaleCandidateLedgerFile(scopeA), scopeBLedgerFile);
  assert.equal(typed.readGroupTypedMemoryStaleCandidateLedger(scopeB).ledger_checksum_valid, false, "a valid Session A ledger copied to Session B must fail scope binding");
  assert.equal(typed.scanGroupTypedMemoryDocuments(scopeB).length, 0, "cross-session ledger copy must fail closed without applying Session A projection");
  fs.rmSync(scopeBLedgerFile, { force: true });

  const before = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE242_UPDATE_OLD PHASE242_REMOVE_OLD", { disableLedger: true, forceMemory: true, max: 12 });
  assert.ok(before.recalled.some(row => row.relPath === updateDoc.relPath), "pending update must not alter recall");
  assert.ok(before.recalled.some(row => row.relPath === removeDoc.relPath), "pending remove must not alter recall");

  const updateCandidate = recorded.candidates.find(row => row.rel_path === updateDoc.relPath);
  const removeCandidate = recorded.candidates.find(row => row.rel_path === removeDoc.relPath);
  const rejectCandidate = recorded.candidates.find(row => row.rel_path === rejectDoc.relPath);
  const changedSourceCandidate = recorded.candidates.find(row => row.rel_path === changedSourceDoc.relPath);
  assert.throws(() => typed.resolveGroupTypedMemoryStaleCandidate(scopeA, {
    candidateId: updateCandidate.candidate_id,
    candidateChecksum: "0".repeat(64),
    action: "confirm_update",
    reason: "tampered checksum",
    explicitConfirmation: true,
  }), /checksum mismatch/, "tampered candidate checksum must fail closed");

  const updateResolution = typed.resolveGroupTypedMemoryStaleCandidate(scopeA, {
    candidateId: updateCandidate.candidate_id,
    candidateChecksum: updateCandidate.checksum,
    action: "confirm_update",
    reason: "Current source is authoritative",
    actor: "phase242-selftest-user",
    explicitConfirmation: true,
  });
  assert.equal(updateResolution.event.status, "applied", "confirmed update must append an applied resolution event");
  assert.ok(updateResolution.event.replacement_rel_path, "confirmed update must create a replacement MEMORY.md");
  const afterUpdateDocs = typed.scanGroupTypedMemoryDocuments(scopeA);
  assert.ok(!afterUpdateDocs.some(row => row.relPath === updateDoc.relPath), "confirmed old document must be tombstoned");
  assert.ok(afterUpdateDocs.some(row => row.relPath === updateResolution.event.replacement_rel_path), "replacement document must enter the typed index");

  typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "project",
    slug: "phase242-update",
    name: "regenerated old memory",
    description: "distillation attempted to regenerate old relPath",
    source: "phase242-regeneration-probe",
    body: "PHASE242_UPDATE_OLD_REGENERATED",
  });
  assert.ok(!typed.scanGroupTypedMemoryDocuments(scopeA).some(row => row.relPath === updateDoc.relPath), "persistent tombstone must suppress regenerated old relPath");

  const removeResolution = typed.resolveGroupTypedMemoryStaleCandidate(scopeA, {
    candidateId: removeCandidate.candidate_id,
    candidateChecksum: removeCandidate.checksum,
    action: "confirm_remove",
    reason: "The current source removed this behavior",
    actor: "phase242-selftest-user",
    explicitConfirmation: true,
  });
  assert.equal(removeResolution.event.status, "applied", "confirmed remove must be applied");
  assert.ok(!typed.scanGroupTypedMemoryDocuments(scopeA).some(row => row.relPath === removeDoc.relPath), "confirmed remove must disappear from recall projection");

  const rejectResolution = typed.resolveGroupTypedMemoryStaleCandidate(scopeA, {
    candidateId: rejectCandidate.candidate_id,
    candidateChecksum: rejectCandidate.checksum,
    action: "reject",
    reason: "The memory remains valid for this session",
    actor: "phase242-selftest-user",
    explicitConfirmation: true,
  });
  assert.equal(rejectResolution.event.status, "rejected", "user rejection must be immutable and non-destructive");
  assert.ok(typed.scanGroupTypedMemoryDocuments(scopeA).some(row => row.relPath === rejectDoc.relPath), "rejected candidate must leave current memory intact");

  fs.writeFileSync(sourceFile, "phase242 current source v2\n", "utf-8");
  assert.throws(() => typed.resolveGroupTypedMemoryStaleCandidate(scopeA, {
    candidateId: changedSourceCandidate.candidate_id,
    candidateChecksum: changedSourceCandidate.checksum,
    action: "confirm_remove",
    reason: "stale proof must not execute",
    explicitConfirmation: true,
  }), /no longer valid/, "source changes after candidate creation must require a fresh candidate");
  fs.writeFileSync(sourceFile, "phase242 current source v1\n", "utf-8");

  const noProof = typed.recordGroupTypedMemoryStaleCandidates(scopeA, {
    rows: [candidateRow(changedSourceDoc, "remove", { taskId: "no-proof", proofValid: false, proofId: "" })],
  });
  assert.equal(noProof.recorded_count, 0, "candidate without system current-source proof must be rejected");
  assert.ok(noProof.rejections.at(-1).rejection_codes.includes("current_source_proof_invalid"), "proof rejection must be metadata-only and explain the gate");
  assert.equal("replacement_memory" in noProof.rejections.at(-1), false, "invalid candidate rejection must not persist candidate body");

  const ignored = typed.recordGroupTypedMemoryStaleCandidates(scopeA, {
    rows: [candidateRow(changedSourceDoc, "remove", { taskId: "ignored-memory", usageState: "ignored" })],
  });
  assert.equal(ignored.recorded_count, 0, "ignore-memory usage must never create a stale-memory candidate");
  assert.ok(ignored.rejections.at(-1).rejection_codes.includes("ignored_memory_cannot_create_candidate"), "ignore-memory rejection must be auditable without body");

  const wrongScope = typed.recordGroupTypedMemoryStaleCandidates(groupId, { rows: [candidateRow(changedSourceDoc, "remove", { taskId: "wrong-scope" })] });
  assert.equal(wrongScope.recorded_count, 0, "unscoped group memory must not accept candidates");
  assert.ok(wrongScope.rejections.at(-1).rejection_codes.includes("invalid_or_unscoped_group_session"), "wrong scope must be rejected explicitly");

  const sessionBDocs = typed.scanGroupTypedMemoryDocuments(scopeB);
  assert.ok(sessionBDocs.some(row => row.relPath === updateDoc.relPath), "session B must not inherit session A update tombstone");
  assert.ok(sessionBDocs.some(row => row.relPath === removeDoc.relPath), "session B must not inherit session A remove tombstone");

  const centerCandidates = center.summarizeMemoryCenterTypedStaleCandidateLedger(typed.readGroupTypedMemoryStaleCandidateLedger(scopeA)).candidates;
  const centerRejected = centerCandidates.find(row => row.candidateId === rejectCandidate.candidate_id);
  assert.equal(centerRejected.status, "rejected", "Memory Center must show rejected state");
  assert.equal(centerRejected.replacementMemory, "", "Memory Center must not expose rejected candidate body");

  const globalContext = globalAgent.buildAgenticContext("Route Phase 242 work to its owning group", `phase242-global-${nonce}`, {
    groups: [{ id: groupId, name: "Phase 242 group", members: [{ project, agent: "codex" }] }],
    recordDelivery: false,
    recordMemoryMetric: false,
  });
  const serializedGlobal = JSON.stringify(globalContext);
  assert.equal(globalContext.memory_context_boundary?.group_session_context_included, false, "Global Agent must remain routing-only for group session context");
  assert.ok(!serializedGlobal.includes("PHASE242_REJECTED_BODY_MUST_NOT_RENDER"), "Global Agent must never receive stale candidate body");

  const ledgerFile = typed.getGroupTypedMemoryStaleCandidateLedgerFile(scopeA);
  const pristineLedger = fs.readFileSync(ledgerFile, "utf-8");
  const tamperedLedger = JSON.parse(pristineLedger);
  tamperedLedger.candidates[0].conflict_reason = "tampered";
  fs.writeFileSync(ledgerFile, JSON.stringify(tamperedLedger, null, 2), "utf-8");
  assert.equal(typed.readGroupTypedMemoryStaleCandidateLedger(scopeA).ledger_checksum_valid, false, "ledger tampering must invalidate the whole projection");
  assert.equal(typed.scanGroupTypedMemoryDocuments(scopeA).length, 0, "tampered stale-candidate ledger must fail closed instead of resurfacing old memory");
  fs.writeFileSync(ledgerFile, pristineLedger, "utf-8");

  const finalLedger = typed.readGroupTypedMemoryStaleCandidateLedger(scopeA);
  assert.equal(finalLedger.pending_count, 1, "only the source-changed candidate should remain pending");
  assert.equal(finalLedger.applied_count, 2, "update and remove resolutions must remain applied");
  assert.equal(finalLedger.rejected_count, 1, "one user-rejected candidate must remain auditable");

  console.log(JSON.stringify({
    pass: true,
    checks: 36,
    pending: finalLedger.pending_count,
    applied: finalLedger.applied_count,
    rejected: finalLedger.rejected_count,
    invalidReceiptRejections: finalLedger.rejections.length,
    crossSessionIsolated: true,
    globalBodyIsolated: true,
    tombstonePersistent: true,
  }, null, 2));
} finally {
  cleanupScope(scopeA);
  cleanupScope(scopeB);
  cleanupScope(groupId);
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  cleanupRuntimeResidue();
}
