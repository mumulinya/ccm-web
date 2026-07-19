// Behavior-freeze split from group-compaction-engine.ts (part 3/3).
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadSkills, SKILL_PACKAGES_DIR } from "../../core/db";
import { isCcmInternalSkillName } from "../../skills/internal-skill-catalog";
import { buildContextBudget, compactPreserveEdges, estimateTextTokens, getAutoCompactThreshold, microCompactText } from "../../system/context-budget";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import { inspectGroupSessionMemoryTemplateState } from "./group-session-memory-customization";
import { recordGroupPromptCacheState, recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";

import {
  ConversationSummary,
  FactAnchor,
  GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS,
  GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS,
  GROUP_COMPACT_MAX_FAILURES,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_COMPACT_MODEL_RETRY_MS,
  GROUP_MEMORY_COMPACTION_VERSION,
  GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT,
  buildGroupCompactLineage,
  buildGroupCompactTransactionReceipt,
  buildGroupCompactionModelUsageReceipt,
  buildGroupPostCompactMessageOrderReceipt,
} from "./group-compaction-receipts";
import {
  exactHookLedgerSessionId,
  readGroupMemoryCompactionHookLedger,
  runGroupMemoryCompactionHooks,
} from "./group-compaction-hooks";
import {
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupCompactionSummaryInputProjection,
  buildGroupMicroCompactPlan,
  buildGroupPartialCompactSidecarSegment,
  buildGroupPostCompactCleanupAudit,
  buildGroupPostCompactRecoveryAudit,
  buildGroupPostCompactTaskStatusProjection,
  buildGroupPreservedSegment,
  buildGroupSessionMemoryCompactSelectionReceipt,
  buildGroupTruePostCompactPayloadBudget,
  buildPartialSidecarOnlyMemory,
  buildPostCompactReinjectionPlan,
  calculateGroupMessagesToKeepIndex,
  compactText,
  createEmptyConversationSummary,
  estimateGroupMessageTokens,
  estimateGroupTextTokens,
  evaluateGroupMemorySummaryQuality,
  extractFactAnchors,
  extractPersistentRequirements,
  mergeFactAnchors,
  mergeGroupPartialCompactSegments,
  mergePersistentRequirements,
  mergeSafeConversationSummary,
  messageContent,
  messageIdentity,
  normalizeSummary,
  normalizedSearchTokens,
  renderConversationSummary,
  selectGroupSessionMemoryForCompact,
  validateSummaryPreservesFallback,
} from "./group-compaction-projections";
import {
  buildGroupCompactStrategyDecision,
  buildGroupPtlEmergencyPlan,
  buildGroupPtlRecoveryPlan,
  calculateGroupCompactWarningState,
  getGroupAutoCompactThreshold,
  resolveGroupModelContextCapacity,
  resolvePartialCompactWindow,
} from "./group-compaction-strategy";

import {
  compactGroupConversationMemory,
} from "./group-compaction-engine-part-02";

export async function runGroupMemoryPreservedSegmentSelfTest() {
  const messages = [
    ...Array.from({ length: 24 }, (_, index) => ({
      id: `ps-old-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "coordinator" : undefined,
      agent: index % 2 === 1 ? "worker" : undefined,
      content: `preserved segment old message ${index} ${"上下文".repeat(40)}`,
    })),
    {
      id: "ps-task-user",
      role: "user",
      target: "coordinator",
      task_id: "preserved-task",
      content: "必须保留 PRESERVED_SEGMENT_SENTINEL，给 api 子 Agent 继续处理 src/preserved.ts。",
    },
    {
      id: "ps-task-result",
      role: "assistant",
      agent: "api",
      receipt: { status: "failed", taskId: "preserved-task", summary: "PRESERVED_SEGMENT_SENTINEL 仍需继续修复" },
      content: "api 回执：PRESERVED_SEGMENT_SENTINEL 失败，src/preserved.ts 还需要继续处理。",
    },
  ];
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 1, minTokens: 1, maxTokens: 5000 });
  const segment = buildGroupPreservedSegment(messages, keepIndex, {
    minMessages: 1,
    minTokens: 1,
    maxTokens: 5000,
    summaryChecksum: "preserved-segment-selftest",
    transcriptPath: "preserved-segment-raw.json",
    now: "2026-07-07T00:00:00.000Z",
  });
  const result: any = await compactGroupConversationMemory({
    groupId: "preserved-segment-self-test",
    groupSessionId: "gcs_preserved_segment_selftest",
    messages,
    memory: { goal: "preserved segment selftest", compaction: {} },
    transcriptPath: "preserved-segment-raw.json",
    force: true,
    config: { minKeepMessages: 1, minKeepTokens: 1, maxKeepTokens: 5000 },
  });
  const boundarySegment = result.boundary?.preservedSegment || {};
  const checks = {
    keepIndexExpandedToTaskStart: keepIndex === 24 && messages[keepIndex]?.id === "ps-task-user",
    taskTransactionProtected: segment.protectedTaskTransaction === true
      && segment.firstPreservedMessageId === "ps-task-user"
      && segment.lastPreservedMessageId === "ps-task-result",
    segmentRecordsBudget: segment.preservedTokenEstimate > 0
      && segment.minTextBlockMessages === 1
      && segment.maxTokens === 5000,
    compactBoundaryCarriesSegment: result.compacted === true
      && boundarySegment.schema === "ccm-group-preserved-segment-v1"
      && boundarySegment.firstPreservedMessageId === "ps-task-user"
      && boundarySegment.lastPreservedMessageId === "ps-task-result",
    postCompactRestoreCarriesSegment: result.boundary?.post_compact_restore?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    memoryCarriesSegment: result.memory?.compaction?.preservedSegment?.schema === "ccm-group-preserved-segment-v1"
      && result.memory?.messageCompression?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    rawTranscriptUntouched: messages[24].content.includes("PRESERVED_SEGMENT_SENTINEL") && messages.length === 26,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, segment, boundarySegment };
}

export async function runGroupMemoryPostCompactRecoveryAuditSelfTest() {
  const messages = Array.from({ length: 46 }, (_, index) => ({
    id: `audit-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "audit-worker" : undefined,
    task_id: index >= 10 && index <= 18 ? "audit-task" : undefined,
    content: index === 0
      ? "必须保留 RECOVERY_AUDIT_SENTINEL_20260707，压缩后子 Agent 仍要拿到恢复审计。"
      : index === 11
        ? "audit-worker 修改 src/recovery-audit.ts，执行 npm run check passed。"
        : `恢复审计测试消息 ${index} src/audit-${index}.ts ${"上下文".repeat(160)}`,
    receipt: index === 11 ? {
      status: "done",
      taskId: "audit-task",
      summary: "完成 recovery audit",
      filesChanged: ["src/recovery-audit.ts"],
      verification: ["npm run check passed"],
    } : undefined,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "post-compact-recovery-audit-self-test",
    groupSessionId: "gcs_post_compact_recovery_selftest",
    messages,
    memory: { goal: "压缩后恢复审计自测" },
    config: { memoryCompactionUseModel: false, minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 3200 },
    transcriptPath: "post-compact-recovery-audit-raw.json",
    force: true,
  });
  const audit = result.memory?.compaction?.postCompactRecoveryAudit || {};
  const boundaryAudit = result.boundary?.post_compact_restore?.recoveryAudit || {};
  const messageCompressionAudit = result.memory?.messageCompression?.postCompactRecoveryAudit || {};
  const checkById = new Map<string, any>((audit.checks || []).map((check: any) => [check.id, check]));
  const candidateCounts = audit.candidateCounts || {};
  const candidateTotal = ["files", "skills", "verification", "blockers"].reduce((sum, key) => sum + Number(candidateCounts[key] || 0), 0);
  const checks = {
    compacted: result.compacted === true,
    auditRecordedInCompaction: audit.schema === "ccm-post-compact-recovery-audit-v1" && audit.status === "pass" && audit.pass === true,
    auditRecordedInBoundary: boundaryAudit.schema === "ccm-post-compact-recovery-audit-v1" && boundaryAudit.summaryChecksum === audit.summaryChecksum,
    auditRecordedInMessageCompression: messageCompressionAudit.schema === "ccm-post-compact-recovery-audit-v1",
    boundaryRangeResolvable: checkById.get("boundary_range_resolvable")?.pass === true
      && checkById.get("compact_window_matches_keep_index")?.pass === true,
    rawTranscriptRecoverable: checkById.get("raw_transcript_path_recorded")?.pass === true
      && audit.transcriptPath === "post-compact-recovery-audit-raw.json",
    preservedAndReinjectReady: checkById.get("preserved_segment_recorded")?.pass === true
      && checkById.get("post_compact_reinject_plan_recorded")?.pass === true
      && candidateTotal > 0,
    warningSuppressedAfterCompact: checkById.get("post_compact_warning_suppressed")?.pass === true,
    childAgentActionSafe: audit.action === "safe_to_inject_child_agent_memory_packet"
      && String(audit.cleanupPolicy?.childAgentIsolation || "").includes("child_agent"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return { pass: Object.values(checks).every(Boolean), checks, audit };
}

export function runGroupMemoryCompactWarningSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryCompactWarningSelfTest();
}

export function runGroupMemoryCompactionSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryCompactionSelfTest();
}

export function runGroupMemoryModelCapacitySelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryModelCapacitySelfTest();
}

export function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupApiMicrocompactNativeApplyPlanSelfTest();
}

export function runGroupMemoryQualityGateSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryQualityGateSelfTest();
}

export function runGroupMemoryMicroCompactSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryMicroCompactSelfTest();
}

export function runGroupMemoryTimeBasedMicroCompactSelfTest() {
  return require("./group-memory-compaction-self-tests").runGroupMemoryTimeBasedMicroCompactSelfTest();
}
