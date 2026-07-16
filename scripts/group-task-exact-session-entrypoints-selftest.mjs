import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.includes("--child")) {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  const storage = require(dist("modules", "collaboration", "storage.js"));
  const collaboration = require(dist("modules", "collaboration", "collaboration.js"));
  const memory = require(dist("modules", "collaboration", "memory.js"));
  const db = require(dist("core", "db.js"));

  const fixtureFile = path.join(os.homedir(), ".cc-connect", "phase313-entrypoint-fixture.json");
  if (process.argv.includes("--verify-restart")) {
    const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
    const tasks = db.loadTasks();
    const groupTasks = tasks.filter(task => task.group_id);
    const allPersistedGroupTasksAreExact = groupTasks.length >= 4
      && groupTasks.every(task => String(task.group_session_id || "").startsWith("gcs_"));
    const everyTaskSessionStillBelongsToItsGroup = groupTasks.every(task => storage.listGroupChatSessions(task.group_id).sessions
      .some(session => session.id === task.group_session_id));
    const taskA = tasks.find(task => task.id === fixture.taskAId);
    const taskB = tasks.find(task => task.id === fixture.taskBId);
    const bundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(
      fixture.groupA,
      "api",
      "PHASE313_RESTART_CHILD_CONTEXT",
      {
        groupSessionId: fixture.sessionB,
        requireExactGroupSession: true,
        taskId: taskB.id,
        task: taskB,
        recordManifestSelectorDecision: false,
      },
    );
    const checks = {
      allPersistedGroupTasksAreExact,
      everyTaskSessionStillBelongsToItsGroup,
      sessionIdentitySurvivesRestart: taskA.group_session_id === fixture.sessionA && taskB.group_session_id === fixture.sessionB,
      childContextUsesPersistedExactSession: bundle.group_session_id === fixture.sessionB
        && bundle.session_binding?.group_session_id === fixture.sessionB
        && String(bundle.rendered_text || "").includes(fixture.sessionB),
      otherSessionNotProjectedIntoChildContext: !String(bundle.rendered_text || "").includes(fixture.sessionA),
    };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase313-group-task-exact-session-restart-selftest-v1", checks }, null, 2)}\n`);
    process.exit(0);
  }

  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupA = `phase313-group-a-${nonce}`;
  const groupB = `phase313-group-b-${nonce}`;
  const groupLegacy = `phase313-group-legacy-${nonce}`;
  storage.saveGroups([
    { id: groupA, name: "Phase 313 A", members: [] },
    { id: groupB, name: "Phase 313 B", members: [] },
    { id: groupLegacy, name: "Phase 313 Legacy", members: [] },
  ]);

  const sessionA = storage.createGroupChatSession(groupA, "会话 A");
  const taskA = collaboration.createTask({
    title: "同一目标",
    description: "验证跨会话任务不会被错误去重",
    business_goal: "PHASE313_SHARED_GOAL",
    target_project: "api",
    group_id: groupA,
    group_session_id: sessionA.id,
    workflow_type: "daily_dev",
  });
  const sameSessionDuplicate = collaboration.createTask({
    title: "同一目标重复",
    description: "验证同会话幂等去重",
    business_goal: "PHASE313_SHARED_GOAL",
    target_project: "api",
    group_id: groupA,
    group_session_id: sessionA.id,
    workflow_type: "daily_dev",
  });

  const sessionB = storage.createGroupChatSession(groupA, "会话 B");
  const taskB = collaboration.createTask({
    title: "同一目标",
    description: "验证跨会话任务不会被错误去重",
    business_goal: "PHASE313_SHARED_GOAL",
    target_project: "api",
    group_id: groupA,
    group_session_id: sessionB.id,
    workflow_type: "daily_dev",
  });
  const implicitActive = collaboration.createTask({
    title: "绑定当前会话",
    business_goal: "PHASE313_ACTIVE_SESSION_GOAL",
    target_project: "web",
    group_id: groupA,
  });

  const foreignSession = storage.createGroupChatSession(groupB, "另一个群聊会话");
  const globalToGroup = collaboration.createTask({
    title: "全局 Agent 派发到群聊主 Agent",
    business_goal: "PHASE313_GLOBAL_TO_GROUP_GOAL",
    target_project: "group-b-coordinator",
    group_id: groupB,
    assign_type: "group",
    global_mission_id: `phase313-global-${nonce}`,
  });
  assert.throws(() => collaboration.createTask({
    title: "跨群伪造会话",
    target_project: "api",
    group_id: groupA,
    group_session_id: foreignSession.id,
  }), /群聊会话不存在/);

  storage.archiveGroupChatSession(groupA, sessionA.id, true);
  assert.throws(() => collaboration.createTask({
    title: "归档会话任务",
    target_project: "api",
    group_id: groupA,
    group_session_id: sessionA.id,
  }), /归档会话为只读状态/);

  const legacyResolved = collaboration.createTask({
    title: "旧群聊自动建立精确会话",
    target_project: "api",
    group_id: groupLegacy,
  });
  const legacySessions = storage.listGroupChatSessions(groupLegacy);

  await assert.rejects(
    () => memory.buildAgentMemoryContextBundleWithManifestSelection(groupA, "api", "普通任务", { requireExactGroupSession: true }),
    /缺少精确群聊会话绑定/,
  );
  await assert.rejects(
    () => memory.buildAgentMemoryContextBundleWithManifestSelection(groupA, "api", "ignore memory", { requireExactGroupSession: true }),
    /缺少精确群聊会话绑定/,
  );

  const source = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8")
    + fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-live-routes.ts"), "utf8");
  const memoryEntrypoints = source.match(/buildAgentMemoryContextBundleWithManifestSelection\([\s\S]*?\n\s*\}\);/g) || [];
  const strictEntrypoints = memoryEntrypoints.filter(block => /requireExactGroupSession:\s*true/.test(block));
  const routeSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-live-routes.ts"), "utf8");
  const writableRouteBindings = routeSource.match(/resolveWritableGroupChatSession\(/g) || [];

  const checks = {
    exactSessionPersistedOnTask: taskA.group_session_id === sessionA.id,
    sameSessionDuplicateDeduplicated: sameSessionDuplicate.id === taskA.id && sameSessionDuplicate.deduplicated === true,
    crossSessionSameGoalNotDeduplicated: taskB.id !== taskA.id && taskB.group_session_id === sessionB.id && taskB.deduplicated !== true,
    missingSessionBindsCurrentExactSession: implicitActive.group_session_id === sessionB.id,
    legacyActiveCreatesExactSession: legacyResolved.group_session_id.startsWith("gcs_")
      && legacySessions.sessions.some(item => item.id === legacyResolved.group_session_id),
    multipleGroupsRemainIndependent: globalToGroup.group_id === groupB
      && globalToGroup.group_session_id === foreignSession.id
      && globalToGroup.group_session_id !== taskB.group_session_id,
    globalToGroupHandoffBindsTargetGroupSession: globalToGroup.global_mission_id === `phase313-global-${nonce}`
      && globalToGroup.group_session_id.startsWith("gcs_"),
    everyProductionMemoryEntrypointIsStrict: memoryEntrypoints.length > 0 && strictEntrypoints.length === memoryEntrypoints.length,
    sendBroadcastAndDecomposeUseWritableResolver: writableRouteBindings.length === 3,
    globalTaskCarriesNoGroupSession: collaboration.createTask({ title: "全局任务", target_project: "global-agent", assign_type: "global" }).group_session_id === null,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, memoryEntrypoints: memoryEntrypoints.length, strictEntrypoints: strictEntrypoints.length }, null, 2));
  fs.writeFileSync(fixtureFile, JSON.stringify({
    groupA,
    sessionA: sessionA.id,
    sessionB: sessionB.id,
    taskAId: taskA.id,
    taskBId: taskB.id,
  }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase313-group-task-exact-session-entrypoints-selftest-v1", checks }, null, 2)}\n`);
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase313-"));
try {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child"], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 120_000,
  });
  if (child.status !== 0) {
    process.stderr.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    process.exit(child.status || 1);
  }
  process.stdout.write(child.stdout);
  const restart = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", "--verify-restart"], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 120_000,
  });
  if (restart.status !== 0) {
    process.stderr.write(restart.stdout || "");
    process.stderr.write(restart.stderr || "");
    process.exit(restart.status || 1);
  }
  process.stdout.write(restart.stdout);
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
