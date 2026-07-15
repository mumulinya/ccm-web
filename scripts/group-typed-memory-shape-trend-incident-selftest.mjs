import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const DAY = 86_400_000;
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase290-trend-incident-${nonce}`;
const sessionA = `gcs_phase290_a_${nonce}`;
const sessionB = `gcs_phase290_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const nowMs = Date.now();
const secretNote = "PHASE290_OPERATOR_NOTE_MUST_NOT_ENTER_INCIDENT_LEDGER";

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

function selector(scopeId, eventKey, daysAgo, selectedCount, optionsNowMs = nowMs) {
  return typed.recordGroupTypedMemoryShapeTrendContribution(scopeId, {
    kind: "selector",
    eventKey,
    recordedAt: new Date(nowMs - daysAgo * DAY).toISOString(),
    metrics: {
      candidateCount: 4,
      selectedCount,
      selectedAgeAverage: selectedCount ? 1 : -1,
      freshCount: selectedCount,
      staleCount: 0,
    },
  }, { nowMs: optionsNowMs });
}

function write(scopeId, eventKey, recordedMs, optionsNowMs, input = {}) {
  return typed.recordGroupTypedMemoryShapeTrendContribution(scopeId, {
    kind: "write",
    eventKey,
    recordedAt: new Date(recordedMs).toISOString(),
    metrics: {
      operation: input.operation || "noop",
      changed: input.changed === true,
      growthBytes: Number(input.growthBytes || 0),
      afterBytes: Number(input.afterBytes || 100),
      nearBodyLimit: input.nearBodyLimit === true,
      bodyTruncated: input.bodyTruncated === true,
    },
  }, { nowMs: optionsNowMs });
}

