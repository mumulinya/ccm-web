import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase291-diagnostic-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase291-diagnostic-${nonce}`;
const secretPrompt = "PHASE291_SECRET_PROMPT_MUST_NOT_BE_EXPORTED";
const secretOutput = "PHASE291_SECRET_CHILD_OUTPUT_MUST_NOT_BE_EXPORTED";
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function sha(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createInvocation(groupSessionId, label, complete = true) {
  const taskId = `task-phase291-${label}-${nonce}`;
  const taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: `project-${label}`, agentType: "codex" });
  let edge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: `project-${label}`,
    taskAgentSessionId: taskSession.id,
    nativeSessionId: `thread-phase291-${label}`,
    executionId: `exec-phase291-${label}`,
    invocationKind: "spawn",
    branchKind: "main",
  });
  if (!complete) return { edge, taskSession };
  const head = lifecycle.readGroupSessionLifecycleHead(groupId, groupSessionId);
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp-phase291-${label}`,
    memoryContextSnapshotId: `tams-phase291-${label}`,
    memoryContextSnapshotChecksum: sha(`snapshot-${label}`),
    renderedPrompt: secretPrompt,
    modelContextWindow: 200_000,
    configuredMaxTokens: 5_000,
    effectiveMaxTokens: 4_000,
    groupSessionMemoryBinding: {
      sessionLifecycleFenceRequired: true,
      sessionLifecycleHeadId: head.lifecycle_head_id,
      sessionLifecycleGeneration: head.generation,
      sessionLifecycleStatus: head.status,
      sessionLifecycleHeadChecksum: head.head_checksum,
    },
  });
  const runnerRequestId = `adr-phase291-${label}`;
  edge = lineage.dispatchTaskAgentInvocationEdge(edge, { transport: "codex", runnerRequestId });
  const runtimeVersionSnapshot = runtime.captureAgentRuntimeVersionSnapshot("codex");
  const providerOutput = runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: `thread-phase291-${label}` }), { runtimeVersionSnapshot });
  const nativeEvidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: `thread-phase291-${label}`,
    returnedNativeSessionId: `thread-phase291-${label}`,
    nativeResumeRequested: false,
    runnerSuccess: true,
    providerOutputContractEvidence: providerOutput.providerOutputContractEvidence,
    providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
  });
  const capabilityReceipt = runtime.extractNativeModelCapabilityReceipt("codex", JSON.stringify({
    type: "model.metadata",
    model: `gpt-phase291-${label}`,
    model_capabilities: { context_window: 200_000, max_output_tokens: 16_000 },
  }), {
    runner: "direct-cli",
    runnerRequestId,
    groupId,
    taskId,
    executionId: `exec-phase291-${label}`,
    taskAgentSessionId: taskSession.id,
    nativeSessionId: `thread-phase291-${label}`,
  });
  edge = lineage.completeTaskAgentInvocationEdge(edge, {
    success: true,
    provider: "codex",
    nativeSessionId: `thread-phase291-${label}`,
    nativeContinuationEvidence: nativeEvidence,
    nativeModelCapabilityReceipt: capabilityReceipt,
    nativeModelCapabilityRecord: { recorded: true, entry: { model: `gpt-phase291-${label}`, contextWindow: 200_000, checksum: sha(`model-${label}`) } },
    runnerRequestId,
    output: secretOutput,
  });
  return { edge, taskSession };
}

