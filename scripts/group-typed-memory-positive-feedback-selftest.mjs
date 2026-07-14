import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase239-positive-feedback-${suffix}`;
const scopeA = `${groupId}--gcs_${Date.now().toString(36)}_a`;
const scopeB = `${groupId}--gcs_${Date.now().toString(36)}_b`;
const legacyScope = `${groupId}--gcs_${Date.now().toString(36)}_legacy`;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanup(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const parent = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${parent}${path.sep}`) && path.basename(dir).startsWith("phase239-positive-feedback-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function allFacts(ledger) {
  return ["user", "project", "feedback", "reference"].flatMap(category => Object.values(ledger.facts?.[category] || {}));
}

const explicitApproach = "以后类似大规模重构保留单个 bundled PR，这是非显然选择，因为拆成多个 PR 只会制造无意义 churn。";
const adjacentApproach = "未来群聊记忆评审保持先给出窄范围判断再扩展，这是反直觉但更稳定，因为一次铺开会掩盖错误前提。";
const durableAdmission = (why, howToApply) => ({
  nonObvious: true,
  futureApplicable: true,
  why,
  howToApply,
});

const messages = [
  {
    id: "approach-explicit",
    role: "assistant",
    agent: "coordinator",
    content: explicitApproach,
    memoryAdmission: durableAdmission(
      "拆成多个 PR 会制造无意义 churn，并让同一重构难以整体审查。",
      "未来同类大规模重构默认使用一个可整体审查的 bundled PR。",
    ),
  },
  {
    id: "confirm-explicit",
    role: "user",
    content: "对，这个做法是正确选择，以后继续这样做。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "approach-explicit",
      targetMessageChecksum: sha256(explicitApproach),
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "approach-adjacent",
    role: "assistant",
    agent: "coordinator",
    content: adjacentApproach,
  },
  {
    id: "confirm-adjacent",
    role: "user",
    content: "yes exactly, keep doing that",
  },
  {
    id: "ordinary-approach",
    role: "assistant",
    agent: "coordinator",
    content: "我把局部变量按字母顺序排列了。",
  },
  {
    id: "reject-ordinary-praise",
    role: "user",
    content: "对，这个做法很好。",
  },
  {
    id: "reject-forged-checksum",
    role: "user",
    content: "对，这个做法是正确选择。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "approach-explicit",
      targetMessageChecksum: "0".repeat(64),
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "reject-wrong-scope",
    role: "user",
    content: "对，就保持这个做法。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "approach-explicit",
      targetMessageChecksum: sha256(explicitApproach),
      groupSessionScopeId: `${groupId}--gcs_other`,
    },
  },
  {
    id: "reject-missing-target",
    role: "user",
    content: "完全正确，以后继续这个做法。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "another-session-message",
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "activity-approach",
    role: "assistant",
    agent: "coordinator",
    content: "以后每周保存 PR list 和 activity summary，因为要回顾最近 changes。",
    memoryAdmission: durableAdmission(
      "每周复盘。",
      "把每周 PR list 写入长期记忆。",
    ),
  },
  {
    id: "reject-activity-confirmation",
    role: "user",
    content: "对，就保持这个做法。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "activity-approach",
      targetMessageChecksum: sha256("以后每周保存 PR list 和 activity summary，因为要回顾最近 changes。"),
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "generic-thanks",
    role: "user",
    content: "谢谢，做得不错。",
  },
];

