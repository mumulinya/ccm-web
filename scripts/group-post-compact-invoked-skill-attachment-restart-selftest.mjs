import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE323_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
    handoff: require(dist("agents", "worker-handoff.js")),
  };
}

function invocation(id, groupSessionId, name, timestamp, contentHash = "") {
  return {
    id,
    group_session_id: groupSessionId,
    role: "assistant",
    agent: "project-agent",
    timestamp,
    content: `completed ${name}`,
    receipt: { invokedSkills: [{ name, contentHash, invokedAt: timestamp }] },
  };
}

function fixtureMessages(groupSessionId, skillName) {
  const start = Date.parse("2026-07-15T04:00:00.000Z");
  const rows = [invocation("phase323-invoked", groupSessionId, skillName, new Date(start).toISOString(), "historical-drift-hash")];
  for (let index = 0; index < 38; index += 1) {
    rows.push({
      id: `phase323-filler-${index}`,
      group_session_id: groupSessionId,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "group-main" : undefined,
      agent: index % 2 === 0 ? undefined : "group-main",
      timestamp: new Date(start + (index + 1) * 60_000).toISOString(),
      content: `PHASE323_FILLER_${index} exact-session invoked Skill attachment ${"context ".repeat(130)}`,
    });
  }
  return rows;
}

function installPromptSkill(home, name, prompt) {
  const skillsDir = path.join(home, ".cc-connect", "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, `${name}.json`), JSON.stringify({
    name,
    type: "skill",
    description: `Phase 323 ${name}`,
    prompt,
    enabled: true,
    origin: "user",
    contentHash: crypto.createHash("sha256").update(prompt).digest("hex"),
  }, null, 2));
}

