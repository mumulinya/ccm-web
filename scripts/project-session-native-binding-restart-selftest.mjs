import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const mode = process.argv[2] || "main";
const root = process.env.CCM_PROJECT_SESSION_BINDING_SELFTEST_HOME || fs.mkdtempSync(path.join(os.tmpdir(), "ccm-project-session-binding-"));
process.env.HOME = root;
process.env.USERPROFILE = root;

const bindingModule = await import("../ccm-package/dist/modules/projects/project-session-agent-binding.js");
const compactionModule = await import("../ccm-package/dist/modules/projects/project-session-compaction.js");
const sessionModule = await import("../ccm-package/dist/tasks/agent-sessions.js");
const runModule = await import("../ccm-package/dist/projects/chat-runs.js");
const { CCM_DIR } = await import("../ccm-package/dist/core/utils.js");

const project = "binding-selftest-project";
const projectSessionId = "s1";

if (mode === "verify-restart") {
  const binding = bindingModule.getProjectSessionAgentBinding(project, projectSessionId);
  assert.equal(binding.generation, 1);
  assert.equal(binding.provider, "codex");
  assert.equal(binding.native_session_id, "codex-native-s1");
  assert.equal(binding.turn_count, 1);
  console.log(JSON.stringify({ pass: true, restart_binding: binding.task_agent_session_id }));
  process.exit(0);
}

