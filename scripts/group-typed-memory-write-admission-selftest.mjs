import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase238-write-admission-${suffix}`;
const scopeA = `${groupId}--gcs_${Date.now().toString(36)}_a`;
const scopeB = `${groupId}--gcs_${Date.now().toString(36)}_b`;
const legacyScope = `${groupId}--gcs_${Date.now().toString(36)}_legacy`;

function cleanup(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const parent = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${parent}${path.sep}`) && path.basename(dir).startsWith("phase238-write-admission-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function allFacts(ledger) {
  return ["user", "project", "feedback", "reference"].flatMap(category => Object.values(ledger.facts?.[category] || {}));
}

const messages = [
  {
    id: "admit-user-rule",
    role: "user",
    content: "必须长期记住 PHASE238_DURABLE_RULE：以后每次群聊子 Agent 派发都要保持会话隔离。",
  },
  {
    id: "reject-explicit-pr-list",
    role: "user",
    content: "必须记住本周 PR 列表和活动摘要：PR #41、PR #42、最近提交记录。",
  },
  {
    id: "reject-current-task",
    role: "user",
    content: "当前任务必须临时修改 src/current-task.ts，完成后即可结束。",
  },
  {
    id: "reject-assignment",
    role: "assistant",
    agent: "coordinator",
    dispatchPolicy: { action: "delegate", reason: "本轮分派给 api-agent" },
    assignments: [{ project: "api", task: "修改 src/activity.ts" }],
    content: "本轮正在分派任务并运行 npm run check。",
  },
  {
    id: "reject-completion",
    role: "assistant",
    agent: "api-agent",
    task_id: "phase238-task",
    content: "已完成 src/activity.ts，npm run check passed。Skill:typescript-audit",
    receipt: { status: "done", taskId: "phase238-task", summary: "完成活动流水", verification: ["npm run check passed"] },
  },
  {
    id: "reject-one-off-failure",
    role: "assistant",
    agent: "api-agent",
    task_id: "phase238-fail",
    content: "本轮执行失败：src/once.ts 编译异常，需要继续修复。",
    receipt: { status: "failed", taskId: "phase238-fail" },
  },
  {
    id: "admit-feedback",
    role: "user",
    content: "以后不要只保存失败纠正；这点非显然，因为只记失败会让 Agent 越来越保守。",
    memoryAdmission: {
      nonObvious: true,
      futureApplicable: true,
      why: "只保存失败纠正会让 Agent 越来越保守。",
      howToApply: "未来同时保留用户确认过的非显然成功做法。",
    },
  },
  {
    id: "admit-project-motivation",
    role: "assistant",
    agent: "coordinator",
    content: "未来所有记忆写入采用反直觉的先拒绝后准入策略，因为历史活动流水曾挤占子 Agent 上下文。",
    memoryAdmission: {
      nonObvious: true,
      futureApplicable: true,
      why: "历史活动流水曾挤占子 Agent 上下文。",
      howToApply: "未来写盘前先检查跨会话价值、原因和适用方式。",
    },
  },
  {
    id: "admit-external-reference",
    role: "assistant",
    agent: "coordinator",
    content: "Grafana https://grafana.internal/d/agent-memory 用于查看记忆注入延迟，排查上下文压力时从该仪表盘进入。",
  },
];

