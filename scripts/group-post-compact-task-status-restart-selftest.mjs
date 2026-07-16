import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE321_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
    db: require(dist("core", "db.js")),
  };
}

function fixtureMessages(groupSessionId) {
  return Array.from({ length: 36 }, (_, index) => ({
    id: `phase321-message-${index}`,
    group_session_id: groupSessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "group-main" : undefined,
    agent: index % 2 === 0 ? undefined : "group-main",
    timestamp: new Date(Date.parse("2026-07-15T01:00:00.000Z") + index * 60_000).toISOString(),
    content: `PHASE321_CONTEXT_${index} preserve exact-session child task coordination ${"context ".repeat(90)}`,
  }));
}

function fixtureTasks(groupId, groupSessionId, siblingSessionId) {
  const now = new Date().toISOString();
  return [
    {
      id: "phase321-running",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "api",
      status: "in_progress",
      title: "Implement the API contract",
      progress: { summary: "Editing src/phase321-api.ts" },
      task_agent_session_id: "tas_phase321_running",
      native_session_id: "native_phase321_running",
      updated_at: now,
    },
    {
      id: "phase321-completed",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "frontend",
      status: "done",
      title: "Finish the status panel",
      receipt: { summary: "Updated MemoryCenter.vue and passed checks" },
      output_file_path: "artifacts/phase321-completed.json",
      updated_at: now,
    },
    {
      id: "phase321-blocked",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "test",
      status: "blocked",
      title: "Run cross-session acceptance",
      error: "Waiting for the exact-session fixture",
      updated_at: now,
    },
    {
      id: "phase321-pending",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "docs",
      status: "pending",
      title: "Pending work must not be reinjected",
      updated_at: now,
    },
    {
      id: "phase321-retrieved",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "api",
      status: "done",
      title: "Already retrieved result",
      result_retrieved: true,
      updated_at: now,
    },
    {
      id: "phase321-current",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: "group-main",
      status: "in_progress",
      title: "Current compacting task",
      updated_at: now,
    },
    {
      id: "phase321-sibling",
      group_id: groupId,
      group_session_id: siblingSessionId,
      target_project: "api",
      status: "in_progress",
      title: "Sibling session sentinel must stay isolated",
      updated_at: now,
    },
    {
      id: "phase321-other-group",
      group_id: `${groupId}-other`,
      group_session_id: groupSessionId,
      target_project: "api",
      status: "in_progress",
      title: "Other group sentinel must stay isolated",
      updated_at: now,
    },
    {
      id: "phase321-legacy",
      group_id: groupId,
      group_session_id: "default",
      target_project: "api",
      status: "in_progress",
      title: "Legacy session sentinel must stay isolated",
      updated_at: now,
    },
  ];
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center, db } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase321-task-status-${nonce}`;
  const groupSessionId = `gcs_phase321_${nonce}`;
  const siblingSessionId = `gcs_phase321_sibling_${nonce}`;
  const messages = fixtureMessages(groupSessionId);
  const siblingMessages = fixtureMessages(siblingSessionId);
  const tasks = fixtureTasks(groupId, groupSessionId, siblingSessionId);
  const originalMessagesJson = JSON.stringify(messages);
  const originalTasksJson = JSON.stringify(tasks);
  const direct = compact.buildGroupPostCompactTaskStatusProjection(tasks, {
    groupId,
    groupSessionId,
    currentTaskId: "phase321-current",
    completedMaxAgeMs: 24 * 60 * 60 * 1000,
  });
  const directVerification = compact.verifyGroupPostCompactTaskStatusProjectionReceipt(direct.receipt, {
    groupId,
    groupSessionId,
    projectionChecksum: direct.receipt.projection_checksum,
  });
  const tampered = { ...direct.receipt, included_task_count: direct.receipt.included_task_count + 1 };
  const crossSessionVerification = compact.verifyGroupPostCompactTaskStatusProjectionReceipt(direct.receipt, {
    groupId,
    groupSessionId: siblingSessionId,
  });

  storage.saveGroupMessages(groupId, messages, groupSessionId);
  storage.saveGroupMessages(groupId, siblingMessages, siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase321 task status projection", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase321 sibling isolation", decisions: [] }, siblingSessionId);
  db.saveTasks(tasks);

  const result = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: groupSessionId,
    force: true,
    reason: "phase321_post_compact_task_status",
    config: {
      enabled: true,
      memoryCompactionUseModel: false,
      modelContextWindow: 200000,
      modelAutoCompactTokenLimit: 167000,
      minKeepMessages: 5,
      minKeepTokens: 1000,
      maxKeepTokens: 3000,
      currentTaskId: "phase321-current",
    },
  });
  if (result?.success !== true || result?.compacted !== true) {
    process.stderr.write(`PHASE321_COMPACTION_DEBUG=${JSON.stringify(result)}\n`);
  }

  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const receipt = persisted.compaction?.postCompactTaskStatusProjection || null;
  const taskStatuses = persisted.compaction?.postCompactReinject?.taskStatuses || [];
  const mainContext = memory.buildGroupContextPacket(groupId, { groupSessionId });
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Continue PHASE321 child coordination", {
    groupSessionId,
    taskId: "phase321-child-dispatch",
    taskAgentSessionId: "tas_phase321_child_dispatch",
    nativeSessionId: "native_phase321_child_dispatch",
    disableTypedMemorySelector: true,
  });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.postCompactTaskStatusProjection || {};
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const rawMessagesAfter = storage.getGroupMessages(groupId, groupSessionId);
  const rawTasksAfter = db.loadTasks();
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const directTaskIds = direct.tasks.map(row => row.task_id);
  const persistedTaskIds = taskStatuses.map(row => row.task_id);

  const checks = {
    runningTaskProjected: directTaskIds.includes("phase321-running") && direct.receipt.running_task_count === 1,
    completedUnretrievedProjected: directTaskIds.includes("phase321-completed") && direct.receipt.completed_unretrieved_count === 1,
    blockedTaskProjected: directTaskIds.includes("phase321-blocked") && direct.receipt.blocked_task_count === 1,
    pendingTaskExcluded: !directTaskIds.includes("phase321-pending") && direct.receipt.excluded_pending_count === 1,
    retrievedTaskExcluded: !directTaskIds.includes("phase321-retrieved") && direct.receipt.excluded_retrieved_count === 1,
    currentTaskExcluded: !directTaskIds.includes("phase321-current") && direct.receipt.excluded_self_count === 1,
    siblingAndOtherScopesExcluded: !directTaskIds.includes("phase321-sibling")
      && !directTaskIds.includes("phase321-other-group")
      && !directTaskIds.includes("phase321-legacy")
      && direct.receipt.excluded_scope_count === 3,
    receiptValidAndBodyFree: directVerification.valid === true
      && direct.receipt.raw_tasks_preserved === true
      && !JSON.stringify(direct.receipt).includes("Editing src/phase321-api.ts"),
    tamperedReceiptRejected: compact.verifyGroupPostCompactTaskStatusProjectionReceipt(tampered).valid === false,
    crossSessionReceiptRejected: crossSessionVerification.valid === false,
    productionCompactionCompleted: result?.success === true && result?.compacted === true,
    persistedProjectionValid: receipt
      && compact.verifyGroupPostCompactTaskStatusProjectionReceipt(receipt, { groupId, groupSessionId }).valid === true,
    reinjectionPlanCarriesExactTasks: ["phase321-running", "phase321-completed", "phase321-blocked"].every(id => persistedTaskIds.includes(id))
      && !persistedTaskIds.includes("phase321-sibling"),
    mainAgentContextCarriesTaskStatus: mainContext.includes("phase321-running")
      && mainContext.includes("phase321-completed")
      && !mainContext.includes("Sibling session sentinel"),
    childAgentContextCarriesTaskStatus: String(childBundle.rendered_text || "").includes("phase321-running")
      && childBundle.post_compact_reinjection_gate?.candidates?.some(row => row.kind === "task_status" && row.taskId === "phase321-running"),
    rawMessagesUntouched: JSON.stringify(rawMessagesAfter) === originalMessagesJson,
    rawTasksUntouched: JSON.stringify(rawTasksAfter) === originalTasksJson,
    siblingMemoryUnaffected: !siblingMemory.compaction?.postCompactTaskStatusProjection,
    memoryCenterShowsExactSessionProjection: centerProjection.status === "applied"
      && centerProjection.receiptValid === true
      && centerProjection.groupSessionId === groupSessionId
      && centerProjection.tasks.some(row => row.task_id === "phase321-running"),
    memoryCenterPanelPresent: uiSource.includes("Post-compact Child Task Status")
      && uiSource.includes("postCompactTaskStatusProjectionCards"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({
    groupId,
    groupSessionId,
    siblingSessionId,
    originalMessagesJson,
    originalTasksJson,
    receipt,
  }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center, db } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const receipt = persisted.compaction?.postCompactTaskStatusProjection || null;
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const projection = detail.postCompactUsage?.postCompactTaskStatusProjection || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const mainContext = memory.buildGroupContextPacket(fixture.groupId, { groupSessionId: fixture.groupSessionId });
  const checks = {
    receiptSurvivesRestart: receipt
      && compact.verifyGroupPostCompactTaskStatusProjectionReceipt(receipt, {
        groupId: fixture.groupId,
        groupSessionId: fixture.groupSessionId,
      }).valid === true,
    projectionChecksumSurvivesRestart: receipt?.projection_checksum === fixture.receipt?.projection_checksum
      && receipt?.receipt_checksum === fixture.receipt?.receipt_checksum,
    taskStatusesSurviveRestart: persisted.compaction?.postCompactReinject?.taskStatuses?.some(row => row.task_id === "phase321-running"),
    mainContextSurvivesRestart: mainContext.includes("phase321-running") && mainContext.includes("phase321-completed"),
    memoryCenterSurvivesRestart: projection.status === "applied" && projection.receiptValid === true,
    rawMessagesStillUntouched: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalMessagesJson,
    rawTasksStillUntouched: JSON.stringify(db.loadTasks()) === fixture.originalTasksJson,
    siblingStillIndependent: !sibling.compaction?.postCompactTaskStatusProjection,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 240000,
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
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase321-task-status-"));
  const fixtureFile = path.join(tempHome, "phase321-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase321-post-compact-task-status-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
