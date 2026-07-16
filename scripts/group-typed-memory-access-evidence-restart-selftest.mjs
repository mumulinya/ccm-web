import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase348-access-evidence-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const dist = path.join(root, "ccm-package", "dist");
const provider = require(path.join(dist, "agents", "provider-tool-access-evidence.js"));
const collaboration = require(path.join(dist, "modules", "collaboration", "collaboration.js"));
const typedMemory = require(path.join(dist, "modules", "collaboration", "group-memory-index.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase348-access-${nonce}`;
const groupSessionId = "gcs_phase348_a";
const siblingSessionId = "gcs_phase348_b";
const scopeId = `${groupId}--${groupSessionId}`;
const siblingScopeId = `${groupId}--${siblingSessionId}`;
const taskId = "task-phase348";
const executionId = "exec-phase348";
const taskAgentSessionId = "tas_phase348";
const snapshotId = "snapshot-phase348";
const snapshotChecksum = "snapshot-checksum-phase348";
const deliveryChecksum = "delivery-checksum-phase348";
const relPath = "project-context.md";
const documentChecksum = "a".repeat(64);
const binding = { groupId, groupSessionId, taskId, executionId, taskAgentSessionId, nativeSessionId: "thread-phase348", runnerRequestId: "adr_phase348_123456789abc", capturedAt: "2026-07-16T00:00:00.000Z" };
const rawProviderOutput = [
  JSON.stringify({ type: "thread.started", thread_id: binding.nativeSessionId }),
  JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: `Get-Content ${relPath}`, status: "completed", exit_code: 0 } }),
  JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
].join("\n");

function freshInspect() {
  const code = `const m=require(${JSON.stringify(path.join(dist, "modules", "collaboration", "group-memory-index.js"))});const a=m.readGroupTypedMemoryConsumptionLedger(${JSON.stringify(scopeId)});const b=m.readGroupTypedMemoryConsumptionLedger(${JSON.stringify(siblingScopeId)});process.stdout.write(JSON.stringify({valid:a.ledger_checksum_valid,count:a.entries.length,entry:a.entries[0]||null,sibling:b.entries.length}));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: root, windowsHide: true, env: { ...process.env, USERPROFILE: tempRoot, HOME: tempRoot } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", value => value === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(`fresh inspect ${value}: ${stderr}`)));
  });
}

try {
  const accessEvidence = provider.extractProviderToolAccessEvidence("codex", rawProviderOutput, binding);
  const task = { id: taskId, group_id: groupId, group_session_id: groupSessionId, target_project: "phase348-project" };
  const snapshot = {
    schema: "ccm-task-agent-memory-context-snapshot-v1",
    snapshot_id: snapshotId,
    checksum: snapshotChecksum,
    session: { id: taskAgentSessionId, task_id: taskId, group_id: groupId, project: "phase348-project", agent_type: "codex", native_session_id: binding.nativeSessionId },
    context: {
      execution_id: executionId,
      group_session_memory_binding: { groupSessionId, scopeId, memoryBindingId: "binding-phase348" },
      worker_context_packet: {
        memory: {
          typedMemory: {
            recall: {
              schema: "ccm-group-typed-memory-recall-v1",
              recalled: [{ relPath, name: relPath, type: "project_context", checksum: documentChecksum }],
            },
          },
        },
      },
    },
    delivery_receipt: { delivered: true, status: "delivered", checksum: deliveryChecksum, executionId },
    delivery_receipt_checksum_valid: true,
  };
  const context = { taskAgentMemoryContextSnapshots: [snapshot], providerToolAccessEvidence: [accessEvidence] };
  const deliveredRows = collaboration.collectTaskTypedMemoryConsumptionRows(task, [], context);
  assert.equal(deliveredRows.length, 1, JSON.stringify(deliveredRows, null, 2));
  const delivered = deliveredRows[0];
  const firstRecord = typedMemory.recordGroupTypedMemoryConsumptionLedger(scopeId, { taskId, executionId, targetProject: "phase348-project", rows: deliveredRows });
  const upgradedRows = [{
    ...delivered,
    usage_state: "used",
    claimed_usage_state: "used",
    lifecycle_state: "used",
    direct_reference: true,
    evidence_tier: "bound_structured_receipt",
    evidence_confidence: 0.75,
    anomaly_codes: [],
    reason: "bound receipt cites delivered memory",
    receipt_evidence_checksum: "b".repeat(64),
  }];
  const upgradedRecord = typedMemory.recordGroupTypedMemoryConsumptionLedger(scopeId, { taskId, executionId, targetProject: "phase348-project", rows: upgradedRows });
  const current = typedMemory.readGroupTypedMemoryConsumptionLedger(scopeId);
  const sibling = typedMemory.readGroupTypedMemoryConsumptionLedger(siblingScopeId);
  const fresh = await freshInspect();
  const forgedEvidence = { ...accessEvidence, taskAgentSessionId: "tas_sibling" };
  const frontend = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf-8");

  const checks = {
    providerEvidenceValid: provider.verifyProviderToolAccessEvidence(accessEvidence, binding).valid === true,
    exactReadObserved: delivered.access_state === "read_observed" && delivered.access_event_count === 1 && delivered.access_evidence_valid === true,
    deliveryWithoutReceiptPersists: delivered.lifecycle_state === "delivered_unreported" && delivered.usage_state === "mentioned" && firstRecord.recorded_count === 1,
    deliveryBoundToExactSession: delivered.task_agent_session_id === taskAgentSessionId && delivered.memory_context_snapshot_id === snapshotId && delivered.delivery_receipt_checksum === deliveryChecksum,
    laterReceiptUpgradesObservation: upgradedRecord.upgraded_observation_count === 1 && current.entries.length === 1 && current.entries[0]?.usage_state === "used" && current.entries[0]?.version === 3,
    accessProofSurvivesUpgrade: current.entries[0]?.access_state === "read_observed" && current.entries[0]?.access_evidence_checksum === accessEvidence.checksum,
    siblingSessionIsolated: sibling.entries.length === 0,
    siblingEvidenceRejected: provider.verifyProviderToolAccessEvidence(accessEvidence, { ...binding, groupSessionId: siblingSessionId }).valid === false,
    forgedEvidenceRejected: provider.verifyProviderToolAccessEvidence(forgedEvidence, binding).valid === false,
    restartKeepsLedger: fresh.valid === true && fresh.count === 1 && fresh.entry?.usage_state === "used" && fresh.entry?.access_state === "read_observed" && fresh.sibling === 0,
    unsupportedCaptureExplicit: provider.extractProviderToolAccessEvidence("claudecode", "plain output", binding).captureStatus === "capture_unavailable",
    memoryCenterSurfacesLifecycle: frontend.includes("最近投递与使用证据") && frontend.includes("仅投递") && frontend.includes("读访问") && frontend.includes("不可观测"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, delivered, firstRecord, upgradedRecord, current, sibling, fresh }, null, 2));
  process.stdout.write(`PHASE348_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