async function runMetricsConcurrency() {
  const controlDir = path.join(runtimeRoot, "memory-control-selftests", groupId);
  const centerModule = path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js");
  const workers = 6;
  const writesPerWorker = 15;
  const childSource = `const center=require(${JSON.stringify(centerModule)}); const worker=process.argv[1]; for(let i=0;i<${writesPerWorker};i++) center.recordMemoryMetric('recall_hit',{worker,i});`;
  await Promise.all(Array.from({ length: workers }, (_, index) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", childSource, `worker-${index}`], {
      env: { ...process.env, CCM_MEMORY_CONTROL_DIR: controlDir },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`metrics worker ${index} failed (${code}): ${stderr}`)));
  })));
  return { controlDir, metrics: JSON.parse(fs.readFileSync(path.join(controlDir, "metrics.json"), "utf-8")), workers, writesPerWorker };
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  for (let index = 0; index < 3; index += 1) selector(scopeA, `baseline-${index}`, 10 + index, 4);
  let lastContribution = null;
  for (let index = 0; index < 3; index += 1) lastContribution = selector(scopeA, `recent-${index}`, index, 0);
  equal(lastContribution.incidentTransition.transition, "opened", "sufficient actionable drift must open an incident automatically");

  let trend = typed.summarizeGroupTypedMemoryShapeTrend(scopeA, { nowMs });
  equal(trend.status, "drift", "fixture must produce durable drift");
  let incident = typed.summarizeGroupTypedMemoryShapeTrendIncidents(scopeA, { includeEvents: true });
  equal(incident.status, "pending", "new actionable incident must require acknowledgement");
  equal(incident.pendingCount, 1, "only one exact-session incident may be active");
  equal(incident.eventCount, 1, "first actionable state must append one opened event");
  equal(incident.activeIncident.trendGeneration, trend.generation, "opened event must bind the observed trend generation");
  equal(incident.activeIncident.trendLedgerChecksum, trend.ledgerChecksum, "opened event must bind the trend ledger checksum");
  equal(incident.advisoryOnly, true, "incident summary must remain advisory-only");
  equal(incident.visibilityOnly, true, "incident acknowledgement must affect visibility only");
  equal(incident.memoryMutationAuthorized, false, "incident acknowledgement must not authorize memory mutation");
  equal(typed.verifyGroupTypedMemoryShapeTrendIncidentSummary(incident, scopeA).valid, true, "incident summary must be checksummed");
  equal(typed.verifyGroupTypedMemoryShapeTrendIncidentSummary(incident, scopeB).valid, false, "incident summary must reject cross-session use");

  const ledgerFile = typed.getGroupTypedMemoryShapeTrendIncidentFile(scopeA);
  let ledger = typed.readGroupTypedMemoryShapeTrendIncidentLedger(scopeA);
  equal(typed.verifyGroupTypedMemoryShapeTrendIncidentLedger(ledger, scopeA).valid, true, "incident ledger and event chain must verify");
  equal(typed.verifyGroupTypedMemoryShapeTrendIncidentLedger(ledger, scopeB).valid, false, "incident ledger must reject cross-session verification");
  const ledgerText = fs.readFileSync(ledgerFile, "utf-8");
  equal(ledgerText.includes("baseline-0"), false, "incident ledger must not store raw contribution event keys");
  equal(ledgerText.includes(secretNote), false, "incident ledger must not contain future free-form operator notes");

  const sameState = selector(scopeA, "same-actionable-state", 0, 0);
  equal(sameState.incidentTransition.changed, false, "unchanged actionable signal state must not open duplicate incidents");
  incident = typed.summarizeGroupTypedMemoryShapeTrendIncidents(scopeA);
  equal(incident.incidentCount, 1, "continued sampling of the same signal state must remain one incident");

  const missingExplicit = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeA, {
    incidentId: incident.activeIncident.incidentId,
    incidentChecksum: incident.activeIncident.incidentChecksum,
  });
  equal(missingExplicit.reason, "explicit_confirmation_required", "acknowledgement must require an explicit user action");
  const crossSession = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeB, {
    incidentId: incident.activeIncident.incidentId,
    incidentChecksum: incident.activeIncident.incidentChecksum,
    explicitConfirmation: true,
  });
  equal(crossSession.reason, "no_active_shape_trend_incident", "session B must not acknowledge session A's incident");
  const staleChecksum = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeA, {
    incidentId: incident.activeIncident.incidentId,
    incidentChecksum: "0".repeat(64),
    explicitConfirmation: true,
  });
  equal(staleChecksum.reason, "shape_trend_incident_changed", "stale incident checksum must fail closed");

  const acknowledged = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeA, {
    incidentId: incident.activeIncident.incidentId,
    incidentChecksum: incident.activeIncident.incidentChecksum,
    explicitConfirmation: true,
    actor: "phase290-selftest",
    note: secretNote,
  });
  equal(acknowledged.acknowledged, true, "current exact-session incident must be acknowledgeable");
  equal(acknowledged.event.visibilityOnly, true, "ack event must be visibility-only");
  equal(acknowledged.event.memoryMutationAuthorized, false, "ack event must deny memory mutation authority");
  equal(acknowledged.event.noteChars, secretNote.length, "ack event may retain note length for audit shape");
  equal(fs.readFileSync(ledgerFile, "utf-8").includes(secretNote), false, "free-form acknowledgement note must be checksummed rather than stored");
  incident = typed.summarizeGroupTypedMemoryShapeTrendIncidents(scopeA);
  equal(incident.status, "acknowledged", "active incident must expose acknowledged state");
  equal(incident.pendingCount, 0, "acknowledgement must clear only the visibility pending count");
  equal(incident.acknowledgedCount, 1, "acknowledgement history must remain durable");
  const replayAck = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeA, {
    incidentId: incident.activeIncident.incidentId,
    incidentChecksum: incident.activeIncident.incidentChecksum,
    explicitConfirmation: true,
  });
  equal(replayAck.idempotent, true, "replayed acknowledgement must not append another event");

  const oldIncidentId = incident.activeIncident.incidentId;
  const changedState = write(scopeA, "truncated-write", nowMs, nowMs, { operation: "update", changed: true, growthBytes: 5000, afterBytes: 6000, nearBodyLimit: true, bodyTruncated: true });
  equal(changedState.incidentTransition.transition, "replaced", "a changed signal fingerprint must resolve the old incident and open a new one");
  incident = typed.summarizeGroupTypedMemoryShapeTrendIncidents(scopeA, { includeEvents: true });
  equal(incident.status, "pending", "changed actionable state must require a fresh acknowledgement");
  equal(incident.incidentCount, 2, "changed signal state must preserve the previous incident in history");
  equal(incident.resolvedCount, 1, "old acknowledged incident must be resolved before replacement");
  equal(incident.activeIncident.incidentId === oldIncidentId, false, "replacement incident must have a new identity");
  ok(incident.activeIncident.signalCodes.includes("write_body_truncated"), "new incident must expose the newly actionable signal code");
  const staleOldIncident = typed.acknowledgeGroupTypedMemoryShapeTrendIncident(scopeA, {
    incidentId: oldIncidentId,
    explicitConfirmation: true,
  });
  equal(staleOldIncident.reason, "shape_trend_incident_changed", "resolved incident must never acknowledge the replacement");

  let centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  let centerRow = centerReport.groups?.find((row) => row.groupSessionId === sessionA) || {};
  equal(centerRow.memoryShapeTrendIncidentStatus, "pending", "Memory Center must expose pending trend incidents");
  equal(centerRow.memoryShapeTrendIncidentPendingCount, 1, "Memory Center must expose exact-session pending count");
  equal(centerRow.memoryShapeTrendActiveIncident.incidentId, incident.activeIncident.incidentId, "Memory Center acknowledge control must bind the current incident");
  equal(centerReport.overall.memoryShapeTrendIncidentPendingCount, 1, "fleet summary must count pending exact-session incidents");
  equal(centerReport.overall.memoryShapeTrendIncidentInvalidSessionCount, 0, "pristine incident chains must not create fleet integrity gaps");
  if (process.env.CCM_PHASE290_BASE_URL) {
    const response = await fetch(`${process.env.CCM_PHASE290_BASE_URL.replace(/\/$/, "")}/api/memory-center/session-memory-shape-trend/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopeId: `${groupId}::${sessionA}`,
        incidentId: incident.activeIncident.incidentId,
        incidentChecksum: incident.activeIncident.incidentChecksum,
        explicitConfirmation: true,
        actor: "phase290-production-selftest",
      }),
    });
    const apiResult = await response.json();
    equal(response.status, 200, "production acknowledgement API must accept the current exact-session incident");
    equal(apiResult?.result?.event?.memoryMutationAuthorized, false, "production acknowledgement API must preserve the no-mutation boundary");
  }

  const futureNowMs = nowMs + 40 * DAY;
  const resolved = write(scopeA, "future-stable-sample", futureNowMs, futureNowMs, { operation: "noop" });
  equal(resolved.incidentTransition.transition, "resolved", "signal disappearance must append a resolved event");
  incident = typed.summarizeGroupTypedMemoryShapeTrendIncidents(scopeA);
  equal(incident.status, "resolved", "no active incident must leave durable resolved history");
  equal(incident.pendingCount, 0, "resolved history must have no pending incident");
  equal(incident.resolvedCount, 2, "both historical actionable states must be resolved");

  ledger = typed.readGroupTypedMemoryShapeTrendIncidentLedger(scopeA);
  const pristinePrimary = fs.readFileSync(ledgerFile, "utf-8");
  ok(fs.existsSync(`${ledgerFile}.bak`), "incident updates must preserve an atomic backup");
  const tampered = structuredClone(ledger);
  tampered.events[0].signalCodes = ["tampered"];
  equal(typed.verifyGroupTypedMemoryShapeTrendIncidentLedger(tampered, scopeA).valid, false, "event tampering must break the chain");
  fs.writeFileSync(ledgerFile, "{corrupt-primary", "utf-8");
  const recovered = typed.readGroupTypedMemoryShapeTrendIncidentLedger(scopeA);
  equal(recovered.valid, true, "incident ledger must recover from a valid backup");
  equal(recovered.recoveredFromBackup, true, "incident backup recovery must be explicit");
  fs.writeFileSync(ledgerFile, pristinePrimary, "utf-8");

  const pristineBackup = fs.readFileSync(`${ledgerFile}.bak`, "utf-8");
  fs.writeFileSync(ledgerFile, "{corrupt-primary", "utf-8");
  fs.writeFileSync(`${ledgerFile}.bak`, "{corrupt-backup", "utf-8");
  const telemetryDuringIncidentFailure = write(scopeA, "telemetry-survives-incident-failure", futureNowMs, futureNowMs, { operation: "noop" });
  equal(telemetryDuringIncidentFailure.recorded, true, "incident-chain failure must not block shape telemetry");
  ok(String(telemetryDuringIncidentFailure.incidentTransitionError || "").includes("unrecoverable"), "incident-chain failure must remain visible on the contribution result");
  fs.writeFileSync(ledgerFile, pristinePrimary, "utf-8");
  fs.writeFileSync(`${ledgerFile}.bak`, pristineBackup, "utf-8");

  const trendFileB = typed.getGroupTypedMemoryShapeTrendFile(scopeB);
  write(scopeB, "session-b-first", nowMs, nowMs, { operation: "create", changed: true });
  write(scopeB, "session-b-second", nowMs, nowMs, { operation: "noop" });
  fs.writeFileSync(trendFileB, "{corrupt-primary", "utf-8");
  fs.writeFileSync(`${trendFileB}.bak`, "{corrupt-backup", "utf-8");
  let unrecoverableRejected = false;
  try { write(scopeB, "session-b-unrecoverable", nowMs, nowMs, { operation: "noop" }); } catch (error) { unrecoverableRejected = String(error?.message || error).includes("trend_ledger_unrecoverable"); }
  equal(unrecoverableRejected, true, "both corrupt trend copies must fail closed instead of silently replacing evidence");

  const metricsConcurrency = await runMetricsConcurrency();
  equal(metricsConcurrency.metrics.counters.recallAttempts, metricsConcurrency.workers * metricsConcurrency.writesPerWorker, "locked metric writes must not lose concurrent recall attempts");
  equal(metricsConcurrency.metrics.counters.recallHits, metricsConcurrency.workers * metricsConcurrency.writesPerWorker, "locked metric writes must not lose concurrent recall hits");
  ok(fs.existsSync(path.join(metricsConcurrency.controlDir, "metrics.json.bak")), "concurrent metric writes must preserve an atomic backup");

  const source = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf-8");
  ok(source.includes("/api/memory-center/session-memory-shape-trend/acknowledge"), "Memory Center must expose an acknowledgement API");
  ok(source.includes("memoryMutationAuthorized: false"), "Memory Center audit must preserve the no-mutation boundary");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 290 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
