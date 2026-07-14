import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase240-positive-lifecycle-${suffix}`;
const scopeA = `${groupId}--gcs_${Date.now().toString(36)}_a`;
const scopeB = `${groupId}--gcs_${Date.now().toString(36)}_b`;
const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase240-source-"));
const sourceFile = path.join(projectRoot, "src", "policy.ts");
const outsideFile = fileURLToPath(import.meta.url);
fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
fs.writeFileSync(sourceFile, "export const compactPolicy = 'session-scoped';\n");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanup(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const parent = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${parent}${path.sep}`) && path.basename(dir).startsWith("phase240-positive-lifecycle-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function allFacts(ledger) {
  return ["user", "project", "feedback", "reference"].flatMap(category => Object.values(ledger.facts?.[category] || {}));
}

const durable = (why, howToApply) => ({ nonObvious: true, futureApplicable: true, why, howToApply });
const oldApproach = "以后记忆压缩统一共享群级摘要，这是非显然选择，因为共享摘要看起来能减少重复。";
const revokedApproach = "未来子 Agent 默认复用同一长期会话，这是反直觉方案，因为可以减少启动开销。";
const activeApproach = "以后压缩后先校验会话边界再重注入，这是非显然但必要的，因为可避免跨群聊污染。";
const replacementRule = "未来记忆压缩必须使用 groupId--gcs_* 会话作用域，因为共享群级摘要会造成跨会话污染。";

const messages = [
  {
    id: "old-approach",
    role: "assistant",
    content: oldApproach,
    memoryAdmission: durable("共享摘要表面上可以减少重复。", "所有群聊会话共享群级摘要。"),
  },
  {
    id: "confirm-old",
    role: "user",
    content: "对，这个做法是正确选择，以后继续这样做。",
    memoryConfirmation: {
      validated: true,
      targetMessageId: "old-approach",
      targetMessageChecksum: sha256(oldApproach),
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "supersede-old",
    role: "user",
    content: "撤回之前确认的做法，以后改为独立会话，因为共享摘要会造成跨会话污染。",
    memoryAdmission: durable("共享摘要会造成跨会话污染。", "每个群聊会话只使用自己的 groupId--gcs_* 记忆。"),
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-old",
      targetApproachMessageId: "old-approach",
      targetApproachChecksum: sha256(oldApproach),
      groupSessionScopeId: scopeA,
      reason: "共享摘要会造成跨会话污染。",
      replacementRule,
      howToApply: "每个群聊会话只使用自己的 groupId--gcs_* 记忆。",
      currentSourceEvidence: {
        evidenceType: "file_read",
        sourcePath: "src/policy.ts",
        sourceChecksum: sha256(fs.readFileSync(sourceFile)),
      },
    },
  },
  {
    id: "revoked-approach",
    role: "assistant",
    content: revokedApproach,
    memoryAdmission: durable("复用会话可以减少启动开销。", "所有子 Agent 任务复用同一会话。"),
  },
  {
    id: "confirm-revoked",
    role: "user",
    content: "yes exactly, keep doing that",
  },
  {
    id: "revoke-natural",
    role: "user",
    content: "撤回刚才确认的做法，因为子 Agent 每个任务都必须是新会话才能避免污染。",
  },
  {
    id: "active-approach",
    role: "assistant",
    content: activeApproach,
    memoryAdmission: durable("跨群聊污染很难在事后定位。", "每次重注入前校验 groupId--gcs_* 作用域。"),
  },
  {
    id: "confirm-active",
    role: "user",
    content: "对，就保持这个做法。",
  },
  {
    id: "reject-forged-checksum",
    role: "user",
    content: "撤回那个确认，因为需要测试伪造 checksum。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachMessageId: "active-approach",
      targetApproachChecksum: "0".repeat(64),
      groupSessionScopeId: scopeA,
      reason: "测试伪造 checksum。",
    },
  },
  {
    id: "reject-wrong-scope",
    role: "user",
    content: "撤回那个确认，因为需要测试错误 scope。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: `${groupId}--gcs_other`,
      reason: "测试错误 scope。",
    },
  },
  {
    id: "reject-source-proof",
    role: "user",
    content: "撤回那个确认，因为需要测试错误当前源证明。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: scopeA,
      reason: "测试错误当前源证明。",
      currentSourceEvidence: { evidenceType: "file_read", sourcePath: "src/policy.ts", sourceChecksum: "f".repeat(64) },
    },
  },
  {
    id: "reject-outside-source-proof",
    role: "user",
    content: "撤回那个确认，因为需要测试项目外当前源证明。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: scopeA,
      reason: "测试项目外当前源证明。",
      currentSourceEvidence: { evidenceType: "file_read", sourcePath: outsideFile, sourceChecksum: sha256(fs.readFileSync(outsideFile)) },
    },
  },
  {
    id: "reject-missing-reason",
    role: "user",
    content: "取消之前的确认。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: scopeA,
    },
  },
  {
    id: "reject-missing-target",
    role: "user",
    content: "撤回那个确认，因为目标不存在。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "missing-confirmation",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: scopeA,
      reason: "目标不存在。",
    },
  },
];

