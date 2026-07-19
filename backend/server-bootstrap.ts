// Mechanically extracted startup recovery and scheduler bootstrap.
export function bootstrapServerRuntime(startupCollabCtx: any, port: number, deps: any) {
  const {
    CCM_DIR,
    CONFIGS_DIR,
    bootstrapGlobalAgentMemoryForServer,
    bootstrapGroupSessionLifecycleJournals,
    conversationTurnControl,
    ensureRoleSkillsInstalled,
    listTaskAgentInvocationEdges,
    listTaskAgentSessions,
    loadFeishuConfig,
    migrateConfigDirectory,
    migrateTomlCredentials,
    path,
    reconcileGroupSessionLifecycleAgentCancellations,
    reconcileMemoryContextConsumptionReceipts,
    reconcileMemoryContextConsumptionRecoveries,
    reconcileTaskAgentContinuationSoak,
    reconcileTaskAgentInvocationRecovery,
    recoverChildTypedMemoryDispatchWal,
    recoverGroupTypedMemoryArtifactTransactionsFleet,
    recoverPetGenerationJobs,
    refreshEnvPath,
    resumeSoakTest,
    resumeTaskQueues,
    saveFeishuConfig,
    startAgentRecoveryMonitor,
    startCronScheduler,
    startGlobalMissionSupervisionForServer,
    startGroupSessionRetentionMaintenanceScheduler,
    startReliabilityDrillScheduler,
    startTaskWatchdog,
    startUsabilityArchiveScheduler,
    toolManager
  } = deps;
  const recoveredConversationTurns = conversationTurnControl.recoverInterrupted();
  if (recoveredConversationTurns.recovered > 0) {
    console.log(`[会话消息队列] 已恢复 ${recoveredConversationTurns.recovered} 条服务重启前发送中的消息`);
  }
  const petGenerationRecovery = recoverPetGenerationJobs();
  if (petGenerationRecovery.recovered > 0) console.log(`[宠物生成] 标记 ${petGenerationRecovery.recovered} 个中断任务等待重试`);
  refreshEnvPath();
  const roleSkills = ensureRoleSkillsInstalled({ force: true });
  console.log(`[角色 Skill] 已就绪 ${roleSkills.available.length} 个${roleSkills.installed.length ? `，更新 ${roleSkills.installed.length} 个` : ""}`);
  const credentialMigration = migrateConfigDirectory(CONFIGS_DIR);
  const controlBotMigration = migrateTomlCredentials(path.join(CCM_DIR, "control-bot", "config.toml"));
  const protectedFeishuConfig = loadFeishuConfig();
  if (Object.keys(protectedFeishuConfig || {}).length) saveFeishuConfig(protectedFeishuConfig);
  const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
  if (migratedCredentials > 0) console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
  toolManager.loadTools().catch((e: any) => console.error("[ToolManager]", e.message));
  const typedMemoryArtifactRecovery = recoverGroupTypedMemoryArtifactTransactionsFleet();
  if (typedMemoryArtifactRecovery.checked > 0) {
    console.log(`[记忆多工件事务] 检查 ${typedMemoryArtifactRecovery.checked} 个会话：恢复 ${typedMemoryArtifactRecovery.recovered}，清理 ${typedMemoryArtifactRecovery.cleaned}，当前 ${typedMemoryArtifactRecovery.current}，失败 ${typedMemoryArtifactRecovery.failed}`);
  }
  const lifecycleJournalBootstrap = bootstrapGroupSessionLifecycleJournals();
  if (lifecycleJournalBootstrap.checked > 0) {
    console.log(`[会话生命周期日志] 检查 ${lifecycleJournalBootstrap.checked} 个头：锚定 ${lifecycleJournalBootstrap.adopted}，有效 ${lifecycleJournalBootstrap.current}，失败 ${lifecycleJournalBootstrap.failed}`);
  }
  const lifecycleAgentReconciliation = reconcileGroupSessionLifecycleAgentCancellations();
  if (lifecycleAgentReconciliation.checked > 0) {
    console.log(`[会话生命周期撤销] 检查 ${lifecycleAgentReconciliation.checked} 个会话作用域：有效 ${lifecycleAgentReconciliation.active}，撤销 ${lifecycleAgentReconciliation.revoked}，停止任务 ${lifecycleAgentReconciliation.taskCount}`);
  }
  startCronScheduler(startupCollabCtx);
  startTaskWatchdog(startupCollabCtx);
  const autoAgentRecoveryMonitor = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_AGENT_RECOVERY_MONITOR || ""));
  if (autoAgentRecoveryMonitor) {
    startAgentRecoveryMonitor(startupCollabCtx);
  } else {
    console.log("[执行通道恢复监控] 默认关闭；执行通道探针仅在用户点击“复检执行通道”或手动运行恢复监控时触发");
  }
  const globalMemoryBootstrap = bootstrapGlobalAgentMemoryForServer();
  if (globalMemoryBootstrap.total > 0) console.log(`[全局记忆] 启动迁移/同步 ${globalMemoryBootstrap.migrated}/${globalMemoryBootstrap.total} 个历史会话`);
  const missionSupervisor = startGlobalMissionSupervisionForServer(startupCollabCtx);
  if (missionSupervisor.resumed > 0) console.log(`[全局任务监工] 启动恢复 ${missionSupervisor.resumed} 个异步监督任务`);
  startReliabilityDrillScheduler();
  startUsabilityArchiveScheduler();
  startGroupSessionRetentionMaintenanceScheduler();
  const typedMemoryDispatchRecovery = recoverChildTypedMemoryDispatchWal();
  if (typedMemoryDispatchRecovery.total > 0) {
    console.log(`[记忆派发 WAL] 检查 ${typedMemoryDispatchRecovery.total} 条：恢复提交 ${typedMemoryDispatchRecovery.recovered}，不确定 ${typedMemoryDispatchRecovery.uncertain}，过期 ${typedMemoryDispatchRecovery.expired}`);
  }
  const invocationRecovery = reconcileTaskAgentInvocationRecovery();
  if (invocationRecovery.checked > 0) {
    console.log(`[子 Agent 调用谱系] 检查 ${invocationRecovery.checked} 条：恢复 ${invocationRecovery.recovered}，不确定 ${invocationRecovery.uncertain}，活跃 ${invocationRecovery.active}，待定 ${invocationRecovery.pending}，重连 ${invocationRecovery.relinked}，隔离 ${invocationRecovery.quarantined}`);
  }
  const continuationSoakRecovery = reconcileTaskAgentContinuationSoak({
    invocationEdges: listTaskAgentInvocationEdges({}).edges,
    taskAgentSessions: listTaskAgentSessions(),
  });
  if (continuationSoakRecovery.checked > 0) {
    console.log(`[续接 Soak] 检查 ${continuationSoakRecovery.checked} 条：补录 ${continuationSoakRecovery.recorded}，幂等 ${continuationSoakRecovery.idempotent}，失败 ${continuationSoakRecovery.failed}`);
  }
  const memoryReceiptReconciliation = reconcileMemoryContextConsumptionReceipts({ prune: true });
  if (memoryReceiptReconciliation.summary.receiptFileCount > 0 || memoryReceiptReconciliation.summary.referencedMissingCount > 0) {
    const summary = memoryReceiptReconciliation.summary;
    console.log(`[模型记忆加载回执] 对账 ${summary.receiptFileCount} 个文件：有效引用 ${summary.referencedValidCount}，缺失 ${summary.referencedMissingCount}，无效 ${summary.referencedInvalidCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，跳过 ${summary.skippedCount}`);
  }
  const memoryReceiptRecoveryInventory = reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true });
  if (memoryReceiptRecoveryInventory.summary.count > 0) {
    const summary = memoryReceiptRecoveryInventory.summary;
    console.log(`[模型记忆加载补救] 恢复 ${summary.recoveredCount}，阻断 ${summary.blockedCount}，运行 ${summary.runningCount}，中断 ${summary.interruptedCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，无效 ${summary.invalidCount}，禁止整任务重放 ${summary.replaySuppressedCount}`);
  }
  const soakResume = resumeSoakTest();
  if (soakResume.resumed) console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
  const resumeResult = resumeTaskQueues(startupCollabCtx);
  if (resumeResult.total > 0) {
    console.log(
      `[任务队列] 启动恢复检查 ${resumeResult.total} 个未完成任务：`
      + `已自动接上 ${resumeResult.auto_resumed || resumeResult.resumed || 0} 个，`
      + `等待确认 ${resumeResult.manual_pending || 0} 个，`
      + `跳过 ${resumeResult.skipped || 0} 个`,
    );
  }
}