try {
  const sessionA = storage.createGroupChatSession(groupId, "phase291 exact A").id;
  const sessionB = storage.createGroupChatSession(groupId, "phase291 exact B").id;
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  const scopeA = `${groupId}--${sessionA}`;
  const nowMs = Date.now();
  for (let index = 0; index < 3; index += 1) {
    typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
      kind: "selector",
      eventKey: `baseline-${index}`,
      recordedAt: new Date(nowMs - (10 + index) * 86_400_000).toISOString(),
      metrics: { candidateCount: 4, selectedCount: 4, selectedAgeAverage: 1, freshCount: 4, staleCount: 0 },
    }, { nowMs });
    typed.recordGroupTypedMemoryShapeTrendContribution(scopeA, {
      kind: "selector",
      eventKey: `recent-${index}`,
      recordedAt: new Date(nowMs - index * 86_400_000).toISOString(),
      metrics: { candidateCount: 4, selectedCount: 0, selectedAgeAverage: -1, freshCount: 0, staleCount: 0 },
    }, { nowMs });
  }

  const invocationA = createInvocation(sessionA, "a", true);
  createInvocation(sessionB, "b", false);
  const requestedScope = `${groupId}::${sessionA}`;
  const snapshot = center.buildMemoryCenterExactSessionDiagnosticExport(requestedScope);
  const serialized = JSON.stringify(snapshot);
  const verification = center.verifyMemoryCenterExactSessionDiagnosticExport(snapshot, requestedScope);

  equal(snapshot.schema, "ccm-memory-center-exact-session-diagnostic-export-v1", "export schema must be stable");
  equal(snapshot.scope.scopeId, requestedScope, "export must preserve the requested exact session scope");
  equal(snapshot.scope.typedScopeId, scopeA, "export must bind the typed-memory exact session scope");
  equal(snapshot.policy.bodyFree, true, "export must declare body-free semantics");
  equal(snapshot.policy.offlineOnly, true, "export must be offline-only");
  equal(snapshot.policy.contextInjectionAllowed, false, "export must not be eligible for model context injection");
  equal(snapshot.policy.memoryMutationAuthorized, false, "export must not authorize memory mutation");
  equal(snapshot.policy.recallPolicyMutationAuthorized, false, "export must not tune recall policy");
  equal(snapshot.policy.crossSessionEvidenceMode, "aggregate_only", "cross-session evidence must be aggregate-only");
  equal(verification.valid, true, "pristine export must verify");
  equal(verification.bodyFree, true, "verifier must confirm forbidden body fields are absent");
  equal(snapshot.providerVersionEvidence.evidenceCount, 1, "exact export must exclude session B invocation evidence");
  equal(snapshot.providerVersionEvidence.rows[0].invocationEdgeId, invocationA.edge.invocation_edge_id, "provider evidence must bind the exact invocation edge");
  equal(snapshot.providerVersionEvidence.rows[0].groupSessionId, sessionA, "provider evidence must bind the requested group session");
  equal(snapshot.providerVersionEvidence.rows[0].provider, "codex", "provider identity must come from exact invocation evidence");
  equal(snapshot.providerVersionEvidence.rows[0].model, "gpt-phase291-a", "model identity must come from the exact capability proof");
  ok(!!snapshot.providerVersionEvidence.rows[0].providerRuntimeVersion, "runtime version evidence must be retained");
  ok(!!snapshot.providerVersionEvidence.rows[0].providerRuntimeIdentityChecksum, "runtime identity checksum must be retained");
  ok(!!snapshot.providerVersionEvidence.rows[0].providerContractId, "provider output contract id must be retained");
  equal(snapshot.providerVersionEvidence.rows[0].fullyBound, true, "provider/model/runtime/contract evidence must close on one exact edge");
  equal(snapshot.trend.status, "drift", "body-free export must carry exact-session durable trend status");
  equal(snapshot.incidents.status, "pending", "body-free export must carry exact-session incident visibility");
  equal(serialized.includes(secretPrompt), false, "rendered prompt must never enter the diagnostic export");
  equal(serialized.includes(secretOutput), false, "child output must never enter the diagnostic export");
  equal(serialized.includes("baseline-0"), false, "raw trend contribution keys must never enter the diagnostic export");
  equal(serialized.includes("ledgerFile"), false, "diagnostic export must not expose local ledger paths");
  ok(snapshot.fleetComparison.overall.exactSessionCount >= 2, "fleet comparison may count multiple exact sessions");
  equal(JSON.stringify(snapshot.fleetComparison.rows).includes(sessionA), false, "fleet rows must not expose session A identity");
  equal(JSON.stringify(snapshot.fleetComparison.rows).includes(sessionB), false, "fleet rows must not expose session B identity");
  equal(snapshot.fleetComparison.contextInjectionAllowed, false, "fleet aggregate must not become model context");
  equal(snapshot.fleetComparison.memoryMutationAuthorized, false, "fleet aggregate must not mutate memory");

  const tampered = structuredClone(snapshot);
  tampered.providerVersionEvidence.rows[0].model = "tampered-model";
  equal(center.verifyMemoryCenterExactSessionDiagnosticExport(tampered, requestedScope).valid, false, "payload tampering must invalidate the export checksum");
  equal(center.verifyMemoryCenterExactSessionDiagnosticExport(snapshot, `${groupId}::${sessionB}`).valid, false, "cross-session verification must fail closed");
  let groupOnlyRejected = false;
  try { center.buildMemoryCenterExactSessionDiagnosticExport(groupId); } catch { groupOnlyRejected = true; }
  equal(groupOnlyRejected, true, "group-only scope must not produce a diagnostic export");
  let defaultRejected = false;
  try { center.buildMemoryCenterExactSessionDiagnosticExport(`${groupId}::default`); } catch { defaultRejected = true; }
  equal(defaultRejected, true, "legacy default scope must not produce a diagnostic export");

  const response = { status: 0, headers: {}, body: "", writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = String(body || ""); } };
  const handled = center.handleMemoryCenterApi("/api/memory-center/session-diagnostic-export", { method: "GET" }, response, { query: { scope_id: requestedScope } });
  equal(handled, true, "Memory Center API must handle diagnostic downloads");
  equal(response.status, 200, "diagnostic download API must return 200");
  ok(String(response.headers["Content-Disposition"] || "").startsWith("attachment;"), "diagnostic API must return a JSON attachment");
  equal(response.headers["Cache-Control"], "no-store", "diagnostic attachment must not be cached");
  const downloaded = JSON.parse(response.body);
  equal(center.verifyMemoryCenterExactSessionDiagnosticExport(downloaded, requestedScope).valid, true, "downloaded diagnostic attachment must verify independently");

  const overview = center.buildTaskAgentMemoryContextSnapshotReport({ groupId });
  ok(Number(overview.diagnosticExportFleet?.overall?.evidenceCount || 0) >= 2, "Memory Center must expose fleet evidence coverage");
  ok(Number(overview.overall?.diagnosticVersionUnboundEvidenceCount || 0) >= 1, "Memory Center must expose unbound exact-session evidence");
  const backendSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf-8");
  const frontendSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf-8");
  ok(backendSource.includes("/api/memory-center/session-diagnostic-export"), "backend source must expose the download route");
  ok(frontendSource.includes("downloadSessionMemoryDiagnostic"), "Memory Center must expose a per-session download action");
  ok(frontendSource.includes("diagnosticVersionUnboundEvidenceCount"), "Memory Center must render unbound evidence coverage");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 291 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks, evidence: snapshot.providerVersionEvidence.evidenceCount, fleet: snapshot.fleetComparison.overall }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
