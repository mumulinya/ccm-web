import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capability = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "model-capability-cache.js"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-capability-recovery-"));
const now = new Date("2026-07-12T12:00:00.000Z");

function filesFor(name) {
  const base = path.join(tempRoot, name);
  return {
    journalFile: `${base}.jsonl`,
    leaseFile: `${base}.lease.json`,
    queueFile: `${base}.queue.json`,
    statusFile: `${base}.status.json`,
    outcomeLedgerFile: `${base}.outcomes.json`,
    pendingDir: `${base}.pending`,
    quarantineDir: `${base}.invalid`,
    acknowledgementLedgerFile: `${base}.ack.json`,
    archiveDir: `${base}.archive`,
  };
}

function writeJournal(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${rows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf-8");
}

try {
  const recovery = filesFor("recovery");
  writeJournal(recovery.journalFile, [
    { type: "refresh_outcome", schema: "ccm-model-capability-refresh-outcome-v1", at: "2026-07-12T10:00:00.000Z", evidenceId: "e1", requestId: "r1", provider: "codex", model: "gpt-5", outcome: "refreshed" },
    { type: "refresh_outcome", schema: "ccm-model-capability-refresh-outcome-v1", at: "2026-07-12T11:00:00.000Z", evidenceId: "e2", requestId: "r2", provider: "cursor", model: "composer", outcome: "metadata_absent" },
  ]);
  fs.mkdirSync(recovery.archiveDir, { recursive: true });
  writeJournal(path.join(recovery.archiveDir, "refresh-history.jsonl"), [
    { type: "refresh_outcome", schema: "ccm-model-capability-refresh-outcome-v1", at: "2026-07-01T10:00:00.000Z", evidenceId: "e0", requestId: "r0", provider: "claudecode", model: "sonnet", outcome: "refreshed" },
  ]);
  const missingRecovery = capability.runModelCapabilityRefreshMaintenance({ ...recovery, now, trigger: "phase222-missing-ledger" });
  const rebuiltAfterMissing = capability.readModelCapabilityRefreshOutcomeLedger({ file: recovery.outcomeLedgerFile });
  const tampered = JSON.parse(fs.readFileSync(recovery.outcomeLedgerFile, "utf-8"));
  tampered.outcomeCount = 999;
  fs.writeFileSync(recovery.outcomeLedgerFile, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");
  const checksumRecovery = capability.runModelCapabilityRefreshMaintenance({ ...recovery, now, trigger: "phase222-checksum-ledger" });
  const rebuiltAfterChecksum = capability.readModelCapabilityRefreshOutcomeLedger({ file: recovery.outcomeLedgerFile });

  const invalid = filesFor("invalid");
  fs.mkdirSync(invalid.pendingDir, { recursive: true });
  fs.writeFileSync(path.join(invalid.pendingDir, "malformed.json"), "{not-json", "utf-8");
  fs.writeFileSync(path.join(invalid.pendingDir, "wrong-schema.json"), JSON.stringify({ schema: "wrong", provider: "codex" }), "utf-8");
  const invalidStatus = capability.runModelCapabilityRefreshMaintenance({ ...invalid, now, trigger: "phase222-invalid-pending" });
  const invalidIndex = capability.readInvalidPendingModelCapabilityRefreshOutcomes(invalid);
  const firstInvalid = invalidIndex.outcomes.find(row => row.status === "pending_ack");
  const acknowledged = capability.acknowledgeInvalidPendingModelCapabilityRefreshOutcome({ ...invalid, invalidOutcomeId: firstInvalid.invalidOutcomeId, acknowledgedBy: "phase222-selftest" });
  const invalidAfterAck = capability.readInvalidPendingModelCapabilityRefreshOutcomes(invalid);

  const retention = filesFor("retention");
  fs.mkdirSync(retention.archiveDir, { recursive: true });
  for (let index = 0; index < 55; index++) {
    const file = path.join(retention.archiveDir, `refresh-${String(index).padStart(3, "0")}.jsonl`);
    fs.writeFileSync(file, `${JSON.stringify({ type: "archived", index })}\n`, "utf-8");
    const modifiedAt = index < 3 ? new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000 + index * 1000) : new Date(now.getTime() - (55 - index) * 1000);
    fs.utimesSync(file, modifiedAt, modifiedAt);
  }
  const retentionStatus = capability.runModelCapabilityRefreshMaintenance({ ...retention, now, maxArchives: 50, archiveRetentionDays: 180, trigger: "phase222-archive-retention" });

  const checks = {
    missingLedgerRequiresRecovery: missingRecovery.ledgerRecovery.recoveryRequired === true && missingRecovery.ledgerRecovery.recoveryReason === "missing",
    missingLedgerRecoveryIsProven: missingRecovery.ledgerRecovery.recovered === true && Boolean(missingRecovery.ledgerRecovery.recoveredAt),
    missingLedgerRebuildPreservesOutcomes: rebuiltAfterMissing.valid === true && rebuiltAfterMissing.outcomeCount === 3,
    recoveryReadsRetainedArchives: rebuiltAfterMissing.historySources.archiveFiles === 1 && rebuiltAfterMissing.historySources.archivedJournalRows === 1,
    checksumDamageRequiresRecovery: checksumRecovery.ledgerRecovery.recoveryRequired === true && checksumRecovery.ledgerRecovery.recoveryReason === "checksum_invalid",
    checksumRecoveryRestoresLedger: rebuiltAfterChecksum.valid === true && rebuiltAfterChecksum.outcomeCount === 3,
    invalidPendingIsQuarantined: invalidStatus.pendingOutcomeQuarantined === 2 && invalidStatus.pendingOutcomeFailed === 0,
    invalidPendingLeavesHotQueue: fs.readdirSync(invalid.pendingDir).filter(name => name.endsWith(".json")).length === 0,
    quarantineRequiresAcknowledgement: invalidIndex.pendingAcknowledgementCount === 2 && invalidIndex.outcomes.every(row => row.checksumValid === true),
    acknowledgementIsDurable: acknowledged.acknowledged === true && invalidAfterAck.pendingAcknowledgementCount === 1 && invalidAfterAck.acknowledgedCount === 1,
    acknowledgementKeepsEvidence: fs.existsSync(path.join(invalid.quarantineDir, `${firstInvalid.invalidOutcomeId}.json`)),
    archiveRetentionAppliesAgeAndCount: retentionStatus.archiveRetention.deleted === 5 && retentionStatus.archiveRetention.expired === 3 && retentionStatus.archiveRetention.overflow === 2,
    archiveRetentionLeavesBoundedSet: retentionStatus.archiveRetention.remaining === 50 && fs.readdirSync(retention.archiveDir).filter(name => name.endsWith(".jsonl")).length === 50,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, missingRecovery, checksumRecovery, invalidStatus, invalidIndex, invalidAfterAck, retentionStatus }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks }, null, 2)}\n`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