try {
  const first = bindingModule.bindProjectSessionAgentExecution({ project, projectSessionId, agentType: "codex" });
  assert.equal(first.binding.generation, 1);
  assert.equal(first.options.resumeSession, false);
  sessionModule.recordTaskAgentSessionTurn(first.session.id, { nativeSessionId: "codex-native-s1", success: true });

  const second = bindingModule.bindProjectSessionAgentExecution({ project, projectSessionId, agentType: "codex" });
  assert.equal(second.session.id, first.session.id);
  assert.equal(second.binding.generation, 1);
  assert.equal(second.options.resumeSession, true);
  assert.equal(second.options.sessionId, "codex-native-s1");

  const sibling = bindingModule.bindProjectSessionAgentExecution({ project, projectSessionId: "s2", agentType: "codex" });
  assert.notEqual(sibling.session.id, first.session.id);
  assert.notEqual(sibling.binding.scope_id, first.binding.scope_id);

  const restart = spawnSync(process.execPath, [new URL(import.meta.url).pathname.slice(1), "verify-restart"], {
    cwd: process.cwd(),
    env: { ...process.env, CCM_PROJECT_SESSION_BINDING_SELFTEST_HOME: root },
    encoding: "utf8",
  });
  assert.equal(restart.status, 0, restart.stderr || restart.stdout);
  assert.match(restart.stdout, /"pass":true/);

  const switched = bindingModule.bindProjectSessionAgentExecution({ project, projectSessionId, agentType: "claudecode" });
  assert.notEqual(switched.session.id, first.session.id);
  assert.equal(switched.binding.generation, 2);
  assert.equal(switched.binding.provider, "claudecode");
  assert.equal(switched.options.resumeSession, false);
  assert.equal(sessionModule.listTaskAgentSessions({ scopeId: first.binding.scope_id }).find(item => item.id === first.session.id)?.status, "closed");

  const rotation = bindingModule.rotateProjectSessionAgentBinding(project, projectSessionId, "selftest clear");
  assert.equal(rotation.closed.length, 1);
  assert.equal(rotation.nextGeneration, 3);
  const afterClear = bindingModule.bindProjectSessionAgentExecution({ project, projectSessionId, agentType: "claudecode" });
  assert.equal(afterClear.binding.generation, 3);
  assert.notEqual(afterClear.session.id, switched.session.id);

  const run = runModule.createProjectChatRun(project, "test", root, "", projectSessionId);
  run.project_session_generation = afterClear.binding.generation;
  run.task_session_scope_id = afterClear.binding.scope_id;
  run.task_agent_session_id = afterClear.session.id;
  runModule.saveProjectChatRuns();
  const publicRun = runModule.publicProjectChatRun(run);
  assert.equal(publicRun.project_session_id, projectSessionId);
  assert.equal(publicRun.project_session_generation, 3);

  const runCleanup = runModule.purgeProjectChatRunsForSession(project, projectSessionId);
  assert.equal(runCleanup.removed.length, 1);
  assert.equal(bindingModule.getProjectSessionAgentBinding(project, projectSessionId).status, "open");
  const cleanup = bindingModule.purgeProjectSessionAgentBinding(project, projectSessionId);
  assert.equal(bindingModule.getProjectSessionAgentBinding(project, projectSessionId).status, "unbound");
  assert.ok(cleanup.removed.length >= 0);
  assert.equal(bindingModule.getProjectSessionAgentBinding(project, "s2").status, "open");

  const compactProject = "binding-compact-project";
  const compactSessionId = "s1";
  const compactDir = path.join(CCM_DIR, "web-sessions", compactProject);
  fs.mkdirSync(compactDir, { recursive: true });
  const compactMessages = Array.from({ length: 70 }, (_, index) => ({
    id: `compact_${index}`,
    role: index % 2 ? "assistant" : "user",
    content: index === 2
      ? "未经明确授权不要修改生产配置"
      : index === 4
        ? "必须保留文件 C:\\workspace\\src\\important.ts"
        : index === 68
          ? `DYNAMIC_RECENT_SENTINEL_BEGIN ${"保留窗口原文".repeat(220)} DYNAMIC_RECENT_SENTINEL_END`
          : `项目会话第 ${index} 条消息，记录实现决定和未完成事项。${"项目上下文".repeat(180)}`,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
  }));
  const compactFile = path.join(compactDir, `${compactSessionId}.json`);
  fs.writeFileSync(compactFile, JSON.stringify({ id: compactSessionId, name: "压缩会话", history: compactMessages, updated_at: new Date().toISOString() }, null, 2));
  const compactBinding = bindingModule.bindProjectSessionAgentExecution({ project: compactProject, projectSessionId: compactSessionId, agentType: "codex" });
  sessionModule.recordTaskAgentSessionTurn(compactBinding.session.id, { nativeSessionId: "codex-compact-native", success: true });
  let compactPrompt = null;
  const compacted = await compactionModule.compactProjectSessionWithModel(compactProject, compactSessionId, {
    force: true,
    reason: "selftest",
    customInstructions: "重点保留授权和文件",
    modelCall: async request => {
      compactPrompt = JSON.parse(request.user);
      return { summary: compactPrompt.preservationReference, provider: "mock", model: "mock-project-summary" };
    },
  });
  assert.equal(compacted.compacted, true);
  assert.equal(compacted.summary_source, "model");
  assert.equal(compacted.next_generation, 2);
  assert.match(compactPrompt.customInstructions, /授权和文件/);
  assert.equal(bindingModule.getProjectSessionAgentBinding(compactProject, compactSessionId).status, "closed");
  const compactDisk = JSON.parse(fs.readFileSync(compactFile, "utf8"));
  assert.equal(compactDisk.history.length, compactMessages.length);
  assert.equal(compactDisk.compaction.mode, "model_required");
  assert.equal(compactDisk.compaction.last_compacted_index, compactMessages.length - compactDisk.compaction.preserved_recent_message_ids.length - 1);
  assert.notEqual(compactDisk.compaction.preserved_recent_message_ids.length, 24);
  assert.ok(compactDisk.compaction.preserved_recent_token_count >= 10_000);
  assert.ok(compactDisk.compaction.preserved_recent_token_count <= 40_000);
  assert.ok(compactDisk.compaction.preserved_recent_text_message_count >= 5);
  assert.equal(compactDisk.compaction.recent_window.strategy, "cc_session_memory_token_window");
  assert.equal(compactDisk.compaction.auto_compact_threshold, 167_000);
  assert.equal(compactDisk.compaction.model_context_capacity.contextWindow, 200_000);
  assert.ok(compactDisk.compaction.active_summary_checksum);
  assert.equal(compactDisk.compaction.summary_source, "model");
  assert.ok(compactDisk.compaction.v2.activeSummary);
  const restoreContext = compactionModule.buildProjectSessionPostCompactContext(compactProject, compactSessionId, "codex");
  assert.match(restoreContext, /important\.ts/);
  assert.match(restoreContext, /模型压缩摘要/);
  assert.match(restoreContext, /DYNAMIC_RECENT_SENTINEL_END/);
  const nextGeneration = bindingModule.bindProjectSessionAgentExecution({ project: compactProject, projectSessionId: compactSessionId, agentType: "codex" });
  assert.equal(nextGeneration.binding.generation, 2);
  assert.notEqual(nextGeneration.session.id, compactBinding.session.id);

  const chainSessionId = "chain";
  const chainFile = path.join(compactDir, `${chainSessionId}.json`);
  const chainBaseMessages = compactMessages.map((message, index) => ({
    ...message,
    id: `chain_s1_${index}`,
    content: index === 2 ? message.content : index === 4 ? message.content : `项目链式会话 ${index}。${"实现决定与未完成事项".repeat(35)}`,
  }));
  fs.writeFileSync(chainFile, JSON.stringify({ id: chainSessionId, history: chainBaseMessages }, null, 2));
  const chainPrompts = [];
  const runChainCompact = async label => compactionModule.compactProjectSessionWithModel(compactProject, chainSessionId, {
    force: true,
    reason: label,
    modelCall: async request => {
      const payload = JSON.parse(request.user);
      chainPrompts.push({ label, sessionMemory: request.sessionMemory === true, payload });
      return { summary: payload.preservationReference, provider: "mock", model: "mock-project-session-memory" };
    },
  });
  const projectS1 = await runChainCompact("project-chain-s1");
  assert.equal(projectS1.summary_source, "model");
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);
  const appendProjectChain = (prefix, offset) => {
    const disk = JSON.parse(fs.readFileSync(chainFile, "utf8"));
    disk.history.push(...compactMessages.slice(0, 34).map((message, index) => ({
      ...message,
      id: `${prefix}_${index}`,
      content: `项目链式增量 ${prefix} ${index}。${"实现决定与未完成事项".repeat(35)}`,
      timestamp: new Date(Date.now() + offset + index * 1000).toISOString(),
    })));
    fs.writeFileSync(chainFile, JSON.stringify(disk, null, 2));
  };
  appendProjectChain("chain_s2", 200_000);
  const projectS2 = await runChainCompact("project-chain-s2");
  assert.deepEqual(chainPrompts.at(-1).payload.previousSummary, JSON.parse(fs.readFileSync(chainFile, "utf8")).compaction.archives.at(-2).summary);
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);
  appendProjectChain("chain_s3", 400_000);
  const projectS3 = await runChainCompact("project-chain-s3");
  const projectChainDisk = JSON.parse(fs.readFileSync(chainFile, "utf8"));
  assert.deepEqual(chainPrompts.at(-1).payload.previousSummary, projectChainDisk.compaction.archives.at(-2).summary);
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);
  assert.equal(projectChainDisk.compaction.archives.length, 3);
  assert.equal(projectS2.summary_source, "model");
  assert.equal(projectS3.summary_source, "model");

  const legacyLowPressureSessionId = "legacy-low-pressure";
  const legacyLowPressureFile = path.join(compactDir, `${legacyLowPressureSessionId}.json`);
  const legacyLowPressureMessages = Array.from({ length: 8 }, (_, index) => ({
    id: `project_legacy_low_${index}`,
    role: index % 2 ? "assistant" : "user",
    content: `低压力项目会话消息 ${index}`,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
  }));
  fs.writeFileSync(legacyLowPressureFile, JSON.stringify({
    id: legacyLowPressureSessionId,
    history: legacyLowPressureMessages,
    compaction: {
      summary_source: "local_structured",
      active_summary: { primaryRequest: "旧本地摘要", sourceMessageIds: legacyLowPressureMessages.slice(0, 2).map(message => message.id) },
      consecutive_failures: 3,
      last_error: "项目会话模型摘要校验失败：source_boundary_mismatch",
      v2: {
        schema: "ccm-session-compaction-state-v2",
        scope: "project",
        sessionId: `${compactProject}:${legacyLowPressureSessionId}`,
        lastCompactedIndex: -1,
        consecutiveFailures: 3,
        lastError: "项目会话模型摘要校验失败：source_boundary_mismatch",
      },
    },
  }, null, 2));
  let legacyLowPressureModelCalls = 0;
  const legacyLowPressureResult = await compactionModule.compactProjectSessionWithModel(compactProject, legacyLowPressureSessionId, {
    currentRequest: { role: "user", content: "继续普通项目对话" },
    modelCall: async () => {
      legacyLowPressureModelCalls += 1;
      throw new Error("低压力项目会话不应调用压缩模型");
    },
  });
  assert.equal(legacyLowPressureResult.reason, "below_threshold");
  assert.equal(legacyLowPressureResult.legacy_summary_ignored, true);
  assert.equal(legacyLowPressureModelCalls, 0);
  const repairedLegacyProject = JSON.parse(fs.readFileSync(legacyLowPressureFile, "utf8"));
  assert.equal(repairedLegacyProject.compaction.consecutive_failures, 0);
  assert.equal(repairedLegacyProject.compaction.v2.consecutiveFailures, 0);

  const invalidSessionId = "s2";
  fs.writeFileSync(path.join(compactDir, `${invalidSessionId}.json`), JSON.stringify({ id: invalidSessionId, history: compactMessages.map(message => ({ ...message, id: `invalid_${message.id}` })) }, null, 2));
  const invalidBinding = bindingModule.bindProjectSessionAgentExecution({ project: compactProject, projectSessionId: invalidSessionId, agentType: "codex" });
  await assert.rejects(compactionModule.compactProjectSessionWithModel(compactProject, invalidSessionId, {
    force: true,
    modelCall: async () => ({ summary: { primaryRequest: "bad", sourceMessageIds: [] } }),
  }), /模型摘要校验失败/);
  assert.equal(bindingModule.getProjectSessionAgentBinding(compactProject, invalidSessionId).task_agent_session_id, invalidBinding.session.id);
  const failedCompactDisk = JSON.parse(fs.readFileSync(path.join(compactDir, `${invalidSessionId}.json`), "utf8"));
  assert.equal(failedCompactDisk.history.length, compactMessages.length);
  assert.equal(failedCompactDisk.compaction.v2.activeSummary, null);
  assert.equal(failedCompactDisk.compaction.v2.lastCompactedIndex, -1);
  assert.equal(failedCompactDisk.compaction.v2.consecutiveFailures, 1);

  compactDisk.compaction.active_summary.latestOutcome = "tampered";
  fs.writeFileSync(compactFile, JSON.stringify(compactDisk, null, 2));
  assert.throws(() => compactionModule.buildProjectSessionPostCompactContext(compactProject, compactSessionId, "claudecode"), /摘要校验失败/);

  const busySessionId = "s3";
  fs.writeFileSync(path.join(compactDir, `${busySessionId}.json`), JSON.stringify({ id: busySessionId, history: compactMessages }, null, 2));
  const busyLease = bindingModule.acquireProjectSessionAgentDispatch(compactProject, busySessionId);
  assert.equal(busyLease.acquired, true);
  assert.equal(bindingModule.acquireProjectSessionAgentDispatch(compactProject, busySessionId).acquired, false);
  await assert.rejects(compactionModule.compactProjectSessionWithModel(compactProject, busySessionId, { force: true, modelCall: async () => ({}) }), /正在执行/);
  assert.equal(bindingModule.releaseProjectSessionAgentDispatch(busyLease.scopeId), true);

  const frontend = fs.readFileSync(new URL("../frontend/src/components/projects/useProjectManager.js", import.meta.url), "utf8");
  const server = fs.readFileSync(new URL("../backend/server.ts", import.meta.url), "utf8");
  const lifecycle = fs.readFileSync(new URL("../backend/modules/projects/sessions.ts", import.meta.url), "utf8");
  assert.match(frontend, /formData\.append\('session_id',\s*sessionAtSend\)/);
  assert.match(frontend, /session_id:\s*sessionAtSend/);
  assert.match(server, /acquireProjectSessionAgentDispatch\(project,\s*exactProjectSessionId\)/);
  assert.match(server, /续跑来源不属于当前项目会话/);
  assert.match(lifecycle, /rotateProjectSessionAgentBinding\(project,\s*sessionId/);
  assert.match(lifecycle, /purgeProjectSessionAgentBinding\(project,\s*sessionId\)/);
  assert.match(server, /compactProjectSessionWithModel\(project,\s*exactProjectSessionId/);
  assert.match(frontend, /compactSession:\s*async/);

  console.log(JSON.stringify({
    pass: true,
    checks: 72,
    stable_task_agent_session: true,
    native_resume_after_restart: true,
    sibling_session_isolated: true,
    provider_switch_rotates_generation: true,
    clear_rotates_generation: true,
    delete_purges_binding: true,
    model_compaction_rotates_generation: true,
    invalid_summary_fail_closed: true,
    legacy_low_pressure_not_compacted: true,
    legacy_boundary_circuit_repaired: true,
    post_compact_context_reinjected: true,
    project_session_memory_chain: "S1 -> S2 -> S3",
    real_provider_calls: 0,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
