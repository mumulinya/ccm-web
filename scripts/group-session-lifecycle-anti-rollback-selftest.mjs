import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-session-lifecycle-anti-rollback-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));
const runner = require(path.join(root, "ccm-package", "dist", "agents", "runner.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `group-phase267-${nonce}`;
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf-8");
}

try {
  const session = storage.createGroupChatSession(groupId, "Phase 267 anti rollback");
  const generationOne = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(generationOne.status, "active", "new lifecycle must begin active");
  equal(generationOne.generation, 1, "new lifecycle must begin at generation one");

  storage.archiveGroupChatSession(groupId, session.id, true);
  const archived = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(archived.status, "archived", "archive must commit generation two");
  equal(archived.generation, 2, "archive must advance generation");

  storage.archiveGroupChatSession(groupId, session.id, false);
  const restored = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(restored.status, "active", "restore must commit active status");
  equal(restored.generation, 3, "restore must advance to generation three");

  const deletion = storage.deleteGroupChatSession(groupId, session.id, { force: true, reason: "phase267_tombstone" });
  const tombstone = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(tombstone.status, "deleted", "delete must commit a tombstone");
  equal(tombstone.generation, 4, "delete must advance to generation four");

  const headFile = lifecycle.getGroupSessionLifecycleHeadFile(groupId, session.id);
  const committedFile = lifecycle.getGroupSessionLifecycleCommittedFile(groupId, session.id);
  const journalFile = lifecycle.getGroupSessionLifecycleJournalFile(groupId, session.id);
  const latestCommitFile = lifecycle.getGroupSessionLifecycleCommitFile(groupId, session.id, 4);
  const tombstoneHeadContent = fs.readFileSync(headFile, "utf-8");
  const tombstoneCommittedContent = fs.readFileSync(committedFile, "utf-8");
  const journalContent = fs.readFileSync(journalFile, "utf-8");
  const latestCommitContent = fs.readFileSync(latestCommitFile, "utf-8");

  const journal = lifecycle.readGroupSessionLifecycleJournal(groupId, session.id);
  equal(journal.valid, true, "the lifecycle journal must be valid");
  equal(journal.records.length, 4, "the journal must retain every lifecycle generation");
  equal(journal.latest.status, "deleted", "the journal head must retain the tombstone");
  const commits = lifecycle.readGroupSessionLifecycleCommitChain(groupId, session.id);
  equal(commits.valid, true, "the immutable commit chain must be valid");
  equal(commits.receipts.length, 4, "every lifecycle generation must have an immutable receipt");
  equal(commits.latest.status, "deleted", "the highest commit receipt must retain deletion");

  write(headFile, "{corrupt-primary");
  const recoveredFromCommitted = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(recoveredFromCommitted.status, "deleted", "a valid latest committed replica may recover a corrupt primary");
  equal(recoveredFromCommitted.recovered_from, "committed", "recovery provenance must identify the committed replica");

  write(committedFile, "{corrupt-committed");
  const previousBackup = JSON.parse(fs.readFileSync(`${headFile}.bak`, "utf-8"));
  equal(previousBackup.status, "active", "the ordinary backup must contain the older active generation fixture");
  equal(previousBackup.generation, 3, "the ordinary backup must be one generation behind");
  equal(lifecycle.verifyGroupSessionLifecycleHead(previousBackup, { groupId, groupSessionId: session.id }).valid, true, "the stale active backup is internally valid");
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, session.id), null, "an internally valid but generation-stale active backup must fail closed");
  const failClosedReport = memoryCenter.buildGroupSessionLifecycleIntegrityReport();
  const failClosedRow = failClosedReport.rows.find(row => row.groupId === groupId && row.groupSessionId === session.id);
  equal(failClosedRow.status, "fail", "Memory Center must expose the authoritative-head failure");
  ok(failClosedRow.issues.includes("session_lifecycle_authoritative_head_unavailable"), "Memory Center must identify fail-closed provenance");

  const staleRunnerValidation = runner.validateAgentRunnerSessionLifecycleFence({
    groupId,
    groupSessionId: session.id,
    sessionLifecycleFence: {
      required: true,
      groupId,
      groupSessionId: session.id,
      lifecycleGeneration: restored.generation,
      lifecycleStatus: restored.status,
      lifecycleHeadId: restored.lifecycle_head_id,
      lifecycleHeadChecksum: restored.head_checksum,
    },
  });
  equal(staleRunnerValidation.valid, false, "Runner must fail closed while only a stale backup is readable");
  ok(staleRunnerValidation.issues.includes("session_lifecycle_head_missing"), "Runner must report the unavailable authoritative head");

  write(committedFile, tombstoneCommittedContent);
  const recoveredAgain = lifecycle.readGroupSessionLifecycleHead(groupId, session.id);
  equal(recoveredAgain.status, "deleted", "restoring the anchored committed replica must recover deletion");

  const journalLines = journalContent.trimEnd().split(/\r?\n/);
  write(journalFile, `${journalLines.slice(0, -1).join("\n")}\n`);
  equal(lifecycle.readGroupSessionLifecycleJournal(groupId, session.id).latest.status, "active", "the truncated journal fixture must roll back to generation three");
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, session.id), null, "a truncated journal must not authorize the matching old active backup");

  write(journalFile, journalContent);
  write(latestCommitFile, "{corrupt-latest-receipt");
  equal(lifecycle.readGroupSessionLifecycleCommitChain(groupId, session.id).valid, false, "a corrupt highest receipt must invalidate the commit chain");
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, session.id), null, "a corrupt highest receipt must fail closed even with a valid tombstone replica");

  write(latestCommitFile, latestCommitContent);
  fs.unlinkSync(latestCommitFile);
  equal(lifecycle.readGroupSessionLifecycleCommitChain(groupId, session.id).latest.generation, 3, "removing the latest receipt must expose only the prior generation");
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, session.id), null, "journal generation four must not match a rolled-back receipt chain");
  write(latestCommitFile, latestCommitContent);
  write(headFile, tombstoneHeadContent);
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, session.id).status, "deleted", "restoring all three anchors must recover the tombstone");

  const legacy = storage.createGroupChatSession(groupId, "Phase 267 legacy adoption");
  const legacyHead = lifecycle.readGroupSessionLifecycleHead(groupId, legacy.id);
  fs.rmSync(lifecycle.getGroupSessionLifecycleJournalFile(groupId, legacy.id), { force: true });
  fs.rmSync(lifecycle.getGroupSessionLifecycleCommittedFile(groupId, legacy.id), { force: true });
  fs.rmSync(lifecycle.GROUP_SESSION_LIFECYCLE_COMMIT_DIR, { recursive: true, force: true });
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, legacy.id), null, "a legacy unanchored head must fail closed before bootstrap");
  const bootstrap = lifecycle.bootstrapGroupSessionLifecycleJournals();
  ok(bootstrap.adopted >= 1, "startup bootstrap must anchor an internally valid legacy primary");
  const adopted = lifecycle.readGroupSessionLifecycleHead(groupId, legacy.id);
  equal(adopted.status, "active", "the bootstrapped legacy primary must become readable");
  equal(adopted.head_checksum, legacyHead.head_checksum, "bootstrap must not rewrite legacy lifecycle identity");
  const healthyReport = memoryCenter.buildGroupSessionLifecycleIntegrityReport();
  equal(healthyReport.overall.failClosedCount, 0, "Memory Center must clear fail-closed status after authoritative anchors recover");
  equal(healthyReport.overall.anchoredCount, healthyReport.overall.headCount, "every discovered lifecycle head must be anchored after bootstrap");

  console.log(JSON.stringify({
    pass: true,
    checks,
    session: { id: session.id, generations: [generationOne.generation, archived.generation, restored.generation, tombstone.generation] },
    antiRollback: {
      staleBackupStatus: previousBackup.status,
      staleBackupGeneration: previousBackup.generation,
      journalGeneration: journal.latest.generation,
      commitGeneration: commits.latest.generation,
    },
    bootstrap: { checked: bootstrap.checked, adopted: bootstrap.adopted, failed: bootstrap.failed },
    replacementSessionId: deletion.replacement?.id || "",
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
