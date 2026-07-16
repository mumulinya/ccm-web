import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE324_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
    handoff: require(dist("agents", "worker-handoff.js")),
    db: require(dist("core", "db.js")),
  };
}

function plan(sentinel, overrides = {}) {
  return {
    title: `PHASE324 ${sentinel} plan`,
    mode: "cc-style-plan-mode",
    requirement: `Implement ${sentinel} without losing the exact session boundary.`,
    steps: [
      { id: "inspect", label: "Inspect", detail: `${sentinel} read-only inspection`, status: "completed" },
      { id: "implement", label: "Implement", detail: `${sentinel} code change`, status: "pending" },
      { id: "verify", label: "Verify", detail: `${sentinel} acceptance`, status: "pending" },
    ],
    impact_scope: { projects: ["api"], areas: [sentinel], multi_agent: false },
    risk: { level: "high", summary: `${sentinel} requires confirmation` },
    acceptance: [`${sentinel} survives compact and restart`],
    permission_boundaries: [`${sentinel}: no writes before confirmation`],
    sub_agent_work_order_requirements: [`Carry ${sentinel} into the worker prompt`],
    requires_confirmation: true,
    auto_continue: false,
    next_step: `Wait for ${sentinel} confirmation`,
    generated_at: "2026-07-15T08:00:00.000Z",
    ...overrides,
  };
}

function task(id, groupId, groupSessionId, sentinel, overrides = {}) {
  const planMode = plan(sentinel, overrides.plan || {});
  const copy = { ...overrides };
  delete copy.plan;
  return {
    id,
    group_id: groupId,
    group_session_id: groupSessionId,
    title: `${sentinel} task`,
    business_goal: `${sentinel} goal`,
    target_project: "api",
    status: "pending",
    intake_state: "awaiting_confirmation",
    intake_draft: planMode,
    workflow_meta: { plan_mode: planMode, intake: { plan_mode: planMode } },
    created_at: "2026-07-15T08:00:00.000Z",
    updated_at: "2026-07-15T08:00:00.000Z",
    ...copy,
  };
}

function messages(groupSessionId, taskId) {
  const start = Date.parse("2026-07-15T08:00:00.000Z");
  return Array.from({ length: 42 }, (_, index) => ({
    id: `phase324-message-${index}`,
    group_session_id: groupSessionId,
    task_id: index >= 38 ? taskId : undefined,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "group-main" : undefined,
    agent: index % 2 === 0 ? undefined : "group-main",
    timestamp: new Date(start + index * 60_000).toISOString(),
    content: `PHASE324 session context ${index} ${"plan continuity ".repeat(140)}`,
  }));
}