try {
  const first = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase240-lifecycle", projectRoot });
  const firstLedger = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const firstEvents = firstLedger.positiveFeedbackLifecycle?.events || [];
  const firstEventChecksums = firstEvents.map(row => row.eventChecksum).sort();
  const second = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase240-lifecycle-repeat", projectRoot });
  const ledger = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const facts = allFacts(ledger);
  const feedbackDoc = typed.scanGroupTypedMemoryDocuments(scopeA).find(row => row.relPath === "distilled-log-feedback-failures.md");
  const feedbackText = feedbackDoc ? fs.readFileSync(feedbackDoc.file, "utf8") : "";
  const lifecycle = ledger.positiveFeedbackLifecycle || {};
  const events = lifecycle.events || [];
  const reasons = new Set((lifecycle.observations || []).map(row => row.reason));

  typed.distillGroupMessagesToTypedMemory(scopeB, [{
    id: "cross-session-revoke",
    role: "user",
    content: "撤回那个确认，因为需要测试跨会话绑定。",
    memoryRevocation: {
      revoked: true,
      targetConfirmationMessageId: "confirm-active",
      targetApproachChecksum: sha256(activeApproach),
      groupSessionScopeId: scopeA,
      reason: "测试跨会话绑定。",
    },
  }], {}, { reason: "phase240-cross-session", projectRoot });
  const scopeBLedger = typed.readGroupTypedMemoryDistillationLedger(scopeB);

  const activeValidated = facts.filter(row => row.type === "validated_approach");
  const replacement = facts.find(row => row.type === "user_correction" && row.messageId === "supersede-old");
  const qualityGate = second.quality?.checks?.find(check => check.id === "positive_feedback_lifecycle");
  const checks = {
    supersessionEventPersisted: events.some(row => row.action === "superseded" && row.targetConfirmationMessageId === "confirm-old" && row.replacementFactId === replacement?.id),
    naturalRevocationPersisted: events.some(row => row.action === "revoked" && row.targetConfirmationMessageId === "confirm-revoked" && row.bindingMode === "adjacent_confirmation"),
    currentSourceProofRecomputed: events.some(row => row.evidenceTier === "system_current_source_file_proof"
      && row.currentSourceProof?.valid === true
      && row.currentSourceProof?.observedChecksum === sha256(fs.readFileSync(sourceFile))),
    revokedFactsRemovedFromActiveLedger: !facts.some(row => ["confirm-old", "confirm-revoked"].includes(row.messageId)),
    revokedBodiesRemovedFromMarkdown: !feedbackText.includes(oldApproach) && !feedbackText.includes(revokedApproach),
    replacementAndRemainingActiveRendered: feedbackText.includes(replacementRule) && feedbackText.includes(activeApproach),
    exactlyOneActiveValidatedApproach: activeValidated.length === 1 && activeValidated[0].messageId === "confirm-active",
    forgedChecksumRejected: reasons.has("positive_feedback_revocation_checksum_mismatch"),
    wrongScopeRejected: reasons.has("positive_feedback_revocation_scope_mismatch"),
    mismatchedSourceProofRejected: reasons.has("positive_feedback_revocation_source_proof_source_checksum_mismatch"),
    outsideProjectSourceProofRejected: reasons.has("positive_feedback_revocation_source_proof_source_outside_project"),
    missingReasonRejected: reasons.has("positive_feedback_revocation_reason_missing"),
    missingTargetRejected: reasons.has("positive_feedback_revocation_target_missing"),
    rejectionAuditHasNoBody: (lifecycle.observations || []).every(row => row.text === undefined && row.content === undefined && row.reasonText === undefined),
    lifecycleCountersAccurate: lifecycle.activeValidatedCount === 1
      && lifecycle.revokedCount === 1
      && lifecycle.supersededCount === 1
      && lifecycle.currentSourceProofCount === 1
      && lifecycle.eventCount === 2,
    immutableIdempotentEvents: second.positiveFeedbackLifecycle?.appliedThisRun === 0
      && JSON.stringify((ledger.positiveFeedbackLifecycle?.events || []).map(row => row.eventChecksum).sort()) === JSON.stringify(firstEventChecksums),
    fatalQualityGatePasses: qualityGate?.pass === true,
    crossSessionRevocationRejected: allFacts(scopeBLedger).length === 0
      && scopeBLedger.positiveFeedbackLifecycle?.eventCount === 0
      && scopeBLedger.positiveFeedbackLifecycle?.invalidBindingThisRun === 1,
    admissionExposesLifecycleWithoutBodies: ledger.admission?.positiveFeedbackActiveCount === 1
      && ledger.admission?.positiveFeedbackRevokedCount === 1
      && ledger.admission?.positiveFeedbackSupersededCount === 1
      && ledger.admission?.positiveFeedbackCurrentSourceProofCount === 1,
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, second, lifecycle, facts, scopeBLedger }, null, 2));
  console.log(JSON.stringify({
    pass: true,
    checks: Object.keys(checks).length,
    activeValidated: lifecycle.activeValidatedCount,
    revoked: lifecycle.revokedCount,
    superseded: lifecycle.supersededCount,
    sourceProofs: lifecycle.currentSourceProofCount,
    rejectedReasons: [...reasons].sort(),
    crossSessionRejected: true,
  }, null, 2));
} finally {
  cleanup(scopeA);
  cleanup(scopeB);
  fs.rmSync(projectRoot, { recursive: true, force: true });
}
