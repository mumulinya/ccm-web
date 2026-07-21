
// Mechanically extracted from server.ts; preserves native and external runner behavior.
import { createAgentRunnerSupport } from "./server-agent-runner-support";
import { readThirdPartyMemoryUsageReports, THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES } from "./integrations/third-party-memory-snapshot";
import { updateProjectMemoryFromReceipt } from "./projects/memory";

export function createAgentRunnerRuntime(deps: any) {
  const {
    normalizeToolSelection,
    hasToolSelection,
    buildAgentRunnerRuntimeToolPayload,
    normalizeVerificationCommands,
    extractVerificationCommandsFromMessage,
    buildAgentCliAllowedTools,
    isSpawnPermissionError,
    nativeContinuationDoneFields,
    callAgentViaExternalRunner,
    getProjectToolSelection,
    findRuntimeToolSnapshotPath,
    readJsonFileSafe,
    runtimeToolSnapshotFromAudit,
    normalizeAgentRunnerRuntimeToolSnapshot,
    getProjectVerificationCommandsForRunner,
    runIndependentProjectVerification,
    buildProjectToolContext,
    sendRuntimeToolDispatchBlocked,
    ensureAgentRunnerDirs,
    createAgentRunnerRequest,
    waitForAgentRunnerResult,
    recordNativeCapacityRefreshOutcome,
    callAgentViaExternalRunnerRaw,
    runManagedAgentContinuation,
    continueAgentToolCalls,
  } = createAgentRunnerSupport(deps);

  const {
    AGENT_RUNNER_DIR,
    AGENT_RUNNER_REQUESTS_DIR,
    AGENT_RUNNER_RESULTS_DIR,
    UPLOAD_DIR,
    acknowledgeProviderMemoryChannelLaunch,
    appendDirectAgentDispatchTranscript,
    bindProjectRunAgentSession,
    bindProviderMemoryChannelLaunch,
    broadcastPetSpeech,
    buildAgentCommand,
    buildNativeSessionContinuationEvidence,
    buildProjectConversationBrief,
    buildProjectExecutionBrief,
    buildRuntimeToolDispatchGate,
    buildRuntimeToolSyncPrompt,
    buildToolAuthorizationPayload,
    captureAgentRuntimeVersionSnapshot,
    completeDirectAgentDispatch,
    createDirectAgentDispatchRequest,
    createFileChangeSnapshot,
    createProjectChatRun,
    detectAgentCommandFailure,
    extractNativeModelCapabilityReceipt,
    extractProviderToolAccessEvidence,
    fs,
    getAgentCommandLabel,
    getAgentRunActivityDuration,
    getAgentRuntime,
    getFileChanges,
    getRuntimeExecutionEnv,
    isSafeVerificationCommand,
    loadProjectConfigs,
    markDirectAgentDispatchStarted,
    normalizeAgentCommandOutput,
    normalizeAgentRuntimeId,
    path,
    persistBoundedOutput,
    prepareProviderMemoryChannel,
    publicProjectChatRun,
    readMemoryContextConsumptionReceipt,
    recordMetric,
    recordProjectSessionProviderUsage,
    recordModelCapabilityRefreshOutcome,
    recordRuntimeToolSyncAudit,
    recordTaskAgentSessionTurn,
    recordVerifiedNativeModelCapabilityReceipt,
    recoverMemoryContextConsumptionReceipt,
    registerExternalRunnerRequest,
    runManagedCommand,
    runToolCallLoop,
    sanitizeExecutionEnv,
    saveProjectChatRuns,
    sendJson,
    setAgentActivity,
    spawn,
    syncRuntimeTools,
    terminateManagedChildProcess,
    toolManager,
    trackManagedChildProcess,
    verifyNativeSessionContinuationEvidence,
    verifyProviderMemoryChannelEvidence,
    writeSse
  } = deps;

  const usageWithProvenance = (usage: any, runnerKind: string, continuationEvidence: any, runtimeVersionSnapshot: any = null) => {
    if (!usage || typeof usage !== "object") return usage || null;
    return {
      ...usage,
      provenance: {
        origin: runnerKind === "external_agent_runner" ? "external_agent_runner" : "native_cli",
        runnerKind,
        accountBacked: false,
        liveExecutionAuthorized: false,
        runnerAdmissionVerified: false,
        providerRuntimeIdentityChecksum: String(
          continuationEvidence?.providerRuntimeIdentityChecksum
          || runtimeVersionSnapshot?.executableIdentityChecksum
          || ""
        ),
        capturedAt: new Date().toISOString(),
      },
    };
  };

  async function callAgent(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget: any = null) {
    const background = workspaceTarget?.background === true || workspaceTarget?.silent === true;
    if (!background) setAgentActivity(
      projectName,
      workspaceTarget?.taskId || workspaceTarget?.executionId || workspaceTarget?.tab === "groups" ? "building" : "working",
      `${getAgentRuntime(agentType).label} 正在${workspaceTarget?.taskId || workspaceTarget?.executionId ? "执行任务" : "处理消息"}`,
      workspaceTarget || { tab: "projects", project: projectName },
      getAgentRunActivityDuration(timeoutMs),
      { runtime: agentType, actorKind: "third-party", displayName: `${projectName} · ${getAgentRuntime(agentType).label}` },
    );
    const startedAt = Date.now();
    const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const memorySystemPromptFile = `${tmpMsg}.memory-system.txt`;
    const memoryDeveloperInstructionsFile = `${tmpMsg}.memory-developer.txt`;
    const memoryReceiptRecoveryPromptFile = `${tmpMsg}.memory-receipt-recovery.txt`;
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const taskId = String(workspaceTarget?.taskId || workspaceTarget?.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(workspaceTarget?.executionId || workspaceTarget?.taskId || "");
    const metricGroupId = String(workspaceTarget?.groupId || workspaceTarget?.group_id || "");
    const metricContext = {
      scopeType: metricGroupId ? "group" : "project",
      scopeId: metricGroupId || projectName,
      groupId: metricGroupId,
      role: String(workspaceTarget?.role || workspaceTarget?.agentRole || (metricGroupId ? "member_agent" : "project_agent")),
      source: String(workspaceTarget?.metricSource || workspaceTarget?.source || (metricGroupId ? "group-agent" : "project-agent")),
      runtime: agentType,
      traceId: workspaceTarget?.traceId || workspaceTarget?.trace_id || "",
      taskId,
      executionId,
    };
    const durableDirectDispatch = workspaceTarget?.durableDispatch === true
      ? createDirectAgentDispatchRequest({
          projectName,
          message,
          workDir,
          agentType,
          timeoutMs,
          taskId,
          executionId,
          taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
          groupId: metricGroupId,
          requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
          nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
          trustedMemoryProviderChannelRequired: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
          trustedMemoryProviderAcknowledgementRequired: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
          memoryContextConsumptionReceiptRequired: workspaceTarget?.memoryContextConsumptionReceiptRequired === true,
          memoryContextConsumptionChallenge: workspaceTarget?.memoryContextConsumptionChallenge || null,
          trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
          trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
        })
      : null;
    let durableDirectDispatchStarted = false;
    let durableDirectDispatchCompleted = false;
    let providerMemoryChannelEvidence: any = null;
    let memoryContextConsumptionReceipt: any = null;
    let memoryContextConsumptionRecovery: any = null;
    let memoryReceiptRecoveryProviderOutput = "";
    if (durableDirectDispatch) {
      if (executionId) registerExternalRunnerRequest(executionId, durableDirectDispatch.id);
      workspaceTarget?.onRunnerRequestCreated?.(durableDirectDispatch.id);
    }
  
    try {
      const runtimeVersionSnapshot = captureAgentRuntimeVersionSnapshot(agentType);
      const providerMemoryChannel = prepareProviderMemoryChannel(agentType, message, {
        required: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
        envelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
        sourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
        runtimeVersionSnapshot,
      });
      if (!providerMemoryChannel.ready) throw new Error(`Provider memory channel blocked: ${providerMemoryChannel.issues.join(",")}`);
      fs.writeFileSync(tmpMsg, providerMemoryChannel.userPrompt, "utf-8");
      if (providerMemoryChannel.systemPrompt) fs.writeFileSync(memorySystemPromptFile, providerMemoryChannel.systemPrompt, "utf-8");
      if (providerMemoryChannel.developerPrompt) fs.writeFileSync(memoryDeveloperInstructionsFile, providerMemoryChannel.developerPrompt, "utf-8");
      const cmd = buildAgentCommand(agentType, tmpMsg, {
        mcpConfigPath: workspaceTarget?.mcpConfigPath,
        appendSystemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
        developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
        ...(workspaceTarget?.agentSession || {}),
      });
      providerMemoryChannelEvidence = bindProviderMemoryChannelLaunch(providerMemoryChannel, {
        command: cmd,
        systemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
        developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
        runnerRequestId: durableDirectDispatch?.id || "",
        runtimeVersionSnapshot,
      });
      if (workspaceTarget?.trustedMemoryProviderChannelRequired === true && providerMemoryChannelEvidence.status !== "ready") {
        throw new Error(`Provider memory channel launch unverified: ${providerMemoryChannelEvidence.issues.join(",")}`);
      }
      const managed = await runManagedCommand({
        taskId,
        executionId,
        command: cmd,
        cwd: safeCwd,
        timeoutMs: timeoutMs || 300000,
        maxOutputBytes: Number(workspaceTarget?.maxOutputBytes || 2 * 1024 * 1024),
        env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), workspaceTarget?.envAllowlist || []),
        project: projectName,
        agentType,
        source: workspaceTarget?.probe ? "agent-probe" : "project-agent",
        commandLabel: getAgentCommandLabel(agentType),
        title: String(workspaceTarget?.title || message || "").slice(0, 120),
        onStarted: ({ pid, startedAt }) => {
          durableDirectDispatchStarted = true;
          if (durableDirectDispatch) markDirectAgentDispatchStarted(durableDirectDispatch.id, { runnerPid: pid, startedAt });
        },
        onStdout: (text) => {
          if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "stdout", { text });
        },
        onStderr: (text) => {
          if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "stderr", { text });
        },
      });
      try { fs.unlinkSync(tmpMsg); } catch {}
      try { fs.unlinkSync(memorySystemPromptFile); } catch {}
      try { fs.unlinkSync(memoryDeveloperInstructionsFile); } catch {}
      const normalized = normalizeAgentCommandOutput(agentType, managed.stdout, { runtimeVersionSnapshot });
      const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: durableDirectDispatch?.id || "",
        requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
        returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
        providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
        providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
        expectedProviderContractId: workspaceTarget?.agentSession?.expectedProviderContractId || workspaceTarget?.agentSession?.providerContractId || "",
        nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
        runnerSuccess: true,
      });
      const deliveryUsage = usageWithProvenance(normalized.usage, "direct_cli", nativeContinuationEvidence, runtimeVersionSnapshot);
      providerMemoryChannelEvidence = acknowledgeProviderMemoryChannelLaunch(providerMemoryChannelEvidence, {
        executionSucceeded: true,
        runnerStarted: durableDirectDispatch ? durableDirectDispatchStarted : true,
        exitCode: managed.exitCode,
        providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
        nativeContinuationEvidence,
        required: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
      });
      if (workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true) {
        const acknowledgement = verifyProviderMemoryChannelEvidence(providerMemoryChannelEvidence, {
          provider: agentType,
          originalPrompt: message,
          envelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
          sourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
          runnerRequestId: durableDirectDispatch?.id || "",
          required: true,
          requireAcknowledgement: true,
          providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
          nativeContinuationEvidence,
          executionSucceeded: true,
        });
        if (!acknowledgement.valid) throw new Error(`Provider memory acknowledgement blocked: ${acknowledgement.issues.join(",")}`);
      }
      if (workspaceTarget?.memoryContextConsumptionReceiptRequired === true) {
        let memoryReceipt = readMemoryContextConsumptionReceipt(workspaceTarget?.memoryContextConsumptionChallenge, {
          groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
          groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
          taskId,
          executionId,
          project: projectName,
          taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
        });
        if (!memoryReceipt.valid) {
          const recovery = await recoverMemoryContextConsumptionReceipt({
            challenge: workspaceTarget?.memoryContextConsumptionChallenge,
            provider: agentType,
            runnerRequestId: durableDirectDispatch?.id || `direct-${taskId}`,
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
            taskId,
            executionId,
            project: projectName,
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            nativeContinuationEvidence,
            providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
            trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
            trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
            providerWorkCompleted: true,
          }, async recoveryRequest => {
            fs.writeFileSync(memoryReceiptRecoveryPromptFile, recoveryRequest.prompt, "utf-8");
            if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "memory_receipt_recovery_started", { recoveryId: recoveryRequest.recoveryId, nativeSessionId: recoveryRequest.nativeSessionId });
            const recoveryCommand = buildAgentCommand(agentType, memoryReceiptRecoveryPromptFile, {
              cliAllowedTools: Array.from(new Set([
                ...buildAgentCliAllowedTools(projectName, message),
                ...THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES,
              ])),
              mcpConfigPath: workspaceTarget?.mcpConfigPath,
              persistSession: true,
              resumeSession: true,
              sessionId: recoveryRequest.nativeSessionId,
            });
            const recoveryRun = await runManagedCommand({
              taskId: `${taskId}:memory-receipt-recovery`,
              command: recoveryCommand,
              cwd: safeCwd,
              timeoutMs: Math.min(60_000, Math.max(15_000, timeoutMs || 300_000)),
              maxOutputBytes: 512 * 1024,
              env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), workspaceTarget?.envAllowlist || []),
              project: projectName,
              agentType,
              source: "memory-receipt-recovery",
              commandLabel: getAgentCommandLabel(agentType),
              title: "Memory receipt recovery",
            });
            memoryReceiptRecoveryProviderOutput = String(recoveryRun.stdout || "");
            const recoveryOutput = normalizeAgentCommandOutput(agentType, memoryReceiptRecoveryProviderOutput, { runtimeVersionSnapshot });
            return {
              success: true,
              exitCode: recoveryRun.exitCode,
              output: recoveryOutput.output,
              nativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
              returnedNativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
              providerOutputContractEvidence: recoveryOutput.providerOutputContractEvidence || null,
              providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
            };
          });
          memoryContextConsumptionRecovery = recovery.record;
          if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, recovery.recovered ? "memory_receipt_recovery_completed" : "memory_receipt_recovery_blocked", { recoveryId: recovery.record?.recovery_id || "", status: recovery.record?.status || "blocked" });
          if (!recovery.recovered) {
            const error: any = new Error(`Memory context consumption receipt recovery blocked: ${(recovery.record?.issues || memoryReceipt.issues).join(",")}`);
            error.code = "CCM_MEMORY_CONTEXT_CONSUMPTION_RECEIPT_RECOVERY_BLOCKED";
            error.memoryContextConsumptionRecovery = recovery.record;
            throw error;
          }
          memoryReceipt = readMemoryContextConsumptionReceipt(workspaceTarget?.memoryContextConsumptionChallenge, {
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
            taskId,
            executionId,
            project: projectName,
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
          });
        }
        memoryContextConsumptionReceipt = memoryReceipt.receipt;
      }
      const providerToolAccessEvidence = extractProviderToolAccessEvidence(agentType, [String(managed.stdout || ""), memoryReceiptRecoveryProviderOutput].filter(Boolean).join("\n"), {
        runnerRequestId: durableDirectDispatch?.id || "",
        groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
        groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
        taskId,
        executionId,
        taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
      });
      const nativeModelCapabilityReceipt = extractNativeModelCapabilityReceipt(agentType, managed.stdout, {
        runner: "direct-cli",
        runnerRequestId: durableDirectDispatch?.id || "",
        groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
        taskId,
        executionId,
        taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
      });
      const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
        ? recordVerifiedNativeModelCapabilityReceipt(nativeModelCapabilityReceipt, {
            provider: normalizeAgentRuntimeId(agentType),
            runnerRequestId: durableDirectDispatch?.id || "",
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            taskId,
            executionId,
            model: workspaceTarget?.model || workspaceTarget?.modelId || "",
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
          })
        : null;
      const modelCapabilityRefreshOutcome = recordNativeCapacityRefreshOutcome(agentType, workspaceTarget?.model || workspaceTarget?.modelId || "", nativeModelCapabilityRecord, {
        taskId,
        executionId,
        taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
        nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
      });
      const bounded = persistBoundedOutput(taskId, normalized.output, Number(workspaceTarget?.maxContextOutputBytes || 256 * 1024));
      if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
      const toolLoop = await continueAgentToolCalls({
        output: bounded.content,
        nativeSessionId: nativeContinuationEvidence.nativeSessionReusable
          ? normalized.sessionId || workspaceTarget?.agentSession?.sessionId || ""
          : "",
        projectName,
        workDir,
        agentType,
        timeoutMs: timeoutMs || 300000,
        allowedTools: workspaceTarget?.allowedTools,
        mcpConfigPath: workspaceTarget?.mcpConfigPath,
        agentSession: workspaceTarget?.agentSession,
        taskId,
        executionId,
        envAllowlist: workspaceTarget?.envAllowlist || [],
        maxOutputBytes: workspaceTarget?.maxOutputBytes,
        maxContextOutputBytes: workspaceTarget?.maxContextOutputBytes,
      });
      if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "tool_loop_completed", { nativeSessionId: toolLoop.nativeSessionId || normalized.sessionId || "" });
      let output = toolLoop.output;
      if (!workspaceTarget?.skipIndependentVerification && !background && !/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
        if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "verification_started", { projectName });
        output += await runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType);
        if (durableDirectDispatch) appendDirectAgentDispatchTranscript(durableDirectDispatch.id, "verification_completed", { projectName });
      }
      const fileChanges = getFileChanges(projectName, changeSnapshot);
      const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
        ? toolLoop.nativeSessionId || normalized.sessionId || workspaceTarget?.agentSession?.sessionId || ""
        : "";
      if (durableDirectDispatch) {
        completeDirectAgentDispatch(durableDirectDispatch.id, {
          success: true,
          output,
          nativeSessionId: durableNativeSessionId,
          nativeContinuationEvidence,
          nativeModelCapabilityReceipt,
          nativeModelCapabilityRecord,
          providerToolAccessEvidence,
          providerMemoryChannelEvidence,
          memoryContextConsumptionReceipt,
          memoryContextConsumptionRecovery,
          usage: deliveryUsage,
          exitCode: managed.exitCode,
          signal: managed.signal,
        });
        durableDirectDispatchCompleted = true;
      }
      workspaceTarget?.onDone?.({
        runnerRequestId: durableDirectDispatch?.id || "",
        nativeSessionId: durableNativeSessionId,
        ...nativeContinuationDoneFields(nativeContinuationEvidence),
        nativeModelCapabilityReceipt,
        nativeModelCapabilityRecord,
        modelCapabilityRefreshOutcome,
        providerToolAccessEvidence,
        providerMemoryChannelEvidence,
        memoryContextConsumptionReceipt,
        memoryContextConsumptionRecovery,
        isError: false,
        runnerStarted: durableDirectDispatch ? durableDirectDispatchStarted : true,
        fileChanges,
        usage: deliveryUsage,
      });
      recordMetric(projectName, {
        ...metricContext,
        success: true,
        durationMs: Date.now() - startedAt,
        fileChangeCount: fileChanges?.count || 0,
        usage: deliveryUsage,
      });
      if (!background) {
        broadcastPetSpeech(projectName, { role: "assistant", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "happy", "任务完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
      }
      try { fs.unlinkSync(memoryReceiptRecoveryPromptFile); } catch {}
      return output;
    } catch (e: any) {
      try { fs.unlinkSync(tmpMsg); } catch {}
      try { fs.unlinkSync(memorySystemPromptFile); } catch {}
      try { fs.unlinkSync(memoryDeveloperInstructionsFile); } catch {}
      try { fs.unlinkSync(memoryReceiptRecoveryPromptFile); } catch {}
      const failedDirectContinuationEvidence = buildNativeSessionContinuationEvidence({
        provider: normalizeAgentRuntimeId(agentType),
        runnerRequestId: durableDirectDispatch?.id || "",
        requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
        nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
        runnerSuccess: false,
      });
      if (durableDirectDispatch && durableDirectDispatchStarted && !durableDirectDispatchCompleted) {
        completeDirectAgentDispatch(durableDirectDispatch.id, {
          success: false,
          error: String(e?.message || e),
          output: String(e?.stdout || e?.stderr || e?.message || ""),
          exitCode: e?.exitCode,
          signal: e?.signal,
          nativeContinuationEvidence: failedDirectContinuationEvidence,
          providerMemoryChannelEvidence,
          memoryContextConsumptionRecovery: e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery,
        });
        durableDirectDispatchCompleted = true;
      }
      if (isSpawnPermissionError(e) && (e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery)?.suppress_task_replay !== true) {
        try {
          const runner = await callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, workspaceTarget?.allowedTools, workspaceTarget?.mcpConfigPath, workspaceTarget?.agentSession, {
            taskId,
            executionId,
            taskAgentSessionId: workspaceTarget?.taskAgentSessionId || workspaceTarget?.task_agent_session_id || "",
            groupId: workspaceTarget?.groupId || workspaceTarget?.group_id || "",
            groupSessionId: workspaceTarget?.groupSessionId || workspaceTarget?.group_session_id || "",
            sessionLifecycleFence: workspaceTarget?.sessionLifecycleFence || workspaceTarget?.session_lifecycle_fence || null,
            model: workspaceTarget?.model || workspaceTarget?.modelId || "",
            runtimeToolSnapshot: workspaceTarget?.runtimeToolSnapshot || workspaceTarget?.runtime_tool_snapshot || null,
            runtimeToolDispatchGate: workspaceTarget?.runtimeToolDispatchGate || workspaceTarget?.runtime_tool_dispatch_gate || workspaceTarget?.dispatchGate || null,
            trustedMemoryProviderChannelRequired: workspaceTarget?.trustedMemoryProviderChannelRequired === true,
            trustedMemoryProviderAcknowledgementRequired: workspaceTarget?.trustedMemoryProviderAcknowledgementRequired === true,
            memoryContextConsumptionReceiptRequired: workspaceTarget?.memoryContextConsumptionReceiptRequired === true,
            memoryContextConsumptionChallenge: workspaceTarget?.memoryContextConsumptionChallenge || null,
            trustedMemoryEnvelopeChecksum: workspaceTarget?.trustedMemoryEnvelopeChecksum || "",
            trustedMemoryEnvelopeSourceChecksum: workspaceTarget?.trustedMemoryEnvelopeSourceChecksum || "",
            onRunnerRequestCreated: workspaceTarget?.onRunnerRequestCreated,
          });
          const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
          const deliveryUsage = usageWithProvenance(runner.usage, "external_agent_runner", runner.nativeContinuationEvidence, runner.nativeContinuationEvidence?.providerRuntimeVersionSnapshot);
          workspaceTarget?.onDone?.({
            runnerRequestId: runner.runnerRequestId || "",
            nativeSessionId: runner.nativeSessionId || "",
            ...nativeContinuationDoneFields(runner.nativeContinuationEvidence),
            nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null,
            nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null,
            modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null,
            providerMemoryChannelEvidence: runner.providerMemoryChannelEvidence || null,
            memoryContextConsumptionReceipt: runner.memoryContextConsumptionReceipt || null,
            memoryContextConsumptionRecovery: runner.memoryContextConsumptionRecovery || null,
            isError: false,
            runnerStarted: true,
            fileChanges,
            usage: deliveryUsage,
          });
          recordMetric(projectName, {
            ...metricContext,
            success: true,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0,
            usage: deliveryUsage,
          });
          if (!background) {
            broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "project" });
            setAgentActivity(projectName, "happy", "外部 Runner 任务完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
          }
          return runner.output;
        } catch (runnerError: any) {
          const failedContinuationEvidence = buildNativeSessionContinuationEvidence({
            provider: normalizeAgentRuntimeId(agentType),
            runnerRequestId: runnerError?.runnerRequestId || "",
            requestedNativeSessionId: workspaceTarget?.agentSession?.sessionId || "",
            nativeResumeRequested: workspaceTarget?.agentSession?.resumeSession === true,
            runnerSuccess: false,
          });
          workspaceTarget?.onDone?.({ runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), memoryContextConsumptionRecovery: runnerError?.memoryContextConsumptionRecovery || null, isError: true, error: runnerError?.message || String(runnerError) });
          const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
          recordMetric(projectName, {
            ...metricContext,
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
            error: runnerError?.message || String(runnerError),
          });
          if (!background) {
            broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
            setAgentActivity(projectName, "error", "外部 Runner 错误");
          }
          return output;
        }
      }
      const output = e.killed || e.signal === "SIGTERM"
        ? `[${projectName}] Agent 响应超时，请稍后重试`
        : `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
      workspaceTarget?.onDone?.({ runnerRequestId: durableDirectDispatch?.id || "", runnerStarted: durableDirectDispatchStarted, nativeSessionId: failedDirectContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedDirectContinuationEvidence), memoryContextConsumptionRecovery: e?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery, isError: true, error: e?.message || String(e) });
      recordMetric(projectName, {
        ...metricContext,
        success: false,
        durationMs: Date.now() - startedAt,
        fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
        error: e?.message || String(e),
      });
      if (!background) {
        broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "error", "错误");
      }
      return output;
    }
  }
  
  function callAgentForGroupStream(projectName: string, message: string, workDir: string, agentType: string, options: any = {}) {
    const groupId = options.groupId;
    setAgentActivity(
      projectName,
      options.petState || "building",
      options.detail || `${getAgentRuntime(agentType).label} 正在执行协作任务`,
      groupId ? { tab: "groups", groupId } : { tab: "groups" },
      getAgentRunActivityDuration(options.timeoutMs),
      { runtime: agentType, actorKind: options.actorKind || "third-party", displayName: options.petDisplayName || `${projectName} · ${getAgentRuntime(agentType).label}`, source: "group" },
    );
    const startedAt = Date.now();
    const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = buildAgentCommand(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...(options.agentSession || {}) });
    const taskId = String(options.taskId || options.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(options.executionId || options.taskId || "");
    const launchRuntimeVersionSnapshot = captureAgentRuntimeVersionSnapshot(agentType);
    const metricContext = {
      scopeType: groupId ? "group" : "project",
      scopeId: groupId || projectName,
      groupId: String(groupId || ""),
      role: String(options.role || options.agentRole || "member_agent"),
      source: String(options.metricSource || options.source || "group-agent"),
      runtime: agentType,
      traceId: options.traceId || options.trace_id || "",
      taskId,
      executionId,
    };
    const durableGroupDispatch = options.durableDispatch === true
      ? createDirectAgentDispatchRequest({
          projectName,
          message,
          workDir,
          agentType,
          timeoutMs: options.timeoutMs || 300_000,
          taskId,
          executionId,
          taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
          groupId: String(groupId || ""),
          requestedNativeSessionId: options.agentSession?.sessionId || "",
          nativeResumeRequested: options.agentSession?.resumeSession === true,
        })
      : null;
    let durableGroupDispatchStarted = false;
    let durableGroupDispatchCompleted = false;
    if (durableGroupDispatch) {
      if (executionId) registerExternalRunnerRequest(executionId, durableGroupDispatch.id);
      options.onRunnerRequestCreated?.(durableGroupDispatch.id);
    }
    const streamRes = options.res;
    const workEvents: any[] = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushWorkEvent = (kind: string, text: string, extra: any = {}) => {
      const event = {
        id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        time: new Date().toISOString(),
        agent: projectName,
        kind,
        text: String(text || "").slice(0, 2400),
        ...extra,
      };
      workEvents.push(event);
      if (workEvents.length > 80) workEvents.splice(0, workEvents.length - 80);
      writeSse(streamRes, { type: "agent_work_event", agent: projectName, event });
      return event;
    };
    const thinkingText = `🧠 ${projectName} 正在思考...`;
    pushWorkEvent("status", thinkingText);
    writeSse(streamRes, { type: "status", text: thinkingText, agent: projectName });
    broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 正在思考...`, source: "group" });
  
    return new Promise<string>((resolve) => {
      let child: any = null;
      let stopTracking = () => {};
      try {
        child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), options.envAllowlist || []) });
        child.once("spawn", () => {
          durableGroupDispatchStarted = true;
          if (durableGroupDispatch) markDirectAgentDispatchStarted(durableGroupDispatch.id, { runnerPid: child.pid, startedAt: new Date().toISOString() });
        });
        stopTracking = trackManagedChildProcess(taskId, executionId, child, {
          project: projectName,
          agentType,
          source: options.probe ? "agent-probe" : "group-agent",
          cwd: safeCwd,
          timeoutMs: options.timeoutMs || 300000,
          commandLabel: getAgentCommandLabel(agentType),
          title: String(options.title || message || "").slice(0, 120),
        });
      } catch (spawnError: any) {
        if (durableGroupDispatch && !durableGroupDispatchCompleted) {
          completeDirectAgentDispatch(durableGroupDispatch.id, { success: false, error: String(spawnError?.message || spawnError) });
          durableGroupDispatchCompleted = true;
        }
        if (!isSpawnPermissionError(spawnError)) {
          const text = `❌ 错误: ${spawnError.message || spawnError}`;
          recordMetric(projectName, { ...metricContext, success: false, durationMs: Date.now() - startedAt, fileChangeCount: 0, error: spawnError?.message || String(spawnError) });
          writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
          resolve(text);
          return;
        }
        const runnerText = `🧩 ${projectName} 交给外部 Agent Runner 执行...`;
        pushWorkEvent("status", runnerText);
        writeSse(streamRes, { type: "status", text: runnerText, agent: projectName });
        callAgentViaExternalRunner(projectName, message, workDir, agentType, options.timeoutMs || 300000, options.allowedTools, options.mcpConfigPath, options.agentSession, {
          taskId,
          executionId,
          model: options.model || options.modelId || "",
          taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
          groupId: options.groupId || options.group_id || "",
          groupSessionId: options.groupSessionId || options.group_session_id || "",
          sessionLifecycleFence: options.sessionLifecycleFence || options.session_lifecycle_fence || null,
          runtimeToolSnapshot: options.runtimeToolSnapshot || options.runtime_tool_snapshot || null,
          runtimeToolDispatchGate: options.runtimeToolDispatchGate || options.runtime_tool_dispatch_gate || options.dispatchGate || null,
          onRunnerRequestCreated: options.onRunnerRequestCreated,
          onToolEvent: (event: any) => pushWorkEvent(
            event.type === "tool_result" ? "tool_result" : "status",
            event.text,
            { tool: event.tool || "", round: event.round, ok: event.ok },
          ),
        })
          .then((runner) => {
            const fileChanges = runner.fileChanges || getFileChanges(projectName, changeSnapshot);
            const deliveryUsage = usageWithProvenance(runner.usage, "external_agent_runner", runner.nativeContinuationEvidence, runner.nativeContinuationEvidence?.providerRuntimeVersionSnapshot);
            recordMetric(projectName, {
              ...metricContext,
              success: true,
              durationMs: Date.now() - startedAt,
              fileChangeCount: fileChanges?.count || 0,
              usage: deliveryUsage,
            });
            try {
              if (typeof options.onDone === "function") {
                pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
                options.onDone({ text: runner.output, fileChanges, isError: false, runnerStarted: true, runnerRequestId: runner.runnerRequestId, nativeSessionId: runner.nativeSessionId || "", ...nativeContinuationDoneFields(runner.nativeContinuationEvidence), nativeModelCapabilityReceipt: runner.nativeModelCapabilityReceipt || null, nativeModelCapabilityRecord: runner.nativeModelCapabilityRecord || null, modelCapabilityRefreshOutcome: runner.modelCapabilityRefreshOutcome || null, providerToolAccessEvidence: runner.providerToolAccessEvidence || null, providerMemoryChannelEvidence: runner.providerMemoryChannelEvidence || null, memoryContextConsumptionReceipt: runner.memoryContextConsumptionReceipt || null, memoryContextConsumptionRecovery: runner.memoryContextConsumptionRecovery || null, usage: deliveryUsage, workEvents });
              }
            } catch {}
            writeSse(streamRes, { type: "agent_done", agent: projectName, text: runner.output, fileChanges, messageId: options.messageId, workEvents });
            broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "group" });
            setAgentActivity(projectName, "happy", "外部 Runner 回复完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            resolve(runner.output);
          })
          .catch((runnerError: any) => {
            const text = `❌ Agent Runner 错误: ${runnerError.message || runnerError}`;
            recordMetric(projectName, {
              ...metricContext,
              success: false,
              durationMs: Date.now() - startedAt,
              fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0,
              error: runnerError?.message || String(runnerError),
            });
            try {
              if (typeof options.onDone === "function") {
                pushWorkEvent("error", text, { final: true });
                const failedContinuationEvidence = buildNativeSessionContinuationEvidence({
                  provider: normalizeAgentRuntimeId(agentType),
                  runnerRequestId: runnerError?.runnerRequestId || "",
                  requestedNativeSessionId: options.agentSession?.sessionId || "",
                  nativeResumeRequested: options.agentSession?.resumeSession === true,
                  runnerSuccess: false,
                });
                options.onDone({ text, fileChanges: null, isError: true, runnerRequestId: runnerError?.runnerRequestId || "", runnerStarted: runnerError?.runnerStarted === true, nativeSessionId: failedContinuationEvidence.effectiveNativeSessionId, ...nativeContinuationDoneFields(failedContinuationEvidence), workEvents });
              }
            } catch {}
            writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
            broadcastPetSpeech(projectName, { role: "error", text, final: true, source: "group" });
            setAgentActivity(projectName, "error", "外部 Runner 错误");
            resolve(text);
          });
        return;
      }
      child.stdin.end();
  
      let output = "";
      let stderrOutput = "";
      let settled = false;
      const timeoutId = setTimeout(() => {
        try { if (child?.exitCode === null && child?.signalCode === null) terminateManagedChildProcess(child); } catch {}
        finish("⏰ 响应超时", true).catch(() => {});
      }, options.timeoutMs || 300000);
  
      const finish = async (text: string, isError = false) => {
        if (settled) return;
        settled = true;
        stopTracking();
        clearTimeout(timeoutId);
        try { if (child) terminateManagedChildProcess(child); } catch {}
        try { fs.unlinkSync(tmpMsg); } catch {}
        let finalText = text || output.trim();
        const runtimeVersionSnapshot = launchRuntimeVersionSnapshot;
        const normalized = isError
          ? { output: finalText, sessionId: "", rawSessionId: "", providerOutputContractEvidence: null }
          : normalizeAgentCommandOutput(agentType, finalText, { runtimeVersionSnapshot });
        const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: durableGroupDispatch?.id || "",
          requestedNativeSessionId: options.agentSession?.sessionId || "",
          returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
          providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
          providerRuntimeVersionSnapshot: normalized.providerOutputContractEvidence?.runtimeVersionSnapshot || null,
          expectedProviderContractId: options.agentSession?.expectedProviderContractId || options.agentSession?.providerContractId || "",
          nativeResumeRequested: options.agentSession?.resumeSession === true,
          runnerSuccess: !isError,
        });
        const providerToolAccessEvidence = extractProviderToolAccessEvidence(agentType, output, {
          runnerRequestId: durableGroupDispatch?.id || "",
          groupId: options.groupId || options.group_id || "",
          groupSessionId: options.groupSessionId || options.group_session_id || "",
          taskId,
          executionId,
          taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
          nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        });
        // This direct CLI path does not inject the trusted provider-memory channel.
        const providerMemoryChannelEvidence = null;
        const memoryContextConsumptionReceipt = null;
        const memoryContextConsumptionRecovery = null;
        const nativeModelCapabilityReceipt = isError ? null : extractNativeModelCapabilityReceipt(agentType, output, {
          runner: "direct-cli",
          runnerRequestId: durableGroupDispatch?.id || "",
          groupId: options.groupId || options.group_id || "",
          taskId,
          executionId,
          taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
          nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        });
        const nativeModelCapabilityRecord = nativeModelCapabilityReceipt
          ? recordVerifiedNativeModelCapabilityReceipt(nativeModelCapabilityReceipt, {
              provider: normalizeAgentRuntimeId(agentType),
              runnerRequestId: durableGroupDispatch?.id || "",
              groupId: options.groupId || options.group_id || "",
              taskId,
              executionId,
              taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
              nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            })
          : null;
        const modelCapabilityRefreshOutcome = isError ? null : recordNativeCapacityRefreshOutcome(agentType, options.model || options.modelId || "", nativeModelCapabilityRecord, {
          taskId,
          executionId,
          taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
          nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        });
        finalText = normalized.output;
        finalText = persistBoundedOutput(taskId, finalText, Number(options.maxContextOutputBytes || 256 * 1024)).content;
        if (!isError) {
          if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "tool_loop_started", { nativeSessionId: normalized.sessionId || "" });
          const toolLoop = await continueAgentToolCalls({
            output: finalText,
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable
              ? normalized.sessionId || options.agentSession?.sessionId || ""
              : "",
            projectName,
            workDir,
            agentType,
            timeoutMs: options.timeoutMs || 300000,
            allowedTools: options.allowedTools,
            mcpConfigPath: options.mcpConfigPath,
            agentSession: options.agentSession,
            groupId: options.groupId || options.group_id || "",
            taskId,
            executionId,
            envAllowlist: options.envAllowlist || [],
            maxOutputBytes: options.maxOutputBytes,
            maxContextOutputBytes: options.maxContextOutputBytes,
            onEvent: (event: any) => pushWorkEvent(
              event.type === "tool_result" ? "tool_result" : "status",
              event.text,
              { tool: event.tool || "", round: event.round, ok: event.ok },
            ),
          });
          finalText = toolLoop.output;
          normalized.sessionId = toolLoop.nativeSessionId || normalized.sessionId;
          if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "tool_loop_completed", { nativeSessionId: normalized.sessionId || "" });
          if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
            if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "verification_started", { projectName });
            finalText += await runIndependentProjectVerification(projectName, workDir, options.timeoutMs || 300000, taskId, executionId, agentType);
            if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "verification_completed", { projectName });
          }
        }
        const fileChanges = getFileChanges(projectName, changeSnapshot);
        const durableNativeSessionId = nativeContinuationEvidence.nativeSessionReusable
          ? normalized.sessionId || options.agentSession?.sessionId || ""
          : "";
        const deliveryUsage = usageWithProvenance((normalized as any).usage, "direct_cli", nativeContinuationEvidence, runtimeVersionSnapshot);
        if (durableGroupDispatch && durableGroupDispatchStarted && !durableGroupDispatchCompleted) {
          completeDirectAgentDispatch(durableGroupDispatch.id, {
            success: !isError,
            output: finalText,
            error: isError ? finalText : "",
            nativeSessionId: durableNativeSessionId,
            nativeContinuationEvidence,
            nativeModelCapabilityReceipt,
            nativeModelCapabilityRecord,
            providerToolAccessEvidence,
            usage: deliveryUsage,
          });
          durableGroupDispatchCompleted = true;
        }
        recordMetric(projectName, {
          ...metricContext,
          success: !isError,
          durationMs: Date.now() - startedAt,
          fileChangeCount: fileChanges?.count || 0,
          usage: deliveryUsage,
          error: isError ? finalText : "",
        });
        try {
          if (typeof options.onDone === "function") {
            pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
            options.onDone({ text: finalText, fileChanges, isError, runnerRequestId: durableGroupDispatch?.id || "", runnerStarted: durableGroupDispatch ? durableGroupDispatchStarted : true, nativeSessionId: durableNativeSessionId, ...nativeContinuationDoneFields(nativeContinuationEvidence), nativeModelCapabilityReceipt, nativeModelCapabilityRecord, modelCapabilityRefreshOutcome, providerToolAccessEvidence, providerMemoryChannelEvidence, memoryContextConsumptionReceipt, memoryContextConsumptionRecovery, usage: deliveryUsage, workEvents });
          }
        } catch {}
        writeSse(streamRes, { type: "agent_done", agent: projectName, text: finalText, fileChanges, messageId: options.messageId, workEvents });
        broadcastPetSpeech(projectName, { role: isError ? "error" : "assistant", text: finalText, final: true, source: "group" });
        setAgentActivity(projectName, isError ? "error" : "happy", isError ? "错误" : "群聊回复完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        resolve(finalText);
      };
  
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (!text) return;
        output += text;
        if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "stdout", { text });
        const jsonSessionStream = ["codex", "cursor"].includes(normalizeAgentRuntimeId(agentType)) && !!options.agentSession?.persistSession;
        if (!jsonSessionStream) {
          pushWorkEvent("output", text);
          writeSse(streamRes, { type: "chunk", agent: projectName, text });
          broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
        }
      });
  
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (durableGroupDispatch) appendDirectAgentDispatchTranscript(durableGroupDispatch.id, "stderr", { text });
        stderrOutput = (stderrOutput + text).slice(-12000);
        if (text.trim() && !output.trim()) {
          const runningText = `🧠 ${projectName} 运行中...`;
          pushWorkEvent("status", runningText);
          writeSse(streamRes, { type: "status", text: runningText, agent: projectName });
          broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 运行中...`, source: "group" });
        }
      });
  
      child.on("close", (code) => {
        const failed = typeof code === "number" && code !== 0;
        const text = failed ? (output.trim() || stderrOutput.trim() || `Agent 进程退出，exitCode=${code}`) : output.trim();
        finish(text, failed).catch((err) => finish(`❌ 错误: ${err.message}`, true));
      });
      child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => {}); });
    });
  }
  
  // 流式调用 Agent（SSE）
  function callAgentStream(projectName: string, message: string, workDir: string, agentType: string, res: any, options: any = {}) {
    const startedAt = Date.now();
    const messageMode = String(options.messageMode || options.message_mode || "task");
    const showTaskExperience = messageMode === "task";
    const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
    const projectRun = createProjectChatRun(
      projectName,
      options.userMessage || message,
      workDir,
      String(options.parentRunId || options.parent_run_id || ""),
      String(options.projectSessionId || options.project_session_id || ""),
    );
    projectRun.message_mode = messageMode;
    projectRun.workflow_decision = options.workflowDecision || options.workflow_decision || null;
    saveProjectChatRuns();
    const { session: taskAgentSession, options: taskAgentSessionOptions } = bindProjectRunAgentSession(projectRun, projectName, agentType);
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const baseExecutionBrief = showTaskExperience
      ? buildProjectExecutionBrief(projectName, options.userMessage || message, {
          workDir,
          query: options.userMessage || message,
          verificationHints: getProjectVerificationCommandsForRunner(projectName),
          memoryDeliveryMode: options.memoryDeliveryMode === "mcp" ? "mcp" : "prompt",
          memorySnapshotId: options.memorySnapshotId || "",
        })
        : buildProjectConversationBrief(projectName, options.userMessage || message, {
          analysis: messageMode === "project_analysis",
        });
    const executionBrief = options.projectSessionContext
      ? `${baseExecutionBrief}\n\n${String(options.projectSessionContext)}`
      : baseExecutionBrief;
    fs.writeFileSync(tmpMsg, executionBrief, "utf-8");
  
    const cmd = buildAgentCommand(agentType, tmpMsg, {
      mcpConfigPath: options.mcpConfigPath,
      ...(options.memoryContextConsumptionReceiptRequired === true ? { cliAllowedTools: THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES } : {}),
      ...taskAgentSessionOptions,
    });
  
    const send = (data: any) => writeSse(res, data);
    const workEvents: any[] = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushProjectWorkEvent = (kind: string, text: string, extra: any = {}) => {
      const event = {
        id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        time: new Date().toISOString(),
        agent: projectName,
        kind,
        text: String(text || "").slice(0, 2400),
        ...extra,
      };
      workEvents.push(event);
      if (workEvents.length > 80) workEvents.splice(0, workEvents.length - 80);
      if (showTaskExperience) send({ type: "work_event", event });
      return event;
    };
  
    // 设置 SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    send({ type: "presentation", message_mode: messageMode, show_task_card: showTaskExperience, workflow_decision: projectRun.workflow_decision });
    if (showTaskExperience) send({ type: "task_runtime", run: publicProjectChatRun(projectRun), taskExperience: {
      task_id: projectRun.id,
      trace_id: projectRun.trace_id,
      title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
      goal: String(options.userMessage || "").slice(0, 240),
      status: "in_progress",
      phase: "executing",
      session_ids: [taskAgentSession.id],
      parent_run_id: projectRun.parent_run_id || "",
      rollback_available: !!projectRun.checkpoint_id,
    } });
    if (showTaskExperience) for (const event of workEvents) send({ type: "work_event", event });
  
    // 发送状态事件
    pushProjectWorkEvent("status", "Agent 正在思考...");
    send({ type: "status", text: "Agent 正在思考..." });
    broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
    setAgentActivity(projectName, "working", showTaskExperience ? "正在处理任务" : "正在回复", null, getAgentRunActivityDuration(300000));
  
    const child = spawn(cmd, [], {
      shell: true,
      cwd: safeCwd,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), options.envAllowlist || []),
    });
    const stopProjectChatTracking = trackManagedChildProcess(projectRun.id, projectRun.id, child, {
      project: projectName,
      agentType,
      source: "project-chat",
      cwd: safeCwd,
      timeoutMs: 300000,
      commandLabel: getAgentCommandLabel(agentType),
      title: String(options.userMessage || message || "").slice(0, 120),
    });
    projectRun.child = child;
    projectRun.updated_at = new Date().toISOString();
    saveProjectChatRuns();
  
    // 关闭 stdin（已通过临时文件传入）
    child.stdin.end();
  
    let fullOutput = "";
    let stderrOutput = "";
    let finished = false;
    let timeoutTimer: any = null;
    let lastStderrStatusAt = 0;
    const jsonSessionStream = ["codex", "cursor"].includes(normalizeAgentRuntimeId(agentType)) && !!taskAgentSessionOptions.persistSession;
    const heartbeatTimer = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) {
        try { res.write(": keep-alive\n\n"); } catch {}
      }
    }, 15000);
  
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      if (!text) return;
      fullOutput += text;
      if (jsonSessionStream) return;
      pushProjectWorkEvent("output", text);
      send({ type: "chunk", text });
      broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "project" });
    });
  
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf-8");
      stderrOutput += text;
      const now = Date.now();
      if (text.trim() && now - lastStderrStatusAt > 1500) {
        lastStderrStatusAt = now;
        pushProjectWorkEvent("status", "Agent 处理中...");
        send({ type: "status", text: "Agent 处理中..." });
        broadcastPetSpeech(projectName, { role: "status", text: "Agent 处理中...", source: "project" });
      }
    });
  
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      stopProjectChatTracking();
      if (timeoutTimer) clearTimeout(timeoutTimer);
      clearInterval(heartbeatTimer);
      (async () => {
        try { fs.unlinkSync(tmpMsg); } catch {}
        const runtimeVersionSnapshot = captureAgentRuntimeVersionSnapshot(agentType);
        const normalized = normalizeAgentCommandOutput(agentType, fullOutput.trim(), { runtimeVersionSnapshot });
        const nativeContinuationEvidence = buildNativeSessionContinuationEvidence({
          provider: normalizeAgentRuntimeId(agentType),
          requestedNativeSessionId: taskAgentSessionOptions.sessionId || "",
          returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
          providerOutputContractEvidence: normalized.providerOutputContractEvidence || null,
          providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
          expectedProviderContractId: taskAgentSessionOptions.expectedProviderContractId || taskAgentSessionOptions.providerContractId || "",
          nativeResumeRequested: taskAgentSessionOptions.resumeSession === true,
          runnerSuccess: code === 0,
        });
        const projectUsageAnchorId = `pmsg_${String(projectRun.id || "result")}_assistant`;
        const projectProviderUsage = usageWithProvenance(
          normalized.usage,
          "direct_cli",
          nativeContinuationEvidence,
          runtimeVersionSnapshot,
        );
        if (projectRun.project_session_id && projectProviderUsage) {
          recordProjectSessionProviderUsage(projectName, projectRun.project_session_id, {
            usage: projectProviderUsage,
            provider: normalizeAgentRuntimeId(agentType),
            model: String((normalized as any)?.model || ""),
            generation: Number(projectRun.project_session_generation || 0),
            anchorMessageId: projectUsageAnchorId,
            currentRequest: { role: "user", content: options.userMessage || message },
            fixedContext: {
              executionBrief,
              project: projectName,
              workDir,
              agentType,
            },
            tools: {
              allowedTools: options.allowedTools || [],
              runtimeToolSnapshot: options.runtimeToolSnapshot || options.runtime_tool_snapshot || null,
            },
          });
        }
        let nativeFailure = detectAgentCommandFailure(agentType, fullOutput.trim(), code, stderrOutput);
        let projectMemoryConsumptionReceipt: any = null;
        if (!nativeFailure.failed && options.memoryContextConsumptionReceiptRequired === true) {
          const receiptValidation = readMemoryContextConsumptionReceipt(options.memoryContextConsumptionChallenge, {
            project: projectName,
            projectSessionId: projectRun.project_session_id || "",
            taskAgentSessionId: options.memoryContextConsumptionChallenge?.task_agent_session_id || "",
            memorySnapshotId: options.memorySnapshotId || "",
            memorySnapshotChecksum: options.memorySnapshotChecksum || "",
          });
          if (!receiptValidation.valid) {
            nativeFailure = {
              failed: true,
              message: `第三方 Agent 未完成必需记忆加载，本轮任务不提交：${receiptValidation.issues.join(",")}`,
            };
          } else {
            projectMemoryConsumptionReceipt = receiptValidation.receipt;
            projectRun.memory_context_consumption_receipt = receiptValidation.receipt;
            projectRun.memory_snapshot_id = options.memorySnapshotId || "";
            projectRun.memory_snapshot_checksum = options.memorySnapshotChecksum || "";
          }
        }
        let displayOutput = normalized.output || fullOutput.trim();
        if (nativeFailure.failed) {
          const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: false, error: nativeFailure.message }) || taskAgentSession;
          projectRun.native_session_id = failedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
          projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
          if (jsonSessionStream && displayOutput) {
            pushProjectWorkEvent("output", displayOutput);
            send({ type: "chunk", text: displayOutput });
          }
          const fileChanges = getFileChanges(projectName, changeSnapshot);
          projectRun.status = "failed";
          projectRun.fileChanges = fileChanges;
          projectRun.workEvents = workEvents;
          projectRun.updated_at = new Date().toISOString();
          saveProjectChatRuns();
          recordMetric(projectName, {
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0
          });
          setAgentActivity(projectName, "error", "执行失败");
          pushProjectWorkEvent("error", nativeFailure.message || "Agent 执行失败", { final: true, fileChanges });
          send({ type: "error", text: nativeFailure.message || "Agent 执行失败", fileChanges, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
            task_id: projectRun.id,
            trace_id: projectRun.trace_id,
            title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
            goal: String(options.userMessage || "").slice(0, 240),
            status: "failed",
            phase: "failed",
            session_ids: [failedSession.id],
            parent_run_id: projectRun.parent_run_id || "",
            rollback_available: !!projectRun.checkpoint_id,
          } });
          res.end();
          return;
        }
        let updatedSession = recordTaskAgentSessionTurn(taskAgentSession.id, {
          nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
          nativeContinuationEvidence,
          success: true,
          nativeContinuationUnverified: taskAgentSessionOptions.resumeSession === true
            && nativeContinuationEvidence.nativeContinuationAcknowledged !== true,
        }) || taskAgentSession;
        projectRun.native_session_id = updatedSession.nativeSessionId || "";
        projectRun.resume_mode = updatedSession.resumeMode || projectRun.resume_mode || "";
        if (jsonSessionStream && displayOutput) {
          pushProjectWorkEvent("output", displayOutput);
          send({ type: "chunk", text: displayOutput });
        }
        const toolLoop = await continueAgentToolCalls({
          output: displayOutput,
          nativeSessionId: updatedSession.nativeSessionId || normalized.sessionId || "",
          projectName,
          workDir,
          agentType,
          timeoutMs: 300000,
          allowedTools: options.allowedTools,
          mcpConfigPath: options.mcpConfigPath,
          agentSession: taskAgentSessionOptions,
          groupId: "",
          taskId: projectRun.id,
          executionId: projectRun.id,
          onEvent: (event: any) => pushProjectWorkEvent(
            event.type === "tool_result" ? "tool_result" : "status",
            event.text,
            { tool: event.tool || "", round: event.round, ok: event.ok },
          ),
        });
        const outputWithTools = toolLoop.output;
        if (toolLoop.nativeSessionId && toolLoop.nativeSessionId !== updatedSession.nativeSessionId) {
          updatedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { nativeSessionId: toolLoop.nativeSessionId, success: true }) || updatedSession;
          projectRun.native_session_id = updatedSession.nativeSessionId || toolLoop.nativeSessionId;
          projectRun.resume_mode = updatedSession.resumeMode || projectRun.resume_mode || "";
        }
        const toolAppend = outputWithTools.slice(displayOutput.length);
        if (toolAppend) {
          pushProjectWorkEvent("output", toolAppend);
            send({ type: "chunk", text: toolAppend });
          broadcastPetSpeech(projectName, { role: "assistant", text: toolAppend, mode: "append", source: "project" });
        }
        broadcastPetSpeech(projectName, { role: "assistant", text: "", mode: "append", final: true, source: "project" });
        const fileChanges = getFileChanges(projectName, changeSnapshot);
        if (showTaskExperience && options.memorySnapshotId) {
          const reports = readThirdPartyMemoryUsageReports(options.memorySnapshotId, options.memorySnapshotChecksum || "");
          const candidates = reports.flatMap((report: any) => report.acceptedCandidates || []);
          if (candidates.length) {
            const projectMemory: any = { constraints: [], decisions: [], facts: [], lessons: [], risks: [], openItems: [], contracts: [] };
            const targetKey: Record<string, string> = {
              constraint: "constraints",
              decision: "decisions",
              fact: "facts",
              lesson: "lessons",
              risk: "risks",
              open_item: "openItems",
              contract: "contracts",
            };
            for (const candidate of candidates) {
              const key = targetKey[String(candidate.kind || "")] || "facts";
              projectMemory[key].push({
                content: candidate.content,
                evidence: candidate.evidence,
                reason: `第三方 Agent 记忆候选；sourceMessages=${(candidate.sourceMessageIds || []).join(",")}`,
              });
            }
            try {
              const memory = updateProjectMemoryFromReceipt({
                project: projectName,
                workDir,
                taskId: projectRun.id,
                agent: projectName,
                accepted: true,
                sourceKind: "accepted_project_session_memory_mcp_report",
                actualFiles: fileChanges?.files || fileChanges?.items || [],
                receipt: {
                  status: "done",
                  summary: String(outputWithTools || "项目 Agent 已完成任务").slice(0, 1000),
                  filesChanged: fileChanges?.files || fileChanges?.items || [],
                  memoryUsed: reports.flatMap((report: any) => report.usedIds || []),
                  memoryIgnored: reports.flatMap((report: any) => report.ignoredIds || []),
                  projectMemory,
                },
              });
              projectRun.memory_admission = memory.lastMemoryAdmission || null;
              projectRun.memory_usage_report_ids = reports.map((report: any) => report.id);
            } catch (error: any) {
              projectRun.memory_admission = { decision: "rejected", error: String(error?.message || error) };
            }
          }
        }
        projectRun.status = "done";
        projectRun.fileChanges = fileChanges;
        projectRun.workEvents = workEvents;
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        recordMetric(projectName, {
          success: true,
          durationMs: Date.now() - startedAt,
          fileChangeCount: fileChanges?.count || 0
        });
        setAgentActivity(projectName, "happy", "任务完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        pushProjectWorkEvent("done", "执行完成", { final: true, fileChanges });
        send({ type: "done", fileChanges, workEvents, provider_usage: projectProviderUsage, usage_anchor_id: projectUsageAnchorId, memory_context_consumption_receipt: projectMemoryConsumptionReceipt, run: publicProjectChatRun(projectRun), taskExperience: {
          task_id: projectRun.id,
          trace_id: projectRun.trace_id,
          title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
          goal: String(options.userMessage || "").slice(0, 240),
          status: "done",
          phase: "completed",
          session_ids: [updatedSession.id],
          parent_run_id: projectRun.parent_run_id || "",
          rollback_available: !!projectRun.checkpoint_id,
        } });
        res.end();
      })().catch((err) => {
        pushProjectWorkEvent("error", err.message, { final: true });
          const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
          projectRun.status = "failed";
          projectRun.workEvents = workEvents;
          projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
          projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
          projectRun.updated_at = new Date().toISOString();
          saveProjectChatRuns();
          send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
            task_id: projectRun.id,
            trace_id: projectRun.trace_id,
            title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
            goal: String(options.userMessage || "").slice(0, 240),
            status: "failed",
            phase: "failed",
            session_ids: [failedSession.id],
            parent_run_id: projectRun.parent_run_id || "",
            rollback_available: !!projectRun.checkpoint_id,
          } });
        try { res.end(); } catch {}
      });
    });
  
    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      stopProjectChatTracking();
      if (timeoutTimer) clearTimeout(timeoutTimer);
      clearInterval(heartbeatTimer);
      try { fs.unlinkSync(tmpMsg); } catch {}
      pushProjectWorkEvent("error", err.message, { final: true });
      const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
      projectRun.status = "failed";
      projectRun.workEvents = workEvents;
      projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
      projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
      projectRun.updated_at = new Date().toISOString();
      saveProjectChatRuns();
          send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
            task_id: projectRun.id,
            trace_id: projectRun.trace_id,
            title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
            goal: String(options.userMessage || "").slice(0, 240),
            status: "failed",
            phase: "failed",
            session_ids: [failedSession.id],
            parent_run_id: projectRun.parent_run_id || "",
            rollback_available: !!projectRun.checkpoint_id,
          } });
      recordMetric(projectName, {
        success: false,
        durationMs: Date.now() - startedAt,
        fileChangeCount: getFileChanges(projectName, changeSnapshot)?.count || 0
      });
      broadcastPetSpeech(projectName, { role: "error", text: err.message, final: true, source: "project" });
      setAgentActivity(projectName, "error", "错误");
      res.end();
    });
  
    // 超时处理
    timeoutTimer = setTimeout(() => {
      if (finished) return;
      finished = true;
      stopProjectChatTracking();
      clearInterval(heartbeatTimer);
      try { child.kill(); } catch {}
      try { fs.unlinkSync(tmpMsg); } catch {}
      const failedSession = recordTaskAgentSessionTurn(taskAgentSession.id, { success: false, error: "Agent 响应超时" }) || taskAgentSession;
      projectRun.status = "failed";
      projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
      projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
      projectRun.updated_at = new Date().toISOString();
      saveProjectChatRuns();
      send({ type: "error", text: "Agent 响应超时", run: publicProjectChatRun(projectRun), taskExperience: {
        task_id: projectRun.id,
        trace_id: projectRun.trace_id,
        title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
        goal: String(options.userMessage || "").slice(0, 240),
        status: "failed",
        phase: "failed",
        session_ids: [failedSession.id],
        parent_run_id: projectRun.parent_run_id || "",
        rollback_available: !!projectRun.checkpoint_id,
      } });
      res.end();
    }, 300000);
  }

  return {
    buildProjectToolContext,
    callAgent,
    callAgentForGroupStream,
    callAgentStream,
    sendRuntimeToolDispatchBlocked
  };
}
