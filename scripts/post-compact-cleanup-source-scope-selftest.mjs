import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase301-cleanup-scope-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const compactHead = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase301-cleanup-scope-${process.pid}-${Date.now().toString(36)}`;
const sentinel = "PHASE301_RAW_TRANSCRIPT_BODY_MUST_NOT_ENTER_AUDIT";

try {
  const session = storage.createGroupChatSession(groupId, "Phase 301 cleanup source scope");
  const sibling = storage.createGroupChatSession(groupId, "Phase 301 untouched sibling");
  const messages = Array.from({ length: 36 }, (_, index) => ({
    id: `phase301-${index}`,
    group_session_id: session.id,
    role: index % 2 === 0 ? "user" : "assistant",
    agent: index % 2 === 1 ? "phase301-worker" : undefined,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0
      ? `Only the exact group session may be cleaned. ${sentinel}`
      : `Phase 301 compact turn ${index} src/phase301-${index}.ts ${"context ".repeat(180)}`,
  }));
  storage.saveGroupMessages(groupId, messages, session.id);

  const compacted = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: session.id,
    force: true,
    rebuild: true,
    reason: "phase301-source-qualified-cleanup",
    config: { memoryCompactionUseModel: false, minKeepMessages: 4, minKeepTokens: 1 },
  });
  assert.equal(compacted.success, true);
  assert.equal(compacted.compacted, true);

  const saved = memory.loadGroupMemory(groupId, session.id);
  const audit = saved.compaction?.postCompactCleanupAudit || {};
  const receipt = saved.compaction?.compactTransactionReceipt || {};
  const head = compactHead.readGroupCompactHead(groupId, session.id);
  const auditVerification = compaction.verifyGroupPostCompactCleanupAudit(audit, {
    groupId,
    groupSessionId: session.id,
    boundaryId: saved.compactBoundary?.id,
  });
  const receiptVerification = compaction.verifyGroupCompactTransactionReceipt(receipt, {
    groupId,
    groupSessionId: session.id,
    boundaryId: saved.compactBoundary?.id,
    cleanupAuditChecksum: audit.audit_checksum,
  });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${session.id}`);
  const centerCleanup = detail.postCompactUsage?.postCompactCleanupAudit || {};
  const coreSelftest = await compaction.runGroupPostCompactCleanupAuditSelfTest();
  const partialSelftest = await compaction.runGroupMemoryPartialCompactSidecarSelfTest();

  const tamperedAudit = JSON.parse(JSON.stringify(audit));
  tamperedAudit.groupSessionId = sibling.id;
  tamperedAudit.scopeId = `${groupId}::${sibling.id}`;
  tamperedAudit.compactSource.querySource = `group_main:${groupId}::${sibling.id}`;
  tamperedAudit.cleanupScope.groupSessionId = sibling.id;
  tamperedAudit.cleanupScope.scopeId = `${groupId}::${sibling.id}`;
  tamperedAudit.audit_checksum = compaction.groupPostCompactCleanupAuditChecksum(tamperedAudit);
  const tamperedMemory = JSON.parse(JSON.stringify(saved));
  tamperedMemory.compaction.postCompactCleanupAudit = tamperedAudit;
  tamperedMemory.compactBoundary.post_compact_restore.cleanupAudit = tamperedAudit;
  tamperedMemory.messageCompression.postCompactCleanupAudit = tamperedAudit;
  memory.saveGroupMemory(groupId, tamperedMemory, session.id);

  const recovery = compactHead.reconcileGroupCompactHeadFromMemory({
    groupId,
    groupSessionId: session.id,
    memory: tamperedMemory,
  });
  const failingDetail = center.getMemoryCenterScope("group", `${groupId}::${session.id}`);
  const failingCleanup = failingDetail.postCompactUsage?.postCompactCleanupAudit || {};
  const stableHead = compactHead.readGroupCompactHead(groupId, session.id);
  const siblingHead = compactHead.readGroupCompactHead(groupId, sibling.id);

  const bodyFreeArtifacts = JSON.stringify({ audit, receipt, head });
  const checks = {
    exactSessionAuditIsValid: auditVerification.valid === true,
    mainAgentSourceIsExplicit: audit.compactSource?.kind === "group_main_agent"
      && audit.compactSource?.querySource === `group_main:${groupId}::${session.id}`,
    cleanupCannotTouchGlobalOrSibling: audit.cleanupScope?.allowsGlobalReset === false
      && audit.cleanupScope?.allowsOtherGroupSessionReset === false,
    receiptBindsAuditChecksum: receiptVerification.valid === true
      && receipt.schema === "ccm-group-memory-compact-transaction-receipt-v3"
      && receipt.cleanup_audit_checksum === audit.audit_checksum,
    compactHeadCarriesAuditBinding: head?.cleanup_audit_checksum === audit.audit_checksum,
    memoryCenterShowsExactScope: centerCleanup.status === "ok"
      && centerCleanup.groupSessionId === session.id
      && centerCleanup.cleanupAuditChecksum === audit.audit_checksum,
    coreCleanupContractPasses: coreSelftest.pass === true,
    partialSidecarRetainsPrimaryState: partialSelftest.pass === true
      && partialSelftest.checks?.sidecarCleanupDoesNotResetPrimaryDerivedState === true,
    recomputedCrossSessionAuditFailsRecovery: recovery.status === "fail_closed"
      && recovery.issues.includes("post_compact_cleanup_group_session_mismatch")
      && recovery.issues.includes("compact_transaction_cleanup_audit_mismatch"),
    memoryCenterFailsClosedOnCrossSessionCopy: failingCleanup.status === "fail"
      && (failingCleanup.gaps || []).some(row => row.reason === "post_compact_cleanup_group_session_mismatch"),
    tamperDoesNotAdvanceCompactHead: stableHead?.head_id === head?.head_id
      && stableHead?.generation === head?.generation,
    untouchedSiblingHasNoCompactHead: siblingHead === null,
    auditReceiptAndHeadStayBodyFree: !bodyFreeArtifacts.includes(sentinel),
  };
  assert.ok(Object.values(checks).every(Boolean), JSON.stringify({ checks, recovery, centerCleanup, failingCleanup }, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase301-post-compact-cleanup-source-scope-selftest-v1",
    checks,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
