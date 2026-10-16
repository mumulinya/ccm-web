"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapServerRuntime = bootstrapServerRuntime;
// Mechanically extracted startup recovery and scheduler bootstrap.
const session_task_timeline_1 = require("./tasks/session-task-timeline");
const task_conversation_projection_1 = require("./system/task-conversation-projection");
const task_session_store_1 = require("./modules/collaboration/task-session-store");
const agent_run_store_1 = require("./agents/agent-run-store");
const agent_run_supervisor_1 = require("./agents/agent-run-supervisor");
const agent_heartbeat_coordinator_1 = require("./agents/agent-heartbeat-coordinator");
const agent_routine_recovery_1 = require("./agents/agent-routine-recovery");
const agent_governance_store_1 = require("./agents/agent-governance-store");
const dispatch_startup_barrier_1 = require("./agents/dispatch-startup-barrier");
async function yieldToStartupLoop() {
    await new Promise(resolve => setImmediate(resolve));
    if ((0, dispatch_startup_barrier_1.dispatchStartupStatus)().state === "stopped")
        throw new Error("服务已停止，取消启动恢复");
}
async function runDeferredTaskRecovery(startupCollabCtx, deps) {
    const { resumeTaskQueues } = deps;
    try {
        console.log('[启动恢复] 开始恢复任务上下文（后台分片）');
        const taskContextRecovery = await (0, session_task_timeline_1.recoverTaskContextProjectorsAsync)();
        if (taskContextRecovery.checked > 0 || taskContextRecovery.outbox.published > 0) {
            console.log(`[任务上下文投影] 检查 ${taskContextRecovery.checked} 个任务：当前 ${taskContextRecovery.current}，追赶 ${taskContextRecovery.caughtUp}，漂移 ${taskContextRecovery.drifted}，发布 ${taskContextRecovery.outbox.published}`);
        }
        await yieldToStartupLoop();
        console.log('[启动恢复] 开始同步任务会话投影（后台分片）');
        const conversationProjectionRecovery = await (0, task_conversation_projection_1.reconcileTaskConversationProjectionsAsync)();
        if (conversationProjectionRecovery.checked > 0) {
            console.log(`[任务会话投影] 检查 ${conversationProjectionRecovery.checked} 个任务：同步 ${conversationProjectionRecovery.synced}，当前 ${conversationProjectionRecovery.unchanged}，跳过 ${conversationProjectionRecovery.skipped}，失败 ${conversationProjectionRecovery.failed}`);
        }
        await yieldToStartupLoop();
        console.log('[启动恢复] 开始恢复任务队列（后台）');
        const resumeResult = resumeTaskQueues(startupCollabCtx);
        if (resumeResult.total > 0) {
            console.log(`[任务队列] 启动恢复检查 ${resumeResult.total} 个未完成任务：`
                + `已自动接上 ${resumeResult.auto_resumed || resumeResult.resumed || 0} 个，`
                + `等待确认 ${resumeResult.manual_pending || 0} 个，`
                + `跳过 ${resumeResult.skipped || 0} 个`);
        }
    }
    catch (error) {
        // Recovery is best-effort. A corrupt/large historical record must not make
        // the web console unavailable; the next explicit maintenance/restart can
        // retry it and the error remains visible in the server log.
        console.error(`[启动恢复] 后台任务恢复失败：${error?.stack || error?.message || error}`);
    }
}
async function bootstrapServerRuntime(startupCollabCtx, port, deps) {
    require('./system/performance-monitor').startPerformanceMonitor();
    require('./system/metrics-performance-summary').startMetricsPerformanceSummary();
    require('./core/task-store-checkpoint').startTaskStoreCheckpoints();
    require('./system/performance-monitor').markPerformanceReady('http');
    // Prepare the bounded read index without delaying HTTP or execution recovery.
    void require('./system/readonly-performance-service').readTaskRunSummaryOffThread(require('./modules/collaboration/task-run-store').taskRunStorePath()).catch(() => { });
    const scopeContinuations = [];
    const { CCM_DIR, CONFIGS_DIR, bootstrapGlobalAgentMemoryForServer, bootstrapGroupSessionLifecycleJournals, conversationTurnControl, ensureRoleSkillsInstalled, listTaskAgentInvocationEdges, listTaskAgentSessions, loadFeishuConfig, migrateConfigDirectory, migrateTomlCredentials, path, reconcileGroupSessionLifecycleAgentCancellations, reconcileMemoryContextConsumptionReceipts, reconcileMemoryContextConsumptionRecoveries, reconcileInterruptedProjectMainTasks, reconcileTaskAgentContinuationSoak, reconcileTaskAgentInvocationRecovery, processAgentHeartbeatWake, recoverChildTypedMemoryDispatchWal, recoverGroupTypedMemoryArtifactTransactionsFleet, refreshEnvPath, resumeSoakTest, resumeTaskQueues, saveFeishuConfig, startAgentRecoveryMonitor, startAutomationScheduler, startGlobalMissionSupervisionForServer, startGroupSessionRetentionMaintenanceScheduler, startReliabilityDrillScheduler, startTaskWatchdog, startUsabilityArchiveScheduler, toolManager } = deps;
    const recoveredConversationTurns = conversationTurnControl.recoverInterrupted({ createdBefore: Date.now() - process.uptime() * 1000 });
    if (recoveredConversationTurns.recovered > 0) {
        console.log(`[会话消息队列] 已恢复 ${recoveredConversationTurns.recovered} 条服务重启前发送中的消息`);
    }
    refreshEnvPath();
    await yieldToStartupLoop();
    // Materialize terminal task sessions in the background. This only exposes
    // already-finished tasks and never creates a session for an active run.
    if (/^(1|true|yes|on)$/i.test(String(process.env.CCM_STARTUP_FULL_TASK_RECOVERY || '')))
        setImmediate(() => {
            try {
                const result = (0, task_session_store_1.reconcileTaskSessions)();
                if (result.created > 0)
                    console.log(`[任务会话] 启动补齐 ${result.created} 个终态任务会话`);
            }
            catch (error) {
                console.warn(`[任务会话] 启动补齐失败：${error?.message || error}`);
            }
        });
    const roleSkills = ensureRoleSkillsInstalled({ force: true });
    console.log(`[角色 Skill] 已就绪 ${roleSkills.available.length} 个${roleSkills.installed.length ? `，更新 ${roleSkills.installed.length} 个` : ""}`);
    await yieldToStartupLoop();
    const credentialMigration = migrateConfigDirectory(CONFIGS_DIR);
    const controlBotMigration = migrateTomlCredentials(path.join(CCM_DIR, "control-bot", "config.toml"));
    const protectedFeishuConfig = loadFeishuConfig();
    if (Object.keys(protectedFeishuConfig || {}).length)
        saveFeishuConfig(protectedFeishuConfig);
    const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
    if (migratedCredentials > 0)
        console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
    toolManager.loadTools().catch((e) => console.error("[ToolManager]", e.message));
    await yieldToStartupLoop();
    const typedMemoryArtifactRecovery = recoverGroupTypedMemoryArtifactTransactionsFleet();
    if (typedMemoryArtifactRecovery.checked > 0) {
        console.log(`[记忆多工件事务] 检查 ${typedMemoryArtifactRecovery.checked} 个会话：恢复 ${typedMemoryArtifactRecovery.recovered}，清理 ${typedMemoryArtifactRecovery.cleaned}，当前 ${typedMemoryArtifactRecovery.current}，失败 ${typedMemoryArtifactRecovery.failed}`);
    }
    await yieldToStartupLoop();
    const lifecycleJournalBootstrap = bootstrapGroupSessionLifecycleJournals();
    if (lifecycleJournalBootstrap.checked > 0) {
        console.log(`[会话生命周期日志] 检查 ${lifecycleJournalBootstrap.checked} 个头：锚定 ${lifecycleJournalBootstrap.adopted}，有效 ${lifecycleJournalBootstrap.current}，失败 ${lifecycleJournalBootstrap.failed}`);
    }
    await yieldToStartupLoop();
    const lifecycleAgentReconciliation = reconcileGroupSessionLifecycleAgentCancellations();
    if (lifecycleAgentReconciliation.checked > 0) {
        console.log(`[会话生命周期撤销] 检查 ${lifecycleAgentReconciliation.checked} 个会话作用域：有效 ${lifecycleAgentReconciliation.active}，撤销 ${lifecycleAgentReconciliation.revoked}，停止任务 ${lifecycleAgentReconciliation.taskCount}`);
    }
    await yieldToStartupLoop();
    const autoAgentRecoveryMonitor = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_AGENT_RECOVERY_MONITOR || ""));
    if (!autoAgentRecoveryMonitor) {
        console.log("[执行通道恢复监控] 默认关闭；执行通道探针仅在用户点击“复检执行通道”或手动运行恢复监控时触发");
    }
    startReliabilityDrillScheduler();
    startUsabilityArchiveScheduler();
    startGroupSessionRetentionMaintenanceScheduler();
    const typedMemoryDispatchRecovery = recoverChildTypedMemoryDispatchWal();
    if (typedMemoryDispatchRecovery.total > 0) {
        console.log(`[记忆派发 WAL] 检查 ${typedMemoryDispatchRecovery.total} 条：恢复提交 ${typedMemoryDispatchRecovery.recovered}，不确定 ${typedMemoryDispatchRecovery.uncertain}，过期 ${typedMemoryDispatchRecovery.expired}`);
    }
    await yieldToStartupLoop();
    const invocationRecovery = reconcileTaskAgentInvocationRecovery();
    if (invocationRecovery.checked > 0) {
        console.log(`[子 Agent 调用谱系] 检查 ${invocationRecovery.checked} 条：恢复 ${invocationRecovery.recovered}，不确定 ${invocationRecovery.uncertain}，活跃 ${invocationRecovery.active}，待定 ${invocationRecovery.pending}，重连 ${invocationRecovery.relinked}，隔离 ${invocationRecovery.quarantined}`);
    }
    await yieldToStartupLoop();
    const continuationSoakRecovery = reconcileTaskAgentContinuationSoak({
        invocationEdges: listTaskAgentInvocationEdges({}).edges,
        taskAgentSessions: listTaskAgentSessions(),
    });
    if (continuationSoakRecovery.checked > 0) {
        console.log(`[续接 Soak] 检查 ${continuationSoakRecovery.checked} 条：补录 ${continuationSoakRecovery.recorded}，幂等 ${continuationSoakRecovery.idempotent}，失败 ${continuationSoakRecovery.failed}`);
    }
    await yieldToStartupLoop();
    const memoryReceiptReconciliation = reconcileMemoryContextConsumptionReceipts({ prune: true });
    if (memoryReceiptReconciliation.summary.receiptFileCount > 0 || memoryReceiptReconciliation.summary.referencedMissingCount > 0) {
        const summary = memoryReceiptReconciliation.summary;
        console.log(`[模型记忆加载回执] 对账 ${summary.receiptFileCount} 个文件：有效引用 ${summary.referencedValidCount}，缺失 ${summary.referencedMissingCount}，无效 ${summary.referencedInvalidCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，跳过 ${summary.skippedCount}`);
    }
    await yieldToStartupLoop();
    console.log('[启动恢复] 开始对账模型记忆补救');
    const memoryReceiptRecoveryInventory = reconcileMemoryContextConsumptionRecoveries({ prune: true, reconcileInterrupted: true });
    if (memoryReceiptRecoveryInventory.summary.count > 0) {
        const summary = memoryReceiptRecoveryInventory.summary;
        console.log(`[模型记忆加载补救] 恢复 ${summary.recoveredCount}，阻断 ${summary.blockedCount}，运行 ${summary.runningCount}，中断 ${summary.interruptedCount}，孤儿 ${summary.orphanCount}，清理 ${summary.prunedCount}，无效 ${summary.invalidCount}，禁止整任务重放 ${summary.replaySuppressedCount}`);
    }
    await yieldToStartupLoop();
    console.log('[启动恢复] 开始恢复稳定性测试');
    const soakResume = resumeSoakTest();
    if (soakResume.resumed)
        console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
    await yieldToStartupLoop();
    console.log('[启动恢复] 开始检查项目主 Agent');
    const projectMainRecovery = reconcileInterruptedProjectMainTasks();
    if (projectMainRecovery.checked > 0) {
        console.log(`[项目主 Agent] 启动检查 ${projectMainRecovery.checked} 个中断编排：`
            + `安全暂停 ${projectMainRecovery.interrupted} 个，`
            + `仍由其他实例执行 ${projectMainRecovery.active_elsewhere} 个`);
    }
    // A single historical task can contain a very large event chain and its
    // synchronous SQLite rebuild cannot be pre-empted by JavaScript.  Running
    // that pass automatically after every restart therefore still makes an
    // otherwise healthy HTTP server appear hung.  Keep it opt-in for an
    // operator-controlled maintenance boot; normal startup relies on the
    // incremental event/outbox paths and remains immediately responsive.
    const fullTaskRecovery = /^(1|true|yes|on)$/i.test(String(process.env.CCM_STARTUP_FULL_TASK_RECOVERY || ""));
    return (0, dispatch_startup_barrier_1.runDispatchStartup)([
        { name: "legacy_runs", run: () => (0, agent_run_store_1.reconcileLegacyAgentRuns)() },
        { name: "run_leases", run: () => (0, agent_run_store_1.reconcileAgentRunLeases)() },
        { name: "heartbeat_claims", run: () => (0, agent_heartbeat_coordinator_1.requeueStaleAgentHeartbeats)() },
        { name: "checkouts_delivery", run: () => {
                (0, agent_governance_store_1.reconcileAgentTaskCheckouts)();
                require("./modules/projects/dispatch-delivery-recovery").reconcileInterruptedDispatchDeliveries();
                require("./modules/collaboration/dispatch-task-delivery-confirmation").reconcileDispatchTaskDeliveryDecisions();
            } },
        { name: "scope_applications", run: () => require("./agents/dispatch-scope-service").reconcileDispatchScopeApplications({
                readTask: id => require('./core/db').getTaskById(id),
                updateTask: (id, patch) => require("./modules/collaboration/collaboration-task-service").updateTask(id, patch),
                continueRun: async (run, request) => {
                    scopeContinuations.push({ runId: run.runId, requestId: request.id });
                    return { mode: "startup_deferred" };
                },
            }, require('./core/task-query').listUnfinishedTasks()) },
        { name: "task_run_consistency", run: () => require('./agents/agent-consistency-recovery').reconcileStartupConsistency() },
        { name: "routine_projection", run: () => require("./agents/dispatch-routine-consistency").reconcileDispatchRoutineTasks() },
        // This only validates and persists recovery wakes. Consumers are still
        // stopped, so no Runtime can start before the barrier becomes ready.
        { name: "recovery_evidence", run: () => (0, agent_run_supervisor_1.reconcileAgentRunSupervisor)({ autoRecover: true }) },
        { name: 'global_history_memory', run: async () => {
                await yieldToStartupLoop();
                const result = await bootstrapGlobalAgentMemoryForServer();
                if (result.total > 0)
                    console.log(`[全局记忆] 启动迁移/同步 ${result.migrated}/${result.total} 个历史会话`);
            } },
    ]).then(async () => {
        for (const item of scopeContinuations) {
            await require("./agents/agent-execution-coordinator").continueApprovedDispatchScope(item.runId, item.requestId);
        }
        if (typeof processAgentHeartbeatWake === "function")
            (0, agent_heartbeat_coordinator_1.startAgentHeartbeatProcessor)({ processor: processAgentHeartbeatWake });
        (0, agent_run_supervisor_1.startAgentRunSupervisor)();
        require('./review/service').startReviewRecovery();
        // Incremental unfinished-task recovery is independent of historical
        // projector maintenance. Only the latter remains opt-in.
        resumeTaskQueues(startupCollabCtx);
        await (0, agent_routine_recovery_1.recoverAgentRoutineRuns)(startupCollabCtx);
        startAutomationScheduler(startupCollabCtx);
        startTaskWatchdog(startupCollabCtx);
        if (autoAgentRecoveryMonitor)
            startAgentRecoveryMonitor(startupCollabCtx);
        startGlobalMissionSupervisionForServer(startupCollabCtx);
        if (fullTaskRecovery)
            void runDeferredTaskRecovery(startupCollabCtx, { resumeTaskQueues });
        console.log("[执行恢复] 对账完成，执行消费者已启动");
        require('./system/performance-monitor').markPerformanceReady('execution');
    }).catch(error => {
        (0, dispatch_startup_barrier_1.failDispatchStartup)(error, "consumers");
        (0, agent_heartbeat_coordinator_1.stopAgentHeartbeatProcessor)();
        (0, agent_run_supervisor_1.stopAgentRunSupervisor)();
        require("./modules/scheduling/automation-scheduler").stopAutomationScheduler();
        require("./modules/collaboration/collaboration-task-runtime").stopTaskWatchdog();
        require("./modules/collaboration/collaboration-task-runtime").stopAgentRecoveryMonitor();
        require("./modules/global/global-agent").stopGlobalMissionSupervisionForServer();
        console.error(`[执行恢复] 启动失败，新执行已阻断：${error?.code || "startup_failed"}`);
        throw error;
    });
}
//# sourceMappingURL=server-bootstrap.js.map