function directBudgetChecks(compact, groupId, groupSessionId) {
  const names = Array.from({ length: 7 }, (_, index) => `phase323-budget-${index}`);
  const catalog = names.map((name, index) => ({
    name,
    enabled: true,
    description: `budget ${index}`,
    prompt: `PHASE323_SKILL_HEAD_${index}\n${(`skill-${index}-instruction `).repeat(8_000)}`,
  }));
  const messages = names.map((name, index) => invocation(
    `budget-${index}`,
    groupSessionId,
    name,
    new Date(Date.parse("2026-07-15T05:00:00.000Z") + index * 60_000).toISOString()
  ));
  const projection = compact.buildGroupPostCompactInvokedSkillAttachmentProjection(messages, {
    groupId,
    groupSessionId,
    skillCatalog: catalog,
  });
  const attachments = projection.attachments || [];
  const receipt = projection.receipt || {};
  const verified = compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt, { groupId, groupSessionId, attachments });
  const tampered = { ...receipt, attached_token_count: Number(receipt.attached_token_count || 0) + 1 };
  return {
    projection,
    checks: {
      newestInvocationFirst: attachments[0]?.name === names.at(-1),
      singleSkillBudgetMatchesCc: attachments.every(row => row.tokenCount <= 5_000)
        && receipt.single_skill_max_tokens === 5_000,
      totalSkillBudgetMatchesCc: receipt.attached_token_count <= 25_000
        && receipt.total_max_tokens === 25_000,
      headPreservedWhenTruncated: attachments.every(row => row.body.includes(`PHASE323_SKILL_HEAD_${names.indexOf(row.name)}`))
        && attachments.some(row => row.truncated === true),
      receiptValidAndBodyFree: verified.valid === true
        && receipt.body_free === true
        && !JSON.stringify(receipt).includes("PHASE323_SKILL_HEAD")
        && !Object.prototype.hasOwnProperty.call(receipt, "attachments"),
      tamperedReceiptRejected: compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(tampered).valid === false,
      crossSessionReceiptRejected: compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt, {
        groupId,
        groupSessionId: `${groupSessionId}_sibling`,
      }).valid === false,
      crossGroupReceiptRejected: compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt, {
        groupId: `${groupId}-other`,
        groupSessionId,
      }).valid === false,
    },
  };
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center, handoff } = modules();
  const home = os.homedir();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase323-skill-attachment-${nonce}`;
  const groupSessionId = `gcs_phase323_${nonce}`;
  const siblingSessionId = `gcs_phase323_sibling_${nonce}`;
  const skillName = `phase323-production-skill-${nonce}`;
  const siblingSkillName = `phase323-sibling-skill-${nonce}`;
  const bodySentinel = `PHASE323_PRODUCTION_SKILL_BODY_${nonce}`;
  const siblingSentinel = `PHASE323_SIBLING_SKILL_BODY_${nonce}`;
  installPromptSkill(home, skillName, `${bodySentinel}\nApply exact-session production instructions.`);
  installPromptSkill(home, siblingSkillName, `${siblingSentinel}\nNever leak this sibling content.`);
  const messages = fixtureMessages(groupSessionId, skillName);
  const siblingMessages = fixtureMessages(siblingSessionId, siblingSkillName);
  const originalJson = JSON.stringify(messages);
  storage.saveGroupMessages(groupId, messages, groupSessionId);
  storage.saveGroupMessages(groupId, siblingMessages, siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase323 production invoked skill attachment", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase323 sibling isolation", decisions: [] }, siblingSessionId);

  const direct = directBudgetChecks(compact, groupId, groupSessionId);
  const compacted = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: groupSessionId,
    force: true,
    reason: "phase323_invoked_skill_attachment",
    config: {
      enabled: true,
      memoryCompactionUseModel: false,
      modelContextWindow: 200000,
      modelAutoCompactTokenLimit: 167000,
      minKeepMessages: 4,
      minKeepTokens: 500,
      maxKeepTokens: 1800,
    },
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const plan = persisted.compaction?.postCompactReinject || {};
  const receipt = plan.invokedSkillAttachmentReceipt || null;
  const attachments = plan.invokedSkillAttachments || [];
  const attachment = attachments.find(row => row.name === skillName);
  const receiptVerification = compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt, { groupId, groupSessionId, attachments });

  const partial = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages,
    memory: { goal: "phase323 partial sidecar" },
    transcriptPath: storage.getGroupChatSessionMessagesFile(groupId, groupSessionId),
    force: true,
    partialCompact: { direction: "range", fromIndex: 4, throughIndex: 12, reason: "phase323_sidecar" },
    config: { minKeepMessages: 4, minKeepTokens: 500, maxKeepTokens: 1800, memoryCompactionUseModel: false },
  });
  const partialSegments = partial.memory?.compaction?.partialSegments || partial.partialSegments || [];
  const partialPlan = partialSegments.at(-1)?.reinjectionPlan || {};

  const syncPrepared = memory.prepareGroupMemoryResumeProjection(groupId, groupSessionId, messages, {
    goal: "phase323 sync snapshot",
  }, {
    groupSessionId,
    minKeepMessages: 4,
    minKeepTokens: 500,
    maxKeepTokens: 1800,
  });
  const syncPlan = syncPrepared.memory?.compaction?.postCompactReinject || {};

  const mainPrompt = memory.buildGroupContextPacket(groupId, {
    groupSessionId,
    recentLimit: 8,
    olderLimit: 12,
    fullCount: 4,
  });
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Continue PHASE323 with invoked Skill content", {
    groupSessionId,
    taskId: "phase323-child-task",
    taskAgentSessionId: "tas_phase323_child",
    nativeSessionId: "native_phase323_child",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    schema: "ccm-self-contained-worker-handoff-v1",
    task: "Continue PHASE323",
    user_goal: "Verify invoked Skill content delivery",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [],
    verification: {},
    ack_gate: {},
  });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.postCompactInvokedSkillAttachment || {};
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);

  const checks = {
    ...direct.checks,
    productionCompactionCompleted: compacted?.success === true && compacted?.compacted === true,
    productionAttachmentPersisted: !!attachment?.body?.includes(bodySentinel),
    productionReceiptValid: receiptVerification.valid === true,
    catalogDriftDiagnosed: attachment?.hashMatches === false && Number(receipt?.catalog_drift_count || 0) >= 1,
    fullCompactUsesCompleteSession: attachments.some(row => row.name === skillName),
    partialSidecarUsesCompleteSession: (partialPlan.invokedSkillAttachments || []).some(row => row.name === skillName),
    syncSnapshotUsesCompleteSession: (syncPlan.invokedSkillAttachments || []).some(row => row.name === skillName),
    groupMainPromptReceivesBody: mainPrompt.includes(bodySentinel),
    childBundleReceivesBody: String(childBundle.invoked_skill_attachment_text || "").includes(bodySentinel),
    finalWorkerPromptReceivesBody: workerPrompt.includes(bodySentinel),
    siblingContentDoesNotLeak: !mainPrompt.includes(siblingSentinel)
      && !String(childBundle.invoked_skill_attachment_text || "").includes(siblingSentinel)
      && !workerPrompt.includes(siblingSentinel),
    rawTranscriptUntouched: JSON.stringify(storage.getGroupMessages(groupId, groupSessionId)) === originalJson,
    siblingSessionUnaffected: !siblingMemory.compaction?.postCompactReinject?.invokedSkillAttachmentReceipt,
    memoryCenterShowsBodyFreeReceipt: centerProjection.status === "applied"
      && centerProjection.receiptValid === true
      && centerProjection.receipt?.body_free === true
      && !JSON.stringify(centerProjection).includes(bodySentinel),
    memoryCenterPanelPresent: uiSource.includes("Post-compact Invoked Skill Attachment")
      && uiSource.includes("postCompactInvokedSkillAttachmentCards"),
  };
  const finalPersisted = memory.loadGroupMemory(groupId, groupSessionId);
  const finalReceipt = finalPersisted.compaction?.postCompactReinject?.invokedSkillAttachmentReceipt || receipt;
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId, originalJson, bodySentinel, siblingSentinel, receipt: finalReceipt }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center, handoff } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const plan = persisted.compaction?.postCompactReinject || {};
  const attachments = plan.invokedSkillAttachments || [];
  const receipt = plan.invokedSkillAttachmentReceipt || null;
  const childBundle = memory.buildAgentMemoryContextBundle(fixture.groupId, "api", "Resume PHASE323 after restart", {
    groupSessionId: fixture.groupSessionId,
    taskId: "phase323-restart-child",
    taskAgentSessionId: "tas_phase323_restart_child",
    nativeSessionId: "native_phase323_restart_child",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Resume PHASE323",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [],
    verification: {},
    ack_gate: {},
  });
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.postCompactInvokedSkillAttachment || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const checks = {
    receiptSurvivesRestart: compact.verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt, {
      groupId: fixture.groupId,
      groupSessionId: fixture.groupSessionId,
      attachments,
    }).valid === true,
    checksumsSurviveRestart: receipt?.receipt_checksum === fixture.receipt?.receipt_checksum
      && receipt?.attachment_manifest_checksum === fixture.receipt?.attachment_manifest_checksum,
    attachmentBodySurvivesRestart: attachments.some(row => String(row.body || "").includes(fixture.bodySentinel)),
    childContextSurvivesRestart: String(childBundle.invoked_skill_attachment_text || "").includes(fixture.bodySentinel),
    workerPromptSurvivesRestart: workerPrompt.includes(fixture.bodySentinel),
    siblingStillDoesNotLeak: !workerPrompt.includes(fixture.siblingSentinel),
    memoryCenterSurvivesRestart: centerProjection.status === "applied" && centerProjection.receiptValid === true,
    rawStillUntouchedAfterRestart: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalJson,
    siblingStillIndependent: !sibling.compaction?.postCompactReinject?.invokedSkillAttachmentReceipt,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 300000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-create") {
  await childCreate(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase323-invoked-skill-"));
  const fixtureFile = path.join(tempHome, "phase323-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase323-post-compact-invoked-skill-attachment-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
