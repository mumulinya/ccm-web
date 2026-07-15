import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase288-shape-drift-${nonce}`;
const sessionA = `gcs_phase288_a_${nonce}`;
const sessionB = `gcs_phase288_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const nowMs = Date.now();
const baselineAt = new Date(nowMs - 10 * 86_400_000).toISOString();
const secretBody = "PHASE288_BODY_MUST_NOT_ENTER_SHAPE_TELEMETRY";

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

function rewriteArtifactTime(file, recordedAt) {
  const value = JSON.parse(fs.readFileSync(file, "utf-8"));
  value.recordedAt = recordedAt;
  delete value.checksum;
  value.checksum = crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 64);
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
  return value;
}

function upsert(scopeId, body, updatedAt, maxBodyChars = 6_000) {
  return typed.upsertGroupTypedMemoryDocument(scopeId, {
    type: "project",
    slug: "phase288-capacity",
    name: "Phase 288 capacity memory",
    description: "Phase 288 body-free write shape fixture",
    source: "selftest:phase288-shape-drift",
    body: `${secretBody}\n${body}`,
    updatedAt,
    maxBodyChars,
  });
}

try {
  cleanupRuntimeResidue();
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const baselineWrites = [
    upsert(scopeA, "a".repeat(100), "2026-07-01T00:00:00.000Z"),
    upsert(scopeA, "b".repeat(120), "2026-07-02T00:00:00.000Z"),
    upsert(scopeA, "b".repeat(120), "2026-07-02T00:00:00.000Z"),
  ];
  equal(baselineWrites[0].writeShapeTelemetry.operation, "create", "first exact-session write must record create shape");
  equal(baselineWrites[1].writeShapeTelemetry.operation, "update", "changed exact-session write must record update shape");
  equal(baselineWrites[2].writeShapeTelemetry.operation, "noop", "unchanged exact-session upsert must remain distinguishable");
  for (const write of baselineWrites) rewriteArtifactTime(write.writeShapeTelemetry.shapeFile, baselineAt);

  const recentWrites = [
    upsert(scopeA, "c".repeat(5_500), "2026-07-03T00:00:00.000Z"),
    upsert(scopeA, "d".repeat(5_600), "2026-07-04T00:00:00.000Z"),
    upsert(scopeA, "e".repeat(5_700), "2026-07-05T00:00:00.000Z"),
    upsert(scopeA, "f".repeat(6_100), "2026-07-06T00:00:00.000Z"),
  ];
  equal(recentWrites.every(write => write.writeShapeTelemetry.nearBodyLimit === true), true, "recent writes must expose capacity pressure without bodies");
  equal(recentWrites.at(-1).writeShapeTelemetry.bodyTruncated, true, "write shape must report input beyond configured body limit");
  equal(typed.verifyGroupTypedMemoryWriteShape(recentWrites[0].writeShapeTelemetry, scopeA).valid, true, "returned write shape must verify after runtime fields are excluded");
  const writeShapeText = fs.readFileSync(recentWrites[0].writeShapeTelemetry.shapeFile, "utf-8");
  equal(writeShapeText.includes(secretBody), false, "write-shape artifact must never contain memory body text");
  equal(writeShapeText.includes("selftest:phase288-shape-drift"), false, "write-shape artifact must checksum rather than expose source text");

  let writeSummary = typed.summarizeGroupTypedMemoryWriteShapes(scopeA, { includeRows: true });
  equal(writeSummary.shapeCount, 7, "write summary must count create, update, and noop events");
  equal(writeSummary.createCount, 1, "write summary must count one create");
  equal(writeSummary.updateCount, 5, "write summary must count five changed updates");
  equal(writeSummary.noopCount, 1, "write summary must count one noop");
  equal(writeSummary.nearBodyLimitCount, 4, "write summary must count near-limit writes");
  equal(writeSummary.bodyTruncatedCount, 1, "write summary must count truncated input");
  equal(writeSummary.valid, true, "all pristine write shapes must verify");

  const sessionBWrite = typed.upsertGroupTypedMemoryDocument(scopeB, {
    type: "project",
    slug: "phase288-session-b",
    name: "Session B",
    description: "Session B isolated write",
    source: "selftest:phase288-session-b",
    body: "SESSION B ONLY",
  });
  equal(typed.summarizeGroupTypedMemoryWriteShapes(scopeB).shapeCount, 1, "session B must have an independent write-shape ledger");
  equal(typed.summarizeGroupTypedMemoryWriteShapes(scopeA).shapeCount, 7, "session B write must not alter session A capacity history");
  equal(typed.verifyGroupTypedMemoryWriteShape(sessionBWrite.writeShapeTelemetry, scopeA).valid, false, "write shape must reject cross-session verification");

  const baselineSelections = [];
  for (let index = 0; index < 3; index += 1) {
    const decision = await typed.selectGroupTypedMemoryManifest(scopeA, `PHASE288 baseline selector ${index}`, {
      executor: async () => ({ selected_memories: ["phase288-capacity.md"] }),
    });
    equal(decision.status, "selected", "baseline selector must select the candidate");
    rewriteArtifactTime(decision.recallShapeTelemetryFile, baselineAt);
    baselineSelections.push(decision);
  }

  for (let index = 0; index < 3; index += 1) {
    const decision = await typed.selectGroupTypedMemoryManifest(scopeA, `PHASE288 recent selector ${index}`, {
      executor: async () => ({ selected_memories: [] }),
    });
    equal(decision.status, "empty", "recent selector must produce an observed empty run");
  }

  const evaluationNowMs = Date.now() + 1_000;
  const summary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeA, {
    nowMs: evaluationNowMs,
    includeShapeRows: true,
    includeWriteShapeRows: true,
  });
  equal(summary.shapeDrift.status, "drift", "sufficient recent and baseline evidence must produce drift status");
  equal(summary.shapeDrift.confidence.selectorSufficient, true, "three runs in each window must satisfy selector confidence");
  equal(summary.shapeDrift.confidence.writeSufficient, true, "three writes in each window must satisfy write confidence");
  equal(summary.shapeDrift.confidence.consumptionSufficient, false, "missing consumption evidence must not fabricate utility confidence");
  equal(summary.shapeDrift.recent.selectorRunCount, 3, "recent window must include only recent selector runs");
  equal(summary.shapeDrift.baseline.selectorRunCount, 3, "baseline window must include only backdated selector runs");
  equal(summary.shapeDrift.recent.selectionRate, 0, "recent empty runs must have zero selection rate");
  equal(summary.shapeDrift.baseline.selectionRate, 1, "baseline selected runs must have full selection rate");
  equal(summary.shapeDrift.deltas.selectionRate, -1, "drift must preserve signed selection-rate change");
  equal(summary.shapeDrift.deltas.emptySelectionRate, 1, "drift must preserve signed empty-rate change");
  ok(summary.shapeDrift.signals.some(row => row.code === "selection_rate_shift"), "selection-rate shift must become an informational signal");
  ok(summary.shapeDrift.signals.some(row => row.code === "empty_selection_rise"), "empty-selection rise must become a warning signal");
  ok(summary.shapeDrift.signals.some(row => row.code === "write_size_growth"), "large write growth must become a warning signal");
  ok(summary.shapeDrift.signals.some(row => row.code === "write_capacity_pressure"), "near-limit writes must become a capacity signal");
  ok(summary.shapeDrift.signals.some(row => row.code === "write_body_truncated"), "truncated write must remain visible even before auto-tuning");
  equal(summary.shapeDrift.advisoryOnly, true, "shape drift must remain advisory");
  equal(summary.shapeDrift.autoTuning, false, "shape drift must not alter selector policy automatically");
  equal(summary.shapeDrift.crossSessionReuse, false, "shape drift must prohibit cross-session reuse");
  equal(typed.verifyGroupTypedMemoryShapeDrift(summary.shapeDrift, scopeA).valid, true, "shape drift report must be checksummed and exact-session bound");
  equal(JSON.stringify(summary.shapeDrift).includes(secretBody), false, "drift report must remain body-free");

  const tamperedDrift = { ...summary.shapeDrift, status: "stable" };
  equal(typed.verifyGroupTypedMemoryShapeDrift(tamperedDrift, scopeA).valid, false, "tampered drift status must fail checksum verification");
  equal(typed.verifyGroupTypedMemoryShapeDrift(summary.shapeDrift, scopeB).valid, false, "drift report must reject cross-session verification");
  const sessionBSummary = typed.summarizeGroupTypedMemoryManifestSelectorDecisions(scopeB, { nowMs: evaluationNowMs });
  equal(sessionBSummary.shapeDrift.status, "warming", "one isolated session-B write must remain low-confidence warming evidence");

  const tamperFile = recentWrites[0].writeShapeTelemetry.shapeFile;
  const pristineWriteShape = fs.readFileSync(tamperFile, "utf-8");
  const tamperedWriteShape = JSON.parse(pristineWriteShape);
  tamperedWriteShape.afterBytes += 1;
  fs.writeFileSync(tamperFile, JSON.stringify(tamperedWriteShape, null, 2), "utf-8");
  writeSummary = typed.summarizeGroupTypedMemoryWriteShapes(scopeA);
  ok(writeSummary.invalidShapeCount >= 1, "tampered write shape must become an integrity gap");
  equal(writeSummary.valid, false, "tampered write ledger must fail closed");
  fs.writeFileSync(tamperFile, pristineWriteShape, "utf-8");

  const centerReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const centerRow = centerReport.groups?.find(row => row.groupSessionId === sessionA) || {};
  equal(centerRow.memoryWriteShapeCount, 7, "Memory Center must expose exact-session write events");
  equal(centerRow.memoryWriteShapeNearBodyLimitCount, 4, "Memory Center must expose write capacity pressure");
  equal(centerRow.memoryShapeDriftStatus, "drift", "Memory Center must expose exact-session drift status");
  ok(centerRow.memoryShapeDriftSignalCount >= 5, "Memory Center must expose bounded diagnostic signals");
  equal(centerReport.overall.memoryShapeDriftSessionCount, 1, "fleet summary must count drift sessions");
  equal(centerReport.overall.memoryWriteShapeInvalidCount, 0, "restored write shapes must leave no fleet integrity gap");
  equal(fs.existsSync(memory.getGroupMemoryFile(groupId, "default")), false, "Phase 288 must not create a legacy default session");

  console.log(JSON.stringify({ pass: true, checks, checkCount: checks }, null, 2));
} finally {
  typed.configureGroupTypedMemoryManifestSelector(null);
  cleanupRuntimeResidue();
}
