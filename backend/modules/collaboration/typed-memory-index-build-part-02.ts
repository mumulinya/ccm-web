// Behavior-freeze split from typed-memory-index-build.ts (part 2/2).

// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { distillGroupMessagesToTypedMemoryUntilCaughtUp, getGroupTypedMemoryDistillationLedgerFile, readGroupTypedMemoryDistillationLedger, runGroupTypedMemoryDistillationMutation } from "./typed-memory-distillation-receipts";
import { cleanupGroupTypedMemoryArtifactStage, readGroupTypedMemoryStaleCandidateLedger } from "./typed-memory-ledgers";
import { getGroupTypedMemoryManifestSelectorShapeDir, recordGroupTypedMemoryWriteShape } from "./typed-memory-shape-trend";
import { CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS, GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION, GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION, GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION, GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL, GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR, GROUP_TYPED_MEMORY_DIR, GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, GROUP_TYPED_MEMORY_DISTILLATION_LEDGER, GROUP_TYPED_MEMORY_ENTRYPOINT, GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH, GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION, GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION, GROUP_TYPED_MEMORY_VERSION, GroupTypedMemoryManifestSelectorExecutor, GroupTypedMemoryType, applyGroupTypedMemoryArtifactVersion, checksum, compactText, ensureGroupTypedMemoryArtifactReadConsistency, ensureGroupTypedMemoryDir, evaluateTypedMemoryPathCondition, extractTypedMemoryIncludeRefs, getGroupTypedMemoryDir, groupTypedMemoryArtifactJournalChecksum, groupTypedMemoryArtifactStageDir, groupTypedMemoryArtifactTarget, groupTypedMemoryPriority, isExactGroupTypedMemorySessionScope, isPathInside, listLines, listMemoryMarkdownFiles, markdownLinkTitle, messageContent, messageIdentity, normalizeFileKey, normalizeMemoryType, normalizePathGlobs, normalizeTargetPath, now, parseFrontmatter, readGroupTypedMemoryArtifactText, renderMemoryDocument, safeSegment, stripIncludePath, truncateGroupTypedMemoryEntrypointContent, uniqueStrings, verifyGroupTypedMemoryArtifactVersion, writeGroupTypedMemoryArtifactJournalRaw, writeJsonAtomic, writeTextAtomic, writeTextAtomicRaw } from "./typed-memory-shared";

import {
  upsertGroupTypedMemoryDocument,
  buildGroupTypedMemoryIndex,
  normalizeDirectMemoryText,
  directMemoryFactIdentity,
  directMemoryFactRows,
} from "./typed-memory-index-build-part-01";

