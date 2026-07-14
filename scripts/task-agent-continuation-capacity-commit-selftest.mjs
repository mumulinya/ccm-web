import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-capacity-commit-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function capacityPacket(session, contextWindow, label) {
  return {
    packet_id: `wcp_${label}_${nonce}`,
    model_context_capacity: {
      contextWindow,
      effectiveContextWindow: contextWindow - 20_000,
      evidenceChecksum: `capacity-${contextWindow}-${label}`,
    },
    context_usage: { status: "normal" },
    memory: { schema: "ccm-worker-memory-context-v1", summary: `${label} current group-session memory` },
    task_agent_session_id: session.id,
  };
}

function openCapacitySession(agentType, label, groupId) {
  const taskId = `task-${label}-${nonce}`;
  let session = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId,
    project: `project-${label}`,
    agentType,
  });
  session = sessions.recordTaskAgentSessionTurn(session.id, {
    success: true,
    nativeModelCapabilityRecord: {
      recorded: true,
      entry: {
        model: `model-${label}`,
        contextWindow: 200_000,
        checksum: `capacity-200000-${label}`,
        source: "phase258-selftest",
        checkedAt: "2026-07-14T00:00:00.000Z",
      },
    },
  });
  return session;
}

try {
  const claudeProfile = continuation.getNativeContinuationCapabilityProfile("claude");
  equal(claudeProfile.provider, "claudecode", "Claude alias must resolve to the Claude Code continuation profile");
  equal(claudeProfile.resumeAckPolicy, "exit_success", "Claude Code may acknowledge a successful deterministic --resume exit");
  equal(claudeProfile.nativeFork, false, "CLI child runtimes must not claim unsupported native fork semantics");

  const claudeExit = continuation.buildNativeSessionContinuationEvidence({
    provider: "claudecode",
    runnerRequestId: "adr-claude-resume",
    requestedNativeSessionId: "claude-session-phase258",
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(claudeExit.nativeContinuationAcknowledged, true, "Claude Code successful --resume exit must be acknowledged by policy");
  equal(continuation.verifyNativeSessionContinuationEvidence(claudeExit, { provider: "claude", runnerRequestId: "adr-claude-resume" }).valid, true, "Claude continuation evidence must validate through its alias");

  const codexExitOnly = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: "adr-codex-resume",
    requestedNativeSessionId: "codex-thread-phase258",
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(codexExitOnly.nativeContinuationAcknowledged, false, "Codex JSON resume without a returned thread id must remain unverified");
  equal(codexExitOnly.compatibilityStatus, "provider_output_contract_unverified", "Codex rejection must preserve the provider-output contract reason");

  const codexOutput = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: "adr-codex-resume",
    requestedNativeSessionId: "codex-thread-phase258",
    returnedNativeSessionId: "codex-thread-phase258",
    providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: "codex-thread-phase258" })).providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(codexOutput.nativeContinuationAcknowledged, true, "matching Codex provider output must acknowledge resume");

  const cursorMismatch = continuation.buildNativeSessionContinuationEvidence({
    provider: "cursor",
    runnerRequestId: "adr-cursor-resume",
    requestedNativeSessionId: "cursor-old",
    returnedNativeSessionId: "cursor-new",
    providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("cursor", JSON.stringify({ type: "result", session_id: "cursor-new", result: "done" })).providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(cursorMismatch.nativeContinuationAcknowledged, false, "Cursor must not acknowledge a different returned session id");

  const geminiUnsupported = continuation.buildNativeSessionContinuationEvidence({
    provider: "gemini",
    runnerRequestId: "adr-gemini-resume",
    requestedNativeSessionId: "gemini-session",
    returnedNativeSessionId: "gemini-session",
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(geminiUnsupported.nativeContinuationAcknowledged, false, "Gemini profile must reject unsupported native resume");
  equal(geminiUnsupported.compatibilityStatus, "native_resume_unsupported", "unsupported provider must retain an explicit compatibility status");

  const forkUnsupported = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: "adr-codex-fork",
    requestedNativeSessionId: "codex-thread-phase258",
    nativeForkRequested: true,
    runnerSuccess: true,
  });
  equal(forkUnsupported.compatibilityStatus, "native_fork_unsupported", "fork must degrade explicitly instead of pretending native continuation");

  const groupId = `group-phase258-${nonce}`;
  let session = openCapacitySession("codex", "two-phase", groupId);
  const marked = sessions.markTaskAgentSessionsForCapacityDowngrade({
    provider: "codex",
    currentContextWindow: 64_000,
    currentEvidenceChecksum: "capacity-64000-two-phase",
  });
  ok(marked.sessions.some(item => item.sessionId === session.id), "capacity downgrade must mark the open Codex task session");
  session = sessions.listTaskAgentSessions({ taskId: session.taskId })[0];
  const packet = capacityPacket(session, 64_000, "two-phase");
  const prepared = sessions.prepareTaskAgentSessionCapacityRevalidation(session.id, packet);
  equal(prepared.prepared, true, "rebuilt packet must produce a prepared capacity proof");
  equal(prepared.session.capacityRevalidationRequired, true, "preparation must not clear the gate before durable dispatch");
  equal(sessions.verifyTaskAgentSessionCapacityRevalidationProof(prepared.proof, prepared.session).valid, true, "prepared capacity proof must validate");

  const missingWitness = sessions.commitTaskAgentSessionCapacityRevalidation(session.id, prepared.proof, {});
  equal(missingWitness.acknowledged, false, "commit without durable dispatch evidence must fail closed");
  equal(sessions.listTaskAgentSessions({ taskId: session.taskId })[0].capacityRevalidationRequired, true, "failed commit must leave the gate active");

  const tampered = { ...prepared.proof, packet_context_window: 200_000 };
  const tamperedCommit = sessions.commitTaskAgentSessionCapacityRevalidation(session.id, tampered, {
    runnerRequestId: "adr-tampered",
    runnerStarted: true,
  });
  equal(tamperedCommit.acknowledged, false, "tampered proof must be rejected");

  const committed = sessions.commitTaskAgentSessionCapacityRevalidation(session.id, prepared.proof, {
    runnerRequestId: "adr-phase258-returned",
    runnerStarted: true,
  });
  equal(committed.acknowledged, true, "runner return witness must commit a prepared capacity proof");
  equal(committed.session.capacityRevalidationRequired, false, "successful commit must clear the capacity gate");
  equal(sessions.verifyTaskAgentSessionCapacityRevalidationCommitReceipt(committed.receipt, prepared.proof).valid, true, "capacity commit receipt must validate");

  const walGroupId = `group-phase258-wal-${nonce}`;
  let walSession = openCapacitySession("claudecode", "wal-recovery", walGroupId);
  sessions.markTaskAgentSessionsForCapacityDowngrade({
    provider: "claudecode",
    currentContextWindow: 64_000,
    currentEvidenceChecksum: "capacity-64000-wal",
  });
  walSession = sessions.listTaskAgentSessions({ taskId: walSession.taskId })[0];
  const walPacket = capacityPacket(walSession, 64_000, "wal-recovery");
  const walPrepared = sessions.prepareTaskAgentSessionCapacityRevalidation(walSession.id, walPacket);
  const groupSessionId = `gcs_phase258_${nonce.replace(/[^a-z0-9]/gi, "")}`;
  const ticketId = `ticket-phase258-${nonce}`;
  const prompt = "phase258 durable capacity dispatch";
  const wal = memory.createChildTypedMemoryDispatchWal({
    required: true,
    ticket: {
      ticket_id: ticketId,
      ticket_checksum: "ticket-checksum-phase258",
      prompt_checksum: "prompt-checksum-phase258",
      compact_epoch: "precompact",
      attempt_sequence: 1,
      worker_context_packet_id: walPacket.packet_id,
      dispatch_not_after: new Date(Date.now() + 60_000).toISOString(),
    },
    lease: {
      lease_id: `lease-${nonce}`,
      lease_checksum: "lease-checksum-phase258",
      group_id: walGroupId,
      group_session_id: groupSessionId,
      target_project: walSession.project,
      task_id: walSession.taskId,
      task_agent_session_id: walSession.id,
      compact_epoch: "precompact",
      attempt_sequence: 1,
    },
    capsule: null,
  }, {
    memoryBundle: { group_id: walGroupId, group_session_id: groupSessionId, target_project: walSession.project },
    workerContextPacket: walPacket,
    renderedPrompt: prompt,
    snapshotRenderedPrompt: prompt,
    executionId: walSession.taskId,
    capacityRevalidationProof: walPrepared.proof,
  });
  const startedWal = memory.markChildTypedMemoryDispatchStarted(wal, { transport: "claudecode" });
  ok(startedWal?.record_checksum, "capacity proof must be persisted in a started typed-memory WAL");
  equal(sessions.listTaskAgentSessions({ taskId: walSession.taskId })[0].capacityRevalidationRequired, true, "simulated crash before commit must leave the session gate active");

  const recovery = memory.recoverChildTypedMemoryDispatchWal({ ticketIds: [ticketId], now: new Date().toISOString() });
  ok(recovery.rows.some(row => row.ticket_id === ticketId), "startup WAL recovery must inspect the interrupted dispatch");
  const recoveredSession = sessions.listTaskAgentSessions({ taskId: walSession.taskId })[0];
  equal(recoveredSession.capacityRevalidationRequired, false, "WAL recovery must commit the persisted capacity proof");
  equal(recoveredSession.capacityRevalidationCommitReceipt.dispatch_witness_kind, "typed_memory_dispatch_wal", "recovered commit must retain the WAL witness kind");
  equal(sessions.verifyTaskAgentSessionCapacityRevalidationCommitReceipt(recoveredSession.capacityRevalidationCommitReceipt, walPrepared.proof).valid, true, "recovered commit receipt must validate");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  ok((collaborationSource.match(/prepareTaskAgentSessionCapacityRevalidation\(/g) || []).length >= 3, "all three real dispatch paths must prepare capacity revalidation before dispatch");
  ok((collaborationSource.match(/commitTaskAgentSessionCapacityRevalidation\(/g) || []).length >= 6, "all three real dispatch paths must commit through WAL or runner-return witnesses");
  const walSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "typed-memory-dispatch-wal.ts"), "utf-8");
  ok(walSource.includes("capacity_revalidation_proof"), "typed-memory WAL must persist the prepared capacity proof for crash recovery");
  const memoryCenterSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf-8");
  ok(memoryCenterSource.includes("capacityRevalidationCommittedCount") && memoryCenterSource.includes("capacityRevalidationInvalidCount"), "Memory Center must expose two-phase capacity health");
  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf-8");
  equal(globalSource.includes("capacityRevalidationCommitReceipt"), false, "Global Agent must remain outside group child capacity revalidation receipts");

  console.log(JSON.stringify({
    pass: true,
    checks,
    compatibility: {
      claude: claudeExit.compatibilityStatus,
      codexExitOnly: codexExitOnly.compatibilityStatus,
      codexOutput: codexOutput.compatibilityStatus,
      gemini: geminiUnsupported.compatibilityStatus,
      fork: forkUnsupported.compatibilityStatus,
    },
    capacity: {
      prepared: prepared.proof.proof_id,
      committed: committed.receipt.receipt_id,
      recovered: recoveredSession.capacityRevalidationCommitReceipt.receipt_id,
    },
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