try {
  const first = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase238-write-admission-selftest" });
  const second = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase238-write-admission-repeat" });
  const ledger = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const facts = allFacts(ledger);
  const serializedFacts = JSON.stringify(facts);
  const docs = typed.scanGroupTypedMemoryDocuments(scopeA);
  const generatedDocs = docs.filter(row => String(row.source || "") === "auto:group-log-distillation");
  const generatedText = generatedDocs.map(row => fs.readFileSync(row.file, "utf8")).join("\n");

  typed.distillGroupMessagesToTypedMemory(scopeB, [{
    id: "scope-b-rule",
    role: "user",
    content: "必须长期记住 PHASE238_SCOPE_B_ONLY：以后每次只用于 B 会话。",
  }], {}, { reason: "phase238-scope-b" });
  const scopeBFacts = JSON.stringify(allFacts(typed.readGroupTypedMemoryDistillationLedger(scopeB)));

  const legacyDir = typed.getGroupTypedMemoryDir(legacyScope);
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(typed.getGroupTypedMemoryDistillationLedgerFile(legacyScope), JSON.stringify({
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: 1,
    groupId: legacyScope,
    facts: {
      user: {},
      project: {
        legacy_done: { id: "legacy_done", checksum: "legacy_done", category: "project", type: "completed_work", messageId: "legacy-done", text: "任务已经完成，保存本周活动摘要。" },
      },
      feedback: {},
      reference: {
        legacy_files: { id: "legacy_files", checksum: "legacy_files", category: "reference", type: "files", messageId: "legacy-files", text: "src/legacy.ts, npm run check" },
      },
    },
  }, null, 2));
  const staleProjectDoc = path.join(legacyDir, "distilled-log-project-context.md");
  const staleReferenceDoc = path.join(legacyDir, "distilled-log-reference-artifacts.md");
  fs.writeFileSync(staleProjectDoc, "STALE_ACTIVITY_PROJECT\n");
  fs.writeFileSync(staleReferenceDoc, "STALE_ACTIVITY_REFERENCE\n");
  const legacyResult = typed.distillGroupMessagesToTypedMemory(legacyScope, [], {}, { reason: "phase238-legacy-eviction" });
  const legacyLedger = typed.readGroupTypedMemoryDistillationLedger(legacyScope);

  const checks = {
    admissionSchemaPresent: ledger.admission?.schema === "ccm-group-typed-memory-write-admission-v1",
    extractedCandidatesExceedAdmitted: first.extractedCandidateCount > first.candidateCount && first.rejectedCandidateCount > 0,
    durableUserRuleAdmitted: serializedFacts.includes("PHASE238_DURABLE_RULE"),
    nonObviousFeedbackAdmitted: serializedFacts.includes("只保存失败纠正会让 Agent 越来越保守"),
    projectMotivationAdmitted: serializedFacts.includes("先拒绝后准入策略"),
    externalResourceWithPurposeAdmitted: serializedFacts.includes("grafana.internal/d/agent-memory"),
    explicitPrActivityRejected: !serializedFacts.includes("PR #41") && Number(ledger.admission?.reasonCounts?.activity_log_noise || 0) > 0,
    currentTaskStateRejected: !serializedFacts.includes("current-task.ts"),
    assignmentRejected: !serializedFacts.includes("本轮分派给 api-agent") && !serializedFacts.includes('"type":"assignment"'),
    completionRejected: !serializedFacts.includes("完成活动流水") && !serializedFacts.includes('"type":"completed_work"'),
    fileSkillVerificationRejected: !serializedFacts.includes('"type":"files"') && !serializedFacts.includes('"type":"skills"') && !serializedFacts.includes('"type":"verification"'),
    oneOffFailureRejected: !serializedFacts.includes("src/once.ts"),
    rejectionAuditDoesNotStoreBodies: (ledger.admission?.observations || []).every(row => row.text === undefined && row.content === undefined),
    whyAndHowRendered: generatedText.includes("**Why:**") && generatedText.includes("**How to apply:**"),
    fourTypedDocumentsWritten: ["user", "project", "feedback", "reference"].every(type => generatedDocs.some(row => row.type === type)),
    idempotentRepeat: second.skipped === true
      && second.reason === "no_new_messages_after_committed_cursor"
      && second.newFactCount === 0
      && second.updatedFactCount === 0,
    qualityAdmissionGatePasses: first.quality?.checks?.some(check => check.id === "long_term_write_admission" && check.pass === true),
    crossSessionBDoesNotSeeA: !scopeBFacts.includes("PHASE238_DURABLE_RULE") && scopeBFacts.includes("PHASE238_SCOPE_B_ONLY"),
    crossSessionADoesNotSeeB: !serializedFacts.includes("PHASE238_SCOPE_B_ONLY"),
    legacyNoiseFactsEvicted: allFacts(legacyLedger).length === 0 && legacyResult.evictedExistingFactCount === 2,
    staleGeneratedDocsRemoved: !fs.existsSync(staleProjectDoc) && !fs.existsSync(staleReferenceDoc) && legacyResult.removalCount === 2,
    legacyEvictionAuditedWithoutBody: legacyLedger.admission?.evictedExistingFactCount === 2
      && (legacyLedger.admission?.observations || []).every(row => row.text === undefined && row.content === undefined),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, second, admission: ledger.admission, legacyResult }, null, 2));
  console.log(JSON.stringify({
    pass: true,
    checks: Object.keys(checks).length,
    extracted: first.extractedCandidateCount,
    admitted: first.candidateCount,
    rejected: first.rejectedCandidateCount,
    rejectedReasons: ledger.admission?.reasonCounts,
    evictedLegacyFacts: legacyResult.evictedExistingFactCount,
    removedLegacyDocs: legacyResult.removalCount,
    sessionIsolation: true,
  }, null, 2));
} finally {
  cleanup(scopeA);
  cleanup(scopeB);
  cleanup(legacyScope);
}
