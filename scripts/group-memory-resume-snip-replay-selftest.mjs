import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const memoryApi = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-resume-snip-replay-"));
const groupId = `phase294-snip-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_phase294_${Date.now().toString(36)}`;

function row(id, parentUuid, content = `message ${id}`) {
  return { id, role: id.startsWith("u") ? "user" : "assistant", parentUuid, content, group_session_id: sessionId };
}

function memoryFor(rows, throughIndex, boundaryId) {
  const base = {
    groupId,
    groupSessionId: sessionId,
    conversationSummary: { primaryRequest: "preserve exact-session snip replay", decisions: ["raw transcript remains authoritative"] },
    messageDigest: "Snipped middle ranges must not return to resumed Agent context.",
  };
  const summaryChecksum = api.calculateGroupMemorySummaryChecksum(base);
  const kept = rows.slice(throughIndex + 1);
  const segment = {
    schema: "ccm-group-preserved-segment-v1",
    keepIndex: throughIndex + 1,
    preservedMessageCount: kept.length,
    preservedMessageIds: kept.map(item => item.id),
    omittedPreservedMessageIds: 0,
    firstPreservedMessageId: kept[0]?.id || "",
    lastPreservedMessageId: kept.at(-1)?.id || "",
    summarizedThroughMessageId: rows[throughIndex].id,
    summaryChecksum,
  };
  const compactBoundary = {
    id: boundaryId,
    summarizedThroughMessageId: rows[throughIndex].id,
    summaryChecksum,
    preservedSegment: segment,
    post_compact_restore: { summaryChecksum, preservedSegment: segment },
  };
  return {
    ...base,
    compactBoundary,
    compaction: { summaryChecksum, lastCompactedMessageId: rows[throughIndex].id, boundaries: [compactBoundary] },
  };
}

