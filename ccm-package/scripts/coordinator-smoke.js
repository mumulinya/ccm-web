#!/usr/bin/env node
const assert = require("assert");
const { runCollaborationProtocolSelfTest, runGroupMemoryStorageRecoverySelfTest } = require("../dist/modules/collaboration.js");
const { runCronDailyDevProtocolSelfTest } = require("../dist/modules/cron.js");
const { defaultOrchestratorConfig, runCoordinatorProtocolSelfTest } = require("../dist/modules/group-orchestrator.js");
const { runGlobalAgentIntentSelfTest } = require("../dist/modules/global-agent.js");
const {
  runGroupMemoryCompactionSelfTest,
  runGroupMemoryCompactionIntegrationSelfTest,
  runGroupMemoryCompactionStressSelfTest,
} = require("../dist/modules/group-memory-compaction.js");
const { runAgentRuntimeSessionSelfTest } = require("../dist/agent-runtime.js");
const { runProjectMemorySelfTest } = require("../dist/project-memory.js");
const { runTaskAgentSessionSelfTest } = require("../dist/task-agent-sessions.js");
const { runRuntimeToolSyncSelfTest } = require("../dist/runtime-tool-sync.js");
const { runExecutionKernelSelfTest, runExecutionKernelCancellationSelfTest } = require("../dist/execution-kernel.js");
const { runCollaborationResilienceSelfTest, runCollaborationResilienceIntegrationSelfTest } = require("../dist/collaboration-resilience.js");
const { runReliabilityLedgerSelfTest } = require("../dist/reliability-ledger.js");
const { runProductionReliabilityDrills } = require("../dist/reliability-drills.js");
const { runSoakTestSelfTest } = require("../dist/soak-test.js");

async function main() {
  const result = runCoordinatorProtocolSelfTest();
  const defaultConfig = defaultOrchestratorConfig();
  const cronResult = runCronDailyDevProtocolSelfTest();
  const collaborationResult = runCollaborationProtocolSelfTest();
  const groupMemoryStorageRecovery = runGroupMemoryStorageRecoverySelfTest();
  const globalAgentIntentResult = runGlobalAgentIntentSelfTest();
  const groupMemoryCompactionResult = runGroupMemoryCompactionSelfTest();
  const groupMemoryCompactionIntegration = await runGroupMemoryCompactionIntegrationSelfTest();
  const groupMemoryCompactionStress = await runGroupMemoryCompactionStressSelfTest();
  const agentRuntimeSession = runAgentRuntimeSessionSelfTest();
  const projectMemory = runProjectMemorySelfTest();
  const taskAgentSession = runTaskAgentSessionSelfTest();
  const runtimeToolSync = runRuntimeToolSyncSelfTest();
  const executionKernel = runExecutionKernelSelfTest();
  const executionKernelCancellation = await runExecutionKernelCancellationSelfTest();
  const collaborationResilience = runCollaborationResilienceSelfTest();
  const collaborationResilienceIntegration = runCollaborationResilienceIntegrationSelfTest();
  const reliabilityLedger = runReliabilityLedgerSelfTest();
  const productionReliabilityDrills = runProductionReliabilityDrills();
  const soakTest = runSoakTestSelfTest();

  assert.ok(result.pass, "Coordinator 协议自测未通过");
  assert.strictEqual(defaultConfig.fallbackToRules, true, "规则主 Agent 降级默认应开启");
  assert.ok(cronResult.pass, "定时 daily_dev 协议自测未通过");
  assert.ok(collaborationResult.pass, "协作闭环协议自测未通过");
  assert.ok(groupMemoryStorageRecovery.pass, "群聊记忆原子写入/备份恢复自测未通过");
  assert.ok(globalAgentIntentResult.passed, "全局 Agent 对话/执行意图边界自测未通过");
  assert.ok(groupMemoryCompactionResult.pass, "群聊会话记忆压缩自测未通过");
  assert.ok(groupMemoryCompactionIntegration.pass, "群聊会话记忆异步集成自测未通过");
  assert.ok(groupMemoryCompactionStress.pass, "群聊记忆长会话/漂移压力自测未通过");
  assert.ok(agentRuntimeSession.pass, "外部 Agent 原生会话续跑自测未通过");
  assert.ok(projectMemory.pass, "独立项目记忆压缩自测未通过");
  assert.ok(taskAgentSession.pass, "任务级 Agent 会话生命周期自测未通过");
  assert.ok(runtimeToolSync.pass, "Codex 统一网关与密钥隔离自测未通过");
  assert.ok(executionKernel.pass, "开发执行内核检查点/回滚/绿灯自测未通过");
  assert.ok(executionKernelCancellation.pass, "开发执行内核真实取消自测未通过");
  assert.ok(collaborationResilience.pass, "群聊原生续跑/冲突保护/执行器恢复自测未通过");
  assert.ok(collaborationResilienceIntegration.pass, "群聊冲突共享 worktree 集成自测未通过");
  assert.ok(reliabilityLedger.pass, "生产可靠性账本/幂等/租约自测未通过");
  assert.ok(productionReliabilityDrills.pass, "生产级 E2E 与故障演练未通过");
  assert.ok(soakTest.pass, "24 小时稳定性浸泡测试聚合与报告自测未通过");

  console.log(JSON.stringify({
    ok: true,
    defaultFallbackToRules: defaultConfig.fallbackToRules,
    cronDailyDevProtocol: cronResult,
    collaborationProtocol: collaborationResult,
    groupMemoryStorageRecovery,
    globalAgentIntent: globalAgentIntentResult,
    groupMemoryCompaction: groupMemoryCompactionResult,
    groupMemoryCompactionIntegration,
    groupMemoryCompactionStress,
    agentRuntimeSession,
    projectMemory,
    taskAgentSession,
    runtimeToolSync,
    executionKernel,
    executionKernelCancellation,
    collaborationResilience,
    collaborationResilienceIntegration,
    reliabilityLedger,
    productionReliabilityDrills,
    soakTest,
    assignments: result.assignments,
    phases: result.coordinationPlan?.phases || [],
    llmDocumentGuardPass: result.llmDocumentGuardPass,
    shortDocBackendFirstPass: result.shortDocBackendFirstPass,
    shortDocExecutionOrder: result.shortDocExecutionOrder,
    documentFindings: result.documentFindings || [],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