function directChecks(compact, tasks, groupId, groupSessionId, currentTaskId, currentSentinel, siblingSentinel) {
  const projection = compact.buildGroupPostCompactPlanAttachmentProjection(tasks, {
    groupId,
    groupSessionId,
    currentTaskId,
    sessionMessages: messages(groupSessionId, currentTaskId),
    now: "2026-07-15T09:00:00.000Z",
  });
  const verified = compact.verifyGroupPostCompactPlanAttachmentReceipt(projection.receipt, {
    groupId,
    groupSessionId,
    attachment: projection.attachment,
  });
  const tampered = { ...projection.receipt, plan_mode_active: false };
  const tamperedBody = { ...projection.attachment, body: `${projection.attachment.body}\nTAMPERED` };
  const confirmedTask = task("phase324-confirmed", groupId, groupSessionId, "PHASE324_CONFIRMED", {
    status: "in_progress",
    intake_state: "confirmed",
    plan: {
      requires_confirmation: false,
      auto_continue: true,
      confirmation_status: "confirmed",
      confirmed_at: "2026-07-15T08:30:00.000Z",
    },
  });
  const confirmedProjection = compact.buildGroupPostCompactPlanAttachmentProjection([confirmedTask], {
    groupId,
    groupSessionId,
    currentTaskId: confirmedTask.id,
  });
  const hugeHead = "PHASE324_HUGE_PLAN_HEAD";
  const hugeTail = "PHASE324_HUGE_PLAN_TAIL";
  const hugeTask = task("phase324-huge", groupId, groupSessionId, "PHASE324_HUGE", {
    plan: { read_only_exploration: { summary: `${hugeHead}\n${"large-plan-body ".repeat(120_000)}\n${hugeTail}` } },
  });
  const hugeProjection = compact.buildGroupPostCompactPlanAttachmentProjection([hugeTask], {
    groupId,
    groupSessionId,
    currentTaskId: hugeTask.id,
  });
  return {
    projection,
    checks: {
      explicitCurrentTaskWins: projection.receipt.selected_task_id === currentTaskId && projection.attachment.body.includes(currentSentinel),
      siblingAndOtherScopesExcluded: !projection.attachment.body.includes(siblingSentinel) && projection.receipt.excluded_scope_count >= 2,
      awaitingPlanModeRestored: projection.receipt.plan_mode_active === true && projection.receipt.confirmation_status === "awaiting_confirmation",
      confirmedPlanDoesNotRestoreWaitingMode: confirmedProjection.receipt.plan_mode_active === false && confirmedProjection.receipt.confirmation_status === "confirmed",
      receiptValidAndBodyFree: verified.valid === true && projection.receipt.body_free === true && !JSON.stringify(projection.receipt).includes(currentSentinel),
      receiptTamperRejected: compact.verifyGroupPostCompactPlanAttachmentReceipt(tampered).valid === false,
      attachmentTamperRejected: compact.verifyGroupPostCompactPlanAttachmentReceipt(projection.receipt, {
        groupId,
        groupSessionId,
        attachment: tamperedBody,
      }).valid === false,
      crossSessionReceiptRejected: compact.verifyGroupPostCompactPlanAttachmentReceipt(projection.receipt, {
        groupId,
        groupSessionId: `${groupSessionId}_sibling`,
      }).valid === false,
      crossGroupReceiptRejected: compact.verifyGroupPostCompactPlanAttachmentReceipt(projection.receipt, {
        groupId: `${groupId}-other`,
        groupSessionId,
      }).valid === false,
      claudeCodePlanBudgetApplied: hugeProjection.receipt.max_plan_tokens === 50_000
        && hugeProjection.receipt.budget_source === "claude_code_POST_COMPACT_TOKEN_BUDGET"
        && hugeProjection.receipt.attachment_token_count <= 50_000
        && hugeProjection.receipt.truncated === true
        && hugeProjection.attachment.body.includes(hugeHead)
        && hugeProjection.attachment.body.includes(hugeTail),
    },
  };
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center, handoff, db } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase324-plan-${nonce}`;
  const groupSessionId = `gcs_phase324_${nonce}`;
  const siblingSessionId = `gcs_phase324_sibling_${nonce}`;
  const currentTaskId = `phase324-current-${nonce}`;
  const currentSentinel = `PHASE324_CURRENT_PLAN_${nonce}`;
  const siblingSentinel = `PHASE324_SIBLING_PLAN_${nonce}`;
  const fallbackSentinel = `PHASE324_FALLBACK_PLAN_${nonce}`;
  const currentTask = task(currentTaskId, groupId, groupSessionId, currentSentinel);
  const fallbackTask = task(`phase324-fallback-${nonce}`, groupId, groupSessionId, fallbackSentinel, {
    status: "in_progress",
    intake_state: "confirmed",
    updated_at: "2026-07-15T09:30:00.000Z",
    plan: { requires_confirmation: false, confirmation_status: "confirmed", confirmed_at: "2026-07-15T09:00:00.000Z" },
  });
  const siblingTask = task(`phase324-sibling-${nonce}`, groupId, siblingSessionId, siblingSentinel);
  const otherGroupTask = task(`phase324-other-${nonce}`, `${groupId}-other`, groupSessionId, `PHASE324_OTHER_GROUP_${nonce}`);
  const terminalTask = task(`phase324-terminal-${nonce}`, groupId, groupSessionId, `PHASE324_TERMINAL_${nonce}`, { status: "done" });
  const tasks = [fallbackTask, siblingTask, otherGroupTask, terminalTask, currentTask];
  db.saveTasks(tasks);
  const originalTasksJson = JSON.stringify(db.loadTasks());
  const sessionMessages = messages(groupSessionId, currentTaskId);
  const originalTranscriptJson = JSON.stringify(sessionMessages);
  storage.saveGroupMessages(groupId, sessionMessages, groupSessionId);
  storage.saveGroupMessages(groupId, messages(siblingSessionId, siblingTask.id), siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase324 exact-session plan restore", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase324 sibling isolation", decisions: [] }, siblingSessionId);

  const direct = directChecks(compact, tasks, groupId, groupSessionId, currentTaskId, currentSentinel, siblingSentinel);
  const compacted = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: groupSessionId,
    force: true,
    reason: "phase324_plan_attachment",
    config: {
      enabled: true,
      memoryCompactionUseModel: false,
      modelContextWindow: 200000,
      modelAutoCompactTokenLimit: 167000,
      minKeepMessages: 4,
      minKeepTokens: 500,
      maxKeepTokens: 1800,
      currentTaskId,
    },
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const persistedPlan = persisted.compaction?.postCompactReinject || {};
  const receipt = persistedPlan.planAttachmentReceipt || null;
  const attachment = persistedPlan.planAttachment || null;
  const partial = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages: sessionMessages,
    memory: { goal: "phase324 partial plan restore" },
    transcriptPath: storage.getGroupChatSessionMessagesFile(groupId, groupSessionId),
    activeTasks: tasks,
    force: true,
    partialCompact: { direction: "range", fromIndex: 4, throughIndex: 12, reason: "phase324_sidecar" },
    config: { minKeepMessages: 4, minKeepTokens: 500, maxKeepTokens: 1800, memoryCompactionUseModel: false, currentTaskId },
  });
  const partialPlan = (partial.memory?.compaction?.partialSegments || []).at(-1)?.reinjectionPlan || {};
  const syncPrepared = memory.prepareGroupMemoryResumeProjection(groupId, groupSessionId, sessionMessages, {
    goal: "phase324 sync plan restore",
  }, {
    groupSessionId,
    currentTaskId,
    minKeepMessages: 4,
    minKeepTokens: 500,
    maxKeepTokens: 1800,
  });
  const syncPlan = syncPrepared.memory?.compaction?.postCompactReinject || {};
  const mainPrompt = memory.buildGroupContextPacket(groupId, { groupSessionId, recentLimit: 8, olderLimit: 12, fullCount: 4 });
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Continue PHASE324", {
    groupSessionId,
    taskId: currentTaskId,
    taskAgentSessionId: "tas_phase324_child",
    nativeSessionId: "native_phase324_child",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Continue PHASE324",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [],
    verification: {},
    ack_gate: {},
  });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.postCompactPlanAttachment || {};
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const checks = {
    ...direct.checks,
    productionCompactionCompleted: compacted?.success === true && compacted?.compacted === true,
    fullCompactPlanPersisted: attachment?.body?.includes(currentSentinel) && receipt?.selected_task_id === currentTaskId,
    productionReceiptValid: compact.verifyGroupPostCompactPlanAttachmentReceipt(receipt, { groupId, groupSessionId, attachment }).valid === true,
    partialSidecarPlanRestored: partialPlan.planAttachment?.body?.includes(currentSentinel),
    syncSnapshotPlanRestored: syncPlan.planAttachment?.body?.includes(currentSentinel),
    groupMainPromptReceivesPlan: mainPrompt.includes(currentSentinel) && mainPrompt.includes("等待确认状态"),
    childBundleReceivesPlan: String(childBundle.plan_attachment_text || "").includes(currentSentinel),
    finalWorkerPromptReceivesPlan: workerPrompt.includes(currentSentinel),
    siblingContentDoesNotLeak: !mainPrompt.includes(siblingSentinel) && !String(childBundle.plan_attachment_text || "").includes(siblingSentinel) && !workerPrompt.includes(siblingSentinel),
    rawTranscriptUntouched: JSON.stringify(storage.getGroupMessages(groupId, groupSessionId)) === originalTranscriptJson,
    tasksJsonUntouched: JSON.stringify(db.loadTasks()) === originalTasksJson,
    siblingSessionUnaffected: !siblingMemory.compaction?.postCompactReinject?.planAttachmentReceipt,
    memoryCenterBodyFree: centerProjection.status === "applied" && centerProjection.receiptValid === true && centerProjection.receipt?.body_free === true && !JSON.stringify(centerProjection).includes(currentSentinel),
    memoryCenterPanelPresent: uiSource.includes("Post-compact Current Plan Attachment") && uiSource.includes("postCompactPlanAttachmentCards"),
  };
  const finalReceipt = memory.loadGroupMemory(groupId, groupSessionId).compaction?.postCompactReinject?.planAttachmentReceipt || receipt;
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId, currentTaskId, currentSentinel, siblingSentinel, originalTranscriptJson, originalTasksJson, receipt: finalReceipt }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center, handoff, db } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const planState = persisted.compaction?.postCompactReinject || {};
  const childBundle = memory.buildAgentMemoryContextBundle(fixture.groupId, "api", "Resume PHASE324", {
    groupSessionId: fixture.groupSessionId,
    taskId: fixture.currentTaskId,
    taskAgentSessionId: "tas_phase324_restart",
    nativeSessionId: "native_phase324_restart",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Resume PHASE324",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [], verification: {}, ack_gate: {},
  });
  const centerProjection = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`).postCompactUsage?.postCompactPlanAttachment || {};
  const checks = {
    receiptSurvivesRestart: compact.verifyGroupPostCompactPlanAttachmentReceipt(planState.planAttachmentReceipt, {
      groupId: fixture.groupId,
      groupSessionId: fixture.groupSessionId,
      attachment: planState.planAttachment,
    }).valid === true,
    checksumsSurviveRestart: planState.planAttachmentReceipt?.receipt_checksum === fixture.receipt?.receipt_checksum && planState.planAttachmentReceipt?.attachment_manifest_checksum === fixture.receipt?.attachment_manifest_checksum,
    planBodySurvivesRestart: planState.planAttachment?.body?.includes(fixture.currentSentinel),
    childContextSurvivesRestart: String(childBundle.plan_attachment_text || "").includes(fixture.currentSentinel),
    workerPromptSurvivesRestart: workerPrompt.includes(fixture.currentSentinel),
    siblingStillDoesNotLeak: !workerPrompt.includes(fixture.siblingSentinel),
    memoryCenterSurvivesRestart: centerProjection.status === "applied" && centerProjection.receiptValid === true,
    rawStillUntouchedAfterRestart: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalTranscriptJson,
    tasksStillUntouchedAfterRestart: JSON.stringify(db.loadTasks()) === fixture.originalTasksJson,
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
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase324-plan-attachment-"));
  const fixtureFile = path.join(tempHome, "phase324-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase324-post-compact-plan-attachment-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