try {
  const markerA = api.buildGroupMemorySnipBoundaryMarker({
    id: "snip-a",
    groupId,
    groupSessionId: sessionId,
    removedMessageIds: ["a3", "a4"],
    parentUuid: "a4",
    timestamp: "2026-07-15T01:00:00.000Z",
    reason: "large_middle_tool_results",
  });
  const markerB = api.buildGroupMemorySnipBoundaryMarker({
    id: "snip-b",
    groupId,
    groupSessionId: sessionId,
    removedUuids: ["a6"],
    parentUuid: "a6",
    timestamp: "2026-07-15T01:01:00.000Z",
  });
  const large = "SNIP_LARGE_BODY_SENTINEL ".repeat(6000);
  const rows = [
    row("a1", null, "summarized prefix"),
    row("a2", "a1", "preserved head"),
    row("a3", "a2", large),
    row("a4", "a3", large),
    markerA,
    row("a5", "snip-a", "survivor between snips"),
    row("a6", "a5", large),
    markerB,
    row("a7", "snip-b", "surviving tail"),
  ];
  const storedMemory = memoryFor(rows, 0, "phase294-boundary-1");
  const commit = api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: rows, memory: storedMemory, rootDir: tempRoot });
  const projection = api.buildGroupMemoryResumeProjection({ groupId, sessionId, messages: rows, memory: storedMemory, rootDir: tempRoot });
  const baseline = memoryApi.buildGroupMemoryResumeEffectiveTokenBaseline(projection, storedMemory, rows);
  const proof = api.recordGroupMemoryResumeProjectionProof(projection, { rootDir: tempRoot, resumeBaseline: baseline });
  const proofs = api.readGroupMemoryResumeProjectionProofs(groupId, sessionId, { rootDir: tempRoot });

  const crossSessionMarker = api.buildGroupMemorySnipBoundaryMarker({
    id: "cross-session-snip",
    groupId,
    groupSessionId: "gcs_other_session",
    removedMessageIds: ["n4"],
    parentUuid: "n5",
    timestamp: "2026-07-15T02:00:00.000Z",
  });
  const noBoundaryRows = [
    row("n1", null),
    row("n2", "n1", large),
    row("n3", "n2", large),
    row("n4", "n3", "survivor after removed range"),
    api.buildGroupMemorySnipBoundaryMarker({
      id: "no-boundary-snip",
      groupId,
      groupSessionId: sessionId,
      removedMessageIds: ["n2", "n3"],
      parentUuid: "n4",
      timestamp: "2026-07-15T02:01:00.000Z",
    }),
    crossSessionMarker,
    { ...row("legacy-snip", "cross-session-snip"), snipMetadata: { reason: "legacy_without_removed_ids" } },
    {
      ...row("bad-checksum-snip", "legacy-snip"),
      snipMetadata: { groupSessionId: sessionId, removedUuids: ["n4"], removedUuidsChecksum: "tampered" },
    },
  ];
  const noBoundaryProjection = api.buildGroupMemoryResumeProjection({
    groupId,
    sessionId,
    messages: noBoundaryRows,
    memory: memoryApi.createEmptyGroupMemory(groupId, sessionId),
    rootDir: path.join(tempRoot, "no-boundary"),
  });

  let legacyRejected = false;
  try {
    api.buildGroupMemorySnipBoundaryMarker({ groupId, groupSessionId: "default", removedMessageIds: ["x"] });
  } catch (error) {
    legacyRejected = String(error?.message || error).includes("exact_group_session_required");
  }

  const projectedById = new Map(projection.projectedMessages.map(item => [item.id, item]));
  const noBoundaryById = new Map(noBoundaryProjection.projectedMessages.map(item => [item.id, item]));
  const checks = {
    exactSessionMarkerIsChecksummed: markerA.snipMetadata.removedUuidsChecksum.length === 32
      && markerA.snipMetadata.groupSessionId === sessionId,
    compactBoundaryCommitIsDurable: commit.committed === true && commit.journal.commitCount === 1,
    multipleSnipMarkersAreUnionReplayed: projection.status === "verified"
      && projection.snipReplay.markerCount === 2
      && projection.snipReplay.requestedRemovalCount === 3
      && projection.snipReplay.removedMessageCount === 3,
    middleRangesAreAbsentFromProjection: projection.projectedMessageIds.join(",") === "a2,snip-a,a5,snip-b,a7",
    danglingParentsAreRelinkedAcrossBothRanges: projectedById.get("snip-a")?.parentUuid === "a2"
      && projectedById.get("snip-b")?.parentUuid === "a5"
      && projection.snipReplay.relinkedMessageCount === 2,
    rawTranscriptIsNotMutated: rows.find(item => item.id === "snip-a")?.parentUuid === "a4"
      && rows.find(item => item.id === "snip-b")?.parentUuid === "a6"
      && rows.some(item => item.id === "a3")
      && rows.some(item => item.id === "a6"),
    baselineUsesSnippedProjection: memoryApi.validateGroupMemoryResumeEffectiveTokenBaseline(baseline) === true
      && baseline.snipRemovedMessageCount === 3
      && baseline.snipRemovedTokenEstimate > 100_000
      && baseline.rawTranscriptTokens > baseline.effectiveContextTokens,
    proofCarriesBodyFreeSnipAudit: proof.snipReplay.removalChecksum === projection.snipReplay.removalChecksum
      && proofs.latestProof.resumeEffectiveTokenBaseline.baselineChecksum === baseline.baselineChecksum
      && !JSON.stringify(proofs).includes("SNIP_LARGE_BODY_SENTINEL"),
    snipReplayWorksWithoutCompactBoundary: noBoundaryProjection.status === "verified"
      && noBoundaryProjection.useProjection === true
      && noBoundaryProjection.projectedMessageIds.includes("n1")
      && !noBoundaryProjection.projectedMessageIds.includes("n2")
      && !noBoundaryProjection.projectedMessageIds.includes("n3")
      && noBoundaryById.get("n4")?.parentUuid === "n1",
    malformedAndCrossSessionMarkersFailClosedPerMarker: noBoundaryProjection.snipReplay.rejectedScopeMarkerCount === 1
      && noBoundaryProjection.snipReplay.legacyMarkerCount === 1
      && noBoundaryProjection.snipReplay.checksumMismatchMarkerCount === 1
      && noBoundaryProjection.projectedMessageIds.includes("n4"),
    legacyDefaultMarkerCreationIsRejected: legacyRejected,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    projection: { ...projection, projectedMessages: undefined, preservedMessages: undefined, messagesAfterBoundary: undefined },
    baseline,
    noBoundaryProjection: { ...noBoundaryProjection, projectedMessages: undefined, preservedMessages: undefined },
    proofs,
  }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase294-resume-snip-replay-selftest-v1", checks }, null, 2)}\n`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
