import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const groupId = `memory-center-session-${process.pid}-${Date.now().toString(36)}`;
let sessionId = "";
let sessionB = "";
let scopeId = "";
let scopeBId = "";
let typedScopeId = "";
let typedScopeBId = "";
let memoryFile = "";
let memoryFileB = "";
let messageFile = "";
let messageFileB = "";
let sessionManifestDir = "";

try {
  sessionId = storage.createGroupChatSession(groupId, "Phase 239 session A").id;
  sessionB = storage.createGroupChatSession(groupId, "Phase 239 session B").id;
  storage.selectGroupChatSession(groupId, sessionId);
  scopeId = `${groupId}::${sessionId}`;
  scopeBId = `${groupId}::${sessionB}`;
  typedScopeId = `${groupId}--${sessionId}`;
  typedScopeBId = `${groupId}--${sessionB}`;
  memoryFile = memory.getGroupMemoryFile(groupId, sessionId);
  memoryFileB = memory.getGroupMemoryFile(groupId, sessionB);
  messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  messageFileB = storage.getGroupChatSessionMessagesFile(groupId, sessionB);
  sessionManifestDir = path.dirname(messageFile);
  fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
  fs.writeFileSync(memoryFile, JSON.stringify({
    groupId,
    groupSessionId: sessionId,
    goal: "接口出错时不要再次尝试，先让人确认",
    persistentRequirements: [{ id: "phase223-requirement", messageId: "phase223-message", text: "每个群聊会话必须独立显示记忆" }],
    compaction: { health: "healthy", preCompactTokenCount: 1200, postCompactTokenCount: 600 },
  }, null, 2), "utf-8");
  storage.saveGroupMessages(groupId, [{
    id: "phase223-message",
    role: "user",
    content: "每个群聊会话必须独立显示记忆",
    group_session_id: sessionId,
  }], sessionId);
  fs.mkdirSync(path.dirname(memoryFileB), { recursive: true });
  fs.writeFileSync(memoryFileB, JSON.stringify({
    groupId,
    groupSessionId: sessionB,
    goal: "会话 B 只处理独立任务",
    persistentRequirements: [{ id: "phase236-b", messageId: "phase236-b-message", text: "会话 B 不继承会话 A 的记忆反馈" }],
    compaction: { health: "healthy", preCompactTokenCount: 800, postCompactTokenCount: 400 },
  }, null, 2), "utf-8");
  storage.saveGroupMessages(groupId, [{
    id: "phase236-b-message",
    role: "user",
    content: "会话 B 不继承会话 A 的记忆反馈",
    group_session_id: sessionB,
  }], sessionB);

  typed.upsertGroupTypedMemoryDocument(typedScopeId, {
    type: "user",
    slug: "retry-approval-rule",
    name: "接口失败人工确认规则",
    description: "仅属于会话 A 的类型化记忆。",
    source: "selftest:memory-center-session-scope",
    body: "# Retry policy\n接口失败后禁止自动重试，必须等待人工确认。PHASE236_PRIVATE_BODY",
  });
  typed.upsertGroupTypedMemoryDocument(typedScopeBId, {
    type: "project",
    slug: "session-b-only",
    name: "会话 B 独立规则",
    description: "仅属于会话 B。",
    source: "selftest:memory-center-session-scope",
    body: "# Session B\n只处理会话 B 的当前任务。",
  });
  const lifecycleApproach = "以后接口失败自动重试三次，这是非显然做法，因为可以减少人工介入。";
  typed.distillGroupMessagesToTypedMemory(typedScopeId, [
    {
      id: "phase240-center-approach",
      role: "assistant",
      content: lifecycleApproach,
      memoryAdmission: { nonObvious: true, futureApplicable: true, why: "可以减少人工介入。", howToApply: "以后接口失败时自动重试。" },
    },
    {
      id: "phase240-center-confirm",
      role: "user",
      content: "对，就保持这个做法。",
      memoryConfirmation: {
        validated: true,
        targetMessageId: "phase240-center-approach",
        targetMessageChecksum: crypto.createHash("sha256").update(lifecycleApproach).digest("hex"),
        groupSessionScopeId: typedScopeId,
      },
    },
    {
      id: "phase240-center-revoke",
      role: "user",
      content: "撤回刚才的确认，因为接口重试必须先让人确认。",
      memoryRevocation: {
        revoked: true,
        targetConfirmationMessageId: "phase240-center-confirm",
        targetApproachMessageId: "phase240-center-approach",
        targetApproachChecksum: crypto.createHash("sha256").update(lifecycleApproach).digest("hex"),
        groupSessionScopeId: typedScopeId,
        reason: "接口重试必须先让人确认。",
      },
    },
  ], {}, { reason: "phase240-memory-center-session-lifecycle" });
  const typedDoc = typed.buildGroupTypedMemoryIndex(typedScopeId).docs.find(item => item.relPath === "retry-approval-rule.md");
  typed.recordGroupTypedMemoryConsumptionLedger(typedScopeId, {
    targetProject: "memory-center-phase236",
    rows: [{
      rel_path: typedDoc.relPath,
      document_checksum: typedDoc.checksum,
      usage_state: "used",
      evidence_valid: true,
      task_agent_session_id: "tas_memory_center_phase236",
      memory_context_snapshot_id: "tams_memory_center_phase236",
      memory_context_snapshot_checksum: "snapshot-memory-center-phase236",
      delivery_receipt_checksum: "delivery-memory-center-phase236",
      receipt_evidence_checksum: "receipt-memory-center-phase236",
      query_concepts: ["retry", "interface", "human_approval"],
      query_polarities: ["prohibit"],
      query_relations: ["approval_before_retry"],
      generated_at: new Date().toISOString(),
    }],
  });

  const scopes = center.listMemoryCenterGroupSessionScopes();
  const row = scopes.find(item => item.id === scopeId);
  const evidence = center.findMemoryEvidence({ scope: "group", groupId, sessionId, messageId: "phase223-message" });
  const detailA = center.getMemoryCenterScope("group", scopeId);
  const detailB = center.getMemoryCenterScope("group", scopeBId);
  const consumptionA = detailA.postCompactUsage?.typedMemory?.consumptionLedger || {};
  const consumptionB = detailB.postCompactUsage?.typedMemory?.consumptionLedger || {};
  const admissionA = detailA.postCompactUsage?.typedMemory?.writeAdmission || {};
  const admissionB = detailB.postCompactUsage?.typedMemory?.writeAdmission || {};
  const legacyTypedDir = typed.getGroupTypedMemoryDir(groupId);
  fs.rmSync(legacyTypedDir, { recursive: true, force: true });
  const redirectedConsumption = typed.readGroupTypedMemoryConsumptionLedger(groupId);
  const timelineQuality = center.buildMemoryQualityReport({ checkIds: ["compact_boundary_timeline"], cacheMaxAgeMs: 0 });
  const serializedConsumptionA = JSON.stringify({
    ledger: consumptionA,
    scoring: detailA.postCompactUsage?.typedMemory?.typedMemoryConsumptionScoring,
    rows: detailA.postCompactUsage?.typedMemory?.consumptionBoostedDocs,
  });
  const checks = {
    sessionMemoryIsListedAsIndependentScope: !!row,
    scopeCarriesGroupAndSessionIdentity: row?.groupId === groupId && row?.groupSessionId === sessionId,
    scopeLabelIncludesSession: String(row?.label || "").includes("Phase 239 session A"),
    sessionEvidenceUsesSessionTranscript: evidence.length === 1 && evidence[0].sessionId === sessionId && evidence[0].groupId === groupId,
    legacyDefaultScopeWasNotCreated: !scopes.some(item => item.id === groupId),
    sessionAConsumptionIsVisible: consumptionA.validEntryCount === 1 && consumptionA.totals?.used === 1,
    sessionAConsumptionLedgerIsTrusted: consumptionA.checksumValid === true && consumptionA.invalidEntryCount === 0,
    sessionBDoesNotSeeSessionAConsumption: consumptionB.validEntryCount === 0 && consumptionB.totals?.used === 0,
    consumptionDiagnosticsDoNotExposeBodies: !serializedConsumptionA.includes("PHASE236_PRIVATE_BODY") && !serializedConsumptionA.includes("body"),
    qualityTimelineUsesActiveSessionScope: timelineQuality.targeted === true
      && timelineQuality.checks?.some(check => check.id === "compact_boundary_timeline")
      && !fs.existsSync(legacyTypedDir),
    bareGroupConsumptionIsRedirectedToActiveSession: redirectedConsumption.group_id === typedScopeId
      && redirectedConsumption.session_scope_redirected === true
      && !fs.existsSync(legacyTypedDir),
    lifecycleCountersUseSessionAScope: admissionA.positiveFeedbackActiveCount === 0
      && admissionA.positiveFeedbackRevokedCount === 1
      && admissionA.positiveFeedbackSupersededCount === 0,
    sessionBDoesNotSeeSessionALifecycle: Number(admissionB.positiveFeedbackRevokedCount || 0) === 0
      && Number(admissionB.positiveFeedbackSupersededCount || 0) === 0,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, row, evidence }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks }, null, 2)}\n`);
} finally {
  for (const id of [sessionId, sessionB].filter(Boolean)) {
    for (const file of [
      lifecycle.getGroupSessionLifecycleHeadFile(groupId, id),
      lifecycle.getGroupSessionLifecycleJournalFile(groupId, id),
      lifecycle.getGroupSessionLifecycleCommitFile(groupId, id),
      lifecycle.getGroupSessionLifecycleCommittedFile(groupId, id),
    ]) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
  for (const file of [memoryFile, `${memoryFile}.bak`, memoryFileB, `${memoryFileB}.bak`, messageFile, `${messageFile}.bak`, messageFileB, `${messageFileB}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
  for (const dir of [path.dirname(memoryFile), path.dirname(messageFile)]) {
    try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
  }
  for (const scope of [typedScopeId, typedScopeBId]) {
    const dir = path.resolve(typed.getGroupTypedMemoryDir(scope));
    const typedRoot = path.resolve(path.dirname(dir));
    try {
      if (dir.startsWith(`${typedRoot}${path.sep}`) && path.basename(dir).startsWith(groupId)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  try {
    if (sessionManifestDir && path.basename(sessionManifestDir) === groupId) fs.rmSync(sessionManifestDir, { recursive: true, force: true });
  } catch {}
  try {
    const legacyTypedDir = path.resolve(typed.getGroupTypedMemoryDir(groupId));
    if (path.basename(legacyTypedDir) === groupId) fs.rmSync(legacyTypedDir, { recursive: true, force: true });
  } catch {}
}
