import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-post-turn-anchor-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const postTurn = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-post-turn-summary.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const compact = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const assistant = (id, content, extra = {}) => ({ id, role: "assistant", agent: "api", content, timestamp: new Date().toISOString(), ...extra });

try {
  const groupA = "phase252-group-a";
  const groupB = "phase252-group-b";
  const sessionA = storage.createGroupChatSession(groupA, "A current").id;
  const sessionB = storage.createGroupChatSession(groupA, "A isolated").id;
  const sessionC = storage.createGroupChatSession(groupB, "B current").id;
  const defaultRejected = postTurn.recordGroupPostTurnSummary(groupA, "default", assistant("default-a", "DEFAULT_MUST_NOT_RECORD"));
  const userRejected = postTurn.recordGroupPostTurnSummary(groupA, sessionA, { id: "user-a", role: "user", content: "USER_MUST_NOT_RECORD" });

  const aFirst = assistant("assistant-a", "SESSION_A_PRIVATE_TURN", { task_id: "task-a", status: "completed" });
  const recordedA = postTurn.recordGroupPostTurnSummary(groupA, sessionA, aFirst);
  const idempotentA = postTurn.recordGroupPostTurnSummary(groupA, sessionA, aFirst);
  const revisedA = postTurn.recordGroupPostTurnSummary(groupA, sessionA, { ...aFirst, content: "SESSION_A_PRIVATE_TURN_REVISED", status: "review" });
  postTurn.recordGroupPostTurnSummary(groupA, sessionB, assistant("assistant-b", "SESSION_B_VISIBLE_TURN", { status: "waiting", blockers: ["review needed"] }));
  postTurn.recordGroupPostTurnSummary(groupB, sessionC, assistant("assistant-c", "GROUP_B_PRIVATE_TURN"));

  const ledgerA = postTurn.readGroupPostTurnSummaries(groupA, sessionA, { limit: 100 });
  const ledgerB = postTurn.readGroupPostTurnSummaries(groupA, sessionB, { limit: 100 });
  const ledgerC = postTurn.readGroupPostTurnSummaries(groupB, sessionC, { limit: 100 });
  const backfillSession = storage.createGroupChatSession(groupA, "backfill").id;
  const backfillMessages = [
    { id: "backfill-user", role: "user", content: "question" },
    assistant("backfill-a", "BACKFILL_A"),
    assistant("backfill-b", "BACKFILL_B"),
  ];
  const backfilled = postTurn.backfillGroupPostTurnSummaries(groupA, backfillSession, backfillMessages);

  const tamperSession = storage.createGroupChatSession(groupA, "tamper").id;
  postTurn.recordGroupPostTurnSummary(groupA, tamperSession, assistant("tamper-a", "TAMPER_SOURCE"));
  const tamperFile = postTurn.getGroupPostTurnSummaryLedgerFile(groupA, tamperSession);
  const tamperedRows = fs.readFileSync(tamperFile, "utf-8").trim().split(/\r?\n/).map(line => JSON.parse(line));
  tamperedRows[0].title = "tampered without checksum";
  fs.writeFileSync(tamperFile, `${tamperedRows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf-8");
  const tamperedLedger = postTurn.readGroupPostTurnSummaries(groupA, tamperSession);

  const sessionBMessages = [
    { id: "b-user", role: "user", content: "continue current task" },
    assistant("assistant-b", "SESSION_B_VISIBLE_TURN", { status: "waiting", blockers: ["review needed"] }),
  ];
  storage.saveGroupMessages(groupA, sessionBMessages, sessionB);
  memory.saveGroupMemory(groupA, memory.createEmptyGroupMemory(groupA, sessionB), sessionB);
  const childBundle = memory.buildAgentMemoryContextBundle(groupA, "api", "continue", { groupSessionId: sessionB });
  const childRendered = memory.renderGroupMemoryContextBundle(childBundle);
  const ignoredBundle = memory.buildAgentMemoryContextBundle(groupA, "api", "ignore memory for this turn", { groupSessionId: sessionB, ignoreMemory: true });
  const ignoredRendered = memory.renderGroupMemoryContextBundle(ignoredBundle);
  const globalBundle = memory.buildGlobalGroupMemoryContext("route only", {
    groups: [
      { id: groupA, name: "Group A", members: [{ project: "api", agent: "codex" }] },
      { id: groupB, name: "Group B", members: [{ project: "web", agent: "claude-code" }] },
    ],
    disableLedger: true,
  });
  const globalRendered = JSON.stringify(globalBundle);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupA], groupSessionId: sessionB });
  const fleetRow = fleet.groups.find(row => row.groupSessionId === sessionB) || {};

  const rawMessages = Array.from({ length: 8 }, (_, index) => ({
    id: `compact-${index}`,
    role: index % 2 ? "assistant" : "user",
    content: `raw message ${index}`,
  }));
  const rawBefore = digest(rawMessages);
  const compactMemory = {
    groupId: groupA,
    groupSessionId: sessionB,
    conversationSummary: { primaryRequest: "anchor contract", decisions: ["preserve suffix"] },
    messageDigest: "anchor contract summary",
  };
  const summaryChecksum = boundary.calculateGroupMemorySummaryChecksum(compactMemory);
  const segment = compact.buildGroupPreservedSegment(rawMessages, 4, { groupId: groupA, summaryChecksum });
  const compactBoundary = {
    id: "phase252-boundary",
    summarizedThroughMessageId: segment.summarizedThroughMessageId,
    summaryChecksum,
    preservedSegment: segment,
    post_compact_restore: { summaryChecksum, preservedSegment: segment },
  };
  const memoryWithBoundary = {
    ...compactMemory,
    compactBoundary,
    compaction: { summaryChecksum, lastCompactedMessageId: segment.summarizedThroughMessageId },
  };
  const boundaryRoot = path.join(tempRoot, "boundary-proof");
  boundary.commitGroupMemoryCompactBoundary({ groupId: groupA, sessionId: sessionB, messages: rawMessages, memory: memoryWithBoundary, rootDir: boundaryRoot });
  const projection = boundary.buildGroupMemoryResumeProjection({ groupId: groupA, sessionId: sessionB, messages: rawMessages, memory: memoryWithBoundary, rootDir: boundaryRoot });
  const invalidSegment = { ...segment, anchorMessageId: "gcsum_wrong" };
  const invalidMemory = {
    ...memoryWithBoundary,
    compactBoundary: {
      ...compactBoundary,
      preservedSegment: invalidSegment,
      post_compact_restore: { summaryChecksum, preservedSegment: invalidSegment },
    },
  };
  const invalidProjection = boundary.buildGroupMemoryResumeProjection({ groupId: groupA, sessionId: sessionB, messages: rawMessages, memory: invalidMemory, rootDir: boundaryRoot });

  const ledgerBFile = postTurn.getGroupPostTurnSummaryLedgerFile(groupA, sessionB);
  const deletedSession = storage.deleteGroupChatSession(groupA, sessionB, { force: true });
  const checks = {
    defaultSessionIsRejected: defaultRejected.recorded === false,
    userTurnIsRejected: userRejected.recorded === false,
    assistantTurnIsRecorded: recordedA.recorded === true,
    sameAssistantTurnIsIdempotent: idempotentA.idempotent === true,
    changedAssistantTurnSupersedes: revisedA.recorded === true && !!revisedA.summary.supersedes_summary_id,
    sameGroupSessionsAreIsolated: ledgerA.latest.some(row => row.title.includes("REVISED")) && !ledgerB.latest.some(row => row.title.includes("SESSION_A")),
    groupsAreIsolated: ledgerC.latest.some(row => row.title.includes("GROUP_B")) && !ledgerB.latest.some(row => row.title.includes("GROUP_B")),
    backfillFindsAssistantTurnsOnly: backfilled.recorded === 2 && backfilled.ledger.summaryCount === 2,
    tamperFailsClosed: tamperedLedger.valid === false && tamperedLedger.issues.some(issue => issue.code === "checksum_invalid"),
    childBundleInjectsCurrentTurnSummary: childRendered.includes("最近逐轮摘要") && childRendered.includes("SESSION_B_VISIBLE_TURN"),
    childBundleDoesNotLeakOtherSession: !childRendered.includes("SESSION_A_PRIVATE_TURN") && !childRendered.includes("GROUP_B_PRIVATE_TURN"),
    ignoreMemorySuppressesTurnSummaries: ignoredBundle.memory_policy?.ignored === true && !ignoredRendered.includes("SESSION_B_VISIBLE_TURN"),
    globalAgentExcludesGroupTurnSummaries: !globalRendered.includes("SESSION_B_VISIBLE_TURN") && !globalRendered.includes("GROUP_B_PRIVATE_TURN"),
    memoryCenterObservesTurnLedger: fleetRow.postTurnSummaryLedgerValid === true && fleetRow.postTurnSummaryCount === 1 && fleetRow.postTurnSummaryMissingCount === 0,
    compactSegmentCarriesHeadAnchorTail: segment.version === 2
      && segment.headMessageId === segment.firstPreservedMessageId
      && segment.anchorMessageId === segment.summaryMessageId
      && segment.tailMessageId === segment.lastPreservedMessageId
      && segment.anchorKind === "compact_summary"
      && segment.anchorMode === "suffix_preserving",
    resumeProjectionVerifiesSummaryAnchor: projection.verified === true
      && projection.boundary.anchorMessageId === segment.summaryMessageId
      && projection.boundary.headMessageId === segment.firstPreservedMessageId
      && projection.boundary.tailMessageId === segment.lastPreservedMessageId,
    invalidAnchorFailsClosed: invalidProjection.verified === false && invalidProjection.mustUseFullRawTranscript === true,
    rawTranscriptRemainsUntouched: digest(rawMessages) === rawBefore,
    deletingSessionDeletesTurnLedger: deletedSession.postTurnSummaries?.deletedCount > 0 && !fs.existsSync(ledgerBFile),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  console.log(JSON.stringify({ pass: true, checks, anchor: projection.boundary, fleet: {
    summaries: fleetRow.postTurnSummaryCount,
    missing: fleetRow.postTurnSummaryMissingCount,
    ledgerValid: fleetRow.postTurnSummaryLedgerValid,
  } }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