try {
  const first = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase239-positive-feedback" });
  const second = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase239-positive-feedback-repeat" });
  const ledger = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const facts = allFacts(ledger);
  const validatedFacts = facts.filter(row => row.type === "validated_approach");
  const feedbackDoc = typed.scanGroupTypedMemoryDocuments(scopeA).find(row => row.relPath === "distilled-log-feedback-failures.md");
  const feedbackText = feedbackDoc ? fs.readFileSync(feedbackDoc.file, "utf8") : "";
  const observationReasons = new Set((ledger.admission?.observations || []).map(row => row.reason));

  typed.distillGroupMessagesToTypedMemory(scopeB, [{
    id: "cross-session-confirmation",
    role: "user",
    content: "对，这个做法是正确选择，以后继续这样做。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "approach-explicit",
      targetMessageChecksum: sha256(explicitApproach),
      groupSessionScopeId: scopeA,
    },
  }], {}, { reason: "phase239-cross-session-rejection" });
  const scopeBLedger = typed.readGroupTypedMemoryDistillationLedger(scopeB);

  const legacyDir = typed.getGroupTypedMemoryDir(legacyScope);
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(typed.getGroupTypedMemoryDistillationLedgerFile(legacyScope), JSON.stringify({
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: 1,
    groupId: legacyScope,
    facts: {
      user: {},
      project: {},
      feedback: {
        unbound_success: {
          id: "unbound_success",
          checksum: "unbound_success",
          category: "feedback",
          type: "validated_approach",
          messageId: "legacy-confirmation",
          text: "以后保持一个未经绑定的成功做法，因为它看起来不错。",
          memoryAdmission: durableAdmission("它看起来不错。", "以后继续使用。"),
        },
      },
      reference: {},
    },
  }, null, 2));
  const staleFeedbackDoc = path.join(legacyDir, "distilled-log-feedback-failures.md");
  fs.writeFileSync(staleFeedbackDoc, "STALE_UNBOUND_POSITIVE_FEEDBACK\n");
  const legacyResult = typed.distillGroupMessagesToTypedMemory(legacyScope, [], {}, { reason: "phase239-legacy-unbound-eviction" });
  const legacyLedger = typed.readGroupTypedMemoryDistillationLedger(legacyScope);

  const checks = {
    explicitBoundConfirmationAdmitted: validatedFacts.some(row => row.messageId === "confirm-explicit" && row.confirmation?.bindingMode === "explicit_message_id"),
    adjacentConfirmationAdmitted: validatedFacts.some(row => row.messageId === "confirm-adjacent" && row.confirmation?.bindingMode === "adjacent_assistant"),
    naturalTargetWithoutStructuredAdmissionAdmitted: validatedFacts.some(row => row.messageId === "confirm-adjacent"
      && row.memoryAdmission?.futureApplicable === true
      && row.memoryAdmission?.nonObvious === true
      && row.admission?.why
      && row.admission?.howToApply),
    exactTwoPositiveFacts: validatedFacts.length === 2,
    fullChecksumRecomputed: validatedFacts.every(row => row.confirmation?.targetMessageChecksum?.length === 64 && row.confirmation?.checksumMatches === true),
    sameScopeBindingVerified: validatedFacts.every(row => row.confirmation?.scopeMatches === true && row.confirmation?.targetSourceRole === "assistant"),
    durableNonObviousWhyHowRequired: validatedFacts.every(row => row.confirmation?.targetEligible === true && row.admission?.why && row.admission?.howToApply),
    ordinaryPraiseRejected: observationReasons.has("positive_confirmation_target_not_durable_non_obvious_or_explained"),
    forgedChecksumRejected: observationReasons.has("positive_confirmation_checksum_mismatch"),
    wrongScopeRejected: observationReasons.has("positive_confirmation_scope_mismatch"),
    missingTargetRejected: observationReasons.has("positive_confirmation_target_missing_or_not_assistant"),
    activitySummaryStillRejected: observationReasons.has("activity_log_noise") && !JSON.stringify(validatedFacts).includes("activity summary"),
    genericThanksNotCandidate: Number(ledger.admission?.positiveConfirmationCandidateCount || 0) === 7,
    confirmationCountersAccurate: ledger.admission?.positiveConfirmationAdmittedCount === 2
      && ledger.admission?.positiveConfirmationRejectedCount === 5
      && ledger.admission?.positiveConfirmationInvalidBindingCount === 4,
    rejectionAuditHasNoBody: (ledger.admission?.observations || []).every(row => row.text === undefined && row.content === undefined),
    renderedBindingWhyHow: feedbackText.includes("**Validated approach:** #approach-explicit")
      && feedbackText.includes("**Why:**")
      && feedbackText.includes("**How to apply:**"),
    qualityBindingGatePasses: first.quality?.checks?.some(check => check.id === "positive_feedback_binding" && check.pass === true),
    idempotentRepeat: second.skipped === true
      && second.reason === "no_new_messages_after_committed_cursor"
      && second.newFactCount === 0
      && second.updatedFactCount === 0,
    crossSessionTargetRejected: allFacts(scopeBLedger).length === 0
      && scopeBLedger.admission?.positiveConfirmationRejectedCount === 1,
    legacyUnboundFactEvicted: allFacts(legacyLedger).length === 0 && legacyResult.evictedExistingFactCount === 1,
    staleFeedbackDocRemoved: !fs.existsSync(staleFeedbackDoc) && legacyResult.removalCount === 1,
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, admission: ledger.admission, facts: validatedFacts, legacyResult }, null, 2));
  console.log(JSON.stringify({
    pass: true,
    checks: Object.keys(checks).length,
    positiveCandidates: ledger.admission?.positiveConfirmationCandidateCount,
    admitted: ledger.admission?.positiveConfirmationAdmittedCount,
    rejected: ledger.admission?.positiveConfirmationRejectedCount,
    invalidBindings: ledger.admission?.positiveConfirmationInvalidBindingCount,
    rejectionReasons: [...observationReasons].sort(),
    legacyEvicted: legacyResult.evictedExistingFactCount,
    crossSessionRejected: true,
  }, null, 2));
} finally {
  cleanup(scopeA);
  cleanup(scopeB);
  cleanup(legacyScope);
}