export function applyGroupDirectMemoryRequests(groupId: string, factsInput: any, requests: any[] = [], previous: any = {}, updatedAt = now()) {
  const facts: any = {};
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    facts[type] = { ...(factsInput?.[type] || {}) };
  }
  const receipts = new Map<string, any>();
  for (const row of Array.isArray(previous?.receipts) ? previous.receipts : []) {
    if (row?.requestId) receipts.set(String(row.requestId), row);
  }
  const tombstones = new Map<string, any>();
  for (const row of Array.isArray(previous?.tombstones) ? previous.tombstones : []) {
    if (row?.tombstoneId) tombstones.set(String(row.tombstoneId), row);
  }
  let rememberedThisRun = 0;
  let forgottenThisRun = 0;
  let duplicateThisRun = 0;
  let rejectedThisRun = 0;

  for (const request of [...requests].sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
    if (receipts.has(request.requestId)) {
      duplicateThisRun += 1;
      continue;
    }
    const base = {
      schema: "ccm-group-direct-memory-receipt-v1",
      version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
      requestId: request.requestId,
      action: request.action,
      groupId,
      messageId: request.messageId,
      sourceIndex: request.sourceIndex,
      requestChecksum: request.expectedChecksum,
      committedAt: updatedAt,
    };
    const reject = (reason: string, candidates: any[] = []) => {
      rejectedThisRun += 1;
      receipts.set(request.requestId, {
        ...base,
        status: "rejected",
        reason,
        candidateCount: candidates.length,
        candidates: candidates.slice(0, 12).map(row => ({
          memoryId: row.memoryId,
          type: row.type,
          messageId: String(row.fact?.messageId || ""),
          text: compactText(row.fact?.text || "", 240),
        })),
      });
    };
    if (request.sourceRole !== "user") {
      reject("direct_memory_requires_user_message");
      continue;
    }
    if (!request.scopeMatches) {
      reject("direct_memory_scope_mismatch");
      continue;
    }
    if (!request.checksumMatches) {
      reject("direct_memory_request_checksum_mismatch");
      continue;
    }
    if (!request.content) {
      reject("direct_memory_content_required");
      continue;
    }

    if (request.action === "remember") {
      const identity = directMemoryFactIdentity(groupId, request.memoryType, request.content);
      const bucket = facts[request.memoryType] || {};
      const existing = bucket[identity.factKey];
      for (const [key, tombstone] of tombstones.entries()) {
        if (String(tombstone?.textChecksum || "") === identity.textChecksum) tombstones.delete(key);
      }
      bucket[identity.factKey] = {
        id: identity.factKey,
        category: request.memoryType,
        type: "explicit_remember",
        groupId,
        memoryId: identity.memoryId,
        textChecksum: identity.textChecksum,
        messageId: request.messageId,
        sourceIndex: request.sourceIndex,
        actor: "用户 -> coordinator",
        sourceRole: "user",
        timestamp: request.requestedAt,
        text: request.content,
        checksum: identity.factKey,
        firstSeenAt: existing?.firstSeenAt || updatedAt,
        lastSeenAt: updatedAt,
        count: 1,
        directMemory: { requestId: request.requestId, requestChecksum: request.expectedChecksum },
        admission: {
          admitted: true,
          reason: "explicit_user_remember",
          hardExclusion: false,
          durable: true,
          nonObvious: true,
          hasRationale: true,
          confidence: 1,
          why: "The user explicitly requested this current group-session memory.",
          howToApply: "Apply only inside this group session unless the user explicitly forgets or supersedes it.",
        },
      };
      facts[request.memoryType] = bucket;
      if (existing) duplicateThisRun += 1;
      else rememberedThisRun += 1;
      receipts.set(request.requestId, {
        ...base,
        status: existing ? "duplicate" : "committed",
        reason: existing ? "same_scoped_memory_already_exists" : "explicit_memory_committed",
        memoryId: identity.memoryId,
        memoryType: request.memoryType,
        textChecksum: identity.textChecksum,
      });
      continue;
    }

    const allRows = directMemoryFactRows(facts).map(row => {
      if (row.fact?.memoryId && row.fact?.textChecksum) return row;
      const derived = directMemoryFactIdentity(groupId, row.type, String(row.fact?.text || ""));
      return { ...row, memoryId: derived.memoryId, textChecksum: derived.textChecksum };
    });
    const target = normalizeDirectMemoryText(request.targetMemoryId || request.content);
    let matches = allRows.filter(row => [row.memoryId, row.factKey, row.fact?.id, row.fact?.checksum, row.fact?.messageId]
      .some(value => normalizeDirectMemoryText(value) === target));
    if (!matches.length) {
      matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text) === target);
    }
    if (!matches.length && target.length >= 8) {
      matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text).includes(target));
    }
    if (matches.length !== 1) {
      reject(matches.length ? "forget_target_ambiguous" : "forget_target_not_found", matches);
      continue;
    }
    const matched = matches[0];
    delete facts[matched.type][matched.factKey];
    const tombstoneId = `gmt_${checksum([groupId, matched.memoryId, matched.factKey, request.requestId], 28)}`;
    tombstones.set(tombstoneId, {
      schema: "ccm-group-direct-memory-tombstone-v1",
      tombstoneId,
      groupId,
      memoryId: matched.memoryId,
      factKey: matched.factKey,
      textChecksum: matched.textChecksum || checksum(normalizeDirectMemoryText(matched.fact?.text), 64),
      sourceMessageId: String(matched.fact?.messageId || ""),
      forgetMessageId: request.messageId,
      requestId: request.requestId,
      forgottenAt: updatedAt,
    });
    forgottenThisRun += 1;
    receipts.set(request.requestId, {
      ...base,
      status: "committed",
      reason: "explicit_memory_forgotten",
      memoryId: matched.memoryId,
      memoryType: matched.type,
      textChecksum: matched.textChecksum,
    });
  }

  const boundedReceipts = [...receipts.values()]
    .sort((a, b) => String(a.committedAt || "").localeCompare(String(b.committedAt || "")))
    .slice(-500);
  const boundedTombstones = [...tombstones.values()]
    .sort((a, b) => String(a.forgottenAt || "").localeCompare(String(b.forgottenAt || "")))
    .slice(-500);
  return {
    facts,
    ledger: {
      schema: "ccm-group-direct-memory-ledger-v1",
      version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
      groupId,
      evaluatedThisRun: requests.length,
      rememberedThisRun,
      forgottenThisRun,
      duplicateThisRun,
      rejectedThisRun,
      activeDirectMemoryCount: directMemoryFactRows(facts).filter(row => row.fact?.directMemory?.requestId).length,
      receiptCount: boundedReceipts.length,
      tombstoneCount: boundedTombstones.length,
      receipts: boundedReceipts,
      tombstones: boundedTombstones,
      updatedAt,
    },
  };
}


