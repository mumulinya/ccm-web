#!/usr/bin/env node
const os = require("os");
const path = require("path");
const fs = require("fs");
const globalMemoryTestDir = path.join(os.tmpdir(), `ccm-global-memory-smoke-${process.pid}`);
process.env.CCM_GLOBAL_AGENT_MEMORY_DIR = globalMemoryTestDir;
process.env.CCM_MEMORY_CONTROL_DIR = path.join(globalMemoryTestDir, "control");
process.env.CCM_AGENT_QUALITY_DIR = path.join(globalMemoryTestDir, "agent-quality");
process.on("exit", () => { try { fs.rmSync(globalMemoryTestDir, { recursive: true, force: true }); } catch {} });
const assert = require("assert");
const { deriveTaskLifecycle, runCollaborationProtocolSelfTest, runGroupMemoryStorageRecoverySelfTest } = require("../dist/modules/collaboration.js");
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
const { runToolManagerRuntimeSelfTest } = require("../dist/tool-manager.js");
const { runExecutionKernelSelfTest, runExecutionKernelCancellationSelfTest } = require("../dist/execution-kernel.js");
const { runCollaborationResilienceSelfTest, runCollaborationResilienceIntegrationSelfTest } = require("../dist/collaboration-resilience.js");
const { runReliabilityLedgerSelfTest } = require("../dist/reliability-ledger.js");
const { runProductionReliabilityDrills } = require("../dist/reliability-drills.js");
const { runSoakTestSelfTest } = require("../dist/soak-test.js");
const { runProcessLifecycleSelfTest } = require("../dist/process-lifecycle.js");
const { runGlobalAgentLoopSelfTest } = require("../dist/global-agent-loop.js");
const { runGlobalMissionSupervisorSelfTest, runGlobalMissionSupervisorAsyncSelfTest } = require("../dist/global-mission-supervisor.js");
const { runGlobalAgentMemorySelfTest, runGlobalAgentMemoryStressSelfTest } = require("../dist/global-agent-memory.js");
const { runAgentQualityCenterSelfTest } = require("../dist/agent-quality-center.js");
const { runAgentReasoningLoopSelfTest } = require("../dist/agent-reasoning-loop.js");
const { runGlobalMemoryControlSelfTest } = require("../dist/modules/memory-control-center.js");
const { runSlashCommandSelfTest } = require("../dist/modules/slash-commands.js");

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
  const toolManagerRuntime = runToolManagerRuntimeSelfTest();
  const executionKernel = runExecutionKernelSelfTest();
  const executionKernelCancellation = await runExecutionKernelCancellationSelfTest();
  const collaborationResilience = runCollaborationResilienceSelfTest();
  const collaborationResilienceIntegration = runCollaborationResilienceIntegrationSelfTest();
  const reliabilityLedger = runReliabilityLedgerSelfTest();
  const productionReliabilityDrills = runProductionReliabilityDrills();
  const soakTest = runSoakTestSelfTest();
  const processLifecycle = runProcessLifecycleSelfTest();
  const globalAgentLoop = await runGlobalAgentLoopSelfTest();
  const globalMissionSupervisor = runGlobalMissionSupervisorSelfTest();
  const globalMissionSupervisorAsyncE2E = await runGlobalMissionSupervisorAsyncSelfTest();
  const globalAgentMemory = runGlobalAgentMemorySelfTest();
  const globalAgentMemoryStress = runGlobalAgentMemoryStressSelfTest();
  const globalMemoryControl = runGlobalMemoryControlSelfTest();
  const agentQualityCenter = runAgentQualityCenterSelfTest();
  const agentReasoningLoop = runAgentReasoningLoopSelfTest();
  const slashCommandCenter = runSlashCommandSelfTest();
  const taskLifecycle = {
    waitingDependencyKeepsSession: deriveTaskLifecycle({ status: "in_progress", delivery_summary: { agent_qa_open_count: 1 } }).state === "waiting_dependency",
    reworkKeepsSession: deriveTaskLifecycle({ status: "in_progress", delivery_summary: { rework_count: 1 } }).keepsSession === true,
    failedKeepsSession: deriveTaskLifecycle({ status: "failed", delivery_summary: {} }).keepsSession === true,
    acceptedCompletionClosesSession: deriveTaskLifecycle({ status: "done", delivery_summary: { acceptance_gate_passed: true } }).keepsSession === false,
    falseCompletionIsNotTerminal: deriveTaskLifecycle({ status: "done", delivery_summary: { acceptance_gate_passed: false } }).terminal === false,
  };

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
  assert.ok(toolManagerRuntime.pass, "ToolManager MCP 真实工具诊断自测未通过");
  assert.ok(executionKernel.pass, "开发执行内核检查点/回滚/绿灯自测未通过");
  assert.ok(executionKernelCancellation.pass, "开发执行内核真实取消自测未通过");
  assert.ok(collaborationResilience.pass, "群聊原生续跑/冲突保护/执行器恢复自测未通过");
  assert.ok(collaborationResilienceIntegration.pass, "群聊冲突共享 worktree 集成自测未通过");
  assert.ok(reliabilityLedger.pass, "生产可靠性账本/幂等/租约自测未通过");
  assert.ok(productionReliabilityDrills.pass, "生产级 E2E 与故障演练未通过");
  assert.ok(soakTest.pass, "24 小时稳定性浸泡测试聚合与报告自测未通过");
  assert.ok(processLifecycle.pass, "进程生命周期与重启分类自测未通过");
  assert.ok(globalAgentLoop.pass, "全局 Agent Agentic Loop 多步执行与授权边界自测未通过");
  assert.ok(globalMissionSupervisor.pass, "全局任务最终交付门禁与固定报告自测未通过");
  assert.ok(globalMissionSupervisorAsyncE2E.pass, "全局任务异步监工、恢复与持久化 E2E 未通过");
  assert.ok(globalAgentMemory.pass, "全局 Agent 长期记忆、隐私、溯源与恢复自测未通过");
  assert.ok(globalAgentMemoryStress.pass, "全局 Agent 长会话增量压缩与防漂移压力测试未通过");
  assert.ok(globalMemoryControl.pass, "记忆控制中心全局记忆编辑、锁定、删除和审计自测未通过");
  assert.ok(agentQualityCenter.pass, "Agent 决策质量、低置信度与目标落地门禁自测未通过");
  assert.ok(agentReasoningLoop.pass, "Agent 推理、澄清、重规划、偏差与恢复复核自测未通过");
  assert.ok(slashCommandCenter.pass, "Slash Command 命令中心解析、作用域与安全边界自测未通过");
  assert.ok(Object.values(taskLifecycle).every(Boolean), "群聊任务统一生命周期与会话关闭门禁自测未通过");

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
    toolManagerRuntime,
    executionKernel,
    executionKernelCancellation,
    collaborationResilience,
    collaborationResilienceIntegration,
    reliabilityLedger,
    productionReliabilityDrills,
    soakTest,
    processLifecycle,
    globalAgentLoop,
    globalMissionSupervisor,
    globalMissionSupervisorAsyncE2E,
    globalAgentMemory,
    globalAgentMemoryStress,
    globalMemoryControl,
    agentQualityCenter,
    agentReasoningLoop,
    slashCommandCenter,
    taskLifecycle: { pass: Object.values(taskLifecycle).every(Boolean), checks: taskLifecycle },
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
