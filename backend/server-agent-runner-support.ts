// Support helpers extracted from server-agent-runner.ts (behavior-freeze).
// Contains tool/verification/external-runner plumbing used by the three orchestrators.
import { THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES } from "./integrations/third-party-memory-snapshot";

export function createAgentRunnerSupport(deps: any) {
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

  function normalizeToolSelection(tools: any = {}) {
    const source = tools && typeof tools === "object" ? tools : {};
    return {
      mcp: Array.isArray(source.mcp) ? source.mcp.map((x: any) => String(x).trim()).filter(Boolean) : [],
      skill: Array.isArray(source.skill) ? source.skill.map((x: any) => String(x).trim()).filter(Boolean) : [],
    };
  }

  function hasToolSelection(tools: any = {}) {
    const normalized = normalizeToolSelection(tools);
    return normalized.mcp.length > 0 || normalized.skill.length > 0;
  }

  function buildAgentRunnerRuntimeToolPayload(allowedTools: any = null, mcpConfigPath = "", executionInfo: any = null) {
    const providedSnapshot = executionInfo?.runtimeToolSnapshot || executionInfo?.runtime_tool_snapshot || null;
    const snapshotPath = providedSnapshot ? "" : findRuntimeToolSnapshotPath(mcpConfigPath);
    const loadedSnapshot = providedSnapshot || readJsonFileSafe(snapshotPath) || null;
    const runtimeToolSnapshot = loadedSnapshot
      ? normalizeAgentRunnerRuntimeToolSnapshot({
        ...loadedSnapshot,
        snapshotPath: loadedSnapshot.snapshotPath || loadedSnapshot.snapshot_path || snapshotPath,
        mcpConfigPath: loadedSnapshot.mcpConfigPath || loadedSnapshot.mcp_config_path || mcpConfigPath,
      }, allowedTools, mcpConfigPath)
      : normalizeAgentRunnerRuntimeToolSnapshot({
        snapshotPath,
        mcpConfigPath,
        allowedTools: allowedTools || { mcp: [], skill: [] },
      }, allowedTools, mcpConfigPath);
    const runtimeToolDispatchGate = executionInfo?.runtimeToolDispatchGate
      || executionInfo?.runtime_tool_dispatch_gate
      || runtimeToolSnapshot.dispatchGate
      || runtimeToolSnapshot.dispatch_gate
      || null;
    return {
      runtimeToolSnapshot,
      runtimeToolDispatchGate,
      runtimeToolSnapshotPath: runtimeToolSnapshot.snapshotPath || "",
      runtimeToolSnapshotRequired: !!(mcpConfigPath || runtimeToolSnapshot.snapshotPath || hasToolSelection(allowedTools)),
    };
  }

  function normalizeVerificationCommands(value: any) {
    const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
    const seen = new Set<string>();
    const commands: string[] = [];
    for (const item of raw) {
      const command = String(item || "").trim();
      if (!command || seen.has(command)) continue;
      seen.add(command);
      commands.push(command);
    }
    return commands.slice(0, 8);
  }

  function extractVerificationCommandsFromMessage(message: string) {
    const text = String(message || "");
    const commands: string[] = [];
    const add = (value: string) => {
      for (const part of value.split(/[；;，,]/)) {
        const command = part.trim();
        if (/^(npm run [\w:-]+|mvn \w+|gradle \w+|pytest|go test\b.*|cargo test\b.*)$/i.test(command)) commands.push(command);
      }
    };
    for (const match of text.matchAll(/推荐优先执行的项目验证：([^\n]+)/g)) add(match[1] || "");
    for (const match of text.matchAll(/验证命令：([^\n]+)/g)) add(match[1] || "");
    return normalizeVerificationCommands(commands);
  }

  function buildAgentCliAllowedTools(projectName: string, message = "") {
    const commands = normalizeVerificationCommands([
      ...getProjectVerificationCommandsForRunner(projectName),
      ...extractVerificationCommandsFromMessage(message),
    ]);
    const rules: string[] = [];
    for (const command of commands) {
      rules.push(`Bash(${command})`);
      if (process.platform === "win32") rules.push(`PowerShell(${command})`);
    }
    return Array.from(new Set(rules));
  }

  function isSpawnPermissionError(error: any) {
    const text = `${error?.code || ""} ${error?.message || ""} ${error?.stderr || ""}`;
    return /\bEPERM\b|spawnSync .* EPERM|spawn .* EPERM/i.test(text);
  }

  function nativeContinuationDoneFields(evidence: any) {
    return {
      requestedNativeSessionId: String(evidence?.requestedNativeSessionId || ""),
      returnedNativeSessionId: String(evidence?.returnedNativeSessionId || ""),
      effectiveNativeSessionId: String(evidence?.effectiveNativeSessionId || ""),
      nativeSessionEvidenceSource: String(evidence?.evidenceSource || "missing"),
      nativeResumeRequested: evidence?.nativeResumeRequested === true,
      nativeContinuationAcknowledged: evidence?.nativeContinuationAcknowledged === true,
      nativeSessionReusable: evidence?.nativeSessionReusable === true,
      providerOutputContractStatus: String(evidence?.providerOutputContractStatus || ""),
      providerOutputFormatFingerprint: String(evidence?.providerOutputFormatFingerprint || ""),
      providerRuntimeVersion: String(evidence?.providerRuntimeVersion || ""),
      providerRuntimeVersionStatus: String(evidence?.providerRuntimeVersionStatus || ""),
      providerContractId: String(evidence?.providerContractId || ""),
      expectedProviderContractId: String(evidence?.expectedProviderContractId || ""),
      providerContractTransition: evidence?.providerContractTransition === true,
      providerContractContinuityVerified: evidence?.providerContractContinuityVerified === true,
      nativeContinuationEvidence: evidence || null,
    };
  }

  async function callAgentViaExternalRunner(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
    const initial = await callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
    const loop = await continueAgentToolCalls({
      output: initial.output,
      nativeSessionId: initial.nativeSessionId,
      projectName,
      workDir,
      agentType,
      timeoutMs,
      allowedTools,
      mcpConfigPath,
      agentSession,
      taskId: String(executionInfo?.taskId || initial.runnerRequestId),
      executionId: String(executionInfo?.executionId || ""),
      groupId: String(executionInfo?.groupId || executionInfo?.group_id || ""),
      onEvent: executionInfo?.onToolEvent,
      continueAgent: async (prompt, state) => {
        const continuationSession = {
          ...(agentSession || {}),
          persistSession: true,
          resumeSession: !!state.nativeSessionId,
          sessionId: state.nativeSessionId || "",
        };
        const next = await callAgentViaExternalRunnerRaw(
          projectName,
          prompt,
          workDir,
          agentType,
          timeoutMs,
          allowedTools,
          mcpConfigPath,
          continuationSession,
          {
            ...executionInfo,
            taskId: `${executionInfo?.taskId || initial.runnerRequestId}-tool-${state.round}`,
            groupId: executionInfo?.groupId || executionInfo?.group_id || "",
            skipVerification: true,
          },
        );
        return { output: next.output, nativeSessionId: next.nativeSessionId || state.nativeSessionId };
      },
    });
    return { ...initial, output: loop.output, nativeSessionId: loop.nativeSessionId || initial.nativeSessionId };
  }

  function getProjectToolSelection(projectName: string) {
    const configs = loadProjectConfigs();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
  }
  
  
  function findRuntimeToolSnapshotPath(mcpConfigPath = "") {
    const configPath = String(mcpConfigPath || "").trim();
    if (!configPath) return "";
    const configDir = path.dirname(configPath);
    const candidates = [
      path.join(configDir, "runtime-tool-snapshot.json"),
      path.join(path.dirname(configDir), "runtime-tool-snapshot.json"),
    ];
    return candidates.find(candidate => fs.existsSync(candidate)) || "";
  }
  
  function readJsonFileSafe(file = "") {
    try {
      return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, "")) : null;
    } catch {
      return null;
    }
  }
  
  function runtimeToolSnapshotFromAudit(audit: any = {}, allowedTools: any = {}) {
    const dispatchGate = audit.dispatch_gate || audit.dispatchGate || null;
    const authorizationReadiness = audit.authorization_readiness || audit.authorizationReadiness || null;
    return {
      snapshotId: String(audit.snapshotId || audit.snapshot_id || ""),
      snapshotPath: String(audit.snapshotPath || audit.snapshot_path || ""),
      mcpConfigPath: String(audit.mcpConfigPath || audit.mcp_config_path || ""),
      runtime: normalizeAgentRuntimeId(audit.runtime || ""),
      allowedTools: allowedTools || audit.requested || { mcp: [], skill: [] },
      requested: audit.requested || allowedTools || { mcp: [], skill: [] },
      permissionRules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
      permission_rules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
      authorizationReadiness,
      authorization_readiness: authorizationReadiness,
      dispatchGate,
      dispatch_gate: dispatchGate,
      catalogRevision: String(audit.catalogRevision || ""),
    };
  }
  
  function normalizeAgentRunnerRuntimeToolSnapshot(snapshot: any = {}, allowedTools: any = null, mcpConfigPath = "") {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const dispatchGate = source.dispatchGate || source.dispatch_gate || null;
    const authorizationReadiness = source.authorizationReadiness || source.authorization_readiness || null;
    return {
      ...source,
      snapshotId: String(source.snapshotId || source.snapshot_id || ""),
      snapshotPath: String(source.snapshotPath || source.snapshot_path || ""),
      mcpConfigPath: String(source.mcpConfigPath || source.mcp_config_path || mcpConfigPath || ""),
      runtime: normalizeAgentRuntimeId(source.runtime || ""),
      allowedTools: allowedTools || source.allowedTools || source.allowed_tools || source.requested || { mcp: [], skill: [] },
      requested: source.requested || allowedTools || source.allowedTools || source.allowed_tools || { mcp: [], skill: [] },
      permissionRules: source.permissionRules || source.permission_rules || [],
      permission_rules: source.permission_rules || source.permissionRules || [],
      authorizationReadiness,
      authorization_readiness: authorizationReadiness,
      dispatchGate,
      dispatch_gate: dispatchGate,
      catalogRevision: String(source.catalogRevision || source.catalog_revision || ""),
    };
  }
  
  
  
  function getProjectVerificationCommandsForRunner(projectName: string) {
    const configs = loadProjectConfigs();
    const projectConfig = configs?.[projectName] || {};
    return normalizeVerificationCommands(
      projectConfig.verification_commands
        || projectConfig.verificationCommands
        || projectConfig.test_commands
        || projectConfig.testCommands
        || projectConfig.check_commands
        || projectConfig.checkCommands
    );
  }
  
  async function runIndependentProjectVerification(projectName: string, workDir: string, timeoutMs: number, taskId: string, executionId: string, agentType: string) {
    const commands = getProjectVerificationCommandsForRunner(projectName).filter(isSafeVerificationCommand);
    if (!commands.length || !workDir) return "";
    const verification: string[] = [];
    const failed: string[] = [];
    const results: any[] = [];
    const perCommandTimeout = Math.max(30_000, Math.min(timeoutMs || 300_000, 180_000));
    for (const command of commands) {
      try {
        const managed = await runManagedCommand({
          taskId,
          executionId,
          command,
          cwd: workDir,
          timeoutMs: perCommandTimeout,
          maxOutputBytes: 5 * 1024 * 1024,
          env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), []),
        });
        verification.push(`${command} passed by external runner (exit 0)`);
        results.push({ command, status: "passed", exitCode: 0, output: String(managed.stdout || "").slice(-4000) });
      } catch (error: any) {
        const exitCode = error?.exitCode ?? error?.status ?? null;
        failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
        results.push({ command, status: "failed", exitCode, output: String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000) });
      }
    }
    return "\n\nCCM_RUNNER_VERIFICATION\n```json\n" + JSON.stringify({
      ccm_runner_verification: true,
      status: failed.length ? "failed" : "passed",
      verification,
      failed,
      results,
    }, null, 2) + "\n```";
  }
  
  
  
  function buildProjectToolContext(projectName: string, workDir = "", agentType = "claudecode", options: any = {}) {
    const toolAuth = buildToolAuthorizationPayload(getProjectToolSelection(projectName));
    const allowedTools = toolAuth.tools;
    const audit = syncRuntimeTools(workDir, agentType, allowedTools, {
      authorizationReadiness: toolAuth.authorization_readiness,
      internalMcpServers: options.internalMcpServers || {},
    });
    audit.authorization_readiness = toolAuth.authorization_readiness;
    audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
    recordRuntimeToolSyncAudit(audit, projectName);
    const prompt = toolManager.buildToolPrompt(allowedTools) + buildRuntimeToolSyncPrompt(audit);
    const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
    const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item: any) => item.state === "synced").length : audit.synced.mcp.length;
    const proxyMcpCount = mcpStatuses.filter((item: any) => item.state === "proxy_only").length;
    const authorizationSuffix = toolAuth.authorization_readiness?.dispatchReady === false ? "；授权需处理缺失项" : "";
    const workEvent = {
      id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: new Date().toISOString(),
      agent: projectName,
      kind: audit.mode === "failed" ? "error" : "tool",
      text: audit.mode === "native-and-proxy"
        ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${authorizationSuffix}${audit.warnings?.length ? `；${audit.warnings.join("；")}` : ""}`
        : audit.mode === "ccm-proxy-only"
          ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
          : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`,
      runtimeToolSync: audit,
    };
    if (audit.dispatch_gate.dispatchReady === false) {
      workEvent.kind = "error";
      workEvent.text = `${projectName} 工具授权派发已阻断：${audit.dispatch_gate.reason}`;
    }
    return { prompt, allowedTools, audit, workEvent, dispatchGate: audit.dispatch_gate, runtimeToolSnapshot: runtimeToolSnapshotFromAudit(audit, allowedTools) };
  }
  
  function sendRuntimeToolDispatchBlocked(res: any, toolContext: any) {
    const gate = toolContext?.dispatchGate || toolContext?.audit?.dispatch_gate || {};
    return sendJson(res, {
      success: false,
      error: gate.reason || "MCP/Skill 授权未就绪，已阻止派发子 Agent",
      runtime_tool_dispatch_gate: gate,
      runtime_tool_sync: toolContext?.audit || null,
    }, 409);
  }
  
  function ensureAgentRunnerDirs() {
    for (const dir of [AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, UPLOAD_DIR]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  
  
  function createAgentRunnerRequest(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
    ensureAgentRunnerDirs();
    const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const groupId = String(executionInfo?.groupId || executionInfo?.group_id || executionInfo?.toolScope?.groupId || executionInfo?.tool_scope?.group_id || "");
    const groupSessionId = String(executionInfo?.groupSessionId || executionInfo?.group_session_id || "");
    const sessionLifecycleFence = executionInfo?.sessionLifecycleFence || executionInfo?.session_lifecycle_fence || null;
    const runtimeToolPayload = buildAgentRunnerRuntimeToolPayload(allowedTools, mcpConfigPath, executionInfo);
    const request = {
      id,
      projectName,
      workDir,
      agentType: normalizeAgentRuntimeId(agentType || "claudecode"),
      timeoutMs,
      allowedTools,
      mcpConfigPath,
      agentSession: agentSession || null,
      taskId: String(executionInfo?.taskId || ""),
      executionId: String(executionInfo?.executionId || executionInfo?.taskId || ""),
      taskAgentSessionId: String(executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || ""),
      groupId,
      groupSessionId,
      trustedMemoryProviderChannelRequired: executionInfo?.trustedMemoryProviderChannelRequired === true,
      trustedMemoryProviderAcknowledgementRequired: executionInfo?.trustedMemoryProviderAcknowledgementRequired === true,
      memoryContextConsumptionReceiptRequired: executionInfo?.memoryContextConsumptionReceiptRequired === true,
      memoryContextConsumptionChallenge: executionInfo?.memoryContextConsumptionChallenge || null,
      trustedMemoryEnvelopeChecksum: String(executionInfo?.trustedMemoryEnvelopeChecksum || ""),
      trustedMemoryEnvelopeSourceChecksum: String(executionInfo?.trustedMemoryEnvelopeSourceChecksum || ""),
      sessionLifecycleFence,
      toolScope: {
        schema: "ccm-agent-runner-tool-scope-v1",
        scope: groupId ? "group-project" : "project",
        groupId,
        projectName,
      },
      runtimeToolSnapshot: runtimeToolPayload.runtimeToolSnapshot,
      runtimeToolDispatchGate: runtimeToolPayload.runtimeToolDispatchGate,
      runtimeToolSnapshotPath: runtimeToolPayload.runtimeToolSnapshotPath,
      runtimeToolSnapshotRequired: runtimeToolPayload.runtimeToolSnapshotRequired,
      skipVerification: executionInfo?.skipVerification === true,
      cliAllowedTools: Array.from(new Set([
        ...buildAgentCliAllowedTools(projectName, message),
        ...(executionInfo?.memoryContextConsumptionReceiptRequired === true
          ? THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES
          : []),
      ])),
      message,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    const tmpFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.tmp`);
    const requestFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(request, null, 2), "utf-8");
    fs.renameSync(tmpFile, requestFile);
    return { id, requestFile, resultFile: path.join(AGENT_RUNNER_RESULTS_DIR, `${id}.json`) };
  }
  
  async function waitForAgentRunnerResult(resultFile: string, timeoutMs: number) {
    const started = Date.now();
    const pollMs = 1000;
    while (Date.now() - started < Math.max(1000, timeoutMs || 300000)) {
      if (fs.existsSync(resultFile)) {
        try {
          return JSON.parse(fs.readFileSync(resultFile, "utf-8").replace(/^\uFEFF/, ""));
        } catch {}
      }
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    throw new Error("外部 Agent Runner 等待超时；请运行 npm run agent-runner:ps 或 npm run agent-runner 启用外部执行通道");
  }
  
  function recordNativeCapacityRefreshOutcome(agentType: string, model: string, capabilityRecord: any, binding: any = {}) {
    const provider = normalizeAgentRuntimeId(agentType);
    const refreshed = capabilityRecord?.recorded === true;
    const supportsNativeMetadata = ["codex", "cursor"].includes(provider);
    return recordModelCapabilityRefreshOutcome({
      provider,
      model: capabilityRecord?.entry?.model || model || "",
      outcome: refreshed ? "refreshed" : supportsNativeMetadata ? "metadata_absent" : "unsupported",
      receiptEvidenceChecksum: capabilityRecord?.entry?.checksum || "",
      refreshRequest: capabilityRecord?.refreshRequest || null,
      reason: refreshed ? "verified_native_capability_receipt_recorded" : supportsNativeMetadata ? "native_execution_completed_without_model_capacity_metadata" : "runtime_has_no_supported_native_capacity_metadata_adapter",
      ...binding,
    });
  }
  
  async function callAgentViaExternalRunnerRaw(projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, allowedTools: any = null, mcpConfigPath = "", agentSession: any = null, executionInfo: any = null) {
    const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
    if (executionInfo?.executionId) registerExternalRunnerRequest(executionInfo.executionId, request.id);
    executionInfo?.onRunnerRequestCreated?.(request.id);
    const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
    if (!result?.success) {
      const label = result?.command || getAgentCommandLabel(agentType);
      const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
      let persistedRequest: any = null;
      try { persistedRequest = JSON.parse(fs.readFileSync(request.requestFile, "utf-8")); } catch {}
      throw Object.assign(new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`), {
        runnerRequestId: request.id,
        runnerStarted: !!persistedRequest?.started_at && result?.runtimeToolDispatchBlocked !== true,
        memoryContextConsumptionRecovery: result?.memoryContextConsumptionRecovery || result?.memory_context_consumption_recovery || null,
      });
    }
    const persistedContinuationEvidence = result.nativeContinuationEvidence || null;
    const persistedContinuationValidation = persistedContinuationEvidence
      ? verifyNativeSessionContinuationEvidence(persistedContinuationEvidence, {
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: request.id,
          requestedNativeSessionId: agentSession?.sessionId || "",
          expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
        })
      : { valid: false, issues: ["evidence_missing"] };
    const nativeContinuationEvidence = persistedContinuationValidation.valid
      ? persistedContinuationEvidence
      : buildNativeSessionContinuationEvidence({
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: request.id,
          requestedNativeSessionId: agentSession?.sessionId || "",
          returnedNativeSessionId: result.returnedNativeSessionId
            || (result.nativeSessionEvidenceSource === "provider_output" ? result.nativeSessionId : ""),
          providerOutputContractEvidence: result.providerOutputContractEvidence || null,
          providerRuntimeVersionSnapshot: result.providerRuntimeVersionSnapshot || null,
          expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
          nativeResumeRequested: agentSession?.resumeSession === true,
          runnerSuccess: true,
        });
    const nativeModelCapabilityRecord = result.nativeModelCapabilityReceipt
      ? recordVerifiedNativeModelCapabilityReceipt(result.nativeModelCapabilityReceipt, {
          provider: normalizeAgentRuntimeId(agentType),
          runnerRequestId: request.id,
          groupId: executionInfo?.groupId || executionInfo?.group_id || "",
          taskId: executionInfo?.taskId || "",
          executionId: executionInfo?.executionId || executionInfo?.taskId || "",
          taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
          nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        })
      : null;
    const modelCapabilityRefreshOutcome = recordNativeCapacityRefreshOutcome(agentType, executionInfo?.model || executionInfo?.modelId || "", nativeModelCapabilityRecord, {
      runnerRequestId: request.id,
      taskId: executionInfo?.taskId || "",
      executionId: executionInfo?.executionId || executionInfo?.taskId || "",
      taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
      nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
    });
    return {
      output: String(result.output || "").trim(),
      fileChanges: result.fileChanges || null,
      usage: result.usage || null,
      runnerRequestId: request.id,
      nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
      ...nativeContinuationDoneFields(nativeContinuationEvidence),
      nativeModelCapabilityReceipt: result.nativeModelCapabilityReceipt || null,
      nativeModelCapabilityRecord,
      modelCapabilityRefreshOutcome,
      providerToolAccessEvidence: result.providerToolAccessEvidence || result.provider_tool_access_evidence || null,
      providerMemoryChannelEvidence: result.providerMemoryChannelEvidence || result.provider_memory_channel_evidence || null,
      memoryContextConsumptionReceipt: result.memoryContextConsumptionReceipt || result.memory_context_consumption_receipt || null,
      memoryContextConsumptionRecovery: result.memoryContextConsumptionRecovery || result.memory_context_consumption_recovery || null,
    };
  }
  
  async function runManagedAgentContinuation(input: {
    projectName: string;
    prompt: string;
    workDir: string;
    agentType: string;
    timeoutMs: number;
    mcpConfigPath?: string;
    agentSession?: any;
    nativeSessionId?: string;
    taskId: string;
    executionId?: string;
    round: number;
    envAllowlist?: string[];
    maxOutputBytes?: number;
    maxContextOutputBytes?: number;
  }) {
    const tmpMsg = path.join(UPLOAD_DIR, `_tool_continue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`);
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(tmpMsg, input.prompt, "utf-8");
    const sessionId = String(input.nativeSessionId || input.agentSession?.sessionId || "");
    const sessionOptions = {
      ...(input.agentSession || {}),
      persistSession: true,
      resumeSession: !!sessionId,
      sessionId,
    };
    try {
      const managed = await runManagedCommand({
        taskId: `${input.taskId}-tool-${input.round}`,
        executionId: input.executionId || "",
        command: buildAgentCommand(input.agentType, tmpMsg, {
          mcpConfigPath: input.mcpConfigPath,
          ...sessionOptions,
        }),
        cwd: (input.workDir || process.cwd()).replace(/\\/g, "/"),
        timeoutMs: input.timeoutMs || 300000,
        maxOutputBytes: Number(input.maxOutputBytes || 2 * 1024 * 1024),
        env: sanitizeExecutionEnv(getRuntimeExecutionEnv(input.agentType), input.envAllowlist || []),
        project: input.projectName,
        agentType: input.agentType,
        source: "tool-continuation",
        commandLabel: getAgentCommandLabel(input.agentType),
        title: `工具结果续跑第 ${input.round} 轮`,
      });
      const normalized = normalizeAgentCommandOutput(input.agentType, String(managed.stdout || "").trim());
      const failure = detectAgentCommandFailure(input.agentType, String(managed.stdout || "").trim(), 0, "");
      if (failure.failed) throw new Error(failure.message || "Agent 工具续跑失败");
      return {
        output: persistBoundedOutput(
          `${input.taskId}-tool-${input.round}`,
          normalized.output,
          Number(input.maxContextOutputBytes || 256 * 1024),
        ).content,
        nativeSessionId: normalized.sessionId || sessionId,
      };
    } finally {
      try { fs.unlinkSync(tmpMsg); } catch {}
    }
  }
  
  async function continueAgentToolCalls(input: {
    output: string;
    nativeSessionId?: string;
    projectName: string;
    workDir: string;
    agentType: string;
    timeoutMs: number;
    allowedTools?: any;
    mcpConfigPath?: string;
    agentSession?: any;
    groupId?: string;
    taskId: string;
    executionId?: string;
    envAllowlist?: string[];
    maxOutputBytes?: number;
    maxContextOutputBytes?: number;
    onEvent?: (event: any) => void;
    continueAgent?: (prompt: string, state: any) => Promise<{ output: string; nativeSessionId?: string }>;
  }) {
    return runToolCallLoop({
      initialOutput: input.output,
      initialSessionId: input.nativeSessionId || input.agentSession?.sessionId || "",
      scope: input.allowedTools || undefined,
      runtime: normalizeAgentRuntimeId(input.agentType),
      project: input.projectName,
      groupId: input.groupId || "",
      taskId: input.taskId,
      executionId: input.executionId || "",
      source: input.groupId ? "group-agent" : "project-agent",
      maxRounds: 4,
      parseToolCalls: text => toolManager.parseToolCalls(text),
      executeToolCall: (name, args, scope) => toolManager.executeToolCall(name, args, scope),
      onEvent: input.onEvent,
      continueAgent: input.continueAgent || ((prompt, state) => runManagedAgentContinuation({
        projectName: input.projectName,
        prompt,
        workDir: input.workDir,
        agentType: input.agentType,
        timeoutMs: input.timeoutMs,
        mcpConfigPath: input.mcpConfigPath,
        agentSession: input.agentSession,
        nativeSessionId: state.nativeSessionId,
        taskId: input.taskId,
        executionId: input.executionId,
        round: state.round,
        envAllowlist: input.envAllowlist,
        maxOutputBytes: input.maxOutputBytes,
        maxContextOutputBytes: input.maxContextOutputBytes,
      })),
    });
  }

  return {
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
  };
}