export function filterFactsByDirectMemoryTombstones(facts: any, directMemory: any) {
  const blockedTextChecksums = new Set((Array.isArray(directMemory?.tombstones) ? directMemory.tombstones : [])
    .map((row: any) => String(row?.textChecksum || ""))
    .filter(Boolean));
  if (!blockedTextChecksums.size) return { facts, suppressedCount: 0 };
  const next: any = {};
  let suppressedCount = 0;
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    next[type] = {};
    for (const [key, fact] of Object.entries(facts?.[type] || {}) as Array<[string, any]>) {
      const textChecksum = String(fact?.textChecksum || checksum(normalizeDirectMemoryText(fact?.text), 64));
      if (blockedTextChecksums.has(textChecksum)) {
        suppressedCount += 1;
        continue;
      }
      next[type][key] = fact;
    }
  }
  return { facts: next, suppressedCount };
}


export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId: string) {
  return require("./group-memory-loading").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
}


export function conflictResolutionColdArchiveManifestChecksum(manifest: any = {}) {
  return require("./group-memory-loading").conflictResolutionColdArchiveManifestChecksum(manifest);
}


export function getConflictResolutionColdArchiveManifestGenerationsDir(groupId: string) {
  return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
}


export function getConflictResolutionColdArchiveManifestGenerationFile(groupId: string, manifestChecksum: string) {
  return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum);
}


export function readConflictResolutionColdArchiveManifest(groupId: string) {
  return require("./group-memory-loading").readConflictResolutionColdArchiveManifest(groupId);
}


export function readPreviousConflictResolutionColdArchiveManifest(groupId: string, currentManifest: any = {}) {
  return require("./group-memory-loading").readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest);
}


export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId: string, options: any = {}) {
  return require("./group-memory-loading").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options);
}


export function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId: string, options: any = {}) {
  return require("./group-memory-loading").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options);
}


