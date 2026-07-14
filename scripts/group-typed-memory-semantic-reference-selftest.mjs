import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const globalAgent = require(path.join(root, "ccm-package", "dist", "modules", "global", "global-agent.js"));

const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase235-semantic-${suffix}`;
const sessionA = `gcs_${Date.now().toString(36)}_semantic_a`;
const sessionB = `gcs_${Date.now().toString(36)}_semantic_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const sessionAOnly = `PHASE235_SESSION_A_ONLY_${suffix}`;
const sessionBOnly = `PHASE235_SESSION_B_ONLY_${suffix}`;

function write(scopeId, slug, type, name, description, body) {
  return index.upsertGroupTypedMemoryDocument(scopeId, {
    slug,
    type,
    name,
    description,
    source: "selftest:phase235-semantic-reference",
    body,
    updatedAt: new Date().toISOString(),
  });
}

function cleanupScope(scopeId) {
  const dir = path.resolve(index.getGroupTypedMemoryDir(scopeId));
  const allowedRoot = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${allowedRoot}${path.sep}`) && path.basename(dir).startsWith("phase235-semantic-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function cleanupSession(groupSessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId); } catch {}
  const messageFile = storage.getGroupChatSessionMessagesFile(groupId, groupSessionId);
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { fs.rmSync(file, { force: true }); } catch {}
  }
}

try {
  write(
    scopeA,
    "interface-retry-approval-rule",
    "user",
    "接口失败后的人工确认规则",
    "接口失败时的重试授权约束。",
    `# Retry policy\n接口调用失败后禁止自动重试，必须等待人工确认。\n${sessionAOnly}`,
  );
  write(
    scopeA,
    "interface-retry-approval-rule-paraphrase",
    "user",
    "接口异常处理约束",
    "接口错误后的人工确认规则。",
    "# Retry policy\n接口出错后不要再次尝试，需要先等待用户人工批准。",
  );
  write(
    scopeA,
    "opposite-auto-retry-rule",
    "user",
    "自动重试规则",
    "允许失败后直接重试。",
    "# Retry policy\n测试失败后可以直接自动重试接口三次，然后再通知人工。",
  );
  write(
    scopeA,
    "code-verification-sequence",
    "feedback",
    "代码变更验证顺序",
    "修改代码前先完成验证。",
    "# Verification\n所有代码变更必须先运行验证再修改，不得跳过当前检查。",
  );
  write(
    scopeA,
    "code-verification-sequence-paraphrase",
    "feedback",
    "代码修改检查顺序",
    "代码改动前的检查规则。",
    "# Verification\n修改代码之前先完成检查，再实施改动，不允许省略验证。",
  );
  write(
    scopeA,
    "generic-workflow",
    "project",
    "普通开发流程",
    "一般项目工作记录。",
    "# Workflow\n整理需求、更新文档、提交代码并发布版本。",
  );
  write(
    scopeB,
    "session-b-rule",
    "user",
    "会话 B 独立规则",
    "只属于会话 B。",
    `# Session B\n接口失败后允许重试一次。\n${sessionBOnly}`,
  );

  const retryQuery = "接口出错时不要再次尝试，先让人确认";
  const retryRecall = index.buildGroupTypedMemoryRecall(scopeA, retryQuery, { max: 10, disableLedger: true });
  const correct = retryRecall.recalled.find(row => row.relPath === "interface-retry-approval-rule.md")
    || retryRecall.recalled.find(row => row.relPath === "interface-retry-approval-rule-paraphrase.md");
  const oppositeDiagnostic = retryRecall.diagnostics.find(row => row.relPath === "opposite-auto-retry-rule.md");
  const generic = retryRecall.recalled.find(row => row.relPath === "generic-workflow.md");
  const retryParaphrases = retryRecall.recalled.filter(row => row.relPath.startsWith("interface-retry-approval-rule"));

  assert.ok(correct, "matching retry constraint should be recalled");
  assert.ok(oppositeDiagnostic, "opposite retry rule should be evaluated");
  assert.ok(oppositeDiagnostic.semanticReference.reasons.some(reason => reason.kind === "polarity_conflict_prohibit_vs_allow"), "opposite permission must receive a polarity conflict penalty");
  assert.ok(correct.score > oppositeDiagnostic.score, "prohibition with approval should rank above the opposite auto-retry rule");
  assert.equal(retryParaphrases.length, 1, "semantic paraphrases should be suppressed within one recall batch");
  assert.ok(Number(retryRecall.semanticReferenceScoring.semantic_duplicate_count || 0) >= 1, "deduplication must be observable");
  assert.ok(!generic || correct.score > generic.score, "generic workflow memory must not outrank the matching constraint");
  assert.match(correct.snippet, /接口|重试|人工|确认|批准/, "snippet should focus on the matching natural-language rule");

  const verifyRecall = index.buildGroupTypedMemoryRecall(scopeA, "修改代码前先完成验证，不得跳过检查", { max: 10, disableLedger: true });
  const verificationRows = verifyRecall.recalled.filter(row => row.relPath.startsWith("code-verification-sequence"));
  assert.equal(verificationRows.length, 1, "equivalent verification-order constraints should be deduplicated");
  assert.ok(verificationRows[0].semanticReference.matchedConcepts.includes("verify"), "verification concept should be normalized");
  assert.ok(verificationRows[0].semanticReference.matchedConcepts.includes("code_change"), "code-change concept should be normalized");

  const sessionARecall = index.buildGroupTypedMemoryRecall(scopeA, sessionBOnly, { max: 10, disableLedger: true });
  const sessionBRecall = index.buildGroupTypedMemoryRecall(scopeB, sessionAOnly, { max: 10, disableLedger: true });
  assert.ok(!JSON.stringify(sessionARecall).includes(sessionBOnly), "session B typed memory must not enter session A recall");
  assert.ok(!JSON.stringify(sessionBRecall).includes(sessionAOnly), "session A typed memory must not enter session B recall");

  const ignored = index.buildGroupTypedMemoryRecall(scopeA, "本轮忽略记忆，只处理当前任务", { max: 10 });
  assert.equal(ignored.ignored, true, "explicit ignore-memory request must remain authoritative");
  assert.deepEqual(ignored.recalled, [], "ignored recall must be empty");

  storage.saveGroupMessages(groupId, [{ id: "phase235-a", role: "user", content: sessionAOnly, group_session_id: sessionA }], sessionA);
  storage.saveGroupMessages(groupId, [{ id: "phase235-b", role: "user", content: sessionBOnly, group_session_id: sessionB }], sessionB);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionA),
    goal: "接口失败时禁止自动重试，等待人工确认。",
    persistentRequirements: [{ messageId: "phase235-a", text: `接口失败后禁止自动重试。${sessionAOnly}` }],
  }, sessionA);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionB),
    goal: "会话 B 独立任务。",
    persistentRequirements: [{ messageId: "phase235-b", text: sessionBOnly }],
  }, sessionB);

  const bundleA = memory.buildAgentMemoryContextBundle(groupId, "phase235-project", retryQuery, {
    groupSessionId: sessionA,
    includeGlobalClaudeMemory: false,
    disableLedger: true,
    maxTypedMemory: 10,
  });
  const bundleB = memory.buildAgentMemoryContextBundle(groupId, "phase235-project", "处理会话 B", {
    groupSessionId: sessionB,
    includeGlobalClaudeMemory: false,
    disableLedger: true,
    maxTypedMemory: 10,
  });
  assert.equal(bundleA.group_session_id, sessionA, "child bundle must bind the requested group session");
  assert.equal(bundleB.group_session_id, sessionB, "second child bundle must bind its own group session");
  assert.ok(JSON.stringify(bundleA).includes(sessionAOnly), "session A child should receive its owning session memory");
  assert.ok(!JSON.stringify(bundleA).includes(sessionBOnly), "session A child must not receive session B memory");
  assert.ok(JSON.stringify(bundleB).includes(sessionBOnly), "session B child should receive its owning session memory");
  assert.ok(!JSON.stringify(bundleB).includes(sessionAOnly), "session B child must not receive session A memory");

  const globalContext = globalAgent.buildAgenticContext("route current work", "phase235-global-session", {
    groups: [{ id: groupId, name: "Phase 235 test group", members: [{ project: "phase235-project", agent: "codex" }] }],
    recordDelivery: false,
  });
  const serializedGlobalContext = JSON.stringify(globalContext);
  assert.equal(globalContext.memory_context_boundary.group_session_context_included, false, "global Agent boundary must exclude group-session context");
  assert.ok(!serializedGlobalContext.includes(sessionAOnly), "global Agent must not receive session A memory body");
  assert.ok(!serializedGlobalContext.includes(sessionBOnly), "global Agent must not receive session B memory body");

  console.log(JSON.stringify({
    passed: 20,
    retryWinner: correct.relPath,
    retryWinnerScore: correct.score,
    oppositeScore: oppositeDiagnostic.score,
    semanticDuplicates: retryRecall.semanticReferenceScoring.semantic_duplicate_count,
    queryConcepts: retryRecall.semanticReferenceScoring.query_concepts,
    sessionIsolation: true,
    globalBoundary: true,
    ignoredMemory: true,
  }, null, 2));
} finally {
  cleanupScope(scopeA);
  cleanupScope(scopeB);
  cleanupScope(groupId);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
}