export function buildGroupDirectMemoryAction(groupId: string, input: any = {}) {
  const action = String(input.action || "").trim().toLowerCase();
  if (!["remember", "forget"].includes(action)) throw new Error("unsupported_direct_memory_action");
  const messageId = compactText(input.messageId || input.message_id || "", 180);
  if (!messageId) throw new Error("direct_memory_message_id_required");
  const content = compactText(input.content || input.text || input.query || "", 1800);
  if (!content) throw new Error("direct_memory_content_required");
  const memoryType = normalizeMemoryType(input.memoryType || input.memory_type || input.type || "user");
  const targetMemoryId = compactText(input.targetMemoryId || input.target_memory_id || input.memoryId || input.memory_id || "", 180);
  const requestId = compactText(input.requestId || input.request_id || `gmdr_${checksum([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
  const requestChecksum = checksum([GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
  return {
    schema: "ccm-group-direct-memory-action-v1",
    version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
    requestId,
    action,
    scopeId: groupId,
    content,
    memoryType,
    targetMemoryId,
    requestChecksum,
  };
}


export function commitGroupDirectMemoryAction(groupId: string, messages: any[] = [], input: any = {}) {
  const requestId = String(input.requestId || input.request_id || "").trim();
  if (!requestId) throw new Error("direct_memory_request_id_required");
  const distillation = distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages, {}, {
    reason: String(input.reason || "direct-group-memory-action"),
    maxCatchUpBatches: Number(input.maxCatchUpBatches || input.max_catch_up_batches || 32),
  });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const receipt = (Array.isArray(ledger.directMemory?.receipts) ? ledger.directMemory.receipts : [])
    .find((row: any) => String(row?.requestId || "") === requestId) || null;
  return {
    schema: "ccm-group-direct-memory-commit-v1",
    version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
    groupId,
    requestId,
    committed: receipt?.status === "committed" || receipt?.status === "duplicate",
    receipt,
    directMemory: ledger.directMemory || null,
    distillation,
    index: buildGroupTypedMemoryIndex(groupId),
  };
}


export function syncGroupTypedMemoryFromGroupMemory(groupId: string, memory: any = {}) {
  const updatedAt = now();
  const goal = memory?.goal || memory?.summary || "";
  const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
  const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
  const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
  const blocked = Array.isArray(memory?.blocked) ? memory.blocked : [];
  const workerLedger = Array.isArray(memory?.workerLedger) ? memory.workerLedger : [];
  const reinject = memory?.compaction?.postCompactReinject || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan || {};

  const writes: any[] = [];
  const userBody = [
    "# User Requirements",
    goal ? `## Current Goal\n${compactText(goal, 1200)}` : "",
    listLines("Persistent Requirements", requirements, (item: any) => `#${item.messageId || item.id || ""} ${item.text || item}`, 24),
  ].filter(Boolean).join("\n\n");
  if (goal || requirements.length) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "user",
    slug: "user-requirements",
    name: "User requirements and acceptance constraints",
    description: "Hard user constraints, acceptance requirements, and the active group goal.",
    source: "auto:group-memory-json",
    updatedAt,
    body: userBody,
  }));

  const projectBody = [
    "# Project Collaboration Context",
    goal ? `## Goal\n${compactText(goal, 1200)}` : "",
    listLines("Decisions", decisions, (item: any) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 16),
    listLines("Next Actions", memory?.nextActions || [], (item: any) => item.action || item, 10),
    memory?.messageDigest ? `## Conversation Summary\n${compactText(memory.messageDigest, 3000)}` : "",
  ].filter(Boolean).join("\n\n");
  if (projectBody.trim()) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "project",
    slug: "project-context",
    name: "Project collaboration context",
    description: "Group goal, decisions, next actions, and compacted conversation state.",
    source: "auto:group-memory-json",
    updatedAt,
    body: projectBody,
  }));

  const feedbackBody = [
    "# Feedback And Failure Memory",
    listLines("Blocked Or Failed Work", blocked, (item: any) => `${item.project || item.agent || "agent"}: ${item.reason || item.summary || item.text || ""}`, 16),
    listLines("Worker Ledger Warnings", workerLedger.filter((item: any) => !/done|success|completed/i.test(String(item.status || item.receiptStatus || ""))), (item: any) => `${item.project || item.agent || "agent"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 16),
  ].filter(Boolean).join("\n\n");
  if (blocked.length || feedbackBody.includes("- ")) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "feedback",
    slug: "feedback-failures",
    name: "Feedback and failure memory",
    description: "Corrections, blockers, failed receipts, and patterns the agents should not repeat.",
    source: "auto:group-memory-json",
    updatedAt,
    body: feedbackBody,
  }));

  const referenceBody = [
    "# Reference Artifacts",
    listLines("Fact Anchors", facts, (item: any) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
    listLines("Files To Reinject", reinject.files || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    listLines("Skills Or Tools To Reinject", reinject.skills || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    listLines("Verification To Reinject", reinject.verification || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
  ].filter(Boolean).join("\n\n");
  if (facts.length || reinject?.hasCandidates) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "reference",
    slug: "reference-artifacts",
    name: "Reference artifacts and restored context",
    description: "Facts, files, skills, verification, and artifact pointers useful for future recall.",
    source: "auto:group-memory-json",
    updatedAt,
    body: referenceBody,
  }));

  const index = buildGroupTypedMemoryIndex(groupId);
  return { schema: "ccm-group-typed-memory-sync-v1", version: GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}


export function groupTypedMemoryManifestSelectionChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.decisionFile;
  delete payload.recallShapeTelemetry;
  delete payload.recallShapeTelemetryFile;
  delete payload.recallShapeTelemetryError;
  return checksum(JSON.stringify(payload), 64);
}


export function groupTypedMemoryManifestSelectorCalibrationChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  return checksum(JSON.stringify(payload), 64);
}


export function getGroupTypedMemoryManifestSelectorDecisionDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorDecisionDir(scopeId);
}


export function getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
}


export function getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
}


export function groupTypedMemoryManifestSelectorOutcomeChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.outcomeFile;
  return checksum(JSON.stringify(payload), 64);
}


export function verifyGroupTypedMemoryManifestSelectorOutcome(outcome: any, expectedScopeId = "", selection: any = null) {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId, selection);
}


export function recordGroupTypedMemoryManifestSelectorOutcome(scopeId: string, selection: any, input: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input);
}


export function groupTypedMemoryManifestSelectorConsumptionChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.consumptionFile;
  delete payload.valid;
  delete payload.idempotent;
  delete payload.trendContribution;
  delete payload.trendContributionError;
  return checksum(JSON.stringify(payload), 64);
}


export function readGroupTypedMemoryManifestSelectorChain(scopeId: string, requestId: string) {
  const decisionFile = path.join(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId), `${safeSegment(requestId)}.json`);
  const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
  const attachedFile = path.join(outcomeDir, `${safeSegment(requestId)}.attached.json`);
  const committedFile = path.join(outcomeDir, `${safeSegment(requestId)}.committed.json`);
  let selection: any = null;
  let attached: any = null;
  let committed: any = null;
  try { selection = JSON.parse(fs.readFileSync(decisionFile, "utf-8")); } catch {}
  try { attached = JSON.parse(fs.readFileSync(attachedFile, "utf-8")); } catch {}
  try { committed = JSON.parse(fs.readFileSync(committedFile, "utf-8")); } catch {}
  const selectionValid = verifyGroupTypedMemoryManifestSelection(selection, scopeId).valid === true;
  const attachedValid = selectionValid && verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeId, selection).valid === true && attached.stage === "attached";
  const committedValid = attachedValid
    && verifyGroupTypedMemoryManifestSelectorOutcome(committed, scopeId, selection).valid === true
    && committed.stage === "committed"
    && String(committed.attachedOutcomeChecksum || "") === String(attached.checksum || "")
    && String(committed.capsuleChecksum || "") === String(attached.capsuleChecksum || "");
  return {
    valid: committedValid,
    selection,
    attached,
    committed,
    files: { decisionFile, attachedFile, committedFile },
  };
}


export function verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption: any, expectedScopeId = "", committedOutcome: any = null) {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId, committedOutcome);
}


export function recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId: string, input: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input);
}


export function summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options);
}


export function verifyGroupTypedMemoryManifestSelectorCalibration(calibration: any, expectedScopeId = "", expectedQueryChecksum = "") {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId, expectedQueryChecksum);
}


export function buildGroupTypedMemoryManifestSelectorCalibration(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options);
}


export function groupTypedMemoryManifestSelectorAgeStats(candidates: any[], nowMs: number) {
  const ages = candidates.map((candidate: any) => {
    const mtimeMs = Number(candidate?.mtimeMs || 0);
    return mtimeMs > 0 ? Math.max(0, (nowMs - mtimeMs) / 86_400_000) : 0;
  });
  if (!ages.length) return { newest: -1, oldest: -1, average: -1 };
  return {
    newest: Number(Math.min(...ages).toFixed(6)),
    oldest: Number(Math.max(...ages).toFixed(6)),
    average: Number((ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(6)),
  };
}


export function recordGroupTypedMemoryManifestSelectorDecision(scopeId: string, decision: any) {
  const dir = path.resolve(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.resolve(dir, `${safeSegment(decision.requestId, `ms-${checksum(decision, 16)}`)}.json`);
  if (path.dirname(file).toLowerCase() !== dir.toLowerCase()) throw new Error("typed_memory_manifest_selector_decision_path_invalid");
  writeTextAtomicRaw(file, JSON.stringify(decision, null, 2));
  try {
    const files = fs.readdirSync(dir)
      .filter(name => name.toLowerCase().endsWith(".json"))
      .map(name => ({ name, file: path.resolve(dir, name), mtimeMs: fs.statSync(path.resolve(dir, name)).mtimeMs }))
      .filter(item => path.dirname(item.file).toLowerCase() === dir.toLowerCase())
      .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
    for (const item of files.slice(200)) {
      try { fs.unlinkSync(item.file); } catch {}
      const requestId = item.name.replace(/\.json$/i, "");
      const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
      for (const stage of ["attached", "committed"]) {
        try { fs.unlinkSync(path.join(outcomeDir, `${requestId}.${stage}.json`)); } catch {}
      }
      const consumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
      try {
        for (const name of fs.readdirSync(consumptionDir).filter(name => name.startsWith(`${requestId}.`) && name.endsWith(".json"))) {
          try { fs.unlinkSync(path.join(consumptionDir, name)); } catch {}
        }
      } catch {}
      try { fs.unlinkSync(path.join(getGroupTypedMemoryManifestSelectorShapeDir(scopeId), `${requestId}.json`)); } catch {}
    }
  } catch {}
  return file;
}


export function verifyGroupTypedMemoryManifestSelection(selection: any, expectedScopeId = "") {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId);
}


export function configureGroupTypedMemoryManifestSelector(executor: GroupTypedMemoryManifestSelectorExecutor | null) {
  return require("./group-memory-loading").configureGroupTypedMemoryManifestSelector(executor);
}


export function buildGroupTypedMemoryManifest(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryManifest(scopeId, query, options);
}


export function parseGroupTypedMemoryManifestSelectorOutput(value: any) {
  if (Array.isArray(value?.selected_memories)) return value.selected_memories;
  if (Array.isArray(value?.selectedMemories)) return value.selectedMemories;
  const raw = String(value?.output ?? value?.text ?? value?.content ?? value ?? "").trim();
  if (!raw) return [];
  const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [fenced, fenced.match(/\{[\s\S]*\}/)?.[0] || ""].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed?.selected_memories)) return parsed.selected_memories;
      if (Array.isArray(parsed?.selectedMemories)) return parsed.selectedMemories;
    } catch {}
  }
  throw new Error("manifest_selector_output_json_invalid");
}


export function finalizeGroupTypedMemoryManifestSelection(scopeId: string, input: any, options: any = {}) {
  const core = {
    schema: "ccm-group-typed-memory-manifest-selection-v1",
    version: GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
    scopeId,
    requestId: String(input.requestId || `ms_${checksum([scopeId, Date.now(), crypto.randomBytes(8).toString("hex")], 24)}`),
    status: String(input.status || "empty"),
    reason: String(input.reason || ""),
    selectorRan: input.selectorRan === true,
    shapeTelemetryExpected: input.shapeTelemetryExpected === true,
    queryChecksum: String(input.queryChecksum || ""),
    manifestChecksum: String(input.manifestChecksum || ""),
    candidateCount: Number(input.candidateCount || 0),
    selectedRelPaths: uniqueStrings((input.selectedRelPaths || []).map(String), GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION),
    unknownFilenames: uniqueStrings((input.unknownFilenames || []).map(String), 20),
    invalidFilenameCount: Number(input.invalidFilenameCount || 0),
    recentTools: uniqueStrings((input.recentTools || []).map(String), 20),
    filterCounts: input.filterCounts || {},
    calibration: input.calibration || null,
    calibrationChecksum: String(input.calibrationChecksum || input.calibration?.checksum || ""),
    calibrationHintCount: Number(input.calibrationHintCount ?? input.calibration?.hintCount ?? 0),
    calibrationEvidenceCount: Number(input.calibrationEvidenceCount ?? input.calibration?.evidenceCount ?? 0),
    selectorProject: String(input.selectorProject || ""),
    selectorAgentType: String(input.selectorAgentType || ""),
    selectorModel: String(input.selectorModel || ""),
    startedAt: String(input.startedAt || ""),
    completedAt: String(input.completedAt || now()),
  };
  const decision: any = { ...core, checksum: groupTypedMemoryManifestSelectionChecksum(core) };
  if (options.recordDecision !== false && isExactGroupTypedMemorySessionScope(scopeId)) {
    try { decision.decisionFile = recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision); }
    catch (error: any) { decision.recordError = compactText(error?.message || error, 240); }
  }
  return decision;
}


export async function selectGroupTypedMemoryManifest(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").selectGroupTypedMemoryManifest(scopeId, query, options);
}


export function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options);
}


export function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options);
}
